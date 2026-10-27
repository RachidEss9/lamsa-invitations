import {
  OPENING_TIMELINES,
  openingFrame,
  openingRunDuration,
  openingTimeline,
  type OpeningFrame,
  type OpeningPresetId,
} from "./opening";
import type {
  EasingId,
  EnvelopeSettings,
  OpeningExperienceId,
  OpeningSettings,
} from "./design";

/**
 * One movement of an opening sequence. Steps run in list order: `delay` is the
 * gap before this step starts (a negative value overlaps the previous one), and
 * `duration` is how long the movement takes, in milliseconds.
 */
export interface OpeningStep {
  /** Stable id, so a step can be selected and reordered safely. */
  id: string;
  /** Which part of the stage the step drives. */
  role: OpeningStepRole;
  /** Gap before this step, in ms. Negative overlaps the previous step. */
  delay: number;
  /** Length of this step, in ms. */
  duration: number;
  /** Easing applied across this step alone. */
  easing: EasingId;
  /** Optional name shown in the sequence editor. */
  label?: string;
}

/**
 * The four things an opening can actually animate — one for each channel the
 * stage reads. Nothing else is offered, so every step in the editor has a real
 * effect on the published opening.
 */
export type OpeningStepRole = "seal" | "cover" | "card" | "exit";

export const OPENING_STEP_ROLES: {
  id: OpeningStepRole;
  label: string;
  note: string;
}[] = [
  { id: "seal", label: "Seal breaks", note: "The wax cracks and falls away" },
  { id: "cover", label: "Cover opens", note: "Flap, fold, doors or panels swing aside" },
  { id: "card", label: "Invitation emerges", note: "The real card rises into frame" },
  { id: "exit", label: "Suite clears", note: "The packaging drifts out of the way" },
];

/**
 * The physical opening, written as an ordered sequence of movements.
 *
 * A sequence is a list of steps — seal, cover, card, exit — each with a gap,
 * a length and an easing. Steps run in list order, so reordering them really
 * reorders the choreography, and a negative gap overlaps the previous step the
 * way a real envelope does (the flap is still swinging when the card starts to
 * rise).
 *
 * The stage keeps rendering exactly what it always rendered: the same four
 * channels the preset timelines drive. A sequence only replaces *when* those
 * channels move, so every scene — envelope, gatefold, box, fade — reads it
 * without a single renderer change. Invitations saved before sequences existed
 * have no sequence at all and fall through to the preset's own timeline.
 *
 * Everything here is pure and time-driven, so the tests can assert the card is
 * still sealed at 0 ms, that reordering steps changes the run, and that a
 * missing sequence behaves exactly as it always has.
 */

export const SEQUENCE_MIN_MS = 1200;
export const SEQUENCE_MAX_MS = 15000;
const STEP_MIN_MS = 120;
const STEP_MAX_MS = 6000;
const GAP_MIN_MS = -4000;
const GAP_MAX_MS = 8000;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const clamp01 = (value: number) => clamp(value, 0, 1);

/* -------------------------------------------------------------------------- */
/* Easing                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Easing across a single step. The curves mirror the CSS easings the rest of
 * the editor uses, evaluated in script because the stage interpolates frame by
 * frame instead of letting the browser tween it.
 */
export function easingValue(easing: EasingId | undefined, progress: number): number {
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

/* -------------------------------------------------------------------------- */
/* Timing                                                                     */
/* -------------------------------------------------------------------------- */

export interface SequenceWindow {
  step: OpeningStep;
  start: number;
  end: number;
}

/**
 * Absolute start and end times, in list order. Each step begins after the
 * previous one ends plus its own gap; a negative gap pulls it back into the
 * previous movement, and a step can never start before the sequence does.
 */
export function sequenceWindows(steps: OpeningStep[]): SequenceWindow[] {
  let previousEnd = 0;
  return steps.map((step, index) => {
    const duration = clamp(step.duration, STEP_MIN_MS, STEP_MAX_MS);
    const gap = clamp(step.delay, GAP_MIN_MS, GAP_MAX_MS);
    const start = index === 0 ? Math.max(0, gap) : Math.max(0, previousEnd + gap);
    const end = start + duration;
    previousEnd = end;
    return { step: { ...step, duration, delay: gap }, start, end };
  });
}

/** The whole run, clamped so a saved sequence can never hang a guest. */
export function sequenceTotalMs(steps: OpeningStep[]): number {
  if (steps.length === 0) return SEQUENCE_MIN_MS;
  const total = Math.max(...sequenceWindows(steps).map((window) => window.end));
  return clamp(total, SEQUENCE_MIN_MS, SEQUENCE_MAX_MS);
}

/** The running length of an opening: its sequence when it has one, else the saved duration. */
export function openingDurationOf(opening: OpeningSettings): number {
  if (opening.sequence && opening.sequence.length > 0) {
    return sequenceTotalMs(opening.sequence);
  }
  return openingRunDuration(opening.duration);
}

let stepCounter = 0;

function makeStepId(): string {
  stepCounter += 1;
  return `step_${stepCounter}`;
}

/**
 * A freshly minted step for the sequence editor. Ids are unique within the
 * session so reordering and selecting never collide, and the timings start
 * inside the clamped model range.
 */
export function makeStep(
  role: OpeningStepRole,
  overrides: Partial<Omit<OpeningStep, "role">> = {},
): OpeningStep {
  return {
    id: makeStepId(),
    role,
    delay: 0,
    duration: 900,
    easing: "easeOut",
    ...overrides,
  };
}

/**
 * Repairs a loaded sequence: junk roles, timings and easings are dropped or
 * clamped, and the host's order is preserved. An unusable sequence comes back
 * as `undefined`, which means "use the preset's own timeline".
 */
export function normalizeSequence(value: unknown): OpeningStep[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const steps: OpeningStep[] = [];
  for (const raw of value.slice(0, 24)) {
    if (!raw || typeof raw !== "object") continue;
    const candidate = raw as Partial<OpeningStep>;
    const role = candidate.role;
    if (!OPENING_STEP_ROLES.some((entry) => entry.id === role)) continue;
    const duration = Number(candidate.duration);
    const delay = Number(candidate.delay);
    const easing = candidate.easing;
    steps.push({
      id:
        typeof candidate.id === "string" && candidate.id
          ? candidate.id
          : `step_${steps.length + 1}`,
      role: role as OpeningStepRole,
      delay: Number.isFinite(delay) ? clamp(delay, GAP_MIN_MS, GAP_MAX_MS) : 0,
      duration: Number.isFinite(duration)
        ? clamp(duration, STEP_MIN_MS, STEP_MAX_MS)
        : 900,
      easing: isEasingId(easing) ? easing : "easeOut",
      ...(typeof candidate.label === "string" && candidate.label
        ? { label: candidate.label.slice(0, 60) }
        : {}),
    });
  }
  return steps.length > 0 ? steps : undefined;
}

function isEasingId(value: unknown): value is EasingId {
  return (
    value === "easeOut" ||
    value === "easeInOut" ||
    value === "linear" ||
    value === "backOut" ||
    value === "easeIn"
  );
}

/* -------------------------------------------------------------------------- */
/* Frame evaluation                                                           */
/* -------------------------------------------------------------------------- */

function channelProgress(
  windows: SequenceWindow[],
  role: OpeningStepRole,
  elapsed: number,
): number {
  let value = 0;
  for (const window of windows) {
    if (window.step.role !== role) continue;
    const span = Math.max(1, window.end - window.start);
    const raw = (elapsed - window.start) / span;
    value = Math.max(value, easingValue(window.step.easing, raw));
  }
  return value;
}

/**
 * The opening at a moment in time, driven by the host's own sequence. A channel
 * the sequence does not mention keeps the preset's own window, so a two-step
 * sequence still breaks the seal at the right speed instead of freezing it.
 */
export function sequenceFrame(
  steps: OpeningStep[],
  elapsedMs: number,
  preset: OpeningPresetId,
  motion?: { startScale?: number; rise?: number; cardStart?: number },
): OpeningFrame {
  const timeline = openingTimeline(preset, motion);
  const windows = sequenceWindows(steps);
  const total = sequenceTotalMs(steps);
  const elapsed = clamp(elapsedMs, 0, total);
  const progress = total > 0 ? clamp01(elapsed / total) : 1;

  const legacy = openingFrame(preset, progress, motion);

  const cover = windows.some((window) => window.step.role === "cover")
    ? channelProgress(windows, "cover", elapsed)
    : legacy.frame;
  const card = windows.some((window) => window.step.role === "card")
    ? channelProgress(windows, "card", elapsed)
    : legacy.card;
  const exit = windows.some((window) => window.step.role === "exit")
    ? channelProgress(windows, "exit", elapsed)
    : legacy.retreat;
  // A sealed suite whose sequence says nothing about the seal still cracks it
  // as the cover moves — never a wax disc left floating beside a settled card.
  const seal = windows.some((window) => window.step.role === "seal")
    ? channelProgress(windows, "seal", elapsed)
    : cover;

  const settled = progress >= 1;
  return {
    preset,
    progress,
    frame: clamp01(cover),
    card: clamp01(card),
    seal: clamp01(seal),
    retreat: clamp01(exit),
    cardScale: timeline.fromScale + (1 - timeline.fromScale) * clamp01(card),
    cardOffsetY: timeline.fromY * (1 - clamp01(card)),
    cardRotate: timeline.fromRotate * (1 - clamp01(card)),
    cardRadius: 14 * (1 - clamp01(card)),
    cardShadow: 0.45 * (1 - clamp01(card)),
    concealed: card <= 0.001,
    settled,
  };
}

/**
 * The frame for an opening, sequence or not. An invitation without a sequence
 * follows the exact legacy path, so older published links behave identically.
 */
export function frameForOpening(
  opening: OpeningSettings,
  progress: number,
): OpeningFrame {
  const preset: OpeningPresetId = opening.experience === "none" ? "fade" : opening.experience;
  const steps = opening.sequence;
  if (!steps || steps.length === 0) {
    return openingFrame(preset, progress, opening.motion);
  }
  return sequenceFrame(steps, progress * sequenceTotalMs(steps), preset, opening.motion);
}

/* -------------------------------------------------------------------------- */
/* Defaults                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The preset's own choreography, written as steps: what the timeline windows
 * already do, expressed so the host can edit it. Used when a sequence is first
 * created and when it is reset.
 */
export function defaultSequence(
  preset: OpeningPresetId,
  totalMs = 2600,
): OpeningStep[] {
  const timeline = OPENING_TIMELINES[preset] ?? OPENING_TIMELINES.fade;
  const total = clamp(totalMs, SEQUENCE_MIN_MS, SEQUENCE_MAX_MS);
  const window = (start: number, end: number) => ({
    start: Math.round(clamp(start, 0, 1) * total),
    end: Math.round(clamp(end, 0, 1) * total),
  });
  const cover = window(timeline.frameStart, timeline.frameEnd);
  const card = window(timeline.cardStart, timeline.cardEnd);
  const exit = window(Math.max(0.72, timeline.frameEnd - 0.08), 1);

  const steps: { role: OpeningStepRole; start: number; end: number; easing: EasingId }[] = [];
  if (preset === "envelope" || preset === "wax-seal") {
    steps.push({ role: "seal", start: 0, end: Math.round(total * 0.24), easing: "easeOut" });
  }
  steps.push({ role: "cover", ...cover, easing: "easeInOut" });
  steps.push({ role: "card", ...card, easing: "easeOut" });
  steps.push({ role: "exit", ...exit, easing: "easeIn" });

  // Convert absolute windows into the list's gap model.
  let previousEnd = 0;
  return steps.map((entry, index) => {
    const delay = index === 0 ? entry.start : entry.start - previousEnd;
    previousEnd = entry.end;
    return {
      id: makeStepId(),
      role: entry.role,
      delay,
      duration: Math.max(STEP_MIN_MS, entry.end - entry.start),
      easing: entry.easing,
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Opening templates                                                          */
/* -------------------------------------------------------------------------- */

export interface OpeningTemplate {
  id: string;
  name: string;
  note: string;
  experience: OpeningExperienceId;
  /** Part visibility for the envelope suite; other suites ignore it. */
  stationery?: Partial<EnvelopeSettings>;
  /** Step definitions without ids; ids are minted when the template is applied. */
  steps: { role: OpeningStepRole; delay: number; duration: number; easing: EasingId }[];
}

/**
 * The seven sequences the studio ships: every one is a real scene the stage
 * already renders, edited step by step after it is applied. Nothing here is a
 * preview-only stub — applying a template writes an ordinary sequence that the
 * host can then reorder, retime, or reset.
 */
export const OPENING_TEMPLATES: OpeningTemplate[] = [
  {
    id: "classic-envelope",
    name: "Classic envelope",
    note: "The flap lifts and the card rises out of a plain envelope",
    experience: "envelope",
    stationery: { showFlap: true, showLiner: false, showSeal: false },
    steps: [
      { role: "cover", delay: 0, duration: 1400, easing: "easeInOut" },
      { role: "card", delay: -800, duration: 1600, easing: "easeOut" },
      { role: "exit", delay: -400, duration: 900, easing: "easeIn" },
    ],
  },
  {
    id: "lined-envelope",
    name: "Envelope with liner",
    note: "A printed liner shows as the flap folds back",
    experience: "envelope",
    stationery: { showFlap: true, showLiner: true, showSeal: false },
    steps: [
      { role: "cover", delay: 0, duration: 1500, easing: "easeInOut" },
      { role: "card", delay: -850, duration: 1700, easing: "easeOut" },
      { role: "exit", delay: -450, duration: 900, easing: "easeIn" },
    ],
  },
  {
    id: "sealed-envelope",
    name: "Wax-seal reveal",
    note: "The seal cracks, the flap lifts, the invitation follows",
    experience: "wax-seal",
    stationery: { showFlap: true, showLiner: true, showSeal: true },
    steps: [
      { role: "seal", delay: 0, duration: 500, easing: "easeOut" },
      { role: "cover", delay: -250, duration: 1400, easing: "easeInOut" },
      { role: "card", delay: -750, duration: 1600, easing: "easeOut" },
      { role: "exit", delay: -400, duration: 900, easing: "easeIn" },
    ],
  },
  {
    id: "gatefold",
    name: "Gatefold",
    note: "Two panels part from the centre to present the card",
    experience: "folding",
    steps: [
      { role: "cover", delay: 0, duration: 1500, easing: "easeInOut" },
      { role: "card", delay: -900, duration: 1600, easing: "easeOut" },
      { role: "exit", delay: -300, duration: 900, easing: "easeIn" },
    ],
  },
  {
    id: "folded-card",
    name: "Folded card",
    note: "A creased card flattens open, then lifts its invitation",
    experience: "paper",
    steps: [
      { role: "cover", delay: 0, duration: 1300, easing: "easeInOut" },
      { role: "card", delay: -800, duration: 1500, easing: "easeOut" },
      { role: "exit", delay: -300, duration: 800, easing: "easeIn" },
    ],
  },
  {
    id: "gift-box",
    name: "Keepsake box",
    note: "A lidded box opens and lifts the invitation from inside",
    experience: "box",
    steps: [
      { role: "cover", delay: 0, duration: 1500, easing: "easeInOut" },
      { role: "card", delay: -850, duration: 1700, easing: "easeOut" },
      { role: "exit", delay: -350, duration: 900, easing: "easeIn" },
    ],
  },
  {
    id: "fade-slide",
    name: "Fade and slide",
    note: "The quiet option: a soft cross-fade into the invitation",
    experience: "fade",
    steps: [
      { role: "cover", delay: 0, duration: 900, easing: "easeOut" },
      { role: "card", delay: -500, duration: 1400, easing: "easeOut" },
      { role: "exit", delay: -300, duration: 700, easing: "linear" },
    ],
  },
];

export function openingTemplateById(id: string): OpeningTemplate | undefined {
  return OPENING_TEMPLATES.find((template) => template.id === id);
}

/**
 * Applies a template to the invitation's own opening: wording, guest name and
 * uploaded cover stay, the suite's size stays, and the sequence is written as
 * ordinary editable steps.
 */
export function applyOpeningTemplate(
  template: OpeningTemplate,
  current: OpeningSettings,
): OpeningSettings {
  // Ids are minted fresh on every application, so re-applying a template can
  // never leave two steps claiming the same identity in the editor.
  const steps: OpeningStep[] = template.steps.map((step) =>
    makeStep(step.role, {
      delay: step.delay,
      duration: step.duration,
      easing: step.easing,
    }),
  );
  return {
    ...current,
    experience: template.experience,
    sequence: steps,
    ...(template.stationery
      ? {
          stationery: {
            width: current.stationery?.width ?? 114,
            height: current.stationery?.height ?? 162,
            ...current.stationery,
            ...template.stationery,
          },
        }
      : {}),
  };
}