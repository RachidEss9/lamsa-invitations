import { describe, expect, it } from "vitest";
import {
  DEFAULT_GLOW,
  DEFAULT_SHADOW,
  copyEffects,
  effectFilter,
  effectsAreActive,
  gradientCss,
  hexToRgba,
  insetShadow,
  normalizeEffects,
  outlineWidth,
  pasteEffects,
  shadowOffset,
  type LayerEffects,
} from "./effects";

describe("normalizeEffects", () => {
  it("returns nothing for junk so older invitations stay untouched", () => {
    expect(normalizeEffects(undefined)).toBeUndefined();
    expect(normalizeEffects(null)).toBeUndefined();
    expect(normalizeEffects("shadow")).toBeUndefined();
    expect(normalizeEffects([])).toBeUndefined();
    expect(normalizeEffects({})).toBeUndefined();
  });

  it("keeps a full effect stack and its enabled flags", () => {
    const effects = normalizeEffects({
      shadow: { ...DEFAULT_SHADOW, enabled: false, blur: 40 },
      glow: { ...DEFAULT_GLOW, opacity: 0.4 },
      innerShadow: { ...DEFAULT_SHADOW, distance: 6 },
      gradient: { enabled: true, from: "#710014", to: "#c3a469", angle: 45 },
      outline: { enabled: true, color: "#FFFFFF", width: 3 },
    });
    expect(effects?.shadow?.enabled).toBe(false);
    expect(effects?.shadow?.blur).toBe(40);
    expect(effects?.glow?.opacity).toBe(0.4);
    expect(effects?.innerShadow?.distance).toBe(6);
    expect(effects?.gradient?.angle).toBe(45);
    expect(effects?.outline?.color).toBe("#ffffff");
    expect(effects?.outline?.width).toBe(3);
  });

  it("clamps out-of-range values instead of trusting stored data", () => {
    const effects = normalizeEffects({
      shadow: {
        enabled: true,
        color: "burgundy",
        opacity: 3,
        blur: -20,
        distance: 999,
        angle: -45,
      },
      glow: { enabled: true, color: "#abc", opacity: -1, blur: 900 },
      outline: { enabled: true, width: 400 },
    });
    expect(effects?.shadow?.color).toBe(DEFAULT_SHADOW.color);
    expect(effects?.shadow?.opacity).toBe(1);
    expect(effects?.shadow?.blur).toBe(0);
    expect(effects?.shadow?.distance).toBe(200);
    expect(effects?.shadow?.angle).toBe(315);
    expect(effects?.glow?.color).toBe("#abc");
    expect(effects?.glow?.opacity).toBe(0);
    expect(effects?.glow?.blur).toBe(200);
    expect(effects?.outline?.width).toBe(40);
  });
});

describe("effect rendering helpers", () => {
  it("converts hex to rgba, expanding short hex", () => {
    expect(hexToRgba("#710014", 0.5)).toBe("rgba(113, 0, 20, 0.5)");
    expect(hexToRgba("#fff", 1)).toBe("rgba(255, 255, 255, 1)");
    expect(hexToRgba("not-a-colour", 0.25)).toBe("rgba(22, 22, 22, 0.25)");
    expect(hexToRgba("#000000", 4)).toBe("rgba(0, 0, 0, 1)");
  });

  it("turns distance and angle into CSS offsets", () => {
    expect(shadowOffset(10, 90)).toEqual({ x: 0, y: 10 });
    const right = shadowOffset(10, 0);
    expect(right.x).toBe(10);
    expect(right.y).toBe(0);
  });

  it("composes shadow and glow into one filter", () => {
    const effects: LayerEffects = {
      shadow: { ...DEFAULT_SHADOW, distance: 10, angle: 90, blur: 20, opacity: 0.3 },
      glow: { ...DEFAULT_GLOW, blur: 12, opacity: 0.5 },
    };
    const filter = effectFilter(effects);
    expect(filter).toContain("drop-shadow(0px 10px 20px rgba(22, 22, 22, 0.3))");
    expect(filter).toContain("drop-shadow(0 0 12px rgba(195, 164, 105, 0.5))");
  });

  it("omits disabled effects and returns nothing when they are all off", () => {
    const off: LayerEffects = {
      shadow: { ...DEFAULT_SHADOW, enabled: false },
      glow: { ...DEFAULT_GLOW, enabled: false },
    };
    expect(effectFilter(off)).toBeUndefined();
    expect(effectsAreActive(off)).toBe(false);
    expect(effectFilter(undefined)).toBeUndefined();
  });

  it("builds an inset shadow only for a visible inner shadow", () => {
    expect(insetShadow({ innerShadow: { ...DEFAULT_SHADOW, blur: 0 } })).toBeUndefined();
    expect(
      insetShadow({
        innerShadow: { ...DEFAULT_SHADOW, blur: 8, distance: 4, angle: 90, opacity: 0.4 },
      }),
    ).toBe("inset 0px 4px 8px rgba(22, 22, 22, 0.4)");
    expect(
      insetShadow({ innerShadow: { ...DEFAULT_SHADOW, enabled: false } }),
    ).toBeUndefined();
  });

  it("renders gradients and outline width from settings", () => {
    expect(gradientCss({ enabled: true, from: "#000000", to: "#ffffff", angle: 90 })).toBe(
      "linear-gradient(90deg, #000000, #ffffff)",
    );
    expect(outlineWidth({ outline: { enabled: true, color: "#fff", width: 2.5 } })).toBe(2.5);
    expect(outlineWidth({ outline: { enabled: false, color: "#fff", width: 2 } })).toBe(0);
    expect(outlineWidth(undefined)).toBe(0);
  });
});

describe("effect clipboard", () => {
  it("copies effects without sharing the same object", () => {
    const effects: LayerEffects = { shadow: { ...DEFAULT_SHADOW } };
    const copied = copyEffects(effects);
    expect(copied).not.toBeNull();
    if (copied) copied.shadow!.blur = 4;
    expect(effects.shadow!.blur).toBe(DEFAULT_SHADOW.blur);

    const pasted = pasteEffects();
    expect(pasted?.shadow?.blur).toBe(4);
    if (pasted) pasted.shadow!.blur = 99;
    expect(pasteEffects()?.shadow?.blur).toBe(4);
  });

  it("clears the clipboard when copying an empty layer", () => {
    copyEffects(undefined);
    expect(pasteEffects()).toBeUndefined();
  });
});
