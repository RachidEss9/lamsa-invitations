/**
 * The shared Elements Library model.
 *
 * One record describes an asset for every surface: the publishing editor's
 * Elements panel, the main Library workspace and anything added later. The
 * catalogue itself is generated (see `scripts/generate-elements.mjs`); user
 * uploads keep their own record in `libraryItems`, and both are presented
 * through this interface so neither surface invents its own shape.
 */

export const LIBRARY_CATEGORY_IDS = [
  "shapes",
  "botanical",
  "decorative",
  "editorial",
  "icons",
  "frames",
  "print",
  "textures",
  "wedding",
  "islamic",
  "packaging",
  "fashion",
  "architecture",
  "hospitality",
  "travel",
  "stationery",
  "education",
  "celestial",
  "harvest",
  "emblems",
] as const;

export type LibraryCategoryId = (typeof LIBRARY_CATEGORY_IDS)[number];

export interface LibraryCategory {
  id: LibraryCategoryId;
  label: string;
  blurb: string;
}

/** How an asset is painted: a filled silhouette or a stroked line drawing. */
export type AssetInk = "fill" | "stroke";

export interface LibraryAssetMeta {
  id: string;
  name: string;
  category: LibraryCategoryId;
  subcategory: string;
  tags: readonly string[];
  /** Catalogue artwork is vector. Uploads can be raster. */
  type: "vector" | "raster";
  /** Where the asset came from, shown in previews. */
  source: string;
  /** ISO date, so previews can show when the asset joined the library. */
  createdAt: string;
  /** Width ÷ height of the artwork box. */
  aspect: number;
  ink: AssetInk;
  /** Stroke weight in the 100-unit artwork box. */
  strokeWidth: number;
  /** Catalogue opacity, so textures arrive subtle instead of solid. */
  opacity: number;
}

export interface AssetGeometry {
  /** SVG path data in a 100 × 100 box, absolute commands only. */
  d: string;
  ink: AssetInk;
  strokeWidth: number;
  opacity: number;
  aspect: number;
}

export interface LibraryCategoryInfo extends LibraryCategory {
  count: number;
  subcategories: Array<{ id: string; count: number }>;
}

export const LIBRARY_CATEGORIES: readonly LibraryCategory[] = [
  {
    id: "shapes",
    label: "Shapes & Geometry",
    blurb: "Geometric, organic and decorative forms — arches, waves, rings, rules and patterns.",
  },
  {
    id: "botanical",
    label: "Botanical & Nature",
    blurb: "Flowers, roses, leaves, branches, butterflies and birds drawn as clean vectors.",
  },
  {
    id: "decorative",
    label: "Luxury & Decorative",
    blurb: "Art Deco, flourishes, royal frames, monograms, seals and classical ornament.",
  },
  {
    id: "editorial",
    label: "Editorial Elements",
    blurb: "Section dividers, folios, labels, badges, callouts and diagram parts.",
  },
  {
    id: "icons",
    label: "Icons & Symbols",
    blurb: "Line icons by occasion and trade, from weddings to technology.",
  },
  {
    id: "frames",
    label: "Photo Frames & Masks",
    blurb: "Instant, arch, circular, collage, film and torn-paper picture frames.",
  },
  {
    id: "print",
    label: "Print & Craft",
    blurb: "Tags, tickets, stickers, bookmarks, packaging and envelope decoration.",
  },
  {
    id: "textures",
    label: "Textures & Backgrounds",
    blurb: "Subtle paper, linen, canvas, marble, watercolour and grain surfaces.",
  },
  {
    id: "wedding",
    label: "Wedding & Celebration",
    blurb: "Ceremony pieces, florals, invitation paper and party decoration.",
  },
  {
    id: "islamic",
    label: "Islamic & Arabesque",
    blurb: "Moorish arches, girih geometry, islimi ornament and mosque details.",
  },
  {
    id: "packaging",
    label: "Packaging & Gift Design",
    blurb: "Dielines, vessels, labels, wraps and gift decoration for product work.",
  },
  {
    id: "fashion",
    label: "Fashion & Beauty",
    blurb: "Garments, accessories, cosmetics and atelier tools for lookbooks.",
  },
  {
    id: "architecture",
    label: "Architecture & Interiors",
    blurb: "Facades, windows, furniture, lighting and architectural drawing details.",
  },
  {
    id: "hospitality",
    label: "Food & Hospitality",
    blurb: "Tableware, café and bar pieces, kitchen tools and hotel service art.",
  },
  {
    id: "travel",
    label: "Travel & Geography",
    blurb: "Landmarks, transport, maps, postcards and destination scenery.",
  },
  {
    id: "stationery",
    label: "Stationery & Correspondence",
    blurb: "Paper, writing tools, desk goods, letters and postal marks.",
  },
  {
    id: "education",
    label: "Education & Graduation",
    blurb: "School supplies, classrooms, science, graduation and campus artwork.",
  },
  {
    id: "celestial",
    label: "Celestial & Mystical",
    blurb: "Sun and moon, constellations, zodiac glyphs and mystical objects.",
  },
  {
    id: "harvest",
    label: "Fruits & Agriculture",
    blurb: "Orchard and citrus fruit, berries, grain, farm and market pieces.",
  },
  {
    id: "emblems",
    label: "Badges, Ribbons & Emblems",
    blurb: "Prize ribbons, banners, crests, medals and brand emblems.",
  },
];

export function categoryLabel(id: LibraryCategoryId): string {
  return LIBRARY_CATEGORIES.find((category) => category.id === id)?.label ?? id;
}

/** A personal upload, kept in `libraryItems` and surfaced beside the catalogue. */
export interface LibraryUpload {
  id: string;
  name: string;
  category: LibraryCategoryId | "uploads";
  tags: readonly string[];
  description?: string;
  url: string | null;
  storageId?: string;
  createdAt: number;
  updatedAt: number;
}
