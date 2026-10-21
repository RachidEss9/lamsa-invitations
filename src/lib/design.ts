import type { CSSProperties } from "react";
import {
  fontPairById,
  formatEventDate,
  formatEventTime,
  isPairedOccasion,
  type FontPairId,
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
  | "draw";

export const ANIMATION_PRESETS: {
  id: AnimationPresetId;
  label: string;
  group: "Text" | "Image" | "Shape" | "Reveal";
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
  | "frame";

export const SHAPES: { id: ShapeKind; label: string }[] = [
  { id: "rect", label: "Rectangle" },
  { id: "ellipse", label: "Ellipse" },
  { id: "line", label: "Rule" },
  { id: "heart", label: "Heart" },
  { id: "arch", label: "Arch" },
  { id: "leaf", label: "Leaf" },
  { id: "star", label: "Star" },
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
  opacity: number;
  locked: boolean;
  hidden: boolean;
  groupId?: string;

  text?: string;
  font?: FontPairId;
  fontSize?: number;
  fontWeight?: number;
  italic?: boolean;
  uppercase?: boolean;
  letterSpacing?: number;
  lineHeight?: number;
  align?: "left" | "center" | "right";
  color?: string;

  shape?: ShapeKind;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;

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
}

export function visiblePages(design: DesignDocument): DesignPage[] {
  const shown = design.pages.filter((page) => !page.hidden);
  return shown.length > 0 ? shown : design.pages.slice(0, 1);
}

export type OpeningExperienceId =
  | "none"
  | "envelope"
  | "arch"
  | "curtain"
  | "door"
  | "cards"
  | "fade"
  | "personal";

export const OPENING_EXPERIENCES: {
  id: OpeningExperienceId;
  label: string;
  note: string;
}[] = [
  { id: "envelope", label: "Envelope", note: "A wax seal cracks a crimson envelope open" },
  { id: "arch", label: "Glowing arch", note: "A lit arch opens onto the invitation" },
  { id: "curtain", label: "Curtain", note: "Two heavy panels part slowly" },
  { id: "door", label: "Double doors", note: "Panelled doors swing inward" },
  { id: "cards", label: "Layered cards", note: "Stacked paper lifts away one by one" },
  { id: "fade", label: "Cinematic fade", note: "A slow reveal from darkness" },
  { id: "personal", label: "Personal welcome", note: "A named greeting before the card" },
  { id: "none", label: "No opening", note: "Opens directly on the first page" },
];

export interface OpeningSettings {
  experience: OpeningExperienceId;
  duration: number;
  autoOpen: boolean;
  welcome: string;
  coverStorageId?: string;
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

export type PageTransitionId = "none" | "fade" | "slide" | "curtain" | "flip";

export const PAGE_TRANSITIONS: {
  id: PageTransitionId;
  label: string;
  note: string;
}[] = [
  { id: "fade", label: "Cross-fade", note: "One page dissolves into the next" },
  { id: "slide", label: "Slide", note: "The next page slides across" },
  { id: "curtain", label: "Curtain", note: "A panel sweeps the change" },
  { id: "flip", label: "Flip", note: "A quiet card turn" },
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
  startedAt?: number;
}

export interface StylePreset {
  palette: { background: string; ink: string; accent: string };
  fontPair: FontPairId;
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
  const base: CSSProperties = {
    opacity: element.opacity,
    transform: `rotate(${element.rotation}deg)`,
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
  let transform = `${motion.transform ? `${motion.transform} ` : ""}rotate(${element.rotation}deg)`;
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
    font: content.fontPair,
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
        elements: [border, ...elements],
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
        page.background.toLowerCase() === previous.background.toLowerCase()
          ? style.palette.background
          : page.background,
      elements: page.elements.map((element) => ({
        ...element,
        font:
          element.kind === "text" && element.color?.toLowerCase() === previous.ink.toLowerCase()
            ? style.fontPair
            : element.font,
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

export function pageTransitionStyle(
  transition: PageTransition,
  progress: number,
): CSSProperties {
  const p = Math.min(1, Math.max(0, progress));
  switch (transition.preset) {
    case "slide":
      return { opacity: 1, transform: `translateX(${(1 - p) * 24}%)` };
    case "flip":
      return {
        opacity: p,
        transform: `perspective(1600px) rotateY(${(1 - p) * -18}deg)`,
      };
    case "curtain":
      return { opacity: p, clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` };
    case "fade":
      return { opacity: p };
    case "none":
    default:
      return {};
  }
}

/* -------------------------------------------------------------------------- */
/* Opening metadata                                                           */
/* -------------------------------------------------------------------------- */

export function openingHint(experience: OpeningExperienceId): string {
  switch (experience) {
    case "envelope":
      return "Break the seal";
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

export function defaultFontLabel(font: FontPairId | undefined): string {
  return font ? fontPairById(font).label : "Romance";
}

export function elementTypeLabel(element: DesignElement): string {
  if (element.kind === "text") return "Text";
  if (element.kind === "image") return "Image";
  if (element.kind === "motif") return "Ornament";
  return "Shape";
}
