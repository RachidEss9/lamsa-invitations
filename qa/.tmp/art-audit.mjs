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

const items = [];
for (const [category, loader] of Object.entries(FAMILIES)) {
  for (const asset of loader()) items.push({ category, name: asset.name, d: asset.d });
}

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<!doctype html><html><body></body></html>");
const results = await page.evaluate((assets) => {
  const size = 100;
  return assets.map((asset) => {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, size, size);
    const path = new Path2D(asset.d);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1.6;
    ctx.stroke(path);
    const pixels = ctx.getImageData(0, 0, size, size).data;
    let ink = 0;
    let minX = size;
    let minY = size;
    let maxX = 0;
    let maxY = 0;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const value = pixels[(y * size + x) * 4];
        if (value < 200) {
          ink += 1;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    return {
      category: asset.category,
      name: asset.name,
      coverage: ink / (size * size),
      width: maxX - minX,
      height: maxY - minY,
      edge: minX <= 1 || minY <= 1 || maxX >= 98 || maxY >= 98,
      blank: ink === 0,
    };
  });
}, items);
await browser.close();

const flags = results.filter(
  (item) => item.blank || item.coverage < 0.004 || item.coverage > 0.42 || item.width < 26 || item.height < 26,
);
const edge = results.filter((item) => item.edge && !item.blank);
console.log(`assets: ${results.length}`);
console.log(`flagged (blank/tiny/dense): ${flags.length}`);
for (const item of flags) {
  console.log(
    `  ${item.category.padEnd(13)} ${item.name.padEnd(30)} coverage=${(item.coverage * 100).toFixed(1)}% bbox=${item.width}x${item.height}`,
  );
}
console.log(`edge-touching: ${edge.length}`);
for (const item of edge.slice(0, 30)) console.log(`  ${item.category} | ${item.name}`);
const byCategory = {};
for (const item of results) {
  byCategory[item.category] ??= { count: 0, coverage: 0 };
  byCategory[item.category].count += 1;
  byCategory[item.category].coverage += item.coverage;
}
console.log("average coverage:");
for (const [category, value] of Object.entries(byCategory)) {
  console.log(`  ${category.padEnd(13)} ${((value.coverage / value.count) * 100).toFixed(1)}%`);
}
