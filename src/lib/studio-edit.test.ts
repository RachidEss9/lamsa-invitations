import { describe, it, expect } from "vitest";
import {
  HISTORY_LIMIT,
  cleanEditedText,
  shouldCommitText,
  deletableIds,
  hasDeletableSelection,
  isDeletable,
  pushHistory,
  redoHistory,
  removeElements,
  selectionAfterDelete,
  undoHistory,
} from "./studio-edit";
import type { DesignDocument, DesignElement } from "./design";

function element(
  id: string,
  overrides: Partial<DesignElement> = {},
): DesignElement {
  return {
    id,
    kind: "text",
    name: id,
    x: 0,
    y: 0,
    w: 200,
    h: 60,
    rotation: 0,
    opacity: 1,
    locked: false,
    hidden: false,
    text: id,
    animation: {
      enabled: true,
      preset: "fade",
      trigger: "load",
      delay: 0,
      duration: 600,
      easing: "easeOut",
    },
    ...overrides,
  } as DesignElement;
}

function design(): DesignDocument {
  return {
    version: 1,
    pages: [{ id: "page-1", name: "Page 1", background: "#f2f1ed", elements: [] }],
    opening: { experience: "none", duration: 1200, autoOpen: false, welcome: "" },
    closing: { enabled: true, style: "message", message: "", duration: 1400 },
    transition: { preset: "fade", duration: 700 },
  };
}

describe("selected-element deletion", () => {
  it("treats every unlocked kind as deletable and locked layers as protected", () => {
    const elements = [
      element("text", { kind: "text" }),
      element("image", { kind: "image" }),
      element("shape", { kind: "shape" }),
      element("motif", { kind: "motif" }),
      element("locked", { locked: true }),
    ];
    expect(elements.filter(isDeletable).map((item) => item.id)).toEqual([
      "text",
      "image",
      "shape",
      "motif",
    ]);
    expect(deletableIds(elements, ["locked"])).toEqual([]);
    expect(hasDeletableSelection(elements, ["locked"])).toBe(false);
    expect(hasDeletableSelection(elements, ["shape"])).toBe(true);
  });

  it("removes only the selection and leaves every other layer in order", () => {
    const elements = [element("a"), element("b"), element("c")];
    const outcome = removeElements(elements, ["b"]);
    expect(outcome.removed).toEqual(["b"]);
    expect(outcome.elements.map((item) => item.id)).toEqual(["a", "c"]);
    expect(outcome.blocked).toEqual([]);
  });

  it("keeps locked layers during a mixed delete and reports them", () => {
    const elements = [element("a"), element("locked", { locked: true }), element("c")];
    const outcome = removeElements(elements, ["a", "locked"]);
    expect(outcome.removed).toEqual(["a"]);
    expect(outcome.blocked).toEqual(["locked"]);
    expect(outcome.elements.map((item) => item.id)).toEqual(["locked", "c"]);
  });

  it("clears a cover when its reveal target is deleted and counts it", () => {
    const cover = element("cover", {
      kind: "shape",
      reveal: {
        interactionId: "i1",
        targetId: "message",
        effect: "fadeAway",
        direction: "up",
        duration: 900,
        trigger: "tap",
      },
    });
    const message = element("message");
    const outcome = removeElements([cover, message], ["message"]);
    expect(outcome.elements.map((item) => item.id)).toEqual(["cover"]);
    expect(outcome.elements[0].reveal).toBeUndefined();
    expect(outcome.clearedCovers).toBe(1);
  });

  it("does nothing at all when no deletable element is selected", () => {
    const elements = [element("a"), element("locked", { locked: true })];
    const outcome = removeElements(elements, []);
    expect(outcome.elements).toBe(elements);
    expect(outcome.removed).toEqual([]);
    expect(selectionAfterDelete(["locked"], outcome)).toEqual(["locked"]);
  });

  it("drops deleted ids from the selection but keeps surviving locked ids", () => {
    const elements = [element("a"), element("b")];
    const outcome = removeElements(elements, ["a", "b"]);
    expect(selectionAfterDelete(["a", "b"], outcome)).toEqual([]);

    const mixed = removeElements([element("a"), element("lock", { locked: true })], ["a", "lock"]);
    expect(selectionAfterDelete(["a", "lock"], mixed)).toEqual(["lock"]);
  });

  it("is idempotent: deleting an already deleted id is a no-op", () => {
    const once = removeElements([element("a"), element("b")], ["a"]);
    const twice = removeElements(once.elements, ["a"]);
    expect(twice.removed).toEqual([]);
    expect(twice.elements).toBe(once.elements);
  });
});

describe("inline text editing", () => {
  it("normalises browser whitespace and trailing newlines", () => {
    expect(cleanEditedText("Amelia\u00a0&\u00a0S\u00f8ren\n")).toBe("Amelia & S\u00f8ren");
    expect(cleanEditedText("Line one\r\nLine two\n\n")).toBe("Line one\nLine two");
    expect(cleanEditedText("  spaced  ")).toBe("  spaced  ");
  });

  it("keeps the original wording when the box is emptied", () => {
    expect(shouldCommitText("", "Amelia & S\u00f8ren")).toBe(false);
    expect(shouldCommitText("   \n  ", "Amelia & S\u00f8ren")).toBe(false);
  });

  it("only commits a real change", () => {
    expect(shouldCommitText("Amelia & S\u00f8ren\n", "Amelia & S\u00f8ren")).toBe(false);
    expect(shouldCommitText("Amelia & Soren", "Amelia & S\u00f8ren")).toBe(true);
    expect(shouldCommitText("Our story", "Our story")).toBe(false);
  });
});

describe("undo / redo history", () => {
  function snapshot(label: string): DesignDocument {
    const doc = design();
    doc.pages[0].name = label;
    return doc;
  }

  it("pushes a snapshot and caps the stack", () => {
    let past: DesignDocument[] = [];
    for (let index = 0; index < HISTORY_LIMIT + 10; index += 1) {
      past = pushHistory(past, snapshot(`s${index}`));
    }
    expect(past).toHaveLength(HISTORY_LIMIT);
    expect(past[past.length - 1].pages[0].name).toBe(`s${HISTORY_LIMIT + 9}`);
  });

  it("undoes to the previous snapshot and redoes forward again", () => {
    const before = snapshot("before");
    const after = snapshot("after");
    const past = pushHistory([], before);
    const undo = undoHistory({ past, future: [] }, after);
    expect(undo?.snapshot.pages[0].name).toBe("before");
    expect(undo?.stacks.past).toHaveLength(0);
    expect(undo?.stacks.future).toHaveLength(1);

    const redo = redoHistory(undo!.stacks, undo!.snapshot);
    expect(redo?.snapshot.pages[0].name).toBe("after");
    expect(redo?.stacks.past).toHaveLength(1);
    expect(redo?.stacks.future).toHaveLength(0);
  });

  it("returns null when there is nothing to undo or redo", () => {
    expect(undoHistory({ past: [], future: [] }, snapshot("now"))).toBeNull();
    expect(redoHistory({ past: [], future: [] }, snapshot("now"))).toBeNull();
  });

  it("keeps a deleted layer recoverable through undo and redo", () => {
    const current = design();
    current.pages[0].elements = [element("a"), element("b")];
    const beforeDelete = JSON.parse(JSON.stringify(current)) as DesignDocument;
    const past = pushHistory([], beforeDelete);
    const outcome = removeElements(current.pages[0].elements, ["a"]);
    current.pages[0].elements = outcome.elements;

    const undo = undoHistory({ past, future: [] }, current)!;
    expect(undo.snapshot.pages[0].elements.map((item) => item.id)).toEqual(["a", "b"]);

    const redo = redoHistory(undo.stacks, undo.snapshot)!;
    expect(redo.snapshot.pages[0].elements.map((item) => item.id)).toEqual(["b"]);
  });
});
