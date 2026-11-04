import { describe, expect, it } from "vitest";
import type { Layer, PublicationObject, PublicationPage } from "./model";
import {
  addLayer,
  bringObjectToFront,
  createDefaultLayers,
  createLayer,
  drawOrder,
  groupMembers,
  groupObjects,
  layerById,
  lowerObject,
  objectById,
  objectIsSelectable,
  objectIsVisible,
  objectZIndex,
  objectsInLayer,
  printableObjects,
  raiseObject,
  removeLayer,
  reorderLayer,
  reorderObject,
  sendObjectToBack,
  ungroupObjects,
  updateLayer,
  visibleObjects,
} from "./layers";
import { createSequentialIds } from "./ids";
import { objectFrame } from "./object-transform";

/**
 * Ordering is stored, not computed from numbers: layers are bottom-to-top and
 * so are the objects inside them. Every edit returns a new page and leaves
 * untouched objects identical.
 */

const LAYERS: Layer[] = [
  { id: "layer_bg", name: "Background", locked: false, hidden: false, printable: true },
  { id: "layer_content", name: "Content", locked: false, hidden: false, printable: true },
  { id: "layer_notes", name: "Notes", locked: false, hidden: false, printable: false },
];

function object(id: string, layerId: string, x = 0): PublicationObject {
  return {
    version: 1,
    id,
    kind: "shape",
    name: id,
    layerId,
    frame: objectFrame(x, 0, 10, 10),
    locked: false,
    hidden: false,
    opacity: 1,
    shape: "rectangle",
    strokeWidth: 0,
    cornerRadius: 0,
  };
}

function page(objects: PublicationObject[], layers = LAYERS): PublicationPage {
  return {
    version: 1,
    id: "page_1",
    name: "Page 1",
    side: "single",
    spec: {
      trim: { width: 100, height: 100 },
      bleed: 0,
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
      mirrorMargins: false,
    },
    background: { color: "#fff" },
    layers,
    objects,
    hidden: false,
  };
}

describe("layer creation", () => {
  it("creates a default stack where notes never print", () => {
    const layers = createDefaultLayers(createSequentialIds());
    expect(layers.map((layer) => layer.name)).toEqual(["Background", "Content", "Notes"]);
    expect(layers.map((layer) => layer.id)).toEqual(["layer_1", "layer_2", "layer_3"]);
    expect(layers[2]!.printable).toBe(false);
    expect(layers[0]!.printable).toBe(true);
  });

  it("creates an empty layer with safe defaults", () => {
    const layer = createLayer("Marks", { ids: createSequentialIds() });
    expect(layer).toMatchObject({
      name: "Marks",
      locked: false,
      hidden: false,
      printable: true,
    });
  });
});

describe("draw order", () => {
  const objects = [
    object("front_note", "layer_notes"),
    object("back", "layer_bg"),
    object("content_a", "layer_content"),
  ];

  it("paints layers bottom-to-top, objects within a layer in array order", () => {
    expect(drawOrder(page(objects)).map((entry) => entry.id)).toEqual([
      "back",
      "content_a",
      "front_note",
    ]);
  });

  it("reports the stacking index", () => {
    expect(objectZIndex(page(objects), "content_a")).toBe(1);
    expect(objectZIndex(page(objects), "missing")).toBe(-1);
  });

  it("keeps objects whose layer vanished visible at the end", () => {
    const orphan = page([object("orphan", "layer_gone")]);
    expect(drawOrder(orphan).map((entry) => entry.id)).toEqual(["orphan"]);
  });

  it("lists one layer's objects in order", () => {
    expect(objectsInLayer(page(objects), "layer_content").map((entry) => entry.id)).toEqual([
      "content_a",
    ]);
    expect(layerById(page(objects), "layer_notes")?.name).toBe("Notes");
    expect(objectById(page(objects), "back")?.id).toBe("back");
  });
});

describe("visibility", () => {
  it("hides objects on hidden layers and non-printing layers", () => {
    const objects = [
      object("bg", "layer_bg"),
      object("content", "layer_content"),
      object("note", "layer_notes"),
    ];
    const base = page(objects);
    expect(visibleObjects(base).map((entry) => entry.id)).toEqual(["bg", "content", "note"]);
    expect(printableObjects(base).map((entry) => entry.id)).toEqual(["bg", "content"]);

    const hiddenLayer = page(
      objects,
      LAYERS.map((layer) =>
        layer.id === "layer_content" ? { ...layer, hidden: true } : layer,
      ),
    );
    expect(visibleObjects(hiddenLayer).map((entry) => entry.id)).toEqual(["bg", "note"]);
  });

  it("treats a hidden or locked object as not selectable", () => {
    const objects = [object("a", "layer_content")];
    const base = page(objects);
    expect(objectIsVisible(base, base.objects[0]!)).toBe(true);
    expect(objectIsSelectable(base, base.objects[0]!)).toBe(true);

    const locked = page([{ ...base.objects[0]!, locked: true }]);
    expect(objectIsVisible(locked, locked.objects[0]!)).toBe(true);
    expect(objectIsSelectable(locked, locked.objects[0]!)).toBe(false);

    const lockedLayer = page(
      objects,
      LAYERS.map((layer) =>
        layer.id === "layer_content" ? { ...layer, locked: true } : layer,
      ),
    );
    expect(objectIsSelectable(lockedLayer, lockedLayer.objects[0]!)).toBe(false);
  });
});

describe("object ordering", () => {
  const objects = [
    object("a", "layer_content"),
    object("b", "layer_content"),
    object("c", "layer_content"),
  ];

  it("moves an object within its layer", () => {
    const next = reorderObject(page(objects), "a", 2);
    expect(next.objects.map((entry) => entry.id)).toEqual(["b", "c", "a"]);
  });

  it("raises and lowers by one", () => {
    expect(raiseObject(page(objects), "b").objects.map((entry) => entry.id)).toEqual([
      "a",
      "c",
      "b",
    ]);
    expect(lowerObject(page(objects), "b").objects.map((entry) => entry.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });

  it("brings to front and sends to back", () => {
    expect(bringObjectToFront(page(objects), "a").objects.map((entry) => entry.id)).toEqual([
      "b",
      "c",
      "a",
    ]);
    expect(sendObjectToBack(page(objects), "c").objects.map((entry) => entry.id)).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("does nothing for an unknown object or a single-object layer", () => {
    const base = page(objects);
    expect(reorderObject(base, "missing", 0)).toBe(base);
    expect(reorderObject(page([objects[0]!]), "a", 1).objects[0]).toBe(objects[0]);
  });

  it("keeps objects on other layers where they are", () => {
    const mixed = [
      object("a", "layer_content"),
      object("note", "layer_notes"),
      object("b", "layer_content"),
    ];
    const next = reorderObject(page(mixed), "a", 1);
    expect(next.objects.map((entry) => entry.id)).toEqual(["b", "note", "a"]);
  });
});

describe("layer stacking", () => {
  const base = page([object("a", "layer_content")]);

  it("adds a layer on top", () => {
    const next = addLayer(base, createLayer("Marks", { ids: createSequentialIds() }));
    expect(next.layers.map((layer) => layer.name)).toEqual([
      "Background",
      "Content",
      "Notes",
      "Marks",
    ]);
  });

  it("renames and locks a layer without touching objects", () => {
    const next = updateLayer(base, "layer_content", { name: "Art", locked: true });
    expect(next.layers[1]).toMatchObject({ name: "Art", locked: true });
    expect(next.objects[0]).toBe(base.objects[0]);
  });

  it("reorders layers", () => {
    const next = reorderLayer(base, "layer_notes", 0);
    expect(next.layers.map((layer) => layer.id)).toEqual([
      "layer_notes",
      "layer_bg",
      "layer_content",
    ]);
  });

  it("refuses to remove a layer that still holds objects", () => {
    expect(removeLayer(base, "layer_content")).toBe(base);
  });

  it("removes an empty layer", () => {
    const next = removeLayer(base, "layer_bg");
    expect(next.layers.map((layer) => layer.id)).toEqual(["layer_content", "layer_notes"]);
  });
});

describe("groups", () => {
  const base = page([
    object("a", "layer_content"),
    object("b", "layer_content"),
    object("c", "layer_content"),
  ]);

  it("groups two or more objects", () => {
    const grouped = groupObjects(base, ["a", "b"], "group_1");
    expect(groupMembers(grouped, "group_1").map((entry) => entry.id)).toEqual(["a", "b"]);
    expect(grouped.objects[2]).toBe(base.objects[2]);
  });

  it("ignores a group of one", () => {
    expect(groupObjects(base, ["a"], "group_1")).toBe(base);
  });

  it("ungroups members", () => {
    const grouped = groupObjects(base, ["a", "b"], "group_1");
    const ungrouped = ungroupObjects(grouped, "group_1");
    expect(groupMembers(ungrouped, "group_1")).toEqual([]);
  });
});
