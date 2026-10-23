import {
  timelineDuration,
  visiblePages,
  type DesignDocument,
  type DesignPage,
} from "./design";

/**
 * The sequential guest journey, modelled as pure functions so the editor
 * preview and the public invitation share one progression and it can be tested
 * without a browser.
 *
 * A guest never chooses a page: the journey walks the visible pages in saved
 * order, waits for each page's own animation to settle, and then offers one
 * Continue control. The closing stage is only reachable from the final page.
 */

export type JourneyPhase = "opening" | "page" | "closing";

export interface JourneyTiming {
  /** Milliseconds the current page's animation needs. */
  duration: number;
  /** True once every entrance animation on the page has finished. */
  settled: boolean;
  reducedMotion: boolean;
}

export function journeyPages(design: DesignDocument): DesignPage[] {
  return visiblePages(design);
}

export function hasOpening(design: DesignDocument): boolean {
  return design.opening.experience !== "none";
}

/** Opening is skipped entirely when motion is reduced. */
export function journeyStartsAtOpening(
  design: DesignDocument,
  reducedMotion: boolean,
): boolean {
  return hasOpening(design) && !reducedMotion;
}

export function pageDuration(page: DesignPage | null): number {
  return page ? timelineDuration(page) : 4000;
}

/**
 * When the page's entrance choreography is finished. Continue appears after
 * this beat — not after an arbitrary slide-show timer, and not before the
 * guest can actually read the section.
 */
export function pageEntranceEnd(page: DesignPage | null): number {
  if (!page) return 900;
  const end = page.elements.reduce((max, element) => {
    if (!element.animation?.enabled) return max;
    return Math.max(max, element.animation.delay + element.animation.duration);
  }, 0);
  return Math.max(900, end);
}

export function isLastStep(step: number, total: number): boolean {
  return total > 0 && step >= total - 1;
}

export function nextStep(step: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(total - 1, Math.max(0, step + 1));
}

export interface ContinueState {
  /** The Continue affordance is visible only after the page has settled. */
  visible: boolean;
  /** The last page hands over to the closing stage instead of another page. */
  finishes: boolean;
  label: string;
}

export function continueState(
  timing: JourneyTiming,
  step: number,
  total: number,
  closingEnabled: boolean,
): ContinueState {
  const last = isLastStep(step, total);
  // The final page of an invitation without a closing stage simply stays: the
  // reply and contact actions live below the card, so there is nothing to
  // advance to and no dead button to press.
  const hasDestination = !last || closingEnabled;
  const visible =
    (timing.reducedMotion ? last || total > 1 : timing.settled) && hasDestination;
  const finishes = last && closingEnabled;
  return {
    visible,
    finishes,
    label: finishes ? "Close the invitation" : "Continue",
  };
}

/** 0–1 progress across the visible pages, for the hairline progress rule. */
export function journeyProgress(step: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, (step + 1) / total));
}

/** The phase after the guest presses Continue on the current step. */
export function advancePhase(
  step: number,
  total: number,
  closingEnabled: boolean,
): { step: number; phase: JourneyPhase } {
  if (isLastStep(step, total)) {
    return { step, phase: closingEnabled ? "closing" : "page" };
  }
  return { step: nextStep(step, total), phase: "page" };
}

/** Staggered entrance for guests who prefer reduced motion: readable at once. */
export function initialTiming(
  page: DesignPage | null,
  reducedMotion: boolean,
): { time: number; settled: boolean } {
  const duration = pageDuration(page);
  return reducedMotion
    ? { time: duration, settled: true }
    : { time: 0, settled: false };
}
