import { describe, expect, it } from "vitest";
import {
  imageAdjustFilter,
  maskedImageFrame,
  normalizeImageAdjust,
  rotationCoverScale,
} from "./image-frame";

describe("normalizeImageAdjust", () => {
  it("drops a neutral or empty set", () => {
    expect(normalizeImageAdjust(undefined)).toBeUndefined();
    expect(normalizeImageAdjust({})).toBeUndefined();
    expect(normalizeImageAdjust({ brightness: 100, contrast: 100, saturation: 100 })).toBeUndefined();
  });

  it("keeps real adjustments and clamps the wild ones", () => {
    expect(normalizeImageAdjust({ brightness: 80 })).toEqual({ brightness: 80 });
    expect(normalizeImageAdjust({ brightness: 4000 })).toEqual({ brightness: 220 });
    expect(normalizeImageAdjust({ saturation: -10 })).toEqual({ saturation: 0 });
    expect(normalizeImageAdjust({ contrast: "soft" })).toBeUndefined();
  });
});

describe("imageAdjustFilter", () => {
  it("renders nothing for neutral settings", () => {
    expect(imageAdjustFilter(undefined)).toBeUndefined();
    expect(imageAdjustFilter({})).toBeUndefined();
  });

  it("composes the channels in a stable order", () => {
    expect(imageAdjustFilter({ brightness: 90, contrast: 110, saturation: 120 })).toBe(
      "brightness(0.900) contrast(1.100) saturate(1.200)",
    );
  });
});

describe("rotationCoverScale", () => {
  it("leaves an unturned picture untouched", () => {
    expect(rotationCoverScale(0, { width: 100, height: 100 }, false)).toBe(1);
  });

  it("grows a square by the diagonal factor at 45°", () => {
    const scale = rotationCoverScale(45, { width: 200, height: 200 }, false);
    expect(scale).toBeCloseTo(Math.SQRT2, 5);
  });

  it("never shrinks, and respects fit inside", () => {
    expect(rotationCoverScale(90, { width: 300, height: 120 }, false)).toBeGreaterThanOrEqual(1);
    expect(rotationCoverScale(45, { width: 200, height: 200 }, true)).toBe(1);
  });

  it("covers the box after the turn, for any proportion", () => {
    for (const rotation of [12, 30, 45, 67, 100]) {
      const width = 180;
      const height = 90;
      const scale = rotationCoverScale(rotation, { width, height }, false);
      const radians = (rotation * Math.PI) / 180;
      const cos = Math.abs(Math.cos(radians));
      const sin = Math.abs(Math.sin(radians));
      expect(width * scale).toBeGreaterThanOrEqual(width * cos + height * sin - 1e-9);
      expect(height * scale).toBeGreaterThanOrEqual(width * sin + height * cos - 1e-9);
    }
  });
});

describe("maskedImageFrame", () => {
  it("fills a square file edge to edge when untouched", () => {
    expect(maskedImageFrame({ aspect: 1 })).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      preserveAspectRatio: "xMidYMid slice",
    });
  });

  it("keeps a wide file covering the frame and crops the sides", () => {
    const box = maskedImageFrame({ aspect: 2 });
    expect(box.height).toBe(100);
    expect(box.width).toBe(200);
    expect(box.x).toBe(-50);
    expect(box.preserveAspectRatio).toBe("xMidYMid slice");
  });

  it("fits a tall file inside without cropping when asked", () => {
    const box = maskedImageFrame({ aspect: 0.5, fit: "contain" });
    // Half as wide as it is tall, so the box's height is the limiting edge.
    expect(box.width).toBe(50);
    expect(box.height).toBe(100);
    expect(box.x).toBe(25);
    expect(box.y).toBe(0);
    expect(box.preserveAspectRatio).toBe("xMidYMid meet");
  });

  it("pans to the focal point", () => {
    const left = maskedImageFrame({ aspect: 2, position: { x: 0, y: 50 } });
    expect(left.x).toBe(0);
    const right = maskedImageFrame({ aspect: 2, position: { x: 100, y: 50 } });
    expect(right.x).toBe(-100);
    const centre = maskedImageFrame({ aspect: 2, position: { x: 50, y: 50 } });
    expect(centre.x).toBe(-50);
  });

  it("zooms about the focal point, which never moves", () => {
    const zoomed = maskedImageFrame({ aspect: 2, zoom: 2, position: { x: 25, y: 50 } });
    // The focal point sits at 25 of the box before and after the zoom.
    expect(zoomed.x + 0.25 * zoomed.width).toBeCloseTo(25, 6);
    expect(zoomed.width).toBeCloseTo(400, 6);
  });

  it("stays centred when the file has not been measured yet", () => {
    const box = maskedImageFrame({ zoom: 2 });
    expect(box).toMatchObject({ x: -50, y: -50, width: 200, height: 200 });
  });

  it("grows enough to cover the corners once it is turned", () => {
    const box = maskedImageFrame({ aspect: 1, rotation: 45 });
    // A square turned 45° needs the diagonal to stay covered.
    expect(box.width).toBeGreaterThanOrEqual(100 * Math.SQRT2 - 0.01);
    expect(box.height).toBeGreaterThanOrEqual(100 * Math.SQRT2 - 0.01);
    // And it is still centred on the frame.
    expect(box.x + box.width / 2).toBeCloseTo(50, 2);
    expect(box.y + box.height / 2).toBeCloseTo(50, 2);
  });

  it("does not enlarge a picture that is fitted inside", () => {
    const box = maskedImageFrame({ aspect: 1, fit: "contain", rotation: 30 });
    expect(box.width).toBe(100);
    expect(box.height).toBe(100);
  });

  it("clamps absurd zoom and focal values instead of throwing", () => {
    const box = maskedImageFrame({ aspect: 1, zoom: 900, position: { x: -40, y: 400 } });
    expect(box.width).toBe(500);
    expect(box.x).toBe(0);
  });
});
