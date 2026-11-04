/**
 * Alignment and distribution.
 *
 * Both work on the visible footprint of an object (the bounds of a rotated
 * frame), so rotating an object never moves what the user aligned. The
 * reference is either an explicit rectangle (the page, a spread, a selection)
 * or the bounding box of the objects themselves.
 *
 * Ordering is deterministic: ties are broken by the object id, so running the
 * same distribution twice always produces the same document.
 */

import type { ObjectFrame, Rect } from "./model";
import { boundsOfFrames, frameBounds, moveFrame } from "./object-transform";

export type AlignMode = "left" | "center" | "right" | "top" | "middle" | "bottom";

interface Placed {
  id: string;
  frame: ObjectFrame;
}

export function alignObjects<T extends Placed>(
  objects: readonly T[],
  mode: AlignMode,
  reference?: Rect,
): T[] {
  if (objects.length === 0) return objects as T[];
  const bounds = objects.map((object) => frameBounds(object.frame));
  const target = reference ?? boundsOfFrames(objects.map((object) => object.frame));
  if (!target) return objects as T[];
  if (!reference && objects.length < 2) return objects as T[];

  return objects.map((object, index) => {
    const box = bounds[index]!;
    let dx = 0;
    let dy = 0;
    switch (mode) {
      case "left":
        dx = target.x - box.x;
        break;
      case "center":
        dx = target.x + target.width / 2 - (box.x + box.width / 2);
        break;
      case "right":
        dx = target.x + target.width - (box.x + box.width);
        break;
      case "top":
        dy = target.y - box.y;
        break;
      case "middle":
        dy = target.y + target.height / 2 - (box.y + box.height / 2);
        break;
      case "bottom":
        dy = target.y + target.height - (box.y + box.height);
        break;
    }
    if (dx === 0 && dy === 0) return object;
    return { ...object, frame: moveFrame(object.frame, dx, dy) };
  });
}

export interface DistributeOptions {
  /**
   * A fixed gap in points. When omitted, the available space is split evenly
   * between the objects, which is the usual "distribute spacing" behaviour.
   */
  gap?: number;
}

/**
 * Distributes three or more objects between the outer two, along one axis.
 * The first and last objects stay where they are; everything between them is
 * placed with equal gaps.
 */
export function distributeObjects<T extends Placed>(
  objects: readonly T[],
  axis: "horizontal" | "vertical",
  options: DistributeOptions = {},
): T[] {
  if (objects.length < 3) return objects as T[];

  const measured = objects.map((object) => ({
    object,
    bounds: frameBounds(object.frame),
  }));
  const start = (box: Rect) => (axis === "horizontal" ? box.x : box.y);
  const size = (box: Rect) => (axis === "horizontal" ? box.width : box.height);
  const end = (box: Rect) => start(box) + size(box);

  const ordered = [...measured].sort((a, b) => {
    const delta = start(a.bounds) - start(b.bounds);
    if (delta !== 0) return delta;
    return a.object.id.localeCompare(b.object.id);
  });

  const first = ordered[0]!;
  const last = ordered[ordered.length - 1]!;
  const totalSize = ordered.reduce((sum, entry) => sum + size(entry.bounds), 0);
  const span = end(last.bounds) - start(first.bounds);
  const gap = options.gap ?? (span - totalSize) / (ordered.length - 1);

  let cursor = start(first.bounds);
  const deltas = new Map<string, number>();
  for (const entry of ordered) {
    const delta = cursor - start(entry.bounds);
    deltas.set(entry.object.id, delta);
    cursor += size(entry.bounds) + gap;
  }

  return objects.map((object) => {
    const delta = deltas.get(object.id) ?? 0;
    if (delta === 0) return object;
    return {
      ...object,
      frame:
        axis === "horizontal"
          ? moveFrame(object.frame, delta, 0)
          : moveFrame(object.frame, 0, delta),
    };
  });
}
