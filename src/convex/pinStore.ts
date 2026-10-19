import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const MAX_FAILURES = 5;
export const LOCK_MS = 15 * 60 * 1000;

/**
 * Internal-only view used by the PIN credentials provider. The hash never
 * reaches a client and is never part of a public query.
 */
export const lookup = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (!user) return null;

    return {
      userId: user._id,
      pinHash: user.pinHash ?? null,
      failures: user.pinFailures ?? 0,
      lockedUntil: user.pinLockedUntil ?? null,
      isAnonymous: user.isAnonymous === true,
      emailVerificationTime: user.emailVerificationTime ?? null,
    };
  },
});

export const recordFailure = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return { lockedUntil: null as number | null };

    const failures = (user.pinFailures ?? 0) + 1;
    const now = Date.now();

    if (failures >= MAX_FAILURES) {
      const lockedUntil = now + LOCK_MS;
      await ctx.db.patch(args.userId, {
        pinFailures: 0,
        pinLockedUntil: lockedUntil,
      });
      return { lockedUntil };
    }

    await ctx.db.patch(args.userId, { pinFailures: failures });
    return { lockedUntil: null as number | null };
  },
});

export const clearFailures = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      pinFailures: 0,
      pinLockedUntil: undefined,
    });
    return null;
  },
});
