/**
 * Decorative frames.
 *
 * Every frame is original vector artwork: stroked paths drawn in a normalised
 * 0–100 box. The border artwork stretches with the element so a frame always
 * follows the invitation's real page ratio, while the corner ornaments are
 * drawn square and mirrored into each corner so they never distort.
 *
 * A frame is stored on an ordinary `shape` element (`frameArt`), which means
 * selection, moving, resizing, rotation, duplication, layer order, locking,
 * colour, stroke weight, opacity, saving, publishing, and PDF export all keep
 * working through the paths the editor already has.
 */

export type FrameGroup =
  | "Botanical"
  | "Classic"
  | "Vintage"
  | "Art Deco"
  | "Romantic"
  | "Moroccan"
  | "Minimal";

export const FRAME_GROUPS: FrameGroup[] = [
  "Botanical",
  "Classic",
  "Vintage",
  "Art Deco",
  "Romantic",
  "Moroccan",
  "Minimal",
];

export interface FrameSpec {
  id: string;
  name: string;
  group: FrameGroup;
  note: string;
  /** Stretched border artwork, stroked and never filled. */
  outline: string[];
  /** Square ornament repeated in all four corners, as a % of the width. */
  corner?: { art: string[]; size: number };
}

/* -------------------------------------------------------------------------- */
/* Corner ornaments                                                           */
/* -------------------------------------------------------------------------- */

/** A hand-drawn sprig of olive leaves reaching in from the corner. */
const LEAF_SPRIG = [
  "M4 62 C20 56 33 43 40 24",
  "M20 47 C14 38 11 26 16 15 C27 20 33 32 33 44",
  "M30 36 C26 24 28 12 36 4 C45 12 47 26 42 37",
  "M40 24 C45 17 54 12 63 12 C60 23 52 31 42 34",
  "M12 56 C16 50 24 48 30 52",
];

/** Tight botanical ticks: quieter than the sprig, reads as marquetry. */
const LEAF_TICKS = [
  "M2 2 H26 M2 2 V26",
  "M8 16 C14 12 20 10 26 10",
  "M16 8 C12 14 10 20 10 26",
  "M6 6 L16 16",
];

/** Eighteenth-century scrolls for a baroque card. */
const BAROQUE_SCROLL = [
  "M6 6 C36 6 54 18 60 38",
  "M6 6 C6 36 18 54 38 60",
  "M22 22 C38 22 47 27 52 36 C42 41 30 38 23 31",
  "M22 22 C22 38 27 47 36 52 C41 42 38 30 31 23",
  "M6 44 C14 44 20 48 23 56",
  "M44 6 C44 14 48 20 56 23",
];

/** Broad acanthus leaves, drawn as tapered double curves. */
const ACANTHUS = [
  "M2 2 H30 M2 2 V30",
  "M2 16 C16 16 26 23 31 38",
  "M16 2 C16 16 23 26 38 31",
  "M2 30 C9 30 14 35 14 42",
  "M30 2 C30 9 35 14 42 14",
  "M10 10 C22 12 30 20 32 32",
];

/** Stepped Art Deco bracket with a fine fan. */
const DECO_BRACKET = [
  "M2 2 H40 M2 2 V40",
  "M10 10 H30 M10 10 V30",
  "M18 2 V18 M2 18 H18",
  "M10 10 L30 30",
  "M2 2 L18 18",
];

/** Deco rays fanning out from the corner. */
const DECO_RAYS = [
  "M2 2 H34 M2 2 V34",
  "M2 2 L26 26",
  "M14 2 L2 14",
  "M22 2 L2 22",
  "M2 2 L34 10 M2 2 L10 34",
];

/** A small rose of arcs, for romantic stationery. */
const ROSE_CLUSTER = [
  "M2 2 C22 6 34 17 40 36",
  "M18 14 a9 9 0 1 1 -0.1 0",
  "M21 17 a6 6 0 1 1 -0.1 0",
  "M24 20 a3 3 0 1 1 -0.1 0",
  "M10 24 C17 24 22 28 24 35",
  "M24 10 C24 17 28 22 35 24",
];

/** Zellige star and band, Moroccan in spirit and geometry. */
const ZELLIGE_STAR = [
  "M2 2 H34 M2 2 V34",
  "M2 18 L18 2",
  "M4 4 L20 20",
  "M10 10 L24 10 L24 24 L10 24 Z",
  "M10 24 L24 10",
];

/** Interlaced Andalusian strapwork. */
const ANDALUSIAN_KNOT = [
  "M2 2 H36 M2 2 V36",
  "M2 2 L16 16 M16 2 L2 16",
  "M2 28 C10 28 16 22 16 14",
  "M28 2 C28 10 22 16 14 16",
  "M8 8 L22 22",
];

/** Bare corner ticks: the quietest frame in the collection. */
const CORNER_TICKS = ["M2 16 V2 H16", "M6 10 V6 H10"];

/** A fern frond curling in from the corner, drawn as tapered pinnae. */
const FERN_FROND = [
  "M2 2 H34 M2 2 V34",
  "M6 30 C12 22 16 14 22 4",
  "M10 26 C6 22 4 18 4 12",
  "M14 20 C18 18 22 14 24 8",
  "M6 22 C12 20 16 16 18 10",
];

/** A pressed flower: four petals on a stem, quietly botanical. */
const PRESSED_FLOWER = [
  "M4 4 H26 M4 4 V26",
  "M14 10 C20 10 24 14 24 20 C18 20 14 16 14 10 Z",
  "M14 10 C8 10 4 14 4 20 C10 20 14 16 14 10 Z",
  "M14 20 V32",
  "M10 26 C12 28 16 28 18 26",
];

/** Stepped chevrons stacked into the corner, Art Deco 1925. */
const CHEVRON = [
  "M2 2 H30 M2 2 V30",
  "M2 14 L14 2",
  "M8 26 L26 8",
  "M14 30 L30 14",
];

/** An eight-point khatim star built from two overlapping squares. */
const KHATIM_STAR = [
  "M8 14 H22 V28 H8 Z",
  "M15 7 L22 14 L15 21 L8 14 Z",
  "M2 2 H30 M2 2 V30",
];

/* -------------------------------------------------------------------------- */
/* The collection                                                             */
/* -------------------------------------------------------------------------- */

const KEYLINE = "M6 6 H94 V94 H6 Z";
const KEYLINE_INNER = "M9.5 9.5 H90.5 V90.5 H9.5 Z";

export const FRAMES: FrameSpec[] = [
  {
    id: "botanica",
    name: "Botanica",
    group: "Botanical",
    note: "Two fine keylines with olive sprigs gathered at each corner.",
    outline: [KEYLINE, KEYLINE_INNER],
    corner: { art: LEAF_SPRIG, size: 27 },
  },
  {
    id: "ivy-border",
    name: "Ivy border",
    group: "Botanical",
    note: "A single rule with small leaf ticks, like pressed marquetry.",
    outline: [KEYLINE],
    corner: { art: LEAF_TICKS, size: 19 },
  },
  {
    id: "double-hairline",
    name: "Double hairline",
    group: "Classic",
    note: "Two hairlines, 3.5 units apart — the traditional card inset.",
    outline: [KEYLINE, KEYLINE_INNER],
  },
  {
    id: "triple-rule",
    name: "Triple rule",
    group: "Classic",
    note: "Three graduated rules for a formal, engraved card.",
    outline: [KEYLINE, "M9 9 H91 V91 H9 Z", "M12 12 H88 V88 H12 Z"],
  },
  {
    id: "golden-oval",
    name: "Oval cartouche",
    group: "Classic",
    note: "A rectangle with an oval cartouche for the wording.",
    outline: [
      "M8 8 H92 V92 H8 Z",
      "M50 15 C78 15 86 32 86 50 C86 68 78 85 50 85 C22 85 14 68 14 50 C14 32 22 15 50 15",
    ],
  },
  {
    id: "baroque",
    name: "Baroque scroll",
    group: "Vintage",
    note: "Eighteenth-century corner scrolls with a boxed keyline.",
    outline: ["M5 5 H95 V95 H5 Z", "M8 8 H92 V92 H8 Z"],
    corner: { art: BAROQUE_SCROLL, size: 23 },
  },
  {
    id: "acanthus",
    name: "Acanthus leaf",
    group: "Vintage",
    note: "Broad carved leaves turning in from each corner.",
    outline: ["M7 7 H93 V93 H7 Z"],
    corner: { art: ACANTHUS, size: 29 },
  },
  {
    id: "deco-bracket",
    name: "Deco bracket",
    group: "Art Deco",
    note: "Stepped corners and a fine diagonal, 1925 in spirit.",
    outline: ["M6 6 H94 V94 H6 Z"],
    corner: { art: DECO_BRACKET, size: 24 },
  },
  {
    id: "deco-rays",
    name: "Deco rays",
    group: "Art Deco",
    note: "Rays fanning from each corner inside a single keyline.",
    outline: ["M5 5 H95 V95 H5 Z", "M9 9 H91 V91 H9 Z"],
    corner: { art: DECO_RAYS, size: 20 },
  },
  {
    id: "blush-rose",
    name: "Blush rose",
    group: "Romantic",
    note: "A hand-drawn rose cluster at every corner.",
    outline: ["M7 7 H93 V93 H7 Z", "M11 11 H89 V89 H11 Z"],
    corner: { art: ROSE_CLUSTER, size: 26 },
  },
  {
    id: "romantic-swags",
    name: "Silk swags",
    group: "Romantic",
    note: "Draped swags along the top and foot of the card.",
    outline: [
      "M6 6 H94 V94 H6 Z",
      "M6 15 C 24 27, 38 27, 50 15 C 62 27, 76 27, 94 15",
      "M6 85 C 24 73, 38 73, 50 85 C 62 73, 76 73, 94 85",
      "M6 11 H94",
      "M6 89 H94",
    ],
  },
  {
    id: "moorish-tile",
    name: "Moorish tile",
    group: "Moroccan",
    note: "Zellige stars in the corners with an inlaid band.",
    outline: ["M5 5 H95 V95 H5 Z", "M9 9 H91 V91 H9 Z"],
    corner: { art: ZELLIGE_STAR, size: 22 },
  },
  {
    id: "andalusian",
    name: "Andalusian knot",
    group: "Moroccan",
    note: "Interlaced strapwork bleeding out of each corner.",
    outline: [
      "M6 6 H94 V94 H6 Z",
      "M6 22 L22 6 M78 6 L94 22 M94 78 L78 94 M22 94 L6 78",
    ],
    corner: { art: ANDALUSIAN_KNOT, size: 21 },
  },
  {
    id: "arch-portal",
    name: "Arch portal",
    group: "Minimal",
    note: "A rectangular trim opening onto a pointed arch.",
    outline: [
      "M5 5 H95 V95 H5 Z",
      "M24 95 V36 C24 19 36 8 50 8 C64 8 76 19 76 36 V95",
    ],
  },
  {
    id: "gilt-minimal",
    name: "Gilt hairline",
    group: "Minimal",
    note: "One hairline and four corner ticks. Nothing more.",
    outline: ["M8 8 H92 V92 H8 Z"],
    corner: { art: CORNER_TICKS, size: 9 },
  },
  /* ------------------------------------------------- atelier expansion */
  {
    id: "fern-frieze",
    name: "Fern frieze",
    group: "Botanical",
    note: "Tapered fern fronds curling in from every corner.",
    outline: ["M7 7 H93 V93 H7 Z"],
    corner: { art: FERN_FROND, size: 27 },
  },
  {
    id: "pressed-flora",
    name: "Pressed flora",
    group: "Botanical",
    note: "Four pressed flowers on a single fine rule.",
    outline: [KEYLINE, KEYLINE_INNER],
    corner: { art: PRESSED_FLOWER, size: 20 },
  },
  {
    id: "cameo-oval",
    name: "Cameo oval",
    group: "Classic",
    note: "A double oval cameo inside a squared keyline.",
    outline: [
      "M6 6 H94 V94 H6 Z",
      "M50 16 C68 16 78 30 78 50 C78 70 68 84 50 84 C32 84 22 70 22 50 C22 30 32 16 50 16",
      "M50 21 C65 21 73 33 73 50 C73 67 65 79 50 79 C35 79 27 67 27 50 C27 33 35 21 50 21",
    ],
  },
  {
    id: "guilloche",
    name: "Guilloche band",
    group: "Vintage",
    note: "An interlaced wave band above and below the wording.",
    outline: [
      "M6 6 H94 V94 H6 Z",
      "M6 14 C 12 6, 18 6, 24 14 C 30 22, 36 22, 42 14 C 48 6, 54 6, 60 14 C 66 22, 72 22, 78 14 C 84 6, 90 6, 94 12",
      "M6 86 C 12 94, 18 94, 24 86 C 30 78, 36 78, 42 86 C 48 94, 54 94, 60 86 C 66 78, 72 78, 78 86 C 84 94, 90 94, 94 88",
      "M6 20 H94",
      "M6 80 H94",
    ],
  },
  {
    id: "chevron-deco",
    name: "Chevron deco",
    group: "Art Deco",
    note: "Stacked chevrons stepping out of each corner.",
    outline: ["M6 6 H94 V94 H6 Z", "M10 10 H90 V90 H10 Z"],
    corner: { art: CHEVRON, size: 22 },
  },
  {
    id: "ribbon-bow",
    name: "Ribbon bow",
    group: "Romantic",
    note: "A satin bow tied at the head of the card.",
    outline: ["M7 7 H93 V93 H7 Z"],
    corner: { art: ROSE_CLUSTER, size: 16 },
  },
  {
    id: "khatim-star",
    name: "Khatim star",
    group: "Moroccan",
    note: "Eight-point khatim stars set into a double keyline.",
    outline: ["M5 5 H95 V95 H5 Z", "M9 9 H91 V91 H9 Z"],
    corner: { art: KHATIM_STAR, size: 21 },
  },
  {
    id: "single-hairline",
    name: "Single hairline",
    group: "Minimal",
    note: "One hairline rule, set wider than the rest of the collection.",
    outline: ["M12 12 H88 V88 H12 Z"],
  },
];

/**
 * Where a newly added frame sits on a page: inset from the trim on every side
 * so the artwork never bleeds off the card, but never smaller than 40 design
 * units so it stays selectable on a small page.
 */
export function frameBounds(
  page: { width: number; height: number },
  insetRatio = 0.055,
): { x: number; y: number; w: number; h: number } {
  const pageW = Math.max(1, page.width);
  const pageH = Math.max(1, page.height);
  const inset = Math.round(Math.min(pageW, pageH) * insetRatio);
  return {
    x: inset,
    y: inset,
    w: Math.min(Math.max(1, pageW - inset), Math.max(40, pageW - inset * 2)),
    h: Math.min(Math.max(1, pageH - inset), Math.max(40, pageH - inset * 2)),
  };
}

/**
 * Where a newly added frame belongs in the layer stack.
 *
 * A frame is stroke-only artwork, but its element box spans the page. Left on
 * top it would swallow every click meant for the wording and photographs
 * beneath it, so frames go under the content — and just above any backdrop
 * layer that already fills the page (a full-page photograph or colour wash)
 * so the artwork stays visible.
 */
export function frameLayerIndex(
  elements: Array<{ x: number; y: number; w: number; h: number }>,
  page: { width: number; height: number },
): number {
  const pageArea = Math.max(1, page.width * page.height);
  let index = 0;
  for (const element of elements) {
    const coversPage = element.w * element.h >= pageArea * 0.9;
    if (!coversPage) break;
    index += 1;
  }
  return index;
}

export function frameById(id: string | undefined): FrameSpec | undefined {
  if (!id) return undefined;
  return FRAMES.find((frame) => frame.id === id);
}

export function framesInGroup(group: FrameGroup): FrameSpec[] {
  return FRAMES.filter((frame) => frame.group === group);
}
