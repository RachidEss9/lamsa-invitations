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
  v.literal("other"),
);

export const layoutValidator = v.union(
  v.literal("centered"),
  v.literal("editorial"),
  v.literal("classic"),
);

export const motifValidator = v.union(
  v.literal("arch"),
  v.literal("sprig"),
  v.literal("sun"),
  v.literal("fan"),
  v.literal("star"),
  v.literal("none"),
);

export const fontPairValidator = v.union(
  v.literal("romance"),
  v.literal("editorial"),
  v.literal("modern"),
  v.literal("heritage"),
);

export const paletteValidator = v.object({
  background: v.string(),
  ink: v.string(),
  accent: v.string(),
});

/** Fields the host can edit. Shared by schema + create/update mutations. */
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
  animations: v.boolean(),
} as const;

export const invitationStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
);
