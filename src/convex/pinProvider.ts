import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import type { GenericActionCtxWithAuthConfig } from "@convex-dev/auth/server";
import type { Value } from "convex/values";
import { internal } from "./_generated/api";
import type { DataModel, Id } from "./_generated/dataModel";
import { burnPinCheck, verifyPin } from "./lib/pinCrypto";

const PIN_PATTERN = /^\d{6}$/;

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function lockMessage(lockedUntil: number): string {
  const minutes = Math.max(1, Math.ceil((lockedUntil - Date.now()) / 60000));
  return `Too many attempts. Try again in ${minutes} minute${
    minutes === 1 ? "" : "s"
  }.`;
}

/**
 * Everyday access is a six-digit PIN verified on the server. A successful
 * check returns the user id, which Convex Auth exchanges for a normal,
 * persistent session. The PIN hash is read only by this provider through an
 * internal query; it never reaches the browser.
 */
export const pinProvider = ConvexCredentials<DataModel>({
  id: "pin",
  authorize: async (
    params: Partial<Record<string, Value | undefined>>,
    ctx: GenericActionCtxWithAuthConfig<DataModel>,
  ): Promise<{ userId: Id<"users"> } | null> => {
    const email = normalizeEmail(params.email);
    const pin = typeof params.pin === "string" ? params.pin : "";

    const record = email
      ? await ctx.runQuery(internal.pinStore.lookup, { email })
      : null;

    if (
      !record ||
      record.isAnonymous ||
      record.emailVerificationTime === null ||
      record.pinHash === null
    ) {
      await burnPinCheck(pin);
      throw new Error("That email and PIN did not match.");
    }

    const now = Date.now();
    if (record.lockedUntil !== null && record.lockedUntil > now) {
      throw new Error(lockMessage(record.lockedUntil));
    }

    if (!PIN_PATTERN.test(pin)) {
      await burnPinCheck(pin);
      await ctx.runMutation(internal.pinStore.recordFailure, {
        userId: record.userId,
      });
      throw new Error("That email and PIN did not match.");
    }

    const matches = await verifyPin(pin, record.pinHash);
    if (!matches) {
      const { lockedUntil } = await ctx.runMutation(
        internal.pinStore.recordFailure,
        { userId: record.userId },
      );
      if (lockedUntil !== null && lockedUntil > now) {
        throw new Error(lockMessage(lockedUntil));
      }
      throw new Error("That email and PIN did not match.");
    }

    await ctx.runMutation(internal.pinStore.clearFailures, {
      userId: record.userId,
    });

    return { userId: record.userId };
  },
});
