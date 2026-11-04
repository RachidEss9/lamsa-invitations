import { describe, expect, it } from "vitest";
import {
  FIT_PADDING,
  MAX_SCALE,
  MIN_SCALE,
  ZOOM_STEP,
  clampZoom,
  fitScaleFor,
  pageLabel,
  pageStep,
  scaleForZoom,
  zoomByStep,
  zoomForActualSize,
  zoomPercent,
} from "./canvas-zoom";

/**
 * The toolbar, the wheel, pinch and the keyboard share these functions, so the
 * limits and the percentage are defined in exactly one place.
 */

const PAGE = { width: 1000, height: 1414 };

describe("fit to screen", () => {
  it("fits the whole page inside the workspace and keeps the aspect ratio", () => {
    const fit = fitScaleFor(900, 700, PAGE.width, PAGE.height);
    // The padding is taken off the workspace, then the tighter axis wins.
    expect(fit).toBeCloseTo((700 - FIT_PADDING) / PAGE.height, 5);
    expect(fit * PAGE.width).toBeLessThanOrEqual(900 - FIT_PADDING + 0.001);
    expect(fit * PAGE.height).toBeLessThanOrEqual(700 - FIT_PADDING + 0.001);
  });

  it("recomputes when the workspace changes", () => {
    const desktop = fitScaleFor(1200, 900, PAGE.width, PAGE.height);
    const mobile = fitScaleFor(390, 600, PAGE.width, PAGE.height);
    expect(mobile).toBeLessThan(desktop);
    expect(scaleForZoom(1, mobile)).toBeCloseTo(mobile, 6);
  });

  it("returns 0 until the workspace has been measured", () => {
    expect(fitScaleFor(0, 0, PAGE.width, PAGE.height)).toBe(0);
    expect(scaleForZoom(1, 0)).toBe(0);
  });
});

describe("zoom", () => {
  it("shows the true scale, not the internal multiplier", () => {
    const fit = 0.4;
    expect(scaleForZoom(1, fit)).toBeCloseTo(0.4, 6);
    expect(zoomPercent(scaleForZoom(1, fit))).toBe(40);
    expect(zoomPercent(scaleForZoom(zoomForActualSize(fit), fit))).toBe(100);
  });

  it("reaches actual size at any fit", () => {
    for (const fit of [0.12, 0.31, 0.5, 0.87, 1.4]) {
      const zoom = zoomForActualSize(fit);
      expect(scaleForZoom(zoom, fit)).toBeCloseTo(1, 6);
      expect(zoomPercent(scaleForZoom(zoom, fit))).toBe(100);
    }
  });

  it("steps by a constant factor on the real scale", () => {
    const fit = 0.3;
    const start = scaleForZoom(1, fit);
    const zoomedIn = scaleForZoom(zoomByStep(1, fit, 1), fit);
    const zoomedOut = scaleForZoom(zoomByStep(1, fit, -1), fit);
    expect(zoomedIn).toBeCloseTo(start * ZOOM_STEP, 6);
    expect(zoomedOut).toBeCloseTo(start / ZOOM_STEP, 6);
  });

  it("clamps to the minimum and maximum scale", () => {
    const fit = 0.25;
    let zoom = 1;
    for (let press = 0; press < 60; press += 1) zoom = zoomByStep(zoom, fit, 1);
    expect(scaleForZoom(zoom, fit)).toBeCloseTo(MAX_SCALE, 6);

    for (let press = 0; press < 60; press += 1) zoom = zoomByStep(zoom, fit, -1);
    expect(scaleForZoom(zoom, fit)).toBeCloseTo(MIN_SCALE, 6);
  });

  it("never returns a non-finite zoom", () => {
    expect(clampZoom(Number.NaN, 0.4)).toBe(1);
    expect(Number.isFinite(zoomByStep(1, 0, 1))).toBe(true);
  });
});

describe("page navigation", () => {
  it("steps within the document and stops at the ends", () => {
    expect(pageStep(0, 3, 1)).toBe(1);
    expect(pageStep(1, 3, -1)).toBe(0);
    expect(pageStep(0, 3, -1)).toBeNull();
    expect(pageStep(2, 3, 1)).toBeNull();
    expect(pageStep(0, 1, 1)).toBeNull();
  });

  it("labels the current page and the total", () => {
    expect(pageLabel(0, 4)).toBe("1 / 4");
    expect(pageLabel(3, 4)).toBe("4 / 4");
    expect(pageLabel(9, 4)).toBe("4 / 4");
  });
});
