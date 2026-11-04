/**
 * Document normalisation.
 *
 * A saved publication may be incomplete (a first draft, a document written by
 * an earlier build, a hand-edited fixture) or may carry fields a newer build
 * added. Normalisation repairs everything it can and never destroys a kind of
 * object it does not understand: unknown objects become `generic` objects with
 * their original kind and payload intact.
 *
 * What it *cannot* repair — a future document version — is refused loudly
 * instead of being silently downgraded.
 *
 * Two structural invariants are restored on every pass:
 *   1. spreads are derived from the page order (never trusted from disk);
 *   2. a story's frames are the only thread order, and frames that no longer
 *      exist are pruned from the story.
 */

import {
  DEFAULT_BACKGROUND,
  DEFAULT_GRID,
  PUBLICATION_DOCUMENT_VERSION,
  PUBLICATION_MASTER_VERSION,
  PUBLICATION_OBJECT_VERSION,
  PUBLICATION_PAGE_VERSION,
  PUBLICATION_STORY_VERSION,
  isDocType,
  isObjectKind,
  type AssetRef,
  type Background,
  type CharacterStyle,
  type DocType,
  type Edges,
  type GridSettings,
  type Guide,
  type ImageFit,
  type Layer,
  type MasterPage,
  type ObjectKind,
  type OverflowMode,
  type PageSide,
  type PageSpec,
  type ParagraphStyle,
  type PublicationDocument,
  type PublicationObject,
  type PublicationPage,
  type ShapeKind,
  type Spread,
  type Story,
  type StoryFrameRef,
  type StoryParagraph,
  type StyleSet,
  type TextAlignment,
  type TextRun,
  type VerticalAlignment,
  type GenericObject,
  type ImageFrameObject,
  type LineObject,
  type ShapeObject,
  type TextFrameObject,
} from "./model";
import { defaultIds, normalizeId, type IdFactory } from "./ids";
import { createDefaultLayers } from "./layers";
import { createDefaultStyles } from "./defaults";
import { normalizeAngle } from "./object-transform";
import {
  CUSTOM_PRESET_ID,
  DEFAULT_PRESET_ID,
  defaultPresetForDocType,
  presetById,
} from "./presets";
import { assignPageSides, planSpreads, preserveSpreadIds } from "./spreads";
import { isLengthUnit, toPoints } from "./units";

export interface NormalizeOptions {
  ids?: IdFactory;
  /** Fixed clock for deterministic tests. */
  now?: number;
}

type RawRecord = Record<string, unknown>;

const A4_TRIM = { width: toPoints(210, "mm"), height: toPoints(297, "mm") };

function record(value: unknown): RawRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as RawRecord)
    : null;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nonNegative(value: unknown, fallback: number): number {
  return Math.max(0, num(value, fallback));
}

function positive(value: unknown, fallback: number): number {
  const result = num(value, fallback);
  return result > 0 ? result : fallback;
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const result = Math.trunc(num(value, fallback));
  if (!Number.isFinite(result)) return fallback;
  return Math.max(min, Math.min(max, result));
}

function clamp01(value: unknown, fallback = 1): number {
  return Math.max(0, Math.min(1, num(value, fallback)));
}

function text(value: unknown, fallback: string, maxLength = 200): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : fallback;
}

function optionalText(value: unknown, maxLength = 400): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function normalizeEdges(
  value: unknown,
  fallback: Edges,
  limit: { width: number; height: number },
): Edges {
  const raw = record(value) ?? {};
  const maxX = Math.max(0, limit.width - 1);
  const maxY = Math.max(0, limit.height - 1);
  return {
    top: Math.min(maxY, nonNegative(raw.top, fallback.top)),
    right: Math.min(maxX, nonNegative(raw.right, fallback.right)),
    bottom: Math.min(maxY, nonNegative(raw.bottom, fallback.bottom)),
    left: Math.min(maxX, nonNegative(raw.left, fallback.left)),
  };
}

function normalizeBackground(value: unknown): Background {
  const raw = record(value);
  if (!raw) return { ...DEFAULT_BACKGROUND };
  return {
    color: text(raw.color, DEFAULT_BACKGROUND.color, 120),
    assetId: optionalText(raw.assetId, 120),
  };
}

/* -------------------------------------------------------------------------- */
/* Page specification                                                         */
/* -------------------------------------------------------------------------- */

function normalizeSpec(value: unknown, fallback: PageSpec): PageSpec {
  const raw = record(value) ?? {};
  const trimRaw = record(raw.trim) ?? {};
  const width = positive(trimRaw.width, fallback.trim.width);
  const height = positive(trimRaw.height, fallback.trim.height);
  const trim = { width, height };
  return {
    trim,
    bleed: nonNegative(raw.bleed, fallback.bleed),
    margins: normalizeEdges(raw.margins, fallback.margins, trim),
    mirrorMargins: bool(raw.mirrorMargins, fallback.mirrorMargins),
  };
}

function normalizeGrid(value: unknown): GridSettings {
  const raw = record(value) ?? {};
  return {
    enabled: bool(raw.enabled, DEFAULT_GRID.enabled),
    columns: clampInt(raw.columns, DEFAULT_GRID.columns, 1, 48),
    gutter: nonNegative(raw.gutter, DEFAULT_GRID.gutter),
    baseline: nonNegative(raw.baseline, DEFAULT_GRID.baseline),
  };
}

/* -------------------------------------------------------------------------- */
/* Layers                                                                     */
/* -------------------------------------------------------------------------- */

function normalizeLayers(
  value: unknown,
  ids: IdFactory,
  used: Set<string>,
): Layer[] {
  const raw = list(value);
  const layers: Layer[] = [];
  for (const entry of raw) {
    const layer = record(entry);
    if (!layer) continue;
    let id = normalizeId(layer.id, "layer", ids);
    while (used.has(id)) id = ids("layer");
    used.add(id);
    layers.push({
      id,
      name: text(layer.name, `Layer ${layers.length + 1}`, 80),
      locked: bool(layer.locked, false),
      hidden: bool(layer.hidden, false),
      printable: bool(layer.printable, true),
      color: optionalText(layer.color, 40),
    });
  }
  if (layers.length === 0) {
    const defaults = createDefaultLayers(ids);
    for (const layer of defaults) used.add(layer.id);
    return defaults;
  }
  return layers;
}

/* -------------------------------------------------------------------------- */
/* Objects                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeInset(value: unknown): Edges {
  const raw = record(value) ?? {};
  return {
    top: nonNegative(raw.top, 0),
    right: nonNegative(raw.right, 0),
    bottom: nonNegative(raw.bottom, 0),
    left: nonNegative(raw.left, 0),
  };
}

const ALIGNMENTS: readonly TextAlignment[] = ["left", "center", "right", "justify"];
const VERTICAL_ALIGNMENTS: readonly VerticalAlignment[] = ["top", "middle", "bottom"];
const OVERFLOW_MODES: readonly OverflowMode[] = ["clip", "thread", "shrink"];
const IMAGE_FITS: readonly ImageFit[] = ["fill", "fit", "stretch"];
const SHAPE_KINDS: readonly ShapeKind[] = ["rectangle", "ellipse", "polygon", "path"];

interface ObjectContext {
  ids: IdFactory;
  layerIds: string[];
  usedIds: Set<string>;
  fallbackLayerId: string;
}

function normalizeObject(value: unknown, context: ObjectContext): PublicationObject | null {
  const raw = record(value);
  if (!raw) return null;

  const rawKind = typeof raw.kind === "string" ? raw.kind : "";
  const knownKind = isObjectKind(rawKind);
  let id = normalizeId(raw.id, "object", context.ids);
  while (context.usedIds.has(id)) id = context.ids("object");
  context.usedIds.add(id);

  const frameRaw = record(raw.frame) ?? {};
  const frame = {
    x: num(frameRaw.x, 0),
    y: num(frameRaw.y, 0),
    width: nonNegative(frameRaw.width, 0),
    height: nonNegative(frameRaw.height, 0),
    rotation: normalizeAngle(num(frameRaw.rotation, 0)),
  };

  const layerId =
    typeof raw.layerId === "string" && context.layerIds.includes(raw.layerId)
      ? raw.layerId
      : context.fallbackLayerId;

  const base = {
    version: clampInt(raw.version, PUBLICATION_OBJECT_VERSION, 1, 999),
    id,
    name: text(raw.name, knownKind ? rawKind.replace("-", " ") : "Object", 120),
    layerId,
    frame,
    locked: bool(raw.locked, false),
    hidden: bool(raw.hidden, false),
    opacity: clamp01(raw.opacity, 1),
    groupId: optionalText(raw.groupId, 120),
    styleId: optionalText(raw.styleId, 120),
  };

  const kind: ObjectKind = knownKind ? (rawKind as ObjectKind) : "generic";

  if (kind === "text-frame") {
    const object: TextFrameObject = {
      ...base,
      kind: "text-frame",
      storyId: optionalText(raw.storyId, 120),
      columns: clampInt(raw.columns, 1, 1, 32),
      gutter: nonNegative(raw.gutter, 0),
      inset: normalizeInset(raw.inset),
      verticalAlign: oneOf(raw.verticalAlign, VERTICAL_ALIGNMENTS, "top"),
      overflow: oneOf(raw.overflow, OVERFLOW_MODES, "thread"),
      fitToFrame: bool(raw.fitToFrame, false),
    };
    return object;
  }

  if (kind === "image-frame") {
    const crop = record(raw.crop) ?? {};
    const focal = record(raw.focal);
    const object: ImageFrameObject = {
      ...base,
      kind: "image-frame",
      assetId: optionalText(raw.assetId, 120),
      fit: oneOf(raw.fit, IMAGE_FITS, "fill"),
      crop: {
        scale: positive(crop.scale, 1),
        offsetX: num(crop.offsetX, 0),
        offsetY: num(crop.offsetY, 0),
      },
      focal: focal
        ? { x: clamp01(focal.x, 0.5), y: clamp01(focal.y, 0.5) }
        : undefined,
      mask: oneOf(raw.mask, ["rect", "ellipse", "path"] as const, "rect"),
      maskPath: optionalText(raw.maskPath, 4000),
    };
    return object;
  }

  if (kind === "shape") {
    const object: ShapeObject = {
      ...base,
      kind: "shape",
      shape: oneOf(raw.shape, SHAPE_KINDS, "rectangle"),
      path: optionalText(raw.path, 4000),
      sides: typeof raw.sides === "number" ? clampInt(raw.sides, 3, 3, 64) : undefined,
      fill: optionalText(raw.fill, 120),
      stroke: optionalText(raw.stroke, 120),
      strokeWidth: nonNegative(raw.strokeWidth, 0),
      cornerRadius: nonNegative(raw.cornerRadius, 0),
    };
    return object;
  }

  if (kind === "line") {
    const dash = Array.isArray(raw.dash)
      ? raw.dash.map((entry) => nonNegative(entry, 0)).filter((entry) => entry > 0)
      : undefined;
    const object: LineObject = {
      ...base,
      kind: "line",
      stroke: text(raw.stroke, "#000000", 120),
      strokeWidth: nonNegative(raw.strokeWidth, 1),
      cap: oneOf(raw.cap, ["butt", "round", "square"] as const, "butt"),
      dash: dash && dash.length > 0 ? dash : undefined,
    };
    return object;
  }

  const generic: GenericObject = {
    ...base,
    kind: "generic",
    originalKind: text(raw.originalKind ?? rawKind, "unknown", 80),
    data: raw.data,
  };
  return generic;
}

/* -------------------------------------------------------------------------- */
/* Pages                                                                      */
/* -------------------------------------------------------------------------- */

interface PageContext {
  ids: IdFactory;
  documentSpec: PageSpec;
  usedPageIds: Set<string>;
  usedObjectIds: Set<string>;
}

function normalizePage(value: unknown, context: PageContext): PublicationPage {
  const raw = record(value) ?? {};
  let id = normalizeId(raw.id, "page", context.ids);
  while (context.usedPageIds.has(id)) id = context.ids("page");
  context.usedPageIds.add(id);

  const spec = normalizeSpec(raw.spec, context.documentSpec);
  const layerUsed = new Set<string>();
  const layers = normalizeLayers(raw.layers, context.ids, layerUsed);
  const layerIds = layers.map((layer) => layer.id);
  const fallbackLayerId = layerIds[Math.min(1, layerIds.length - 1)] ?? layerIds[0]!;

  const objects: PublicationObject[] = [];
  for (const entry of list(raw.objects)) {
    const object = normalizeObject(entry, {
      ids: context.ids,
      layerIds,
      usedIds: context.usedObjectIds,
      fallbackLayerId,
    });
    if (object) objects.push(object);
  }

  return {
    version: clampInt(raw.version, PUBLICATION_PAGE_VERSION, 1, 999),
    id,
    name: text(raw.name, "Page", 120),
    side: "single",
    masterId: optionalText(raw.masterId, 120),
    spec,
    background: normalizeBackground(raw.background),
    layers,
    objects,
    hidden: bool(raw.hidden, false),
  };
}

/* -------------------------------------------------------------------------- */
/* Masters                                                                    */
/* -------------------------------------------------------------------------- */

interface MasterContext {
  ids: IdFactory;
  documentSpec: PageSpec;
  usedIds: Set<string>;
  usedObjectIds: Set<string>;
}

function normalizeMaster(value: unknown, context: MasterContext): MasterPage | null {
  const raw = record(value);
  if (!raw) return null;
  let id = normalizeId(raw.id, "master", context.ids);
  while (context.usedIds.has(id)) id = context.ids("master");
  context.usedIds.add(id);

  const layerUsed = new Set<string>();
  const layers = normalizeLayers(raw.layers, context.ids, layerUsed);
  const layerIds = layers.map((layer) => layer.id);
  const fallbackLayerId = layerIds[Math.min(1, layerIds.length - 1)] ?? layerIds[0]!;
  const objects: PublicationObject[] = [];
  for (const entry of list(raw.objects)) {
    const object = normalizeObject(entry, {
      ids: context.ids,
      layerIds,
      usedIds: context.usedObjectIds,
      fallbackLayerId,
    });
    if (object) objects.push(object);
  }

  return {
    version: clampInt(raw.version, PUBLICATION_MASTER_VERSION, 1, 999),
    id,
    name: text(raw.name, "Master", 120),
    appliesTo: oneOf(raw.appliesTo, ["left", "right", "both"] as const, "both"),
    spec: record(raw.spec) ? normalizeSpec(raw.spec, context.documentSpec) : undefined,
    background: normalizeBackground(raw.background),
    layers,
    objects,
  };
}

/* -------------------------------------------------------------------------- */
/* Stories                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeParagraph(value: unknown, ids: IdFactory, used: Set<string>): StoryParagraph | null {
  const raw = record(value);
  if (!raw) return null;
  let id = normalizeId(raw.id, "paragraph", ids);
  while (used.has(id)) id = ids("paragraph");
  used.add(id);

  const runs: TextRun[] = [];
  for (const entry of list(raw.runs)) {
    const run = record(entry);
    if (!run) continue;
    if (typeof run.text !== "string") continue;
    runs.push({ text: run.text, styleId: optionalText(run.styleId, 120) });
  }
  return {
    id,
    styleId: optionalText(raw.styleId, 120),
    runs: runs.length > 0 ? runs : [{ text: "" }],
  };
}

function normalizeStory(value: unknown, ids: IdFactory, used: Set<string>): Story | null {
  const raw = record(value);
  if (!raw) return null;
  let id = normalizeId(raw.id, "story", ids);
  while (used.has(id)) id = ids("story");
  used.add(id);

  const paragraphIds = new Set<string>();
  const paragraphs: StoryParagraph[] = [];
  for (const entry of list(raw.paragraphs)) {
    const paragraph = normalizeParagraph(entry, ids, paragraphIds);
    if (paragraph) paragraphs.push(paragraph);
  }

  const frames: StoryFrameRef[] = [];
  const seen = new Set<string>();
  for (const entry of list(raw.frames)) {
    const frame = record(entry);
    if (!frame) continue;
    const pageId = optionalText(frame.pageId, 120);
    const objectId = optionalText(frame.objectId, 120);
    if (!pageId || !objectId) continue;
    const key = `${pageId}|${objectId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    frames.push({ pageId, objectId });
  }

  return {
    version: clampInt(raw.version, PUBLICATION_STORY_VERSION, 1, 999),
    id,
    name: text(raw.name, "Story", 120),
    paragraphs: paragraphs.length > 0 ? paragraphs : [],
    frames,
    overflow: oneOf(raw.overflow, ["thread", "stop"] as const, "thread"),
  };
}

/* -------------------------------------------------------------------------- */
/* Styles, assets, guides                                                     */
/* -------------------------------------------------------------------------- */

function normalizeParagraphStyles(value: unknown, ids: IdFactory): ParagraphStyle[] {
  const used = new Set<string>();
  const styles: ParagraphStyle[] = [];
  for (const entry of list(value)) {
    const raw = record(entry);
    if (!raw) continue;
    let id = normalizeId(raw.id, "style", ids);
    while (used.has(id)) id = ids("style");
    used.add(id);
    styles.push({
      id,
      name: text(raw.name, "Paragraph style", 80),
      fontId: text(raw.fontId, "serif", 120),
      size: positive(raw.size, 11),
      leading: positive(raw.leading, 14),
      tracking: num(raw.tracking, 0),
      alignment: oneOf(raw.alignment, ALIGNMENTS, "left"),
      spaceBefore: nonNegative(raw.spaceBefore, 0),
      spaceAfter: nonNegative(raw.spaceAfter, 0),
      firstLineIndent: num(raw.firstLineIndent, 0),
      hyphenate: bool(raw.hyphenate, false),
    });
  }
  return styles;
}

function normalizeCharacterStyles(value: unknown, ids: IdFactory, used: Set<string>): CharacterStyle[] {
  const styles: CharacterStyle[] = [];
  for (const entry of list(value)) {
    const raw = record(entry);
    if (!raw) continue;
    let id = normalizeId(raw.id, "style", ids);
    while (used.has(id)) id = ids("style");
    used.add(id);
    styles.push({
      id,
      name: text(raw.name, "Character style", 80),
      fontId: optionalText(raw.fontId, 120),
      size: typeof raw.size === "number" ? positive(raw.size, 11) : undefined,
      tracking: typeof raw.tracking === "number" ? num(raw.tracking, 0) : undefined,
      color: optionalText(raw.color, 120),
    });
  }
  return styles;
}

function normalizeStyles(value: unknown, ids: IdFactory): StyleSet {
  const raw = record(value) ?? {};
  const paragraph = normalizeParagraphStyles(raw.paragraph, ids);
  const paragraphIds = new Set(paragraph.map((style) => style.id));
  const character = normalizeCharacterStyles(raw.character, ids, paragraphIds);
  if (paragraph.length === 0) {
    const defaults = createDefaultStyles(ids);
    return { paragraph: defaults.paragraph, character };
  }
  return { paragraph, character };
}

function normalizeAssets(value: unknown, ids: IdFactory): AssetRef[] {
  const used = new Set<string>();
  const assets: AssetRef[] = [];
  for (const entry of list(value)) {
    const raw = record(entry);
    if (!raw) continue;
    let id = normalizeId(raw.id, "asset", ids);
    while (used.has(id)) id = ids("asset");
    used.add(id);
    assets.push({
      id,
      name: text(raw.name, "Asset", 160),
      storageId: optionalText(raw.storageId, 120),
      width: nonNegative(raw.width, 0),
      height: nonNegative(raw.height, 0),
      mime: optionalText(raw.mime, 80),
      tags: list(raw.tags).filter((tag): tag is string => typeof tag === "string").slice(0, 24),
    });
  }
  return assets;
}

function normalizeGuides(value: unknown, ids: IdFactory, pageIds: Set<string>): Guide[] {
  const used = new Set<string>();
  const guides: Guide[] = [];
  for (const entry of list(value)) {
    const raw = record(entry);
    if (!raw) continue;
    let id = normalizeId(raw.id, "guide", ids);
    while (used.has(id)) id = ids("guide");
    used.add(id);
    const scope = oneOf(raw.scope, ["document", "page"] as const, "document");
    const pageId = optionalText(raw.pageId, 120);
    if (scope === "page" && (!pageId || !pageIds.has(pageId))) continue;
    guides.push({
      id,
      axis: oneOf(raw.axis, ["x", "y"] as const, "x"),
      position: num(raw.position, 0),
      scope,
      pageId: scope === "page" ? pageId : undefined,
    });
  }
  return guides;
}

/* -------------------------------------------------------------------------- */
/* Document                                                                   */
/* -------------------------------------------------------------------------- */

function resolvePreset(raw: RawRecord, docType: DocType) {
  const saved = optionalText(raw.presetId, 120);
  return (
    (saved ? presetById(saved) : undefined) ??
    defaultPresetForDocType(docType) ??
    presetById(DEFAULT_PRESET_ID)!
  );
}

function fallbackSpec(docType: DocType): PageSpec {
  const preset = defaultPresetForDocType(docType);
  if (preset?.size) {
    return {
      trim: { ...preset.size },
      bleed: preset.bleed,
      margins: { ...preset.margins },
      mirrorMargins: preset.mirrorMargins,
    };
  }
  return {
    trim: { ...A4_TRIM },
    bleed: toPoints(3, "mm"),
    margins: {
      top: toPoints(10, "mm"),
      right: toPoints(10, "mm"),
      bottom: toPoints(10, "mm"),
      left: toPoints(10, "mm"),
    },
    mirrorMargins: false,
  };
}

/**
 * Repairs a saved document into a complete, internally consistent model.
 * Throws only when the input is not a document at all, or was written by a
 * newer schema version that this build cannot understand.
 */
export function normalizePublicationDocument(
  input: unknown,
  options: NormalizeOptions = {},
): PublicationDocument {
  const raw = record(input);
  if (!raw) {
    throw new TypeError("A publication document must be an object");
  }

  const version = num(raw.version, PUBLICATION_DOCUMENT_VERSION);
  if (version > PUBLICATION_DOCUMENT_VERSION) {
    throw new RangeError(
      `Document version ${version} is newer than this build supports (${PUBLICATION_DOCUMENT_VERSION})`,
    );
  }

  const ids = options.ids ?? defaultIds;
  const now = options.now ?? Date.now();

  const docType: DocType = isDocType(raw.docType)
    ? raw.docType
    : (resolvePreset(raw, "custom").docType as DocType);
  const preset = resolvePreset(raw, docType);
  const documentSpec = normalizeSpec(raw.spec, fallbackSpec(docType));
  const facingPages = bool(raw.facingPages, preset.facingPages);

  const usedMasterIds = new Set<string>();
  const usedObjectIds = new Set<string>();
  const masters: MasterPage[] = [];
  for (const entry of list(raw.masters)) {
    const master = normalizeMaster(entry, {
      ids,
      documentSpec,
      usedIds: usedMasterIds,
      usedObjectIds,
    });
    if (master) masters.push(master);
  }
  const masterIds = new Set(masters.map((master) => master.id));

  const usedPageIds = new Set<string>();
  const pages: PublicationPage[] = [];
  for (const entry of list(raw.pages)) {
    pages.push(
      normalizePage(entry, { ids, documentSpec, usedPageIds, usedObjectIds }),
    );
  }
  if (pages.length === 0) {
    pages.push(
      normalizePage(
        { name: "Page 1", spec: documentSpec },
        { ids, documentSpec, usedPageIds, usedObjectIds },
      ),
    );
  }

  for (const page of pages) {
    if (page.masterId && !masterIds.has(page.masterId)) delete page.masterId;
  }

  // Stories, then the frames that own them.
  const usedStoryIds = new Set<string>();
  const stories: Story[] = [];
  for (const entry of list(raw.stories)) {
    const story = normalizeStory(entry, ids, usedStoryIds);
    if (story) stories.push(story);
  }

  const objectIndex = new Map<string, { pageId: string; object: PublicationObject }>();
  for (const page of pages) {
    for (const object of page.objects) {
      objectIndex.set(object.id, { pageId: page.id, object });
    }
  }
  const storyIds = new Set(stories.map((story) => story.id));
  const claimed = new Map<string, string>();

  for (const story of stories) {
    const frames: StoryFrameRef[] = [];
    for (const frame of story.frames) {
      const found = objectIndex.get(frame.objectId);
      if (!found || found.pageId !== frame.pageId) continue;
      if (found.object.kind !== "text-frame") continue;
      if (claimed.has(frame.objectId)) continue;
      claimed.set(frame.objectId, story.id);
      frames.push({ pageId: frame.pageId, objectId: frame.objectId });
    }
    story.frames = frames;
  }

  for (const page of pages) {
    page.objects = page.objects.map((object) => {
      if (object.kind !== "text-frame") return object;
      const storyId = claimed.get(object.id);
      if (!storyId) {
        if (object.storyId) {
          const next = { ...object };
          delete next.storyId;
          return next;
        }
        return object;
      }
      return object.storyId === storyId ? object : { ...object, storyId };
    });
  }

  // Spreads are always derived; saved ids are kept when the page set matches.
  const savedSpreads = list(raw.spreads)
    .map((entry) => record(entry))
    .filter((entry): entry is RawRecord => entry !== null)
    .map((entry) => ({
      id: typeof entry.id === "string" ? entry.id : "",
      index: num(entry.index, 0),
      kind: oneOf(entry.kind, ["single", "facing"] as const, "single"),
      pageIds: list(entry.pageIds).filter((id): id is string => typeof id === "string"),
      gutter: nonNegative(entry.gutter, 0),
    }))
    .filter((spread) => spread.id && spread.pageIds.length > 0) as Spread[];

  const savedGutter = savedSpreads.find((spread) => spread.kind === "facing")?.gutter ?? 0;
  const planned = planSpreads(pages, { facingPages, gutter: savedGutter, ids });
  const spreads = preserveSpreadIds(planned, savedSpreads);
  const sided = assignPageSides(pages, spreads, { facingPages });

  // Keep text-frame story references consistent in one place: a frame that
  // names a story that no longer exists loses the reference.
  for (const page of sided) {
    page.objects = page.objects.map((object) =>
      object.kind === "text-frame" && object.storyId && !storyIds.has(object.storyId)
        ? (() => {
            const next = { ...object };
            delete next.storyId;
            return next;
          })()
        : object,
    );
  }

  const pageIds = new Set(sided.map((page) => page.id));
  const sides: PageSide[] = ["left", "right", "single"];

  return {
    version: PUBLICATION_DOCUMENT_VERSION,
    id: normalizeId(raw.id, "document", ids),
    title: text(raw.title, "Untitled publication", 200),
    docType,
    presetId: optionalText(raw.presetId, 120) ?? preset.id,
    displayUnit: isLengthUnit(raw.displayUnit) ? raw.displayUnit : preset.unit,
    spec: documentSpec,
    facingPages,
    grid: normalizeGrid(raw.grid),
    pages: sided.map((page) => ({
      ...page,
      side: sides.includes(page.side) ? page.side : "single",
    })),
    spreads,
    masters,
    stories,
    styles: normalizeStyles(raw.styles, ids),
    assets: normalizeAssets(raw.assets, ids),
    guides: normalizeGuides(raw.guides, ids, pageIds),
    metadata: {
      author: optionalText(record(raw.metadata)?.author, 160),
      client: optionalText(record(raw.metadata)?.client, 160),
      jobNumber: optionalText(record(raw.metadata)?.jobNumber, 80),
      language: text(record(raw.metadata)?.language, "en", 24),
      createdAt: num(record(raw.metadata)?.createdAt, now),
      updatedAt: num(record(raw.metadata)?.updatedAt, now),
    },
    extensions: record(raw.extensions) ?? undefined,
  };
}

/** A blank document at the default preset, for callers that need a start. */
export function emptyPublicationDocument(options: NormalizeOptions = {}): PublicationDocument {
  return normalizePublicationDocument(
    {
      presetId: CUSTOM_PRESET_ID,
      docType: "custom",
      title: "Untitled publication",
      spec: { trim: { width: A4_TRIM.width, height: A4_TRIM.height } },
    },
    options,
  );
}
