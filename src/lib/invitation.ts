import { addDays, addHours, format, isValid, parse } from "date-fns";
import type { Infer } from "convex/values";
import type { Id } from "@/convex/_generated/dataModel";
import {
  motifValidator,
  occasionValidator,
  scheduleItemValidator,
} from "@/convex/validators";

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
] as const;

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
  animations: boolean;
  /** Right-to-left (Arabic) presentation, new in LAMSA v5. */
  rtl?: boolean;

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
  // LAMSA v5 brand palette presets.
  {
    name: "Crimson & pearl",
    palette: { background: "#f2f1ed", ink: "#161616", accent: "#710014" },
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
  description: string;
  palette: InvitationPalette;
  fontPair: FontPairId;
  layout: LayoutId;
  motif: MotifId;
  /** Templates designed for right-to-left reading start in RTL. */
  rtl?: boolean;
  sample: {
    primary: string;
    secondary: string;
    eyebrow: string;
    message: string;
    venueName: string;
    venueAddress: string;
  };
}

export const TEMPLATES: InvitationTemplate[] = [
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

/**
 * Pre-filled WhatsApp share link. `wa.me` works on every platform and opens
 * the share sheet without needing any service or recipient number.
 */
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
