import { describe, expect, it } from "vitest";

import { elementShape, flipShapePath, type ElementAsset } from "./elements";
import { frameBounds } from "./object-transform";

const strokeAsset: ElementAsset = {
  id: "test-stroke",
  name: "Test flourish",
  d: "M 10 10 L 90 10 L 90 90",
  ink: "stroke",
  strokeWidth: 2,
  opacity: 0.8,
  aspect: 1,
};

const fillAsset: ElementAsset = {
  id: "test-fill",
  name: "Test leaf",
  d: "M 50 10 C 80 30 80 70 50 90 C 20 70 20 30 50 10 Z",
  ink: "fill",
  strokeWidth: 0,
  opacity: 1,
  aspect: 0.7,
};

describe("element insertion", () => {
  it("makes a native path shape in page coordinates", () => {
    const object = elementShape({
      layerId: "layer-1",
      frame: { x: 100, y: 200, width: 120, height: 120, rotation: 0 },
      asset: strokeAsset,
    });
    expect(object.kind).toBe("shape");
    expect(object.shape).toBe("path");
    expect(object.name).toBe("Test flourish");
    expect(object.path?.startsWith("M 112 212")).toBe(true);
    expect(object.fill).toBeUndefined();
    expect(object.stroke).toBe("#1c1b18");
    expect(object.strokeWidth).toBeCloseTo(2.4, 5);
    expect(object.opacity).toBe(0.8);
    expect(object.frame).toEqual({ x: 100, y: 200, width: 120, height: 120, rotation: 0 });
  });

  it("uses fill for solid artwork and no stroke", () => {
    const object = elementShape({
      layerId: "layer-1",
      frame: { x: 0, y: 0, width: 210, height: 140, rotation: 0 },
      asset: fillAsset,
    });
    expect(object.fill).toBe("#1c1b18");
    expect(object.stroke).toBeUndefined();
    expect(object.strokeWidth).toBe(0);
    expect(frameBounds(object.frame).width).toBe(210);
  });

  it("keeps the path inside the frame after a horizontal flip", () => {
    const object = elementShape({
      layerId: "layer-1",
      frame: { x: 50, y: 50, width: 100, height: 100, rotation: 0 },
      asset: strokeAsset,
    });
    const flipped = flipShapePath(object, "x")!;
    // Original path starts at (60,60); mirrored about x = 100 it becomes (140,60).
    expect(flipped.startsWith("M 140 60")).toBe(true);
    const bounds = flipped
      .match(/-?\d*\.?\d+/g)!
      .map(Number);
    const xs = bounds.filter((_, index) => index % 2 === 0);
    for (const x of xs) {
      expect(x).toBeGreaterThanOrEqual(49.9);
      expect(x).toBeLessThanOrEqual(150.1);
    }
  });

  it("flips vertically about the frame's centre line", () => {
    const object = elementShape({
      layerId: "layer-1",
      frame: { x: 0, y: 0, width: 100, height: 100, rotation: 0 },
      asset: strokeAsset,
    });
    const flipped = flipShapePath(object, "y")!;
    expect(flipped.startsWith("M 10 90")).toBe(true);
  });

  it("leaves non-path shapes untouched", () => {
    const object = elementShape({
      layerId: "l",
      frame: { x: 0, y: 0, width: 10, height: 10, rotation: 0 },
      asset: fillAsset,
    });
    const rectangle = { ...object, shape: "rectangle" as const };
    expect(flipShapePath(rectangle, "x")).toBe(rectangle.path);
  });
});
