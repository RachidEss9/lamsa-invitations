/**
 * Canvas interaction mathematics.
 *
 * All gesture maths lives here, in points, so a drag behaves identically at
 * 12% and at 400% zoom and nothing depends on the browser's pixel grid. The
 * component layer only converts a pointer position to a page-local point and
 * hands it over.
 *
 * The rules the functions preserve:
 *   - moving never changes size or rotation;
 *   - resizing keeps the opposite corner pinned, even when the object is
 *     rotated (the drag is measured along the object's own axes);
 *   - rotating turns the frame about its centre without moving x/y;
 *   - hit-testing walks the real paint order, so the object a user sees on top
 *     is the object a click selects.
 */

import type {
  Guide,
  ObjectFrame,
  PublicationDocument,
  PublicationObject,
  PublicationPage,
  Point,
  Rect,
} from "./model";
import { drawOrder, objectIsSelectable, objectIsVisible } from "./layers";
import {
  frameBounds,
  frameCenter,
  frameContainsPoint,
  moveFrame,
  normalizeAngle,
  rotatePoint,
} from "./object-transform";
import { rectsIntersect } from "./geometry";
import { snapFrame, snapTargetsForPage } from "./grid";

export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export const RESIZE_HANDLES: readonly ResizeHandle[] = [
  "nw",
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w",
];

const OPPOSITE: Record<ResizeHandle, ResizeHandle> = {
  nw: "se",
  n: "s",
  ne: "sw",
  e: "w",
  se: "nw",
  s: "n",
  sw: "ne",
  w: "e",
};

/** The local point of a handle inside an unrotated rectangle. */
export function handlePoint(rect: Rect, handle: ResizeHandle): Point {
  const { x, y, width, height } = rect;
  const midX = x + width / 2;
  const midY = y + height / 2;
  switch (handle) {
    case "nw":
      return { x, y };
    case "n":
      return { x: midX, y };
    case "ne":
      return { x: x + width, y };
    case "e":
      return { x: x + width, y: midY };
    case "se":
      return { x: x + width, y: y + height };
    case "s":
      return { x: midX, y: y + height };
    case "sw":
      return { x, y: y + height };
    case "w":
      return { x, y: midY };
  }
}

/** Every resize handle of a frame in page space (rotation included). */
export function frameHandlePoints(
  frame: ObjectFrame,
): Array<{ handle: ResizeHandle; point: Point }> {
  return RESIZE_HANDLES.map((handle) => ({
    handle,
    point: rotatePoint(
      handlePoint(frame, handle),
      frameCenter(frame),
      frame.rotation,
    ),
  }));
}

/**
 * Where the rotate grip sits: above the frame's top edge in the object's own
 * space, `offset` points away from the frame.
 */
export function frameRotatePoint(frame: ObjectFrame, offset: number): Point {
  const local = { x: frame.x + frame.width / 2, y: frame.y - Math.max(0, offset) };
  return rotatePoint(local, frameCenter(frame), frame.rotation);
}

/* -------------------------------------------------------------------------- */
/* Hit testing                                                                */
/* -------------------------------------------------------------------------- */

export interface HitOptions {
  /** Locked and hidden-but-visible objects may still be picked (inspector use). */
  includeLocked?: boolean;
}

/** The topmost object under a page-local point, or null. */
export function hitTestPage(
  page: PublicationPage,
  point: Point,
  options: HitOptions = {},
): PublicationObject | null {
  const order = drawOrder(page);
  for (let index = order.length - 1; index >= 0; index -= 1) {
    const object = order[index]!;
    if (!objectIsVisible(page, object)) continue;
    if (!options.includeLocked && !objectIsSelectable(page, object)) continue;
    if (frameContainsPoint(object.frame, point)) return object;
  }
  return null;
}

/** Selectable objects that overlap a page-local marquee rectangle. */
export function objectsInRect(
  page: PublicationPage,
  rect: Rect,
  options: HitOptions = {},
): PublicationObject[] {
  return drawOrder(page).filter((object) => {
    if (!objectIsVisible(page, object)) return false;
    if (!options.includeLocked && !objectIsSelectable(page, object)) return false;
    return rectsIntersect(frameBounds(object.frame), rect);
  });
}

/* -------------------------------------------------------------------------- */
/* Selection measurement                                                      */
/* -------------------------------------------------------------------------- */

export function selectionBounds(
  page: PublicationPage,
  ids: readonly string[],
): Rect | null {
  const wanted = new Set(ids);
  const boxes = page.objects
    .filter((object) => wanted.has(object.id))
    .map((object) => frameBounds(object.frame));
  if (boxes.length === 0) return null;
  let result = boxes[0]!;
  for (const box of boxes.slice(1)) {
    const left = Math.min(result.x, box.x);
    const top = Math.min(result.y, box.y);
    result = {
      x: left,
      y: top,
      width: Math.max(result.x + result.width, box.x + box.width) - left,
      height: Math.max(result.y + result.height, box.y + box.height) - top,
    };
  }
  return result;
}

export function selectedObjects(
  page: PublicationPage,
  ids: readonly string[],
): PublicationObject[] {
  const wanted = new Set(ids);
  return page.objects.filter((object) => wanted.has(object.id));
}

/* -------------------------------------------------------------------------- */
/* Transforms                                                                 */
/* -------------------------------------------------------------------------- */

/** Applies a frame transform to every editable object in a selection. */
export function transformSelection(
  page: PublicationPage,
  ids: readonly string[],
  transform: (frame: ObjectFrame) => ObjectFrame,
): PublicationPage {
  const wanted = new Set(ids);
  let changed = false;
  const objects = page.objects.map((object) => {
    if (!wanted.has(object.id) || object.locked) return object;
    const frame = transform(object.frame);
    if (frame === object.frame) return object;
    changed = true;
    return { ...object, frame };
  });
  return changed ? { ...page, objects } : page;
}

export function moveSelection(
  page: PublicationPage,
  ids: readonly string[],
  dx: number,
  dy: number,
): PublicationPage {
  if (dx === 0 && dy === 0) return page;
  return transformSelection(page, ids, (frame) => moveFrame(frame, dx, dy));
}

/** Sets an absolute rotation on every object in a selection. */
export function rotateSelection(
  page: PublicationPage,
  ids: readonly string[],
  degrees: number,
): PublicationPage {
  const rotation = normalizeAngle(degrees);
  return transformSelection(page, ids, (frame) =>
    frame.rotation === rotation ? frame : { ...frame, rotation },
  );
}

/**
 * Resizes one frame by dragging a handle. `delta` is measured in page points.
 *
 * The pointer delta is rotated into the object's own axes, the new size is
 * clamped, and the frame is then repositioned so the handle opposite the one
 * being dragged stays exactly where it was on the page.
 */
export function resizeFrameByHandle(
  frame: ObjectFrame,
  handle: ResizeHandle,
  delta: Point,
  options: { minSize?: number; keepAspect?: boolean } = {},
): ObjectFrame {
  const minSize = Math.max(0.5, options.minSize ?? 2);
  const radians = (-frame.rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const localX = delta.x * cos - delta.y * sin;
  const localY = delta.x * sin + delta.y * cos;

  let width = frame.width;
  let height = frame.height;
  if (handle.includes("e")) width += localX;
  if (handle.includes("w")) width -= localX;
  if (handle.includes("s")) height += localY;
  if (handle.includes("n")) height -= localY;
  width = Math.max(minSize, width);
  height = Math.max(minSize, height);

  const corner = handle === "nw" || handle === "ne" || handle === "se" || handle === "sw";
  if (options.keepAspect && corner && frame.width > 0 && frame.height > 0) {
    const aspect = frame.width / frame.height;
    if (Math.abs(width - frame.width) >= Math.abs(height - frame.height)) {
      height = Math.max(minSize, width / aspect);
    } else {
      width = Math.max(minSize, height * aspect);
    }
  }

  const fixedPage = rotatePoint(
    handlePoint(frame, OPPOSITE[handle]),
    frameCenter(frame),
    frame.rotation,
  );
  const fixedLocalNew = handlePoint({ x: 0, y: 0, width, height }, OPPOSITE[handle]);
  const rotatedOffset = rotatePoint(
    fixedLocalNew,
    { x: width / 2, y: height / 2 },
    frame.rotation,
  );

  const next: ObjectFrame = {
    x: fixedPage.x - rotatedOffset.x,
    y: fixedPage.y - rotatedOffset.y,
    width,
    height,
    rotation: frame.rotation,
  };
  if (
    next.x === frame.x &&
    next.y === frame.y &&
    next.width === frame.width &&
    next.height === frame.height
  ) {
    return frame;
  }
  return next;
}

/* -------------------------------------------------------------------------- */
/* Rotation                                                                   */
/* -------------------------------------------------------------------------- */

/** Degrees from a centre to a pointer, measured clockwise from +x. */
export function pointerAngle(center: Point, pointer: Point): number {
  return (
    (Math.atan2(pointer.y - center.y, pointer.x - center.x) * 180) / Math.PI
  );
}

/**
 * The rotation a frame gets while its rotate grip is dragged. The grip sits
 * above the frame, so the pointer angle is offset by 90°; holding shift snaps
 * to `step` degrees.
 */
export function rotationForPointer(
  center: Point,
  pointer: Point,
  options: { step?: number } = {},
): number {
  const raw = pointerAngle(center, pointer) + 90;
  const step = options.step ?? 0;
  const snapped = step > 0 ? Math.round(raw / step) * step : raw;
  return normalizeAngle(snapped);
}

/* -------------------------------------------------------------------------- */
/* Snapping                                                                   */
/* -------------------------------------------------------------------------- */

export interface MoveSnap {
  dx: number;
  dy: number;
  snappedX: number | null;
  snappedY: number | null;
}

/**
 * Snaps a whole selection's bounds to the page's trim, safe area, columns,
 * baselines and guides, returning the adjusted delta plus the guide lines the
 * canvas should show. `threshold` is in points.
 */
export function snapMove(
  page: PublicationPage,
  document: PublicationDocument,
  ids: readonly string[],
  delta: Point,
  threshold: number,
): MoveSnap {
  if (!(threshold > 0)) {
    return { dx: delta.x, dy: delta.y, snappedX: null, snappedY: null };
  }
  const bounds = selectionBounds(page, ids);
  if (!bounds) {
    return { dx: delta.x, dy: delta.y, snappedX: null, snappedY: null };
  }
  const moved: ObjectFrame = {
    x: bounds.x + delta.x,
    y: bounds.y + delta.y,
    width: bounds.width,
    height: bounds.height,
    rotation: 0,
  };
  const targets = snapTargetsForPage(
    page.spec,
    document.grid,
    document.guides,
    page.id,
    page.side,
  );
  const result = snapFrame(moved, targets, threshold);
  return {
    dx: delta.x + (result.frame.x - moved.x),
    dy: delta.y + (result.frame.y - moved.y),
    snappedX: result.snappedX,
    snappedY: result.snappedY,
  };
}

/** The guide lines implied by a snap, for drawing a hairline while dragging. */
export function snapGuides(
  snappedX: number | null,
  snappedY: number | null,
): Guide[] {
  const guides: Guide[] = [];
  if (snappedX !== null) {
    guides.push({ id: "snap-x", axis: "x", position: snappedX, scope: "page" });
  }
  if (snappedY !== null) {
    guides.push({ id: "snap-y", axis: "y", position: snappedY, scope: "page" });
  }
  return guides;
}
