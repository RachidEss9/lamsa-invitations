import { describe, expect, it } from "vitest";
import {
  MATERIAL_PRESETS,
  copyMaterial,
  hasCopiedMaterial,
  materialForPreset,
  materialIsActive,
  materialOverlayStyle,
  materialReliefShadow,
  materialShapeRadius,
  materialTargetOf,
  materialTile,
  normalizeMaterial,
  pasteMaterial,
  supportsMaterial,
  supportsMaterialRelief,
} from "./materials";
import {
  cloneElement,
  duplicateElements,
  makeElement,
  normalizeDesign,
  type DesignDocument,
  type DesignPage,
} from "./design";
import type { InvitationContent } from "./invitation";

/**
 * Materials are settings, never pixels. These tests guard the two promises the
 * studio makes about them: an invitation saved before finishes existed opens
 * exactly as it was, and a finish can always be edited, copied, duplicated and
 * removed without touching the artwork underneath.
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

describe("material presets", () => {
  it("ships a starter finish for every category the studio offers", () => {
    const categories = new Set(MATERIAL_PRESETS.map((preset) => preset.category));
    expect([...categories].sort()).toEqual([
      "Embellishment",
      "Finish",
      "Foil",
      "Paper",
      "Relief",
    ]);
    for (const preset of MATERIAL_PRESETS) {
      expect(preset.label.length).toBeGreaterThan(0);
      expect(preset.note.length).toBeGreaterThan(0);
      const material = materialForPreset(preset.id);
      expect(material.preset).toBe(preset.id);
      expect(material.enabled).toBe(true);
      // Every preset must be usable the moment it is applied.
      expect(materialIsActive(material)).toBe(true);
      expect(materialOverlayStyle(material)).toBeDefined();
    }
  });

  it("draws a distinct tile per finish", () => {
    const tiles = new Set(MATERIAL_PRESETS.map((preset) => materialTile(materialForPreset(preset.id))));
    expect(tiles.size).toBe(MATERIAL_PRESETS.length);
    for (const tile of tiles) {
      expect(tile.startsWith("data:image/svg+xml,")).toBe(true);
    }
  });
});

describe("normalizeMaterial", () => {
  it("keeps a well-formed finish and fills in anything missing", () => {
    const normalized = normalizeMaterial({ preset: "linen", intensity: 0.7 });
    expect(normalized).toMatchObject({
      preset: "linen",
      enabled: true,
      intensity: 0.7,
      blend: "soft-light",
    });
    expect(normalized?.scale).toBe(1);
  });

  it("clamps out-of-range settings instead of rejecting them", () => {
    const normalized = normalizeMaterial({
      preset: "gold",
      intensity: 8,
      scale: 90,
      opacity: -3,
      relief: 12,
      softness: 5,
      foilStrength: 4,
      foil: "#C8A24B",
    });
    expect(normalized).toMatchObject({
      intensity: 1,
      scale: 3,
      opacity: 0,
      relief: 1,
      softness: 1,
      foilStrength: 1,
      foil: "#c8a24b",
    });
  });

  it("repairs a broken colour and an unknown blend with the preset's own", () => {
    const preset = MATERIAL_PRESETS.find((item) => item.id === "wax")!;
    const normalized = normalizeMaterial({
      preset: "wax",
      foil: "gold-ish",
      blend: "sparkle",
      finish: "glossy",
    });
    expect(normalized?.foil).toBe(preset.defaults.foil);
    expect(normalized?.blend).toBe(preset.defaults.blend);
    expect(normalized?.finish).toBe(preset.defaults.finish);
  });

  it("drops unknown presets and malformed values rather than guessing", () => {
    expect(normalizeMaterial(undefined)).toBeUndefined();
    expect(normalizeMaterial(null)).toBeUndefined();
    expect(normalizeMaterial("cotton")).toBeUndefined();
    expect(normalizeMaterial([1, 2, 3])).toBeUndefined();
    expect(normalizeMaterial({ preset: "chrome" })).toBeUndefined();
    expect(normalizeMaterial({})).toBeUndefined();
  });

  it("is idempotent, so autosave never rewrites a finish it just read", () => {
    const once = normalizeMaterial({
      preset: "rose-gold",
      intensity: 0.42,
      foil: "#C9977F",
      relief: -0.5,
    });
    const twice = normalizeMaterial(JSON.parse(JSON.stringify(once)));
    expect(twice).toEqual(once);
  });
});

describe("overlay and relief", () => {
  it("draws nothing for a finish that is switched off", () => {
    const material = { ...materialForPreset("cotton"), enabled: false };
    expect(materialIsActive(material)).toBe(false);
    expect(materialOverlayStyle(material)).toBeUndefined();
    expect(materialReliefShadow(material)).toBeUndefined();
  });

  it("carries the tile, the blend and the strength onto the overlay", () => {
    const material = { ...materialForPreset("gold"), scale: 2, opacity: 0.42 };
    const style = materialOverlayStyle(material)!;
    expect(style.backgroundImage).toContain("data:image/svg+xml");
    expect(style.backgroundSize).toBe("320px 320px");
    expect(style.backgroundRepeat).toBe("repeat");
    expect(style.mixBlendMode).toBe("hard-light");
    expect(style.opacity).toBeCloseTo(0.42, 3);
  });

  it("reads embossing as light on the near edge and dark on the far one", () => {
    const emboss = materialReliefShadow({ ...materialForPreset("emboss"), relief: 0.8 })!;
    expect(emboss.startsWith("inset")).toBe(true);
    // Split between the two shadows, not on a comma inside an rgba() channel.
    const [light, dark] = emboss.split("), inset ");
    expect(light).toContain("rgba(255, 255, 255");
    expect(dark).toContain("rgba(22, 22, 22");

    // A deboss is the same edge lit from the other side.
    const deboss = materialReliefShadow({ ...materialForPreset("deboss"), relief: -0.8 })!;
    const [shadowFirst, lightSecond] = deboss.split("), inset ");
    expect(shadowFirst).toContain("rgba(22, 22, 22");
    expect(lightSecond).toContain("rgba(255, 255, 255");
  });

  it("stays flat when there is no depth to draw", () => {
    expect(materialReliefShadow(materialForPreset("linen"))).toBeUndefined();
  });

  it("matches the border radius to how the vector stretches", () => {
    expect(materialShapeRadius({ kind: "shape", shape: "ellipse", w: 400, h: 600 })).toBe("50%");
    expect(materialShapeRadius({ kind: "shape", shape: "capsule", w: 400, h: 600 })).toBe(
      "50% / 50%",
    );
    // A rounded rectangle stretches with the box: 20 units of a 400 × 600 layer.
    expect(
      materialShapeRadius({ kind: "shape", shape: "rect", radius: 20, w: 400, h: 600 }),
    ).toBe("80.00px / 120.00px");
    expect(materialShapeRadius({ kind: "shape", shape: "rect", w: 400, h: 600 })).toBeUndefined();
    expect(materialShapeRadius({ kind: "shape", shape: "heart", w: 400, h: 600 })).toBeUndefined();
  });
});

describe("which layers a finish can honestly draw on", () => {
  it("offers finishes to surfaces and to nothing else", () => {
    expect(materialTargetOf(makeElement("shape", { shape: "rect" }))).toBe("shape");
    expect(materialTargetOf(makeElement("shape", { shape: "arch" }))).toBe("shape");
    expect(materialTargetOf(makeElement("image"))).toBe("image");
    expect(materialTargetOf(makeElement("text"))).toBeNull();
    expect(materialTargetOf(makeElement("motif"))).toBeNull();
    expect(materialTargetOf(makeElement("shape", { shape: "line" }))).toBeNull();
    expect(materialTargetOf(makeElement("shape", { shape: "frame" }))).toBeNull();
    expect(materialTargetOf(makeElement("shape", { frameArt: "botanical-01" }))).toBeNull();
    expect(supportsMaterial(null)).toBe(false);
  });

  it("offers depth only where an edge can hold it", () => {
    expect(supportsMaterialRelief(makeElement("shape", { shape: "rect" }))).toBe(true);
    expect(supportsMaterialRelief(makeElement("shape", { shape: "ellipse" }))).toBe(true);
    expect(supportsMaterialRelief(makeElement("image"))).toBe(true);
    expect(supportsMaterialRelief(makeElement("shape", { shape: "heart" }))).toBe(false);
  });
});

describe("document compatibility", () => {
  const page: DesignPage = {
    id: "page-1",
    name: "Invitation",
    background: "#f2f1ed",
    elements: [
      makeElement("shape", { id: "s1", shape: "rect" }),
      makeElement("text", { id: "t1", text: "Amelia" }),
    ],
  };

  const withMaterials: DesignDocument = {
    version: 1,
    pages: [
      {
        ...page,
        material: materialForPreset("linen"),
        elements: [
          { ...page.elements[0], material: materialForPreset("gold") },
          page.elements[1],
        ],
      },
    ],
    opening: {
      experience: "none",
      duration: 2600,
      autoOpen: false,
      welcome: "",
    },
    closing: { enabled: false, style: "message", message: "", duration: 1800 },
    transition: { preset: "fade", duration: 700 },
    startedAt: 0,
  };

  it("leaves an invitation saved before materials existed exactly as it was", () => {
    const legacy = normalizeDesign(withMaterials, content);
    const stripped = JSON.parse(
      JSON.stringify({
        ...legacy,
        pages: legacy.pages.map((candidate) => ({
          ...candidate,
          material: undefined,
          elements: candidate.elements.map((element) => ({
            ...element,
            material: undefined,
          })),
        })),
      }),
    ) as DesignDocument;

    const reloaded = normalizeDesign(stripped, content);
    expect(reloaded.pages[0].material).toBeUndefined();
    for (const element of reloaded.pages[0].elements) {
      expect(element.material).toBeUndefined();
    }
  });

  it("keeps a finish through a save and reload, unchanged", () => {
    const reloaded = normalizeDesign(
      JSON.parse(JSON.stringify(withMaterials)) as DesignDocument,
      content,
    );
    expect(reloaded.pages[0].material).toEqual(materialForPreset("linen"));
    expect(reloaded.pages[0].elements[0].material).toEqual(materialForPreset("gold"));
    // The second pass is a no-op: autosave cannot drift the settings.
    expect(
      normalizeDesign(JSON.parse(JSON.stringify(reloaded)) as DesignDocument, content),
    ).toEqual(reloaded);
  });

  it("drops a malformed finish instead of drawing the wrong one", () => {
    const damaged = JSON.parse(JSON.stringify(withMaterials)) as DesignDocument;
    // A loose view over the same objects, so TypeScript does not check the
    // corruption this test deliberately writes.
    const loose = damaged.pages as unknown as {
      material: unknown;
      elements: { material: unknown }[];
    }[];
    loose[0].material = { preset: "chrome", intensity: 2 };
    loose[0].elements[0].material = "gold";
    const repaired = normalizeDesign(damaged, content);
    expect(repaired.pages[0].material).toBeUndefined();
    expect(repaired.pages[0].elements[0].material).toBeUndefined();
  });
});

describe("duplicating a layer", () => {
  it("gives the copy its own finish", () => {
    const original = makeElement("shape", {
      id: "s1",
      name: "Panel",
      shape: "rect",
      material: materialForPreset("gold"),
    });
    // duplicateElements keeps the original in place and appends the copy.
    const [, copy] = duplicateElements([original], ["s1"]);
    expect(copy.id).not.toBe(original.id);
    expect(copy.material).toEqual(original.material);

    // Editing the copy must never reach back into the original.
    copy.material!.foil = "#111111";
    copy.material!.intensity = 0.05;
    expect(original.material!.foil).toBe("#c8a24b");
    expect(original.material!.intensity).toBe(0.45);
  });

  it("keeps a layer without a finish clean", () => {
    const original = makeElement("text", { id: "t1", name: "Names" });
    expect(cloneElement(original).material).toBeUndefined();
  });
});

describe("the session clipboard", () => {
  it("copies a finish and hands back its own copy", () => {
    const material = materialForPreset("satin");
    copyMaterial(material);
    expect(hasCopiedMaterial()).toBe(true);
    const pasted = pasteMaterial()!;
    expect(pasted).toEqual(material);
    pasted.intensity = 0.05;
    expect(material.intensity).not.toBe(0.05);
  });

  it("forgets it when a layer has nothing to copy", () => {
    copyMaterial(undefined);
    expect(hasCopiedMaterial()).toBe(false);
    expect(pasteMaterial()).toBeUndefined();
  });
});
