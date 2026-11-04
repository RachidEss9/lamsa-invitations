import { describe, expect, it } from "vitest";
import {
  LENGTH_UNITS,
  MM_PER_PT,
  PT_PER_INCH,
  PT_PER_MM,
  convertLength,
  formatLength,
  fromPoints,
  isLengthUnit,
  nearlyEqual,
  pointsPerUnit,
  roundTo,
  toPoints,
} from "./units";

/**
 * PDF points are the canonical unit. Every conversion the presets, the
 * inspector and the print engine rely on is pinned here, including the
 * round-trip tolerance that keeps repeated unit switches lossless.
 */

describe("unit constants", () => {
  it("uses 72 points to the inch", () => {
    expect(PT_PER_INCH).toBe(72);
  });

  it("derives millimetres from the inch, not the other way round", () => {
    expect(PT_PER_MM).toBeCloseTo(72 / 25.4, 12);
    expect(PT_PER_MM).toBeCloseTo(2.8346456692913384, 12);
    expect(MM_PER_PT).toBeCloseTo(25.4 / 72, 12);
  });

  it("describes each supported unit once", () => {
    expect(LENGTH_UNITS.map((unit) => unit.id)).toEqual(["pt", "mm", "cm", "in"]);
    expect(new Set(LENGTH_UNITS.map((unit) => unit.id)).size).toBe(4);
  });

  it("recognises only real units", () => {
    expect(isLengthUnit("mm")).toBe(true);
    expect(isLengthUnit("px")).toBe(false);
    expect(isLengthUnit(undefined)).toBe(false);
  });
});

describe("toPoints", () => {
  it("keeps points unchanged", () => {
    expect(toPoints(123.45, "pt")).toBe(123.45);
  });

  it("converts one inch to 72 points", () => {
    expect(toPoints(1, "in")).toBe(72);
    expect(toPoints(6, "in")).toBe(432);
    expect(toPoints(0.125, "in")).toBe(9);
  });

  it("converts 25.4 mm to 72 points", () => {
    expect(toPoints(25.4, "mm")).toBeCloseTo(72, 10);
    expect(toPoints(210, "mm")).toBeCloseTo(595.2755905511812, 9);
    expect(toPoints(297, "mm")).toBeCloseTo(841.8897637795277, 9);
  });

  it("converts centimetres through the same ratio", () => {
    expect(toPoints(2.54, "cm")).toBeCloseTo(72, 10);
    expect(toPoints(1, "cm")).toBeCloseTo(28.346456692913385, 10);
  });

  it("refuses non-finite values", () => {
    expect(() => toPoints(Number.NaN, "mm")).toThrow(RangeError);
    expect(() => toPoints(Number.POSITIVE_INFINITY, "pt")).toThrow(RangeError);
  });

  it("refuses an unknown unit", () => {
    // The cast is the point: runtime data can carry a bad unit.
    expect(() => toPoints(1, "px" as never)).toThrow(RangeError);
  });
});

describe("fromPoints", () => {
  it("turns 72 points into one inch", () => {
    expect(fromPoints(72, "in")).toBe(1);
  });

  it("turns 72 points into 25.4 mm", () => {
    expect(fromPoints(72, "mm")).toBeCloseTo(25.4, 10);
  });

  it("round-trips every unit within floating-point tolerance", () => {
    const samples = [0, 1, 12.5, 210, 841.8897637795277, 1234.5678];
    for (const unit of LENGTH_UNITS.map((entry) => entry.id)) {
      for (const value of samples) {
        expect(nearlyEqual(fromPoints(toPoints(value, unit), unit), value)).toBe(true);
      }
    }
  });
});

describe("convertLength", () => {
  it("converts between any two units", () => {
    expect(convertLength(1, "in", "mm")).toBeCloseTo(25.4, 10);
    expect(convertLength(2.54, "cm", "in")).toBeCloseTo(1, 10);
    expect(convertLength(72, "pt", "in")).toBeCloseTo(1, 10);
    expect(convertLength(10, "mm", "cm")).toBeCloseTo(1, 10);
  });

  it("reports how many points a unit is", () => {
    expect(pointsPerUnit("mm")).toBeCloseTo(PT_PER_MM, 12);
    expect(pointsPerUnit("in")).toBe(72);
    expect(pointsPerUnit("pt")).toBe(1);
  });
});

describe("rounding and equality", () => {
  it("rounds to a fixed number of decimals without negative zero", () => {
    expect(roundTo(2.834645, 2)).toBe(2.83);
    expect(roundTo(-0.0001, 2)).toBe(0);
    expect(Object.is(roundTo(-0.0001, 2), -0)).toBe(false);
  });

  it("leaves non-finite values alone rather than pretending to round them", () => {
    expect(Number.isNaN(roundTo(Number.NaN))).toBe(true);
  });

  it("compares floats with an explicit tolerance", () => {
    expect(nearlyEqual(1, 1 + 1e-9)).toBe(true);
    expect(nearlyEqual(1, 1.01, 1e-6)).toBe(false);
    expect(nearlyEqual(Number.NaN, Number.NaN)).toBe(false);
  });
});

describe("formatLength", () => {
  it("prints millimetres without trailing zeros", () => {
    expect(formatLength(toPoints(210, "mm"), "mm")).toBe("210 mm");
  });

  it("prints inches with useful precision", () => {
    expect(formatLength(toPoints(12, "in"), "in")).toBe("12 in");
    expect(formatLength(toPoints(0.125, "in"), "in")).toBe("0.125 in");
  });

  it("honours an explicit precision", () => {
    expect(formatLength(72, "in", 2)).toBe("1 in");
    expect(formatLength(2.834645669, "mm", 4)).toBe("1 mm");
    expect(formatLength(2.834645669, "mm", 1)).toBe("1 mm");
  });

  it("rejects a broken measurement", () => {
    expect(() => formatLength(Number.NaN, "mm")).toThrow(RangeError);
  });
});
