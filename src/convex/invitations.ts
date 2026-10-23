import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { anyApi } from "convex/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  action,
  internalAction,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { resolveDesignUrls } from "./lib/designAssets";
import {
  invitationContent,
  rsvpSettingsValidator,
} from "./validators";

const MAX_GUESTS = 250;
const MAX_PHOTOS = 12;
const MAX_EMAILS_PER_SEND = 50;

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
        return {
          ...invitation,
          guestCount: guests.length,
          rsvpYes: guests.filter((g) => g.rsvpAttending === true).length,
          rsvpNo: guests.filter((g) => g.rsvpAttending === false).length,
          rsvpPending:
            guests.filter((g) => g.rsvpAttending === undefined).length,
          // The dashboard renders each saved design rather than a generic
          // thumbnail, so the storage ids in the document need their URLs.
          // Reads only: the invitation records themselves are untouched.
          designImageUrls: await resolveDesignUrls(ctx, invitation.design),
        };
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

    // Media URLs are resolved here because storage ids alone cannot be
    // displayed by the editor. Nothing secret: the client already knows ids.
    const photoUrls: Record<string, string> = {};
    for (const photo of invitation.photos ?? []) {
      const url = await ctx.storage.getUrl(photo.storageId);
      if (url) photoUrls[photo.storageId] = url;
    }
    const musicUrl = invitation.music
      ? (await ctx.storage.getUrl(invitation.music.storageId)) ?? ""
      : "";
    const designImageUrls = await resolveDesignUrls(ctx, invitation.design);

    return { ...invitation, photoUrls, musicUrl, designImageUrls };
  },
});

/** Engagement timeline for one invitation, newest first (editor Guests tab). */
export const listActivity = query({
  args: { invitationId: v.id("invitations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation || invitation.ownerId !== userId) return [];
    return await ctx.db
      .query("guestOpens")
      .withIndex("by_invitation", (q) => q.eq("invitationId", args.invitationId))
      .order("desc")
      .take(300);
  },
});

export const create = mutation({
  args: { ...invitationContent, design: v.optional(v.any()) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const now = Date.now();
    const slug = await uniqueSlug(ctx, args);
    const { design, ...content } = args;
    return await ctx.db.insert("invitations", {
      ...content,
      design,
      designUpdatedAt: design ? now : undefined,
      ownerId: userId,
      status: "draft",
      slug,
      views: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Saves the canvas studio document. Deliberately separate from `update`: the
 * studio autosaves only design data, so it can never overwrite the host's
 * words, guests, or photos, and the details editor can never wipe a design.
 */
export const saveDesign = mutation({
  args: { id: v.id("invitations"), design: v.any() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const invitation = await requireOwnedInvitation(ctx, args.id, userId);
    const pages = (args.design as { pages?: unknown })?.pages;
    if (!Array.isArray(pages) || pages.length === 0) {
      throw new Error("A design needs at least one page.");
    }
    await ctx.db.patch(invitation._id, {
      design: args.design,
      designUpdatedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return null;
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

/** RSVP settings, and (re)scheduling of the automatic reminder email. */
export const updateRsvp = mutation({
  args: { id: v.id("invitations"), rsvp: rsvpSettingsValidator },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const invitation = await requireOwnedInvitation(ctx, args.id, userId);
    const rsvp = args.rsvp;

    // Any previous auto-reminder is cancelled first; a new one is scheduled
    // only when RSVP is enabled with a future date and the invitation is live.
    if (invitation.scheduledReminderJobId) {
      try {
        await ctx.scheduler.cancel(invitation.scheduledReminderJobId);
      } catch {
        // The job may already have run; that is fine.
      }
    }

    let jobId: Id<"_scheduled_functions"> | undefined;
    const deadlineMs = rsvp.deadline ? Date.parse(`${rsvp.deadline}T18:00:00`) : NaN;
    const reminderAt = Number.isFinite(deadlineMs) ? deadlineMs - 7 * 86_400_000 : NaN;
    if (rsvp.enabled && rsvp.deadline && invitation.status === "published" && reminderAt > Date.now()) {
      // The scheduled job carries its own recipients snapshot: it runs without
      // a session, so it must not depend on owner-scoped queries.
      const guests = await ctx.db
        .query("guests")
        .withIndex("by_invitation", (q) => q.eq("invitationId", invitation._id))
        .collect();
      const targets = guests
        .filter((guest) => guest.email && guest.rsvpAttending === undefined)
        .slice(0, MAX_EMAILS_PER_SEND)
        .map((guest) => ({
          name: guest.name,
          email: guest.email!,
          token: guest.token,
        }));
      if (targets.length > 0) {
        jobId = await ctx.scheduler.runAt(
          reminderAt,
          anyApi.invitations.scheduledRsvpReminder,
          {
            invitationId: invitation._id,
            deadline: rsvp.deadline,
            targetNames: targets.map((t) => t.name),
            recipients: targets,
          },
        );
      }
    }

    await ctx.db.patch(invitation._id, {
      rsvp,
      scheduledReminderJobId: jobId,
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
      rtl: source.rtl,
      schedule: source.schedule,
      dressCode: source.dressCode,
      mapUrl: source.mapUrl,
      hostNotes: source.hostNotes,
      rsvp: source.rsvp,
      photos: source.photos ? [...source.photos] : undefined,
      music: source.music,
      design: source.design,
      designUpdatedAt: source.designUpdatedAt,
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
    const designPages = (invitation.design as { pages?: unknown[] } | undefined)
      ?.pages;
    if (Array.isArray(designPages) && designPages.length > 0) {
      const empty = designPages.every(
        (page) =>
          Array.isArray((page as { elements?: unknown[] }).elements) &&
          (page as { elements: unknown[] }).elements.length === 0,
      );
      if (empty) {
        throw new Error("Add at least one element to the canvas before publishing.");
      }
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
    for (const event of await ctx.db
      .query("guestOpens")
      .withIndex("by_invitation", (q) => q.eq("invitationId", invitation._id))
      .collect()) {
      await ctx.db.delete(event._id);
    }
    // Remove gallery and music files so storage does not accumulate orphans.
    for (const photo of invitation.photos ?? []) {
      try {
        await ctx.storage.delete(photo.storageId);
      } catch {
        // File may already be gone.
      }
    }
    if (invitation.music) {
      try {
        await ctx.storage.delete(invitation.music.storageId);
      } catch {
        // File may already be gone.
      }
    }
    // Canvas images are intentionally left in storage: a placed image may be
    // the same file as a saved library asset, so deleting here could break a
    // reusable record. Library deletions remove their own unshared files.
    await ctx.db.delete(invitation._id);
    return null;
  },
});

/** Guest names, emails, and RSVP answers are private; owner-scoped. */
export const listGuests = query({
  args: { invitationId: v.id("invitations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation || invitation.ownerId !== userId) return [];
    const guests = await ctx.db
      .query("guests")
      .withIndex("by_invitation", (q) =>
        q.eq("invitationId", args.invitationId),
      )
      .collect();
    return guests.sort((a, b) => a.createdAt - b.createdAt);
  },
});

export const addGuest = mutation({
  args: { invitationId: v.id("invitations"), name: v.string(), email: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const invitation = await requireOwnedInvitation(
      ctx,
      args.invitationId,
      userId,
    );
    const name = args.name.trim().slice(0, 80);
    const email = args.email?.trim().toLowerCase().slice(0, 120) || undefined;
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
      email,
    });
  },
});

/** Owner edits a guest's name and/or contact email. */
export const updateGuest = mutation({
  args: { id: v.id("guests"), name: v.optional(v.string()), email: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const guest = await ctx.db.get(args.id);
    if (!guest || guest.ownerId !== userId) {
      throw new Error("Guest not found.");
    }
    const patch: Record<string, unknown> = {};
    if (args.name !== undefined) {
      const name = args.name.trim().slice(0, 80);
      if (!name) throw new Error("Enter the guest's name.");
      patch.name = name;
    }
    if (args.email !== undefined) {
      const email = args.email.trim().toLowerCase().slice(0, 120);
      patch.email = email || undefined;
    }
    await ctx.db.patch(guest._id, patch);
    return null;
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

// ---------------------------------------------------------------------------
// Photo gallery and music (Convex storage; files are publicly readable by URL)
// ---------------------------------------------------------------------------

export const generateUploadUrl = mutation({
  args: { invitationId: v.id("invitations") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await requireOwnedInvitation(ctx, args.invitationId, userId);
    return await ctx.storage.generateUploadUrl();
  },
});

export const attachPhoto = mutation({
  args: { invitationId: v.id("invitations"), storageId: v.id("_storage"), caption: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const invitation = await requireOwnedInvitation(ctx, args.invitationId, userId);
    const photos = invitation.photos ?? [];
    if (photos.length >= MAX_PHOTOS) {
      throw new Error(`The gallery can hold up to ${MAX_PHOTOS} photos.`);
    }
    await ctx.db.patch(invitation._id, {
      photos: [...photos, { storageId: args.storageId, caption: args.caption }],
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const removePhoto = mutation({
  args: { invitationId: v.id("invitations"), storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const invitation = await requireOwnedInvitation(ctx, args.invitationId, userId);
    const photos = (invitation.photos ?? []).filter(
      (photo) => photo.storageId !== args.storageId,
    );
    await ctx.db.patch(invitation._id, {
      photos,
      updatedAt: Date.now(),
    });
    try {
      await ctx.storage.delete(args.storageId);
    } catch {
      // File may already be gone.
    }
    return null;
  },
});

export const setMusic = mutation({
  args: { invitationId: v.id("invitations"), storageId: v.union(v.id("_storage"), v.null()) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const invitation = await requireOwnedInvitation(ctx, args.invitationId, userId);
    const previous = invitation.music?.storageId;
    await ctx.db.patch(invitation._id, {
      music: args.storageId ? { storageId: args.storageId, enabled: true } : undefined,
      updatedAt: Date.now(),
    });
    if (previous && previous !== args.storageId) {
      try {
        await ctx.storage.delete(previous);
      } catch {
        // File may already be gone.
      }
    }
    return null;
  },
});

export const setMusicEnabled = mutation({
  args: { invitationId: v.id("invitations"), enabled: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const invitation = await requireOwnedInvitation(ctx, args.invitationId, userId);
    if (!invitation.music) return null;
    await ctx.db.patch(invitation._id, {
      music: { ...invitation.music, enabled: args.enabled },
      updatedAt: Date.now(),
    });
    return null;
  },
});

// ---------------------------------------------------------------------------
// Public, read-only projection of a published invitation
// ---------------------------------------------------------------------------

async function publicGallery(
  ctx: QueryCtx,
  invitation: Doc<"invitations">,
) {
  const photos = await Promise.all(
    (invitation.photos ?? []).map(async (photo) => ({
      storageId: photo.storageId,
      caption: photo.caption,
      url: (await ctx.storage.getUrl(photo.storageId)) ?? "",
    })),
  );
  const music = invitation.music
    ? {
        enabled: invitation.music.enabled,
        url: (await ctx.storage.getUrl(invitation.music.storageId)) ?? "",
      }
    : null;
  return { photos: photos.filter((p) => p.url), music };
}

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

    const gallery = await publicGallery(ctx, invitation);
    const designImageUrls = await resolveDesignUrls(ctx, invitation.design);

    let guestName: string | null = null;
    let rsvpState: {
      attending: boolean;
      count: number | null;
      meal: string | null;
      note: string | null;
    } | null = null;
    if (args.guestToken) {
      const guest = await ctx.db
        .query("guests")
        .withIndex("by_token", (q) => q.eq("token", args.guestToken!))
        .first();
      if (guest && guest.invitationId === invitation._id) {
        guestName = guest.name;
        if (guest.rsvpAttending !== undefined) {
          rsvpState = {
            attending: guest.rsvpAttending,
            count: guest.rsvpCount ?? null,
            meal: guest.rsvpMeal ?? null,
            note: guest.rsvpNote ?? null,
          };
        }
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
      cornerMotif: invitation.cornerMotif ?? "none",
      animations: invitation.animations,
      rtl: invitation.rtl ?? false,
      schedule: invitation.schedule ?? [],
      dressCode: invitation.dressCode ?? "",
      mapUrl: invitation.mapUrl ?? "",
      hostNotes: invitation.hostNotes ?? "",
      rsvp: invitation.rsvp ?? null,
      photos: gallery.photos,
      music: gallery.music,
      views: invitation.views,
      design: invitation.design ?? null,
      designImageUrls,
      guestName,
      rsvpState,
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

    let guestId: Id<"guests"> | undefined;
    if (args.guestToken) {
      const guest = await ctx.db
        .query("guests")
        .withIndex("by_token", (q) => q.eq("token", args.guestToken!))
        .first();
      if (guest && guest.invitationId === invitation._id) {
        guestId = guest._id;
        await ctx.db.patch(guest._id, { views: guest.views + 1 });
      }
    }

    await ctx.db.insert("guestOpens", {
      invitationId: invitation._id,
      guestId,
      kind: "open",
      t: Date.now(),
    });
    return null;
  },
});

/** Tracks a share action (WhatsApp / copy link) on the public page. */
export const recordShare = mutation({
  args: { slug: v.string(), guestToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!invitation || invitation.status !== "published") return null;

    let guestId: Id<"guests"> | undefined;
    if (args.guestToken) {
      const guest = await ctx.db
        .query("guests")
        .withIndex("by_token", (q) => q.eq("token", args.guestToken!))
        .first();
      if (guest && guest.invitationId === invitation._id) guestId = guest._id;
    }

    await ctx.db.insert("guestOpens", {
      invitationId: invitation._id,
      guestId,
      kind: "share",
      t: Date.now(),
    });
    return null;
  },
});

/**
 * Guest RSVP. Only personalized links can respond, and only while the
 * invitation is published, RSVP is on, and before the deadline (if set).
 */
export const recordRsvp = mutation({
  args: {
    slug: v.string(),
    guestToken: v.string(),
    attending: v.boolean(),
    count: v.optional(v.number()),
    meal: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!invitation || invitation.status !== "published") {
      throw new Error("This invitation is not accepting RSVPs right now.");
    }

    const rsvp = invitation.rsvp;
    if (!rsvp?.enabled) {
      throw new Error("The host has not turned on RSVP replies.");
    }
    if (rsvp.deadline && Date.now() > Date.parse(`${rsvp.deadline}T23:59:59`) + 60_000) {
      throw new Error("The RSVP deadline has passed. Please contact your host.");
    }

    const guest = await ctx.db
      .query("guests")
      .withIndex("by_token", (q) => q.eq("token", args.guestToken))
      .first();
    if (!guest || guest.invitationId !== invitation._id) {
      throw new Error("This personal link is not valid.");
    }

    const count =
      args.attending && args.count !== undefined
        ? Math.min(Math.max(Math.round(args.count), 1), 20)
        : undefined;
    const meal = args.meal?.trim().slice(0, 120) || undefined;
    const note = args.note?.trim().slice(0, 400) || undefined;

    await ctx.db.patch(guest._id, {
      rsvpAttending: args.attending,
      rsvpCount: count,
      rsvpMeal: meal,
      rsvpNote: note,
      rsvpAt: Date.now(),
    });

    await ctx.db.insert("guestOpens", {
      invitationId: invitation._id,
      guestId: guest._id,
      kind: "rsvp",
      t: Date.now(),
    });
    return null;
  },
});

// ---------------------------------------------------------------------------
// Guest emails via Resend (free tier, no billing in the product itself)
// ---------------------------------------------------------------------------

interface ResendPayload {
  from: string;
  to: string;
  subject: string;
  text: string;
}

let missingKeyNoted = false;

async function sendOneEmail(payload: ResendPayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    missingKeyNoted = true;
    return false;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(
      `Email delivery failed (${response.status}). ${await response.text()}`,
    );
  }
  return true;
}

function resendFrom(): string {
  return (
    process.env.RESEND_FROM?.trim() ||
    "LAMSA Invitations <onboarding@resend.dev>"
  );
}

/**
 * Sends an update to a chosen group of guests. The action re-checks ownership
 * with the caller's identity, so a guest list can never be read or emailed by
 * a stranger. Guests without an email address are reported back, and the
 * client marks the delivered ones afterwards.
 */
export const sendGuestEmails = action({
  args: {
    invitationId: v.id("invitations"),
    group: v.union(
      v.literal("all"),
      v.literal("noRsvp"),
      v.literal("attending"),
      v.literal("notAttending"),
    ),
    subject: v.string(),
    message: v.string(),
    origin: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("The studio session could not be opened. Reload the page and try again.");
    }

    const invitation = (await ctx.runQuery(
      anyApi.invitations.getMine,
      { id: args.invitationId },
    )) as Doc<"invitations"> | null;
    if (!invitation) throw new Error("Invitation not found.");

    const guests = (await ctx.runQuery(anyApi.invitations.listGuests, {
      invitationId: invitation._id,
    })) as Doc<"guests">[];

    const inGroup = (guest: { rsvpAttending?: boolean; email?: string }) => {
      if (!guest.email) return false;
      switch (args.group) {
        case "noRsvp":
          return guest.rsvpAttending === undefined;
        case "attending":
          return guest.rsvpAttending === true;
        case "notAttending":
          return guest.rsvpAttending === false;
        default:
          return true;
      }
    };

    const recipients = guests.filter(inGroup).slice(0, MAX_EMAILS_PER_SEND);
    const skippedNoEmail = guests.filter((g) => !g.email).length;

    if (recipients.length === 0) {
      return { sent: 0, failed: 0, skippedNoEmail, missingKey: false, deliveredGuestIds: [] };
    }

    const subject = args.subject.trim().slice(0, 120);
    const from = resendFrom();
    let sent = 0;
    let failed = 0;
    const deliveredGuestIds: Id<"guests">[] = [];

    for (const guest of recipients) {
      const text =
        `${args.message.trim()}\n\nYour invitation: ${args.origin}/i/${invitation.slug}/${guest.token}`.slice(
          0,
          1800,
        );
      try {
        if (await sendOneEmail({ from, to: guest.email!, subject, text })) {
          sent += 1;
          deliveredGuestIds.push(guest._id);
        } else {
          failed += 1;
        }
      } catch {
        failed += 1;
      }
    }

    if (deliveredGuestIds.length > 0) {
      await ctx.runMutation(anyApi.invitations.markGuestsEmailed, {
        invitationId: invitation._id,
        guestIds: deliveredGuestIds,
      });
    }

    return { sent, failed, skippedNoEmail, missingKey: missingKeyNoted && sent === 0, deliveredGuestIds };
  },
});

/** Owner-scoped bookkeeping: when a guest was last emailed successfully. */
export const markGuestsEmailed = mutation({
  args: { invitationId: v.id("invitations"), guestIds: v.array(v.id("guests")) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const invitation = await requireOwnedInvitation(ctx, args.invitationId, userId);
    const now = Date.now();
    for (const guestId of args.guestIds.slice(0, MAX_EMAILS_PER_SEND)) {
      const guest = await ctx.db.get(guestId);
      if (guest?.invitationId === invitation._id && guest.ownerId === userId) {
        await ctx.db.patch(guestId, { lastEmailedAt: now });
      }
    }
    return null;
  },
});

/**
 * Automatic RSVP reminder, scheduled seven days before the deadline. Runs
 * without a session, so it carries everything it needs in its arguments and
 * never touches owner-scoped queries.
 */
export const scheduledRsvpReminder = internalAction({
  args: {
    invitationId: v.id("invitations"),
    deadline: v.string(),
    targetNames: v.array(v.string()),
    recipients: v.array(
      v.object({ name: v.string(), email: v.string(), token: v.string() }),
    ),
  },
  handler: async (ctx, args) => {
    void ctx;
    const from = resendFrom();
    const subject = `Kindly reply to your invitation by ${args.deadline}`;
    const names = args.targetNames.slice(0, 3).join(", ");
    const more = args.targetNames.length > 3 ? "…" : "";
    let sentCount = 0;
    for (const target of args.recipients) {
      const awaiting = names
        ? `\n\nAwaiting reply from: ${names}${more}`
        : "";
      const text = `Hello ${target.name},\n\nA gentle reminder: please reply to your invitation before ${args.deadline}.${awaiting}\n\nReply here, from your personal link.`;
      try {
        if (await sendOneEmail({ from, to: target.email, subject, text })) {
          sentCount += 1;
        }
      } catch {
        // Best effort; the host can always send a manual reminder.
      }
    }
    return `sent:${sentCount}`;
  },
});
