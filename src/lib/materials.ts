import type { CSSProperties } from "react";
import { hexToRgba, isHexColour } from "@/lib/effects";

/**
 * Materials & print finishes.
 *
 * A material is a surface treatment laid over a shape, a photograph or the
 * whole page: paper grain, a vellum veil, foil, embossing, wax, ribbon, lace.
 * It is stored as plain settings on the element or the page — never painted
 * into artwork — so the original design stays exactly as the host drew it and
 * an invitation saved before materials existed opens untouched.
 *
 * Everything here is a *screen simulation*. Finishes are composed from CSS
 * backgrounds, blend modes and inset shadows: a browser draws those beautifully,
 * but they are not real foil, not physical emboss depth and not a print
 * separation. The export pipeline therefore renders the clean artwork and this
 * module stays out of it — the studio's Material Preview mode is where these
 * finishes live, and it is labelled as a preview wherever it appears.
 */

export type MaterialCategory =
  | "Paper"
  | "Finish"
  | "Foil"
  | "Relief"
  | "Embellishment";

export const MATERIAL_CATEGORIES: MaterialCategory[] = [
  "Paper",
  "Finish",
  "Foil",
  "Relief",
  "Embellishment",
];

export type MaterialBlend =
  | "soft-light"
  | "multiply"
  | "overlay"
  | "hard-light"
  | "normal";

export interface MaterialBlendOption {
  id: MaterialBlend;
  label: string;
  note: string;
}

/** The blends the DOM renderer can actually draw, in the words a host reads. */
export const MATERIAL_BLENDS: MaterialBlendOption[] = [
  { id: "soft-light", label: "Soft light", note: "A quiet finish that keeps the surface's own tone" },
  { id: "multiply", label: "Multiply", note: "Ink-like: settles into the artwork and darkens it" },
  { id: "overlay", label: "Overlay", note: "Luminous, with more contrast in the light" },
  { id: "hard-light", label: "Metallic", note: "Casts the finish over the artwork like foil" },
  { id: "normal", label: "Solid", note: "Lies on top and covers the surface completely" },
];

export type MaterialId =
  | "cotton"
  | "handmade"
  | "linen"
  | "vellum"
  | "matte"
  | "satin"
  | "gold"
  | "silver"
  | "rose-gold"
  | "emboss"
  | "deboss"
  | "wax"
  | "ribbon"
  | "lace";

export interface LayerMaterial {
  /** Which starter preset this finish began from. */
  preset: MaterialId;
  enabled: boolean;
  /** How present the surface texture is, 0…1. */
  intensity: number;
  /** Texture zoom, 0.5…3, where 1 is the preset's own tile. */
  scale: number;
  /** Overall strength of the finish, 0…1. */
  opacity: number;
  /** How the finish meets the artwork underneath. */
  blend: MaterialBlend;
  /** Foil, wax, ribbon or lace colour as HEX. */
  foil: string;
  /** Metallic contrast for foils, 0…1. */
  foilStrength: number;
  /** Relief: negative debosses, positive embosses, 0 is flat. −1…1. */
  relief: number;
  /** How soft the relief edge is, 0…1. */
  softness: number;
  /** Matte takes the tooth; satin adds a sheen across the surface. */
  finish: "matte" | "satin";
}

export interface MaterialPreset {
  id: MaterialId;
  label: string;
  category: MaterialCategory;
  note: string;
  /** Label for the colour field, when this preset has one. */
  colourLabel?: string;
  controls: {
    colour?: boolean;
    foil?: boolean;
    finish?: boolean;
  };
  defaults: Omit<LayerMaterial, "preset" | "enabled">;
}

const PAPER_DEFAULTS = {
  intensity: 0.5,
  scale: 1,
  opacity: 0.5,
  blend: "soft-light" as MaterialBlend,
  foil: "#c3a469",
  foilStrength: 0.5,
  relief: 0,
  softness: 0.45,
  finish: "matte" as const,
};

export const MATERIAL_PRESETS: MaterialPreset[] = [
  {
    id: "cotton",
    label: "Cotton",
    category: "Paper",
    note: "Soft mottled tooth, like cotton stock",
    controls: { finish: true },
    defaults: { ...PAPER_DEFAULTS, intensity: 0.5, opacity: 0.5 },
  },
  {
    id: "handmade",
    label: "Handmade",
    category: "Paper",
    note: "Flecked fibre with a deckled, rag-made feel",
    controls: { finish: true },
    defaults: { ...PAPER_DEFAULTS, intensity: 0.6, scale: 1.1, opacity: 0.55 },
  },
  {
    id: "linen",
    label: "Linen",
    category: "Paper",
    note: "A fine woven weave across the sheet",
    controls: { finish: true },
    defaults: { ...PAPER_DEFAULTS, intensity: 0.55, opacity: 0.48 },
  },
  {
    id: "vellum",
    label: "Vellum",
    category: "Paper",
    note: "A translucent overlay that softens what is under it",
    controls: { finish: true },
    defaults: {
      ...PAPER_DEFAULTS,
      intensity: 0.45,
      scale: 1.4,
      opacity: 0.55,
      blend: "normal",
    },
  },
  {
    id: "matte",
    label: "Matte",
    category: "Finish",
    note: "A flat, non-reflective sealed surface",
    controls: { finish: true },
    defaults: { ...PAPER_DEFAULTS, intensity: 0.32, scale: 0.8, opacity: 0.4 },
  },
  {
    id: "satin",
    label: "Satin",
    category: "Finish",
    note: "A low, even sheen catching the light",
    controls: { finish: true },
    defaults: {
      ...PAPER_DEFAULTS,
      intensity: 0.5,
      scale: 1.2,
      opacity: 0.5,
      finish: "satin",
    },
  },
  {
    id: "gold",
    label: "Gold foil",
    category: "Foil",
    note: "Warm gilt with a restrained highlight",
    controls: { foil: true, finish: true },
    defaults: {
      ...PAPER_DEFAULTS,
      intensity: 0.45,
      opacity: 0.82,
      blend: "hard-light",
      foil: "#c8a24b",
      foilStrength: 0.7,
      finish: "satin",
    },
  },
  {
    id: "silver",
    label: "Silver foil",
    category: "Foil",
    note: "Cool platinum with a clean highlight",
    controls: { foil: true, finish: true },
    defaults: {
      ...PAPER_DEFAULTS,
      intensity: 0.4,
      opacity: 0.82,
      blend: "hard-light",
      foil: "#c6cace",
      foilStrength: 0.65,
      finish: "satin",
    },
  },
  {
    id: "rose-gold",
    label: "Rose gold foil",
    category: "Foil",
    note: "Blush metal, softer than yellow gilt",
    controls: { foil: true, finish: true },
    defaults: {
      ...PAPER_DEFAULTS,
      intensity: 0.45,
      opacity: 0.82,
      blend: "hard-light",
      foil: "#c9977f",
      foilStrength: 0.68,
      finish: "satin",
    },
  },
  {
    id: "emboss",
    label: "Embossed",
    category: "Relief",
    note: "Raised from the sheet, catching light at the top-left",
    controls: {},
    defaults: { ...PAPER_DEFAULTS, intensity: 0.3, opacity: 0.45, relief: 0.6, softness: 0.4 },
  },
  {
    id: "deboss",
    label: "Debossed",
    category: "Relief",
    note: "Pressed into the sheet, shadowed at its edge",
    controls: {},
    defaults: { ...PAPER_DEFAULTS, intensity: 0.3, opacity: 0.45, relief: -0.6, softness: 0.4 },
  },
  {
    id: "wax",
    label: "Wax seal",
    category: "Embellishment",
    note: "Poured wax with a domed centre — screen preview",
    colourLabel: "Wax colour",
    controls: { colour: true },
    defaults: {
      ...PAPER_DEFAULTS,
      intensity: 0.5,
      scale: 1.5,
      opacity: 0.92,
      blend: "normal",
      foil: "#7b1220",
    },
  },
  {
    id: "ribbon",
    label: "Ribbon",
    category: "Embellishment",
    note: "Grosgrain satin bands — screen preview",
    colourLabel: "Ribbon colour",
    controls: { colour: true },
    defaults: {
      ...PAPER_DEFAULTS,
      intensity: 0.55,
      scale: 1.1,
      opacity: 0.9,
      blend: "normal",
      foil: "#710014",
    },
  },
  {
    id: "lace",
    label: "Lace",
    category: "Embellishment",
    note: "A fine lace overlay over the surface — screen preview",
    colourLabel: "Lace colour",
    controls: { colour: true },
    defaults: {
      ...PAPER_DEFAULTS,
      intensity: 0.8,
      scale: 1.15,
      opacity: 0.85,
      blend: "normal",
      foil: "#f7f4ec",
    },
  },
];

export const MATERIAL_IDS: MaterialId[] = MATERIAL_PRESETS.map((preset) => preset.id);

export function materialPresetById(id: string): MaterialPreset {
  return MATERIAL_PRESETS.find((preset) => preset.id === id) ?? MATERIAL_PRESETS[0];
}

export function isMaterialId(id: unknown): id is MaterialId {
  return typeof id === "string" && MATERIAL_IDS.includes(id as MaterialId);
}

/** A fresh finish, straight from a preset's own defaults. */
export function materialForPreset(id: MaterialId): LayerMaterial {
  const preset = materialPresetById(id);
  return { preset: preset.id, enabled: true, ...preset.defaults };
}

/* -------------------------------------------------------------------------- */
/* Normalisation                                                              */
/* -------------------------------------------------------------------------- */

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function finite(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function unit(value: unknown, fallback: number) {
  return Math.round(clamp(finite(value, fallback), 0, 1) * 1000) / 1000;
}

/**
 * Repairs a material saved by an older run, a future version or a corrupted
 * document. An unknown preset is dropped rather than guessed at: showing the
 * wrong finish on someone's invitation is worse than showing none, and every
 * other field falls back to the preset's own default.
 */
export function normalizeMaterial(value: unknown): LayerMaterial | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as Partial<LayerMaterial>;
  if (!isMaterialId(raw.preset)) return undefined;
  const preset = materialPresetById(raw.preset);
  const fallback = preset.defaults;
  return {
    preset: preset.id,
    enabled: raw.enabled !== false,
    intensity: unit(raw.intensity, fallback.intensity),
    scale: Math.round(clamp(finite(raw.scale, fallback.scale), 0.5, 3) * 100) / 100,
    opacity: unit(raw.opacity, fallback.opacity),
    blend: MATERIAL_BLENDS.some((option) => option.id === raw.blend)
      ? (raw.blend as MaterialBlend)
      : fallback.blend,
    foil: isHexColour(raw.foil) ? (raw.foil as string).toLowerCase() : fallback.foil,
    foilStrength: unit(raw.foilStrength, fallback.foilStrength),
    relief: Math.round(clamp(finite(raw.relief, fallback.relief), -1, 1) * 1000) / 1000,
    softness: unit(raw.softness, fallback.softness),
    finish: raw.finish === "satin" ? "satin" : raw.finish === "matte" ? "matte" : fallback.finish,
  };
}

/** Only an enabled, known finish draws anything at all. */
export function materialIsActive(material: LayerMaterial | undefined): boolean {
  return Boolean(material && material.enabled && isMaterialId(material.preset));
}

/* -------------------------------------------------------------------------- */
/* Which layers a finish can honestly draw on                                 */
/* -------------------------------------------------------------------------- */

export type MaterialTarget = "shape" | "image";

/**
 * Materials are silhouette-aware surfaces. Type, motifs and decorative frames
 * are not offered one, because the renderer cannot paint a texture through
 * their outlines faithfully — and a control that does nothing is worse than no
 * control. Type gets its metallic finish from Effects → Gradient.
 */
export function materialTargetOf(
  element: { kind: string; frameArt?: string; shape?: string } | null | undefined,
): MaterialTarget | null {
  if (!element) return null;
  if (element.kind === "image") return "image";
  if (element.kind !== "shape") return null;
  if (element.frameArt) return null;
  const shape = element.shape ?? "rect";
  // Rules are strokes and frames are outlines: neither has a surface.
  if (shape === "line" || shape === "frame") return null;
  return "shape";
}

export function supportsMaterial(
  element: { kind: string; frameArt?: string; shape?: string } | null | undefined,
): boolean {
  return materialTargetOf(element) !== null;
}

/** Only boxed forms and photographs have an inside edge for depth to sit in. */
export function supportsMaterialRelief(
  element: { kind: string; frameArt?: string; shape?: string } | null | undefined,
): boolean {
  if (element?.kind === "image") return true;
  if (element?.kind !== "shape" || element.frameArt) return false;
  const shape = element.shape ?? "rect";
  return shape === "rect" || shape === "capsule" || shape === "ellipse";
}

export const MATERIAL_SCOPE_NOTE =
  "Materials draw on shapes, photographs and the page. For type, use Effects → Gradient for a metallic finish.";

/* -------------------------------------------------------------------------- */
/* Texture tiles                                                              */
/* -------------------------------------------------------------------------- */

/** Every tile is one square SVG, repeated by CSS and scaled by `scale`. */
const TILE = 160;

const tileCache = new Map<string, string>();

function quantise(value: number, step = 0.05) {
  return Math.round(value / step) * step;
}

/** The raw data URI for a material's repeating tile. Cached by its look. */
export function materialTile(material: LayerMaterial): string {
  const key = [
    material.preset,
    quantise(material.intensity),
    material.foil.toLowerCase(),
    quantise(material.foilStrength),
    material.finish,
  ].join("|");
  const cached = tileCache.get(key);
  if (cached) return cached;
  const uri = buildTile(material);
  // The cache is bounded by the quantised slider values, but a runaway session
  // should still not grow without limit.
  if (tileCache.size > 400) tileCache.clear();
  tileCache.set(key, uri);
  return uri;
}

function svgTile(inner: string): string {
  const doc = `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}" viewBox="0 0 ${TILE} ${TILE}">${inner}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(doc)}`;
}

/** Grayscale fractal grain that tiles without a seam. */
function noise(
  id: string,
  frequency: number,
  octaves: number,
  seed: number,
  opacity: number,
): string {
  if (opacity <= 0.001) return "";
  return (
    `<filter id="${id}" x="0" y="0" width="100%" height="100%">` +
    `<feTurbulence type="fractalNoise" baseFrequency="${frequency}" numOctaves="${octaves}" seed="${seed}" stitchTiles="stitch"/>` +
    `<feColorMatrix type="saturate" values="0"/></filter>` +
    `<rect width="${TILE}" height="${TILE}" filter="url(#${id})" opacity="${opacity.toFixed(3)}"/>`
  );
}

function rgbOf(hex: string): [number, number, number] {
  const safe = isHexColour(hex) ? hex : "#c3a469";
  const value = safe.slice(1);
  const full =
    value.length === 3
      ? value
          .split("")
          .map((char) => char + char)
          .join("")
      : value;
  const number = parseInt(full, 16);
  return [(number >> 16) & 255, (number >> 8) & 255, number & 255];
}

/** Mixes a colour towards white. */
function tint(hex: string, amount: number): string {
  const [r, g, b] = rgbOf(hex);
  const t = clamp(amount, 0, 1);
  const mix = (channel: number) => Math.round(channel + (255 - channel) * t);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

/** Mixes a colour towards black. */
function shade(hex: string, amount: number): string {
  const [r, g, b] = rgbOf(hex);
  const t = clamp(amount, 0, 1);
  const mix = (channel: number) => Math.round(channel * (1 - t));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

/** Deterministic flecks, kept inside the tile so the repeat has no seam. */
function flecks(count: number, opacity: number): string {
  if (count <= 0 || opacity <= 0.001) return "";
  let seed = 17;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const out: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const x = 6 + rnd() * 138;
    const y = 6 + rnd() * 138;
    const length = 3 + rnd() * 7;
    const angle = rnd() * 180;
    const alpha = (0.2 + rnd() * 0.4) * opacity;
    out.push(
      `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${length.toFixed(1)}" height="1.1" rx="0.55" fill="rgba(96,86,66,${alpha.toFixed(2)})" transform="rotate(${angle.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`,
    );
  }
  return out.join("");
}

function buildTile(material: LayerMaterial): string {
  const i = material.intensity;
  const tone = material.foil;

  switch (material.preset) {
    case "cotton":
      return svgTile(
        noise("mottle", 0.014, 3, 5, 0.3 * i) +
          noise("tooth", 0.9, 3, 11, 0.5 * i),
      );

    case "handmade":
      return svgTile(
        noise("tooth", 0.7, 3, 13, 0.35 * i) +
          noise("mottle", 0.02, 2, 29, 0.22 * i) +
          flecks(Math.round(34 + 26 * i), i),
      );

    case "linen":
      return svgTile(
        `<g stroke-width="1" shape-rendering="crispEdges">` +
          `<path d="M0 1.5H${TILE}" stroke="${hexToRgba("#ffffff", 0.5 * i)}"/>` +
          `<path d="M0 5.5H${TILE}" stroke="${hexToRgba("#161616", 0.22 * i)}"/>` +
          `<path d="M1.5 0V${TILE}" stroke="${hexToRgba("#ffffff", 0.3 * i)}"/>` +
          `<path d="M5.5 0V${TILE}" stroke="${hexToRgba("#161616", 0.16 * i)}"/>` +
          `</g>` +
          noise("tooth", 1.1, 2, 17, 0.22 * i),
      );

    case "vellum":
      return svgTile(
        `<rect width="${TILE}" height="${TILE}" fill="${hexToRgba("#ffffff", 0.74)}"/>` +
          noise("mottle", 0.012, 3, 7, 0.14) +
          noise("tooth", 0.85, 3, 19, 0.24 * i),
      );

    case "matte":
      return svgTile(
        noise("tooth", 1.2, 2, 23, 0.42 * i) +
          noise("mottle", 0.03, 2, 31, 0.1 * i),
      );

    case "satin":
      return svgTile(
        `<defs><linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">` +
          `<stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>` +
          `<stop offset="25%" stop-color="#ffffff" stop-opacity="${(0.55 * i).toFixed(3)}"/>` +
          `<stop offset="50%" stop-color="#ffffff" stop-opacity="0"/>` +
          `<stop offset="75%" stop-color="#ffffff" stop-opacity="${(0.45 * i).toFixed(3)}"/>` +
          `<stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>` +
          `</linearGradient></defs>` +
          `<rect width="${TILE}" height="${TILE}" fill="url(#sheen)"/>` +
          noise("tooth", 1, 2, 37, 0.22 * i),
      );

    case "gold":
    case "silver":
    case "rose-gold": {
      const strength = material.foilStrength;
      const light = tint(tone, 0.35 + 0.35 * strength);
      const lightSoft = tint(tone, 0.18 + 0.2 * strength);
      const dark = shade(tone, 0.28 + 0.3 * strength);
      return svgTile(
        `<defs><linearGradient id="metal" x1="0" y1="0" x2="1" y2="0">` +
          `<stop offset="0%" stop-color="${tone}"/>` +
          `<stop offset="18%" stop-color="${light}"/>` +
          `<stop offset="34%" stop-color="${tone}"/>` +
          `<stop offset="52%" stop-color="${dark}"/>` +
          `<stop offset="70%" stop-color="${lightSoft}"/>` +
          `<stop offset="86%" stop-color="${tone}"/>` +
          `<stop offset="100%" stop-color="${tone}"/>` +
          `</linearGradient></defs>` +
          `<rect width="${TILE}" height="${TILE}" fill="url(#metal)"/>` +
          `<g style="mix-blend-mode:overlay">${noise("grit", 0.85, 3, 41, 0.4 * i)}</g>` +
          `<g style="mix-blend-mode:soft-light">${noise("mottle", 0.02, 2, 43, 0.5 * i)}</g>`,
      );
    }

    case "emboss":
    case "deboss":
      return svgTile(
        noise("tooth", 0.8, 3, 47, 0.38 * i) +
          noise("mottle", 0.025, 2, 53, 0.14 * i),
      );

    case "wax":
      return svgTile(
        `<rect width="${TILE}" height="${TILE}" fill="${tone}"/>` +
          `<g style="mix-blend-mode:overlay">${noise("mottle", 0.05, 3, 59, 0.5 * i)}</g>` +
          `<defs>` +
          `<radialGradient id="dome" cx="34%" cy="30%" r="64%">` +
          `<stop offset="0%" stop-color="#ffffff" stop-opacity="${(0.5 * i + 0.1).toFixed(3)}"/>` +
          `<stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>` +
          `</radialGradient>` +
          `<radialGradient id="rim" cx="50%" cy="50%" r="50%">` +
          `<stop offset="66%" stop-color="#161616" stop-opacity="0"/>` +
          `<stop offset="100%" stop-color="#161616" stop-opacity="${(0.4 * i + 0.1).toFixed(3)}"/>` +
          `</radialGradient></defs>` +
          `<rect width="${TILE}" height="${TILE}" fill="url(#dome)"/>` +
          `<rect width="${TILE}" height="${TILE}" fill="url(#rim)"/>`,
      );

    case "ribbon": {
      // 45° bands whose period divides the tile, so the repeat is invisible.
      const period = 32;
      const bands: string[] = [];
      for (let x = -TILE; x <= TILE * 2; x += period) {
        const light = Math.round(x / period) % 2 === 0;
        bands.push(
          `<path d="M ${x} 0 L ${x + TILE} ${TILE}" stroke="${
            light
              ? hexToRgba("#ffffff", 0.16 * i + 0.04)
              : hexToRgba("#161616", 0.18 * i + 0.04)
          }" stroke-width="14" fill="none"/>`,
        );
      }
      return svgTile(
        `<rect width="${TILE}" height="${TILE}" fill="${tone}"/>` +
          `<g>${bands.join("")}</g>` +
          `<defs><linearGradient id="satin" x1="0" y1="0" x2="0" y2="1">` +
          `<stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>` +
          `<stop offset="30%" stop-color="#ffffff" stop-opacity="${(0.22 * i).toFixed(3)}"/>` +
          `<stop offset="60%" stop-color="#ffffff" stop-opacity="0"/>` +
          `<stop offset="100%" stop-color="#ffffff" stop-opacity="${(0.14 * i).toFixed(3)}"/>` +
          `</linearGradient></defs>` +
          `<rect width="${TILE}" height="${TILE}" fill="url(#satin)"/>`,
      );
    }

    case "lace": {
      const spacing = 40;
      const radius = 15;
      const motifs: string[] = [];
      for (let y = 20; y < TILE; y += spacing) {
        for (let x = 20; x < TILE; x += spacing) {
          motifs.push(
            `<circle cx="${x}" cy="${y}" r="${radius}" fill="none" stroke="${hexToRgba(
              tone,
              0.85 * i,
            )}" stroke-width="2.4"/>`,
            `<circle cx="${x}" cy="${y}" r="6" fill="${hexToRgba(tone, 0.55 * i)}"/>`,
          );
        }
      }
      const threads: string[] = [];
      for (let x = -TILE; x <= TILE * 2; x += spacing) {
        threads.push(
          `<path d="M ${x} 0 L ${x + TILE} ${TILE}" stroke="${hexToRgba(
            tone,
            0.4 * i,
          )}" stroke-width="1" fill="none"/>`,
          `<path d="M ${x + TILE} 0 L ${x} ${TILE}" stroke="${hexToRgba(
            tone,
            0.4 * i,
          )}" stroke-width="1" fill="none"/>`,
        );
      }
      return svgTile(`<g>${threads.join("")}</g>${motifs.join("")}`);
    }

    default:
      return svgTile(noise("tooth", 0.9, 3, 3, 0.4 * i));
  }
}

/* -------------------------------------------------------------------------- */
/* Rendering helpers                                                          */
/* -------------------------------------------------------------------------- */

/**
 * The inset shadow that reads as depth: embossing lights the top-left face and
 * darkens the far one, debossing does the reverse because the cavity's far
 * wall is what catches the light. Drawn as a box shadow so it stays editable —
 * no pixels are ever written into the artwork.
 */
export function materialReliefShadow(
  material: LayerMaterial | undefined,
): string | undefined {
  if (!materialIsActive(material) || !material) return undefined;
  const depth = material.relief;
  if (Math.abs(depth) < 0.02) return undefined;
  const amount = Math.abs(depth);
  const blur = Math.round(3 + material.softness * 16);
  const offset = Math.round(1 + amount * 4);
  const alpha = 0.16 + amount * 0.34;
  const light = hexToRgba("#ffffff", alpha);
  const dark = hexToRgba("#161616", alpha);
  const positive = `${offset}px ${offset}px ${blur}px`;
  const negative = `${-offset}px ${-offset}px ${blur}px`;
  return depth > 0
    ? `inset ${positive} ${light}, inset ${negative} ${dark}`
    : `inset ${positive} ${dark}, inset ${negative} ${light}`;
}

/**
 * The whole finish as one overlay: tile, blend and strength. The caller adds
 * the silhouette (a border radius for boxed forms, a clip path for a vector),
 * because only the caller knows the layer's geometry.
 */
export function materialOverlayStyle(
  material: LayerMaterial | undefined,
): CSSProperties | undefined {
  if (!materialIsActive(material) || !material) return undefined;
  const size = Math.max(24, Math.round(TILE * clamp(material.scale, 0.5, 3)));
  return {
    backgroundImage: `url("${materialTile(material)}")`,
    backgroundRepeat: "repeat",
    backgroundSize: `${size}px ${size}px`,
    backgroundPosition: "center",
    mixBlendMode: material.blend,
    opacity: Math.round(material.opacity * 1000) / 1000,
    boxShadow: materialReliefShadow(material),
    pointerEvents: "none",
  };
}

/** The border radius that matches how the shape's own vector is drawn. */
export function materialShapeRadius(
  element: { kind: string; shape?: string; radius?: number; imageRadius?: number; w: number; h: number },
): string | undefined {
  if (element.kind === "image") return `${element.imageRadius ?? 0}px`;
  const shape = element.shape ?? "rect";
  if (shape === "ellipse") return "50%";
  if (shape === "capsule") return "50% / 50%";
  if (shape === "rect") {
    const radius = Math.max(0, element.radius ?? 0);
    if (radius <= 0) return undefined;
    // The vector stretches to the box, so its corners do too.
    const rx = (radius * element.w) / 100;
    const ry = (radius * element.h) / 100;
    return `${rx.toFixed(2)}px / ${ry.toFixed(2)}px`;
  }
  return undefined;
}

/* -------------------------------------------------------------------------- */
/* Copy / paste                                                               */
/* -------------------------------------------------------------------------- */

/**
 * A session clipboard for finishes, kept outside React so copying on the
 * desktop panel still pastes after the phone's bottom sheet opens. Nothing is
 * written to storage: a finish belongs to the design, not to the device.
 */
let clipboard: LayerMaterial | null = null;

export function copyMaterial(
  material: LayerMaterial | undefined,
): LayerMaterial | null {
  clipboard = material ? { ...material } : null;
  return clipboard;
}

export function pasteMaterial(): LayerMaterial | undefined {
  return clipboard ? { ...clipboard } : undefined;
}

export function hasCopiedMaterial(): boolean {
  return clipboard !== null;
}
