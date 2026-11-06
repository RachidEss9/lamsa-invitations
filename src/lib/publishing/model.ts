/**
 * The publishing document model.
 *
 * This is a *physical* document, not a screen mock-up: every dimension is in
 * PDF points (see `units.ts`), the origin is the top-left of the page, x grows
 * right and y grows down (the screen convention, so the same geometry drives
 * the SVG renderer and the PDF writer).
 *
 * The model is deliberately plain data. Nothing here imports React, Convex or
 * a rendering library, so it can be created, normalised, validated and
 * transformed in a unit test without a browser.
 *
 * Ordering convention: `layers` and `objects` arrays are stored bottom-to-top.
 * Index 0 is the paint order's back; the last entry is the front. Draw order
 * is therefore layers (in array order) → objects (in array order). This keeps
 * the array itself the single source of truth — no stored `zIndex` to drift.
 */

import type { LengthUnit } from "./units";

/** Bumped when the document envelope changes shape in a breaking way. */
export const PUBLICATION_DOCUMENT_VERSION = 1;

/** Bumped per object kind when its own payload changes shape. */
export const PUBLICATION_OBJECT_VERSION = 1;

export const PUBLICATION_PAGE_VERSION = 1;
export const PUBLICATION_MASTER_VERSION = 1;
export const PUBLICATION_STORY_VERSION = 1;

/* -------------------------------------------------------------------------- */
/* Primitive geometry                                                         */
/* -------------------------------------------------------------------------- */

/** Width and height in points. */
export interface Size {
  width: number;
  height: number;
}

/** A position in points, measured from the page's top-left corner. */
export interface Point {
  x: number;
  y: number;
}

/** An axis-aligned rectangle in points, top-left origin. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Four inset values in points. */
export interface Edges {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type Orientation = "portrait" | "landscape";

/** Which side of a spread a page sits on. A non-facing page is `single`. */
export type PageSide = "left" | "right" | "single";

/* -------------------------------------------------------------------------- */
/* Document categories and presets                                            */
/* -------------------------------------------------------------------------- */

export const DOC_TYPES = [
  "album",
  "magazine",
  "catalogue",
  "book",
  "brochure",
  "portfolio",
  "menu",
  "custom",
] as const;

export type DocType = (typeof DOC_TYPES)[number];

export function isDocType(value: unknown): value is DocType {
  return typeof value === "string" && (DOC_TYPES as readonly string[]).includes(value);
}

/* -------------------------------------------------------------------------- */
/* Page specification                                                         */
/* -------------------------------------------------------------------------- */

/**
 * The physical brief of a page: its trimmed size and the two frames printers
 * care about, bleed outside the trim and margins inside it. Spread geometry is
 * derived separately (`spreads.ts`) and never stored here.
 */
export interface PageSpec {
  /** The finished, trimmed page. */
  trim: Size;
  /** Extra artwork beyond the trim, on every edge. */
  bleed: number;
  /**
   * Safety margins measured on a right-hand (recto) page: `left` is the inner
   * margin, `right` the outer one. `mirrorMargins` swaps them on left pages.
   */
  margins: Edges;
  /** Left pages mirror the left/right margins so the inner gutter is even. */
  mirrorMargins: boolean;
}

/** Column and baseline grid, measured inside the safe area. */
export interface GridSettings {
  enabled: boolean;
  columns: number;
  /** Space between columns, in points. */
  gutter: number;
  /** Baseline rhythm in points. Zero means no baseline grid. */
  baseline: number;
}

/** A page or master background. Colour is any CSS colour the renderer accepts. */
export interface Background {
  color: string;
  assetId?: string;
}

/** A named stacking group. Layers are per page (and per master). */
export interface Layer {
  id: string;
  name: string;
  locked: boolean;
  hidden: boolean;
  /** Non-printing layers (guides, notes) never reach an export. */
  printable: boolean;
  color?: string;
}

/* -------------------------------------------------------------------------- */
/* Objects                                                                    */
/* -------------------------------------------------------------------------- */

export type ObjectKind =
  | "text-frame"
  | "image-frame"
  | "shape"
  | "line"
  | "generic";

export const OBJECT_KINDS: readonly ObjectKind[] = [
  "text-frame",
  "image-frame",
  "shape",
  "line",
  "generic",
];

/** Objects saved by a newer build are kept, not destroyed (see `generic`). */
export const LEGACY_OBJECT_KIND = "generic";

export function isObjectKind(value: unknown): value is ObjectKind {
  return typeof value === "string" && (OBJECT_KINDS as readonly string[]).includes(value);
}

/**
 * Placement of an object on its page. `x`/`y` are the top-left of the
 * unrotated box; `rotation` turns the box about its centre, clockwise, in
 * degrees. Rotation never moves `x`/`y` — that keeps the frame stable while
 * the user spins it.
 */
export interface ObjectFrame {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface BaseObject {
  /** The object schema version, so one kind can migrate on its own. */
  version: number;
  id: string;
  kind: ObjectKind;
  name: string;
  layerId: string;
  frame: ObjectFrame;
  locked: boolean;
  hidden: boolean;
  /** 0–1. */
  opacity: number;
  /** Objects sharing a group id select and move together. */
  groupId?: string;
  /** Object style reference, resolved by the renderer. */
  styleId?: string;
}

/** Text alignment inside a frame. */
export type TextAlignment = "left" | "center" | "right" | "justify";

export type VerticalAlignment = "top" | "middle" | "bottom";

export type TextDirection = "ltr" | "rtl" | "auto";

export type FontStyle = "normal" | "italic";

/**
 * Character-level formatting. Every field is optional so an old document, a
 * named character style and a one-off run override all speak the same shape:
 * a resolver fills the gaps from the paragraph and the document defaults.
 */
export interface CharacterFormat {
  fontId?: string;
  /** Type size in points. */
  size?: number;
  /** CSS weight (400 regular, 700 bold). */
  fontWeight?: number;
  fontStyle?: FontStyle;
  /** Any CSS colour. */
  color?: string;
  /** 0–1. */
  opacity?: number;
  /** Letter spacing in 1/1000 em. */
  tracking?: number;
  /** Line height in points. */
  leading?: number;
  underline?: boolean;
  strikethrough?: boolean;
  /** Raised or lowered type; never a manual baseline shift. */
  baseline?: "normal" | "super" | "sub";
}

/** Paragraph-level formatting that may be overridden per paragraph. */
export interface ParagraphFormat {
  fontId?: string;
  size?: number;
  fontWeight?: number;
  fontStyle?: FontStyle;
  color?: string;
  leading?: number;
  tracking?: number;
  alignment?: TextAlignment;
  direction?: TextDirection;
  spaceBefore?: number;
  spaceAfter?: number;
  firstLineIndent?: number;
  leftIndent?: number;
  rightIndent?: number;
  hyphenate?: boolean;
}

/** What happens when a story outgrows its frame. */
export type OverflowMode = "clip" | "thread" | "shrink";

export interface TextFrameObject extends BaseObject {
  kind: "text-frame";
  /**
   * The story this frame belongs to. The frame *order* lives in
   * `Story.frames`, never here, so there is one thread order in the document.
   */
  storyId?: string;
  columns: number;
  /** Space between columns, in points. */
  gutter: number;
  inset: Edges;
  verticalAlign: VerticalAlignment;
  overflow: OverflowMode;
  /** Shrink type to fit the frame when `overflow` is `shrink`. */
  fitToFrame: boolean;
}

export type ImageFit = "fill" | "fit" | "stretch";

export interface ImageCrop {
  /**
   * Zoom relative to the fit baseline. For normalised crops 1 means the
   * image exactly meets or covers the frame, depending on `fit`.
   */
  scale: number;
  /**
   * Artwork displacement as a fraction of the frame width/height. Earlier
   * documents stored points here and are rendered with the identity crop
   * until they are edited, which keeps their placement stable.
   */
  offsetX: number;
  offsetY: number;
  /** Marks offsets as frame-relative fractions rather than legacy points. */
  normalized?: boolean;
  /** Image rotation inside the frame, in degrees. Frame rotation is separate. */
  rotation?: number;
}

export interface ImageFrameObject extends BaseObject {
  kind: "image-frame";
  assetId?: string;
  fit: ImageFit;
  crop: ImageCrop;
  /** Normalised focal point (0–1) used by album cropping. */
  focal?: Point;
  mask: "rect" | "ellipse" | "path";
  /** SVG path data when `mask` is `path`. */
  maskPath?: string;
}

export type ShapeKind = "rectangle" | "ellipse" | "polygon" | "path";

export interface ShapeObject extends BaseObject {
  kind: "shape";
  shape: ShapeKind;
  /** SVG path data when `shape` is `path`. */
  path?: string;
  /** Number of sides when `shape` is `polygon`. */
  sides?: number;
  fill?: string;
  stroke?: string;
  strokeWidth: number;
  cornerRadius: number;
}

export interface LineObject extends BaseObject {
  kind: "line";
  stroke: string;
  strokeWidth: number;
  cap: "butt" | "round" | "square";
  dash?: number[];
}

/**
 * An object kind this build does not understand. The payload is preserved so
 * reopening a newer document never destroys work; validation reports it as a
 * warning and the renderer draws a placeholder.
 */
export interface GenericObject extends BaseObject {
  kind: "generic";
  originalKind: string;
  data?: unknown;
}

export type PublicationObject =
  | TextFrameObject
  | ImageFrameObject
  | ShapeObject
  | LineObject
  | GenericObject;

/* -------------------------------------------------------------------------- */
/* Stories and typography                                                     */
/* -------------------------------------------------------------------------- */

export interface ParagraphStyle extends ParagraphFormat {
  id: string;
  name: string;
  /** Family token resolved by the font library (never a CSS font stack). */
  fontId: string;
  /** Type size in points. */
  size: number;
  /** Line height in points. */
  leading: number;
  /** Letter spacing in 1/1000 em. */
  tracking: number;
  alignment: TextAlignment;
  direction?: TextDirection;
  spaceBefore: number;
  spaceAfter: number;
  firstLineIndent: number;
  leftIndent?: number;
  rightIndent?: number;
  hyphenate: boolean;
}

export interface CharacterStyle extends CharacterFormat {
  id: string;
  name: string;
}

export function isTextDirection(value: unknown): value is TextDirection {
  return value === "ltr" || value === "rtl" || value === "auto";
}

export interface StyleSet {
  paragraph: ParagraphStyle[];
  character: CharacterStyle[];
}

export interface TextRun {
  text: string;
  /** Character style id, when the run uses a reusable style. */
  styleId?: string;
  /** One-off character formatting on this run (selection-level edits). */
  format?: CharacterFormat;
}

export interface StoryParagraph {
  id: string;
  styleId?: string;
  /** One-off paragraph formatting, layered over the named style. */
  format?: ParagraphFormat;
  runs: TextRun[];
}

/** One frame in a story's thread, in reading order. */
export interface StoryFrameRef {
  pageId: string;
  objectId: string;
}

/**
 * A flow of text that may cross several frames, on one page or many. The
 * `frames` array *is* the thread order; a text frame only names its story.
 */
export interface Story {
  version: number;
  id: string;
  name: string;
  paragraphs: StoryParagraph[];
  frames: StoryFrameRef[];
  /** Whether text stops at the last frame or flows back to the first. */
  overflow: "thread" | "stop";
}

/* -------------------------------------------------------------------------- */
/* Pages, masters, spreads                                                    */
/* -------------------------------------------------------------------------- */

export interface PublicationPage {
  version: number;
  id: string;
  name: string;
  /** Assigned by the spread plan; stored so the renderer needs no derivation. */
  side: PageSide;
  /** Master applied to this page, if any. */
  masterId?: string;
  /** Per-page override: an insert can use a different trim without a new doc. */
  spec: PageSpec;
  background: Background;
  layers: Layer[];
  objects: PublicationObject[];
  hidden: boolean;
}

/**
 * Reusable page furniture (folios, running heads, frames). A master has no
 * side of its own: `appliesTo` decides which pages receive it.
 */
export interface MasterPage {
  version: number;
  id: string;
  name: string;
  appliesTo: "left" | "right" | "both";
  spec?: PageSpec;
  background: Background;
  layers: Layer[];
  objects: PublicationObject[];
}

/** Two facing pages (or one standalone page) as the reader sees them. */
export interface Spread {
  id: string;
  index: number;
  kind: "single" | "facing";
  pageIds: string[];
  /** Space between the two pages, in points. */
  gutter: number;
}

/* -------------------------------------------------------------------------- */
/* Supporting records                                                         */
/* -------------------------------------------------------------------------- */

export interface AssetRef {
  id: string;
  name: string;
  /** Convex storage id, once Phase 2 wires uploads. */
  storageId?: string;
  /** Intrinsic width/height of the original, in pixels. */
  width: number;
  height: number;
  mime?: string;
  tags: string[];
}

export interface Guide {
  id: string;
  axis: "x" | "y";
  /** Position in points from the page's top-left. */
  position: number;
  /** A page guide belongs to one page; a document guide to every page. */
  scope: "document" | "page";
  pageId?: string;
}

export interface DocumentMetadata {
  author?: string;
  client?: string;
  jobNumber?: string;
  language: string;
  createdAt: number;
  updatedAt: number;
}

/* -------------------------------------------------------------------------- */
/* The document                                                               */
/* -------------------------------------------------------------------------- */

export interface PublicationDocument {
  version: number;
  id: string;
  title: string;
  docType: DocType;
  /** The preset the document was created from (or `custom`). */
  presetId: string;
  /** The unit the interface reads in; storage is always points. */
  displayUnit: LengthUnit;
  /** Default page spec. Pages may override it individually. */
  spec: PageSpec;
  facingPages: boolean;
  grid: GridSettings;
  pages: PublicationPage[];
  /** Derived from `pages`; rebuilt on every structural change. */
  spreads: Spread[];
  masters: MasterPage[];
  stories: Story[];
  styles: StyleSet;
  assets: AssetRef[];
  guides: Guide[];
  metadata: DocumentMetadata;
  /** Forward-compatibility bag for fields a newer build writes. */
  extensions?: Record<string, unknown>;
}

/* -------------------------------------------------------------------------- */
/* Defaults                                                                   */
/* -------------------------------------------------------------------------- */

export const DEFAULT_MARGINS: Edges = { top: 36, right: 36, bottom: 36, left: 36 };

export const DEFAULT_GRID: GridSettings = {
  enabled: true,
  columns: 12,
  gutter: 12,
  baseline: 12,
};

export const DEFAULT_BACKGROUND: Background = { color: "#ffffff" };

/** Bottom-to-top: the page surface, then content, then non-printing notes. */
export const DEFAULT_LAYER_NAMES = ["Background", "Content", "Notes"] as const;

export function emptyFrame(): ObjectFrame {
  return { x: 0, y: 0, width: 0, height: 0, rotation: 0 };
}
