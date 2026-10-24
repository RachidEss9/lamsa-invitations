import { describe, it, expect } from "vitest";
import {
  LEGACY_ENVELOPE,
  envelopeMillimetres,
  envelopePresetFor,
  envelopeStageBox,
  defaultEnvelopeSettings,
  usableLining,
} from "./envelope";

describe("envelope geometry", () => {
  it("keeps the exact legacy box when no size is chosen", () => {
    expect(envelopeStageBox()).toEqual({ ...LEGACY_ENVELOPE });
    expect(envelopeStageBox(null)).toEqual({ ...LEGACY_ENVELOPE });
    expect(envelopeStageBox({ width: 0, height: 0 })).toEqual({
      ...LEGACY_ENVELOPE,
    });
  });

  it("builds a C6 box at the artboard width and centres it", () => {
    const box = envelopeStageBox({ width: 114, height: 162 });
    expect(box.width).toBe(820);
    expect(box.height).toBe(1165);
    expect(box.left).toBe(90);
    expect(box.top).toBe(84);
    expect(box.flapHeight).toBe(609);
    expect(box.sealTop).toBe(671);
    expect(box.pocketTop).toBe(665);
  });

  it("fits a long DL envelope by its height instead", () => {
    const box = envelopeStageBox({ width: 110, height: 220 });
    expect(box.height).toBe(1263);
    expect(box.width).toBe(632);
    expect(box.left).toBe(184);
    expect(box.top).toBe(35);
  });

  it("makes a square envelope square", () => {
    const box = envelopeStageBox({ width: 155, height: 155 });
    expect(box.width).toBe(820);
    expect(box.height).toBe(820);
    expect(box.top).toBe(257);
  });

  it("clamps flap depth to a believable hinge", () => {
    expect(
      envelopeStageBox({ width: 114, height: 162, flapDepth: 0.05 }).flapHeight,
    ).toBe(Math.round(1165 * 0.2));
    expect(
      envelopeStageBox({ width: 114, height: 162, flapDepth: 0.95 }).flapHeight,
    ).toBe(Math.round(1165 * 0.75));
  });

  it("never collapses an extreme proportion into a sliver", () => {
    const box = envelopeStageBox({ width: 40, height: 500 });
    expect(box.width).toBeGreaterThanOrEqual(260);
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.left + box.width).toBeLessThanOrEqual(1000);
  });

  it("uses the legacy suite's effective millimetres when unset", () => {
    expect(envelopeMillimetres()).toEqual({ width: 105, height: 162 });
    expect(envelopeMillimetres({ width: 162, height: 229 })).toEqual({
      width: 162,
      height: 229,
    });
  });

  it("matches a preset only within half a millimetre", () => {
    expect(envelopePresetFor({ width: 114, height: 162 })?.id).toBe("c6");
    expect(envelopePresetFor({ width: 114.4, height: 162.2 })?.id).toBe("c6");
    expect(envelopePresetFor({ width: 114, height: 163 })).toBeUndefined();
    expect(envelopePresetFor(undefined)).toBeUndefined();
  });

  it("starts new stationery at C6 with the classic flap", () => {
    expect(defaultEnvelopeSettings()).toEqual({
      width: 114,
      height: 162,
      flapDepth: 0.523,
    });
  });

  it("accepts only flat lining colours", () => {
    expect(usableLining("#710014")).toBe("#710014");
    expect(usableLining("#abc")).toBe("#abc");
    expect(usableLining("linear-gradient(#fff, #000)")).toBeUndefined();
    expect(usableLining("")).toBeUndefined();
    expect(usableLining(null)).toBeUndefined();
  });
});
