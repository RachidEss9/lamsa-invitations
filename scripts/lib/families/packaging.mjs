import {
  circle,
  ellipse,
  leaf,
  line,
  petal,
  polygon,
  rect,
  roundedRect,
  star,
  sweep,
} from "../paths.mjs";

const join = (...parts) => parts.flat(Infinity).filter(Boolean).join(" ");

const dashes = (x1, y1, x2, y2, count) =>
  Array.from({ length: count }, (_, index) => {
    const t0 = index / count;
    const t1 = t0 + 0.6 / count;
    return line(
      x1 + (x2 - x1) * t0,
      y1 + (y2 - y1) * t0,
      x1 + (x2 - x1) * t1,
      y1 + (y2 - y1) * t1,
    );
  });

function boxes() {
  const defs = [
    ["Tuck-end box net", join(
      rect(26, 34, 48, 34),
      rect(26, 14, 48, 20),
      rect(26, 68, 48, 18),
      polygon(26, 34, 12, 17, 4, 0),
      polygon(74, 34, 12, 17, 4, 0),
      line(26, 34, 26, 86),
      line(74, 34, 74, 86),
      ...dashes(26, 34, 74, 68, 8),
    )],
    ["Mailer box net", join(
      rect(18, 32, 64, 38),
      rect(18, 16, 64, 16),
      rect(18, 70, 64, 14),
      rect(8, 32, 10, 38),
      rect(82, 32, 10, 38),
      line(44, 16, 56, 16),
      line(18, 32, 82, 70),
      line(82, 32, 18, 70),
    )],
    ["Pillow box net", join(
      rect(18, 36, 64, 30),
      "M 18 36 C 8 36 6 48 12 51 C 6 54 8 66 18 66",
      "M 82 36 C 92 36 94 48 88 51 C 94 54 92 66 82 66",
      line(18, 51, 82, 51),
      line(28, 36, 28, 66),
      line(72, 36, 72, 66),
    )],
    ["Gable box net", join(
      rect(18, 38, 64, 44),
      "M 18 38 L 18 24 L 50 10 L 82 24 L 82 38",
      roundedRect(38, 5, 24, 10, 3),
      line(18, 52, 82, 52),
      polygon(18, 82, 8, 10, 3, 180),
      polygon(82, 82, 8, 10, 3, 180),
    )],
    ["Drawer box", join(
      roundedRect(12, 30, 76, 46, 2),
      roundedRect(20, 40, 60, 30, 1),
      roundedRect(30, 16, 40, 14, 2),
      line(30, 30, 30, 40),
      line(70, 30, 70, 40),
      circle(50, 55, 4),
      line(42, 55, 58, 55),
    )],
    ["Hexagon box net", join(
      polygon(50, 50, 28, 28, 6),
      polygon(50, 50, 24, 24, 6, -60),
      polygon(50, 24, 12, 12, 6, -60),
      polygon(50, 76, 12, 12, 6, -60),
      line(30, 40, 70, 60),
      line(70, 40, 30, 60),
    )],
    ["Cake box", join(
      rect(14, 28, 72, 58),
      rect(24, 16, 52, 12),
      roundedRect(32, 36, 36, 24, 2),
      line(14, 72, 86, 72),
      line(32, 48, 68, 48),
      line(50, 16, 50, 10),
    )],
    ["Pizza box", join(
      rect(10, 18, 80, 68),
      line(10, 28, 90, 28),
      line(50, 28, 50, 86),
      ...Array.from({ length: 4 }, (_, index) => circle(30 + index * 13, 46, 2)),
      line(18, 36, 42, 36),
      line(58, 36, 82, 36),
    )],
    ["Matchbox", join(
      roundedRect(18, 34, 64, 38, 2),
      rect(24, 24, 52, 12),
      line(24, 30, 76, 30),
      line(24, 38, 76, 38),
      ...Array.from({ length: 5 }, (_, index) => line(28 + index * 11, 24, 28 + index * 11, 36)),
      star(50, 53, 7, 2.8, 4),
    )],
    ["Tube box", join(
      rect(32, 22, 36, 62),
      ellipse(50, 22, 18, 5),
      ellipse(50, 84, 18, 5),
      line(32, 34, 68, 34),
      line(32, 72, 68, 72),
      circle(50, 53, 8),
    )],
    ["Bottle box", join(
      "M 30 92 L 30 40 L 42 40 L 42 20 L 58 20 L 58 40 L 70 40 L 70 92 Z",
      line(30, 52, 70, 52),
      line(30, 66, 70, 66),
      line(42, 20, 58, 20),
      rect(38, 72, 24, 14),
      star(50, 79, 4, 1.6, 4),
    )],
    ["Display box", join(
      rect(12, 22, 76, 64),
      roundedRect(22, 32, 56, 34, 2),
      line(12, 76, 88, 76),
      line(22, 76, 22, 86),
      line(78, 76, 78, 86),
      line(12, 86, 22, 86),
      line(78, 86, 88, 86),
      star(50, 49, 8, 3.2, 6),
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Boxes & dielines",
    tags: ["packaging", "box", "dieline", "net", "print", "product"],
    ink: "stroke",
    strokeWidth: 1.3,
    aspect: 1,
  }));
}

function bags() {
  const bow = join(
    "M 50 52 C 38 40 18 42 20 56 C 22 68 40 66 50 58",
    "M 50 52 C 62 40 82 42 80 56 C 78 68 60 66 50 58",
    "M 50 58 C 44 72 40 82 34 92",
    "M 50 58 C 56 72 60 82 66 92",
    circle(50, 54, 5),
  );
  const defs = [
    ["Tote bag", join(
      "M 16 34 L 84 34 L 78 90 L 22 90 Z",
      "M 32 34 C 32 16 68 16 68 34",
      "M 34 34 C 34 24 66 24 66 34",
      line(16, 46, 84, 46),
    )],
    ["Kraft paper bag", join(
      "M 20 30 L 80 30 L 76 90 L 24 90 Z",
      "M 26 30 L 22 20 L 78 20 L 74 30",
      line(20, 42, 80, 42),
      line(24, 30, 24, 90),
      line(76, 30, 76, 90),
      star(50, 60, 7, 2.8, 6),
    )],
    ["Wine gift bag", join(
      "M 26 32 L 74 32 L 72 92 L 28 92 Z",
      "M 32 32 C 32 20 68 20 68 32",
      line(26, 44, 74, 44),
      line(36, 54, 64, 54),
      rect(40, 62, 20, 16),
      line(44, 70, 56, 70),
    )],
    ["Gift wrap sheet", join(
      rect(6, 12, 88, 76),
      ...Array.from({ length: 5 }, (_, row) =>
        Array.from({ length: 4 }, (_, col) => star(18 + col * 22 + (row % 2) * 11, 24 + row * 16, 6, 2.6, 4)).join(" "),
      ),
    )],
    ["Tissue paper print", join(
      "M 8 14 L 92 10 L 88 86 L 12 92 Z",
      ...Array.from({ length: 7 }, (_, index) => petal(14 + index * 12, 30 + (index % 3) * 22, 12, 5, index * 47)),
      line(8, 14, 92, 10),
    )],
    ["Gift ribbon bow", bow],
    ["Paper rosette", join(
      ...Array.from({ length: 12 }, (_, index) => {
        const angle = (index * 30 * Math.PI) / 180;
        return join(
          `M 50 50 L ${50 + Math.cos(angle) * 34} ${50 + Math.sin(angle) * 34} L ${50 + Math.cos(angle + 0.3) * 24} ${50 + Math.sin(angle + 0.3) * 24} Z`,
        );
      }),
      circle(50, 50, 10),
    )],
    ["Confetti pouch", join(
      "M 22 38 L 78 38 L 72 88 L 28 88 Z",
      "M 22 38 L 28 26 L 72 26 L 78 38",
      ...Array.from({ length: 10 }, (_, index) => {
        const x = 30 + ((index * 17) % 40);
        const y = 48 + ((index * 13) % 32);
        return index % 2 ? circle(x, y, 2) : rect(x - 2, y - 2, 4, 4);
      }),
      line(32, 32, 68, 32),
    )],
    ["Envelope pouch", join(
      rect(10, 26, 80, 52),
      "M 10 26 L 50 58 L 90 26",
      "M 10 78 L 38 52",
      "M 90 78 L 62 52",
      circle(50, 70, 4),
    )],
    ["Jar wrap band", join(
      rect(6, 34, 88, 34),
      ...Array.from({ length: 8 }, (_, index) => line(10 + index * 11, 34, 16 + index * 11, 68)),
      line(6, 42, 94, 42),
      line(6, 60, 94, 60),
    )],
    ["Sleeve band", join(
      "M 28 8 L 72 8 L 82 34 L 82 66 L 72 92 L 28 92 L 18 66 L 18 34 Z",
      line(18, 34, 82, 34),
      line(18, 66, 82, 66),
      star(50, 50, 8, 3.2, 6),
    )],
    ["Paper fan decor", join(
      "M 50 88 L 16 44 C 30 28 70 28 84 44 Z",
      ...Array.from({ length: 9 }, (_, index) => line(50, 88, 16 + index * 8.5, 38)),
      sweep(50, 88, 40, 40, 194, 346),
      circle(50, 88, 2.4),
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Bags & wraps",
    tags: ["packaging", "bag", "wrap", "ribbon", "gift", "print"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 1,
  }));
}

function vessels() {
  const defs = [
    ["Cosmetic jar", join(
      roundedRect(26, 34, 48, 50, 8),
      roundedRect(22, 20, 56, 16, 4),
      line(28, 50, 72, 50),
      line(34, 58, 66, 58),
      star(50, 68, 4, 1.6, 5),
    )],
    ["Pump bottle", join(
      roundedRect(32, 34, 36, 54, 8),
      rect(44, 24, 12, 10),
      "M 56 24 L 70 24 L 70 30 L 58 30",
      line(44, 44, 56, 44),
      line(44, 52, 56, 52),
      line(44, 60, 52, 60),
    )],
    ["Dropper bottle", join(
      roundedRect(30, 38, 40, 48, 6),
      rect(42, 26, 16, 12),
      rect(38, 14, 24, 12, 2),
      "M 42 14 C 42 8 58 8 58 14",
      line(38, 50, 62, 50),
      circle(50, 62, 5),
    )],
    ["Wine bottle", join(
      "M 42 92 L 42 40 C 42 32 34 30 34 20 L 34 8 L 66 8 L 66 20 C 66 30 58 32 58 40 L 58 92 Z",
      line(34, 8, 66, 8),
      line(36, 26, 64, 26),
      roundedRect(30, 48, 40, 30, 2),
      line(36, 58, 64, 58),
      line(36, 68, 56, 68),
    )],
    ["Perfume flacon", join(
      "M 28 34 L 72 34 L 72 82 L 28 82 Z",
      roundedRect(36, 20, 28, 14, 3),
      rect(44, 8, 12, 12),
      line(28, 46, 72, 46),
      star(50, 60, 8, 3.4, 6),
      line(34, 74, 66, 74),
    )],
    ["Candle jar", join(
      roundedRect(24, 30, 52, 56, 8),
      roundedRect(20, 20, 60, 12, 4),
      ...Array.from({ length: 4 }, (_, index) => line(34 + index * 10, 44, 34 + index * 10, 54)),
      rect(46, 58, 8, 22),
      "M 50 58 C 46 52 50 46 50 44 C 50 46 54 52 50 58 Z",
    )],
    ["Tin can", join(
      ellipse(50, 22, 24, 6),
      ellipse(50, 82, 24, 6),
      line(26, 22, 26, 82),
      line(74, 22, 74, 82),
      ellipse(50, 22, 18, 4),
      ellipse(50, 82, 18, 4),
      roundedRect(30, 42, 40, 22, 2),
    )],
    ["Coffee bag", join(
      "M 26 26 L 74 26 L 74 92 L 26 92 Z",
      polygon(26, 26, 6, 6, 3, 0),
      polygon(74, 26, 6, 6, 3, 0),
      line(26, 32, 74, 32),
      line(26, 40, 74, 40),
      rect(34, 50, 32, 26),
      line(38, 60, 62, 60),
      line(38, 68, 56, 68),
    )],
    ["Tea tin", join(
      roundedRect(24, 24, 52, 62, 3),
      roundedRect(20, 16, 60, 10, 2),
      roundedRect(30, 38, 40, 34, 2),
      star(50, 48, 5, 2, 6),
      line(38, 60, 62, 60),
      line(38, 66, 58, 66),
    )],
    ["Soap wrap", join(
      ellipse(50, 50, 38, 24),
      ellipse(50, 50, 32, 18),
      line(18, 50, 82, 50),
      line(50, 32, 50, 68),
      ...Array.from({ length: 6 }, (_, index) => leaf(30 + index * 8, 38 + (index % 2) * 24, 10, 3, index % 2 ? 60 : 120)),
    )],
    ["Spice jar", join(
      roundedRect(30, 32, 40, 54, 4),
      rect(28, 20, 44, 12, 2),
      ...Array.from({ length: 5 }, (_, index) => circle(36 + index * 7, 26, 1.4)),
      rect(34, 44, 32, 30, 2),
      star(50, 56, 5, 2, 5),
    )],
    ["Squeeze tube", join(
      "M 34 24 L 66 24 L 66 84 C 66 90 34 90 34 84 Z",
      line(34, 24, 66, 24),
      ellipse(50, 24, 16, 4),
      rect(42, 14, 16, 10, 2),
      line(40, 36, 60, 36),
      line(40, 46, 60, 46),
      line(40, 72, 60, 72),
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Bottles & jars",
    tags: ["packaging", "bottle", "jar", "label", "product", "cosmetic"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 0.7,
  }));
}

function labels() {
  const defs = [
    ["Hang tag", join(
      "M 24 14 L 64 14 L 84 36 L 64 58 L 24 58 Z",
      circle(32, 24, 3),
      line(40, 32, 70, 32),
      line(40, 42, 64, 42),
    )],
    ["Jar wrap label", join(
      roundedRect(8, 30, 84, 40, 4),
      line(14, 40, 86, 40),
      line(14, 58, 86, 58),
      star(50, 50, 6, 2.4, 6),
    )],
    ["Bottle neck label", join(
      "M 26 18 C 34 28 66 28 74 18 L 74 62 C 64 70 36 70 26 62 Z",
      line(30, 34, 70, 34),
      line(30, 44, 70, 44),
      circle(50, 54, 3),
    )],
    ["Sleeve label", join(
      "M 10 34 L 90 26 L 90 74 L 10 66 Z",
      line(10, 44, 90, 36),
      line(10, 54, 90, 46),
      line(26, 34, 30, 66),
      line(70, 30, 74, 70),
    )],
    ["Round seal", join(
      circle(50, 50, 34),
      circle(50, 50, 26),
      star(50, 50, 12, 5, 8),
      line(50, 16, 50, 24),
      line(50, 76, 50, 84),
    )],
    ["Tamper band", join(
      roundedRect(26, 34, 48, 32, 2),
      ...Array.from({ length: 6 }, (_, index) => line(30 + index * 8, 34, 30 + index * 8, 66)),
      line(26, 42, 74, 42),
      line(26, 58, 74, 58),
    )],
    ["Batch label", join(
      rect(10, 36, 80, 28),
      line(16, 44, 46, 44),
      line(16, 54, 38, 54),
      line(52, 44, 84, 44),
      line(52, 54, 72, 54),
      ...Array.from({ length: 6 }, (_, index) => line(82 + index, 38, 82 + index, 62)),
    )],
    ["Ingredient panel", join(
      roundedRect(20, 10, 60, 80, 3),
      line(26, 22, 74, 22),
      ...Array.from({ length: 7 }, (_, index) => line(26, 32 + index * 7, index % 3 === 0 ? 66 : 74, 32 + index * 7)),
      rect(30, 80, 40, 4),
    )],
    ["Label frame", join(
      roundedRect(10, 26, 80, 48, 6),
      roundedRect(16, 32, 68, 36, 4),
      line(16, 50, 84, 50),
      circle(50, 41, 2.4),
      circle(50, 59, 2.4),
    )],
    ["Thank-you sticker", join(
      circle(50, 50, 36),
      circle(50, 50, 29),
      "M 50 66 C 42 59 34 64 38 71 C 41 76 50 80 50 80 C 50 80 59 76 62 71 C 66 64 58 59 50 66 Z",
      line(32, 40, 68, 40),
    )],
    ["Shipping label", join(
      rect(8, 24, 84, 52),
      line(8, 34, 92, 34),
      line(34, 34, 34, 76),
      line(44, 42, 84, 42),
      line(44, 50, 80, 50),
      line(44, 58, 70, 58),
      ...Array.from({ length: 10 }, (_, index) => line(66 + index * 2, 66, 66 + index * 2, 72)),
    )],
    ["Certified seal", join(
      ...Array.from({ length: 20 }, (_, index) => {
        const angle = (index * 18 * Math.PI) / 180;
        return circle(50 + Math.cos(angle) * 34, 50 + Math.sin(angle) * 34, 5);
      }),
      circle(50, 50, 28),
      star(50, 50, 11, 4.4, 5),
      sweep(50, 50, 20, 20, 190, 350),
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Labels & seals",
    tags: ["packaging", "label", "seal", "sticker", "print", "product"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 1.3,
  }));
}

function gift() {
  const bow = join(
    "M 50 54 C 36 42 16 46 20 60 C 24 72 42 68 50 60",
    "M 50 54 C 64 42 84 46 80 60 C 76 72 58 68 50 60",
    circle(50, 56, 4.4),
    line(50, 60, 46, 92),
    line(50, 60, 54, 92),
  );
  const defs = [
    ["Gift box with bow", join(
      rect(16, 42, 68, 46),
      rect(12, 30, 76, 14),
      line(50, 44, 50, 88),
      line(12, 37, 88, 37),
      "M 50 30 C 38 18 24 24 32 34 C 38 40 46 34 50 30 Z",
      "M 50 30 C 62 18 76 24 68 34 C 62 40 54 34 50 30 Z",
    )],
    ["Stacked gift boxes", join(
      rect(22, 56, 56, 34),
      rect(30, 30, 40, 26),
      line(50, 30, 50, 56),
      line(50, 56, 50, 90),
      line(30, 43, 70, 43),
      line(22, 68, 78, 68),
      bow,
    )],
    ["Favour box", join(
      rect(30, 38, 40, 34),
      polygon(30, 38, 6, 8, 3, 0),
      polygon(70, 38, 6, 8, 3, 0),
      line(30, 50, 70, 50),
      line(50, 38, 50, 72),
      "M 50 38 C 42 30 34 34 40 40 M 50 38 C 58 30 66 34 60 40",
    )],
    ["Gift card holder", join(
      roundedRect(12, 26, 76, 54, 4),
      roundedRect(20, 34, 34, 22, 2),
      line(60, 40, 80, 40),
      line(60, 48, 76, 48),
      "M 20 70 L 40 56 L 60 70",
      star(70, 62, 6, 2.4, 5),
    )],
    ["Gift bow", join(
      "M 50 52 C 40 36 14 40 18 54 C 22 68 42 64 50 56",
      "M 50 52 C 60 36 86 40 82 54 C 78 68 58 64 50 56",
      "M 50 56 C 44 70 34 80 26 88",
      "M 50 56 C 56 70 66 80 74 88",
      "M 50 56 C 48 72 46 84 44 94",
      "M 50 56 C 52 72 54 84 56 94",
      circle(50, 54, 5),
      circle(50, 54, 2),
    )],
    ["Pom-pom", join(
      circle(50, 50, 30),
      ...Array.from({ length: 16 }, (_, index) => {
        const angle = (index * 22.5 * Math.PI) / 180;
        return line(50 + Math.cos(angle) * 26, 50 + Math.sin(angle) * 26, 50 + Math.cos(angle) * 38, 50 + Math.sin(angle) * 38);
      }),
      line(50, 80, 50, 94),
      line(46, 86, 54, 86),
    )],
    ["Tassel", join(
      circle(50, 18, 4),
      line(50, 22, 50, 38),
      roundedRect(40, 38, 20, 10, 3),
      ...Array.from({ length: 7 }, (_, index) => line(42 + index * 3, 48, 38 + index * 4, 90)),
      line(38, 52, 62, 52),
    )],
    ["Gift wrap band", join(
      rect(30, 6, 40, 88),
      ...Array.from({ length: 9 }, (_, index) => star(50, 14 + index * 9, 5, 2, 4)),
      line(30, 6, 30, 94),
      line(70, 6, 70, 94),
    )],
    ["Party cracker", join(
      roundedRect(10, 44, 26, 18, 4),
      roundedRect(64, 44, 26, 18, 4),
      "M 36 46 L 50 38 L 64 46 L 64 60 L 50 68 L 36 60 Z",
      line(26, 38, 36, 50),
      line(74, 38, 64, 50),
      star(50, 53, 6, 2.4, 6),
      "M 50 30 C 44 22 50 14 50 10 C 50 14 56 22 50 30 Z",
    )],
    ["Advent box", join(
      rect(10, 14, 80, 72),
      ...Array.from({ length: 6 }, (_, index) => line(10 + index * 13.3, 14, 10 + index * 13.3, 86)),
      ...Array.from({ length: 4 }, (_, index) => line(10, 14 + index * 18, 90, 14 + index * 18)),
      ...Array.from({ length: 12 }, (_, index) => star(18 + (index % 4) * 21, 24 + Math.floor(index / 4) * 20, 3, 1.2, 4)),
    )],
    ["Ribbon spool", join(
      rect(30, 30, 40, 46, 2),
      ellipse(50, 30, 20, 6),
      ellipse(50, 76, 20, 6),
      line(50, 36, 50, 70),
      line(30, 30, 30, 76),
      line(70, 30, 70, 76),
      "M 70 54 C 82 54 88 62 82 70 C 76 76 68 72 70 64",
    )],
    ["Paper cone", join(
      "M 28 14 L 72 14 L 54 90 L 46 90 Z",
      ellipse(50, 14, 22, 5),
      line(32, 26, 68, 26),
      star(50, 46, 9, 3.6, 6),
      ...Array.from({ length: 4 }, (_, index) => circle(44 + index * 4, 60, 1.3)),
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Gift decoration",
    tags: ["packaging", "gift", "bow", "ribbon", "celebration", "print"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 1,
  }));
}

export function packagingAssets() {
  return [...boxes(), ...bags(), ...vessels(), ...labels(), ...gift()];
}
