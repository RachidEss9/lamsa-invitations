import type { PublicationPage } from "./model";

/**
 * Margin rules, in points.
 *
 * The inspector and preflight both refuse a negative margin and a margin that
 * leaves the page with no live area. Keeping the rule here means the numeric
 * field can explain the problem while typing, and the same numbers are what
 * preflight measures later.
 */
export type MarginEdge = "top" | "right" | "bottom" | "left";

export const MARGIN_EDGES: readonly MarginEdge[] = [
  "top",
  "right",
  "bottom",
  "left",
];

const OPPOSITE: Record<MarginEdge, MarginEdge> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

/** Largest value this edge can take and still leave a live area, in points. */
export function marginLimit(page: PublicationPage, edge: MarginEdge): number {
  const along =
    edge === "left" || edge === "right"
      ? page.spec.trim.width
      : page.spec.trim.height;
  const opposite = page.spec.margins[OPPOSITE[edge]];
  if (!Number.isFinite(along)) return 0;
  const taken = Number.isFinite(opposite) ? opposite : 0;
  return Math.max(0, along - taken);
}

/**
 * Returns a sentence explaining why the typed margin cannot be stored, or
 * `null` when it is valid. `format` renders a point value in the document's
 * own unit, so the message reads "under 165 mm" in a magazine job.
 */
export function marginProblem(
  page: PublicationPage,
  edge: MarginEdge,
  value: number,
  format: (points: number) => string,
): string | null {
  if (!Number.isFinite(value)) return "Enter a number.";
  if (value < 0) return "Margins can’t be negative.";
  const limit = marginLimit(page, edge);
  if (!(limit > 0) || value >= limit) {
    const label = `${edge[0].toUpperCase()}${edge.slice(1)}`;
    return limit > 0
      ? `${label} margin must stay under ${format(limit)} so the page keeps a live area.`
      : `The ${OPPOSITE[edge]} margin already fills this page; lower it first.`;
  }
  return null;
}
