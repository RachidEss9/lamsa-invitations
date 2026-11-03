import { describe, expect, it } from "vitest";
import {
  SHEET_STOCKS,
  bestImposition,
  copyAreaMm2,
  planPiece,
  runFor,
  sheetDimensions,
  sheetStockLabel,
  sheetWaste,
} from "./print-lab";
import { SHEET_GAP_MM, sheetCellRect } from "./print";

const A6 = { widthMm: 105, heightMm: 148 };
const A4 = { widthMm: 210, heightMm: 297 };

describe("the Print Lab imposition", () => {
  it("turns a copy only when that fits more of them", () => {
    // An A6 card with a 3 mm bleed and the standard 3 mm gap: upright fits one
    // on A4, turned fits two.
    const choice = bestImposition(A6, A4, { bleedMm: 3, gapMm: SHEET_GAP_MM });
    expect(choice.rotate).toBe(true);
    expect(choice.layout.columns).toBe(1);
    expect(choice.layout.rows).toBe(2);
    expect(choice.layout.count).toBe(2);
    expect(choice.other.count).toBe(1);
  });

  it("keeps the upright turn when both fit the same number", () => {
    const choice = bestImposition({ widthMm: 90, heightMm: 90 }, A4, {
      bleedMm: 0,
      gapMm: 3,
    });
    expect(choice.rotate).toBe(false);
    expect(choice.layout.count).toBe(choice.other.count);
  });

  it("reports a copy that is larger than the stock instead of imposing it", () => {
    const choice = bestImposition(
      { widthMm: 400, heightMm: 500 },
      A4,
      { bleedMm: 3, gapMm: 3 },
    );
    expect(choice.layout.fits).toBe(false);
    expect(sheetWaste(choice.layout)).toBe(1);
  });

  it("measures the copy as trim plus both bleed bands", () => {
    const layout = bestImposition(A6, A4, { bleedMm: 3, gapMm: 3 }).layout;
    expect(copyAreaMm2(layout)).toBeCloseTo((105 + 6) * (148 + 6), 5);
  });

  it("counts the paper a run needs", () => {
    expect(runFor(2, 10)).toEqual({ sheets: 5, remainder: 0 });
    expect(runFor(2, 9)).toEqual({ sheets: 5, remainder: 1 });
    expect(runFor(0, 4)).toEqual({ sheets: 0, remainder: 4 });
  });

  it("keeps cells inside the sheet and spaced by the gap", () => {
    const layout = bestImposition(A6, A4, { bleedMm: 3, gapMm: 3 }).layout;
    const first = sheetCellRect(layout, 0);
    const second = sheetCellRect(layout, 1);
    expect(first.x).toBeGreaterThanOrEqual(0);
    expect(first.y).toBeGreaterThanOrEqual(0);
    expect(first.x + first.w).toBeLessThanOrEqual(A4.widthMm);
    expect(second.y - (first.y + first.h)).toBeCloseTo(3, 5);
  });

  it("plans a piece end to end", () => {
    const plan = planPiece({ trim: A6, paper: "a4", bleedMm: 3, quantity: 50 });
    expect(plan.copies).toBe(2);
    expect(plan.sheets).toBe(25);
    // Two 111 × 154 mm copies on 210 × 297 mm stock leave just under half the
    // sheet unused.
    expect(plan.waste).toBeCloseTo(0.4519, 3);
  });

  it("offers real stocks only", () => {
    expect(SHEET_STOCKS.every((stock) => stock.id !== "custom")).toBe(true);
    expect(sheetDimensions("a3")).toEqual({ widthMm: 297, heightMm: 420 });
    expect(sheetStockLabel("letter")).toBe("US Letter");
  });
});
