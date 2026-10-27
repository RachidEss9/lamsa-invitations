import { v } from "convex/values";

/**
 * Shared invitation validators.
 *
 * These values are intentionally serializable primitives so the same shape can
 * be reused by the schema, mutations, and the editor payload. The client-side
 * mirror of these unions lives in src/lib/invitation.ts.
 */

export const occasionValidator = v.union(
  v.literal("wedding"),
  v.literal("engagement"),
  v.literal("birthday"),
  v.literal("graduation"),
  v.literal("eid"),
  v.literal("baby"),
  v.literal("other"),
);

export const layoutValidator = v.union(
  v.literal("centered"),
  v.literal("editorial"),
  v.literal("classic"),
  // LAMSA v5 animated reveal layouts (touch to open on the public page).
  v.literal("arch"),
  v.literal("envelope"),
  v.literal("ribbon"),
);

export const motifValidator = v.union(
  v.literal("arch"),
  v.literal("sprig"),
  v.literal("sun"),
  v.literal("fan"),
  v.literal("star"),
  v.literal("crescent"),
  v.literal("rattle"),
  // Atelier vector library: botanical, celestial, and geometric marks.
  v.literal("branch"),
  v.literal("wreath"),
  v.literal("vine"),
  v.literal("shell"),
  v.literal("palm"),
  v.literal("peony"),
  v.literal("butterfly"),
  v.literal("wave"),
  v.literal("gem"),
  v.literal("compass"),
  v.literal("sunburst"),
  v.literal("trellis"),
  v.literal("moon"),
  v.literal("frame"),
  // Reference-set additions: paisley, zellige, flourishes and celebration marks.
  v.literal("paisley"),
  v.literal("zellige"),
  v.literal("flourish"),
  v.literal("blossom"),
  v.literal("confetti"),
  v.literal("bow"),
  v.literal("none"),
);

export const fontPairValidator = v.union(
  v.literal("romance"),
  v.literal("editorial"),
  v.literal("modern"),
  v.literal("heritage"),
  // New in LAMSA v5: hand-lettered script and Arabic (RTL) typography.
  v.literal("script"),
  v.literal("arabic"),
  // Atelier type library: didone, book, display, engraved, calligraphy,
  // handwritten Latin, and two further Arabic families.
  v.literal("didone"),
  v.literal("book"),
  v.literal("display"),
  v.literal("engraved"),
  v.literal("calligraphy"),
  v.literal("handwritten"),
  v.literal("ruqaa"),
  v.literal("kufi"),
);

export const paletteValidator = v.object({
  background: v.string(),
  ink: v.string(),
  accent: v.string(),
});

/** Structured programme for the event-details section of the public page. */
export const scheduleItemValidator = v.object({
  time: v.string(),
  label: v.string(),
});

export const scheduleValidator = v.array(scheduleItemValidator);

/** RSVP settings the host controls from the editor. */
export const rsvpSettingsValidator = v.object({
  enabled: v.boolean(),
  deadline: v.optional(v.string()),
  askMeal: v.optional(v.boolean()),
  askNote: v.optional(v.boolean()),
});

/** One photo in the public invitation's gallery (stored in Convex storage). */
export const photoValidator = v.object({
  storageId: v.id("_storage"),
  caption: v.optional(v.string()),
});

/**
 * Fields the host can edit. Shared by schema + create/update mutations.
 * Everything after `animations` is optional so existing invitations and old
 * drafts keep validating untouched.
 */
export const invitationContent = {
  title: v.string(),
  occasion: occasionValidator,
  templateId: v.string(),
  names: v.object({
    primary: v.string(),
    secondary: v.string(),
  }),
  eyebrow: v.string(),
  message: v.string(),
  date: v.string(),
  time: v.string(),
  venueName: v.string(),
  venueAddress: v.string(),
  palette: paletteValidator,
  fontPair: fontPairValidator,
  layout: layoutValidator,
  motif: motifValidator,
  // A second, quieter vector placed in the corner of the card.
  cornerMotif: v.optional(motifValidator),
  animations: v.boolean(),

  // Right-to-left presentation (Arabic presets from the LAMSA v5 kit).
  rtl: v.optional(v.boolean()),

  // Event details shown on the public page beneath the invitation.
  schedule: v.optional(scheduleValidator),
  dressCode: v.optional(v.string()),
  mapUrl: v.optional(v.string()),
  hostNotes: v.optional(v.string()),

  // RSVP settings; personal guest links collect responses.
  rsvp: v.optional(rsvpSettingsValidator),

  // Public photo gallery and optional background music.
  photos: v.optional(v.array(photoValidator)),
  music: v.optional(
    v.object({
      storageId: v.id("_storage"),
      enabled: v.boolean(),
    }),
  ),
} as const;

export const invitationStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
);
