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
    })
      .index("by_owner", ["ownerId"])
      .index("by_slug", ["slug"]),

    // Personalized recipients. A guest token is only meaningful with its
    // parent invitation and never grants edit access.
    guests: defineTable({
      invitationId: v.id("invitations"),
      ownerId: v.id("users"),
      name: v.string(),
      token: v.string(),
      views: v.number(),
      createdAt: v.number(),
    })
      .index("by_invitation", ["invitationId"])
      .index("by_token", ["token"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
