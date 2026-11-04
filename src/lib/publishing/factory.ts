/**
 * Document and object factories.
 *
 * Everything a new document contains is created here: pages, spreads, the
 * default layer stack, a body paragraph style, and the object kinds the
 * editor can draw. The factory takes an id source and a clock so a fixture
 * can be byte-for-byte deterministic.
 *
 * Document creation always starts from a preset. The custom preset carries no
 * size, so `createDocument` demands real dimensions for it instead of
 * inventing a page.
 */

import {
  DEFAULT_BACKGROUND,
  PUBLICATION_DOCUMENT_VERSION,
  PUBLICATION_MASTER_VERSION,
  PUBLICATION_OBJECT_VERSION,
  PUBLICATION_PAGE_VERSION,
  PUBLICATION_STORY_VERSION,
  type AssetRef,
  type Background,
  type DocType,
  type DocumentMetadata,
  type Edges,
  type GenericObject,
  type GridSettings,
  type ImageFrameObject,
  type LineObject,
  type MasterPage,
  type ObjectFrame,
  type PageSpec,
  type ParagraphStyle,
  type PublicationDocument,
  type PublicationPage,
  type ShapeObject,
  type Size,
  type Story,
  type StoryFrameRef,
  type StoryParagraph,
  type TextFrameObject,
  type TextRun,
} from "./model";
import { defaultIds, type IdFactory } from "./ids";
import { createDefaultLayers } from "./layers";
import { createDefaultStyles } from "./defaults";
import {
  CUSTOM_PRESET_ID,
  DOCUMENT_PRESETS,
  DEFAULT_PRESET_ID,
  defaultPresetForDocType,
  pageSpecFromPreset,
  presetById,
  type DocumentPreset,
} from "./presets";
import { assignPageSides, planSpreads } from "./spreads";
import type { LengthUnit } from "./units";

export interface CreatePageOptions {
  name?: string;
  ids?: IdFactory;
  masterId?: string;
  background?: Background;
  layers?: PublicationPage["layers"];
}

export function createPage(
  spec: PageSpec,
  options: CreatePageOptions = {},
): PublicationPage {
  const ids = options.ids ?? defaultIds;
  return {
    version: PUBLICATION_PAGE_VERSION,
    id: ids("page"),
    name: options.name ?? "Page",
    side: "single",
    masterId: options.masterId,
    spec: {
      trim: { ...spec.trim },
      bleed: spec.bleed,
      margins: { ...spec.margins },
      mirrorMargins: spec.mirrorMargins,
    },
    background: { ...(options.background ?? DEFAULT_BACKGROUND) },
    layers: options.layers ?? createDefaultLayers(ids),
    objects: [],
    hidden: false,
  };
}

/* -------------------------------------------------------------------------- */
/* Objects                                                                   */
/* -------------------------------------------------------------------------- */

export interface ObjectOptions {
  layerId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  name?: string;
  id?: string;
  locked?: boolean;
  hidden?: boolean;
  opacity?: number;
  groupId?: string;
  styleId?: string;
  ids?: IdFactory;
}

interface ObjectBase {
  version: number;
  id: string;
  name: string;
  layerId: string;
  frame: ObjectFrame;
  locked: boolean;
  hidden: boolean;
  opacity: number;
  groupId?: string;
  styleId?: string;
}

function objectBase(name: string, options: ObjectOptions): ObjectBase {
  const ids = options.ids ?? defaultIds;
  return {
    version: PUBLICATION_OBJECT_VERSION,
    id: options.id ?? ids("object"),
    name,
    layerId: options.layerId,
    frame: {
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
      rotation: options.rotation ?? 0,
    },
    locked: options.locked ?? false,
    hidden: options.hidden ?? false,
    opacity: options.opacity ?? 1,
    groupId: options.groupId,
    styleId: options.styleId,
  };
}

export function createTextFrame(
  options: ObjectOptions &
    Partial<
      Pick<
        TextFrameObject,
        "storyId" | "columns" | "gutter" | "inset" | "verticalAlign" | "overflow" | "fitToFrame"
      >
    >,
): TextFrameObject {
  return {
    ...objectBase(options.name ?? "Text frame", options),
    kind: "text-frame",
    storyId: options.storyId,
    columns: Math.max(1, options.columns ?? 1),
    gutter: Math.max(0, options.gutter ?? 0),
    inset: { ...(options.inset ?? { top: 0, right: 0, bottom: 0, left: 0 }) },
    verticalAlign: options.verticalAlign ?? "top",
    overflow: options.overflow ?? "thread",
    fitToFrame: options.fitToFrame ?? false,
  };
}

export function createImageFrame(
  options: ObjectOptions &
    Partial<Pick<ImageFrameObject, "assetId" | "fit" | "crop" | "focal" | "mask" | "maskPath">>,
): ImageFrameObject {
  return {
    ...objectBase(options.name ?? "Image frame", options),
    kind: "image-frame",
    assetId: options.assetId,
    fit: options.fit ?? "fill",
    crop: {
      scale: options.crop?.scale ?? 1,
      offsetX: options.crop?.offsetX ?? 0,
      offsetY: options.crop?.offsetY ?? 0,
    },
    focal: options.focal,
    mask: options.mask ?? "rect",
    maskPath: options.maskPath,
  };
}

export function createShape(
  options: ObjectOptions &
    Partial<Pick<ShapeObject, "shape" | "path" | "sides" | "fill" | "stroke" | "strokeWidth" | "cornerRadius">>,
): ShapeObject {
  return {
    ...objectBase(options.name ?? "Shape", options),
    kind: "shape",
    shape: options.shape ?? "rectangle",
    path: options.path,
    sides: options.sides,
    fill: options.fill,
    stroke: options.stroke,
    strokeWidth: Math.max(0, options.strokeWidth ?? 0),
    cornerRadius: Math.max(0, options.cornerRadius ?? 0),
  };
}

export function createLine(
  options: ObjectOptions &
    Partial<Pick<LineObject, "stroke" | "strokeWidth" | "cap" | "dash">>,
): LineObject {
  return {
    ...objectBase(options.name ?? "Line", options),
    kind: "line",
    stroke: options.stroke ?? "#000000",
    strokeWidth: Math.max(0, options.strokeWidth ?? 1),
    cap: options.cap ?? "butt",
    dash: options.dash,
  };
}

/** A placeholder for an object kind written by a newer build. */
export function createGenericObject(
  options: ObjectOptions & { originalKind: string; data?: unknown },
): GenericObject {
  return {
    ...objectBase(options.name ?? "Unsupported object", options),
    kind: "generic",
    originalKind: options.originalKind,
    data: options.data,
  };
}

/* -------------------------------------------------------------------------- */
/* Stories and masters                                                        */
/* -------------------------------------------------------------------------- */

export function createParagraph(
  text: string,
  options: { id?: string; styleId?: string; ids?: IdFactory } = {},
): StoryParagraph {
  const ids = options.ids ?? defaultIds;
  const runs: TextRun[] = [{ text }];
  return {
    id: options.id ?? ids("paragraph"),
    styleId: options.styleId,
    runs,
  };
}

export function createStory(
  name: string,
  options: {
    id?: string;
    paragraphs?: StoryParagraph[];
    frames?: StoryFrameRef[];
    ids?: IdFactory;
  } = {},
): Story {
  const ids = options.ids ?? defaultIds;
  return {
    version: PUBLICATION_STORY_VERSION,
    id: options.id ?? ids("story"),
    name,
    paragraphs: options.paragraphs ?? [createParagraph("", { ids })],
    frames: options.frames ?? [],
    overflow: "thread",
  };
}

export function createMasterPage(
  name: string,
  options: {
    id?: string;
    appliesTo?: MasterPage["appliesTo"];
    spec?: PageSpec;
    background?: Background;
    layers?: MasterPage["layers"];
    objects?: MasterPage["objects"];
    ids?: IdFactory;
  } = {},
): MasterPage {
  const ids = options.ids ?? defaultIds;
  return {
    version: PUBLICATION_MASTER_VERSION,
    id: options.id ?? ids("master"),
    name,
    appliesTo: options.appliesTo ?? "both",
    spec: options.spec,
    background: { ...(options.background ?? DEFAULT_BACKGROUND) },
    layers: options.layers ?? createDefaultLayers(ids),
    objects: options.objects ?? [],
  };
}

export function createAssetRef(
  name: string,
  options: {
    id?: string;
    storageId?: string;
    width: number;
    height: number;
    mime?: string;
    tags?: string[];
    ids?: IdFactory;
  },
): AssetRef {
  const ids = options.ids ?? defaultIds;
  return {
    id: options.id ?? ids("asset"),
    name,
    storageId: options.storageId,
    width: Math.max(0, options.width),
    height: Math.max(0, options.height),
    mime: options.mime,
    tags: options.tags ?? [],
  };
}

/* -------------------------------------------------------------------------- */
/* Document                                                                  */
/* -------------------------------------------------------------------------- */

export interface CreateDocumentOptions {
  title?: string;
  presetId?: string;
  docType?: DocType;
  /** Required by the custom preset; may override any preset's size. */
  trim?: Size;
  displayUnit?: LengthUnit;
  facingPages?: boolean;
  pageCount?: number;
  bleed?: number;
  margins?: Edges;
  mirrorMargins?: boolean;
  grid?: Partial<GridSettings>;
  background?: Background;
  masters?: MasterPage[];
  stories?: Story[];
  ids?: IdFactory;
  /** Fixed clock for deterministic fixtures. */
  now?: number;
}

const MAX_PAGES = 512;

function resolvePreset(options: CreateDocumentOptions): DocumentPreset {
  if (options.presetId) {
    const found = presetById(options.presetId);
    if (found) return found;
  }
  if (options.docType) {
    const byType = defaultPresetForDocType(options.docType);
    if (byType) return byType;
  }
  return presetById(DEFAULT_PRESET_ID) ?? DOCUMENT_PRESETS[0]!;
}

function defaultTitle(docType: DocType): string {
  const label = docType.charAt(0).toUpperCase() + docType.slice(1);
  return `Untitled ${label}`;
}

/**
 * Builds a complete, internally consistent document: pages, spreads, page
 * sides, layers, styles and metadata. The result is guaranteed to pass
 * validation for a fresh document.
 */
export function createDocument(options: CreateDocumentOptions = {}): PublicationDocument {
  const ids = options.ids ?? defaultIds;
  const now = options.now ?? Date.now();
  const preset = resolvePreset(options);

  if (preset.id === CUSTOM_PRESET_ID && !options.trim) {
    throw new RangeError(
      "A custom document needs a trim size (width and height in points)",
    );
  }

  const spec = pageSpecFromPreset(preset, {
    trim: options.trim,
    bleed: options.bleed,
    margins: options.margins,
    mirrorMargins: options.mirrorMargins,
  });

  const facingPages = options.facingPages ?? preset.facingPages;
  const requestedPages = Math.trunc(options.pageCount ?? preset.defaultPageCount);
  const pageCount = Math.max(1, Math.min(MAX_PAGES, Number.isFinite(requestedPages) ? requestedPages : 1));

  const background = options.background ?? DEFAULT_BACKGROUND;
  let pages: PublicationPage[] = Array.from({ length: pageCount }, (_, index) =>
    createPage(spec, {
      ids,
      name: `Page ${index + 1}`,
      background,
    }),
  );

  const spreads = planSpreads(pages, { facingPages, gutter: 0, ids });
  pages = assignPageSides(pages, spreads, { facingPages });

  const metadata: DocumentMetadata = {
    language: "en",
    createdAt: now,
    updatedAt: now,
  };

  return {
    version: PUBLICATION_DOCUMENT_VERSION,
    id: ids("document"),
    title: options.title?.trim() || defaultTitle(preset.docType),
    docType: preset.docType,
    presetId: preset.id,
    displayUnit: options.displayUnit ?? preset.unit,
    spec,
    facingPages,
    grid: { ...preset.grid, ...options.grid },
    pages,
    spreads,
    masters: options.masters ?? [],
    stories: options.stories ?? [],
    styles: createDefaultStyles(ids),
    assets: [],
    guides: [],
    metadata,
  };
}

/** A paragraph style for callers that need one without a document. */
export function defaultParagraphStyle(ids: IdFactory = defaultIds): ParagraphStyle {
  return createDefaultStyles(ids).paragraph[0]!;
}
