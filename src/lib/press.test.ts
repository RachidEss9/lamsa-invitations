import { describe, expect, it } from "vitest";
import {
  MM_TO_DESIGN_PX,
  PRESS_FORMATS,
  applyPressFormat,
  columnMeasureMm,
  isOnFormat,
  pressCanvas,
  pressFormat,
  sheetCount,
  spreadPairs,
} from "./press";
import { createBlankDesign, makeElement } from "./design";

describe("the Press formats", () => {
  it("offers four stocks in millimetres", () => {
    expect(PRESS_FORMATS.map((format) => format.id)).toEqual([
      "broadsheet",
      "tabloid",
      "magazine",
      "digest",
    ]);
    expect(pressFormat("magazine").widthMm).toBe(210);
    expect(() => pressFormat("fanzine" as never)).toThrow();
  });

  it("converts a press format to the studio's canvas units", () => {
    const format = pressFormat("magazine");
    expect(pressCanvas(format)).toEqual({
      width: Math.round(210 * MM_TO_DESIGN_PX),
      height: Math.round(297 * MM_TO_DESIGN_PX),
    });
    expect(MM_TO_DESIGN_PX).toBeCloseTo(3.7795, 3);
  });

  it("divides the measure into columns and gutters", () => {
    const broadsheet = pressFormat("broadsheet");
    // 380 mm, six columns, five 5 mm gutters.
    expect(columnMeasureMm(broadsheet)).toBeCloseTo((380 - 25) / 6, 1);
    expect(columnMeasureMm(broadsheet, 10)).toBeCloseTo((360 - 25) / 6, 1);
  });

  it("pairs pages into spreads with the cover alone", () => {
    const design = createBlankDesign({ pages: 5 });
    const spreads = spreadPairs(design.pages);
    expect(spreads).toHaveLength(3);
    expect(spreads[0].cover).toBe(true);
    expect(spreads[0].left).toBeNull();
    expect(spreads[0].right?.id).toBe(design.pages[0].id);
    expect(spreads[1].left?.id).toBe(design.pages[1].id);
    expect(spreads[1].right?.id).toBe(design.pages[2].id);
    expect(spreads[2].left?.id).toBe(design.pages[3].id);
    expect(spreads[2].right?.id).toBe(design.pages[4].id);
    // An even count leaves the last opening whole, and an odd one keeps its
    // final page rather than dropping it.
    const four = spreadPairs(createBlankDesign({ pages: 4 }).pages);
    expect(four).toHaveLength(3);
    expect(four[2].right).toBeNull();
  });

  it("counts sheets, not pages", () => {
    expect(sheetCount(1)).toBe(1);
    expect(sheetCount(2)).toBe(1);
    expect(sheetCount(7)).toBe(4);
    expect(sheetCount(0)).toBe(0);
  });

  it("re-cuts every page onto a format and keeps the layers", () => {
    const design = createBlankDesign({ pages: 2 });
    const first = design.pages[0];
    const marked = {
      ...design,
      pages: [
        {
          ...first,
          elements: [makeElement("text", { name: "Headline", text: "Hello" })],
        },
        design.pages[1],
      ],
    };
    const pressed = applyPressFormat(marked, pressFormat("tabloid"));
    const size = pressCanvas(pressFormat("tabloid"));
    expect(pressed.pages).toHaveLength(2);
    for (const page of pressed.pages) {
      expect(page.width).toBe(size.width);
      expect(page.height).toBe(size.height);
    }
    expect(pressed.pages[0].elements[0].id).toBe(marked.pages[0].elements[0].id);
    expect(pressed.pages[0].elements[0].name).toBe("Headline");
    expect(isOnFormat(pressed, pressFormat("tabloid"))).toBe(true);
    expect(isOnFormat(pressed, pressFormat("digest"))).toBe(false);
  });
});
