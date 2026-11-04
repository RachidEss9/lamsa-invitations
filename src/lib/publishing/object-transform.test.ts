import { describe, expect, it } from "vitest";
import {
  boundsOfFrames,
  frameBounds,
  frameCenter,
  frameContainsPoint,
  frameCorners,
  moveFrame,
  normalizeAngle,
  objectFrame,
  resizeFrame,
  rotateFrame,
  rotatePoint,
  scaleFrame,
  setFramePosition,
  sizeForAspect,
} from "./object-transform";
import { nearlyEqual } from "./units";

/**
 * Frames rotate about their centre and never change x/y while rotating, so a
 * spin gesture is stable. Bounds are the axis-aligned box of the four rotated
 * corners — the footprint alignment and selection use.
 */

const FRAME = objectFrame(100, 100, 100, 50);

describe("frame basics", () => {
  it("finds the centre", () => {
    expect(frameCenter(FRAME)).toEqual({ x: 150, y: 125 });
  });

  it("moves without resizing or rotating", () => {
    expect(moveFrame(FRAME, 10, -5)).toEqual({ x: 110, y: 95, width: 100, height: 50, rotation: 0 });
    expect(setFramePosition(FRAME, 0, 0)).toEqual({ ...FRAME, x: 0, y: 0 });
  });

  it("resizes from the top-left by default", () => {
    expect(resizeFrame(FRAME, 200, 80)).toEqual({ ...FRAME, width: 200, height: 80 });
  });

  it("resizes about the centre when asked", () => {
    expect(resizeFrame(FRAME, 200, 100, "center")).toEqual({
      x: 50,
      y: 75,
      width: 200,
      height: 100,
      rotation: 0,
    });
  });

  it("never produces a negative size", () => {
    expect(resizeFrame(FRAME, -10, -10)).toEqual({ ...FRAME, width: 0, height: 0 });
  });

  it("scales position and size together", () => {
    expect(scaleFrame(FRAME, 2)).toEqual({ x: 200, y: 200, width: 200, height: 100, rotation: 0 });
    expect(scaleFrame(FRAME, 0)).toBe(FRAME);
  });
});

describe("angles", () => {
  it("normalises into [-180, 180)", () => {
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(360)).toBe(0);
    expect(normalizeAngle(450)).toBe(90);
    expect(normalizeAngle(-90)).toBe(-90);
    expect(normalizeAngle(180)).toBe(-180);
    expect(normalizeAngle(Number.NaN)).toBe(0);
  });

  it("turns a frame without moving its x/y", () => {
    expect(rotateFrame(FRAME, 450)).toEqual({ ...FRAME, rotation: 90 });
  });

  it("rotates points clockwise on screen", () => {
    const turned = rotatePoint({ x: 150, y: 100 }, { x: 100, y: 100 }, 90);
    expect(turned.x).toBeCloseTo(100, 10);
    expect(turned.y).toBeCloseTo(150, 10);
  });
});

describe("corners and bounds", () => {
  it("lists corners from the top-left, clockwise", () => {
    expect(frameCorners(FRAME)).toEqual([
      { x: 100, y: 100 },
      { x: 200, y: 100 },
      { x: 200, y: 150 },
      { x: 100, y: 150 },
    ]);
  });

  it("uses the frame itself for bounds when unrotated", () => {
    expect(frameBounds(FRAME)).toEqual({ x: 100, y: 100, width: 100, height: 50 });
  });

  it("swaps the footprint of a 90° frame", () => {
    const bounds = frameBounds(rotateFrame(FRAME, 90));
    expect(bounds.x).toBeCloseTo(125, 10);
    expect(bounds.y).toBeCloseTo(75, 10);
    expect(bounds.width).toBeCloseTo(50, 10);
    expect(bounds.height).toBeCloseTo(100, 10);
    expect(nearlyEqual(frameCenter(rotateFrame(FRAME, 90)).x, 150)).toBe(true);
  });

  it("bounds many frames", () => {
    const bounds = boundsOfFrames([FRAME, objectFrame(0, 0, 50, 50)]);
    expect(bounds).toEqual({ x: 0, y: 0, width: 200, height: 150 });
    expect(boundsOfFrames([])).toBeNull();
  });
});

describe("hit testing", () => {
  it("accepts the centre and rejects the outside", () => {
    expect(frameContainsPoint(FRAME, { x: 150, y: 125 })).toBe(true);
    expect(frameContainsPoint(FRAME, { x: 99, y: 125 })).toBe(false);
  });

  it("respects rotation", () => {
    const turned = rotateFrame(FRAME, 90);
    expect(frameContainsPoint(turned, { x: 150, y: 125 })).toBe(true);
    expect(frameContainsPoint(turned, { x: 100, y: 100 })).toBe(false);
    expect(frameContainsPoint(turned, { x: 150, y: 80 })).toBe(true);
  });
});

describe("aspect helpers", () => {
  it("sizes a frame from a width and an aspect ratio", () => {
    expect(sizeForAspect(300, 3 / 2)).toEqual({ width: 300, height: 200 });
    expect(sizeForAspect(300, Number.NaN)).toEqual({ width: 300, height: 300 });
  });
});
