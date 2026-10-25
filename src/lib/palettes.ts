import type { DesignDocument, DesignPage } from "@/lib/design";

/**
 * Curated invitation palettes.
 *
 * A palette has three real roles: paper (the page), ink (type and ornaments)
 * and accent (rules, seals, borders). Applying one only remaps colours that
 * already exist in the design, so photographs, positions and layout stay put.
 */
export interface ColourPalette {
  id: string;
  name: string;
  group: string;
  paper: string;
  ink: string;
  accent: string;
  /** Optional page treatment applied together with the palette. */
  background?: string;
}

export const PALETTE_GROUPS = [
  "Luxury",
  "Romantic",
  "Botanical",
  "Minimal",
  "Moroccan",
  "Modern",
  "Neutral",
  "Dark & metallic",
  "Festive",
] as const;

export const PALETTES: ColourPalette[] = [
  {
    id: "crimson-didone",
    name: "Crimson didone",
    group: "Luxury",
    paper: "#f2f1ed",
    ink: "#161616",
    accent: "#710014",
  },
  {
    id: "champagne-noir",
    name: "Champagne noir",
    group: "Luxury",
    paper: "#141312",
    ink: "#f4ecdd",
    accent: "#c3a469",
    background: "linear-gradient(170deg, #1d1a17 0%, #141312 60%, #0b0a09 100%)",
  },
  {
    id: "ivory-gold",
    name: "Ivory & gold",
    group: "Luxury",
    paper: "#faf6ec",
    ink: "#2a241b",
    accent: "#b49058",
  },
  {
    id: "blush-script",
    name: "Blush script",
    group: "Romantic",
    paper: "#f9ebe8",
    ink: "#4a2a26",
    accent: "#b9746d",
    background: "radial-gradient(90% 70% at 50% 0%, #fdf3f0 0%, #f8e8e4 60%, #f2ddd8 100%)",
  },
  {
    id: "rosewood",
    name: "Rosewood",
    group: "Romantic",
    paper: "#efe0dd",
    ink: "#3d2026",
    accent: "#8c3b4a",
  },
  {
    id: "peony-mist",
    name: "Peony mist",
    group: "Romantic",
    paper: "#f6edf1",
    ink: "#3a2a33",
    accent: "#b1768d",
  },
  {
    id: "pressed-leaf",
    name: "Pressed leaf",
    group: "Botanical",
    paper: "#eef1e6",
    ink: "#2f3a2a",
    accent: "#7d8a5c",
    background: "linear-gradient(152deg, #f2f4eb 0%, #e7ecdc 58%, #dfe6d2 100%)",
  },
  {
    id: "olive-grove",
    name: "Olive grove",
    group: "Botanical",
    paper: "#f1efe4",
    ink: "#33382a",
    accent: "#8a8f4e",
  },
  {
    id: "eucalyptus",
    name: "Eucalyptus",
    group: "Botanical",
    paper: "#e9efe9",
    ink: "#26382f",
    accent: "#6d8f78",
  },
  {
    id: "gallery-white",
    name: "Gallery white",
    group: "Minimal",
    paper: "#f8f8f5",
    ink: "#1c1c1c",
    accent: "#5f6368",
  },
  {
    id: "stone",
    name: "Stone",
    group: "Minimal",
    paper: "#f2f0eb",
    ink: "#2d2c29",
    accent: "#9a958c",
  },
  {
    id: "ink-line",
    name: "Ink line",
    group: "Minimal",
    paper: "#ffffff",
    ink: "#101010",
    accent: "#101010",
  },
  {
    id: "zellige",
    name: "Zellige",
    group: "Moroccan",
    paper: "#f4ead8",
    ink: "#20372c",
    accent: "#a67c36",
    background: "linear-gradient(135deg, #f7eeda 0%, #efe0c3 46%, #e7d3ad 100%)",
  },
  {
    id: "riad-saffron",
    name: "Riad saffron",
    group: "Moroccan",
    paper: "#f7ecd2",
    ink: "#4a2b13",
    accent: "#c07a22",
  },
  {
    id: "majorelle",
    name: "Majorelle",
    group: "Moroccan",
    paper: "#eae6f2",
    ink: "#22224a",
    accent: "#3f4fa0",
  },
  {
    id: "marigold",
    name: "Marigold",
    group: "Modern",
    paper: "#f8e8c8",
    ink: "#4c2b12",
    accent: "#c17a24",
  },
  {
    id: "vermillion",
    name: "Vermillion",
    group: "Modern",
    paper: "#f4f4f1",
    ink: "#17181a",
    accent: "#c4472f",
  },
  {
    id: "cobalt-court",
    name: "Cobalt court",
    group: "Modern",
    paper: "#eef1f8",
    ink: "#15203a",
    accent: "#2c4a8f",
  },
  {
    id: "sand-linen",
    name: "Sand linen",
    group: "Neutral",
    paper: "#f4efe6",
    ink: "#2b2723",
    accent: "#b38f6f",
  },
  {
    id: "clay",
    name: "Clay",
    group: "Neutral",
    paper: "#efe5dd",
    ink: "#3a2c25",
    accent: "#a5715a",
  },
  {
    id: "powder",
    name: "Powder blue",
    group: "Neutral",
    paper: "#e9eef2",
    ink: "#22303a",
    accent: "#7f97a8",
  },
  {
    id: "obsidian-cinzel",
    name: "Obsidian",
    group: "Dark & metallic",
    paper: "#161616",
    ink: "#f2f1ed",
    accent: "#b38f6f",
    background: "radial-gradient(110% 80% at 50% 10%, #2a2420 0%, #161616 62%, #0d0d0d 100%)",
  },
  {
    id: "nocturne",
    name: "Nocturne",
    group: "Dark & metallic",
    paper: "#1d2024",
    ink: "#eee6d7",
    accent: "#b6a27c",
    background: "linear-gradient(182deg, #23262b 0%, #1d2024 44%, #131518 100%)",
  },
  {
    id: "emerald-gilt",
    name: "Emerald & gilt",
    group: "Dark & metallic",
    paper: "#122a24",
    ink: "#f1e9d6",
    accent: "#c9a962",
  },
  {
    id: "celebration",
    name: "Celebration",
    group: "Festive",
    paper: "#fff5e6",
    ink: "#40200f",
    accent: "#e0722a",
  },
  {
    id: "confetti",
    name: "Confetti",
    group: "Festive",
    paper: "#fff9f2",
    ink: "#2a2233",
    accent: "#e0556e",
  },
  {
    id: "eid-jade",
    name: "Eid jade",
    group: "Festive",
    paper: "#eef5ef",
    ink: "#1c3a2c",
    accent: "#a8862d",
  },
];

export const GRADIENT_PRESETS: { id: string; name: string; value: string }[] = [
  {
    id: "dawn",
    name: "Dawn paper",
    value: "linear-gradient(165deg, #fbf5ea 0%, #f3e7d6 60%, #ecdcc5 100%)",
  },
  {
    id: "dusk",
    name: "Dusk ink",
    value: "linear-gradient(180deg, #23262b 0%, #1a1c20 55%, #101215 100%)",
  },
  {
    id: "rose",
    name: "Rose wash",
    value: "radial-gradient(90% 70% at 50% 0%, #fdf3f0 0%, #f6e3e0 62%, #eed4d0 100%)",
  },
  {
    id: "sage",
    name: "Sage wash",
    value: "linear-gradient(150deg, #f2f4eb 0%, #e6ecdc 55%, #dbe4cf 100%)",
  },
  {
    id: "sand",
    name: "Sand veil",
    value: "linear-gradient(135deg, #f7eeda 0%, #efe0c3 48%, #e6d2ac 100%)",
  },
];

/* -------------------------------------------------------------------------- */
/* Saved and recent colours                                                   */
/* -------------------------------------------------------------------------- */

const SAVED_KEY = "lamsa.colours.saved";
const RECENT_KEY = "lamsa.colours.recent";

function read(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function write(key: string, value: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private windows may block storage; the panel still applies colours.
  }
}

export function readSavedColours(): string[] {
  return read(SAVED_KEY);
}

export function saveColour(value: string): string[] {
  const next = [value, ...read(SAVED_KEY).filter((item) => item !== value)].slice(0, 32);
  write(SAVED_KEY, next);
  return next;
}

export function removeSavedColour(value: string): string[] {
  const next = read(SAVED_KEY).filter((item) => item !== value);
  write(SAVED_KEY, next);
  return next;
}

export function readRecentColours(): string[] {
  return read(RECENT_KEY);
}

export function rememberColour(value: string): string[] {
  const next = [value, ...read(RECENT_KEY).filter((item) => item !== value)].slice(0, 14);
  write(RECENT_KEY, next);
  return next;
}

/* -------------------------------------------------------------------------- */
/* Recolour                                                                   */
/* -------------------------------------------------------------------------- */

/** Most frequent value in a colour tally. */
function top(counts: Map<string, number>): string | undefined {
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

/**
 * Type colour is the design's ink; shape fill/stroke is its accent. Ranking by
 * raw frequency would mistake a heavily used accent for the ink, so the roles
 * are read from the layers themselves.
 */
function dominantColours(
  design: DesignDocument,
  pageIndex: number,
): { ink?: string; accent?: string } {
  const type = new Map<string, number>();
  const ornament = new Map<string, number>();
  const add = (map: Map<string, number>, colour?: string) => {
    if (!colour || colour === "transparent") return;
    map.set(colour, (map.get(colour) ?? 0) + 1);
  };
  for (const element of design.pages[pageIndex]?.elements ?? []) {
    if (element.kind === "text" || element.kind === "motif") add(type, element.color);
    if (element.kind === "shape" || element.kind === "image") {
      add(ornament, element.fill);
      add(ornament, element.stroke);
    }
  }
  const ink = top(type) ?? top(ornament);
  // The accent is read from ornament layers only. Falling back to a second
  // text colour would silently recolour a line the host set by hand, which is
  // exactly what a palette change promises not to touch.
  const accent = top(ornament) && top(ornament) !== ink ? top(ornament) : undefined;
  return { ink, accent };
}

/**
 * Maps a design's dominant ink and accent onto a palette. Colours the host set
 * by hand that are not part of the dominant pair are left untouched.
 */
export function recolourDesign(
  design: DesignDocument,
  palette: ColourPalette,
): DesignDocument {
  const { ink, accent } = dominantColours(design, 0);
  const map = (value: string | undefined) => {
    if (!value) return value;
    const normalized = value.toLowerCase();
    if (ink && normalized === ink.toLowerCase()) return palette.ink;
    if (accent && normalized === accent.toLowerCase()) return palette.accent;
    return value;
  };
  return {
    ...design,
    pages: design.pages.map((page) => ({
      ...page,
      background:
        palette.background ??
        (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(page.background)
          ? palette.paper
          : page.background),
      elements: page.elements.map((element) => ({
        ...element,
        color: map(element.color),
        fill: map(element.fill),
        stroke: map(element.stroke),
        textBackground: map(element.textBackground),
        textBorder: map(element.textBorder),
      })),
    })),
  };
}

/* -------------------------------------------------------------------------- */
/* Saved palettes                                                             */
/* -------------------------------------------------------------------------- */

export interface SavedPalette {
  id: string;
  name: string;
  paper: string;
  ink: string;
  accent: string;
}

export const SAVED_PALETTES_KEY = "lamsa.savedPalettes.v1";
export const MAX_SAVED_PALETTES = 24;

/** The three working roles of the current page, read from its own layers. */
export function paletteFromPage(page: DesignPage): Omit<SavedPalette, "id" | "name"> {
  const paper = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(page.background)
    ? page.background
    : "#f2f1ed";
  const type = new Map<string, number>();
  const ornament = new Map<string, number>();
  const add = (map: Map<string, number>, colour?: string) => {
    if (!colour || colour === "transparent") return;
    map.set(colour, (map.get(colour) ?? 0) + 1);
  };
  for (const element of page.elements) {
    if (element.kind === "text" || element.kind === "motif") add(type, element.color);
    if (element.kind === "shape" || element.kind === "image") {
      add(ornament, element.fill);
      add(ornament, element.stroke);
    }
  }
  const ink =
    [...type.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
    [...ornament.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
    "#161616";
  const accent =
    [...ornament.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([colour]) => colour)
      .find((colour) => colour.toLowerCase() !== ink.toLowerCase()) ?? "#b38f6f";
  return { paper, ink, accent };
}

/** Replaces a palette with the same id, otherwise adds it at the front. */
export function upsertSavedPalette(
  list: SavedPalette[],
  entry: SavedPalette,
): SavedPalette[] {
  return [entry, ...list.filter((item) => item.id !== entry.id)].slice(
    0,
    MAX_SAVED_PALETTES,
  );
}

export function removeSavedPalette(
  list: SavedPalette[],
  id: string,
): SavedPalette[] {
  return list.filter((item) => item.id !== id);
}

function paletteStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readSavedPalettes(
  store: Storage | null = paletteStorage(),
): SavedPalette[] {
  if (!store) return [];
  try {
    const raw = store.getItem(SAVED_PALETTES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is SavedPalette =>
          Boolean(item) &&
          typeof item === "object" &&
          typeof (item as SavedPalette).id === "string" &&
          typeof (item as SavedPalette).name === "string" &&
          typeof (item as SavedPalette).paper === "string" &&
          typeof (item as SavedPalette).ink === "string" &&
          typeof (item as SavedPalette).accent === "string",
      )
      .slice(0, MAX_SAVED_PALETTES);
  } catch {
    return [];
  }
}

export function writeSavedPalettes(
  list: SavedPalette[],
  store: Storage | null = paletteStorage(),
): SavedPalette[] {
  const next = list.slice(0, MAX_SAVED_PALETTES);
  if (store) {
    try {
      store.setItem(SAVED_PALETTES_KEY, JSON.stringify(next));
    } catch {
      // Losing a palette preference never affects the design.
    }
  }
  return next;
}
