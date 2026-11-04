import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import {
  assetRecordFromDoc,
  loadDocument,
  loadPublicationRows,
  requireOwnedPublication,
  requireUserId,
  saveDocumentState,
} from "./lib";
import {
  documentFromVersionContents,
  prepareDocumentForPersistence,
  versionContentsFromDocument,
  type MasterRecord,
  type PageRecord,
  type StoryRecord,
  type VersionContents,
} from "../../lib/publishing/persistence";
import type { PublicationDocument } from "../../lib/publishing/model";

/**
 * Named versions store publication settings on the version row and each page,
 * master and story in a child table. A restore validates the whole snapshot,
 * including every asset row it needs, before replacing current state; a
 * missing or foreign record aborts with nothing written.
 */

function pageRecordFromVersion(row: Doc<"publicationVersionPages">): PageRecord {
  return {
    pageId: row.pageId,
    index: row.index,
    side: row.side,
    ...(row.masterId ? { masterId: row.masterId } : {}),
    version: row.pageVersion,
    name: row.name,
    spec: row.spec,
    background: row.background,
    layers: row.layers,
    objects: row.objects as unknown as PageRecord["objects"],
    hidden: row.hidden,
  };
}

function masterRecordFromVersion(
  row: Doc<"publicationVersionMasters">,
): MasterRecord {
  return {
    masterId: row.masterId,
    version: row.version,
    name: row.name,
    appliesTo: row.appliesTo,
    ...(row.spec ? { spec: row.spec } : {}),
    background: row.background,
    layers: row.layers,
    objects: row.objects as unknown as MasterRecord["objects"],
  };
}

function storyRecordFromVersion(
  row: Doc<"publicationVersionStories">,
): StoryRecord {
  return {
    storyId: row.storyId,
    version: row.version,
    name: row.name,
    paragraphs: row.paragraphs,
    frames: row.frames,
    overflow: row.overflow,
    styles: row.styles,
  };
}

export const createVersion = mutation({
  args: {
    publicationId: v.id("publications"),
    label: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const publication = await requireOwnedPublication(ctx, args.publicationId, userId);
    const label = args.label.trim().slice(0, 120);
    if (!label) throw new Error("Give this version a name.");

    const document = await loadDocument(ctx, publication);
    const rows = await loadPublicationRows(ctx, publication);
    const contents = versionContentsFromDocument(document, publication._id);

    const versions = await ctx.db
      .query("publicationVersions")
      .withIndex("by_publication", (q) => q.eq("publicationId", publication._id))
      .collect();
    const versionNumber =
      versions.reduce((max, version) => Math.max(max, version.versionNumber), 0) + 1;
    const now = Date.now();

    const versionId = await ctx.db.insert("publicationVersions", {
      publicationId: publication._id,
      ownerId: userId,
      label,
      documentVersion: contents.documentVersion,
      versionNumber,
      pageCount: contents.pages.length,
      assetIds: rows.assets.map((asset) => asset._id),
      settings: contents.settings,
      createdAt: now,
      createdBy: userId,
    });

    for (const page of contents.pages) {
      await ctx.db.insert("publicationVersionPages", {
        versionId,
        publicationId: publication._id,
        ownerId: userId,
        pageId: page.pageId,
        index: page.index,
        side: page.side,
        masterId: page.masterId,
        pageVersion: page.version,
        name: page.name,
        spec: page.spec,
        background: page.background,
        layers: page.layers,
        objects: page.objects,
        hidden: page.hidden,
      });
    }
    for (const master of contents.masters) {
      await ctx.db.insert("publicationVersionMasters", {
        versionId,
        publicationId: publication._id,
        ownerId: userId,
        masterId: master.masterId,
        name: master.name,
        appliesTo: master.appliesTo,
        spec: master.spec,
        background: master.background,
        layers: master.layers,
        objects: master.objects,
        version: master.version,
      });
    }
    for (const story of contents.stories) {
      await ctx.db.insert("publicationVersionStories", {
        versionId,
        publicationId: publication._id,
        ownerId: userId,
        storyId: story.storyId,
        name: story.name,
        paragraphs: story.paragraphs,
        frames: story.frames,
        overflow: story.overflow,
        styles: story.styles,
        version: story.version,
      });
    }

    return { versionId, versionNumber };
  },
});

export const listVersions = query({
  args: { publicationId: v.id("publications") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const publication = await requireOwnedPublication(ctx, args.publicationId, userId);
    const versions = await ctx.db
      .query("publicationVersions")
      .withIndex("by_publication", (q) => q.eq("publicationId", publication._id))
      .collect();
    if (versions.some((version) => version.ownerId !== userId)) {
      throw new Error("Publication data is inconsistent.");
    }
    return versions
      .sort((a, b) => b.versionNumber - a.versionNumber)
      .map((version) => ({
        _id: version._id,
        label: version.label,
        documentVersion: version.documentVersion,
        versionNumber: version.versionNumber,
        pageCount: version.pageCount,
        assetCount: version.assetIds.length,
        createdAt: version.createdAt,
        createdBy: version.createdBy,
      }));
  },
});

export const getVersion = query({
  args: {
    publicationId: v.id("publications"),
    versionId: v.id("publicationVersions"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await requireOwnedPublication(ctx, args.publicationId, userId);
    const version = await ctx.db.get(args.versionId);
    if (
      !version ||
      version.ownerId !== userId ||
      version.publicationId !== args.publicationId
    ) {
      throw new Error("Version not found.");
    }
    return {
      _id: version._id,
      label: version.label,
      documentVersion: version.documentVersion,
      versionNumber: version.versionNumber,
      pageCount: version.pageCount,
      settings: version.settings,
      createdAt: version.createdAt,
      createdBy: version.createdBy,
    };
  },
});

export const restoreVersion = mutation({
  args: {
    publicationId: v.id("publications"),
    versionId: v.id("publicationVersions"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const publication = await requireOwnedPublication(ctx, args.publicationId, userId);
    const version = await ctx.db.get(args.versionId);
    if (
      !version ||
      version.ownerId !== userId ||
      version.publicationId !== publication._id
    ) {
      throw new Error("Version not found.");
    }

    const [pages, masters, stories] = await Promise.all([
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
    for (const row of [...pages, ...masters, ...stories]) {
      if (row.ownerId !== userId || row.publicationId !== publication._id) {
        throw new Error("Publication data is inconsistent.");
      }
    }

    // Every asset the snapshot needs must still exist and still belong here.
    // This runs before any write; Convex applies the later writes atomically.
    const assetRows = await Promise.all(
      version.assetIds.map((assetId) => ctx.db.get(assetId)),
    );
    if (
      assetRows.some(
        (asset) =>
          !asset ||
          asset.ownerId !== userId ||
          asset.publicationId !== publication._id,
      )
    ) {
      throw new Error(
        "This version needs an asset that is no longer available. Nothing was restored.",
      );
    }

    const contents: VersionContents = {
      publicationId: publication._id,
      documentVersion: version.documentVersion,
      settings: version.settings,
      pages: pages
        .sort((a, b) => a.index - b.index)
        .map(pageRecordFromVersion),
      masters: masters.map(masterRecordFromVersion),
      stories: stories.map(storyRecordFromVersion),
      assets: assetRows.map((asset) => assetRecordFromDoc(asset!)),
    };

    const now = Date.now();
    const restored: PublicationDocument = {
      ...documentFromVersionContents(contents),
      metadata: { ...contents.settings.metadata, updatedAt: now },
    };
    prepareDocumentForPersistence(restored);
    await saveDocumentState(ctx, publication, restored, now);

    // Assets added after this version stay in the owner's library but are
    // detached from this publication, so the restored project reads exactly
    // the asset set it was saved with.
    const currentAssets = await ctx.db
      .query("publicationAssets")
      .withIndex("by_publication", (q) => q.eq("publicationId", publication._id))
      .collect();
    for (const asset of currentAssets) {
      if (!version.assetIds.includes(asset._id)) {
        await ctx.db.patch(asset._id, { publicationId: undefined, updatedAt: now });
      }
    }

    return {
      versionId: version._id,
      versionNumber: version.versionNumber,
      pageCount: restored.pages.length,
      updatedAt: now,
    };
  },
});
