import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { invitationContent } from "./validators";

const MAX_GUESTS = 250;

function asciiBase(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 28) || "invitation"
  );
}

function randomToken(length = 8): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let token = "";
  for (let i = 0; i < length; i += 1) {
    token += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return token;
}

async function uniqueSlug(
  ctx: QueryCtx | MutationCtx,
  content: { names: { primary: string; secondary: string }; occasion: string },
): Promise<string> {
  const seed = content.names.primary || content.names.secondary || content.occasion;
  const base = asciiBase(seed);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = `${base}-${randomToken(6)}`;
    const existing = await ctx.db
      .query("invitations")
      .withIndex("by_slug", (q) => q.eq("slug", candidate))
      .first();
    if (!existing) return candidate;
  }
  return `${base}-${randomToken(12)}`;
}

async function requireUserId(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error(
      "The studio session could not be opened. Reload the page and try again.",
    );
  }
  return userId;
}

async function requireOwnedInvitation(
  ctx: QueryCtx | MutationCtx,
  id: Id<"invitations">,
  userId: Id<"users">,
): Promise<Doc<"invitations">> {
  const invitation = await ctx.db.get(id);
  if (!invitation || invitation.ownerId !== userId) {
    throw new Error("Invitation not found.");
  }
  return invitation;
}

/** All of the signed-in host's invitations, newest edits first. */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();

    const withGuestCounts = await Promise.all(
      invitations.map(async (invitation) => {
        const guests = await ctx.db
          .query("guests")
          .withIndex("by_invitation", (q) =>
            q.eq("invitationId", invitation._id),
          )
          .collect();
        return { ...invitation, guestCount: guests.length };
      }),
    );

    return withGuestCounts.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const getMine = query({
  args: { id: v.id("invitations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const invitation = await ctx.db.get(args.id);
    if (!invitation || invitation.ownerId !== userId) return null;
    return invitation;
  },
});

export const create = mutation({
  args: { ...invitationContent },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const now = Date.now();
    const slug = await uniqueSlug(ctx, args);
    return await ctx.db.insert("invitations", {
      ...args,
      ownerId: userId,
      status: "draft",
      slug,
      views: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: { id: v.id("invitations"), ...invitationContent },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const invitation = await requireOwnedInvitation(ctx, args.id, userId);
    const { id, ...content } = args;
    void id;
    await ctx.db.patch(invitation._id, {
      ...content,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const duplicate = mutation({
  args: { id: v.id("invitations") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const source = await requireOwnedInvitation(ctx, args.id, userId);
    const now = Date.now();
    const slug = await uniqueSlug(ctx, source);
    return await ctx.db.insert("invitations", {
      ownerId: userId,
      title: `${source.title} (copy)`,
      occasion: source.occasion,
      templateId: source.templateId,
      names: source.names,
      eyebrow: source.eyebrow,
      message: source.message,
      date: source.date,
      time: source.time,
      venueName: source.venueName,
      venueAddress: source.venueAddress,
      palette: source.palette,
      fontPair: source.fontPair,
      layout: source.layout,
      motif: source.motif,
      animations: source.animations,
      status: "draft",
      slug,
      views: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const publish = mutation({
  args: { id: v.id("invitations") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const invitation = await requireOwnedInvitation(ctx, args.id, userId);

    if (
      !invitation.names.primary.trim() ||
      !invitation.date ||
      !invitation.venueName.trim()
    ) {
      throw new Error(
        "Add a name, event date, and venue before publishing this invitation.",
      );
    }

    await ctx.db.patch(invitation._id, {
      status: "published",
      publishedAt: invitation.publishedAt ?? Date.now(),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const unpublish = mutation({
  args: { id: v.id("invitations") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const invitation = await requireOwnedInvitation(ctx, args.id, userId);
    await ctx.db.patch(invitation._id, {
      status: "draft",
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("invitations") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const invitation = await requireOwnedInvitation(ctx, args.id, userId);
    const guests = await ctx.db
      .query("guests")
      .withIndex("by_invitation", (q) => q.eq("invitationId", invitation._id))
      .collect();
    for (const guest of guests) {
      await ctx.db.delete(guest._id);
    }
    await ctx.db.delete(invitation._id);
    return null;
  },
});

/** Guest names are private; this query is owner-scoped. */
export const listGuests = query({
  args: { invitationId: v.id("invitations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation || invitation.ownerId !== userId) return [];
    return await ctx.db
      .query("guests")
      .withIndex("by_invitation", (q) =>
        q.eq("invitationId", args.invitationId),
      )
      .collect();
  },
});

export const addGuest = mutation({
  args: { invitationId: v.id("invitations"), name: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const invitation = await requireOwnedInvitation(
      ctx,
      args.invitationId,
      userId,
    );
    const name = args.name.trim().slice(0, 80);
    if (!name) throw new Error("Enter the guest's name.");

    const existing = await ctx.db
      .query("guests")
      .withIndex("by_invitation", (q) =>
        q.eq("invitationId", invitation._id),
      )
      .collect();
    if (existing.length >= MAX_GUESTS) {
      throw new Error(`Each invitation can hold up to ${MAX_GUESTS} guests.`);
    }

    let token = randomToken(14);
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const collision = await ctx.db
        .query("guests")
        .withIndex("by_token", (q) => q.eq("token", token))
        .first();
      if (!collision) break;
      token = randomToken(14);
    }

    return await ctx.db.insert("guests", {
      invitationId: invitation._id,
      ownerId: userId,
      name,
      token,
      views: 0,
      createdAt: Date.now(),
    });
  },
});

export const removeGuest = mutation({
  args: { id: v.id("guests") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const guest = await ctx.db.get(args.id);
    if (!guest || guest.ownerId !== userId) {
      throw new Error("Guest not found.");
    }
    await ctx.db.delete(guest._id);
    return null;
  },
});

/** Public, read-only projection of a published invitation. */
export const getPublic = query({
  args: {
    slug: v.string(),
    guestToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!invitation || invitation.status !== "published") return null;

    let guestName: string | null = null;
    if (args.guestToken) {
      const guest = await ctx.db
        .query("guests")
        .withIndex("by_token", (q) => q.eq("token", args.guestToken!))
        .first();
      if (guest && guest.invitationId === invitation._id) {
        guestName = guest.name;
      }
    }

    return {
      slug: invitation.slug,
      names: invitation.names,
      occasion: invitation.occasion,
      eyebrow: invitation.eyebrow,
      message: invitation.message,
      date: invitation.date,
      time: invitation.time,
      venueName: invitation.venueName,
      venueAddress: invitation.venueAddress,
      palette: invitation.palette,
      fontPair: invitation.fontPair,
      layout: invitation.layout,
      motif: invitation.motif,
      animations: invitation.animations,
      views: invitation.views,
      guestName,
    };
  },
});

/** Increments view counts once per page visit (the client de-dupes sessions). */
export const recordView = mutation({
  args: { slug: v.string(), guestToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!invitation || invitation.status !== "published") return null;

    await ctx.db.patch(invitation._id, { views: invitation.views + 1 });

    if (args.guestToken) {
      const guest = await ctx.db
        .query("guests")
        .withIndex("by_token", (q) => q.eq("token", args.guestToken!))
        .first();
      if (guest && guest.invitationId === invitation._id) {
        await ctx.db.patch(guest._id, { views: guest.views + 1 });
      }
    }
    return null;
  },
});
