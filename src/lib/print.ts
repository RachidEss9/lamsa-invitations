import {
  DESIGN_ASPECT,
  pageAspectOf,
  pageSizeOf,
  type DesignDocument,
  type DesignElement,
  type DesignFormat,
  type DesignPage,
} from "@/lib/design";
import { fontById, isKnownFontId } from "@/lib/fonts";

/**
 * Print preparation for the invitation canvas.
 *
 * The digital invitation and the printable card stay independent: nothing in
 * this module mutates the saved design. It only computes paper geometry and
 * composes a PDF from high-resolution captures of the real pages.
 */

export type PaperId =
  | "a3"
  | "a4"
  | "a5"
  | "a6"
  | "a7"
  | "letter"
  | "legal"
  | "5x7"
  | "4x6"
  | "custom";

export interface PaperSize {
  id: PaperId;
  name: string;
  widthMm: number;
  heightMm: number;
  note?: string;
}

export const PAPER_SIZES: PaperSize[] = [
  { id: "a3", name: "A3", widthMm: 297, heightMm: 420 },
  { id: "a4", name: "A4", widthMm: 210, heightMm: 297 },
  { id: "a5", name: "A5", widthMm: 148, heightMm: 210 },
  { id: "a6", name: "A6", widthMm: 105, heightMm: 148 },
  { id: "a7", name: "A7", widthMm: 74, heightMm: 105 },
  { id: "letter", name: "US Letter", widthMm: 215.9, heightMm: 279.4 },
  { id: "legal", name: "US Legal", widthMm: 215.9, heightMm: 355.6 },
  { id: "5x7", name: "5 × 7 in", widthMm: 127, heightMm: 177.8 },
  { id: "4x6", name: "4 × 6 in", widthMm: 101.6, heightMm: 152.4 },
  { id: "custom", name: "Custom", widthMm: 148, heightMm: 210 },
];

export type PrintUnit = "mm" | "cm" | "in";

export const MM_PER_UNIT: Record<PrintUnit, number> = { mm: 1, cm: 10, in: 25.4 };

export function toMm(value: number, unit: PrintUnit): number {
  return value * MM_PER_UNIT[unit];
}

export function fromMm(valueMm: number, unit: PrintUnit): number {
  return valueMm / MM_PER_UNIT[unit];
}

export function formatMeasurement(valueMm: number, unit: PrintUnit): string {
  const value = fromMm(valueMm, unit);
  const rounded = Math.abs(value % 1) < 0.01 ? value.toFixed(0) : value.toFixed(1);
  return `${rounded} ${unit}`;
}

export type FitMode = "fit" | "fill";

export interface PrintSettings {
  paper: PaperId;
  orientation: "portrait" | "landscape";
  customWidth: number;
  customHeight: number;
  unit: PrintUnit;
  margins: { top: number; right: number; bottom: number; left: number };
  bleed: number;
  cropMarks: boolean;
  fit: FitMode;
  includeBackground: boolean;
  dpi: 150 | 200 | 300;
  scope: "all" | "current" | "piece";
  guides: boolean;
  /** PNG only: keep the export's background transparent. JPEG has no alpha. */
  transparent?: boolean;
  /** Sheet imposition: the stock copies are tiled onto. */
  sheetPaper?: PaperId;
  /** Custom sheet size, in `unit`, used when `sheetPaper` is "custom". */
  sheetWidth?: number;
  sheetHeight?: number;
  /** Gap between copies, in millimetres. */
  sheetGapMm?: number;
  /** Turn each copy 90° to fit more on the sheet. */
  sheetRotate?: boolean;
  /** Copies to impose; 0 means as many as fit. */
  sheetCopies?: number;
}

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  paper: "a5",
  orientation: "portrait",
  customWidth: 148,
  customHeight: 210,
  unit: "mm",
  margins: { top: 6, right: 6, bottom: 6, left: 6 },
  bleed: 0,
  cropMarks: false,
  fit: "fit",
  includeBackground: true,
  dpi: 300,
  scope: "all",
  guides: true,
  transparent: false,
  sheetPaper: "a4",
  sheetWidth: 297,
  sheetHeight: 420,
  sheetGapMm: 3,
  sheetRotate: false,
  sheetCopies: 0,
};

export interface PageDimensions {
  widthMm: number;
  heightMm: number;
}

export function paperDimensions(settings: PrintSettings): PageDimensions {
  const base =
    PAPER_SIZES.find((paper) => paper.id === settings.paper) ?? PAPER_SIZES[2];
  const custom = settings.paper === "custom";
  const rawW = custom ? toMm(settings.customWidth, settings.unit) : base.widthMm;
  const rawH = custom ? toMm(settings.customHeight, settings.unit) : base.heightMm;
  const widthMm = Math.max(20, Math.min(2000, rawW));
  const heightMm = Math.max(20, Math.min(2000, rawH));
  return settings.orientation === "landscape"
    ? { widthMm: heightMm, heightMm: widthMm }
    : { widthMm, heightMm };
}

/**
 * A design's physical brief in millimetres. Pixel-sized canvases are measured
 * at the studio's fixed 96 px per inch, so even a screen-first document has a
 * sensible paper size when its host decides to print it.
 */
export function formatToMillimetres(format: DesignFormat) {
  const mmPerUnit =
    format.unit === "px" ? 25.4 / 96 : toMm(1, format.unit);
  return {
    widthMm: Math.max(20, format.width * mmPerUnit),
    heightMm: Math.max(20, format.height * mmPerUnit),
    bleedMm: Math.max(0, format.bleed * mmPerUnit),
  };
}

/** The actual PDF media size: the trim page plus any bleed band. */
export function outputDimensions(settings: PrintSettings): PageDimensions {
  const page = paperDimensions(settings);
  const bleed = Math.max(0, settings.bleed);
  return { widthMm: page.widthMm + bleed * 2, heightMm: page.heightMm + bleed * 2 };
}

/** The area inside the margins, in millimetres from the top-left. */
export interface PrintRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function printableArea(settings: PrintSettings): PrintRect {
  const page = paperDimensions(settings);
  const left = Math.max(0, settings.margins.left);
  const right = Math.max(0, settings.margins.right);
  const top = Math.max(0, settings.margins.top);
  const bottom = Math.max(0, settings.margins.bottom);
  const w = Math.max(10, page.widthMm - left - right);
  const h = Math.max(10, page.heightMm - top - bottom);
  return { x: Math.min(left, page.widthMm - 10), y: Math.min(top, page.heightMm - 10), w, h };
}

/**
 * Where the artwork lands inside the printable area. The aspect comes from the
 * page being printed, so a square, A5, or story-sized canvas is never forced
 * into the classic 3:4 card.
 */
export function artworkRect(
  settings: PrintSettings,
  aspect: number = DESIGN_ASPECT,
): PrintRect {
  const area = printableArea(settings);
  const artAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : DESIGN_ASPECT;
  const areaAspect = area.w / area.h;
  if (settings.fit === "fill") {
    if (areaAspect > artAspect) {
      const w = area.w;
      const h = w / artAspect;
      return { x: area.x, y: area.y + (area.h - h) / 2, w, h };
    }
    const h = area.h;
    const w = h * artAspect;
    return { x: area.x + (area.w - w) / 2, y: area.y, w, h };
  }
  if (areaAspect > artAspect) {
    const h = area.h;
    const w = h * artAspect;
    return { x: area.x + (area.w - w) / 2, y: area.y, w, h };
  }
  const w = area.w;
  const h = w / artAspect;
  return { x: area.x, y: area.y + (area.h - h) / 2, w, h };
}

/** The artwork rectangle for one specific saved page. */
export function pageArtworkRect(
  settings: PrintSettings,
  page: DesignPage | null | undefined,
): PrintRect {
  return artworkRect(settings, pageAspectOf(page));
}

/** Layers that sit outside the canvas will be cropped by any physical page. */
export function overflowElements(page: DesignPage) {
  const { width, height } = pageSizeOf(page);
  return page.elements.filter(
    (element) =>
      !element.hidden &&
      (element.x < -0.5 ||
        element.y < -0.5 ||
        element.x + element.w > width + 0.5 ||
        element.y + element.h > height + 0.5),
  );
}

/* -------------------------------------------------------------------------- */
/* Preflight                                                                  */
/* -------------------------------------------------------------------------- */

export type PreflightSeverity = "error" | "warning" | "info";

export interface PreflightIssue {
  /** Stable key, so repeated checks do not duplicate rows. */
  id: string;
  severity: PreflightSeverity;
  title: string;
  detail: string;
  elementId?: string;
}

/**
 * Measurements the browser can make but the document cannot: how wide an
 * uploaded image really is, and how tall a line of type wants to be. Both are
 * optional, so preflight still works without a mounted canvas.
 */
export interface PreflightMeasurements {
  /** Natural pixel width of each image element's loaded file. */
  imageWidths?: Record<string, number>;
  /** Wanted content height vs. the height the text box gave it, canvas units. */
  textHeights?: Record<string, { content: number; box: number }>;
  /** Font ids that are still not available after trying to load them. */
  unloadedFontIds?: string[];
}

export const MIN_PRINT_DPI = 150;

/**
 * The scale the capture must render at to land on the chosen DPI, clamped to
 * what the browser accepts — and the DPI that actually reaches the paper once
 * the clamp has had its say. Shown to the host so "300 DPI" is never a promise
 * the capture cannot keep.
 */
export function captureScaleFor(
  settings: PrintSettings,
  pageWidthPx: number,
  artWidthMm: number,
): number {
  const needed = ((artWidthMm / 25.4) * settings.dpi) / Math.max(1, pageWidthPx);
  if (!(needed > 0)) return 1;
  return Math.min(6, Math.max(0.5, needed));
}

export function actualDpiFor(
  settings: PrintSettings,
  pageWidthPx: number,
  artWidthMm: number,
): number {
  const needed = ((artWidthMm / 25.4) * settings.dpi) / Math.max(1, pageWidthPx);
  if (!(needed > 0)) return settings.dpi;
  return Math.round(
    (settings.dpi * captureScaleFor(settings, pageWidthPx, artWidthMm)) / needed,
  );
}

/** The sheet copies are imposed onto, in millimetres. */
export function sheetSizeFor(settings: PrintSettings): PageDimensions {
  if (settings.sheetPaper === "custom") {
    return {
      widthMm: Math.max(50, Math.min(2000, toMm(settings.sheetWidth ?? 297, settings.unit))),
      heightMm: Math.max(50, Math.min(2000, toMm(settings.sheetHeight ?? 420, settings.unit))),
    };
  }
  const base =
    PAPER_SIZES.find((paper) => paper.id === (settings.sheetPaper ?? "a4")) ??
    PAPER_SIZES[1];
  return { widthMm: base.widthMm, heightMm: base.heightMm };
}

function overlapBand(
  element: DesignElement,
  page: DesignPage,
): boolean {
  const margin = Math.max(0, page.margin ?? 0);
  if (margin <= 0) return false;
  const { width, height } = pageSizeOf(page);
  const insideSafe =
    element.x >= margin &&
    element.y >= margin &&
    element.x + element.w <= width - margin &&
    element.y + element.h <= height - margin;
  return !insideSafe;
}

/**
 * Everything that can go wrong when a screen design is put on paper, checked
 * against the real geometry the PDF will use. Nothing here blocks an export;
 * it tells the host exactly what will be cropped, clipped, or soft.
 */
export function preflightPage(
  page: DesignPage,
  settings: PrintSettings,
  measurements: PreflightMeasurements = {},
): PreflightIssue[] {
  const issues: PreflightIssue[] = [];
  const { width, height } = pageSizeOf(page);
  const art = pageArtworkRect(settings, page);

  for (const element of page.elements) {
    if (element.hidden) continue;

    const outside =
      element.x < -0.5 ||
      element.y < -0.5 ||
      element.x + element.w > width + 0.5 ||
      element.y + element.h > height + 0.5;
    if (outside) {
      issues.push({
        id: `overflow:${element.id}`,
        severity: "warning",
        title: `“${element.name}” sits outside the canvas`,
        detail:
          "Paper has no edges beyond the page, so this layer will be cropped in the PDF.",
        elementId: element.id,
      });
    }

    // A layer may deliberately bleed off the edge; that is not a safe-margin
    // problem, so only flag layers that stay on the page.
    if (!outside && overlapBand(element, page)) {
      issues.push({
        id: `margin:${element.id}`,
        severity: "info",
        title: `“${element.name}” is inside the safe margin`,
        detail: `This page keeps a ${Math.round(page.margin ?? 0)}-unit margin. Trim and guillotine drift can reach this layer.`,
        elementId: element.id,
      });
    }

    if (element.kind === "image") {
      if (!element.imageStorageId) {
        issues.push({
          id: `empty-image:${element.id}`,
          severity: "warning",
          title: `“${element.name}” has no image`,
          detail: "The placeholder frame will print empty. Replace it with a file before printing.",
          elementId: element.id,
        });
      } else {
        const naturalWidth = measurements.imageWidths?.[element.id];
        if (naturalWidth && naturalWidth > 0) {
          // The placed width is the layer's share of the canvas projected onto
          // the artwork rectangle, so DPI reflects the actual printed size.
          const placedMm = (element.w / width) * art.w;
          const dpi = naturalWidth / Math.max(0.01, placedMm / 25.4);
          if (dpi < MIN_PRINT_DPI) {
            issues.push({
              id: `dpi:${element.id}`,
              severity: dpi < 100 ? "error" : "warning",
              title: `“${element.name}” is ${Math.round(dpi)} DPI`,
              detail: `At ${Math.round(placedMm)} mm wide this file is below the ${MIN_PRINT_DPI} DPI floor and may look soft. Use a larger image or a smaller placement.`,
              elementId: element.id,
            });
          }
        }
      }
    }

    if (element.kind === "text") {
      const measured = measurements.textHeights?.[element.id];
      if (measured && measured.content > measured.box + 1) {
        issues.push({
          id: `clipped:${element.id}`,
          severity: "error",
          title: `“${element.name}” is clipped`,
          detail: `The text needs ${Math.round(measured.content)} units of height but the box gives it ${Math.round(measured.box)}. Increase the box height or reduce the type size.`,
          elementId: element.id,
        });
      }
      // The font id no longer resolves to a family in the kit: the renderer
      // silently substitutes the house face, which is worth saying out loud.
      if (element.font && !isKnownFontId(element.font)) {
        const substitute = fontById(element.font);
        issues.push({
          id: `font-missing:${element.id}`,
          severity: "warning",
          title: `“${element.name}” uses a font that is no longer available`,
          detail: `The saved family “${element.font}” is not in the library any more, so this layer renders in ${substitute.name}. Re-pick the family to be sure of the result.`,
          elementId: element.id,
        });
      }
      // The face could not be fetched in this browser (offline, blocked), so
      // the capture would show a substitute instead of the chosen family.
      if (element.font && measurements.unloadedFontIds?.includes(element.font)) {
        const font = fontById(element.font);
        issues.push({
          id: `font-unloaded:${element.id}`,
          severity: "warning",
          title: `“${font.name}” is not loaded in this browser`,
          detail: `“${element.name}” would export in a substitute face. Reopen the file with a connection so the family can load, then export again.`,
          elementId: element.id,
        });
      }
    }
  }

  // A page with nothing visible on it prints as blank paper — usually a
  // half-finished side, never something the host wants to pay to discover.
  if (!page.elements.some((element) => !element.hidden)) {
    issues.push({
      id: "empty-page",
      severity: "warning",
      title: `“${page.name}” has no visible content`,
      detail:
        "Every layer on this page is hidden or removed for print, so it will export as blank paper.",
    });
  }

  // The paper and the saved document brief can drift apart: the host may have
  // picked a different sheet in this dialog, which is allowed but worth saying.
  if (page.hidden) {
    issues.push({
      id: "hidden-page",
      severity: "info",
      title: "This page is hidden",
      detail: "Hidden pages are skipped by the guest run and by every export.",
    });
  }

  return issues;
}

/**
 * One summary for the whole document, so the dialog can show a single count
 * before the host opens each page.
 */
export function preflightDesign(
  design: DesignDocument,
  settings: PrintSettings,
  currentIndex: number,
  measurements: PreflightMeasurements = {},
): PreflightIssue[] {
  const pages = pagesForPrint(design, settings, currentIndex);
  const issues = pages.flatMap(({ page }) => {
    const found = preflightPage(page, settings, measurements);
    // The capture's clamp can leave the output below the resolution the host
    // picked; say so with the real number rather than the requested one.
    const art = pageArtworkRect(settings, page);
    const actual = actualDpiFor(settings, pageSizeOf(page).width, art.w);
    if (actual < settings.dpi * 0.95) {
      found.push({
        id: `dpi-cap:${page.id}`,
        severity: "warning",
        title: `“${page.name}” renders at about ${actual} DPI`,
        detail: `The selected ${settings.dpi} DPI needs more scale than this browser will capture in one step, so the real output is about ${actual} DPI at this size.`,
      });
    }
    return found;
  });

  const paper = paperDimensions(settings);
  const paperEdges = [paper.widthMm, paper.heightMm].sort((a, b) => a - b);

  // A design created from a physical brief should be printed at that size.
  // Orientation is ignored here because turning the sheet is intentional.
  if (design.format) {
    const brief = formatToMillimetres(design.format);
    const briefEdges = [brief.widthMm, brief.heightMm].sort((a, b) => a - b);
    const offBy = Math.max(
      Math.abs(paperEdges[0] - briefEdges[0]),
      Math.abs(paperEdges[1] - briefEdges[1]),
    );
    if (offBy > 2) {
      issues.push({
        id: "paper-format",
        severity: "info",
        title: "Paper differs from the design's own size",
        detail: `This invitation was set up at ${formatMeasurement(brief.widthMm, settings.unit)} × ${formatMeasurement(brief.heightMm, settings.unit)}; the sheet here is ${formatMeasurement(paper.widthMm, settings.unit)} × ${formatMeasurement(paper.heightMm, settings.unit)}. The artwork will be ${settings.fit === "fill" ? "cropped to fill" : "centred and fitted"}.`,
      });
    }
  }

  // Finishes are a screen preview. Saying so before the host pays for paper is
  // the honest thing to do, and it is only ever a note — never a block.
  if (
    design.pages.some(
      (page) =>
        page.material?.enabled ||
        page.elements.some((element) => element.material?.enabled),
    )
  ) {
    issues.push({
      id: "materials-preview",
      severity: "info",
      title: "Material finishes are not printed",
      detail:
        "Paper grain, foil, embossing and lace are visual previews of real finishes. This export uses the clean artwork, so order a foil or emboss treatment separately if you want it on paper.",
    });
  }

  // Fill always loses the edges that do not match the sheet's proportions.
  if (settings.fit === "fill") {
    const area = printableArea(settings);
    const sheetAspect = area.w / area.h;
    const mismatched = pages.some(
      ({ page }) =>
        Math.abs(pageAspectOf(page) - sheetAspect) / sheetAspect > 0.03,
    );
    if (mismatched) {
      issues.push({
        id: "fill-crop",
        severity: "info",
        title: "Fill crops the edges",
        detail:
          "The artwork proportions differ from the sheet, so Fill will trim one pair of edges. Choose Fit inside to keep the whole card visible.",
      });
    }
  }

  return issues;
}

/**
 * The static print representation of a page: covers are removed and the
 * content they hide is shown, because ink cannot be tapped.
 */
export function printablePage(page: DesignPage): DesignPage {
  const covers = new Set(
    page.elements.filter((element) => element.reveal).map((element) => element.id),
  );
  return {
    ...page,
    // A material finish is a screen simulation of paper, foil or relief — it
    // is not ink and it cannot be reproduced by a printer. Stripping it here
    // makes "exports print the clean artwork" a structural guarantee of the
    // print path rather than a promise the UI has to keep on its own.
    material: undefined,
    elements: page.elements
      .filter((element) => !covers.has(element.id))
      .map((element) =>
        element.material ? { ...element, material: undefined } : element,
      ),
  };
}

export function pagesForPrint(
  design: DesignDocument,
  settings: PrintSettings,
  currentIndex: number,
): { page: DesignPage; index: number }[] {
  const all = design.pages
    .map((page, index) => ({ page: printablePage(page), index }))
    .filter(({ page }) => !page.hidden);
  const list = all.length > 0 ? all : [{ page: printablePage(design.pages[0]), index: 0 }];
  if (settings.scope === "current") {
    return [list.find((item) => item.index === currentIndex) ?? list[0]];
  }
  if (settings.scope === "piece") {
    const suite = design.suite;
    const piece = suite?.pieces.find(
      (candidate) => candidate.id === suite.activePieceId,
    );
    // A design without a suite is a single piece: every page belongs to it.
    if (!piece) return list;
    const ids = new Set(piece.pageIds);
    const inPiece = list.filter((item) => ids.has(item.page.id));
    return inPiece.length > 0 ? inPiece : list;
  }
  return list;
}

/* -------------------------------------------------------------------------- */
/* PDF composition                                                            */
/* -------------------------------------------------------------------------- */

const mmToPt = (mm: number) => (mm / 25.4) * 72;

export interface PrintCapture {
  /** PNG data URL of the artwork, cropped to its placed rectangle. */
  image: string;
  /** The page background, kept for diagnostics; the PDF sheet stays white. */
  background: string;
  label: string;
  /** The rendered page's width ÷ height. Defaults to the classic card. */
  aspect?: number;
}

/**
 * Builds a real PDF: one page per invitation page, at the chosen paper size
 * and orientation, with the artwork placed, bleed, and optional crop marks.
 */
export async function buildPrintPdf(
  captures: PrintCapture[],
  settings: PrintSettings,
  title: string,
): Promise<Blob> {
  const { PDFDocument, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${title} — print`);
  pdf.setProducer("LAMSA studio");

  const page = paperDimensions(settings);
  const bleed = Math.max(0, settings.bleed);
  // With bleed the PDF page grows around the trim, and the artwork is extended
  // into that band so a guillotine trim never reveals a white edge.
  const totalW = page.widthMm + bleed * 2;
  const totalH = page.heightMm + bleed * 2;
  const pageW = mmToPt(totalW);
  const pageH = mmToPt(totalH);

  for (const capture of captures) {
    // Each page is placed with its own proportions: a mixed document (a
    // portrait card followed by a landscape insert) keeps both as designed.
    const art = artworkRect(settings, capture.aspect);
    const pdfPage = pdf.addPage([pageW, pageH]);
    // The sheet itself is white; the artwork (with its own page background)
    // sits inside the margins, exactly as the preview shows.
    pdfPage.drawRectangle({
      x: 0,
      y: 0,
      width: pageW,
      height: pageH,
      color: rgb(1, 1, 1),
    });

    if (capture.image) {
      const png = await pdf.embedPng(capture.image);
      pdfPage.drawImage(png, {
        x: mmToPt(art.x),
        y: pageH - mmToPt(art.y + art.h + bleed * 2),
        width: mmToPt(art.w + bleed * 2),
        height: mmToPt(art.h + bleed * 2),
      });
    }

    if (settings.cropMarks && bleed > 0) {
      const markMm = Math.min(4, Math.max(1.5, bleed * 0.7));
      const mark = mmToPt(markMm);
      const gap = mmToPt(0.6);
      const left = mmToPt(bleed);
      const right = pageW - mmToPt(bleed);
      const top = pageH - mmToPt(bleed);
      const bottom = mmToPt(bleed);
      const stroke = rgb(0, 0, 0);
      const corners: [number, number, number, number][] = [
        [left - gap - mark, top, left - gap, top],
        [left, top + gap + mark, left, top + gap],
        [right + gap, top, right + gap + mark, top],
        [right, top + gap, right, top + gap + mark],
        [left - gap - mark, bottom, left - gap, bottom],
        [left, bottom - gap - mark, left, bottom - gap],
        [right + gap, bottom, right + gap + mark, bottom],
        [right, bottom - gap - mark, right, bottom - gap],
      ];
      for (const [x1, y1, x2, y2] of corners) {
        pdfPage.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.5, color: stroke });
      }
    }
  }

  const bytes = await pdf.save();
  return new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
}

/* -------------------------------------------------------------------------- */
/* Duplicate-per-sheet layout                                                 */
/* -------------------------------------------------------------------------- */

/** One side of a piece, captured and ready to be tiled onto a sheet. */
export interface SheetCapture {
  image: string;
  label: string;
  /**
   * Where the artwork sits inside the copy's trim, in millimetres from the
   * trim's top-left — the same rectangle the single-page PDF uses, so a sheet
   * copy keeps its margins instead of being stretched to the card.
   */
  art?: { x: number; y: number; w: number; h: number };
}

/**
 * A sheet of identical copies: the imposition a stationer does before the
 * guillotine. Everything is measured in millimetres and centred on the sheet,
 * so a slightly larger stock never shifts the layout to a corner.
 */
export interface SheetLayout {
  sheet: PageDimensions;
  trim: PageDimensions;
  bleedMm: number;
  gapMm: number;
  /** Turn each copy 90° to fit more on the sheet. */
  rotate: boolean;
  columns: number;
  rows: number;
  /** Copies that fit on one sheet. */
  count: number;
  /** Top-left of the first copy's media box, bleed included. */
  origin: { x: number; y: number };
  /** False when one copy is already larger than the sheet itself. */
  fits: boolean;
}

export const SHEET_GAP_MM = 3;

export function sheetLayoutFor(options: {
  trim: PageDimensions;
  sheet: PageDimensions;
  bleedMm?: number;
  gapMm?: number;
  rotate?: boolean;
}): SheetLayout {
  const bleed = Math.max(0, options.bleedMm ?? 0);
  const gap = Math.max(0, options.gapMm ?? SHEET_GAP_MM);
  const rotate = Boolean(options.rotate);
  const mediaW = (rotate ? options.trim.heightMm : options.trim.widthMm) + bleed * 2;
  const mediaH = (rotate ? options.trim.widthMm : options.trim.heightMm) + bleed * 2;
  const cellW = mediaW + gap;
  const cellH = mediaH + gap;
  const columns = Math.max(1, Math.floor((options.sheet.widthMm + gap) / cellW));
  const rows = Math.max(1, Math.floor((options.sheet.heightMm + gap) / cellH));
  const usedW = Math.min(options.sheet.widthMm, columns * cellW - gap);
  const usedH = Math.min(options.sheet.heightMm, rows * cellH - gap);
  return {
    sheet: options.sheet,
    trim: options.trim,
    bleedMm: bleed,
    gapMm: gap,
    rotate,
    columns,
    rows,
    count: columns * rows,
    origin: {
      x: Math.max(0, (options.sheet.widthMm - usedW) / 2),
      y: Math.max(0, (options.sheet.heightMm - usedH) / 2),
    },
    // One copy bigger than the stock can never be imposed: the caller must be
    // told instead of silently shrinking or overlapping it.
    fits: mediaW <= options.sheet.widthMm && mediaH <= options.sheet.heightMm,
  };
}

/** The media box of one copy: trim plus its bleed band, in millimetres. */
export function sheetCellRect(
  layout: SheetLayout,
  index: number,
): { x: number; y: number; w: number; h: number } {
  const column = layout.columns > 0 ? index % layout.columns : 0;
  const row = layout.columns > 0 ? Math.floor(index / layout.columns) : 0;
  const w = (layout.rotate ? layout.trim.heightMm : layout.trim.widthMm) + layout.bleedMm * 2;
  const h = (layout.rotate ? layout.trim.widthMm : layout.trim.heightMm) + layout.bleedMm * 2;
  return {
    x: layout.origin.x + column * (w + layout.gapMm),
    y: layout.origin.y + row * (h + layout.gapMm),
    w,
    h,
  };
}

/** Crop-mark segments for a trim rectangle, in millimetres from its top-left. */
export function cropMarkSegments(
  rect: { x: number; y: number; w: number; h: number },
  markMm = 3,
  gapMm = 0.6,
): [number, number, number, number][] {
  const left = rect.x;
  const right = rect.x + rect.w;
  const top = rect.y;
  const bottom = rect.y + rect.h;
  return [
    [left - gapMm - markMm, top, left - gapMm, top],
    [left, top - gapMm - markMm, left, top - gapMm],
    [right + gapMm, top, right + gapMm + markMm, top],
    [right, top - gapMm - markMm, right, top - gapMm],
    [left - gapMm - markMm, bottom, left - gapMm, bottom],
    [left, bottom + gapMm, left, bottom + gapMm + markMm],
    [right + gapMm, bottom, right + gapMm + markMm, bottom],
    [right, bottom + gapMm, right, bottom + gapMm + markMm],
  ];
}

/**
 * One sheet per capture, each tiled with the number of copies that fit. This
 * is imposition only — the same RGB, rasterised output as the single-page PDF,
 * with no colour management, no vector type, and no bleed beyond the rendered
 * capture.
 */
export async function buildSheetPdf(
  captures: SheetCapture[],
  layout: SheetLayout,
  title: string,
  options: { cropMarks?: boolean; copies?: number } = {},
): Promise<Blob> {
  const { PDFDocument, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${title} — print sheet`);
  pdf.setProducer("LAMSA studio");

  const pageW = mmToPt(layout.sheet.widthMm);
  const pageH = mmToPt(layout.sheet.heightMm);
  const images = await Promise.all(captures.map((capture) => pdf.embedPng(capture.image)));

  for (let index = 0; index < captures.length; index += 1) {
    const sheet = pdf.addPage([pageW, pageH]);
    sheet.drawRectangle({ x: 0, y: 0, width: pageW, height: pageH, color: rgb(1, 1, 1) });
    const image = images[index];
    const capture = captures[index];
    // The host may want fewer copies than fit; never more.
    const total = Math.max(
      1,
      Math.min(
        layout.count,
        options.copies && options.copies > 0
          ? Math.floor(options.copies)
          : layout.count,
      ),
    );
    for (let copy = 0; copy < total; copy += 1) {
      const cell = sheetCellRect(layout, copy);
      const art = capture.art;
      if (art) {
        // Place the artwork at its own rectangle inside the trim and let it
        // reach into the bleed band, exactly like the single-page PDF.
        const bleed = layout.bleedMm;
        sheet.drawImage(image, {
          x: mmToPt(cell.x + bleed + art.x - bleed),
          y: pageH - mmToPt(cell.y + bleed + art.y - bleed + art.h + bleed * 2),
          width: mmToPt(art.w + bleed * 2),
          height: mmToPt(art.h + bleed * 2),
        });
      } else {
        sheet.drawImage(image, {
          x: mmToPt(cell.x),
          y: pageH - mmToPt(cell.y + cell.h),
          width: mmToPt(cell.w),
          height: mmToPt(cell.h),
        });
      }
      if (options.cropMarks && layout.bleedMm > 0) {
        const trim = {
          x: cell.x + layout.bleedMm,
          y: cell.y + layout.bleedMm,
          w: layout.trim.widthMm,
          h: layout.trim.heightMm,
        };
        const markMm = Math.min(4, Math.max(1.5, layout.bleedMm * 0.7));
        for (const [x1, y1, x2, y2] of cropMarkSegments(trim, markMm)) {
          sheet.drawLine({
            start: { x: mmToPt(x1), y: pageH - mmToPt(y1) },
            end: { x: mmToPt(x2), y: pageH - mmToPt(y2) },
            thickness: 0.5,
            color: rgb(0, 0, 0),
          });
        }
      }
    }
  }

  const bytes = await pdf.save();
  return new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function safeFilename(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06ff]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "lamsa-invitation"
  );
}
