/**
 * Guides and rulers.
 *
 * Guides are document data (they survive a reload and are shared by every
 * page), but they are *editor aids*: the PDF writer never emits them and the
 * preview hides them. This module is the small, pure layer between the stored
 * `Guide[]` and the ruler/panel controls, so guide geometry can be tested
 * without a DOM.
 */

import { trimBox } from "./geometry";
import type { Guide, PageSpec } from "./model";
import { defaultIds, type IdFactory } from "./ids";

export type GuideAxis = Guide["axis"];

/** Page guides belong to one page; document guides cross every page. */
export function guidesForPage(
  guides: readonly Guide[],
  pageId: string | undefined,
): Guide[] {
  return guides.filter(
    (guide) =>
      guide.scope === "document" ||
      (guide.scope === "page" && pageId !== undefined && guide.pageId === pageId),
  );
}

export function makeGuide(
  axis: GuideAxis,
  position: number,
  scope: Guide["scope"] = "page",
  pageId?: string,
  ids: IdFactory = defaultIds,
): Guide {
  return {
    id: ids("guide"),
    axis,
    position,
    scope,
    ...(scope === "page" && pageId ? { pageId } : {}),
  };
}

/** Keeps a guide inside the sheet, rounded to 0.1 pt so drags stay stable. */
export function clampGuidePosition(
  position: number,
  axis: GuideAxis,
  spec: PageSpec,
): number {
  const trim = trimBox(spec);
  const limit = axis === "x" ? trim.width : trim.height;
  const clamped = Math.max(0, Math.min(limit, Number.isFinite(position) ? position : 0));
  return Math.round(clamped * 10) / 10;
}

export function addGuide(guides: readonly Guide[], guide: Guide): Guide[] {
  return [...guides, guide];
}

export function moveGuide(
  guides: readonly Guide[],
  guideId: string,
  position: number,
  spec?: PageSpec,
): Guide[] {
  return guides.map((guide) =>
    guide.id === guideId
      ? {
          ...guide,
          position:
            spec === undefined
              ? Math.round(position * 10) / 10
              : clampGuidePosition(position, guide.axis, spec),
        }
      : guide,
  );
}

export function removeGuide(guides: readonly Guide[], guideId: string): Guide[] {
  return guides.filter((guide) => guide.id !== guideId);
}

export function clearGuides(
  guides: readonly Guide[],
  scope: Guide["scope"],
  pageId?: string,
): Guide[] {
  return guides.filter((guide) =>
    scope === "document"
      ? guide.scope !== "document"
      : !(guide.scope === "page" && guide.pageId === pageId),
  );
}

/** A short label for the ruler/panel: "X 120 pt" or "Y 34.5 mm". */
export function describeGuide(
  guide: Guide,
  format: (points: number) => string,
): string {
  return `${guide.axis.toUpperCase()} ${format(guide.position)}`;
}

/**
 * Tick positions for a ruler of `length` points. `step` is the labelled major
 * interval; minor ticks subdivide it by five. The list is explicit so the
 * ruler renders the same ticks at every zoom.
 */
export function rulerTicks(
  length: number,
  step: number,
): { position: number; major: boolean }[] {
  if (!(length > 0) || !(step > 0)) return [];
  const minor = step / 5;
  const ticks: { position: number; major: boolean }[] = [];
  for (let position = 0, index = 0; position <= length + 0.001; index += 1) {
    ticks.push({ position, major: index % 5 === 0 });
    position = index === 0 ? minor : position + minor;
  }
  return ticks;
}

/** The guide axis a ruler drag creates: the top ruler makes vertical (x) guides. */
export function axisForRuler(edge: "top" | "left"): GuideAxis {
  return edge === "top" ? "x" : "y";
}
