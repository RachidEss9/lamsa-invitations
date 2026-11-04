import { describe, expect, it } from "vitest";
import type { GridSettings } from "./model";
import { pageSpec } from "./geometry";
import { objectFrame } from "./object-transform";
import {
  guidePositions,
  nearestTarget,
  snapFrame,
  snapPoint,
  snapTargetsForPage,
  snapValue,
} from "./grid";

/**
 * Snapping is a pure list of targets plus a tolerance. The same targets serve
 * the mouse, keyboard nudges and future smart guides.
 */

const SPEC = pageSpec(
  { width: 400, height: 600 },
  { bleed: 0, margins: { top: 20, right: 20, bottom: 20, left: 20 } },
);

const GRID: GridSettings = { enabled: false, columns: 2, gutter: 20, baseline: 0 };

describe("snap targets", () => {
  it("includes trim edges, centre, safe edges and column geometry", () => {
    const targets = snapTargetsForPage(SPEC, GRID);
    expect(targets.x).toEqual([0, 20, 105, 190, 200, 210, 295, 380, 400]);
    expect(targets.y).toEqual([0, 20, 300, 580, 600]);
  });

  it("adds baseline positions when the baseline grid is on", () => {
    const targets = snapTargetsForPage(SPEC, {
      enabled: true,
      columns: 1,
      gutter: 0,
      baseline: 200,
    });
    expect(targets.y).toContain(220);
    expect(targets.y).toContain(420);
  });

  it("includes document guides on every page and page guides only on theirs", () => {
    const guides = [
      { id: "guide_1", axis: "x" as const, position: 250, scope: "document" as const },
      { id: "guide_2", axis: "x" as const, position: 260, scope: "page" as const, pageId: "page_1" },
      { id: "guide_3", axis: "y" as const, position: 333, scope: "page" as const, pageId: "page_2" },
    ];
    expect(guidePositions(guides, "x")).toEqual([250]);
    expect(guidePositions(guides, "x", "page_1")).toEqual([250, 260]);
    const targets = snapTargetsForPage(SPEC, GRID, guides, "page_1");
    expect(targets.x).toContain(250);
    expect(targets.x).toContain(260);
    expect(targets.y).not.toContain(333);
  });

  it("deduplicates and sorts targets", () => {
    const targets = snapTargetsForPage(SPEC, GRID, [
      { id: "guide_1", axis: "x", position: 0, scope: "document" },
      { id: "guide_2", axis: "x", position: 20, scope: "document" },
    ]);
    expect(targets.x).toEqual([0, 20, 105, 190, 200, 210, 295, 380, 400]);
  });
});

describe("snapping values", () => {
  it("finds the nearest target inside the threshold", () => {
    expect(nearestTarget(98, [0, 100, 200], 5)).toBe(100);
    expect(nearestTarget(90, [0, 100, 200], 5)).toBeNull();
  });

  it("leaves a value alone when nothing is close", () => {
    expect(snapValue(93, [0, 100], 5)).toBe(93);
    expect(snapValue(97, [0, 100], 5)).toBe(100);
  });

  it("snaps a point on both axes independently", () => {
    const snapped = snapPoint({ x: 97, y: 12 }, { x: [100], y: [10] }, 5);
    expect(snapped).toEqual({ x: 100, y: 10 });
  });
});

describe("snapping a frame", () => {
  const targets = { x: [0, 20, 105, 190, 200, 210, 295, 380, 400], y: [0, 20, 300, 580, 600] };

  it("snaps the nearest edge", () => {
    const result = snapFrame(objectFrame(18, 50, 100, 100), targets, 5);
    expect(result.frame.x).toBe(20);
    expect(result.dx).toBe(2);
    expect(result.snappedX).toBe(20);
    expect(result.snappedY).toBeNull();
    expect(result.frame.y).toBe(50);
  });

  it("snaps the centre to a column centre", () => {
    const result = snapFrame(objectFrame(140, 200, 100, 100), targets, 5);
    expect(result.frame.x).toBe(140);
    expect(result.snappedX).toBe(190);
  });

  it("never moves further than the threshold", () => {
    const result = snapFrame(objectFrame(30, 50, 100, 100), targets, 2);
    expect(result.frame.x).toBe(30);
    expect(result.snappedX).toBeNull();
  });

  it("does nothing at a zero threshold", () => {
    const frame = objectFrame(18, 50, 100, 100);
    const result = snapFrame(frame, targets, 0);
    expect(result.frame).toBe(frame);
    expect(result.dx).toBe(0);
    expect(result.dy).toBe(0);
  });

  it("respects rotation by snapping the rotated footprint", () => {
    const turned = objectFrame(118, 100, 100, 50, 90);
    const result = snapFrame(turned, { x: [125], y: [] }, 5);
    // The rotated bounds start at 143; 125 is outside the tolerance.
    expect(result.dx).toBe(0);
  });
});
