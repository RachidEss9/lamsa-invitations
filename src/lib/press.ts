import { resizePage, type DesignDocument, type DesignPage } from "./design";

/**
 * Press formats and spreads.
 *
 * A newspaper is read in spreads, not pages: the reader opens it and sees two
 * pages at once, with the cover standing alone. A magazine is the same idea on
 * smaller stock. This module holds the stock sizes the Press workspace offers,
 * pairs the pages into the spreads a reader actually sees, and can re-cut a
 * whole document onto a new stock without touching a single element's identity.
 */

export type PressFormatId = "broadsheet" | "tabloid" | "magazine" | "digest";

export interface PressFormat {
  id: PressFormatId;
  label: string;
  note: string;
  widthMm: number;
  heightMm: number;
  /** Editorial columns across the page, at this format's usual measure. */
  columns: number;
  /** Space between columns, in millimetres. */
  gutterMm: number;
}

export const PRESS_FORMATS: PressFormat[] = [
  {
    id: "broadsheet",
    label: "Broadsheet",
    note: "The full large-format paper — six columns and room for a masthead.",
    widthMm: 380,
    heightMm: 578,
    columns: 6,
    gutterMm: 5,
  },
  {
    id: "tabloid",
    label: "Tabloid",
    note: "Half the broadsheet, folded once — the compact daily.",
    widthMm: 279,
    heightMm: 432,
    columns: 4,
    gutterMm: 4,
  },
  {
    id: "magazine",
    label: "Magazine",
    note: "A4 stock, stitched, read as facing pages.",
    widthMm: 210,
    heightMm: 297,
    columns: 3,
    gutterMm: 4,
  },
  {
    id: "digest",
    label: "Digest",
    note: "A5, pocket-sized and saddle-stitched.",
    widthMm: 148,
    heightMm: 210,
    columns: 2,
    gutterMm: 3.5,
  },
];

export function pressFormat(id: PressFormatId): PressFormat {
  const found = PRESS_FORMATS.find((format) => format.id === id);
  if (!found) throw new Error(`Unknown press format: ${id}`);
  return found;
}

/** The studio works in CSS pixels at 96 per inch; presses think in millimetres. */
export const MM_TO_DESIGN_PX = 96 / 25.4;

export function pressCanvas(format: PressFormat): { width: number; height: number } {
  return {
    width: Math.round(format.widthMm * MM_TO_DESIGN_PX),
    height: Math.round(format.heightMm * MM_TO_DESIGN_PX),
  };
}

/** The measure of one column, in millimetres, inside the page's margins. */
export function columnMeasureMm(format: PressFormat, marginMm = 0): number {
  const usable = Math.max(0, format.widthMm - marginMm * 2);
  const gutters = format.gutterMm * Math.max(0, format.columns - 1);
  return Math.max(0, Math.round(((usable - gutters) / Math.max(1, format.columns)) * 10) / 10);
}

/** One spread is one opening: the pages a reader sees side by side. */
export interface Spread {
  index: number;
  left: DesignPage | null;
  right: DesignPage | null;
  /** The cover opens alone, on the right-hand page of its own spread. */
  cover: boolean;
}

/**
 * Pair pages the way a stitched book reads: the cover stands alone, then every
 * opening is two facing pages. An odd final page is kept, facing nothing, so a
 * document is never silently shortened.
 */
export function spreadPairs(pages: DesignPage[]): Spread[] {
  if (pages.length === 0) return [];
  const spreads: Spread[] = [{ index: 0, left: null, right: pages[0], cover: true }];
  for (let index = 1; index < pages.length; index += 2) {
    spreads.push({
      index: spreads.length,
      left: pages[index] ?? null,
      right: pages[index + 1] ?? null,
      cover: false,
    });
  }
  return spreads;
}

/** Sheets of paper a page count needs when every sheet carries two pages. */
export function sheetCount(pageCount: number): number {
  if (pageCount <= 1) return pageCount === 1 ? 1 : 0;
  return Math.ceil(pageCount / 2);
}

/**
 * Re-cut a document onto a press format.
 *
 * Pages are *fitted*, not stretched: a card designed at A6 and printed on
 * tabloid keeps its proportions and is centred on the sheet, which is what a
 * compositor does when work is reset for a larger page. Elements keep their
 * ids, so frames, clips and reveals still point at the same layers.
 */
export function applyPressFormat(
  design: DesignDocument,
  format: PressFormat,
  mode: "fit" | "scale" | "preserve" = "fit",
): DesignDocument {
  const size = pressCanvas(format);
  return {
    ...design,
    pages: design.pages.map((page) => resizePage(page, size, mode)),
  };
}

/** Whether every page already sits on this format's canvas. */
export function isOnFormat(design: DesignDocument, format: PressFormat): boolean {
  const size = pressCanvas(format);
  return design.pages.every(
    (page) =>
      Math.abs((page.width ?? 0) - size.width) <= 1 &&
      Math.abs((page.height ?? 0) - size.height) <= 1,
  );
}
