import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";

/**
 * Get the current signed in user. Returns null if the user is not signed in.
 * Usage: const signedInUser = await ctx.runQuery(api.authHelpers.currentUser);
 * THIS FUNCTION IS READ-ONLY. DO NOT MODIFY.
 */
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;

    // Never return the whole document: it now carries the PIN hash and the
    // one-time studio claim secret. Only these fields are safe for the client.
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      image: user.image,
      isAnonymous: user.isAnonymous,
      emailVerificationTime: user.emailVerificationTime,
    };
  },
});
