import type { OpeningExperienceId } from "./design";

/**
 * The physical choreography of an opening.
 *
 * Every preset shows the same real invitation card — the first saved section —
 * handled by a different metaphor: an envelope it slides out of, doors it stands
 * behind, a fold it is wrapped in. This module owns only the numbers (when the
 * frame moves, when the card emerges, where it starts) so the stage, the editor
 * preview, and the tests all read the same timeline.
 *
 * Coordinates are in design pixels of the 1000 × 1333 canvas, so the exact same
 * choreography plays at poster size in the editor preview and on a phone.
 */

export type OpeningPresetId = Exclude<OpeningExperienceId, "none">;

export interface OpeningTimeline {
  preset: OpeningPresetId;
  /** The card starts to leave the frame at this fraction of the opening. */
  cardStart: number;
  /** The card has fully settled in the centre at this fraction. */
  cardEnd: number;
  /** The frame (envelope, doors, curtain…) starts to move aside. */
  frameStart: number;
  /** The frame has fully retreated. */
  frameEnd: number;
  /** Card scale while it is still held by the frame. */
  fromScale: number;
  /** Card offset (design px, positive is downward) while still held. */
  fromY: number;
  /** Slight card rotation while still held, in degrees. */
  fromRotate: number;
}

/**
 * Each preset's individual timing. The card always travels from a smaller,
 * partly hidden position to the full frame — what differs is how long the
 * frame takes to admit it, and whether it is pulled up out of a pocket, stood
 * behind doors, or revealed under lifting paper.
 */
export const OPENING_TIMELINES: Record<OpeningPresetId, OpeningTimeline> = {
  envelope: {
    preset: "envelope",
    // The flap has swung most of the way before the card starts to rise.
    cardStart: 0.34,
    cardEnd: 0.9,
    frameStart: 0.05,
    frameEnd: 0.62,
    fromScale: 0.6,
    fromY: 560,
    fromRotate: 0,
  },
  "wax-seal": {
    preset: "wax-seal",
    cardStart: 0.4,
    cardEnd: 0.92,
    frameStart: 0.08,
    frameEnd: 0.66,
    fromScale: 0.62,
    fromY: 500,
    fromRotate: -1.5,
  },
  arch: {
    preset: "arch",
    cardStart: 0.08,
    cardEnd: 0.86,
    frameStart: 0.12,
    frameEnd: 0.9,
    fromScale: 0.8,
    fromY: 150,
    fromRotate: 0,
  },
  curtain: {
    preset: "curtain",
    cardStart: 0.04,
    cardEnd: 0.74,
    frameStart: 0.04,
    frameEnd: 0.86,
    fromScale: 0.82,
    fromY: 20,
    fromRotate: 0,
  },
  door: {
    preset: "door",
    cardStart: 0.06,
    cardEnd: 0.82,
    frameStart: 0.04,
    frameEnd: 0.64,
    fromScale: 0.84,
    fromY: 40,
    fromRotate: 0,
  },
  cards: {
    preset: "cards",
    cardStart: 0.28,
    cardEnd: 0.9,
    frameStart: 0.16,
    frameEnd: 0.86,
    fromScale: 0.58,
    fromY: 300,
    fromRotate: 3,
  },
  folding: {
    preset: "folding",
    cardStart: 0.14,
    cardEnd: 0.86,
    frameStart: 0.05,
    frameEnd: 0.88,
    fromScale: 0.72,
    fromY: 40,
    fromRotate: 0,
  },
  box: {
    preset: "box",
    // The lid has cleared the tray before the card starts to rise.
    cardStart: 0.3,
    cardEnd: 0.9,
    frameStart: 0.06,
    frameEnd: 0.6,
    fromScale: 0.66,
    fromY: 420,
    fromRotate: 0,
  },
  paper: {
    preset: "paper",
    cardStart: 0.02,
    cardEnd: 0.78,
    frameStart: 0.04,
    frameEnd: 0.8,
    fromScale: 0.78,
    fromY: 30,
    fromRotate: -1,
  },
  typography: {
    preset: "typography",
    cardStart: 0.16,
    cardEnd: 0.88,
    frameStart: 0.08,
    frameEnd: 0.8,
    fromScale: 0.74,
    fromY: 90,
    fromRotate: 0,
  },
  floral: {
    preset: "floral",
    cardStart: 0.1,
    cardEnd: 0.82,
    frameStart: 0.08,
    frameEnd: 0.86,
    fromScale: 0.8,
    fromY: 30,
    fromRotate: 0,
  },
  cinematic: {
    preset: "cinematic",
    cardStart: 0.02,
    cardEnd: 0.86,
    frameStart: 0.06,
    frameEnd: 0.92,
    fromScale: 1.06,
    fromY: 0,
    fromRotate: 0,
  },
  image: {
    preset: "image",
    cardStart: 0.22,
    cardEnd: 0.9,
    frameStart: 0.12,
    frameEnd: 0.9,
    fromScale: 0.9,
    fromY: 30,
    fromRotate: 0,
  },
  fade: {
    preset: "fade",
    cardStart: 0.18,
    cardEnd: 0.82,
    frameStart: 0.04,
    frameEnd: 0.88,
    fromScale: 0.98,
    fromY: 0,
    fromRotate: 0,
  },
  personal: {
    preset: "personal",
    cardStart: 0.22,
    cardEnd: 0.9,
    frameStart: 0.1,
    frameEnd: 0.86,
    fromScale: 0.84,
    fromY: 60,
    fromRotate: 0,
  },
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** A smoothstep window: 0 before `start`, 1 after `end`, eased in between. */
function windowProgress(progress: number, start: number, end: number): number {
  const raw = clamp01((progress - start) / Math.max(0.0001, end - start));
  return raw * raw * (3 - 2 * raw);
}

export interface OpeningFrame {
  preset: OpeningPresetId;
  progress: number;
  /** 0 → the frame is fully shut; 1 → it is out of the way. */
  frame: number;
  /** 0 → the invitation is still held inside; 1 → settled in the centre. */
  card: number;
  /** 0 → the seal is intact; 1 → cracked and gone. */
  seal: number;
  /** How far the whole apparatus has receded, for the final hand-off. */
  retreat: number;
  cardScale: number;
  cardOffsetY: number;
  cardRotate: number;
  cardRadius: number;
  cardShadow: number;
  /** True while the invitation is still physically behind the front surface. */
  concealed: boolean;
  settled: boolean;
}

export function openingPresetOf(
  experience: OpeningExperienceId,
): OpeningPresetId | null {
  return experience === "none" ? null : experience;
}

function clampNumber(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export interface OpeningMotionInput {
  startScale?: number;
  rise?: number;
  cardStart?: number;
}

/**
 * The preset's timeline with the designer's saved overrides applied. Values are
 * clamped to a believable range so a saved configuration can never place the
 * card off the artboard or hold it inside the frame forever.
 */
export function openingTimeline(
  preset: OpeningPresetId,
  motion?: OpeningMotionInput,
): OpeningTimeline {
  const base = OPENING_TIMELINES[preset] ?? OPENING_TIMELINES.fade;
  if (!motion) return base;
  const fromScale = clampNumber(motion.startScale, 0.35, 1.15, base.fromScale);
  const fromY = clampNumber(motion.rise, 0, 900, base.fromY);
  const cardStart = clampNumber(motion.cardStart, 0, 0.7, base.cardStart);
  return {
    ...base,
    fromScale,
    fromY,
    cardStart,
    // The emergence always gets at least a fifth of the run to read as motion.
    cardEnd: Math.max(base.cardEnd, cardStart + 0.2),
  };
}

/**
 * Evaluates the opening at a moment in time. Pure, so the tests can assert the
 * card really is inside the envelope before the flap moves and really has
 * reached the full frame when the opening completes.
 */
export function openingFrame(
  preset: OpeningPresetId,
  progress: number,
  motion?: OpeningMotionInput,
): OpeningFrame {
  const timeline = openingTimeline(preset, motion);
  const raw = clamp01(progress);
  const card = windowProgress(raw, timeline.cardStart, timeline.cardEnd);
  const frame = windowProgress(raw, timeline.frameStart, timeline.frameEnd);
  const seal = windowProgress(raw, 0, 0.24);
  const retreat = windowProgress(raw, Math.max(0.72, timeline.frameEnd - 0.08), 1);

  return {
    preset: timeline.preset,
    progress: raw,
    frame,
    card,
    seal,
    retreat,
    cardScale: timeline.fromScale + (1 - timeline.fromScale) * card,
    cardOffsetY: timeline.fromY * (1 - card),
    cardRotate: timeline.fromRotate * (1 - card),
    cardRadius: 14 * (1 - card),
    cardShadow: 0.45 * (1 - card),
    concealed: card <= 0.001,
    settled: raw >= 1,
  };
}

/**
 * A short floor keeps the story readable (a 900 ms setting would otherwise
 * jump); the ceiling prevents a saved long duration from making guests wait.
 */
export const OPENING_MIN_DURATION = 2400;
export const OPENING_MAX_DURATION = 3600;

export function openingRunDuration(configured: number): number {
  const value = Number.isFinite(configured) ? configured : OPENING_MIN_DURATION;
  return Math.min(
    OPENING_MAX_DURATION,
    Math.max(OPENING_MIN_DURATION, Math.round(value)),
  );
}
