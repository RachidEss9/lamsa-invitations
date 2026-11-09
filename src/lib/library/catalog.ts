/**
 * The one catalogue every library surface reads.
 *
 * Metadata is small and always in memory so search and filters are instant.
 * Path geometry lives in one lazily imported chunk per category; a browser
 * registers what it loads here, which is what lets a drag from the panel be
 * resolved by the canvas without a second copy of the artwork.
 */

import { ASSET_META } from "./generated/meta";
export { loadCategoryGeometry } from "./generated";
import type {
  AssetGeometry,
  LibraryAssetMeta,
  LibraryCategoryId,
  LibraryCategoryInfo,
} from "./types";
import { LIBRARY_CATEGORIES } from "./types";

export { ASSET_META };

const BY_ID = new Map(ASSET_META.map((asset) => [asset.id, asset]));

export function assetById(id: string): LibraryAssetMeta | undefined {
  return BY_ID.get(id);
}

const GEOMETRY_CACHE = new Map<string, AssetGeometry>();

/** Remembers a loaded category so previews and drops share one copy. */
export function registerGeometry(geometry: Record<string, AssetGeometry>) {
  for (const [id, value] of Object.entries(geometry)) GEOMETRY_CACHE.set(id, value);
}

export function cachedGeometry(id: string): AssetGeometry | undefined {
  return GEOMETRY_CACHE.get(id);
}

export function clearGeometryCache() {
  GEOMETRY_CACHE.clear();
}

export interface LibraryView {
  id: string;
  label: string;
  blurb: string;
  /** Categories included, or every category when omitted. */
  categories?: readonly LibraryCategoryId[];
  /** Restrict to these subcategory names. */
  subcategories?: readonly string[];
  favouritesOnly?: boolean;
  recentsOnly?: boolean;
}

/**
 * The main Library's sections. They are views over the same records — a
 * botanical spray that appears under Illustrations is the same asset, with the
 * same id, as the one under Elements.
 */
export const LIBRARY_VIEWS: readonly LibraryView[] = [
  {
    id: "elements",
    label: "Elements",
    blurb: "Every asset in the shared catalogue.",
  },
  {
    id: "illustrations",
    label: "Illustrations",
    blurb: "Botanical drawings and decorative illustration.",
    categories: ["botanical", "decorative"],
  },
  {
    id: "icons",
    label: "Icons",
    blurb: "Line icons for occasions, trades and everyday marks.",
    categories: ["icons"],
  },
  {
    id: "frames",
    label: "Frames & Masks",
    blurb: "Picture frames, photo masks and collage grids.",
    categories: ["frames"],
  },
  {
    id: "textures",
    label: "Textures",
    blurb: "Paper, linen, canvas, grain, marble and concrete surfaces.",
    categories: ["textures"],
    subcategories: [
      "Paper textures",
      "Linen",
      "Canvas",
      "Grain",
      "Marble",
      "Fabric",
      "Concrete",
    ],
  },
  {
    id: "backgrounds",
    label: "Backgrounds",
    blurb: "Washes, gradients and aged paper for page grounds.",
    categories: ["textures"],
    subcategories: ["Watercolour", "Subtle gradients", "Vintage paper effects"],
  },
  {
    id: "patterns",
    label: "Patterns",
    blurb: "Repeatable tiles and hatch patterns.",
    categories: ["shapes"],
    subcategories: ["Grids & patterns"],
  },
  {
    id: "decorative",
    label: "Decorative Assets",
    blurb: "Ornament, stationery and print decoration.",
    categories: ["decorative", "print"],
  },
  {
    id: "wedding",
    label: "Wedding & Celebration",
    blurb: "Ceremony pieces, florals, invitation paper and party decoration.",
    categories: ["wedding"],
  },
  {
    id: "islamic",
    label: "Islamic & Arabesque",
    blurb: "Moorish arches, girih geometry, islimi ornament and mosque details.",
    categories: ["islamic"],
  },
  {
    id: "packaging",
    label: "Packaging & Gift Design",
    blurb: "Dielines, vessels, labels, wraps and gift decoration for product work.",
    categories: ["packaging"],
  },
  {
    id: "fashion",
    label: "Fashion & Beauty",
    blurb: "Garments, accessories, cosmetics and atelier tools for lookbooks.",
    categories: ["fashion"],
  },
  {
    id: "architecture",
    label: "Architecture & Interiors",
    blurb: "Facades, windows, furniture, lighting and architectural drawing details.",
    categories: ["architecture"],
  },
  {
    id: "hospitality",
    label: "Food & Hospitality",
    blurb: "Tableware, café and bar pieces, kitchen tools and hotel service art.",
    categories: ["hospitality"],
  },
  {
    id: "travel",
    label: "Travel & Geography",
    blurb: "Landmarks, transport, maps, postcards and destination scenery.",
    categories: ["travel"],
  },
  {
    id: "stationery",
    label: "Stationery & Correspondence",
    blurb: "Paper, writing tools, desk goods, letters and postal marks.",
    categories: ["stationery"],
  },
  {
    id: "education",
    label: "Education & Graduation",
    blurb: "School supplies, classrooms, science, graduation and campus artwork.",
    categories: ["education"],
  },
  {
    id: "celestial",
    label: "Celestial & Mystical",
    blurb: "Sun and moon, constellations, zodiac glyphs and mystical objects.",
    categories: ["celestial"],
  },
  {
    id: "harvest",
    label: "Fruits & Agriculture",
    blurb: "Orchard and citrus fruit, berries, grain, farm and market pieces.",
    categories: ["harvest"],
  },
  {
    id: "emblems",
    label: "Badges, Ribbons & Emblems",
    blurb: "Prize ribbons, banners, crests, medals and brand emblems.",
    categories: ["emblems"],
  },
  {
    id: "favourites",
    label: "Favorites",
    blurb: "Assets you starred, from any section.",
    favouritesOnly: true,
  },
  {
    id: "recents",
    label: "Recently Used",
    blurb: "What you placed most recently, newest first.",
    recentsOnly: true,
  },
];

export function viewById(id: string): LibraryView | undefined {
  return LIBRARY_VIEWS.find((view) => view.id === id);
}

export interface AssetFilter {
  category?: LibraryCategoryId | "all";
  subcategory?: string | "all";
  query?: string;
  favourites?: ReadonlySet<string>;
  favouritesOnly?: boolean;
  recents?: readonly string[];
  recentsOnly?: boolean;
  view?: LibraryView;
}

/** All the words a search should consider. */
export function assetWords(asset: LibraryAssetMeta): string[] {
  return [asset.name, asset.subcategory, ...asset.tags];
}

export function filterAssets(assets: readonly LibraryAssetMeta[], filter: AssetFilter) {
  const view = filter.view;
  const needle = (filter.query ?? "").trim().toLowerCase();
  const category = filter.category && filter.category !== "all" ? filter.category : undefined;
  const subcategory =
    filter.subcategory && filter.subcategory !== "all" ? filter.subcategory : undefined;
  const favouritesOnly = filter.favouritesOnly || view?.favouritesOnly;
  const recentsOnly = filter.recentsOnly || view?.recentsOnly;
  const recentOrder = filter.recents ?? [];
  const recentRank = new Map(recentOrder.map((id, index) => [id, index]));

  const filtered = assets.filter((asset) => {
    if (view?.categories && !view.categories.includes(asset.category)) return false;
    if (view?.subcategories && !view.subcategories.includes(asset.subcategory)) return false;
    if (category && asset.category !== category) return false;
    if (subcategory && asset.subcategory !== subcategory) return false;
    if (favouritesOnly && !filter.favourites?.has(asset.id)) return false;
    if (recentsOnly && !recentRank.has(asset.id)) return false;
    if (!needle) return true;
    return assetWords(asset).some((word) => word.toLowerCase().includes(needle));
  });

  if (recentsOnly) {
    return filtered.sort(
      (a, b) => (recentRank.get(a.id) ?? 0) - (recentRank.get(b.id) ?? 0),
    );
  }
  return filtered;
}

export function sortedSubcategories(
  assets: readonly LibraryAssetMeta[],
  category?: LibraryCategoryId | "all",
): string[] {
  const seen = new Set<string>();
  for (const asset of assets) {
    if (category && category !== "all" && asset.category !== category) continue;
    seen.add(asset.subcategory);
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}

export function categoryInfo(): LibraryCategoryInfo[] {
  return LIBRARY_CATEGORIES.map((category) => {
    const items = ASSET_META.filter((asset) => asset.category === category.id);
    const counts = new Map<string, number>();
    for (const item of items) {
      counts.set(item.subcategory, (counts.get(item.subcategory) ?? 0) + 1);
    }
    return {
      ...category,
      count: items.length,
      subcategories: [...counts.entries()]
        .map(([id, count]) => ({ id, count }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Path geometry                                                              */
/* -------------------------------------------------------------------------- */

const ARITY: Record<string, number> = { M: 2, L: 2, C: 6, Q: 4, Z: 0 };

/**
 * Rewrites every coordinate pair in a catalogue path. The generator emits only
 * absolute `M/L/C/Q/Z`, so this is a complete transform for these assets — no
 * SVG parser, no arc flags, no surprise units.
 */
export function transformPathData(
  d: string,
  transform: (x: number, y: number) => [number, number],
): string {
  const tokens = d.match(/[MLCQZ]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
  let out = "";
  let index = 0;
  let command = "";
  const write = (x: number, y: number) => {
    const [nx, ny] = transform(x, y);
    out += ` ${Math.round(nx * 1000) / 1000} ${Math.round(ny * 1000) / 1000}`;
  };
  while (index < tokens.length) {
    const token = tokens[index] as string;
    if (/^[MLCQZ]$/i.test(token)) {
      command = token.toUpperCase();
      out += ` ${command}`;
      index += 1;
      if (command === "Z") continue;
    }
    const arity = ARITY[command];
    if (!arity) break;
    // A command may repeat its coordinates without repeating the letter.
    while (
      index + arity <= tokens.length &&
      !/^[MLCQZ]$/i.test(tokens[index] as string)
    ) {
      for (let offset = 0; offset < arity; offset += 2) {
        write(Number(tokens[index + offset]), Number(tokens[index + offset + 1]));
      }
      index += arity;
    }
  }
  return out.trim();
}

export interface Placement {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Mirrors a path across the vertical or horizontal centre of its own box. */
export function mirrorPathData(d: string, axis: "x" | "y", box = 100): string {
  return transformPathData(d, (x, y) =>
    axis === "x" ? [box - x, y] : [x, box - y],
  );
}

/**
 * Scales an asset path into a page-space frame. Asset coordinates live in a
 * 100-unit box; the frame is in PDF points, so this is the one conversion that
 * makes an inserted element a native, resolution-independent publication
 * object.
 */
export function placePathInFrame(d: string, frame: Placement): string {
  const sx = frame.width / 100;
  const sy = frame.height / 100;
  return transformPathData(d, (x, y) => [frame.x + x * sx, frame.y + y * sy]);
}

/** The stroke width an asset should carry at a given frame size. */
export function scaledStrokeWidth(asset: AssetGeometry, frame: Placement): number {
  const scale = (frame.width + frame.height) / 200;
  return Math.max(0.15, asset.strokeWidth * scale);
}

/** A sensible size for an element dropped into a page's safe area. */
export function elementSize(
  asset: { aspect: number },
  safe: { width: number; height: number },
): { width: number; height: number } {
  const aspect = asset.aspect > 0 ? asset.aspect : 1;
  const isWide = aspect >= 2.2;
  const width = Math.min(safe.width * (isWide ? 0.72 : 0.42), isWide ? 340 : 200);
  let height = width / aspect;
  if (height > safe.height * 0.55) {
    height = safe.height * 0.55;
    return { width: height * aspect, height };
  }
  return { width, height };
}
