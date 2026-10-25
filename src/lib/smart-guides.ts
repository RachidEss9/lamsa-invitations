/**
 * Equal-spacing smart guides.
 *
 * Edge and centre snapping already align a layer with its neighbours. This
 * helper covers the other case: a layer being dragged between two others can
 * be pulled to the exact spot where the gap on each side is identical, which is
 * the spacing every invitation layout depends on. It works in one axis at a
 * time and only reports a snap when both neighbours exist, so it can never
 * fight a page-edge or centre snap.
 */

export interface GuideRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SpacingSegments {
  /** A vertical line when equal gaps sit side by side, horizontal otherwise. */
  orientation: "vertical" | "horizontal";
  /** Position on the cross axis, in design units. */
  at: number;
  from: number;
  to: number;
}

export interface SpacingSnap {
  /** Offset to add to the dragged layer on the snapped axis. */
  delta: number;
  segments: SpacingSegments[];
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * @param moving     the dragged layer, already at its unsnapped position
 * @param others     every other visible layer on the page
 * @param axis       "x" for side-by-side gaps, "y" for stacked gaps
 * @param threshold  maximum difference in design units that still snaps
 */
export function equalSpacingSnap(
  moving: GuideRect,
  others: GuideRect[],
  axis: "x" | "y",
  threshold: number,
): SpacingSnap | null {
  if (threshold <= 0) return null;

  const horizontal = axis === "x";
  const start = horizontal ? moving.x : moving.y;
  const size = horizontal ? moving.w : moving.h;
  const end = start + size;
  const crossStart = horizontal ? moving.y : moving.x;
  const crossEnd = horizontal ? moving.y + moving.h : moving.x + moving.w;

  // Only layers that face the dragged one across the gap count, so a layer far
  // above a side-by-side row cannot define its spacing.
  const facing = others.filter((other) =>
    horizontal
      ? overlaps(crossStart, crossEnd, other.y, other.y + other.h)
      : overlaps(crossStart, crossEnd, other.x, other.x + other.w),
  );

  const before = facing
    .filter((other) => (horizontal ? other.x + other.w : other.y + other.h) <= start)
    .sort((a, b) =>
      horizontal ? b.x + b.w - (a.x + a.w) : b.y + b.h - (a.y + a.h),
    )[0];
  const after = facing
    .filter((other) => (horizontal ? other.x : other.y) >= end)
    .sort((a, b) => (horizontal ? a.x - b.x : a.y - b.y))[0];

  if (!before || !after) return null;

  const beforeEdge = horizontal ? before.x + before.w : before.y + before.h;
  const afterEdge = horizontal ? after.x : after.y;
  const gapBefore = start - beforeEdge;
  const gapAfter = afterEdge - end;
  if (gapBefore < 0 || gapAfter < 0) return null;

  const difference = gapAfter - gapBefore;
  if (Math.abs(difference) > threshold) return null;

  const delta = difference / 2;
  const snappedStart = start + delta;
  const snappedEnd = end + delta;

  const envelopeFrom = Math.min(
    crossStart,
    horizontal ? before.y : before.x,
    horizontal ? after.y : after.x,
  );
  const envelopeTo = Math.max(
    crossEnd,
    horizontal ? before.y + before.h : before.x + before.w,
    horizontal ? after.y + after.h : after.x + after.w,
  );

  return {
    delta,
    segments: [
      {
        orientation: horizontal ? "vertical" : "horizontal",
        at: (beforeEdge + snappedStart) / 2,
        from: envelopeFrom,
        to: envelopeTo,
      },
      {
        orientation: horizontal ? "vertical" : "horizontal",
        at: (snappedEnd + afterEdge) / 2,
        from: envelopeFrom,
        to: envelopeTo,
      },
    ],
  };
}

/**
 * Runs both axes for a dragged layer. Kept here so the canvas stays readable
 * and the behaviour can be tested without a DOM.
 */
export function equalSpacingGuides(
  moving: GuideRect,
  others: GuideRect[],
  threshold: number,
): { dx: number; dy: number; segments: SpacingSegments[] } {
  const horizontal = equalSpacingSnap(moving, others, "x", threshold);
  const dx = horizontal?.delta ?? 0;
  const afterX = { ...moving, x: moving.x + dx };
  const vertical = equalSpacingSnap(afterX, others, "y", threshold);
  const dy = vertical?.delta ?? 0;
  return {
    dx,
    dy,
    segments: [...(horizontal?.segments ?? []), ...(vertical?.segments ?? [])],
  };
}
