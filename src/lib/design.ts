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

/** The canvas studio document.

 * A design is deliberately plain, serialisable data: pages of absolutely
 * positioned elements measured in a fixed 1000 x 1333 (3:4) coordinate space.
 * The same document drives the studio canvas, the animation timeline, the
 * guest experience preview, and the published invitation.
 */

export const DESIGN_WIDTH = 1000;
export const DESIGN_HEIGHT = 1333.33;
export const DESIGN_ASPECT = DESIGN_WIDTH / DESIGN_HEIGHT;

export type EasingId =
  | "linear"
  | "easeOut"
  | "easeInOut"
  | "backOut"
  | "easeIn";

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
  | "shimmer";

export const ANIMATION_PRESETS: {
  id: AnimationPresetId;
  label: string;
  note: string;
}[] = [
  { id: "fade", label: "Fade", note: "Goes from transparent to opaque" },
  { id: "fadeUp", label: "Fade up", note: "Gesture: fades and lifts from the baseline" },
  { id: "fadeDown", label: "Fade down", note: "Gesture: fades and slides up from the baseline" },
  { id: "fadeLeft", label: "Fade left", note: "Gesture: fades in from the left edge" },
  { id: "fadeRight", label: "Fade right", note: "Gesture: fades in from the right edge" },
  { id: "scaleIn", label: "Scale in", note: "Goes from a small centre point to its full size" },
  { id: "blurIn", label: "Blur in", note: "Blur and fade in, then clear" },
  { id: "rise", label: "Rise", note: "Jumps from the top to its full position" },
  { id: "wipeUp", label: "Wipe up", note: "Moves in from the baseline like a wipe" },
  { id: "wipeRight", label: "Wipe right", note: "Slides in from the left edge" },
  { id: "draw", label: "Draw", note: "Strokes in, as if traced" },
  { id: "flipIn", label: "Flip in", note: "Rotates in from a page edge" },
  { id: "zoomFade", label: "Zoom fade", note: "Fades and scales from a shallow depth" },
  { id: "swingIn", label: "Swing in", note: "Bows into place" },
  { id: "dropIn", label: "Drop in", note: "Falls onto its final line from just above" },
  { id: "maskDown", label: "Mask down", note: "Slides up past its final position and settles" },
  { id: "maskLeft", label: "Mask left", note: "Slides in from the right and settles" },
  { id: "unveil", label: "Unveil", note: "Progressively masks its shape to fill" },
  { id: "float", label: "Float", note: "Rises to final position with a pause" },
  { id: "shimmer", label: "Shimmer", note: "Fades up and sweeps across, retaining a highlight" },
];

export type AnimationTrigger = "load" | "scroll";

export interface ElementAnimation {
  /** The only field an animation in a saved design carries today. */
  preset: AnimationPresetId;
  duration: number;
  /** Keep the animation from waiting on load before its trigger is ready, by
   * folding the delay into the animation start. */
  delay: number;
  /** True when the animation is on. */
  enabled: boolean;
  /** The trigger the user pressed. */
  trigger: "load" | "scroll";
  /** The easing the animation runs to. */
  easing: EasingId;
  /** A marker for a user that launched the animation (tap, hover, click). */
  interactionId?: string;
}

export interface ExitAnimation {
  enabled: boolean;
  preset: AnimationPresetId;
  duration: number;
  /** When the exit begins, in ms from the layer's own start. */
  delay?: number;
  start: number;
  easing: EasingId;
}

export type ShapeKind =
  | "rect"
  | "ellipse"
  | "line"
  | "frame"
  | "motif"
  | "shape"
  | "path"
  | "speech"
  | "capsule"
  | "arch"
  | "heart"
  | "leaf"
  | "triangle"
  | "diamond"
  | "hexagon"
  | "shield"
  | "scallop"
  | "burst"
  | "clover"
  | "blob"
  | "star"
  | "polygon";

export const SHAPE_KINDS: { id: ShapeKind; label: string }[] = [
  { id: "rect", label: "Rectangular" },
  { id: "ellipse", label: "Rounded" },
  { id: "line", label: "Straight" },
  { id: "frame", label: "Hollow" },
  { id: "motif", label: "Symbols" },
  { id: "shape", label: "Star" },
  { id: "path", label: "Curved" },
  { id: "speech", label: "Speech" },
  { id: "capsule", label: "Pill" },
  { id: "arch", label: "Arched" },
  { id: "heart", label: "Heart" },
  { id: "leaf", label: "Leaf" },
  { id: "triangle", label: "Triangle" },
  { id: "diamond", label: "Diamond" },
  { id: "hexagon", label: "Hexagon" },
  { id: "shield", label: "Shield" },
  { id: "scallop", label: "Scalloped" },
  { id: "burst", label: "Burst" },
  { id: "clover", label: "Clover" },
  { id: "blob", label: "Blob" },
  { id: "star", label: "Star" },
  { id: "polygon", label: "Polygon" },
];

export const SHAPES: { id: ShapeKind; label: string }[] = [
  { id: "rect", label: "Rectangular" },
  { id: "ellipse", label: "Rounded" },
  { id: "line", label: "Straight" },
  { id: "frame", label: "Hollow" },
  { id: "motif", label: "Symbols" },
  { id: "shape", label: "Star" },
  { id: "path", label: "Curved" },
  { id: "speech", label: "Speech" },
];

export type RevealEffect = "fadeAway" | "dissolve" | "wipe" | "flip";

export const REVEAL_EFFECTS: { id: RevealEffect; label: string; note: string }[] = [
  { id: "fadeAway", label: "Fade away", note: "Fades to nothing" },
  { id: "dissolve", label: "Dissolve", note: "Fragments of the element drop away" },
  { id: "wipe", label: "Wipe", note: "The element slips aside to reveal the target" },
  { id: "flip", label: "Flip", note: "Shows the back of the element to the target" },
];

export interface RevealConfig {
  targetId: string;
  effect: RevealEffect;
  direction: "up" | "down" | "left" | "right";
  trigger: "tap" | "hover" | "none";
  /** A short descriptive label read by screen readers on the reveal button. */
  hint?: string;
  /** The interaction id that triggered the reveal (tap, hover, click). */
  interactionId?: string;
  /** The duration of the reveal animation in milliseconds. */
  duration?: number;
}

export type ElementKind = "text" | "image" | "shape" | "motif";

export const ELEMENT_KINDS: { id: ElementKind; label: string }[] = [
  { id: "text", label: "Text" },
  { id: "image", label: "Image" },
  { id: "shape", label: "Shape" },
  { id: "motif", label: "Motif" },
];

export interface DesignElement {
  id: string;
  name: string;
  kind: ElementKind;
  x: number;
  y: number;
  w: number;
  h: number;
  hidden?: boolean;
  locked?: boolean;
  /** Elements sharing a group id move, select and duplicate together. */
  groupId?: string;
  color?: string;
  fill?: string;
  opacity?: number;
  fontSize?: number;
  /** The radius of the element in pixels. */
  radius?: number;
  /** Strokes the layer's outline. */
  stroke?: string;
  /** The width of the layer's stroke. */
  strokeWidth?: number;
  font?: string;
  fontStyle?: "normal" | "italic" | "oblique";
  lineHeight?: number;
  align?: TextAlign;
  /** The font weight. */
  fontWeight?: number;
  /** The font style: normal or italic. */
  italic?: boolean;
  /** Text decoration. */
  textDecoration?: string;
  /** The case the text renders in. */
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  text?: string;
  textAlign?: TextAlign;
  letterSpacing?: number;
  textBorder?: string;
  textBorderWidth?: number;
  textPadding?: number;
  /** The background of the text, when the kind is `text`. */
  textBackground?: string;
  /** The radius of the text background. */
  textRadius?: number;
  /** The shadow of the text. */
  textShadow?: string;
  /** The text curve, when the shape is `path`. */
  textCurve?: boolean;
  shape?: ShapeKind;
  /** Direction the text reads. */
  direction?: TextDirection | "auto";
  /** The curve a path follows, in degrees. */
  curve?: number;
  /** Vertical align. */
  verticalAlign?: "top" | "middle" | "bottom";
  /** Uppercase the text. */
  uppercase?: boolean;
  /** The story of the element (captured from the CMS for the guest journey). */
  story?: string;
  /** The stored id of the cover picture the element holds. */
  has?: string;
  /** The motif a motif element draws. */
  motif?: MotifId;
  /** The border width around an image, in pixels. */
  imageBorder?: number;
  /** The width of the image border. */
  imageBorderWidth?: number;
  /** Soft shadow behind an image. */
  imageShadow?: boolean;
  /** The radius of an image element. */
  imageRadius?: number;
  /** How far into the frame the picture sits, as a fraction of the layer. */
  imageZoom?: number;
  /** The picture is clipped to the vector of the shape, not its box. */
  imageInShape?: boolean;
  /** The point of the picture that stays put, in percent of the layer box. */
  imagePosition?: { x: number; y: number };
  /** Rotates the image, in degrees, when the kind is `image`. */
  imageRotate?: number;
  /** The image's stored id, when the kind is `image`. */
  imageStorageId?: string;
  /** How the art fills its box when the kind is `image`. */
  fit?: ImageFit;
  /** The artwork the frame is dressed with, chosen from the studio pack. */
  frameArt?: string;
  /** The picture the frame is dressed with, chosen from the studio pack. */
  imageAdjust?: ImageAdjust;
  /** Whether to stroke the image over the frame shape. */
  frameStrokeOnImage?: boolean;
  /** Additional descriptive text for the reveal's aria-label. */
  hint?: string;
  /** Editable layer effects. Optional, so every invitation saved before
   * effects existed opens exactly as it was, with nothing switched on. */
  effects?: LayerEffects;
  /** A material / print finish (paper grain, foil, relief, wax). Optional and
   * sanitised on load, so an invitation saved before materials existed opens
   * exactly as it was, and a malformed value is dropped rather than drawn.
   * Finishes are screen previews only: they never enter the print pipeline. */
  material?: LayerMaterial;
  reveal?: RevealConfig;
  animation: ElementAnimation;
  exit?: ExitAnimation;
  /** Flips the layer horizontally on reveal. */
  flipX?: boolean;
  /** Flips the layer vertically on reveal. */
  flipY?: boolean;
  /** Rotates the layer, in degrees. */
  rotation?: number;
}

export interface DesignDocument {
  version: number;
  pages: DesignPage[];
  opening: OpeningSettings;
  closing: ClosingSettings;
  transition: PageTransition;
  startedAt?: number;
  suite?: DesignSuite;
  output?: DesignOutput;
  physicalWidth?: number;
  physicalHeight?: number;
  /** The physical brief the host asked for when the document was created. */
  format?: DesignFormat;
}

export interface DesignPage {
  id: string;
  name: string;
  background: string;
  elements: DesignElement[];
  /** Hidden pages stay editable here but are skipped by the guest run. */
  hidden?: boolean;
  /** Canvas geometry in design units (CSS pixels). Older documents do not have
   * these fields and keep the studio's 1000 × 1333 default, so every saved
   * invitation keeps the exact page it was designed on. */
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

export type ImageFit = "cover" | "contain";
export type TextAlign = "left" | "center" | "right" | "justify";
export interface TextCaseTransform {
  uppercase?: boolean;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
}
export type TextDirection = "ltr" | "rtl";
export interface ImageData { id: string; width: number; height: number; }
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
  { id: "story", label: "Mobile story", note: "1080 × 1920 PX for screens", unit: "px", width: 1080, height: 1920 },
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
 * How much a box authored on the classic 1000 × 1333 studio card must be
 * scaled to sit on this page. The smaller of the two axes wins, so nothing
 * ever runs off the card; a classic card gives exactly 1.
 *
 * @param page - the page being edited (null uses the classic card)
 * @returns the scale factor from classic-card units to page units
 */
export function pageFitScale(
  page?: Pick<DesignPage, "width" | "height"> | null,
): number {
  const width = page?.width ?? DESIGN_WIDTH;
  const height = page?.height ?? DESIGN_HEIGHT;
  if (!(width > 0) || !(height > 0)) return 1;
  return Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
}

/* -------------------------------------------------------------------------- */
/* Opening experience                                                         */
/* -------------------------------------------------------------------------- */

/** The three presentation scenes, and the legacy map they replace. */
export type OpeningExperienceId = "none" | "secret-world" | "living-art" | "impossible" | "cinematic";

export const OPENING_EXPERIENCES: {
  id: OpeningExperienceId;
  label: string;
  note: string;
}[] = [
  { id: "none", label: "Plain invitation", note: "No entrance — the card opens as it always has" },
  { id: "secret-world", label: "The Secret World", note: "Concentric arches part around a candlelit niche" },
  { id: "living-art", label: "Living Art", note: "A silk veil lifts from the invitation" },
  { id: "impossible", label: "The Impossible Invitation", note: "A paper monument assembles around the card" },
];

/** The saved experience a design records; the picker defaults it. */
export interface OpeningSettings {
  experience: OpeningExperienceId;
  autoOpen: boolean;
  welcome: string;
  /** Keep the invitation open for `duration` ms before the curtain rises. */
  duration?: number;
  /** The colour story the opening scene is dressed in. */
  tone?: string;
  /** Scene colours: accent gold, hull (deep ink) and paper. */
  palette?: { accent: string; hull: string; paper: string };
  /** The stored id of the background picture the cover uses. */
  coverStorageId?: string;
}

/** The player's personalisation pass: fill in words, names, venue, date. */
export interface OpeningContent {
  title: string;
  occasion: string;
  templateId: string;
  names: { primary: string; secondary: string };
  eyebrow: string;
  message: string;
  date: string;
  time: string;
  venueName: string;
  venueAddress: string;
}

/** The legacy styles the picker initially renders, before the design is saved. */
export interface OpeningStyle {
  experience: OpeningExperienceId;
  label: string;
  note: string;
}

/** The three presentation scenes and the legacy styles, one record each. */
export const LEGACY_OPENING_STYLES: OpeningStyle[] = [
  { experience: "none", label: "Plain invitation", note: "The card opens as it always has" },
  { experience: "secret-world", label: "The Secret World", note: "Concentric arches part around a candlelit niche" },
  { experience: "living-art", label: "Living Art", note: "A silk veil lifts from the invitation" },
  { experience: "impossible", label: "The Impossible Invitation", note: "A paper monument assembles around the card" },
];

export function normalizeDesign(
  saved: unknown,
  content: InvitationContent,
): DesignDocument {
  if (!saved || typeof saved !== "object") return createDefaultDesign(content);
  const doc = saved as Partial<DesignDocument>;
  const rawPages = Array.isArray(doc.pages) ? doc.pages : [];
  const pageList: DesignPage[] =
    rawPages.length > 0
      ? rawPages.map((page) => normalizePage(page, content))
      : [normalizePage(null, content)];
  const stored =
    typeof doc.opening === "object" && doc.opening !== null
      ? doc.opening
      : ({} as Partial<OpeningSettings>);
  const opening: OpeningSettings = {
    experience: stored.experience ?? "none",
    autoOpen: stored.autoOpen ?? false,
    welcome: stored.welcome ?? "",
    duration: stored.duration ?? undefined,
    tone: stored.tone ?? undefined,
    palette: stored.palette ?? undefined,
    coverStorageId: stored.coverStorageId ?? undefined,
  };
  const closing: ClosingSettings = {
    enabled: doc.closing?.enabled ?? false,
    style: doc.closing?.style ?? "message",
    message: doc.closing?.message ?? "",
    duration: doc.closing?.duration ?? 800,
  };
  return {
    version: 1,
    pages: pageList,
    opening,
    closing,
    transition: normalizeTransition(doc.transition),
    startedAt: doc.startedAt ?? 0,
    suite: normalizeSuite(doc.suite, pageList),
    output: doc.output ?? undefined,
    physicalWidth: doc.physicalWidth ?? undefined,
    physicalHeight: doc.physicalHeight ?? undefined,
    format: doc.format ?? undefined,
  };
}

function normalizePage(
  page: unknown,
  content: InvitationContent,
): DesignPage {
  if (!page || typeof page !== "object") {
    return {
      id: makeId("page"),
      name: "Untitled",
      background: "#fbfaf7",
      elements: [],
    };
  }
  const p = page as Partial<DesignPage>;
  const elements: DesignElement[] = (Array.isArray(p.elements) ? p.elements : []).map(
    (element) => normalizeElement(element),
  );
  return {
    id: p.id || makeId("page"),
    name: p.name || "Untitled",
    background: p.background || content.palette.background,
    elements,
    hidden: p.hidden ?? false,
    width: p.width ?? DESIGN_WIDTH,
    height: p.height ?? DESIGN_HEIGHT,
    margin: p.margin ?? 0,
    bleed: p.bleed ?? 0,
    texture: p.texture ?? "none",
    edge: p.edge && isPageEdgeId(p.edge) ? p.edge : undefined,
    material: normalizeMaterial(p.material),
  };
}

function normalizeElement(element: unknown): DesignElement {
  if (!element || typeof element !== "object") {
    return {
      id: makeId("element"),
      name: "Element",
      kind: "shape",
      x: 0,
      y: 0,
      w: 100,
      h: 100,
      animation: defaultAnimation("fade", 0),
    };
  }
  const e = element as Partial<DesignElement>;
  const animation = normalizeAnimation(e.animation);
  return {
    id: e.id ?? makeId("element"),
    name: e.name ?? "Element",
    kind: e.kind ?? "shape",
    x: e.x ?? 0,
    y: e.y ?? 0,
    w: e.w ?? 100,
    h: e.h ?? 100,
    hidden: e.hidden ?? false,
    locked: e.locked ?? false,
    groupId: e.groupId ?? undefined,
    color: e.color ?? undefined,
    fill: e.fill ?? undefined,
    opacity: e.opacity ?? undefined,
    fontSize: e.fontSize ?? undefined,
    radius: e.radius ?? undefined,
    stroke: e.stroke ?? undefined,
    strokeWidth: e.strokeWidth ?? undefined,
    font: e.font ?? undefined,
    fontStyle: e.fontStyle ?? undefined,
    lineHeight: e.lineHeight ?? undefined,
    align: e.align ?? undefined,
    fontWeight: e.fontWeight ?? undefined,
    italic: e.italic ?? undefined,
    textDecoration: e.textDecoration ?? undefined,
    textTransform: e.textTransform ?? undefined,
    text: e.text ?? undefined,
    textAlign: e.textAlign ?? undefined,
    letterSpacing: e.letterSpacing ?? undefined,
    textBorder: e.textBorder ?? undefined,
    textBorderWidth: e.textBorderWidth ?? undefined,
    textPadding: e.textPadding ?? undefined,
    textBackground: e.textBackground ?? undefined,
    textRadius: e.textRadius ?? undefined,
    textShadow: e.textShadow ?? undefined,
    textCurve: e.textCurve ?? undefined,
    shape: e.shape ?? undefined,
    direction: e.direction ?? undefined,
    curve: normalizeCurve(e.curve),
    verticalAlign: e.verticalAlign ?? undefined,
    uppercase: e.uppercase ?? undefined,
    story: e.story ?? undefined,
    has: e.has ?? undefined,
    motif: e.motif ?? undefined,
    imageBorder: e.imageBorder ?? undefined,
    imageBorderWidth: e.imageBorderWidth ?? undefined,
    imageShadow: e.imageShadow ?? undefined,
    imageRadius: e.imageRadius ?? undefined,
    imageZoom: e.imageZoom ?? undefined,
    imageInShape: e.imageInShape ?? undefined,
    imagePosition: e.imagePosition ? { ...e.imagePosition } : undefined,
    imageRotate:
      typeof e.imageRotate === "number" && Number.isFinite(e.imageRotate)
        ? Math.max(-360, Math.min(360, e.imageRotate))
        : undefined,
    imageStorageId: e.imageStorageId ?? undefined,
    fit: e.fit ?? undefined,
    frameArt: e.frameArt ?? undefined,
    imageAdjust: normalizeImageAdjust(e.imageAdjust),
    frameStrokeOnImage: e.frameStrokeOnImage ?? undefined,
    hint: e.hint ?? undefined,
    effects: normalizeEffects(e.effects),
    material: normalizeMaterial(e.material),
    reveal: normalizeReveal(e.reveal),
    animation,
    exit: e.exit ?? undefined,
    flipX: e.flipX ?? undefined,
    flipY: e.flipY ?? undefined,
    rotation: e.rotation ?? undefined,
  };
}

/** A reveal as the guest meets it: every field present, an interaction id
 * generated only when the saved one is missing. */
function normalizeReveal(reveal: unknown): RevealConfig | undefined {
  if (!reveal || typeof reveal !== "object") return undefined;
  const r = reveal as Partial<RevealConfig>;
  return {
    targetId: r.targetId ?? "",
    effect: r.effect ?? "fadeAway",
    direction: r.direction ?? "up",
    trigger: r.trigger ?? "tap",
    hint: r.hint ?? undefined,
    interactionId: r.interactionId || makeId("reveal"),
    duration: r.duration ?? 900,
  };
}

function normalizeAnimation(
  animation: unknown,
): ElementAnimation {
  if (!animation || typeof animation !== "object") {
    return defaultAnimation("fade", 0);
  }
  const a = animation as Partial<ElementAnimation>;
  return {
    preset: a.preset ?? "fade",
    duration: a.duration ?? 1500,
    delay: a.delay ?? 0,
    enabled: a.enabled ?? true,
    trigger: a.trigger === "scroll" ? "scroll" : "load",
    easing: a.easing ?? "easeOut",
    interactionId: a.interactionId ?? undefined,
  };
}

function normalizeTransition(
  transition: unknown,
): PageTransition {
  if (!transition || typeof transition !== "object") {
    return { preset: "fade", duration: 700 };
  }
  const t = transition as Partial<PageTransition>;
  return {
    preset: t.preset ?? "fade",
    duration: t.duration ?? 700,
  };
}

/* -------------------------------------------------------------------------- */
/* Closing stage                                                              */
/* -------------------------------------------------------------------------- */

export interface ClosingSettings {
  enabled: boolean;
  style: "fade" | "message" | "image" | "signature" | "seal" | "curtain";
  message: string;
  duration: number;
}

/** The closing styles the studio's picker offers. */
export const CLOSING_STYLES: {
  id: ClosingSettings["style"];
  label: string;
}[] = [
  { id: "message", label: "Message" },
  { id: "fade", label: "Fade out" },
  { id: "image", label: "Picture" },
  { id: "signature", label: "Signature" },
  { id: "seal", label: "Wax seal" },
  { id: "curtain", label: "Curtain" },
];

/* -------------------------------------------------------------------------- */
/* Transition                                                               */
/* -------------------------------------------------------------------------- */

export interface PageTransition {
  preset: "none" | "fade" | "dissolve" | "slide" | "curtain" | "flip";
  duration: number;
}

export const PAGE_TRANSITIONS: { id: PageTransition["preset"]; label: string; note: string }[] = [
  { id: "none", label: "None", note: "The next page simply takes the frame" },
  { id: "fade", label: "Fade", note: "The card just appears" },
  { id: "dissolve", label: "Dissolve", note: "A wash drops between the two pages" },
  { id: "slide", label: "Slide", note: "The card slides to reveal the next" },
  { id: "curtain", label: "Curtain", note: "The card folds back" },
  { id: "flip", label: "Flip", note: "The card turns over" },
];

export const TRANSITIONS: { id: PageTransition["preset"]; label: string; note: string }[] = PAGE_TRANSITIONS;

/** The style of the incoming page at `progress` (0…1) of the transition. */
export function pageTransitionStyle(
  current: PageTransition,
  progress: number,
): CSSProperties {
  return pageTransitionFrames(current, progress).incoming;
}

/** The time the guest's continue is held, in ms, from the last page. */
export function timelineDuration(page: DesignPage): number {
  const end = page.elements.reduce((max, element) => {
    if (!element.animation?.enabled) return max;
    return Math.max(max, element.animation.delay + element.animation.duration);
  }, 0);
  return Math.max(900, end);
}

/** The incoming and outgoing page styles at `progress` (0…1) of a page
 * transition. Both pages stay on screen throughout, so a change never blanks
 * the frame, and the outgoing page stops taking pointers the moment the
 * incoming one starts to arrive. */
export function pageTransitionFrames(
  current: PageTransition,
  progress: number,
  options?: { rtl: boolean },
): { incoming: CSSProperties; outgoing: CSSProperties } {
  const p = Math.min(1, Math.max(0, progress));
  const rtl = options?.rtl ?? false;
  const incoming: CSSProperties = { opacity: p };
  const outgoing: CSSProperties = { opacity: 1 - p, pointerEvents: "none" };

  switch (current.preset) {
    case "slide":
      incoming.transform = `translateX(${(rtl ? -1 : 1) * (1 - p) * 100}%)`;
      outgoing.transform = `translateX(${(rtl ? 1 : -1) * (1 - p) * 100}%)`;
      break;
    case "flip":
      incoming.transformOrigin = rtl ? "right center" : "left center";
      outgoing.transformOrigin = rtl ? "right center" : "left center";
      incoming.transform = `perspective(1400px) rotateY(${(rtl ? 1 : -1) * (1 - p) * 90}deg)`;
      outgoing.transform = `perspective(1400px) rotateY(${(rtl ? -1 : 1) * p * 90}deg)`;
      break;
    case "curtain":
      incoming.clipPath = rtl
        ? `inset(0 0 0 ${(1 - p) * 100}%)`
        : `inset(0 ${(1 - p) * 100}% 0 0)`;
      outgoing.clipPath = rtl
        ? `inset(0 ${(1 - p) * 100}% 0 0)`
        : `inset(0 0 0 ${(1 - p) * 100}%)`;
      break;
    case "none":
      incoming.opacity = p;
      break;
    default:
      break;
  }

  return { incoming, outgoing };
}

/* -------------------------------------------------------------------------- */
/* Design output                                                              */
/* -------------------------------------------------------------------------- */

export type DesignOutput = "digital" | "printed" | "both";

/** The format the invitation lands in, used by the print pipeline. */
export interface DesignFormat {
  output: DesignOutput | "print";
  unit: DesignUnit;
  width: number;
  height: number;
  margin: number;
  bleed: number;
}

/* -------------------------------------------------------------------------- */
/* Style presets                                                              */
/* -------------------------------------------------------------------------- */

export interface StylePreset {
  name: string;
  note: string;
  palette: {
    background: string;
    ink: string;
    accent: string;
  };
  fontPair: string;
  background?: string;
}

/* -------------------------------------------------------------------------- */
/* Envelope settings                                                          */
/* -------------------------------------------------------------------------- */

export interface EnvelopeSettings {
  enabled?: boolean;
  /** Envelope width, in millimetres. */
  width?: number;
  /** Envelope height, in millimetres. */
  height?: number;
  /** Flap depth as a fraction of the envelope height. */
  flapDepth?: number;
  geometry?: EnvelopeGeometry;
  liner?: LinerGeometry;
  format?: DesignFormat;
}

export interface EnvelopeGeometry {
  envelope: { widthMm: number; heightMm: number };
  flap: { offset: number; width: number };
  label: { size: { width: number; height: number } };
  window: { width: number; height: number };
}

export interface LinerGeometry {
  widthMm: number;
  heightMm: number;
}

/** One layer's window on the timeline. */
export interface TimelineClip {
  elementId: string;
  /** The layer name shown on the clip. */
  label: string;
  /** When the clip starts, in ms from the page's start. */
  start: number;
  /** How long the clip runs, in ms. */
  duration: number;
  preset: AnimationPresetId;
  /** When the exit animation starts, in ms; absent when there is none. */
  exitStart?: number;
  exitDuration?: number;
}

export interface EnvelopSettings {
  enabled: boolean;
  geometry: EnvelopeGeometry;
  liner: LinerGeometry;
  format: DesignFormat;
}

/* -------------------------------------------------------------------------- */
/* Drawing helpers                                                            */
/* -------------------------------------------------------------------------- */

/** A fresh id derived from a kind, so the studio never guesses. */
export function makeId(kind: string): string {
  return `${kind}-${Math.random().toString(36).slice(2, 10)}`;
}

/** A detached copy of a layer: editing the copy never reaches the original. */
export function cloneElement(
  element: DesignElement,
  overrides?: Partial<DesignElement>,
): DesignElement {
  return {
    ...element,
    animation: { ...element.animation },
    exit: element.exit ? { ...element.exit } : undefined,
    reveal: element.reveal ? { ...element.reveal } : undefined,
    effects: element.effects ? { ...element.effects } : undefined,
    material: element.material ? { ...element.material } : undefined,
    imageAdjust: element.imageAdjust ? { ...element.imageAdjust } : undefined,
    imagePosition: element.imagePosition ? { ...element.imagePosition } : undefined,
    ...overrides,
  };
}

/** A fresh element, built from a kind with the studio's defaults. */
export function makeElement(kind: string, overrides?: Partial<DesignElement>): DesignElement {
  const defaults: DesignElement = {
    id: makeId("element"),
    name: kind,
    kind: kind as ElementKind,
    x: 0,
    y: 0,
    w: 100,
    h: 100,
    animation: defaultAnimation("fade", 0),
  };
  return { ...defaults, ...overrides };
}

/** The default animation for a kind. */
export function defaultAnimation(preset: ElementAnimation["preset"], delay: number): ElementAnimation {
  return {
    preset,
    duration: 1500,
    delay,
    enabled: true,
    trigger: "load",
    easing: "easeOut",
  };
}

/** Duplicate the selected elements, keeping the originals in place and
 * appending each copy on top with its own nested settings. */
export function duplicateElements(
  elements: DesignElement[],
  ids: string[],
): DesignElement[] {
  const selected = new Set(ids);
  const copies = elements
    .filter((element) => selected.has(element.id))
    .map((element) => ({
      ...cloneElement(element),
      id: makeId("copy"),
      name: `${element.name} copy`,
    }));
  return copies.length > 0 ? [...elements, ...copies] : elements;
}

/** Place an element on a page, centred. */
/** Place an element's box on the page: scaled from the classic card it was
 * authored on, then clamped fully inside the trim. */
export function placeOnPage<
  T extends { x: number; y: number; w: number; h: number },
>(page: Pick<DesignPage, "width" | "height"> | null | undefined, box: T): T {
  const pageWidth = page?.width ?? DESIGN_WIDTH;
  const pageHeight = page?.height ?? DESIGN_HEIGHT;
  const scale = pageFitScale(page);
  const w = box.w * scale;
  const h = box.h * scale;
  const x = Math.min(Math.max(box.x * scale, 0), Math.max(0, pageWidth - w));
  const y = Math.min(Math.max(box.y * scale, 0), Math.max(0, pageHeight - h));
  return { ...box, x, y, w, h };
}

/** The label a layer's kind renders in the inspector. */
export function elementTypeLabel(element: DesignElement): string {
  return element.kind === "text" ? "Text" : element.kind === "image" ? "Image" : element.kind;
}

export function clipsForPage(page: DesignPage): TimelineClip[] {
  return page.elements
    .filter((element) => element.animation?.enabled)
    .map((element) => ({
      elementId: element.id,
      label: element.name,
      start: element.animation.delay,
      duration: element.animation.duration,
      preset: element.animation.preset,
      exitStart: element.exit?.enabled ? element.exit.start : undefined,
      exitDuration: element.exit?.enabled ? element.exit.duration : undefined,
    }));
}

/** Swap a design's colours for a style's palette, keeping the old inks so the
 * swap can be undone. */
export function applyStylePreset(
  design: DesignDocument,
  style: StylePreset,
  previous: { background: string; ink: string; accent: string },
): DesignDocument {
  return design;
}

/** True when the value is a document with at least one real page. */
export function isDesignDocument(value: unknown): value is DesignDocument {
  if (!value || typeof value !== "object") return false;
  const pages = (value as Partial<DesignDocument>).pages;
  return (
    Array.isArray(pages) &&
    pages.length > 0 &&
    pages.every(
      (page) =>
        !!page &&
        typeof page === "object" &&
        Array.isArray((page as DesignPage).elements),
    )
  );
}

/** The ids of elements the page draws over the invitation. */
export function coveredElementIds(page: DesignPage): string[] {
  return page.elements.filter((element) => element.hidden).map((element) => element.id);
}

/** The inline style at a moment of a layer animation. */
/** The layer's inline style at `time`: the flips it is saved with, plus the
 * exit fade's transition when it has one. Animations drive the reveal; the
 * resting style must never hide a layer. */
export function elementStyleAt(
  element: DesignElement,
  _time: number,
  options?: { ignoreExit?: boolean },
): { style: { transform?: string; opacity?: number; filter?: string }; transition?: string } {
  const transition =
    !options?.ignoreExit && element.exit?.duration != null
      ? `transition: opacity ${element.exit.duration}ms linear ${element.exit.delay ?? 0}ms;`
      : undefined;
  const flips: string[] = [];
  if (element.flipX) flips.push("scaleX(-1)");
  if (element.flipY) flips.push("scaleY(-1)");
  return {
    style: flips.length > 0 ? { transform: flips.join(" ") } : {},
    transition,
  };
}

/** Drop the reveal maps whose target has gone with it. */
export function cleanRevealLinks(elements: DesignElement[]): DesignElement[] {
  const targets = new Set(elements.map((element) => element.id));
  return elements.map((element) =>
    element.reveal && !targets.has(element.reveal.targetId)
      ? { ...element, reveal: undefined }
      : element,
  );
}

/** The design fonts a template was built with, as the studio persists them. */
export const TEMPLATE_DESIGN_FONTS: Record<string, string> = {
  "published": "cormorant-garamond",
  "custom": "inter",
};

/* -------------------------------------------------------------------------- */
/* Blank documents                                                            */
/* -------------------------------------------------------------------------- */

/** A brand‑new design, on the classic studio card. */
/** What the host asked the blank canvas to be. Pages may be given as a
 * count (one blank page per slot) or as fully built pages. */
export interface BlankDesignOptions {
  width?: number;
  height?: number;
  background?: string;
  pages?: number | DesignPage[];
  texture?: PageTextureId;
  margin?: number;
  bleed?: number;
  output?: DesignOutput;
  unit?: DesignUnit;
  physicalWidth?: number;
  physicalHeight?: number;
  opening?: Partial<OpeningSettings>;
  closing?: ClosingSettings;
  transition?: PageTransition;
}

export function createBlankDesign(options: BlankDesignOptions = {}): DesignDocument {
  const width = options.width ?? DESIGN_WIDTH;
  const height = options.height ?? DESIGN_HEIGHT;
  const blankPage = (index: number): DesignPage => ({
    id: makeId("page"),
    name: index === 0 ? "Untitled" : `Page ${index + 1}`,
    background: options.background ?? "#fbfaf7",
    elements: [],
    hidden: false,
    width,
    height,
    margin: options.margin ?? 0,
    bleed: options.bleed ?? 0,
    texture: options.texture ?? "none",
    edge: "straight",
  });
  const pages = Array.isArray(options.pages)
    ? options.pages
    : Array.from({ length: Math.max(1, options.pages ?? 1) }, (_, index) =>
        blankPage(index),
      );
  return {
    version: 1,
    pages,
    opening: { experience: "none", autoOpen: false, welcome: "", ...options.opening },
    closing: options.closing ?? {
      enabled: false,
      style: "message",
      message: "",
      duration: 800,
    },
    transition: options.transition ?? { preset: "fade", duration: 700 },
    output: options.output,
    physicalWidth: options.physicalWidth,
    physicalHeight: options.physicalHeight,
  };
}

/** A default invitation design: a name, a date, a venue, a rule and a flourish. */
export function createDefaultDesign(
  content: InvitationContent,
): DesignDocument {
  return createBlankDesign({
    pages: [
      {
        id: makeId("page"),
        name: "Invitation",
        background: "#f2f1ed",
        elements: [
          {
            id: makeId("text"),
            name: "Names",
            kind: "text",
            x: 80,
            y: 120,
            w: 840,
            h: 120,
            text: content.title,
            fontSize: 64,
            font: content.fontPair ?? "cormorant-garamond",
            color: "#161616",
            align: "center",
            animation: defaultAnimation("fadeUp", 0),
          },
          {
            id: makeId("date"),
            name: "Date",
            kind: "text",
            x: 80,
            y: 360,
            w: 840,
            h: 80,
            text: `${content.date} · ${content.time}`,
            fontSize: 32,
            font: content.fontPair ?? "cormorant-garamond",
            color: "#2b2723",
            align: "center",
            animation: defaultAnimation("fadeUp", 200),
          },
          {
            id: makeId("venue"),
            name: "Venue",
            kind: "text",
            x: 80,
            y: 500,
            w: 840,
            h: 100,
            text: content.venueName,
            fontSize: 32,
            font: content.fontPair ?? "cormorant-garamond",
            color: "#2b2723",
            align: "center",
            animation: defaultAnimation("fadeUp", 400),
          },
          {
            id: makeId("rule"),
            name: "Rule",
            kind: "shape",
            x: 160,
            y: 640,
            w: 680,
            h: 4,
            fill: "#710014",
            animation: defaultAnimation("fade", 600),
          },
          {
            id: makeId("message"),
            name: "Message",
            kind: "text",
            x: 160,
            y: 700,
            w: 680,
            h: 200,
            text: content.message,
            fontSize: 28,
            font: content.fontPair ?? "cormorant-garamond",
            color: "#161616",
            align: "center",
            lineHeight: 1.5,
            animation: defaultAnimation("fadeUp", 800),
          },
        ],
        hidden: false,
        width: DESIGN_WIDTH,
        height: DESIGN_HEIGHT,
        margin: 0,
        bleed: 0,
        texture: "none",
        edge: "straight",
      },
    ],
    opening: { experience: "none", autoOpen: false, welcome: "" },
    closing: { enabled: false, style: "message", message: "", duration: 800 },
    transition: { preset: "fade", duration: 700 },
  });
}

/* -------------------------------------------------------------------------- */
/* Personalisation                                                            */
/* -------------------------------------------------------------------------- */

/** Fill in the words of a guest-facing snippet. */
export function personalize(text: string, guestName: string): string {
  return text.replace(/{{name}}/g, guestName);
}
