import type { DesignElement } from "@/lib/design";

/**
 * Text-overflow measurements, taken from the real rendered layer.
 *
 * The studio measures the layer that is actually on the canvas — same family,
 * size, leading, tracking, case and box — so every number below is in canvas
 * units and can be written straight back into the design.
 */
export interface TextOverflow {
  /** Natural size of the content, without the box's padding or border. */
  contentW: number;
  contentH: number;
  /** Space the box offers the content (its content box). */
  availableW: number;
  availableH: number;
  /** Padding and border the box adds around the content. */
  chromeW: number;
  chromeH: number;
}

/** Sub-pixel measurement noise never counts as clipping. */
const SLACK = 0.5;

export function textOverflows(overflow: TextOverflow): boolean {
  return (
    overflow.contentH > overflow.availableH + SLACK ||
    overflow.contentW > overflow.availableW + SLACK
  );
}

/** How much room the box is short by, per axis (0 when it fits). */
export function overflowExcess(overflow: TextOverflow): {
  w: number;
  h: number;
} {
  return {
    w: Math.max(0, overflow.contentW - overflow.availableW),
    h: Math.max(0, overflow.contentH - overflow.availableH),
  };
}

/**
 * Grow the box to the size the text already has. Only the axes that actually
 * overflow move, so a layer that is merely too short stays the height the host
 * designed it at.
 */
export function growBoxPatch(
  element: DesignElement,
  overflow: TextOverflow,
): Partial<Pick<DesignElement, "w" | "h">> {
  const excess = overflowExcess(overflow);
  const patch: Partial<Pick<DesignElement, "w" | "h">> = {};
  if (excess.w > 0) patch.w = Math.ceil(overflow.contentW + overflow.chromeW);
  if (excess.h > 0) patch.h = Math.ceil(overflow.contentH + overflow.chromeH);
  return patch;
}

/**
 * The largest size that fits, rounded down to a half point with a 2% margin so
 * the last line is not shaved by rounding. Returns null when no sensible size
 * exists, which the caller shows as a disabled control rather than a silent
 * change — nothing is ever resized without the host asking.
 */
export function shrinkFontSize(
  element: DesignElement,
  overflow: TextOverflow,
): number | null {
  const current = element.fontSize ?? 26;
  const excess = overflowExcess(overflow);
  if (excess.w <= 0 && excess.h <= 0) return null;
  const ratio = Math.min(
    excess.h > 0 ? overflow.availableH / overflow.contentH : 1,
    excess.w > 0 ? overflow.availableW / overflow.contentW : 1,
  );
  const next = Math.floor(current * ratio * 0.98 * 2) / 2;
  if (next >= current || next < 8) return null;
  return next;
}

/**
 * A tighter leading that fits the same words in the same box. Only offered
 * when the layer is vertically clipped and the leading still has room to give;
 * manual line breaks are untouched either way, because only the leading number
 * changes.
 */
export function tightenLineHeight(
  element: DesignElement,
  overflow: TextOverflow,
): number | null {
  const current = element.lineHeight ?? 1.4;
  const excess = overflowExcess(overflow);
  if (excess.h <= 0) return null;
  if (current <= 0.85) return null;
  const next = Math.max(
    0.8,
    Math.floor((current * (overflow.availableH / overflow.contentH) * 0.98) * 100) /
      100,
  );
  return next < current ? next : null;
}
