import { describe, expect, it } from "vitest";
import type { OpeningSettings } from "./design";
import {
  applySavedOpening,
  openingPaletteOf,
  openingSummary,
  openingToneOf,
  parseSavedOpenings,
  removeSavedOpening,
  serializeSavedOpenings,
  upsertSavedOpening,
} from "./openings";

const base: OpeningSettings = {
  experience: "envelope",
  duration: 2800,
  autoOpen: false,
  welcome: "You are invited",
  coverStorageId: "storage-a",
  tone: "ivory",
  palette: { accent: "#7b1027", paper: "#f4ecdd" },
  motion: { startScale: 0.7, rise: 420, cardStart: 0.3 },
};

const colours = { accent: "#710014", paper: "#f2f1ed", hull: "#161616" };

describe("opening materials", () => {
  it("uses each suite's natural material until one is chosen", () => {
    expect(openingToneOf({ ...base, tone: undefined })).toBe("crimson");
    expect(
      openingToneOf({ ...base, tone: undefined, experience: "wax-seal" }),
    ).toBe("ink");
    expect(openingToneOf({ ...base, tone: "ink" })).toBe("ink");
    expect(openingToneOf({ ...base, tone: "ivory" })).toBe("ivory");
  });

  it("only accepts real colours and otherwise keeps the design palette", () => {
    expect(openingPaletteOf(colours, base)).toEqual({
      accent: "#7b1027",
      paper: "#f4ecdd",
      hull: colours.hull,
    });
    expect(
      openingPaletteOf(colours, {
        ...base,
        palette: { accent: "crimson", paper: "  ", hull: "#f0f" },
      }),
    ).toEqual({ accent: colours.accent, paper: colours.paper, hull: "#f0f" });
    expect(openingPaletteOf(colours, { ...base, palette: undefined })).toEqual(colours);
  });
});

describe("saved opening configurations", () => {
  it("round-trips through storage", () => {
    const list = upsertSavedOpening([], base, "Burgundy suite", 1000);
    expect(list).toHaveLength(1);
    expect(parseSavedOpenings(serializeSavedOpenings(list))).toEqual(list);
  });

  it("ignores malformed storage instead of throwing", () => {
    expect(parseSavedOpenings(null)).toEqual([]);
    expect(parseSavedOpenings("{")).toEqual([]);
    expect(parseSavedOpenings('{"opening":{}}')).toEqual([]);
    expect(parseSavedOpenings('[{"id":"a","label":"x"}]')).toEqual([]);
  });

  it("updates a configuration saved under the same name", () => {
    const first = upsertSavedOpening([], base, "House opening", 10);
    const second = upsertSavedOpening(
      first,
      { ...base, duration: 3200 },
      "house opening",
      20,
    );
    expect(second).toHaveLength(1);
    expect(second[0].opening.duration).toBe(3200);
  });

  it("caps the library and can remove an entry", () => {
    let list = parseSavedOpenings(null);
    for (let index = 0; index < 24; index += 1) {
      list = upsertSavedOpening(list, base, `opening ${index}`, index + 1);
    }
    expect(list).toHaveLength(18);
    expect(list[0].label).toBe("opening 23");
    const trimmed = removeSavedOpening(list, list[0].id);
    expect(trimmed).toHaveLength(17);
    expect(removeSavedOpening(trimmed, "missing")).toHaveLength(17);
  });

  it("carries the suite but never another invitation's cover or auto-open", () => {
    const saved = upsertSavedOpening([], { ...base, autoOpen: true }, "Ink suite", 5)[0];
    const target: OpeningSettings = {
      experience: "fade",
      duration: 2600,
      autoOpen: false,
      welcome: "With love",
      coverStorageId: "storage-b",
    };
    const applied = applySavedOpening(target, saved);
    expect(applied.experience).toBe("envelope");
    expect(applied.tone).toBe("ivory");
    expect(applied.palette).toEqual(base.palette);
    expect(applied.motion).toEqual(base.motion);
    expect(applied.welcome).toBe("You are invited");
    expect(applied.coverStorageId).toBe("storage-b");
    expect(applied.autoOpen).toBe(false);
  });

  it("summarises a configuration for the library list", () => {
    expect(openingSummary(base)).toContain("2.8s");
    expect(openingSummary(base)).toContain("Ivory");
    expect(openingSummary(base)).toContain("#7B1027");
  });
});
