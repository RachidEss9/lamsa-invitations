import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";
import {
  invitationContent,
  invitationStatusValidator,
} from "./validators";
import {
  backgroundValidator,
  docTypeValidator,
  documentMetadataValidator,
  gridValidator,
  guideValidator,
  layerValidator,
  lengthUnitValidator,
  objectValidator,
  pageSpecValidator,
  presetPayloadValidator,
  publicationStatusValidator,
  spreadGutterValidator,
  styleSetValidator,
  versionSettingsValidator,
} from "./publishing/validators";

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
      // Canvas studio document: pages, elements, finishes, timeline.
      // Optional so every existing invitation keeps working unchanged.
      design: v.optional(v.any()),
      designUpdatedAt: v.optional(v.number()),
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

    // Saved snapshots of the canvas document. The studio writes one at most
    // every few minutes while editing, plus an explicit snapshot on request, so
    // a host can go back to an earlier state without touching the live design.
    designVersions: defineTable({
      invitationId: v.id("invitations"),
      ownerId: v.id("users"),
      design: v.any(),
      label: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_invitation", ["invitationId"])
      .index("by_owner", ["ownerId"]),

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

    // Reusable creative library for the single studio owner: saved templates,
    // animation presets, design assets, and style presets. Built-in items live
    // in code and are never written here.
    //
    // `"opening"` is retired: the presentation system no longer exists and
    // nothing writes that kind. The literal stays in the union because Convex
    // validates existing rows against the schema, so dropping it would fail a
    // deploy on any library item a host saved under the old system. It costs
    // nothing and can never be read by current code.
    libraryItems: defineTable({
      ownerId: v.id("users"),
      kind: v.union(
        v.literal("template"),
        v.literal("opening"),
        v.literal("animation"),
        v.literal("asset"),
        v.literal("style"),
      ),
      name: v.string(),
      category: v.optional(v.string()),
      description: v.optional(v.string()),
      // The kind-specific document. Validated by the client model and kept
      // flexible so new animation/opening fields never require a migration.
      payload: v.any(),
      storageId: v.optional(v.id("_storage")),
      archived: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_owner", ["ownerId"])
      .index("by_owner_kind", ["ownerId", "kind"]),

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

    /* ------------------------------------------------------------------ */
    /* LAMSA Publishing Studio — Phase 2 persistence                       */
    /* ------------------------------------------------------------------ */

    // Publication header. Geometry is always in PDF points; displayUnit only
    // affects what the future interface prints beside a field. Ownership is
    // enforced by every function, never accepted from a client argument.
    publications: defineTable({
      ownerId: v.id("users"),
      title: v.string(),
      docType: docTypeValidator,
      presetId: v.string(),
      status: publicationStatusValidator,
      documentVersion: v.number(),
      // Bumped only by page-structure mutations (add/duplicate/delete/reorder),
      // never by content saves, so two editors can compare page structure
      // without every autosave looking like a structural change.
      structureVersion: v.optional(v.number()),
      displayUnit: lengthUnitValidator,
      spec: pageSpecValidator,
      facingPages: v.boolean(),
      defaultGutter: v.number(),
      spreadGutters: v.array(spreadGutterValidator),
      grid: gridValidator,
      styles: styleSetValidator,
      guides: v.array(guideValidator),
      metadata: documentMetadataValidator,
      extensions: v.optional(v.any()),
      pageCount: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
      archivedAt: v.optional(v.number()),
    })
      .index("by_owner", ["ownerId"])
      .index("by_owner_updated", ["ownerId", "updatedAt"])
      .index("by_owner_status", ["ownerId", "status"]),

    // One row per page. Stable pageId is the id used by stories and masters;
    // Convex _id is deliberately not exposed as a document reference.
    publicationPages: defineTable({
      publicationId: v.id("publications"),
      ownerId: v.id("users"),
      pageId: v.string(),
      index: v.number(),
      side: v.union(v.literal("left"), v.literal("right"), v.literal("single")),
      masterId: v.optional(v.string()),
      pageVersion: v.number(),
      name: v.string(),
      spec: pageSpecValidator,
      background: backgroundValidator,
      layers: v.array(layerValidator),
      objects: v.array(objectValidator),
      hidden: v.boolean(),
      updatedAt: v.number(),
    })
      .index("by_publication", ["publicationId"])
      .index("by_publication_index", ["publicationId", "index"])
      .index("by_publication_page", ["publicationId", "pageId"])
      .index("by_owner", ["ownerId"]),

    publicationMasters: defineTable({
      publicationId: v.id("publications"),
      ownerId: v.id("users"),
      masterId: v.string(),
      name: v.string(),
      appliesTo: v.union(v.literal("left"), v.literal("right"), v.literal("both")),
      spec: v.optional(pageSpecValidator),
      background: backgroundValidator,
      layers: v.array(layerValidator),
      objects: v.array(objectValidator),
      version: v.number(),
      updatedAt: v.number(),
    })
      .index("by_publication", ["publicationId"])
      .index("by_publication_master", ["publicationId", "masterId"])
      .index("by_owner", ["ownerId"]),

    publicationStories: defineTable({
      publicationId: v.id("publications"),
      ownerId: v.id("users"),
      storyId: v.string(),
      name: v.string(),
      paragraphs: v.array(
        v.object({
          id: v.string(),
          styleId: v.optional(v.string()),
          runs: v.array(
            v.object({ text: v.string(), styleId: v.optional(v.string()) }),
          ),
        }),
      ),
      frames: v.array(
        v.object({ pageId: v.string(), objectId: v.string() }),
      ),
      overflow: v.union(v.literal("thread"), v.literal("stop")),
      styles: styleSetValidator,
      version: v.number(),
      updatedAt: v.number(),
    })
      .index("by_publication", ["publicationId"])
      .index("by_publication_story", ["publicationId", "storyId"])
      .index("by_owner", ["ownerId"]),

    // The print original is always retained. Proxy and thumbnail ids are
    // optional and only point at browser-generated previews.
    publicationAssets: defineTable({
      ownerId: v.id("users"),
      publicationId: v.optional(v.id("publications")),
      assetId: v.string(),
      originalStorageId: v.id("_storage"),
      proxyStorageId: v.optional(v.id("_storage")),
      thumbnailStorageId: v.optional(v.id("_storage")),
      filename: v.string(),
      mimeType: v.string(),
      width: v.number(),
      height: v.number(),
      fileSize: v.number(),
      checksum: v.optional(v.string()),
      tags: v.array(v.string()),
      metadata: v.object({
        caption: v.optional(v.string()),
        alt: v.optional(v.string()),
        license: v.optional(v.string()),
        notes: v.optional(v.string()),
      }),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_owner", ["ownerId"])
      .index("by_owner_created", ["ownerId", "createdAt"])
      .index("by_publication", ["publicationId"])
      .index("by_publication_asset", ["publicationId", "assetId"])
      .index("by_original_storage", ["originalStorageId"]),

    // A named version stores its settings here and its pages/masters/stories
    // in child rows. Never one giant blob; restore is all-or-nothing.
    publicationVersions: defineTable({
      publicationId: v.id("publications"),
      ownerId: v.id("users"),
      label: v.string(),
      documentVersion: v.number(),
      versionNumber: v.number(),
      pageCount: v.number(),
      assetIds: v.array(v.id("publicationAssets")),
      settings: versionSettingsValidator,
      createdAt: v.number(),
      createdBy: v.id("users"),
    })
      .index("by_publication", ["publicationId"])
      .index("by_publication_number", ["publicationId", "versionNumber"])
      .index("by_owner", ["ownerId"]),

    publicationVersionPages: defineTable({
      versionId: v.id("publicationVersions"),
      publicationId: v.id("publications"),
      ownerId: v.id("users"),
      pageId: v.string(),
      index: v.number(),
      side: v.union(v.literal("left"), v.literal("right"), v.literal("single")),
      masterId: v.optional(v.string()),
      pageVersion: v.number(),
      name: v.string(),
      spec: pageSpecValidator,
      background: backgroundValidator,
      layers: v.array(layerValidator),
      objects: v.array(objectValidator),
      hidden: v.boolean(),
    })
      .index("by_version", ["versionId"])
      .index("by_version_index", ["versionId", "index"]),

    publicationVersionMasters: defineTable({
      versionId: v.id("publicationVersions"),
      publicationId: v.id("publications"),
      ownerId: v.id("users"),
      masterId: v.string(),
      name: v.string(),
      appliesTo: v.union(v.literal("left"), v.literal("right"), v.literal("both")),
      spec: v.optional(pageSpecValidator),
      background: backgroundValidator,
      layers: v.array(layerValidator),
      objects: v.array(objectValidator),
      version: v.number(),
    }).index("by_version", ["versionId"]),

    publicationVersionStories: defineTable({
      versionId: v.id("publicationVersions"),
      publicationId: v.id("publications"),
      ownerId: v.id("users"),
      storyId: v.string(),
      name: v.string(),
      paragraphs: v.array(
        v.object({
          id: v.string(),
          styleId: v.optional(v.string()),
          runs: v.array(
            v.object({ text: v.string(), styleId: v.optional(v.string()) }),
          ),
        }),
      ),
      frames: v.array(
        v.object({ pageId: v.string(), objectId: v.string() }),
      ),
      overflow: v.union(v.literal("thread"), v.literal("stop")),
      styles: styleSetValidator,
      version: v.number(),
    }).index("by_version", ["versionId"]),

    // Custom presets saved by an owner. Built-in presets live in the client
    // foundation and are never duplicated here.
    publicationPresets: defineTable({
      ownerId: v.optional(v.id("users")),
      name: v.string(),
      docType: docTypeValidator,
      payload: presetPayloadValidator,
      archived: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_owner", ["ownerId"])
      .index("by_owner_archived", ["ownerId", "archived"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
