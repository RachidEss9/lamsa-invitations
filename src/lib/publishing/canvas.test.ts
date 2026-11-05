import { describe, expect, it } from "vitest";
import {
  createDocument,
  createGenericObject,
  createLine,
  createPage,
  createParagraph,
  createShape,
  createStory,
  createTextFrame,
} from "./factory";
import { pageSpec } from "./geometry";
import type { ObjectFrame } from "./model";
import { frameCenter, rotatePoint } from "./object-transform";
import { handlePoint } from "./canvas";
import { planSpreads, spreadGeometry } from "./spreads";
import {
  frameHandlePoints,
  hitTestPage,
  objectsInRect,
  resizeFrameByHandle,
  rotationForPointer,
  rotateSelection,
  snapGuides,
  selectionBounds,
  snapMove,
  transformSelection,
} from "./canvas";

/**
 * The canvas mathematics: pick order, selection bounds, transforms with
 * rotation, and snapping. Everything runs in page points, so the tests hold
 * at any zoom.
 */

const SPEC = pageSpec(
  { width: 400, height: 600 },
  { bleed: 0, margins: { top: 36, right: 36, bottom: 36, left: 36 } },
);

function square(
  layerId: string,
  x: number,
  y: number,
  width: number,
  height: number,
  options: Partial<Parameters<typeof createShape>[0]> = {},
) {
  return createShape({ layerId, x, y, width, height, ...options });
}

function contentLayerPage(objects: ReturnType<typeof square>[]) {
  const page = createPage(SPEC);
  return { ...page, objects };
}

describe("selection bounds", () => {
  it("is the union of the selected frames", () => {
    const page = createPage(SPEC);
    const layer = page.layers[1]!;
    const a = square(layer.id, 10, 10, 40, 40);
    const b = square(layer.id, 100, 60, 20, 20);
    const withObjects = { ...page, objects: [a, b] };
    expect(selectionBounds(withObjects, [a.id, b.id])).toEqual({
      x: 10,
      y: 10,
      width: 110,
      height: 70,
    });
    expect(selectionBounds(withObjects, [])).toBeNull();
  });
});

describe("hit testing", () => {
  it("returns null on empty pages and for points outside every object", () => {
    expect(hitTestPage(createPage(SPEC), { x: 100, y: 100 })).toBeNull();
  });

  it("returns the topmost visible object at a point", () => {
    const page = createPage(SPEC);
    const layer = page.layers[1]!;
    const back = square(layer.id, 0, 0, 100, 100);
    const front = square(layer.id, 20, 20, 60, 60);
    const withObjects = { ...page, objects: [back, front] };
    expect(hitTestPage(withObjects, { x: 50, y: 50 })!.id).toBe(front.id);
    expect(hitTestPage(withObjects, { x: 10, y: 10 })!.id).toBe(back.id);
  });

  it("skips hidden objects but still hits what is behind them", () => {
    const page = createPage(SPEC);
    const layer = page.layers[1]!;
    const back = square(layer.id, 0, 0, 100, 100);
    const hidden = { ...square(layer.id, 40, 40, 30, 30), hidden: true };
    const withObjects = { ...page, objects: [hidden, back] };
    const hit = hitTestPage(withObjects, { x: 50, y: 50 });
    expect(hit!.id).toBe(back.id);
  });

  it("skips locked objects by default", () => {
    const page = createPage(SPEC);
    const layer = page.layers[1]!;
    const locked = { ...square(layer.id, 0, 0, 100, 100), locked: true };
    const withObjects = { ...page, objects: [locked] };
    expect(hitTestPage(withObjects, { x: 50, y: 50 })).toBeNull();
    expect(hitTestPage(withObjects, { x: 50, y: 50 }, { includeLocked: true })!.id).toBe(
      locked.id,
    );
  });

  it("returns the last-painted of two stacked objects", () => {
    const page = createPage(SPEC);
    const layer = page.layers[1]!;
    const twinA = square(layer.id, 200, 200, 50, 50);
    const twinB = square(layer.id, 200, 200, 50, 50);
    const withObjects = { ...page, objects: [twinA, twinB] };
    expect(hitTestPage(withObjects, { x: 225, y: 225 })!.id).toBe(twinB.id);
  });
});

describe("marquee selection", () => {
  it("collects objects intersecting a rectangle", () => {
    const page = createPage(SPEC);
    const layer = page.layers[1]!;
    const a = square(layer.id, 10, 10, 40, 40);
    const far = square(layer.id, 300, 300, 40, 40);
    const withObjects = { ...page, objects: [a, far] };
    expect(
      objectsInRect(withObjects, { x: 0, y: 0, width: 100, height: 100 }).map(
        (object) => object.id,
      ),
    ).toEqual([a.id]);
  });
});

describe("transform selection", () => {
  it("moves only unlocked objects", () => {
    const page = createPage(SPEC);
    const layer = page.layers[1]!;
    const free = square(layer.id, 10, 10, 50, 50);
    const locked = square(layer.id, 0, 0, 20, 20, { locked: true });
    const withObjects = { ...page, objects: [free, locked] };
    const next = transformSelection(
      withObjects,
      [free.id, locked.id],
      (frame) => ({ ...frame, x: frame.x + 5, y: frame.y + 5 }),
    );
    expect(next.objects[0]!.frame.x).toBe(15);
    expect(next.objects[1]!.frame.x).toBe(0);
  });

  it("returns the same page when the selection is unrelated", () => {
    const page = createPage(SPEC);
    expect(transformSelection(page, ["nope"], (frame) => frame)).toBe(page);
  });

  it("sets an absolute, normalised rotation", () => {
    const page = createPage(SPEC);
    const layer = page.layers[1]!;
    const a = square(layer.id, 0, 0, 50, 50);
    const next = rotateSelection({ ...page, objects: [a] }, [a.id], 200);
    expect(next.objects[0]!.frame.rotation).toBeCloseTo(-160, 6);
  });
});

describe("resize", () => {
  it("keeps the opposite corner fixed when dragging a corner", () => {
    const frame = { x: 10, y: 10, width: 120, height: 80, rotation: 0 };
    const se = resizeFrameByHandle(frame, "se", { x: 30, y: 0 });
    expect(se.width).toBe(150);
    expect(se.height).toBe(80);
    expect(se.x).toBe(10);
    expect(se.y).toBe(10);

    const nw = resizeFrameByHandle(frame, "nw", { x: -30, y: 0 });
    expect(nw.width).toBe(150);
    expect(nw.x).toBe(-20);
    expect(nw.x + nw.width).toBeCloseTo(130, 6); // SE corner stays at x=130
  });

  it("keeps the opposite edge midpoint fixed when dragging an edge", () => {
    const frame = { x: 10, y: 10, width: 120, height: 80, rotation: 0 };
    const next = resizeFrameByHandle(frame, "e", { x: 40, y: 0 }, { minSize: 5 });
    expect(next.width).toBe(160);
    expect(next.x).toBe(10);
    expect(next.y).toBe(10);
  });

  it("clamps sizes at the minimum instead of inverting the box", () => {
    const frame = { x: 0, y: 0, width: 40, height: 40, rotation: 0 };
    const next = resizeFrameByHandle(frame, "w", { x: 100, y: 0 }, { minSize: 5 });
    expect(next.width).toBeLessThanOrEqual(40);
    expect(next.width).toBeGreaterThanOrEqual(5);
    expect(next.x + next.width).toBeCloseTo(40, 6); // E edge stays put
  });

  it("resizes along the object's own axes when rotated", () => {
    // A 90°-rotated 100×40 box: its local +x axis points down the page.
    const frame: ObjectFrame = { x: 30, y: 30, width: 100, height: 40, rotation: 90 };
    const next = resizeFrameByHandle(frame, "e", { x: 0, y: 20 });
    // Dragging down on screen widens the box along its own local x axis.
    expect(next.width).toBeCloseTo(120, 6);
    expect(next.height).toBeCloseTo(40, 6);
    // The opposite (west) handle keeps its page position through the resize.
    const westMid = (candidate: ObjectFrame) =>
      rotatePoint(handlePoint(candidate, "w"), frameCenter(candidate), candidate.rotation);
    expect(westMid(next).x).toBeCloseTo(westMid(frame).x, 6);
    expect(westMid(next).y).toBeCloseTo(westMid(frame).y, 6);
  });

  it("keeps aspect ratio when requested", () => {
    const frame = { x: 0, y: 0, width: 100, height: 100, rotation: 0 };
    const next = resizeFrameByHandle(frame, "se", { x: 30, y: 0 }, { keepAspect: true });
    expect(next.width).toBeCloseTo(130, 6);
    expect(next.height).toBeCloseTo(130, 6);
  });
});

describe("handle geometry", () => {
  it("is expressed in page space, rotation included", () => {
    const frame = { x: 0, y: 0, width: 100, height: 50, rotation: 90 };
    const handles = frameHandlePoints(frame);
    const entry = (handle: string) => handles.find((item) => item.handle === handle)!;
    // Rotating 90° clockwise about the centre maps the NW corner to the
    // rotated box's top-right corner of a 100-wide, 50-tall rect...
    expect(entry("nw").point.x).toBeCloseTo(75, 6);
    expect(entry("nw").point.y).toBeCloseTo(-25, 6);
    // ...and the SE corner to the rotated box's bottom-left corner.
    expect(entry("se").point.x).toBeCloseTo(25, 6);
    expect(entry("se").point.y).toBeCloseTo(75, 6);
  });
});

describe("rotation gesture", () => {
  it("reads the pointer angle with a 90° offset for the top grip", () => {
    const center = { x: 100, y: 100 };
    expect(rotationForPointer(center, { x: 100, y: 0 })).toBeCloseTo(0, 6);
    expect(rotationForPointer(center, { x: 220, y: 100 })).toBeCloseTo(90, 6);
    expect(rotationForPointer(center, { x: 100, y: 220 })).toBeCloseTo(-180, 6);
  });

  it("snaps to a step when one is given", () => {
    const center = { x: 100, y: 100 };
    // Raw angle ≈ 18° above the grip → rounds down to 15.
    expect(rotationForPointer(center, { x: 120, y: 40 }, { step: 15 })).toBeCloseTo(15, 6);
  });
});

describe("snap during move", () => {
  function documentFor() {
    return createDocument({
      presetId: "custom",
      trim: { width: 400, height: 600 },
      margins: { top: 36, right: 36, bottom: 36, left: 36 },
      facingPages: false,
      pageCount: 1,
      grid: { enabled: false, columns: 2, gutter: 20, baseline: 0 },
    });
  }

  it("adjusts a delta so the selection lands on a nearby alignment target", () => {
    const document = documentFor();
    const page = document.pages[0]!;
    const layer = page.layers[1]!;
    const object = square(layer.id, 41, 100, 50, 50);
    const withObjects = { ...page, objects: [object] };
    // Dragging to x=41 leaves the left edge 1pt from the 36pt margin.
    const snap = snapMove(withObjects, document, [object.id], { x: -5, y: 0 }, 4);
    expect(snap.snappedX).toBe(36);
  });

  it("lands the bottom edge on the trim when the delta crosses it", () => {
    const document = documentFor();
    const page = document.pages[0]!;
    const layer = page.layers[1]!;
    const object = square(layer.id, 100, 546, 50, 50);
    const withObjects = { ...page, objects: [object] };
    // Bottom edge dragged from 596 to 604, 4pt past the trim edge at 600.
    const snap = snapMove(withObjects, document, [object.id], { x: 0, y: 8 }, 4);
    expect(snap.snappedY).toBe(600);
  });

  it("does not snap when the threshold is zero", () => {
    const document = documentFor();
    const page = document.pages[0]!;
    const layer = page.layers[1]!;
    const object = square(layer.id, 41, 100, 50, 50);
    const snap = snapMove({ ...page, objects: [object] }, document, [object.id], { x: -5, y: 0 }, 0);
    expect(snap.snappedX).toBeNull();
    expect(snap.snappedY).toBeNull();
  });

  it("reports the guide lines the canvas should draw", () => {
    expect(snapGuides(36, null)).toEqual([
      { id: "snap-x", axis: "x", position: 36, scope: "page" },
    ]);
    expect(snapGuides(null, null)).toEqual([]);
  });
});

describe("spread rendering data", () => {
  it("derives facing-page geometry from the phase-1 modules", () => {
    const spec = pageSpec(
      { width: 400, height: 300 },
      { bleed: 10, margins: { top: 24, right: 20, bottom: 24, left: 36 } },
    );
    const left = createPage(spec);
    const right = createPage(spec);
    const spreads = planSpreads([left, right], { facingPages: true, coverStandalone: false });
    const geometry = spreadGeometry(spreads[0]!, [left, right]);
    expect(geometry.pages[0]!.side).toBe("left");
    expect(geometry.pages[1]!.side).toBe("right");
    expect(geometry.trim.width).toBe(800);
    expect(geometry.bleed.y).toBe(-10);
  });
});

describe("object factories used by the editor", () => {
  it("reaches every phase-1 object kind without destroying payloads", () => {
    const page = createPage(SPEC);
    const layer = page.layers[1]!;
    const text = createTextFrame({
      layerId: layer.id,
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      storyId: "s1",
    });
    const line = createLine({ layerId: layer.id, x: 0, y: 0, width: 80, height: 0 });
    const generic = createGenericObject({
      layerId: layer.id,
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      originalKind: "chart",
    });
    const story = createStory("Body", { paragraphs: [createParagraph("Hello")] });
    expect(text.storyId).toBe("s1");
    expect(generic.originalKind).toBe("chart");
    expect(story.paragraphs[0]!.runs[0]!.text).toBe("Hello");
    expect(hitTestPage({ ...page, objects: [text, line, generic] }, { x: 50, y: 5 })!.kind).toBe(
      "text-frame",
    );
  });
});
