import { describe, it, expect } from "vitest";
import type { DesignElement, DesignPage } from "./design";
import {
  MAX_SAVED_PALETTES,
  SAVED_PALETTES_KEY,
  paletteFromPage,
  readSavedPalettes,
  removeSavedPalette,
  upsertSavedPalette,
  writeSavedPalettes,
  type SavedPalette,
} from "./palettes";

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
    animation: {
      enabled: true,
      preset: "fade",
      trigger: "load",
      delay: 0,
      duration: 600,
      easing: "easeOut",
    },
    ...overrides,
  };
}

function page(elements: DesignElement[], background = "#faf6ec"): DesignPage {
  return { id: "p1", name: "Page", background, elements };
}

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    clear: () => data.clear(),
    key: () => null,
    get length() {
      return data.size;
    },
  } as Storage;
}

const entry = (id: string, name = id): SavedPalette => ({
  id,
  name,
  paper: "#faf6ec",
  ink: "#161616",
  accent: "#710014",
});

describe("saved palettes", () => {
  it("reads the three working roles from the page", () => {
    const result = paletteFromPage(
      page([
        element({ id: "a", kind: "text", color: "#161616" }),
        element({ id: "b", kind: "text", color: "#161616" }),
        element({ id: "c", kind: "shape", fill: "#710014" }),
        element({ id: "d", kind: "text", color: "#8a8275" }),
      ]),
    );
    expect(result).toEqual({
      paper: "#faf6ec",
      ink: "#161616",
      accent: "#710014",
    });
  });

  it("falls back to the studio paper for a gradient page", () => {
    expect(
      paletteFromPage(
        page(
          [element({ id: "a", kind: "text", color: "#2a241b" })],
          "linear-gradient(180deg, #fff 0%, #eee 100%)",
        ),
      ).paper,
    ).toBe("#f2f1ed");
  });

  it("uses readable defaults for an empty page", () => {
    expect(paletteFromPage(page([]))).toEqual({
      paper: "#faf6ec",
      ink: "#161616",
      accent: "#b38f6f",
    });
  });

  it("adds a palette at the front", () => {
    const next = upsertSavedPalette([entry("old")], entry("new"));
    expect(next.map((item) => item.id)).toEqual(["new", "old"]);
  });

  it("replaces an existing palette instead of duplicating it", () => {
    const next = upsertSavedPalette(
      [entry("one", "Old name")],
      entry("one", "New name"),
    );
    expect(next).toHaveLength(1);
    expect(next[0].name).toBe("New name");
  });

  it("caps the saved list", () => {
    let list: SavedPalette[] = [];
    for (let index = 0; index < MAX_SAVED_PALETTES + 5; index += 1) {
      list = upsertSavedPalette(list, entry(`p${index}`));
    }
    expect(list).toHaveLength(MAX_SAVED_PALETTES);
    expect(list[0].id).toBe(`p${MAX_SAVED_PALETTES + 4}`);
  });

  it("removes by id", () => {
    expect(removeSavedPalette([entry("a"), entry("b")], "a")).toEqual([
      entry("b"),
    ]);
  });

  it("round-trips through storage and drops malformed rows", () => {
    const store = fakeStorage();
    writeSavedPalettes([entry("a"), entry("b")], store);
    expect(readSavedPalettes(store)).toEqual([entry("a"), entry("b")]);

    const broken = fakeStorage({
      [SAVED_PALETTES_KEY]: JSON.stringify([{ id: "a" }, entry("b")]),
    });
    expect(readSavedPalettes(broken)).toEqual([entry("b")]);
  });

  it("ignores corrupt storage and missing storage", () => {
    expect(
      readSavedPalettes(fakeStorage({ [SAVED_PALETTES_KEY]: "{" })),
    ).toEqual([]);
    expect(readSavedPalettes(null)).toEqual([]);
  });
});
