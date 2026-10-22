import { describe, it, expect } from "vitest";
import { REVEAL_PRESETS, type RevealPreset } from "./reveals";
import { REVEAL_EFFECTS } from "./design";
import type { DesignElement, RevealEffect } from "./design";

describe("reveal presets", () => {
  it("contains 8 presets across 4 categories", () => {
    expect(REVEAL_PRESETS).toHaveLength(8);
    const categories = new Set(REVEAL_PRESETS.map((p) => p.category));
    expect(categories).toEqual(
      new Set(["Romantic", "Playful", "Photographic", "Classic"]),
    );
  });

  it("every preset has a valid effect and direction", () => {
    const validEffects = new Set(REVEAL_EFFECTS.map((e) => e.id));
    for (const preset of REVEAL_PRESETS) {
      expect(validEffects.has(preset.effect)).toBe(true);
      expect(["left", "right", "up", "down"]).toContain(preset.direction);
      expect(preset.duration).toBeGreaterThanOrEqual(200);
      expect(preset.hint.length).toBeGreaterThan(0);
    }
  });

  it("heart cover targets message", () => {
    const heart = REVEAL_PRESETS.find((p) => p.id === "heart-message");
    expect(heart).toBeDefined();
    expect(heart?.target).toBe("message");
    expect(heart?.cover.kind).toBe("shape");
    // @ts-expect-error - cover is typed as union, shape only on shape branch
    expect(heart?.cover.shape).toBe("heart");
  });

  it("photo arch mask targets photo", () => {
    const arch = REVEAL_PRESETS.find((p) => p.id === "photo-arch");
    expect(arch?.target).toBe("photo");
    // @ts-expect-error - cover is typed as union, shape only on shape branch
    expect(arch?.cover.shape).toBe("arch");
  });
});

describe("reveal cover/target creation", () => {
  function makeCover(
    preset: RevealPreset,
    targetId: string,
  ): DesignElement {
    return {
      id: `cover-${preset.id}`,
      kind: preset.cover.kind === "motif" ? "motif" : "shape",
      name: `${preset.name} cover`,
      x: 300,
      y: 400,
      w: 280,
      h: 280,
      rotation: 0,
      opacity: 1,
      locked: false,
      hidden: false,
      ...(preset.cover.kind === "shape"
        ? {
            shape: preset.cover.shape as DesignElement["shape"],
            fill: "#710014",
          }
        : {
            motif: preset.cover.motif,
            color: "#710014",
          }),
      reveal: {
        interactionId: "interaction-1",
        targetId,
        effect: preset.effect as RevealEffect,
        direction: preset.direction,
        duration: preset.duration,
        trigger: "tap",
        hint: preset.hint,
      },
      animation: {
        enabled: true,
        preset: "scaleIn",
        trigger: "load",
        delay: 700,
        duration: 1000,
        easing: "backOut",
      },
    };
  }

  it("creates a cover with the preset effect", () => {
    const preset = REVEAL_PRESETS.find((p) => p.id === "wipe-note")!;
    const cover = makeCover(preset, "target-1");
    expect(cover.reveal?.effect).toBe("wipe");
    expect(cover.reveal?.direction).toBe("left");
    expect(cover.reveal?.targetId).toBe("target-1");
    expect(cover.reveal?.trigger).toBe("tap");
  });

  it("cover and target have distinct ids", () => {
    const preset = REVEAL_PRESETS.find((p) => p.id === "seal-note")!;
    const targetId = "message-layer";
    const cover = makeCover(preset, targetId);
    expect(cover.id).not.toBe(targetId);
    expect(cover.reveal?.targetId).toBe(targetId);
  });

  it("reveal effect resolves to a known effect", () => {
    for (const preset of REVEAL_PRESETS) {
      const effect = REVEAL_EFFECTS.find((e) => e.id === preset.effect);
      expect(effect).toBeDefined();
      expect(effect?.label.length).toBeGreaterThan(0);
    }
  });
});
