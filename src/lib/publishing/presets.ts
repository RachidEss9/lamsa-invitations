/**
 * Document presets.
 *
 * A preset is *configuration*, never a separate document implementation: the
 * same model, the same geometry and the same editor read all eight
 * categories. Adding a new publication type means adding an entry here (and a
 * label in the interface), not a branch in the engine.
 *
 * Sizes are authored in the unit a print buyer would say out loud — 12 inches
 * square, A4 millimetres, 6 × 9 inches — and converted to points once, at
 * module load. The custom preset deliberately has **no size**: a custom
 * document must be given real dimensions by its caller rather than inheriting
 * an invented default.
 */

import type { DocType, Edges, GridSettings, PageSpec, Size } from "./model";
import { toPoints, type LengthUnit } from "./units";

export interface PresetSize {
  width: number;
  height: number;
  unit: LengthUnit;
}

interface PresetDefinition {
  id: string;
  docType: DocType;
  name: string;
  description: string;
  /** Null only for the custom preset. */
  size: PresetSize | null;
  /** Authored in `unit`. */
  bleed: number;
  margins: Edges;
  unit: LengthUnit;
  mirrorMargins: boolean;
  facingPages: boolean;
  grid: GridSettings;
  defaultPageCount: number;
}

export interface DocumentPreset {
  id: string;
  docType: DocType;
  name: string;
  description: string;
  /** Trim size in points, or null for a custom document. */
  size: Size | null;
  /** Bleed in points. */
  bleed: number;
  /** Margins in points, measured on a recto page. */
  margins: Edges;
  mirrorMargins: boolean;
  facingPages: boolean;
  grid: GridSettings;
  defaultPageCount: number;
  /** The unit the preset was authored and is displayed in. */
  unit: LengthUnit;
  /** True when the caller must supply the trim size. */
  requiresSize: boolean;
}

const MM = (width: number, height: number): PresetSize => ({
  width,
  height,
  unit: "mm",
});

const IN = (width: number, height: number): PresetSize => ({
  width,
  height,
  unit: "in",
});

const DEFINITIONS: readonly PresetDefinition[] = [
  {
    id: "album-12x12",
    docType: "album",
    name: "Album — 12 × 12 in",
    description:
      "A square lay-flat photo album at 12 × 12 in, with wide margins for full-bleed photography.",
    size: IN(12, 12),
    bleed: 0.125,
    margins: { top: 0.5, right: 0.5, bottom: 0.5, left: 0.5 },
    unit: "in",
    mirrorMargins: false,
    facingPages: true,
    grid: { enabled: true, columns: 12, gutter: 12, baseline: 14 },
    defaultPageCount: 24,
  },
  {
    id: "magazine-a4",
    docType: "magazine",
    name: "Magazine — A4",
    description:
      "A 210 × 297 mm magazine with a 12-column grid and mirrored inner margins.",
    size: MM(210, 297),
    bleed: 3,
    margins: { top: 15, right: 15, bottom: 15, left: 15 },
    unit: "mm",
    mirrorMargins: true,
    facingPages: true,
    grid: { enabled: true, columns: 12, gutter: 12, baseline: 12 },
    defaultPageCount: 32,
  },
  {
    id: "catalogue-a4",
    docType: "catalogue",
    name: "Catalogue — A4",
    description:
      "A product catalogue at A4 with a tight bleed and a twelve-column grid for tables.",
    size: MM(210, 297),
    bleed: 3,
    margins: { top: 12, right: 12, bottom: 12, left: 12 },
    unit: "mm",
    mirrorMargins: true,
    facingPages: true,
    grid: { enabled: true, columns: 12, gutter: 10, baseline: 12 },
    defaultPageCount: 24,
  },
  {
    id: "book-6x9",
    docType: "book",
    name: "Book — 6 × 9 in",
    description:
      "A trade hardback at 152 × 229 mm with generous mirrored inner margins for binding.",
    size: IN(6, 9),
    bleed: 0.125,
    margins: { top: 0.7, right: 0.6, bottom: 0.8, left: 0.75 },
    unit: "in",
    mirrorMargins: true,
    facingPages: true,
    grid: { enabled: true, columns: 6, gutter: 12, baseline: 12 },
    defaultPageCount: 48,
  },
  {
    id: "brochure-a4-landscape",
    docType: "brochure",
    name: "Brochure — A4 landscape",
    description:
      "A landscape 297 × 210 mm brochure; single pages so folded panels can be exported alone.",
    size: MM(297, 210),
    bleed: 3,
    margins: { top: 10, right: 10, bottom: 10, left: 10 },
    unit: "mm",
    mirrorMargins: false,
    facingPages: false,
    grid: { enabled: true, columns: 8, gutter: 10, baseline: 12 },
    defaultPageCount: 4,
  },
  {
    id: "portfolio-a4-landscape",
    docType: "portfolio",
    name: "Portfolio — A4 landscape",
    description:
      "A landscape presentation portfolio at 297 × 210 mm, facing pages and wide margins.",
    size: MM(297, 210),
    bleed: 3,
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
    unit: "mm",
    mirrorMargins: false,
    facingPages: true,
    grid: { enabled: true, columns: 12, gutter: 12, baseline: 12 },
    defaultPageCount: 16,
  },
  {
    id: "menu-a4",
    docType: "menu",
    name: "Menu — A4",
    description:
      "A single-sided A4 menu at 210 × 297 mm, printed on card and trimmed to the edge.",
    size: MM(210, 297),
    bleed: 3,
    margins: { top: 10, right: 10, bottom: 10, left: 10 },
    unit: "mm",
    mirrorMargins: false,
    facingPages: false,
    grid: { enabled: true, columns: 6, gutter: 10, baseline: 12 },
    defaultPageCount: 4,
  },
  {
    id: "custom",
    docType: "custom",
    name: "Custom size",
    description:
      "Any trim size the job needs. A custom document must be given its dimensions.",
    size: null,
    bleed: 3,
    margins: { top: 10, right: 10, bottom: 10, left: 10 },
    unit: "mm",
    mirrorMargins: false,
    facingPages: false,
    grid: { enabled: true, columns: 12, gutter: 12, baseline: 12 },
    defaultPageCount: 1,
  },
];

function toSizePoints(size: PresetSize): Size {
  return {
    width: toPoints(size.width, size.unit),
    height: toPoints(size.height, size.unit),
  };
}

function toEdgesPoints(margins: Edges, unit: LengthUnit): Edges {
  return {
    top: toPoints(margins.top, unit),
    right: toPoints(margins.right, unit),
    bottom: toPoints(margins.bottom, unit),
    left: toPoints(margins.left, unit),
  };
}

function buildPreset(definition: PresetDefinition): DocumentPreset {
  return {
    id: definition.id,
    docType: definition.docType,
    name: definition.name,
    description: definition.description,
    size: definition.size ? toSizePoints(definition.size) : null,
    bleed: toPoints(definition.bleed, definition.unit),
    margins: toEdgesPoints(definition.margins, definition.unit),
    mirrorMargins: definition.mirrorMargins,
    facingPages: definition.facingPages,
    grid: { ...definition.grid },
    defaultPageCount: definition.defaultPageCount,
    unit: definition.unit,
    requiresSize: definition.size === null,
  };
}

export const DOCUMENT_PRESETS: readonly DocumentPreset[] = DEFINITIONS.map(buildPreset);

export const CUSTOM_PRESET_ID = "custom";

export const DEFAULT_PRESET_ID = "album-12x12";

export function presetById(id: string): DocumentPreset | undefined {
  return DOCUMENT_PRESETS.find((preset) => preset.id === id);
}

/** The preset behind a document category (custom has exactly one). */
export function defaultPresetForDocType(docType: DocType): DocumentPreset | undefined {
  return DOCUMENT_PRESETS.find((preset) => preset.docType === docType);
}

export function presetsForDocType(docType: DocType): DocumentPreset[] {
  return DOCUMENT_PRESETS.filter((preset) => preset.docType === docType);
}

/**
 * The page spec a preset describes. A preset without a size (custom) throws:
 * it is the caller's job to provide dimensions, never the preset's to guess.
 */
export function pageSpecFromPreset(
  preset: DocumentPreset,
  overrides: Partial<Omit<PageSpec, "trim">> & { trim?: Size } = {},
): PageSpec {
  const trim = overrides.trim ?? preset.size;
  if (!trim) {
    throw new RangeError(
      `Preset "${preset.id}" needs a trim size; pass one when creating the document`,
    );
  }
  return {
    trim: { width: trim.width, height: trim.height },
    bleed: Math.max(0, overrides.bleed ?? preset.bleed),
    margins: { ...(overrides.margins ?? preset.margins) },
    mirrorMargins: overrides.mirrorMargins ?? preset.mirrorMargins,
  };
}

/** The page spec for a fully custom document. Dimensions are not optional. */
export function customPageSpec(
  trim: Size,
  overrides: Partial<Omit<PageSpec, "trim">> = {},
): PageSpec {
  if (!(trim.width > 0) || !(trim.height > 0)) {
    throw new RangeError("A custom page needs a positive width and height in points");
  }
  return {
    trim: { width: trim.width, height: trim.height },
    bleed: Math.max(0, overrides.bleed ?? toPoints(3, "mm")),
    margins: {
      ...(overrides.margins ?? {
        top: toPoints(10, "mm"),
        right: toPoints(10, "mm"),
        bottom: toPoints(10, "mm"),
        left: toPoints(10, "mm"),
      }),
    },
    mirrorMargins: overrides.mirrorMargins ?? false,
  };
}
