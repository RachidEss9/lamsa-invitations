import { describe, expect, it } from "vitest";
import {
  createDocument,
  createParagraph,
  createShape,
  createStory,
} from "./factory";
import type { PublicationDocument } from "./model";
import {
  activeLayerId,
  activePage,
  activePageIndex,
  addLayerToPage,
  addObjectToPage,
  canDeletePage,
  createEditorSession,
  discardPageEdits,
  dirtyPages,
  editPage,
  editStory,
  hasUnsavedEdits,
  insertIndexAfter,
  markPageSaved,
  markStorySaved,
  moveLayer,
  nudgeSelection,
  pageOrderAfterDelete,
  pageOrderAfterMove,
  patchObjects,
  redo,
  removeObjects,
  restackObject,
  selectAllObjects,
  sessionDocument,
  setActiveLayer,
  setActivePage,
  setSelection,
  syncBase,
  toggleSelection,
  toggleLayerLock,
  toggleLayerVisibility,
  undo,
} from "./session";

/**
 * The session tests pin the invariants that protect the writer: overrides
 * overlay the server copy, dirty records survive refreshes, one undo reverts
 * one gesture, and switching pages never drops edits.
 */

function editorDocument(): PublicationDocument {
  return createDocument({
    presetId: "custom",
    trim: { width: 400, height: 600 },
    facingPages: false,
    pageCount: 2,
  });
}

function contentLayerId(document: PublicationDocument): string {
  return document.pages[0]!.layers.find((layer) => layer.name === "Content")!.id;
}

function shape(document: PublicationDocument, x: number, y: number) {
  return createShape({ layerId: contentLayerId(document), x, y, width: 40, height: 40 });
}

describe("session document", () => {
  it("overlays local page edits on the loaded document", () => {
    const document = editorDocument();
    let session = createEditorSession(document);
    const page = activePage(session)!;
    session = editPage(session, page.id, (current) => ({ ...current, name: "Cover" }));
    expect(activePage(session)!.name).toBe("Cover");
    // Untouched records stay shared with the base document.
    expect(sessionDocument(session).pages[1]).toBe(document.pages[1]);
    expect(sessionDocument(session).stories).toBe(document.stories);
  });

  it("keeps layer identity while objects change", () => {
    const document = editorDocument();
    let session = createEditorSession(document);
    const page = activePage(session)!;
    session = addObjectToPage(session, page.id, shape(document, 10, 10));
    expect(activePage(session)!.objects[0]!.frame.x).toBe(10);
    expect(activePage(session)!.layers).toBe(page.layers);
  });

  it("tracks the active page and its index", () => {
    const document = editorDocument();
    let session = createEditorSession(document);
    expect(activePageIndex(session)).toBe(0);
    session = setActivePage(session, document.pages[1]!.id);
    expect(activePageIndex(session)).toBe(1);
    // An unknown page id is ignored, never a crash.
    expect(setActivePage(session, "nope")).toBe(session);
  });
});

describe("selection", () => {
  it("tracks selection async of navigation and clears on page switch", () => {
    const document = editorDocument();
    let session = createEditorSession(document);
    const page = activePage(session)!;
    const object = shape(document, 0, 0);
    session = addObjectToPage(session, page.id, object);
    session = setSelection(session, [object.id]);
    expect(session.state.selection).toEqual([object.id]);
    session = toggleSelection(session, object.id);
    expect(session.state.selection).toEqual([]);
    session = toggleSelection(session, object.id);
    session = setActivePage(session, document.pages[1]!.id);
    // A page switch clears what is selected…
    expect(session.state.selection).toEqual([]);
  });

  it("selects only visible, unlocked objects and reports dirty pages", () => {
    const document = editorDocument();
    let session = createEditorSession(document);
    const page = activePage(session)!;
    session = addObjectToPage(session, page.id, shape(document, 0, 0));
    session = addObjectToPage(
      session,
      page.id,
      createShape({
        layerId: contentLayerId(document),
        x: 50,
        y: 50,
        width: 40,
        height: 40,
        hidden: true,
      }),
    );
    session = selectAllObjects(session);
    expect(session.state.selection.length).toBe(1);

    const withEdits = editPage(session, page.id, (current) => ({ ...current, name: "Edited" }));
    expect(activePage(session)!.name).toBe("Page 1");
    expect(dirtyPages(withEdits).length).toBe(1);
    expect(hasUnsavedEdits(withEdits)).toBe(true);
    // Adding an object already makes the page dirty — that is the design.
    expect(hasUnsavedEdits(session)).toBe(true);
  });

  it("nudges the selection within the page", () => {
    const document = editorDocument();
    let session = createEditorSession(document);
    const page = activePage(session)!;
    session = addObjectToPage(session, page.id, shape(document, 10, 10));
    session = selectAllObjects(session);
    session = nudgeSelection(session, 5, -2);
    expect(activePage(session)!.objects[0]!.frame.x).toBe(15);
    expect(activePage(session)!.objects[0]!.frame.y).toBe(8);
  });

  it("patches selected objects through the inspector path", () => {
    const document = editorDocument();
    let session = createEditorSession(document);
    const page = activePage(session)!;
    session = addObjectToPage(session, page.id, shape(document, 0, 0));
    const id = activePage(session)!.objects[0]!.id;
    session = patchObjects(session, page.id, [id], (object) => ({
      ...object,
      frame: { ...object.frame, x: 99, rotation: 30 },
    }));
    expect(activePage(session)!.objects[0]!.frame.x).toBe(99);
    expect(activePage(session)!.objects[0]!.frame.rotation).toBe(30);
  });
});

describe("layers", () => {
  it("toggles visibility and lock independently", () => {
    const document = editorDocument();
    let session = createEditorSession(document);
    const page = activePage(session)!;
    const layer = page.layers[1]!;
    session = toggleLayerVisibility(session, page.id, layer.id);
    expect(activePage(session)!.layers[1]!.hidden).toBe(true);
    session = toggleLayerLock(session, page.id, layer.id);
    expect(activePage(session)!.layers[1]!.locked).toBe(true);
    // Two gestures, one undo each.
    session = undo(session);
    expect(activePage(session)!.layers[1]!.locked).toBe(false);
    expect(activePage(session)!.layers[1]!.hidden).toBe(true);
  });

  it("reorders layers bottom-to-top", () => {
    const document = editorDocument();
    let session = createEditorSession(document);
    const page = activePage(session)!;
    expect(activePage(session)!.layers.map((layer) => layer.name)).toEqual([
      "Background",
      "Content",
      "Notes",
    ]);

    // Already at the top: no change.
    session = moveLayer(session, page.id, page.layers[2]!.id, 1);
    expect(activePage(session)!.layers.map((layer) => layer.name)).toEqual([
      "Background",
      "Content",
      "Notes",
    ]);

    session = moveLayer(session, page.id, page.layers[1]!.id, 1);
    expect(activePage(session)!.layers.map((layer) => layer.name)).toEqual([
      "Background",
      "Notes",
      "Content",
    ]);
  });

  it("adds a layer and makes it the active drawing layer", () => {
    const document = editorDocument();
    let session = createEditorSession(document);
    const page = activePage(session)!;
    session = setActiveLayer(session, contentLayerId(document));
    expect(activeLayerId(session)).toBe(contentLayerId(document));
    session = addLayerToPage(session, page.id, "Overprint");
    const layersAfterAdd = activePage(session)!.layers;
    expect(layersAfterAdd[layersAfterAdd.length - 1]!.name).toBe("Overprint");
    expect(activeLayerId(session)).toBe(layersAfterAdd[layersAfterAdd.length - 1]!.id);
  });

  it("restacks objects within their layer", () => {
    const document = editorDocument();
    let session = createEditorSession(document);
    const page = activePage(session)!;
    const a = shape(document, 0, 0);
    const b = shape(document, 50, 50);
    session = addObjectToPage(session, page.id, a);
    session = addObjectToPage(session, page.id, b);
    expect(activePage(session)!.objects.map((object) => object.id)).toEqual([a.id, b.id]);
    session = restackObject(session, page.id, b.id, -1);
    expect(activePage(session)!.objects.map((object) => object.id)).toEqual([b.id, a.id]);
  });
});

describe("deletion and story pruning", () => {
  it("removes objects and their story frames in one history entry", () => {
    const document = editorDocument();
    const page = document.pages[0]!;
    const object = shape(document, 0, 0);
    const story = createStory("Body", {
      id: "story_body",
      paragraphs: [createParagraph("Hello")],
      frames: [{ pageId: page.id, objectId: object.id }],
    });
    const fixture: PublicationDocument = {
      ...document,
      pages: [{ ...page, objects: [object] }, document.pages[1]!],
      stories: [story],
    };
    let session = createEditorSession(fixture);
    session = setSelection(session, [object.id]);
    session = removeObjects(session, page.id, [object.id]);

    expect(activePage(session)!.objects).toEqual([]);
    expect(sessionDocument(session).stories[0]!.frames).toEqual([]);
    expect(session.state.selection).toEqual([]);
    // One undo restores both halves together.
    session = undo(session);
    expect(activePage(session)!.objects.map((entry) => entry.id)).toEqual([object.id]);
    expect(sessionDocument(session).stories[0]!.frames).toEqual([
      { pageId: page.id, objectId: object.id },
    ]);
  });
});

describe("saving", () => {
  it("acknowledges page saves with the server's version", () => {
    const document = editorDocument();
    let session = createEditorSession(document);
    const page = activePage(session)!;
    session = editPage(session, page.id, (current) => ({ ...current, name: "Edited" }));
    session = markPageSaved(session, page.id, page.version + 1);
    expect(activePage(session)!.version).toBe(page.version + 1);
    expect(hasUnsavedEdits(session)).toBe(false);
  });

  it("acknowledges story saves the same way", () => {
    const document = editorDocument();
    const story = createStory("Extra", { id: "story_extra" });
    const fixture = { ...document, stories: [story] };
    let session = createEditorSession(fixture);
    session = editStory(session, story.id, (current) => ({ ...current, name: "Extra!" }));
    expect(hasUnsavedEdits(session)).toBe(true);
    session = markStorySaved(session, story.id, story.version + 1);
    expect(hasUnsavedEdits(session)).toBe(false);
    expect(session.state.stories[story.id]!.story.version).toBe(story.version + 1);
  });

  it("does not lose dirty edits when the document refreshes", () => {
    const document = editorDocument();
    let session = createEditorSession(document);
    const page0 = document.pages[0]!;
    const page1 = document.pages[1]!;
    session = editPage(session, page0.id, (current) => ({ ...current, name: "Mine" }));

    // The server refreshed both pages (v2); the local edit is still unsaved.
    const refreshed: PublicationDocument = {
      ...document,
      pages: [
        { ...page0, version: 2 },
        { ...page1, version: 2 },
      ],
    };
    session = syncBase(session, refreshed);
    expect(activePage(session)!.name).toBe("Mine");
    expect(activePage(session)!.version).toBe(1);
    expect(session.state.base.pages[0]!.version).toBe(2);

    // A clean override is dropped only once the server holds that content.
    const acknowledged = { ...refreshed.pages[0]!, name: "Mine", version: 3 };
    session = syncBase(session, {
      ...refreshed,
      pages: [acknowledged, refreshed.pages[1]!],
    });
    session = discardPageEdits(session, page0.id);
    expect(activePage(session)!.version).toBe(3);
    expect(hasUnsavedEdits(session)).toBe(false);
  });

  it("an undo keeps the newest server document as the base", () => {
    const document = editorDocument();
    const session = createEditorSession(document);
    const page = activePage(session)!;
    const edited = editPage(session, page.id, (current) => ({ ...current, name: "Edited" }));
    const refreshed = { ...document, title: "New title" };
    const afterSync = { ...edited, state: { ...edited.state, base: refreshed } };
    const afterUndo = undo(afterSync);
    expect(afterUndo.state.base).toBe(refreshed);
  });
});

describe("history", () => {
  it("undoes and redoes edits", () => {
    const document = editorDocument();
    let session = createEditorSession(document);
    const page = activePage(session)!;
    session = editPage(session, page.id, (current) => ({ ...current, name: "One" }));
    session = editPage(session, page.id, (current) => ({ ...current, name: "Two" }));
    session = undo(session);
    expect(activePage(session)!.name).toBe("One");
    session = undo(session);
    expect(activePage(session)!.name).toBe("Page 1");
    session = redo(session);
    expect(activePage(session)!.name).toBe("One");
    session = redo(session);
    expect(activePage(session)!.name).toBe("Two");
    // Nothing left to redo.
    expect(redo(session)).toBe(session);
  });
});

describe("typing history", () => {
  it("groups continuous typing into one undo transaction", () => {
    const document = editorDocument();
    const story = createStory("Body", {
      id: "story_typing",
      paragraphs: [createParagraph("a", { id: "p1" })],
    });
    let session = createEditorSession({ ...document, stories: [story] });
    const type = (text: string, now: number) =>
      editStory(
        session,
        story.id,
        (current) => ({
          ...current,
          paragraphs: [{ ...current.paragraphs[0]!, runs: [{ text }] }],
        }),
        { coalesceKey: `story:${story.id}`, now },
      );

    session = type("ab", 1000);
    session = type("abc", 1100);
    expect(session.undoStack).toHaveLength(1);
    session = undo(session);
    expect(sessionDocument(session).stories[0]!.paragraphs[0]!.runs[0]!.text).toBe("a");

    session = redo(session);
    session = type("abcd", 3000);
    expect(session.undoStack).toHaveLength(2);
    session = undo(session);
    expect(sessionDocument(session).stories[0]!.paragraphs[0]!.runs[0]!.text).toBe("abc");
  });
});

describe("page management helpers", () => {
  it("plans insertion, deletion and reorder", () => {
    const document = editorDocument();
    expect(insertIndexAfter(document, document.pages[0]!.id)).toBe(1);
    expect(insertIndexAfter(document, null)).toBe(document.pages.length);
    expect(canDeletePage(document)).toBe(true);

    const order = pageOrderAfterMove(document, document.pages[1]!.id, 0);
    expect(order[0]).toBe(document.pages[1]!.id);
    expect(pageOrderAfterDelete(document, document.pages[0]!.id)).toEqual([
      document.pages[1]!.id,
    ]);
  });
});
