import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "./_generated/server";

const CLAIM_TTL_MS = 24 * 60 * 60 * 1000;

function randomClaimToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

/**
 * Called while the browser still has its anonymous session. The returned
 * secret is the only thing that can move that studio's work to a verified
 * account, so another account cannot claim it by guessing a user id.
 */
export const beginClaim = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user || !user.isAnonymous) return null;

    const token = randomClaimToken();
    const expiresAt = Date.now() + CLAIM_TTL_MS;
    await ctx.db.patch(userId, {
      studioClaimToken: token,
      studioClaimExpiresAt: expiresAt,
    });

    return { anonymousUserId: userId, token, expiresAt };
  },
});

/**
 * Move every invitation and guest from an anonymous studio to the verified
 * host. Nothing is deleted: slugs, status, views, guest tokens, and timestamps
 * are preserved, and the verified account's own invitations are untouched.
 */
export const claim = mutation({
  args: {
    anonymousUserId: v.id("users"),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Verify your email before moving your studio.");
    }

    const target = await ctx.db.get(userId);
    if (!target || target.isAnonymous || !target.emailVerificationTime) {
      throw new Error("Verify your email before moving your studio.");
    }

    if (args.anonymousUserId === userId) return { moved: 0 };

    const source = await ctx.db.get(args.anonymousUserId);
    if (!source || !source.isAnonymous) return { moved: 0 };
    if (source.claimedBy === userId) return { moved: 0 };

    if (
      !source.studioClaimToken ||
      source.studioClaimToken !== args.token ||
      (source.studioClaimExpiresAt ?? 0) < Date.now()
    ) {
      throw new Error(
        "This studio could not be moved. Start again from the studio page.",
      );
    }

    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_owner", (q) => q.eq("ownerId", source._id))
      .collect();

    for (const invitation of invitations) {
      await ctx.db.patch(invitation._id, { ownerId: target._id });

      const guests = await ctx.db
        .query("guests")
        .withIndex("by_invitation", (q) =>
          q.eq("invitationId", invitation._id),
        )
        .collect();
      for (const guest of guests) {
        await ctx.db.patch(guest._id, { ownerId: target._id });
      }
    }

    await ctx.db.patch(source._id, {
      studioClaimToken: undefined,
      studioClaimExpiresAt: undefined,
      claimedBy: target._id,
    });

    return { moved: invitations.length };
  },
});
