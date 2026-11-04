/**
 * Object placement mathematics.
 *
 * An object's frame is the unrotated box: `x`/`y` is its top-left corner and
 * `rotation` spins it clockwise about its centre. Keeping the unrotated box
 * as the source of truth means moving an object never changes its rotation,
 * and rotating it never changes its x/y — which is what makes repeated
 * gestures stable.
 *
 * The bounds of a rotated frame are the axis-aligned box that contains its
 * four corners. Alignment, distribution, snapping and selection all use those
 * bounds so a rotated object behaves like the space it visibly occupies.
 */

import type { ObjectFrame, Point, Rect } from "./model";
import { boundsOfRects, rectContainsPoint } from "./geometry";

const DEG_TO_RAD = Math.PI / 180;

export function objectFrame(
  x: number,
  y: number,
  width: number,
  height: number,
  rotation = 0,
): ObjectFrame {
  return { x, y, width, height, rotation };
}

export function frameCenter(frame: ObjectFrame): Point {
  return { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 };
}

/** Normalises degrees into [-180, 180). */
export function normalizeAngle(degrees: number): number {
  if (!Number.isFinite(degrees)) return 0;
  const wrapped = ((degrees + 180) % 360 + 360) % 360 - 180;
  return Object.is(wrapped, -0) ? 0 : wrapped;
}

/**
 * Rotates a point around an origin. Positive degrees turn clockwise on
 * screen, because y grows downwards.
 */
export function rotatePoint(target: Point, origin: Point, degrees: number): Point {
  if (degrees === 0) return { x: target.x, y: target.y };
  const radians = normalizeAngle(degrees) * DEG_TO_RAD;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  return {
    x: origin.x + dx * cos - dy * sin,
    y: origin.y + dx * sin + dy * cos,
  };
}

/** The four corners, top-left first, clockwise, in page space. */
export function frameCorners(frame: ObjectFrame): [Point, Point, Point, Point] {
  const { x, y, width, height } = frame;
  const corners: [Point, Point, Point, Point] = [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
  if (!frame.rotation) return corners;
  const origin = frameCenter(frame);
  return corners.map((corner) => rotatePoint(corner, origin, frame.rotation)) as [
    Point,
    Point,
    Point,
    Point,
  ];
}

/** The axis-aligned bounds of a (possibly rotated) frame. */
export function frameBounds(frame: ObjectFrame): Rect {
  if (!frame.rotation) {
    return { x: frame.x, y: frame.y, width: frame.width, height: frame.height };
  }
  const corners = frameCorners(frame);
  const xs = corners.map((corner) => corner.x);
  const ys = corners.map((corner) => corner.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return {
    x: minX,
    y: minY,
    width: Math.max(...xs) - minX,
    height: Math.max(...ys) - minY,
  };
}

/** Bounds of many frames, or null when there are none. */
export function boundsOfFrames(frames: readonly ObjectFrame[]): Rect | null {
  return boundsOfRects(frames.map(frameBounds));
}

/** Translates a frame without touching its size or rotation. */
export function moveFrame(frame: ObjectFrame, dx: number, dy: number): ObjectFrame {
  return { ...frame, x: frame.x + dx, y: frame.y + dy };
}

export function setFramePosition(
  frame: ObjectFrame,
  x: number,
  y: number,
): ObjectFrame {
  return { ...frame, x, y };
}

/**
 * Resizes a frame, keeping either its top-left corner or its centre fixed.
 * Sizes never go negative.
 */
export function resizeFrame(
  frame: ObjectFrame,
  width: number,
  height: number,
  anchor: "top-left" | "center" = "top-left",
): ObjectFrame {
  const nextWidth = Math.max(0, width);
  const nextHeight = Math.max(0, height);
  if (anchor === "top-left") {
    return { ...frame, width: nextWidth, height: nextHeight };
  }
  const center = frameCenter(frame);
  return {
    ...frame,
    x: center.x - nextWidth / 2,
    y: center.y - nextHeight / 2,
    width: nextWidth,
    height: nextHeight,
  };
}

/** Rotates a frame about its own centre. */
export function rotateFrame(frame: ObjectFrame, degrees: number): ObjectFrame {
  return { ...frame, rotation: normalizeAngle(degrees) };
}

/** Scales both the position and size of a frame by a factor. */
export function scaleFrame(frame: ObjectFrame, factor: number): ObjectFrame {
  if (!(factor > 0)) return frame;
  return {
    ...frame,
    x: frame.x * factor,
    y: frame.y * factor,
    width: frame.width * factor,
    height: frame.height * factor,
  };
}

/** Hit testing respects rotation: the point is tested in frame space. */
export function frameContainsPoint(frame: ObjectFrame, target: Point): boolean {
  const local = frame.rotation
    ? rotatePoint(target, frameCenter(frame), -frame.rotation)
    : target;
  return rectContainsPoint(
    { x: frame.x, y: frame.y, width: frame.width, height: frame.height },
    local,
  );
}

/** The size a frame needs to keep an aspect ratio at a given width. */
export function sizeForAspect(width: number, aspect: number): { width: number; height: number } {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  return { width: Math.max(0, width), height: Math.max(0, width) / safeAspect };
}
