import { describe, it, expect } from "vitest";
import {
  advancePhase,
  continueState,
  hasOpening,
  initialTiming,
  isLastStep,
  journeyPages,
  journeyProgress,
  journeyStartsAtOpening,
  nextStep,
  pageDuration,
  pageEntranceEnd,
} from "./journey";
import type { DesignDocument, DesignElement, DesignPage } from "./design";

function element(id: string, delay = 0): DesignElement {
  return {
    id,
    kind: "text",
    name: id,
    x: 0,
    y: 0,
    w: 200,
    h: 60,
    rotation: 0,
    opacity: 1,
    locked: false,
    hidden: false,
    text: id,
    animation: {
      enabled: true,
      preset: "fade",
      trigger: "load",
      delay,
      duration: 800,
      easing: "easeOut",
    },
  } as DesignElement;
}

function page(id: string, options: { hidden?: boolean } = {}): DesignPage {
  return {
    id,
    name: id,
    background: "#f2f1ed",
    hidden: options.hidden,
    elements: [element(`${id}-a`), element(`${id}-b`, 600)],
  };
}

function design(pages: DesignPage[], closing = true): DesignDocument {
  return {
    version: 1,
    pages,
    opening: { experience: "secret-world" as const, autoOpen: false, welcome: "" },
    closing: { enabled: closing, style: "message", message: "", duration: 1400 },
    transition: { preset: "fade", duration: 700 },
  };
}

describe("sequential journey", () => {
  it("walks visible pages in saved order and skips hidden sections", () => {
    const doc = design([page("cover"), page("details", { hidden: true }), page("venue")]);
    expect(journeyPages(doc).map((item) => item.id)).toEqual(["cover", "venue"]);
  });

  it("never leaves a guest without a page", () => {
    const doc = design([page("only", { hidden: true })]);
    expect(journeyPages(doc).map((item) => item.id)).toEqual(["only"]);
  });

  it("opens at the opening stage only when configured and motion is allowed", () => {
    const doc = design([page("a")]);
    expect(hasOpening(doc)).toBe(true);
    expect(journeyStartsAtOpening(doc, false)).toBe(true);
    expect(journeyStartsAtOpening(doc, true)).toBe(false);

    doc.opening.experience = "none";
    expect(journeyStartsAtOpening(doc, false)).toBe(false);
  });

  it("advances one step at a time and stops at the end", () => {
    expect(nextStep(0, 3)).toBe(1);
    expect(nextStep(2, 3)).toBe(2);
    expect(nextStep(5, 3)).toBe(2);
    expect(isLastStep(1, 3)).toBe(false);
    expect(isLastStep(2, 3)).toBe(true);
    expect(journeyProgress(0, 3)).toBeCloseTo(1 / 3);
    expect(journeyProgress(2, 3)).toBe(1);
  });

  it("does not offer Continue before the page has settled", () => {
    const mid = continueState({ duration: 5000, settled: false, reducedMotion: false }, 0, 3, true);
    expect(mid.visible).toBe(false);
    expect(mid.finishes).toBe(false);

    const settled = continueState({ duration: 5000, settled: true, reducedMotion: false }, 0, 3, true);
    expect(settled.visible).toBe(true);
    expect(settled.label).toBe("Continue");
  });

  it("hands the last page to the closing stage instead of another section", () => {
    const last = continueState({ duration: 4000, settled: true, reducedMotion: false }, 2, 3, true);
    expect(last.finishes).toBe(true);
    expect(last.label).toBe("Close the invitation");

    expect(advancePhase(2, 3, true)).toEqual({ step: 2, phase: "closing" });
    expect(advancePhase(0, 3, true)).toEqual({ step: 1, phase: "page" });
  });

  it("ends in place when the host disabled the closing stage", () => {
    const last = continueState({ duration: 4000, settled: true, reducedMotion: false }, 2, 3, false);
    expect(last.finishes).toBe(false);
    // No dead Continue button on the final section: the reply actions live below.
    expect(last.visible).toBe(false);
    expect(advancePhase(2, 3, false)).toEqual({ step: 2, phase: "page" });
  });

  it("reveals reduced-motion pages immediately, with no forced auto-advance", () => {
    const doc = design([page("a"), page("b")]);
    const first = journeyPages(doc)[0];
    expect(initialTiming(first, true)).toEqual({
      time: pageDuration(first),
      settled: true,
    });
    const still = continueState(
      { duration: pageDuration(first), settled: true, reducedMotion: true },
      0,
      2,
      true,
    );
    expect(still.visible).toBe(true);
    expect(advancePhase(0, 2, true)).toEqual({ step: 1, phase: "page" });
  });

  it("uses the page's own animation length rather than a fixed delay", () => {
    const short = page("short");
    const long = page("long");
    long.elements = [element("slow", 5000)];
    expect(pageDuration(long)).toBeGreaterThan(pageDuration(short));
    expect(pageDuration(null)).toBe(4000);
    expect(pageEntranceEnd(long)).toBeGreaterThan(pageEntranceEnd(short));
  });

  it("offers Continue when the last entrance has settled, not on a fixed timer", () => {
    const first = page("first");
    // The second element has a 600 ms delay + 800 ms duration.
    expect(pageEntranceEnd(first)).toBe(1400);
    const before = continueState(
      { duration: pageDuration(first), settled: pageEntranceEnd(first) > 1400, reducedMotion: false },
      0,
      2,
      true,
    );
    expect(before.visible).toBe(false);
  });
});
