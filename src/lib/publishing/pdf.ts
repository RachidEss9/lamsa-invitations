/**
 * Publication PDF export.
 *
 * This is a vector writer, not a screenshot: shapes and lines stay vector, text
 * is drawn with an embedded PDF font, and photographs are placed at their
 * original resolution with the document's crop applied. `pdf-lib` ships the
 * standard Latin fonts only, so a frame containing non-WinAnsi text (Arabic,
 * for example) is handed to an optional browser rasteriser instead. That keeps
 * the text visible without pretending it is selectable; callers must pass the
 * callback to avoid the historical behaviour of skipping the frame and only
 * reporting it afterwards.
 *
 * Coordinates: the document is top-left origin, y down; PDF is bottom-left,
 * y up. Every draw call converts through `toPdfBox` once, so geometry can be
 * tested without a canvas.
 */

import {
  PDFDocument,
  StandardFonts,
  clip,
  closePath,
  degrees,
  endPath,
  lineTo,
  moveTo,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  type RGB,
} from "pdf-lib";

import type {
  ImageFrameObject,
  MasterPage,
  ObjectFrame,
  PublicationDocument,
  PublicationObject,
  PublicationPage,
  ShapeObject,
  TextFrameObject,
} from "./model";
import { bleedBox, safeBox, trimBox } from "./geometry";
import { frameBounds } from "./object-transform";
import { masterForPage, masterObjectsForPage } from "./masters";
import { resolveCharacter, resolveParagraph } from "./typography";

export type ExportProfileId = "digital" | "print" | "print-bleed" | "custom";

export interface ExportSettings {
  profile: ExportProfileId;
  /** Page ids in export order; empty means the whole publication. */
  pageIds: readonly string[];
  includeBleed: boolean;
  cropMarks: boolean;
  includeMasters: boolean;
  imageQuality: "original" | "proxy";
}

export const EXPORT_PROFILES: readonly {
  id: ExportProfileId;
  name: string;
  description: string;
  settings: Omit<ExportSettings, "profile" | "pageIds">;
}[] = [
  {
    id: "digital",
    name: "Digital PDF",
    description:
      "Screen delivery: trim size, no bleed, no crop marks, original images.",
    settings: {
      includeBleed: false,
      cropMarks: false,
      includeMasters: true,
      imageQuality: "original",
    },
  },
  {
    id: "print",
    name: "Print PDF",
    description:
      "Pages at trim with masters, original images and no marks.",
    settings: {
      includeBleed: false,
      cropMarks: false,
      includeMasters: true,
      imageQuality: "original",
    },
  },
  {
    id: "print-bleed",
    name: "Print PDF with bleed and marks",
    description:
      "Media grows by the page's bleed and crop marks are drawn outside the trim.",
    settings: {
      includeBleed: true,
      cropMarks: true,
      includeMasters: true,
      imageQuality: "original",
    },
  },
  {
    id: "custom",
    name: "Custom",
    description: "Choose bleed, marks, master content and image quality.",
    settings: {
      includeBleed: false,
      cropMarks: false,
      includeMasters: true,
      imageQuality: "original",
    },
  },
];

export function defaultExportSettings(
  profile: ExportProfileId = "print",
  pageIds: readonly string[] = [],
): ExportSettings {
  const preset =
    EXPORT_PROFILES.find((entry) => entry.id === profile) ?? EXPORT_PROFILES[1]!;
  return { profile, pageIds, ...preset.settings };
}

export interface ExportAsset {
  /** Raw bytes of the file to embed. */
  bytes: Uint8Array;
  mime: string;
}

export interface ExportOptions {
  settings: ExportSettings;
  /** Resolves an asset id to its file; null means "not available". */
  loadAsset: (assetId: string) => Promise<ExportAsset | null>;
  /**
   * Browser-only: renders a frame containing non-Latin text to a transparent
   * PNG at the frame's size. Without it those frames are skipped and reported.
   */
  rasterTextFrame?: (object: TextFrameObject) => Promise<Uint8Array | null>;
}

export interface ExportPageInfo {
  pageId: string;
  title: string;
  widthPt: number;
  heightPt: number;
}

export interface ExportResult {
  blob: Blob;
  bytes: Uint8Array;
  pages: ExportPageInfo[];
  /** Text frames whose runs could not be encoded, by page id. */
  skippedTextFrames: string[];
  /** Non-Latin frames embedded as images rather than selectable text. */
  rasterizedTextFrames: string[];
  /** Photographs that could not be embedded (missing file/unsupported type). */
  missingImages: string[];
  warnings: string[];
  stats: {
    shapes: number;
    images: number;
    textFrames: number;
    rasterTextFrames: number;
    lines: number;
  };
}

const POINTS_PER_INCH = 72;

/* ------------------------------------------------------------------ colours */

export function parseCssColor(value: string | undefined): RGB {
  const fallback = rgb(0, 0, 0);
  if (!value) return fallback;
  const text = value.trim().toLowerCase();
  if (text === "transparent") return rgb(1, 1, 1);
  if (text === "white") return rgb(1, 1, 1);
  if (text === "black") return fallback;
  const hex = /^#([0-9a-f]{3,8})$/.exec(text);
  if (hex) {
    const digits = hex[1]!;
    const expand = (part: string) => parseInt(part.length === 1 ? part + part : part, 16) / 255;
    if (digits.length === 3 || digits.length === 4) {
      return rgb(expand(digits[0]!), expand(digits[1]!), expand(digits[2]!));
    }
    if (digits.length === 6 || digits.length === 8) {
      return rgb(
        expand(digits.slice(0, 2)),
        expand(digits.slice(2, 4)),
        expand(digits.slice(4, 6)),
      );
    }
  }
  const fn = /^rgba?\(([^)]+)\)$/.exec(text);
  if (fn) {
    const parts = fn[1]!.split(",").map((part) => Number.parseFloat(part.trim()));
    if (parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite)) {
      return rgb(parts[0]! / 255, parts[1]! / 255, parts[2]! / 255);
    }
  }
  return fallback;
}

/* --------------------------------------------------------------- geometry */

export interface PdfBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Converts a top-left box to PDF's bottom-left page space. */
export function toPdfBox(frame: ObjectFrame, pageHeight: number, dy = 0): PdfBox {
  return {
    x: frame.x,
    y: pageHeight - (frame.y + frame.height) + dy,
    width: frame.width,
    height: frame.height,
  };
}

/** Rotated draw origin so the frame turns about its centre, not its corner. */
export function rotatedOrigin(
  frame: ObjectFrame,
  pageHeight: number,
): { x: number; y: number } {
  const box = toPdfBox(frame, pageHeight);
  if (!frame.rotation) return { x: box.x, y: box.y };
  const angle = (frame.rotation * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  return {
    x: cx - (box.width / 2) * cos + (box.height / 2) * sin,
    y: cy - (box.width / 2) * sin - (box.height / 2) * cos,
  };
}

/** Crop marks in PDF space, outside the trim and inside the media box. */
export function cropMarkSegments(
  media: { width: number; height: number },
  trim: PdfBox,
  mark = 12,
  gap = 4,
): [number, number, number, number][] {
  const left = trim.x;
  const right = trim.x + trim.width;
  const top = trim.y;
  const bottom = trim.y + trim.height;
  const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value));
  return [
    [clamp(left - gap - mark, media.width), top, clamp(left - gap, media.width), top],
    [left, clamp(top + gap + mark, media.height), left, clamp(top + gap, media.height)],
    [clamp(right + gap, media.width), top, clamp(right + gap + mark, media.width), top],
    [right, clamp(top + gap + mark, media.height), right, clamp(top + gap, media.height)],
    [clamp(left - gap - mark, media.width), bottom, clamp(left - gap, media.width), bottom],
    [left, clamp(bottom - gap - mark, media.height), left, clamp(bottom - gap, media.height)],
    [clamp(right + gap, media.width), bottom, clamp(right + gap + mark, media.width), bottom],
    [right, clamp(bottom - gap - mark, media.height), right, clamp(bottom - gap, media.height)],
  ];
}

/* ------------------------------------------------------------------- text */

const LATIN_FONT_IDS = ["helvetica", "times", "courier"];

function standardFontFor(
  fontId: string | undefined,
  weight: number | undefined,
  style: "normal" | "italic" | undefined,
): StandardFonts {
  const id = (fontId ?? "").toLowerCase();
  const serif = /serif|playfair|amiri|naskh|lateef|markazi|scheherazade|libre|cormorant|dm-|lora|merriweather|garamond/.test(id);
  const mono = /mono|courier|code/.test(id);
  const bold = (weight ?? 400) >= 600;
  if (mono) {
    return bold && style === "italic"
      ? StandardFonts.CourierBoldOblique
      : bold
        ? StandardFonts.CourierBold
        : style === "italic"
          ? StandardFonts.CourierOblique
          : StandardFonts.Courier;
  }
  if (serif) {
    return bold && style === "italic"
      ? StandardFonts.TimesRomanBoldItalic
      : bold
        ? StandardFonts.TimesRomanBold
        : style === "italic"
          ? StandardFonts.TimesRomanItalic
          : StandardFonts.TimesRoman;
  }
  return bold && style === "italic"
    ? StandardFonts.HelveticaBoldOblique
    : bold
      ? StandardFonts.HelveticaBold
      : style === "italic"
        ? StandardFonts.HelveticaOblique
        : StandardFonts.Helvetica;
}

/** True when every character can be written with a standard WinAnsi font. */
export function encodable(text: string): boolean {
  for (const character of text) {
    const code = character.codePointAt(0) ?? 0;
    if (code === 9 || code === 10 || code === 13) continue;
    if (code < 32) return false;
    if (code > 255) return false;
  }
  return true;
}

/** True when a frame contains text the standard PDF fonts cannot encode. */
export function textFrameNeedsRaster(
  document: PublicationDocument,
  object: TextFrameObject,
): boolean {
  const story = object.storyId
    ? document.stories.find((entry) => entry.id === object.storyId)
    : undefined;
  if (!story) return false;
  return story.paragraphs.some((paragraph) =>
    paragraph.runs.some((run) => !encodable(run.text)),
  );
}

export function isLatinFont(fontId: string | undefined): boolean {
  const id = (fontId ?? "").toLowerCase();
  return !id || LATIN_FONT_IDS.some((name) => id.includes(name));
}

function fontFor(
  fonts: Map<StandardFonts, PDFFont>,
  standard: StandardFonts,
): PDFFont {
  const existing = fonts.get(standard);
  if (existing) return existing;
  throw new Error("PDF font was not embedded");
}

function wrapLine(
  text: string,
  font: PDFFont,
  size: number,
  width: number,
): string[] {
  if (font.widthOfTextAtSize(text, size) <= width) return [text];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/* ------------------------------------------------------------- composition */

interface Context {
  document: PublicationDocument;
  settings: ExportSettings;
  fonts: Map<StandardFonts, PDFFont>;
  pdf: PDFDocument;
  images: Map<string, PDFImage | null>;
  loadAsset: (assetId: string) => Promise<ExportAsset | null>;
  skippedTextFrames: string[];
  rasterizedTextFrames: string[];
  rasterTextFrame?: (object: TextFrameObject) => Promise<Uint8Array | null>;
  missingImages: string[];
  warnings: Set<string>;
  stats: {
    shapes: number;
    images: number;
    textFrames: number;
    rasterTextFrames: number;
    lines: number;
  };
}

function clipToFrame(page: PDFPage, box: PdfBox): void {
  page.pushOperators(
    pushGraphicsState(),
    moveTo(box.x, box.y),
    lineTo(box.x + box.width, box.y),
    lineTo(box.x + box.width, box.y + box.height),
    lineTo(box.x, box.y + box.height),
    closePath(),
    clip(),
    endPath(),
  );
}

async function embedImage(
  context: Context,
  assetId: string,
): Promise<PDFImage | null> {
  const cached = context.images.get(assetId);
  if (cached !== undefined) return cached;
  const asset = await context.loadAsset(assetId);
  if (!asset) {
    context.images.set(assetId, null);
    return null;
  }
  let image: PDFImage | null = null;
  try {
    if (/jpe?g/i.test(asset.mime)) {
      image = await context.pdf.embedJpg(asset.bytes);
    } else if (/png/i.test(asset.mime)) {
      image = await context.pdf.embedPng(asset.bytes);
    } else {
      try {
        image = await context.pdf.embedPng(asset.bytes);
      } catch {
        image = await context.pdf.embedJpg(asset.bytes);
      }
    }
  } catch {
    context.missingImages.push(assetId);
    context.warnings.add(
      "A photograph could not be embedded (unsupported file or corrupted bytes).",
    );
    image = null;
  }
  context.images.set(assetId, image);
  return image;
}

async function drawImageFrame(
  context: Context,
  page: PDFPage,
  object: ImageFrameObject,
  pageHeight: number,
): Promise<void> {
  if (!object.assetId) return;
  const image = await embedImage(context, object.assetId);
  if (!image) {
    if (!context.missingImages.includes(object.assetId)) {
      context.missingImages.push(object.assetId);
    }
    context.warnings.add(
      "A photograph's file could not be loaded, so that frame is blank in the PDF.",
    );
    return;
  }
  const bounds = frameBounds(object.frame);
  const box = toPdfBox(
    { ...object.frame, x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
    pageHeight,
  );
  const iw = image.width;
  const ih = image.height;
  if (!(iw > 0) || !(ih > 0)) return;

  const scaleX = box.width / iw;
  const scaleY = box.height / ih;
  let drawnW = box.width;
  let drawnH = box.height;
  if (object.fit === "fill") {
    const cover = Math.max(scaleX, scaleY);
    drawnW = iw * cover;
    drawnH = ih * cover;
  } else if (object.fit === "fit") {
    const contain = Math.min(scaleX, scaleY);
    drawnW = iw * contain;
    drawnH = ih * contain;
  }
  const zoom = Math.max(0.01, object.crop.scale || 1);
  drawnW *= zoom;
  drawnH *= zoom;
  const normalized = object.crop.normalized !== false;
  const offsetX = normalized ? object.crop.offsetX * box.width : object.crop.offsetX;
  const offsetY = normalized ? object.crop.offsetY * box.height : object.crop.offsetY;
  const x = box.x + (box.width - drawnW) / 2 - offsetX;
  const y = box.y + (box.height - drawnH) / 2 + offsetY;

  const rotation = object.frame.rotation;
  const origin = rotatedOrigin(
    { ...object.frame, x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
    pageHeight,
  );
  clipToFrame(page, box);
  page.drawImage(image, {
    x: rotation ? origin.x + (box.width - drawnW) / 2 - offsetX : x,
    y: rotation ? origin.y + (box.height - drawnH) / 2 + offsetY : y,
    width: drawnW,
    height: drawnH,
    opacity: object.opacity,
    ...(rotation ? { rotate: degrees(-rotation) } : {}),
  });
  page.pushOperators(popGraphicsState());
  context.stats.images += 1;
}

function drawShape(
  context: Context,
  page: PDFPage,
  object: ShapeObject,
  pageHeight: number,
): void {
  const box = toPdfBox(object.frame, pageHeight);
  const origin = rotatedOrigin(object.frame, pageHeight);
  const color = parseCssColor(object.fill);
  const stroke = object.stroke ? parseCssColor(object.stroke) : undefined;
  const common = {
    x: origin.x,
    y: origin.y,
    width: box.width,
    height: box.height,
    opacity: object.opacity,
    ...(object.frame.rotation ? { rotate: degrees(-object.frame.rotation) } : {}),
  };
  if (object.shape === "ellipse") {
    page.drawEllipse({
      x: origin.x + box.width / 2,
      y: origin.y + box.height / 2,
      xScale: box.width / 2,
      yScale: box.height / 2,
      color,
      opacity: object.opacity,
      ...(stroke ? { borderColor: stroke, borderWidth: object.strokeWidth } : {}),
      ...(object.frame.rotation ? { rotate: degrees(-object.frame.rotation) } : {}),
    });
  } else if (object.shape === "path" && object.path) {
    page.drawSvgPath(object.path, {
      x: origin.x,
      y: origin.y + box.height,
      color,
      opacity: object.opacity,
      borderColor: stroke,
      borderWidth: object.strokeWidth,
      ...(object.frame.rotation ? { rotate: degrees(-object.frame.rotation) } : {}),
    });
  } else if (object.shape === "polygon" && (object.sides ?? 0) >= 3) {
    // Polygon support is a real vector path, not a bitmap.
    const sides = object.sides ?? 3;
    const cx = origin.x + box.width / 2;
    const cy = origin.y + box.height / 2;
    const points: string[] = [];
    for (let index = 0; index < sides; index += 1) {
      const angle = (index / sides) * Math.PI * 2 - Math.PI / 2;
      const px = cx + Math.cos(angle) * (box.width / 2);
      const py = cy + Math.sin(angle) * (box.height / 2);
      points.push(`${index === 0 ? "M" : "L"} ${px} ${py}`);
    }
    page.drawSvgPath(`${points.join(" ")} Z`, {
      x: 0,
      y: 0,
      color,
      opacity: object.opacity,
      borderColor: stroke,
      borderWidth: object.strokeWidth,
    });
  } else {
    page.drawRectangle({
      ...common,
      color,
      opacity: object.opacity,
      ...(stroke ? { borderColor: stroke, borderWidth: object.strokeWidth } : {}),
    });
  }
  context.stats.shapes += 1;
}

function drawLineObject(
  context: Context,
  page: PDFPage,
  object: PublicationObject,
  pageHeight: number,
): void {
  if (object.kind !== "line") return;
  const frame = object.frame;
  const startX = frame.x;
  const startY = pageHeight - frame.y;
  const endX = frame.x + frame.width;
  const endY = pageHeight - (frame.y + frame.height);
  page.drawLine({
    start: { x: startX, y: startY },
    end: { x: endX, y: endY },
    thickness: object.strokeWidth,
    color: parseCssColor(object.stroke),
    opacity: object.opacity,
    ...(object.dash ? { dashArray: object.dash } : {}),
  });
  context.stats.lines += 1;
}

async function drawRasterizedText(
  context: Context,
  page: PDFPage,
  object: TextFrameObject,
  png: Uint8Array,
  pageHeight: number,
): Promise<void> {
  const image = await context.pdf.embedPng(png);
  const width = object.frame.width;
  const height = object.frame.height;
  const rotation = object.frame.rotation ?? 0;
  const radians = (-rotation * Math.PI) / 180;
  const centerX = object.frame.x + width / 2;
  const centerY = pageHeight - object.frame.y - height / 2;
  // pdf-lib rotates around the image's bottom-left corner; shift the origin so
  // the visible result rotates around the frame's centre like the editor.
  const x =
    centerX - (width / 2) * Math.cos(radians) + (height / 2) * Math.sin(radians);
  const y =
    centerY - (width / 2) * Math.sin(radians) - (height / 2) * Math.cos(radians);
  page.drawImage(image, {
    x,
    y,
    width,
    height,
    opacity: object.opacity,
    ...(rotation ? { rotate: degrees(-rotation) } : {}),
  });
  context.stats.textFrames += 1;
  context.stats.rasterTextFrames += 1;
  context.rasterizedTextFrames.push(object.id);
  context.warnings.add(
    "Arabic and other non-Latin text was rendered as a high-resolution image to preserve its appearance; those text frames are not selectable in the PDF.",
  );
}

async function drawTextFrame(
  context: Context,
  page: PDFPage,
  object: TextFrameObject,
  pageHeight: number,
): Promise<void> {
  const story = object.storyId
    ? context.document.stories.find((entry) => entry.id === object.storyId)
    : undefined;
  if (!story) return;
  if (textFrameNeedsRaster(context.document, object) && context.rasterTextFrame) {
    const png = await context.rasterTextFrame(object);
    if (png) {
      await drawRasterizedText(context, page, object, png, pageHeight);
      return;
    }
    context.warnings.add(
      "A text frame containing Arabic or another non-Latin script could not be rendered as an image; its non-Latin runs are missing from this export.",
    );
  }
  const box = toPdfBox(object.frame, pageHeight);
  const origin = rotatedOrigin(object.frame, pageHeight);
  const rotation = object.frame.rotation;

  let cursor = origin.y + box.height - object.inset.top;
  const maxWidth = Math.max(1, box.width - object.inset.left - object.inset.right);
  let drew = false;

  for (const paragraph of story.paragraphs) {
    const paragraphStyle = resolveParagraph(context.document, paragraph);
    const alignment = paragraphStyle.alignment;
    for (const run of paragraph.runs) {
      if (!encodable(run.text)) {
        context.skippedTextFrames.push(object.id);
        context.warnings.add(
          "Text containing non-Latin characters (Arabic, for example) cannot be embedded with the built-in PDF fonts; those frames are left blank rather than substituted.",
        );
        continue;
      }
      const character = resolveCharacter(context.document, paragraph, run);
      const standard = standardFontFor(
        character.fontId,
        character.fontWeight,
        character.fontStyle,
      );
      const font = fontFor(context.fonts, standard);
      const size = character.size;
      const leading = character.leading;
      const lines = run.text.split("\n");
      for (const line of lines) {
        for (const piece of wrapLine(line, font, size, maxWidth)) {
          const width = font.widthOfTextAtSize(piece, size);
          const x =
            alignment === "center"
              ? origin.x + object.inset.left + (maxWidth - width) / 2
              : alignment === "right"
                ? origin.x + object.inset.left + maxWidth - width
                : origin.x + object.inset.left;
          page.drawText(piece, {
            x,
            y: cursor,
            size,
            font,
            color: parseCssColor(character.color),
            opacity: character.opacity * object.opacity,
            ...(rotation ? { rotate: degrees(-rotation) } : {}),
          });
          cursor -= leading;
          drew = true;
          context.stats.lines += 1;
        }
      }
    }
    cursor -= paragraphStyle.spaceAfter ?? 0;
  }
  if (drew) context.stats.textFrames += 1;
}

async function drawObject(
  context: Context,
  page: PDFPage,
  object: PublicationObject,
  pageHeight: number,
): Promise<void> {  if (object.hidden) return;
  if (!(object.frame.width > 0) || !(object.frame.height > 0)) return;
  if (object.kind === "image-frame") {
    await drawImageFrame(context, page, object, pageHeight);
  } else if (object.kind === "shape") {
    drawShape(context, page, object, pageHeight);
  } else if (object.kind === "line") {
    drawLineObject(context, page, object, pageHeight);
  } else if (object.kind === "text-frame") {
    await drawTextFrame(context, page, object, pageHeight);
  }
}

function drawBackground(
  context: Context,
  page: PDFPage,
  box: { x: number; y: number; width: number; height: number },
  background: { color: string; assetId?: string },
): void {
  page.drawRectangle({
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    color: parseColorOrWhite(background.color),
  });
}

function parseColorOrWhite(value: string | undefined): RGB {
  if (!value) return rgb(1, 1, 1);
  return parseCssColor(value);
}

/** Media size in points for one page under the chosen settings. */
export function exportPageSize(
  page: PublicationPage,
  settings: Pick<ExportSettings, "includeBleed">,
): { width: number; height: number; bleed: number } {
  const trim = trimBox(page.spec);
  const bleed = settings.includeBleed ? Math.max(0, page.spec.bleed) : 0;
  return {
    width: trim.width + bleed * 2,
    height: trim.height + bleed * 2,
    bleed,
  };
}

export async function exportPublicationPdf(
  document: PublicationDocument,
  options: ExportOptions,
): Promise<ExportResult> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(document.title);
  pdf.setProducer("LAMSA Publishing Studio");
  pdf.setCreator("LAMSA Publishing Studio");
  pdf.setSubject(`Publication ${document.id}`);

  const fonts = new Map<StandardFonts, PDFFont>();
  for (const standard of new Set([
    StandardFonts.Helvetica,
    StandardFonts.HelveticaBold,
    StandardFonts.HelveticaOblique,
    StandardFonts.HelveticaBoldOblique,
    StandardFonts.TimesRoman,
    StandardFonts.TimesRomanBold,
    StandardFonts.TimesRomanItalic,
    StandardFonts.TimesRomanBoldItalic,
    StandardFonts.Courier,
    StandardFonts.CourierBold,
    StandardFonts.CourierOblique,
    StandardFonts.CourierBoldOblique,
  ])) {
    fonts.set(standard, await pdf.embedFont(standard));
  }

  const context: Context = {
    document,
    settings: options.settings,
    fonts,
    pdf,
    images: new Map(),
    loadAsset: options.loadAsset,
    skippedTextFrames: [],
    rasterizedTextFrames: [],
    ...(options.rasterTextFrame ? { rasterTextFrame: options.rasterTextFrame } : {}),
    missingImages: [],
    warnings: new Set(),
    stats: { shapes: 0, images: 0, textFrames: 0, rasterTextFrames: 0, lines: 0 },
  };

  const wanted =
    options.settings.pageIds.length > 0
      ? new Set(options.settings.pageIds)
      : null;
  const pages = document.pages.filter((page) => !wanted || wanted.has(page.id));
  const exported: ExportPageInfo[] = [];

  for (const page of pages) {
    const size = exportPageSize(page, options.settings);
    const pdfPage = pdf.addPage([size.width, size.height]);
    const media = { x: 0, y: 0, width: size.width, height: size.height };
    const trim = {
      x: size.bleed,
      y: size.bleed,
      width: page.spec.trim.width,
      height: page.spec.trim.height,
    };

    drawBackground(context, pdfPage, media, page.background);

    if (options.settings.includeMasters) {
      const master = masterForPage(document, page);
      if (master) {
        const masterObjects = masterObjectsForPage(page, master);
        if (master.background.assetId) {
          const image = await embedImage(context, master.background.assetId);
          if (image) {
            pdfPage.drawImage(image, {
              x: media.x,
              y: media.y,
              width: media.width,
              height: media.height,
            });
          }
        } else {
          const masterTrim = master.spec ? trimBox(master.spec) : trimBox(page.spec);
          pdfPage.drawRectangle({
            x: trim.x,
            y: trim.y,
            width: masterTrim.width,
            height: masterTrim.height,
            color: parseColorOrWhite(master.background.color),
          });
        }
        for (const object of masterObjects) {
          await drawObject(context, pdfPage, object, size.height);
        }
      }
    }

    for (const object of page.objects) {
      await drawObject(context, pdfPage, object, size.height);
    }

    if (options.settings.cropMarks && size.bleed > 0) {
      const mark = Math.min(12, Math.max(5, size.bleed * 0.7));
      for (const [x1, y1, x2, y2] of cropMarkSegments(media, trim, mark)) {
        pdfPage.drawLine({
          start: { x: x1, y: y1 },
          end: { x: x2, y: y2 },
          thickness: 0.5,
          color: rgb(0, 0, 0),
        });
      }
    }

    exported.push({
      pageId: page.id,
      title: page.name,
      widthPt: Math.round(size.width * 100) / 100,
      heightPt: Math.round(size.height * 100) / 100,
    });
  }

  const bytes = await pdf.save();
  return {
    blob: new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }),
    bytes,
    pages: exported,
    skippedTextFrames: [...new Set(context.skippedTextFrames)],
    rasterizedTextFrames: [...new Set(context.rasterizedTextFrames)],
    missingImages: [...new Set(context.missingImages)],
    warnings: [...context.warnings],
    stats: context.stats,
  };
}

/** A4-ish fallback used by tests and diagnostics, never by the UI. */
export function pointsToInches(points: number): number {
  return points / POINTS_PER_INCH;
}

export function pageSafeBox(page: PublicationPage) {
  return safeBox(page.spec, page.side);
}

export function pageBleedBox(page: PublicationPage) {
  return bleedBox(page.spec);
}

export type { MasterPage };
