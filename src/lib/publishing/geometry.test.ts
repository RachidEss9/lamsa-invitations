import { describe, expect, it } from "vitest";
import {
  baselinePositions,
  bleedBox,
  boundsOfRects,
  centerOf,
  columnRects,
  insetRect,
  marginsForSide,
  mirroredMargins,
  offsetRect,
  orientationOf,
  outsetRect,
  pageGeometry,
  pageSpec,
  rect,
  rectContainsPoint,
  rectContainsRect,
  rectFromPoints,
  rectsEqual,
  rectsIntersect,
  safeBox,
  trimBox,
  unionRects,
  withOrientation,
} from "./geometry";

/**
 * The three boxes a printer cares about — trim, bleed and safe — are measured
 * independently. These tests pin the arithmetic and the mirroring rule that
 * makes inner margins on facing pages correct.
 */

const SPEC = pageSpec(
  { width: 400, height: 600 },
  {
    bleed: 10,
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
  },
);

describe("page specification", () => {
  it("normalises bleed and margins to non-negative points", () => {
    const spec = pageSpec(
      { width: 100, height: 200 },
      { bleed: -5, margins: { top: 1, right: 2, bottom: 3, left: 4 } },
    );
    expect(spec.bleed).toBe(0);
    expect(spec.margins).toEqual({ top: 1, right: 2, bottom: 3, left: 4 });
    expect(spec.mirrorMargins).toBe(false);
  });

  it("derives orientation from the trim, never the other way round", () => {
    expect(orientationOf({ trim: { width: 400, height: 600 } })).toBe("portrait");
    expect(orientationOf({ trim: { width: 600, height: 400 } })).toBe("landscape");
    expect(orientationOf({ trim: { width: 500, height: 500 } })).toBe("portrait");
  });

  it("swaps the trim for a requested orientation and keeps both sides", () => {
    const landscape = withOrientation(SPEC, "landscape");
    expect(landscape.trim).toEqual({ width: 600, height: 400 });
    expect(withOrientation(landscape, "portrait").trim).toEqual({ width: 400, height: 600 });
  });
});

describe("trim, bleed and safe area", () => {
  it("puts the trim at the page origin", () => {
    expect(trimBox(SPEC)).toEqual({ x: 0, y: 0, width: 400, height: 600 });
  });

  it("grows the bleed box outside the trim on every edge", () => {
    expect(bleedBox(SPEC)).toEqual({ x: -10, y: -10, width: 420, height: 620 });
  });

  it("insets the safe area by the margins", () => {
    expect(safeBox(SPEC)).toEqual({ x: 20, y: 20, width: 360, height: 560 });
  });

  it("never produces a negative safe area", () => {
    const tight = pageSpec(
      { width: 100, height: 100 },
      { margins: { top: 60, right: 60, bottom: 60, left: 60 } },
    );
    const safe = safeBox(tight);
    expect(safe.width).toBe(0);
    expect(safe.height).toBe(0);
  });

  it("keeps the boxes strictly separate", () => {
    const geometry = pageGeometry(SPEC);
    expect(geometry.trim).toEqual(trimBox(SPEC));
    expect(geometry.bleed).toEqual(bleedBox(SPEC));
    expect(geometry.safe).toEqual(safeBox(SPEC));
    expect(geometry.orientation).toBe("portrait");
    expect(geometry.margins).toEqual(SPEC.margins);
  });
});

describe("mirrored margins", () => {
  const mirrored = pageSpec(
    { width: 400, height: 600 },
    {
      margins: { top: 20, right: 10, bottom: 20, left: 40 },
      mirrorMargins: true,
    },
  );

  it("swaps left and right for a verso page", () => {
    expect(mirroredMargins(mirrored.margins)).toEqual({
      top: 20,
      right: 40,
      bottom: 20,
      left: 10,
    });
    expect(marginsForSide(mirrored, "left")).toEqual({
      top: 20,
      right: 40,
      bottom: 20,
      left: 10,
    });
  });

  it("leaves a recto page as written", () => {
    expect(marginsForSide(mirrored, "right")).toEqual(mirrored.margins);
  });

  it("never mirrors a single page", () => {
    expect(marginsForSide(mirrored, "single")).toEqual(mirrored.margins);
  });

  it("moves the safe area to the inner edge on a left page", () => {
    expect(safeBox(mirrored, "left")).toEqual({ x: 10, y: 20, width: 350, height: 560 });
    expect(safeBox(mirrored, "right")).toEqual({ x: 40, y: 20, width: 350, height: 560 });
  });
});

describe("column grid", () => {
  it("splits the safe area into equal columns with gutters", () => {
    const columns = columnRects(SPEC, { enabled: true, columns: 3, gutter: 30, baseline: 0 });
    expect(columns).toHaveLength(3);
    expect(columns.map((column) => column.width)).toEqual([100, 100, 100]);
    expect(columns.map((column) => column.x)).toEqual([20, 150, 280]);
    expect(columns.every((column) => column.y === 20 && column.height === 560)).toBe(true);
  });

  it("treats a single column as the whole safe width", () => {
    const [only] = columnRects(SPEC, { enabled: true, columns: 1, gutter: 50, baseline: 0 });
    expect(only).toEqual({ x: 20, y: 20, width: 360, height: 560 });
  });

  it("never produces a negative column when the gutters overflow", () => {
    const columns = columnRects(SPEC, { enabled: true, columns: 4, gutter: 200, baseline: 0 });
    expect(columns).toHaveLength(4);
    expect(columns.every((column) => column.width === 0)).toBe(true);
  });

  it("uses mirrored margins for a left page", () => {
    const spec = pageSpec(
      { width: 400, height: 600 },
      { margins: { top: 0, right: 10, bottom: 0, left: 50 }, mirrorMargins: true },
    );
    const columns = columnRects(spec, { enabled: true, columns: 2, gutter: 0, baseline: 0 }, "left");
    expect(columns.map((column) => column.x)).toEqual([10, 180]);
  });
});

describe("baseline grid", () => {
  it("runs from the top of the safe area to its bottom", () => {
    const positions = baselinePositions(SPEC, { enabled: true, columns: 1, gutter: 0, baseline: 100 });
    expect(positions).toEqual([20, 120, 220, 320, 420, 520]);
  });

  it("returns nothing when the grid is disabled", () => {
    expect(
      baselinePositions(SPEC, { enabled: true, columns: 1, gutter: 0, baseline: 0 }),
    ).toEqual([]);
  });
});

describe("rectangle arithmetic", () => {
  it("builds a rectangle from two corners in any order", () => {
    expect(rectFromPoints({ x: 100, y: 100 }, { x: 20, y: 40 })).toEqual({
      x: 20,
      y: 40,
      width: 80,
      height: 60,
    });
  });

  it("insets and outsets without inverting", () => {
    expect(insetRect(rect(10, 10, 100, 50), { top: 5, right: 10, bottom: 5, left: 20 })).toEqual({
      x: 30,
      y: 15,
      width: 70,
      height: 40,
    });
    expect(
      insetRect(rect(0, 0, 10, 10), { top: 20, right: 20, bottom: 20, left: 20 }),
    ).toEqual({ x: 20, y: 20, width: 0, height: 0 });
    expect(outsetRect(rect(0, 0, 10, 10), 5)).toEqual({ x: -5, y: -5, width: 20, height: 20 });
    expect(offsetRect(rect(0, 0, 10, 10), 3, 4)).toEqual({ x: 3, y: 4, width: 10, height: 10 });
  });

  it("finds centres and unions", () => {
    expect(centerOf(rect(0, 0, 100, 50))).toEqual({ x: 50, y: 25 });
    expect(unionRects(rect(0, 0, 10, 10), rect(20, 5, 10, 10))).toEqual({
      x: 0,
      y: 0,
      width: 30,
      height: 15,
    });
    expect(boundsOfRects([])).toBeNull();
    expect(boundsOfRects([rect(0, 0, 10, 10), rect(5, 5, 10, 10)])).toEqual({
      x: 0,
      y: 0,
      width: 15,
      height: 15,
    });
  });

  it("tests containment and intersection on the edges", () => {
    const outer = rect(0, 0, 100, 100);
    expect(rectContainsPoint(outer, { x: 100, y: 100 })).toBe(true);
    expect(rectContainsPoint(outer, { x: 100.1, y: 50 })).toBe(false);
    expect(rectContainsRect(outer, rect(10, 10, 20, 20))).toBe(true);
    expect(rectContainsRect(outer, rect(90, 90, 20, 20))).toBe(false);
    expect(rectsIntersect(outer, rect(50, 50, 100, 100))).toBe(true);
    expect(rectsIntersect(outer, rect(100, 0, 10, 10))).toBe(false);
  });

  it("compares boxes with an explicit tolerance", () => {
    expect(rectsEqual(rect(0, 0, 10, 10), rect(0.0000001, 0, 10, 10))).toBe(true);
    expect(rectsEqual(rect(0, 0, 10, 10), rect(0.1, 0, 10, 10))).toBe(false);
  });
});
