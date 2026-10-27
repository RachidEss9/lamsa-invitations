import type { EasingId } from "./design";

/**
 * The guest-driven opening engine.
 *
 * Where the timeline model in `opening-sequence` plays a saved choreography on
 * its own, this module describes an opening the *guest* performs: tap the wax
 * seal, lift the flap, pull the invitation out. The rules are pure and
 * time-independent — a state machine plus per-channel progress values — so the
 * component only has to render them and the tests can drive every interaction
 * without a browser.
 *
 * Three channels carry the whole physical scene:
 *
 *   seal  0 → intact, 1 → cracked apart and fallen away
 *   flap  0 → shut against the envelope, 1 → swung open past its hinge
 *   card  0 → seated in the pocket, 1 → drawn out and presented
 *
 * The state machine decides which channel may move and when; invalid events
 * (a tap while the seal is already breaking, a release with nothing held) are
 * ignored rather than corrupting the run, so repeated taps can never break the
 * interaction.
 */

/* -------------------------------------------------------------------------- */
/* Model                                                                      */
/* -------------------------------------------------------------------------- */

export type InteractiveOpeningSceneId = "envelope-seal";

export const INTERACTIVE_OPENING_SCENES: {
  id: InteractiveOpeningSceneId;
  label: string;
  note: string;
}[] = [
  {
    id: "envelope-seal",
    label: "Envelope & wax seal",
    note: "The guest breaks the seal, lifts the flap and pulls the card out",
  },
];

/** Every layer of the flagship scene that can carry host artwork. */
export type OpeningLayerId = "backdrop" | "body" | "flap" | "liner" | "seal";

export const OPENING_LAYERS: {
  id: OpeningLayerId;
  label: string;
  note: string;
  acceptsVideo?: boolean;
}[] = [
  {
    id: "backdrop",
    label: "Backdrop",
    note: "Behind the suite — a still or a clip",
    acceptsVideo: true,
  },
  { id: "body", label: "Envelope", note: "The pocket the invitation sits in" },
  { id: "flap", label: "Flap", note: "Hinged at the top fold" },
  { id: "liner", label: "Liner", note: "Printed inside the flap" },
  { id: "seal", label: "Wax seal", note: "Broken by the guest" },
];

/** Uploaded artwork assigned to one layer of the scene. */
export interface OpeningLayerAsset {
  /** Convex storage id; guests resolve it through the design's own URLs. */
  storageId: string;
  kind: "image" | "video";
}

export interface InteractiveOpeningMotion {
  /** Seal reaction after the tap, in ms. */
  sealMs?: number;
  /** Flap swing around its hinge, in ms. */
  flapMs?: number;
  flapEasing?: EasingId;
  /** Card drawing out of the pocket, in ms. */
  pullMs?: number;
  pullEasing?: EasingId;
}

export interface InteractiveOpeningSettings {
  enabled: boolean;
  scene: InteractiveOpeningSceneId;
  /** Artwork per layer; a missing layer falls back to the built-in vector art. */
  layers?: Partial<Record<OpeningLayerId, OpeningLayerAsset>>;
  motion?: InteractiveOpeningMotion;
}

/* -------------------------------------------------------------------------- */
/* Timing                                                                     */
/* -------------------------------------------------------------------------- */

export const INTERACTIVE_MOTION = {
  sealMs: 620,
  flapMs: 1500,
  pullMs: 1700,
} as const;

const MS_MIN = 150;
const MS_MAX = 4000;

const clampMs = (value: unknown, fallback: number) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(MS_MAX, Math.max(MS_MIN, Math.round(number)));
};

function isEasing(value: unknown): value is EasingId {
  return (
    value === "linear" ||
    value === "easeOut" ||
    value === "easeIn" ||
    value === "easeInOut" ||
    value === "backOut"
  );
}

export interface ResolvedInteractiveMotion {
  sealMs: number;
  flapMs: number;
  flapEasing: EasingId;
  pullMs: number;
  pullEasing: EasingId;
}

/** Saved timings repaired and clamped into a range that can always finish. */
export function interactiveMotionOf(
  settings: InteractiveOpeningSettings | undefined,
): ResolvedInteractiveMotion {
  const motion = settings?.motion;
  return {
    sealMs: clampMs(motion?.sealMs, INTERACTIVE_MOTION.sealMs),
    flapMs: clampMs(motion?.flapMs, INTERACTIVE_MOTION.flapMs),
    flapEasing: isEasing(motion?.flapEasing) ? motion.flapEasing : "easeInOut",
    pullMs: clampMs(motion?.pullMs, INTERACTIVE_MOTION.pullMs),
    pullEasing: isEasing(motion?.pullEasing) ? motion.pullEasing : "easeOut",
  };
}

/**
 * Repairs a loaded configuration. Anything unusable comes back as
 * `undefined`, which means "play the invitation's own opening" — a damaged
 * payload never takes the guest experience down with it.
 */
export function normalizeInteractiveOpening(
  value: unknown,
): InteractiveOpeningSettings | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Partial<InteractiveOpeningSettings>;
  if (raw.enabled !== true) return undefined;
  const scene: InteractiveOpeningSceneId = "envelope-seal";

  const layers: Partial<Record<OpeningLayerId, OpeningLayerAsset>> = {};
  if (raw.layers && typeof raw.layers === "object") {
    for (const layer of OPENING_LAYERS) {
      const asset = (raw.layers as Record<string, unknown>)[layer.id];
      if (!asset || typeof asset !== "object") continue;
      const candidate = asset as Partial<OpeningLayerAsset>;
      if (typeof candidate.storageId !== "string" || !candidate.storageId) continue;
      layers[layer.id] = {
        storageId: candidate.storageId,
        kind: candidate.kind === "video" ? "video" : "image",
      };
    }
  }

  const motion = raw.motion && typeof raw.motion === "object" ? raw.motion : undefined;
  return {
    enabled: true,
    scene,
    ...(Object.keys(layers).length > 0 ? { layers } : {}),
    ...(motion
      ? {
          motion: {
            sealMs: clampMs(motion.sealMs, INTERACTIVE_MOTION.sealMs),
            flapMs: clampMs(motion.flapMs, INTERACTIVE_MOTION.flapMs),
            flapEasing: isEasing(motion.flapEasing) ? motion.flapEasing : "easeInOut",
            pullMs: clampMs(motion.pullMs, INTERACTIVE_MOTION.pullMs),
            pullEasing: isEasing(motion.pullEasing) ? motion.pullEasing : "easeOut",
          },
        }
      : {}),
  };
}

/* -------------------------------------------------------------------------- */
/* State machine                                                              */
/* -------------------------------------------------------------------------- */

export type InteractiveStage =
  | "sealed"
  | "breaking"
  | "unsealed"
  | "lifting"
  | "open"
  | "drawing"
  | "presented";

export interface InteractiveState {
  stage: InteractiveStage;
  /** Live drag progress of the held channel, 0 → 1. */
  drag: number;
}

export type InteractiveEvent =
  /** A tap or click on whatever the current stage offers. */
  | { type: "activate" }
  /** The guest holds and moves; progress is 0 → 1 along the gesture. */
  | { type: "drag"; progress: number }
  /** The guest lets go; below the threshold the movement springs back. */
  | { type: "release"; progress: number }
  /** A channel finished its tween. */
  | { type: "settled" }
  /** Replay: every layer returns to its original position. */
  | { type: "replay" };

/** A release past this fraction completes the movement. */
export const INTERACTIVE_DRAG_THRESHOLD = 0.42;

/** Stages where input must be ignored while a movement runs. */
export function interactiveBusy(stage: InteractiveStage): boolean {
  return stage === "breaking" || stage === "lifting" || stage === "drawing";
}

export function initialInteractiveState(): InteractiveState {
  return { stage: "sealed", drag: 0 };
}

/** The stage after a running movement finishes; null when nothing was running. */
export function stageAfterSettling(stage: InteractiveStage): InteractiveStage | null {
  switch (stage) {
    case "breaking":
      return "unsealed";
    case "lifting":
      return "open";
    case "drawing":
      return "presented";
    default:
      return null;
  }
}

/** The gesture the guest should perform at each stage. */
export function interactiveHint(
  stage: InteractiveStage,
  variant: "full" | "cover" = "full",
): string | null {
  switch (stage) {
    case "sealed":
      return "Tap the seal to begin";
    case "unsealed":
      return "Lift the flap";
    case "open":
      return variant === "cover" ? null : "Pull the card out";
    case "presented":
      return variant === "cover" ? null : "Tap to open the invitation";
    default:
      return null;
  }
}

/**
 * The single authority on state changes. Events that do not belong to the
 * current stage return the state unchanged, which is what makes repeated or
 * impatient taps harmless.
 */
export function reduceInteractive(
  state: InteractiveState,
  event: InteractiveEvent,
): InteractiveState {
  switch (event.type) {
    case "replay":
      return initialInteractiveState();

    case "settled": {
      const next = stageAfterSettling(state.stage);
      // Only a running movement settles, and only into its own successor.
      return next ? { stage: next, drag: 0 } : state;
    }

    case "activate": {
      if (interactiveBusy(state.stage)) return state;
      switch (state.stage) {
        case "sealed":
          return { stage: "breaking", drag: 0 };
        case "unsealed":
          return { stage: "lifting", drag: 0 };
        case "open":
          return { stage: "drawing", drag: 0 };
        default:
          // breaking / open-after-tap / presented: nothing to do.
          return state;
      }
    }

    case "drag": {
      const progress = clamp01(event.progress);
      // Only the flap and the card are draggable, and only while they wait.
      if (state.stage === "unsealed" || state.stage === "open") {
        return { ...state, drag: progress };
      }
      return state;
    }

    case "release": {
      const progress = clamp01(event.progress);
      if (state.stage !== "unsealed" && state.stage !== "open") return state;
      if (progress >= INTERACTIVE_DRAG_THRESHOLD) {
        return { stage: state.stage === "unsealed" ? "lifting" : "drawing", drag: progress };
      }
      // A half-hearted pull springs back rather than stalling halfway.
      return { ...state, drag: 0 };
    }

    default:
      return state;
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

/* -------------------------------------------------------------------------- */
/* Derived values                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Which channel moves in a given stage, so the renderer and the tests read the
 * same picture: the seal cracks while breaking, the flap swings while lifting,
 * the card draws while presenting.
 */
export function channelForStage(
  stage: InteractiveStage,
): "seal" | "flap" | "card" | null {
  switch (stage) {
    case "breaking":
      return "seal";
    case "lifting":
      return "flap";
    case "drawing":
      return "card";
    default:
      return null;
  }
}

/**
 * The settled value of each channel — what replay and step previews render.
 * A guest who has not started sees everything shut; a preview can also pin an
 * exact stage for the editor.
 */
export function channelsForStage(stage: InteractiveStage): {
  seal: number;
  flap: number;
  card: number;
} {
  switch (stage) {
    case "sealed":
      return { seal: 0, flap: 0, card: 0 };
    case "breaking":
      return { seal: 0, flap: 0, card: 0 };
    case "unsealed":
      return { seal: 1, flap: 0, card: 0 };
    case "lifting":
      return { seal: 1, flap: 0, card: 0 };
    case "open":
      return { seal: 1, flap: 1, card: 0 };
    case "drawing":
      return { seal: 1, flap: 1, card: 0 };
    case "presented":
      return { seal: 1, flap: 1, card: 1 };
  }
}

/** Which saved stage a preview scrub position shows. */
export function stageFromProgress(progress: number): InteractiveStage {
  const value = clamp01(progress);
  if (value < 0.2) return "sealed";
  if (value < 0.45) return "unsealed";
  if (value < 0.72) return "open";
  return "presented";
}

/* -------------------------------------------------------------------------- */
/* Easing                                                                     */
/* -------------------------------------------------------------------------- */

/** The same curves the editor offers, as CSS timing functions. */
export function easingCss(easing: EasingId): string {
  switch (easing) {
    case "linear":
      return "linear";
    case "easeIn":
      return "cubic-bezier(0.55, 0.055, 0.675, 0.19)";
    case "easeInOut":
      return "cubic-bezier(0.645, 0.045, 0.355, 1)";
    case "backOut":
      return "cubic-bezier(0.175, 0.885, 0.32, 1.275)";
    case "easeOut":
    default:
      return "cubic-bezier(0.215, 0.61, 0.355, 1)";
  }
}

/** The same curves evaluated in script, for the tween loop. */
export function easingValue(easing: EasingId, progress: number): number {
  const t = clamp01(progress);
  switch (easing) {
    case "linear":
      return t;
    case "easeIn":
      return t * t * t;
    case "easeInOut":
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    case "backOut": {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
    case "easeOut":
    default:
      return 1 - Math.pow(1 - t, 3);
  }
}