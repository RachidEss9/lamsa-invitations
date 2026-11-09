import {
  circle,
  ellipse,
  line,
  petal,
  rect,
  roundedRect,
  star,
  sweep,
} from "../paths.mjs";

const join = (...parts) => parts.flat(Infinity).filter(Boolean).join(" ");

function garments() {
  const dress = (neck, waist, hem, sleeves = true) =>
    join(
      neck,
      waist,
      hem,
      sleeves ? "M 36 26 C 26 28 20 38 22 50 C 24 54 30 54 32 48" : "",
      sleeves ? "M 64 26 C 74 28 80 38 78 50 C 76 54 70 54 68 48" : "",
    );
  const defs = [
    ["A-line dress", dress(
      "M 40 20 L 44 28 L 50 32 L 56 28 L 60 20 L 54 16 L 50 22 L 46 16 Z",
      "M 44 34 C 40 46 38 58 38 70 L 62 70 C 62 58 60 46 56 34 Z",
      "M 38 70 L 30 92 L 70 92 L 62 70 Z",
    )],
    ["Ball gown", dress(
      "M 42 18 C 36 24 38 32 44 34 L 56 34 C 62 32 64 24 58 18 C 54 14 46 14 42 18 Z",
      "M 44 36 C 42 48 42 54 46 60 L 54 60 C 58 54 58 48 56 36 Z",
      "M 46 60 C 28 64 14 78 10 92 L 90 92 C 86 78 72 64 54 60 Z",
    )],
    ["Slip dress", join(
      "M 38 18 L 42 26 L 58 26 L 62 18",
      "M 42 26 L 36 48 L 38 92 L 62 92 L 64 48 L 58 26",
      "M 46 26 L 46 16 M 54 26 L 54 16",
      line(38, 66, 62, 66),
    )],
    ["Tailored blazer", join(
      "M 36 20 L 28 24 L 20 48 L 26 52 L 32 40 L 32 88 L 48 88 L 50 34 L 52 88 L 68 88 L 68 40 L 74 52 L 80 48 L 72 24 L 64 20 L 50 40 Z",
      "M 42 20 L 50 40 L 58 20",
      "M 32 60 L 44 60",
      "M 56 60 L 68 60",
      circle(50, 54, 1.6),
      circle(50, 66, 1.6),
    )],
    ["Trench coat", join(
      "M 34 18 L 24 26 L 18 66 L 26 70 L 32 52 L 32 92 L 68 92 L 68 52 L 74 70 L 82 66 L 76 26 L 66 18 L 50 34 Z",
      "M 38 18 L 50 34 L 62 18",
      "M 32 46 L 68 46",
      line(32, 60, 68, 60),
      line(50, 46, 50, 92),
      "M 68 46 L 78 46 L 80 54 L 70 54 Z",
      circle(50, 52, 1.8),
      circle(50, 68, 1.8),
    )],
    ["Button-down shirt", join(
      "M 38 18 L 28 22 L 18 44 L 26 48 L 32 36 L 32 92 L 68 92 L 68 36 L 74 48 L 82 44 L 72 22 L 62 18 L 50 30 Z",
      "M 42 18 L 50 30 L 58 18",
      line(50, 30, 50, 92),
      ...Array.from({ length: 4 }, (_, index) => circle(50, 44 + index * 12, 1.6)),
      "M 32 62 L 42 62 L 42 70 L 32 70 Z",
    )],
    ["Tailored trousers", join(
      "M 32 14 L 68 14 L 68 26 L 60 92 L 52 92 L 50 48 L 48 92 L 40 92 L 32 26 Z",
      line(32, 22, 68, 22),
      line(36, 30, 44, 30),
      line(56, 30, 64, 30),
      line(42, 82, 46, 82),
      line(54, 82, 58, 82),
    )],
    ["Midi skirt", join(
      "M 34 22 L 66 22 L 76 82 L 24 82 Z",
      line(34, 30, 66, 30),
      ...Array.from({ length: 6 }, (_, index) => line(34 + index * 6.4, 22, 30 + index * 8, 82)),
      line(24, 82, 76, 82),
    )],
    ["Jumpsuit", join(
      "M 38 16 L 28 22 L 20 44 L 28 48 L 32 38 L 32 92 L 46 92 L 50 54 L 54 92 L 68 92 L 68 38 L 72 48 L 80 44 L 72 22 L 62 16 L 50 28 Z",
      "M 42 16 L 50 28 L 58 16",
      line(32, 50, 68, 50),
      line(46, 62, 54, 62),
    )],
    ["Corset", join(
      "M 30 20 L 70 20 L 66 36 L 72 52 L 64 78 L 50 90 L 36 78 L 28 52 L 34 36 Z",
      ...Array.from({ length: 5 }, (_, index) => line(34 + index * 8, 28, 38 + index * 7, 78)),
      line(32, 40, 68, 40),
      line(30, 56, 70, 56),
      ...Array.from({ length: 3 }, (_, index) => circle(50, 46 + index * 10, 1.4)),
    )],
    ["Kaftan", join(
      "M 36 18 L 22 34 L 14 62 L 24 66 L 32 48 L 32 92 L 68 92 L 68 48 L 76 66 L 86 62 L 78 34 L 64 18 L 50 30 Z",
      "M 40 18 L 50 30 L 60 18",
      line(38, 54, 62, 54),
      ...Array.from({ length: 3 }, (_, index) => star(50, 62 + index * 8, 2.4, 1, 4)),
    )],
    ["One-piece swimsuit", join(
      "M 36 20 C 30 30 30 40 38 46 C 34 60 32 76 36 88 L 50 92 L 64 88 C 68 76 66 60 62 46 C 70 40 70 30 64 20 C 58 30 54 36 50 38 C 46 36 42 30 36 20 Z",
      line(38, 46, 62, 46),
      star(50, 64, 5, 2, 4),
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Garments",
    tags: ["fashion", "clothing", "garment", "apparel", "editorial", "wardrobe"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 0.75,
  }));
}

function accessories() {
  const defs = [
    ["Structured handbag", join(
      roundedRect(18, 40, 64, 44, 4),
      "M 34 40 C 34 24 66 24 66 40",
      line(18, 54, 82, 54),
      roundedRect(56, 56, 14, 10, 2),
      circle(26, 48, 1.6),
      circle(74, 48, 1.6),
    )],
    ["Evening clutch", join(
      "M 14 44 C 30 36 70 36 86 44 L 82 70 C 60 76 40 76 18 70 Z",
      "M 14 44 L 24 34 L 76 34 L 86 44",
      line(24, 44, 76, 44),
      star(50, 56, 6, 2.4, 4),
    )],
    ["Top-handle bag", join(
      roundedRect(24, 44, 52, 38, 8),
      "M 38 44 C 38 28 62 28 62 44",
      "M 44 28 C 44 22 56 22 56 28",
      line(24, 56, 76, 56),
      circle(50, 56, 3),
    )],
    ["Stiletto pump", join(
      "M 16 66 C 28 50 42 42 54 48 C 66 54 72 66 84 72 L 84 80 L 18 80 C 14 76 14 70 16 66 Z",
      "M 24 80 L 22 94 L 28 94 L 34 80",
      "M 54 48 L 60 40 L 66 42 L 62 50",
      line(30, 70, 70, 74),
    )],
    ["Ankle boot", join(
      "M 30 20 L 62 20 L 64 54 C 74 60 78 70 84 78 L 84 86 L 22 86 C 20 70 24 54 30 54 Z",
      line(30, 30, 62, 30),
      line(32, 44, 62, 44),
      line(34, 62, 66, 66),
      line(22, 86, 84, 86),
      rect(66, 70, 12, 4, 1),
    )],
    ["Sneaker", join(
      "M 12 66 C 24 60 34 46 48 44 C 58 42 64 50 74 56 C 82 60 88 62 90 70 L 90 78 L 14 78 C 10 74 10 70 12 66 Z",
      line(14, 70, 90, 70),
      ...Array.from({ length: 5 }, (_, index) => line(44 + index * 7, 52 + index * 2, 52 + index * 7, 50 + index * 2)),
      "M 14 78 L 14 86 L 86 86 L 90 78",
    )],
    ["Silk scarf", join(
      "M 12 24 C 32 14 52 30 72 20 C 80 16 86 20 88 28 C 70 40 52 26 34 38 C 22 46 12 40 12 24 Z",
      ...Array.from({ length: 5 }, (_, index) => line(24 + index * 10, 24 + (index % 2) * 4, 34 + index * 10, 34 + (index % 2) * 2)),
      "M 20 36 C 26 50 24 62 18 72 M 76 28 C 80 40 78 52 72 62",
    )],
    ["Wide-brim hat", join(
      ellipse(50, 62, 42, 14),
      "M 32 58 C 30 34 38 22 50 22 C 62 22 70 34 68 58",
      ellipse(50, 58, 18, 6),
      line(34, 54, 66, 54),
      ...Array.from({ length: 3 }, (_, index) => circle(50, 44 + index * 5, 1.2)),
    )],
    ["Evening gloves", join(
      "M 30 20 L 38 20 L 38 52 L 44 52 L 44 20 L 52 20 L 52 52 L 58 52 L 58 22 L 66 22 L 66 58 C 66 74 58 86 48 92 C 38 86 30 74 30 58 Z",
      ...Array.from({ length: 4 }, (_, index) => line(30, 60 + index * 7, 36, 60 + index * 7)),
    )],
    ["Leather belt", join(
      roundedRect(6, 40, 74, 20, 4),
      roundedRect(72, 34, 22, 32, 4),
      rect(78, 42, 10, 16, 2),
      ...Array.from({ length: 5 }, (_, index) => circle(16 + index * 11, 50, 1.8)),
      line(82, 50, 86, 50),
    )],
    ["Pendant necklace", join(
      sweep(50, 32, 34, 30, 20, 160),
      line(79, 42, 82, 30),
      line(21, 42, 18, 30),
      circle(50, 68, 6),
      "M 50 60 L 50 62",
      star(50, 68, 4, 1.6, 4),
    )],
    ["Drop earrings", join(
      circle(34, 24, 4),
      "M 34 28 L 34 40",
      petal(34, 42, 22, 8, 90),
      circle(66, 24, 4),
      "M 66 28 L 66 40",
      petal(66, 42, 22, 8, 90),
      circle(34, 62, 2),
      circle(66, 62, 2),
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Accessories",
    tags: ["fashion", "accessory", "bag", "shoe", "jewellery", "editorial"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 1,
  }));
}

function beauty() {
  const defs = [
    ["Lipstick tube", join(
      rect(38, 58, 24, 34, 3),
      rect(38, 50, 24, 8),
      "M 42 50 L 42 30 C 42 24 48 18 54 16 L 58 26 C 58 38 50 44 50 50 Z",
      line(38, 66, 62, 66),
      star(50, 76, 3, 1.2, 4),
    )],
    ["Perfume atomizer", join(
      ellipse(50, 56, 24, 26),
      rect(42, 26, 16, 10),
      roundedRect(38, 14, 24, 12, 3),
      circle(50, 12, 4),
      line(38, 44, 62, 44),
      star(50, 56, 6, 2.4, 6),
      line(32, 70, 68, 70),
    )],
    ["Compact mirror", join(
      circle(50, 50, 34),
      circle(50, 50, 28),
      line(50, 22, 50, 78),
      star(36, 42, 3.4, 1.4, 4),
      circle(64, 58, 3),
    )],
    ["Powder brush", join(
      line(50, 8, 50, 34),
      "M 38 34 L 62 34 L 66 52 C 62 62 38 62 34 52 Z",
      ...Array.from({ length: 9 }, (_, index) => line(36 + index * 3.4, 52, 34 + index * 4, 66)),
      rect(46, 6, 8, 8, 2),
    )],
    ["Nail polish", join(
      rect(36, 38, 28, 48, 4),
      rect(40, 28, 20, 10),
      rect(44, 12, 12, 16, 2),
      line(36, 54, 64, 54),
      star(50, 68, 5, 2, 4),
    )],
    ["Mascara wand", join(
      rect(38, 48, 24, 42, 3),
      rect(42, 38, 16, 10),
      line(50, 38, 50, 10),
      ...Array.from({ length: 7 }, (_, index) => line(44 + index * 2, 12 + index * 2.4, 56 - index * 2, 12 + index * 2.4)),
      ellipse(50, 30, 8, 12),
    )],
    ["Eyeshadow palette", join(
      roundedRect(10, 28, 80, 48, 3),
      line(10, 38, 90, 38),
      ...Array.from({ length: 4 }, (_, index) => circle(24 + index * 17, 56, 7)),
      ...Array.from({ length: 4 }, (_, index) => circle(24 + index * 17, 56, 3)),
      circle(50, 33, 2),
    )],
    ["Hand mirror", join(
      ellipse(50, 42, 26, 30),
      ellipse(50, 42, 20, 24),
      line(50, 72, 50, 82),
      rect(44, 82, 12, 14, 3),
      ...Array.from({ length: 4 }, (_, index) => line(38 + index * 8, 22, 34 + index * 10, 34)),
    )],
    ["Comb", join(
      "M 14 26 L 86 26 L 86 40 C 80 46 20 46 14 40 Z",
      ...Array.from({ length: 12 }, (_, index) => line(18 + index * 5.6, 40, 18 + index * 5.6, 62)),
      line(22, 32, 78, 32),
    )],
    ["Hair dryer", join(
      "M 30 28 C 30 18 56 18 60 30 L 62 46 C 64 58 56 66 44 64 L 30 60 Z",
      "M 30 60 L 14 74 L 22 84 L 38 70",
      roundedRect(58, 44, 22, 12, 4),
      ...Array.from({ length: 3 }, (_, index) => line(78 + index * 4, 46 + index * 2, 88 + index * 4, 42 + index * 2)),
      circle(34, 36, 4),
    )],
    ["Hair straightener", join(
      "M 30 10 L 44 10 L 54 60 C 56 70 50 78 42 76 L 34 72 Z",
      "M 44 10 L 58 14 L 64 62 C 66 72 60 78 54 76",
      line(34, 28, 48, 32),
      line(38, 48, 52, 52),
      "M 62 76 L 86 92 L 90 86 L 68 70",
    )],
    ["Safety razor", join(
      "M 44 12 L 56 12 L 54 54 L 46 54 Z",
      "M 46 54 L 54 54 L 54 62 L 46 62 Z",
      "M 34 62 L 66 62 L 66 74 L 34 74 Z",
      ...Array.from({ length: 5 }, (_, index) => line(38 + index * 6, 64, 38 + index * 6, 72)),
      line(50, 74, 50, 90),
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Beauty",
    tags: ["beauty", "cosmetic", "makeup", "salon", "fashion", "product"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 0.7,
  }));
}

function atelier() {
  const defs = [
    ["Dress form", join(
      "M 50 10 C 62 10 66 22 62 34 C 58 44 62 52 62 60 C 62 70 56 76 50 80 C 44 76 38 70 38 60 C 38 52 42 44 38 34 C 34 22 38 10 50 10 Z",
      line(50, 80, 50, 92),
      line(38, 92, 62, 92),
      line(50, 60, 50, 92),
      "M 42 34 C 46 40 54 40 58 34",
      star(50, 46, 3.4, 1.4, 4),
    )],
    ["Sewing machine", join(
      roundedRect(16, 44, 68, 26, 4),
      "M 24 44 L 24 26 C 24 18 54 18 58 28 L 58 44",
      "M 56 28 L 64 28 L 64 44",
      line(64, 44, 64, 54),
      line(64, 54, 72, 54),
      circle(32, 58, 7),
      line(54, 38, 64, 38),
      "M 72 70 L 88 70 L 84 78 L 76 78 Z",
    )],
    ["Thread spool", join(
      rect(34, 26, 32, 48),
      ellipse(50, 26, 16, 5),
      ellipse(50, 74, 16, 5),
      ...Array.from({ length: 4 }, (_, index) => line(34, 36 + index * 10, 66, 32 + index * 10)),
      "M 66 40 C 80 36 88 46 82 54 C 76 60 68 56 70 48",
    )],
    ["Four-hole button", join(
      circle(50, 50, 32),
      circle(50, 50, 27),
      circle(42, 42, 4),
      circle(58, 42, 4),
      circle(42, 58, 4),
      circle(58, 58, 4),
      line(42, 42, 58, 58),
      line(58, 42, 42, 58),
    )],
    ["Zipper", join(
      line(14, 20, 14, 80),
      line(24, 20, 24, 80),
      ...Array.from({ length: 10 }, (_, index) => line(14, 24 + index * 5.6, 24, 24 + index * 5.6)),
      roundedRect(10, 44, 18, 10, 2),
      "M 10 54 L 8 64 L 24 64 L 24 54",
      line(50, 20, 50, 80),
    )],
    ["Coat hanger", join(
      "M 50 20 C 44 14 52 8 58 14 C 62 20 56 26 52 30",
      line(50, 30, 16, 64),
      line(50, 30, 84, 64),
      line(16, 64, 84, 64),
      line(16, 64, 16, 72),
      line(84, 64, 84, 72),
      "M 34 64 L 34 76 L 66 76 L 66 64",
    )],
    ["Pattern piece", join(
      "M 26 10 L 70 10 L 82 34 L 74 62 L 82 88 L 44 92 L 34 66 L 18 74 L 20 36 Z",
      ...Array.from({ length: 6 }, (_, index) => line(30, 26 + index * 8, 54, 26 + index * 8)),
      line(58, 20, 76, 20),
      line(58, 28, 72, 28),
      "M 20 36 L 12 30 M 20 36 L 10 42",
      circle(40, 70, 2),
      circle(48, 72, 2),
    )],
    ["Pincushion", join(
      "M 20 58 C 20 38 80 38 80 58 C 80 74 62 84 50 84 C 38 84 20 74 20 58 Z",
      line(30, 56, 42, 48),
      line(56, 46, 68, 54),
      line(44, 62, 54, 70),
      ...Array.from({ length: 5 }, (_, index) => line(28 + index * 9, 44 + (index % 2) * 8, 34 + index * 9, 36 + (index % 2) * 6)),
      circle(36, 54, 1.4),
    )],
    ["Dressmaking scissors", join(
      "M 18 20 L 46 50 L 38 58 L 10 30 Z",
      "M 18 80 L 46 50 L 38 42 L 10 70 Z",
      circle(52, 44, 8),
      circle(52, 60, 8),
      line(44, 50, 62, 50),
      line(46, 32, 54, 36),
    )],
    ["Measuring tape", join(
      "M 18 66 C 10 54 18 42 32 40 L 70 34 C 82 32 88 40 86 50 C 84 60 74 64 64 62 L 34 58 C 26 56 22 62 26 68",
      ...Array.from({ length: 9 }, (_, index) => line(30 + index * 6, 40 + index * 0.2, 30 + index * 6, 46)),
      line(30, 52, 78, 46),
    )],
    ["Fabric bolt", join(
      "M 18 26 L 74 26 C 82 26 86 32 86 40 L 86 78 L 30 78 C 22 78 18 72 18 64 Z",
      ellipse(74, 34, 8, 8),
      ellipse(74, 70, 8, 8),
      line(18, 40, 74, 40),
      line(18, 48, 74, 48),
      ...Array.from({ length: 5 }, (_, index) => line(30 + index * 8, 48, 26 + index * 8, 78)),
    )],
    ["Thimble", join(
      "M 32 78 L 32 42 C 32 26 68 26 68 42 L 68 78 Z",
      ...Array.from({ length: 3 }, (_, row) =>
        Array.from({ length: 4 }, (_, col) => circle(38 + col * 8, 36 + row * 8, 1.6)).join(" "),
      ),
      line(28, 78, 72, 78),
      line(28, 84, 72, 84),
      line(32, 78, 28, 84),
      line(68, 78, 72, 84),
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Atelier",
    tags: ["fashion", "atelier", "sewing", "tailoring", "craft", "tool"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 1,
  }));
}

function editorial() {
  const defs = [
    ["Lookbook frame", join(
      rect(8, 8, 84, 84),
      rect(16, 16, 52, 52),
      line(16, 76, 84, 76),
      line(16, 84, 60, 84),
      star(78, 84, 4, 1.6, 4),
    )],
    ["Runway marker", join(
      "M 30 12 L 70 12 L 64 46 L 70 88 L 52 88 L 50 56 L 48 88 L 30 88 L 36 46 Z",
      line(36, 30, 64, 30),
      ...Array.from({ length: 7 }, (_, index) => circle(50, 46 + index * 6, 1.6)),
    )],
    ["Clothing rail", join(
      line(10, 30, 90, 30),
      line(16, 30, 16, 88),
      line(84, 30, 84, 88),
      line(10, 88, 90, 88),
      ...Array.from({ length: 4 }, (_, index) => {
        const x = 26 + index * 16;
        return join(line(x, 30, x, 38), "M 16 38 L 36 38 L 36 62 L 16 62 Z");
      }),
      "M 24 70 L 26 70 M 40 70 L 42 70",
    )],
    ["Boutique sign", join(
      rect(14, 18, 72, 46),
      line(14, 30, 86, 30),
      line(24, 42, 62, 42),
      line(24, 52, 72, 52),
      line(26, 64, 26, 92),
      line(74, 64, 74, 92),
      star(78, 24, 4, 1.6, 4),
    )],
    ["Garment tag", join(
      "M 24 12 L 64 12 L 84 38 L 64 64 L 24 64 Z",
      circle(32, 22, 3),
      line(40, 30, 70, 30),
      line(40, 40, 64, 40),
      line(40, 50, 56, 50),
      line(54, 64, 54, 90),
    )],
    ["Size marker", join(
      "M 8 34 L 92 34 L 92 66 L 8 66 Z",
      line(20, 34, 20, 66),
      line(32, 34, 32, 66),
      line(56, 34, 56, 66),
      line(68, 34, 68, 66),
      "M 22 46 L 26 40 L 30 46 L 30 58 M 22 58 L 30 58",
      "M 60 42 L 64 40 L 66 46 L 62 50 L 66 52 L 66 58 L 60 58",
    )],
    ["Colour swatch fan", join(
      ...Array.from({ length: 6 }, (_, index) => {
        const x = 30 + index * 5;
        return `M ${x} 90 L ${x + 8} 90 L ${x + 8} 40 L ${x} 34 Z`;
      }),
      ...Array.from({ length: 6 }, (_, index) => line(32 + index * 5, 42 + index * 0.6, 36 + index * 5, 42 + index * 0.6)),
      line(28, 90, 66, 90),
      circle(47, 88, 2),
    )],
    ["Embroidery hoop", join(
      circle(50, 50, 36),
      circle(50, 50, 31),
      circle(50, 50, 8),
      ...Array.from({ length: 8 }, (_, index) => {
        const angle = (index * 45 * Math.PI) / 180;
        return petal(50 + Math.cos(angle) * 12, 50 + Math.sin(angle) * 12, 14, 5, (angle * 180) / Math.PI);
      }),
      "M 50 14 L 50 8 L 60 6",
    )],
    ["Lace trim", join(
      line(6, 30, 94, 30),
      line(6, 46, 94, 46),
      ...Array.from({ length: 9 }, (_, index) => sweep(11 + index * 10, 46, 5, 10, 0, 180)),
      ...Array.from({ length: 9 }, (_, index) => circle(11 + index * 10, 36, 2.4)),
      line(6, 60, 94, 60),
      line(6, 70, 94, 70),
    )],
    ["Feather quill", join(
      line(18, 92, 74, 12),
      "M 74 12 C 56 16 44 30 40 46 C 50 44 62 34 74 12 Z",
      ...Array.from({ length: 7 }, (_, index) => {
        const t = index / 8;
        return line(40 + t * 30, 46 - t * 30, 34 + t * 30, 38 - t * 30);
      }),
      line(24, 80, 34, 72),
    )],
    ["Shoe last", join(
      "M 20 74 C 22 52 34 40 48 38 C 62 36 66 48 74 54 C 82 60 88 64 88 72 C 88 80 78 84 64 84 L 26 84 C 20 84 18 80 20 74 Z",
      "M 34 38 C 34 30 48 26 54 32",
      line(26, 58, 56, 58),
      line(30, 66, 64, 66),
      circle(70, 76, 2),
    )],
    ["Fashion plate frame", join(
      roundedRect(12, 8, 76, 84, 3),
      roundedRect(20, 16, 60, 62, 2),
      "M 34 62 C 34 44 44 32 50 34 C 56 32 66 44 66 62 Z",
      circle(50, 26, 5),
      line(20, 84, 80, 84),
      line(36, 88, 64, 88),
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Fashion editorial",
    tags: ["fashion", "editorial", "lookbook", "runway", "boutique", "layout"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 1,
  }));
}

export function fashionAssets() {
  return [...garments(), ...accessories(), ...beauty(), ...atelier(), ...editorial()];
}
