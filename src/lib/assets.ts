import type { ElementKind, ShapeKind } from "@/lib/design";
import type { MotifId } from "@/lib/invitation";

export type BuiltinAssetCategory =
  | "Backgrounds"
  | "Botanical"
  | "Ornaments"
  | "Shapes"
  | "Keylines"
  | "Dividers"
  | "Seals"
  | "Masks"
  | "Celebration icons";

export interface AssetElementSpec {
  kind: ElementKind;
  shape?: ShapeKind;
  motif?: MotifId;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  fill?: string;
  fillToken?: "accent" | "ink" | "paper";
  stroke?: string;
  strokeToken?: "accent" | "ink" | "paper";
  strokeWidth?: number;
  opacity?: number;
  radius?: number;
  name: string;
}

export interface BuiltinAsset {
  id: string;
  name: string;
  category: BuiltinAssetCategory;
  note: string;
  background?: string;
  elements?: AssetElementSpec[];
  /** Used only by the thumbnail. */
  preview:
    | { type: "background" }
    | { type: "motif"; motif: MotifId }
    | { type: "shape"; shape: ShapeKind }
    | { type: "layers" };
}

const motif = (
  name: string,
  id: MotifId,
  options: Partial<AssetElementSpec> = {},
): AssetElementSpec => ({
  kind: "motif",
  motif: id,
  name,
  x: 400,
  y: 520,
  w: 200,
  h: 200,
  ...options,
});

const rule = (
  name: string,
  width: number,
  options: Partial<AssetElementSpec> = {},
): AssetElementSpec => ({
  kind: "shape",
  shape: "line",
  name,
  x: (1000 - width) / 2,
  y: 654,
  w: width,
  h: 2,
  fillToken: "accent",
  opacity: 0.65,
  ...options,
});

export const BUILTIN_ASSETS: BuiltinAsset[] = [
  /* ---------------------------------------------------------- backgrounds */
  {
    id: "paper-pearl",
    name: "Pearl paper",
    category: "Backgrounds",
    note: "The house paper — cool, quiet, faintly textured.",
    background:
      "linear-gradient(145deg, #f7f6f1 0%, #f2f1ed 52%, #eae7dd 100%)",
    preview: { type: "background" },
  },
  {
    id: "paper-sand",
    name: "Sand dupioni",
    category: "Backgrounds",
    note: "Warm sand with a woven sheen.",
    background:
      "repeating-linear-gradient(112deg, #b38f6f 0 2px, #b89473 2px 5px, #ad896a 5px 6px)",
    preview: { type: "background" },
  },
  {
    id: "paper-crimson",
    name: "Crimson velvet",
    category: "Backgrounds",
    note: "Deep atelier crimson for a dramatic card.",
    background:
      "radial-gradient(110% 80% at 50% 0%, #8f0a20 0%, #710014 48%, #43000a 100%)",
    preview: { type: "background" },
  },
  {
    id: "paper-obsidian",
    name: "Obsidian silk",
    category: "Backgrounds",
    note: "Black with a soft, satin centre light.",
    background:
      "radial-gradient(80% 60% at 50% 30%, #2b2a28 0%, #171717 60%, #0c0c0c 100%)",
    preview: { type: "background" },
  },
  {
    id: "paper-ivory",
    name: "Ivory linen",
    category: "Backgrounds",
    note: "Cream with a fine linen weave.",
    background:
      "repeating-linear-gradient(0deg, #f8f3e8 0 3px, #f5efe2 3px 6px), repeating-linear-gradient(90deg, transparent 0 3px, rgba(120,100,70,0.035) 3px 4px)",
    preview: { type: "background" },
  },
  {
    id: "paper-sage",
    name: "Sage wash",
    category: "Backgrounds",
    note: "A pale botanical wash for garden invitations.",
    background:
      "linear-gradient(158deg, #f1f4e9 0%, #e6ecd9 50%, #dbe4cb 100%)",
    preview: { type: "background" },
  },
  {
    id: "paper-blush",
    name: "Blush silk",
    category: "Backgrounds",
    note: "A romantic rose glow behind dark ink.",
    background:
      "radial-gradient(95% 75% at 50% 0%, #fdf2ef 0%, #f7e5e1 55%, #efd6d1 100%)",
    preview: { type: "background" },
  },
  {
    id: "paper-zellige",
    name: "Zellige sand",
    category: "Backgrounds",
    note: "Moroccan tile geometry in sand and umber.",
    background:
      "linear-gradient(135deg, #f3e7d2 0%, #ead9bc 60%, #e2cda9 100%)",
    preview: { type: "background" },
  },
  {
    id: "paper-midnight-gold",
    name: "Midnight gold",
    category: "Backgrounds",
    note: "Ink-blue evening with a champagne horizon.",
    background:
      "linear-gradient(180deg, #1b1d21 0%, #24242a 55%, #3b3024 100%)",
    preview: { type: "background" },
  },
  {
    id: "paper-linen",
    name: "Raw linen",
    category: "Backgrounds",
    note: "Neutral cloth for minimalist typography.",
    background:
      "repeating-linear-gradient(90deg, #e9e5da 0 1px, #ece8dd 1px 4px)",
    preview: { type: "background" },
  },

  /* ------------------------------------------------------------- botanical */
  {
    id: "botanical-sprig",
    name: "Olive sprig",
    category: "Botanical",
    note: "A single hand-drawn olive branch.",
    elements: [motif("Olive sprig", "sprig", { opacity: 0.9 })],
    preview: { type: "motif", motif: "sprig" },
  },
  {
    id: "botanical-branch",
    name: "Eucalyptus branch",
    category: "Botanical",
    note: "Long stems for the corner of a card.",
    elements: [motif("Eucalyptus branch", "branch", { x: 690, y: 80, w: 240, h: 260, rotation: 12, opacity: 0.55 })],
    preview: { type: "motif", motif: "branch" },
  },
  {
    id: "botanical-wreath",
    name: "Laurel wreath",
    category: "Botanical",
    note: "A circular wreath sized for a monogram.",
    elements: [motif("Laurel wreath", "wreath", { x: 350, y: 440, w: 300, h: 300, opacity: 0.8 })],
    preview: { type: "motif", motif: "wreath" },
  },
  {
    id: "botanical-vine",
    name: "Grape vine border",
    category: "Botanical",
    note: "A trailing vine for the lower edge.",
    elements: [motif("Grape vine", "vine", { x: 170, y: 1060, w: 660, h: 150, opacity: 0.55 })],
    preview: { type: "motif", motif: "vine" },
  },
  {
    id: "botanical-palm",
    name: "Palm frond",
    category: "Botanical",
    note: "A tall palm for Moroccan and tropical cards.",
    elements: [motif("Palm frond", "palm", { x: 700, y: 120, w: 210, h: 300, rotation: 18, opacity: 0.6 })],
    preview: { type: "motif", motif: "palm" },
  },
  {
    id: "botanical-peony",
    name: "Peony bloom",
    category: "Botanical",
    note: "An open peony in the accent colour.",
    elements: [motif("Peony bloom", "peony", { x: 720, y: 880, w: 220, h: 220, opacity: 0.75 })],
    preview: { type: "motif", motif: "peony" },
  },
  {
    id: "botanical-trellis",
    name: "Trellis panel",
    category: "Botanical",
    note: "Fine geometric lattice for a half-card.",
    elements: [motif("Trellis", "trellis", { x: 520, y: 100, w: 380, h: 500, opacity: 0.3 })],
    preview: { type: "motif", motif: "trellis" },
  },

  /* ------------------------------------------------------------- ornaments */
  {
    id: "ornament-star",
    name: "Gilded star",
    category: "Ornaments",
    note: "A small star for a monogram or seal.",
    elements: [motif("Gilded star", "star", { x: 430, y: 540, w: 140, h: 140, fillToken: "accent" })],
    preview: { type: "motif", motif: "star" },
  },
  {
    id: "ornament-moons",
    name: "Crescent & moons",
    category: "Ornaments",
    note: "Celestial trio for Eid and evening parties.",
    elements: [motif("Crescent moon", "moon", { x: 390, y: 500, w: 220, h: 180, fillToken: "accent" })],
    preview: { type: "motif", motif: "moon" },
  },
  {
    id: "ornament-crescent",
    name: "Crescent",
    category: "Ornaments",
    note: "A single fine crescent.",
    elements: [motif("Crescent", "crescent", { x: 420, y: 520, w: 160, h: 160 })],
    preview: { type: "motif", motif: "crescent" },
  },
  {
    id: "ornament-sun",
    name: "Sun medallion",
    category: "Ornaments",
    note: "A radiant disc for warm palettes.",
    elements: [motif("Sun medallion", "sun", { x: 410, y: 500, w: 180, h: 180, fillToken: "accent" })],
    preview: { type: "motif", motif: "sun" },
  },
  {
    id: "ornament-sunburst",
    name: "Sunburst",
    category: "Ornaments",
    note: "A fine line sunburst for a cover.",
    elements: [motif("Sunburst", "sunburst", { x: 350, y: 440, w: 300, h: 300, opacity: 0.7 })],
    preview: { type: "motif", motif: "sunburst" },
  },
  {
    id: "ornament-gem",
    name: "Heraldic gem",
    category: "Ornaments",
    note: "A faceted mark for formal cards.",
    elements: [motif("Heraldic gem", "gem", { x: 430, y: 530, w: 140, h: 140, fillToken: "accent" })],
    preview: { type: "motif", motif: "gem" },
  },
  {
    id: "ornament-compass",
    name: "Compass",
    category: "Ornaments",
    note: "A quiet travel motif.",
    elements: [motif("Compass", "compass", { x: 415, y: 520, w: 170, h: 170 })],
    preview: { type: "motif", motif: "compass" },
  },
  {
    id: "ornament-fan",
    name: "Folded fan",
    category: "Ornaments",
    note: "A scalloped fan for festive cards.",
    elements: [motif("Folded fan", "fan", { x: 400, y: 500, w: 200, h: 200, fillToken: "accent" })],
    preview: { type: "motif", motif: "fan" },
  },
  {
    id: "ornament-shell",
    name: "Shell",
    category: "Ornaments",
    note: "A scalloped shell for coastal celebrations.",
    elements: [motif("Shell", "shell", { x: 420, y: 520, w: 160, h: 160 })],
    preview: { type: "motif", motif: "shell" },
  },
  {
    id: "ornament-wave",
    name: "Wave rule",
    category: "Ornaments",
    note: "A hand-drawn wave for a modern card.",
    elements: [motif("Wave", "wave", { x: 280, y: 650, w: 440, h: 70, opacity: 0.55 })],
    preview: { type: "motif", motif: "wave" },
  },

  /* ---------------------------------------------------------------- shapes */
  {
    id: "shape-heart",
    name: "Heart",
    category: "Shapes",
    note: "A solid heart, ready for a reveal cover.",
    elements: [{ kind: "shape", shape: "heart", name: "Heart", x: 370, y: 500, w: 260, h: 250, fillToken: "accent" }],
    preview: { type: "shape", shape: "heart" },
  },
  {
    id: "shape-arch",
    name: "Arch",
    category: "Shapes",
    note: "A soft arch to frame a portrait or message.",
    elements: [{ kind: "shape", shape: "arch", name: "Arch", x: 310, y: 360, w: 380, h: 560, fillToken: "paper", strokeToken: "accent", strokeWidth: 2 }],
    preview: { type: "shape", shape: "arch" },
  },
  {
    id: "shape-leaf",
    name: "Leaf",
    category: "Shapes",
    note: "A single leaf for botanical compositions.",
    elements: [{ kind: "shape", shape: "leaf", name: "Leaf", x: 420, y: 510, w: 160, h: 260, fillToken: "accent", opacity: 0.8 }],
    preview: { type: "shape", shape: "leaf" },
  },
  {
    id: "shape-star",
    name: "Star",
    category: "Shapes",
    note: "A sharp eight-point star.",
    elements: [{ kind: "shape", shape: "star", name: "Star", x: 420, y: 520, w: 160, h: 160, fillToken: "accent" }],
    preview: { type: "shape", shape: "star" },
  },
  {
    id: "shape-ellipse",
    name: "Ellipse",
    category: "Shapes",
    note: "A clean disc for a seal or photo mask.",
    elements: [{ kind: "shape", shape: "ellipse", name: "Ellipse", x: 370, y: 480, w: 260, h: 260, fillToken: "accent" }],
    preview: { type: "shape", shape: "ellipse" },
  },

  /* ------------------------------------------------------ frames & borders */
  {
    id: "frame-thin",
    name: "Thin keyline",
    category: "Keylines",
    note: "A single hairline inset from the trim.",
    elements: [{ kind: "shape", shape: "frame", name: "Keyline frame", x: 46, y: 46, w: 908, h: 1241, strokeToken: "accent", strokeWidth: 1.5, radius: 0, opacity: 0.7 }],
    preview: { type: "shape", shape: "frame" },
  },
  {
    id: "frame-double",
    name: "Double rule",
    category: "Keylines",
    note: "Two keylines for a traditional card.",
    elements: [
      { kind: "shape", shape: "frame", name: "Outer frame", x: 38, y: 38, w: 924, h: 1257, strokeToken: "accent", strokeWidth: 2, opacity: 0.7 },
      { kind: "shape", shape: "frame", name: "Inner frame", x: 52, y: 52, w: 896, h: 1229, strokeToken: "accent", strokeWidth: 0.8, opacity: 0.5 },
    ],
    preview: { type: "layers" },
  },
  {
    id: "frame-rounded",
    name: "Soft rounded frame",
    category: "Keylines",
    note: "A generous radius for modern invitations.",
    elements: [{ kind: "shape", shape: "frame", name: "Rounded frame", x: 54, y: 54, w: 892, h: 1225, strokeToken: "accent", strokeWidth: 2, radius: 28, opacity: 0.65 }],
    preview: { type: "shape", shape: "frame" },
  },
  {
    id: "frame-motif",
    name: "Ornamental frame",
    category: "Keylines",
    note: "A fine drawn frame with decorative corners.",
    elements: [motif("Ornamental frame", "frame", { x: 34, y: 34, w: 932, h: 1265, opacity: 0.55 })],
    preview: { type: "motif", motif: "frame" },
  },

  /* -------------------------------------------------------------- dividers */
  {
    id: "divider-short",
    name: "Short rule",
    category: "Dividers",
    note: "A 200px accent rule.",
    elements: [rule("Short rule", 200)],
    preview: { type: "shape", shape: "line" },
  },
  {
    id: "divider-long",
    name: "Long rule",
    category: "Dividers",
    note: "A wide rule to separate sections.",
    elements: [rule("Long rule", 620)],
    preview: { type: "shape", shape: "line" },
  },
  {
    id: "divider-double",
    name: "Double rule",
    category: "Dividers",
    note: "Two fine rules with air between.",
    elements: [
      rule("Upper rule", 360, { y: 640, h: 1.5 }),
      rule("Lower rule", 360, { y: 656, h: 1.5, opacity: 0.4 }),
    ],
    preview: { type: "layers" },
  },
  {
    id: "divider-diamond",
    name: "Star divider",
    category: "Dividers",
    note: "A rule interrupted by a small star.",
    elements: [
      rule("Left rule", 170, { x: 300, y: 654 }),
      rule("Right rule", 170, { x: 530, y: 654 }),
      motif("Divider star", "star", { x: 470, y: 634, w: 40, h: 40, fillToken: "accent" }),
    ],
    preview: { type: "layers" },
  },

  /* ----------------------------------------------------------------- seals */
  {
    id: "seal-wax",
    name: "Wax seal",
    category: "Seals",
    note: "A crimson seal with a star impression.",
    elements: [
      { kind: "shape", shape: "ellipse", name: "Wax seal", x: 400, y: 540, w: 200, h: 200, fill: "#710014" },
      motif("Seal star", "star", { x: 455, y: 595, w: 90, h: 90, fill: "#f2f1ed" }),
    ],
    preview: { type: "layers" },
  },
  {
    id: "seal-gold",
    name: "Gold seal",
    category: "Seals",
    note: "A champagne seal with a gem mark.",
    elements: [
      { kind: "shape", shape: "ellipse", name: "Gold seal", x: 400, y: 540, w: 190, h: 190, fill: "#b38f6f" },
      motif("Seal gem", "gem", { x: 457, y: 597, w: 76, h: 76, fill: "#3b2a1c" }),
    ],
    preview: { type: "layers" },
  },
  {
    id: "seal-crescent",
    name: "Crescent seal",
    category: "Seals",
    note: "A dark seal for an Eid or evening card.",
    elements: [
      { kind: "shape", shape: "ellipse", name: "Crescent seal", x: 405, y: 545, w: 190, h: 190, fillToken: "ink" },
      motif("Seal crescent", "crescent", { x: 462, y: 602, w: 76, h: 76, fillToken: "accent" }),
    ],
    preview: { type: "layers" },
  },
  {
    id: "seal-monogram",
    name: "Monogram medallion",
    category: "Seals",
    note: "A fine ring with an ornamental centre.",
    elements: [
      { kind: "shape", shape: "ellipse", name: "Medallion", x: 420, y: 560, w: 160, h: 160, fill: "transparent", strokeToken: "accent", strokeWidth: 2 },
      motif("Medallion mark", "star", { x: 465, y: 605, w: 70, h: 70, fillToken: "accent" }),
    ],
    preview: { type: "layers" },
  },

  /* ----------------------------------------------------------------- masks */
  {
    id: "mask-arch",
    name: "Arch photo mask cover",
    category: "Masks",
    note: "Use as a reveal cover over a portrait.",
    elements: [{ kind: "shape", shape: "arch", name: "Arch reveal cover", x: 300, y: 330, w: 400, h: 600, fillToken: "accent" }],
    preview: { type: "shape", shape: "arch" },
  },
  {
    id: "mask-heart",
    name: "Heart cover",
    category: "Masks",
    note: "A heart to hide a note or photo until tapped.",
    elements: [{ kind: "shape", shape: "heart", name: "Heart reveal cover", x: 350, y: 480, w: 300, h: 290, fillToken: "accent" }],
    preview: { type: "shape", shape: "heart" },
  },
  {
    id: "mask-ellipse",
    name: "Ellipse cover",
    category: "Masks",
    note: "A disc that lifts away to reveal details.",
    elements: [{ kind: "shape", shape: "ellipse", name: "Ellipse reveal cover", x: 340, y: 440, w: 320, h: 320, fillToken: "accent" }],
    preview: { type: "shape", shape: "ellipse" },
  },

  /* ----------------------------------------------------- celebration icons */
  {
    id: "icon-rattle",
    name: "Baby rattle",
    category: "Celebration icons",
    note: "For a welcome, aqiqah, or first birthday.",
    elements: [motif("Baby rattle", "rattle", { x: 430, y: 520, w: 140, h: 140, fillToken: "accent" })],
    preview: { type: "motif", motif: "rattle" },
  },
  {
    id: "icon-butterfly",
    name: "Butterfly",
    category: "Celebration icons",
    note: "A light mark for spring celebrations.",
    elements: [motif("Butterfly", "butterfly", { x: 720, y: 160, w: 150, h: 130, opacity: 0.7 })],
    preview: { type: "motif", motif: "butterfly" },
  },
  {
    id: "icon-moon",
    name: "Moons",
    category: "Celebration icons",
    note: "A trio of moons for Eid and evening events.",
    elements: [motif("Moons", "moon", { x: 400, y: 520, w: 200, h: 160, fillToken: "accent" })],
    preview: { type: "motif", motif: "moon" },
  },
  {
    id: "icon-compass",
    name: "Travel compass",
    category: "Celebration icons",
    note: "For destination weddings and milestone trips.",
    elements: [motif("Travel compass", "compass", { x: 420, y: 520, w: 160, h: 160 })],
    preview: { type: "motif", motif: "compass" },
  },
];

export const BUILTIN_ASSET_CATEGORIES = [
  "Backgrounds",
  "Botanical",
  "Ornaments",
  "Shapes",
  "Keylines",
  "Dividers",
  "Seals",
  "Masks",
  "Celebration icons",
] as const satisfies readonly BuiltinAssetCategory[];

