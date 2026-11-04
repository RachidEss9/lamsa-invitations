/**
 * Canvas magnification.
 *
 * The studio keeps two numbers apart on purpose:
 *
 * - `zoom` is the host's magnification *relative to the fitted page*. It is
 *   what the keyboard, the wheel, pinch and the +/− buttons change, and it is
 *   what survives a viewport resize: a page fitted on a laptop stays fitted on
 *   a phone, and a page the host zoomed into stays zoomed in.
 * - `scale` is the real ratio between one design pixel and one screen pixel.
 *   It is what the percentage readout must show, because "100%" has to mean
 *   actual size, not "fitted to whatever screen this is".
 *
 * Nothing here touches the design document: zoom is a view, never artwork.
 */

/** The smallest magnification a host can reach: 10% of actual size. */
export const MIN_SCALE = 0.1;
/** The largest magnification: 400% of actual size. */
export const MAX_SCALE = 4;
/** One press of +/− moves the scale by this factor. */
export const ZOOM_STEP = 1.2;
/** Breathing room around a fitted page, in screen pixels. */
export const FIT_PADDING = 56;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * The scale at which the whole page fits inside the workspace, preserving its
 * aspect ratio. Returns 0 when the workspace has not been measured yet, so a
 * caller can show "—" rather than a misleading 0%.
 */
export function fitScaleFor(
  workspaceWidth: number,
  workspaceHeight: number,
  pageWidth: number,
  pageHeight: number,
  padding = FIT_PADDING,
): number {
  if (
    !Number.isFinite(workspaceWidth) ||
    !Number.isFinite(workspaceHeight) ||
    pageWidth <= 0 ||
    pageHeight <= 0
  ) {
    return 0;
  }
  const width = workspaceWidth - padding;
  const height = workspaceHeight - padding;
  if (width <= 0 || height <= 0) return 0;
  return Math.max(0, Math.min(width / pageWidth, height / pageHeight));
}

/** The true ratio between design pixels and screen pixels. */
export function scaleForZoom(zoom: number, fit: number): number {
  if (!Number.isFinite(fit) || fit <= 0) return 0;
  return clamp(fit * zoom, MIN_SCALE, MAX_SCALE);
}

/**
 * Clamps a relative zoom so the resulting scale stays inside
 * [MIN_SCALE, MAX_SCALE]. Keeping the clamp on the scale — not on the ratio —
 * is what lets a page that sits at 30% when fitted still reach 100%.
 */
export function clampZoom(zoom: number, fit: number): number {
  if (!Number.isFinite(zoom)) return 1;
  if (!Number.isFinite(fit) || fit <= 0) return zoom;
  return clamp(zoom, MIN_SCALE / fit, MAX_SCALE / fit);
}

/** One +/− step, expressed as a relative zoom. */
export function zoomByStep(zoom: number, fit: number, steps = 1): number {
  return clampZoom(zoom * Math.pow(ZOOM_STEP, steps), fit);
}

/** The relative zoom that renders the page at actual 100% size. */
export function zoomForActualSize(fit: number): number {
  if (!Number.isFinite(fit) || fit <= 0) return 1;
  return clampZoom(1 / fit, fit);
}

/** The percentage the toolbar shows. Rounded, so 0.9997 reads as 100%. */
export function zoomPercent(scale: number): number {
  return Math.round(scale * 100);
}

/** Paging, shared by the toolbar and the keyboard. */
export function pageStep(
  index: number,
  total: number,
  direction: -1 | 1,
): number | null {
  const target = index + direction;
  if (total <= 0 || target < 0 || target >= total) return null;
  return target;
}

/** "2 / 5" — the current page and the document length. */
export function pageLabel(index: number, total: number): string {
  if (total <= 0) return "0 / 0";
  return `${clamp(index + 1, 1, total)} / ${total}`;
}
