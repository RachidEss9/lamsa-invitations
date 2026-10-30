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
  delay: number;
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

export type ElementKind =
  | "text"
  | "image"
  | "shape"
  | "motif"
  | "capsule"
  | "imageInShape"
  | "textBackground"
  | "textRadius"
  | "textShadow"
  | "imageBorder"
  | "imageShadow"
  | "imageRadius"
  | "imageZoom"
  | "imagePosition";

export const ELEMENT_KINDS: { id: ElementKind; label: string }[] = [
  { id: "text", label: "Text" },
  { id: "image", label: "Image" },
  { id: "shape", label: "Shape" },
  { id: "motif", label: "Motif" },
  { id: "capsule", label: "Capsule" },
  { id: "imageInShape", label: "Image in shape" },
  { id: "textBackground", label: "Text background" },
  { id: "textRadius", label: "Text radius" },
  { id: "textShadow", label: "Text shadow" },
  { id: "imageBorder", label: "Image border" },
  { id: "imageShadow", label: "Image shadow" },
  { id: "imageRadius", label: "Image radius" },
  { id: "imageZoom", label: "Image zoom" },
  { id: "imagePosition", label: "Image position" },
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
  color?: string;
  fill?: string;
  opacity?: number;
  fontSize?: number;
  /** The radius of the element in pixels. */
  radius?: number;
  stroke?: string;
  strokeWidth?: number;
  font?: string;
  fontStyle?: "normal" | "italic" | "oblique";
  lineHeight?: number;
  align?: "left" | "center" | "right" | "justify";
  fontWeight?: number;
  italic?: boolean;
  textTransform?: TextTransform;
  text?: string;
  textAlign?: "left" | "center" | "right" | "justify";
  letterSpacing?: number;
  textBorder?: string;
  textBorderWidth?: number;
  textPadding?: number;
  textBackground?: string;
  textRadius?: number;
  textShadow?: string;
  textBorderWidth?: number;
  textPadding?: number;
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
  /** The motif the motif element draws. */
  motif?: string;
  /** The border of an image element. */
  imageBorder?: string;
  /** The width of the image border. */
  imageBorderWidth?: number;
  /** The shadow of an image element. */
  imageShadow?: string;
  /** The radius of an image element. */
  imageRadius?: number;
  /** How far into the frame the picture sits, as a fraction of the layer. */
  imageZoom?: number;
  /** The curve a path follows, in degrees, when the shape is `path`. */
  curve?: number;
  /** Vertical align. */
  verticalAlign?: "top" | "middle" | "bottom";
  /** Uppercase the text. */
  uppercase?: boolean;
  /** The artwork the frame is dressed with, chosen from the studio pack. */
  frameArt?: string;
  /** The picture the frame is dressed with, chosen from the studio pack. */
  imageAdjust?: ImageAdjust;
  /** How the art fills its box when the kind is `image`. */
  fit?: ImageFit;
  /** How far into the frame the picture sits, as a fraction of the layer. */
  imageZoom?: number;
  /** The point of the picture that stays put, in percent of the layer box. */
  imagePosition?: { x: number; y: number };
  /** Rotates the image, in degrees, when the kind is `image`. */
  imageRotate?: number;
  /** Rotates the image, in degrees, when the kind is `image`. */
  imageRotate?: number;
  /** The image's stored id, when the kind is `image`. */
  imageStorageId?: string;
  /** Scales the image, in percent, when the kind is `image`. */
  imageZoom?: number;
  /** The image's position inside its box, when the kind is `image`. */
  imagePosition?: "center" | "left" | "right";
  /** Strokes the layer's outline. */
  stroke?: string;
  /** The width of the layer's stroke. */
  strokeWidth?: number;
  /** Whether to stroke the image over the frame shape. */
  frameStrokeOnImage?: string;
  /** The font weight. */
  fontWeight?: number;
  /** The font style: normal or italic. */
  italic?: boolean;
  /** Text decoration. */
  textDecoration?: string;
  /** Text transform. */
  textTransform?: string;
  /** The curve a path follows, in degrees. */
  curve?: number;
  /** Vertical align. */
  verticalAlign?: "top" | "middle" | "bottom";
  /** Uppercase the text. */
  uppercase?: boolean;
  /** The text case transform: `textTransform` (CSS value) and/or `uppercase` flag. */
  textTransform?: TextCaseTransform;
  /** The text curve, when the shape is `path`. */
  textCurve?: boolean;
  /** The background of the text, when the kind is `text`. */
  textBackground?: string;
  /** The radius of the text background. */
  textRadius?: number;
  /** The shadow of the text. */
  textShadow?: string;
  /** The motif of a motif element. */
  motif?: string;
  /** The border of an image element. */
  imageBorder?: string;
  /** The width of the image border. */
  imageBorderWidth?: number;
  /** The shadow of an image element. */
  imageShadow?: string;
  /** The radius of an image element. */
  imageRadius?: number;
  /** The picture is clipped to the vector of the shape, not its box. */
  imageInShape?: boolean;
  /** How far into the frame the picture sits, as a fraction of the layer. */
  imageZoom?: number;
  /** Additional descriptive text for the reveal's aria-label. */
  hint?: string;
  /** The stored id of the cover image. */
  has?: string;
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
  /** The name of the layer as shown in the inspector. */
  name?: string;
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
 * Fit a page element into the invitation slot on a full stage.
 *
 * The presentation renders each scene on its own frame box on a 2400x1400
 * stage; the invitation itself occupies the 800x1100 slot at (800,250).
 * `box` is the element box before slot scaling, `slot` the 800x1100 rectangle,
 * and `stage` the 2400x1400 viewport. Returns the element box in slot pixels
 * (identical to the manifest box), centred inside the slot, never clipped.
 *
 * @param box - element box in stage pixels (from the scene manifest / layer)
 * @param slot - the 800x1100 invitation slot on the 2400x1400 stage
 * @param stage - the 2400x1400 stage box
 * @returns fitted element box in slot pixels, centred inside the slot
 */
export function pageFitScale(
  box: { x: number; y: number; w: number; h: number },
  slot: { w: number; h: number },
  stage: { w: number; h: number },
): { x: number; y: number; w: number; h: number } {
  const sx = 800 / slot.w;
  const sy = 1100 / slot.h;
  const s = Math.min(sx, sy);
  const w = Math.round(box.w * s * 100) / 100;
  const h = Math.round(box.h * s * 100) / 100;
  return {
    x: Math.round((box.x + (box.w - w) / 2) * 100) / 100,
    y: Math.round((box.y + (box.h - h) / 2) * 100) / 100,
    w,
    h,
  };
}

/* -------------------------------------------------------------------------- */
/* Opening experience                                                         */
/* -------------------------------------------------------------------------- */

/** The three presentation scenes, and the legacy map they replace. */
export type OpeningExperienceId = "none" | "secret-world" | "living-art" | "impossible";

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
  const pages = doc.pages ?? [];
  const pageList: DesignPage[] = pages.map((page) => normalizePage(page, content));
  const opening: OpeningSettings = {
    experience: typeof doc.opening === "object" && doc.opening !== null && "experience" in doc.opening
      ? (doc.opening.experience ?? "none")
      : "none",
    autoOpen: doc.opening?.autoOpen ?? false,
    welcome: doc.opening?.welcome ?? "",
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
  const elements: DesignElement[] = (p.elements ?? []).map((element) =>
    normalizeElement(element),
  );
  return {
    id: p.id ?? makeId("page"),
    name: p.name ?? "Untitled",
    background: p.background ?? "#fbfaf7",
    elements,
    hidden: p.hidden ?? false,
    width: p.width ?? DESIGN_WIDTH,
    height: p.height ?? DESIGN_HEIGHT,
    margin: p.margin ?? 0,
    bleed: p.bleed ?? 0,
    texture: p.texture ?? "none",
    edge: p.edge ?? "straight",
    material: p.material ?? "none",
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
      animation: { preset: "fade", duration: 1500, delay: 0 },
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
    color: e.color ?? undefined,
    fill: e.fill ?? undefined,
    opacity: e.opacity ?? undefined,
    fontSize: e.fontSize ?? undefined,
    font: e.font ?? undefined,
    fontStyle: e.fontStyle ?? undefined,
    lineHeight: e.lineHeight ?? undefined,
    align: e.align ?? undefined,
    text: e.text ?? undefined,
    textAlign: e.textAlign ?? undefined,
    letterSpacing: e.letterSpacing ?? undefined,
    textBorder: e.textBorder ?? undefined,
    textBorderWidth: e.textBorderWidth ?? undefined,
    textPadding: e.textPadding ?? undefined,
    shape: e.shape ?? undefined,
    frameArt: e.frameArt ?? undefined,
    imageAdjust: e.imageAdjust ?? undefined,
    effects: e.effects ?? undefined,
    material: e.material ?? undefined,
    reveal: e.reveal ?? undefined,
    animation,
    exit: e.exit ?? undefined,
  };
}

function normalizeAnimation(
  animation: unknown,
): ElementAnimation {
  if (!animation || typeof animation !== "object") {
    return { preset: "fade", duration: 1500, delay: 0 };
  }
  const a = animation as Partial<ElementAnimation>;
  return {
    preset: a.preset ?? "fade",
    duration: a.duration ?? 1500,
    delay: a.delay ?? 0,
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

/* -------------------------------------------------------------------------- */
/* Transition                                                               */
/* -------------------------------------------------------------------------- */

export interface PageTransition {
  preset: "fade" | "dissolve" | "slide" | "curtain" | "flip";
  duration: number;
}

export const PAGE_TRANSITIONS: { id: PageTransition["preset"]; label: string; note: string }[] = [
  { id: "fade", label: "Fade", note: "The card just appears" },
  { id: "dissolve", label: "Dissolve", note: "A wash drops between the two pages" },
  { id: "slide", label: "Slide", note: "The card slides to reveal the next" },
  { id: "curtain", label: "Curtain", note: "The card folds back" },
  { id: "flip", label: "Flip", note: "The card turns over" },
];

export const TRANSITIONS: { id: PageTransition["preset"]; label: string; note: string }[] = [
  { id: "fade", label: "Fade", note: "The card just appears" },
  { id: "dissolve", label: "Dissolve", note: "A wash drops between the two pages" },
  { id: "slide", label: "Slide", note: "The card slides to reveal the next" },
  { id: "curtain", label: "Curtain", note: "The card folds back" },
  { id: "flip", label: "Flip", note: "The card turns over" },
];

/** The transition applied to the published invitation, keyed by the style. */
export function pageTransitionStyle(
  current: PageTransition,
  next: PageTransition,
): PageTransition {
  if (current.preset === next.preset && current.duration === next.duration) return current;
  return next;
}

/** The time the guest's continue is held, in ms, from the last page. */
export function timelineDuration(page: DesignPage): number {
  const end = page.elements.reduce((max, element) => {
    if (!element.animation?.enabled) return max;
    return Math.max(max, element.animation.delay + element.animation.duration);
  }, 0);
  return Math.max(900, end);
}

/** The choreography frames for a page transition, for the guest timeline. */
export function pageTransitionFrames(
  current: PageTransition,
  next: PageTransition,
  options?: { rtl: boolean },
): { from: string; to: string; dur: number }[] {
  const from = current.preset;
  const to = next.preset;
  const dur = Math.max(current.duration, next.duration);
  switch (from) {
    case "fade":
      return [{ from: "none", to: "opacity-30", dur }];
    case "dissolve":
      return [{ from: "opacity-100", to: "opacity-0", dur }];
    case "slide":
      return [{ from: "translate-x-0", to: options?.rtl ? "translate-x-full" : "translate-x-negative-full", dur }];
    case "curtain":
      return [{ from: "scale-x-100", to: options?.rtl ? "scale-x-0" : "scale-x-0", dur }];
    case "flip":
      return [{ from: "rotate-y-0", to: "rotate-y-180", dur }];
    default:
      return [{ from: "none", to: "opacity-0", dur }];
  }
}

/* -------------------------------------------------------------------------- */
/* Design output                                                              */
/* -------------------------------------------------------------------------- */

export type DesignOutput = "digital" | "printed" | "both";

/** The format the invitation lands in, used by the print pipeline. */
export type DesignFormat = "pdf" | "png" | "psd" | "svg";

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
  enabled: boolean;
  geometry: EnvelopeGeometry;
  liner: LinerGeometry;
  format: DesignFormat;
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

/** The current draft of the envelope. */
export interface TimelineClip {
  elementId: string;
  start?: number;
  duration?: number;
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
  return { preset, duration: 1500, delay };
}

/** Duplicate elements, appending copies of the selected ids. */
export function duplicateElements(
  elements: DesignElement[],
  ids: string[],
): DesignElement[] {
  const copy = elements.find((element) => element.id === ids[0]);
  if (!copy) return elements;
  const created = elements.map((element) => ({
    ...element,
    id: makeId("copy"),
    name: `${element.name} copy`,
  }));
  return created;
}

/** Place an element on a page, centred. */
export function placeOnPage(page: DesignPage, element: DesignElement): DesignPage {
  const cx = (page.width ?? DESIGN_WIDTH) / 2;
  const cy = (page.height ?? DESIGN_HEIGHT) / 2;
  const left = cx - (element.w ?? 100) / 2;
  const top = cy - (element.h ?? 100) / 2;
  return { ...page, elements: [...page.elements, { ...element, x: left, y: top }] };
}

/** The label a layer's kind renders in the inspector. */
export function elementTypeLabel(element: DesignElement): string {
  return element.kind === "text" ? "Text" : element.kind === "image" ? "Image" : element.kind;
}

export function clipsForPage(page: DesignPage): string[] {
  return [];
}

export function applyStylePreset(
  design: DesignDocument,
  style: StylePreset,
  previous: string,
): DesignDocument {
  return design;
}

/** True when the element is inside the safe area of the page. */
export function isDesignDocument(value: unknown): value is DesignDocument {
  if (!value || typeof value !== "object") return false;
  const doc = value as Partial<DesignDocument>;
  return Array.isArray(doc.pages) && doc.pages.length > 0;
}

/** The ids of elements the page draws over the invitation. */
export function coveredElementIds(page: DesignPage): string[] {
  return page.elements.filter((element) => element.hidden).map((element) => element.id);
}

/** The inline style at a moment of a layer animation. */
export function elementStyleAt(
  element: DesignElement,
  time: number,
  options?: { ignoreExit: boolean },
): { style: { transform?: string; opacity?: number; filter?: string }; transition?: string } {
  const animation = element.animation;
  const transition =
    element.exit?.duration != null
      ? `transition: opacity ${element.exit.duration}ms linear ${element.exit.delay}ms;`
      : undefined;
  return { style: {}, transition };
}

/** Clean the reveal maps a cover points at. */
export function cleanRevealLinks(elements: DesignElement[]): DesignElement[] {
  const targets = new Set(elements.map((element) => element.id));
  return elements.map((element) =>
    element.reveal ? { ...element, targetId: targets.has(element.reveal.targetId) ? element.reveal.targetId : "" } : element,
  );
}

/** The design fonts a template was built with, as the studio persists them. */
export const TEMPLATE_DESIGN_FONTS: Record<string, string[]> = {
  "published": ["Cormorant Garamond", "Bodoni Moda", "Cinzel"],
  "custom": ["Inter", "Manrope"],
};

/* -------------------------------------------------------------------------- */
/* Blank documents                                                            */
/* -------------------------------------------------------------------------- */

/** A brand‑new design, on the classic studio card. */
export function createBlankDesign(overrides: Partial<DesignDocument> = {}): DesignDocument {
  return {
    version: 1,
    pages: [
      {
        id: makeId("page"),
        name: "Untitled",
        background: "#fbfaf7",
        elements: [],
        hidden: false,
        width: DESIGN_WIDTH,
        height: DESIGN_HEIGHT,
        margin: 0,
        bleed: 0,
        texture: "none",
        edge: "straight",
        material: "none",
      },
    ],
    opening: { experience: "none", autoOpen: false, welcome: "" },
    closing: { enabled: false, style: "message", message: "", duration: 800 },
    transition: { preset: "fade", duration: 700 },
    ...overrides,
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
        material: "none",
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
