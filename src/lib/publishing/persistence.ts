/**
 * Persistence domain layer for LAMSA Publishing Studio.
 *
 * Convex stores a publication as a small header row plus one row per page,
 * master, story and asset. This module is the only place that knows how those
 * rows map to the Phase 1 `PublicationDocument`, so the database functions can
 * stay transactional and authorisation-focused while the mapping is testable
 * in plain Node.
 *
 * Geometry stays in PDF points, exactly as the foundation defines it. Nothing
 * here converts to millimetres: display units are presentation only.
 */

import {
  PUBLICATION_DOCUMENT_VERSION,
  type Background,
  type DocType,
  type DocumentMetadata,
  type Edges,
  type GridSettings,
  type Guide,
  type Layer,
  type MasterPage,
  type PageSide,
  type PageSpec,
  type ParagraphStyle,
  type CharacterStyle,
  type PublicationDocument,
  type PublicationObject,
  type PublicationPage,
  type Story,
  type StoryFrameRef,
  type StyleSet,
  type AssetRef,
} from "./model";
import { defaultIds, type IdFactory } from "./ids";
import { assignPageSides, planSpreads } from "./spreads";
import { normalizePublicationDocument } from "./normalize";
import { assertValidPublicationDocument } from "./validate";
import type { LengthUnit } from "./units";

export type PublicationStatus = "draft" | "archived";

export interface SpreadGutterOverride {
  firstPageId: string;
  gutter: number;
}

/** The publication row as the mapper needs it, independent of Convex. */
export interface PublicationRecord {
  /** The Convex row id, used as the document id until a duplicate is made. */
  _id: string;
  title: string;
  docType: DocType;
  presetId: string;
  status: PublicationStatus;
  documentVersion: number;
  displayUnit: LengthUnit;
  spec: PageSpec;
  facingPages: boolean;
  defaultGutter: number;
  spreadGutters: SpreadGutterOverride[];
  grid: GridSettings;
  styles: StyleSet;
  guides: Guide[];
  metadata: DocumentMetadata;
  extensions?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface PageRecord {
  pageId: string;
  index: number;
  side: PageSide;
  masterId?: string;
  version: number;
  name: string;
  spec: PageSpec;
  background: Background;
  layers: Layer[];
  objects: PublicationObject[];
  hidden: boolean;
}

export interface MasterRecord {
  masterId: string;
  version: number;
  name: string;
  appliesTo: MasterPage["appliesTo"];
  spec?: PageSpec;
  background: Background;
  layers: Layer[];
  objects: PublicationObject[];
}

export interface StoryRecord {
  storyId: string;
  version: number;
  name: string;
  paragraphs: Story["paragraphs"];
  frames: StoryFrameRef[];
  overflow: Story["overflow"];
  styles: StyleSet;
}

export interface AssetRecord {
  assetId: string;
  name: string;
  storageId?: string;
  width: number;
  height: number;
  mime?: string;
  tags: string[];
}

export interface PublicationRecords {
  publication: PublicationRecord;
  pages: PageRecord[];
  masters: MasterRecord[];
  stories: StoryRecord[];
  assets: AssetRecord[];
}

/** Publication settings captured with a named version. */
export interface VersionSettings {
  title: string;
  docType: DocType;
  presetId: string;
  displayUnit: LengthUnit;
  spec: PageSpec;
  facingPages: boolean;
  defaultGutter: number;
  spreadGutters: SpreadGutterOverride[];
  grid: GridSettings;
  styles: StyleSet;
  guides: Guide[];
  metadata: DocumentMetadata;
  extensions?: Record<string, unknown>;
}

export interface VersionContents {
  publicationId: string;
  documentVersion: number;
  settings: VersionSettings;
  pages: PageRecord[];
  masters: MasterRecord[];
  stories: StoryRecord[];
  assets: AssetRecord[];
}

function spreadIdFor(pageIds: readonly string[]): string {
  return `spread_${pageIds.join("_")}`;
}

function pageSpecOf(spec: PageSpec): PageSpec {
  return {
    trim: { ...spec.trim },
    bleed: spec.bleed,
    margins: { ...spec.margins },
    mirrorMargins: spec.mirrorMargins,
  };
}

function backgroundOf(background: Background): Background {
  return { ...background };
}

function layerCopy(layer: Layer): Layer {
  return { ...layer };
}

function objectCopy(object: PublicationObject): PublicationObject {
  return {
    ...object,
    frame: { ...object.frame },
    ...(object.kind === "text-frame" ? { inset: { ...object.inset } } : {}),
    ...(object.kind === "image-frame"
      ? { crop: { ...object.crop }, ...(object.focal ? { focal: { ...object.focal } } : {}) }
      : {}),
    ...(object.kind === "line" && object.dash ? { dash: [...object.dash] } : {}),
  } as PublicationObject;
}

function styleSetCopy(styles: StyleSet): StyleSet {
  return {
    paragraph: styles.paragraph.map((style) => ({ ...style })),
    character: styles.character.map((style) => ({ ...style })),
  };
}

/**
 * Rebuilds the spread plan and page sides for an ordered page list. The
 * default gutter belongs to the publication; a spread may override it by the
 * id of its first page.
 */
export function withSpreads(
  pages: PublicationPage[],
  facingPages: boolean,
  defaultGutter: number,
  overrides: readonly SpreadGutterOverride[] = [],
): { pages: PublicationPage[]; spreads: ReturnType<typeof planSpreads> } {
  const planned = planSpreads(pages, {
    facingPages,
    gutter: defaultGutter,
    ids: defaultIds,
  }).map((spread) => ({
    ...spread,
    id: spreadIdFor(spread.pageIds),
    gutter:
      overrides.find((entry) => entry.firstPageId === spread.pageIds[0])?.gutter ??
      spread.gutter,
  }));
  const sided = assignPageSides(pages, planned, { facingPages });
  return { pages: sided, spreads: planned };
}

/** Applies stored per-spread gutters to a document rebuilt by normalisation. */
export function applySpreadGutters(
  document: PublicationDocument,
  overrides: readonly SpreadGutterOverride[],
): PublicationDocument {
  if (overrides.length === 0) return document;
  return {
    ...document,
    spreads: document.spreads.map((spread) => ({
      ...spread,
      gutter:
        overrides.find((entry) => entry.firstPageId === spread.pageIds[0])?.gutter ??
        spread.gutter,
    })),
  };
}

/* -------------------------------------------------------------------------- */
/* Records -> document                                                        */
/* -------------------------------------------------------------------------- */

export function documentFromRecords(records: PublicationRecords): PublicationDocument {
  const { publication } = records;

  const ordered = [...records.pages].sort((a, b) => a.index - b.index);
  const rawPages: PublicationPage[] = ordered.map((page) => ({
    version: page.version,
    id: page.pageId,
    name: page.name,
    side: page.side,
    ...(page.masterId ? { masterId: page.masterId } : {}),
    spec: pageSpecOf(page.spec),
    background: backgroundOf(page.background),
    layers: page.layers.map(layerCopy),
    objects: page.objects.map(objectCopy),
    hidden: page.hidden,
  }));

  const { pages, spreads } = withSpreads(
    rawPages,
    publication.facingPages,
    publication.defaultGutter,
    publication.spreadGutters,
  );

  return {
    version: publication.documentVersion,
    id: publication._id,
    title: publication.title,
    docType: publication.docType,
    presetId: publication.presetId,
    displayUnit: publication.displayUnit,
    spec: pageSpecOf(publication.spec),
    facingPages: publication.facingPages,
    grid: { ...publication.grid },
    pages,
    spreads,
    masters: records.masters.map((master) => ({
      version: master.version,
      id: master.masterId,
      name: master.name,
      appliesTo: master.appliesTo,
      ...(master.spec ? { spec: pageSpecOf(master.spec) } : {}),
      background: backgroundOf(master.background),
      layers: master.layers.map(layerCopy),
      objects: master.objects.map(objectCopy),
    })),
    stories: records.stories.map((story) => ({
      version: story.version,
      id: story.storyId,
      name: story.name,
      paragraphs: story.paragraphs.map((paragraph) => ({
        ...paragraph,
        runs: paragraph.runs.map((run) => ({ ...run })),
      })),
      frames: story.frames.map((frame) => ({ ...frame })),
      overflow: story.overflow,
    })),
    styles: styleSetCopy(publication.styles),
    assets: records.assets.map((asset) => ({
      id: asset.assetId,
      name: asset.name,
      ...(asset.storageId ? { storageId: asset.storageId } : {}),
      width: asset.width,
      height: asset.height,
      ...(asset.mime ? { mime: asset.mime } : {}),
      tags: [...asset.tags],
    })),
    guides: publication.guides.map((guide) => ({ ...guide })),
    metadata: { ...publication.metadata },
    ...(publication.extensions ? { extensions: { ...publication.extensions } } : {}),
  };
}

/* -------------------------------------------------------------------------- */
/* Document -> records                                                        */
/* -------------------------------------------------------------------------- */

export function versionSettingsFromDocument(
  document: PublicationDocument,
): VersionSettings {
  return {
    title: document.title,
    docType: document.docType,
    presetId: document.presetId,
    displayUnit: document.displayUnit,
    spec: pageSpecOf(document.spec),
    facingPages: document.facingPages,
    defaultGutter:
      document.spreads.find((spread) => spread.kind === "facing")?.gutter ?? 0,
    spreadGutters: document.spreads
      .filter((spread) => spread.kind === "facing")
      .map((spread) => ({
        firstPageId: spread.pageIds[0]!,
        gutter: spread.gutter,
      })),
    grid: { ...document.grid },
    styles: styleSetCopy(document.styles),
    guides: document.guides.map((guide) => ({ ...guide })),
    metadata: { ...document.metadata },
    ...(document.extensions ? { extensions: { ...document.extensions } } : {}),
  };
}

export function pageRecordFromDocument(
  page: PublicationPage,
  index: number,
): PageRecord {
  return {
    pageId: page.id,
    index,
    side: page.side,
    ...(page.masterId ? { masterId: page.masterId } : {}),
    version: page.version,
    name: page.name,
    spec: pageSpecOf(page.spec),
    background: backgroundOf(page.background),
    layers: page.layers.map(layerCopy),
    objects: page.objects.map(objectCopy),
    hidden: page.hidden,
  };
}

export function masterRecordFromDocument(master: MasterPage): MasterRecord {
  return {
    masterId: master.id,
    version: master.version,
    name: master.name,
    appliesTo: master.appliesTo,
    ...(master.spec ? { spec: pageSpecOf(master.spec) } : {}),
    background: backgroundOf(master.background),
    layers: master.layers.map(layerCopy),
    objects: master.objects.map(objectCopy),
  };
}

export function storyRecordFromDocument(story: Story, styles: StyleSet): StoryRecord {
  return {
    storyId: story.id,
    version: story.version,
    name: story.name,
    paragraphs: story.paragraphs.map((paragraph) => ({
      ...paragraph,
      runs: paragraph.runs.map((run) => ({ ...run })),
    })),
    frames: story.frames.map((frame) => ({ ...frame })),
    overflow: story.overflow,
    styles: styleSetCopy(styles),
  };
}

export function assetRecordFromDocument(asset: AssetRef): AssetRecord {
  return {
    assetId: asset.id,
    name: asset.name,
    ...(asset.storageId ? { storageId: asset.storageId } : {}),
    width: asset.width,
    height: asset.height,
    ...(asset.mime ? { mime: asset.mime } : {}),
    tags: [...asset.tags],
  };
}

export function recordsFromDocument(
  document: PublicationDocument,
  header: {
    _id: string;
    status: PublicationStatus;
    createdAt: number;
    updatedAt: number;
  },
): PublicationRecords {
  return {
    publication: {
      ...header,
      title: document.title,
      docType: document.docType,
      presetId: document.presetId,
      documentVersion: document.version,
      displayUnit: document.displayUnit,
      spec: pageSpecOf(document.spec),
      facingPages: document.facingPages,
      defaultGutter:
        document.spreads.find((spread) => spread.kind === "facing")?.gutter ?? 0,
      spreadGutters: document.spreads
        .filter((spread) => spread.kind === "facing")
        .map((spread) => ({
          firstPageId: spread.pageIds[0]!,
          gutter: spread.gutter,
        })),
      grid: { ...document.grid },
      styles: styleSetCopy(document.styles),
      guides: document.guides.map((guide) => ({ ...guide })),
      metadata: { ...document.metadata },
      ...(document.extensions ? { extensions: { ...document.extensions } } : {}),
    },
    pages: document.pages.map((page, index) => pageRecordFromDocument(page, index)),
    masters: document.masters.map(masterRecordFromDocument),
    stories: document.stories.map((story) =>
      storyRecordFromDocument(story, document.styles),
    ),
    assets: document.assets.map(assetRecordFromDocument),
  };
}

export function versionContentsFromDocument(
  document: PublicationDocument,
  publicationId: string,
): VersionContents {
  return {
    publicationId,
    documentVersion: document.version,
    settings: versionSettingsFromDocument(document),
    pages: document.pages.map((page, index) => pageRecordFromDocument(page, index)),
    masters: document.masters.map(masterRecordFromDocument),
    stories: document.stories.map((story) =>
      storyRecordFromDocument(story, document.styles),
    ),
    assets: document.assets.map(assetRecordFromDocument),
  };
}

export function documentFromVersionContents(contents: VersionContents): PublicationDocument {
  return documentFromRecords({
    publication: {
      _id: contents.publicationId,
      status: "draft",
      createdAt: contents.settings.metadata.createdAt,
      updatedAt: contents.settings.metadata.updatedAt,
      documentVersion: contents.documentVersion,
      ...contents.settings,
    },
    pages: contents.pages,
    masters: contents.masters,
    stories: contents.stories,
    assets: contents.assets,
  });
}

/* -------------------------------------------------------------------------- */
/* Persistence boundary                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Repairs compatible legacy input and then rejects anything structurally
 * invalid. A future document version is rejected by normalisation before this
 * point, so an older build can never silently rewrite newer work.
 */
export function prepareDocumentForPersistence(
  document: PublicationDocument,
): PublicationDocument {
  const normalized = normalizePublicationDocument(document);
  assertValidPublicationDocument(normalized);
  return normalized;
}

/* -------------------------------------------------------------------------- */
/* Duplication                                                                */
/* -------------------------------------------------------------------------- */

export interface DuplicateResult {
  document: PublicationDocument;
  /** Old asset id -> new asset id, so the handler can copy asset rows. */
  assetIds: Map<string, string>;
}

function remapStyles(styles: StyleSet, styleIds: Map<string, string>): StyleSet {
  const paragraph = styles.paragraph.map((style: ParagraphStyle) => ({
    ...style,
    id: styleIds.get(style.id) ?? style.id,
  }));
  const character = styles.character.map((style: CharacterStyle) => ({
    ...style,
    id: styleIds.get(style.id) ?? style.id,
  }));
  return { paragraph, character };
}

/**
 * Rebuilds every stable id in a document while preserving internal
 * references: story frames follow their pages and frames, text frames follow
 * their stories, objects follow their layers and groups, and image frames
 * follow duplicated assets. Used by `duplicatePublication`.
 */
export function remapDocumentForDuplicate(
  document: PublicationDocument,
  ids: IdFactory = defaultIds,
  now = Date.now(),
): DuplicateResult {
  const pageIds = new Map(document.pages.map((page) => [page.id, ids("page")]));
  const masterIds = new Map(document.masters.map((master) => [master.id, ids("master")]));
  const storyIds = new Map(document.stories.map((story) => [story.id, ids("story")]));
  const assetIds = new Map(document.assets.map((asset) => [asset.id, ids("asset")]));
  const styleIds = new Map(
    [...document.styles.paragraph, ...document.styles.character].map((style) => [
      style.id,
      ids("style"),
    ]),
  );
  const layerIds = new Map<string, string>();
  const objectIds = new Map<string, string>();
  const groupIds = new Map<string, string>();
  const guideIds = new Map(document.guides.map((guide) => [guide.id, ids("guide")]));

  for (const page of document.pages) {
    for (const layer of page.layers) layerIds.set(layer.id, ids("layer"));
    for (const object of page.objects) {
      objectIds.set(object.id, ids("object"));
      if (object.groupId && !groupIds.has(object.groupId)) {
        groupIds.set(object.groupId, `group_${ids("object").slice("object_".length)}`);
      }
    }
  }
  for (const master of document.masters) {
    for (const layer of master.layers) layerIds.set(layer.id, ids("layer"));
    for (const object of master.objects) {
      objectIds.set(object.id, ids("object"));
      if (object.groupId && !groupIds.has(object.groupId)) {
        groupIds.set(object.groupId, `group_${ids("object").slice("object_".length)}`);
      }
    }
  }

  const mapObject = (object: PublicationObject): PublicationObject => {
    const next = objectCopy(object);
    return {
      ...next,
      id: objectIds.get(object.id) ?? object.id,
      layerId: layerIds.get(object.layerId) ?? object.layerId,
      ...(object.groupId
        ? { groupId: groupIds.get(object.groupId) ?? object.groupId }
        : {}),
      ...(object.styleId
        ? { styleId: styleIds.get(object.styleId) ?? object.styleId }
        : {}),
      ...(next.kind === "text-frame" && next.storyId
        ? { storyId: storyIds.get(next.storyId) ?? next.storyId }
        : {}),
      ...(next.kind === "image-frame" && next.assetId
        ? { assetId: assetIds.get(next.assetId) ?? next.assetId }
        : {}),
    } as PublicationObject;
  };

  const pages: PublicationPage[] = document.pages.map((page) => ({
    ...page,
    id: pageIds.get(page.id) ?? page.id,
    ...(page.masterId
      ? { masterId: masterIds.get(page.masterId) ?? page.masterId }
      : {}),
    background: {
      ...page.background,
      ...(page.background.assetId
        ? { assetId: assetIds.get(page.background.assetId) ?? page.background.assetId }
        : {}),
    },
    layers: page.layers.map((layer) => ({
      ...layer,
      id: layerIds.get(layer.id) ?? layer.id,
    })),
    objects: page.objects.map(mapObject),
  }));

  const masters: MasterPage[] = document.masters.map((master) => ({
    ...master,
    id: masterIds.get(master.id) ?? master.id,
    background: {
      ...master.background,
      ...(master.background.assetId
        ? { assetId: assetIds.get(master.background.assetId) ?? master.background.assetId }
        : {}),
    },
    layers: master.layers.map((layer) => ({
      ...layer,
      id: layerIds.get(layer.id) ?? layer.id,
    })),
    objects: master.objects.map(mapObject),
  }));

  const stories: Story[] = document.stories.map((story) => ({
    ...story,
    id: storyIds.get(story.id) ?? story.id,
    paragraphs: story.paragraphs.map((paragraph) => ({
      ...paragraph,
      ...(paragraph.styleId
        ? { styleId: styleIds.get(paragraph.styleId) ?? paragraph.styleId }
        : {}),
      runs: paragraph.runs.map((run) => ({
        ...run,
        ...(run.styleId ? { styleId: styleIds.get(run.styleId) ?? run.styleId } : {}),
      })),
    })),
    frames: story.frames.map((frame) => ({
      pageId: pageIds.get(frame.pageId) ?? frame.pageId,
      objectId: objectIds.get(frame.objectId) ?? frame.objectId,
    })),
  }));

  const guides: Guide[] = document.guides.map((guide) => ({
    ...guide,
    id: guideIds.get(guide.id) ?? guide.id,
    ...(guide.pageId
      ? { pageId: pageIds.get(guide.pageId) ?? guide.pageId }
      : {}),
  }));

  const spreadGutters: SpreadGutterOverride[] = document.spreads
    .filter((spread) => spread.kind === "facing")
    .map((spread) => ({
      firstPageId: pageIds.get(spread.pageIds[0]!) ?? spread.pageIds[0]!,
      gutter: spread.gutter,
    }));

  const next: PublicationDocument = prepareDocumentForPersistence({
    ...document,
    id: ids("document"),
    pages,
    spreads: [],
    masters,
    stories,
    styles: remapStyles(document.styles, styleIds),
    assets: document.assets.map((asset) => ({
      ...asset,
      id: assetIds.get(asset.id) ?? asset.id,
      tags: [...asset.tags],
    })),
    guides,
    metadata: { ...document.metadata, createdAt: now, updatedAt: now },
  });
  return { document: applySpreadGutters(next, spreadGutters), assetIds };
}

/* -------------------------------------------------------------------------- */
/* Asset references                                                           */
/* -------------------------------------------------------------------------- */

/** Asset ids referenced by page/master content (not the asset list itself). */
export function collectAssetReferences(document: PublicationDocument): Set<string> {
  const referenced = new Set<string>();

  const visit = (value: unknown, depth: number) => {
    if (depth > 8 || value === null || value === undefined) return;
    if (Array.isArray(value)) {
      for (const entry of value) visit(entry, depth + 1);
      return;
    }
    if (typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    if (typeof record.assetId === "string") referenced.add(record.assetId);
    for (const entry of Object.values(record)) visit(entry, depth + 1);
  };

  for (const page of document.pages) {
    visit(page.background, 0);
    visit(page.objects, 0);
  }
  for (const master of document.masters) {
    visit(master.background, 0);
    visit(master.objects, 0);
  }
  return referenced;
}

export function remapPageForDuplicate(
  page: PublicationPage,
  ids: IdFactory = defaultIds,
): PublicationPage {
  const layerIds = new Map(page.layers.map((layer) => [layer.id, ids("layer")]));
  const objectIds = new Map(page.objects.map((object) => [object.id, ids("object")]));
  const groupIds = new Map<string, string>();
  for (const object of page.objects) {
    if (object.groupId && !groupIds.has(object.groupId)) {
      groupIds.set(object.groupId, `group_${ids("object").slice("object_".length)}`);
    }
  }
  return {
    ...page,
    id: ids("page"),
    layers: page.layers.map((layer) => ({
      ...layer,
      id: layerIds.get(layer.id) ?? layer.id,
    })),
    objects: page.objects.map((object) => ({
      ...objectCopy(object),
      id: objectIds.get(object.id) ?? object.id,
      layerId: layerIds.get(object.layerId) ?? object.layerId,
      ...(object.groupId
        ? { groupId: groupIds.get(object.groupId) ?? object.groupId }
        : {}),
      // A duplicated page starts outside any story thread; its frames must
      // be threaded explicitly before they can flow the original text.
      ...(object.kind === "text-frame" ? { storyId: undefined } : {}),
    })) as PublicationObject[],
  };
}

export function assertDocumentVersionSupported(version: number): void {
  if (version > PUBLICATION_DOCUMENT_VERSION) {
    throw new RangeError(
      `Document version ${version} is newer than this build supports (${PUBLICATION_DOCUMENT_VERSION})`,
    );
  }
}

export function marginsOf(spec: PageSpec): Edges {
  return { ...spec.margins };
}
