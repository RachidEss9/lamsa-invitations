import { DESIGN_ASPECT, type DesignDocument, type DesignPage } from "@/lib/design";

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
  scope: "all" | "current";
  guides: boolean;
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

/** Where the 3:4 artwork lands inside the printable area. */
export function artworkRect(settings: PrintSettings): PrintRect {
  const area = printableArea(settings);
  const artAspect = DESIGN_ASPECT;
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

/** Layers that sit outside the canvas will be cropped by any physical page. */
export function overflowElements(page: DesignPage) {
  return page.elements.filter(
    (element) =>
      !element.hidden &&
      (element.x < -0.5 ||
        element.y < -0.5 ||
        element.x + element.w > 1000.5 ||
        element.y + element.h > 1333.5),
  );
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
    elements: page.elements.filter((element) => !covers.has(element.id)),
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
  return list;
}

/* -------------------------------------------------------------------------- */
/* PDF composition                                                            */
/* -------------------------------------------------------------------------- */

const mmToPt = (mm: number) => (mm / 25.4) * 72;

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const value = hex.trim();
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(value);
  if (short) {
    return {
      r: parseInt(short[1] + short[1], 16) / 255,
      g: parseInt(short[2] + short[2], 16) / 255,
      b: parseInt(short[3] + short[3], 16) / 255,
    };
  }
  const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value);
  if (!long) return null;
  return {
    r: parseInt(long[1], 16) / 255,
    g: parseInt(long[2], 16) / 255,
    b: parseInt(long[3], 16) / 255,
  };
}

export interface PrintCapture {
  /** PNG data URL of the artwork, cropped to its placed rectangle. */
  image: string;
  background: string;
  label: string;
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
  const art = artworkRect(settings);

  for (const capture of captures) {
    const pdfPage = pdf.addPage([pageW, pageH]);
    const paper = hexToRgb(capture.background) ?? { r: 1, g: 1, b: 1 };
    pdfPage.drawRectangle({
      x: 0,
      y: 0,
      width: pageW,
      height: pageH,
      color: rgb(paper.r, paper.g, paper.b),
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
