import { describe, it, expect } from "vitest";
import {
  OPENING_MAX_DURATION,
  OPENING_MIN_DURATION,
  OPENING_TIMELINES,
  openingFrame,
  openingPresetOf,
  openingRunDuration,
  type OpeningPresetId,
} from "./opening";

const presets = Object.keys(OPENING_TIMELINES) as OpeningPresetId[];

describe("opening choreography", () => {
  it("covers every configured opening preset", () => {
    expect(presets).toHaveLength(14);
    expect(openingPresetOf("none")).toBeNull();
    expect(openingPresetOf("envelope")).toBe("envelope");
  });

  it("starts with the invitation held inside the frame", () => {
    for (const preset of presets) {
      const frame = openingFrame(preset, 0);
      expect(frame.concealed, preset).toBe(true);
      expect(frame.settled).toBe(false);
      expect(frame.card).toBe(0);
      expect(frame.cardScale).toBeLessThanOrEqual(1.06);
      expect(frame.cardOffsetY).toBeGreaterThanOrEqual(0);
    }
  });

  it("finishes with the invitation exactly filling the frame", () => {
    for (const preset of presets) {
      const frame = openingFrame(preset, 1);
      expect(frame.settled, preset).toBe(true);
      expect(frame.card, preset).toBe(1);
      expect(frame.frame, preset).toBe(1);
      expect(frame.cardScale, preset).toBeCloseTo(1, 5);
      expect(frame.cardOffsetY, preset).toBeCloseTo(0, 5);
      expect(frame.cardRotate, preset).toBeCloseTo(0, 5);
      expect(frame.cardRadius, preset).toBeCloseTo(0, 5);
      expect(frame.cardShadow, preset).toBeCloseTo(0, 5);
    }
  });

  it("keeps the card concealed until its own emergence begins", () => {
    for (const preset of presets) {
      const timeline = OPENING_TIMELINES[preset];
      const justBefore = openingFrame(preset, Math.max(0, timeline.cardStart - 0.01));
      expect(justBefore.card, preset).toBe(0);
      const midway = openingFrame(
        preset,
        (timeline.cardStart + timeline.cardEnd) / 2,
      );
      expect(midway.card, preset).toBeGreaterThan(0.3);
      expect(midway.card, preset).toBeLessThan(1);
    }
  });

  it("moves the invitation continuously, without dips or jumps", () => {
    for (const preset of presets) {
      let previous = openingFrame(preset, 0);
      for (let step = 1; step <= 40; step += 1) {
        const next = openingFrame(preset, step / 40);
        expect(next.card, preset).toBeGreaterThanOrEqual(previous.card);
        expect(next.frame, preset).toBeGreaterThanOrEqual(previous.frame);
        // Scale and rise move monotonically toward the settled frame.
        if (next.cardScale >= previous.cardScale) {
          expect(next.cardOffsetY).toBeLessThanOrEqual(previous.cardOffsetY);
        }
        previous = next;
      }
    }
  });

  it("opens the envelope before the card can leave it", () => {
    const timeline = OPENING_TIMELINES.envelope;
    // Sealed: no hint of movement in the flap.
    expect(openingFrame("envelope", 0).frame).toBe(0);
    // The flap is open by the time the card starts to rise.
    expect(openingFrame("envelope", timeline.cardStart).frame).toBeGreaterThan(0.4);
    // Halfway through the card's travel it is both out and not yet settled.
    const middle = openingFrame("envelope", 0.6);
    expect(middle.concealed).toBe(false);
    expect(middle.cardScale).toBeGreaterThan(0.6);
    expect(middle.cardScale).toBeLessThan(1);
    expect(middle.cardOffsetY).toBeGreaterThan(0);
    // The seal has cracked before the flap swings.
    expect(openingFrame("envelope", 0.25).seal).toBe(1);
  });

  it("gives the doors and curtains their own frame timing", () => {
    // Doors are already parting while the card is still almost still.
    const doors = openingFrame("door", 0.2);
    expect(doors.frame).toBeGreaterThan(0.15);
    expect(doors.card).toBeLessThan(0.5);

    // A curtain reveal is substantially open before the card has settled.
    const curtain = openingFrame("curtain", 0.5);
    expect(curtain.frame).toBeGreaterThan(0.5);
    expect(curtain.card).toBeGreaterThan(0.3);
  });

  it("reads a saved duration, with a readable floor and a hard ceiling", () => {
    expect(openingRunDuration(300)).toBe(OPENING_MIN_DURATION);
    expect(openingRunDuration(2600)).toBe(2600);
    expect(openingRunDuration(9000)).toBe(OPENING_MAX_DURATION);
    expect(openingRunDuration(Number.NaN)).toBe(OPENING_MIN_DURATION);
  });
});
