import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation, query, type MutationCtx } from "../_generated/server";
import { createId } from "../../lib/publishing/ids";
import {
  ALLOWED_ASSET_MIME_TYPES,
  assertValidAssetFile,
  validateAssetFile,
} from "../../lib/publishing/image-derivatives";
import { collectAssetReferences } from "../../lib/publishing/persistence";
import {
  assetMetadataView,
  assetUrls,
  deleteStorageIfUnshared,
  loadDocument,
  optionalUserId,
  requireOwnedAsset,
  requireOwnedPublication,
  requireUserId,
  storageFacts,
} from "./lib";
import { assetMetadataValidator } from "./validators";

/**
 * Print assets: the original is uploaded once and never replaced; previews are
 * separate storage ids. Every row and file is owner-scoped, and deletion
 * refuses while a page, master or named version still needs the asset.
 */

function cleanFilename(value: string): string {
  const name = value.trim().replace(/[\u0000-\u001f]/g, "").slice(0, 200);
  if (!name) throw new Error("Give this file a name.");
  return name;
}

function cleanTags(value: string[] | undefined): string[] {
  if (!value) return [];
  return [...new Set(value.map((tag) => tag.trim().slice(0, 40)).filter(Boolean))].slice(
    0,
    20,
  );
}

function cleanDimension(value: number): number {
  if (!Number.isFinite(value) || value <= 0 || value > 200_000) {
    throw new RangeError("The image dimensions are not valid.");
  }
  return Math.round(value);
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const registerAsset = mutation({
  args: {
    publicationId: v.optional(v.id("publications")),
    storageId: v.id("_storage"),
    filename: v.string(),
    mimeType: v.string(),
    width: v.number(),
    height: v.number(),
    checksum: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    metadata: v.optional(assetMetadataValidator),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    if (args.publicationId) {
      await requireOwnedPublication(ctx, args.publicationId, userId);
    }

    // Trust the storage record, not the client, for size and content type.
    const facts = await storageFacts(ctx, args.storageId);
    const mimeType = facts.contentType || args.mimeType;
    assertValidAssetFile({ mimeType, fileSize: facts.size });
    if (!(ALLOWED_ASSET_MIME_TYPES as readonly string[]).includes(mimeType)) {
      throw new Error("Use a JPEG, PNG, WebP, AVIF or TIFF image.");
    }

    const existing = await ctx.db
      .query("publicationAssets")
      .withIndex("by_original_storage", (q) =>
        q.eq("originalStorageId", args.storageId),
      )
      .first();
    if (existing) {
      throw new Error("This file is already registered.");
    }

    const now = Date.now();
    const assetId = await ctx.db.insert("publicationAssets", {
      ownerId: userId,
      ...(args.publicationId ? { publicationId: args.publicationId } : {}),
      assetId: createId("asset"),
      originalStorageId: args.storageId,
      filename: cleanFilename(args.filename),
      mimeType,
      width: cleanDimension(args.width),
      height: cleanDimension(args.height),
      fileSize: facts.size,
      ...(args.checksum ? { checksum: args.checksum.slice(0, 128) } : {}),
      tags: cleanTags(args.tags),
      metadata: args.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    });
    return { assetId, stableId: (await ctx.db.get(assetId))!.assetId };
  },
});

export const setAssetDerivatives = mutation({
  args: {
    assetId: v.id("publicationAssets"),
    proxyStorageId: v.optional(v.id("_storage")),
    thumbnailStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const asset = await requireOwnedAsset(ctx, args.assetId, userId);
    if (!args.proxyStorageId && !args.thumbnailStorageId) {
      throw new Error("Choose at least one derivative to attach.");
    }

    const patch: {
      proxyStorageId?: Id<"_storage">;
      thumbnailStorageId?: Id<"_storage">;
      updatedAt: number;
    } = { updatedAt: Date.now() };

    for (const [field, storageId] of [
      ["proxyStorageId", args.proxyStorageId],
      ["thumbnailStorageId", args.thumbnailStorageId],
    ] as const) {
      if (!storageId) continue;
      if (storageId === asset.originalStorageId) {
        throw new Error("A derivative cannot replace the original file.");
      }
      const facts = await storageFacts(ctx, storageId);
      const issues = validateAssetFile({
        mimeType: facts.contentType,
        fileSize: facts.size,
      }).filter((issue) => issue.code !== "asset/mime");
      if (issues.length > 0) throw new Error(issues.map((issue) => issue.message).join(" "));
      if (
        facts.contentType !== "image/webp" &&
        facts.contentType !== "image/jpeg"
      ) {
        throw new Error("Previews must be WebP or JPEG.");
      }
      patch[field] = storageId;
    }

    await ctx.db.patch(asset._id, patch);
    return { updatedAt: patch.updatedAt };
  },
});

export const listAssets = query({
  args: { publicationId: v.optional(v.id("publications")) },
  handler: async (ctx, args) => {
    const userId = await optionalUserId(ctx);
    if (!userId) return [];
    if (args.publicationId) {
      await requireOwnedPublication(ctx, args.publicationId, userId);
    }
    const rows = args.publicationId
      ? await ctx.db
          .query("publicationAssets")
          .withIndex("by_publication", (q) =>
            q.eq("publicationId", args.publicationId!),
          )
          .collect()
      : await ctx.db
          .query("publicationAssets")
          .withIndex("by_owner", (q) => q.eq("ownerId", userId))
          .collect();
    return await Promise.all(
      rows
        .filter((row) => row.ownerId === userId)
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(async (asset) => ({
          ...assetMetadataView(asset),
          ...(await assetUrls(ctx, asset)),
        })),
    );
  },
});

export const getAsset = query({
  args: { assetId: v.id("publicationAssets") },
  handler: async (ctx, args) => {
    const userId = await optionalUserId(ctx);
    if (!userId) throw new Error("Asset not found.");
    const asset = await requireOwnedAsset(ctx, args.assetId, userId);
    return { ...assetMetadataView(asset), ...(await assetUrls(ctx, asset)) };
  },
});

async function assertAssetUnused(
  ctx: MutationCtx,
  asset: Awaited<ReturnType<typeof requireOwnedAsset>>,
): Promise<void> {
  if (!asset.publicationId) return;
  const publication = await ctx.db.get(asset.publicationId);
  if (!publication || publication.ownerId !== asset.ownerId) {
    throw new Error("Publication data is inconsistent.");
  }
  const document = await loadDocument(ctx, publication);
  if (collectAssetReferences(document).has(asset.assetId)) {
    throw new Error("This asset is still used on a page or master.");
  }

  const versions = await ctx.db
    .query("publicationVersions")
    .withIndex("by_publication", (q) => q.eq("publicationId", publication._id))
    .collect();
  if (versions.some((version) => version.assetIds.includes(asset._id))) {
    throw new Error("This asset is needed by a saved version.");
  }
}

export const deleteAsset = mutation({
  args: { assetId: v.id("publicationAssets") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const asset = await requireOwnedAsset(ctx, args.assetId, userId);
    await assertAssetUnused(ctx, asset);

    const storageIds = [asset.originalStorageId];
    if (asset.proxyStorageId) storageIds.push(asset.proxyStorageId);
    if (asset.thumbnailStorageId) storageIds.push(asset.thumbnailStorageId);
    await ctx.db.delete(asset._id);
    for (const storageId of storageIds) {
      await deleteStorageIfUnshared(ctx, userId, storageId);
    }
    return null;
  },
});

/** Attach an asset to a publication, or detach it with `null`. */
export const associateAsset = mutation({
  args: {
    assetId: v.id("publicationAssets"),
    publicationId: v.union(v.id("publications"), v.null()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const asset = await requireOwnedAsset(ctx, args.assetId, userId);
    if (args.publicationId) {
      await requireOwnedPublication(ctx, args.publicationId, userId);
    }
    if (asset.publicationId && asset.publicationId !== args.publicationId) {
      // Moving an asset out of a publication is only safe when no page,
      // master or named version still needs it.
      await assertAssetUnused(ctx, asset);
    }
    await ctx.db.patch(asset._id, {
      publicationId: args.publicationId ?? undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});
