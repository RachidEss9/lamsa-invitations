import type { CSSProperties } from "react";
import { normalizeEffects, type LayerEffects } from "@/lib/effects";
import { guestVisiblePageIds, normalizeSuite, type DesignSuite } from "@/lib/suite";
import { normalizeMaterial, type LayerMaterial } from "@/lib/materials";
import { normalizeImageAdjust, type ImageAdjust } from "@/lib/image-frame";
import { normalizeCurve } from "@/lib/text-path";
import { fontNameFor } from "@/lib/fonts";
import {
  formatEventDate,
  formatEventTime,
  isPairedOccasion,
  type InvitationContent,
  type MotifId,
} from "@/lib/invitation";

/**
 * The canvas studio document.
 *
 * A design is deliberately plain, serialisable data: pages of absolutely
 * positioned elements measured in a fixed 1000 x 1333 (3:4) coordinate space.
 * The same document drives the studio canvas, the animation timeline, the
 * guest experience preview, and the published invitation.
 */

export const DESIGN_WIDTH = 1000;
export const DESIGN_HEIGHT = 1333.33;
export const DESIGN_ASPECT = DESIGN_WIDTH / DESIGN_HEIGHT;

export type EasingId = "linear" | "easeOut" | "easeInOut" | "backOut" | "easeIn";

export const EASINGS: { id: EasingId; label: string }[] = [
  { id: "easeOut", label: "Ease out" },
  { id: "easeInOut", label: "Ease in-out" },
  { id: "linear", label: "Linear" },
  { id: "backOut", label: "Back out" },
  { id: "easeIn", label: "Ease in" },
];

export type AnimationPresetId =
  | "none"
  | "fade"
  | "fadeUp"
  | "fadeDown"
  | "fadeLeft"
  | "fadeRight"
  | "scaleIn"
  | "blurIn"
  | "rise"
  | "wipeUp"
  | "wipeRight"
  | "draw"
  | "flipIn"
  | "zoomFade"
  | "swingIn"
  | "dropIn"
  | "maskDown"
  | "maskLeft"
  | "unveil"
  | "float"
  | "shimmer"
  | "pulse"
  | "driftIn"
  | "riseFast";

export const ANIMATION_PRESETS: {
  id: AnimationPresetId;
  label: string;
  group: "Text" | "Image" | "Shape" | "Reveal" | "Background" | "Interactive";
  note: string;
}[] = [
  { id: "fade", label: "Fade", group: "Text", note: "A quiet opacity lift" },
  { id: "fadeUp", label: "Fade up", group: "Text", note: "Rises into place" },
  { id: "fadeDown", label: "Fade down", group: "Text", note: "Descends into place" },
  { id: "fadeLeft", label: "Fade left", group: "Text", note: "Enters from the right" },
  { id: "fadeRight", label: "Fade right", group: "Text", note: "Enters from the left" },
  { id: "scaleIn", label: "Scale in", group: "Image", note: "Grows gently from 94%" },
  { id: "blurIn", label: "Blur in", group: "Image", note: "Resolves from a soft focus" },
  { id: "rise", label: "Rise", group: "Shape", note: "Long, slow editorial rise" },
  { id: "wipeUp", label: "Wipe up", group: "Reveal", note: "Unmasks upward" },
  { id: "wipeRight", label: "Wipe right", group: "Reveal", note: "Unmasks to the right" },
  { id: "draw", label: "Draw", group: "Shape", note: "Traces in from the left" },
  // A second, more expressive shelf built on the same timeline engine.
  { id: "flipIn", label: "Flip in", group: "Text", note: "Turns in from the left edge" },
  { id: "zoomFade", label: "Zoom fade", group: "Image", note: "Settles from a close crop" },
  { id: "swingIn", label: "Swing in", group: "Text", note: "A gentle pendulum entrance" },
  { id: "dropIn", label: "Drop in", group: "Text", note: "Falls softly into place" },
  { id: "maskDown", label: "Mask down", group: "Reveal", note: "Uncovers from the top" },
  { id: "maskLeft", label: "Mask left", group: "Reveal", note: "Uncovers from the right" },
  { id: "unveil", label: "Unveil", group: "Reveal", note: "Opens like a lens" },
  { id: "float", label: "Float", group: "Background", note: "Drifts up through a soft haze" },
  { id: "shimmer", label: "Shimmer", group: "Image", note: "Brightens from a dark print" },
  { id: "pulse", label: "Pulse", group: "Interactive", note: "Breathes in at the centre" },
  { id: "driftIn", label: "Drift in", group: "Background", note: "A slow diagonal drift" },
  { id: "riseFast", label: "Quick rise", group: "Text", note: "A crisp editorial lift" },
  { id: "none", label: "None", group: "Text", note: "Visible from the start" },
];

export type AnimationTrigger = "load" | "scroll";

export interface ElementAnimation {
  enabled: boolean;
  preset: AnimationPresetId;
  trigger: AnimationTrigger;
  delay: number;
  duration: number;
  easing: EasingId;
}

export interface ExitAnimation {
  enabled: boolean;
  preset: AnimationPresetId;
  start: number;
  duration: number;
  easing: EasingId;
}

export type ShapeKind =
  | "rect"
  | "ellipse"
  | "line"
  | "heart"
  | "arch"
  | "leaf"
  | "star"
  | "frame"
  | "capsule"
  | "triangle"
  | "diamond"
  | "hexagon"
  | "shield"
  | "scallop"
  | "burst"
  | "clover"
  | "blob";

export const SHAPES: { id: ShapeKind; label: string }[] = [
  { id: "rect", label: "Rectangle" },
  { id: "capsule", label: "Capsule" },
  { id: "ellipse", label: "Ellipse" },
  { id: "line", label: "Rule" },
  { id: "triangle", label: "Triangle" },
  { id: "diamond", label: "Diamond" },
  { id: "hexagon", label: "Hexagon" },
  { id: "heart", label: "Heart" },
  { id: "arch", label: "Arch" },
  { id: "leaf", label: "Leaf" },
  { id: "star", label: "Star" },
  { id: "shield", label: "Shield" },
  { id: "scallop", label: "Scallop" },
  { id: "burst", label: "Seal burst" },
  { id: "clover", label: "Quatrefoil" },
  { id: "blob", label: "Organic blob" },
  { id: "frame", label: "Frame" },
];

export type RevealEffect = "fadeAway" | "dissolve" | "wipe" | "flip";
export const REVEAL_EFFECTS: { id: RevealEffect; label: string; note: string }[] = [
  { id: "fadeAway", label: "Fade away", note: "The cover lifts and fades" },
  { id: "dissolve", label: "Dissolve", note: "Soft blur into nothing" },
  { id: "wipe", label: "Wipe", note: "Slides away in one direction" },
  { id: "flip", label: "Flip", note: "Turns over like a card" },
];

export interface RevealConfig {
  /** Stable id stored with the cover so the interaction survives edits. */
  interactionId: string;
  targetId: string;
  effect: RevealEffect;
  direction: "left" | "right" | "up" | "down";
  duration: number;
  trigger: "tap";
  hint?: string;
}

export type ElementKind = "text" | "image" | "shape" | "motif";

export interface DesignElement {
  id: string;
  kind: ElementKind;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  /** Mirror the layer in its own axes. Purely visual: geometry never changes. */
  flipX?: boolean;
  flipY?: boolean;
  opacity: number;
  locked: boolean;
  hidden: boolean;
  groupId?: string;

  text?: string;
  /** Any id from FONT_LIBRARY, or an old font-pair id for saved designs. */
  font?: string;
  fontSize?: number;
  fontWeight?: number;
  italic?: boolean;
  uppercase?: boolean;
  letterSpacing?: number;
  lineHeight?: number;
  align?: "left" | "center" | "right";
  /** Independent of alignment: auto follows the invitation language. */
  direction?: "auto" | "ltr" | "rtl";
  color?: string;
  /** Case treatment applied by CSS; the stored text is never rewritten. */
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  /** Underline and strikethrough are real text decorations, not panel borders. */
  textDecoration?: "none" | "underline" | "line-through";
  verticalAlign?: "top" | "middle" | "bottom";
  /**
   * Text on a path: −1 … 1. Positive arcs the words upward, negative dips
   * them, and an absent value keeps the straight baseline the box already has.
   * Pure geometry — the wording, the box and the type scale never move.
   */
  curve?: number;
  textBackground?: string;
  textBorder?: string;
  textBorderWidth?: number;
  textRadius?: number;
  textShadow?: boolean;
  textPadding?: number;

  shape?: ShapeKind;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
  /**
   * Decorative frame artwork (an id from `FRAME_LIBRARY`). A frame stays an
   * ordinary shape element, so it keeps the editor's selection, resizing,
   * rotation, layer order, colour, weight, saving, and publishing behaviour.
   */
  frameArt?: string;

  motif?: MotifId;

  imageStorageId?: string;
  fit?: "cover" | "contain";
  /** Focal point for a cover crop, in percentages. */
  imagePosition?: { x: number; y: number };
  imageRadius?: number;
  imageBorder?: number;
  imageShadow?: boolean;
  /**
   * When true, the image is clipped to the element's vector shape instead of
   * filling its bounding box. This is what turns a shape into an image mask.
   */
  imageInShape?: boolean;
  /**
   * How far into the mask the picture sits, as a fraction of the element size.
   * Used for repositioning and zooming a masked image without changing the
   * element's own geometry.
   */
  imageZoom?: number;
  /**
   * A shape layer can keep its decorative stroke even when it is also carrying
   * a masked image, so a framed photograph still reads as a framed object.
   */
  frameStrokeOnImage?: boolean;
  /**
   * The photograph's own angle inside its frame or mask, in degrees. The
   * element's `rotation` turns the whole layer; this turns only the picture,
   * so a tilted shot can be straightened inside an arch without straightening
   * the arch, or a portrait can sit at a deliberate slant.
   */
  imageRotate?: number;
  /**
   * Darkroom adjustments for the photograph only — brightness, contrast and
   * saturation. They are settings, never pixels: the original file is left
   * untouched, and every surface draws them from the same CSS filter.
   */
  imageAdjust?: ImageAdjust;

  /**
   * Editable layer effects. Optional, so every invitation saved before effects
   * existed opens exactly as it was, with nothing switched on.
   */
  effects?: LayerEffects;

  /**
   * A material / print finish (paper grain, foil, relief, wax). Optional and
   * sanitised on load, so an invitation saved before materials existed opens
   * exactly as it was, and a malformed value is dropped rather than drawn.
   * Finishes are screen previews only: they never enter the print pipeline.
   */
  material?: LayerMaterial;

  reveal?: RevealConfig;
  animation: ElementAnimation;
  exit?: ExitAnimation;
}

export interface DesignPage {
  id: string;
  name: string;
  background: string;
  elements: DesignElement[];
  /** Hidden pages stay editable here but are skipped by the guest run. */
  hidden?: boolean;
  /**
   * Canvas geometry in design units (CSS pixels). Older documents do not have
   * these fields and keep the studio's 1000 × 1333 default, so every saved
   * invitation keeps the exact page it was designed on.
   */
  width?: number;
  height?: number;
  /** Safe margin from each edge, in design units. Used by guides and print. */
  margin?: number;
  /** Bleed beyond the trim edge, in design units. */
  bleed?: number;
  /** Paper surface printed under the artwork. */
  texture?: PageTextureId;
  /**
   * The shape the sheet is trimmed in. Absent on every page saved before cut
   * edges existed, which means a plain straight trim — never a hidden change.
   */
  edge?: PageEdgeId;
  /**
   * An optional material finish for the sheet itself (vellum, linen, foil).
   * Absent on every page saved before materials existed.
   */
  material?: LayerMaterial;
}

export type PageTextureId = "none" | "cotton" | "linen" | "fibre";

export const PAGE_TEXTURES: { id: PageTextureId; label: string; note: string }[] = [
  { id: "none", label: "Smooth", note: "No grain, a clean printed surface" },
  { id: "cotton", label: "Cotton", note: "Soft mottled fibre, like cotton stock" },
  { id: "linen", label: "Linen", note: "A fine woven weave" },
  { id: "fibre", label: "Raw fibre", note: "Handmade paper with visible flecks" },
];

/* -------------------------------------------------------------------------- */
/* Cut edges                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The shape the sheet is trimmed in. Every edge except `straight` cuts into
 * the rectangle — paper is never drawn outside its own page box — so artwork
 * sitting close to the trim is what the cut visibly passes through, exactly
 * like a real die-cut or torn sheet.
 */
export type PageEdgeId =
  | "straight"
  | "deckle"
  | "scallop"
  | "wave"
  | "arch"
  | "petal"
  | "notch";

export const PAGE_EDGES: { id: PageEdgeId; label: string; note: string }[] = [
  { id: "straight", label: "Straight", note: "A clean machine-cut trim" },
  { id: "deckle", label: "Deckle", note: "Torn edges of a handmade sheet" },
  { id: "scallop", label: "Scallop", note: "Round die-cut bites along the trim" },
  { id: "wave", label: "Wave", note: "A soft rolling edge" },
  { id: "arch", label: "Arched top", note: "A domed top, like a card window" },
  { id: "petal", label: "Petal", note: "Sides that bow gently inward" },
  { id: "notch", label: "Pinked", note: "Fine teeth, like pinking shears" },
];

export function isPageEdgeId(value: unknown): value is PageEdgeId {
  return PAGE_EDGES.some((edge) => edge.id === value);
}

/** Deterministic noise in [0, 1), so a saved edge never re-rolls on reopen. */
function noise(seed: number): number {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

/**
 * The clip path for a cut edge, in the page's own pixel box, or undefined for
 * a plain rectangle. Pure geometry: the editor, the guest page, the template
 * thumbnails and the PNG/PDF capture all read this one function.
 */
export function pageEdgeClipPath(
  edge: PageEdgeId | undefined,
  width: number,
  height: number,
): string | undefined {
  const id = edge && isPageEdgeId(edge) ? edge : "straight";
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  if (id === "straight" || w < 24 || h < 24) return undefined;

  const short = Math.min(w, h);
  const fmt = (value: number) => Math.round(value * 100) / 100;

  if (id === "arch") {
    const drop = Math.round(h * 0.3);
    return `M0 ${h} L0 ${drop} C ${fmt(w * 0.2)} 0 ${fmt(w * 0.8)} 0 ${w} ${drop} L${w} ${h} Z`;
  }

  // Walk the trim clockwise; `bite` is how far the cut travels into the sheet.
  type Side = { length: number; point: (at: number, bite: number) => [number, number] };
  const sides: Side[] = [
    { length: w, point: (x, d) => [x, d] },
    { length: h, point: (y, d) => [w - d, y] },
    { length: w, point: (x, d) => [w - x, h - d] },
    { length: h, point: (y, d) => [d, h - y] },
  ];

  const points: [number, number][] = [];
  sides.forEach((side, sideIndex) => {
    const steps = Math.max(10, Math.round(side.length / (id === "notch" ? 34 : 26)));
    for (let step = 0; step <= steps; step += 1) {
      // Corners are contributed by the next side's first point, so the trim
      // runs continuously around all four sides.
      if (step === steps) continue;
      const t = step / steps;
      const at = t * side.length;
      let bite = 0;
      const seed = sideIndex * 97 + step * 13;
      if (id === "deckle") {
        bite = short * 0.011 * (0.15 + 0.85 * noise(seed));
      } else if (id === "wave") {
        const cycles = Math.max(2, Math.round(side.length / (short * 0.28)));
        bite = short * 0.016 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2 * cycles));
      } else if (id === "scallop") {
        const bites = Math.max(4, Math.round(side.length / (short * 0.16)));
        const phase = (t * bites) % 1;
        const radius = (side.length / bites) * 0.5;
        bite = radius * Math.sin(phase * Math.PI);
      } else if (id === "petal") {
        bite = short * 0.055 * Math.sin(t * Math.PI);
      } else if (id === "notch") {
        const teeth = Math.max(6, Math.round(side.length / (short * 0.06)));
        const phase = (t * teeth) % 1;
        bite = phase < 0.5 ? short * 0.014 * (phase / 0.5) : short * 0.014 * ((1 - phase) / 0.5);
      }
      points.push(side.point(at, bite));
    }
  });

  const d = points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"}${fmt(x)} ${fmt(y)}`)
    .join(" ");
  return `${d} Z`;
}

export function visiblePages(design: DesignDocument): DesignPage[] {
  // A stationery suite is a production aid: pieces the host has not opened to
  // guests (the envelope, the liner, the RSVP) never reach a public link. An
  // invitation with no suite keeps every page, exactly as it always has.
  const guest = guestVisiblePageIds(design);
  const pool = guest ? design.pages.filter((page) => guest.has(page.id)) : design.pages;
  const shown = pool.filter((page) => !page.hidden);
  if (shown.length > 0) return shown;
  // Never hand a guest a blank run: fall back to the first page that exists.
  const fallback = pool.length > 0 ? pool : design.pages;
  return fallback.slice(0, 1);
}

/* -------------------------------------------------------------------------- */
/* Page geometry                                                              */
/* -------------------------------------------------------------------------- */

export type DesignUnit = "mm" | "cm" | "px" | "in";

export const DESIGN_UNITS: { id: DesignUnit; label: string; note: string }[] = [
  { id: "mm", label: "mm", note: "Millimetres, for print" },
  { id: "cm", label: "cm", note: "Centimetres, for print" },
  { id: "in", label: "in", note: "Inches, for cards and stationery" },
  { id: "px", label: "px", note: "Pixels, for screens and stories" },
];

/** The canvas is measured in CSS pixels: 96 of them to the inch, always. */
export const PX_PER_UNIT: Record<DesignUnit, number> = {
  mm: 96 / 25.4,
  cm: 96 / 2.54,
  in: 96,
  px: 1,
};

/** Physical measurement → canvas units. */
export function toDesignPx(value: number, unit: DesignUnit): number {
  return value * PX_PER_UNIT[unit];
}

/** Canvas units → physical measurement, for the labels shown next to them. */
export function fromDesignPx(value: number, unit: DesignUnit): number {
  return value / PX_PER_UNIT[unit];
}

/**
 * The number shown in a measurement field: whole pixels stay whole, physical
 * units keep two decimals (0.01 mm is well under a canvas pixel, so the value
 * on screen still describes the value in the document).
 */
export function formatDesignValue(valuePx: number, unit: DesignUnit): number {
  if (unit === "px") return Math.round(valuePx);
  return Math.round(fromDesignPx(valuePx, unit) * 100) / 100;
}

/**
 * A typed physical measurement back into canvas units. Rounded to the nearest
 * canvas pixel so typing the value that is displayed can never walk the stored
 * number away from itself over repeated edits.
 */
export function designValueFromInput(value: number, unit: DesignUnit): number {
  if (unit === "px") return Math.round(value);
  return Math.round(toDesignPx(value, unit));
}

/** Physical value → the short label the rulers and status readouts show. */
export function physicalLabel(valueInUnit: number, unit: DesignUnit): string {
  if (unit === "px") return String(Math.round(valueInUnit));
  const rounded =
    unit === "in"
      ? Math.round(valueInUnit * 100) / 100
      : Math.round(valueInUnit * 10) / 10;
  return String(rounded);
}

export interface RulerTick {
  /** Tick position, in canvas units. */
  value: number;
  major: boolean;
  /** Label for major ticks, in the display unit. */
  label: string;
}

/** Minor ruler spacing per display unit, in that unit. */
const RULER_MINOR: Record<DesignUnit, number> = { mm: 10, cm: 1, in: 0.25, px: 50 };

/**
 * Ruler ticks for one edge of the page, measured in canvas units but labelled
 * in the workspace's display unit. Ticks are walked by index, not by repeated
 * addition, so a 96/25.4 conversion can never drift off the page edge.
 */
export function rulerTicksFor(lengthPx: number, unit: DesignUnit): RulerTick[] {
  const minorPx = toDesignPx(RULER_MINOR[unit], unit);
  if (!(minorPx > 0) || !(lengthPx > 0)) return [];
  const count = Math.max(1, Math.floor(lengthPx / minorPx + 1e-6));
  const ticks: RulerTick[] = [];
  for (let index = 0; index <= count; index += 1) {
    const major = index % 2 === 0;
    const value = index * minorPx;
    ticks.push({
      value,
      major,
      label: major ? physicalLabel(fromDesignPx(value, unit), unit) : "",
    });
  }
  return ticks;
}

/** The page's physical trim size, e.g. `105 × 148 mm`. Never the zoomed size. */
export function pageDimensionsLabel(
  page: Pick<DesignPage, "width" | "height"> | null | undefined,
  unit: DesignUnit,
): string {
  const { width, height } = pageSizeOf(page);
  return `${physicalLabel(fromDesignPx(width, unit), unit)} × ${physicalLabel(
    fromDesignPx(height, unit),
    unit,
  )} ${unit}`;
}

export interface PageSize {
  width: number;
  height: number;
}

/** The page's real size, falling back to the classic studio card. */
export function pageSizeOf(page?: Pick<DesignPage, "width" | "height"> | null): PageSize {
  const width = Number(page?.width) > 0 ? Number(page?.width) : DESIGN_WIDTH;
  const height = Number(page?.height) > 0 ? Number(page?.height) : DESIGN_HEIGHT;
  return { width, height };
}

export function pageAspectOf(page?: Pick<DesignPage, "width" | "height"> | null): number {
  const { width, height } = pageSizeOf(page);
  return width / height;
}

/** A page background may be a flat colour or a saved CSS wash. */
export function isGradientBackground(value: string): boolean {
  return /gradient\(/i.test(value);
}

/** Backgrounds the renderer can draw: a flat colour, or a wash as its image. */
export function pageBackgroundStyle(
  background: string | undefined,
): CSSProperties {
  const value = background || "#fbfaf7";
  return isGradientBackground(value)
    ? { backgroundImage: value, backgroundColor: "#ffffff" }
    : { backgroundColor: value };
}

export interface SizePreset {
  id: string;
  label: string;
  note: string;
  unit: DesignUnit;
  width: number;
  height: number;
}

/** The formats a host actually reaches for, in the unit they are sold in. */
export const SIZE_PRESETS: SizePreset[] = [
  { id: "studio", label: "Studio portrait", note: "The classic LAMSA card", unit: "px", width: 1000, height: 1333.33 },
  { id: "5x7", label: "5 × 7 in", note: "The standard mailed invitation", unit: "in", width: 5, height: 7 },
  { id: "7x5", label: "7 × 5 in", note: "Landscape card, portrait envelope", unit: "in", width: 7, height: 5 },
  { id: "a5", label: "A5", note: "148 × 210 mm", unit: "mm", width: 148, height: 210 },
  { id: "a6", label: "A6", note: "105 × 148 mm, RSVP size", unit: "mm", width: 105, height: 148 },
  { id: "square", label: "Square", note: "150 × 150 mm favour card", unit: "mm", width: 150, height: 150 },
  { id: "story", label: "Mobile story", note: "1080 × 1920 px for screens", unit: "px", width: 1080, height: 1920 },
  { id: "custom", label: "Custom", note: "Your own width and height", unit: "px", width: 1000, height: 1333.33 },
];

export function sizePresetById(id: string): SizePreset {
  return SIZE_PRESETS.find((preset) => preset.id === id) ?? SIZE_PRESETS[0];
}

/**
 * Resizes a page. The host always chooses what happens to the artwork, because
 * silently stretching a finished invitation is how designs get ruined:
 *
 * - `scale`    — artwork is stretched to the new page exactly (may distort).
 * - `fit`      — artwork keeps its proportions and is centred to fit.
 * - `preserve` — every number is left alone; only the page edge moves.
 */
export type PageResizeMode = "scale" | "fit" | "preserve";

export const PAGE_RESIZE_MODES: {
  id: PageResizeMode;
  label: string;
  note: string;
}[] = [
  { id: "fit", label: "Fit to page", note: "Keeps proportions, scales and centres everything" },
  { id: "scale", label: "Stretch to page", note: "Fills the new size exactly, may distort" },
  { id: "preserve", label: "Keep artwork size", note: "Only the page changes; layers stay as they are" },
];

function scaleElement(
  element: DesignElement,
  sx: number,
  sy: number,
  uniform: number,
): DesignElement {
  const next: DesignElement = {
    ...element,
    x: element.x * sx,
    y: element.y * sy,
    w: element.w * sx,
    h: element.h * sy,
  };
  if (element.fontSize != null) next.fontSize = Math.max(4, element.fontSize * uniform);
  if (element.strokeWidth != null) next.strokeWidth = Math.max(0.1, element.strokeWidth * uniform);
  if (element.radius != null) next.radius = element.radius * uniform;
  if (element.textBorderWidth != null) next.textBorderWidth = element.textBorderWidth * uniform;
  if (element.textPadding != null) next.textPadding = element.textPadding * uniform;
  return next;
}

export function resizePage(
  page: DesignPage,
  size: PageSize,
  mode: PageResizeMode,
): DesignPage {
  const current = pageSizeOf(page);
  const width = Math.max(40, Math.round(size.width * 100) / 100);
  const height = Math.max(40, Math.round(size.height * 100) / 100);
  if (width === current.width && height === current.height) {
    return { ...page, width, height };
  }
  if (mode === "preserve") {
    return { ...page, width, height };
  }
  const sx = width / current.width;
  const sy = height / current.height;
  if (mode === "scale") {
    return {
      ...page,
      width,
      height,
      elements: page.elements.map((element) => scaleElement(element, sx, sy, (sx + sy) / 2)),
    };
  }
  const uniform = Math.min(sx, sy);
  const offsetX = (width - current.width * uniform) / 2;
  const offsetY = (height - current.height * uniform) / 2;
  return {
    ...page,
    width,
    height,
    elements: page.elements.map((element) => {
      const scaled = scaleElement(element, uniform, uniform, uniform);
      return { ...scaled, x: scaled.x + offsetX, y: scaled.y + offsetY };
    }),
  };
}

/**
 * The scale new layers should be created at, so default type on a 397 px A6
 * card is the same proportion as it is on the classic 1000 px canvas.
 */
export function canvasScaleFor(page?: Pick<DesignPage, "width" | "height"> | null): number {
  return pageSizeOf(page).width / DESIGN_WIDTH;
}

/**
 * The scale a layer authored on the classic 1000 × 1333 card needs to sit on
 * the current page. The smaller of the two axis ratios wins, so a box keeps
 * its proportions whatever shape the card is; on the classic card it is 1.
  const { width, height } = pageSizeOf(page);
  const scale = pageFitScale(page);
  const w = Math.max(1, box.w * scale);
  const h = Math.max(1, box.h * scale);
  const clamp = (value: number, span: number) =>
    Math.round(Math.min(Math.max(value, 0), Math.max(0, span)) * 100) / 100;
  return {
    ...box,
    x: clamp((box.x / DESIGN_WIDTH) * width, width - w),
    y: clamp((box.y / DESIGN_HEIGHT) * height, height - h),
    w: Math.round(w * 100) / 100,
    h: Math.round(h * 100) / 100,
  };
