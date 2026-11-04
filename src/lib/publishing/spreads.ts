/**
 * Facing-page and spread geometry.
 *
 * A spread is the unit a reader sees: one page alone, or two pages side by
 * side with a gutter between them. The spread plan is derived from the page
 * order — never stored independently — so pages can be inserted, moved or
 * deleted without spreads drifting out of sync.
 *
 * Physical convention: the cover stands alone on the right (recto), interior
 * pages pair left/right, and a document with an odd number of pages ends on a
 * lone left (verso) page. A non-facing document gives every page its own
 * `single` spread.
 */

import type { PageSide, PublicationPage, Rect, Spread } from "./model";
import { defaultIds, type IdFactory } from "./ids";
import { bleedOf, marginsForSide, safeBox } from "./geometry";

export interface SpreadPlanOptions {
  facingPages: boolean;
  /** Space between facing pages, in points. */
  gutter?: number;
  /** Whether page 1 stands alone as the cover. Defaults to true. */
  coverStandalone?: boolean;
  /** The side the cover sits on. Defaults to right (recto). */
  coverSide?: "left" | "right";
  /** Id source, so plans can be deterministic in tests. */
  ids?: IdFactory;
}

const DEFAULT_GUTTER = 0;

function oppositeSide(side: "left" | "right"): "left" | "right" {
  return side === "left" ? "right" : "left";
}

function pageIdOf(page: Pick<PublicationPage, "id"> | { id: string }): string {
  return page.id;
}

/**
 * Builds the spread list for an ordered page list. The result is stable for a
 * given input: the same pages and options always produce the same spreads.
 */
export function planSpreads(
  pages: readonly { id: string }[],
  options: SpreadPlanOptions,
): Spread[] {
  const ids = options.ids ?? defaultIds;
  const gutter = Math.max(0, options.gutter ?? DEFAULT_GUTTER);
  const planned: Spread[] = [];

  if (!options.facingPages) {
    pages.forEach((page, index) => {
      planned.push({
        id: ids("spread"),
        index,
        kind: "single",
        pageIds: [pageIdOf(page)],
        gutter: 0,
      });
    });
    return planned;
  }

  const coverStandalone = options.coverStandalone ?? true;
  let cursor = 0;

  if (coverStandalone && pages.length > 0) {
    planned.push({
      id: ids("spread"),
      index: 0,
      kind: "single",
      pageIds: [pageIdOf(pages[0]!)],
      gutter: 0,
    });
    cursor = 1;
  }

  while (cursor < pages.length) {
    const first = pages[cursor]!;
    const second = pages[cursor + 1];
    if (second) {
      planned.push({
        id: ids("spread"),
        index: planned.length,
        kind: "facing",
        pageIds: [pageIdOf(first), pageIdOf(second)],
        gutter,
      });
      cursor += 2;
    } else {
      planned.push({
        id: ids("spread"),
        index: planned.length,
        kind: "single",
        pageIds: [pageIdOf(first)],
        gutter: 0,
      });
      cursor += 1;
    }
  }

  return planned;
}

/**
 * Reuses saved spread ids when the derived spread still holds the same pages,
 * so reopening a document does not churn ids the editor already references.
 */
export function preserveSpreadIds(
  planned: Spread[],
  previous: readonly Spread[] | undefined,
): Spread[] {
  if (!previous || previous.length === 0) return planned;
  const bySignature = new Map<string, string>();
  for (const spread of previous) {
    if (typeof spread?.id !== "string") continue;
    bySignature.set(spread.pageIds.join("|"), spread.id);
  }
  return planned.map((spread) => {
    const saved = bySignature.get(spread.pageIds.join("|"));
    return saved ? { ...spread, id: saved } : spread;
  });
}

/** The page's side inside a spread, given the cover convention. */
export function pageSideInSpread(
  spread: Spread,
  indexInSpread: number,
  options: Pick<SpreadPlanOptions, "facingPages" | "coverSide"> = {
    facingPages: true,
  },
): PageSide {
  if (!options.facingPages) return "single";
  if (spread.kind === "facing") return indexInSpread === 0 ? "left" : "right";
  const coverSide = options.coverSide ?? "right";
  return spread.index === 0 ? coverSide : oppositeSide(coverSide);
}

/** Returns the pages with their `side` assigned from the spread plan. */
export function assignPageSides(
  pages: readonly PublicationPage[],
  spreads: readonly Spread[],
  options: Pick<SpreadPlanOptions, "facingPages" | "coverSide">,
): PublicationPage[] {
  const sides = new Map<string, PageSide>();
  for (const spread of spreads) {
    spread.pageIds.forEach((pageId, index) => {
      sides.set(pageId, pageSideInSpread(spread, index, options));
    });
  }
  return pages.map((page) => {
    const side = sides.get(page.id) ?? (options.facingPages ? "right" : "single");
    return side === page.side ? page : { ...page, side };
  });
}

export function spreadIndexOfPage(
  spreads: readonly Spread[],
  pageId: string,
): number {
  return spreads.findIndex((spread) => spread.pageIds.includes(pageId));
}

export function spreadForPage(
  spreads: readonly Spread[],
  pageId: string,
): Spread | undefined {
  return spreads.find((spread) => spread.pageIds.includes(pageId));
}

/** The page opposite `pageId` in its spread, if there is one. */
export function facingPageOf(
  spreads: readonly Spread[],
  pageId: string,
): string | undefined {
  const spread = spreadForPage(spreads, pageId);
  if (!spread || spread.pageIds.length < 2) return undefined;
  return spread.pageIds.find((id) => id !== pageId);
}

/* -------------------------------------------------------------------------- */
/* Spread geometry                                                            */
/* -------------------------------------------------------------------------- */

export interface SpreadPageGeometry {
  pageId: string;
  side: PageSide;
  index: number;
  /** Where the page's trim box sits in the spread's coordinate space. */
  offset: { x: number; y: number };
  trim: Rect;
  bleed: Rect;
  safe: Rect;
}

export interface SpreadGeometry {
  spreadId: string;
  index: number;
  kind: Spread["kind"];
  gutter: number;
  /** Trim area of the whole spread, including the gutter gap. */
  trim: Rect;
  /**
   * The bleed band around the outside of the spread only: the inner joined
   * edges of a facing pair have no bleed, exactly as a printer would trim it.
   */
  bleed: Rect;
  pages: SpreadPageGeometry[];
}

function pageById(
  pages: readonly PublicationPage[],
  pageId: string,
): PublicationPage {
  const page = pages.find((candidate) => candidate.id === pageId);
  if (!page) {
    throw new RangeError(`Spread references an unknown page: ${pageId}`);
  }
  return page;
}

/**
 * Places a spread's pages in one coordinate space whose origin is the
 * top-left of the leftmost trim. Page geometry stays in its own space; only
 * the offsets are added here, so nothing about the document is rewritten.
 */
export function spreadGeometry(
  spread: Spread,
  pages: readonly PublicationPage[],
): SpreadGeometry {
  const resolved = spread.pageIds.map((pageId) => pageById(pages, pageId));

  let cursorX = 0;
  let maxHeight = 0;
  let topBleed = 0;
  let bottomBleed = 0;
  const placed: SpreadPageGeometry[] = resolved.map((page, index) => {
    const { trim } = page.spec;
    const side = pageSideInSpread(spread, index, {
      facingPages: spread.kind === "facing",
    });
    const offset = { x: cursorX, y: 0 };
    const trimRect: Rect = {
      x: offset.x,
      y: offset.y,
      width: trim.width,
      height: trim.height,
    };
    const bleed = bleedOf(page.spec);
    const safe = safeBox(page.spec, side);
    const margins = marginsForSide(page.spec, side);

    cursorX += trim.width + (index < resolved.length - 1 ? spread.gutter : 0);
    maxHeight = Math.max(maxHeight, trim.height);
    topBleed = Math.max(topBleed, bleed);
    bottomBleed = Math.max(bottomBleed, bleed);

    return {
      pageId: page.id,
      side,
      index,
      offset,
      trim: trimRect,
      bleed: {
        x: offset.x - bleed,
        y: offset.y - bleed,
        width: trim.width + bleed * 2,
        height: trim.height + bleed * 2,
      },
      safe: {
        x: offset.x + margins.left,
        y: offset.y + margins.top,
        width: safe.width,
        height: safe.height,
      },
    };
  });

  const trimWidth = Math.max(0, cursorX);
  const first = resolved[0];
  const last = resolved[resolved.length - 1];
  const leftBleed = first ? bleedOf(first.spec) : 0;
  const rightBleed = last ? bleedOf(last.spec) : 0;

  return {
    spreadId: spread.id,
    index: spread.index,
    kind: spread.kind,
    gutter: spread.gutter,
    trim: { x: 0, y: 0, width: trimWidth, height: maxHeight },
    bleed: {
      x: -leftBleed,
      y: -topBleed,
      width: trimWidth + leftBleed + rightBleed,
      height: maxHeight + topBleed + bottomBleed,
    },
    pages: placed,
  };
}

/** The trim width of a spread, given its page sizes and gutter. */
export function spreadTrimWidth(
  pages: readonly Pick<PublicationPage, "spec">[],
  gutter: number,
): number {
  return (
    pages.reduce((total, page) => total + page.spec.trim.width, 0) +
    Math.max(0, gutter) * Math.max(0, pages.length - 1)
  );
}
