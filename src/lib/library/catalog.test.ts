import { describe, expect, it } from "vitest";

import {
  ASSET_META,
  cachedGeometry,
  clearGeometryCache,
  elementSize,
  filterAssets,
  LIBRARY_VIEWS,
  loadCategoryGeometry,
  mirrorPathData,
  placePathInFrame,
  registerGeometry,
  scaledStrokeWidth,
  sortedSubcategories,
  transformPathData,
  viewById,
} from "./catalog";
import { LIBRARY_CATEGORIES, LIBRARY_CATEGORY_IDS, categoryLabel } from "./types";

const ALLOWED = /^[\sMLCQZ0-9.+-]+$/;

describe("Elements Library catalogue", () => {
  it("is a large, original collection rather than a stub", () => {
    expect(ASSET_META.length).toBeGreaterThanOrEqual(850);
    expect(ASSET_META.length).toBe(1620);
  });

  it("covers every category with a meaningful number of assets", () => {
    for (const id of LIBRARY_CATEGORY_IDS) {
      const count = ASSET_META.filter((asset) => asset.category === id).length;
      expect(count, `${id} should have artwork`).toBeGreaterThanOrEqual(60);
    }
    expect(new Set(ASSET_META.map((asset) => asset.category)).size).toBe(
      LIBRARY_CATEGORY_IDS.length,
    );
  });

  it("adds the twelve expanded categories as full collections", () => {
    const expanded: Array<[string, string]> = [
      ["wedding", "altar"],
      ["islamic", "girih"],
      ["packaging", "dieline"],
      ["fashion", "lookbook"],
      ["architecture", "blueprint"],
      ["hospitality", "cocktail"],
      ["travel", "postcard"],
      ["stationery", "postmark"],
      ["education", "graduation"],
      ["celestial", "zodiac"],
      ["harvest", "citrus"],
      ["emblems", "rosette"],
    ];
    for (const [id, probe] of expanded) {
      const items = ASSET_META.filter((asset) => asset.category === id);
      expect(items.length, id).toBe(60);
      expect(new Set(items.map((item) => item.subcategory)).size, id).toBe(5);
      expect(
        filterAssets(ASSET_META, { query: probe }).some((asset) => asset.category === id),
        `${id} should be searchable by “${probe}”`,
      ).toBe(true);
      expect(items.every((item) => item.tags.length > 2), id).toBe(true);
    }
  });

  it("uses unique ids, names and tags", () => {
    expect(new Set(ASSET_META.map((asset) => asset.id)).size).toBe(ASSET_META.length);
    const names = ASSET_META.map((asset) => asset.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
    for (const asset of ASSET_META) {
      expect(asset.tags.length, asset.id).toBeGreaterThan(2);
      expect(asset.subcategory.trim(), asset.id).not.toBe("");
      expect(asset.aspect, asset.id).toBeGreaterThan(0);
      expect(asset.createdAt, asset.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(asset.source, asset.id).toBe("LAMSA Atelier");
    }
  });

  it("records a consistent category label and colour capability", () => {
    expect(LIBRARY_CATEGORIES.map((category) => category.id)).toEqual([
      ...LIBRARY_CATEGORY_IDS,
    ]);
    for (const asset of ASSET_META) {
      expect(categoryLabel(asset.category)).not.toBe(asset.category);
      expect(["fill", "stroke"]).toContain(asset.ink);
      expect(asset.strokeWidth).toBeGreaterThanOrEqual(0);
      expect(asset.opacity).toBeGreaterThan(0);
      expect(asset.opacity).toBeLessThanOrEqual(1);
    }
  });

  it("has distinct geometry for every asset, not duplicated files", async () => {
    const paths = new Map<string, string>();
    for (const id of LIBRARY_CATEGORY_IDS) {
      const geometry = await loadCategoryGeometry(id);
      for (const asset of ASSET_META.filter((entry) => entry.category === id)) {
        const item = geometry[asset.id];
        expect(item, `${asset.id} has no geometry`).toBeDefined();
        if (!item) continue;
        expect(item.d.startsWith("M"), asset.id).toBe(true);
        expect(ALLOWED.test(item.d), `${asset.id} contains an unsupported command`).toBe(true);
        expect(item.d.includes(","), `${asset.id} mixes comma and space separators`).toBe(false);
        expect(item.d).not.toMatch(/NaN|undefined/);
        const previous = paths.get(item.d);
        expect(previous, `${asset.id} duplicates ${previous}`).toBeUndefined();
        paths.set(item.d, asset.id);
      }
    }
    expect(paths.size).toBe(ASSET_META.length);
  });

  it("keeps inserted geometry in a normalised 100-unit box", async () => {
    const geometry = await loadCategoryGeometry("icons");
    for (const item of Object.values(geometry)) {
      const numbers = item.d.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
      for (const value of numbers) {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThan(-160);
        expect(value).toBeLessThan(260);
      }
    }
  });
});

describe("library filtering", () => {
  it("searches names and tags", () => {
    const results = filterAssets(ASSET_META, { query: "rose" });
    expect(results.length).toBeGreaterThan(5);
    expect(results.every((asset) => asset.name.toLowerCase().includes("rose") || asset.tags.some((tag) => tag.includes("rose")))).toBe(true);
    expect(filterAssets(ASSET_META, { query: "zzzz-not-an-asset" })).toHaveLength(0);
  });

  it("filters by category and subcategory", () => {
    const icons = filterAssets(ASSET_META, { category: "icons" });
    expect(icons.length).toBe(120);
    expect(icons.every((asset) => asset.category === "icons")).toBe(true);
    const travel = filterAssets(ASSET_META, { category: "icons", subcategory: "Travel" });
    expect(travel.length).toBe(12);
    const subcategories = sortedSubcategories(ASSET_META, "icons");
    expect(subcategories).toContain("Wedding & celebrations");
    expect(subcategories).toContain("Technology");
  });

  it("honours favourite and recent filters", () => {
    const favourites = new Set([ASSET_META[0]!.id, ASSET_META[3]!.id]);
    const starred = filterAssets(ASSET_META, { favourites, favouritesOnly: true });
    expect(starred.map((asset) => asset.id).sort()).toEqual([...favourites].sort());

    const recents = [ASSET_META[7]!.id, ASSET_META[2]!.id];
    const recent = filterAssets(ASSET_META, { recents, recentsOnly: true });
    expect(recent.map((asset) => asset.id)).toEqual(recents);
  });

  it("presents every section as a view over the same records", () => {
    const patterns = viewById("patterns");
    expect(patterns).toBeDefined();
    const items = filterAssets(ASSET_META, { view: patterns });
    expect(items.length).toBeGreaterThan(5);
    expect(items.every((asset) => asset.subcategory === "Grids & patterns")).toBe(true);

    const backgrounds = filterAssets(ASSET_META, { view: viewById("backgrounds") });
    expect(backgrounds.every((asset) => asset.category === "textures")).toBe(true);
    expect(backgrounds.length).toBeGreaterThan(10);

    for (const view of LIBRARY_VIEWS) {
      if (view.favouritesOnly || view.recentsOnly) continue;
      expect(filterAssets(ASSET_META, { view }).length, view.id).toBeGreaterThan(0);
    }
  });

  it("never returns the same record twice inside one view", () => {
    for (const view of LIBRARY_VIEWS) {
      const items = filterAssets(ASSET_META, { view });
      expect(new Set(items.map((asset) => asset.id)).size).toBe(items.length);
    }
  });
});

describe("asset geometry transforms", () => {
  it("scales a path into page points", () => {
    const placed = placePathInFrame("M 0 0 L 100 100", {
      x: 10,
      y: 20,
      width: 200,
      height: 100,
    });
    expect(placed).toBe("M 10 20 L 210 120");
  });

  it("keeps curves and multiple subpaths intact", () => {
    const source = "M 0 0 C 10 0 10 10 0 10 Z M 20 20 Q 30 20 30 30 Z";
    const placed = placePathInFrame(source, { x: 0, y: 0, width: 100, height: 100 });
    expect(placed).toContain("C");
    expect(placed).toContain("Q");
    expect((placed.match(/M/g) ?? []).length).toBe(2);
  });

  it("mirrors a path inside its own box", () => {
    expect(mirrorPathData("M 10 20 L 90 80", "x")).toBe("M 90 20 L 10 80");
    expect(mirrorPathData("M 10 20 L 90 80", "y")).toBe("M 10 80 L 90 20");
  });

  it("applies a transform without losing precision to integers", () => {
    const scaled = transformPathData("M 50 50 L 60 40", (x, y) => [x * 2, y * 2]);
    expect(scaled).toBe("M 100 100 L 120 80");
  });

  it("sizes wide and square elements inside the safe area", () => {
    const square = elementSize({ aspect: 1 }, { width: 400, height: 400 });
    expect(square.width).toBeLessThanOrEqual(200);
    expect(square.height).toBe(square.width);

    const wide = elementSize({ aspect: 4 }, { width: 400, height: 400 });
    expect(wide.width / wide.height).toBeCloseTo(4, 5);
    expect(wide.width).toBeLessThanOrEqual(340);

    const tall = elementSize({ aspect: 0.4 }, { width: 400, height: 200 });
    expect(tall.height).toBeLessThanOrEqual(200 * 0.55);
  });

  it("scales stroke weight with the frame", () => {
    const geometry = {
      d: "M 0 0 L 100 100",
      ink: "stroke" as const,
      strokeWidth: 2,
      opacity: 1,
      aspect: 1,
    };
    expect(scaledStrokeWidth(geometry, { x: 0, y: 0, width: 100, height: 100 })).toBe(2);
    expect(scaledStrokeWidth(geometry, { x: 0, y: 0, width: 200, height: 200 })).toBe(4);
  });

  it("caches the geometry a browser has loaded", async () => {
    clearGeometryCache();
    const meta = ASSET_META.find((asset) => asset.category === "icons")!;
    expect(cachedGeometry(meta.id)).toBeUndefined();
    registerGeometry(await loadCategoryGeometry("icons"));
    expect(cachedGeometry(meta.id)?.d).toBeTruthy();
  });
});
