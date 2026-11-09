import {
  arc,
  mapPath,
  blob,
  circle,
  ellipse,
  leaf,
  line,
  petal,
  polygon,
  rect,
  sweep,
  wave,
} from "../paths.mjs";

const join = (...parts) => parts.filter(Boolean).join(" ");
const polar = (cx, cy, r, angle) => [
  cx + Math.cos((angle * Math.PI) / 180) * r,
  cy + Math.sin((angle * Math.PI) / 180) * r,
];

/* -------------------------------------------------------------------------- */
/* Flowers                                                                    */
/* -------------------------------------------------------------------------- */

function flower(cx, cy, radius, petals, petalWidth, layers = 1, rotate = -90) {
  const parts = [];
  for (let layer = 0; layer < layers; layer += 1) {
    const layerRadius = radius * (1 - layer * 0.28);
    const offset = layer % 2 ? 360 / petals / 2 : 0;
    for (let index = 0; index < petals; index += 1) {
      const angle = rotate + offset + (index * 360) / petals;
      parts.push(petal(cx, cy, layerRadius, petalWidth * (1 - layer * 0.2), angle));
    }
  }
  parts.push(circle(cx, cy, radius * 0.18));
  return parts.join(" ");
}

function flowers() {
  const defs = [
    ["Anemone", 8, 0.5, 2],
    ["Cosmos", 8, 0.36, 1],
    ["Dahlia", 14, 0.42, 2],
    ["Daisy", 16, 0.32, 1],
    ["Poppy", 5, 0.62, 1],
    ["Lotus", 8, 0.58, 2],
    ["Camellia", 6, 0.55, 2],
    ["Marigold", 18, 0.3, 2],
    ["Clematis", 6, 0.46, 2],
    ["Zinnia", 20, 0.28, 2],
    ["Ranunculus", 12, 0.4, 3],
    ["Magnolia", 7, 0.56, 1],
    ["Hibiscus", 5, 0.5, 1],
    ["Protea", 9, 0.48, 2],
    ["Aster", 22, 0.26, 1],
    ["Carnation", 12, 0.42, 2],
    ["Primrose", 5, 0.44, 2],
    ["Pansy", 5, 0.52, 2],
    ["Camelia bloom", 9, 0.4, 2],
    ["Wild rose", 11, 0.36, 1],
  ];
  return defs.map(([name, petals, width, layers], index) => ({
    subcategory: "Flowers",
    name,
    tags: ["flower", "bloom", "botanical", "floral", "wedding"],
    ink: "fill",
    strokeWidth: 0,
    aspect: 1,
    d: flower(50, 50, 40, petals, width * 40, layers, index * 7 - 90),
  }));
}

function roses() {
  const defs = [
    ["Garden rose", 6, 40],
    ["Centifolia rose", 7, 39],
    ["Cabbage rose", 9, 42],
    ["Spiral rose", 0, 40],
    ["Rose in bud", 4, 32],
    ["Wild rose bloom", 5, 36],
    ["Damask rose", 8, 41],
    ["Rose window", 12, 40],
    ["Tea rose", 6, 34],
    ["Rose of Sharon", 10, 38],
    ["Rose spiral, fine", 0, 42],
    ["Rose medallion", 14, 40],
  ];
  return defs.map(([name, petals, radius], index) => {
    const d = petals
      ? flower(50, 50, radius, petals, radius * 0.55, 2)
      : Array.from({ length: 5 }, (_, i) => sweep(50, 50, radius - i * 7, radius * 0.78 - i * 5, 20 + i * 34, 300 + i * 10)).join(" ");
    return {
      subcategory: "Roses",
      name,
      tags: ["rose", "flower", "romantic", "botanical"],
      ink: petals ? "fill" : "stroke",
      strokeWidth: 1.5,
      aspect: 1,
      d,
    };
  });
}

function leaves() {
  const defs = [
    ["Laurel leaf", leaf(50, 92, 78, 15, -90)],
    ["Olive leaf", leaf(50, 90, 70, 11, -90, 4)],
    ["Willow leaf", leaf(50, 92, 82, 8, -90, 8)],
    ["Poplar leaf", leaf(50, 90, 66, 18, -90)],
    ["Birch leaf", leaf(50, 90, 60, 20, -88)],
    ["Elm leaf", leaf(50, 90, 64, 22, -90, 2)],
    ["Linden leaf", leaf(50, 90, 58, 24, -90)],
    ["Lanceolate leaf", leaf(50, 92, 76, 12, -90)],
    ["Round leaf", ellipse(50, 50, 30, 38)],
    ["Eucalyptus leaf", ellipse(50, 52, 16, 40)],
    ["Ficus leaf", join(ellipse(50, 50, 26, 38), line(50, 12, 50, 88))],
    ["Monstera leaf", join(
      ellipse(50, 50, 32, 40),
      "M 50 50 L 20 28 M 50 50 L 80 28 M 50 50 L 22 62 M 50 50 L 78 62",
    )],
    ["Fern frond", join(
      line(50, 96, 50, 12),
      ...Array.from({ length: 9 }, (_, i) => {
        const y = 22 + i * 8;
        const length = 26 - Math.abs(i - 4) * 4;
        return join(leaf(50, y, length, length * 0.3, 160), leaf(50, y, length, length * 0.3, 20));
      }),
    )],
    ["Oak leaf", join(
      leaf(50, 94, 70, 26, -90),
      ...Array.from({ length: 4 }, (_, i) => {
        const y = 74 - i * 15;
        const width = 20 - i * 3;
        return join(leaf(50, y, width, width * 0.5, 200), leaf(50, y, width, width * 0.5, -20));
      }),
    )],
    ["Ginkgo leaf", join(
      "M 50 88 C 44 60 20 48 14 26 C 32 26 44 34 50 48 C 56 34 68 26 86 26 C 80 48 56 60 50 88 Z",
      line(50, 88, 50, 96),
    )],
    ["Palm frond", join(
      line(50, 96, 50, 18),
      ...Array.from({ length: 10 }, (_, i) => {
        const y = 24 + i * 7;
        const length = 34 - i * 2;
        return join(leaf(50, y, length, 3, 205), leaf(50, y, length, 3, -25));
      }),
    )],
    ["Bay leaf pair", join(leaf(50, 88, 62, 14, -115), leaf(50, 88, 62, 14, -65))],
    ["Clover trio", join(
      circle(36, 38, 18),
      circle(64, 38, 18),
      circle(50, 66, 18),
      line(50, 66, 52, 92),
    )],
    ["Ivy leaf", join(
      "M 50 92 L 50 66 C 30 66 18 52 20 36 C 30 38 38 42 44 50 C 40 36 44 20 50 12 C 56 20 60 36 56 50 C 62 42 70 38 80 36 C 82 52 70 66 50 66 Z",
    )],
    ["Olive sprig", join(
      line(18, 88, 64, 20),
      ...Array.from({ length: 6 }, (_, i) => {
        const t = i / 5;
        const x = 18 + (64 - 18) * t;
        const y = 88 - (88 - 20) * t;
        return join(leaf(x, y, 16, 4, -40), leaf(x, y, 16, 4, 150));
      }),
    )],
  ];
  return defs.map(([name, d], index) => ({
    subcategory: "Leaves",
    name,
    tags: ["leaf", "botanical", "nature", "greenery"],
    ink: index >= 8 && index <= 13 ? "stroke" : "fill",
    strokeWidth: 1.5,
    aspect: index === 13 || index === 15 || index === 19 ? 0.7 : 0.75,
    d,
  }));
}

function branches() {
  const defs = [
    ["Olive branch", 6, 0.28],
    ["Eucalyptus branch", 5, 0.22],
    ["Laurel branch", 7, 0.3],
    ["Willow branch", 8, 0.16],
    ["Birch branch", 6, 0.18],
    ["Fern branch", 9, 0.26],
    ["Ruscus branch", 7, 0.24],
    ["Bay branch", 10, 0.32],
    ["Rowan branch", 5, 0.32],
    ["Rosemary branch", 10, 0.14],
    ["Thyme branch", 12, 0.12],
    ["Mimosa branch", 8, 0.2],
    ["Cypress sprig", 9, 0.15],
    ["Palm branch", 8, 0.26],
    ["Fig branch", 5, 0.42],
    ["Blossom branch", 5, 0.4],
  ];
  return defs.map(([name, pairs, width], index) => {
    const parts = [line(16, 92, 78, 14)];
    for (let index2 = 0; index2 < pairs; index2 += 1) {
      const t = (index2 + 1) / (pairs + 1);
      const x = 16 + (78 - 16) * t;
      const y = 92 - (92 - 14) * t;
      const length = 10 + (1 - Math.abs(t - 0.5) * 2) * 10;
      parts.push(leaf(x, y, length, length * width * 0.5, -50 + (index2 % 2 ? 30 : 0)));
      parts.push(leaf(x, y, length, length * width * 0.5, 150 - (index2 % 2 ? 30 : 0)));
    }
    return {
      subcategory: "Branches",
      name,
      tags: ["branch", "stem", "botanical", "greenery", index % 3 === 0 ? "wedding" : "stationery"],
      ink: index < 11 ? "fill" : "stroke",
      strokeWidth: 1.2,
      aspect: 0.8,
      d: parts.join(" "),
    };
  });
}

function botanicalIllustrations() {
  const stems = [
    ["Single stem study", join(line(50, 96, 50, 44), leaf(50, 80, 26, 8, 200), leaf(50, 68, 22, 7, -20), flower(50, 32, 22, 8, 9, 2))],
    ["Tulip study", join(line(50, 96, 50, 52), leaf(50, 80, 30, 9, 210), leaf(50, 72, 26, 8, -30), "M 38 52 Q 36 28 44 24 Q 47 38 50 40 Q 53 38 56 24 Q 64 28 62 52 Q 50 58 38 52 Z")],
    ["Poppy study", join(line(50, 96, 48, 56), leaf(48, 82, 28, 8, 195), flower(50, 38, 24, 5, 15, 1))],
    ["Lavender sprig", join(line(50, 96, 50, 52), ...Array.from({ length: 8 }, (_, i) => ellipse(50, 48 - i * 4.6, 4.4 - i * 0.25, 6 - i * 0.3)), leaf(50, 84, 20, 5, 200), leaf(50, 84, 20, 5, -20))],
    ["Wheat stem", join(line(50, 96, 50, 30), ...Array.from({ length: 7 }, (_, i) => join(leaf(50, 62 - i * 1.2, 12, 4, 160), leaf(50, 62 - i * 1.2, 12, 4, 20))))],
    ["Berry sprig", join(line(18, 90, 70, 26), ...Array.from({ length: 6 }, (_, i) => {
      const t = (i + 1) / 7;
      return leaf(18 + 52 * t, 90 - 64 * t, 14, 5, -40 + (i % 2 ? 260 : 0));
    }), circle(70, 26, 4), circle(62, 34, 3), circle(76, 34, 3))],
    ["Artichoke study", join(line(50, 96, 50, 70), ellipse(50, 54, 24, 20), ...Array.from({ length: 5 }, (_, i) => petal(50, 64, 22, 8, -150 + i * 30)))],
    ["Fern study", join(line(50, 96, 50, 16), ...Array.from({ length: 11 }, (_, i) => {
      const y = 24 + i * 6;
      const length = 24 - i * 1.5;
      return join(leaf(50, y, length, 3, 205), leaf(50, y, length, 3, 335));
    }))],
    ["Eucalyptus study", join(line(50, 96, 50, 40), ...Array.from({ length: 6 }, (_, i) => ellipse(50 + (i % 2 ? 12 : -12), 78 - i * 10, 8, 11)))],
    ["Berry branch", join(line(22, 88, 72, 30), circle(72, 30, 5), circle(64, 22, 4), circle(80, 38, 4), leaf(40, 62, 18, 6, 210), leaf(38, 58, 18, 6, -30))],
    ["Cotton stem", join(line(50, 96, 50, 56), circle(42, 48, 8), circle(50, 42, 9), circle(58, 48, 8), circle(50, 54, 7))],
    ["Seed head", join(line(50, 96, 50, 62), circle(50, 46, 16), ...Array.from({ length: 10 }, (_, i) => {
      const angle = (i / 10) * 360;
      return line(50, 46, 50 + Math.cos((angle * Math.PI) / 180) * 23, 46 + Math.sin((angle * Math.PI) / 180) * 23);
    }))],
  ];
  return stems.map(([name, d], index) => ({
    subcategory: "Botanical illustrations",
    name,
    tags: ["botanical", "illustration", "study", "drawing", "wedding"],
    ink: index === 4 || index === 7 || index === 11 ? "stroke" : "fill",
    strokeWidth: 1.2,
    aspect: 0.66,
    d,
  }));
}

function floralCorners() {
  const corners = [
    ["Rose corner", flower(18, 18, 16, 7, 6, 2)],
    ["Peony corner", flower(20, 20, 19, 9, 7, 2)],
    ["Daisy corner", flower(16, 16, 14, 12, 5, 1)],
    ["Olive corner", join(line(4, 4, 42, 42), leaf(20, 20, 20, 6, 45), leaf(30, 30, 18, 5, 135), leaf(38, 22, 14, 4, 80))],
    ["Laurel corner", join(arc(4, 4, 34, 34, 0, 90), ...Array.from({ length: 4 }, (_, i) => leaf(4 + i * 8, 4 + i * 8, 12, 4, 45 + i * 6)))],
    ["Fern corner", join(line(4, 4, 46, 46), ...Array.from({ length: 6 }, (_, i) => {
      const p = 8 + i * 6;
      return join(leaf(p, p, 14, 4, 80), leaf(p, p, 14, 4, 10));
    }))],
    ["Eucalyptus corner", join(line(4, 4, 50, 50), ellipse(18, 18, 6, 9), ellipse(28, 28, 6, 9), ellipse(38, 38, 6, 9))],
    ["Blossom spray corner", join(
      line(4, 4, 38, 38),
      circle(14, 22, 6),
      circle(24, 14, 5),
      circle(30, 30, 4),
      leaf(20, 20, 16, 5, 100),
      leaf(26, 26, 14, 4, 20),
    )],
    ["Willow corner", join(arc(6, 6, 40, 40, 0, 90), ...Array.from({ length: 5 }, (_, i) => {
      const angle = (i / 4) * 90;
      const x = 6 + Math.cos((angle * Math.PI) / 180) * 40;
      const y = 6 + Math.sin((angle * Math.PI) / 180) * 40;
      return leaf(x, y, 12, 3, angle + 60);
    }))],
    ["Vine corner", join(line(6, 6, 52, 52), ...Array.from({ length: 8 }, (_, i) => {
      const t = i / 7;
      const x = 6 + 46 * t;
      const y = 6 + 46 * t;
      return join(circle(x, y, 2.4), leaf(x, y, 10, 3, i % 2 ? 60 : 20));
    }))],
    ["Grapevine corner", join(line(6, 6, 46, 46), ...Array.from({ length: 6 }, (_, i) => {
      const x = 10 + i * 6;
      const y = 10 + i * 6;
      return join(circle(x + 4, y + 2, 2.2), leaf(x, y, 9, 3, 45));
    }))],
    ["Camelia corner", flower(22, 22, 18, 6, 8, 2)],
    ["Wildflower corner", join(
      line(4, 4, 34, 34),
      flower(14, 14, 9, 5, 3, 1),
      flower(30, 12, 7, 6, 2, 1),
      flower(12, 30, 7, 6, 2, 1),
    )],
    ["Leaf frame corner", join(line(4, 4, 24, 4), line(4, 4, 4, 24), leaf(16, 16, 20, 6, 45), leaf(26, 26, 20, 6, 45))],
    ["Ivy corner", join(line(4, 4, 40, 40), leaf(18, 18, 16, 8, 45), leaf(28, 28, 14, 7, 45), leaf(36, 36, 12, 6, 45))],
    ["Palm corner", join(line(4, 4, 50, 50), ...Array.from({ length: 4 }, (_, i) => leaf(50, 50, 24 - i * 3, 3, 170 + i * 16)))],
  ];
  return corners.map(([name, d], index) => ({
    subcategory: "Floral corners",
    name,
    tags: ["corner", "floral", "ornament", "botanical", "invitation"],
    ink: index === 4 || index === 5 || index === 8 || index === 9 || index === 12 ? "stroke" : "fill",
    strokeWidth: 1.2,
    aspect: 1,
    d,
  }));
}

function butterflies() {
  const defs = [
    ["Swallowtail", 34, 20, 0.34],
    ["Monarch outline", 38, 22, 0.4],
    ["Moth", 30, 18, 0.28],
    ["Butterfly pair", 32, 19, 0.36],
    ["Silhouette butterfly", 40, 24, 0.44],
    ["Folded wing", 28, 16, 0.3],
    ["Garden butterfly", 36, 21, 0.38],
    ["Delicate moth", 26, 15, 0.26],
    ["Spring butterfly", 34, 20, 0.32],
    ["Night butterfly", 38, 22, 0.42],
  ];
  return defs.map(([name, spread, size, width], index) => {
    const wings = [];
    for (const direction of [1, -1]) {
      wings.push(petal(50, 50, spread, width * 40, direction > 0 ? -40 : -140));
      wings.push(petal(50, 50, spread * 0.72, width * 30, direction > 0 ? 35 : 145));
    }
    const body = join(ellipse(50, 50, 4, size * 0.5), line(50, 50 - size * 0.5, 50, 50 + size * 0.5), circle(50, 50 - size * 0.5, 3));
    return {
      subcategory: "Butterflies",
      name,
      tags: ["butterfly", "insect", "nature", "spring", "wedding"],
      ink: index === 1 || index === 3 || index === 7 ? "stroke" : "fill",
      strokeWidth: 1.2,
      aspect: 1.2,
      d: join(...wings, body),
    };
  });
}

function birds() {
  const birds = [
    ["Dove", "M 16 54 C 30 40 46 38 58 44 C 62 30 74 26 86 30 C 78 40 72 48 68 56 C 58 62 44 62 30 60 C 24 62 20 66 18 72 C 16 64 14 58 16 54 Z"],
    ["Swallow", "M 10 58 C 28 48 46 50 58 54 C 52 44 56 34 66 28 C 64 38 68 44 76 48 C 84 46 90 40 92 34 C 92 48 86 58 78 62 C 64 68 46 68 30 64 C 22 66 16 70 12 76 C 10 70 8 62 10 58 Z"],
    ["Crane", "M 14 62 C 34 56 52 58 64 62 C 60 44 62 30 70 20 C 66 36 70 44 82 42 C 90 40 94 44 92 50 C 86 52 80 52 76 56 C 70 66 58 70 44 70 C 30 70 20 68 14 62 Z"],
    ["Sparrow", "M 22 56 C 34 46 48 46 58 50 C 60 38 68 34 78 34 C 72 42 70 50 68 58 C 60 64 48 64 38 62 C 32 64 26 68 24 72 C 22 66 20 60 22 56 Z"],
    ["Heron", "M 12 66 C 30 62 48 60 62 62 C 58 46 52 34 44 26 C 54 34 64 42 74 44 C 76 38 80 34 86 32 C 84 40 88 44 92 48 C 82 52 76 56 72 62 C 64 70 48 72 34 70 C 26 70 18 68 12 66 Z"],
  ];
  const variants = [
    ["", ""],
    [", fine line", "stroke"],
  ];
  const names = ["Dove", "Swallow", "Crane", "Sparrow", "Heron"];
  const assets = [];
  birds.forEach(([name, d], index) => {
    variants.forEach(([suffix], variantIndex) => {
      const path = variantIndex
        ? mapPath(d, (x, y) => [50 + (x - 50) * 0.94, 50 + (y - 50) * 0.94])
        : d;
      assets.push({
        subcategory: "Birds",
        name: `${names[index]}${suffix}`,
        tags: ["bird", "animal", "nature", "line art", "wedding"],
        ink: variantIndex ? "stroke" : "fill",
        strokeWidth: 1.3,
        aspect: 1.4,
        d: path,
      });
    });
  });
  return assets;
}

function naturalOrnaments() {
  const wreath = (radius, leaves) =>
    join(
      circle(50, 50, radius),
      ...Array.from({ length: leaves }, (_, i) => {
        const angle = (i / leaves) * 360;
        const x = 50 + Math.cos((angle * Math.PI) / 180) * radius;
        const y = 50 + Math.sin((angle * Math.PI) / 180) * radius;
        return leaf(x, y, 12, 4, angle + 30);
      }),
    );
  const defs = [
    ["Laurel wreath", wreath(38, 22)],
    ["Olive wreath", wreath(40, 18)],
    ["Eucalyptus wreath", wreath(36, 14)],
    ["Blossom wreath", join(wreath(38, 16), flower(50, 12, 8, 5, 3), flower(82, 72, 7, 5, 2))],
    ["Botanical garland", join(line(4, 60, 96, 60), ...Array.from({ length: 9 }, (_, i) => leaf(10 + i * 10, 60, 12, 4, i % 2 ? 60 : 120)))],
    ["Leaf divider", join(line(4, 50, 34, 50), line(66, 50, 96, 50), leaf(44, 50, 14, 5, 200), leaf(56, 50, 14, 5, -20), circle(50, 50, 3))],
    ["Fern spray", join(line(50, 92, 50, 20), ...Array.from({ length: 8 }, (_, i) => join(leaf(50, 30 + i * 7, 18 - i, 3, 200), leaf(50, 30 + i * 7, 18 - i, 3, 340))))],
    ["Olive wreath, fine", wreath(42, 28)],
    ["Hop garland", join(arc(50, 40, 40, 20, 180, 360), ...Array.from({ length: 7 }, (_, i) => circle(20 + i * 10, 62 + (i % 2 ? 4 : 0), 4)))],
    ["Botanical crest", join(leaf(32, 78, 40, 10, -70), leaf(68, 78, 40, 10, -110), circle(50, 46, 8), arc(50, 52, 28, 22, 200, 340))],
  ];
  return defs.map(([name, d], index) => ({
    subcategory: "Natural ornaments",
    name,
    tags: ["ornament", "botanical", "wreath", "garland", "invitation"],
    ink: index === 0 || index === 1 || index === 2 || index === 7 ? "fill" : "stroke",
    strokeWidth: 1.2,
    aspect: name.includes("Garland") ? 2.4 : 1,
    d,
  }));
}

export function botanicalAssets() {
  return [
    ...flowers(),
    ...roses(),
    ...leaves(),
    ...branches(),
    ...botanicalIllustrations(),
    ...floralCorners(),
    ...butterflies(),
    ...birds(),
    ...naturalOrnaments(),
  ];
}
