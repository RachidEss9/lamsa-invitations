/**
 * Canvas viewport: physical points ↔ screen pixels.
 *
 * The editor never converts a document dimension itself. A spread is measured
 * once by `spreadGeometry` in points, and this module is the only place that
 * knows how those points sit on the glass: a zoom factor and a pan offset.
 *
 * Consequences that keep the interaction honest:
 *   - a page-local point (top-left origin inside the trim) has exactly one
 *     screen position, and it is derived, never stored;
 *   - zooming about the pointer keeps the content under the pointer still;
 *   - hit-testing can run entirely in points, at any zoom, without drift
 *     from repeated screen-space rounding.
 */

import type { Point, Rect, Size } from "./model";
import type { SpreadGeometry } from "./spreads";

export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 16;

/** The stops the zoom control steps through. */
export const ZOOM_STEPS: readonly number[] = [
  0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 6, 8,
];

/** Padding around a spread when the view is fitted to the window. */
export const FIT_PADDING = 56;

export interface Viewport {
  /** Screen pixels per point. */
  zoom: number;
  /** Offset of the stage inside its container, in screen pixels. */
  panX: number;
  panY: number;
}

export function createViewport(zoom = 1, panX = 0, panY = 0): Viewport {
  return { zoom: clampZoom(zoom), panX, panY };
}

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return 1;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/** Rounds a zoom to a percentage a person would recognise. */
export function zoomPercent(zoom: number): number {
  return Math.round(zoom * 100);
}

/**
 * Zooms while holding the content point under `anchor` still. `anchor` is in
 * container pixels (the client position minus the container's own origin).
 */
export function zoomAtPoint(
  current: Viewport,
  nextZoom: number,
  anchor: Point,
): Viewport {
  const zoom = clampZoom(nextZoom);
  if (zoom === current.zoom) return current;
  const scale = zoom / current.zoom;
  return {
    zoom,
    panX: anchor.x - (anchor.x - current.panX) * scale,
    panY: anchor.y - (anchor.y - current.panY) * scale,
  };
}

export function panBy(current: Viewport, dx: number, dy: number): Viewport {
  if (dx === 0 && dy === 0) return current;
  return { ...current, panX: current.panX + dx, panY: current.panY + dy };
}

/** The next stop up or down from the current zoom. */
export function steppedZoom(zoom: number, direction: 1 | -1): number {
  const epsilon = 1e-3;
  if (direction > 0) {
    return ZOOM_STEPS.find((step) => step > zoom + epsilon) ?? MAX_ZOOM;
  }
  return [...ZOOM_STEPS].reverse().find((step) => step < zoom - epsilon) ?? MIN_ZOOM;
}

/** Square-stage view of one spread, in screen pixels, at a given zoom. */
export interface StageLayout {
  zoom: number;
  /** Spread bleed top-left, in spread points. Subtracted before scaling. */
  originX: number;
  originY: number;
  width: number;
  height: number;
  pages: StagePageBox[];
}

export interface StagePageBox {
  pageId: string;
  /** Position and size of the page's bleed box, in stage pixels. */
  left: number;
  top: number;
  width: number;
  height: number;
  /** Distance from the bleed edge to the trim edge, in stage pixels. */
  trimLeft: number;
  trimTop: number;
  /** The bleed band in points, for drawing the outer boundary. */
  bleed: number;
}

/**
 * Turns one spread's point geometry into stage pixels. The stage is as large
 * as the spread's bleed box, so the pan offset can move it entirely into view
 * without any page-specific special cases.
 */
export function stageLayout(geometry: SpreadGeometry, zoom: number): StageLayout {
  const safeZoom = clampZoom(zoom);
  const originX = geometry.bleed.x;
  const originY = geometry.bleed.y;
  return {
    zoom: safeZoom,
    originX,
    originY,
    width: geometry.bleed.width * safeZoom,
    height: geometry.bleed.height * safeZoom,
    pages: geometry.pages.map((page) => {
      const bleed = Math.max(0, (page.bleed.width - page.trim.width) / 2);
      return {
        pageId: page.pageId,
        left: (page.bleed.x - originX) * safeZoom,
        top: (page.bleed.y - originY) * safeZoom,
        width: page.bleed.width * safeZoom,
        height: page.bleed.height * safeZoom,
        trimLeft: (page.trim.x - page.bleed.x) * safeZoom,
        trimTop: (page.trim.y - page.bleed.y) * safeZoom,
        bleed,
      };
    }),
  };
}

export function pageStageBox(
  layout: StageLayout,
  pageId: string,
): StagePageBox | undefined {
  return layout.pages.find((page) => page.pageId === pageId);
}

/** A page-local point (points) as a stage position (pixels). */
export function pagePointToStage(
  layout: StageLayout,
  pageId: string,
  point: Point,
): Point | null {
  const box = pageStageBox(layout, pageId);
  if (!box) return null;
  return {
    x: box.left + box.trimLeft + point.x * layout.zoom,
    y: box.top + box.trimTop + point.y * layout.zoom,
  };
}

/** A stage position (pixels) as a page-local point (points). */
export function stagePointToPage(
  layout: StageLayout,
  pageId: string,
  point: Point,
): Point | null {
  const box = pageStageBox(layout, pageId);
  if (!box) return null;
  return {
    x: (point.x - box.left - box.trimLeft) / layout.zoom,
    y: (point.y - box.top - box.trimTop) / layout.zoom,
  };
}

/** A client-space point (e.g. from a pointer event) as a page-local point. */
export function pagePointFromClient(
  layout: StageLayout,
  pageId: string,
  client: Point,
  stageOrigin: Point,
): Point | null {
  return stagePointToPage(layout, pageId, {
    x: client.x - stageOrigin.x,
    y: client.y - stageOrigin.y,
  });
}

/** The page whose trim contains a stage position, topmost page first. */
export function pageAtStagePoint(
  layout: StageLayout,
  point: Point,
): string | null {
  for (let index = layout.pages.length - 1; index >= 0; index -= 1) {
    const box = layout.pages[index]!;
    const trimLeft = box.left + box.trimLeft;
    const trimTop = box.top + box.trimTop;
    if (
      point.x >= trimLeft &&
      point.x < trimLeft + (box.width - box.trimLeft * 2) &&
      point.y >= trimTop &&
      point.y < trimTop + (box.height - box.trimTop * 2)
    ) {
      return box.pageId;
    }
  }
  return null;
}

/**
 * The zoom and pan that show a whole spread with breathing room. Content is
 * never blown up past 100% by a fit — a small menu should not fill a 27-inch
 * display like a billboard.
 */
export function fitViewport(
  content: Size,
  container: Size,
  padding = FIT_PADDING,
): Viewport {
  if (!(content.width > 0) || !(content.height > 0)) {
    return createViewport(1, 0, 0);
  }
  const availableWidth = Math.max(1, container.width - padding * 2);
  const availableHeight = Math.max(1, container.height - padding * 2);
  const zoom = clampZoom(
    Math.min(availableWidth / content.width, availableHeight / content.height, 1),
  );
  return {
    zoom,
    panX: (container.width - content.width * zoom) / 2,
    panY: (container.height - content.height * zoom) / 2,
  };
}

/** A stage rectangle (pixels) for a page-local rectangle (points). */
export function pageRectToStage(
  layout: StageLayout,
  pageId: string,
  rect: Rect,
): Rect | null {
  const origin = pagePointToStage(layout, pageId, { x: rect.x, y: rect.y });
  if (!origin) return null;
  return {
    x: origin.x,
    y: origin.y,
    width: rect.width * layout.zoom,
    height: rect.height * layout.zoom,
  };
}
