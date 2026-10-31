import type { CSSProperties } from "react";
import { hexToRgba, isHexColour } from "@/lib/effects";

/**
 * Luxury finishes: metallic foils, physical depth and surface materials.
 *
 * A finish is an editable layer stacked onto a real element of the invitation
 * — never painted into artwork, never regenerated and never retyped. The
 * original letter shapes, Arabic shaping, layer geometry, rotation, clipping,
 * transparency and stacking order all stay exactly as the host drew them:
 * finishes compose as CSS backgrounds, SVG filters and blend modes around the
 * existing render, so every layer remains independently editable.
 *
 * Everything here is digital-only. The print pipeline strips finish settings
 * structurally (see `printablePage`), so a screen finish can never leak into
 * the PDF, the bleed or the crop marks.
 *
 * Rendering strategy, by finish kind:
 *   - metallic — a directional multi-stop metal ramp driven by the lighting
 *     direction, with fine imperfection grain; painted as a clipped overlay on
 *     boxed forms, as the glyph fill (background-clip: text) on type, and as a
 *     specular light pass on outlined artwork (motifs, rules, frames).
 *   - depth    — an SVG filter over the layer's own alpha: a directional
 *     specular highlight and a contact shadow whose azimuth follows the light.
 *     Letters keep their exact shapes because the filter shades the rendered
 *     glyphs instead of redrawing them.
 *   - surface  — a distinct texture tile or sheen per material, blended inside
 *     the layer's own silhouette; on type it is clipped into the glyphs.
 *   - edge     — a gilded page edge: a directional metallic ring around the
 *     sheet with an inner contact shade.
 */

/* -------------------------------------------------------------------------- */
/* Catalog                                                                    */
/* -------------------------------------------------------------------------- */

export type FinishKind = "metallic" | "depth" | "surface" | "edge";

export type FinishId =
  // Metallic
  | "gold-foil"
  | "silver-foil"
  | "rose-gold-foil"
  | "copper-foil"
  | "champagne-gold"
  | "brushed-gold"
  | "antique-gold"
  | "holographic-foil"
  // Physical depth
  | "emboss"
  | "deboss"
  | "deep-engraving"
  | "blind-emboss"
  | "letterpress"
  | "pattern-engraving"
  // Surface
  | "spot-uv"
  | "matte-seal"
  | "velvet"
  | "soft-touch"
  | "satin-sheen"
  | "pearlescent"
  | "mother-of-pearl"
  | "iridescent"
  | "fine-grain"
  | "handmade-paper"
  | "cotton-paper"
  | "linen-texture"
  | "translucent-vellum"
  | "wax-seal"
  // Page edges
  | "gilded-gold"
  | "gilded-silver"
  | "gilded-copper";

export type FinishSurface = "text" | "outline" | "solid";

export interface FinishLayer {
  /** Stable id, so reorder/duplicate/enable target the right layer. */
  id: string;
  finish: FinishId;
  enabled: boolean;
  /** Overall presence of the finish, 0…1. */
  intensity: number;
  /** Relief: positive raises, negative presses, 0 is flat, −1…1. */
  depth: number;
  /** How mirror-like a metal responds to the light, 0…1. */
  reflectivity: number;
  /** Sharpness of the highlight: wet gloss to dry tooth, 0…1. */
  gloss: number;
  /** Micro-structure scatter: brushed lines, grain, nap, 0…1. */
  roughness: number;
  /** Strength of the finish over the artwork, 0…1. */
  opacity: number;
  /** The finish's own colour — metal tone, wax, pearl base. HEX. */
  colour: string;
  /** Wax seal only: the initials pressed into the wax. */
  monogram?: string;
}

export interface FinishDef {
  id: FinishId;
  label: string;
  kind: FinishKind;
  note: string;
  /** True when the finish belongs on the sheet rather than a layer. */
  pageOnly?: boolean;
  /** Surfaces the finish draws faithfully on. */
  surfaces: FinishSurface[];
  /** Which knobs this material actually responds to. */
  controls: {
    colour?: boolean;
    depth?: boolean;
    reflectivity?: boolean;
    gloss?: boolean;
    roughness?: boolean;
    monogram?: boolean;
  };
  defaults: Omit<FinishLayer, "id" | "finish" | "enabled">;
}

const METALLIC: Omit<FinishDef, "surfaces">[] = [
  {
    id: "gold-foil",
    label: "Gold Foil",
    kind: "metallic",
    note: "Warm 24k gilt with a mirror band and fine imperfections",
    controls: { colour: true, reflectivity: true, gloss: true, roughness: true },
    defaults: { intensity: 0.85, depth: 0, reflectivity: 0.75, gloss: 0.6, roughness: 0.3, opacity: 0.95, colour: "#c9a44c" },
  },
  {
    id: "silver-foil",
    label: "Silver Foil",
    kind: "metallic",
    note: "Cool platinum with a clean, high-contrast highlight",
    controls: { colour: true, reflectivity: true, gloss: true, roughness: true },
    defaults: { intensity: 0.85, depth: 0, reflectivity: 0.8, gloss: 0.65, roughness: 0.25, opacity: 0.95, colour: "#c7ccd2" },
  },
  {
    id: "rose-gold-foil",
    label: "Rose Gold",
    kind: "metallic",
    note: "Blush copper alloy, softer than yellow gilt",
    controls: { colour: true, reflectivity: true, gloss: true, roughness: true },
    defaults: { intensity: 0.85, depth: 0, reflectivity: 0.7, gloss: 0.6, roughness: 0.3, opacity: 0.95, colour: "#cf9b85" },
  },
  {
    id: "copper-foil",
    label: "Copper",
    kind: "metallic",
    note: "Burnished red metal with deep warm shadowing",
    controls: { colour: true, reflectivity: true, gloss: true, roughness: true },
    defaults: { intensity: 0.85, depth: 0, reflectivity: 0.72, gloss: 0.5, roughness: 0.42, opacity: 0.95, colour: "#b4703c" },
  },
  {
    id: "champagne-gold",
    label: "Champagne Gold",
    kind: "metallic",
    note: "Pale, airy gilt — quieter than classic gold",
    controls: { colour: true, reflectivity: true, gloss: true, roughness: true },
    defaults: { intensity: 0.8, depth: 0, reflectivity: 0.6, gloss: 0.55, roughness: 0.3, opacity: 0.92, colour: "#dcc792" },
  },
  {
    id: "brushed-gold",
    label: "Brushed Gold",
    kind: "metallic",
    note: "Directional brush lines scatter the highlight",
    controls: { colour: true, reflectivity: true, gloss: true, roughness: true },
    defaults: { intensity: 0.85, depth: 0, reflectivity: 0.55, gloss: 0.35, roughness: 0.75, opacity: 0.95, colour: "#c2a25c" },
  },
  {
    id: "antique-gold",
    label: "Antique Gold",
    kind: "metallic",
    note: "Aged gilt with darkened recesses and low fire",
    controls: { colour: true, reflectivity: true, gloss: true, roughness: true },
    defaults: { intensity: 0.85, depth: 0, reflectivity: 0.5, gloss: 0.35, roughness: 0.6, opacity: 0.95, colour: "#a3873c" },
  },
  {
    id: "holographic-foil",
    label: "Holographic Foil",
    kind: "metallic",
    note: "Restrained spectral shift across the metal",
    controls: { colour: true, reflectivity: true, gloss: true, roughness: true },
    defaults: { intensity: 0.8, depth: 0, reflectivity: 0.7, gloss: 0.7, roughness: 0.2, opacity: 0.92, colour: "#dfe3ea" },
  },
];

const DEPTH: Omit<FinishDef, "surfaces">[] = [
  {
    id: "emboss",
    label: "Emboss",
    kind: "depth",
    note: "Raised from the sheet, lit along the light direction",
    controls: { depth: true, gloss: true, roughness: true },
    defaults: { intensity: 0.8, depth: 0.6, reflectivity: 0.5, gloss: 0.4, roughness: 0.3, opacity: 1, colour: "#ffffff" },
  },
  {
    id: "deboss",
    label: "Deboss",
    kind: "depth",
    note: "Pressed into the sheet with a soft contact shadow",
    controls: { depth: true, gloss: true, roughness: true },
    defaults: { intensity: 0.8, depth: -0.6, reflectivity: 0.4, gloss: 0.4, roughness: 0.3, opacity: 1, colour: "#ffffff" },
  },
  {
    id: "deep-engraving",
    label: "Deep Engraving",
    kind: "depth",
    note: "A crisp cut with a bright rim and deep wall",
    controls: { depth: true, gloss: true, roughness: true },
    defaults: { intensity: 0.9, depth: -0.9, reflectivity: 0.6, gloss: 0.8, roughness: 0.25, opacity: 1, colour: "#ffffff" },
  },
  {
    id: "blind-emboss",
    label: "Blind Emboss",
    kind: "depth",
    note: "Relief without ink — only light and shadow describe it",
    controls: { depth: true, gloss: true, roughness: true },
    defaults: { intensity: 0.7, depth: 0.5, reflectivity: 0.35, gloss: 0.3, roughness: 0.4, opacity: 0.85, colour: "#ffffff" },
  },
  {
    id: "letterpress",
    label: "Letterpress",
    kind: "depth",
    note: "Pressed typography where ink sinks into cotton",
    controls: { depth: true, gloss: true, roughness: true },
    defaults: { intensity: 0.75, depth: -0.4, reflectivity: 0.3, gloss: 0.25, roughness: 0.5, opacity: 1, colour: "#ffffff" },
  },
  {
    id: "pattern-engraving",
    label: "Pattern Engraving",
    kind: "depth",
    note: "Engraved decorative hatching cut into the surface",
    controls: { depth: true, gloss: true, roughness: true },
    defaults: { intensity: 0.75, depth: -0.6, reflectivity: 0.5, gloss: 0.6, roughness: 0.5, opacity: 1, colour: "#ffffff" },
  },
];

const SURFACE: Omit<FinishDef, "surfaces">[] = [
  {
    id: "spot-uv",
    label: "Spot UV Gloss",
    kind: "surface",
    note: "Raised clear varnish catching a sharp studio highlight",
    controls: { gloss: true, roughness: true },
    defaults: { intensity: 0.7, depth: 0, reflectivity: 0.6, gloss: 0.95, roughness: 0.1, opacity: 0.7, colour: "#ffffff" },
  },
  {
    id: "matte-seal",
    label: "Matte Finish",
    kind: "surface",
    note: "Flat sealed surface that swallows reflections",
    controls: { roughness: true },
    defaults: { intensity: 0.5, depth: 0, reflectivity: 0.1, gloss: 0.1, roughness: 0.7, opacity: 0.5, colour: "#ffffff" },
  },
  {
    id: "velvet",
    label: "Velvet",
    kind: "surface",
    note: "Dense directional nap with a deep, soft pile",
    controls: { colour: true, roughness: true },
    defaults: { intensity: 0.7, depth: 0, reflectivity: 0.2, gloss: 0.3, roughness: 0.9, opacity: 0.6, colour: "#5a2333" },
  },
  {
    id: "soft-touch",
    label: "Soft Touch",
    kind: "surface",
    note: "Rubberised coating — muted light, velvety hand",
    controls: { roughness: true },
    defaults: { intensity: 0.5, depth: 0, reflectivity: 0.15, gloss: 0.2, roughness: 0.8, opacity: 0.5, colour: "#ffffff" },
  },
  {
    id: "satin-sheen",
    label: "Satin",
    kind: "surface",
    note: "A low, even sheen stretched along the light",
    controls: { gloss: true, roughness: true },
    defaults: { intensity: 0.6, depth: 0, reflectivity: 0.5, gloss: 0.6, roughness: 0.3, opacity: 0.6, colour: "#ffffff" },
  },
  {
    id: "pearlescent",
    label: "Pearlescent",
    kind: "surface",
    note: "Mica pearl with a gentle rose-to-cream drift",
    controls: { colour: true, gloss: true, roughness: true },
    defaults: { intensity: 0.65, depth: 0, reflectivity: 0.5, gloss: 0.55, roughness: 0.35, opacity: 0.65, colour: "#f3e9ef" },
  },
  {
    id: "mother-of-pearl",
    label: "Mother of Pearl",
    kind: "surface",
    note: "Nacre bands of mint, lilac and cream",
    controls: { colour: true, gloss: true, roughness: true },
    defaults: { intensity: 0.7, depth: 0, reflectivity: 0.55, gloss: 0.6, roughness: 0.3, opacity: 0.68, colour: "#eef3ec" },
  },
  {
    id: "iridescent",
    label: "Iridescent",
    kind: "surface",
    note: "Controlled spectral drift across the sheet",
    controls: { gloss: true, roughness: true },
    defaults: { intensity: 0.6, depth: 0, reflectivity: 0.5, gloss: 0.6, roughness: 0.25, opacity: 0.6, colour: "#ffffff" },
  },
  {
    id: "fine-grain",
    label: "Fine Grain",
    kind: "surface",
    note: "Micro tooth so fine it reads as photographed paper",
    controls: { roughness: true },
    defaults: { intensity: 0.5, depth: 0, reflectivity: 0.2, gloss: 0.2, roughness: 0.7, opacity: 0.5, colour: "#ffffff" },
  },
  {
    id: "handmade-paper",
    label: "Handmade Paper",
    kind: "surface",
    note: "Rag fibre with flecks and a cloudy formation",
    controls: { colour: true, roughness: true },
    defaults: { intensity: 0.65, depth: 0, reflectivity: 0.15, gloss: 0.15, roughness: 0.85, opacity: 0.55, colour: "#f4efe4" },
  },
  {
    id: "cotton-paper",
    label: "Cotton Paper",
    kind: "surface",
    note: "Soft mottled tooth of bright cotton stock",
    controls: { colour: true, roughness: true },
    defaults: { intensity: 0.55, depth: 0, reflectivity: 0.15, gloss: 0.15, roughness: 0.75, opacity: 0.5, colour: "#f6f2ea" },
  },
  {
    id: "linen-texture",
    label: "Linen Texture",
    kind: "surface",
    note: "A fine woven cross-hatch across the surface",
    controls: { colour: true, roughness: true },
    defaults: { intensity: 0.6, depth: 0, reflectivity: 0.2, gloss: 0.2, roughness: 0.8, opacity: 0.52, colour: "#f1ece1" },
  },
  {
    id: "translucent-vellum",
    label: "Translucent Vellum",
    kind: "surface",
    note: "A layered vellum veil softening what sits beneath",
    controls: { colour: true, gloss: true },
    defaults: { intensity: 0.6, depth: 0, reflectivity: 0.3, gloss: 0.3, roughness: 0.5, opacity: 0.55, colour: "#fbf8f1" },
  },
  {
    id: "wax-seal",
    label: "Wax Seal",
    kind: "surface",
    note: "Poured wax with a domed centre — colour and monogram yours",
    controls: { colour: true, monogram: true, gloss: true },
    defaults: { intensity: 0.85, depth: 0, reflectivity: 0.4, gloss: 0.6, roughness: 0.5, opacity: 0.95, colour: "#7b1220" },
  },
];

const EDGE: Omit<FinishDef, "surfaces">[] = [
  {
    id: "gilded-gold",
    label: "Gold Gilded Edge",
    kind: "edge",
    note: "The sheet's cut edge gilt in warm gold",
    pageOnly: true,
    controls: { colour: true, reflectivity: true, gloss: true },
    defaults: { intensity: 0.75, depth: 0, reflectivity: 0.7, gloss: 0.6, roughness: 0.3, opacity: 0.95, colour: "#c9a44c" },
  },
  {
    id: "gilded-silver",
    label: "Silver Gilded Edge",
    kind: "edge",
    note: "A cool silver leaf laid along the trim",
    pageOnly: true,
    controls: { colour: true, reflectivity: true, gloss: true },
    defaults: { intensity: 0.75, depth: 0, reflectivity: 0.75, gloss: 0.65, roughness: 0.25, opacity: 0.95, colour: "#c7ccd2" },
  },
  {
    id: "gilded-copper",
    label: "Copper Gilded Edge",
    kind: "edge",
    note: "Burnished copper leaf along the trim",
    pageOnly: true,
    controls: { colour: true, reflectivity: true, gloss: true },
    defaults: { intensity: 0.75, depth: 0, reflectivity: 0.7, gloss: 0.55, roughness: 0.4, opacity: 0.95, colour: "#b4703c" },
  },
];

/** Every finish, in library order: metal, depth, surface, edge. */
export const FINISH_DEFS: FinishDef[] = [
  ...METALLIC.map((def) => ({ ...def, surfaces: ["text", "outline", "solid"] as FinishSurface[] })),
  ...DEPTH.map((def) => ({ ...def, surfaces: ["text", "outline", "solid"] as FinishSurface[] })),
  ...SURFACE.map((def) => ({
    ...def,
    surfaces:
      def.id === "wax-seal"
        ? (["solid"] as FinishSurface[])
        : (["text", "solid"] as FinishSurface[]),
  })),
  ...EDGE.map((def) => ({ ...def, surfaces: [] as FinishSurface[] })),
];

export const FINISH_IDS: FinishId[] = FINISH_DEFS.map((def) => def.id);

export function isFinishId(value: unknown): value is FinishId {
  return typeof value === "string" && (FINISH_IDS as string[]).includes(value);
}

export function finishDef(id: FinishId): FinishDef {
  return FINISH_DEFS.find((def) => def.id === id) ?? FINISH_DEFS[0];
}

export function finishKindOf(id: FinishId): FinishKind {
  return finishDef(id).kind;
}

export const FINISH_CATEGORIES: { id: FinishKind; label: string; note: string }[] = [
  { id: "metallic", label: "Metallic foils", note: "Directional light on real metal ramps" },
  { id: "depth", label: "Physical depth", note: "Raised, pressed and engraved relief" },
  { id: "surface", label: "Surface materials", note: "Paper, coating, pearl and wax" },
  { id: "edge", label: "Page edges", note: "Gilding along the sheet's trim" },
];

/** A stack never grows past this: four compatible layers read as one surface. */
export const FINISH_MAX_LAYERS = 4;

/* -------------------------------------------------------------------------- */
/* Which surface a layer offers                                                */
/* -------------------------------------------------------------------------- */

/**
 * The three ways a finish can meet artwork. `text` clips into glyphs (Arabic
 * shaping untouched), `outline` shades the rendered strokes through a filter,
 * `solid` clips a silhouette overlay — exactly like the material system.
 */
export function finishSurfaceOf(element: {
  kind: string;
  frameArt?: string;
  shape?: string;
} | null | undefined): FinishSurface | null {
  if (!element) return null;
  if (element.kind === "text") return "text";
  if (element.kind === "motif") return "outline";
  if (element.kind === "image") return "solid";
  if (element.kind !== "shape") return null;
  if (element.frameArt) return "outline";
  const shape = element.shape ?? "rect";
  if (shape === "line" || shape === "frame") return "outline";
  return "solid";
}

/**
 * Is this finish honest on this surface? The sheet takes surface materials and
 * gilding; a wax seal belongs on a layer, not across the whole page. Page
 * stacks pass a `null` surface.
 */
export function finishFits(
  def: FinishDef,
  surface: FinishSurface | null,
  scope: "element" | "page",
): boolean {
  if (scope === "page" || surface === null) {
    if (def.pageOnly) return true;
    return def.kind === "surface" && def.id !== "wax-seal";
  }
  if (def.pageOnly) return false;
  return def.surfaces.includes(surface);
}

export function finishesFor(
  element: { kind: string; frameArt?: string; shape?: string } | null | undefined,
  scope: "element" | "page" = "element",
): FinishDef[] {
  const surface = scope === "page" ? null : finishSurfaceOf(element);
  return FINISH_DEFS.filter((def) => finishFits(def, surface, scope));
}

export const FINISH_SCOPE_NOTE =
  "Finishes are digital: they dress the invitation on screen and never enter the print export.";

/* -------------------------------------------------------------------------- */
/* Layers: create, normalise, compose                                          */
/* -------------------------------------------------------------------------- */

let finishSeq = 0;

export function finishLayerId(): string {
  finishSeq += 1;
  return `fin-${Date.now().toString(36)}-${finishSeq.toString(36)}`;
}

/** A fresh layer from the finish's own defaults. */
export function finishLayer(id: FinishId, patch: Partial<FinishLayer> = {}): FinishLayer {
  const def = finishDef(id);
  return {
    id: finishLayerId(),
    finish: def.id,
    enabled: true,
    ...def.defaults,
    ...patch,
  };
}

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
 * Repairs a saved layer. An unknown finish is dropped rather than guessed at —
 * showing the wrong material on someone's invitation is worse than showing
 * none — and every other field falls back to the finish's own default.
 */
export function normalizeFinishLayer(raw: unknown): FinishLayer | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const value = raw as Partial<FinishLayer>;
  if (!isFinishId(value.finish)) return undefined;
  const def = finishDef(value.finish);
  const fallback = def.defaults;
  const layer: FinishLayer = {
    id: typeof value.id === "string" && value.id ? value.id : finishLayerId(),
    finish: def.id,
    enabled: value.enabled !== false,
    intensity: unit(value.intensity, fallback.intensity),
    depth: Math.round(clamp(finite(value.depth, fallback.depth), -1, 1) * 1000) / 1000,
    reflectivity: unit(value.reflectivity, fallback.reflectivity),
    gloss: unit(value.gloss, fallback.gloss),
    roughness: unit(value.roughness, fallback.roughness),
    opacity: unit(value.opacity, fallback.opacity),
    colour: isHexColour(value.colour) ? (value.colour as string).toLowerCase() : fallback.colour,
  };
  if (def.controls.monogram && typeof value.monogram === "string") {
    layer.monogram = value.monogram.slice(0, 4);
  }
  return layer;
}

/** Invalid entries vanish; a repeated finish keeps only its first layer. */
export function normalizeFinishLayers(raw: unknown): FinishLayer[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const layers: FinishLayer[] = [];
  for (const entry of raw) {
    const layer = normalizeFinishLayer(entry);
    if (!layer || seen.has(layer.finish)) continue;
    seen.add(layer.finish);
    layers.push(layer);
    if (layers.length >= FINISH_MAX_LAYERS) break;
  }
  return layers;
}

export function normalizeFinishLayersOn(
  raw: unknown,
): FinishLayer[] | undefined {
  const layers = normalizeFinishLayers(raw);
  return layers.length > 0 ? layers : undefined;
}

/** Only enabled, known finishes draw. */
export function finishLayerIsActive(layer: FinishLayer | undefined): boolean {
  return Boolean(layer && layer.enabled && isFinishId(layer.finish));
}

export function finishStackIsActive(layers: FinishLayer[] | undefined): boolean {
  return Boolean(layers && layers.some(finishLayerIsActive));
}

/* -------------------------------------------------------------------------- */
/* Compatibility                                                              */
/* -------------------------------------------------------------------------- */

export type FinishAddResult =
  | { ok: true; layers: FinishLayer[] }
  | { ok: false; reason: string };

/**
 * Finishes combine only where the result is honest: one depth relief at a
 * time (an emboss inside a deboss is not a thing), never the same finish
 * twice, and never more than four layers.
 */
export function addFinishToStack(
  current: FinishLayer[],
  id: FinishId,
  surface: FinishSurface | null = "solid",
  scope: "element" | "page" = "element",
): FinishAddResult {
  const def = finishDef(id);
  if (!finishFits(def, surface, scope)) {
    return { ok: false, reason: `${def.label} does not draw on this layer.` };
  }
  if (current.some((layer) => layer.finish === id)) {
    return { ok: false, reason: `${def.label} is already on this layer.` };
  }
  if (current.length >= FINISH_MAX_LAYERS) {
    return { ok: false, reason: `A layer carries at most ${FINISH_MAX_LAYERS} finishes.` };
  }
  if (
    def.kind === "depth" &&
    current.some((layer) => finishLayerIsActive(layer) && finishKindOf(layer.finish) === "depth")
  ) {
    return { ok: false, reason: "One relief at a time — remove the other depth finish first." };
  }
  return { ok: true, layers: [...current, finishLayer(id)] };
}

/** Reorder a stack by id. Returns the same array when the id is unknown. */
export function moveFinishLayer(
  layers: FinishLayer[],
  id: string,
  toIndex: number,
): FinishLayer[] {
  const from = layers.findIndex((layer) => layer.id === id);
  if (from === -1) return layers;
  const target = clamp(toIndex, 0, layers.length - 1);
  if (target === from) return layers;
  const next = [...layers];
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved);
  return next;
}

export function duplicateFinishLayer(
  layers: FinishLayer[],
  id: string,
): FinishLayer[] {
  const from = layers.findIndex((layer) => layer.id === id);
  if (from === -1) return layers;
  const source = layers[from];
  if (layers.length >= FINISH_MAX_LAYERS) return layers;
  const copy: FinishLayer = { ...source, id: finishLayerId() };
  const next = [...layers];
  next.splice(from + 1, 0, copy);
  return next;
}

export function patchFinishLayer(
  layers: FinishLayer[],
  id: string,
  patch: Partial<Omit<FinishLayer, "id" | "finish">>,
): FinishLayer[] {
  return layers.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer));
}

export function removeFinishLayer(layers: FinishLayer[], id: string): FinishLayer[] {
  return layers.filter((layer) => layer.id !== id);
}

/** A session clipboard for stacks, kept outside React like the material one. */
let stackClipboard: FinishLayer[] | null = null;

export function copyFinishStack(layers: FinishLayer[]): FinishLayer[] | null {
  stackClipboard = layers.map((layer) => ({ ...layer, id: finishLayerId() }));
  return stackClipboard;
}

export function pasteFinishStack(): FinishLayer[] | undefined {
  return stackClipboard ? stackClipboard.map((layer) => ({ ...layer })) : undefined;
}

export function hasCopiedFinishStack(): boolean {
  return stackClipboard !== null && stackClipboard.length > 0;
}

/* -------------------------------------------------------------------------- */
/* Lighting engine                                                            */
/* -------------------------------------------------------------------------- */

export interface FinishLighting {
  /** Where the light comes from, degrees clockwise from the top. */
  direction: number;
  /** Overall light level, 0…1. */
  intensity: number;
  /** Size of the source: a small hard key or a broad soft box, 0…1. */
  softness: number;
  /** Colour temperature: −1 cool, 0 neutral, 1 warm. */
  temperature: number;
}

export const DEFAULT_FINISH_LIGHTING: FinishLighting = {
  direction: 42,
  intensity: 0.55,
  softness: 0.5,
  temperature: 0.12,
};

export const LIGHTING_PRESETS: {
  id: string;
  label: string;
  note: string;
  lighting: FinishLighting;
}[] = [
  {
    id: "softbox",
    label: "Studio softbox",
    note: "Large neutral source, upper left",
    lighting: { direction: 42, intensity: 0.55, softness: 0.65, temperature: 0.1 },
  },
  {
    id: "key",
    label: "Directional key",
    note: "Hard raking light that models the relief",
    lighting: { direction: 310, intensity: 0.7, softness: 0.25, temperature: 0.05 },
  },
  {
    id: "candle",
    label: "Candle warm",
    note: "Low warm light from the right",
    lighting: { direction: 120, intensity: 0.5, softness: 0.8, temperature: 0.85 },
  },
  {
    id: "window",
    label: "Cool daylight",
    note: "North window light, soft and cool",
    lighting: { direction: 220, intensity: 0.6, softness: 0.7, temperature: -0.55 },
  },
];

export function normalizeFinishLighting(raw: unknown): FinishLighting {
  const value = (raw && typeof raw === "object" ? raw : {}) as Partial<FinishLighting>;
  const direction = finite(value.direction, DEFAULT_FINISH_LIGHTING.direction);
  return {
    direction: ((direction % 360) + 360) % 360,
    intensity: unit(value.intensity, DEFAULT_FINISH_LIGHTING.intensity),
    softness: unit(value.softness, DEFAULT_FINISH_LIGHTING.softness),
    temperature: Math.round(clamp(finite(value.temperature, DEFAULT_FINISH_LIGHTING.temperature), -1, 1) * 1000) / 1000,
  };
}

/* -------------------------------------------------------------------------- */
/* Animated effects                                                           */
/* -------------------------------------------------------------------------- */

export type FinishAnimationId =
  | "moving-light"
  | "dynamic-shadows"
  | "floating-dust"
  | "signature-reveal"
  | "foil-reflection"
  | "pearl-shimmer"
  | "holographic-shift"
  | "layer-reveal";

export const FINISH_ANIMATIONS: { id: FinishAnimationId; label: string; note: string }[] = [
  { id: "moving-light", label: "Moving Light", note: "A soft sweep travels across the metal" },
  { id: "dynamic-shadows", label: "Dynamic Shadows", note: "Relief shadows breathe very slowly" },
  { id: "floating-dust", label: "Floating Dust", note: "Barely-there atmosphere over the sheet" },
  { id: "signature-reveal", label: "Signature Reveal", note: "Names are written on, left to right" },
  { id: "foil-reflection", label: "Foil Reflection", note: "The highlight drifts along the foil" },
  { id: "pearl-shimmer", label: "Pearl Shimmer", note: "Pearl bands move gently in the light" },
  { id: "holographic-shift", label: "Holographic Shift", note: "The spectrum turns slowly" },
  { id: "layer-reveal", label: "Layer Reveal", note: "Translucent layers lift off the artwork" },
];

export const FINISH_ANIMATION_IDS: FinishAnimationId[] = FINISH_ANIMATIONS.map(
  (item) => item.id,
);

export function isFinishAnimationId(value: unknown): value is FinishAnimationId {
  return typeof value === "string" && (FINISH_ANIMATION_IDS as string[]).includes(value);
}

/* -------------------------------------------------------------------------- */
/* Document configuration                                                     */
/* -------------------------------------------------------------------------- */

export interface FinishesConfig {
  version: 1;
  lighting: FinishLighting;
  /** Which optional animations this invitation plays. */
  animations: FinishAnimationId[];
  /** The preset the host last applied, for reopening the composer. */
  preset?: string;
}

export function defaultFinishesConfig(): FinishesConfig {
  return { version: 1, lighting: { ...DEFAULT_FINISH_LIGHTING }, animations: [] };
}

/**
 * Absent config stays absent: an invitation saved before finishes existed
 * opens with the default studio light and nothing switched on.
 */
export function normalizeFinishesConfig(raw: unknown): FinishesConfig | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const value = raw as Partial<FinishesConfig>;
  const animations = Array.isArray(value.animations)
    ? FINISH_ANIMATION_IDS.filter((id) => (value.animations as unknown[]).includes(id))
    : [];
  const lighting = normalizeFinishLighting(value.lighting);
  const untouched =
    animations.length === 0 &&
    lighting.direction === DEFAULT_FINISH_LIGHTING.direction &&
    lighting.intensity === DEFAULT_FINISH_LIGHTING.intensity &&
    lighting.softness === DEFAULT_FINISH_LIGHTING.softness &&
    lighting.temperature === DEFAULT_FINISH_LIGHTING.temperature &&
    typeof value.preset !== "string";
  if (untouched) return undefined;
  const config: FinishesConfig = { version: 1, lighting, animations };
  if (typeof value.preset === "string" && value.preset) config.preset = value.preset;
  return config;
}

export function patchFinishesConfig(
  config: FinishesConfig | undefined,
  patch: Partial<Omit<FinishesConfig, "version">>,
): FinishesConfig | undefined {
  const next: FinishesConfig = {
    ...(config ?? defaultFinishesConfig()),
    ...patch,
  };
  return normalizeFinishesConfig(next);
}

export function toggleFinishAnimation(
  config: FinishesConfig | undefined,
  id: FinishAnimationId,
  on: boolean,
): FinishesConfig {
  const base = config ?? defaultFinishesConfig();
  const set = new Set(base.animations);
  if (on) set.add(id);
  else set.delete(id);
  return { ...base, animations: FINISH_ANIMATION_IDS.filter((item) => set.has(item)) };
}

/* -------------------------------------------------------------------------- */
/* Luxury presets — real editable stacks, never flattened images              */
/* -------------------------------------------------------------------------- */

export interface FinishPresetSpec {
  finish: FinishId;
  patch?: Partial<Omit<FinishLayer, "id" | "finish" | "enabled">>;
}

export interface FinishPreset {
  id: string;
  label: string;
  note: string;
  lighting?: FinishLighting;
  /** Finish stacks per target; every entry is applied as editable layers. */
  page?: FinishPresetSpec[];
  text?: FinishPresetSpec[];
  motif?: FinishPresetSpec[];
  solid?: FinishPresetSpec[];
}

export const FINISH_PRESETS: FinishPreset[] = [
  {
    id: "royal-burgundy",
    label: "Royal Burgundy",
    note: "Burgundy sheet, champagne gold raised on the names",
    lighting: { direction: 42, intensity: 0.6, softness: 0.6, temperature: 0.3 },
    page: [{ finish: "cotton-paper", patch: { colour: "#efe3e0", intensity: 0.5 } }],
    text: [
      { finish: "gold-foil", patch: { colour: "#d2ac5f", reflectivity: 0.72 } },
      { finish: "emboss", patch: { depth: 0.55, intensity: 0.75 } },
    ],
    motif: [{ finish: "blind-emboss", patch: { depth: 0.5 } }],
    solid: [{ finish: "antique-gold", patch: { colour: "#a3873c" } }],
  },
  {
    id: "silver-essence",
    label: "Silver Essence",
    note: "Ivory stock, silver foil with a blind emboss",
    lighting: { direction: 220, intensity: 0.6, softness: 0.7, temperature: -0.4 },
    page: [{ finish: "cotton-paper", patch: { colour: "#f6f2ea", intensity: 0.5 } }],
    text: [
      { finish: "silver-foil", patch: { reflectivity: 0.8 } },
      { finish: "blind-emboss", patch: { depth: 0.45 } },
    ],
    motif: [{ finish: "blind-emboss", patch: { depth: 0.4 } }],
    solid: [{ finish: "silver-foil", patch: { reflectivity: 0.75 } }],
  },
  {
    id: "midnight-luxe",
    label: "Midnight Luxe",
    note: "Deep black sheet, gold foil with selective gloss",
    lighting: { direction: 310, intensity: 0.7, softness: 0.35, temperature: 0.15 },
    page: [{ finish: "matte-seal", patch: { intensity: 0.55 } }],
    text: [{ finish: "gold-foil", patch: { colour: "#d8b25e", gloss: 0.7 } }],
    motif: [{ finish: "gold-foil", patch: { colour: "#c9a44c" } }],
    solid: [
      { finish: "gold-foil", patch: { colour: "#d8b25e" } },
      { finish: "spot-uv", patch: { gloss: 0.95 } },
    ],
  },
  {
    id: "pearl-atelier",
    label: "Pearl Atelier",
    note: "Champagne surfaces, mother-of-pearl details, soft light",
    lighting: { direction: 65, intensity: 0.55, softness: 0.8, temperature: 0.2 },
    page: [{ finish: "translucent-vellum", patch: { intensity: 0.55 } }],
    text: [{ finish: "pearlescent", patch: { colour: "#f3e9ef", gloss: 0.55 } }],
    motif: [{ finish: "blind-emboss", patch: { depth: 0.4 } }],
    solid: [{ finish: "mother-of-pearl", patch: { intensity: 0.7 } }],
  },
  {
    id: "rose-signature",
    label: "Rose Signature",
    note: "Warm ivory, rose gold pressed gently into the type",
    lighting: { direction: 42, intensity: 0.55, softness: 0.65, temperature: 0.45 },
    page: [{ finish: "cotton-paper", patch: { colour: "#f6efe9", intensity: 0.5 } }],
    text: [
      { finish: "rose-gold-foil", patch: { colour: "#d3a08a" } },
      { finish: "letterpress", patch: { depth: -0.35 } },
    ],
    motif: [{ finish: "blind-emboss", patch: { depth: 0.4 } }],
    solid: [{ finish: "rose-gold-foil", patch: { colour: "#cf9b85" } }],
  },
  {
    id: "heritage-gold",
    label: "Heritage Gold",
    note: "Handmade stock, antique gold and engraved ornaments",
    lighting: { direction: 310, intensity: 0.62, softness: 0.4, temperature: 0.35 },
    page: [{ finish: "handmade-paper", patch: { intensity: 0.65 } }],
    text: [
      { finish: "antique-gold", patch: { colour: "#a3873c", roughness: 0.55 } },
      { finish: "deep-engraving", patch: { depth: -0.75 } },
    ],
    motif: [{ finish: "pattern-engraving", patch: { depth: -0.55 } }],
    solid: [{ finish: "antique-gold", patch: { reflectivity: 0.55 } }],
  },
  {
    id: "minimal-ivory",
    label: "Minimal Ivory",
    note: "Cotton paper with the quietest deboss and blind emboss",
    lighting: { direction: 42, intensity: 0.5, softness: 0.75, temperature: 0.05 },
    page: [{ finish: "cotton-paper", patch: { intensity: 0.6, colour: "#f6f2ea" } }],
    text: [{ finish: "deboss", patch: { depth: -0.35, intensity: 0.6 } }],
    motif: [{ finish: "blind-emboss", patch: { depth: 0.35, intensity: 0.6 } }],
    solid: [{ finish: "matte-seal", patch: { intensity: 0.45 } }],
  },
  {
    id: "modern-holographic",
    label: "Modern Holographic",
    note: "Clean type, restrained spectrum and a sharp gloss",
    lighting: { direction: 260, intensity: 0.6, softness: 0.5, temperature: -0.2 },
    page: [{ finish: "matte-seal", patch: { intensity: 0.5 } }],
    text: [{ finish: "holographic-foil", patch: { gloss: 0.7, opacity: 0.9 } }],
    motif: [{ finish: "holographic-foil", patch: { reflectivity: 0.65 } }],
    solid: [
      { finish: "holographic-foil", patch: { gloss: 0.75 } },
      { finish: "spot-uv", patch: { gloss: 0.9 } },
    ],
  },
];

export function finishPresetById(id: string): FinishPreset | undefined {
  return FINISH_PRESETS.find((preset) => preset.id === id);
}

/** Build the editable stack a preset prescribes for one target. */
export function presetStack(
  preset: FinishPreset,
  target: "page" | "text" | "motif" | "solid",
): FinishLayer[] {
  const specs = preset[target] ?? [];
  const seen = new Set<string>();
  const layers: FinishLayer[] = [];
  for (const spec of specs) {
    if (!isFinishId(spec.finish) || seen.has(spec.finish)) continue;
    seen.add(spec.finish);
    layers.push(finishLayer(spec.finish, spec.patch));
    if (layers.length >= FINISH_MAX_LAYERS) break;
  }
  return layers;
}

/* -------------------------------------------------------------------------- */
/* Preview modes — presentation only, never the artwork                        */
/* -------------------------------------------------------------------------- */

export type FinishPreviewMode =
  | "studio"
  | "candlelight"
  | "daylight"
  | "midnight"
  | "macro"
  | "motion";

export const FINISH_PREVIEW_MODES: {
  id: FinishPreviewMode;
  label: string;
  note: string;
}[] = [
  { id: "studio", label: "Studio Light", note: "Neutral premium studio lighting" },
  { id: "candlelight", label: "Warm Candlelight", note: "Elegant warm, low illumination" },
  { id: "daylight", label: "Soft Daylight", note: "Natural, even soft light" },
  { id: "midnight", label: "Midnight Luxury", note: "Controlled dramatic darkness" },
  { id: "macro", label: "Macro View", note: "Close-up inspection of materials and type" },
  { id: "motion", label: "Motion Preview", note: "Plays every enabled animated effect" },
];

export function isFinishPreviewMode(value: unknown): value is FinishPreviewMode {
  return typeof value === "string" && FINISH_PREVIEW_MODES.some((mode) => mode.id === value);
}

/**
 * The presentation treatment for a preview environment. It touches only the
 * preview wrapper — the invitation artwork itself is never modified.
 */
export function previewSurfaceStyle(mode: FinishPreviewMode): CSSProperties {
  switch (mode) {
    case "candlelight":
      return {
        filter: "sepia(0.22) saturate(1.06) brightness(0.94) contrast(1.03)",
        background:
          "radial-gradient(120% 90% at 62% 30%, rgba(255,196,120,0.16) 0%, rgba(20,12,6,0.28) 78%)",
      };
    case "daylight":
      return {
        filter: "brightness(1.05) saturate(0.98) contrast(0.99)",
        background:
          "radial-gradient(130% 100% at 30% 0%, rgba(236,242,255,0.16) 0%, rgba(255,255,255,0) 70%)",
      };
    case "midnight":
      return {
        filter: "brightness(0.84) contrast(1.08) saturate(1.02)",
        background:
          "radial-gradient(70% 55% at 50% 34%, rgba(255,236,200,0.14) 0%, rgba(4,5,8,0.55) 82%)",
      };
    case "macro":
      return { transform: "scale(1.7)", transformOrigin: "50% 42%" };
    case "motion":
    case "studio":
      return {};
  }
}

/** Motion Preview plays effects even where the host paused them. */
export function previewForcesAnimation(mode: FinishPreviewMode): boolean {
  return mode === "motion";
}

/* -------------------------------------------------------------------------- */
/* Colour helpers                                                             */
/* -------------------------------------------------------------------------- */

function rgbOf(hex: string): [number, number, number] {
  const safe = isHexColour(hex) ? hex : "#c9a44c";
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

function tint(hex: string, amount: number): string {
  const [r, g, b] = rgbOf(hex);
  const t = clamp(amount, 0, 1);
  const mix = (channel: number) => Math.round(channel + (255 - channel) * t);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function shade(hex: string, amount: number): string {
  const [r, g, b] = rgbOf(hex);
  const t = clamp(amount, 0, 1);
  const mix = (channel: number) => Math.round(channel * (1 - t));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

/** Mixes two colours — used for the light's colour temperature. */
function mixHex(a: string, b: string, amount: number): string {
  const [ar, ag, ab] = rgbOf(a);
  const [br, bg, bb] = rgbOf(b);
  const t = clamp(amount, 0, 1);
  const channel = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `rgb(${channel(ar, br)}, ${channel(ag, bg)}, ${channel(ab, bb)})`;
}

/** The direction the light travels across the surface, in radians. */
function lightTravelRadians(direction: number) {
  return (direction * Math.PI) / 180;
}

/** SVG filter azimuth for a light coming from `direction`. */
export function lightAzimuth(direction: number): number {
  return Math.round((((direction - 90) % 360) + 360) % 360);
}

/** The shadow vector cast by a light coming from `direction`. */
export function lightShadowVector(direction: number, amount: number) {
  const rad = lightTravelRadians(direction);
  return { dx: -Math.sin(rad) * amount, dy: Math.cos(rad) * amount };
}

/* -------------------------------------------------------------------------- */
/* Tiles                                                                      */
/* -------------------------------------------------------------------------- */

const TILE = 160;
const tileCache = new Map<string, string>();

function quantise(value: number, step = 0.05) {
  return Math.round(value / step) * step;
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

function flecks(count: number, opacity: number, colour: string): string {
  if (count <= 0 || opacity <= 0.001) return "";
  let seed = 29;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const out: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const x = 6 + rnd() * 138;
    const y = 6 + rnd() * 138;
    const length = 3 + rnd() * 8;
    const angle = rnd() * 180;
    const alpha = (0.2 + rnd() * 0.4) * opacity;
    out.push(
      `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${length.toFixed(1)}" height="1.1" rx="0.55" fill="${hexToRgba(colour, alpha)}" transform="rotate(${angle.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`,
    );
  }
  return out.join("");
}

/** The raw texture tile for a surface finish. Cached by its look. */
export function finishTile(layer: FinishLayer): string {
  const key = [
    layer.finish,
    quantise(layer.intensity),
    layer.colour.toLowerCase(),
    quantise(layer.roughness),
    quantise(layer.gloss),
  ].join("|");
  const cached = tileCache.get(key);
  if (cached) return cached;
  const uri = buildFinishTile(layer);
  if (tileCache.size > 400) tileCache.clear();
  tileCache.set(key, uri);
  return uri;
}

function buildFinishTile(layer: FinishLayer): string {
  const i = layer.intensity;
  const r = layer.roughness;
  const tone = layer.colour;

  switch (layer.finish) {
    case "cotton-paper":
      return svgTile(
        noise("f-mottle", 0.013, 3, 5, 0.28 * i) + noise("f-tooth", 0.95, 3, 11, 0.42 * i * (0.5 + r)),
      );

    case "handmade-paper":
      return svgTile(
        noise("f-tooth", 0.7, 3, 13, 0.3 * i * (0.6 + r * 0.6)) +
          noise("f-cloud", 0.02, 2, 29, 0.2 * i) +
          flecks(Math.round(26 + 24 * i), i * 0.8, "#7d7259"),
      );

    case "linen-texture":
      return svgTile(
        `<g stroke-width="1" shape-rendering="crispEdges">` +
          `<path d="M0 1.5H${TILE}" stroke="${hexToRgba("#ffffff", 0.5 * i)}"/>` +
          `<path d="M0 5.5H${TILE}" stroke="${hexToRgba("#161616", 0.2 * i)}"/>` +
          `<path d="M1.5 0V${TILE}" stroke="${hexToRgba("#ffffff", 0.34 * i)}"/>` +
          `<path d="M5.5 0V${TILE}" stroke="${hexToRgba("#161616", 0.15 * i)}"/>` +
          `</g>` +
          noise("f-weave", 1.1, 2, 17, 0.18 * i),
      );

    case "fine-grain":
      return svgTile(
        noise("f-grain", 1.35, 2, 23, 0.5 * i * (0.5 + r * 0.8)) +
          noise("f-mottle", 0.04, 2, 31, 0.08 * i),
      );

    case "matte-seal":
      return svgTile(
        noise("f-matte", 1.15, 2, 37, 0.34 * i * (0.5 + r)) +
          noise("f-cloud", 0.03, 2, 41, 0.07 * i),
      );

    case "soft-touch":
      return svgTile(
        noise("f-touch", 0.9, 3, 43, 0.3 * i * (0.5 + r * 0.7)) +
          `<rect width="${TILE}" height="${TILE}" fill="${hexToRgba(tone, 0.16 * i)}"/>`,
      );

    case "velvet": {
      // Directional nap: soft streaks with a deep pile between them.
      const streaks: string[] = [];
      let seed = 7;
      const rnd = () => {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return seed / 2147483648;
      };
      for (let index = 0; index < 70; index += 1) {
        const x = rnd() * TILE;
        const y = rnd() * TILE;
        const len = 6 + rnd() * 16;
        streaks.push(
          `<path d="M${x.toFixed(1)} ${y.toFixed(1)} l${len.toFixed(1)} ${(len * 0.45).toFixed(1)}" stroke="${hexToRgba("#ffffff", 0.1 * i)}" stroke-width="1.4" fill="none"/>`,
        );
        streaks.push(
          `<path d="M${x.toFixed(1)} ${(y + 3).toFixed(1)} l${(len * 0.8).toFixed(1)} ${(len * 0.36).toFixed(1)}" stroke="${hexToRgba("#000000", 0.14 * i)}" stroke-width="1.6" fill="none"/>`,
        );
      }
      return svgTile(
        `<rect width="${TILE}" height="${TILE}" fill="${hexToRgba(tone, 0.75)}"/>` +
          `<g>${streaks.join("")}</g>` +
          noise("f-pile", 0.85, 3, 53, 0.34 * i),
      );
    }

    case "pearlescent":
      return svgTile(
        `<defs><radialGradient id="p1" cx="30%" cy="26%" r="80%">` +
          `<stop offset="0%" stop-color="${hexToRgba("#ffffff", 0.85 * i)}"/>` +
          `<stop offset="46%" stop-color="${hexToRgba("#f7dfe9", 0.5 * i)}"/>` +
          `<stop offset="100%" stop-color="${hexToRgba("#dfeee6", 0.45 * i)}"/>` +
          `</radialGradient></defs>` +
          `<rect width="${TILE}" height="${TILE}" fill="${hexToRgba(tone, 0.6)}"/>` +
          `<rect width="${TILE}" height="${TILE}" fill="url(#p1)"/>` +
          noise("f-pearl", 1.0, 2, 59, 0.14 * i),
      );

    case "mother-of-pearl":
      return svgTile(
        `<defs>` +
          `<linearGradient id="nacre" x1="0" y1="0" x2="1" y2="1">` +
          `<stop offset="0%" stop-color="${hexToRgba("#eaf6ef", 0.8 * i)}"/>` +
          `<stop offset="34%" stop-color="${hexToRgba("#f3e7f4", 0.7 * i)}"/>` +
          `<stop offset="64%" stop-color="${hexToRgba("#fdf6e3", 0.7 * i)}"/>` +
          `<stop offset="100%" stop-color="${hexToRgba("#e4f1f7", 0.8 * i)}"/>` +
          `</linearGradient></defs>` +
          `<rect width="${TILE}" height="${TILE}" fill="${hexToRgba(tone, 0.55)}"/>` +
          `<rect width="${TILE}" height="${TILE}" fill="url(#nacre)"/>` +
          noise("f-nacre", 0.9, 2, 61, 0.16 * i),
      );

    case "iridescent":
      return svgTile(
        `<defs><linearGradient id="irid" x1="0" y1="0" x2="1" y2="1">` +
          `<stop offset="0%" stop-color="${hexToRgba("#f9d6e8", 0.55 * i)}"/>` +
          `<stop offset="30%" stop-color="${hexToRgba("#d6ecf9", 0.5 * i)}"/>` +
          `<stop offset="60%" stop-color="${hexToRgba("#e2f9d6", 0.5 * i)}"/>` +
          `<stop offset="100%" stop-color="${hexToRgba("#f9edd6", 0.55 * i)}"/>` +
          `</linearGradient></defs>` +
          `<rect width="${TILE}" height="${TILE}" fill="url(#irid)"/>` +
          noise("f-irid", 0.8, 2, 67, 0.12 * i),
      );

    case "satin-sheen":
      return svgTile(
        `<defs><linearGradient id="sat" x1="0" y1="0" x2="0" y2="1">` +
          `<stop offset="0%" stop-color="${hexToRgba("#ffffff", 0)}"/>` +
          `<stop offset="26%" stop-color="${hexToRgba("#ffffff", 0.55 * i)}"/>` +
          `<stop offset="52%" stop-color="${hexToRgba("#ffffff", 0.05 * i)}"/>` +
          `<stop offset="76%" stop-color="${hexToRgba("#ffffff", 0.4 * i)}"/>` +
          `<stop offset="100%" stop-color="${hexToRgba("#ffffff", 0)}"/>` +
          `</linearGradient></defs>` +
          `<rect width="${TILE}" height="${TILE}" fill="${hexToRgba(tone, 0.3)}"/>` +
          `<rect width="${TILE}" height="${TILE}" fill="url(#sat)"/>` +
          noise("f-sat", 1.0, 2, 71, 0.14 * (0.4 + r)),
      );

    case "spot-uv": {
      // Clear varnish: a sharp diagonal catch-light over a faint deepening.
      const band = 30 + (1 - layer.gloss) * 60;
      return svgTile(
        `<defs><linearGradient id="uv" x1="0" y1="0" x2="1" y2="1">` +
          `<stop offset="0%" stop-color="${hexToRgba("#ffffff", 0.06 * i)}"/>` +
          `<stop offset="${(46 - band / 4).toFixed(0)}%" stop-color="${hexToRgba("#ffffff", 0.16 * i)}"/>` +
          `<stop offset="50%" stop-color="${hexToRgba("#ffffff", 0.7 * i * layer.gloss)}"/>` +
          `<stop offset="${(54 + band / 4).toFixed(0)}%" stop-color="${hexToRgba("#ffffff", 0.14 * i)}"/>` +
          `<stop offset="100%" stop-color="${hexToRgba("#000000", 0.05 * i)}"/>` +
          `</linearGradient></defs>` +
          `<rect width="${TILE}" height="${TILE}" fill="url(#uv)"/>`,
      );
    }

    case "translucent-vellum":
      return svgTile(
        `<rect width="${TILE}" height="${TILE}" fill="${hexToRgba(tone, 0.7)}"/>` +
          noise("f-vellum-mottle", 0.012, 3, 7, 0.12) +
          noise("f-vellum-tooth", 0.85, 3, 19, 0.22 * i) +
          flecks(14, i * 0.5, "#9a9078"),
      );

    case "wax-seal": {
      return svgTile(
        `<rect width="${TILE}" height="${TILE}" fill="${tone}"/>` +
          `<g style="mix-blend-mode:overlay">${noise("f-wax-mottle", 0.05, 3, 59, 0.42 * i)}</g>` +
          `<defs>` +
          `<radialGradient id="waxdome" cx="36%" cy="30%" r="66%">` +
          `<stop offset="0%" stop-color="${hexToRgba("#ffffff", 0.42 * i + 0.08)}"/>` +
          `<stop offset="70%" stop-color="${hexToRgba("#ffffff", 0.04 * i)}"/>` +
          `<stop offset="100%" stop-color="${hexToRgba("#000000", 0.22 * i)}"/>` +
          `</radialGradient></defs>` +
          `<rect width="${TILE}" height="${TILE}" fill="url(#waxdome)"/>`,
      );
    }

    case "pattern-engraving": {
      // Engraved cross-hatching: paired light/dark strokes read as grooves.
      const step = 22;
      const lines: string[] = [];
      for (let x = -TILE; x <= TILE * 2; x += step) {
        lines.push(
          `<path d="M ${x} 0 L ${x + TILE} ${TILE}" stroke="${hexToRgba("#ffffff", 0.34 * i)}" stroke-width="1.2" fill="none"/>`,
          `<path d="M ${x + 1.6} 0 L ${x + TILE + 1.6} ${TILE}" stroke="${hexToRgba("#000000", 0.3 * i)}" stroke-width="1.2" fill="none"/>`,
          `<path d="M ${x} 0 L ${x - TILE} ${TILE}" stroke="${hexToRgba("#ffffff", 0.26 * i)}" stroke-width="1" fill="none"/>`,
          `<path d="M ${x + 1.4} 0 L ${x - TILE + 1.4} ${TILE}" stroke="${hexToRgba("#000000", 0.24 * i)}" stroke-width="1" fill="none"/>`,
        );
      }
      return svgTile(`<g>${lines.join("")}</g>` + noise("f-engrave", 1.2, 2, 73, 0.12 * i));
    }

    default:
      return svgTile(noise("f-base", 0.9, 3, 3, 0.4 * i));
  }
}

/** The fine imperfection layer every metal wears. */
function imperfectionTile(roughness: number, intensity: number): string {
  const key = `imperfection|${quantise(roughness)}|${quantise(intensity)}`;
  const cached = tileCache.get(key);
  if (cached) return cached;
  const uri = svgTile(
    noise("f-metal-grit", 0.85, 3, 41, 0.5 * intensity * (0.4 + roughness)) +
      noise("f-metal-mottle", 0.02, 2, 43, 0.4 * intensity * (0.5 + roughness * 0.5)),
  );
  if (tileCache.size > 400) tileCache.clear();
  tileCache.set(key, uri);
  return uri;
}

/* -------------------------------------------------------------------------- */
/* Metallic ramps                                                             */
/* -------------------------------------------------------------------------- */

/**
 * The metal itself: a multi-stop directional ramp whose bands sit along the
 * light, with a bright mirror band whose width follows gloss and whose
 * contrast follows reflectivity. This is never a flat colour — a real metal
 * alternates sky, source and ground reflections across its face.
 */
export function metalGradient(layer: FinishLayer, lighting: FinishLighting): string {
  const angle = lighting.direction;
  const tone = layer.colour;
  const reflect = layer.reflectivity;
  const gloss = layer.gloss;

  if (layer.finish === "holographic-foil") {
    const shift = Math.round(lighting.direction);
    return (
      `linear-gradient(${shift}deg, ` +
      `hsl(${(340 + shift) % 360} 62% ${Math.round(70 + reflect * 8)}% / ${0.75 + reflect * 0.2}), ` +
      `hsl(${(40 + shift) % 360} 55% ${Math.round(78 + gloss * 8)}% / 0.9), ` +
      `hsl(${(160 + shift) % 360} 58% ${Math.round(68 + reflect * 10)}% / 0.82), ` +
      `hsl(${(220 + shift) % 360} 60% ${Math.round(74 + gloss * 6)}% / 0.88), ` +
      `hsl(${(300 + shift) % 360} 58% ${Math.round(70 + reflect * 8)}% / 0.8))`
    );
  }

  const light = tint(tone, 0.3 + 0.4 * reflect);
  const lightest = tint(tone, 0.5 + 0.45 * reflect * gloss);
  const soft = tint(tone, 0.14 + 0.2 * reflect);
  const dark = shade(tone, 0.3 + 0.34 * (1 - gloss * 0.4));
  const darkest = shade(tone, 0.48 + 0.3 * reflect);

  const bands =
    layer.finish === "antique-gold"
      ? `${darkest} 0%, ${dark} 14%, ${tone} 30%, ${soft} 44%, ${light} 54%, ${soft} 62%, ${dark} 76%, ${darkest} 92%, ${dark} 100%`
      : layer.finish === "brushed-gold"
        ? `${dark} 0%, ${tone} 18%, ${soft} 36%, ${lightest} 50%, ${soft} 64%, ${tone} 82%, ${dark} 100%`
        : `${dark} 0%, ${tone} 15%, ${soft} 32%, ${light} 45%, ${lightest} 50%, ${light} 56%, ${soft} 70%, ${tone} 86%, ${dark} 100%`;

  return `linear-gradient(${angle}deg, ${bands})`;
}

/** Brushed-metal streaks, aligned with the brush rather than the light. */
function brushedLayer(layer: FinishLayer): { image: string; blend: string } | undefined {
  if (layer.finish !== "brushed-gold" || layer.roughness <= 0.05) return undefined;
  const alpha = (0.05 + layer.roughness * 0.14) * layer.intensity;
  return {
    image: `repeating-linear-gradient(90deg, ${hexToRgba("#ffffff", alpha)} 0px, ${hexToRgba("#ffffff", alpha)} 1px, ${hexToRgba("#000000", alpha * 0.8)} 1px, ${hexToRgba("#000000", alpha * 0.8)} 2px, transparent 2px, transparent 5px)`,
    blend: "overlay",
  };
}

/* -------------------------------------------------------------------------- */
/* Rendering: overlays for boxed layers                                        */
/* -------------------------------------------------------------------------- */

function isMetal(id: FinishId) {
  return finishKindOf(id) === "metallic";
}

function isSurface(id: FinishId) {
  return finishKindOf(id) === "surface";
}

/** The blend a surface layer uses to meet the artwork honestly. */
function surfaceBlend(layer: FinishLayer): NonNullable<CSSProperties["mixBlendMode"]> {
  switch (layer.finish) {
    case "matte-seal":
    case "soft-touch":
    case "fine-grain":
      return "soft-light";
    case "velvet":
      return "multiply";
    case "translucent-vellum":
    case "wax-seal":
      return "normal";
    case "spot-uv":
    case "satin-sheen":
    case "pearlescent":
    case "mother-of-pearl":
    case "iridescent":
      return "overlay";
    default:
      return "soft-light";
  }
}

export interface FinishOverlay {
  /** Layer order inside the silhouette. */
  order: number;
  layer: FinishLayer;
  style: CSSProperties;
}

/**
 * The overlay stack for a boxed layer (shapes and photographs). Each finish
 * becomes one clipped, blended span inside the layer's own silhouette —
 * nothing is ever drawn outside the geometry the host set.
 */
export function finishOverlays(
  layers: FinishLayer[] | undefined,
  lighting: FinishLighting,
): FinishOverlay[] {
  if (!layers) return [];
  const out: FinishOverlay[] = [];
  layers.forEach((layer, order) => {
    if (!finishLayerIsActive(layer)) return;
    const def = finishDef(layer.finish);
    if (!def.surfaces.includes("solid")) return;

    if (isMetal(layer.finish)) {
      const brushed = brushedLayer(layer);
      const imperfections = imperfectionTile(layer.roughness, layer.intensity);
      const images = [
        brushed?.image,
        `url("${imperfections}")`,
        metalGradient(layer, lighting),
      ].filter(Boolean) as string[];
      const blends = [
        brushed?.blend,
        "overlay",
        "normal",
      ].filter(Boolean) as NonNullable<CSSProperties["mixBlendMode"]>[];
      out.push({
        order,
        layer,
        style: {
          backgroundImage: images.join(", "),
          backgroundBlendMode: blends.join(", "),
          backgroundSize: brushed ? `auto, ${Math.round(48 + layer.roughness * 96)}px, auto` : `${Math.round(48 + layer.roughness * 96)}px ${Math.round(48 + layer.roughness * 96)}px, auto`,
          opacity: Math.round(layer.opacity * (0.55 + layer.intensity * 0.45) * 1000) / 1000,
          mixBlendMode: "hard-light",
        },
      });
      return;
    }

    if (isSurface(layer.finish)) {
      const size = Math.max(24, Math.round(TILE * (0.6 + layer.roughness * 1.2)));
      const style: CSSProperties = {
        backgroundImage: `url("${finishTile(layer)}")`,
        backgroundRepeat: "repeat",
        backgroundSize: `${size}px ${size}px`,
        backgroundPosition: "center",
        mixBlendMode: surfaceBlend(layer),
        opacity: Math.round(layer.opacity * layer.intensity * 1000) / 1000,
      };
      if (layer.finish === "satin-sheen" || layer.finish === "spot-uv") {
        // The sheen follows the light: it is a lighting response, not a texture.
        style.backgroundImage = [
          `linear-gradient(${lighting.direction}deg, ${hexToRgba("#000000", 0.06 * layer.intensity)} 0%, ${hexToRgba("#ffffff", 0.5 * layer.intensity * layer.gloss)} 46%, ${hexToRgba("#ffffff", 0.7 * layer.intensity * layer.gloss)} 52%, ${hexToRgba("#000000", 0.05 * layer.intensity)} 100%)`,
          `url("${finishTile(layer)}")`,
        ].join(", ");
        style.backgroundSize = "auto, " + `${size}px ${size}px`;
        style.mixBlendMode = "overlay";
      }
      if (layer.finish === "wax-seal") {
        style.backgroundImage = [
          `radial-gradient(circle at 34% 30%, ${hexToRgba("#ffffff", 0.4 * layer.intensity)} 0%, ${hexToRgba("#ffffff", 0.1 * layer.intensity)} 34%, transparent 62%)`,
          `radial-gradient(circle at 50% 50%, transparent 58%, ${hexToRgba("#000000", 0.3 * layer.intensity)} 100%)`,
          `url("${finishTile(layer)}")`,
        ].join(", ");
        style.backgroundSize = "auto, auto, " + `${size}px ${size}px`;
        style.mixBlendMode = "normal";
        style.opacity = Math.round(layer.opacity * 1000) / 1000;
      }
      out.push({ order, layer, style });
    }
  });
  return out;
}

/** The wax monogram, when the layer is a seal with initials pressed in. */
export function finishMonogram(layer: FinishLayer | undefined): string | undefined {
  if (!layer || !finishLayerIsActive(layer) || layer.finish !== "wax-seal") return undefined;
  const value = (layer.monogram ?? "").trim();
  return value ? value.slice(0, 4) : undefined;
}

/* -------------------------------------------------------------------------- */
/* Rendering: glyph fills for type                                             */
/* -------------------------------------------------------------------------- */

export interface FinishGlyphFill {
  style: CSSProperties;
  /** True when a finish owns the type's fill (colours go transparent). */
  ownsFill: boolean;
}

/**
 * Finishes on type compose into the glyphs themselves via background-clip —
 * the letters keep their exact shapes, Arabic shaping and RTL order, and the
 * text stays selectable and crisp at any zoom.
 */
export function finishGlyphFill(
  layers: FinishLayer[] | undefined,
  lighting: FinishLighting,
  baseColour: string,
): FinishGlyphFill | undefined {
  if (!layers || layers.length === 0) return undefined;
  const active = layers.filter(
    (layer) =>
      finishLayerIsActive(layer) &&
      finishDef(layer.finish).surfaces.includes("text"),
  );
  if (active.length === 0) return undefined;

  const images: string[] = [];
  const sizes: string[] = [];
  const blends: NonNullable<CSSProperties["mixBlendMode"]>[] = [];
  let ownsFill = false;

  for (const layer of active) {
    if (isMetal(layer.finish)) {
      const imperfections = imperfectionTile(layer.roughness, layer.intensity);
      images.push(`url("${imperfections}")`, metalGradient(layer, lighting));
      sizes.push(
        `${Math.round(40 + layer.roughness * 80)}px ${Math.round(40 + layer.roughness * 80)}px`,
        "auto",
      );
      blends.push("overlay", "normal");
      ownsFill = true;
      continue;
    }
    // Surface finishes ride inside the glyph fill as texture, never over the
    // words as a box.
    const size = Math.max(22, Math.round(TILE * (0.5 + layer.roughness)));
    images.push(`url("${finishTile(layer)}")`);
    sizes.push(`${size}px ${size}px`);
    blends.push(surfaceBlend(layer));
  }

  if (images.length === 0) return undefined;

  return {
    ownsFill,
    style: {
      backgroundImage: images.join(", "),
      backgroundSize: sizes.join(", "),
      backgroundBlendMode: blends.join(", "),
      backgroundPosition: "center",
      // With no metal present the texture rides over the layer's own colour.
      backgroundColor: ownsFill ? undefined : baseColour,
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
      WebkitTextFillColor: "transparent",
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Rendering: depth & shine filters                                            */
/* -------------------------------------------------------------------------- */

export interface FinishFilterRecipe {
  /** Dedupe key: identical recipes share one filter element. */
  key: string;
  depth?: FinishLayer;
  metal?: FinishLayer;
}

function recipeKeyPart(layer: FinishLayer) {
  return [
    layer.finish,
    quantise(layer.depth, 0.05),
    quantise(layer.intensity, 0.05),
    quantise(layer.reflectivity, 0.05),
    quantise(layer.gloss, 0.05),
    quantise(layer.roughness, 0.05),
    quantise(layer.opacity, 0.05),
    layer.colour.toLowerCase(),
  ].join(".");
}

/**
 * What a filter pass must do for this layer stack on this surface:
 * a depth relief (shading the layer's own alpha) and, on outlined artwork
 * where no overlay can clip, the metal's specular response.
 */
export function finishFilterRecipe(
  layers: FinishLayer[] | undefined,
  surface: FinishSurface | null,
): FinishFilterRecipe | undefined {
  if (!layers || surface === null) return undefined;
  const active = layers.filter(finishLayerIsActive);
  // Depth always shades the layer's own pixels — that is the only honest way
  // to emboss a letter. The metal pass is needed only on outlined artwork,
  // where no clipped overlay can follow the strokes.
  const depth = active.find((layer) => finishKindOf(layer.finish) === "depth");
  const metal =
    surface === "outline"
      ? active.find((layer) => finishKindOf(layer.finish) === "metallic")
      : undefined;
  if (!depth && !metal) return undefined;
  const parts: string[] = [];
  if (depth) parts.push(recipeKeyPart(depth));
  if (metal) parts.push(`m:${recipeKeyPart(metal)}`);
  return { key: parts.join("|"), depth, metal };
}

export function finishFilterId(prefix: string, recipe: FinishFilterRecipe): string {
  // A short, deterministic id — the full key can be long for a url() reference.
  let hash = 0;
  for (let index = 0; index < recipe.key.length; index += 1) {
    hash = (hash * 31 + recipe.key.charCodeAt(index)) | 0;
  }
  return `${prefix}-lf-${Math.abs(hash).toString(36)}`;
}

/**
 * The filter itself. Everything is derived from the layer's own parameters
 * and the shared lighting direction, so moving the light genuinely changes
 * which side of every letter and ornament is bright.
 */
export function finishFilterMarkup(
  id: string,
  recipe: FinishFilterRecipe,
  lighting: FinishLighting,
): string {
  const azimuth = lightAzimuth(lighting.direction);
  const softness = lighting.softness;
  const lightLevel = 0.35 + lighting.intensity * 0.65;
  const parts: string[] = [];

  parts.push(
    `<filter id="${id}" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">`,
  );

  let raised = true;

  if (recipe.depth) {
    const layer = recipe.depth;
    raised = layer.depth >= 0;
    const amount = Math.abs(layer.depth);
    const def = finishDef(layer.finish);
    const engraved = def.id === "deep-engraving" || def.id === "pattern-engraving";
    const blurStd = engraved ? 0.6 + (1 - layer.gloss) * 1.2 : 1.1 + (1 - layer.gloss) * 2.6 + softness * 1.4;
    const strength = layer.intensity * layer.opacity * lightLevel;
    const spec = (0.55 + layer.reflectivity * 1.1) * strength * (engraved ? 1.25 : 1);
    const exponent = 4 + layer.gloss * 26;
    const elevation = raised ? 32 + (1 - amount) * 20 : 24 + (1 - amount) * 14;
    const { dx, dy } = lightShadowVector(lighting.direction, 0.9 + amount * 2.4);

    // The contact shadow: opposite the light when raised, on the light's own
    // side when pressed (the far wall of the cavity is what you see).
    const shadowDx = raised ? -dx : dx;
    const shadowDy = raised ? -dy : dy;
    const shadowAlpha = (raised ? 0.24 : 0.38) * amount * strength;

    parts.push(
      `<feGaussianBlur in="SourceAlpha" stdDeviation="${blurStd.toFixed(2)}" result="lf-relief"/>`,
      `<feSpecularLighting in="lf-relief" surfaceScale="${(1.5 + amount * 4.5).toFixed(2)}" specularConstant="${spec.toFixed(3)}" specularExponent="${exponent.toFixed(1)}" lighting-color="#ffffff" result="lf-spec">` +
        `<feDistantLight azimuth="${azimuth}" elevation="${Math.round(raised ? elevation : elevation - 6)}"/>` +
        `</feSpecularLighting>`,
      `<feComposite in="lf-spec" in2="SourceAlpha" operator="in" result="lf-spec-in"/>`,
      `<feOffset in="SourceAlpha" dx="${shadowDx.toFixed(2)}" dy="${shadowDy.toFixed(2)}" result="lf-off"/>`,
      `<feGaussianBlur in="lf-off" stdDeviation="${(blurStd * 0.9 + amount * 1.2).toFixed(2)}" result="lf-sh"/>`,
      `<feFlood flood-color="#141013" flood-opacity="${shadowAlpha.toFixed(3)}" result="lf-dark"/>`,
      `<feComposite in="lf-dark" in2="lf-sh" operator="in" result="lf-shadow"/>`,
    );
  }

  if (recipe.metal) {
    // Outlined artwork (motifs, rules, frames) cannot take a clipped overlay,
    // so the metal answers the light as a specular pass over its own strokes:
    // the tone shifts toward the metal and a directional highlight rides it.
    const layer = recipe.metal;
    const base = shade(layer.colour, 0.18);
    const spec = (0.5 + layer.reflectivity * 1.3) * layer.intensity;
    const exponent = 5 + layer.gloss * 30;
    parts.push(
      `<feFlood flood-color="${base}" flood-opacity="${(layer.opacity * 0.75).toFixed(3)}" result="lf-metal-flood"/>`,
      `<feComposite in="lf-metal-flood" in2="SourceAlpha" operator="in" result="lf-metal-base"/>`,
      `<feGaussianBlur in="SourceAlpha" stdDeviation="${(1 + (1 - layer.gloss) * 1.6).toFixed(2)}" result="lf-mb"/>`,
      `<feSpecularLighting in="lf-mb" surfaceScale="${(2 + layer.reflectivity * 3).toFixed(2)}" specularConstant="${spec.toFixed(3)}" specularExponent="${exponent.toFixed(1)}" lighting-color="${tint(layer.colour, 0.65)}" result="lf-mspec">` +
        `<feDistantLight azimuth="${azimuth}" elevation="36"/>` +
        `</feSpecularLighting>`,
      `<feComposite in="lf-mspec" in2="SourceAlpha" operator="in" result="lf-mspec-in"/>`,
    );
  }

  // One merge carries every pass, so the filter's final result holds the
  // relief, the metal and the original artwork together.
  const nodes: string[] = [];
  if (recipe.depth && raised) nodes.push("lf-shadow");
  nodes.push("SourceGraphic");
  if (recipe.metal) nodes.push("lf-metal-base");
  if (recipe.depth && !raised) nodes.push("lf-shadow");
  if (recipe.depth) nodes.push("lf-spec-in");
  if (recipe.metal) nodes.push("lf-mspec-in");

  parts.push(
    `<feMerge>${nodes.map((node) => `<feMergeNode in="${node}"/>`).join("")}</feMerge>`,
    `</filter>`,
  );
  return parts.join("");
}

/* -------------------------------------------------------------------------- */
/* Rendering: page-level light, surface and gilded edges                       */
/* -------------------------------------------------------------------------- */

/**
 * The studio light itself: a broad directional wash with a temperature tint
 * and a soft ambient falloff at the sheet's edges. Kept deliberately gentle —
 * no neon, no exaggerated glow.
 */
export function finishLightStyle(lighting: FinishLighting): CSSProperties | undefined {
  if (lighting.intensity <= 0.01) return undefined;
  const strength = lighting.intensity;
  const warmth = (lighting.temperature + 1) / 2;
  const lit = mixRgb("#cfe0ff", "#ffd9a0", warmth, 0.17 * strength);
  const dark = hexToRgba("#141013", 0.12 * strength * (1 - lighting.softness * 0.5));
  const angle = lighting.direction;
  return {
    backgroundImage:
      `radial-gradient(120% 90% at ${lightOriginPercentages(lighting.direction)}, ${lit} 0%, transparent ${Math.round(50 + lighting.softness * 30)}%), ` +
      `linear-gradient(${(angle + 180) % 360}deg, ${dark} 0%, transparent 42%), ` +
      `radial-gradient(130% 110% at 50% 50%, transparent 62%, ${hexToRgba("#141013", 0.1 * strength)} 100%)`,
    mixBlendMode: "soft-light" as const,
  };
}

function mixRgb(a: string, b: string, amount: number, alpha: number): string {
  const mixed = mixHex(a, b, amount);
  // mixHex returns rgb(...) — thread the alpha through directly.
  return mixed.replace("rgb(", "rgba(").replace(")", `, ${alpha.toFixed(3)})`);
}

/** Where the light sits around the sheet, in percentages. */
function lightOriginPercentages(direction: number): string {
  const rad = lightTravelRadians(direction);
  // The light's position is opposite its travel direction.
  const x = 50 - Math.sin(rad) * 46;
  const y = 50 - Math.cos(rad) * 46;
  return `${x.toFixed(1)}% ${y.toFixed(1)}%`;
}

/**
 * A gilded edge: a directional metal ring around the sheet with an inner
 * contact shade, drawn inside the page box so the cut edge stays the cut edge.
 */
export function finishEdgeStyle(
  layer: FinishLayer | undefined,
  lighting: FinishLighting,
): CSSProperties | undefined {
  if (!finishLayerIsActive(layer) || !layer) return undefined;
  const width = Math.max(3, Math.round(4 + layer.intensity * 9));
  const ring = metalGradient(layer, lighting);
  const inner = hexToRgba("#141013", 0.16 * layer.intensity);
  return {
    border: `${width}px solid transparent`,
    borderImage: `${ring} 1`,
    boxShadow: `inset 0 0 ${Math.round(10 + layer.intensity * 16)}px ${inner}`,
    opacity: Math.round(layer.opacity * 1000) / 1000,
    pointerEvents: "none",
  };
}

/** The page's edge finish, if the stack carries one. */
export function pageEdgeFinish(layers: FinishLayer[] | undefined): FinishLayer | undefined {
  return layers?.find(
    (layer) => finishLayerIsActive(layer) && finishKindOf(layer.finish) === "edge",
  );
}

/** Page-scope surface layers (the sheet's own material). */
export function pageSurfaceFinishes(layers: FinishLayer[] | undefined): FinishLayer[] {
  return (layers ?? []).filter(
    (layer) => finishLayerIsActive(layer) && finishKindOf(layer.finish) === "surface",
  );
}

/* -------------------------------------------------------------------------- */
/* Animation classes                                                          */
/* -------------------------------------------------------------------------- */

export interface FinishAnimationState {
  enabled: FinishAnimationId[];
  reducedMotion: boolean;
  forced: boolean;
}

export function animationOn(
  state: FinishAnimationState | undefined,
  id: FinishAnimationId,
): boolean {
  if (!state) return false;
  if (state.reducedMotion) return false;
  return state.forced || state.enabled.includes(id);
}

/**
 * The CSS class an active layer earns for its motion. Every class honours
 * `prefers-reduced-motion` in CSS as well, so a system-level setting always
 * wins even where a preview forces effects on.
 */
export function finishAnimationClass(
  layer: FinishLayer,
  state: FinishAnimationState | undefined,
): string | undefined {
  if (!state || state.reducedMotion) return undefined;
  const on = (id: FinishAnimationId) => animationOn(state, id);
  if (layer.finish === "holographic-foil" && on("holographic-shift")) return "lf-holo";
  if (
    (layer.finish === "pearlescent" ||
      layer.finish === "mother-of-pearl" ||
      layer.finish === "iridescent") &&
    on("pearl-shimmer")
  ) {
    return "lf-pearl";
  }
  if (isMetal(layer.finish)) {
    if (on("moving-light")) return "lf-sweep";
    if (on("foil-reflection")) return "lf-foil";
  }
  if (isSurface(layer.finish) && layer.finish === "translucent-vellum" && on("layer-reveal")) {
    return "lf-lift";
  }
  if (finishKindOf(layer.finish) === "depth" && on("dynamic-shadows")) {
    return "lf-shadow";
  }
  return undefined;
}

/** The signature reveal: names written on progressively, left to right. */
export function signatureAnimationClass(
  state: FinishAnimationState | undefined,
): string | undefined {
  return animationOn(state, "signature-reveal") ? "lf-signature" : undefined;
}
