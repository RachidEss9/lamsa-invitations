import { describe, expect, it } from "vitest";
import {
  CURVE_SAGITTA_FACTOR,
  arcPathD,
  applyTextCase,
  curveIsActive,
  curvedTextLines,
  normalizeCurve,
  textAnchorFor,
} from "./text-path";

describe("normalizeCurve", () => {
  it("treats junk and near-zero values as no curve at all", () => {
    expect(normalizeCurve(undefined)).toBeUndefined();
    expect(normalizeCurve(null)).toBeUndefined();
    expect(normalizeCurve("arch")).toBeUndefined();
    expect(normalizeCurve(Number.NaN)).toBeUndefined();
    expect(normalizeCurve(0)).toBeUndefined();
    expect(normalizeCurve(0.004)).toBeUndefined();
    expect(normalizeCurve(-0.004)).toBeUndefined();
  });

  it("clamps anything wild into the usable range", () => {
    expect(normalizeCurve(5)).toBe(1);
    expect(normalizeCurve(-5)).toBe(-1);
    expect(normalizeCurve(0.5555)).toBe(0.556);
    expect(normalizeCurve("-0.25")).toBe(-0.25);
  });
});

describe("curveIsActive", () => {
  it("only counts a curve a person could actually see", () => {
    expect(curveIsActive(undefined)).toBe(false);
    expect(curveIsActive(0)).toBe(false);
    expect(curveIsActive(0.004)).toBe(false);
    expect(curveIsActive(0.02)).toBe(true);
    expect(curveIsActive(-0.5)).toBe(true);
  });
});

describe("arcPathD", () => {
  it("degrades to a dead straight baseline when the sagitta is nothing", () => {
    expect(arcPathD(400, 0, 50)).toBe("M 0 50 L 400 50");
    expect(arcPathD(400, 0.4, 50)).toBe("M 0 50 L 400 50");
    expect(arcPathD(400, -0.4, 50)).toBe("M 0 50 L 400 50");
  });

  it("keeps both ends on the baseline and only bends the middle", () => {
    const d = arcPathD(400, 60, 50);
    expect(d.startsWith("M 0 50")).toBe(true);
    expect(d.endsWith("400 50")).toBe(true);
    expect(d).toContain(" A ");
  });

  it("sweeps over the top for an arch and under for a dip", () => {
    // Sweep flag 1 travels clockwise on screen: left edge, over the top, out.
    expect(arcPathD(400, 60, 50)).toMatch(/ 0 1 400 50$/);
    expect(arcPathD(400, -60, 50)).toMatch(/ 0 0 400 50$/);
  });

  it("asks for the long arc once the curve passes a half circle", () => {
    // Large-arc flag comes first, sweep second.
    expect(arcPathD(400, 100, 50)).toMatch(/ 0 1 400 50$/);
    expect(arcPathD(400, 300, 50)).toMatch(/ 1 1 400 50$/);
    expect(arcPathD(400, -300, 50)).toMatch(/ 1 0 400 50$/);
  });

  it("never divides by zero on a degenerate box", () => {
    const d = arcPathD(0, 40, 10);
    expect(d).toMatch(/^M 0 10 A /);
    expect(d).not.toContain("Infinity");
    expect(d).not.toContain("NaN");
  });
});

describe("applyTextCase", () => {
  it("follows the four CSS treatments without rewriting the stored words", () => {
    expect(applyTextCase("Amelia & Søren", { textTransform: "uppercase" })).toBe(
      "AMELIA & SØREN",
    );
    expect(applyTextCase("Amelia", { textTransform: "lowercase" })).toBe("amelia");
    expect(applyTextCase("save the date", { textTransform: "capitalize" })).toBe(
      "Save The Date",
    );
    expect(applyTextCase("Amelia", { textTransform: "none" })).toBe("Amelia");
    expect(applyTextCase("Amelia", undefined)).toBe("Amelia");
  });

  it("keeps the legacy uppercase flag working for old designs", () => {
    expect(applyTextCase("save the date", { uppercase: true })).toBe(
      "SAVE THE DATE",
    );
    // An explicit treatment wins over the legacy flag.
    expect(
      applyTextCase("Save", { uppercase: true, textTransform: "lowercase" }),
    ).toBe("save");
  });

  it("leaves Arabic alone, since it has no case", () => {
    expect(applyTextCase("بسم الله", { textTransform: "uppercase" })).toBe(
      "بسم الله",
    );
  });
});

describe("textAnchorFor", () => {
  it("puts a Latin line at the edge it is aligned to", () => {
    expect(textAnchorFor("left", "ltr")).toEqual({ anchor: "start", offset: "0%" });
    expect(textAnchorFor("center", "ltr")).toEqual({ anchor: "middle", offset: "50%" });
    expect(textAnchorFor("right", "ltr")).toEqual({ anchor: "end", offset: "100%" });
  });

  it("mirrors the anchors for Arabic, whose start is the right-hand edge", () => {
    expect(textAnchorFor("left", "rtl")).toEqual({ anchor: "end", offset: "0%" });
    expect(textAnchorFor("center", "rtl")).toEqual({ anchor: "middle", offset: "50%" });
    expect(textAnchorFor("right", "rtl")).toEqual({ anchor: "start", offset: "100%" });
  });
});

describe("curvedTextLines", () => {
  it("keeps one arc per row, blanks included", () => {
    const lines = curvedTextLines({
      text: "Amelia\n\nSøren",
      width: 400,
      height: 120,
      curve: 0,
      fontSize: 30,
      lineHeight: 1.4,
    });
    expect(lines).toHaveLength(3);
    expect(lines[0].text).toBe("Amelia");
    expect(lines[1].text).toBe("");
    expect(lines[2].text).toBe("Søren");
    // Straight when the curve is off: three flat baselines, evenly led.
    expect(lines.map((line) => line.d)).toEqual([
      arcPathD(400, 0, 28.5),
      arcPathD(400, 0, 70.5),
      arcPathD(400, 0, 112.5),
    ]);
  });

  it("optically centres a single line and stacks the rest by the leading", () => {
    const options = {
      text: "one\ntwo",
      width: 400,
      height: 100,
      curve: 0.5,
      fontSize: 20,
      lineHeight: 1.4,
    } as const;
    const [first, second] = curvedTextLines(options);
    const gap = 20 * 1.4;
    const sagitta = 0.5 * 100 * CURVE_SAGITTA_FACTOR;
    // Cap band sits just under the middle, then the second row drops by leading.
    expect(first.d).toBe(arcPathD(400, sagitta, 50 + 20 * 0.35 - gap / 2));
    expect(second.d).toBe(
      arcPathD(400, sagitta, 50 + 20 * 0.35 + gap / 2),
    );
  });

  it("applies case to the drawn words, not to the source", () => {
    const [line] = curvedTextLines({
      text: "save the date",
      width: 400,
      height: 80,
      curve: 0.3,
      fontSize: 24,
      lineHeight: 1.3,
      transform: { textTransform: "uppercase" },
    });
    expect(line.text).toBe("SAVE THE DATE");
  });

  it("survives a zero-sized box without producing an invalid path", () => {
    const [line] = curvedTextLines({
      text: "Amelia",
      width: 0,
      height: 0,
      curve: 1,
      fontSize: 26,
      lineHeight: 1.4,
    });
    expect(line.d).not.toContain("NaN");
    expect(line.d).not.toContain("Infinity");
  });
});
