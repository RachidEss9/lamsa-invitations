import { describe, expect, it } from "vitest";
import type { PublicationDocument, Story } from "./model";
import { createDocument, createMasterPage, createShape, createTextFrame } from "./factory";
import { createSequentialIds } from "./ids";
import {
  addGuide,
  addMaster,
  addObject,
  addPage,
  applyMaster,
  findObject,
  findPage,
  moveObject,
  movePage,
  reflowPages,
  removeGuide,
  removeMaster,
  removeObject,
  removePage,
  setObjectLayer,
  touchDocument,
  updateObject,
  updatePage,
} from "./operations";

/**
 * Operations are immutable and share structure: an untouched page or object
 * keeps its identity. That is the property later history and memoisation
 * depend on, so it is asserted directly rather than assumed.
 */

const BASE = createDocument({
  presetId: "album-12x12",
  pageCount: 4,
  ids: createSequentialIds(),
  now: 1000,
});

const LAYER = BASE.pages[0]!.layers[1]!.id;

function withStory(document: PublicationDocument, story: Story): PublicationDocument {
  return { ...document, stories: [...document.stories, story] };
}

describe("lookup", () => {
  it("finds pages and objects", () => {
    expect(findPage(BASE, BASE.pages[0]!.id)?.id).toBe(BASE.pages[0]!.id);
    expect(findPage(BASE, "page_missing")).toBeUndefined();
    expect(findObject(BASE, "object_missing")).toBeUndefined();
  });
});

describe("updatePage", () => {
  it("returns a new document and leaves other pages identical", () => {
    const next = updatePage(BASE, BASE.pages[1]!.id, (page) => ({ ...page, name: "Renamed" }));
    expect(next).not.toBe(BASE);
    expect(next.pages[1]!.name).toBe("Renamed");
    expect(next.pages[1]).not.toBe(BASE.pages[1]);
    expect(next.pages[0]).toBe(BASE.pages[0]);
    expect(next.pages[2]).toBe(BASE.pages[2]);
  });

  it("returns the same document when the updater changes nothing", () => {
    expect(updatePage(BASE, BASE.pages[0]!.id, (page) => page)).toBe(BASE);
    expect(updatePage(BASE, "page_missing", (page) => ({ ...page, name: "x" }))).toBe(BASE);
  });

  it("keeps spreads consistent when the page spec changes", () => {
    const next = updatePage(BASE, BASE.pages[0]!.id, (page) => ({
      ...page,
      spec: { ...page.spec, trim: { width: 500, height: 600 } },
    }));
    expect(next.pages[0]!.spec.trim.width).toBe(500);
    expect(next.spreads).toHaveLength(BASE.spreads.length);
  });
});

describe("page structure", () => {
  it("adds a page at the end by default", () => {
    const next = addPage(BASE);
    expect(next.pages).toHaveLength(BASE.pages.length + 1);
    expect(next.pages[0]).toBe(BASE.pages[0]);
    const lastSpread = next.spreads[next.spreads.length - 1]!;
    expect(lastSpread.pageIds).toEqual([
      next.pages[next.pages.length - 2]!.id,
      next.pages[next.pages.length - 1]!.id,
    ]);
  });

  it("adds a page at a position and reflows spreads and sides", () => {
    const ids = createSequentialIds(100);
    const next = addPage(BASE, { at: 1, ids });
    expect(next.pages[1]!.id).toBe("page_100");
    expect(next.pages.map((page) => page.side)).toEqual([
      "right",
      "left",
      "right",
      "left",
      "right",
    ]);
  });

  it("refuses to remove the only page", () => {
    const single = createDocument({ pageCount: 1, now: 1 });
    expect(removePage(single, single.pages[0]!.id)).toBe(single);
  });

  it("removes a page and rebuilds the spread plan", () => {
    const next = removePage(BASE, BASE.pages[3]!.id);
    expect(next.pages).toHaveLength(3);
    expect(next.spreads.map((spread) => spread.pageIds.length)).toEqual([1, 2]);
    expect(next.pages.map((page) => page.side)).toEqual(["right", "left", "right"]);
  });

  it("prunes story frames and page guides when a page is removed", () => {
    const text = createTextFrame({
      layerId: LAYER,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      ids: createSequentialIds(200),
    });
    const pageId = BASE.pages[2]!.id;
    const withObject = addObject(BASE, pageId, text);
    const withFrames = withStory(withObject, {
      version: 1,
      id: "story_1",
      name: "Letter",
      paragraphs: [],
      frames: [{ pageId, objectId: text.id }],
      overflow: "thread",
    });
    const withGuides = addGuide(withFrames, {
      id: "guide_1",
      axis: "x",
      position: 10,
      scope: "page",
      pageId,
    });

    const next = removePage(withGuides, pageId);
    expect(next.stories[0]!.frames).toEqual([]);
    expect(next.guides).toEqual([]);
  });

  it("moves a page to an index", () => {
    const next = movePage(BASE, BASE.pages[3]!.id, 1);
    expect(next.pages.map((page) => page.id)).toEqual([
      BASE.pages[0]!.id,
      BASE.pages[3]!.id,
      BASE.pages[1]!.id,
      BASE.pages[2]!.id,
    ]);
    expect(next.spreads.map((spread) => spread.pageIds)).toEqual([
      [BASE.pages[0]!.id],
      [BASE.pages[3]!.id, BASE.pages[1]!.id],
      [BASE.pages[2]!.id],
    ]);
  });

  it("returns the same document for an unknown page or unchanged index", () => {
    expect(movePage(BASE, "page_missing", 0)).toBe(BASE);
    expect(movePage(BASE, BASE.pages[0]!.id, 0)).toBe(BASE);
  });
});

describe("object edits", () => {
  const object = createShape({
    layerId: LAYER,
    x: 10,
    y: 10,
    width: 50,
    height: 50,
    ids: createSequentialIds(300),
  });

  it("adds an object without duplicating an existing id", () => {
    const next = addObject(BASE, BASE.pages[0]!.id, object);
    expect(next.pages[0]!.objects).toHaveLength(1);
    expect(addObject(next, BASE.pages[0]!.id, object)).toBe(next);
  });

  it("updates one object and keeps its siblings identical", () => {
    const withObject = addObject(BASE, BASE.pages[0]!.id, object);
    const sibling = createShape({
      layerId: LAYER,
      x: 0,
      y: 0,
      width: 20,
      height: 20,
    });
    const withBoth = addObject(withObject, BASE.pages[0]!.id, sibling);
    const next = updateObject(withBoth, BASE.pages[0]!.id, object.id, (candidate) => ({
      ...candidate,
      name: "Renamed",
    }));
    expect(next.pages[0]!.objects[0]!.name).toBe("Renamed");
    expect(next.pages[0]!.objects[1]).toBe(sibling);
  });

  it("returns the same document for an unknown object", () => {
    expect(updateObject(BASE, BASE.pages[0]!.id, "object_missing", (entry) => entry)).toBe(BASE);
    expect(removeObject(BASE, BASE.pages[0]!.id, "object_missing")).toBe(BASE);
  });

  it("removes an object and prunes its story frame", () => {
    const withObject = addObject(BASE, BASE.pages[0]!.id, object);
    const linked = withStory(withObject, {
      version: 1,
      id: "story_1",
      name: "One",
      paragraphs: [],
      frames: [{ pageId: BASE.pages[0]!.id, objectId: object.id }],
      overflow: "thread",
    });
    const next = removeObject(linked, BASE.pages[0]!.id, object.id);
    expect(next.pages[0]!.objects).toEqual([]);
    expect(next.stories[0]!.frames).toEqual([]);
  });

  it("moves an object within its page", () => {
    const a = createShape({ layerId: LAYER, x: 0, y: 0, width: 10, height: 10 });
    const b = createShape({ layerId: LAYER, x: 0, y: 0, width: 10, height: 10 });
    const page = addObject(addObject(BASE, BASE.pages[0]!.id, a), BASE.pages[0]!.id, b);
    const next = moveObject(page, BASE.pages[0]!.id, a.id, 1);
    expect(next.pages[0]!.objects.map((entry) => entry.id)).toEqual([b.id, a.id]);
  });

  it("moves an object to another layer", () => {
    const withObject = addObject(BASE, BASE.pages[0]!.id, object);
    const target = BASE.pages[0]!.layers[0]!.id;
    const next = setObjectLayer(withObject, BASE.pages[0]!.id, object.id, target);
    expect(next.pages[0]!.objects[0]!.layerId).toBe(target);
  });
});

describe("masters and guides", () => {
  it("adds, applies and removes a master", () => {
    const master = createMasterPage("Running head", { ids: createSequentialIds(400) });
    const withMaster = addMaster(BASE, master);
    expect(withMaster.masters).toHaveLength(1);
    expect(addMaster(withMaster, master)).toBe(withMaster);

    const applied = applyMaster(withMaster, BASE.pages[0]!.id, master.id);
    expect(applied.pages[0]!.masterId).toBe(master.id);

    const removed = removeMaster(applied, master.id);
    expect(removed.masters).toEqual([]);
    expect(removed.pages[0]!.masterId).toBeUndefined();
  });

  it("ignores a master that does not exist", () => {
    expect(applyMaster(BASE, BASE.pages[0]!.id, "master_missing")).toBe(BASE);
    expect(removeMaster(BASE, "master_missing")).toBe(BASE);
  });

  it("adds and removes guides", () => {
    const guide = {
      id: "guide_1",
      axis: "x" as const,
      position: 120,
      scope: "document" as const,
    };
    const next = addGuide(BASE, guide);
    expect(next.guides).toEqual([guide]);
    expect(addGuide(next, guide)).toBe(next);
    expect(removeGuide(next, guide.id).guides).toEqual([]);
    expect(removeGuide(BASE, "guide_missing")).toBe(BASE);
  });
});

describe("reflow and timestamp", () => {
  it("returns the same document when pages are unchanged", () => {
    expect(reflowPages(BASE, [...BASE.pages])).toBe(BASE);
  });

  it("stamps the update time without changing anything else", () => {
    const stamped = touchDocument(BASE, 1234);
    expect(stamped.metadata.updatedAt).toBe(1234);
    expect(stamped.pages).toBe(BASE.pages);
    expect(touchDocument(stamped, 1234)).toBe(stamped);
  });
});
