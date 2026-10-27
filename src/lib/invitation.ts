import { addDays, addHours, format, isValid, parse } from "date-fns";
import type { Infer } from "convex/values";
import type { Id } from "@/convex/_generated/dataModel";
import {
  motifValidator,
  occasionValidator,
  scheduleItemValidator,
} from "@/convex/validators";
import type { OpeningSettings, PageEdgeId } from "./design";

/**
 * Client-side mirror of the invitation validators in src/convex/validators.ts.
 * Occasion, motif, and content-shape unions are inferred straight from the
 * server validators so the two sides can never drift apart.
 */

export const OCCASIONS = [
  { id: "wedding", label: "Wedding" },
  { id: "engagement", label: "Engagement" },
  { id: "birthday", label: "Birthday" },
  { id: "graduation", label: "Graduation" },
  { id: "eid", label: "Eid & festivals" },
  { id: "baby", label: "New baby" },
  { id: "other", label: "Something else" },
] as const;

export type Occasion = Infer<typeof occasionValidator>;
export type ScheduleItem = Infer<typeof scheduleItemValidator>;

export const FONT_PAIRS = [
  {
    id: "romance",
    label: "Romance",
    family: '"Cormorant Garamond", "Times New Roman", serif',
    note: "Cormorant Garamond",
  },
  {
    id: "editorial",
    label: "Editorial",
    family: '"Playfair Display", "Times New Roman", serif',
    note: "Playfair Display",
  },
  {
    id: "modern",
    label: "Modern",
    family: '"Italiana", "Times New Roman", serif',
    note: "Italiana",
  },
  {
    id: "heritage",
    label: "Heritage",
    family: '"Marcellus", "Times New Roman", serif',
    note: "Marcellus",
  },
  // New in LAMSA v5.
  {
    id: "script",
    label: "Script",
    family: '"Pinyon Script", "Snell Roundhand", cursive',
    note: "Pinyon Script",
  },
  {
    id: "arabic",
    label: "Arabic",
    family: '"Amiri", "Times New Roman", serif',
    note: "Amiri (RTL)",
  },
  // Atelier type library.
  {
    id: "didone",
    label: "Didone",
    family: '"Bodoni Moda", "Times New Roman", serif',
    note: "Bodoni Moda",
  },
  {
    id: "book",
    label: "Book",
    family: '"Libre Baskerville", "Times New Roman", serif',
    note: "Libre Baskerville",
  },
  {
    id: "display",
    label: "Display",
    family: '"DM Serif Display", "Times New Roman", serif',
    note: "DM Serif Display",
  },
  {
    id: "engraved",
    label: "Engraved",
    family: '"Cinzel", "Times New Roman", serif',
    note: "Cinzel",
  },
  {
    id: "calligraphy",
    label: "Calligraphy",
    family: '"Great Vibes", "Snell Roundhand", cursive',
    note: "Great Vibes",
  },
  {
    id: "handwritten",
    label: "Handwritten",
    family: '"Sacramento", "Snell Roundhand", cursive',
    note: "Sacramento",
  },
  {
    id: "ruqaa",
    label: "Ruqaa",
    family: '"Aref Ruqaa", "Amiri", serif',
    note: "Aref Ruqaa (RTL)",
  },
  {
    id: "kufi",
    label: "Kufi",
    family: '"Reem Kufi", "Amiri", sans-serif',
    note: "Reem Kufi (RTL)",
  },
] as const;

/** Font pairs set in calligraphy or Arabic, which need display sizing. */
export const SCRIPT_FONT_PAIRS: readonly FontPairId[] = [
  "script",
  "calligraphy",
  "handwritten",
  "arabic",
  "ruqaa",
  "kufi",
];
export type FontPairId = (typeof FONT_PAIRS)[number]["id"];
export const LAYOUTS = [
  { id: "centered", label: "Centered", note: "A calm, symmetrical card" },
  { id: "editorial", label: "Editorial", note: "Left set, like a magazine" },
  { id: "classic", label: "Classic", note: "Formal double rule" },
  // LAMSA v5 animated reveal layouts: the public page opens with a
  // touch-to-reveal animation before showing the card.
  { id: "arch", label: "Arch", note: "A glowing arch opens for your guests" },
  { id: "envelope", label: "Envelope", note: "A wax seal cracks the envelope open" },
  { id: "ribbon", label: "Ribbon", note: "Two ribbons part beneath a bow" },
] as const;

export type LayoutId = (typeof LAYOUTS)[number]["id"];
export const MOTIFS = [
  { id: "arch", label: "Arch" },
  { id: "sprig", label: "Sprig" },
  { id: "sun", label: "Sun" },
  { id: "fan", label: "Fan" },
  { id: "star", label: "Star" },
  { id: "crescent", label: "Crescent" },
  { id: "rattle", label: "Rattle" },
  // Botanical
  { id: "branch", label: "Branch" },
  { id: "wreath", label: "Wreath" },
  { id: "vine", label: "Vine" },
  { id: "palm", label: "Palm" },
  { id: "peony", label: "Peony" },
  // Small marks
  { id: "butterfly", label: "Butterfly" },
  { id: "shell", label: "Shell" },
  { id: "gem", label: "Gem" },
  // Celestial & geometric
  { id: "compass", label: "Compass" },
  { id: "sunburst", label: "Sunburst" },
  { id: "moon", label: "Moons" },
  { id: "wave", label: "Wave" },
  { id: "trellis", label: "Trellis" },
  { id: "frame", label: "Frame" },
  // From the reference set: pattern, ornament and celebration marks
  { id: "paisley", label: "Paisley" },
  { id: "zellige", label: "Zellige" },
  { id: "flourish", label: "Flourish" },
  { id: "blossom", label: "Blossom" },
  { id: "confetti", label: "Confetti" },
  { id: "bow", label: "Bow" },
  { id: "none", label: "None" },
] as const;

export type MotifId = Infer<typeof motifValidator>;

/** Layouts that open with an animated touch-to-reveal moment. */
export const REVEAL_LAYOUTS = ["arch", "envelope", "ribbon"] as const;

export type RevealLayoutId = (typeof REVEAL_LAYOUTS)[number];
export function isRevealLayout(layout: LayoutId): layout is RevealLayoutId {
  return (REVEAL_LAYOUTS as readonly string[]).includes(layout);
}

export const REVEAL_HINTS: Record<RevealLayoutId, string> = {
  arch: "Touch the arch",
  envelope: "Touch the seal",
  ribbon: "Touch the bow",
};

export interface RsvpSettings {
  enabled: boolean;
  deadline?: string;
  askMeal?: boolean;
  askNote?: boolean;
}

export interface InvitationPalette {
  background: string;
  ink: string;
  accent: string;
}

/**
 * Editor payload shape. Mirrors src/convex/validators.ts field-for-field; the
 * occasion and motif unions above are inferred from the server so those can
 * never drift, while the optional detail fields are listed here because the
 * shared server object is a spread (not a wrapped v.object) and cannot be
 * Infer'd directly.
 */
export interface InvitationContent {
  title: string;
  occasion: Occasion;
  templateId: string;
  names: { primary: string; secondary: string };
  eyebrow: string;
  message: string;
  date: string;
  time: string;
  venueName: string;
  venueAddress: string;
  palette: InvitationPalette;
  fontPair: FontPairId;
  layout: LayoutId;
  motif: MotifId;
  /** Optional second vector, set quietly in the card's corner. */
  cornerMotif?: MotifId;
  animations: boolean;
  /** Right-to-left (Arabic) presentation, new in LAMSA v5. */
  rtl?: boolean;

  /** Optional full-frame backdrop image from the airvendor pack. */
  background?: InvitationTemplateBackground;

  // Event details shown on the public page beneath the invitation.
  schedule?: ScheduleItem[];
  dressCode?: string;
  mapUrl?: string;
  hostNotes?: string;

  // RSVP settings; personal guest links collect responses.
  rsvp?: RsvpSettings;

  // Gallery and music are managed through dedicated storage mutations; they
  // are part of the stored document but never edited by the autosave.
  photos?: { storageId: Id<"_storage">; caption?: string }[];
  music?: { storageId: Id<"_storage">; enabled: boolean };
}

export const PALETTE_PRESETS: { name: string; palette: InvitationPalette }[] = [
  // The four inks from the LAMSA brand card, in combination.
  {
    name: "Crimson & pearl",
    palette: { background: "#f2f1ed", ink: "#161616", accent: "#710014" },
  },
  {
    name: "Pearl & sand",
    palette: { background: "#f2f1ed", ink: "#161616", accent: "#b38f6f" },
  },
  {
    name: "Sand card",
    palette: { background: "#b38f6f", ink: "#161616", accent: "#f2f1ed" },
  },
  {
    name: "Crimson & obsidian",
    palette: { background: "#161616", ink: "#f2f1ed", accent: "#710014" },
  },
  {
    name: "Sand & crimson",
    palette: { background: "#f2f1ed", ink: "#710014", accent: "#b38f6f" },
  },
  {
    name: "Obsidian glow",
    palette: { background: "#161616", ink: "#f2f1ed", accent: "#b38f6f" },
  },
  {
    name: "Sand seal",
    palette: { background: "#e9e5dc", ink: "#710014", accent: "#b38f6f" },
  },
  {
    name: "Ivory & olive",
    palette: { background: "#f7f2e7", ink: "#2c3226", accent: "#8a8f6b" },
  },
  {
    name: "Sand & wine",
    palette: { background: "#f3e9dc", ink: "#4a2a26", accent: "#a4795b" },
  },
  {
    name: "Amber",
    palette: { background: "#f6ecdc", ink: "#6a3a21", accent: "#c08457" },
  },
  {
    name: "Ochre",
    palette: { background: "#f5ead1", ink: "#24211b", accent: "#b3872f" },
  },
  {
    name: "Nocturne",
    palette: { background: "#1d2024", ink: "#eee6d7", accent: "#b6a27c" },
  },
  {
    name: "Laurel",
    palette: { background: "#eef0e5", ink: "#2a3a2d", accent: "#6b7d61" },
  },
  {
    name: "Clay",
    palette: { background: "#f4e7df", ink: "#5a2f2a", accent: "#c2765b" },
  },
  {
    name: "Atelier",
    palette: { background: "#f2efe8", ink: "#32302b", accent: "#8a8275" },
  },
];
export interface InvitationTemplate {
  id: string;
  name: string;
  occasion: Occasion;
  /** Visual family used by the library filter, e.g. Botanical or Cinematic. */
  style?: string;
  description: string;
  palette: InvitationPalette;
  fontPair: FontPairId;
  layout: LayoutId;
  motif: MotifId;
  /** Templates designed for right-to-left reading start in RTL. */
  rtl?: boolean;
  cornerMotif?: MotifId;
  /**
   * Editor-only label for Pinterest-sourced reference backdrops that must be
   * replaced with licensed art before publishing.
   */
  backdropLabel?: string;
  /** Full-frame backdrop image supplied by the studio pack. */
  background?: InvitationTemplateBackground;
  /**
   * The cut edge this template trims its sheet to. Straight when absent, so
   * every template saved before cut edges existed keeps its trim.
   */
  edge?: PageEdgeId;
  /** The opening this template sets when it is applied. */
  opening?: Partial<OpeningSettings>;
  /** Optional fx overlay recipe rendered over the backdrop image. */
  fx?: InvitationFxSpec;
  sample: {
    primary: string;
    secondary: string;
    eyebrow: string;
    message: string;
    venueName: string;
    venueAddress: string;
  };
}

/** Overlay recipe rendered on top of a backdrop image. */
export interface InvitationFxSpec {
  /** Dust motes: [color, count]. */
  dust?: [string, number];
  /** Falling petals: [color, count]. */
  petals?: [string, number];
  /** Light sweep across the backdrop (0..1 intensity). */
  sweep?: number;
  /** Warm flicker wash. */
  flick?: number;
  /** Glow points: [x%, y%, size%]. */
  glow?: [number, number, number][];
  /** Spark points: [x%, y%]. */
  spark?: [number, number][];
}

export interface InvitationTemplateBackground {
  kind: "image";
  storageSeed: string;
  /** Optional overlay recipe rendered above the image. */
  fx?: InvitationFxSpec;
}

export function isInvitationTemplateBackground(value: unknown): value is InvitationTemplateBackground {
  return (
    typeof value === "object" &&
    value != null &&
    "kind" in value &&
    (value as InvitationTemplateBackground).kind === "image" &&
    typeof (value as InvitationTemplateBackground).storageSeed === "string"
  );
}

export const TEMPLATES: InvitationTemplate[] = [
  /**
   * LAMSA v6 backdrop templates imported from the studio pack downloaded from
   * the Google Drive link shared in the studio. They are full-frame invitation
   * backdrops with an intentionally empty centre area for the host’s text. They
   * are distinct from the built-in invitation templates above: they supply only
   * a background image plus an optional “fx” overlay spec, and the editable text
   * layer is still built by the normal template starter flow.
   */
  {
    // LAMSA v5 animated reveal templates.
    id: "the-arch",
    name: "The Arch",
    occasion: "wedding",
    description:
      "Touch a glowing obsidian arch and the invitation ascends in script.",
    palette: { background: "#161616", ink: "#f2f1ed", accent: "#b38f6f" },
    fontPair: "script",
    layout: "arch",
    motif: "arch",
    cornerMotif: "moon",
    sample: {
      primary: "Alexandra",
      secondary: "Omar",
      eyebrow: "You are invited to the wedding of",
      message: "Reception to follow.",
      venueName: "The Garden Pavilion",
      venueAddress: "Tangier, Morocco",
    },
  },
  {
    id: "the-seal",
    name: "The Seal",
    occasion: "engagement",
    description: "A crimson envelope cracks open beneath a wax seal.",
    palette: { background: "#f2f1ed", ink: "#161616", accent: "#710014" },
    fontPair: "script",
    layout: "envelope",
    motif: "star",
    cornerMotif: "branch",
    sample: {
      primary: "Natasha",
      secondary: "Karim",
      eyebrow: "We are getting engaged",
      message: "Join us for an evening of joy and celebration.",
      venueName: "The Orchard",
      venueAddress: "Marrakech, Morocco",
    },
  },
  {
    id: "the-ribbon",
    name: "The Ribbon",
    occasion: "birthday",
    description: "Two crimson ribbons part beneath a satin bow.",
    palette: { background: "#f2f1ed", ink: "#161616", accent: "#710014" },
    fontPair: "script",
    layout: "ribbon",
    motif: "fan",
    cornerMotif: "peony",
    sample: {
      primary: "Nadia",
      secondary: "Thirty",
      eyebrow: "You are invited to celebrate",
      message: "Another year, more dreams, more laughter.",
      venueName: "The Rooftop",
      venueAddress: "Casablanca, Morocco",
    },
  },
  {
    id: "the-arch-ar",
    name: "The Arch, Arabic",
    occasion: "wedding",
    description: "The arch reveal, set right-to-left in Amiri.",
    palette: { background: "#161616", ink: "#f2f1ed", accent: "#b38f6f" },
    fontPair: "arabic",
    layout: "arch",
    motif: "crescent",
    cornerMotif: "frame",
    rtl: true,
    sample: {
      primary: "سلمى",
      secondary: "عمر",
      eyebrow: "يتشرّف بدعوتكم لحضور حفل زفاف",
      message: "يليه حفل استقبال.",
      venueName: "قاعة الحديقة",
      venueAddress: "طنجة، المغرب",
    },
  },
  {
    id: "the-vow",
    name: "The Vow",
    occasion: "wedding",
    description: "A quiet ivory card with an arch of olive.",
    palette: { background: "#f7f2e7", ink: "#2c3226", accent: "#8a8f6b" },
    fontPair: "romance",
    layout: "centered",
    motif: "arch",
    cornerMotif: "wreath",
    sample: {
      primary: "Amara",
      secondary: "Julian",
      eyebrow: "Together with their families",
      message:
        "With full hearts, we invite you to share in the beginning of our forever.",
      venueName: "The Orchard House",
      venueAddress: "Somerset, England",
    },
  },
  {
    id: "adeline",
    name: "Adeline",
    occasion: "wedding",
    description: "Formal serif and a double rule for a timeless day.",
    palette: { background: "#f3e9dc", ink: "#4a2a26", accent: "#a4795b" },
    fontPair: "heritage",
    layout: "classic",
    motif: "star",
    cornerMotif: "vine",
    sample: {
      primary: "Ines",
      secondary: "Theodore",
      eyebrow: "The marriage of",
      message:
        "Please join us for an evening of vows, dinner, and dancing beneath the pines.",
      venueName: "Villa Cardo",
      venueAddress: "Provence, France",
    },
  },
  {
    id: "amber-hands",
    name: "Amber Hands",
    occasion: "engagement",
    description: "Warm clay tones for a new promise.",
    palette: { background: "#f6ecdc", ink: "#6a3a21", accent: "#c08457" },
    fontPair: "romance",
    layout: "editorial",
    motif: "sun",
    cornerMotif: "palm",
    sample: {
      primary: "Sofia",
      secondary: "Elias",
      eyebrow: "A celebration of love",
      message:
        "One small question, one joyful answer. Come raise a glass as we begin again together.",
      venueName: "Casa Lumen",
      venueAddress: "Lisbon, Portugal",
    },
  },
  {
    id: "jubilee",
    name: "Jubilee",
    occasion: "birthday",
    description: "Ochre and ink for a milestone worth marking.",
    palette: { background: "#f5ead1", ink: "#24211b", accent: "#b3872f" },
    fontPair: "editorial",
    layout: "centered",
    motif: "fan",
    cornerMotif: "sunburst",
    sample: {
      primary: "Noor",
      secondary: "Thirty",
      eyebrow: "You are warmly invited",
      message:
        "Three decades, one long table, and the people who made it all worthwhile.",
      venueName: "The Garden Room",
      venueAddress: "Marrakech, Morocco",
    },
  },
  {
    id: "nocturne",
    name: "Nocturne",
    occasion: "other",
    description: "Deep ink, champagne details, after dark.",
    palette: { background: "#1d2024", ink: "#eee6d7", accent: "#b6a27c" },
    fontPair: "modern",
    layout: "classic",
    motif: "star",
    cornerMotif: "gem",
    sample: {
      primary: "The 10th Year",
      secondary: "Atelier No. 8",
      eyebrow: "An anniversary dinner",
      message:
        "A table for friends, a decade in the making. Join us for an evening of quiet celebration.",
      venueName: "Maison Verre",
      venueAddress: "Copenhagen, Denmark",
    },
  },
  {
    id: "laurel",
    name: "Laurel",
    occasion: "graduation",
    description: "Fresh laurel green and a light editorial hand.",
    palette: { background: "#eef0e5", ink: "#2a3a2d", accent: "#6b7d61" },
    fontPair: "editorial",
    layout: "editorial",
    motif: "sprig",
    cornerMotif: "wreath",
    sample: {
      primary: "Maya Bennett",
      secondary: "Class of 2026",
      eyebrow: "The family of",
      message:
        "Please join us to celebrate a graduation, a beginning, and a very proud family.",
      venueName: "Hillside Hall",
      venueAddress: "Berkeley, California",
    },
  },
  {
    id: "fete",
    name: "La Fête",
    occasion: "birthday",
    description: "A little clay, a little joy, plenty of candles.",
    palette: { background: "#f4e7df", ink: "#5a2f2a", accent: "#c2765b" },
    fontPair: "modern",
    layout: "centered",
    motif: "sprig",
    cornerMotif: "butterfly",
    sample: {
      primary: "Céleste",
      secondary: "Six",
      eyebrow: "Come celebrate",
      message:
        "Cake, music, and the best kind of chaos. We would love you there.",
      venueName: "The Yellow House",
      venueAddress: "Austin, Texas",
    },
  },
  {
    id: "atelier",
    name: "Atelier",
    occasion: "other",
    description: "Understated stone and letterpress restraint.",
    palette: { background: "#f2efe8", ink: "#32302b", accent: "#8a8275" },
    fontPair: "heritage",
    layout: "editorial",
    motif: "arch",
    sample: {
      primary: "A House Warming",
      secondary: "No. 14",
      eyebrow: "Please join us",
      message:
        "An open house, an open door. Come see the rooms we have been filling with light.",
      venueName: "No. 14 Lansdowne",
      venueAddress: "London, England",
    },
  },
  {
    id: "crescent-night",
    name: "Crescent Night",
    occasion: "eid",
    description: "Deep ink under a gold crescent moon.",
    palette: { background: "#1d2024", ink: "#eee6d7", accent: "#c9a35b" },
    fontPair: "modern",
    layout: "centered",
    motif: "crescent",
    cornerMotif: "moon",
    sample: {
      primary: "The Hassan Family",
      secondary: "Open House",
      eyebrow: "Eid Mubarak",
      message:
        "May your days be sweet. Join us after Eid prayer for coffee, dates, and laughter.",
      venueName: "Dar Hassan",
      venueAddress: "Amman, Jordan",
    },
  },
  {
    id: "gold-eid",
    name: "Gold Eid",
    occasion: "eid",
    description: "Ivory, sand, and a quiet gold crescent.",
    palette: { background: "#f6ecdc", ink: "#4a3524", accent: "#b3872f" },
    fontPair: "heritage",
    layout: "classic",
    motif: "crescent",
    cornerMotif: "trellis",
    sample: {
      primary: "Eid al-Fitr",
      secondary: "You are invited",
      eyebrow: "With warm salams",
      message:
        "Please join us on the first day of Eid for a family lunch and an open door.",
      venueName: "The Garden Room",
      venueAddress: "Kuala Lumpur, Malaysia",
    },
  },
  {
    id: "little-one",
    name: "Little One",
    occasion: "baby",
    description: "Soft clay tones for a first hello.",
    palette: { background: "#f4e7df", ink: "#5a2f2a", accent: "#c2765b" },
    fontPair: "romance",
    layout: "centered",
    motif: "rattle",
    cornerMotif: "peony",
    sample: {
      primary: "Yusuf",
      secondary: "Aqiqah",
      eyebrow: "With gratitude to God",
      message:
        "Please join us to meet our little one, share a meal, and give thanks together.",
      venueName: "Casa Lumen",
      venueAddress: "Lisbon, Portugal",
    },
  },
  {
    id: "first-hello",
    name: "First Hello",
    occasion: "baby",
    style: "Minimalist",
    description: "Laurel and cream for a gentle welcome.",
    palette: { background: "#eef0e5", ink: "#2a3a2d", accent: "#6b7d61" },
    fontPair: "editorial",
    layout: "editorial",
    motif: "sprig",
    sample: {
      primary: "Welcome,",
      secondary: "Baby Noor",
      eyebrow: "An open house for our daughter",
      message:
        "A quiet afternoon, a cradle full of wishes. We would love to see you there.",
      venueName: "Hillside Hall",
      venueAddress: "Berkeley, California",
    },
  },
  {
    id: "riad-nour",
    name: "Riad Nour",
    occasion: "wedding",
    style: "Moroccan",
    description: "Sand, zellige geometry, and a quiet Moroccan courtyard.",
    palette: { background: "#f4ead8", ink: "#3b2a1c", accent: "#9b6b3d" },
    fontPair: "ruqaa",
    layout: "arch",
    motif: "trellis",
    cornerMotif: "palm",
    sample: {
      primary: "ليلى",
      secondary: "يوسف",
      eyebrow: "بكل فرح وسرور ندعوكم",
      message: "حفل عشاء في رياض قديم تحت سماء مراكش.",
      venueName: "رياض النور",
      venueAddress: "المدينة القديمة، مراكش",
    },
  },
  {
    id: "nikah-ivory",
    name: "Nikah Ivory",
    occasion: "wedding",
    style: "Traditional",
    description: "An ivory nikah card with emerald rules and a fine Naskh hand.",
    palette: { background: "#f8f4ea", ink: "#20332a", accent: "#3f6b52" },
    fontPair: "arabic",
    layout: "classic",
    motif: "wreath",
    cornerMotif: "branch",
    rtl: true,
    sample: {
      primary: "مريم",
      secondary: "أحمد",
      eyebrow: "بسم الله الرحمن الرحيم",
      message: "يتشرف آل العائلة بدعوتكم لحضور عقد النكاح.",
      venueName: "قاعة الزيتون",
      venueAddress: "الرياض، المملكة العربية السعودية",
    },
  },
  {
    id: "mehndi-gold",
    name: "Mehndi Gold",
    occasion: "engagement",
    style: "Playful",
    description: "Marigold, henna, and a bright celebratory hand.",
    palette: { background: "#f8e8c8", ink: "#4c2b12", accent: "#c17a24" },
    fontPair: "heritage",
    layout: "ribbon",
    motif: "sunburst",
    cornerMotif: "peony",
    sample: {
      primary: "Zara",
      secondary: "Hamza",
      eyebrow: "A mehndi evening",
      message: "Henna, music, and sweets before the wedding. Come early and stay late.",
      venueName: "The Courtyard",
      venueAddress: "Birmingham, England",
    },
  },
  {
    id: "noir-gala",
    name: "Noir Gala",
    occasion: "other",
    style: "Cinematic",
    description: "A black-tie invitation in ink, ivory, and champagne.",
    palette: { background: "#151719", ink: "#efe9dc", accent: "#c4a86a" },
    fontPair: "didone",
    layout: "classic",
    motif: "gem",
    cornerMotif: "frame",
    sample: {
      primary: "The Tenth Gala",
      secondary: "Maison Lumen",
      eyebrow: "Black tie and candlelight",
      message:
        "An evening of portraits, dinner, and a decade of generous friends.",
      venueName: "The Grand Hall",
      venueAddress: "Paris, France",
    },
  },
  {
    id: "botanical-letter",
    name: "Botanical Letter",
    occasion: "wedding",
    style: "Botanical",
    description: "Pressed leaves and a light literary serif.",
    palette: { background: "#eef1e6", ink: "#2f3a2a", accent: "#7d8a5c" },
    fontPair: "editorial",
    layout: "centered",
    motif: "branch",
    cornerMotif: "vine",
    sample: {
      primary: "Elena",
      secondary: "Marcus",
      eyebrow: "Married beneath the old oak",
      message: "Dinner and dancing in the garden. Bring a jumper for the evening.",
      venueName: "Fern Hollow",
      venueAddress: "Sussex, England",
    },
  },
  {
    id: "convocation",
    name: "Convocation",
    occasion: "graduation",
    style: "Luxury editorial",
    description: "Deep navy, gold rules, and a proud editorial column.",
    palette: { background: "#eef1f5", ink: "#182438", accent: "#9c7a3c" },
    fontPair: "book",
    layout: "editorial",
    motif: "star",
    cornerMotif: "frame",
    sample: {
      primary: "Adam Reyes",
      secondary: "Doctor of Law",
      eyebrow: "The faculty and family of",
      message: "A convocation, a toast, and a long lunch to follow.",
      venueName: "The Great Hall",
      venueAddress: "Cambridge, Massachusetts",
    },
  },
  {
    id: "petal-pink",
    name: "Petal Pink",
    occasion: "baby",
    style: "Romantic",
    description: "Blush paper, soft script, and a peony wreath.",
    palette: { background: "#f9ebe8", ink: "#5b3436", accent: "#c48283" },
    fontPair: "script",
    layout: "centered",
    motif: "peony",
    cornerMotif: "wreath",
    sample: {
      primary: "Mila",
      secondary: "A first birthday",
      eyebrow: "One year of wonder",
      message: "Cake on the lawn, bubbles, and the people who love her most.",
      venueName: "Rose Cottage",
      venueAddress: "Bath, England",
    },
  },
  {
    id: "studio-birthday",
    name: "Studio Birthday",
    occasion: "birthday",
    style: "Modern geometric",
    description: "A graphic birthday card in tomato red and cream.",
    palette: { background: "#f4efe3", ink: "#1f1c18", accent: "#c4472f" },
    fontPair: "modern",
    layout: "editorial",
    motif: "fan",
    cornerMotif: "sun",
    sample: {
      primary: "Iris",
      secondary: "Forty",
      eyebrow: "A studio party",
      message: "Records, negronis, and a very large cake. Come as you are.",
      venueName: "Studio 6",
      venueAddress: "Brooklyn, New York",
    },
  },
  {
    id: "eid-jade",
    name: "Eid Jade",
    occasion: "eid",
    style: "Traditional",
    description: "Jade paper, a gold crescent, and generous Arabic type.",
    palette: { background: "#edf1e8", ink: "#20372c", accent: "#a67c36" },
    fontPair: "kufi",
    layout: "centered",
    motif: "crescent",
    cornerMotif: "trellis",
    rtl: true,
    sample: {
      primary: "عيد مبارك",
      secondary: "آل المنصوري",
      eyebrow: "بكل محبة وفرح",
      message: "نستقبلكم بعد صلاة العيد للقهوة والحلويات.",
      venueName: "بيت المنصوري",
      venueAddress: "دبي، الإمارات",
    },
  },
  {
    id: "anniversary-wine",
    name: "Anniversary Wine",
    occasion: "other",
    style: "Cinematic",
    description: "Burgundy and candlelight for a marriage milestone.",
    palette: { background: "#f2e9e3", ink: "#481d24", accent: "#8c2c3b" },
    fontPair: "romance",
    layout: "envelope",
    motif: "wreath",
    cornerMotif: "gem",
    sample: {
      primary: "Twenty Years",
      secondary: "Sara & Idris",
      eyebrow: "A dinner for our anniversary",
      message: "The same table, the same friends, twenty years later.",
      venueName: "Maison Rouge",
      venueAddress: "Lyon, France",
    },
  },

  /* ----------------------------------------------------------------------- */
  /* The reference set: cards drawn from the supplied studio images, one      */
  /* group per occasion, each with its own cut edge and opening.              */
  /* ----------------------------------------------------------------------- */
  {
    id: "oxblood-ivory",
    name: "Oxblood & ivory",
    occasion: "wedding",
    style: "Luxury editorial",
    description: "Deep wine stock, ivory lettering and a torn deckle edge.",
    palette: { background: "#5c1214", ink: "#f4e7d4", accent: "#d8bd97" },
    fontPair: "didone",
    layout: "classic",
    motif: "wreath",
    cornerMotif: "flourish",
    edge: "deckle",
    opening: {
      experience: "envelope",
      duration: 3200,
      tone: "crimson",
      palette: { accent: "#d8bd97", hull: "#5c1214", paper: "#f4e7d4" },
      welcome: "",
    },
    sample: {
      primary: "Amelia",
      secondary: "Søren",
      eyebrow: "Together with their families",
      message: "We would be honoured by your presence at our wedding.",
      venueName: "The Winter Orangery",
      venueAddress: "Tangier, Morocco",
    },
  },
  {
    id: "garden-deckle",
    name: "Garden deckle",
    occasion: "wedding",
    style: "Botanical",
    description: "Eucalyptus green on soft white, trimmed like a torn sheet.",
    palette: { background: "#eef1ea", ink: "#2e3a31", accent: "#8fa088" },
    fontPair: "romance",
    layout: "centered",
    motif: "branch",
    cornerMotif: "blossom",
    edge: "deckle",
    opening: {
      experience: "floral",
      duration: 3000,
      tone: "ivory",
      palette: { accent: "#8fa088", hull: "#eef1ea", paper: "#ffffff" },
      welcome: "",
    },
    sample: {
      primary: "Noor",
      secondary: "Elias",
      eyebrow: "A garden wedding",
      message: "Dinner, dancing and shade beneath the olive trees.",
      venueName: "Villa Les Oliviers",
      venueAddress: "Meknes, Morocco",
    },
  },
  {
    id: "champagne-scallop",
    name: "Champagne scallop",
    occasion: "wedding",
    style: "Traditional",
    description: "Warm greige silk with a die-cut scalloped trim.",
    palette: { background: "#f1e8d8", ink: "#3a2e22", accent: "#b38f6f" },
    fontPair: "heritage",
    layout: "classic",
    motif: "frame",
    cornerMotif: "flourish",
    edge: "scallop",
    opening: {
      experience: "cards",
      duration: 3000,
      tone: "ivory",
      palette: { accent: "#b38f6f", hull: "#e7dcc7", paper: "#fbf6ec" },
      welcome: "",
    },
    sample: {
      primary: "Beatriz",
      secondary: "Tomás",
      eyebrow: "The marriage of",
      message: "Come and celebrate with us under candlelight.",
      venueName: "Casa Palacio",
      venueAddress: "Seville, Spain",
    },
  },
  {
    id: "midnight-arch",
    name: "Midnight arch",
    occasion: "wedding",
    style: "Cinematic",
    description: "Ink-blue evening card with a domed, arched top.",
    palette: { background: "#0f1a33", ink: "#efe7d6", accent: "#c9a76a" },
    fontPair: "engraved",
    layout: "editorial",
    motif: "sunburst",
    cornerMotif: "star",
    edge: "arch",
    opening: {
      experience: "cinematic",
      duration: 3400,
      tone: "ink",
      palette: { accent: "#c9a76a", hull: "#0f1a33", paper: "#efe7d6" },
      welcome: "",
    },
    sample: {
      primary: "Yasmine",
      secondary: "Karim",
      eyebrow: "Under the evening sky",
      message: "A night of vows, music and lantern light.",
      venueName: "The Riad Terrace",
      venueAddress: "Fes, Morocco",
    },
  },

  /* ------------------------------------------------------------ engagement */
  {
    id: "rose-ask",
    name: "Rose proposal",
    occasion: "engagement",
    style: "Romantic",
    description: "Dusty rose and pearl with a softly petalled edge.",
    palette: { background: "#faeee9", ink: "#4a2b2c", accent: "#c0857f" },
    fontPair: "calligraphy",
    layout: "centered",
    motif: "blossom",
    cornerMotif: "branch",
    edge: "petal",
    opening: {
      experience: "folding",
      duration: 3000,
      tone: "ivory",
      palette: { accent: "#c0857f", hull: "#eedad3", paper: "#fffaf7" },
      welcome: "",
    },
    sample: {
      primary: "Lina",
      secondary: "Adam",
      eyebrow: "We are getting engaged",
      message: "Join us for an evening of dessert and joy.",
      venueName: "The Rose Room",
      venueAddress: "Casablanca, Morocco",
    },
  },
  {
    id: "terracotta-wave",
    name: "Terracotta wave",
    occasion: "engagement",
    style: "Moroccan",
    description: "Sun-baked clay, paisley corners and a rolling wave trim.",
    palette: { background: "#efd9c6", ink: "#54291d", accent: "#b4674a" },
    fontPair: "editorial",
    layout: "classic",
    motif: "paisley",
    cornerMotif: "paisley",
    edge: "wave",
    opening: {
      experience: "arch",
      duration: 3000,
      tone: "ivory",
      palette: { accent: "#b4674a", hull: "#dcbfa6", paper: "#fbf1e7" },
      welcome: "",
    },
    sample: {
      primary: "Salma",
      secondary: "Youssef",
      eyebrow: "Engaged at last",
      message: "An evening of henna, mint tea and celebration.",
      venueName: "Dar Zellij",
      venueAddress: "Rabat, Morocco",
    },
  },

  /* -------------------------------------------------------------- birthday */
  {
    id: "confetti-noir",
    name: "Confetti noir",
    occasion: "birthday",
    style: "Modern geometric",
    description: "Dark cocoa ground, pink confetti and a pinked edge.",
    palette: { background: "#241014", ink: "#f8ece7", accent: "#d98aa3" },
    fontPair: "display",
    layout: "editorial",
    motif: "confetti",
    cornerMotif: "star",
    edge: "notch",
    opening: {
      experience: "cinematic",
      duration: 2800,
      tone: "ink",
      palette: { accent: "#d98aa3", hull: "#241014", paper: "#f8ece7" },
      welcome: "",
    },
    sample: {
      primary: "Turning 30",
      secondary: "Hana",
      eyebrow: "Thirty, flirty and thriving",
      message: "Drinks, dinner and a very late dance floor.",
      venueName: "Rooftop 21",
      venueAddress: "Casablanca, Morocco",
    },
  },
  {
    id: "pearl-bloom",
    name: "Pearl bloom",
    occasion: "birthday",
    style: "Playful",
    description: "Near-white blush with a bow and a scalloped trim.",
    palette: { background: "#fdf8f4", ink: "#5b3a3c", accent: "#e0a9ad" },
    fontPair: "script",
    layout: "centered",
    motif: "bow",
    cornerMotif: "blossom",
    edge: "scallop",
    opening: {
      experience: "floral",
      duration: 2800,
      tone: "ivory",
      palette: { accent: "#e0a9ad", hull: "#f6e8e4", paper: "#fffdfb" },
      welcome: "",
    },
    sample: {
      primary: "Layla",
      secondary: "is seven",
      eyebrow: "Come celebrate",
      message: "Cake, games and a garden full of balloons.",
      venueName: "The Orchard House",
      venueAddress: "Rabat, Morocco",
    },
  },

  /* ------------------------------------------------------------ graduation */
  {
    id: "convocation-navy",
    name: "Convocation navy",
    occasion: "graduation",
    style: "Luxury editorial",
    description: "Navy and gold, engraved capitals, star ornament.",
    palette: { background: "#101c3c", ink: "#f1ecdc", accent: "#c9a76a" },
    fontPair: "engraved",
    layout: "classic",
    motif: "star",
    cornerMotif: "sunburst",
    edge: "straight",
    opening: {
      experience: "typography",
      duration: 3000,
      tone: "ink",
      palette: { accent: "#c9a76a", hull: "#101c3c", paper: "#f1ecdc" },
      welcome: "",
    },
    sample: {
      primary: "Class of 2027",
      secondary: "Adam El Fassi",
      eyebrow: "With pride and gratitude",
      message: "You are warmly invited to the graduation ceremony.",
      venueName: "The Grand Auditorium",
      venueAddress: "Rabat, Morocco",
    },
  },
  {
    id: "scholar-deckle",
    name: "Scholar deckle",
    occasion: "graduation",
    style: "Traditional",
    description: "Warm ivory, old-style serif and a torn paper edge.",
    palette: { background: "#f4efe4", ink: "#24211b", accent: "#8a7b52" },
    fontPair: "book",
    layout: "editorial",
    motif: "flourish",
    cornerMotif: "none",
    edge: "deckle",
    opening: {
      experience: "paper",
      duration: 3000,
      tone: "ivory",
      palette: { accent: "#8a7b52", hull: "#e9e1d0", paper: "#fbf7ee" },
      welcome: "",
    },
    sample: {
      primary: "Nadia",
      secondary: "graduated",
      eyebrow: "Honours in Architecture",
      message: "Join us to celebrate this milestone.",
      venueName: "The Faculty Garden",
      venueAddress: "Casablanca, Morocco",
    },
  },

  /* ------------------------------------------------------------------- Eid */
  {
    id: "eid-emerald-night",
    name: "Emerald night",
    occasion: "eid",
    style: "Traditional",
    description: "Deep emerald, gold crescent and an arched trim, set in RTL.",
    palette: { background: "#123026", ink: "#f3eddc", accent: "#cda96c" },
    fontPair: "arabic",
    layout: "centered",
    motif: "moon",
    cornerMotif: "star",
    edge: "arch",
    rtl: true,
    opening: {
      experience: "door",
      duration: 3200,
      tone: "ink",
      palette: { accent: "#cda96c", hull: "#123026", paper: "#f3eddc" },
      welcome: "",
    },
    sample: {
      primary: "عيد مبارك",
      secondary: "عائلة المنصوري",
      eyebrow: "بكل الفرح والسرور",
      message: "ندعوكم لتناول الإفطار عندنا في ليلة العيد.",
      venueName: "دار النور",
      venueAddress: "الدار البيضاء",
    },
  },
  {
    id: "eid-sand-khatim",
    name: "Sand khatim",
    occasion: "eid",
    style: "Moroccan",
    description: "Sand paper, eight-point khatim star and a scalloped trim.",
    palette: { background: "#f2e7d3", ink: "#3a2a18", accent: "#a9803f" },
    fontPair: "kufi",
    layout: "classic",
    motif: "zellige",
    cornerMotif: "zellige",
    edge: "scallop",
    rtl: true,
    opening: {
      experience: "arch",
      duration: 3000,
      tone: "ivory",
      palette: { accent: "#a9803f", hull: "#e5d5b8", paper: "#fbf5e9" },
      welcome: "",
    },
    sample: {
      primary: "أهلاً بالعيد",
      secondary: "آل بنسعيد",
      eyebrow: "تقبل الله منا ومنكم",
      message: "مساءً نحتفل بحلول العيد مع ضيوفنا الأعزاء.",
      venueName: "الرياض",
      venueAddress: "الرباط، المغرب",
    },
  },

  /* ------------------------------------------------------------------ baby */
  {
    id: "first-bloom",
    name: "First bloom",
    occasion: "baby",
    style: "Minimalist",
    description: "Sage and soft white with a petalled edge and a named welcome.",
    palette: { background: "#f7f4ee", ink: "#3f4a42", accent: "#9db3a4" },
    fontPair: "romance",
    layout: "centered",
    motif: "rattle",
    cornerMotif: "blossom",
    edge: "petal",
    opening: {
      experience: "personal",
      duration: 2800,
      tone: "ivory",
      palette: { accent: "#9db3a4", hull: "#eee9df", paper: "#fffdf8" },
      welcome: "For {{guest}}",
    },
    sample: {
      primary: "Baby Rayan",
      secondary: "is here",
      eyebrow: "A tiny hand to hold",
      message: "Join us for the aqiqah and a welcome lunch.",
      venueName: "The Family Garden",
      venueAddress: "Rabat, Morocco",
    },
  },

  /* ----------------------------------------------------------- everything else */
  {
    id: "cocoa-soiree",
    name: "Cocoa soirée",
    occasion: "other",
    style: "Cinematic",
    description: "Polished cocoa with champagne script and a wave trim.",
    palette: { background: "#3a2018", ink: "#f2e6d6", accent: "#c98f63" },
    fontPair: "display",
    layout: "editorial",
    motif: "flourish",
    cornerMotif: "gem",
    edge: "wave",
    opening: {
      experience: "curtain",
      duration: 3200,
      tone: "ink",
      palette: { accent: "#c98f63", hull: "#3a2018", paper: "#f2e6d6" },
      welcome: "",
    },
    sample: {
      primary: "A Winter Supper",
      secondary: "Ten Years of LAMSA",
      eyebrow: "You are invited",
      message: "A long table, low light and our favourite people.",
      venueName: "Atelier 21",
      venueAddress: "Marrakech, Morocco",
    },
  },
];
/**
 * Backdrop templates imported from the studio pack downloaded from the Google
 * Drive link shared in the studio. The image files are stored in the studio’s
 * public asset bucket under /templates/airvendor/{id}.jpg, and the background
 * track of each file is labelled as a Pinterest reference image that should be
 * replaced before commercial release.
 *
 * IMPORTANT: These samples are supplied as a private-studio starting point only.
 * Replace the reference images with licensed assets before publishing a live
 * invitation. The fx overlay recipe is reusable regardless of the image.
 */
export const BACKDROP_TEMPLATES: InvitationTemplate[] = [
  {
    id: "tent-emerald",
    name: "خيمة مغربية حقيقية",
    occasion: "wedding",
    style: "Moroccan",
    description:
      "A stepped tent field behind a warm gold dust current. Imported as a private-studio reference sample; replace the reference image before publishing.",
    palette: { background: "#d8cfba", ink: "#2a1d1d", accent: "#0b4d3c" },
    fontPair: "arabic",
    layout: "centered",
    motif: "trellis",
    rtl: true,
    sample: {
      primary: "ليلى",
      secondary: "يوسف",
      eyebrow: "خيمة مغربية حقيقية",
      message: "حفل زفاف تحت سماء مراكش.",
      venueName: "الكرانون",
      venueAddress: "مراكش، المغرب",
    },
    background: { kind: "image", storageSeed: "templates/airvendor/1" },
    fx: { dust: ["#ffe08a", 18], sweep: 1, flick: 1 },
  },
  {
    id: "gypsum-candles",
    name: "نيش جبس منقوش",
    occasion: "wedding",
    style: "Traditional",
    description:
      "A carved plaster panel with a warm lantern glow and gold dust. Imported as a private-studio reference sample; replace the reference image before publishing.",
    palette: { background: "#cdc5b7", ink: "#2a1d1d", accent: "#8c6a2e" },
    fontPair: "arabic",
    layout: "centered",
    motif: "arch",
    rtl: true,
    sample: {
      primary: "سلمى",
      secondary: "عمر",
      eyebrow: "نيش جبس منقوش",
      message: "حفل زفاف تحت نور الشموع.",
      venueName: "دار الجبس",
      venueAddress: "المدينة القديمة، مراكش",
    },
    background: { kind: "image", storageSeed: "templates/airvendor/2" },
    backdropLabel: "Pinterest reference image — replace before publishing",
    fx: { dust: ["#ffe0a0", 16], glow: [[0.5, 0.97, 0.9]], sweep: 1 },
  },
  {
    id: "marble-gold",
    name: "قوس فوانيس وورود",
    occasion: "wedding",
    style: "Romantic",
    description:
      "A lantern arch over dark florals, with floating petals and warm dust. Imported as a private-studio reference sample; replace the reference image before publishing.",
    palette: { background: "#4a2a26", ink: "#f2f1ed", accent: "#c96a3a" },
    fontPair: "arabic",
    layout: "centered",
    motif: "arch",
    rtl: true,
    sample: {
      primary: "نور",
      secondary: "ثلاثون",
      eyebrow: "قوس فوانيس وورود",
      message: "حفل زفاف تحت سماء مراكش.",
      venueName: "قاعة الفوانيس",
      venueAddress: "الرباط، المغرب",
    },    background: { kind: "image", storageSeed: "templates/airvendor/3" },
    fx: {
      glow: [
        [0.835, 0.23, 0.14],
        [0.8, 0.33, 0.12],
        [0.17, 0.9, 0.2],
        [0.84, 0.9, 0.2],
        [0.74, 0.92, 0.15],
      ],
      dust: ["#fff0c0", 16],
      petals: ["#f4d9d2", 6],
    },
  },
  {
    id: "velvet-gold",
    name: "عروسين بوردو ولؤلؤ",
    occasion: "engagement",
    style: "Luxury editorial",
    description:
      "A dark velvet ground with spark points and deep petals. Imported as a private-studio reference sample; replace the reference image before publishing.",
    palette: { background: "#2a1420", ink: "#f2e9e3", accent: "#7a1226" },
    fontPair: "arabic",
    layout: "centered",
    motif: "star",
    rtl: true,
    backdropLabel: "Pinterest reference image — replace before publishing",
    sample: {
      primary: "نادية",
      secondary: "كرم",
      eyebrow: "عروسين بوردو ولؤلؤ",
      message: "حفل العرjun bajo سموه.",
      venueName: "دار الخميرة",
      venueAddress: "فاس، المغرب",
    },
    background: { kind: "image", storageSeed: "templates/airvendor/4" },
    fx: {
      spark: [
        [0.1, 0.1],
        [0.2, 0.14],
        [0.16, 0.2],
        [0.78, 0.04],
        [0.7, 0.9],
        [0.9, 0.85],
      ],
      sweep: 1,
      petals: ["#7a1226", 5],
    },
  },
  {
    id: "fassi-linen",
    name: "مخمل بوردو وزهور بيضاء",
    occasion: "wedding",
    style: "Botanical",
    description:
      "A warm velvet ground with gold dust and a handful of sparks. Imported as a private-studio reference sample; replace the reference image before publishing.",
    palette: { background: "#d9c9a8", ink: "#2a1d1d", accent: "#8a1428" },
    fontPair: "arabic",
    layout: "centered",
    motif: "peony",
    rtl: true,
    sample: {
      primary: "أحمد",
      secondary: "مريم",
      eyebrow: "مخمل بوردو وزهور بيضاء",
      message: "حفل زفاف في فاس القديمة.",
      venueName: "دار المخمل",
      venueAddress: "فاس، المغرب",
    },
    background: { kind: "image", storageSeed: "templates/airvendor/5" },
    fx: { dust: ["#ffe08a", 22], sweep: 1, spark: [[0.82, 0.06], [0.1, 0.93], [0.15, 0.88]] },
  },
  {
    id: "zellige-orange",
    name: "كريمي وزهور حمراء",
    occasion: "engagement",
    style: "Playful",
    description:
      "A cream ground with deep red petals, a soft sweep, and warm dust. Imported as a private-studio reference sample; replace the reference image before publishing.",
    palette: { background: "#f6ecdc", ink: "#4a2a26", accent: "#8a1428" },
    fontPair: "arabic",
    layout: "centered",
    motif: "sunburst",
    rtl: true,
    sample: {
      primary: "ز Rf",
      secondary: "حمد",
      eyebrow: "كريمي وزهور حمراء",
      message: "حفل عرjun bajo سموه.",
      venueName: "دار الكريم",
      venueAddress: "الطnit, المغرب",
    },
    background: { kind: "image", storageSeed: "templates/airvendor/6" },
    fx: { petals: ["#8a1428", 7], sweep: 1, dust: ["#fff2cc", 10] },
  },
  {
    id: "tent-brocade",
    name: "ورق مزهر وورود داكنة",
    occasion: "wedding",
    style: "Cinematic",
    description:
      "A dark floral paper field, a slow sweep, and a small spark cluster. Imported as a private-studio reference sample; replace the reference image before publishing.",
    palette: { background: "#2a241c", ink: "#f2e9e3", accent: "#5a1020" },
    fontPair: "arabic",
    layout: "centered",
    motif: "arch",
    rtl: true,
    sample: {
      primary: "ليلى",
      secondary: "يوسف",
      eyebrow: "ورق مزهر وورود داكنة",
      message: "حفل زفاف تحت سماء مراكش.",
      venueName: "الكرانون",
      venueAddress: "مراكش، المغرب",
    },
    background: { kind: "image", storageSeed: "templates/airvendor/7" },
    fx: { petals: ["#5a1020", 7], sweep: 1, spark: [[0.2, 0.8], [0.5, 0.78], [0.8, 0.82]] },
  },
  {
    id: "velvet-gold-2",
    name: "دانتيل وزهور كحلية",
    occasion: "engagement",
    style: "Romantic",
    description:
      "A deep navy ground with pale petals and a quiet spark field. Imported as a private-studio reference sample; replace the reference image before publishing.",
    palette: { background: "#1c2838", ink: "#f2e9e3", accent: "#27466f" },
    fontPair: "arabic",
    layout: "centered",
    motif: "frame",
    rtl: true,
    sample: {
      primary: "نور",
      secondary: "ثلاثون",
      eyebrow: "دانتيل وزهور كحلية",
      message: "حفل عرjun bajo سموه.",
      venueName: "دار الخميرة",
      venueAddress: "فاس، المغرب",
    },
    background: { kind: "image", storageSeed: "templates/airvendor/8" },
    fx: { petals: ["#27466f", 6], spark: [[0.08, 0.08], [0.15, 0.14], [0.9, 0.9], [0.82, 0.82]], sweep: 1 },
  },
  {
    id: "marble-gold-2",
    name: "ورود حمراء وعروسين",
    occasion: "wedding",
    style: "Romantic",
    description:
      "A rich red floral ground with a spark field and deep petals. Imported as a private-studio reference sample; replace the reference image before publishing.",
    palette: { background: "#5a1a24", ink: "#f2e9e3", accent: "#8a1428" },
    fontPair: "arabic",
    layout: "centered",
    motif: "arch",
    rtl: true,
    sample: {
      primary: "سلمى",
      secondary: "عمر",
      eyebrow: "ورود حمراء وعروسين",
      message: "حفل زفاف تحت سماء مراكش.",
      venueName: "الكرانون",
      venueAddress: "مراكش، المغرب",
    },
    background: { kind: "image", storageSeed: "templates/airvendor/9" },
    fx: { spark: [[0.1, 0.05], [0.9, 0.05], [0.12, 0.85], [0.5, 0.95]], petals: ["#8a1428", 6], sweep: 1 },
  },
  {
    id: "fassi-linen-2",
    name: "تطريز أحمر وشرابات",
    occasion: "wedding",
    style: "Traditional",
    description:
      "A linen ground with a bright red embroidered band and warm dust. Imported as a private-studio reference sample; replace the reference image before publishing.",
    palette: { background: "#efe6d3", ink: "#2a1d1d", accent: "#a3182b" },
    fontPair: "arabic",
    layout: "centered",
    motif: "trellis",
    rtl: true,
    sample: {
      primary: "أحمد",
      secondary: "مريم",
      eyebrow: "تطريز أحمر وشرابات",
      message: "حفل زفاف في فاس القديمة.",
      venueName: "دار المخمل",
      venueAddress: "فاس، المغرب",
    },
    background: { kind: "image", storageSeed: "templates/airvendor/10" },
    fx: { sweep: 1, dust: ["#ffd0d0", 10] },
  },
  {
    id: "tent-brocade-2",
    name: "تطريز فاسي أخضر",
    occasion: "wedding",
    style: "Moroccan",
    description:
      "A green fassi linen with a gold tassel and a gold dust field. Imported as a private-studio reference sample; replace the reference image before publishing.",
    palette: { background: "#93a483", ink: "#2a1d1d", accent: "#c9a24a" },
    fontPair: "arabic",
    layout: "centered",
    motif: "trellis",
    rtl: true,
    sample: {
      primary: "نور",
      secondary: "ثلاثون",
      eyebrow: "تطريز فاسي أخضر",
      message: "حفل زفاف تحت سماء مراكش.",
      venueName: "الكرannon",
      venueAddress: "مراكش، المغرب",
    },
    background: { kind: "image", storageSeed: "templates/airvendor/11" },
    fx: { sweep: 1, dust: ["#fff2b0", 14] },
  },
  {
    id: "gypsum-candles-2",
    name: "فاسي أخضر مرتب",
    occasion: "engagement",
    style: "Traditional",
    description:
      "A tidy green fassi ground with gold dust and a slow sweep. Imported as a private-studio reference sample; replace the reference image before publishing.",
    palette: { background: "#93a483", ink: "#2a1d1d", accent: "#c9a24a" },
    fontPair: "arabic",
    layout: "centered",
    motif: "wreath",
    rtl: true,
    sample: {
      primary: "سلمى",
      secondary: "عمر",
      eyebrow: "فاسي أخضر مرتب",
      message: "حفل عرjun bajo سموه.",
      venueName: "دار الجبس",
      venueAddress: "المدينة القديمة، مراكش",
    },
    background: { kind: "image", storageSeed: "templates/airvendor/12" },
    fx: { sweep: 1, dust: ["#fff2b0", 14] },
  },
];


export function templateById(templateId: string): InvitationTemplate {
  return TEMPLATES.find((template) => template.id === templateId) ?? TEMPLATES[0];
}

export function fontPairById(fontPair: FontPairId) {
  return FONT_PAIRS.find((pair) => pair.id === fontPair) ?? FONT_PAIRS[0];
}

export const occasionLabel = (occasion: Occasion) =>
  OCCASIONS.find((item) => item.id === occasion)?.label ?? "Invitation";

/** Occasion-aware labels and copy for the editor. */
export const OCCASION_COPY: Record<
  Occasion,
  { nameLabel: string; secondaryLabel: string; eyebrow: string; message: string }
> = {
  wedding: {
    nameLabel: "First name",
    secondaryLabel: "Second name",
    eyebrow: "Together with their families",
    message: "With full hearts, we invite you to share in our wedding day.",
  },
  engagement: {
    nameLabel: "First name",
    secondaryLabel: "Second name",
    eyebrow: "A celebration of love",
    message: "Come raise a glass as we celebrate our engagement.",
  },
  birthday: {
    nameLabel: "Celebrant",
    secondaryLabel: "Age or note",
    eyebrow: "You are warmly invited",
    message: "Join us for an evening of good food, good music, and good company.",
  },
  graduation: {
    nameLabel: "Graduate",
    secondaryLabel: "Class or note",
    eyebrow: "The family of",
    message: "Please join us in celebrating this milestone and the road ahead.",
  },
  eid: {
    nameLabel: "Family name",
    secondaryLabel: "Gathering",
    eyebrow: "Eid Mubarak",
    message: "From our home to yours — please join us after Eid prayer for warmth, sweets, and celebration.",
  },
  baby: {
    nameLabel: "Baby's name",
    secondaryLabel: "Aqiqah or note",
    eyebrow: "With gratitude to God",
    message: "We joyfully invite you to meet our little one and share in our blessing.",
  },
  other: {
    nameLabel: "Name or title",
    secondaryLabel: "Subtitle",
    eyebrow: "You are invited",
    message: "We would be delighted to have you with us for this occasion.",
  },
};

export function futureSampleDate(offsetDays = 120): string {
  return format(addDays(new Date(), offsetDays), "yyyy-MM-dd");
}

/** Builds a complete, ready-to-preview draft from a template. */
export function draftFromTemplate(templateId: string): InvitationContent {
  const template = templateById(templateId);
  return {
    title: `${template.name} invitation`,
    occasion: template.occasion,
    templateId: template.id,
    names: {
      primary: template.sample.primary,
      secondary: template.sample.secondary,
    },
    eyebrow: template.sample.eyebrow,
    message: template.sample.message,
    date: futureSampleDate(),
    time: "16:00",
    venueName: template.sample.venueName,
    venueAddress: template.sample.venueAddress,
    palette: template.palette,
    fontPair: template.fontPair,
    layout: template.layout,
    motif: template.motif,
    cornerMotif: template.cornerMotif ?? "none",
    animations: true,
    rtl: template.rtl ?? false,
  };
}

export function contentFromInvitation(doc: InvitationContent): InvitationContent {
  return {
    title: doc.title,
    occasion: doc.occasion,
    templateId: doc.templateId,
    names: doc.names,
    eyebrow: doc.eyebrow,
    message: doc.message,
    date: doc.date,
    time: doc.time,
    venueName: doc.venueName,
    venueAddress: doc.venueAddress,
    palette: doc.palette,
    fontPair: doc.fontPair,
    layout: doc.layout,
    motif: doc.motif,
    cornerMotif: doc.cornerMotif ?? "none",
    animations: doc.animations,
    rtl: doc.rtl ?? false,
    schedule: doc.schedule ?? [],
    dressCode: doc.dressCode ?? "",
    mapUrl: doc.mapUrl ?? "",
    hostNotes: doc.hostNotes ?? "",
    rsvp: doc.rsvp ?? undefined,
    photos: doc.photos,
    music: doc.music,
  };
}

export function formatEventDate(date: string): string {
  if (!date) return "Date to be announced";

const parsed = parse(date, "yyyy-MM-dd", new Date());
  if (!isValid(parsed)) return "Date to be announced";
  return format(parsed, "EEEE, d MMMM yyyy");
}

export function formatEventDateShort(date: string): string {
  if (!date) return "Date to be announced";

const parsed = parse(date, "yyyy-MM-dd", new Date());
  if (!isValid(parsed)) return "Date to be announced";
  return format(parsed, "d MMM yyyy");
}

export function formatEventTime(time: string): string {
  if (!time) return "";

const parsed = parse(time, "HH:mm", new Date());
  if (!isValid(parsed)) return "";
  return format(parsed, "h:mm a");
}

export function isPairedOccasion(occasion: Occasion): boolean {
  return occasion === "wedding" || occasion === "engagement";
}

export function displayTitle(content: Pick<InvitationContent, "names" | "occasion">) {
  if (isPairedOccasion(content.occasion)) {
    return `${content.names.primary || "Name"} & ${content.names.secondary || "Name"}`;
  }
  return content.names.primary || "Your invitation";
}

export function whatsappShareHref(text: string, url?: string): string {
  const body = url ? `${text}\n${url}` : text;
  return `https://wa.me/?text=${encodeURIComponent(body.slice(0, 1600))}`;
}

/** Builds an .ics data URL for the event. */
export function calendarHref(content: Pick<InvitationContent, "date" | "time" | "venueName" | "venueAddress" | "message" | "names" | "occasion">): string {
  const parsedDate = content.date
    ? parse(content.date, "yyyy-MM-dd", new Date())
    : addDays(new Date(), 30);

  const [hours, minutes] = (content.time || "18:00").split(":").map(Number);

  const start = new Date(parsedDate);
  start.setHours(
    Number.isFinite(hours) ? hours : 18,
    Number.isFinite(minutes) ? minutes : 0,
    0,
    0,
  );

  const end = addHours(start, 3);

  const stamp = (value: Date) => format(value, "yyyyMMdd'T'HHmmss");

  const uid = `lamsa-${Date.now()}@lamsa.studio`;

const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LAMSA//Invitations//EN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp(new Date())}Z`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${displayTitle(content)}`,
    `LOCATION:${[content.venueName, content.venueAddress].filter(Boolean).join(", ")}`,
    `DESCRIPTION:${content.message.replace(/\n/g, " ")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join("\r\n"))}`;
}
