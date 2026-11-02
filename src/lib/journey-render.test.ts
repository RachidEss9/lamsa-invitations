import { describe, expect, it } from "bun:test";
import { advancePhase, continueState, initialTiming, isLastStep, nextStep, type DesignPage, type DesignDocument } from "./design";
import { journeyProgress, journeyStartsAtOpening } from "./journey";

function page(over: Partial<DesignPage> = {}): DesignPage {
  return {
    id: "p1",
    name: "P",
    background: "#fff",
    elements: [],
    hidden: false,
    ...over,
  };
}

function doc(pages: DesignPage[] = [], openingExperience: string = "none"): DesignDocument {
  return {
    version: 1,
    pages,
    opening: { experience: openingExperience, autoOpen: false, welcome: "" },
    closing: { enabled: false, style: "message", message: "", duration: 800 },
    transition: null,
    startedAt: 0,
    suite: [],
    finishes: null,
  };
}

describe("journey", () => {
  it("nextStep advances stepwise", () => {
    expect(nextStep(0, 4)).toBe(1);
    expect(nextStep(3, 4)).toBe(3);
  });

  it("isLastStep", () => {
    expect(isLastStep(0, 1)).toBe(true);
    expect(isLastStep(0, 4)).toBe(false);
    expect(isLastStep(3, 4)).toBe(true);
  });

  it("advancePhase", () => {
    expect(advancePhase(0, 4, false)).toEqual({ step: 1, phase: "page" });
    expect(advancePhase(3, 4, false)).toEqual({ step: 3, phase: "page" });
    expect(advancePhase(3, 4, true)).toEqual({ step: 3, phase: "closing" });
  });

  it("continueState", () => {
    const timing = { duration: 1000, settled: true, reducedMotion: false };
    expect(continueState(timing, 0, 3, false)).toEqual({ visible: true, finishes: false, label: "Continue" });
    expect(continueState(timing, 2, 3, false)).toEqual({ visible: true, finishes: false, label: "Continue" });
    expect(continueState(timing, 2, 3, true)).toEqual({ visible: true, finishes: true, label: "Close the invitation" });
  });

  it("continueState is hidden in reduced motion until the last page", () => {
    const timing = { duration: 1000, settled: false, reducedMotion: true };
    expect(continueState(timing, 0, 3, false).visible).toBe(false);
    expect(continueState(timing, 2, 3, true).visible).toBe(true);
  });

  it("journeyProgress", () => {
    expect(journeyProgress(0, 4)).toBe(0.25);
    expect(journeyProgress(3, 4)).toBe(1);
  });

  it("initialTiming", () => {
    expect(initialTiming(page(), false)).toEqual({ time: 0, settled: false });
    expect(initialTiming(page(), true)).toEqual({ time: 4000, settled: true });
  });

  it("journeyStartsAtOpening is always false after presentation removal", () => {
    expect(journeyStartsAtOpening(doc(), "none")).toBe(false);
    expect(journeyStartsAtOpening(doc([page()]), "secret-world")).toBe(false);
  });
});
