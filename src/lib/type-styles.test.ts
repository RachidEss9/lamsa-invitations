import { describe, it, expect } from "vitest";
import type { DesignElement } from "./design";
import {
  applyTypeStyle,
  describeTypeStyle,
  extractTypeStyle,
  type TypeStyle,
} from "./type-styles";

function textElement(overrides: Partial<DesignElement> = {}): DesignElement {
  return {
    id: "title",
    kind: "text",
    name: "Title",
    x: 100,
    y: 200,
    w: 500,
    h: 120,
    rotation: 4,
    opacity: 1,
    locked: false,
    hidden: false,
    text: "Amara & Julian",
    font: "bodoni-moda",
    fontSize: 64,
    fontWeight: 500,
    italic: false,
    uppercase: false,
    letterSpacing: 0.12,
    lineHeight: 1.1,
    align: "center",
    color: "#710014",
    animation: {
      enabled: true,
      preset: "fade",
      trigger: "load",
      delay: 0,
      duration: 800,
      easing: "easeOut",
    },
    ...overrides,
  };
}

describe("typography styles", () => {
  it("extracts only lettering, never geometry or content", () => {
    const style = extractTypeStyle(textElement());
    expect(style).toEqual({
      font: "bodoni-moda",
      fontSize: 64,
      fontWeight: 500,
      italic: false,
      uppercase: false,
      letterSpacing: 0.12,
      lineHeight: 1.1,
      align: "center",
      color: "#710014",
    });
    expect(style).not.toHaveProperty("x");
    expect(style).not.toHaveProperty("text");
    expect(style).not.toHaveProperty("animation");
  });

  it("returns an empty style for a non-text layer", () => {
    expect(extractTypeStyle(textElement({ kind: "shape" }))).toEqual({});
    expect(extractTypeStyle(null)).toEqual({});
  });

  it("applies a style without moving or retyping the layer", () => {
    const target = textElement({
      id: "body",
      x: 40,
      y: 900,
      w: 300,
      h: 80,
      rotation: -2,
      text: "Reception to follow",
      font: "inter",
      fontSize: 18,
    });
    const style: TypeStyle = {
      font: "cormorant-garamond",
      fontSize: 22,
      letterSpacing: 0.2,
      color: "#161616",
    };
    const next = applyTypeStyle(target, style);
    expect(next).toMatchObject({
      id: "body",
      x: 40,
      y: 900,
      w: 300,
      h: 80,
      rotation: -2,
      text: "Reception to follow",
      font: "cormorant-garamond",
      fontSize: 22,
      letterSpacing: 0.2,
      color: "#161616",
    });
    // Untouched keys keep their values.
    expect(next.align).toBe("center");
    expect(next.animation).toEqual(target.animation);
  });

  it("never converts a shape into text", () => {
    const shape = textElement({ kind: "shape" });
    expect(applyTypeStyle(shape, { font: "inter" })).toBe(shape);
  });

  it("summarises a style for the library row", () => {
    expect(
      describeTypeStyle(
        { fontSize: 28, fontWeight: 600, uppercase: true, letterSpacing: 0.1 },
        "Cinzel",
      ),
    ).toBe("Cinzel · 28 px · 600 · 0.10 em tracking · uppercase");
    expect(describeTypeStyle({}, "Amiri")).toBe("Amiri");
  });
});
