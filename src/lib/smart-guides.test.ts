import { describe, expect, it } from "vitest";
import {
  equalSpacingGuides,
  equalSpacingSnap,
  type GuideRect,
} from "./smart-guides";

function layer(x: number, y: number, w = 100, h = 60): GuideRect {
  return { x, y, w, h };
}

describe("equalSpacingSnap", () => {
  it("centres a layer between two neighbours when the gaps nearly match", () => {
    const left = layer(0, 0);
    const right = layer(300, 0);
    // Gaps: 52 on the left, 48 on the right → 50 / 50 after the snap.
    const moving = layer(152, 0);
    const snap = equalSpacingSnap(moving, [left, right], "x", 7);
    expect(snap).not.toBeNull();
    expect(snap!.delta).toBe(-2);
    expect(snap!.segments).toHaveLength(2);
    expect(snap!.segments[0].orientation).toBe("vertical");
    expect(snap!.segments[0].at).toBeCloseTo(125);
  });

  it("does not snap when the gaps differ by more than the threshold", () => {
    const snap = equalSpacingSnap(layer(160, 0), [layer(0, 0), layer(400, 0)], "x", 7);
    expect(snap).toBeNull();
  });

  it("needs a neighbour on both sides", () => {
    expect(equalSpacingSnap(layer(140, 0), [layer(0, 0)], "x", 7)).toBeNull();
    expect(equalSpacingSnap(layer(140, 0), [layer(400, 0)], "x", 7)).toBeNull();
    expect(equalSpacingSnap(layer(140, 0), [], "x", 7)).toBeNull();
  });

  it("ignores layers that do not face the dragged one", () => {
    const farAbove = layer(0, 900);
    const right = layer(300, 0);
    expect(equalSpacingSnap(layer(110, 0), [farAbove, right], "x", 7)).toBeNull();
  });

  it("uses the nearest neighbours, not the outermost ones", () => {
    const nearLeft = layer(60, 0);
    const farLeft = layer(-500, 0);
    const snap = equalSpacingSnap(
      layer(231, 0),
      [farLeft, nearLeft, layer(400, 0)],
      "x",
      7,
    );
    expect(snap?.delta).toBe(-1);
    expect(snap?.segments[0].at).toBeCloseTo(195);
  });

  it("snaps stacked layers vertically", () => {
    const above = layer(0, 0);
    const below = layer(0, 300);
    const moving = layer(0, 152);
    const snap = equalSpacingSnap(moving, [above, below], "y", 7);
    expect(snap).not.toBeNull();
    expect(snap!.delta).toBe(-2);
    expect(snap!.segments[0].orientation).toBe("horizontal");
  });

  it("returns nothing for a non-positive threshold", () => {
    expect(equalSpacingSnap(layer(110, 0), [layer(0, 0), layer(300, 0)], "x", 0)).toBeNull();
  });
});

describe("equalSpacingGuides", () => {
  it("resolves both axes and reports the offsets the canvas should apply", () => {
    const others = [
      layer(0, 160),
      layer(300, 160),
      layer(100, 0, 200, 60),
      layer(100, 300, 200, 60),
    ];
    const result = equalSpacingGuides(layer(152, 152), others, 7);
    expect(result.dx).toBe(-2);
    expect(result.dy).toBe(-2);
    expect(result.segments).toHaveLength(4);
  });

  it("leaves a layer alone when no neighbour pair matches", () => {
    const result = equalSpacingGuides(layer(500, 500), [layer(0, 0)], 7);
    expect(result).toEqual({ dx: 0, dy: 0, segments: [] });
  });
});
