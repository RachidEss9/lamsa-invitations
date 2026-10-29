import { describe, it, expect } from "vitest";
import {
  containsArabic,
  fontById,
  fontIdsForText,
  fontFamilyFor,
  isLegacyFontId,
  supportsArabic,
  LEGACY_FONT_IDS,
} from "./fonts";
import type { DesignElement } from "./design";

describe("font resolution", () => {
  it("resolves a modern font id to its family", () => {
    const font = fontById("cormorant-garamond");
    expect(font.name).toBe("Cormorant Garamond");
    expect(font.script).toBe("latin");
  });

  it("resolves an Arabic font id", () => {
    const font = fontById("amiri");
    expect(font.name).toBe("Amiri");
    expect(font.script).toBe("arabic");
    expect(supportsArabic("amiri")).toBe(true);
  });

  it("resolves a legacy font-pair id to a library family", () => {
    expect(isLegacyFontId("romance")).toBe(true);
    const font = fontById("romance");
    expect(font.name).toBe("Cormorant Garamond");
  });

  it("falls back to Cormorant Garamond for unknown ids", () => {
    const font = fontById("unknown-id-12345");
    expect(font.name).toBe("Cormorant Garamond");
  });

  it("returns the CSS family string for rendering", () => {
    const family = fontFamilyFor("playfair-display");
    expect(family).toContain("Playfair Display");
  });

  it("every legacy font id maps to a real library family", () => {
    for (const [legacy, id] of Object.entries(LEGACY_FONT_IDS)) {
      const font = fontById(legacy);
      expect(font).toBeDefined();
      expect(font.id).toBe(id);
    }
  });
});

describe("text-aware font loading", () => {
  it("detects Arabic, including mixed lines, and leaves Latin alone", () => {
    expect(containsArabic("مرحباً بالعالم")).toBe(true);
    expect(containsArabic("LAMSA — مساء الخير! 2026")).toBe(true);
    expect(containsArabic("Alexandra & Omar — at last")).toBe(false);
    expect(containsArabic("14 June 2026, 16:00")).toBe(false);
    expect(containsArabic("")).toBe(false);
    expect(containsArabic(null)).toBe(false);
    expect(containsArabic(undefined)).toBe(false);
  });

  it("adds the Naskh fallback only when Arabic meets a Latin-only face", () => {
    // Latin face + Arabic words: both faces are needed and loaded.
    expect(fontIdsForText("مرحبا", "cormorant-garamond")).toEqual([
      "cormorant-garamond",
      "noto-naskh-arabic",
    ]);
    // Latin words need only the chosen family.
    expect(fontIdsForText("Alexandra & Omar", "cormorant-garamond")).toEqual([
      "cormorant-garamond",
    ]);
    // A family that already covers Arabic never gets a second face.
    expect(fontIdsForText("مرحبا", "amiri")).toEqual(["amiri"]);
    expect(fontIdsForText("مرحبا", "rubik")).toEqual(["rubik"]);
    // Unknown ids fall back to the house face, safely.
    expect(fontIdsForText("مرحبا", undefined)).toEqual([
      "cormorant-garamond",
      "noto-naskh-arabic",
    ]);
  });

  it("the fallback itself is a real Arabic family in the kit", () => {
    const fallback = fontById("noto-naskh-arabic");
    expect(fallback.script).toBe("arabic");
    expect(fallback.family).toContain("Noto Naskh Arabic");
  });
});

describe("font apply preserves properties", () => {
  function makeTextElement(overrides: Partial<DesignElement> = {}): DesignElement {
    return {
      id: "text-1",
      kind: "text",
      name: "Names",
      x: 100,
      y: 200,
      w: 500,
      h: 150,
      rotation: 0,
      opacity: 1,
      locked: false,
      hidden: false,
      text: "Alexandra & Omar",
      font: "cormorant-garamond",
      fontSize: 48,
      fontWeight: 400,
      italic: false,
      letterSpacing: 0.02,
      lineHeight: 1.2,
      align: "center",
      color: "#161616",
      animation: {
        enabled: true,
        preset: "fadeUp",
        trigger: "load",
        delay: 200,
        duration: 1200,
        easing: "easeOut",
      },
      ...overrides,
    };
  }

  it("changing font preserves all other text properties", () => {
    const before = makeTextElement();
    const after: DesignElement = {
      ...before,
      font: "playfair-display",
    };
    expect(after.font).toBe("playfair-display");
    expect(after.text).toBe(before.text);
    expect(after.fontSize).toBe(before.fontSize);
    expect(after.fontWeight).toBe(before.fontWeight);
    expect(after.align).toBe(before.align);
    expect(after.color).toBe(before.color);
    expect(after.letterSpacing).toBe(before.letterSpacing);
    expect(after.lineHeight).toBe(before.lineHeight);
    expect(after.italic).toBe(before.italic);
    expect(after.x).toBe(before.x);
    expect(after.y).toBe(before.y);
    expect(after.w).toBe(before.w);
    expect(after.h).toBe(before.h);
    expect(after.rotation).toBe(before.rotation);
    expect(after.opacity).toBe(before.opacity);
    expect(after.animation).toEqual(before.animation);
  });

  it("font apply only targets the selected element", () => {
    const elements: DesignElement[] = [
      makeTextElement({ id: "t1", font: "cormorant-garamond" }),
      makeTextElement({ id: "t2", font: "playfair-display" }),
    ];
    const selectedId = "t1";
    const patched = elements.map((el) =>
      el.id === selectedId ? { ...el, font: "amiri" } : el,
    );
    expect(patched[0].font).toBe("amiri");
    expect(patched[1].font).toBe("playfair-display");
  });

  it("font ids used by templates resolve to real families", () => {
    const templateFontIds = [
      "cormorant-garamond",
      "playfair-display",
      "amiri",
      "bodoni-moda",
      "cinzel",
      "great-vibes",
      "pinyon-script",
    ];
    for (const id of templateFontIds) {
      const font = fontById(id);
      expect(font).toBeDefined();
      expect(font.family.length).toBeGreaterThan(0);
    }
  });
});
