/**
 * Guides, grids and snapping.
 *
 * Snapping is expressed as pure data: a page produces a list of x and y
 * targets (trim edges, centre, safe-area edges, column edges and centres,
 * baseline positions, saved guides), and a frame is nudged to the nearest
 * target within a threshold. Nothing here touches a timeline or a pointer.
 */

import type { Guide, GridSettings, ObjectFrame, PageSide, PageSpec, Point } from "./model";
import { DEFAULT_GRID } from "./model";
import { baselinePositions, columnRects, safeBox, trimBox } from "./geometry";
import { frameBounds } from "./object-transform";

export interface SnapTargets {
  x: number[];
  y: number[];
}

export interface FrameSnapResult {
  frame: ObjectFrame;
  dx: number;
  dy: number;
  /** The target the frame landed on, or null when it did not snap. */
  snappedX: number | null;
  snappedY: number | null;
}

const EPSILON = 1e-4;

function uniqueSorted(values: readonly number[]): number[] {
  const seen = new Set<number>();
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    seen.add(Math.round(value / EPSILON) * EPSILON);
  }
  return [...seen].sort((a, b) => a - b);
}

/** Positions of saved guides for one axis, including document-wide guides. */
export function guidePositions(
  guides: readonly Guide[],
  axis: "x" | "y",
  pageId?: string,
): number[] {
  return guides
    .filter(
      (guide) =>
        guide.axis === axis &&
        (guide.scope === "document" || (guide.scope === "page" && guide.pageId === pageId)),
    )
    .map((guide) => guide.position);
}

/**
 * Every x and y a frame can snap to on a page: trim edges and centre, the
 * safe area, column edges and centres, baselines and guides.
 */
export function snapTargetsForPage(
  spec: PageSpec,
  grid: GridSettings = DEFAULT_GRID,
  guides: readonly Guide[] = [],
  pageId?: string,
  side: PageSide = "single",
): SnapTargets {
  const trim = trimBox(spec);
  const safe = safeBox(spec, side);
  const columns = columnRects(spec, grid, side);

  const x: number[] = [
    0,
    trim.width / 2,
    trim.width,
    safe.x,
    safe.x + safe.width,
    ...columns.map((column) => column.x),
    ...columns.map((column) => column.x + column.width),
    ...columns.map((column) => column.x + column.width / 2),
    ...guidePositions(guides, "x", pageId),
  ];
  const y: number[] = [
    0,
    trim.height / 2,
    trim.height,
    safe.y,
    safe.y + safe.height,
    ...(grid.enabled ? baselinePositions(spec, grid, side) : []),
    ...guidePositions(guides, "y", pageId),
  ];

  return { x: uniqueSorted(x), y: uniqueSorted(y) };
}

/** The closest target within the threshold, or null. */
export function nearestTarget(
  value: number,
  targets: readonly number[],
  threshold: number,
): number | null {
  let best: number | null = null;
  let bestDistance = threshold;
  for (const target of targets) {
    const distance = Math.abs(target - value);
    if (distance <= bestDistance) {
      best = target;
      bestDistance = distance;
    }
  }
  return best;
}

/** Snaps a single value, leaving it untouched when no target is close. */
export function snapValue(
  value: number,
  targets: readonly number[],
  threshold: number,
): number {
  return nearestTarget(value, targets, threshold) ?? value;
}

export function snapPoint(
  target: Point,
  targets: SnapTargets,
  threshold: number,
): Point {
  return {
    x: snapValue(target.x, targets.x, threshold),
    y: snapValue(target.y, targets.y, threshold),
  };
}

/**
 * Snaps a frame by its visible edges and centre. The smallest movement wins,
 * so a frame near a column edge snaps to the edge rather than its centre.
 */
export function snapFrame(
  frame: ObjectFrame,
  targets: SnapTargets,
  threshold: number,
): FrameSnapResult {
  if (!(threshold > 0)) {
    return { frame, dx: 0, dy: 0, snappedX: null, snappedY: null };
  }
  const bounds = frameBounds(frame);
  const xCandidates = [bounds.x, bounds.x + bounds.width / 2, bounds.x + bounds.width];
  const yCandidates = [bounds.y, bounds.y + bounds.height / 2, bounds.y + bounds.height];

  let dx = 0;
  let snappedX: number | null = null;
  let bestX = threshold;
  for (const candidate of xCandidates) {
    const target = nearestTarget(candidate, targets.x, threshold);
    if (target === null) continue;
    const distance = Math.abs(target - candidate);
    if (distance <= bestX) {
      bestX = distance;
      dx = target - candidate;
      snappedX = target;
    }
  }

  let dy = 0;
  let snappedY: number | null = null;
  let bestY = threshold;
  for (const candidate of yCandidates) {
    const target = nearestTarget(candidate, targets.y, threshold);
    if (target === null) continue;
    const distance = Math.abs(target - candidate);
    if (distance <= bestY) {
      bestY = distance;
      dy = target - candidate;
      snappedY = target;
    }
  }

  if (dx === 0 && dy === 0) {
    return { frame, dx: 0, dy: 0, snappedX, snappedY };
  }
  return {
    frame: { ...frame, x: frame.x + dx, y: frame.y + dy },
    dx,
    dy,
    snappedX,
    snappedY,
  };
}
