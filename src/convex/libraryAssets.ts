import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Favourites and recent-use order for the shared Elements Library.
 *
 * The catalogue itself is built-in artwork that ships with the app (plus the
 * owner's existing uploads in `libraryItems`). These tables therefore store
 * only references: an owner id and an asset id. That keeps one asset record
 * for every surface and makes favouriting free of duplicated files.
 */

/** How many recent entries per owner are kept; older rows are pruned. */
const RECENT_LIMIT = 60;
const MAX_ASSET_ID = 120;

async function requireUserId(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("The studio session could not be opened. Reload the page and try again.");
  }
  return userId;
}

function cleanAssetId(value: string): string {
  const id = value.trim();
  const hasControlCharacter = [...id].some((character) => character.charCodeAt(0) < 32);
  if (!id || id.length > MAX_ASSET_ID || hasControlCharacter) {
    throw new Error("That library asset is not valid.");
  }
  return id;
}

/** Asset ids the owner has starred, newest first. */
export const listFavourites = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [] as string[];
    const rows = await ctx.db
      .query("libraryAssetFavourites")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt).map((row) => row.assetId);
  },
});

/** Stars or unstars one asset; returns the new state. */
export const toggleFavourite = mutation({
  args: { assetId: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const assetId = cleanAssetId(args.assetId);
    const existing = await ctx.db
      .query("libraryAssetFavourites")
      .withIndex("by_owner_asset", (q) =>
        q.eq("ownerId", userId).eq("assetId", assetId),
      )
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
      return false;
    }
    await ctx.db.insert("libraryAssetFavourites", {
      ownerId: userId,
      assetId,
      createdAt: Date.now(),
    });
    return true;
  },
});

/** Most recently inserted assets, newest first. */
export const listRecents = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [] as Array<{ assetId: string; usedAt: number; uses: number }>;
    const rows = await ctx.db
      .query("libraryAssetRecents")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();
    return rows
      .sort((a, b) => b.usedAt - a.usedAt)
      .slice(0, RECENT_LIMIT)
      .map(({ assetId, usedAt, uses }) => ({ assetId, usedAt, uses }));
  },
});

/**
 * Records an insertion. One row per asset: repeated use moves it to the front
 * instead of appending another row, and the oldest rows are pruned so this
 * table can never grow without bound.
 */
export const recordUse = mutation({
  args: { assetId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const assetId = cleanAssetId(args.assetId);
    const now = Date.now();
    const existing = await ctx.db
      .query("libraryAssetRecents")
      .withIndex("by_owner_asset", (q) =>
        q.eq("ownerId", userId).eq("assetId", assetId),
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { usedAt: now, uses: existing.uses + 1 });
    } else {
      await ctx.db.insert("libraryAssetRecents", {
        ownerId: userId,
        assetId,
        usedAt: now,
        uses: 1,
      });
      const all = await ctx.db
        .query("libraryAssetRecents")
        .withIndex("by_owner", (q) => q.eq("ownerId", userId))
        .collect();
      if (all.length > RECENT_LIMIT) {
        const stale = all
          .sort((a, b) => a.usedAt - b.usedAt)
          .slice(0, all.length - RECENT_LIMIT);
        for (const row of stale) await ctx.db.delete(row._id);
      }
    }
    return null;
  },
});
