import { describe, expect, it } from "vitest";

import { createDocument, createImageFrame, createShape } from "./factory";
import { createSequentialIds } from "./ids";
import type { PublicationPage } from "./model";
import {
  alignObjectsInPage,
  arrangeInPage,
  distributeObjectsInPage,
  duplicateObjects,
  expandSelectionToGroups,
  groupObjects,
  matchObjectSize,
  selectionBounds,
  setObjectsHidden,
  setObjectsLocked,
  ungroupObjects,
} from "./tools";

const ids = createSequentialIds(9000);

function pageWithThreeShapes(): PublicationPage {
  const document = createDocument({ title: "Tools", pageCount: 1, ids });
  const page = document.pages[0]!;
  const layerId = page.layers[page.layers.length - 1]!.id;
  const shape = (id: string, x: number, y: number, width = 60, height = 40) => ({
    ...createShape({
      name: id,
      layerId,
      x,
      y,
      width,
      height,
      fill: "#cccccc",
      strokeWidth: 0,
    }),
    id,
  });
  return {
    ...page,
    objects: [shape("a", 10, 20), shape("b", 100, 70, 80, 30), shape("c", 250, 140, 40, 60)],
  };
}

describe("selection tools", () => {
  it("aligns the selection to the page safe box", () => {
    const page = pageWithThreeShapes();
    const aligned = alignObjectsInPage(page, ["a", "b", "c"], "left");
    const xs = aligned.objects.map((object) => object.frame.x);
    expect(new Set(xs.map((x) => Math.round(x * 10) / 10)).size).toBe(1);
  });

  it("aligns horizontal centres around one axis", () => {
    const page = pageWithThreeShapes();
    const aligned = alignObjectsInPage(page, ["a", "b"], "hcenter");
    const centres = aligned.objects
      .filter((object) => ["a", "b"].includes(object.id))
      .map((object) => object.frame.x + object.frame.width / 2);
    expect(Math.abs(centres[0]! - centres[1]!)).toBeLessThan(0.01);
  });

  it("distributes three objects evenly and leaves two untouched", () => {
    const page = pageWithThreeShapes();
    const distributed = distributeObjectsInPage(page, ["a", "b", "c"], "h");
    const byId = (id: string) => distributed.objects.find((object) => object.id === id)!;
    const gapOne = byId("b").frame.x - (byId("a").frame.x + byId("a").frame.width);
    const gapTwo = byId("c").frame.x - (byId("b").frame.x + byId("b").frame.width);
    expect(gapOne).toBeCloseTo(gapTwo, 5);
    expect(distributeObjectsInPage(page, ["a", "b"], "h")).toBe(page);
  });

  it("matches width without touching height or rotation", () => {
    const page = pageWithThreeShapes();
    const matched = matchObjectSize(page, ["b", "a"], "width");
    const a = matched.objects.find((object) => object.id === "a")!;
    const b = matched.objects.find((object) => object.id === "b")!;
    expect(a.frame.width).toBe(b.frame.width);
    expect(a.frame.height).toBe(matched.objects.find((object) => object.id === "a")!.frame.height);
  });

  it("groups, expands and ungroups", () => {
    const page = pageWithThreeShapes();
    const grouped = groupObjects(page, ["a", "b"], "group_1");
    expect(expandSelectionToGroups(grouped, ["a"])).toEqual(
      expect.arrayContaining(["a", "b"]),
    );
    const ungrouped = ungroupObjects(grouped, ["a"]);
    expect(ungrouped.objects.every((object) => !object.groupId)).toBe(true);
  });

  it("duplicates with an offset, fresh ids and no story links", () => {
    const page = pageWithThreeShapes();
    const { page: duplicated, objectIds } = duplicateObjects(page, ["a"], 12);
    expect(duplicated.objects).toHaveLength(4);
    expect(objectIds[0]).not.toBe("a");
    const copy = duplicated.objects.find((object) => object.id === objectIds[0])!;
    expect(copy.frame.x).toBe(22);
    expect(copy.groupId).toBeUndefined();
  });

  it("arranges within the object's own layer", () => {
    const page = pageWithThreeShapes();
    const ordered = arrangeInPage(page, ["a"], "front");
    expect(ordered.objects[ordered.objects.length - 1]!.id).toBe("a");
    const back = arrangeInPage(ordered, ["a"], "back");
    expect(back.objects[0]!.id).toBe("a");
  });

  it("locks and hides only the requested objects", () => {
    const page = pageWithThreeShapes();
    const locked = setObjectsLocked(page, ["b"], true);
    expect(locked.objects.find((object) => object.id === "b")!.locked).toBe(true);
    expect(locked.objects.find((object) => object.id === "a")!.locked).toBe(false);
    const hidden = setObjectsHidden(page, ["c"], true);
    expect(hidden.objects.find((object) => object.id === "c")!.hidden).toBe(true);
  });

  it("never distorts image crop data while aligning", () => {
    const page = pageWithThreeShapes();
    const image = {
      ...createImageFrame({
        name: "Photo",
        layerId: page.layers[page.layers.length - 1]!.id,
        x: 300,
        y: 200,
        width: 120,
        height: 80,
        assetId: "asset_1",
        crop: { scale: 1.4, offsetX: 0.2, offsetY: -0.1 },
      }),
      id: "photo",
    };
    const withPhoto: PublicationPage = { ...page, objects: [...page.objects, image] };
    const aligned = alignObjectsInPage(withPhoto, ["photo", "a"], "top");
    const photo = aligned.objects.find((object) => object.id === "photo");
    expect(photo?.kind).toBe("image-frame");
    if (photo?.kind !== "image-frame") return;
    expect(photo.crop.scale).toBe(1.4);
    expect(photo.crop.offsetX).toBe(0.2);
    expect(photo.crop.offsetY).toBe(-0.1);
    expect(photo.assetId).toBe("asset_1");
  });

  it("reports union bounds in page points", () => {
    const page = pageWithThreeShapes();
    const bounds = selectionBounds(page, ["a", "b"]);
    expect(bounds).toEqual({ x: 10, y: 20, width: 170, height: 80 });
  });
});
