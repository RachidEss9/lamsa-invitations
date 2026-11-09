#!/usr/bin/env node
/**
 * Generates the LAMSA Elements Library.
 *
 * The catalogue is built from deterministic vector families rather than copied
 * artwork, so every asset is original, editable and safely redistributable.
 * Running this script rewrites `src/lib/library/generated/` — commit the
 * output, not just the script, so the app builds without a generation step.
 *
 *   node scripts/generate-elements.mjs [--check]
 *
 * `--check` writes nothing and fails when the committed catalogue is stale.
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { shapesAssets } from "./lib/families/shapes.mjs";
import { botanicalAssets } from "./lib/families/botanical.mjs";
import { decorativeAssets } from "./lib/families/decorative.mjs";
import { editorialAssets } from "./lib/families/editorial.mjs";
import { iconAssets } from "./lib/families/icons.mjs";
import { frameAssets } from "./lib/families/frames.mjs";
import { printAssets } from "./lib/families/print.mjs";
import { textureAssets } from "./lib/families/textures.mjs";
import { weddingAssets } from "./lib/families/wedding.mjs";
import { islamicAssets } from "./lib/families/islamic.mjs";
import { packagingAssets } from "./lib/families/packaging.mjs";
import { fashionAssets } from "./lib/families/fashion.mjs";
import { architectureAssets } from "./lib/families/architecture.mjs";
import { hospitalityAssets } from "./lib/families/hospitality.mjs";
import { travelAssets } from "./lib/families/travel.mjs";
import { stationeryAssets } from "./lib/families/stationery.mjs";
import { educationAssets } from "./lib/families/education.mjs";
import { celestialAssets } from "./lib/families/celestial.mjs";
import { harvestAssets } from "./lib/families/harvest.mjs";
import { emblemsAssets } from "./lib/families/emblems.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = join(root, "src/lib/library/generated");

const CATEGORIES = [
  ["shapes", "Shapes & Geometry", "Geometric, organic and decorative forms for any layout.", shapesAssets],
  ["botanical", "Botanical & Nature", "Flowers, leaves and natural ornament drawn as vectors.", botanicalAssets],
  ["decorative", "Luxury & Decorative", "Deco, flourish and classical ornament for formal work.", decorativeAssets],
  ["editorial", "Editorial Elements", "Dividers, labels, callouts and diagram parts for pages.", editorialAssets],
  ["icons", "Icons & Symbols", "Line icons grouped by the occasions and trades they serve.", iconAssets],
  ["frames", "Photo Frames & Masks", "Instant, arch, collage and torn-paper picture frames.", frameAssets],
  ["print", "Print & Craft", "Tags, tickets, labels and stationery for print projects.", printAssets],
  ["textures", "Textures & Backgrounds", "Subtle vector surfaces to tint paper and imagery.", textureAssets],
  ["wedding", "Wedding & Celebration", "Ceremony, floral, paper and party artwork for weddings and events.", weddingAssets],
  ["islamic", "Islamic & Arabesque", "Arches, girih geometry, islimi ornament and mosque architecture.", islamicAssets],
  ["packaging", "Packaging & Gift Design", "Dielines, vessels, labels and gift decoration for product work.", packagingAssets],
  ["fashion", "Fashion & Beauty", "Garments, accessories, cosmetics and atelier tools for lookbooks.", fashionAssets],
  ["architecture", "Architecture & Interiors", "Facades, openings, furniture, fixtures and plan details.", architectureAssets],
  ["hospitality", "Food & Hospitality", "Dining, café, bar, kitchen and hotel service artwork.", hospitalityAssets],
  ["travel", "Travel & Geography", "Landmarks, transport, maps, postcards and scenery.", travelAssets],
  ["stationery", "Stationery & Correspondence", "Paper, writing tools, desk goods, letters and postal marks.", stationeryAssets],
  ["education", "Education & Graduation", "School supplies, classrooms, science, graduation and campus art.", educationAssets],
  ["celestial", "Celestial & Mystical", "Sun, moon, constellations, zodiac and mystical objects.", celestialAssets],
  ["harvest", "Fruits & Agriculture", "Orchard and citrus fruit, berries, grain, farm and market.", harvestAssets],
  ["emblems", "Badges, Ribbons & Emblems", "Prize ribbons, banners, crests, medals and brand emblems.", emblemsAssets],
];

const CREATED_AT = "2026-11-09";

const slug = (value) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const ALLOWED = /^[\sMLCQZHVmlcqzhv0-9.+-]+$/;

function assertPath(d, label) {
  if (typeof d !== "string" || !d.trim().startsWith("M")) {
    throw new Error(`${label}: path must start with M`);
  }
  if (!ALLOWED.test(d)) {
    throw new Error(`${label}: unsupported path command in ${d.slice(0, 60)}`);
  }
  if (d.includes(",")) {
    // Commas usually mean an array reached `join` unconverted; keep the
    // catalogue to one unambiguous separator.
    throw new Error(`${label}: comma-separated path data is not accepted`);
  }
  const numbers = d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
  for (const value of numbers) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw new Error(`${label}: non-finite coordinate`);
    if (parsed < -400 || parsed > 400) {
      throw new Error(`${label}: coordinate ${parsed} outside the 100-box tolerance`);
    }
  }
  if ((d.match(/[Mm]/g) ?? []).length === 0) throw new Error(`${label}: no subpath`);
  if (d.includes("NaN") || d.includes("undefined")) throw new Error(`${label}: bad value`);
}

const usedIds = new Set();
const usedNames = new Set();
const usedPaths = new Map();
const records = [];
const geometryByCategory = new Map(CATEGORIES.map(([id]) => [id, new Map()]));

for (const [category, label, , loader] of CATEGORIES) {
  const assets = loader();
  assets.forEach((asset) => {
    if (!asset || typeof asset.d !== "string") {
      throw new Error(`${category}: a family returned an asset without a path`);
    }
    assertPath(asset.d, `${category}/${asset.name}`);
    const pathKey = asset.d.replace(/\s+/g, " ").trim();
    const duplicate = usedPaths.get(pathKey);
    if (duplicate) {
      throw new Error(`${category}/${asset.name}: duplicates the geometry of ${duplicate}`);
    }
    usedPaths.set(pathKey, `${category}/${asset.name}`);
    let name = String(asset.name).trim();
    let suffix = 2;
    while (usedNames.has(name.toLowerCase())) {
      name = `${asset.name} ${["II", "III", "IV", "V"][Math.min(suffix - 2, 3)]}`;
      suffix += 1;
    }
    usedNames.add(name.toLowerCase());
    const base = `${category}-${slug(asset.subcategory)}-${slug(name)}`.slice(0, 74);
    let id = base;
    let counter = 2;
    while (usedIds.has(id)) {
      id = `${base}-${counter}`;
      counter += 1;
    }
    usedIds.add(id);
    const geometry = {
      d: asset.d.replace(/\s+/g, " ").trim(),
      ink: asset.ink === "fill" ? "fill" : "stroke",
      strokeWidth: Number.isFinite(asset.strokeWidth) ? Math.max(0, asset.strokeWidth) : 1.4,
      opacity:
        asset.opacity === undefined ? 1 : Math.max(0.02, Math.min(1, Number(asset.opacity))),
      aspect:
        Number.isFinite(asset.aspect) && asset.aspect > 0
          ? Math.round(asset.aspect * 1000) / 1000
          : 1,
    };
    geometryByCategory.get(category).set(id, geometry);
    records.push({
      id,
      name,
      category,
      subcategory: asset.subcategory,
      tags: [...new Set([...(asset.tags ?? []), category, asset.subcategory].map((tag) => String(tag).toLowerCase()))],
      type: "vector",
      source: "LAMSA Atelier",
      createdAt: CREATED_AT,
      aspect: geometry.aspect,
      ink: geometry.ink,
      strokeWidth: geometry.strokeWidth,
      opacity: geometry.opacity,
      label,
    });
  });
}

const total = records.length;
const counts = CATEGORIES.map(([id, label]) => ({
  id,
  label,
  count: records.filter((record) => record.category === id).length,
}));

/* -------------------------------------------------------------------------- */
/* Serialise                                                                  */
/* -------------------------------------------------------------------------- */

const metaLine = (record) => {
  const tags = record.tags.map((tag) => JSON.stringify(tag)).join(", ");
  return `  { id: ${JSON.stringify(record.id)}, name: ${JSON.stringify(record.name)}, category: ${JSON.stringify(record.category)}, subcategory: ${JSON.stringify(record.subcategory)}, tags: [${tags}], type: "vector", source: ${JSON.stringify(record.source)}, createdAt: ${JSON.stringify(record.createdAt)}, aspect: ${record.aspect}, ink: ${JSON.stringify(record.ink)}, strokeWidth: ${record.strokeWidth}, opacity: ${record.opacity} },`;
};

// One typed array per category. A single 1,600-entry literal exceeds
// TypeScript's union-complexity limit, and this keeps the metadata eager.
const metaGroups = CATEGORIES.map(([id]) => {
  const items = records.filter((record) => record.category === id);
  return `const ${id.toUpperCase()}: LibraryAssetMeta[] = [\n${items.map(metaLine).join("\n")}\n];`;
}).join("\n\n");

const metaSource = `/**
 * GENERATED by scripts/generate-elements.mjs — do not edit by hand.
 * ${total} original vector assets across ${counts.length} categories.
 * Geometry is split into lazy chunks; this file only carries metadata.
 */

import type { LibraryAssetMeta } from "../types";

${metaGroups}

export const ASSET_META: LibraryAssetMeta[] = [
${CATEGORIES.map(([id]) => `  ...${id.toUpperCase()},`).join("\n")}
];
`;

const indexSource = `/** GENERATED by scripts/generate-elements.mjs — do not edit by hand. */

import type { AssetGeometry, LibraryCategoryId } from "../types";

/**
 * One chunk per category, imported on demand. Browsing never pulls the whole
 * catalogue's path data into memory, and the metadata file stays small enough
 * to search instantly.
 */
const LOADERS: Record<LibraryCategoryId, () => Promise<{ GEOMETRY: Record<string, AssetGeometry> }>> = {
${CATEGORIES.map(
  ([id]) => `  ${id}: () => import("./${id}"),`,
).join("\n")}
};

export async function loadCategoryGeometry(category: LibraryCategoryId) {
  const module = await LOADERS[category]();
  return module.GEOMETRY;
}
`;

mkdirSync(outputDir, { recursive: true });

const files = new Map();
files.set(join(outputDir, "meta.ts"), metaSource);
files.set(join(outputDir, "index.ts"), indexSource);
for (const [category] of CATEGORIES) {
  const entries = [...geometryByCategory.get(category).entries()].map(
    ([id, geometry]) =>
      `  ${JSON.stringify(id)}: { d: ${JSON.stringify(geometry.d)}, ink: ${JSON.stringify(geometry.ink)}, strokeWidth: ${geometry.strokeWidth}, opacity: ${geometry.opacity}, aspect: ${geometry.aspect} },`,
  );
  files.set(
    join(outputDir, `${category}.ts`),
    `/** GENERATED by scripts/generate-elements.mjs — do not edit by hand. */
import type { AssetGeometry } from "../types";

export const GEOMETRY: Record<string, AssetGeometry> = {
${entries.join("\n")}
};
`,
  );
}

const check = process.argv.includes("--check");
let stale = false;
for (const [path, content] of files) {
  const exists = existsSync(path);
  const current = exists ? readFileSync(path, "utf8") : "";
  if (current !== content) {
    stale = true;
    if (!check) writeFileSync(path, content);
  }
}

if (check && stale) {
  console.error("The committed Elements Library is stale. Run: node scripts/generate-elements.mjs");
  process.exit(1);
}

console.log(`Elements Library: ${total} assets, ${usedIds.size} unique ids`);
for (const { label, count } of counts) console.log(`  ${label.padEnd(26)} ${count}`);
const bytes = [...files.values()].reduce((sum, content) => sum + content.length, 0);
console.log(`  catalogue source            ${(bytes / 1024).toFixed(0)} KB`);
if (check) console.log("  committed catalogue is up to date");
