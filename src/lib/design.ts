import type { CSSProperties } from "react";
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
  | "scallop";

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
  verticalAlign?: "top" | "middle" | "bottom";
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
}

export type PageTextureId = "none" | "cotton" | "linen" | "fibre";

export const PAGE_TEXTURES: { id: PageTextureId; label: string; note: string }[] = [
  { id: "none", label: "Smooth", note: "No grain, a clean printed surface" },
  { id: "cotton", label: "Cotton", note: "Soft mottled fibre, like cotton stock" },
  { id: "linen", label: "Linen", note: "A fine woven weave" },
  { id: "fibre", label: "Raw fibre", note: "Handmade paper with visible flecks" },
];

export function visiblePages(design: DesignDocument): DesignPage[] {
  const shown = design.pages.filter((page) => !page.hidden);
  return shown.length > 0 ? shown : design.pages.slice(0, 1);
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

/**
 * A single flat colour for a surface that has to sit behind something else
 * (a translucent plate, a tinted shadow). A wash cannot be tinted, so it falls
 * back to the studio ivory rather than producing an invalid colour.
 */
export function flatBackgroundOf(
  background: string | undefined,
  fallback = "#f4f3ef",
): string {
  const value = (background || "").trim();
  if (!value) return fallback;
  return isGradientBackground(value) ? fallback : value;
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

export type OpeningExperienceId =
  | "none"
  | "envelope"
  | "wax-seal"
  | "arch"
  | "curtain"
  | "door"
  | "cards"
  | "folding"
  | "paper"
  | "typography"
  | "floral"
  | "cinematic"
  | "image"
  | "fade"
  | "personal";

export const OPENING_EXPERIENCES: {
  id: OpeningExperienceId;
  label: string;
  note: string;
}[] = [
  { id: "envelope", label: "Envelope", note: "A wax seal cracks a crimson envelope open" },
  { id: "wax-seal", label: "Wax seal", note: "A single seal breaks over dark paper" },
  { id: "arch", label: "Glowing arch", note: "A lit arch opens onto the invitation" },
  { id: "curtain", label: "Curtain", note: "Two heavy panels part slowly" },
  { id: "door", label: "Double doors", note: "Panelled doors swing inward" },
  { id: "cards", label: "Layered cards", note: "Stacked paper lifts away one by one" },
  { id: "folding", label: "Folding card", note: "A gate-fold card opens in three panels" },
  { id: "paper", label: "Paper unfold", note: "A creased sheet flattens across the screen" },
  { id: "typography", label: "Typography reveal", note: "The names are set, then the card appears" },
  { id: "floral", label: "Floral reveal", note: "An ornamental wreath opens around the card" },
  { id: "cinematic", label: "Cinematic layers", note: "Letterbox bars and a slow zoom part" },
  { id: "image", label: "Image opening", note: "A cover photograph opens into the invitation" },
  { id: "fade", label: "Cinematic fade", note: "A slow reveal from darkness" },
  { id: "personal", label: "Personal welcome", note: "A named greeting before the card" },
  { id: "none", label: "No opening", note: "Opens directly on the first page" },
];

export type OpeningToneId = "crimson" | "ink" | "ivory";

export const OPENING_TONES: {
  id: OpeningToneId;
  label: string;
  note: string;
  swatch: string;
}[] = [
  { id: "crimson", label: "Burgundy", note: "Dyed cotton stock", swatch: "#710014" },
  { id: "ink", label: "Charcoal", note: "Deep matte board", swatch: "#1b1a18" },
  { id: "ivory", label: "Ivory", note: "Warm pressed paper", swatch: "#efe9dd" },
];

/**
 * Optional choreography overrides from the Opening Designer. Every field falls
 * back to the preset's own timeline, so an untouched opening behaves exactly as
 * it always has and older saved designs keep their motion.
 */
export interface OpeningMotion {
  /** Scale the card starts at, before it leaves the frame. */
  startScale?: number;
  /** How far below its resting place the card begins, in design pixels. */
  rise?: number;
  /** Fraction of the opening at which the card starts to emerge. */
  cardStart?: number;
}

/** Colours used by the opening only; the invitation keeps its own palette. */
export interface OpeningPalette {
  accent?: string;
  /** The envelope, door or deep surface colour. */
  hull?: string;
  /** The paper colour of the suite. */
  paper?: string;
}

/**
 * The physical suite around the card. Sizes are in millimetres, the way an
 * envelope is sold; the renderer converts them into the opening artboard.
 */
export interface EnvelopeSettings {
  width: number;
  height: number;
  /** Hinge depth as a fraction of the height, 0.2–0.75. */
  flapDepth?: number;
  /** Flat lining colour; omitted uses the suite tone. */
  lining?: string;
  /** Up to three characters stamped into the wax seal. */
  sealInitials?: string;
  /** Flat wax colour; omitted uses the suite accent. */
  sealColor?: string;
}

export interface OpeningSettings {
  experience: OpeningExperienceId;
  duration: number;
  autoOpen: boolean;
  welcome: string;
  coverStorageId?: string;
  /** Material treatment of the frame. */
  tone?: OpeningToneId;
  palette?: OpeningPalette;
  motion?: OpeningMotion;
  /** Optional physical envelope; omitted keeps the classic suite. */
  stationery?: EnvelopeSettings;
}

export type ClosingStyleId = "message" | "seal" | "curtain" | "fade";

export const CLOSING_STYLES: {
  id: ClosingStyleId;
  label: string;
  note: string;
}[] = [
  { id: "message", label: "Closing note", note: "A quiet note and the monogram" },
  { id: "seal", label: "Wax seal", note: "A seal closes over the last page" },
  { id: "curtain", label: "Curtain close", note: "Panels draw the invitation shut" },
  { id: "fade", label: "Fade to ink", note: "The canvas settles into darkness" },
];

/** The optional ending shown once the last page has finished playing. */
export interface ClosingSettings {
  enabled: boolean;
  style: ClosingStyleId;
  message: string;
  duration: number;
}

export type PageTransitionId =
  | "none"
  | "fade"
  | "slide"
  | "curtain"
  | "flip"
  | "zoom"
  | "blur"
  | "rise";

export const PAGE_TRANSITIONS: {
  id: PageTransitionId;
  label: string;
  note: string;
}[] = [
  { id: "fade", label: "Cross-fade", note: "One page dissolves into the next" },
  { id: "slide", label: "Slide", note: "The next page slides across" },
  { id: "curtain", label: "Curtain", note: "A panel sweeps the change" },
  { id: "flip", label: "Flip", note: "A quiet card turn" },
  { id: "zoom", label: "Zoom", note: "The next page settles in from a close crop" },
  { id: "blur", label: "Blur", note: "A soft focus pull between pages" },
  { id: "rise", label: "Rise", note: "The next page lifts into place" },
  { id: "none", label: "Cut", note: "No transition" },
];

export interface PageTransition {
  preset: PageTransitionId;
  duration: number;
}

export interface DesignDocument {
  version: 1;
  pages: DesignPage[];
  opening: OpeningSettings;
  closing: ClosingSettings;
  transition: PageTransition;
  /**
   * The physical brief the design was created under: what the host asked for
   * when they started from scratch. Print and PDF read it as their starting
   * point; the canvas still owns the geometry.
   */
  format?: DesignFormat;
  startedAt?: number;
}

export type DesignOutput = "digital" | "print" | "both";

export interface DesignFormat {
  output: DesignOutput;
  unit: DesignUnit;
  /** Physical size exactly as entered, in `unit`. */
  width: number;
  height: number;
  /** Safe margin and bleed, in `unit`. */
  margin: number;
  bleed: number;
}

export interface StylePreset {
  palette: { background: string; ink: string; accent: string };
  fontPair: string;
  /** Optional page treatment applied together with the palette. */
  background?: string;
}

let idCounter = 0;

export function makeId(prefix: string): string {
  idCounter += 1;
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${random}${idCounter.toString(36)}`;
}

export function defaultAnimation(
  preset: AnimationPresetId = "fadeUp",
  delay = 0,
): ElementAnimation {
  return {
    enabled: true,
    preset,
    trigger: "load",
    delay,
    duration: 1200,
    easing: "easeOut",
  };
}

/* -------------------------------------------------------------------------- */
/* Animation evaluation                                                       */
/* -------------------------------------------------------------------------- */

const EASE_FUNCTIONS: Record<EasingId, (t: number) => number> = {
  linear: (t) => t,
  easeOut: (t) => 1 - Math.pow(1 - t, 3),
  easeIn: (t) => t * t * t,
  easeInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  backOut: (t) => {
    const c = 1.70158;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  },
};

export function ease(easing: EasingId, t: number): number {
  return EASE_FUNCTIONS[easing](Math.min(1, Math.max(0, t)));
}

export interface AnimatedStyle {
  style: CSSProperties;
  /** True while the element is before its entry begins. */
  waiting: boolean;
}

function motionFor(
  preset: AnimationPresetId,
  p: number,
  direction: 1 | -1,
): { opacity: number; transform: string; filter?: string; clipPath?: string } {
  const d = direction;
  switch (preset) {
    case "fade":
      return { opacity: p, transform: "" };
    case "fadeUp":
      return { opacity: p, transform: `translateY(${(1 - p) * 46 * d}px)` };
    case "fadeDown":
      return { opacity: p, transform: `translateY(${(1 - p) * -46 * d}px)` };
    case "fadeLeft":
      return { opacity: p, transform: `translateX(${(1 - p) * 48 * d}px)` };
    case "fadeRight":
      return { opacity: p, transform: `translateX(${(1 - p) * -48 * d}px)` };
    case "scaleIn":
      return {
        opacity: p,
        transform: `scale(${0.93 + p * 0.07})`,
      };
    case "blurIn":
      return {
        opacity: p,
        transform: `scale(${0.99 + p * 0.01})`,
        filter: `blur(${(1 - p) * 14}px)`,
      };
    case "rise":
      return {
        opacity: p,
        transform: `translateY(${(1 - p) * 90 * d}px)`,
        filter: `blur(${(1 - p) * 3}px)`,
      };
    case "wipeUp":
      return {
        opacity: 1,
        transform: "",
        clipPath: `inset(${(1 - p) * 100}% 0 0 0)`,
      };
    case "wipeRight":
      return {
        opacity: 1,
        transform: "",
        clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
      };
    case "draw":
      return {
        opacity: 1,
        transform: `scaleX(${Math.max(0.001, p)})`,
      };
    case "flipIn":
      return {
        opacity: p,
        transform: `perspective(1400px) rotateY(${(1 - p) * -88 * d}deg)`,
      };
    case "zoomFade":
      return {
        opacity: p,
        transform: `scale(${1.12 - p * 0.12})`,
      };
    case "swingIn":
      return {
        opacity: p,
        transform: `rotate(${(1 - p) * -7 * d}deg)`,
        filter: `blur(${(1 - p) * 2}px)`,
      };
    case "dropIn":
      return {
        opacity: p,
        transform: `translateY(${(1 - p) * -80 * d}px)`,
        filter: `blur(${(1 - p) * 5}px)`,
      };
    case "maskDown":
      return {
        opacity: 1,
        transform: "",
        clipPath: `inset(0 0 ${(1 - p) * 100}% 0)`,
      };
    case "maskLeft":
      return {
        opacity: 1,
        transform: "",
        clipPath: `inset(0 0 0 ${(1 - p) * 100}%)`,
      };
    case "unveil":
      return {
        opacity: 1,
        transform: "",
        clipPath: `circle(${p * 76}% at 50% 50%)`,
      };
    case "float":
      return {
        opacity: p,
        transform: `translateY(${(1 - p) * 30 * d}px)`,
        filter: `blur(${(1 - p) * 4}px)`,
      };
    case "shimmer":
      return {
        opacity: p,
        transform: `scale(${1.02 - p * 0.02})`,
        filter: `brightness(${0.65 + p * 0.35}) blur(${(1 - p) * 3}px)`,
      };
    case "pulse":
      return {
        opacity: p,
        transform: `scale(${0.94 + p * 0.06})`,
      };
    case "driftIn":
      return {
        opacity: p,
        transform: `translate(${(1 - p) * -34 * d}px, ${(1 - p) * 22 * d}px)`,
      };
    case "riseFast":
      return {
        opacity: p,
        transform: `translateY(${(1 - p) * 58 * d}px)`,
      };
    case "none":
    default:
      return { opacity: 1, transform: "" };
  }
}

/**
 * Evaluates an element at a moment in time. Everything is computed, never
 * delegated to CSS animation, so the timeline can scrub to any instant and
 * the canvas, the preview, and the published page agree exactly.
 */
export function elementStyleAt(
  element: DesignElement,
  time: number,
  options: { seekable?: boolean; ignoreExit?: boolean } = {},
): AnimatedStyle {
  const animation = element.animation;
  // Mirroring is composed after the rotation, so a flipped layer still turns
  // around its own centre exactly as it did before it was mirrored.
  const flip = `${element.flipX ? " scaleX(-1)" : ""}${element.flipY ? " scaleY(-1)" : ""}`;
  const base: CSSProperties = {
    opacity: element.opacity,
    transform: `rotate(${element.rotation}deg)${flip}`,
    transformOrigin: "center center",
  };

  if (!animation.enabled || animation.preset === "none") {
    return { style: base, waiting: false };
  }

  const start = Math.max(0, animation.delay);
  const duration = Math.max(1, animation.duration);
  const raw = (time - start) / duration;
  const waiting = raw < 0;
  const p = ease(animation.easing, Math.min(1, Math.max(0, raw)));

  // `draw` is a scale that must be composed with the element rotation.
  const motion = motionFor(animation.preset, waiting ? 0 : p, 1);

  let opacity = element.opacity * (waiting ? 0 : motion.opacity);
  let transform = `${motion.transform ? `${motion.transform} ` : ""}rotate(${element.rotation}deg)${flip}`;
  let filter = motion.filter;
  let clipPath = motion.clipPath;

  if (!options.ignoreExit && element.exit?.enabled && time >= element.exit.start) {
    const exitP = ease(
      element.exit.easing,
      Math.min(1, (time - element.exit.start) / Math.max(1, element.exit.duration)),
    );
    const out = motionFor(
      element.exit.preset === "none" ? "fade" : element.exit.preset,
      exitP,
      -1,
    );
    opacity *= 1 - exitP;
    if (out.transform) transform += ` ${out.transform}`;
    if (out.filter) filter = out.filter;
    if (element.exit.preset === "wipeUp" || element.exit.preset === "wipeRight") {
      clipPath =
        element.exit.preset === "wipeUp"
          ? `inset(0 0 ${exitP * 100}% 0)`
          : `inset(0 0 0 ${exitP * 100}%)`;
    }
  }

  return {
    style: {
      ...base,
      opacity,
      transform,
      filter,
      clipPath,
      transformOrigin: "center center",
      ...(options.seekable === false ? { transition: "none" } : {}),
    },
    waiting,
  };
}

/* -------------------------------------------------------------------------- */
/* Timeline                                                                   */
/* -------------------------------------------------------------------------- */

export interface TimelineClip {
  id: string;
  elementId: string;
  label: string;
  kind: ElementKind;
  start: number;
  duration: number;
  preset: AnimationPresetId;
  exitStart?: number;
  exitDuration?: number;
  hidden: boolean;
  locked: boolean;
}

export function clipsForPage(page: DesignPage): TimelineClip[] {
  return page.elements
    .filter((element) => element.animation.enabled)
    .map((element) => ({
      id: `clip_${element.id}`,
      elementId: element.id,
      label: element.name || "Layer",
      kind: element.kind,
      start: Math.max(0, element.animation.delay),
      duration: Math.max(1, element.animation.duration),
      preset: element.animation.preset,
      exitStart: element.exit?.enabled ? element.exit.start : undefined,
      exitDuration: element.exit?.enabled ? element.exit.duration : undefined,
      hidden: element.hidden,
      locked: element.locked,
    }));
}

export function timelineDuration(page: DesignPage): number {
  const clips = clipsForPage(page);
  const end = clips.reduce(
    (max, clip) =>
      Math.max(max, clip.start + clip.duration, clip.exitStart ? clip.exitStart + (clip.exitDuration ?? 0) : 0),
    0,
  );
  return Math.max(4000, Math.ceil(end / 500) * 500);
}

/* -------------------------------------------------------------------------- */
/* Elements                                                                   */
/* -------------------------------------------------------------------------- */

export function makeElement(
  kind: ElementKind,
  overrides: Partial<DesignElement> = {},
): DesignElement {
  const base: DesignElement = {
    id: makeId(kind),
    kind,
    name:
      kind === "text"
        ? "Text"
        : kind === "image"
          ? "Image"
          : kind === "motif"
            ? "Ornament"
            : "Shape",
    x: 130,
    y: 520,
    w: 740,
    h: 160,
    rotation: 0,
    opacity: 1,
    locked: false,
    hidden: false,
    animation: defaultAnimation(),
  };
  return { ...base, ...overrides, id: overrides.id ?? base.id };
}

export function cloneElement(element: DesignElement): DesignElement {
  return {
    ...element,
    id: makeId(element.kind),
    name: `${element.name} copy`,
    groupId: undefined,
    reveal: element.reveal
      ? { ...element.reveal, interactionId: makeId("interaction") }
      : undefined,
    animation: { ...element.animation },
    exit: element.exit ? { ...element.exit } : undefined,
  };
}

export function duplicateElements(
  elements: DesignElement[],
  selectedIds: string[],
): DesignElement[] {
  const originals = elements.filter((element) => selectedIds.includes(element.id));
  if (originals.length === 0) return elements;
  const idMap = new Map<string, string>();
  const copies = originals.map((element) => {
    const copy = cloneElement(element);
    idMap.set(element.id, copy.id);
    return copy;
  });
  // Keep reveal links pointing at the copied content, never the original.
  for (const copy of copies) {
    if (copy.reveal && idMap.has(copy.reveal.targetId)) {
      copy.reveal.targetId = idMap.get(copy.reveal.targetId)!;
    }
  }
  return [...elements, ...copies];
}

/** Removes dangling reveal targets after a delete; the cover stays usable. */
export function cleanRevealLinks(elements: DesignElement[]): DesignElement[] {
  const ids = new Set(elements.map((element) => element.id));
  return elements.map((element) =>
    element.reveal && !ids.has(element.reveal.targetId)
      ? { ...element, reveal: undefined }
      : element,
  );
}

/* -------------------------------------------------------------------------- */
/* Default design from the written invitation                                 */
/* -------------------------------------------------------------------------- */

/**
 * Built-in templates set their canvas text from the expanded type library,
 * while the invitation content keeps its compatibility font-pair id.
 */
export const TEMPLATE_DESIGN_FONTS: Record<string, string> = {
  "the-arch": "great-vibes",
  "the-seal": "parisienne",
  "the-ribbon": "allura",
  "the-arch-ar": "amiri",
  "the-vow": "cormorant-garamond",
  adeline: "cinzel",
  "amber-hands": "lora",
  jubilee: "playfair-display",
  nocturne: "italiana",
  laurel: "marcellus",
  fete: "outfit",
  atelier: "jost",
  "crescent-night": "markazi-text",
  "gold-eid": "cormorant-garamond",
  "little-one": "cormorant-garamond",
  "first-hello": "lora",
  "riad-nour": "aref-ruqaa",
  "nikah-ivory": "scheherazade-new",
  "mehndi-gold": "fraunces",
  "noir-gala": "bodoni-moda",
  "botanical-letter": "eb-garamond",
  convocation: "libre-baskerville",
  "petal-pink": "parisienne",
  "studio-birthday": "space-grotesk",
  "eid-jade": "reem-kufi",
  "anniversary-wine": "cormorant-garamond",
};

function textElement(
  name: string,
  text: string,
  overrides: Partial<DesignElement>,
  content: InvitationContent,
  delay: number,
): DesignElement {
  return makeElement("text", {
    name,
    text,
    font: TEMPLATE_DESIGN_FONTS[content.templateId] ?? content.fontPair,
    fontSize: 26,
    fontWeight: 400,
    letterSpacing: 0.18,
    lineHeight: 1.6,
    align: "center",
    color: content.palette.ink,
    ...overrides,
    animation: defaultAnimation(overrides.animation?.preset ?? "fadeUp", delay),
  });
}

/**
 * Builds a complete starter design from the invitation's existing words. This
 * is what turns an older card into an editable canvas without losing any of
 * its content: every field becomes its own element.
 */
export interface BlankDesignOptions {
  width?: number;
  height?: number;
  background?: string;
  pages?: number;
  margin?: number;
  bleed?: number;
  texture?: PageTextureId;
  output?: DesignOutput;
  unit?: DesignUnit;
  /** The physical brief, in `unit`, kept for print and PDF. */
  physicalWidth?: number;
  physicalHeight?: number;
  opening?: Partial<OpeningSettings>;
  closing?: Partial<ClosingSettings>;
  transition?: Partial<PageTransition>;
}

/**
 * A genuinely empty canvas: no sample words, no border, no layers at all.
 * Everything a host does next — text, shapes, images, ornaments — is their own
 * work on their own page size.
 */
export function createBlankDesign(
  options: BlankDesignOptions = {},
): DesignDocument {
  const width = Math.max(40, Math.round(options.width ?? DESIGN_WIDTH));
  const height = Math.max(40, Math.round(options.height ?? DESIGN_HEIGHT));
  const pageCount = Math.max(1, Math.min(20, Math.round(options.pages ?? 1)));
  const background = options.background || "#fbfaf7";
  const unit = options.unit ?? "px";
  const pages: DesignPage[] = Array.from({ length: pageCount }, (_, index) => ({
    id: makeId("page"),
    name: pageCount === 1 ? "Invitation" : `Page ${index + 1}`,
    background,
    elements: [],
    width,
    height,
    margin: options.margin ?? 0,
    bleed: options.bleed ?? 0,
    texture: options.texture ?? "none",
  }));
  const format: DesignFormat = {
    output: options.output ?? "digital",
    unit,
    width: options.physicalWidth ?? fromDesignPx(width, unit),
    height: options.physicalHeight ?? fromDesignPx(height, unit),
    margin: options.margin ?? 0,
    bleed: options.bleed ?? 0,
  };
  return {
    version: 1,
    pages,
    opening: {
      experience: "none",
      duration: 2600,
      autoOpen: false,
      welcome: "For {{guest}}",
      ...options.opening,
    },
    closing: {
      enabled: false,
      style: "message",
      message: "",
      duration: 1800,
      ...options.closing,
    },
    transition: { preset: "fade", duration: 700, ...options.transition },
    format,
    startedAt: Date.now(),
  };
}

export function createDefaultDesign(content: InvitationContent): DesignDocument {
  const paired = isPairedOccasion(content.occasion);
  const accent = content.palette.accent;
  const ink = content.palette.ink;

  const elements: DesignElement[] = [
    makeElement("shape", {
      name: "Paper rule",
      shape: "line",
      x: 400,
      y: 330,
      w: 200,
      h: 2,
      fill: accent,
      opacity: 0.7,
      animation: defaultAnimation("draw", 150),
    }),
    textElement(
      "Eyebrow",
      content.eyebrow || "You are invited",
      {
        y: 250,
        h: 60,
        fontSize: 19,
        letterSpacing: 0.34,
        uppercase: true,
        opacity: 0.8,
      },
      content,
      0,
    ),
    makeElement("motif", {
      name: "Ornament",
      motif: content.motif === "none" ? "sprig" : content.motif,
      x: 430,
      y: 355,
      w: 140,
      h: 140,
      color: ink,
      opacity: 0.9,
      animation: defaultAnimation("fade", 300),
    }),
    textElement(
      "Names",
      paired
        ? `${content.names.primary || "Your name"}\n& ${content.names.secondary || "their name"}`
        : [content.names.primary || "Your name", content.names.secondary]
            .filter(Boolean)
            .join("\n"),
      {
        y: 520,
        h: 260,
        // A single name gets the display size; a name plus subtitle steps down
        // so the second line never overflows the card.
        fontSize: paired ? 92 : content.names.secondary ? 74 : 96,
        letterSpacing: -0.01,
        lineHeight: 1.04,
      },
      content,
      450,
    ),
    textElement(
      "Date & time",
      [formatEventDate(content.date), formatEventTime(content.time)]
        .filter(Boolean)
        .join(" · "),
      {
        y: 830,
        h: 50,
        fontSize: 24,
        letterSpacing: 0.16,
        uppercase: true,
      },
      content,
      900,
    ),
    textElement(
      "Venue",
      [content.venueName, content.venueAddress].filter(Boolean).join("\n"),
      {
        y: 900,
        h: 100,
        fontSize: 17,
        letterSpacing: 0.2,
        uppercase: true,
        opacity: 0.7,
      },
      content,
      1100,
    ),
    makeElement("shape", {
      name: "Rule",
      shape: "line",
      x: 430,
      y: 1030,
      w: 140,
      h: 1,
      fill: accent,
      opacity: 0.55,
      animation: defaultAnimation("draw", 1250),
    }),
    textElement(
      "Message",
      content.message,
      {
        y: 1060,
        h: 130,
        fontSize: 24,
        letterSpacing: 0,
        lineHeight: 1.7,
        italic: true,
        opacity: 0.85,
      },
      content,
      1350,
    ),
    textElement(
      "Signature",
      "LAMSA",
      {
        y: 1225,
        h: 30,
        fontSize: 14,
        letterSpacing: 0.45,
        uppercase: true,
        opacity: 0.4,
      },
      content,
      1600,
    ),
  ];

  if (content.cornerMotif && content.cornerMotif !== "none") {
    elements.unshift(
      makeElement("motif", {
        name: "Corner ornament",
        motif: content.cornerMotif,
        x: 820,
        y: 60,
        w: 120,
        h: 120,
        color: accent,
        opacity: 0.32,
        animation: defaultAnimation("fade", 200),
      }),
    );
  }

  // The written layout also shapes the default canvas: editorial invitations
  // are set flush left like a magazine, while classic and reveal layouts keep
  // the centred card. Everything remains an ordinary editable layer.
  const arranged =
    content.layout === "editorial"
      ? elements.map((element) => {
          if (element.kind === "text") {
            return { ...element, x: 110, w: 780, align: "left" as const };
          }
          if (element.kind === "shape" && element.name.toLowerCase().includes("rule")) {
            return { ...element, x: 110, w: 170 };
          }
          if (element.kind === "motif" && element.name === "Ornament") {
            return { ...element, x: 110, y: 355 };
          }
          return element;
        })
      : content.layout === "classic"
        ? elements.map((element) =>
            element.kind === "shape" && element.shape === "line"
              ? { ...element, x: 350, w: 300 }
              : element,
          )
        : elements;

  const border = makeElement("shape", {
    name: "Card frame",
    shape: "frame",
    x: 40,
    y: 40,
    w: 920,
    h: 1253,
    stroke: accent,
    strokeWidth: 2,
    radius: 2,
    fill: "transparent",
    opacity: 0.55,
    locked: true,
    animation: defaultAnimation("fade", 0),
  });

  return {
    version: 1,
    pages: [
      {
        id: makeId("page"),
        name: "Invitation",
        background: content.palette.background,
        elements: [border, ...arranged],
      },
    ],
    opening: {
      experience:
        content.layout === "envelope"
          ? "envelope"
          : content.layout === "arch"
            ? "arch"
            : content.layout === "ribbon"
              ? "curtain"
              : "none",
      duration: 2600,
      autoOpen: false,
      welcome: "For {{guest}}",
    },
    closing: {
      enabled: false,
      style: "message",
      message: paired
        ? `${content.names.primary || "With love"}\n& ${content.names.secondary || ""}`.trim()
        : content.names.primary || "With love",
      duration: 1800,
    },
    transition: { preset: "fade", duration: 700 },
    startedAt: Date.now(),
  };
}

/* -------------------------------------------------------------------------- */
/* Normalisation                                                              */
/* -------------------------------------------------------------------------- */

export function isDesignDocument(value: unknown): value is DesignDocument {
  return Boolean(
    value &&
      typeof value === "object" &&
      Array.isArray((value as DesignDocument).pages) &&
      (value as DesignDocument).pages.length > 0 &&
      (value as DesignDocument).pages.every((page) => Array.isArray(page.elements)),
  );
}

/** Repairs documents saved by older runs and fills any missing defaults. */
export function normalizeDesign(
  value: unknown,
  content: InvitationContent,
): DesignDocument {
  if (!isDesignDocument(value)) return createDefaultDesign(content);
  const fallback = createDefaultDesign(content);
  return {
    version: 1,
    pages: value.pages.map((page, index) => {
      const elements = (page.elements ?? []).map((element) => ({
        ...makeElement(element.kind ?? "shape"),
        ...element,
        // Mirroring is stored as flags, never as negative geometry, so older
        // designs load unmirrored and a flip survives every save round-trip.
        flipX: element.flipX ? true : undefined,
        flipY: element.flipY ? true : undefined,
        animation: {
          ...defaultAnimation(),
          ...(element.animation ?? {}),
          trigger:
            element.animation?.trigger === "scroll"
              ? ("scroll" as const)
              : ("load" as const),
        },
        reveal: element.reveal
          ? {
              ...element.reveal,
              interactionId: element.reveal.interactionId || makeId("interaction"),
              targetId: element.reveal.targetId || "",
              duration: element.reveal.duration ?? 900,
              direction: element.reveal.direction ?? "up",
              effect: element.reveal.effect ?? "fadeAway",
              trigger: "tap" as const,
            }
          : undefined,
      }));
      // Designs generated before the subtitle fix omitted the second name on a
      // single-name canvas. Backfill only the untouched default: the moment the
      // host edits the name wording, the text no longer matches and is left
      // exactly as they set it.
      const names = elements.find(
        (element) => element.name === "Names" && element.kind === "text",
      );
      if (
        names &&
        content.names.secondary.trim() &&
        names.text?.trim() === content.names.primary.trim()
      ) {
        names.text = `${content.names.primary}\n${content.names.secondary}`;
        names.fontSize = Math.min(names.fontSize ?? 74, 74);
      }
      return {
        id: page.id || makeId("page"),
        name: page.name || `Page ${index + 1}`,
        background: page.background || fallback.pages[0].background,
        hidden: Boolean(page.hidden),
        // A page keeps the exact geometry it was saved with. Missing fields
        // mean the classic 1000 × 1333 card, never a resize.
        width: Number(page.width) > 0 ? Number(page.width) : undefined,
        height: Number(page.height) > 0 ? Number(page.height) : undefined,
        margin: page.margin != null ? Math.max(0, Number(page.margin)) : undefined,
        bleed: page.bleed != null ? Math.max(0, Number(page.bleed)) : undefined,
        texture: PAGE_TEXTURES.some((texture) => texture.id === page.texture)
          ? page.texture
          : undefined,
        elements,
      };
    }),
    opening: {
      ...fallback.opening,
      ...(value.opening ?? {}),
      experience: value.opening?.experience ?? "none",
    },
    closing: {
      ...fallback.closing,
      ...(value.closing ?? {}),
    },
    transition: {
      ...fallback.transition,
      ...(value.transition ?? {}),
    },
    format: value.format,
    startedAt: value.startedAt,
  };
}

/* -------------------------------------------------------------------------- */
/* Style presets                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Applies a palette and typeface without rewriting unrelated content: only
 * colours that matched the old palette are remapped, so a deliberate crimson
 * accent stays a deliberate accent.
 */
export function applyStylePreset(
  design: DesignDocument,
  style: StylePreset,
  previous: { ink: string; accent: string; background: string },
): DesignDocument {
  const mapColor = (value: string | undefined) => {
    if (!value) return value;
    const normalized = value.toLowerCase();
    if (normalized === previous.ink.toLowerCase()) return style.palette.ink;
    if (normalized === previous.accent.toLowerCase()) return style.palette.accent;
    return value;
  };
  return {
    ...design,
    pages: design.pages.map((page) => ({
      ...page,
      background:
        style.background ??
        (page.background.toLowerCase() === previous.background.toLowerCase()
          ? style.palette.background
          : page.background),
      elements: page.elements.map((element) => ({
        ...element,
        // Typography is the point of a style preset; every text layer follows
        // it, while images, shapes, positions and copy are untouched.
        font: element.kind === "text" ? style.fontPair : element.font,
        color: mapColor(element.color),
        fill: mapColor(element.fill),
        stroke: mapColor(element.stroke),
      })),
    })),
  };
}

/* -------------------------------------------------------------------------- */
/* Personlisation                                                             */
/* -------------------------------------------------------------------------- */

export function personalize(text: string | undefined, guestName?: string | null): string {
  if (!text) return "";
  return text.replace(/\{\{\s*guest\s*\}\}/gi, guestName?.trim() || "you");
}

/* -------------------------------------------------------------------------- */
/* Reveal helpers                                                             */
/* -------------------------------------------------------------------------- */

export function revealTargetOf(
  page: DesignPage,
  coverId: string,
): DesignElement | null {
  const cover = page.elements.find((element) => element.id === coverId);
  if (!cover?.reveal) return null;
  return page.elements.find((element) => element.id === cover.reveal?.targetId) ?? null;
}

export function revealCoverFor(
  page: DesignPage,
  elementId: string,
): DesignElement | null {
  return (
    page.elements.find((element) => element.reveal?.targetId === elementId) ?? null
  );
}

/** Elements that should not be visible until their cover is opened. */
export function coveredElementIds(page: DesignPage): Set<string> {
  const covered = new Set<string>();
  for (const element of page.elements) {
    if (element.reveal?.targetId && !element.hidden) {
      covered.add(element.reveal.targetId);
    }
  }
  return covered;
}

/* -------------------------------------------------------------------------- */
/* Page transitions                                                           */
/* -------------------------------------------------------------------------- */

function transitionSmooth(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

function transitionWindow(p: number, start: number, end: number): number {
  return transitionSmooth((p - start) / Math.max(0.0001, end - start));
}

/**
 * The outgoing and incoming halves of one page change.
 *
 * Both pages are alive for the length of the transition: the outgoing page
 * holds the frame while the incoming page is already readable. That overlap is
 * what stops a hard switch producing a blank frame or a flash. The outgoing
 * layer is only removed once the incoming page owns the frame.
 */
export interface PageTransitionFrames {
  incoming: CSSProperties;
  outgoing: CSSProperties;
}

export function pageTransitionFrames(
  transition: PageTransition,
  progress: number,
  options: { rtl?: boolean } = {},
): PageTransitionFrames {
  const p = Math.min(1, Math.max(0, progress));
  const dir = options.rtl ? -1 : 1;
  const enter = transitionWindow(p, 0, 0.76);
  const leave = transitionWindow(p, 0.32, 1);
  const gone = p >= 1;
  const outgoingBase: CSSProperties = {
    opacity: 1 - leave,
    pointerEvents: "none",
    visibility: gone ? "hidden" : "visible",
  };

  switch (transition.preset) {
    case "slide":
      return {
        incoming: {
          opacity: transitionWindow(p, 0, 0.5),
          transform: `translateX(${(1 - enter) * 26 * dir}%)`,
        },
        outgoing: {
          ...outgoingBase,
          transform: `translateX(${-leave * 8 * dir}%)`,
        },
      };
    case "flip":
      return {
        incoming: {
          opacity: 0.35 + enter * 0.65,
          transform: `perspective(1600px) rotateY(${(1 - enter) * -16 * dir}deg)`,
          transformOrigin: options.rtl ? "right center" : "left center",
        },
        outgoing: {
          ...outgoingBase,
          transform: `scale(${1 - leave * 0.015})`,
        },
      };
    case "curtain":
      return {
        incoming: {
          clipPath: options.rtl
            ? `inset(0 0 0 ${(1 - enter) * 100}%)`
            : `inset(0 ${(1 - enter) * 100}% 0 0)`,
        },
        // The outgoing page is a stable backing, never a blank one.
        outgoing: { ...outgoingBase, opacity: 1 - transitionWindow(p, 0.94, 1) },
      };
    case "zoom":
      return {
        incoming: {
          opacity: transitionWindow(p, 0, 0.55),
          transform: `scale(${1.06 - enter * 0.06})`,
        },
        outgoing: { ...outgoingBase, transform: `scale(${1 - leave * 0.02})` },
      };
    case "blur":
      return {
        incoming: {
          opacity: transitionWindow(p, 0, 0.45),
          filter: `blur(${(1 - enter) * 12}px)`,
        },
        outgoing: {
          ...outgoingBase,
          filter: leave > 0.001 ? `blur(${leave * 8}px)` : undefined,
        },
      };
    case "rise":
      return {
        incoming: {
          opacity: transitionWindow(p, 0, 0.55),
          transform: `translateY(${(1 - enter) * 8}%)`,
        },
        outgoing: {
          ...outgoingBase,
          transform: `translateY(${-leave * 4}%)`,
        },
      };
    case "none":
      return { incoming: {}, outgoing: { opacity: 0, visibility: "hidden" } };
    case "fade":
    default:
      return {
        incoming: { opacity: transitionWindow(p, 0, 0.7) },
        outgoing: outgoingBase,
      };
  }
}

export function pageTransitionStyle(
  transition: PageTransition,
  progress: number,
): CSSProperties {
  return pageTransitionFrames(transition, progress).incoming;
}

/* -------------------------------------------------------------------------- */
/* Opening metadata                                                           */
/* -------------------------------------------------------------------------- */

export function openingHint(experience: OpeningExperienceId): string {
  switch (experience) {
    case "envelope":
      return "Break the seal";
    case "wax-seal":
      return "Press the seal";
    case "folding":
      return "Open the fold";
    case "paper":
      return "Unfold the paper";
    case "typography":
      return "Reveal the names";
    case "floral":
      return "Part the wreath";
    case "cinematic":
      return "Begin";
    case "image":
      return "Open the invitation";
    case "arch":
      return "Step through the arch";
    case "curtain":
      return "Draw the curtain";
    case "door":
      return "Open the doors";
    case "cards":
      return "Lift the card";
    case "fade":
      return "Begin";
    case "personal":
      return "Open your invitation";
    default:
      return "";
  }
}

export function defaultFontLabel(font: string | undefined): string {
  return fontNameFor(font ?? "cormorant-garamond");
}

export function elementTypeLabel(element: DesignElement): string {
  if (element.kind === "text") return "Text";
  if (element.kind === "image") return "Image";
  if (element.kind === "motif") return "Ornament";
  return "Shape";
}
