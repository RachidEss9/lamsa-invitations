/**
 * Physical units.
 *
 * PDF points are the canonical unit of the whole publishing foundation:
 * one point is exactly 1/72 inch, and one inch is exactly 25.4 mm. Every
 * stored dimension in the document model is in points, so a document means
 * the same thing on every screen and on paper. Millimetres, centimetres and
 * inches exist only at the edges — the interface, presets and readouts.
 *
 * All conversions are pure and round-trip safe to a floating-point tolerance.
 */

export type LengthUnit = "pt" | "mm" | "cm" | "in";

/** 1 inch = 72 pt. */
export const PT_PER_INCH = 72;

/** 1 inch = 25.4 mm. */
export const MM_PER_INCH = 25.4;

/** 1 mm = 72 / 25.4 pt (≈ 2.834645669…). */
export const PT_PER_MM = PT_PER_INCH / MM_PER_INCH;

/** 1 pt = 25.4 / 72 mm. */
export const MM_PER_PT = MM_PER_INCH / PT_PER_INCH;

const PT_PER_UNIT: Record<LengthUnit, number> = {
  pt: 1,
  mm: PT_PER_MM,
  cm: PT_PER_MM * 10,
  in: PT_PER_INCH,
};

export const LENGTH_UNITS: readonly {
  id: LengthUnit;
  label: string;
  /** How many points one unit is, for display and step sizes. */
  points: number;
}[] = [
  { id: "pt", label: "Points", points: 1 },
  { id: "mm", label: "Millimetres", points: PT_PER_MM },
  { id: "cm", label: "Centimetres", points: PT_PER_MM * 10 },
  { id: "in", label: "Inches", points: PT_PER_INCH },
];

export const DEFAULT_LENGTH_UNIT: LengthUnit = "mm";

export function isLengthUnit(value: unknown): value is LengthUnit {
  return value === "pt" || value === "mm" || value === "cm" || value === "in";
}

/** How many points one unit of `unit` is. */
export function pointsPerUnit(unit: LengthUnit): number {
  return PT_PER_UNIT[unit];
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${label} must be a finite number`);
  }
}

function assertUnit(unit: LengthUnit): void {
  if (!isLengthUnit(unit)) {
    throw new RangeError(`Unknown length unit: ${String(unit)}`);
  }
}

/** A measurement in points, from a value expressed in `unit`. */
export function toPoints(value: number, unit: LengthUnit): number {
  assertFinite(value, "value");
  assertUnit(unit);
  return value * PT_PER_UNIT[unit];
}

/** A measurement in `unit`, from points. */
export function fromPoints(points: number, unit: LengthUnit): number {
  assertFinite(points, "points");
  assertUnit(unit);
  return points / PT_PER_UNIT[unit];
}

/** Converts a value between any two supported units. */
export function convertLength(
  value: number,
  from: LengthUnit,
  to: LengthUnit,
): number {
  return fromPoints(toPoints(value, from), to);
}

/**
 * Rounds to a fixed number of decimals, without the `-0` artefact that makes
 * deterministic fixtures annoying.
 */
export function roundTo(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

/** Floating-point comparison for geometry assertions. */
export function nearlyEqual(a: number, b: number, tolerance = 1e-6): boolean {
  if (a === b) return true;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= Math.max(1e-9, tolerance);
}

function defaultDecimals(unit: LengthUnit): number {
  switch (unit) {
    case "pt":
      return 2;
    case "mm":
      return 1;
    case "cm":
      return 2;
    case "in":
      return 3;
    default:
      return 2;
  }
}

/** Trims trailing zeros so readouts say `210 mm`, not `210.0 mm`. */
function trimNumber(value: number, decimals: number): string {
  const fixed = value.toFixed(Math.max(0, Math.min(6, decimals)));
  if (!fixed.includes(".")) return fixed;
  return fixed.replace(/0+$/, "").replace(/\.$/, "");
}

/** A human measurement, e.g. `formatLength(595.276, "mm") === "210 mm"`. */
export function formatLength(
  points: number,
  unit: LengthUnit,
  decimals: number = defaultDecimals(unit),
): string {
  assertFinite(points, "points");
  assertUnit(unit);
  const value = fromPoints(points, unit);
  return `${trimNumber(value, decimals)} ${unit}`;
}
