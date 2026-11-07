import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type {
  PublicationDocument,
  PublicationObject,
} from "../../lib/publishing/model";
import { assertValidPublicationDocument } from "../../lib/publishing/validate";
import {
  assetRecordFromDocument,
  documentFromRecords,
  masterRecordFromDocument,
  pageRecordFromDocument,
  prepareDocumentForPersistence,
  storyRecordFromDocument,
  versionSettingsFromDocument,
  type AssetRecord,
  type MasterRecord,
  type PageRecord,
  type PublicationRecord,
  type StoryRecord,
} from "../../lib/publishing/persistence";

/**
 * Shared database plumbing for the publishing functions.
 *
 * Every entry point resolves the authenticated user and checks ownership on
 * the publication row before reading children. Child rows carry ownerId as a
 * second line of defence: a mis-parented row aborts the read instead of being
 * returned to the wrong account.
 */

export type PublishingCtx = QueryCtx | MutationCtx;
export type PublicationId = Id<"publications">;

export async function requireUserId(ctx: PublishingCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error(
      "The publishing session could not be opened. Sign in and try again.",
    );
  }
  return userId as Id<"users">;
}

export async function optionalUserId(
  ctx: PublishingCtx,
): Promise<Id<"users"> | null> {
  const userId = await getAuthUserId(ctx);
  return (userId as Id<"users"> | null) ?? null;
}

export async function requireOwnedPublication(
  ctx: PublishingCtx,
  publicationId: PublicationId,
  userId: Id<"users">,
): Promise<Doc<"publications">> {
  const publication = await ctx.db.get(publicationId);
  if (!publication || publication.ownerId !== userId) {
    // Deliberately the same message for missing and foreign rows, so a
    // signed-in user cannot probe another account's publication ids.
    throw new Error("Publication not found.");
  }
  return publication;
}

export interface PublicationRows {
  pages: Doc<"publicationPages">[];
  masters: Doc<"publicationMasters">[];
  stories: Doc<"publicationStories">[];
  assets: Doc<"publicationAssets">[];
}

function assertOwnedChildren(
  rows: Array<{ ownerId: Id<"users"> }>,
  ownerId: Id<"users">,
): void {
  if (rows.some((row) => row.ownerId !== ownerId)) {
    throw new Error("Publication data is inconsistent.");
  }
}

export async function loadPublicationRows(
  ctx: PublishingCtx,
  publication: Doc<"publications">,
): Promise<PublicationRows> {
  const [pages, masters, stories, assets] = await Promise.all([
    ctx.db
      .query("publicationPages")
      .withIndex("by_publication", (q) => q.eq("publicationId", publication._id))
      .collect(),
    ctx.db
      .query("publicationMasters")
      .withIndex("by_publication", (q) => q.eq("publicationId", publication._id))
      .collect(),
    ctx.db
      .query("publicationStories")
      .withIndex("by_publication", (q) => q.eq("publicationId", publication._id))
      .collect(),
    ctx.db
      .query("publicationAssets")
      .withIndex("by_publication", (q) => q.eq("publicationId", publication._id))
      .collect(),
  ]);
  assertOwnedChildren(pages, publication.ownerId);
  assertOwnedChildren(masters, publication.ownerId);
  assertOwnedChildren(stories, publication.ownerId);
  assertOwnedChildren(assets, publication.ownerId);
  return {
    pages: pages.sort((a, b) => a.index - b.index),
    masters,
    stories,
    assets,
  };
}

export function publicationRecordFromDoc(
  publication: Doc<"publications">,
): PublicationRecord {
  return {
    _id: publication._id,
    title: publication.title,
    docType: publication.docType,
    presetId: publication.presetId,
    status: publication.status,
    documentVersion: publication.documentVersion,
    displayUnit: publication.displayUnit,
    spec: publication.spec,
    facingPages: publication.facingPages,
    defaultGutter: publication.defaultGutter,
    spreadGutters: publication.spreadGutters,
    grid: publication.grid,
    styles: publication.styles,
    guides: publication.guides,
    metadata: publication.metadata,
    ...(publication.extensions ? { extensions: publication.extensions } : {}),
    createdAt: publication.createdAt,
    updatedAt: publication.updatedAt,
  };
}

export function pageRecordFromDoc(page: Doc<"publicationPages">): PageRecord {
  return {
    pageId: page.pageId,
    index: page.index,
    side: page.side,
    ...(page.masterId ? { masterId: page.masterId } : {}),
    ...(page.masterOverrides ? { masterOverrides: page.masterOverrides } : {}),
    version: page.pageVersion,
    name: page.name,
    spec: page.spec,
    background: page.background,
    layers: page.layers,
    objects: page.objects as unknown as PublicationObject[],
    hidden: page.hidden,
  };
}

export function masterRecordFromDoc(
  master: Doc<"publicationMasters">,
): MasterRecord {
  return {
    masterId: master.masterId,
    version: master.version,
    name: master.name,
    ...(master.description ? { description: master.description } : {}),
    appliesTo: master.appliesTo,
    ...(master.spec ? { spec: master.spec } : {}),
    background: master.background,
    layers: master.layers,
    objects: master.objects as unknown as PublicationObject[],
  };
}

export function storyRecordFromDoc(story: Doc<"publicationStories">): StoryRecord {
  return {
    storyId: story.storyId,
    version: story.version,
    name: story.name,
    paragraphs: story.paragraphs,
    frames: story.frames,
    overflow: story.overflow,
    styles: story.styles,
  };
}

export function assetRecordFromDoc(asset: Doc<"publicationAssets">): AssetRecord {
  return {
    assetId: asset.assetId,
    name: asset.filename,
    storageId: asset.originalStorageId,
    width: asset.width,
    height: asset.height,
    mime: asset.mimeType,
    tags: asset.tags,
  };
}

export function documentFromRows(
  publication: Doc<"publications">,
  rows: PublicationRows,
): PublicationDocument {
  return documentFromRecords({
    publication: publicationRecordFromDoc(publication),
    pages: rows.pages.map(pageRecordFromDoc),
    masters: rows.masters.map(masterRecordFromDoc),
    stories: rows.stories.map(storyRecordFromDoc),
    assets: rows.assets.map(assetRecordFromDoc),
  });
}

export async function loadDocument(
  ctx: PublishingCtx,
  publication: Doc<"publications">,
): Promise<PublicationDocument> {
  return documentFromRows(publication, await loadPublicationRows(ctx, publication));
}

function publicationFields(
  document: PublicationDocument,
  now: number,
): Omit<
  Doc<"publications">,
  "_id" | "_creationTime" | "ownerId" | "status" | "createdAt" | "archivedAt"
> {
  const settings = versionSettingsFromDocument(document);
  return {
    title: document.title,
    docType: document.docType,
    presetId: document.presetId,
    documentVersion: document.version,
    displayUnit: document.displayUnit,
    spec: settings.spec,
    facingPages: document.facingPages,
    defaultGutter: settings.defaultGutter,
    spreadGutters: settings.spreadGutters,
    grid: settings.grid,
    styles: settings.styles,
    guides: settings.guides,
    metadata: { ...settings.metadata, updatedAt: now },
    ...(settings.extensions ? { extensions: settings.extensions } : {}),
    pageCount: document.pages.length,
    updatedAt: now,
  };
}

export async function insertPublication(
  ctx: MutationCtx,
  userId: Id<"users">,
  document: PublicationDocument,
  status: "draft" | "archived",
  now: number,
): Promise<PublicationId> {
  const fields = publicationFields(document, now);
  const publicationId = await ctx.db.insert("publications", {
    ...fields,
    ownerId: userId,
    status,
    createdAt: document.metadata.createdAt || now,
    ...(status === "archived" ? { archivedAt: now } : {}),
  });
  await insertDocumentChildren(ctx, publicationId, userId, document, now);
  return publicationId;
}

export async function insertDocumentChildren(
  ctx: MutationCtx,
  publicationId: PublicationId,
  userId: Id<"users">,
  document: PublicationDocument,
  now: number,
): Promise<void> {
  for (const [index, page] of document.pages.entries()) {
    const record = pageRecordFromDocument(page, index);
    await ctx.db.insert("publicationPages", {
      publicationId,
      ownerId: userId,
      pageId: record.pageId,
      index: record.index,
      side: record.side,
      masterId: record.masterId,
      masterOverrides: record.masterOverrides,
      pageVersion: record.version,
      name: record.name,
      spec: record.spec,
      background: record.background,
      layers: record.layers,
      objects: record.objects,
      hidden: record.hidden,
      updatedAt: now,
    });
  }
  for (const master of document.masters) {
    const record = masterRecordFromDocument(master);
    await ctx.db.insert("publicationMasters", {
      publicationId,
      ownerId: userId,
      masterId: record.masterId,
      name: record.name,
      description: record.description,
      appliesTo: record.appliesTo,
      spec: record.spec,
      background: record.background,
      layers: record.layers,
      objects: record.objects,
      version: record.version,
      updatedAt: now,
    });
  }
  for (const story of document.stories) {
    const record = storyRecordFromDocument(story, document.styles);
    await ctx.db.insert("publicationStories", {
      publicationId,
      ownerId: userId,
      storyId: record.storyId,
      name: record.name,
      paragraphs: record.paragraphs,
      frames: record.frames,
      overflow: record.overflow,
      styles: record.styles,
      version: record.version,
      updatedAt: now,
    });
  }
}

async function upsertPages(
  ctx: MutationCtx,
  publication: Doc<"publications">,
  document: PublicationDocument,
  now: number,
  existing: Doc<"publicationPages">[],
): Promise<void> {
  const byId = new Map(existing.map((page) => [page.pageId, page]));
  for (const [index, page] of document.pages.entries()) {
    const record = pageRecordFromDocument(page, index);
    const row = byId.get(record.pageId);
    if (row) {
      byId.delete(record.pageId);
      await ctx.db.patch(row._id, {
        index: record.index,
        side: record.side,
        masterId: record.masterId,
        masterOverrides: record.masterOverrides,
        pageVersion: record.version,
        name: record.name,
        spec: record.spec,
        background: record.background,
        layers: record.layers,
        objects: record.objects,
        hidden: record.hidden,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("publicationPages", {
        publicationId: publication._id,
        ownerId: publication.ownerId,
        pageId: record.pageId,
        index: record.index,
        side: record.side,
        masterId: record.masterId,
        masterOverrides: record.masterOverrides,
        pageVersion: record.version,
        name: record.name,
        spec: record.spec,
        background: record.background,
        layers: record.layers,
        objects: record.objects,
        hidden: record.hidden,
        updatedAt: now,
      });
    }
  }
  for (const row of byId.values()) {
    await ctx.db.delete(row._id);
  }
}

async function upsertMasters(
  ctx: MutationCtx,
  publication: Doc<"publications">,
  document: PublicationDocument,
  now: number,
  existing: Doc<"publicationMasters">[],
): Promise<void> {
  const byId = new Map(existing.map((master) => [master.masterId, master]));
  for (const master of document.masters) {
    const record = masterRecordFromDocument(master);
    const row = byId.get(record.masterId);
    if (row) {
      byId.delete(record.masterId);
      await ctx.db.patch(row._id, {
        name: record.name,
        description: record.description,
        appliesTo: record.appliesTo,
        spec: record.spec,
        background: record.background,
        layers: record.layers,
        objects: record.objects,
        version: record.version,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("publicationMasters", {
        publicationId: publication._id,
        ownerId: publication.ownerId,
        masterId: record.masterId,
        name: record.name,
        description: record.description,
        appliesTo: record.appliesTo,
        spec: record.spec,
        background: record.background,
        layers: record.layers,
        objects: record.objects,
        version: record.version,
        updatedAt: now,
      });
    }
  }
  for (const row of byId.values()) {
    await ctx.db.delete(row._id);
  }
}

async function upsertStories(
  ctx: MutationCtx,
  publication: Doc<"publications">,
  document: PublicationDocument,
  now: number,
  existing: Doc<"publicationStories">[],
): Promise<void> {
  const byId = new Map(existing.map((story) => [story.storyId, story]));
  for (const story of document.stories) {
    const record = storyRecordFromDocument(story, document.styles);
    const row = byId.get(record.storyId);
    if (row) {
      byId.delete(record.storyId);
      await ctx.db.patch(row._id, {
        name: record.name,
        paragraphs: record.paragraphs,
        frames: record.frames,
        overflow: record.overflow,
        styles: record.styles,
        version: record.version,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("publicationStories", {
        publicationId: publication._id,
        ownerId: publication.ownerId,
        storyId: record.storyId,
        name: record.name,
        paragraphs: record.paragraphs,
        frames: record.frames,
        overflow: record.overflow,
        styles: record.styles,
        version: record.version,
        updatedAt: now,
      });
    }
  }
  for (const row of byId.values()) {
    await ctx.db.delete(row._id);
  }
}

/**
 * Validates and writes a complete document state. Children are matched by
 * stable id, so untouched rows keep their Convex `_id` and page references do
 * not churn. Callers run inside a mutation, which Convex applies atomically.
 */
export async function saveDocumentState(
  ctx: MutationCtx,
  publication: Doc<"publications">,
  document: PublicationDocument,
  now: number,
): Promise<PublicationDocument> {
  // Reject broken references and duplicate ids instead of letting
  // normalisation silently repair a client bug, then run the compatibility
  // normaliser and its strict assertion as the final boundary.
  assertValidPublicationDocument(document);
  const prepared = prepareDocumentForPersistence(document);
  const rows = await loadPublicationRows(ctx, publication);
  await upsertPages(ctx, publication, prepared, now, rows.pages);
  await upsertMasters(ctx, publication, prepared, now, rows.masters);
  await upsertStories(ctx, publication, prepared, now, rows.stories);
  await ctx.db.patch(publication._id, publicationFields(prepared, now));
  return prepared;
}

/* -------------------------------------------------------------------------- */
/* Assets                                                                     */
/* -------------------------------------------------------------------------- */

export interface AssetUrls {
  originalUrl: string | null;
  proxyUrl: string | null;
  thumbnailUrl: string | null;
}

export async function assetUrls(
  ctx: PublishingCtx,
  asset: Doc<"publicationAssets">,
): Promise<AssetUrls> {
  const [originalUrl, proxyUrl, thumbnailUrl] = await Promise.all([
    ctx.storage.getUrl(asset.originalStorageId),
    asset.proxyStorageId ? ctx.storage.getUrl(asset.proxyStorageId) : null,
    asset.thumbnailStorageId ? ctx.storage.getUrl(asset.thumbnailStorageId) : null,
  ]);
  return { originalUrl, proxyUrl, thumbnailUrl };
}

export async function storageFacts(
  ctx: PublishingCtx,
  storageId: Id<"_storage">,
): Promise<{ size: number; contentType: string }> {
  const metadata = await ctx.db.system.get("_storage", storageId);
  if (!metadata) {
    throw new Error("The uploaded file could not be found.");
  }
  return {
    size: metadata.size,
    contentType: metadata.contentType ?? "",
  };
}

export async function requireOwnedAsset(
  ctx: PublishingCtx,
  assetRowId: Id<"publicationAssets">,
  userId: Id<"users">,
): Promise<Doc<"publicationAssets">> {
  const asset = await ctx.db.get(assetRowId);
  if (!asset || asset.ownerId !== userId) {
    throw new Error("Asset not found.");
  }
  return asset;
}

/**
 * True when a saved version of one of this owner's publications still needs
 * the asset row. Versions keep resolving their assets after the row is
 * detached from its publication, so this check cannot depend on attachment.
 */
export async function isAssetNeededByVersion(
  ctx: PublishingCtx,
  ownerId: Id<"users">,
  assetRowId: Id<"publicationAssets">,
): Promise<boolean> {
  const versions = await ctx.db
    .query("publicationVersions")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .collect();
  return versions.some((version) => version.assetIds.includes(assetRowId));
}

/**
 * Deletes a storage object only when no asset row anywhere still points at it.
 * Duplicated publications share print originals, and deleting one copy must
 * never blank the other, so the scan deliberately crosses publications and
 * owners instead of trusting the caller's scope.
 */
export async function deleteStorageIfUnshared(
  ctx: MutationCtx,
  storageId: Id<"_storage">,
): Promise<boolean> {
  const assets = await ctx.db.query("publicationAssets").collect();
  const shared = assets.some(
    (asset) =>
      asset.originalStorageId === storageId ||
      asset.proxyStorageId === storageId ||
      asset.thumbnailStorageId === storageId,
  );
  if (shared) return false;
  try {
    await ctx.storage.delete(storageId);
    return true;
  } catch {
    // The object may already be gone; removing the row still completes.
    return false;
  }
}

export function assetMetadataView(asset: Doc<"publicationAssets">) {
  return {
    _id: asset._id,
    publicationId: asset.publicationId ?? null,
    assetId: asset.assetId,
    filename: asset.filename,
    mimeType: asset.mimeType,
    width: asset.width,
    height: asset.height,
    fileSize: asset.fileSize,
    checksum: asset.checksum ?? null,
    tags: asset.tags,
    metadata: asset.metadata,
    hasProxy: asset.proxyStorageId !== undefined,
    hasThumbnail: asset.thumbnailStorageId !== undefined,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  };
}

export function mapAssetRecords(rows: Doc<"publicationAssets">[]): AssetRecord[] {
  return rows.map(assetRecordFromDoc);
}

export function assetRecordForCopy(
  asset: Doc<"publicationAssets">,
  assetId: string,
): AssetRecord {
  return assetRecordFromDocument({
    id: assetId,
    name: asset.filename,
    storageId: asset.originalStorageId,
    width: asset.width,
    height: asset.height,
    mime: asset.mimeType,
    tags: asset.tags,
  });
}
