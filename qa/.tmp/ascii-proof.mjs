/**
 * Temporary visual proof sheet for the expanded Elements Library.
 * Renders sampled assets through Chromium and prints raster silhouettes.
 *
 *   PLAYWRIGHT_BROWSERS_PATH=/dev/shm/pw node qa/.tmp/ascii-proof.mjs wedding islamic
 */
import { chromium } from "playwright";

import { weddingAssets } from "../../scripts/lib/families/wedding.mjs";
import { islamicAssets } from "../../scripts/lib/families/islamic.mjs";
import { packagingAssets } from "../../scripts/lib/families/packaging.mjs";
import { fashionAssets } from "../../scripts/lib/families/fashion.mjs";
import { architectureAssets } from "../../scripts/lib/families/architecture.mjs";
import { hospitalityAssets } from "../../scripts/lib/families/hospitality.mjs";
import { travelAssets } from "../../scripts/lib/families/travel.mjs";
import { stationeryAssets } from "../../scripts/lib/families/stationery.mjs";
import { educationAssets } from "../../scripts/lib/families/education.mjs";
import { celestialAssets } from "../../scripts/lib/families/celestial.mjs";
import { harvestAssets } from "../../scripts/lib/families/harvest.mjs";
import { emblemsAssets } from "../../scripts/lib/families/emblems.mjs";

const FAMILIES = {
  wedding: weddingAssets,
  islamic: islamicAssets,
  packaging: packagingAssets,
  fashion: fashionAssets,
  architecture: architectureAssets,
  hospitality: hospitalityAssets,
  travel: travelAssets,
  stationery: stationeryAssets,
  education: educationAssets,
  celestial: celestialAssets,
  harvest: harvestAssets,
  emblems: emblemsAssets,
};

const requested = process.argv.slice(2);
const categories = requested.length ? requested : Object.keys(FAMILIES);

const items = [];
for (const category of categories) {
  const assets = FAMILIES[category]();
  // Two from each of the five subcategories, spread across the collection.
  const sampled = [0, 4, 12, 16, 24, 28, 36, 40, 48, 52].map((index) => assets[index]);
  items.push({ category, assets: sampled });
}

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<!doctype html><html><body></body></html>");

const rendered = await page.evaluate((groups) => {
  const W = 24;
  const H = 15;
  const chars = " .:-=+*#%@";
  const rasterize = (d, ink, strokeWidth) => {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, W, H);
    const path = new Path2D(d);
    ctx.save();
    ctx.translate(0.8, 0.8);
    ctx.scale((W - 1.6) / 100, (H - 1.6) / 100);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    if (ink === "fill") {
      ctx.fillStyle = "#000";
      ctx.fill(path);
    } else {
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1.15 / ((W - 1.6) / 100);
      ctx.stroke(path);
    }
    ctx.restore();
    const pixels = ctx.getImageData(0, 0, W, H).data;
    const lines = [];
    for (let y = 0; y < H; y += 1) {
      let line = "";
      for (let x = 0; x < W; x += 1) {
        const value = pixels[(y * W + x) * 4];
        line += chars[Math.min(chars.length - 1, Math.floor(((255 - value) / 256) * chars.length))];
      }
      lines.push(line);
    }
    return lines;
  };
  return groups.map((group) => ({
    category: group.category,
    assets: group.assets.map((asset) => ({
      name: asset.name,
      subcategory: asset.subcategory,
      lines: rasterize(asset.d, asset.ink, asset.strokeWidth),
    })),
  }));
}, items);

await browser.close();

const pad = (value, width) => value.slice(0, width).padEnd(width, " ");
for (const group of rendered) {
  console.log(`\n================ ${group.category.toUpperCase()} ================`);
  for (let offset = 0; offset < group.assets.length; offset += 4) {
    const row = group.assets.slice(offset, offset + 4);
    for (let line = 0; line < 15; line += 1) {
      console.log(row.map((asset) => pad(asset.lines[line], 24)).join("  "));
    }
    console.log(row.map((asset) => pad(asset.name, 24)).join("  "));
    console.log("");
  }
}
