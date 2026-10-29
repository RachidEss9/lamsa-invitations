/**
 * The new opening engine's style model.
 *
 * The engine animates only the *environment* around the invitation. The
 * invitation itself is always rendered by the existing invitation renderer,
 * exactly once, in its own page box — so nothing here can stretch, crop or
 * duplicate it.
 *
 * Every value is derived from a single scalar `progress` in 0 → 1, which is
 * what makes the styles:
 *
 *   - scrubbable (the editor can hold any frame through `stillAt`),
 *   - resumable and reduced-motion safe, and
 *   - pure, so the three sequences can be asserted without a browser.
 *
 * The three styles are deliberately *different sequences*, not three palettes
 * on one animation:
 *
 *   cinematic — a spotlight grows out of a deep backdrop while the vignette
 *               recedes, so the card is uncovered by light.
 *   monogram  — metallic initials rise, a highlight sweeps across them, they
 *               part along a gold rule and the card sits behind them.
 *   silk      — a ribbon sweeps across the stage and the backdrop peels away
 *               in its wake, uncovering the card as it passes.
 */

export type OpeningStyleId = "cinematic" | "monogram" | "silk";

export interface OpeningStyleSpec {
  id: OpeningStyleId;
  label: string;
  note: string;
}

export const OPENING_STYLES: OpeningStyleSpec[] = [
  {
    id: "cinematic",
    label: "Cinematic Reveal",
    note: "A soft spotlight and gentle depth uncover the invitation",
  },
  {
    id: "monogram",
    label: "Golden Monogram",
    note: "Metallic initials set the tone, then give way to the card",
  },
  {
    id: "silk",
    label: "Silk Flow",
    note: "A ribbon sweeps across and draws the invitation into view",
  },
];

/** The style used when a saved invitation predates the three-style engine. */
export const DEFAULT_OPENING_STYLE: OpeningStyleId = "cinematic";

export function isOpeningStyle(value: unknown): value is OpeningStyleId {
  return value === "cinematic" || value === "monogram" || value === "silk";
}

/**
 * Repairs a loaded style. Anything unusable comes back as `undefined`, which
 * means "use the default style" — a damaged payload never takes the opening
 * down with it, and an invitation saved before styles existed opens normally.
 */
export function normalizeOpeningStyle(
  value: unknown,
): OpeningStyleId | undefined {
  return isOpeningStyle(value) ? value : undefined;
}

/** The style an opening actually renders, resolving any legacy payload. */
export function openingStyleOf(style: unknown): OpeningStyleId {
  return normalizeOpeningStyle(style) ?? DEFAULT_OPENING_STYLE;
}

/** Running length per style, in ms. Short enough that a guest never waits. */
export const OPENING_STYLE_DURATION: Record<OpeningStyleId, number> = {
  cinematic: 3200,
  monogram: 3400,
  silk: 3000,
};

/* -------------------------------------------------------------------------- */
/* Math                                                                       */
/* -------------------------------------------------------------------------- */

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Linear progress of `value` between `start` and `end`. */
export function span(value: number, start: number, end: number): number {
  if (end <= start) return value >= end ? 1 : 0;
  return clamp01((value - start) / (end - start));
}

/** Smoothstep between `start` and `end` — eased without a curve object. */
export function smooth(value: number, start: number, end: number): number {
  const t = span(value, start, end);
  return t * t * (3 - 2 * t);
}

/**
 * The initials shown by the Golden Monogram style.
 *
 * Punctuation-only words ("&", "·") are skipped so "Amelia & Søren" reads as
 * "AS" rather than "A&". Arabic names work the same way: the first letter of
 * each name, taken per code point so a ligature is never split.
 */
export function monogramOf(names?: string | null): string {
  const words = (names ?? "")
    .split(/\s+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word));
  if (words.length === 0) return "L";
  const letters = words
    .slice(0, 2)
    .map((word) => {
      const first = Array.from(word)[0] ?? "";
      // Drop a leading punctuation mark such as an opening quote.
      return /[\p{L}\p{N}]/u.test(first) ? first : "";
    })
    .filter(Boolean);
  if (letters.length === 0) return "L";
  return letters.join("").toUpperCase();
}

/* -------------------------------------------------------------------------- */
/* Frames                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Every scalar the renderer needs for one style at one moment.
 *
 * Fields a style does not use are held at their neutral value (0), so the
 * renderer can read the same object for all three styles without branching.
 */
export interface OpeningStyleFrame {
  style: OpeningStyleId;
  progress: number;
  /** Invitation visibility, 0 → 1. Never touches its geometry. */
  reveal: number;
  /** Opacity of the environmental backdrop. */
  backdrop: number;
  /* Cinematic Reveal */
  /** Spotlight radius, 0 → 1 of the stage diagonal. */
  spotlight: number;
  /** Vignette strength, 1 → 0. */
  vignette: number;
  /* Golden Monogram */
  /** Presence of the initials: rises, holds, then parts. */
  letters: number;
  /** Position of the metallic highlight sweep, 0 → 1. */
  shimmer: number;
  /** Width of the gold rule that parts the initials. */
  rule: number;
  /* Silk Flow */
  /** Ribbon travel across the stage, 0 → 1. */
  ribbon: number;
  /** How far the backdrop has peeled away. */
  wipe: number;
}

function neutral(
  style: OpeningStyleId,
  progress: number,
  reveal: number,
  backdrop: number,
): OpeningStyleFrame {
  return {
    style,
    progress,
    reveal,
    backdrop,
    spotlight: 0,
    vignette: 0,
    letters: 0,
    shimmer: 0,
    rule: 0,
    ribbon: 0,
    wipe: 0,
  };
}

/**
 * The frame for one style at one point in its run.
 *
 * Pure and monotonic: `reveal` only ever grows, and every style lands on
 * `reveal === 1` with `backdrop === 0`, so the finished invitation is always
 * in its correct final state with nothing left covering it.
 */
export function openingStyleFrame(
  style: OpeningStyleId,
  progress: number,
): OpeningStyleFrame {
  const p = clamp01(progress);
  const frame = neutral(style, p, 0, 0);

  switch (style) {
    case "cinematic": {
      // The light opens first; the vignette lets go, then the room clears.
      frame.spotlight = smooth(p, 0.04, 0.62);
      frame.vignette = 1 - smooth(p, 0.2, 0.86);
      frame.reveal = smooth(p, 0.3, 0.86);
      frame.backdrop = 1 - smooth(p, 0.58, 1);
      break;
    }
    case "monogram": {
      const rise = smooth(p, 0.04, 0.34);
      const part = smooth(p, 0.6, 0.86);
      frame.letters = rise * (1 - part);
      frame.shimmer = span(p, 0.26, 0.72);
      frame.rule = smooth(p, 0.5, 0.78);
      frame.reveal = smooth(p, 0.58, 0.95);
      frame.backdrop = 1 - smooth(p, 0.74, 1);
      // The room stays softly lit so the initials read as lit objects.
      frame.vignette = 1 - smooth(p, 0.7, 1);
      break;
    }
    case "silk": {
      frame.ribbon = span(p, 0, 0.78);
      frame.wipe = smooth(p, 0.1, 0.72);
      frame.reveal = smooth(p, 0.14, 0.76);
      frame.backdrop = 1 - smooth(p, 0.5, 0.96);
      break;
    }
  }

  return frame;
}

/** True once the environment has fully cleared and the card is presented. */
export function openingStyleSettled(frame: OpeningStyleFrame): boolean {
  return frame.progress >= 1 && frame.reveal >= 1 && frame.backdrop <= 0;
}

/** The guest-facing start prompt. Identical across styles, so it is obvious. */
export const OPENING_START_LABEL = "Open the invitation";
/** Screen-reader name for skip; the visible word is the single word "Skip". */
export const OPENING_SKIP_LABEL = "Skip the opening animation";
