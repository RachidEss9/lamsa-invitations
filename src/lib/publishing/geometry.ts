/**
 * Page geometry: trim, bleed, safe area and columns.
 *
 * All dimensions are points and all boxes use the page's top-left origin.
 * The three boxes are kept strictly separate:
 *
 *   bleed  ┌─────────────────────┐  negative origin
 *          │  ┌───────────────┐  │
 *   trim   │  │  ┌─────────┐  │  │  (0, 0)
 *          │  │  │  safe   │  │  │
 *          │  │  └─────────┘  │  │
 *          │  └───────────────┘  │
 *          └─────────────────────┘
 *
 * Nothing here reads a document or mutates one: these are pure measurements,
 * so a preset, a spread, the editor and the PDF writer all agree by
 * construction.
 */

import { DEFAULT_GRID, type Edges, type GridSettings, type Orientation, type PageSide, type PageSpec, type Point, type Rect, type Size } from "./model";

export function size(width: number, height: number): Size {
  return { width, height };
}

export function point(x: number, y: number): Point {
  return { x, y };
}

export function rect(x: number, y: number, width: number, height: number): Rect {
  return { x, y, width, height };
}

export function edges(top: number, right: number, bottom: number, left: number): Edges {
  return { top, right, bottom, left };
}

/** A page specification from a trim size and optional print settings. */
export function pageSpec(
  trim: Size,
  options: Partial<Omit<PageSpec, "trim">> = {},
): PageSpec {
  return {
    trim: { width: trim.width, height: trim.height },
    bleed: Math.max(0, options.bleed ?? 0),
    margins: { ...(options.margins ?? { top: 0, right: 0, bottom: 0, left: 0 }) },
    mirrorMargins: options.mirrorMargins ?? false,
  };
}

/** Portraits are taller than wide; a square page reads as portrait. */
export function orientationOf(spec: Pick<PageSpec, "trim">): Orientation {
  return spec.trim.height >= spec.trim.width ? "portrait" : "landscape";
}

/** Swaps the trim to the requested orientation, keeping the short/long sides. */
export function withOrientation(spec: PageSpec, orientation: Orientation): PageSpec {
  const { width, height } = spec.trim;
  const portrait = Math.min(width, height);
  const landscape = Math.max(width, height);
  const trim =
    orientation === "portrait"
      ? { width: portrait, height: landscape }
      : { width: landscape, height: portrait };
  return { ...spec, trim };
}

export function mirroredMargins(margins: Edges): Edges {
  return {
    top: margins.top,
    right: margins.left,
    bottom: margins.bottom,
    left: margins.right,
  };
}

/**
 * The margins that actually apply to a page side. A recto page uses the spec
 * as written (inner margin on the left); a verso page mirrors it. A single
 * page is never mirrored.
 */
export function marginsForSide(spec: PageSpec, side: PageSide): Edges {
  if (!spec.mirrorMargins || side !== "left") return { ...spec.margins };
  return mirroredMargins(spec.margins);
}

/** The trim rectangle, always at the page origin. */
export function trimBox(spec: PageSpec): Rect {
  return { x: 0, y: 0, width: spec.trim.width, height: spec.trim.height };
}

/** The bleed rectangle: the trim expanded by the bleed band on every edge. */
export function bleedBox(spec: PageSpec): Rect {
  const bleed = Math.max(0, spec.bleed);
  return {
    x: -bleed,
    y: -bleed,
    width: spec.trim.width + bleed * 2,
    height: spec.trim.height + bleed * 2,
  };
}

/** The safe area: the trim inset by the margins, never inverted. */
export function safeBox(spec: PageSpec, side: PageSide = "single"): Rect {
  const margins = marginsForSide(spec, side);
  const width = Math.max(0, spec.trim.width - margins.left - margins.right);
  const height = Math.max(0, spec.trim.height - margins.top - margins.bottom);
  return { x: margins.left, y: margins.top, width, height };
}

/** The bleed distances of one page, in points, for spread composition. */
export function bleedOf(spec: PageSpec): number {
  return Math.max(0, spec.bleed);
}

/* -------------------------------------------------------------------------- */
/* Grid                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Column rectangles inside the safe area, left to right. A single column
 * simply fills the safe width; extra gutters never make a column negative.
 */
export function columnRects(
  spec: PageSpec,
  grid: GridSettings = DEFAULT_GRID,
  side: PageSide = "single",
): Rect[] {
  const safe = safeBox(spec, side);
  const columns = Math.max(1, Math.floor(grid.columns) || 1);
  const gutter = Math.max(0, grid.gutter);
  const totalGutter = gutter * (columns - 1);
  const width = Math.max(0, (safe.width - totalGutter) / columns);
  return Array.from({ length: columns }, (_, index) => ({
    x: safe.x + index * (width + gutter),
    y: safe.y,
    width,
    height: safe.height,
  }));
}

/** Baseline positions from the top of the safe area to its bottom. */
export function baselinePositions(
  spec: PageSpec,
  grid: GridSettings = DEFAULT_GRID,
  side: PageSide = "single",
): number[] {
  const step = grid.baseline;
  if (!(step > 0)) return [];
  const safe = safeBox(spec, side);
  const positions: number[] = [];
  const count = Math.floor(safe.height / step) + 1;
  for (let index = 0; index < count; index += 1) {
    positions.push(safe.y + index * step);
  }
  return positions;
}

/* -------------------------------------------------------------------------- */
/* Rectangle arithmetic                                                       */
/* -------------------------------------------------------------------------- */

/** A rectangle from two corners, in any order. */
export function rectFromPoints(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };
}

/** Repairs negative width/height into a normal rectangle. */
export function normalizeRect(value: Rect): Rect {
  return rectFromPoints(
    { x: value.x, y: value.y },
    { x: value.x + value.width, y: value.y + value.height },
  );
}

export function insetRect(value: Rect, inset: Edges): Rect {
  return {
    x: value.x + inset.left,
    y: value.y + inset.top,
    width: Math.max(0, value.width - inset.left - inset.right),
    height: Math.max(0, value.height - inset.top - inset.bottom),
  };
}

export function outsetRect(value: Rect, by: number): Rect {
  return {
    x: value.x - by,
    y: value.y - by,
    width: value.width + by * 2,
    height: value.height + by * 2,
  };
}

export function offsetRect(value: Rect, dx: number, dy: number): Rect {
  return { x: value.x + dx, y: value.y + dy, width: value.width, height: value.height };
}

export function centerOf(value: Rect): Point {
  return { x: value.x + value.width / 2, y: value.y + value.height / 2 };
}

export function areaOf(value: Rect): number {
  return Math.max(0, value.width) * Math.max(0, value.height);
}

export function rectContainsPoint(value: Rect, target: Point): boolean {
  return (
    target.x >= value.x &&
    target.y >= value.y &&
    target.x <= value.x + value.width &&
    target.y <= value.y + value.height
  );
}

export function rectContainsRect(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

/** The bounding box of two rectangles. */
export function unionRects(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  };
}

/** The overlap of two rectangles; an empty box when they do not intersect. */
export function intersectRects(a: Rect, b: Rect): Rect {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  return { x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y) };
}

/** Bounding box of any number of rectangles, or null for an empty list. */
export function boundsOfRects(rects: readonly Rect[]): Rect | null {
  if (rects.length === 0) return null;
  let result = rects[0]!;
  for (let index = 1; index < rects.length; index += 1) {
    result = unionRects(result, rects[index]!);
  }
  return result;
}

export function rectsEqual(a: Rect, b: Rect, tolerance = 1e-6): boolean {
  return (
    Math.abs(a.x - b.x) <= tolerance &&
    Math.abs(a.y - b.y) <= tolerance &&
    Math.abs(a.width - b.width) <= tolerance &&
    Math.abs(a.height - b.height) <= tolerance
  );
}

/** Every measurement of a page in one object, for the editor's readouts. */
export interface PageGeometry {
  spec: PageSpec;
  side: PageSide;
  orientation: Orientation;
  trim: Rect;
  bleed: Rect;
  safe: Rect;
  margins: Edges;
}

export function pageGeometry(spec: PageSpec, side: PageSide = "single"): PageGeometry {
  return {
    spec,
    side,
    orientation: orientationOf(spec),
    trim: trimBox(spec),
    bleed: bleedBox(spec),
    safe: safeBox(spec, side),
    margins: marginsForSide(spec, side),
  };
}
