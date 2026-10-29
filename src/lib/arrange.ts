/**
 * Alignment and distribution for a selection.
 *
 * Pure geometry, kept out of the studio so the rules can be tested without a
 * DOM: what frame a selection aligns to, and how gaps are shared when it is
 * spread out. The studio applies the returned positions through its normal
 * history path, so arranging is one undoable step like any other edit.
 */

export type AlignKind = "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom";

export interface ArrangeRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Locked layers are never moved by an arrangement. */
  locked?: boolean;
}

export interface ArrangeFrame {
  x: number;
  y: number;
  w: number;
  h: number;
}

const isMovable = (item: ArrangeRect) => !item.locked;

/** The frame an arrangement acts against: the selection's own bounds. */
function boundsOf(items: ArrangeRect[]): ArrangeFrame {
  const left = Math.min(...items.map((item) => item.x));
  const top = Math.min(...items.map((item) => item.y));
  const right = Math.max(...items.map((item) => item.x + item.w));
  const bottom = Math.max(...items.map((item) => item.y + item.h));
  return { x: left, y: top, w: right - left, h: bottom - top };
}

/**
 * Where each selected layer lands when aligned.
 *
 * One layer aligns to the page — that is the only frame it has. Several align
 * to their shared bounds, so "align left" lines their left edges up instead of
 * stacking every layer on top of the page's left edge.
 *
 * @param frame the page, when a single layer is selected
 */
export function alignPositions(
  items: ArrangeRect[],
  kind: AlignKind,
  frame: ArrangeFrame,
): Map<string, { x: number; y: number }> {
  const movable = items.filter(isMovable);
  const target = movable.length > 1 ? boundsOf(movable) : frame;
  const positions = new Map<string, { x: number; y: number }>();
  for (const item of movable) {
    let { x, y } = item;
    if (kind === "left") x = target.x;
    else if (kind === "right") x = target.x + target.w - item.w;
    else if (kind === "hcenter") x = target.x + (target.w - item.w) / 2;
    else if (kind === "top") y = target.y;
    else if (kind === "bottom") y = target.y + target.h - item.h;
    else y = target.y + (target.h - item.h) / 2;
    positions.set(item.id, { x: Math.round(x), y: Math.round(y) });
  }
  return positions;
}

/**
 * Evenly shared positions along one axis: the first and last layer keep their
 * outer edges and the space between every pair becomes identical, which is the
 * spacing that reads as deliberate on an invitation.
 *
 * @returns the new x (axis `h`) or y (axis `v`) for each layer, or null when
 *          fewer than three movable layers are selected.
 */
export function distributePositions(
  items: ArrangeRect[],
  axis: "h" | "v",
): Map<string, number> | null {
  const movable = items.filter(isMovable);
  if (movable.length < 3) return null;

  const horizontal = axis === "h";
  const sorted = [...movable].sort((a, b) =>
    horizontal ? a.x - b.x : a.y - b.y,
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const span = horizontal
    ? last.x + last.w - first.x
    : last.y + last.h - first.y;
  const total = sorted.reduce(
    (sum, item) => sum + (horizontal ? item.w : item.h),
    0,
  );
  const gap = (span - total) / (sorted.length - 1);

  const positions = new Map<string, number>();
  let cursor = horizontal ? first.x : first.y;
  for (const item of sorted) {
    positions.set(item.id, Math.round(cursor));
    cursor += (horizontal ? item.w : item.h) + gap;
  }
  return positions;
}
