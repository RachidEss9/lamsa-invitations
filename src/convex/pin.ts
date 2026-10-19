import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { hashPin } from "./lib/pinCrypto";

const PIN_PATTERN = /^\d{6}$/;
const VERIFICATION_WINDOW_MS = 15 * 60 * 1000;

// A short blocklist of the most predictable six-digit choices.
const WEAK_PINS = new Set([
  "000000",
  "111111",
  "222222",
  "333333",
  "444444",
  "555555",
  "666666",
  "777777",
  "888888",
  "999999",
  "123456",
  "654321",
  "121212",
  "112233",
  "102030",
]);

export const status = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;

    const verifiedAt = user.emailVerificationTime ?? 0;
    return {
      hasPin: Boolean(user.pinHash),
      email: user.email ?? null,
      lockedUntil: user.pinLockedUntil ?? null,
      // A PIN can only be created or replaced shortly after a real email
      // verification. The UI uses this to ask for verification instead of
      // offering a form the server will refuse.
      canSetPin:
        Boolean(user.emailVerificationTime) &&
        Date.now() - verifiedAt <= VERIFICATION_WINDOW_MS,
    };
  },
});

/**
 * Create or replace the PIN. This is only allowed shortly after a real email
 * verification, which is what makes email a safe recovery channel and prevents
 * a stolen, already-open session from quietly taking over the PIN.
 */
export const setPin = mutation({
  args: { pin: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Your session has expired. Verify your email again.");
    }

    const user = await ctx.db.get(userId);
    if (!user || user.isAnonymous || !user.email) {
      throw new Error("Verify your email before setting a PIN.");
    }

    const verifiedAt = user.emailVerificationTime ?? 0;
    if (Date.now() - verifiedAt > VERIFICATION_WINDOW_MS) {
      throw new Error("Verify your email again to set a new PIN.");
    }

    if (!PIN_PATTERN.test(args.pin)) {
      throw new Error("Your PIN must be exactly six digits.");
    }
    if (WEAK_PINS.has(args.pin)) {
      throw new Error("Choose a less predictable PIN.");
    }

    const pinHash = await hashPin(args.pin);
    await ctx.db.patch(userId, {
      pinHash,
      pinSetAt: Date.now(),
      pinFailures: 0,
      pinLockedUntil: undefined,
    });

    return null;
  },
});
