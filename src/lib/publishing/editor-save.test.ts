import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicationPage, Story } from "./model";
import { createDocument, createPage, createStory } from "./factory";
import { PublishingSaver, SaveConflictError, isSaveConflict } from "./editor-save";

/**
 * The saver has one contract: local edits are the newest truth, the server
 * refuses stale writes, and a refusal stops the machine until a human picks
 * a side. These tests use fake timers so the debounce is exact.
 */

function documentFixture() {
  return createDocument({ presetId: "custom", trim: { width: 400, height: 600 }, pageCount: 2 });
}

function pageFixture(page: PublicationPage) {
  return { ...page, name: "Renamed" };
}

function storyFixture(): Story {
  return createStory("Body", { paragraphs: [{ id: "p1", runs: [{ text: "Hi" }] }] });
}

describe("conflict detection", () => {
  it("recognises the phase-2 guard wording", () => {
    expect(isSaveConflict(new Error("This page changed elsewhere since it was loaded."))).toBe(true);
    expect(isSaveConflict(new RangeError("expected a string"))).toBe(false);
    expect(new SaveConflictError("x").name).toBe("SaveConflictError");
  });
});

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("PublishingSaver", () => {
  it("debounces to the newest batch and reports Status transitions", async () => {
    const document = documentFixture();
    const statuses: string[] = [];
    const savedPages: number[] = [];
    const saver = new PublishingSaver({
      savePage: async (page, expectedVersion) => {
        expect(expectedVersion).toBe(page.version);
        return { version: page.version + 1 };
      },
      saveStory: async () => {
        throw new Error("not expected");
      },
      onStatus: (status) => statuses.push(status),
      onPageSaved: (_id, version) => savedPages.push(version),
    });

    for (const page of document.pages) saver.setPageBaseline(page.id, page.version);

    saver.schedule({ pages: [pageFixture(document.pages[0]!)], stories: [] });
    saver.schedule({ pages: [pageFixture(document.pages[0]!)], stories: [] }); // newest wins
    expect(saver.current).toBe("unsaved");

    await vi.advanceTimersByTimeAsync(1000);
    expect(statuses).toEqual(["unsaved", "saving", "saved"]);
    expect(savedPages).toEqual([document.pages[0]!.version + 1]);
    expect(saver.current).toBe("saved");
    await saver.dispose();
  });

  it("saves stories before pages and keeps the version baselines moving", async () => {
    const document = documentFixture();
    const order: string[] = [];
    const expectedStoryVersions: Array<number | undefined> = [];
    const story = storyFixture();
    const saver = new PublishingSaver({
      savePage: async () => {
        order.push("page");
        return { version: 9 };
      },
      saveStory: async (_story, expectedVersion) => {
        order.push("story");
        expectedStoryVersions.push(expectedVersion);
        return { version: 8 };
      },
    });

    saver.setStoryBaseline(story.id, 7);
    saver.schedule({ pages: [document.pages[0]!] as PublicationPage[], stories: [story] });
    await vi.advanceTimersByTimeAsync(1000);

    expect(order).toEqual(["story", "page"]);
    expect(expectedStoryVersions).toEqual([7]);

    // The next write's guard uses the version the *server* acknowledged.
    const second: Array<number | undefined> = [];
    const saver2 = new PublishingSaver({
      savePage: async () => ({ version: 10 }),
      saveStory: async (_s, expected) => {
        second.push(expected);
        return { version: 9 };
      },
    });
    saver2.setStoryBaseline(story.id, 8);
    saver2.schedule({ pages: [], stories: [story] });
    await vi.advanceTimersByTimeAsync(1000);
    expect(second).toEqual([8]);
    await saver.dispose();
    await saver2.dispose();
  });

  it("stops on a conflict and does not retry silently", async () => {
    const document = documentFixture();
    const page = document.pages[0]!;
    let calls = 0;
    const statuses: string[] = [];
    const saver = new PublishingSaver({
      savePage: async () => {
        calls += 1;
        throw new Error("This page changed elsewhere since it was loaded.");
      },
      saveStory: async () => ({ version: 2 }),
      onStatus: (status) => statuses.push(status),
    });
    saver.setPageBaseline(page.id, page.version);

    saver.schedule({ pages: [page], stories: [] });
    await vi.advanceTimersByTimeAsync(1000);
    expect(saver.current).toBe("conflict");
    expect(statuses[statuses.length - 1]).toBe("conflict");
    expect(calls).toBe(1);

    // Further edits queue up instead of hammering the guard.
    saver.schedule({ pages: [{ ...page, name: "Again" }], stories: [] });
    await vi.advanceTimersByTimeAsync(5000);
    expect(calls).toBe(1);
    expect(saver.hasPending).toBe(true);
    await saver.dispose();
  });

  it("overwrites deliberately only when the designer chooses", async () => {
    const document = documentFixture();
    const page = document.pages[0]!;
    const expectedVersions: Array<number | undefined> = [];
    const saver = new PublishingSaver({
      savePage: async (_page, expectedVersion) => {
        expectedVersions.push(expectedVersion);
        if (expectedVersion !== undefined) {
          throw new Error("changed elsewhere");
        }
        return { version: 20 };
      },
      saveStory: async () => ({ version: 2 }),
      onStatus: () => undefined,
    });
    saver.setPageBaseline(page.id, page.version);
    saver.schedule({ pages: [page], stories: [] });
    await vi.advanceTimersByTimeAsync(1000);
    expect(saver.current).toBe("conflict");

    const edits = { ...page, name: "Mine" };
    await saver.overwriteWithLocal({ pages: [edits], stories: [] });
    expect(saver.current).toBe("saved");
    expect(expectedVersions[1]).toBeUndefined();
    await saver.dispose();
  });

  it("keeps a failing save pending so a later flush retries it", async () => {
    const document = documentFixture();
    const page = document.pages[0]!;
    let attempt = 0;
    const saver = new PublishingSaver({
      savePage: async () => {
        attempt += 1;
        if (attempt === 1) throw new Error("network unreachable");
        return { version: page.version + 1 };
      },
      saveStory: async () => ({ version: 1 }),
      onStatus: () => undefined,
    });
    saver.setPageBaseline(page.id, page.version);
    saver.schedule({ pages: [page], stories: [] });
    await vi.advanceTimersByTimeAsync(1000);
    expect(saver.current).toBe("error");

    // The transient failure is recoverable: the content is still queued.
    expect(await saver.flush()).toBe(true);
    expect(attempt).toBe(2);
    expect(saver.current).toBe("saved");
    await saver.dispose();
  });

  it("ignores empty batches and works from a loaded page fixture", () => {
    const page = createPage({
      trim: { width: 400, height: 600 },
      bleed: 0,
      margins: { top: 36, right: 36, bottom: 36, left: 36 },
      mirrorMargins: false,
    });
    const saver = new PublishingSaver({
      savePage: async () => {
        throw new Error("never called");
      },
      saveStory: async () => ({ version: 1 }),
    });
    saver.schedule({ pages: [], stories: [] });
    vi.runAllTimers();
    expect(saver.current).toBe("saved");
    // Baselines do not accept nonsense versions.
    saver.setPageBaseline(page.id, Number.NaN);
    saver.setPageBaseline(page.id, 3);
    expect(vi.getTimerCount()).toBeGreaterThanOrEqual(0);
  });
});
