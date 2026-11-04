import { describe, expect, it } from "vitest";
import { DOC_TYPES } from "./model";
import {
  CUSTOM_PRESET_ID,
  DEFAULT_PRESET_ID,
  DOCUMENT_PRESETS,
  customPageSpec,
  defaultPresetForDocType,
  pageSpecFromPreset,
  presetById,
  presetsForDocType,
} from "./presets";
import { PT_PER_INCH, PT_PER_MM } from "./units";

/**
 * The eight publication categories are configuration, not code paths. A
 * preset may describe a real paper size; only the custom preset refuses to
 * invent one.
 */

describe("preset catalogue", () => {
  it("covers every document category exactly once as a default", () => {
    expect(DOCUMENT_PRESETS).toHaveLength(8);
    expect(new Set(DOCUMENT_PRESETS.map((preset) => preset.docType)).size).toBe(8);
    expect(DOCUMENT_PRESETS.map((preset) => preset.docType).sort()).toEqual([...DOC_TYPES].sort());
  });

  it("uses unique ids and names", () => {
    expect(new Set(DOCUMENT_PRESETS.map((preset) => preset.id)).size).toBe(8);
    expect(new Set(DOCUMENT_PRESETS.map((preset) => preset.name)).size).toBe(8);
  });

  it("resolves presets by id and category", () => {
    expect(presetById(DEFAULT_PRESET_ID)?.docType).toBe("album");
    expect(presetById("nope")).toBeUndefined();
    for (const docType of DOC_TYPES) {
      const preset = defaultPresetForDocType(docType);
      expect(preset?.docType).toBe(docType);
      expect(presetsForDocType(docType)).toHaveLength(1);
    }
  });
});

describe("preset sizes", () => {
  it("keeps a 12-inch album exactly square", () => {
    const album = presetById("album-12x12")!;
    expect(album.size).toEqual({ width: 12 * PT_PER_INCH, height: 12 * PT_PER_INCH });
    expect(album.size!.width).toBe(864);
  });

  it("converts millimetre presets to points", () => {
    const magazine = presetById("magazine-a4")!;
    expect(magazine.size!.width).toBeCloseTo(210 * PT_PER_MM, 9);
    expect(magazine.size!.height).toBeCloseTo(297 * PT_PER_MM, 9);
    expect(magazine.bleed).toBeCloseTo(3 * PT_PER_MM, 9);
  });

  it("keeps a 6 × 9 book portrait", () => {
    const book = presetById("book-6x9")!;
    expect(book.size).toEqual({ width: 432, height: 648 });
    expect(book.margins.left).toBeCloseTo(0.75 * 72, 9);
    expect(book.mirrorMargins).toBe(true);
  });

  it("makes the brochure and portfolio landscape", () => {
    expect(presetById("brochure-a4-landscape")!.size!.width).toBeGreaterThan(
      presetById("brochure-a4-landscape")!.size!.height,
    );
    expect(presetById("portfolio-a4-landscape")!.size!.width).toBeGreaterThan(
      presetById("portfolio-a4-landscape")!.size!.height,
    );
  });

  it("leaves the custom preset without a size", () => {
    const custom = presetById(CUSTOM_PRESET_ID)!;
    expect(custom.size).toBeNull();
    expect(custom.requiresSize).toBe(true);
    expect(custom.docType).toBe("custom");
    expect(DOCUMENT_PRESETS.filter((preset) => preset.requiresSize)).toHaveLength(1);
  });
});

describe("facing behaviour", () => {
  it("is configured per category", () => {
    expect(presetById("album-12x12")!.facingPages).toBe(true);
    expect(presetById("magazine-a4")!.facingPages).toBe(true);
    expect(presetById("brochure-a4-landscape")!.facingPages).toBe(false);
    expect(presetById("menu-a4")!.facingPages).toBe(false);
  });

  it("carries a grid the editor can honour", () => {
    for (const preset of DOCUMENT_PRESETS) {
      expect(preset.grid.columns).toBeGreaterThanOrEqual(1);
      expect(preset.grid.gutter).toBeGreaterThanOrEqual(0);
      expect(preset.grid.baseline).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("page specs from presets", () => {
  it("turns a preset into a full page spec", () => {
    const preset = presetById("book-6x9")!;
    const spec = pageSpecFromPreset(preset);
    expect(spec.trim).toEqual({ width: 432, height: 648 });
    expect(spec.mirrorMargins).toBe(true);
    expect(spec.margins.left).toBeCloseTo(54, 9);
  });

  it("accepts overrides without losing the preset's other settings", () => {
    const preset = presetById("magazine-a4")!;
    const spec = pageSpecFromPreset(preset, {
      trim: { width: 500, height: 700 },
      bleed: 5,
      margins: { top: 10, right: 10, bottom: 10, left: 10 },
    });
    expect(spec.trim).toEqual({ width: 500, height: 700 });
    expect(spec.bleed).toBe(5);
    expect(spec.margins.top).toBe(10);
    expect(spec.mirrorMargins).toBe(true);
  });

  it("refuses to invent a size for the custom preset", () => {
    const custom = presetById(CUSTOM_PRESET_ID)!;
    expect(() => pageSpecFromPreset(custom)).toThrow(RangeError);
    expect(
      pageSpecFromPreset(custom, { trim: { width: 300, height: 400 } }).trim,
    ).toEqual({ width: 300, height: 400 });
  });

  it("builds a custom page spec only from real dimensions", () => {
    expect(() => customPageSpec({ width: 0, height: 100 })).toThrow(RangeError);
    const spec = customPageSpec({ width: 300, height: 400 });
    expect(spec.trim).toEqual({ width: 300, height: 400 });
    expect(spec.bleed).toBeCloseTo(3 * PT_PER_MM, 9);
    expect(spec.mirrorMargins).toBe(false);
  });
});
