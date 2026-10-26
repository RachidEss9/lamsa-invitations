/**
 * Text on a path — curved names and headings.
 *
 * The invitation renderer is DOM based: words are real text so Arabic shaping,
 * bidi, selection and guest personalisation all ride the browser's own text
 * engine. Curving those words therefore has to stay in the DOM too. This module
 * only produces geometry — an SVG arc plus the anchor that puts a line on it —
 * so the editor, the public invitation and the snapdom raster used for image and
 * PDF export all draw exactly the same curve from the same pure function.
 *
 * Nothing here measures or renders: no layout, no canvas, no fonts. The caller
 * supplies the layer box, the type size and the words.
 */

export const CURVE_MIN = -1;
export const CURVE_MAX = 1;

/** How far the arc rises or falls, as a fraction of half the layer height. */
export const CURVE_SAGITTA_FACTOR = 0.75;

/**
 * A stored curve is whatever an older or hand-edited document left behind, so
 * it is clamped into range and cleared when it is close enough to straight.
 * Returns `undefined` for "no curve", which keeps straight text byte-identical
 * to the pre-curve renderer.
 */
export function normalizeCurve(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  const clamped = Math.min(CURVE_MAX, Math.max(CURVE_MIN, parsed));
  if (Math.abs(clamped) < 0.005) return undefined;
  return Math.round(clamped * 1000) / 1000;
}

export function curveIsActive(curve: number | undefined): boolean {
  return typeof curve === "number" && Math.abs(curve) >= 0.005;
}

/**
 * The arc a line of words rides.
 *
 * Two points, one sagitta: the path leaves the left edge at `baseline`, rises
 * (or falls) by `sagitta` at the middle and lands on the right edge. The circle
 * through those three points has radius `(a² + s²) / 2s`, which is what makes
 * the curvature even along the whole line instead of pinched in the middle.
 *
 * A near-zero sagitta degrades to a straight line rather than a huge radius,
 * so nudging the control never produces a wobbly baseline.
 */
export function arcPathD(width: number, sagitta: number, baseline: number): string {
  const w = Math.max(1, width);
  if (Math.abs(sagitta) < 0.5) {
    return `M 0 ${round(baseline)} L ${round(w)} ${round(baseline)}`;
  }
  const half = w / 2;
  const s = Math.abs(sagitta);
  const radius = (half * half + s * s) / (2 * s);
  // Past a semicircle the short arc can no longer reach the far point.
  const largeArc = s > half ? 1 : 0;
  // Sweep 1 travels clockwise on screen: from the left edge over the top.
  const sweep = sagitta > 0 ? 1 : 0;
  return [
    "M 0",
    round(baseline),
    "A",
    round(radius),
    round(radius),
    "0",
    largeArc,
    sweep,
    round(w),
    round(baseline),
  ].join(" ");
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

export interface TextCaseTransform {
  uppercase?: boolean;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
}

/**
 * Case is applied in JavaScript rather than by CSS, because SVG text does not
 * honour `text-transform` consistently across engines. The stored words are
 * never rewritten — exactly the contract the straight renderer keeps.
 */
export function applyTextCase(
  text: string,
  transform: TextCaseTransform | undefined,
): string {
  const kind =
    transform?.textTransform ??
    (transform?.uppercase ? ("uppercase" as const) : ("none" as const));
  switch (kind) {
    case "uppercase":
      return text.toUpperCase();
    case "lowercase":
      return text.toLowerCase();
    case "capitalize":
      // Word edges are approximated with whitespace: enough for invitation
      // copy, and it never uppercases the tail of an apostrophised word.
      return text.replace(
        /(^|\s)(\p{L})/gu,
        (_match, lead: string, letter: string) => lead + letter.toUpperCase(),
      );
    case "none":
    default:
      return text;
  }
}

export type TextAlign = "left" | "center" | "right";
export type TextDirection = "ltr" | "rtl";

/**
 * Where a line sits on its arc.
 *
 * `start` and `end` are logical, so a right-to-left line mirrored through the
 * same visual edge needs the opposite anchor from a Latin one: the left edge of
 * Arabic is its *end*.
 */
export function textAnchorFor(
  align: TextAlign,
  direction: TextDirection,
): { anchor: "start" | "middle" | "end"; offset: string } {
  if (align === "center") return { anchor: "middle", offset: "50%" };
  const visualLeft = align === "left";
  const startAtEdge =
    direction === "rtl" ? !visualLeft : visualLeft;
  return startAtEdge
    ? { anchor: "start", offset: visualLeft ? "0%" : "100%" }
    : { anchor: "end", offset: visualLeft ? "0%" : "100%" };
}

export interface CurvedLine {
  /** SVG path data for this line's baseline. */
  d: string;
  /** The words as they should be drawn, after case treatment. */
  text: string;
}

export interface CurvedTextOptions {
  text: string;
  /** Layer box in design units. */
  width: number;
  height: number;
  /** −1 … 1, negative dips the arc. */
  curve: number;
  fontSize: number;
  /** Multiplier, as stored on the layer. */
  lineHeight: number;
  transform?: TextCaseTransform;
}

/**
 * Splits the wording into lines and gives each one its own arc.
 *
 * The stack is optically centred: with one line the baseline sits just below
 * the middle so the cap band reads centred, and every extra line is pushed
 * down by the leading. Empty lines are kept so a deliberate blank row stays a
 * deliberate blank row.
 */
export function curvedTextLines(options: CurvedTextOptions): CurvedLine[] {
  const {
    text,
    width,
    height,
    curve,
    fontSize,
    lineHeight,
    transform,
  } = options;
  const safeSize = Math.max(1, fontSize);
  const gap = Math.max(1, lineHeight) * safeSize;
  const rows = text.split("\n");
  const sagitta = curve * Math.max(1, height) * CURVE_SAGITTA_FACTOR;
  // Cap height is roughly 0.7em, so dropping the baseline by 0.35em centres it.
  const optical = safeSize * 0.35;
  const first = height / 2 + optical - ((rows.length - 1) * gap) / 2;
  return rows.map((row, index) => ({
    d: arcPathD(width, sagitta, first + index * gap),
    text: applyTextCase(row, transform),
  }));
}
