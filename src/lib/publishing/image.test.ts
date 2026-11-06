import { describe, expect, it } from "vitest";
import type { ImageCrop, ObjectFrame } from "./model";
import {
  cropForMode,
  cropIsDefault,
  defaultImageCrop,
  imageBaseline,
  imageCropMode,
  imagePlacement,
  panImageCrop,
  resolveImageCrop,
  rotateImageCrop,
  zoomImageCrop,
} from "./image";

const frame = (width = 200, height = 100): ObjectFrame => ({
  x: 10,
  y: 20,
  width,
  height,
  rotation: 0,
});

const landscape = { width: 400, height: 200 };
const portrait = { width: 100, height: 200 };
const square = { width: 100, height: 100 };

describe("image fitting", () => {
  it("contains landscape, portrait and square images without cropping or distortion", () => {
    const wide = imagePlacement(frame(), landscape, "fit", defaultImageCrop(), { x: 0.5, y: 0.5 });
    expect(wide.width).toBeCloseTo(200);
    expect(wide.height).toBeCloseTo(100);
    expect(wide.x).toBeCloseTo(10);
    expect(wide.y).toBeCloseTo(20);

    const tall = imagePlacement(frame(), portrait, "fit", defaultImageCrop(), { x: 0.5, y: 0.5 });
    expect(tall.width).toBeCloseTo(50);
    expect(tall.height).toBeCloseTo(100);
    expect(tall.x).toBeCloseTo(85);
    expect(tall.width / tall.height).toBeCloseTo(0.5);

    const equal = imagePlacement(frame(), square, "fit", defaultImageCrop(), { x: 0.5, y: 0.5 });
    expect(equal.width).toBeCloseTo(100);
    expect(equal.height).toBeCloseTo(100);
    expect(equal.x).toBeCloseTo(60);
  });

  it("covers the frame while preserving aspect ratio", () => {
    const wide = imagePlacement(frame(), landscape, "fill", defaultImageCrop(), { x: 0.5, y: 0.5 });
    expect(wide.width).toBeCloseTo(200);
    expect(wide.height).toBeCloseTo(100);

    const tall = imagePlacement(frame(), portrait, "fill", defaultImageCrop(), { x: 0.5, y: 0.5 });
    expect(tall.width).toBeCloseTo(200);
    expect(tall.height).toBeCloseTo(400);
    expect(tall.width / tall.height).toBeCloseTo(0.5);

    const squareFrame = imagePlacement(frame(100, 100), landscape, "fill", defaultImageCrop(), {
      x: 0.5,
      y: 0.5,
    });
    expect(squareFrame.width).toBeCloseTo(200);
    expect(squareFrame.height).toBeCloseTo(100);
    expect(squareFrame.width / squareFrame.height).toBeCloseTo(2);
    expect(squareFrame.x).toBeLessThanOrEqual(10);
    expect(squareFrame.x + squareFrame.width).toBeGreaterThanOrEqual(110);
  });

  it("never leaves a gap when a cover crop is rotated", () => {
    const rotated = rotateImageCrop(defaultImageCrop(), 90);
    const placement = imagePlacement(frame(), landscape, "fill", rotated, { x: 0.5, y: 0.5 });
    expect(placement.width).toBeCloseTo(400);
    expect(placement.height).toBeCloseTo(200);
    expect(placement.width / placement.height).toBeCloseTo(2);
  });

  it("keeps contain unzoomed when the image is rotated", () => {
    const rotated = rotateImageCrop(defaultImageCrop(), 90);
    const placement = imagePlacement(frame(), landscape, "fit", rotated, { x: 0.5, y: 0.5 });
    expect(placement.width).toBeCloseTo(200);
    expect(placement.height).toBeCloseTo(100);
    expect(placement.rotation).toBe(90);
  });

  it("centres a small contain image regardless of focal point", () => {
    const placement = imagePlacement(frame(), square, "fit", defaultImageCrop(), {
      x: 0.05,
      y: 0.95,
    });
    expect(placement.x).toBeCloseTo(60);
    expect(placement.y).toBeCloseTo(20);
  });
});

describe("normalized crop", () => {
  it("normalizes legacy and malformed crops", () => {
    expect(resolveImageCrop(undefined)).toMatchObject({
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      normalized: false,
    });
    expect(
      resolveImageCrop({
        scale: Number.NaN,
        offsetX: Number.POSITIVE_INFINITY,
        offsetY: -2,
        normalized: true,
        rotation: 540,
      }),
    ).toMatchObject({ zoom: 1, offsetX: 0, offsetY: -2, rotation: -180, normalized: true });
  });

  it("zooms around the frame without changing frame size", () => {
    const zoomed = zoomImageCrop(defaultImageCrop(), 2);
    const placement = imagePlacement(frame(), landscape, "fill", zoomed, { x: 0.5, y: 0.5 });
    expect(placement.width).toBeCloseTo(400);
    expect(placement.height).toBeCloseTo(200);
    expect(frame().width).toBe(200);
    expect(zoomed.scale).toBe(2);
  });

  it("pans in frame-relative units and clamps the artwork to the frame", () => {
    const panned = panImageCrop(frame(), defaultImageCrop(), 20, 10);
    expect(panned.offsetX).toBeCloseTo(0.1);
    expect(panned.offsetY).toBeCloseTo(0.1);
    const placement = imagePlacement(frame(), portrait, "fill", panned, { x: 0.5, y: 0.5 });
    expect(placement.x).toBeLessThanOrEqual(10);
    expect(placement.x + placement.width).toBeGreaterThanOrEqual(210);
  });

  it("uses the focal point as the source anchor and clamps cover edges", () => {
    const squareFrame = frame(100, 100);
    const left = imagePlacement(squareFrame, landscape, "fill", defaultImageCrop(), {
      x: 0,
      y: 0.5,
    });
    const centre = imagePlacement(squareFrame, landscape, "fill", defaultImageCrop(), {
      x: 0.5,
      y: 0.5,
    });
    expect(left.x).not.toBe(centre.x);
    expect(left.y).toBeCloseTo(20);

    const extreme = imagePlacement(squareFrame, landscape, "fill", defaultImageCrop(), {
      x: 1,
      y: 0.5,
    });
    expect(extreme.x).not.toBe(left.x);
    expect(extreme.x).toBeLessThanOrEqual(10);
    expect(extreme.x + extreme.width).toBeGreaterThanOrEqual(110);
    expect(left.x).toBeLessThanOrEqual(10);
    expect(left.x + left.width).toBeGreaterThanOrEqual(110);
  });

  it("ignores legacy point offsets", () => {
    const legacy: ImageCrop = { scale: 1, offsetX: 50, offsetY: 50 };
    const placement = imagePlacement(frame(), landscape, "fill", legacy, { x: 0.5, y: 0.5 });
    const fresh = imagePlacement(frame(), landscape, "fill", defaultImageCrop(), {
      x: 0.5,
      y: 0.5,
    });
    expect(placement.x).toBeCloseTo(fresh.x);
    expect(placement.y).toBeCloseTo(fresh.y);
  });

  it("reports the three crop modes and resets without touching frame geometry", () => {
    expect(cropForMode("contain")).toMatchObject({ fit: "fit" });
    expect(cropForMode("cover")).toMatchObject({ fit: "fill" });
    expect(imageCropMode("stretch", defaultImageCrop())).toBe("custom");
    expect(cropForMode("custom").crop).toMatchObject({ normalized: true });
    expect(cropIsDefault(defaultImageCrop())).toBe(true);
    expect(cropIsDefault(zoomImageCrop(defaultImageCrop(), 1.2))).toBe(false);
  });

  it("resizes the frame without mutating the crop", () => {
    const crop = panImageCrop(frame(), zoomImageCrop(defaultImageCrop(), 1.5), 15, -8);
    const before = imagePlacement(frame(), landscape, "fill", crop, { x: 0.5, y: 0.5 });
    const larger = imagePlacement(frame(400, 200), landscape, "fill", crop, {
      x: 0.5,
      y: 0.5,
    });
    expect(crop).toMatchObject({ scale: 1.5, normalized: true });
    expect(before.width / before.height).toBeCloseTo(2);
    expect(larger.width / larger.height).toBeCloseTo(2);
    expect(larger.width).toBeGreaterThan(before.width);
  });

  it("calculates stretch as the legacy exact frame size", () => {
    const baseline = imageBaseline(frame(), portrait, "stretch");
    expect(baseline).toEqual({ width: 200, height: 100 });
  });
});
