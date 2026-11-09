import {
  arc,
  circle,
  ellipse,
  leaf,
  line,
  mulberry,
  petal,
  polygon,
  rect,
  roundedRect,
  rotatePath,
  star,
  sweep,
} from "../paths.mjs";

const join = (...parts) => parts.filter(Boolean).join(" ");
const polar = (cx, cy, r, angle) => [
  cx + Math.cos((angle * Math.PI) / 180) * r,
  cy + Math.sin((angle * Math.PI) / 180) * r,
];

/* -------------------------------------------------------------------------- */
/* Art Deco                                                                   */
/* -------------------------------------------------------------------------- */

function decoFan(cx, cy, radius, rays, spread = 180, start = 180) {
  const parts = [];
  for (let index = 0; index <= rays; index += 1) {
    const angle = start + (spread / rays) * index;
    const [x, y] = polar(cx, cy, radius, angle);
    parts.push(line(cx, cy, x, y));
  }
  parts.push(sweep(cx, cy, radius, radius, start, start + spread));
  parts.push(sweep(cx, cy, radius * 0.72, radius * 0.72, start, start + spread));
  return parts.join(" ");
}

function steppedFrame(x, y, w, h, steps) {
  const parts = [];
  for (let index = 0; index < steps; index += 1) {
    const inset = index * 4;
    parts.push(rect(x + inset, y + inset, w - inset * 2, h - inset * 2));
  }
  return parts.join(" ");
}

function artDeco() {
  const defs = [
    ["Deco sunfan", decoFan(50, 78, 42, 11)],
    ["Deco half-fan", decoFan(50, 60, 40, 9, 180, 180)],
    ["Deco corner fan", decoFan(8, 8, 46, 7, 90, 0)],
    ["Deco rays", join(...Array.from({ length: 9 }, (_, i) => line(50, 90, 8 + i * 10.5, 12)))],
    ["Deco stepped frame", steppedFrame(6, 6, 88, 88, 5)],
    ["Deco arch", join(arc(50, 62, 36, 36, 180, 360), line(14, 62, 14, 88), line(86, 62, 86, 88), arc(50, 62, 26, 26, 180, 360), line(24, 62, 24, 88), line(76, 62, 76, 88))],
    ["Deco chevrons", join(...Array.from({ length: 4 }, (_, i) => join(line(8, 20 + i * 16, 50, 4 + i * 16), line(92, 20 + i * 16, 50, 4 + i * 16))))],
    ["Deco palm", join(line(50, 92, 50, 40), ...Array.from({ length: 7 }, (_, i) => {
      const angle = -160 + i * 20;
      return line(50, 40, 50 + Math.cos((angle * Math.PI) / 180) * 34, 40 + Math.sin((angle * Math.PI) / 180) * 30);
    }))],
    ["Deco diamond stack", join(polygon(50, 24, 18, 20, 4), polygon(50, 50, 14, 16, 4), polygon(50, 72, 10, 12, 4))],
    ["Deco gates", join(rect(18, 8, 64, 84), ...Array.from({ length: 5 }, (_, i) => line(22 + i * 14, 8, 22 + i * 14, 92)))],
    ["Deco wings", join(
      ...Array.from({ length: 4 }, (_, i) => arc(50, 78, 14 + i * 8, 14 + i * 8, 190, 350)),
      line(50, 78, 50, 30),
    )],
    ["Deco frame", join(rect(8, 8, 84, 84), polygon(8, 8, 8, 8, 4), polygon(92, 8, 8, 8, 4), polygon(8, 92, 8, 8, 4), polygon(92, 92, 8, 8, 4))],
    ["Deco emblem", join(circle(50, 42, 18), star(50, 42, 15, 7, 8), rect(30, 64, 40, 4), rect(36, 72, 28, 3))],
    ["Deco sunrise", join(arc(50, 74, 34, 34, 180, 360), ...Array.from({ length: 7 }, (_, i) => line(50, 74, 50 + Math.cos(((180 + i * 30) * Math.PI) / 180) * 42, 74 + Math.sin(((180 + i * 30) * Math.PI) / 180) * 42)))],
    ["Deco scallop", join(...Array.from({ length: 5 }, (_, i) => arc(14 + i * 18, 40, 10, 10, 180, 360)), ...Array.from({ length: 5 }, (_, i) => arc(14 + i * 18, 66, 10, 10, 180, 360)))],
    ["Deco monogram frame", join(rect(12, 12, 76, 76), line(12, 34, 88, 34), line(12, 66, 88, 66), polygon(50, 50, 12, 12, 4))],
    ["Deco sunburst", join(circle(50, 50, 20), ...Array.from({ length: 16 }, (_, i) => {
      const [x1, y1] = polar(50, 50, 24, i * 22.5);
      const [x2, y2] = polar(50, 50, i % 2 ? 34 : 42, i * 22.5);
      return line(x1, y1, x2, y2);
    }))],
    ["Deco notes", join(line(10, 20, 90, 20), line(10, 80, 90, 80), ...Array.from({ length: 6 }, (_, i) => polygon(20 + i * 12, 50, 4, 4, 4)))],
    ["Deco keyhole", join(roundedRect(20, 8, 60, 84, 20), line(30, 52, 70, 52), circle(50, 38, 10))],
    ["Deco stair", join(...Array.from({ length: 5 }, (_, i) => rect(10 + i * 8, 20 + i * 12, 80 - i * 16, 8)))],
    ["Deco lattice", join(...Array.from({ length: 6 }, (_, i) => line(10 + i * 14, 10, 10 + i * 14, 90)), ...Array.from({ length: 6 }, (_, i) => line(10, 10 + i * 14, 90, 10 + i * 14)))],
    ["Deco crest", join(polygon(50, 8, 20, 12, 4), arc(50, 46, 26, 26, 180, 360), line(24, 46, 24, 78), line(76, 46, 76, 78), line(24, 78, 76, 78), circle(50, 46, 6))],
    ["Deco triangle band", join(...Array.from({ length: 6 }, (_, i) => polygon(9 + i * 16, 50, 7, 9, 3, i % 2 ? 90 : -90)))],
    ["Deco shell", join(
      ...Array.from({ length: 5 }, (_, i) => sweep(50, 84, 42 - i * 7, 34 - i * 6, 200, 340)),
      line(50, 84, 50, 70),
    )],
  ];
  return defs.map(([name, d], index) => ({
    subcategory: "Art Deco",
    name,
    tags: ["art deco", "geometric", "ornament", "luxury", "1920s"],
    ink: index === 18 || index === 19 ? "fill" : "stroke",
    strokeWidth: 1.5,
    aspect: index === 6 ? 1.6 : 1,
    d,
  }));
}

/* -------------------------------------------------------------------------- */
/* Flourishes and scrollwork                                                  */
/* -------------------------------------------------------------------------- */

function flourish(loops, width, height, seed, mirror = false) {
  const random = mulberry(seed);
  const parts = [];
  for (let index = 0; index < loops; index += 1) {
    const x = 10 + (index / loops) * (80 - width * 0.2);
    const y = 50 + (random() - 0.5) * height * 0.3;
    const radius = 4 + random() * 7;
    parts.push(sweep(x + radius, y, radius, radius * 0.7, 200 + random() * 60, 520));
    parts.push(
      `M ${Math.round(x)} ${Math.round(y)} C ${Math.round(x + width * 0.2)} ${Math.round(y - height * 0.6)} ${Math.round(x + width * 0.5)} ${Math.round(y + height * 0.5)} ${Math.round(x + width * 0.8)} ${Math.round(y - height * 0.1)}`,
    );
  }
  const d = parts.join(" ");
  return mirror ? `${d} ` : d;
}

function flourishes() {
  const defs = [
    ["Calligraphic swash", "M 6 64 C 24 40 42 34 50 44 C 58 54 46 66 38 58 C 30 50 42 36 58 40 C 74 44 82 56 94 34"],
    ["Double swash", "M 6 58 C 22 38 40 34 50 46 C 60 58 46 68 38 58 C 32 50 44 38 60 44 M 52 66 C 66 52 78 48 94 56"],
    ["Loop flourish", "M 6 66 C 20 46 34 42 44 50 C 54 58 42 70 34 62 C 26 54 38 40 54 40 C 70 40 74 54 94 46"],
    ["Scroll tail", "M 8 70 C 30 70 34 44 50 44 C 66 44 70 70 92 70 C 82 62 78 52 66 52 C 54 52 46 62 50 70"],
    ["Curl pair", join(sweep(24, 50, 16, 12, 30, 330), sweep(76, 50, 16, 12, 210, 510), line(40, 52, 60, 52))],
    ["Leaf swash", join(flourish(2, 60, 30, 7), leaf(18, 56, 18, 5, 340), leaf(82, 46, 18, 5, 200))],
    ["Pointed flourish", "M 6 58 C 26 58 34 30 50 30 C 66 30 74 58 94 58 C 80 58 72 48 62 46 C 54 44 46 48 38 46 C 28 44 20 58 6 58 Z"],
    ["Feather flourish", join(line(6, 66, 94, 34), ...Array.from({ length: 8 }, (_, i) => {
      const t = (i + 1) / 10;
      return line(6 + 88 * t, 66 - 32 * t, 6 + 88 * t - 2, 66 - 32 * t - 10);
    }))],
    ["Ribbon flourish", "M 6 52 C 22 36 38 38 46 50 C 54 62 70 64 94 46 M 6 60 C 22 76 38 74 46 62 C 54 50 70 48 94 66"],
    ["Corner flourish", "M 8 8 C 8 40 24 52 42 52 C 58 52 66 64 66 84 C 50 84 38 74 38 64 C 38 52 26 46 8 46 Z"],
    ["Flourish divider", join(line(4, 50, 30, 50), line(70, 50, 96, 50), "M 30 50 C 38 38 44 36 50 42 C 56 48 50 58 44 54 C 38 50 46 42 56 44 C 64 46 68 50 70 50")],
    ["Ornamental squiggle", "M 6 54 C 16 44 24 64 34 54 C 44 44 52 64 62 54 C 72 44 80 64 94 54"],
    ["Classic cartouche top", join(arc(50, 54, 26, 20, 180, 360), line(24, 54, 24, 66), line(76, 54, 76, 66), line(24, 66, 76, 66), sweep(50, 34, 10, 8, 200, 340))],
    ["Corner scroll", "M 8 50 C 8 26 26 8 50 8 C 40 16 32 26 32 38 C 32 48 40 54 50 54 C 58 54 62 48 62 42 C 62 36 56 32 50 34"],
    ["Swash underline", "M 6 62 C 26 52 40 54 50 60 C 60 66 74 64 94 52 M 6 70 C 30 64 44 66 54 70 C 66 74 78 70 94 62"],
    ["Double loop", join(sweep(32, 50, 20, 14, 30, 330), sweep(52, 50, 14, 10, 210, 510), line(52, 50, 92, 50))],
    ["Baroque curl", "M 6 70 C 26 70 30 42 46 40 C 58 38 64 46 58 52 C 52 58 42 50 48 42 C 58 28 80 34 94 46"],
    ["Tail flourish", "M 6 56 C 30 56 38 36 54 36 C 70 36 78 56 94 56 C 82 66 68 64 58 58 C 48 52 36 58 6 56 Z"],
    ["Filigree corner", join(
      "M 8 8 C 8 36 24 52 50 54 C 44 44 40 34 42 24 C 44 16 54 16 56 24 C 58 34 50 44 44 54",
      circle(20, 20, 4),
      circle(32, 32, 3),
    )],
    ["Swash pair", join(
      "M 6 54 C 26 36 42 40 50 50 C 58 60 74 64 94 46",
      "M 6 62 C 26 80 42 76 50 66 C 58 56 74 52 94 70",
    )],
  ];
  return defs.map(([name, d], index) => ({
    subcategory: "Vintage flourishes",
    name,
    tags: ["flourish", "swash", "calligraphy", "vintage", "ornament"],
    ink: index === 6 || index === 17 ? "fill" : "stroke",
    strokeWidth: 1.4,
    aspect: index === 9 || index === 18 ? 1 : 3.4,
    d,
  }));
}

/* -------------------------------------------------------------------------- */
/* Corner ornaments                                                           */
/* -------------------------------------------------------------------------- */

function cornerOrnament(style, size = 40) {
  const s = size;
  const x = 8;
  const y = 8;
  switch (style) {
    case "scroll":
      return join(
        line(x, y, x + s, y),
        line(x, y, x, y + s),
        `M ${x + 6} ${y + s} C ${x + 6} ${y + s - 10} ${x + 12} ${y + 16} ${x + 20} ${y + 20}`,
        `M ${x + s} ${y + 6} C ${x + s - 10} ${y + 6} ${x + 16} ${y + 12} ${x + 20} ${y + 20}`,
        circle(x + 20, y + 20, 3),
      );
    case "leaf":
      return join(
        line(x, y, x + s, y),
        line(x, y, x, y + s),
        leaf(x + 8, y + 8, s * 0.7, 8, 45),
        leaf(x + 16, y + 16, s * 0.55, 6, 45),
      );
    case "fan":
      return join(
        line(x, y, x + s, y),
        line(x, y, x, y + s),
        ...Array.from({ length: 5 }, (_, i) => line(x, y, x + 14 + i * 6, y + 14 + (4 - i) * 6)),
        arc(x, y, s * 0.7, s * 0.7, 0, 90),
      );
    case "double":
      return join(
        line(x, y, x + s, y),
        line(x, y, x, y + s),
        line(x + 6, y + 6, x + s - 6, y + 6),
        line(x + 6, y + 6, x + 6, y + s - 6),
        circle(x + s - 6, y + 6, 2.4),
        circle(x + 6, y + s - 6, 2.4),
      );
    case "diamond":
      return join(
        line(x, y, x + s, y),
        line(x, y, x, y + s),
        polygon(x + 20, y + 20, 9, 9, 4),
        line(x + 8, y + 8, x + 13, y + 13),
      );
    case "step":
      return join(
        "M 8 8 L 44 8 L 44 13 L 13 13 L 13 44 L 8 44 Z",
        line(20, 20, 40, 20),
        line(20, 20, 20, 40),
      );
    case "flower":
      return join(line(x, y, x + s, y), line(x, y, x, y + s), petal(x + 16, y + 16, 22, 7, 60), petal(x + 16, y + 16, 22, 7, 30), circle(x + 16, y + 16, 3));
    case "bead":
      return join(
        line(x, y, x + s, y),
        line(x, y, x, y + s),
        ...Array.from({ length: 4 }, (_, i) => circle(x + 8 + i * 8, y + 8 + (3 - i) * 3, 2.2)),
      );
    default:
      return join(line(x, y, x + s, y), line(x, y, x, y + s));
  }
}

function cornerFrames() {
  const styles = ["scroll", "leaf", "fan", "double", "diamond", "step", "flower", "bead"];
  const assets = [];
  styles.forEach((style) => {
    const corner = cornerOrnament(style);
    for (const variant of [0, 1]) {
      const parts = [];
      [0, 90, 180, 270].forEach((angle) => parts.push(rotatePath(corner, angle)));
      if (variant === 1) parts.push(rect(6, 6, 88, 88));
      assets.push({
        subcategory: "Corner ornaments",
        name: `${style[0].toUpperCase()}${style.slice(1)} corners${variant ? " on keyline" : ""}`,
        tags: ["corner", "ornament", "frame", "decorative", "classic"],
        ink: "stroke",
        strokeWidth: 1.3,
        aspect: 0.72,
        d: parts.join(" "),
      });
    }
  });
  return assets;
}

/* -------------------------------------------------------------------------- */
/* Royal frames                                                               */
/* -------------------------------------------------------------------------- */

function royalFrames() {
  const crest = join(
    polygon(50, 16, 14, 10, 4),
    arc(50, 46, 30, 30, 180, 360),
    line(20, 46, 20, 76),
    line(80, 46, 80, 76),
    line(20, 76, 80, 76),
    circle(50, 40, 6),
  );
  const defs = [
    ["Crest frame", join(rect(8, 8, 84, 84), crest)],
    ["Canopy frame", join(rect(10, 26, 80, 66), arc(50, 26, 40, 22, 180, 360), circle(50, 14, 4))],
    ["Double crest frame", join(rect(6, 20, 88, 74), rect(11, 25, 78, 64), crest)],
    ["Shield frame", join("M 16 12 L 84 12 L 84 60 C 84 78 68 86 50 92 C 32 86 16 78 16 60 Z", arc(50, 40, 18, 18, 200, 340))],
    ["Cartouche frame", join(ellipse(50, 50, 42, 34), ellipse(50, 50, 36, 28), star(50, 14, 6, 3, 4))],
    ["Laurel frame", join(rect(12, 12, 76, 76), ...Array.from({ length: 9 }, (_, i) => leaf(12, 20 + i * 7.5, 12, 4, 180)), ...Array.from({ length: 9 }, (_, i) => leaf(88, 20 + i * 7.5, 12, 4, 0)))],
    ["Crown frame", join(rect(10, 28, 80, 62), "M 24 28 L 32 12 L 42 24 L 50 8 L 58 24 L 68 12 L 76 28 Z")],
    ["Column frame", join(line(16, 10, 16, 90), line(84, 10, 84, 90), line(8, 10, 24, 10), line(76, 10, 92, 10), line(8, 90, 24, 90), line(76, 90, 92, 90), line(16, 20, 84, 20), line(16, 80, 84, 80))],
    ["Oval crest frame", join(ellipse(50, 52, 38, 40), star(50, 8, 8, 4, 6), ellipse(50, 52, 32, 34))],
    ["Greek frame", join(rect(10, 10, 80, 80), rect(16, 16, 68, 68), line(10, 10, 26, 26), line(90, 10, 74, 26), line(10, 90, 26, 74), line(90, 90, 74, 74))],
    ["Acanthus frame", join(rect(12, 12, 76, 76), leaf(12, 88, 26, 9, -45), leaf(88, 88, 26, 9, -135), leaf(12, 12, 26, 9, 45), leaf(88, 12, 26, 9, 135))],
    ["Medallion frame", join(circle(50, 50, 42), circle(50, 50, 35), ...Array.from({ length: 12 }, (_, i) => circle(50 + Math.cos((i * 30 * Math.PI) / 180) * 38.5, 50 + Math.sin((i * 30 * Math.PI) / 180) * 38.5, 2.4)))],
    ["Keyhole frame", join(roundedRect(18, 8, 64, 84, 22), line(28, 50, 72, 50), circle(50, 34, 8))],
    ["Bookplate frame", join(rect(8, 8, 84, 84), rect(14, 14, 72, 72), line(14, 30, 86, 30), line(30, 30, 30, 86), star(50, 22, 5, 2.4, 5))],
    ["Portico frame", join(rect(14, 18, 72, 72), line(8, 18, 92, 18), line(8, 14, 92, 14), ...Array.from({ length: 4 }, (_, i) => line(24 + i * 17, 18, 24 + i * 17, 26)))],
    ["Victorian frame", join(rect(8, 8, 84, 84), arc(8, 8, 14, 14, 0, 90), arc(92, 8, 14, 14, 90, 180), arc(92, 92, 14, 14, 180, 270), arc(8, 92, 14, 14, 270, 360))],
  ];
  return defs.map(([name, d], index) => ({
    subcategory: "Royal frames",
    name,
    tags: ["frame", "royal", "ornate", "luxury", "invitation"],
    ink: "stroke",
    strokeWidth: index === 10 ? 1.2 : 1.5,
    aspect: 0.72,
    d,
  }));
}

/* -------------------------------------------------------------------------- */
/* Monograms, seals, classical ornament                                       */
/* -------------------------------------------------------------------------- */

function monograms() {
  const cartouche = (inner) => join(inner, star(50, 7, 5, 2.4, 5), star(50, 93, 5, 2.4, 5));
  const defs = [
    ["Round monogram", cartouche(circle(50, 50, 36))],
    ["Oval monogram", cartouche(ellipse(50, 50, 40, 32))],
    ["Shield monogram", cartouche("M 22 20 L 78 20 L 78 56 C 78 72 64 82 50 88 C 36 82 22 72 22 56 Z")],
    ["Diamond monogram", cartouche(polygon(50, 50, 36, 36, 4))],
    ["Double ring monogram", cartouche(join(circle(50, 50, 38), circle(50, 50, 32)))],
    ["Laurel monogram", cartouche(join(circle(50, 50, 36), ...Array.from({ length: 8 }, (_, i) => leaf(14, 32 + i * 5, 9, 3, 180)), ...Array.from({ length: 8 }, (_, i) => leaf(86, 32 + i * 5, 9, 3, 0))))],
    ["Scalloped monogram", cartouche(join(arc(50, 50, 38, 38, 0, 360), ...Array.from({ length: 12 }, (_, i) => {
      const [x, y] = polar(50, 50, 38, i * 30);
      return circle(x, y, 3);
    })))],
    ["Octagon monogram", cartouche(polygon(50, 50, 38, 38, 8, 22.5))],
    ["Ribbon monogram", cartouche(join(ellipse(50, 46, 34, 26), "M 20 66 L 30 78 L 50 72 L 70 78 L 80 66"))],
    ["Hexagon monogram", cartouche(polygon(50, 50, 37, 37, 6))],
    ["Crest monogram", cartouche(join(circle(50, 50, 34), star(50, 16, 5, 2.2, 4), line(20, 68, 80, 68)))],
    ["Baroque monogram", cartouche(join(circle(50, 50, 36), sweep(50, 50, 30, 30, 200, 340), sweep(50, 50, 30, 30, 20, 160)))],
    ["Minimal monogram", join(circle(50, 50, 34), line(34, 66, 66, 66))],
    ["Square monogram", cartouche(roundedRect(18, 18, 64, 64, 8))],
    ["Sunburst monogram", cartouche(join(circle(50, 50, 34), ...Array.from({ length: 16 }, (_, i) => {
      const [x1, y1] = polar(50, 50, 34, i * 22.5);
      const [x2, y2] = polar(50, 50, 40, i * 22.5);
      return line(x1, y1, x2, y2);
    })))],
    ["Twin rule monogram", cartouche(join(ellipse(50, 50, 38, 30), ellipse(50, 50, 33, 25)))],
  ];
  return defs.map(([name, d]) => ({
    subcategory: "Monograms",
    name,
    tags: ["monogram", "cartouche", "crest", "wedding", "stationery"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 1,
    d,
  }));
}

function seals() {
  const defs = [
    ["Wax seal", join(circle(50, 50, 40), star(50, 50, 24, 10, 6))],
    ["Starburst seal", join(star(50, 50, 44, 30, 16), circle(50, 50, 20))],
    ["Scalloped seal", join(...Array.from({ length: 14 }, (_, i) => circle(...polar(50, 50, 38, i * (360 / 14)), 9)), circle(50, 50, 26))],
    ["Notary seal", join(circle(50, 50, 42), circle(50, 50, 34), ...Array.from({ length: 20 }, (_, i) => {
      const [x, y] = polar(50, 50, 38, i * 18);
      return circle(x, y, 1.2);
    }), star(50, 50, 16, 7, 5))],
    ["Burst emblem", join(polygon(50, 50, 44, 44, 24), circle(50, 50, 26))],
    ["Round emblem", join(circle(50, 50, 42), line(20, 50, 80, 50), line(50, 20, 50, 80))],
    ["Heraldic shield", join("M 18 14 L 82 14 L 82 54 C 82 72 66 84 50 90 C 34 84 18 72 18 54 Z", star(50, 46, 20, 9, 5))],
    ["Quatrefoil seal", join(circle(36, 36, 18), circle(64, 36, 18), circle(36, 64, 18), circle(64, 64, 18), circle(50, 50, 14))],
    ["Ring seal", join(circle(50, 50, 42), circle(50, 50, 30), ...Array.from({ length: 8 }, (_, i) => {
      const [x, y] = polar(50, 50, 36, i * 45);
      return polygon(x, y, 3.5, 3.5, 4);
    }))],
    ["Octagon seal", join(polygon(50, 50, 42, 42, 8, 22.5), polygon(50, 50, 30, 30, 8, 22.5))],
    ["Sun seal", join(circle(50, 50, 34), ...Array.from({ length: 12 }, (_, i) => {
      const [x1, y1] = polar(50, 50, 34, i * 30);
      const [x2, y2] = polar(50, 50, i % 2 ? 42 : 46, i * 30);
      return line(x1, y1, x2, y2);
    }))],
    ["Crescent seal", join(circle(50, 50, 40), circle(60, 46, 30), star(66, 34, 7, 3, 4))],
    ["Double ring seal", join(circle(50, 50, 42), circle(50, 50, 35), star(50, 50, 22, 9, 8))],
    ["Laurel seal", join(circle(50, 50, 36), ...Array.from({ length: 10 }, (_, i) => leaf(15, 28 + i * 4.8, 8, 3, 170)), circle(50, 50, 12))],
    ["Diamond seal", join(polygon(50, 50, 42, 42, 4), polygon(50, 50, 28, 28, 4), circle(50, 50, 8))],
    ["Crown emblem", join(circle(50, 54, 30), "M 28 40 L 34 24 L 42 34 L 50 20 L 58 34 L 66 24 L 72 40 Z")],
  ];
  return defs.map(([name, d], index) => ({
    subcategory: "Seals & emblems",
    name,
    tags: ["seal", "emblem", "stamp", "luxury", "crest"],
    ink: "stroke",
    strokeWidth: index === 3 || index === 6 ? 1.2 : 1.6,
    aspect: 1,
    d,
  }));
}

function classical() {
  const meander = Array.from({ length: 6 }, (_, i) => {
    const x = 4 + i * 16;
    return `M ${x} 76 L ${x} 28 L ${x + 10} 28 L ${x + 10} 66 L ${x + 4} 66 L ${x + 4} 38 L ${x + 14} 38 L ${x + 14} 76`;
  }).join(" ");
  const eggAndDart = join(
    line(4, 30, 96, 30),
    line(4, 70, 96, 70),
    ...Array.from({ length: 6 }, (_, i) => ellipse(12 + i * 15, 50, 6, 12)),
    ...Array.from({ length: 6 }, (_, i) => line(19 + i * 15, 38, 19 + i * 15, 62)),
  );
  const defs = [
    ["Greek key band", meander],
    ["Egg and dart", eggAndDart],
    ["Dentil band", join(line(4, 34, 96, 34), line(4, 66, 96, 66), ...Array.from({ length: 10 }, (_, i) => rect(10 + i * 8.4, 38, 5, 24)))],
    ["Acanthus scroll", join(
      "M 8 78 C 8 44 24 24 44 24 C 58 24 62 38 54 44 C 46 50 38 42 44 34 C 52 24 68 28 76 42 C 84 56 84 68 92 78",
      leaf(30, 70, 26, 8, -60),
      leaf(56, 60, 22, 7, -30),
    )],
    ["Volute pair", join(sweep(28, 50, 20, 20, 0, 420), sweep(72, 50, 20, 20, 180, 600), line(48, 50, 52, 50))],
    ["Bead and reel", join(line(4, 50, 96, 50), ...Array.from({ length: 11 }, (_, i) => circle(10 + i * 8, 50, 3)))],
    ["Wave scroll", join(...Array.from({ length: 4 }, (_, i) => sweep(14 + i * 24, 58, 12, 10, 200, 520)), line(4, 74, 96, 74))],
    ["Anthemion", join(
      line(4, 80, 96, 80),
      petal(50, 80, 58, 12, -90),
      ...Array.from({ length: 4 }, (_, i) => petal(50, 80, 40, 8, -150 + i * 40)),
    )],
    ["Classical border", join(rect(4, 4, 92, 92), rect(9, 9, 82, 82), meander.replace(/M 4/g, "M 9"))],
    ["Rinceau scroll", join(
      sweep(50, 50, 40, 24, 0, 360),
      leaf(50, 10, 18, 6, 90),
      leaf(50, 90, 18, 6, 270),
      leaf(10, 50, 18, 6, 180),
      leaf(90, 50, 18, 6, 0),
      circle(50, 50, 4),
    )],
    ["Palmette", join(
      line(50, 88, 50, 60),
      ...Array.from({ length: 7 }, (_, i) => petal(50, 60, 34 + (i % 2 ? 0 : 10), 5, -150 + i * 20)),
    )],
    ["Doric band", join(line(4, 20, 96, 20), line(4, 30, 96, 30), line(4, 72, 96, 72), line(4, 82, 96, 82), ...Array.from({ length: 4 }, (_, i) => rect(22 + i * 18, 34, 10, 34)))],
    ["Ionic volutes", join(sweep(30, 60, 18, 18, 120, 480), sweep(70, 60, 18, 18, 60, 420), line(12, 32, 88, 32))],
    ["Chain ornament", join(...Array.from({ length: 6 }, (_, i) => ellipse(14 + i * 14, 50, 7, 14)))],
    ["Laurel band", join(line(4, 50, 12, 50), line(88, 50, 96, 50), ...Array.from({ length: 9 }, (_, i) => leaf(14 + i * 8, 50, 10, 3, i % 2 ? 50 : 130)))],
    ["Classical cornice", join(line(4, 18, 96, 18), line(4, 26, 96, 26), line(4, 34, 96, 34), ...Array.from({ length: 9 }, (_, i) => line(10 + i * 10, 34, 10 + i * 10, 44)), line(4, 44, 96, 44), line(4, 56, 96, 56))],
  ];
  return defs.map(([name, d], index) => ({
    subcategory: "Classical ornaments",
    name,
    tags: ["classical", "ornament", "architecture", "vintage", "border"],
    ink: index === 4 ? "stroke" : "stroke",
    strokeWidth: 1.3,
    aspect: index === 0 || index === 2 || index === 5 || index === 11 || index === 14 ? 2.6 : 1,
    d,
  }));
}

function minimalLuxury() {
  const defs = [
    ["Line arch", join(arc(50, 58, 32, 32, 180, 360), line(18, 58, 18, 88), line(82, 58, 82, 88))],
    ["Line circle", join(circle(50, 50, 34), line(50, 16, 50, 84))],
    ["Line pair", join(line(20, 30, 80, 70), line(20, 70, 80, 30))],
    ["Line stack", join(...Array.from({ length: 5 }, (_, i) => line(14, 26 + i * 12, i % 2 ? 86 : 70, 26 + i * 12)))],
    ["Line arc pair", join(arc(50, 80, 36, 36, 200, 340), arc(50, 80, 26, 26, 200, 340))],
    ["Line leaf", leaf(50, 88, 66, 16, -90)],
    ["Line star", star(50, 50, 34, 15, 4)],
    ["Line diamond", join(polygon(50, 50, 32, 40, 4), line(50, 10, 50, 90))],
    ["Line sun", join(circle(50, 50, 20), ...Array.from({ length: 8 }, (_, i) => {
      const [x1, y1] = polar(50, 50, 26, i * 45);
      const [x2, y2] = polar(50, 50, 40, i * 45);
      return line(x1, y1, x2, y2);
    }))],
    ["Line frame", join(line(12, 30, 12, 12), line(12, 12, 30, 12), line(70, 12, 88, 12), line(88, 12, 88, 30), line(88, 70, 88, 88), line(88, 88, 70, 88), line(30, 88, 12, 88), line(12, 88, 12, 70))],
    ["Line waves", join(...Array.from({ length: 4 }, (_, i) => `M 12 ${30 + i * 12} C 30 ${20 + i * 12} 42 ${40 + i * 12} 58 ${30 + i * 12} C 70 ${22 + i * 12} 80 ${34 + i * 12} 88 ${30 + i * 12}`))],
    ["Line monogram ring", join(circle(50, 50, 30), line(36, 62, 64, 62))],
    ["Line chevron", join(...Array.from({ length: 3 }, (_, i) => `M 20 ${30 + i * 14} L 50 ${18 + i * 14} L 80 ${30 + i * 14}`))],
    ["Line cross", join(line(50, 14, 50, 86), line(26, 50, 74, 50), circle(50, 50, 8))],
    ["Line teardrop", join("M 50 14 C 68 34 76 48 76 60 C 76 74 64 84 50 84 C 36 84 24 74 24 60 C 24 48 32 34 50 14 Z", line(50, 30, 50, 66))],
    ["Line almond", join("M 50 16 C 70 30 82 44 82 56 C 82 70 68 82 50 84 C 32 82 18 70 18 56 C 18 44 30 30 50 16 Z", line(18, 56, 82, 56))],
  ];
  return defs.map(([name, d]) => ({
    subcategory: "Minimal luxury line art",
    name,
    tags: ["minimal", "line art", "modern", "luxury", "thin"],
    ink: "stroke",
    strokeWidth: 1,
    aspect: 1,
    d,
  }));
}

export function decorativeAssets() {
  return [
    ...artDeco(),
    ...flourishes(),
    ...cornerFrames(),
    ...royalFrames(),
    ...monograms(),
    ...seals(),
    ...classical(),
    ...minimalLuxury(),
  ];
}
