import { describe, expect, it } from "vitest";
import type { Point } from "./model";
import { createPage } from "./factory";
import { pageSpec } from "./geometry";
import { planSpreads, spreadGeometry, type SpreadGeometry } from "./spreads";
import {
  MAX_ZOOM,
  MIN_ZOOM,
  clampZoom,
  createViewport,
  fitViewport,
  pageAtStagePoint,
  pagePointFromClient,
  pagePointToStage,
  pageRectToStage,
  pageStageBox,
  panBy,
  stageLayout,
  stagePointToPage,
  steppedZoom,
  zoomAtPoint,
  zoomPercent,
} from "./viewport";

/**
 * The viewport is the only place that converts points to pixels, so the tests
 * assert the three invariants the editor depends on: one content point maps
 * to exactly one screen position, zooming keeps the anchored content still,
 * and fitting never blows content up past 100%.
 */

const SPEC = pageSpec(
  { width: 400, height: 300 },
  { bleed: 20, margins: { top: 24, right: 20, bottom: 24, left: 44 } },
);

function facingGeometry(): SpreadGeometry {
  let counter = 0;
  const ids = (kind: string) => `${kind}_${(counter += 1)}`;
  const left = createPage(SPEC, { ids });
  const right = createPage(SPEC, { ids });
  const spreads = planSpreads([left, right], {
    facingPages: true,
    coverStandalone: false,
    ids,
  });
  return spreadGeometry(spreads[0]!, [left, right]);
}

describe("viewport zoom", () => {
  it("clamps zoom into the working range", () => {
    expect(clampZoom(0.001)).toBe(MIN_ZOOM);
    expect(clampZoom(99)).toBe(MAX_ZOOM);
    expect(clampZoom(Number.NaN)).toBe(1);
    expect(zoomPercent(1.234)).toBe(123);
  });

  it("creates a clamped viewport", () => {
    expect(createViewport(2, 10, 20)).toEqual({ zoom: 2, panX: 10, panY: 20 });
    expect(createViewport(99).zoom).toBe(MAX_ZOOM);
  });

  it("zooms while keeping the content under the pointer still", () => {
    // Content point (50, 10) currently on screen at (150, 60).
    const before = createViewport(1, 100, 50);
    const after = zoomAtPoint(before, 2, { x: 150, y: 60 });
    expect(after.zoom).toBe(2);
    expect(after.panX + 50 * after.zoom).toBeCloseTo(150, 6);
    expect(after.panY + 10 * after.zoom).toBeCloseTo(60, 6);
    // and zooming back keeps the same anchor point fixed again
    const restored = zoomAtPoint(after, 1, { x: 150, y: 60 });
    expect(restored.panX).toBeCloseTo(100, 6);
    expect(restored.panY).toBeCloseTo(50, 6);
  });

  it("keeps the same viewport when zooming to the current zoom", () => {
    const view = createViewport(2, 10, 10);
    expect(zoomAtPoint(view, 2, { x: 0, y: 0 })).toBe(view);
  });

  it("steps between human zoom stops", () => {
    expect(steppedZoom(1, 1)).toBe(1.25);
    expect(steppedZoom(1, -1)).toBe(0.75);
    expect(steppedZoom(MAX_ZOOM, 1)).toBe(MAX_ZOOM);
    expect(steppedZoom(MIN_ZOOM, -1)).toBe(MIN_ZOOM);
  });

  it("pans without touching zoom", () => {
    expect(panBy(createViewport(2, 10, 20), -5, 7)).toEqual({
      zoom: 2,
      panX: 5,
      panY: 27,
    });
  });
});

describe("stage layout", () => {
  it("places both pages of a facing spread in one stage space", () => {
    const geometry = facingGeometry();
    const layout = stageLayout(geometry, 1);
    // The stage covers the whole bleed band, so the trim origin sits at
    // (bleed, bleed) inside it.
    expect(layout.originX).toBe(-20);
    expect(layout.width).toBe(840);
    expect(layout.height).toBe(340);

    const [left, right] = layout.pages;
    expect(left!.left).toBe(0);
    expect(left!.trimLeft).toBe(20);
    expect(right!.left).toBe(400);
    expect(right!.trimLeft).toBe(20);
  });

  it("scales every box by the zoom factor", () => {
    const layout = stageLayout(facingGeometry(), 2);
    expect(layout.width).toBe(840 * 2);
    expect(layout.pages[1]!.left).toBe(800);
    expect(layout.pages[0]!.trimLeft).toBe(40);
  });

  it("exposes per-page boxes for hit-testing", () => {
    const geometry = facingGeometry();
    const layout = stageLayout(geometry, 1);
    const right = pageStageBox(layout, geometry.pages[1]!.pageId);
    expect(right).toBeTruthy();
    expect(pageStageBox(layout, "missing")).toBeUndefined();
  });

  it("converts rectangles between page and stage space", () => {
    const geometry = facingGeometry();
    const layout = stageLayout(geometry, 2);
    const rightPageId = geometry.pages[1]!.pageId;
    const stage = pageRectToStage(layout, rightPageId, { x: 10, y: 20, width: 50, height: 60 });
    expect(stage!.x).toBe((400 - (-20) + 10) * 2);
    expect(stage!.width).toBe(100);
  });
});

describe("page-local conversion", () => {
  it("round-trips a page-local point through the stage", () => {
    const geometry = facingGeometry();
    const layout = stageLayout(geometry, 0.75);
    const rightPageId = geometry.pages[1]!.pageId;
    const pagePoint: Point = { x: 123, y: 57.5 };
    const stagePoint = pagePointToStage(layout, rightPageId, pagePoint);
    const back = stagePointToPage(layout, rightPageId, stagePoint!);
    expect(back!.x).toBeCloseTo(123, 6);
    expect(back!.y).toBeCloseTo(57.5, 6);
  });

  it("converts client positions to page-local points", () => {
    const geometry = facingGeometry();
    const layout = stageLayout(geometry, 1);
    const leftPageId = geometry.pages[0]!.pageId;
    // Client position (100, 40) inside a stage that starts at (30, 30).
    const local = pagePointFromClient(layout, leftPageId, { x: 100, y: 40 }, { x: 30, y: 30 });
    expect(local!.x).toBeCloseTo(100 - 30 - 20, 6);
    expect(local!.y).toBeCloseTo(40 - 30 - 20, 6);
  });

  it("reports null outside the spread's pages", () => {
    const layout = stageLayout(facingGeometry(), 1);
    expect(pagePointToStage(layout, "missing", { x: 0, y: 0 })).toBeNull();
    expect(stagePointToPage(layout, "missing", { x: 0, y: 0 })).toBeNull();
  });

  it("returns the page under a stage point by trim, not bleed band", () => {
    const geometry = facingGeometry();
    const layout = stageLayout(geometry, 1);
    // Update fixture names: pages are [left, right], both starting at y=0.
    expect(pageAtStagePoint(layout, { x: 30, y: 30 })).toBe(geometry.pages[0]!.pageId);
    expect(pageAtStagePoint(layout, { x: 419, y: 170 })).toBe(geometry.pages[0]!.pageId);
    expect(pageAtStagePoint(layout, { x: 420, y: 170 })).toBe(geometry.pages[1]!.pageId);
    expect(pageAtStagePoint(layout, { x: 900, y: 170 })).toBeNull();
    // Bleed outside both trims belongs to no page (pan/zoom gesture space).
    expect(pageAtStagePoint(layout, { x: 10, y: 10 })).toBeNull();
  });
});

describe("fit to container", () => {
  it("fits the content inside the container with padding and centres it", () => {
    const view = fitViewport({ width: 400, height: 300 }, { width: 560, height: 600 });
    expect(view.zoom).toBe(1); // 560 - 112 = 448 >= 400
    expect(view.panX).toBe((560 - 400) / 2);
    expect(view.panY).toBe((600 - 300) / 2);
  });

  it("scales down when the container is smaller and never scales up", () => {
    const view = fitViewport({ width: 400, height: 300 }, { width: 200, height: 140 });
    expect(view.zoom).toBeLessThan(1);
    expect(fitViewport({ width: 400, height: 300 }, { width: 5000, height: 5000 }).zoom).toBe(1);
  });

  it("survives a degenerate content size", () => {
    expect(fitViewport({ width: 0, height: 0 }, { width: 500, height: 500 }).zoom).toBe(1);
  });
});
