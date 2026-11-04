import { describe, expect, it } from "vitest";
import {
  allHidden,
  setVisibility,
  toggleVisibility,
  visibilityScope,
  visibleElements,
} from "./visibility";
import {
  makeElement,
  normalizeDesign,
  type DesignDocument,
  type DesignElement,
  type DesignPage,
} from "./design";
import { pushHistory, redoHistory, undoHistory } from "./studio-edit";
import type { InvitationContent } from "./invitation";

/**
 * Visibility is a property of the layer, not of the view: the tests below pin
 * down the data rules the studio, the Layers panel and every renderer share.
 */

const content: InvitationContent = {
  title: "Amelia & Søren",
  occasion: "wedding",
  templateId: "published",
  names: { primary: "Amelia", secondary: "Søren" },
  eyebrow: "Together with their families",
  message: "Join us",
  date: "2026-06-14",
  time: "16:00",
  venueName: "The Garden Hall",
  venueAddress: "1 Main Street",
  palette: { background: "#f2f1ed", ink: "#161616", accent: "#710014" },
  fontPair: "romance",
  layout: "centered",
  motif: "sprig",
  animations: true,
};

function element(kind: string, id: string, overrides: Partial<DesignElement> = {}) {
  return makeElement(kind, {
    id,
    name: id,
    x: 40,
    y: 60,
    w: 300,
    h: 120,
    hidden: false,
    ...overrides,
  });
}

function page(elements: DesignElement[]): DesignPage {
  return { id: "page-1", name: "Cover", background: "#fbfaf7", elements };
}

function designWith(elements: DesignElement[]): DesignDocument {
  return {
    version: 1,
    pages: [page(elements)],
    closing: { enabled: false, style: "message", message: "", duration: 800 },
  } as DesignDocument;
}

function byId(elements: DesignElement[], id: string) {
  return elements.find((candidate) => candidate.id === id)!;
}

describe("layer visibility", () => {
  it("hides and restores every supported kind without touching geometry or text", () => {
    const kinds = ["text", "image", "shape", "motif"];
    for (const kind of kinds) {
      const original = element(kind, `${kind}-1`, { text: "Kept wording" });
      const hidden = toggleVisibility([original], original.id);
      const layer = hidden[0];

      expect(layer.hidden).toBe(true);
      expect(layer).not.toBe(original);
      expect(layer.id).toBe(original.id);
      expect(layer.x).toBe(original.x);
      expect(layer.y).toBe(original.y);
      expect(layer.w).toBe(original.w);
      expect(layer.h).toBe(original.h);
      expect(layer.text).toBe(original.text);

      const restored = toggleVisibility(hidden, original.id)[0];
      expect(restored.hidden).toBe(false);
      expect(restored).toMatchObject({
        x: original.x,
        y: original.y,
        w: original.w,
        h: original.h,
        kind: original.kind,
      });
    }
  });

  it("keeps the layer in the document and in the layer list", () => {
    const elements = [element("text", "title"), element("shape", "rule")];
    const hidden = toggleVisibility(elements, "title");

    expect(hidden).toHaveLength(2);
    expect(hidden.map((layer) => layer.id)).toEqual(["title", "rule"]);
    // Ordering is a separate concern: hiding never reorders the stack.
    expect(byId(hidden, "title").hidden).toBe(true);
    expect(byId(hidden, "rule").hidden).toBe(false);
  });

  it("toggles layers independently", () => {
    const elements = [
      element("text", "a"),
      element("image", "b"),
      element("shape", "c"),
    ];
    let next = toggleVisibility(elements, "a");
    next = toggleVisibility(next, "c");

    expect(next.map((layer) => [layer.id, layer.hidden])).toEqual([
      ["a", true],
      ["b", false],
      ["c", true],
    ]);

    next = toggleVisibility(next, "a");
    expect(next.map((layer) => [layer.id, layer.hidden])).toEqual([
      ["a", false],
      ["b", false],
      ["c", true],
    ]);
  });

  it("treats a group as one object and never touches layers outside it", () => {
    const elements = [
      element("text", "g1-a", { groupId: "g1" }),
      element("shape", "g1-b", { groupId: "g1" }),
      element("text", "g2-a", { groupId: "g2" }),
      element("motif", "solo"),
    ];
    expect(visibilityScope(elements, ["g1-a"])).toEqual(new Set(["g1-a", "g1-b"]));

    const hidden = toggleVisibility(elements, "g1-b");
    expect(hidden.map((layer) => layer.hidden)).toEqual([true, true, false, false]);

    // Hiding a member of another group leaves the first group alone.
    const second = toggleVisibility(hidden, "g2-a");
    expect(second.map((layer) => [layer.id, layer.hidden])).toEqual([
      ["g1-a", true],
      ["g1-b", true],
      ["g2-a", true],
      ["solo", false],
    ]);

    // Showing any member brings the whole group back.
    const shown = toggleVisibility(second, "g1-a");
    expect(shown.map((layer) => [layer.id, layer.hidden])).toEqual([
      ["g1-a", false],
      ["g1-b", false],
      ["g2-a", true],
      ["solo", false],
    ]);
  });

  it("reports whether a whole selection is hidden", () => {
    const elements = [element("text", "a"), element("shape", "b")];
    const hidden = setVisibility(elements, ["a", "b"], true);
    expect(allHidden(hidden, ["a", "b"])).toBe(true);
    expect(allHidden(hidden, ["a"])).toBe(true);
    expect(allHidden(toggleVisibility(hidden, "a"), ["a", "b"])).toBe(false);
  });

  it("is a no-op when nothing changes, so no undo step is recorded", () => {
    const elements = [element("text", "a", { hidden: true })];
    expect(setVisibility(elements, ["a"], true)).toBe(elements);
    expect(toggleVisibility(elements, "missing")).toBe(elements);
  });

  it("survives rapid repeated toggles without drifting", () => {
    const original = [element("text", "a"), element("shape", "b")];
    let current = original;
    for (let press = 0; press < 9; press += 1) {
      current = toggleVisibility(current, "a");
    }
    // Nine presses: visible → hidden → … → hidden, and only that field moved.
    expect(byId(current, "a").hidden).toBe(true);
    expect(current).toHaveLength(original.length);
    expect(byId(current, "b")).toEqual(original[1]);
    expect(toggleVisibility(current, "a").map((layer) => layer.hidden)).toEqual([
      false,
      false,
    ]);
  });
});

describe("visibility in rendering and history", () => {
  it("filters hidden layers for every output path", () => {
    const elements = [element("text", "kept"), element("image", "gone", { hidden: true })];
    expect(visibleElements(elements).map((layer) => layer.id)).toEqual(["kept"]);
  });

  it("round-trips through save/load and defaults legacy designs to visible", () => {
    const design = designWith([element("text", "title", { hidden: true })]);
    const reloaded = normalizeDesign(JSON.parse(JSON.stringify(design)), content);
    expect(reloaded.pages[0].elements[0].hidden).toBe(true);

    // A document saved before visibility existed has no `hidden` field at all.
    const legacy = JSON.parse(JSON.stringify(design));
    delete legacy.pages[0].elements[0].hidden;
    const migrated = normalizeDesign(legacy, content);
    expect(migrated.pages[0].elements[0].hidden).toBe(false);
  });

  it("undoes and redoes a visibility change through the studio history", () => {
    const before = designWith([element("text", "title")]);
    const after: DesignDocument = {
      ...before,
      pages: [
        {
          ...before.pages[0],
          elements: toggleVisibility(before.pages[0].elements, "title"),
        },
      ],
    };
    expect(after.pages[0].elements[0].hidden).toBe(true);

    const stacks = { past: pushHistory([], before), future: [] as DesignDocument[] };
    const undone = undoHistory(stacks, after)!;
    expect(undone.snapshot.pages[0].elements[0].hidden).toBe(false);

    const redone = redoHistory(undone.stacks, undone.snapshot)!;
    expect(redone.snapshot.pages[0].elements[0].hidden).toBe(true);
  });
});
