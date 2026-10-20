import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";
import {
  invitationContent,
  invitationStatusValidator,
} from "./validators";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove

      // Salted Scrypt hash of the everyday six-digit PIN. Never plaintext.
      pinHash: v.optional(v.string()),
      pinSetAt: v.optional(v.number()),
      pinFailures: v.optional(v.number()),
      pinLockedUntil: v.optional(v.number()),

      // One-time secret used to move a pre-verification studio's invitations
      // to the account that just verified this email.
      studioClaimToken: v.optional(v.string()),
      studioClaimExpiresAt: v.optional(v.number()),
      claimedBy: v.optional(v.id("users")),
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // A host's invitation. Every private read and write is scoped to ownerId.
    invitations: defineTable({
      ownerId: v.id("users"),
      ...invitationContent,
      status: invitationStatusValidator,
      slug: v.string(),
      views: v.number(),
      publishedAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),

      // Bookkeeping for RSVP reminders (one scheduled email per deadline).
      remindersSentAt: v.optional(v.number()),
      scheduledReminderJobId: v.optional(v.id("_scheduled_functions")),
    })
      .index("by_owner", ["ownerId"])
      .index("by_slug", ["slug"]),

    // Personalized recipients. A guest token is only meaningful with its
    // parent invitation and never grants edit access. Email and RSVP answers
    // are optional and collected from the guest's personal link.
    guests: defineTable({
      invitationId: v.id("invitations"),
      ownerId: v.id("users"),
      name: v.string(),
      token: v.string(),
      views: v.number(),
      createdAt: v.number(),

      email: v.optional(v.string()),
      rsvpAttending: v.optional(v.boolean()),
      rsvpCount: v.optional(v.number()),
      rsvpMeal: v.optional(v.string()),
      rsvpNote: v.optional(v.string()),
      rsvpAt: v.optional(v.number()),
      lastEmailedAt: v.optional(v.number()),
    })
      .index("by_invitation", ["invitationId"])
      .index("by_token", ["token"]),

    // Lightweight engagement timeline: one row per tracked event, so hosts
    // see who opened/RSVP'd/shared over time. Kept separate from counters so
    // the dashboard can show both a total and the latest activity.
    guestOpens: defineTable({
      invitationId: v.id("invitations"),
      guestId: v.optional(v.id("guests")),
      kind: v.union(v.literal("open"), v.literal("share"), v.literal("rsvp")),
      t: v.number(),
    })
      .index("by_invitation", ["invitationId"])
      .index("by_guest", ["guestId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
