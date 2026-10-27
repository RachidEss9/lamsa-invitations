import {
  OPENING_TONES,
  type OpeningPalette,
  type OpeningSettings,
  type OpeningToneId,
} from "./design";
import type { OpeningPresetId } from "./opening";

/**
 * The Opening Designer's saved configurations.
 *
 * Everything here is stored as plain data beside the invitation, so a
 * configuration can be reused on another invitation without touching its own
 * identity (its welcome line and cover image stay where they belong). The
 * functions are pure, so the rules can be tested without a browser.
 */

export const OPENING_STORE_KEY = "lamsa.openings.v1";
const MAX_SAVED_OPENINGS = 18;

/* -------------------------------------------------------------------------- */
/* Curated looks                                                              */
/* -------------------------------------------------------------------------- */

/**
 * A finished opening: experience, tone and palette drawn as one look, so a
 * host picks a mood instead of assembling three controls. Every value is a
 * screen colour for the opening only — the invitation's own artwork is never
 * recoloured by choosing one.
 */
export interface OpeningLook {
  id: string;
  name: string;
  note: string;
  experience: OpeningSettings["experience"];
  tone: OpeningToneId;
  palette: { accent: string; hull: string; paper: string };
  duration: number;
}

export const OPENING_LOOKS: OpeningLook[] = [
  {
    id: "look-oxblood",
    name: "Oxblood wax",
    note: "A wine envelope with ivory tissue and a gold seal",
    experience: "envelope",
    tone: "crimson",
    palette: { accent: "#d8bd97", hull: "#5c1214", paper: "#f4e7d4" },
    duration: 3200,
  },
  {
    id: "look-garden",
    name: "Ivory garden",
    note: "Eucalyptus green wreath opening on white stock",
    experience: "floral",
    tone: "ivory",
    palette: { accent: "#8fa088", hull: "#eef1ea", paper: "#ffffff" },
    duration: 3000,
  },
  {
    id: "look-champagne",
    name: "Champagne stack",
    note: "Layered greige cards lifting one by one",
    experience: "cards",
    tone: "ivory",
    palette: { accent: "#b38f6f", hull: "#e7dcc7", paper: "#fbf6ec" },
    duration: 3000,
  },
  {
    id: "look-midnight",
    name: "Midnight cinema",
    note: "Ink-blue letterbox bars with a gold horizon",
    experience: "cinematic",
    tone: "ink",
    palette: { accent: "#c9a76a", hull: "#0f1a33", paper: "#efe7d6" },
    duration: 3400,
  },
  {
    id: "look-rose",
    name: "Rose gate-fold",
    note: "Blush panels folding open onto pearl paper",
    experience: "folding",
    tone: "ivory",
    palette: { accent: "#c0857f", hull: "#eedad3", paper: "#fffaf7" },
    duration: 3000,
  },
  {
    id: "look-cocoa",
    name: "Cocoa curtain",
    note: "Heavy brown panels parting onto champagne script",
    experience: "curtain",
    tone: "ink",
    palette: { accent: "#c98f63", hull: "#3a2018", paper: "#f2e6d6" },
    duration: 3200,
  },
  {
    id: "look-emerald",
    name: "Emerald doors",
    note: "Panelled doors in deep green with gilded light",
    experience: "door",
    tone: "ink",
    palette: { accent: "#cda96c", hull: "#123026", paper: "#f3eddc" },
    duration: 3200,
  },
  {
    id: "look-blush",
    name: "Blush welcome",
    note: "A named greeting before a soft pearl card",
    experience: "personal",
    tone: "ivory",
    palette: { accent: "#e0a9ad", hull: "#f6e8e4", paper: "#fffdfb" },
    duration: 2800,
  },
];

/**
 * Applies a look to this invitation's own opening: the guest-facing wording
 * and the uploaded cover photograph stay exactly where they were, and the
 * motion returns to the experience's own timeline so the look plays the way it
 * was composed.
 */
export function openingLookSettings(
  look: OpeningLook,
  current: OpeningSettings,
): OpeningSettings {
  return {
    ...current,
    experience: look.experience,
    tone: look.tone,
    palette: { ...look.palette },
    duration: look.duration,
    motion: undefined,
  };
}

export interface SavedOpening {
  id: string;
  label: string;
  createdAt: number;
  opening: OpeningSettings;
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function safeColour(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && HEX.test(trimmed) ? trimmed : fallback;
}

/** The tone a saved opening uses, with each preset's own natural default. */
export function openingToneOf(settings: OpeningSettings): OpeningToneId {
  if (settings.tone && OPENING_TONES.some((tone) => tone.id === settings.tone)) {
    return settings.tone;
  }
  return settings.experience === "wax-seal" ? "ink" : "crimson";
}

/** Brilliant white and ink fallbacks, used when an override is not a colour. */
export function openingPaletteOf(
  base: { accent: string; paper: string; hull: string },
  settings: OpeningSettings,
): { accent: string; paper: string; hull: string } {
  return {
    accent: safeColour(settings.palette?.accent, base.accent),
    paper: safeColour(settings.palette?.paper, base.paper),
    hull: safeColour(settings.palette?.hull, base.hull),
  };
}

/** Only the fields a configuration should carry: never another invitation's image cover. */
function payloadOf(settings: OpeningSettings): OpeningSettings {
  return {
    experience: settings.experience,
    duration: settings.duration,
    autoOpen: settings.autoOpen,
    welcome: settings.welcome,
    tone: settings.tone,
    palette: settings.palette,
    motion: settings.motion,
    // The physical suite travels with a saved opening: an envelope size is part
    // of the look, not a per-invitation afterthought.
    stationery: settings.stationery,
  };
}

export function parseSavedOpenings(raw: string | null): SavedOpening[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is SavedOpening => {
        if (!entry || typeof entry !== "object") return false;
        const candidate = entry as Partial<SavedOpening>;
        return (
          typeof candidate.id === "string" &&
          typeof candidate.label === "string" &&
          Boolean(candidate.opening) &&
          typeof candidate.opening?.experience === "string"
        );
      })
      .slice(0, MAX_SAVED_OPENINGS);
  } catch {
    return [];
  }
}

export function serializeSavedOpenings(list: SavedOpening[]): string {
  return JSON.stringify(list.slice(0, MAX_SAVED_OPENINGS));
}

export function upsertSavedOpening(
  list: SavedOpening[],
  settings: OpeningSettings,
  label: string,
  now = Date.now(),
): SavedOpening[] {
  const clean = label.trim() || `${settings.experience} opening`;
  const entry: SavedOpening = {
    id: `opening_${now.toString(36)}`,
    label: clean,
    createdAt: now,
    opening: payloadOf(settings),
  };
  // Saving the same name again updates it rather than piling up duplicates.
  const rest = list.filter(
    (saved) => saved.label.toLowerCase() !== clean.toLowerCase(),
  );
  return [entry, ...rest].slice(0, MAX_SAVED_OPENINGS);
}

export function removeSavedOpening(
  list: SavedOpening[],
  id: string,
): SavedOpening[] {
  return list.filter((saved) => saved.id !== id);
}

/**
 * Applies a saved configuration to an invitation. The choreography, materials,
 * colours and welcome line travel; the invitation's own image cover and
 * automatic-open preference stay as the host set them.
 */
export function applySavedOpening(
  current: OpeningSettings,
  saved: SavedOpening,
): OpeningSettings {
  return {
    ...current,
    experience: saved.opening.experience,
    duration: saved.opening.duration,
    welcome: saved.opening.welcome ?? current.welcome,
    tone: saved.opening.tone,
    palette: saved.opening.palette,
    motion: saved.opening.motion,
    stationery: saved.opening.stationery,
  };
}

/** A readable summary for the library list. */
export function openingSummary(settings: OpeningSettings): string {
  const tone = openingToneOf(settings);
  const parts = [
    `${Math.round(settings.duration / 100) / 10}s`,
    OPENING_TONES.find((entry) => entry.id === tone)?.label ?? tone,
    ...(settings.stationery
      ? [`${Math.round(settings.stationery.width)}×${Math.round(settings.stationery.height)} mm`]
      : []),
  ];
  if (settings.motion?.startScale !== undefined) {
    parts.push(`${Math.round(settings.motion.startScale * 100)}% start`);
  }
  if (settings.palette?.accent) parts.push(settings.palette.accent.toUpperCase());
  return parts.join(" · ");
}

/** Preset identity for the designer's stage strip. */
export const OPENING_STAGES: {
  id: string;
  label: string;
  progress: number;
  note: string;
}[] = [
  { id: "sealed", label: "Sealed", progress: 0.04, note: "The suite, untouched" },
  { id: "opening", label: "Opening", progress: 0.38, note: "The frame gives way" },
  { id: "emerging", label: "Emerging", progress: 0.68, note: "The card leaves the suite" },
  { id: "settled", label: "Settled", progress: 1, note: "Full frame, ready to read" },
];

export function presetLabel(
  preset: OpeningPresetId | undefined,
  fallback = "Opening",
): string {
  return preset ? preset.replace(/-/g, " ") : fallback;
}

export type { OpeningPalette };
