import {
  circle,
  ellipse,
  leaf,
  line,
  polygon,
  rect,
  roundedRect,
  star,
  sweep,
} from "../paths.mjs";

const join = (...parts) => parts.flat(Infinity).filter(Boolean).join(" ");

function rosette(radius, pleats, tails, centre) {
  const upper = Array.from({ length: pleats }, (_, index) => {
    const angle = ((200 + (index * 140) / (pleats - 1)) * Math.PI) / 180;
    return polygon(
      50 + Math.cos(angle) * radius * 0.55,
      50 + Math.sin(angle) * radius * 0.55,
      radius * 0.4,
      radius * 0.24,
      4,
      (angle * 180) / Math.PI,
    );
  }).join(" ");
  return join(
    circle(50, 50, radius),
    ...Array.from({ length: pleats }, (_, index) => {
      const angle = (index * 360) / pleats;
      const inner = radius * 0.72;
      return join(
        `M ${50 + Math.cos((angle * Math.PI) / 180) * radius} ${50 + Math.sin((angle * Math.PI) / 180) * radius}`,
        `L ${50 + Math.cos(((angle + 8) * Math.PI) / 180) * inner} ${50 + Math.sin(((angle + 8) * Math.PI) / 180) * inner}`,
      );
    }),
    upper,
    circle(50, 50, radius * 0.42),
    centre,
    ...tails,
  );
}

function prizeRibbons() {
  const tails = (length, spread = 12) => [
    `M 42 ${62} L ${50 - spread} 92 L ${50 - spread + 6} 84 L ${50 - spread + 12} 92 Z`,
    `M 58 ${62} L ${50 + spread} 92 L ${50 + spread - 6} 84 L ${50 + spread - 12} 92 Z`,
  ];
  const defs = [
    ["Award rosette", rosette(30, 22, tails(8), star(50, 50, 12, 5, 5))],
    ["Pleated rosette", rosette(32, 34, tails(8), circle(50, 50, 8))],
    ["Badge with tails", rosette(28, 18, tails(12), join(circle(50, 50, 10), star(50, 50, 6, 2.4, 5)))],
    ["Prize ribbon", join(
      "M 50 8 L 62 26 L 54 26 L 54 44 L 46 44 L 46 26 L 38 26 Z",
      circle(50, 54, 22),
      circle(50, 54, 16),
      star(50, 54, 11, 4.4, 5),
      ...tails(0, 18).map((d) => d.replace(/62/g, "72")),
    )],
    ["First-place rosette", rosette(31, 26, tails(10), join(
      circle(50, 50, 12),
      "M 50 38 L 50 30 M 50 62 L 50 70 M 38 50 L 30 50 M 62 50 L 70 50",
    ))],
    ["Medal ribbon", join(
      "M 36 8 L 50 30 L 42 38 L 28 16 Z",
      "M 64 8 L 50 30 L 58 38 L 72 16 Z",
      circle(50, 54, 22),
      circle(50, 54, 16),
      star(50, 54, 10, 4, 5),
    )],
    ["Cockade", join(
      circle(50, 46, 28),
      ...Array.from({ length: 12 }, (_, index) => {
        const angle = (index * 30 * Math.PI) / 180;
        return ellipse(50 + Math.cos(angle) * 26, 46 + Math.sin(angle) * 26, 8, 4);
      }),
      circle(50, 46, 12),
      ...tails(6, 14),
    )],
    ["Ribbon cluster", join(
      ...Array.from({ length: 5 }, (_, index) => {
        const angle = ((index * 72 - 90) * Math.PI) / 180;
        return `M ${50 + Math.cos(angle) * 6} ${50 + Math.sin(angle) * 6} L ${50 + Math.cos(angle) * 30} ${50 + Math.sin(angle) * 30} L ${50 + Math.cos(angle + 0.36) * 16} ${50 + Math.sin(angle + 0.36) * 16} Z`;
      }),
      circle(50, 50, 9),
      ...tails(6, 16),
    )],
    ["Star rosette", rosette(30, 20, tails(9), star(50, 50, 15, 6, 6))],
    ["Flower rosette", rosette(30, 16, tails(8), join(
      ...Array.from({ length: 6 }, (_, index) => {
        const angle = ((index * 60 - 90) * Math.PI) / 180;
        return ellipse(50 + Math.cos(angle) * 7, 50 + Math.sin(angle) * 7, 6, 9);
      }),
      circle(50, 50, 4),
    ))],
    ["Two-tier rosette", join(
      rosette(32, 24, []),
      circle(50, 50, 16),
      star(50, 50, 11, 4.4, 5),
      ...tails(10, 12),
    )],
    ["Long-tail rosette", join(
      rosette(28, 20, []),
      "M 36 64 L 22 96 L 34 90 L 40 96 L 44 70 Z",
      "M 64 64 L 78 96 L 66 90 L 60 96 L 56 70 Z",
      star(50, 50, 10, 4, 5),
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Prize ribbons",
    tags: ["badge", "ribbon", "award", "rosette", "prize", "emblem"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 0.72,
  }));
}

function banners() {
  const fold = (x, y, width, height) =>
    join(
      `M ${x} ${y} L ${x + width} ${y} L ${x + width - 8} ${y + height / 2} L ${x + width} ${y + height} L ${x} ${y + height} L ${x + 8} ${y + height / 2} Z`,
      line(x + 10, y + 8, x + width - 10, y + 8),
    );
  const defs = [
    ["Ribbon banner", join(
      fold(18, 32, 64, 32),
      "M 18 32 L 6 40 L 18 48 M 82 32 L 94 40 L 82 48",
      line(28, 48, 72, 48),
    )],
    ["Double-tail banner", join(
      roundedRect(14, 26, 72, 30, 2),
      "M 14 56 L 6 82 L 28 76 L 36 56 Z",
      "M 86 56 L 94 82 L 72 76 L 64 56 Z",
      line(24, 40, 76, 40),
    )],
    ["Curved banner", join(
      "M 8 40 C 26 20 74 20 92 40 L 86 58 C 68 42 32 42 14 58 Z",
      "M 8 40 L 2 34 L 8 26 L 16 34 M 92 40 L 98 34 L 92 26 L 84 34",
      line(30, 42, 70, 42),
    )],
    ["Flag banner", join(
      line(20, 64, 20, 8),
      "M 20 10 L 82 10 L 74 22 L 82 34 L 20 34 Z",
      star(48, 22, 7, 3, 5),
      line(12, 64, 28, 64),
      line(20, 34, 20, 48),
    )],
    ["Swallowtail banner", join(
      "M 8 30 L 92 30 L 92 46 L 60 54 L 92 62 L 92 70 L 8 70 L 8 54 L 32 46 L 8 38 Z",
      line(24, 50, 76, 50),
      star(50, 50, 5, 2, 5),
    )],
    ["Scroll banner", join(
      "M 8 38 C 18 30 28 30 36 38 L 36 62 C 28 70 18 70 8 62 Z",
      "M 92 38 C 82 30 72 30 64 38 L 64 62 C 72 70 82 70 92 62 Z",
      rect(36, 38, 28, 24),
      line(20, 50, 30, 50),
      line(70, 50, 80, 50),
      star(50, 50, 6, 2.4, 5),
    )],
    ["Folded ribbon", join(
      "M 10 36 L 40 36 L 46 50 L 40 64 L 10 64 L 16 50 Z",
      "M 90 36 L 60 36 L 54 50 L 60 64 L 90 64 L 84 50 Z",
      rect(42, 36, 16, 28),
      line(42, 44, 58, 44),
      line(42, 56, 58, 56),
    )],
    ["Banner with pole", join(
      line(14, 6, 14, 94),
      line(10, 6, 18, 6),
      circle(14, 4, 4),
      "M 14 14 L 78 14 L 86 26 L 78 38 L 14 38 Z",
      line(24, 26, 62, 26),
      "M 14 38 L 20 34 M 14 38 L 20 42",
    )],
    ["Pennant string", join(
      sweep(50, 22, 42, 10, 190, 350),
      ...Array.from({ length: 5 }, (_, index) => {
        const angle = ((200 + index * 30) * Math.PI) / 180;
        const x = 50 + Math.cos(angle) * 42;
        const y = 22 + Math.sin(angle) * 10;
        return `M ${x - 7} ${y} L ${x + 7} ${y} L ${x} ${y + 22} Z`;
      }),
    )],
    ["Vertical banner", join(
      line(50, 4, 50, 20),
      "M 32 20 L 68 20 L 68 78 L 50 90 L 32 78 Z",
      line(38, 34, 62, 34),
      line(38, 44, 58, 44),
      star(50, 62, 6, 2.4, 4),
      line(44, 78, 50, 84),
      line(56, 78, 50, 84),
    )],
    ["Ribbon wrap", join(
      "M 12 32 C 24 24 76 24 88 32 L 88 46 C 76 38 24 38 12 46 Z",
      "M 12 46 C 24 54 76 54 88 46 L 88 60 C 76 52 24 52 12 60 Z",
      "M 12 60 C 24 68 76 68 88 60 L 88 72 C 76 64 24 64 12 72 Z",
      line(40, 38, 60, 38),
      line(40, 66, 60, 66),
    )],
    ["Banner scroll pair", join(
      "M 8 30 L 44 30 L 44 58 L 8 58 L 14 44 Z",
      "M 92 42 L 56 42 L 56 70 L 92 70 L 86 56 Z",
      line(18, 42, 36, 42),
      line(64, 54, 82, 54),
      star(50, 44, 4, 1.6, 4),
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Banners",
    tags: ["badge", "banner", "ribbon", "flag", "emblem", "display"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 1.6,
  }));
}

function crests() {
  const shield = "M 22 14 L 78 14 L 78 54 C 78 76 62 86 50 92 C 38 86 22 76 22 54 Z";
  const defs = [
    ["Shield crest", join(
      shield,
      "M 28 20 L 72 20 L 72 52 C 72 70 60 80 50 85 C 40 80 28 70 28 52 Z",
      star(50, 44, 12, 5, 5),
      line(34, 26, 66, 26),
    )],
    ["Laurel crest", join(
      shield,
      ...Array.from({ length: 7 }, (_, index) => {
        const angle = ((200 + index * 23) * Math.PI) / 180;
        return leaf(50 + Math.cos(angle) * 26, 50 + Math.sin(angle) * 26, 12, 4, (angle * 180) / Math.PI + 90);
      }),
      ...Array.from({ length: 7 }, (_, index) => {
        const angle = ((340 + index * 23) * Math.PI) / 180;
        return leaf(50 + Math.cos(angle) * 26, 50 + Math.sin(angle) * 26, 12, 4, (angle * 180) / Math.PI + 90);
      }),
      "M 44 34 L 50 28 L 56 34 L 56 50 L 44 50",
    )],
    ["Crown crest", join(
      shield,
      "M 30 18 L 36 8 L 44 16 L 50 6 L 56 16 L 64 8 L 70 18 Z",
      circle(50, 32, 3),
      line(34, 46, 66, 46),
      line(38, 54, 62, 54),
      star(50, 66, 7, 2.8, 5),
    )],
    ["Monogram crest", join(
      shield,
      "M 38 30 L 50 22 L 62 30 L 62 52 L 38 52",
      "M 38 42 L 58 42",
      line(34, 62, 66, 62),
      circle(50, 70, 4),
    )],
    ["Torch crest", join(
      shield,
      "M 50 20 L 58 34 L 52 42 L 52 62 L 48 62 L 48 42 L 42 34 Z",
      "M 50 20 C 44 14 50 8 50 6 C 50 8 56 14 50 20 Z",
      line(44, 48, 56, 48),
      line(40, 68, 60, 68),
      star(50, 76, 4, 1.6, 4),
    )],
    ["Star crest", join(
      shield,
      star(50, 42, 18, 7, 8),
      line(30, 62, 70, 62),
      line(34, 70, 66, 70),
      circle(50, 26, 2.4),
    )],
    ["Oak crest", join(
      shield,
      "M 50 24 C 38 24 30 34 32 46 C 34 58 42 66 50 70 C 58 66 66 58 68 46 C 70 34 62 24 50 24 Z",
      line(50, 70, 50, 84),
      ...Array.from({ length: 5 }, (_, index) => leaf(50 + (index - 2) * 7, 34 + (index % 3) * 8, 9, 3, index % 2 ? 70 : 250)),
    )],
    ["Wing crest", join(
      shield,
      "M 50 34 C 36 26 22 30 16 42 C 26 40 36 46 42 54",
      "M 50 34 C 64 26 78 30 84 42 C 74 40 64 46 58 54",
      "M 50 34 C 42 40 38 50 40 60",
      "M 50 34 C 58 40 62 50 60 60",
      star(50, 34, 5, 2, 5),
    )],
    ["Circle crest", join(
      circle(50, 50, 36),
      circle(50, 50, 30),
      "M 30 50 L 44 50 L 44 64 L 30 64 Z M 56 38 L 70 38 L 70 52 L 56 52 Z",
      star(50, 68, 5, 2, 4),
    )],
    ["Cartouche", join(
      "M 50 8 C 66 8 70 18 82 22 C 90 26 90 74 82 78 C 70 82 66 92 50 92 C 34 92 30 82 18 78 C 10 74 10 26 18 22 C 30 18 34 8 50 8 Z",
      roundedRect(28, 28, 44, 44, 12),
      "M 38 40 L 50 32 L 62 40 L 62 56 L 38 56",
      line(32, 66, 68, 66),
      star(50, 80, 3.4, 1.4, 4),
    )],
    ["Bookplate crest", join(
      "M 18 12 L 82 12 L 82 62 C 82 78 66 88 50 92 C 34 88 18 78 18 62 Z",
      "M 32 24 C 42 20 58 20 68 24 L 68 58 C 68 68 58 76 50 80 C 42 76 32 68 32 58 Z",
      "M 40 36 L 50 28 L 60 36 L 60 52 L 40 52 Z",
      line(38, 62, 62, 62),
      leaf(32, 30, 12, 4, 140),
    )],
    ["Crest with ribbon", join(
      shield,
      "M 24 70 L 14 72 L 22 86 L 32 80",
      "M 76 70 L 86 72 L 78 86 L 68 80",
      star(50, 42, 12, 5, 5),
      line(32, 58, 68, 58),
      circle(50, 24, 2.4),
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Crests",
    tags: ["badge", "crest", "shield", "heraldry", "emblem", "monogram"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 0.85,
  }));
}

function medals() {
  const medal = (centre) =>
    join(
      "M 36 8 L 50 30 L 42 36 L 28 14 Z",
      "M 64 8 L 50 30 L 58 36 L 72 14 Z",
      circle(50, 55, 22),
      circle(50, 55, 17),
      centre,
    );
  const defs = [
    ["Medal", medal(star(50, 55, 11, 4.4, 5))],
    ["Medal with ribbon", medal(join(star(50, 55, 10, 4, 5), line(32, 28, 22, 12), line(68, 28, 78, 12)))],
    ["Cross medal", medal("M 44 42 L 56 42 L 56 50 L 64 50 L 64 60 L 56 60 L 56 68 L 44 68 L 44 60 L 36 60 L 36 50 L 44 50 Z")],
    ["Hexagon medal", medal(polygon(50, 55, 13, 13, 6))],
    ["Coin medal", medal(join(circle(50, 55, 13), star(50, 55, 7, 2.8, 8), circle(50, 55, 3)))],
    ["Pendant medal", medal(join(circle(50, 55, 11), line(50, 44, 50, 38), circle(50, 36, 3)))],
    ["Championship medal", join(
      "M 32 6 L 46 30 L 54 30 L 68 6 L 72 8 L 62 34 C 58 42 42 42 38 34 L 28 8 Z",
      circle(50, 56, 24),
      circle(50, 56, 18),
      star(50, 56, 12, 5, 5),
      ...Array.from({ length: 8 }, (_, index) => {
        const angle = (index * 45 * Math.PI) / 180;
        return line(50 + Math.cos(angle) * 18, 56 + Math.sin(angle) * 18, 50 + Math.cos(angle) * 23, 56 + Math.sin(angle) * 23);
      }),
    )],
    ["Service medal", medal(join(circle(50, 55, 12), "M 48 44 L 48 66 M 40 55 L 60 55", circle(50, 55, 5)))],
    ["Sports medal", medal("M 50 42 C 44 48 40 54 40 58 C 40 64 44 68 50 68 C 56 68 60 64 60 58 C 60 54 56 48 50 42 Z")],
    ["Academic medal", medal(join(
      "M 50 44 L 58 54 L 54 66 L 46 66 L 42 54 Z",
      line(50, 36, 50, 44),
      line(44, 70, 56, 70),
    ))],
    ["Key medallion", medal(join(
      circle(50, 52, 7),
      line(53, 58, 62, 68),
      line(58, 66, 62, 62),
      line(62, 68, 66, 64),
    ))],
    ["Seal medallion", medal(join(
      circle(50, 55, 14),
      ...Array.from({ length: 12 }, (_, index) => {
        const angle = (index * 30 * Math.PI) / 180;
        return circle(50 + Math.cos(angle) * 14, 55 + Math.sin(angle) * 14, 3);
      }),
      star(50, 55, 7, 2.8, 6),
    ))],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Medals",
    tags: ["badge", "medal", "award", "honour", "ribbon", "emblem"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 0.7,
  }));
}

function emblems() {
  const defs = [
    ["Sunburst emblem", join(
      circle(50, 50, 20),
      ...Array.from({ length: 16 }, (_, index) => {
        const angle = (index * 22.5 * Math.PI) / 180;
        return `M ${50 + Math.cos(angle) * 22} ${50 + Math.sin(angle) * 22} L ${50 + Math.cos(angle + 0.12) * 38} ${50 + Math.sin(angle + 0.12) * 38} L ${50 + Math.cos(angle + 0.24) * 22} ${50 + Math.sin(angle + 0.24) * 22}`;
      }),
      circle(50, 50, 12),
      star(50, 50, 6, 2.4, 8),
    )],
    ["Compass emblem", join(
      circle(50, 50, 34),
      circle(50, 50, 28),
      star(50, 50, 22, 6, 8),
      polygon(50, 36, 6, 12, 3, 0),
      polygon(50, 64, 6, 12, 3, 180),
      circle(50, 50, 3),
    )],
    ["Anchor emblem", join(
      circle(50, 20, 5),
      line(50, 25, 50, 74),
      line(36, 34, 64, 34),
      "M 24 56 C 24 76 76 76 76 56",
      "M 24 56 L 18 50 M 24 56 L 30 62",
      "M 76 56 L 82 50 M 76 56 L 70 62",
      star(50, 82, 3.4, 1.4, 4),
    )],
    ["Bee emblem", join(
      ellipse(50, 52, 14, 20),
      line(36, 44, 64, 44),
      line(36, 52, 64, 52),
      line(36, 60, 64, 60),
      ellipse(50, 34, 8, 6),
      ...Array.from({ length: 4 }, (_, index) => `M ${42 + index * 6} 30 C ${38 + index * 8} 18 ${44 + index * 8} 12 ${50 + index * 4} 18`),
      "M 40 42 C 24 32 18 44 24 54 C 28 60 36 54 38 46",
      "M 60 42 C 76 32 82 44 76 54 C 72 60 64 54 62 46",
      line(50, 72, 50, 82),
    )],
    ["Rose emblem", join(
      ...Array.from({ length: 6 }, (_, index) => {
        const angle = ((index * 60 - 90) * Math.PI) / 180;
        return ellipse(50 + Math.cos(angle) * 10, 50 + Math.sin(angle) * 10, 11, 15);
      }),
      ...Array.from({ length: 6 }, (_, index) => {
        const angle = ((index * 60 - 60) * Math.PI) / 180;
        return line(50, 50, 50 + Math.cos(angle) * 8, 50 + Math.sin(angle) * 8);
      }),
      circle(50, 50, 4),
      leaf(70, 66, 14, 4, 30),
      line(50, 66, 50, 88),
    )],
    ["Tree emblem", join(
      line(50, 92, 50, 62),
      "M 50 70 L 40 58 M 50 62 L 60 50",
      circle(50, 40, 24),
      circle(34, 48, 14),
      circle(66, 48, 14),
      line(38, 92, 62, 92),
      star(50, 26, 3.4, 1.4, 4),
    )],
    ["Mountain emblem", join(
      circle(50, 50, 34),
      "M 22 66 L 40 38 L 52 54 L 62 42 L 80 66 Z",
      "M 36 44 L 40 38 L 44 44 L 40 42 Z",
      "M 58 48 L 62 42 L 66 48 L 62 46 Z",
      star(50, 24, 3.4, 1.4, 4),
    )],
    ["Wave emblem", join(
      circle(50, 50, 34),
      "M 20 50 C 28 42 36 58 44 50 C 52 42 60 58 68 50 C 72 46 76 48 80 50",
      "M 20 60 C 28 52 36 68 44 60 C 52 52 60 68 68 60 C 72 56 76 58 80 60",
      "M 20 40 C 28 32 36 48 44 40 C 52 32 60 48 68 40 C 72 36 76 38 80 40",
    )],
    ["Flame emblem", join(
      circle(50, 50, 34),
      "M 50 18 C 40 32 34 40 36 52 C 38 66 50 74 50 74 C 50 74 62 66 64 52 C 66 40 60 32 50 18 Z",
      "M 50 38 C 46 46 45 52 47 58 C 49 62 52 64 52 64 C 52 64 55 60 55 56 C 55 50 52 44 50 38 Z",
      line(50, 74, 50, 88),
    )],
    ["Gear emblem", join(
      ...Array.from({ length: 10 }, (_, index) => {
        const angle = (index * 36 * Math.PI) / 180;
        return `M ${50 + Math.cos(angle - 0.12) * 30} ${50 + Math.sin(angle - 0.12) * 30} L ${50 + Math.cos(angle) * 40} ${50 + Math.sin(angle) * 40} L ${50 + Math.cos(angle + 0.12) * 30} ${50 + Math.sin(angle + 0.12) * 30}`;
      }),
      circle(50, 50, 26),
      circle(50, 50, 10),
      line(50, 24, 50, 40),
    )],
    ["Knot emblem", join(
      ...Array.from({ length: 4 }, (_, index) => {
        const angle = ((index * 90 + 45) * Math.PI) / 180;
        return ellipse(50 + Math.cos(angle) * 14, 50 + Math.sin(angle) * 14, 22, 12);
      }),
      circle(50, 50, 10),
      circle(50, 50, 34),
    )],
    ["Wheat emblem", join(
      ...Array.from({ length: 5 }, (_, index) => {
        const angle = ((200 + index * 35) * Math.PI) / 180;
        return leaf(50 + Math.cos(angle) * 24, 50 + Math.sin(angle) * 24, 12, 4, (angle * 180) / Math.PI + 90);
      }),
      ...Array.from({ length: 5 }, (_, index) => {
        const angle = ((340 + index * 35) * Math.PI) / 180;
        return leaf(50 + Math.cos(angle) * 24, 50 + Math.sin(angle) * 24, 12, 4, (angle * 180) / Math.PI + 90);
      }),
      line(50, 60, 50, 84),
      circle(50, 50, 6),
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Emblems",
    tags: ["badge", "emblem", "seal", "symbol", "mark", "branding"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 1,
  }));
}

export function emblemsAssets() {
  return [...prizeRibbons(), ...banners(), ...crests(), ...medals(), ...emblems()];
}
