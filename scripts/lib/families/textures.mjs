import { blob, circle, ellipse, line, mulberry, rect, wave } from "../paths.mjs";

const join = (...parts) => parts.filter(Boolean).join(" ");
const n = (value) => Math.round(value * 100) / 100;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function speckle(count, seed, size = 0.8, area = 96) {
  const random = mulberry(seed);
  return Array.from({ length: count }, () =>
    circle(n(2 + random() * area), n(2 + random() * area), n(size * (0.4 + random()))),
  ).join(" ");
}

function hatch(angle, gap, seed, jitter = 1.2) {
  const random = mulberry(seed);
  const radians = (angle * Math.PI) / 180;
  return Array.from({ length: Math.ceil(120 / gap) }, (_, index) => {
    const offset = index * gap - 10 + (random() - 0.5) * jitter;
    return line(
      n(offset - 60 * Math.sin(radians)),
      n(50 - 60 * Math.cos(radians)),
      n(offset + 60 * Math.sin(radians)),
      n(50 + 60 * Math.cos(radians)),
    );
  }).join(" ");
}

function weave(seed, gap = 6) {
  return join(hatch(0, gap, seed), hatch(90, gap, seed + 1));
}

function veins(count, seed, width = 1.4) {
  const random = mulberry(seed);
  const lines = [];
  for (let index = 0; index < count; index += 1) {
    let x = random() * 100;
    let y = -4;
    let d = `M ${n(x)} ${n(y)}`;
    while (y < 104) {
      const dx = (random() - 0.5) * 22 * width;
      const dy = 8 + random() * 16;
      const nx = Math.max(-6, Math.min(106, x + dx));
      const ny = y + dy;
      d += ` Q ${n(x + dx * 0.4)} ${n(y + dy * 0.6)} ${n(nx)} ${n(ny)}`;
      x = nx;
      y = ny;
    }
    lines.push(d);
  }
  return lines.join(" ");
}

function bands(count, seed) {
  const random = mulberry(seed);
  return Array.from({ length: count }, (_, index) => {
    const y = 4 + index * (92 / count);
    return line(4, n(y + (random() - 0.5) * 1.4), 96, n(y + (random() - 0.5) * 1.4));
  }).join(" ");
}

/* -------------------------------------------------------------------------- */
/* Textures                                                                   */
/* -------------------------------------------------------------------------- */

function paper() {
  const defs = [
    ["Paper fibre", join(speckle(90, 3, 0.7), hatch(8, 14, 9, 3)), 0.3],
    ["Laid paper", join(bands(26, 5), speckle(40, 7, 0.6)), 0.22],
    ["Vellum grain", speckle(160, 13, 0.7), 0.3],
    ["Parchment", join(speckle(70, 21, 1.1), blob(24, 30, 10, 8, 0.4, 21), blob(74, 66, 12, 8, 0.4, 33)), 0.2],
    ["Deckle fibres", join(hatch(70, 10, 29, 4), speckle(50, 31, 0.6)), 0.24],
    ["Watermarked paper", join(bands(12, 37), circle(50, 50, 30), circle(50, 50, 24)), 0.16],
  ];
  return defs.map(([name, d, opacity]) => texture(name, "Paper textures", d, opacity));
}

function linen() {
  const defs = [
    ["Linen weave", weave(41, 5), 0.26],
    ["Fine linen", weave(47, 3.4), 0.24],
    ["Linen slub", join(hatch(0, 4.5, 53, 2.4), hatch(90, 12, 57, 1.2)), 0.22],
    ["Linen grid", join(hatch(0, 9, 61), hatch(90, 9, 63)), 0.2],
    ["Linen dots", speckle(120, 67, 0.9), 0.26],
    ["Linen stripe", join(hatch(0, 7, 71, 1), hatch(90, 3, 73, 0.6)), 0.18],
  ];
  return defs.map(([name, d, opacity]) => texture(name, "Linen", d, opacity));
}

function canvas() {
  const defs = [
    ["Canvas weave", weave(79, 7), 0.22],
    ["Basket weave", join(hatch(0, 10, 83), hatch(90, 10, 85), hatch(0, 20, 87, 0.6)), 0.2],
    ["Coarse canvas", weave(89, 11), 0.2],
    ["Canvas twill", join(hatch(58, 6, 91), hatch(122, 6, 93)), 0.2],
    ["Canvas dash", join(hatch(0, 8, 97, 2), hatch(90, 8, 99, 2)), 0.16],
    ["Canvas cross", join(weave(101, 12), hatch(45, 18, 103)), 0.14],
  ];
  return defs.map(([name, d, opacity]) => texture(name, "Canvas", d, opacity));
}

function grain() {
  const defs = [
    ["Fine grain", speckle(220, 107, 0.55), 0.24],
    ["Coarse grain", speckle(120, 109, 1.1), 0.22],
    ["Film grain", join(speckle(160, 113, 0.5), hatch(20, 15, 115, 3)), 0.2],
    ["Dust and grain", join(speckle(70, 117, 1.3), speckle(60, 119, 0.5)), 0.2],
    ["Sparkle grain", join(speckle(120, 121, 0.5), ...Array.from({ length: 18 }, (_, i) => {
      const random = mulberry(i * 13 + 5);
      const x = random() * 92 + 4;
      const y = random() * 92 + 4;
      return join(line(x - 1.4, y, x + 1.4, y), line(x, y - 1.4, x, y + 1.4));
    })), 0.28],
    ["Grain wash", join(speckle(180, 127, 0.6), bands(6, 129)), 0.14],
  ];
  return defs.map(([name, d, opacity]) => texture(name, "Grain", d, opacity));
}

function marble() {
  const defs = [
    ["Marble veins", veins(5, 131, 1.6), 0.3],
    ["Marble fine", veins(8, 137, 0.9), 0.24],
    ["Marble slab", join(veins(3, 139, 2.2), veinedBands(141)), 0.2],
    ["Marble web", join(veins(6, 143, 1), veins(6, 147, 0.6)), 0.24],
    ["Marble diagonal", join(veins(4, 149, 1.4), hatch(120, 20, 151, 4)), 0.2],
    ["Marble strata", join(veins(4, 153, 1.2), bands(9, 155)), 0.18],
    ["Marble cloud", join(blob(30, 40, 20, 9, 0.35, 157), blob(70, 64, 24, 9, 0.3, 159), veins(3, 161, 0.8)), 0.18],
    ["Marble dark", veins(4, 163, 3.4), 0.32],
  ];
  return defs.map(([name, d, opacity]) => texture(name, "Marble", d, opacity));
}

function veinedBands(seed) {
  const random = mulberry(seed);
  return Array.from({ length: 5 }, (_, index) => {
    const y = 14 + index * 18 + random() * 4;
    return wave(y, 2.4, 1.2, index);
  }).join(" ");
}

function watercolour() {
  const defs = [
    ["Watercolour wash", join(blob(32, 36, 24, 9, 0.3, 167), blob(66, 58, 22, 9, 0.28, 173), blob(44, 72, 16, 8, 0.3, 179)), 0.22],
    ["Watercolour bloom", join(blob(50, 50, 34, 12, 0.36, 181), blob(50, 50, 22, 10, 0.4, 191)), 0.16],
    ["Wet-on-wet", join(blob(26, 52, 20, 8, 0.4, 193), blob(50, 46, 22, 8, 0.4, 197), blob(76, 54, 20, 8, 0.4, 199)), 0.14],
    ["Watercolour edge", join(blob(50, 100, 46, 12, 0.16, 211), bands(3, 213)), 0.18],
    ["Wash strokes", join(hatch(8, 9, 223, 5), hatch(14, 14, 227, 4)), 0.16],
    ["Watercolour dots", speckle(120, 229, 1.4), 0.2],
    ["Gradient wash", join(hatch(0, 3.5, 233), hatch(0, 9, 239)), 0.12],
    ["Watercolour pool", join(blob(40, 60, 30, 11, 0.42, 241), blob(68, 38, 18, 9, 0.4, 251)), 0.16],
  ];
  return defs.map(([name, d, opacity]) => texture(name, "Watercolour", d, opacity));
}

function fabric() {
  const knit = Array.from({ length: 13 }, (_, row) =>
    Array.from({ length: 13 }, (_, col) =>
      `M ${n(col * 8)} ${n(row * 8 + 4)} L ${n(col * 8 + 4)} ${n(row * 8)} L ${n(col * 8 + 8)} ${n(row * 8 + 4)}`,
    ).join(" "),
  ).join(" ");
  const defs = [
    ["Twill", join(hatch(60, 5, 257), hatch(120, 9, 263, 0.8)), 0.18],
    ["Knit", knit, 0.2],
    ["Tweed", join(hatch(0, 6, 269, 3), hatch(90, 6, 271, 3), speckle(50, 277, 1.2)), 0.22],
    ["Velvet", join(hatch(2, 2.6, 281, 0.6), hatch(88, 2.6, 283, 0.6)), 0.1],
    ["Herringbone fabric", join(hatch(45, 8, 293), hatch(-45, 8, 307)), 0.16],
    ["Corduroy", hatch(0, 5, 311, 1), 0.2],
  ];
  return defs.map(([name, d, opacity]) => texture(name, "Fabric", d, opacity));
}

function concrete() {
  const defs = [
    ["Concrete speckle", join(speckle(150, 313, 0.9), speckle(40, 317, 1.8)), 0.22],
    ["Concrete aggregate", join(...Array.from({ length: 60 }, (_, i) => {
      const random = mulberry(i * 31 + 11);
      return circle(n(4 + random() * 92), n(4 + random() * 92), n(1 + random() * 2.4));
    })), 0.2],
    ["Concrete cracks", join(veins(4, 331, 0.8), speckle(60, 337, 0.8)), 0.18],
    ["Concrete panels", join(bands(4, 347), hatch(90, 30, 349), speckle(80, 353, 0.7)), 0.16],
    ["Concrete mottling", join(blob(30, 40, 22, 9, 0.3, 359), blob(72, 66, 20, 9, 0.3, 367), speckle(80, 373, 0.7)), 0.14],
    ["Concrete dust", join(speckle(100, 379, 0.6), speckle(30, 383, 1.6)), 0.24],
  ];
  return defs.map(([name, d, opacity]) => texture(name, "Concrete", d, opacity));
}

function gradients() {
  const halftone = (seed, direction) =>
    Array.from({ length: 18 }, (_, row) =>
      Array.from({ length: 18 }, (_, col) => {
        const t = direction === "vertical" ? row / 17 : (row + col) / 34;
        return circle(n(col * 5.6 + 3), n(row * 5.6 + 3), n(0.4 + t * 2.4));
      }).join(" "),
    ).join(" ");
  const defs = [
    ["Halftone fade", halftone(389, "vertical"), 0.3],
    ["Diagonal halftone", halftone(397, "diagonal"), 0.26],
    ["Line fade", Array.from({ length: 34 }, (_, index) => line(4, n(6 + index * 2.7), 4 + (index / 34) * 92, n(6 + index * 2.7))).join(" "), 0.2],
    ["Dot density", join(speckle(200, 401, 0.7), speckle(40, 409, 1.4)), 0.2],
    ["Soft bands", bands(20, 419), 0.14],
    ["Corner fade", Array.from({ length: 16 }, (_, index) => circle(n(88 - index * 5), n(12 + index * 4.6), n(1 + index * 0.9))).join(" "), 0.2],
    ["Radiating lines", Array.from({ length: 40 }, (_, index) => line(50, 50, 50 + Math.cos((index * 9 * Math.PI) / 180) * 70, 50 + Math.sin((index * 9 * Math.PI) / 180) * 70)).join(" "), 0.12],
    ["Shade grid", join(hatch(0, 2.6, 421, 0), hatch(90, 12, 431, 0)), 0.1],
  ];
  return defs.map(([name, d, opacity]) => texture(name, "Subtle gradients", d, opacity));
}

function vintage() {
  const defs = [
    ["Foxing spots", join(speckle(40, 433, 1.4), speckle(14, 439, 2.8)), 0.24],
    ["Aged edges", join(rect(2, 2, 96, 96), rect(6, 6, 88, 88), speckle(70, 443, 1)), 0.18],
    ["Creases", join(hatch(0, 30, 449, 3), hatch(90, 60, 457, 4), speckle(40, 461, 0.8)), 0.14],
    ["Old paper fibres", join(hatch(6, 12, 463, 4), speckle(90, 467, 0.7)), 0.22],
    ["Stain rings", join(circle(30, 34, 16), circle(30, 34, 12), circle(72, 66, 20), circle(72, 66, 15)), 0.14],
    ["Burnt edge", join(blob(50, 50, 48, 16, 0.06, 479), blob(50, 50, 42, 16, 0.1, 487)), 0.2],
    ["Vintage wash", join(blob(26, 28, 20, 8, 0.4, 491), blob(76, 72, 24, 9, 0.35, 499), speckle(60, 503, 0.8)), 0.16],
    ["Photocopy grain", join(speckle(180, 509, 0.7), hatch(90, 7, 521, 2)), 0.16],
  ];
  return defs.map(([name, d, opacity]) => texture(name, "Vintage paper effects", d, opacity));
}

function texture(name, subcategory, d, opacity) {
  return {
    subcategory,
    name,
    tags: ["texture", "background", "surface", subcategory.toLowerCase(), "overlay"],
    ink: "stroke",
    strokeWidth: 1,
    opacity,
    aspect: 1,
    d,
  };
}

export function textureAssets() {
  return [
    ...paper(),
    ...linen(),
    ...canvas(),
    ...grain(),
    ...marble(),
    ...watercolour(),
    ...fabric(),
    ...concrete(),
    ...gradients(),
    ...vintage(),
  ];
}
