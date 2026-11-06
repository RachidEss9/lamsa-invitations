import { describe, expect, it } from "vitest";
import { createDocument, createShape, createStory } from "./factory";
import {
  RECOVERY_PREFIX,
  clearRecoveryDraft,
  hasRecoveryDraft,
  readRecoveryDraft,
  recoveryKey,
  saveRecoveryDraft,
} from "./recovery";

/**
 * Recovery drafts are the browser fallback for autosave. They use an
 * injectable Storage like every other platform store, so the tests run on an
 * in-memory fake and never touch a real browser profile.
 */

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    clear: () => data.clear(),
    key: () => null,
    get length() {
      return data.size;
    },
  } as Storage;
}

const PUBLICATION_ID = "jd7abcd1234defgh";

function draftFixtures() {
  const document = createDocument({
    presetId: "custom",
    trim: { width: 400, height: 600 },
    pageCount: 2,
  });
  const page = { ...document.pages[0]!, name: "Edited locally" };
  const object = createShape({
    layerId: page.layers[1]!.id,
    x: 0,
    y: 0,
    width: 20,
    height: 20,
  });
  const editedPage = { ...page, objects: [object] };
  const story = createStory("Body", {
    id: "story_body",
    paragraphs: [
      { id: "para_1", runs: [{ text: "Recovering…" }] },
    ],
  });
  return { editedPage, story };
}

describe("recovery drafts", () => {
  it("keys drafts per publication", () => {
    expect(recoveryKey(PUBLICATION_ID)).toBe(`${RECOVERY_PREFIX}:${PUBLICATION_ID}`);
  });

  it("round-trips dirty pages and stories", () => {
    const { editedPage, story } = draftFixtures();
    const store = fakeStorage();
    expect(
      saveRecoveryDraft(PUBLICATION_ID, { pages: [editedPage], stories: [story] }, store),
    ).toBe(true);
    const draft = readRecoveryDraft(PUBLICATION_ID, store);
    expect(draft!.publicationId).toBe(PUBLICATION_ID);
    expect(draft!.pages).toHaveLength(1);
    expect(draft!.pages[0]!.name).toBe("Edited locally");
    expect(draft!.stories[0]!.paragraphs[0]!.runs[0]!.text).toBe("Recovering…");
    expect(draft!.savedAt).toBeGreaterThan(0);
    // Other publications see nothing.
    expect(readRecoveryDraft("otherpublicationid999", store)).toBeNull();
    expect(hasRecoveryDraft(PUBLICATION_ID, store)).toBe(true);
  });

  it("clears, replacing a draft with nothing", () => {
    const { editedPage } = draftFixtures();
    const store = fakeStorage();
    saveRecoveryDraft(PUBLICATION_ID, { pages: [editedPage], stories: [] }, store);
    expect(hasRecoveryDraft(PUBLICATION_ID, store)).toBe(true);
    clearRecoveryDraft(PUBLICATION_ID, store);
    expect(readRecoveryDraft(PUBLICATION_ID, store)).toBeNull();
    // Clearing is also idempotent.
    expect(clearRecoveryDraft(PUBLICATION_ID, store)).toBeUndefined();

    // Writing an empty draft clears as well.
    saveRecoveryDraft(PUBLICATION_ID, { pages: [editedPage], stories: [] }, store);
    expect(saveRecoveryDraft(PUBLICATION_ID, { pages: [], stories: [] }, store)).toBe(true);
    expect(hasRecoveryDraft(PUBLICATION_ID, store)).toBe(false);
  });

  it("treats corrupt payloads and wrong ids as absent", () => {
    const store = fakeStorage({
      [recoveryKey(PUBLICATION_ID)]: "not json",
      [recoveryKey("other0000000000000000")]: JSON.stringify({
        publicationId: "mismatch",
        pages: [],
        stories: [],
        savedAt: 1,
      }),
    });
    expect(readRecoveryDraft(PUBLICATION_ID, store)).toBeNull();

    // Structurally wrong records are rejected, not half-loaded.
    const broken = fakeStorage({
      [recoveryKey(PUBLICATION_ID)]: JSON.stringify({
        publicationId: PUBLICATION_ID,
        savedAt: 42,
        pages: [{ id: "", }],
        stories: {},
      }),
    });
    expect(readRecoveryDraft(PUBLICATION_ID, broken)).toBeNull();

    // Missing savedAt is rejected too.
    const noStamp = fakeStorage({
      [recoveryKey(PUBLICATION_ID)]: JSON.stringify({
        publicationId: PUBLICATION_ID,
        pages: [],
        stories: [],
      }),
    });
    expect(readRecoveryDraft(PUBLICATION_ID, noStamp)).toBeNull();
  });

  it("works without storage at all", () => {
    const { editedPage, story } = draftFixtures();
    expect(saveRecoveryDraft(PUBLICATION_ID, { pages: [editedPage], stories: [story] }, null)).toBe(false);
    expect(readRecoveryDraft(PUBLICATION_ID, null)).toBeNull();
    expect(hasRecoveryDraft(PUBLICATION_ID, null)).toBe(false);
    expect(clearRecoveryDraft(PUBLICATION_ID, null)).toBeUndefined();
  });
});
