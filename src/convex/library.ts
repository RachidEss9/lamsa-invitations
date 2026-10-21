import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  collectDesignStorageIds,
  resolveDesignUrls,
} from "./lib/designAssets";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";

/**
 * The private creative library of the single studio owner. Everything here is
 * owner-scoped: a signed-in owner sees only their own saved templates,
 * openings, animation presets, assets, and style presets. Built-in items live
 * in the client model and are never written to this table, so a saved record
 * can always be distinguished from a built-in one.
 */

const kindValidator = v.union(
  v.literal("template"),
  v.literal("opening"),
  v.literal("animation"),
  v.literal("asset"),
  v.literal("style"),
);

const MAX_NAME = 80;
const MAX_DESCRIPTION = 240;

async function requireUserId(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error(
      "The studio session could not be opened. Reload the page and try again.",
    );
  }
  return userId;
}

async function requireOwnedItem(
  ctx: QueryCtx | MutationCtx,
  id: Id<"libraryItems">,
  userId: Id<"users">,
): Promise<Doc<"libraryItems">> {
  const item = await ctx.db.get(id);
  if (!item || item.ownerId !== userId) {
    throw new Error("Library item not found.");
  }
  return item;
}

function cleanName(value: string): string {
  const name = value.trim().slice(0, MAX_NAME);
  if (!name) throw new Error("Give this library item a name.");
  return name;
}

function cleanOptional(value: string | undefined, max: number) {
  const trimmed = value?.trim().slice(0, max);
  return trimmed || undefined;
}

async function withUrls(ctx: QueryCtx | MutationCtx, items: Doc<"libraryItems">[]) {
  return await Promise.all(
    items.map(async (item) => {
      const payload = item.payload as { design?: unknown } | null;
      return {
        ...item,
        url: item.storageId
          ? ((await ctx.storage.getUrl(item.storageId)) ?? null)
          : null,
        imageUrls:
          item.kind === "template"
            ? await resolveDesignUrls(ctx, payload?.design)
            : {},
      };
    }),
  );
}

/** Every saved library record for the owner, optionally for one kind. */
export const listMine = query({
  args: { kind: v.optional(kindValidator) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const items = args.kind
      ? await ctx.db
          .query("libraryItems")
          .withIndex("by_owner_kind", (q) =>
            q.eq("ownerId", userId).eq("kind", args.kind!),
          )
          .collect()
      : await ctx.db
          .query("libraryItems")
          .withIndex("by_owner", (q) => q.eq("ownerId", userId))
          .collect();
    const resolved = await withUrls(ctx, items);
    return resolved.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const create = mutation({
  args: {
    kind: kindValidator,
    name: v.string(),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
    payload: v.any(),
    storageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    if (
      args.payload === null ||
      typeof args.payload !== "object" ||
      Array.isArray(args.payload)
    ) {
      throw new Error("This item has no design data to save.");
    }
    if (args.kind === "asset" && !args.storageId) {
      throw new Error("Choose a file for this asset.");
    }
    const now = Date.now();
    return await ctx.db.insert("libraryItems", {
      ownerId: userId,
      kind: args.kind,
      name: cleanName(args.name),
      category: cleanOptional(args.category, 40),
      description: cleanOptional(args.description, MAX_DESCRIPTION),
      payload: args.payload,
      storageId: args.storageId,
      archived: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("libraryItems"),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
    payload: v.optional(v.any()),
    archived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const item = await requireOwnedItem(ctx, args.id, userId);
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = cleanName(args.name);
    if (args.category !== undefined) {
      patch.category = cleanOptional(args.category, 40);
    }
    if (args.description !== undefined) {
      patch.description = cleanOptional(args.description, MAX_DESCRIPTION);
    }
    if (args.payload !== undefined) {
      if (
        args.payload === null ||
        typeof args.payload !== "object" ||
        Array.isArray(args.payload)
      ) {
        throw new Error("This item has no design data to save.");
      }
      patch.payload = args.payload;
    }
    if (args.archived !== undefined) patch.archived = args.archived;
    void item;
    await ctx.db.patch(args.id, patch);
    return null;
  },
});

/** Copies a saved record under a new name; the original stays untouched. */
export const duplicate = mutation({
  args: { id: v.id("libraryItems"), name: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const item = await requireOwnedItem(ctx, args.id, userId);
    const now = Date.now();
    return await ctx.db.insert("libraryItems", {
      ownerId: userId,
      kind: item.kind,
      name: cleanName(args.name || `${item.name} (copy)`),
      category: item.category,
      description: item.description,
      payload: item.payload,
      storageId: item.storageId,
      archived: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("libraryItems") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const item = await requireOwnedItem(ctx, args.id, userId);
    if (item.storageId) {
      // Copying a record shares its storage id unless a new file was uploaded,
      // so only remove the file when no other saved record still points at it.
      const siblings = await ctx.db
        .query("libraryItems")
        .withIndex("by_owner", (q) => q.eq("ownerId", userId))
        .collect();
      const shared = siblings.some(
        (other) => other._id !== item._id && other.storageId === item.storageId,
      );
      // A canvas may use the same file. Keep the file while any design still
      // references it, so deleting a library record never breaks an invitation.
      const designs = await ctx.db
        .query("invitations")
        .withIndex("by_owner", (q) => q.eq("ownerId", userId))
        .collect();
      const usedInDesign = designs.some((invitation) =>
        collectDesignStorageIds(invitation.design).includes(item.storageId!),
      );
      if (!shared && !usedInDesign) {
        try {
          await ctx.storage.delete(item.storageId);
        } catch {
          // The file may already be gone; the record still goes away.
        }
      }
    }
    await ctx.db.delete(item._id);
    return null;
  },
});

/** Upload URL for design assets. Owner-only, like every private mutation. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});
