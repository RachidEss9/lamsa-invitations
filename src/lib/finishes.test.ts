import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DesignPageView } from "@/components/invitation/DesignPageView";
import {
  addFinishToStack,
  animationOn,
  copyFinishStack,
  DEFAULT_FINISH_LIGHTING,
  defaultFinishesConfig,
  duplicateFinishLayer,
  FINISH_ANIMATIONS,
  FINISH_DEFS,
  FINISH_MAX_LAYERS,
  FINISH_PRESETS,
  FINISH_PREVIEW_MODES,
  finishAnimationClass,
  finishDef,
  finishFilterRecipe,
  finishFits,
  finishGlyphFill,
  finishKindOf,
  finishLayer,
  finishLayerIsActive,
  finishPresetById,
  finishesFor,
  finishStackIsActive,
  finishSurfaceOf,
  finishTile,
  LIGHTING_PRESETS,
  metalGradient,
  moveFinishLayer,
  normalizeFinishLayer,
  normalizeFinishLayers,
  normalizeFinishLighting,
  normalizeFinishesConfig,
  pageBodyFinishes,
  pageEdgeFinish,
  patchFinishLayer,
  patchFinishesConfig,
  pasteFinishStack,
  presetStack,
  previewForcesAnimation,
  previewSurfaceStyle,
  removeFinishLayer,
  signatureAnimationClass,
  toggleFinishAnimation,
  type FinishLayer,
  type FinishLighting,
  type FinishesConfig,
} from "./finishes";
import {
  applyFinishPresetToDesign,
  clearFinishesFromDesign,
  createBlankDesign,
  makeElement,
  normalizeDesign,
  type DesignDocument,
  type DesignPage,
} from "./design";
import type { InvitationContent } from "./invitation";

/**
 * Finishes are settings, never pixels, and the composer, the studio canvas and
 * the public invitation all read them through this one module. These tests
 * guard what the host is promised: every catalogued finish composes honestly on
 * the surface it is offered for, the light and motion saved with the invitation
 * reach the shared renderer, and nothing a guest sees can drift from what the
 * studio previewed.
 */

const content: InvitationContent = {
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

const LIGHT: FinishLighting = { ...DEFAULT_FINISH_LIGHTING };

function pageWith(
  elements: DesignPage["elements"],
  page: Partial<DesignPage> = {},
): DesignPage {
  return { id: "page", name: "Page", background: "#faf6ec", elements, ...page };
}

function render(
  page: DesignPage,
  materialPreview = true,
  options: {
    finishes?: FinishesConfig;
    forceFinishAnimations?: boolean;
    reducedMotion?: boolean;
    rtl?: boolean;
  } = {},
): string {
  return renderToStaticMarkup(
    createElement(DesignPageView, {
      page,
      time: 100_000,
      imageUrls: {},
      materialPreview,
      finishes: options.finishes,
      forceFinishAnimations: options.forceFinishAnimations,
      reducedMotion: options.reducedMotion,
      rtl: options.rtl,
    }),
  );
}

function textElement(extra: Record<string, unknown> = {}) {
  return makeElement("text", {
    id: "t1",
    name: "Names",
    x: 100,
    y: 100,
    w: 600,
    h: 120,
    text: "Amelia & Søren",
    fontSize: 48,
    ...extra,
  });
}

describe("finish catalogue", () => {
  it("ships every finish with usable defaults and unique ids", () => {
    expect(FINISH_DEFS).toHaveLength(31);
    expect(new Set(FINISH_DEFS.map((def) => def.id)).size).toBe(31);
    const kinds = FINISH_DEFS.reduce<Record<string, number>>((counts, def) => {
      counts[def.kind] = (counts[def.kind] ?? 0) + 1;
      return counts;
    }, {});
    expect(kinds).toEqual({ metallic: 8, depth: 6, surface: 14, edge: 3 });

    for (const def of FINISH_DEFS) {
      expect(def.label.length, def.id).toBeGreaterThan(0);
      expect(def.note.length, def.id).toBeGreaterThan(0);
      expect(finishDef(def.id), def.id).toBe(def);
      expect(finishKindOf(def.id), def.id).toBe(def.kind);
      expect(def.defaults.intensity, def.id).toBeGreaterThanOrEqual(0);
      expect(def.defaults.intensity, def.id).toBeLessThanOrEqual(1);
      expect(def.defaults.opacity, def.id).toBeGreaterThan(0);
      // A fresh layer carries the finish's own defaults and draws immediately.
      const layer = finishLayer(def.id);
      expect(layer.finish, def.id).toBe(def.id);
      expect(layer.enabled, def.id).toBe(true);
      expect(layer.id, def.id).toBeTruthy();
    }
  });

  it("offers each finish only on surfaces it can honestly draw on", () => {
    // Type clips the finish into the glyphs; ornaments shade their strokes;
    // boxed artwork clips a silhouette; the sheet takes paper and metal.
    expect(finishFits(finishDef("gold-foil"), "text", "element")).toBe(true);
    expect(finishFits(finishDef("gold-foil"), "outline", "element")).toBe(true);
    expect(finishFits(finishDef("cotton-paper"), "outline", "element")).toBe(false);
    expect(finishFits(finishDef("wax-seal"), "text", "element")).toBe(false);
    expect(finishFits(finishDef("gilded-gold"), null, "element")).toBe(false);
    // The sheet can be a metal card as readily as a cotton one.
    expect(finishFits(finishDef("gold-foil"), null, "page")).toBe(true);
    expect(finishFits(finishDef("cotton-paper"), null, "page")).toBe(true);
    expect(finishFits(finishDef("gilded-gold"), null, "page")).toBe(true);
    expect(finishFits(finishDef("wax-seal"), null, "page")).toBe(false);
    expect(finishFits(finishDef("emboss"), null, "page")).toBe(false);

    const pageOptions = finishesFor(null, "page").map((def) => def.id);
    expect(pageOptions).toContain("gold-foil");
    expect(pageOptions).toContain("cotton-paper");
    expect(pageOptions).not.toContain("wax-seal");
    expect(pageOptions).not.toContain("emboss");

    const textOptions = finishesFor({ kind: "text" }).map((def) => def.id);
    expect(textOptions).toContain("gold-foil");
    expect(textOptions).not.toContain("gilded-gold");
    expect(textOptions).not.toContain("wax-seal");
  });

  it("reads a layer's surface from its geometry, including curved wording", () => {
    expect(finishSurfaceOf({ kind: "text" })).toBe("text");
    // Curved names are outlined SVG paths, so they take finishes as an
    // ornament does rather than pretending to carry a paper texture.
    expect(finishSurfaceOf({ kind: "text", curve: 0.4 })).toBe("outline");
    expect(finishSurfaceOf({ kind: "text", curve: 0.001 })).toBe("text");
    expect(finishSurfaceOf({ kind: "motif" })).toBe("outline");
    expect(finishSurfaceOf({ kind: "image" })).toBe("solid");
    expect(finishSurfaceOf({ kind: "shape", shape: "rect" })).toBe("solid");
    expect(finishSurfaceOf({ kind: "shape", shape: "line" })).toBe("outline");
    expect(finishSurfaceOf({ kind: "shape", shape: "frame" })).toBe("outline");
    expect(finishSurfaceOf({ kind: "shape", frameArt: "gold-frame" })).toBe("outline");
    expect(finishSurfaceOf(null)).toBeNull();
  });
});

describe("luxury presets", () => {
  it("ships eight presets, each of editable layers that fit their surface", () => {
    expect(FINISH_PRESETS).toHaveLength(8);
    expect(new Set(FINISH_PRESETS.map((preset) => preset.id)).size).toBe(8);

    for (const preset of FINISH_PRESETS) {
      expect(preset.label.length, preset.id).toBeGreaterThan(0);
      expect(preset.note.length, preset.id).toBeGreaterThan(0);
      expect(finishPresetById(preset.id), preset.id).toBe(preset);
      // Every preset brings its own studio light.
      expect(preset.lighting, preset.id).toBeTruthy();
      expect(normalizeFinishLighting(preset.lighting), preset.id).toEqual(
        preset.lighting,
      );

      const page = presetStack(preset, "page");
      expect(page.length, preset.id).toBeGreaterThan(0);
      expect(page.length, preset.id).toBeLessThanOrEqual(FINISH_MAX_LAYERS);
      for (const layer of page) {
        expect(finishFits(finishDef(layer.finish), null, "page"), `${preset.id}:${layer.finish}`).toBe(
          true,
        );
      }

      for (const target of ["text", "motif", "solid"] as const) {
        const stack = presetStack(preset, target);
        expect(stack.length, `${preset.id}:${target}`).toBeGreaterThan(0);
        const surface = target === "text" ? "text" : target === "motif" ? "outline" : "solid";
        for (const layer of stack) {
          expect(
            finishFits(finishDef(layer.finish), surface, "element"),
            `${preset.id}:${target}:${layer.finish}`,
          ).toBe(true);
        }
        // Layers are real, independently editable settings with their own ids.
        expect(new Set(stack.map((layer) => layer.id)).size).toBe(stack.length);
      }
    }

    expect(finishPresetById("nope")).toBeUndefined();
  });

  it("caps and de-duplicates a preset stack", () => {
    const layer = finishLayer("gold-foil");
    const preset = {
      id: "test",
      label: "Test",
      note: "Test",
      solid: [
        { finish: "gold-foil" as const },
        { finish: "gold-foil" as const },
        { finish: "emboss" as const },
        { finish: "deboss" as const },
        { finish: "spot-uv" as const },
        { finish: "velvet" as const },
      ],
    };
    const stack = presetStack(preset, "solid");
    expect(stack.length).toBeLessThanOrEqual(FINISH_MAX_LAYERS);
    expect(stack.filter((entry: FinishLayer) => entry.finish === "gold-foil")).toHaveLength(1);
    expect(layer.finish).toBe("gold-foil");
  });
});

describe("studio light", () => {
  it("clamps and wraps every light control", () => {
    const wrapped = normalizeFinishLighting({ direction: 400, intensity: 4, softness: -2, temperature: 9 });
    expect(wrapped.direction).toBe(40);
    expect(wrapped.intensity).toBe(1);
    expect(wrapped.softness).toBe(0);
    expect(wrapped.temperature).toBe(1);

    const negative = normalizeFinishLighting({ direction: -90 });
    expect(negative.direction).toBe(270);
    expect(normalizeFinishLighting(undefined)).toEqual(DEFAULT_FINISH_LIGHTING);
    expect(normalizeFinishLighting("nonsense")).toEqual(DEFAULT_FINISH_LIGHTING);
  });

  it("keeps four lighting presets that round-trip through normalisation", () => {
    expect(LIGHTING_PRESETS).toHaveLength(4);
    expect(new Set(LIGHTING_PRESETS.map((preset) => preset.id)).size).toBe(4);
    for (const preset of LIGHTING_PRESETS) {
      expect(normalizeFinishLighting(preset.lighting), preset.id).toEqual(preset.lighting);
    }
  });

  it("moves the metal ramp and the relief shadow with the light", () => {
    const layer = finishLayer("gold-foil");
    const left = metalGradient(layer, { direction: 42, intensity: 0.55, softness: 0.5, temperature: 0.12 });
    const right = metalGradient(layer, { direction: 240, intensity: 0.55, softness: 0.5, temperature: 0.12 });
    expect(left).toMatch(/linear-gradient\(/);
    expect(left).not.toBe(right);
  });
});

describe("animated effects", () => {
  it("ships eight uniquely identified motions", () => {
    expect(FINISH_ANIMATIONS).toHaveLength(8);
    expect(new Set(FINISH_ANIMATIONS.map((item) => item.id)).size).toBe(8);
    for (const item of FINISH_ANIMATIONS) {
      expect(item.label.length, item.id).toBeGreaterThan(0);
      expect(item.note.length, item.id).toBeGreaterThan(0);
    }
  });

  it("toggles one motion without disturbing the others or the light", () => {
    const base = patchFinishesConfig(undefined, { lighting: LIGHTING_PRESETS[2].lighting });
    const on = toggleFinishAnimation(base, "moving-light", true);
    expect(on.animations).toEqual(["moving-light"]);
    expect(on.lighting).toEqual(LIGHTING_PRESETS[2].lighting);

    const both = toggleFinishAnimation(on, "pearl-shimmer", true);
    expect(both.animations).toEqual(["moving-light", "pearl-shimmer"]);

    const off = toggleFinishAnimation(both, "moving-light", false);
    expect(off.animations).toEqual(["pearl-shimmer"]);
  });

  it("lets a preview force motion on, but never over reduced-motion", () => {
    const paused = { enabled: [], reducedMotion: false, forced: false };
    const forced = { enabled: [], reducedMotion: false, forced: true };
    expect(animationOn(paused, "moving-light")).toBe(false);
    expect(animationOn(forced, "moving-light")).toBe(true);
    expect(
      animationOn({ ...forced, reducedMotion: true }, "moving-light"),
    ).toBe(false);

    expect(finishAnimationClass(finishLayer("gold-foil"), forced)).toBe("lf-sweep");
    expect(finishAnimationClass(finishLayer("holographic-foil"), {
      enabled: ["holographic-shift"],
      reducedMotion: false,
      forced: false,
    })).toBe("lf-holo");
    expect(finishAnimationClass(finishLayer("pearlescent"), {
      enabled: ["pearl-shimmer"],
      reducedMotion: false,
      forced: false,
    })).toBe("lf-pearl");
    expect(finishAnimationClass(finishLayer("emboss"), {
      enabled: ["dynamic-shadows"],
      reducedMotion: false,
      forced: false,
    })).toBe("lf-shadow");
    expect(finishAnimationClass(finishLayer("gold-foil"), {
      enabled: ["moving-light"],
      reducedMotion: true,
      forced: true,
    })).toBeUndefined();
    expect(signatureAnimationClass({
      enabled: ["signature-reveal"],
      reducedMotion: false,
      forced: false,
    })).toBe("lf-signature");
  });
});

describe("finish configuration", () => {
  it("keeps an untouched rig out of the document", () => {
    expect(normalizeFinishesConfig(undefined)).toBeUndefined();
    expect(normalizeFinishesConfig("nope")).toBeUndefined();
    expect(normalizeFinishesConfig([])).toBeUndefined();
    // A design saved before the composer existed opens on the same default.
    expect(normalizeFinishesConfig(defaultFinishesConfig())).toBeUndefined();
  });

  it("keeps a real light, its motions and the applied preset", () => {
    const config: FinishesConfig = {
      version: 1,
      lighting: LIGHTING_PRESETS[1].lighting,
      animations: ["moving-light", "floating-dust"],
      preset: "royal-burgundy",
    };
    expect(normalizeFinishesConfig(config)).toEqual(config);

    const repaired = normalizeFinishesConfig({
      version: 1,
      lighting: { direction: -30, intensity: 2, softness: 0.4, temperature: -4 },
      animations: ["moving-light", "not-a-motion", "moving-light"],
      preset: "minimal-ivory",
    });
    expect(repaired?.lighting.direction).toBe(330);
    expect(repaired?.lighting.intensity).toBe(1);
    expect(repaired?.lighting.temperature).toBe(-1);
    expect(repaired?.animations).toEqual(["moving-light"]);
    expect(repaired?.preset).toBe("minimal-ivory");
  });

  it("patches one control without dropping the rest of the rig", () => {
    const withPreset = patchFinishesConfig(undefined, {
      preset: "silver-essence",
      lighting: LIGHTING_PRESETS[3].lighting,
    });
    const dimmed = patchFinishesConfig(withPreset, {
      lighting: { ...LIGHTING_PRESETS[3].lighting, intensity: 0.2 },
    });
    expect(dimmed?.preset).toBe("silver-essence");
    expect(dimmed?.lighting.intensity).toBe(0.2);
    expect(dimmed?.lighting.direction).toBe(LIGHTING_PRESETS[3].lighting.direction);
  });
});

describe("finish stacks", () => {
  it("repairs a saved stack: unknown finishes vanish, numbers clamp, four at most", () => {
    expect(normalizeFinishLayer(null)).toBeUndefined();
    expect(normalizeFinishLayer({ finish: "unobtainium" })).toBeUndefined();

    const repaired = normalizeFinishLayer({
      finish: "gold-foil",
      intensity: 5,
      depth: -9,
      opacity: 0,
      colour: "#ABCDEF",
      monogram: "ABCDEFG",
    });
    expect(repaired?.intensity).toBe(1);
    expect(repaired?.depth).toBe(-1);
    expect(repaired?.opacity).toBe(0);
    expect(repaired?.colour).toBe("#abcdef");
    // Monograms belong to wax, and are kept to four initials.
    expect(repaired?.monogram).toBeUndefined();

    const wax = normalizeFinishLayer({ finish: "wax-seal", monogram: "AEIOU" });
    expect(wax?.monogram).toBe("AEIO");

    const layers = normalizeFinishLayers([
      { finish: "gold-foil" },
      { finish: "gold-foil" },
      { finish: "emboss" },
      { finish: "spot-uv" },
      { finish: "velvet" },
      { finish: "cotton-paper" },
    ]);
    expect(layers.map((layer) => layer.finish)).toEqual([
      "gold-foil",
      "emboss",
      "spot-uv",
      "velvet",
    ]);
    expect(normalizeFinishLayers(undefined)).toEqual([]);
  });

  it("refuses combinations the renderer cannot draw honestly", () => {
    const twoDepth = [finishLayer("emboss")];
    const duplicate = finishLayer("gold-foil");
    const full = [
      finishLayer("gold-foil"),
      finishLayer("spot-uv"),
      finishLayer("velvet"),
      finishLayer("cotton-paper"),
    ];

    expect(addFinishToStack(twoDepth, "deboss", "text").ok).toBe(false);
    expect(addFinishToStack([duplicate], "gold-foil", "text").ok).toBe(false);
    expect(addFinishToStack(full, "pearlescent", "text").ok).toBe(false);
    expect(addFinishToStack([], "gilded-gold", "text").ok).toBe(false);
    expect(addFinishToStack([], "gold-foil", "text").ok).toBe(true);
    expect(addFinishToStack([], "cotton-paper", "outline").ok).toBe(false);
  });

  it("orders, duplicates, patches and removes layers by id", () => {
    const [first, second, third] = [
      finishLayer("gold-foil"),
      finishLayer("emboss"),
      finishLayer("spot-uv"),
    ];
    let stack = [first, second, third];

    stack = moveFinishLayer(stack, third.id, 0);
    expect(stack.map((layer) => layer.id)).toEqual([third.id, first.id, second.id]);
    expect(moveFinishLayer(stack, "missing", 0)).toBe(stack);

    const duplicated = duplicateFinishLayer(stack, first.id);
    expect(duplicated).toHaveLength(4);
    expect(duplicated[2].finish).toBe(first.finish);
    expect(duplicated[2].id).not.toBe(first.id);

    const fullStack = [
      finishLayer("gold-foil"),
      finishLayer("spot-uv"),
      finishLayer("velvet"),
      finishLayer("cotton-paper"),
    ];
    expect(duplicateFinishLayer(fullStack, fullStack[0].id)).toBe(fullStack);

    const patched = patchFinishLayer(stack, first.id, { intensity: 0.2, enabled: false });
    expect(patched.find((layer) => layer.id === first.id)?.intensity).toBe(0.2);
    expect(finishLayerIsActive(patched.find((layer) => layer.id === first.id))).toBe(false);

    const removed = removeFinishLayer(stack, second.id);
    expect(removed.map((layer) => layer.id)).toEqual([third.id, first.id]);
  });

  it("copies a stack once and pastes it onto another layer", () => {
    const stack = [finishLayer("gold-foil"), finishLayer("emboss")];
    expect(copyFinishStack(stack)).toHaveLength(2);
    const pasted = pasteFinishStack();
    expect(pasted?.map((layer) => layer.finish)).toEqual(["gold-foil", "emboss"]);
    // The paste is a copy: editing it can never reach back into the source.
    expect(pasted?.[0].id).not.toBe(stack[0].id);
  });

  it("separates the sheet's body from its gilded trim", () => {
    const stack = [
      finishLayer("cotton-paper"),
      finishLayer("emboss"),
      finishLayer("gold-foil"),
      finishLayer("gilded-gold"),
    ];
    expect(pageBodyFinishes(stack).map((layer) => layer.finish)).toEqual([
      "cotton-paper",
      "gold-foil",
    ]);
    expect(pageEdgeFinish(stack)?.finish).toBe("gilded-gold");
    expect(finishStackIsActive(stack)).toBe(true);
    expect(finishStackIsActive([{ ...finishLayer("gold-foil"), enabled: false }])).toBe(false);
  });
});

describe("finish rendering", () => {
  it("builds a real metal ramp and a real surface tile", () => {
    expect(metalGradient(finishLayer("gold-foil"), LIGHT)).toMatch(/linear-gradient\(/);
    expect(metalGradient(finishLayer("holographic-foil"), LIGHT)).toMatch(/linear-gradient\(/);
    expect(finishTile(finishLayer("linen-texture"))).toContain("data:image/svg+xml");
    expect(finishTile(finishLayer("linen-texture"))).not.toBe(
      finishTile(finishLayer("mother-of-pearl")),
    );
  });

  it("fills the glyphs, not a box, when type wears a finish", () => {
    const fill = finishGlyphFill([finishLayer("gold-foil")], LIGHT, "#161616");
    expect(fill?.ownsFill).toBe(true);
    expect(fill?.style.backgroundClip).toBe("text");
    expect(fill?.style.color).toBe("transparent");

    const paper = finishGlyphFill([finishLayer("cotton-paper")], LIGHT, "#161616");
    expect(paper?.ownsFill).toBe(false);
    // A texture alone rides over the layer's own ink colour.
    expect(paper?.style.backgroundColor).toBe("#161616");

    expect(finishGlyphFill([finishLayer("gilded-gold")], LIGHT, "#161616")).toBeUndefined();
    expect(finishGlyphFill([], LIGHT, "#161616")).toBeUndefined();
  });

  it("shades relief and metal through filters only where a filter is needed", () => {
    expect(finishFilterRecipe([finishLayer("emboss")], "text")?.depth?.finish).toBe("emboss");
    expect(finishFilterRecipe([finishLayer("emboss")], "text")?.metal).toBeUndefined();
    // Straight type clips metal into the glyphs, so no filter is needed.
    expect(finishFilterRecipe([finishLayer("gold-foil")], "text")).toBeUndefined();
    // Outlined artwork has no fill to clip, so the metal goes through a filter.
    expect(finishFilterRecipe([finishLayer("gold-foil")], "outline")?.metal?.finish).toBe(
      "gold-foil",
    );
    expect(finishFilterRecipe(undefined, "text")).toBeUndefined();
    expect(finishFilterRecipe([finishLayer("gold-foil")], null)).toBeUndefined();
  });

  it("renders a foil name into the markup with its words intact", () => {
    const page = pageWith([textElement({ finishes: [finishLayer("gold-foil")] })]);
    const markup = render(page);

    expect(markup).toContain("Amelia &amp; Søren");
    expect(markup).toContain("background-clip:text");
    expect(markup).toContain("color:transparent");
  });

  it("keeps Arabic shaping, RTL order and the words themselves", () => {
    const arabic = "ليلى ويوسف";
    const page = pageWith([
      textElement({
        id: "ar",
        text: arabic,
        rtl: true,
        finishes: [finishLayer("gold-foil")],
      }),
    ]);
    const markup = render(page, true, { rtl: true });

    expect(markup).toContain(arabic);
    expect(markup).toContain('dir="rtl"');
    expect(markup).toContain("background-clip:text");
  });

  it("gives a curved name relief and metal instead of a glyph fill", () => {
    const curved = pageWith([
      textElement({ curve: 0.4, finishes: [finishLayer("gold-foil"), finishLayer("emboss")] }),
    ]);
    const markup = render(curved);

    expect(markup).toContain("Amelia &amp; Søren");
    // No clipped glyph fill can follow an SVG path, so the finish arrives as a
    // filter over the rendered strokes — never silently at all.
    expect(markup).not.toContain("background-clip:text");
    expect(markup).toContain("feSpecularLighting");
    expect(markup).toContain("color-interpolation-filters");
  });

  it("clips a foil panel to a boxed shape and filters an ornament", () => {
    const panel = makeElement("shape", {
      id: "panel",
      name: "Panel",
      shape: "rect",
      x: 100,
      y: 100,
      w: 400,
      h: 600,
      fill: "#f2f1ed",
      finishes: [finishLayer("gold-foil"), finishLayer("emboss")],
    });
    const shapeMarkup = render(pageWith([panel]));
    expect(shapeMarkup).toContain("hard-light");
    expect(shapeMarkup).toContain("isolation:isolate");
    expect(shapeMarkup).toContain("feSpecularLighting");

    const sprig = makeElement("motif", {
      id: "sprig",
      name: "Sprig",
      motif: "sprig",
      x: 100,
      y: 100,
      w: 120,
      h: 120,
      color: "#161616",
      finishes: [finishLayer("gold-foil")],
    });
    const motifMarkup = render(pageWith([sprig]));
    // An ornament is strokes: the metal arrives as a filter, never a fill.
    expect(motifMarkup).toContain("feSpecularLighting");
    expect(motifMarkup).not.toContain("background-clip:text");
  });

  it("dresses the sheet itself, including a metal card and a gilded edge", () => {
    const paper = render(pageWith([], { finishes: [finishLayer("cotton-paper")] }));
    expect(paper).toContain("data:image/svg+xml");

    const metal = render(pageWith([], { finishes: [finishLayer("gold-foil")] }));
    expect(metal).toContain("linear-gradient");

    const gilded = render(pageWith([], { finishes: [finishLayer("gilded-gold")] }));
    expect(gilded).toContain("border-image");
  });

  it("gives a finish stack precedence over the older material preset", () => {
    const both = makeElement("shape", {
      id: "both",
      name: "Panel",
      shape: "rect",
      x: 100,
      y: 100,
      w: 400,
      h: 600,
      fill: "#f2f1ed",
      material: {
        preset: "gold",
        enabled: true,
        scale: 1,
        angle: 0,
        depth: 0.3,
        relief: "emboss",
        blend: "soft-light",
      } as never,
      finishes: [finishLayer("cotton-paper")],
    });
    const markup = render(pageWith([both]));
    // Only the finish is drawn: one surface treatment per layer.
    expect(markup).toContain("isolation:isolate");
    expect(markup).not.toContain("hard-light");
  });

  it("lights the sheet and plays motion from the saved configuration", () => {
    // Type takes its motion as a glint inside the glyph fill; a boxed layer
    // takes it as a sweep across the metal overlay.
    const type = pageWith([textElement({ finishes: [finishLayer("gold-foil")] })]);
    const panel = pageWith([
      makeElement("shape", {
        id: "panel",
        name: "Panel",
        shape: "rect",
        x: 60,
        y: 300,
        w: 300,
        h: 200,
        fill: "#f2f1ed",
        finishes: [finishLayer("gold-foil")],
      }),
    ]);
    const lit = render(type, true, {
      finishes: {
        version: 1,
        lighting: LIGHTING_PRESETS[1].lighting,
        animations: ["moving-light"],
      },
    });
    expect(lit).toContain("soft-light");
    expect(lit).toContain("lf-glint");

    const dark = render(type, true, {
      finishes: { version: 1, lighting: LIGHTING_PRESETS[1].lighting, animations: [] },
    });
    expect(dark).not.toContain("lf-glint");

    const sweeping = render(panel, true, {
      finishes: {
        version: 1,
        lighting: LIGHTING_PRESETS[1].lighting,
        animations: ["moving-light"],
      },
    });
    expect(sweeping).toContain("lf-sweep");

    // Motion Preview forces every effect on regardless of the switches…
    expect(render(panel, true, { forceFinishAnimations: true })).toContain("lf-sweep");
    // …but never over artwork mode or a reduced-motion preference.
    expect(render(panel, false, { forceFinishAnimations: true })).not.toContain("lf-sweep");
    expect(
      render(panel, true, { forceFinishAnimations: true, reducedMotion: true }),
    ).not.toContain("lf-sweep");
  });

  it("shows the untouched artwork in Artwork mode and restores it exactly", () => {
    const finishes = [finishLayer("gold-foil"), finishLayer("emboss")];
    const finished = pageWith([
      textElement({ finishes }),
      makeElement("shape", {
        id: "panel",
        name: "Panel",
        shape: "rect",
        x: 60,
        y: 300,
        w: 300,
        h: 200,
        fill: "#f2f1ed",
        finishes,
      }),
    ]);
    const original = pageWith([
      textElement(),
      makeElement("shape", {
        id: "panel",
        name: "Panel",
        shape: "rect",
        x: 60,
        y: 300,
        w: 300,
        h: 200,
        fill: "#f2f1ed",
      }),
    ]);

    // Comparing is a pure render: the original is byte-identical to a page
    // that never had a finish, and the finished page comes straight back.
    expect(render(finished, false)).toBe(render(original, false));
    expect(render(finished, true)).toContain("background-clip:text");
    expect(render(finished, true)).not.toBe(render(original, true));
  });

  it("keeps the whole rig through save, reload and a second save", () => {
    const design: DesignDocument = createBlankDesign({ pages: 1 });
    design.pages[0].finishes = [finishLayer("cotton-paper"), finishLayer("gilded-gold")];
    design.pages[0].elements = [
      textElement({ finishes: [finishLayer("gold-foil"), finishLayer("emboss")] }),
    ];
    design.finishes = {
      version: 1,
      lighting: LIGHTING_PRESETS[2].lighting,
      animations: ["moving-light", "floating-dust"],
      preset: "royal-burgundy",
    };

    const stored = JSON.parse(JSON.stringify(design)) as DesignDocument;
    const reloaded = normalizeDesign(stored, content);

    expect(reloaded.finishes).toEqual(design.finishes);
    expect(reloaded.pages[0].finishes?.map((layer) => layer.finish)).toEqual([
      "cotton-paper",
      "gilded-gold",
    ]);
    expect(reloaded.pages[0].elements[0].finishes?.map((layer) => layer.finish)).toEqual([
      "gold-foil",
      "emboss",
    ]);
    // A second round trip is stable: nothing is lost or reordered by saving.
    const again = normalizeDesign(
      JSON.parse(JSON.stringify(reloaded)) as DesignDocument,
      content,
    );
    expect(again.finishes).toEqual(reloaded.finishes);
    expect(again.pages[0].finishes).toEqual(reloaded.pages[0].finishes);
    expect(again.pages[0].elements[0].finishes).toEqual(
      reloaded.pages[0].elements[0].finishes,
    );
  });

  it("drops a malformed rig rather than drawing it", () => {
    const design: DesignDocument = createBlankDesign({ pages: 1 });
    const broken = JSON.parse(JSON.stringify(design)) as Record<string, unknown>;
    broken.finishes = { version: 1, lighting: "dim", animations: ["nope"], preset: 7 };
    broken.pages = [
      {
        id: "page",
        name: "Page",
        background: "#faf6ec",
        elements: [{ ...textElement(), finishes: [{ finish: "unobtainium" }] }],
        finishes: "nonsense",
      },
    ];

    const reloaded = normalizeDesign(broken as unknown as DesignDocument, content);
    expect(reloaded.finishes).toBeUndefined();
    expect(reloaded.pages[0].finishes).toBeUndefined();
    expect(reloaded.pages[0].elements[0].finishes).toBeUndefined();
  });
});

describe("applying a preset to the invitation", () => {
  function invitation(): DesignDocument {
    const design = createBlankDesign({ pages: 1 });
    design.pages[0].elements = [
      textElement({ id: "names" }),
      makeElement("motif", {
        id: "sprig",
        name: "Sprig",
        motif: "sprig",
        x: 40,
        y: 240,
        w: 120,
        h: 120,
        color: "#161616",
      }),
      makeElement("shape", {
        id: "panel",
        name: "Panel",
        shape: "rect",
        x: 40,
        y: 400,
        w: 300,
        h: 200,
        fill: "#f2f1ed",
      }),
    ];
    return design;
  }

  it("writes the preset's light and a real stack on the sheet and every layer", () => {
    const preset = finishPresetById("royal-burgundy")!;
    const design = applyFinishPresetToDesign(invitation(), preset.id);

    // The rig is part of the design, not the UI.
    expect(design.finishes?.preset).toBe(preset.id);
    expect(design.finishes?.lighting).toEqual(preset.lighting);
    expect(design.finishes?.animations).toEqual([]);

    expect(design.pages[0].finishes?.map((layer) => layer.finish)).toEqual(["cotton-paper"]);
    const [names, sprig, panel] = design.pages[0].elements;
    expect(names.finishes?.map((layer) => layer.finish)).toEqual(["gold-foil", "emboss"]);
    expect(sprig.finishes?.map((layer) => layer.finish)).toEqual(["blind-emboss"]);
    expect(panel.finishes?.map((layer) => layer.finish)).toEqual(["antique-gold"]);

    // Applied stacks are ordinary editable layers with their own ids.
    const ids = design.pages[0].elements.flatMap((element) =>
      (element.finishes ?? []).map((layer) => layer.id),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("replaces the previous look instead of piling stacks up", () => {
    const first = applyFinishPresetToDesign(invitation(), "royal-burgundy");
    const second = applyFinishPresetToDesign(first, "modern-holographic");
    const preset = finishPresetById("modern-holographic")!;

    expect(second.finishes?.preset).toBe(preset.id);
    expect(second.pages[0].finishes?.map((layer) => layer.finish)).toEqual(["matte-seal"]);
    expect(second.pages[0].elements[0].finishes?.map((layer) => layer.finish)).toEqual([
      "holographic-foil",
    ]);
    expect(second.pages[0].elements[0].finishes).toHaveLength(1);
  });

  it("keeps saved motion and ignores an unknown preset", () => {
    const base = invitation();
    base.finishes = {
      version: 1,
      lighting: LIGHTING_PRESETS[0].lighting,
      animations: ["floating-dust"],
    };
    const design = applyFinishPresetToDesign(base, "minimal-ivory");
    expect(design.finishes?.animations).toEqual(["floating-dust"]);
    expect(design.finishes?.lighting).toEqual(finishPresetById("minimal-ivory")!.lighting);

    expect(applyFinishPresetToDesign(base, "no-such-preset")).toBe(base);
  });

  it("skips layers that cannot carry a finish and survives a reload", () => {
    const design = invitation();
    // A layer the renderer has no surface for must stay bare rather than
    // inherit the sheet's stack.
    design.pages[0].elements.push({
      ...textElement({ id: "odd" }),
      kind: "mystery" as never,
    });
    const applied = applyFinishPresetToDesign(design, "pearl-atelier");
    expect(applied.pages[0].elements[3].finishes).toBeUndefined();

    const reloaded = normalizeDesign(
      JSON.parse(JSON.stringify(applied)) as DesignDocument,
      content,
    );
    expect(reloaded.finishes).toEqual(applied.finishes);
    expect(reloaded.pages[0].finishes).toEqual(applied.pages[0].finishes);
    expect(reloaded.pages[0].elements.map((element) => element.finishes)).toEqual(
      applied.pages[0].elements.map((element) => element.finishes),
    );
  });

  it("retires the older material preset it supersedes", () => {
    const design = invitation();
    design.pages[0].material = { preset: "gold", enabled: true, scale: 1, angle: 0, depth: 0.3 } as never;
    design.pages[0].elements[0] = {
      ...design.pages[0].elements[0],
      material: { preset: "linen", enabled: true, scale: 1, angle: 0, depth: 0.2 } as never,
    };
    const applied = applyFinishPresetToDesign(design, "royal-burgundy");
    expect(applied.pages[0].material).toBeUndefined();
    expect(applied.pages[0].elements[0].material).toBeUndefined();
  });

  it("clears every finish without touching the artwork", () => {
    const applied = applyFinishPresetToDesign(invitation(), "heritage-gold");
    const cleared = clearFinishesFromDesign(applied);

    expect(cleared.finishes).toBeUndefined();
    expect(cleared.pages[0].finishes).toBeUndefined();
    expect(cleared.pages[0].elements.every((element) => element.finishes === undefined)).toBe(
      true,
    );
    // Words, geometry and fills are exactly as they were.
    expect(cleared.pages[0].elements.map((element) => element.kind)).toEqual(
      applied.pages[0].elements.map((element) => element.kind),
    );
    expect(cleared.pages[0].elements[0].text).toBe(applied.pages[0].elements[0].text);
    expect(cleared.pages[0].elements[2].x).toBe(applied.pages[0].elements[2].x);
    expect(cleared.pages[0].background).toBe(applied.pages[0].background);

    // And comparing it against the original is a pure render, so the finished
    // version is restored exactly by switching the preview back on.
    expect(render(cleared.pages[0], false)).toBe(render(applied.pages[0], false));
    expect(render(applied.pages[0], true)).toContain("background-clip:text");
  });
});

describe("preview environments", () => {
  it("ships six environments and forces motion only for Motion Preview", () => {
    expect(FINISH_PREVIEW_MODES).toHaveLength(6);
    expect(new Set(FINISH_PREVIEW_MODES.map((mode) => mode.id)).size).toBe(6);
    for (const mode of FINISH_PREVIEW_MODES) {
      expect(mode.label.length, mode.id).toBeGreaterThan(0);
      expect(mode.note.length, mode.id).toBeGreaterThan(0);
      expect(previewForcesAnimation(mode.id)).toBe(mode.id === "motion");
    }
  });

  it("treats each environment as a presentation layer over the artwork", () => {
    expect(previewSurfaceStyle("studio")).toEqual({});
    expect(previewSurfaceStyle("candlelight").filter).toContain("sepia");
    expect(previewSurfaceStyle("daylight").filter).toContain("brightness");
    expect(previewSurfaceStyle("midnight").background).toContain("radial-gradient");
    expect(previewSurfaceStyle("macro").transform).toContain("scale");
    expect(previewSurfaceStyle("motion")).toEqual({});
  });
});
