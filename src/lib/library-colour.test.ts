import { describe, it, expect } from "vitest";
import type { DesignElement, DesignPage } from "./design";
import type { ColourPalette } from "./palettes";
import { paletteSwatches, recolourSelection } from "./library-colour";

const animation = {
  enabled: true,
  preset: "fade" as const,
  trigger: "load" as const,
  delay: 0,
  duration: 600,
  easing: "easeOut" as const,
};

function element(overrides: Partial<DesignElement>): DesignElement {
  return {
    id: "el",
    kind: "text",
    name: "Layer",
    x: 0,
    y: 0,
    w: 100,
    h: 40,
    rotation: 0,
    opacity: 1,
    locked: false,
    hidden: false,
    animation,
    ...overrides,
  };
}

function page(elements: DesignElement[], background = "#faf6ec"): DesignPage {
  return { id: "p1", name: "Page", background, elements };
}

describe("recolourSelection", () => {
  it("recolours text ink, shape fill and motif ink by layer id", () => {
    const input = page([
      element({ id: "names", kind: "text", color: "#161616" }),
      element({ id: "rule", kind: "shape", shape: "line", fill: "#b38f6f" }),
      element({ id: "sprig", kind: "motif", motif: "sprig", color: "#161616" }),
      element({ id: "other", kind: "text", color: "#161616" }),
    ]);

    const out = recolourSelection(input, ["names", "rule", "sprig"], "#710014");

    expect(out.elements.find((el) => el.id === "names")?.color).toBe("#710014");
    expect(out.elements.find((el) => el.id === "rule")?.fill).toBe("#710014");
    expect(out.elements.find((el) => el.id === "sprig")?.color).toBe("#710014");
  });

  it("leaves unselected layers and photographs untouched", () => {
    const input = page([
      element({ id: "photo", kind: "image", imageStorageId: "storage-1" }),
      element({ id: "name", kind: "text", color: "#161616" }),
    ]);

    const out = recolourSelection(input, ["photo"], "#710014");

    expect(out.elements[0]).toEqual(input.elements[0]);
    expect(out.elements[1]).toEqual(input.elements[1]);
  });

  it("returns the same page when the colour is already applied", () => {
    const input = page([element({ id: "name", kind: "text", color: "#710014" })]);
    expect(recolourSelection(input, ["name"], "#710014")).toBe(input);
  });

  it("returns the same page when nothing is selected", () => {
    const input = page([element({ id: "name", kind: "text", color: "#161616" })]);
    expect(recolourSelection(input, [], "#710014")).toBe(input);
  });

  it("never mutates the page it was given", () => {
    const input = page([element({ id: "name", kind: "text", color: "#161616" })]);
    const snapshot = JSON.parse(JSON.stringify(input));

    recolourSelection(input, ["name"], "#710014");

    expect(input).toEqual(snapshot);
  });
});

describe("paletteSwatches", () => {
  const palette = (
    overrides: Partial<ColourPalette> & Pick<ColourPalette, "id" | "name">,
  ): ColourPalette => ({
    group: "Luxury",
    paper: "#f2f1ed",
    ink: "#161616",
    accent: "#710014",
    ...overrides,
  });

  it("flattens paper, ink and accent in palette order", () => {
    const swatches = paletteSwatches([
      palette({ id: "a", name: "Crimson didone" }),
      palette({
        id: "b",
        name: "Champagne noir",
        paper: "#141312",
        ink: "#f4ecdd",
        accent: "#c3a469",
      }),
    ]);

    expect(swatches.map((swatch) => swatch.hex)).toEqual([
      "#f2f1ed",
      "#161616",
      "#710014",
      "#141312",
      "#f4ecdd",
      "#c3a469",
    ]);
    expect(swatches[3]).toEqual({
      hex: "#141312",
      palette: "Champagne noir",
      role: "paper",
    });
  });

  it("dedupes colours case-insensitively and keeps the first palette label", () => {
    const swatches = paletteSwatches([
      palette({ id: "a", name: "First", accent: "#C3A469" }),
      palette({
        id: "b",
        name: "Second",
        paper: "#c3a469",
        ink: "#c3a469",
        accent: "#c3a469",
      }),
    ]);

    expect(swatches.filter((swatch) => swatch.hex.toLowerCase() === "#c3a469")).toEqual([
      { hex: "#C3A469", palette: "First", role: "accent" },
    ]);
  });

  it("handles an empty palette list", () => {
    expect(paletteSwatches([])).toEqual([]);
  });
});
