import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import { createDocument } from "../../lib/publishing/factory";
import {
  prepareDocumentForPersistence,
  remapDocumentForDuplicate,
  withSpreads,
} from "../../lib/publishing/persistence";
import type { PublicationDocument } from "../../lib/publishing/model";
import {
  assetMetadataView,
  assetUrls,
  deleteStorageIfUnshared,
  insertPublication,
  loadDocument,
  loadPublicationRows,
  optionalUserId,
  requireOwnedPublication,
  requireUserId,
  saveDocumentState,
} from "./lib";
import {
  docTypeValidator,
  lengthUnitValidator,
  publicationSettingsValidator,
  publicationStatusValidator,
  sizeValidator,
} from "./validators";

/**
 * Publication lifecycle. Every read and write resolves the signed-in owner and
 * scopes rows by that owner; no client-supplied ownerId is trusted.
 */

export const listMine = query({
  args: { status: v.optional(publicationStatusValidator) },
  handler: async (ctx, args) => {
    const userId = await optionalUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("publications")
      .withIndex("by_owner_updated", (q) => q.eq("ownerId", userId))
      .collect();
    return rows
      .filter((row) => !args.status || row.status === args.status)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((row) => ({
        _id: row._id,
        title: row.title,
        docType: row.docType,
        presetId: row.presetId,
        status: row.status,
        pageCount: row.pageCount,
        facingPages: row.facingPages,
        displayUnit: row.displayUnit,
        spec: row.spec,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }));
  },
});

export const getMine = query({
  args: { publicationId: v.id("publications") },
  handler: async (ctx, args) => {
    const userId = await optionalUserId(ctx);
    if (!userId) throw new Error("Publication not found.");
    const publication = await requireOwnedPublication(ctx, args.publicationId, userId);
    const rows = await loadPublicationRows(ctx, publication);
    const document = await loadDocument(ctx, publication);
    const assets = await Promise.all(
      rows.assets.map(async (asset) => ({
        ...assetMetadataView(asset),
        ...(await assetUrls(ctx, asset)),
      })),
    );
    return {
      publication,
      document,
      assets,
    };
  },
});

export const createPublication = mutation({
  args: {
    presetId: v.optional(v.string()),
    docType: v.optional(docTypeValidator),
    title: v.optional(v.string()),
    trim: v.optional(sizeValidator),
    pageCount: v.optional(v.number()),
    facingPages: v.optional(v.boolean()),
    displayUnit: v.optional(lengthUnitValidator),
    defaultGutter: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const now = Date.now();
    let document = createDocument({
      presetId: args.presetId,
      docType: args.docType,
      title: args.title,
      trim: args.trim,
      pageCount: args.pageCount,
      facingPages: args.facingPages,
      displayUnit: args.displayUnit,
      now,
    });

    const gutter = args.defaultGutter;
    if (gutter !== undefined && Number.isFinite(gutter) && gutter >= 0) {
      const plan = withSpreads(document.pages, document.facingPages, gutter);
      document = { ...document, pages: plan.pages, spreads: plan.spreads };
    }
    document = prepareDocumentForPersistence(document);
    const publicationId = await insertPublication(ctx, userId, document, "draft", now);
    return { publicationId };
  },
});

function applySettings(
  document: PublicationDocument,
  settings: {
    title?: string;
    docType?: PublicationDocument["docType"];
    presetId?: string;
    displayUnit?: PublicationDocument["displayUnit"];
    spec?: PublicationDocument["spec"];
    facingPages?: boolean;
    grid?: PublicationDocument["grid"];
    metadata?: PublicationDocument["metadata"];
  },
): PublicationDocument {
  let next = document;
  if (settings.title !== undefined) {
    const title = settings.title.trim().slice(0, 200);
    if (!title) throw new Error("Give this publication a title.");
    next = { ...next, title };
  }
  if (settings.docType !== undefined) next = { ...next, docType: settings.docType };
  if (settings.presetId !== undefined) next = { ...next, presetId: settings.presetId };
  if (settings.displayUnit !== undefined) {
    next = { ...next, displayUnit: settings.displayUnit };
  }
  if (settings.spec !== undefined) next = { ...next, spec: settings.spec };
  if (settings.facingPages !== undefined) {
    next = { ...next, facingPages: settings.facingPages };
  }
  if (settings.grid !== undefined) next = { ...next, grid: settings.grid };
  if (settings.metadata !== undefined) next = { ...next, metadata: settings.metadata };
  return next;
}

export const updatePublication = mutation({
  args: {
    publicationId: v.id("publications"),
    settings: publicationSettingsValidator,
    /** `publication.updatedAt` from the state the client edited. */
    expectedUpdatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const publication = await requireOwnedPublication(ctx, args.publicationId, userId);
    if (
      args.expectedUpdatedAt !== undefined &&
      args.expectedUpdatedAt !== publication.updatedAt
    ) {
      throw new Error("This publication changed elsewhere. Reload it and try again.");
    }
    const document = await loadDocument(ctx, publication);
    let next = applySettings(document, args.settings);

    const gutter = args.settings.defaultGutter;
    if (gutter !== undefined) {
      if (!Number.isFinite(gutter) || gutter < 0) {
        throw new RangeError("The spread gutter cannot be negative.");
      }
      const plan = withSpreads(next.pages, next.facingPages, gutter);
      next = { ...next, pages: plan.pages, spreads: plan.spreads };
    } else if (args.settings.facingPages !== undefined) {
      const plan = withSpreads(
        next.pages,
        next.facingPages,
        publication.defaultGutter,
      );
      next = { ...next, pages: plan.pages, spreads: plan.spreads };
    }

    const now = Date.now();
    await saveDocumentState(ctx, publication, next, now);
    return { updatedAt: now };
  },
});

export const duplicatePublication = mutation({
  args: {
    publicationId: v.id("publications"),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const publication = await requireOwnedPublication(ctx, args.publicationId, userId);
    const rows = await loadPublicationRows(ctx, publication);
    const document = await loadDocument(ctx, publication);
    const now = Date.now();

    const { document: copy, assetIds } = remapDocumentForDuplicate(
      document,
      undefined,
      now,
    );
    copy.title = (args.title?.trim() || `${publication.title} (copy)`).slice(0, 200);

    const publicationId = await insertPublication(ctx, userId, copy, "draft", now);

    for (const asset of rows.assets) {
      const assetId = assetIds.get(asset.assetId);
      if (!assetId) continue;
      await ctx.db.insert("publicationAssets", {
        ownerId: userId,
        publicationId,
        assetId,
        originalStorageId: asset.originalStorageId,
        ...(asset.proxyStorageId ? { proxyStorageId: asset.proxyStorageId } : {}),
        ...(asset.thumbnailStorageId
          ? { thumbnailStorageId: asset.thumbnailStorageId }
          : {}),
        filename: asset.filename,
        mimeType: asset.mimeType,
        width: asset.width,
        height: asset.height,
        fileSize: asset.fileSize,
        ...(asset.checksum ? { checksum: asset.checksum } : {}),
        tags: asset.tags,
        metadata: asset.metadata,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { publicationId };
  },
});

export const archivePublication = mutation({
  args: { publicationId: v.id("publications") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const publication = await requireOwnedPublication(ctx, args.publicationId, userId);
    if (publication.status === "archived") return { status: "archived" };
    await ctx.db.patch(publication._id, {
      status: "archived",
      archivedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { status: "archived" };
  },
});

export const unarchivePublication = mutation({
  args: { publicationId: v.id("publications") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const publication = await requireOwnedPublication(ctx, args.publicationId, userId);
    if (publication.status === "draft") return { status: "draft" };
    await ctx.db.patch(publication._id, {
      status: "draft",
      archivedAt: undefined,
      updatedAt: Date.now(),
    });
    return { status: "draft" };
  },
});

async function deleteStorageIds(
  ctx: Parameters<typeof deleteStorageIfUnshared>[0],
  ids: Id<"_storage">[],
): Promise<void> {
  for (const storageId of new Set(ids)) {
    await deleteStorageIfUnshared(ctx, storageId);
  }
}

export const deletePublication = mutation({
  args: { publicationId: v.id("publications") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const publication = await requireOwnedPublication(ctx, args.publicationId, userId);
    const rows = await loadPublicationRows(ctx, publication);

    const versions = await ctx.db
      .query("publicationVersions")
      .withIndex("by_publication", (q) => q.eq("publicationId", publication._id))
      .collect();
    for (const version of versions) {
      if (version.ownerId !== userId) throw new Error("Publication data is inconsistent.");
      const [versionPages, versionMasters, versionStories] = await Promise.all([
        ctx.db
          .query("publicationVersionPages")
          .withIndex("by_version", (q) => q.eq("versionId", version._id))
          .collect(),
        ctx.db
          .query("publicationVersionMasters")
          .withIndex("by_version", (q) => q.eq("versionId", version._id))
          .collect(),
        ctx.db
          .query("publicationVersionStories")
          .withIndex("by_version", (q) => q.eq("versionId", version._id))
          .collect(),
      ]);
      for (const child of [...versionPages, ...versionMasters, ...versionStories]) {
        await ctx.db.delete(child._id);
      }
      await ctx.db.delete(version._id);
    }

    const storageIds: Id<"_storage">[] = [];
    for (const asset of rows.assets) {
      storageIds.push(asset.originalStorageId);
      if (asset.proxyStorageId) storageIds.push(asset.proxyStorageId);
      if (asset.thumbnailStorageId) storageIds.push(asset.thumbnailStorageId);
      await ctx.db.delete(asset._id);
    }
    for (const row of [...rows.pages, ...rows.masters, ...rows.stories]) {
      await ctx.db.delete(row._id);
    }

    await ctx.db.delete(publication._id);
    // Rows are gone first, so only files no remaining asset row references
    // (in any publication, including duplicates) are deleted.
    await deleteStorageIds(ctx, storageIds);
    return null;
  },
});
