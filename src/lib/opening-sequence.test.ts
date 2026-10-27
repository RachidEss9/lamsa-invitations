import { describe, it, expect } from "vitest";
import {
  OPENING_TEMPLATES,
  applyOpeningTemplate,
  defaultSequence,
  frameForOpening,
  makeStep,
  normalizeSequence,
  openingDurationOf,
  sequenceFrame,
  sequenceTotalMs,
  sequenceWindows,
  SEQUENCE_MAX_MS,
  SEQUENCE_MIN_MS,
  type OpeningStep,
} from "./opening-sequence";
import {
  OPENING_MAX_DURATION,
  OPENING_MIN_DURATION,
  OPENING_TIMELINES,
  openingFrame,
  openingRunDuration,
} from "./opening";
import {
  normalizeDesign,
  type DesignDocument,
  type OpeningSettings,
} from "./design";
import type { InvitationContent } from "./invitation";

const BASE: OpeningSettings = {
  experience: "envelope",
  duration: 2600,
  autoOpen: false,
  welcome: "For {{guest}}",
};

const CONTENT: InvitationContent = {
  title: "Amelia & Søren",
  occasion: "wedding",
  templateId: "published",
  names: { primary: "Amelia", secondary: "Søren" },
  eyebrow: "",
  message: "",
  date: "2026-06-14",
  time: "16:00",
  venueName: "The Garden Hall",
  venueAddress: "1 Main Street",
  palette: { background: "#f2f1ed", ink: "#161616", accent: "#710014" },
  fontPair: "romance",
  layout: "centered",
  motif: "sprig",
  animations: true,
};

function sequence(steps: Partial<OpeningStep>[]): OpeningStep[] {
  return steps.map((step, index) => ({
    id: `s${index}`,
    role: "cover" as const,
    delay: 0,
    duration: 900,
    easing: "easeOut" as const,
    ...step,
  }));
}

function savedDesign(opening: Partial<OpeningSettings>): DesignDocument {
  return {
    version: 1,
    pages: [
      { id: "page-cover", name: "Cover", background: "#f2f1ed", elements: [] },
    ],
    opening: {
      experience: "envelope",
      duration: 2600,
      autoOpen: false,
      welcome: "For {{guest}}",
      ...opening,
    },
    closing: { enabled: false, style: "fade", message: "", duration: 1200 },
    transition: { preset: "fade", duration: 600 },
    startedAt: 1_700_000_000_000,
  } as DesignDocument;
}

describe("opening sequence configuration", () => {
  it("repairs a saved sequence instead of trusting it", () => {
    const repaired = normalizeSequence([
      { id: "a", role: "cover", delay: 50, duration: 900, easing: "easeInOut" },
      // Junk: an unknown role is dropped entirely.
      { id: "b", role: "explode", delay: 0, duration: 400, easing: "linear" },
      // Missing timings and an unknown easing fall back to sane defaults.
      { id: "c", role: "card" },
      null,
      "nonsense",
    ]);

    expect(repaired?.map((step) => step.id)).toEqual(["a", "c"]);
    expect(repaired?.[1]).toMatchObject({
      role: "card",
      delay: 0,
      duration: 900,
      easing: "easeOut",
    });

    // Length is capped so a hostile payload cannot flood the editor.
    const flood = normalizeSequence(
      Array.from({ length: 60 }, (_, index) => ({
        id: `x${index}`,
        role: "cover",
        delay: 0,
        duration: 900,
        easing: "linear",
      })),
    );
    expect(flood?.length).toBe(24);

    // Nothing usable means "use the preset's own timing".
    expect(normalizeSequence([])).toBeUndefined();
    expect(normalizeSequence(undefined)).toBeUndefined();
    expect(normalizeSequence("junk")).toBeUndefined();
  });

  it("runs steps in list order, with negative gaps overlapping", () => {
    const windows = sequenceWindows(
      sequence([
        { role: "cover", delay: 0, duration: 1000 },
        { role: "card", delay: -600, duration: 800 },
        { role: "exit", delay: 100, duration: 500 },
      ]),
    );

    expect(windows.map((window) => [window.start, window.end])).toEqual([
      [0, 1000],
      [400, 1200],
      [1300, 1800],
    ]);
  });

  it("reordering steps really reorders the choreography", () => {
    const asWritten = sequence([
      { id: "cover", role: "cover", delay: 0, duration: 1000, easing: "linear" },
      { id: "card", role: "card", delay: -500, duration: 1000, easing: "linear" },
    ]);
    const swapped = [asWritten[1], asWritten[0]];

    const early = 600;
    const written = sequenceFrame(asWritten, early, "envelope");
    const reordered = sequenceFrame(swapped, early, "envelope");

    // With the invitation's step moved to the top, the card is already rising
    // while the cover has barely moved — and the other way round.
    expect(reordered.card).toBeGreaterThan(written.card);
    expect(written.frame).toBeGreaterThan(reordered.frame);
  });

  it("holds the invitation at the start and settles it at the end", () => {
    const steps = sequence([
      { role: "seal", delay: 0, duration: 400, easing: "easeOut" },
      { role: "cover", delay: -200, duration: 1200, easing: "easeInOut" },
      { role: "card", delay: -700, duration: 1500, easing: "easeOut" },
      { role: "exit", delay: -400, duration: 800, easing: "easeIn" },
    ]);
    const total = sequenceTotalMs(steps);

    const start = sequenceFrame(steps, 0, "envelope");
    expect(start.concealed).toBe(true);
    expect(start.card).toBe(0);
    expect(start.seal).toBe(0);
    expect(start.frame).toBe(0);

    const mid = sequenceFrame(steps, total * 0.55, "envelope");
    expect(mid.card).toBeGreaterThan(0);
    expect(mid.card).toBeLessThan(1);
    expect(mid.seal).toBe(1);

    const end = sequenceFrame(steps, total, "envelope");
    expect(end.card).toBe(1);
    expect(end.frame).toBe(1);
    expect(end.retreat).toBe(1);
    expect(end.settled).toBe(true);
    expect(end.cardScale).toBe(1);
    expect(end.cardOffsetY).toBe(0);
  });

  it("clamps the run so a saved sequence can never hang a guest", () => {
    const huge = sequence([
      { role: "cover", delay: 0, duration: 6000 },
      { role: "card", delay: 8000, duration: 6000 },
      { role: "exit", delay: 8000, duration: 6000 },
    ]);
    expect(sequenceTotalMs(huge)).toBe(SEQUENCE_MAX_MS);

    const tiny = sequence([{ role: "cover", delay: 0, duration: 120 }]);
    expect(sequenceTotalMs(tiny)).toBe(SEQUENCE_MIN_MS);

    // A sequence drives its own length, up to the sequence ceiling; a plain
    // opening keeps the saved one.
    expect(openingDurationOf({ ...BASE, sequence: huge })).toBe(SEQUENCE_MAX_MS);
    expect(openingDurationOf(BASE)).toBe(openingRunDuration(BASE.duration));
    expect(openingDurationOf({ ...BASE, duration: Number.NaN })).toBe(
      OPENING_MIN_DURATION,
    );
  });
});

describe("opening sequences on saved invitations", () => {
  it("round-trips a sequence through the stored design document", () => {
    const original = savedDesign({
      sequence: sequence([
        { id: "cover", role: "cover", delay: 0, duration: 1400, easing: "easeInOut" },
        { id: "card", role: "card", delay: -800, duration: 1600, easing: "easeOut" },
      ]),
      background: "#101010",
    });
    const stored = JSON.parse(JSON.stringify(original)) as DesignDocument;
    const reloaded = normalizeDesign(stored, CONTENT);

    expect(reloaded.opening.sequence).toEqual(original.opening.sequence);
    expect(reloaded.opening.background).toBe("#101010");
  });

  it("leaves invitations saved before sequences existed untouched", () => {
    const legacy = savedDesign({});
    const reloaded = normalizeDesign(
      JSON.parse(JSON.stringify(legacy)) as DesignDocument,
      CONTENT,
    );

    expect(reloaded.opening.sequence).toBeUndefined();
    // The published experience is identical: same frame, same running length.
    for (const progress of [0, 0.33, 0.7, 1]) {
      expect(frameForOpening(reloaded.opening, progress)).toEqual(
        openingFrame("envelope", progress, undefined),
      );
    }
    expect(openingDurationOf(reloaded.opening)).toBe(openingRunDuration(2600));
  });
});

describe("opening templates", () => {
  it("covers every sequence the studio promises", () => {
    expect(OPENING_TEMPLATES.map((template) => template.id)).toEqual([
      "classic-envelope",
      "lined-envelope",
      "sealed-envelope",
      "gatefold",
      "folded-card",
      "gift-box",
      "fade-slide",
    ]);
  });

  it("writes a real, editable sequence and keeps the invitation's own words", () => {
    for (const template of OPENING_TEMPLATES) {
      const applied = applyOpeningTemplate(template, {
        ...BASE,
        coverStorageId: "cover-image",
        stationery: { width: 160, height: 160, flapDepth: 0.5 },
      });

      expect(applied.experience).toBe(template.experience);
      expect(applied.welcome).toBe(BASE.welcome);
      expect(applied.coverStorageId).toBe("cover-image");
      expect(applied.sequence?.length).toBeGreaterThan(1);

      // Every step is a real movement with clamped, finite timings.
      for (const step of applied.sequence ?? []) {
        expect(step.id).toBeTruthy();
        expect(step.duration).toBeGreaterThan(0);
        expect(Number.isFinite(step.delay)).toBe(true);
      }

      // Unique ids, so selecting and reordering one never moves another.
      const ids = (applied.sequence ?? []).map((step) => step.id);
      expect(new Set(ids).size).toBe(ids.length);

      const total = sequenceTotalMs(applied.sequence ?? []);
      expect(total).toBeGreaterThanOrEqual(SEQUENCE_MIN_MS);
      expect(total).toBeLessThanOrEqual(OPENING_MAX_DURATION);

      // Applying twice mints fresh ids rather than colliding with the first run.
      const again = applyOpeningTemplate(template, applied);
      const both = [...ids, ...(again.sequence ?? []).map((step) => step.id)];
      expect(new Set(both).size).toBe(both.length);
    }
  });

  it("keeps an envelope suite's visible parts when a template dresses it", () => {
    const applied = applyOpeningTemplate(OPENING_TEMPLATES[2], {
      ...BASE,
      stationery: { width: 160, height: 160 },
    });
    expect(applied.stationery).toMatchObject({
      width: 160,
      height: 160,
      showFlap: true,
      showLiner: true,
      showSeal: true,
    });
  });

  it("restores the preset's own choreography as editable steps", () => {
    const presets = Object.keys(OPENING_TIMELINES) as (keyof typeof OPENING_TIMELINES)[];
    for (const preset of presets) {
      const steps = defaultSequence(preset, 2600);
      const windows = sequenceWindows(steps);
      expect(steps.length).toBeGreaterThan(1);
      expect(windows[0].start).toBeGreaterThanOrEqual(0);
      // Steps never run backwards in time.
      for (const window of windows) {
        expect(window.end).toBeGreaterThan(window.start);
      }
      expect(sequenceTotalMs(steps)).toBeLessThanOrEqual(OPENING_MAX_DURATION);
    }
  });

  it("mints fresh step ids that never collide", () => {
    const first = makeStep("card");
    const second = makeStep("cover", { duration: 1500, easing: "backOut" });
    expect(first.id).not.toBe(second.id);
    expect(second).toMatchObject({ role: "cover", duration: 1500, easing: "backOut" });
    expect(SEQUENCE_MAX_MS).toBeGreaterThan(SEQUENCE_MIN_MS);
  });
});
