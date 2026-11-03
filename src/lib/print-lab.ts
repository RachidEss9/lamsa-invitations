import {
  PAPER_SIZES,
  SHEET_GAP_MM,
  sheetLayoutFor,
  type PageDimensions,
  type PaperId,
  type SheetLayout,
} from "./print";

/**
 * The planning maths behind the Print Lab.
 *
 * A press sheet is stock, a trim, and a bleed band around it. Everything here
 * is measured in millimetres and reasoned about before anything is exported,
 * so the workspace can tell the host how many copies a sheet holds and how much
 * paper the run wastes before a single sheet is cut.
 *
 * The imposition itself is `sheetLayoutFor` from `print.ts` — this module only
 * decides which turn is better and counts the run. No second layout engine.
 */

/** Stocks a sheet can actually be cut from, in the order the lab offers them. */
export const SHEET_STOCKS: { id: PaperId; label: string; note: string }[] = [
  { id: "a4", label: "A4", note: "The everyday office stock" },
  { id: "a3", label: "A3", note: "Two A4s side by side — the workhorse" },
  { id: "a5", label: "A5", note: "Half of A4, good for small cards" },
  { id: "letter", label: "US Letter", note: "8.5 × 11 in" },
  { id: "legal", label: "US Legal", note: "8.5 × 14 in" },
];

export function sheetDimensions(paper: PaperId): PageDimensions {
  const size = PAPER_SIZES.find((item) => item.id === paper) ?? PAPER_SIZES[1];
  return { widthMm: size.widthMm, heightMm: size.heightMm };
}

export function sheetStockLabel(paper: PaperId): string {
  return PAPER_SIZES.find((item) => item.id === paper)?.name ?? "Custom";
}

export interface ImpositionOptions {
  bleedMm?: number;
  gapMm?: number;
}

export interface Imposition {
  /** The winning turn. */
  rotate: boolean;
  layout: SheetLayout;
  /** The turn that was rejected, kept so the lab can show both counts. */
  other: SheetLayout;
}

/**
 * The turn that fits the most copies on the stock. Ties stay upright: turning
 * a copy is a decision the host can always make by hand, but it should never
 * win a tie just because it was evaluated second.
 */
export function bestImposition(
  trim: PageDimensions,
  sheet: PageDimensions,
  options: ImpositionOptions = {},
): Imposition {
  const bleedMm = Math.max(0, options.bleedMm ?? 0);
  const gapMm = Math.max(0, options.gapMm ?? SHEET_GAP_MM);
  const upright = sheetLayoutFor({ trim, sheet, bleedMm, gapMm, rotate: false });
  const turned = sheetLayoutFor({ trim, sheet, bleedMm, gapMm, rotate: true });
  const rotate = turned.count > upright.count && turned.fits;
  return rotate
    ? { rotate: true, layout: turned, other: upright }
    : { rotate: false, layout: upright, other: turned };
}

/** One copy's media box: the trim plus its bleed band, in millimetres. */
export function copyAreaMm2(layout: SheetLayout): number {
  const mediaW = (layout.rotate ? layout.trim.heightMm : layout.trim.widthMm) + layout.bleedMm * 2;
  const mediaH = (layout.rotate ? layout.trim.widthMm : layout.trim.heightMm) + layout.bleedMm * 2;
  return mediaW * mediaH;
}

/** The share of the stock the imposed copies do not cover, from 0 to 1. */
export function sheetWaste(layout: SheetLayout): number {
  if (!layout.fits) return 1;
  const sheetArea = layout.sheet.widthMm * layout.sheet.heightMm;
  if (sheetArea <= 0) return 1;
  const used = layout.count * copyAreaMm2(layout);
  return Math.max(0, Math.min(1, 1 - used / sheetArea));
}

/** Whole sheets a quantity needs, plus the copies on the last, short sheet. */
export function runFor(copiesPerSheet: number, quantity: number): {
  sheets: number;
  remainder: number;
} {
  const perSheet = Math.max(0, Math.floor(copiesPerSheet));
  const wanted = Math.max(0, Math.floor(quantity));
  if (perSheet === 0) return { sheets: 0, remainder: wanted };
  const sheets = Math.ceil(wanted / perSheet);
  return { sheets, remainder: wanted % perSheet };
}

/**
 * The whole decision for one piece: which turn wins, how many copies land on a
 * sheet, and what a run of `quantity` costs in paper.
 */
export interface PiecePlan {
  trim: PageDimensions;
  sheet: PageDimensions;
  bleedMm: number;
  gapMm: number;
  imposition: Imposition;
  copies: number;
  waste: number;
  quantity: number;
  sheets: number;
  remainder: number;
}

export function planPiece(options: {
  trim: PageDimensions;
  paper: PaperId;
  bleedMm?: number;
  gapMm?: number;
  quantity?: number;
}): PiecePlan {
  const sheet = sheetDimensions(options.paper);
  const bleedMm = Math.max(0, options.bleedMm ?? 0);
  const gapMm = Math.max(0, options.gapMm ?? SHEET_GAP_MM);
  const imposition = bestImposition(options.trim, sheet, { bleedMm, gapMm });
  const quantity = Math.max(1, Math.floor(options.quantity ?? 1));
  const run = runFor(imposition.layout.count, quantity);
  return {
    trim: options.trim,
    sheet,
    bleedMm,
    gapMm,
    imposition,
    copies: imposition.layout.count,
    waste: sheetWaste(imposition.layout),
    quantity,
    sheets: run.sheets,
    remainder: run.remainder,
  };
}
