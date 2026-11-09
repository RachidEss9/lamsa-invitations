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

const seedDots = (cx, cy, count, radius) =>
  Array.from({ length: count }, (_, index) => {
    const angle = (index * (360 / count) * Math.PI) / 180;
    return circle(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius, 1.2);
  });

function orchard() {
  const defs = [
    ["Orchard apple", join(
      "M 50 26 C 32 16 16 30 18 50 C 20 72 36 88 50 86 C 64 88 80 72 82 50 C 84 30 68 16 50 26 Z",
      line(50, 26, 50, 14),
      leaf(52, 16, 16, 5, -35),
      line(28, 44, 34, 38),
      star(50, 56, 4, 1.6, 5),
    )],
    ["Pear", join(
      "M 50 20 C 42 20 38 30 36 40 C 30 52 30 70 42 82 C 50 90 62 84 66 72 C 70 58 64 48 62 40 C 60 30 58 20 50 20 Z",
      line(50, 20, 50, 10),
      leaf(52, 14, 14, 5, -40),
      seedDots(50, 66, 4, 3),
    )],
    ["Peach", join(
      "M 50 26 C 34 18 18 32 20 52 C 22 72 38 86 50 82 C 62 86 78 72 80 52 C 82 32 66 18 50 26 Z",
      "M 50 28 C 44 40 44 64 50 82",
      line(50, 26, 50, 14),
      leaf(54, 18, 16, 5, -30),
      leaf(46, 18, 14, 4, -150),
    )],
    ["Cherry pair", join(
      "M 32 58 C 24 58 20 66 22 72 C 24 80 36 80 40 72 C 43 66 39 58 32 58 Z",
      "M 66 66 C 58 66 54 74 56 80 C 58 88 70 88 74 80 C 77 74 73 66 66 66 Z",
      "M 32 58 C 36 40 48 26 64 18",
      "M 66 66 C 66 48 64 32 64 18",
      line(64, 18, 80, 10),
      leaf(76, 14, 14, 5, 20),
    )],
    ["Plum", join(
      "M 50 26 C 30 24 18 40 22 58 C 26 76 40 84 50 82 C 60 84 74 76 78 58 C 82 40 70 24 50 26 Z",
      "M 50 28 C 46 42 46 66 50 82",
      line(50, 26, 50, 14),
      leaf(54, 16, 15, 5, -30),
      star(50, 54, 4, 1.6, 5),
    )],
    ["Apricot", join(
      circle(50, 52, 28),
      "M 50 26 C 46 40 46 64 50 78",
      line(50, 24, 50, 12),
      leaf(54, 16, 14, 4, -30),
      leaf(46, 18, 12, 4, -150),
    )],
    ["Fig", join(
      "M 50 20 C 38 30 30 44 34 58 C 38 72 46 82 50 86 C 54 82 62 72 66 58 C 70 44 62 30 50 20 Z",
      "M 50 20 L 50 10",
      leaf(54, 14, 16, 5, -30),
      ...Array.from({ length: 6 }, (_, index) => circle(42 + (index % 3) * 8, 48 + Math.floor(index / 3) * 12, 1.4)),
    )],
    ["Pomegranate", join(
      circle(50, 52, 30),
      "M 40 24 L 44 14 L 50 24 L 56 12 L 58 24 L 64 16",
      "M 38 30 L 34 24",
      ...Array.from({ length: 5 }, (_, index) => circle(42 + (index % 3) * 9, 46 + Math.floor(index / 3) * 10, 1.6)),
      star(50, 50, 4, 1.6, 5),
    )],
    ["Quince", join(
      "M 50 28 C 34 22 20 36 22 54 C 24 74 40 86 50 84 C 60 86 76 74 78 54 C 80 36 66 22 50 28 Z",
      line(50, 28, 50, 14),
      leaf(54, 18, 16, 5, -30),
      "M 50 14 C 46 8 54 4 56 10",
      line(64, 40, 70, 36),
    )],
    ["Persimmon", join(
      circle(50, 54, 28),
      "M 36 32 L 44 40 M 50 28 L 50 38 M 64 32 L 56 40",
      leaf(50, 30, 16, 6, -90),
      line(50, 22, 50, 12),
      star(50, 54, 3.4, 1.4, 4),
    )],
    ["Olive branch sprig", join(
      "M 14 84 C 30 64 52 44 86 20",
      ...Array.from({ length: 8 }, (_, index) => {
        const x = 24 + index * 7;
        const y = 74 - index * 7;
        return leaf(x, y, 14, 4, index % 2 ? 70 : 250);
      }),
      ...Array.from({ length: 4 }, (_, index) => circle(30 + index * 13, 68 - index * 13, 4)),
    )],
    ["Apple half", join(
      "M 50 24 C 30 18 18 36 22 56 C 26 74 40 84 50 82 C 60 84 74 74 78 56 C 82 36 70 18 50 24 Z",
      line(50, 24, 50, 82),
      "M 50 34 C 44 40 42 56 46 66 C 48 72 50 76 50 82",
      ...seedDots(50, 56, 5, 3),
      line(50, 24, 50, 12),
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Orchard fruit",
    tags: ["fruit", "orchard", "harvest", "agriculture", "food", "produce"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 1,
  }));
}

function citrus() {
  const fruit = (cx, cy, rx, ry, tip) =>
    join(`M ${cx - rx} ${cy} C ${cx - rx} ${cy - ry} ${cx + rx} ${cy - ry} ${cx + rx} ${cy} C ${cx + rx} ${cy + ry} ${cx - rx} ${cy + ry} ${cx - rx} ${cy} Z`, tip);
  const defs = [
    ["Orange", join(
      circle(50, 54, 28),
      leaf(50, 26, 14, 5, -110),
      line(50, 28, 50, 18),
      star(50, 54, 3, 1.2, 4),
    )],
    ["Lemon", join(
      fruit(50, 54, 20, 28, "M 38 34 L 32 26 L 44 30 M 62 34 L 68 26 L 56 30"),
      leaf(58, 26, 16, 5, -25),
    )],
    ["Lime", join(
      circle(50, 56, 24),
      leaf(52, 30, 16, 5, -60),
      line(50, 32, 50, 22),
      ...Array.from({ length: 8 }, (_, index) => {
        const angle = (index * 45 * Math.PI) / 180;
        return line(50 + Math.cos(angle) * 6, 56 + Math.sin(angle) * 6, 50 + Math.cos(angle) * 16, 56 + Math.sin(angle) * 16);
      }),
    )],
    ["Grapefruit", join(
      circle(50, 56, 30),
      circle(50, 56, 24),
      ...Array.from({ length: 8 }, (_, index) => {
        const angle = (index * 45 * Math.PI) / 180;
        return line(50 + Math.cos(angle) * 5, 56 + Math.sin(angle) * 5, 50 + Math.cos(angle) * 22, 56 + Math.sin(angle) * 22);
      }),
      leaf(54, 26, 16, 5, -45),
    )],
    ["Bergamot", join(
      circle(50, 56, 26),
      "M 50 30 C 44 24 56 22 58 28",
      leaf(70, 36, 15, 5, 30),
      line(50, 30, 50, 20),
      star(50, 56, 3, 1.2, 4),
    )],
    ["Kumquat", join(
      fruit(50, 58, 16, 24, "M 42 38 L 38 30 L 48 34"),
      leaf(56, 30, 18, 6, -20),
      leaf(44, 32, 14, 5, -160),
    )],
    ["Citron", join(
      "M 34 30 C 20 40 20 70 34 80 C 44 88 56 88 66 80 C 80 70 80 40 66 30 C 56 22 44 22 34 30 Z",
      "M 40 30 L 36 20 L 46 26 M 60 30 L 64 20 L 54 26",
      ...Array.from({ length: 5 }, (_, index) => line(34 + index * 4, 38 + index * 4, 40 + index * 4, 42 + index * 4)),
    )],
    ["Mandarin", join(
      circle(50, 56, 26),
      "M 44 32 C 46 26 54 26 56 32",
      leaf(58, 30, 14, 5, -40),
      line(50, 30, 50, 20),
      ...seedDots(50, 56, 6, 4),
    )],
    ["Citrus half", join(
      circle(50, 54, 28),
      circle(50, 54, 23),
      ...Array.from({ length: 9 }, (_, index) => {
        const angle = (index * 40 * Math.PI) / 180;
        return line(50, 54, 50 + Math.cos(angle) * 22, 54 + Math.sin(angle) * 22);
      }),
      circle(50, 54, 4),
      sweep(50, 54, 28, 28, 0, 360),
    )],
    ["Citrus slice", join(
      circle(50, 52, 30),
      circle(50, 52, 26),
      ...Array.from({ length: 8 }, (_, index) => {
        const angle = (index * 45 * Math.PI) / 180;
        return line(50, 52, 50 + Math.cos(angle) * 26, 52 + Math.sin(angle) * 26);
      }),
      circle(50, 52, 5),
      line(74, 72, 88, 78),
    )],
    ["Citrus blossom", join(
      ...Array.from({ length: 5 }, (_, index) => {
        const angle = (index * 72 - 90) * Math.PI / 180;
        return ellipse(50 + Math.cos(angle) * 13, 50 + Math.sin(angle) * 13, 13, 9);
      }),
      circle(50, 50, 6),
      ...Array.from({ length: 5 }, (_, index) => {
        const angle = (index * 72 - 60) * Math.PI / 180;
        return line(50, 50, 50 + Math.cos(angle) * 5, 50 + Math.sin(angle) * 5);
      }),
      leaf(76, 62, 16, 5, 30),
    )],
    ["Citrus leaf sprig", join(
      "M 12 86 C 26 68 40 52 60 40",
      ...Array.from({ length: 5 }, (_, index) => leaf(20 + index * 8, 76 - index * 8, 18, 5, index % 2 ? 60 : 230)),
      circle(66, 34, 7),
      line(66, 34, 82, 24),
      star(66, 34, 2.4, 1, 4),
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Citrus",
    tags: ["fruit", "citrus", "harvest", "fresh", "food", "produce"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 1,
  }));
}

function berries() {
  const defs = [
    ["Grape bunch", join(
      [[50, 38], [42, 46], [58, 46], [34, 54], [50, 54], [66, 54],
        [42, 62], [58, 62], [34, 70], [50, 70], [66, 70], [42, 78], [58, 78], [50, 86]]
        .map(([x, y]) => circle(x, y, 6.4))
        .join(" "),
      leaf(50, 20, 18, 7, -90),
      line(50, 24, 50, 32),
      "M 50 18 C 58 10 70 14 68 22",
    )],
    ["Vine leaf", join(
      "M 50 14 C 30 20 20 40 26 58 C 32 74 46 84 50 86 C 54 84 68 74 74 58 C 80 40 70 20 50 14 Z",
      line(50, 28, 50, 82),
      ...Array.from({ length: 4 }, (_, index) => line(50, 42 + index * 10, 34 + index * 3, 36 + index * 10)),
      ...Array.from({ length: 4 }, (_, index) => line(50, 42 + index * 10, 66 - index * 3, 36 + index * 10)),
      line(50, 86, 50, 94),
    )],
    ["Strawberry", join(
      "M 50 84 C 30 74 20 54 26 38 C 34 24 66 24 74 38 C 80 54 70 74 50 84 Z",
      "M 28 36 C 34 24 66 24 72 36 L 50 46 Z",
      ...seedDots(50, 56, 8, 12),
      line(50, 32, 50, 22),
      leaf(62, 24, 12, 4, 20),
    )],
    ["Raspberry", join(
      circle(50, 56, 26),
      ...Array.from({ length: 10 }, (_, index) => {
        const angle = (index * 36 * Math.PI) / 180;
        return circle(50 + Math.cos(angle) * 14, 56 + Math.sin(angle) * 14, 5.4);
      }),
      circle(50, 56, 5),
      "M 34 34 L 42 42 M 50 30 L 50 42 M 66 34 L 58 42",
      leaf(50, 30, 14, 5, -90),
    )],
    ["Blueberry trio", join(
      circle(36, 54, 12),
      circle(60, 48, 12),
      circle(54, 70, 11),
      ...Array.from({ length: 4 }, (_, index) => star(36 + (index % 2) * 24, 50 + Math.floor(index / 2) * 16, 2.4, 1, 5)),
      leaf(70, 38, 14, 5, -40),
      line(50, 38, 50, 28),
    )],
    ["Blackberry", join(
      ...Array.from({ length: 9 }, (_, index) => {
        const angle = ((index * 40 - 90) * Math.PI) / 180;
        return circle(50 + Math.cos(angle) * 12, 54 + Math.sin(angle) * 12, 6);
      }),
      circle(50, 54, 6),
      "M 36 32 L 44 40 M 50 28 L 50 40 M 64 32 L 56 40",
      leaf(64, 30, 12, 4, -30),
    )],
    ["Redcurrant", join(
      "M 50 20 C 40 34 34 48 34 64",
      "M 50 20 C 60 34 66 48 66 64",
      "M 50 20 L 50 12",
      ...Array.from({ length: 6 }, (_, index) => circle(34 + (index % 3) * 16, 58 + Math.floor(index / 3) * 16, 6)),
      leaf(50, 18, 14, 5, -90),
    )],
    ["Cranberry", join(
      circle(38, 58, 13),
      circle(62, 54, 13),
      circle(48, 74, 12),
      "M 38 45 L 44 36 M 62 41 L 58 32 M 48 62 L 48 52",
      leaf(66, 38, 15, 5, -30),
      line(50, 30, 50, 20),
    )],
    ["Mulberry", join(
      ellipse(50, 56, 15, 24),
      ...Array.from({ length: 8 }, (_, index) => {
        const y = 40 + index * 5;
        return circle(44 + (index % 2) * 12, y, 3.4);
      }),
      "M 50 32 L 50 22",
      leaf(58, 28, 14, 5, -40),
    )],
    ["Gooseberry", join(
      circle(50, 56, 24),
      ...Array.from({ length: 10 }, (_, index) => {
        const angle = (index * 36 * Math.PI) / 180;
        return circle(50 + Math.cos(angle) * 14, 56 + Math.sin(angle) * 14, 2);
      }),
      "M 50 32 C 46 26 54 22 58 28",
      leaf(62, 30, 12, 4, -30),
      line(50, 32, 50, 22),
    )],
    ["Elderflower", join(
      "M 50 86 L 50 42",
      ...Array.from({ length: 7 }, (_, index) => {
        const angle = ((index * 360) / 7 - 90) * Math.PI / 180;
        return line(50, 42, 50 + Math.cos(angle) * 24, 42 + Math.sin(angle) * 24);
      }),
      ...Array.from({ length: 7 }, (_, index) => {
        const angle = ((index * 360) / 7 - 90) * Math.PI / 180;
        return circle(50 + Math.cos(angle) * 26, 42 + Math.sin(angle) * 26, 7);
      }),
      ...Array.from({ length: 6 }, (_, index) => leaf(38 + index * 5, 70 - index * 2, 10, 3, index % 2 ? 60 : 240)),
      circle(50, 42, 5),
    )],
    ["Berry basket", join(
      "M 16 50 L 84 50 L 76 84 L 24 84 Z",
      ...Array.from({ length: 6 }, (_, index) => line(24 + index * 10, 50, 28 + index * 8, 84)),
      line(16, 60, 84, 60),
      "M 24 50 C 24 32 76 32 76 50",
      ...Array.from({ length: 5 }, (_, index) => circle(30 + index * 10, 42, 6)),
      leaf(66, 34, 14, 5, -30),
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Vines & berries",
    tags: ["fruit", "berry", "vine", "harvest", "food", "produce"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 1,
  }));
}

function field() {
  const stalk = (x, y, height, count) =>
    Array.from({ length: count }, (_, index) => {
      const t = index / count;
      const px = x + 4 * Math.sin(t * 3);
      return ellipse(px, y - t * height, 4, 7);
    }).join(" ");
  const defs = [
    ["Wheat sheaf", join(
      ...Array.from({ length: 5 }, (_, index) => `M 50 90 C ${38 + index * 6} 62 ${34 + index * 6} 34 ${36 + index * 8} 14`),
      ...Array.from({ length: 5 }, (_, index) => stalk(36 + index * 8, 40, 28, 4)),
      "M 38 70 C 30 64 26 66 22 60 M 62 70 C 70 64 74 66 78 60",
      line(34, 90, 66, 90),
    )],
    ["Barley", join(
      line(50, 90, 50, 20),
      ...Array.from({ length: 8 }, (_, index) => {
        const y = 24 + index * 6;
        return join(ellipse(44, y, 3, 7), ellipse(56, y + 3, 3, 7));
      }),
      ...Array.from({ length: 3 }, (_, index) => line(50, 82 - index * 10, 34 - index * 4, 72 - index * 10)),
    )],
    ["Oat spray", join(
      ...Array.from({ length: 3 }, (_, branch) => `M 50 90 C ${40 + branch * 10} 64 ${34 + branch * 12} 44 ${30 + branch * 16} 20`),
      ...Array.from({ length: 7 }, (_, index) => {
        const x = 32 + index * 4;
        const y = 68 - index * 8;
        return join(circle(x, y, 4), line(x, y + 4, x + 4, y + 10));
      }),
    )],
    ["Rye stalk", join(
      line(50, 92, 50, 18),
      ...Array.from({ length: 10 }, (_, index) => {
        const y = 22 + index * 6;
        const side = index % 2 ? 1 : -1;
        return `M 50 ${y} Q ${50 + side * 8} ${y - 4} ${50 + side * 12} ${y + 6}`;
      }),
      ...Array.from({ length: 3 }, (_, index) => line(50, 82 - index * 8, 36 - index * 2, 76 - index * 8)),
    )],
    ["Rice stalk", join(
      line(50, 92, 50, 14),
      ...Array.from({ length: 12 }, (_, index) => {
        const y = 18 + index * 5.4;
        const side = index % 2 ? 1 : -1;
        return ellipse(50 + side * 6, y, 4, 6);
      }),
      ...Array.from({ length: 4 }, (_, index) => leaf(50, 88 - index * 10, 14, 4, index % 2 ? 50 : 230)),
    )],
    ["Corn cob", join(
      "M 50 84 C 36 74 30 56 34 40 C 38 24 62 24 66 40 C 70 56 64 74 50 84 Z",
      ...Array.from({ length: 5 }, (_, row) =>
        Array.from({ length: 3 }, (_, col) => circle(40 + col * 10, 34 + row * 9, 2)).join(" "),
      ),
      ...Array.from({ length: 3 }, (_, index) => leaf(50, 78, 26 - index * 4, 8, 120 + index * 35)),
      line(50, 84, 50, 94),
    )],
    ["Sunflower", join(
      circle(50, 50, 15),
      ...Array.from({ length: 16 }, (_, index) => {
        const angle = (index * 22.5 * Math.PI) / 180;
        return ellipse(50 + Math.cos(angle) * 27, 50 + Math.sin(angle) * 27, 12, 6);
      }),
      ...seedDots(50, 50, 12, 8),
      line(50, 78, 50, 96),
      leaf(42, 82, 22, 8, 140),
      leaf(58, 86, 20, 7, 40),
    )],
    ["Cornflower", join(
      ...Array.from({ length: 8 }, (_, index) => {
        const angle = (index * 45 * Math.PI) / 180;
        return petal(50 + Math.cos(angle) * 8, 50 + Math.sin(angle) * 8, 18, 6, (angle * 180) / Math.PI);
      }),
      circle(50, 50, 5),
      line(50, 66, 50, 92),
      leaf(42, 80, 16, 5, 140),
      leaf(58, 86, 14, 4, 40),
    )],
    ["Poppy pod", join(
      ellipse(50, 48, 16, 20),
      ...Array.from({ length: 7 }, (_, index) => line(50, 28, 50 + (index - 3) * 5, 20)),
      line(50, 68, 50, 94),
      leaf(40, 78, 20, 6, 140),
      leaf(60, 84, 18, 5, 40),
      line(44, 44, 56, 44),
    )],
    ["Cotton boll", join(
      ...Array.from({ length: 5 }, (_, index) => {
        const angle = ((index * 72 - 90) * Math.PI) / 180;
        return circle(50 + Math.cos(angle) * 12, 46 + Math.sin(angle) * 12, 12);
      }),
      ...Array.from({ length: 5 }, (_, index) => {
        const angle = ((index * 72 - 60) * Math.PI) / 180;
        return line(50, 46, 50 + Math.cos(angle) * 24, 46 + Math.sin(angle) * 24);
      }),
      line(50, 60, 50, 88),
      polygon(50, 70, 8, 9, 3, 0),
    )],
    ["Hay bale", join(
      roundedRect(8, 40, 84, 44, 8),
      line(8, 52, 92, 52),
      ...Array.from({ length: 9 }, (_, index) => line(12 + index * 9, 40, 8 + index * 9, 84)),
      line(8, 70, 92, 70),
      ...Array.from({ length: 6 }, (_, index) => line(16 + index * 12, 44, 20 + index * 12, 50)),
      line(30, 84, 30, 90),
      line(70, 84, 70, 90),
    )],
    ["Sickle", join(
      sweep(52, 56, 34, 34, 200, 340),
      line(52, 22, 70, 14),
      "M 52 22 C 60 24 64 30 64 34",
      line(34, 80, 20, 94),
      roundedRect(14, 88, 14, 8, 3),
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Field & grain",
    tags: ["agriculture", "harvest", "grain", "farm", "field", "nature"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 1,
  }));
}

function market() {
  const defs = [
    ["Harvest basket", join(
      "M 14 46 L 86 46 L 78 84 L 22 84 Z",
      ...Array.from({ length: 7 }, (_, index) => line(22 + index * 10, 46, 26 + index * 8, 84)),
      "M 22 46 C 22 26 78 26 78 46",
      ...Array.from({ length: 4 }, (_, index) => circle(30 + index * 13, 38, 7)),
      leaf(64, 28, 16, 5, -30),
      line(14, 56, 86, 56),
    )],
    ["Produce crate", join(
      "M 10 44 L 90 44 L 84 84 L 16 84 Z",
      line(10, 56, 90, 56),
      line(10, 70, 90, 70),
      ...Array.from({ length: 4 }, (_, index) => line(26 + index * 16, 44, 26 + index * 16, 84)),
      ...Array.from({ length: 3 }, (_, index) => circle(28 + index * 20, 36, 8)),
      leaf(66, 26, 14, 4, -30),
    )],
    ["Jam jar", join(
      roundedRect(28, 30, 44, 56, 6),
      rect(26, 20, 48, 12, 3),
      ...Array.from({ length: 4 }, (_, index) => circle(26 + index * 16, 20, 2)),
      rect(34, 42, 32, 28, 2),
      circle(50, 54, 7),
      leaf(56, 48, 10, 3, -30),
      line(38, 64, 62, 64),
    )],
    ["Honey jar", join(
      "M 30 30 L 70 30 L 74 84 C 68 90 32 90 26 84 Z",
      rect(32, 20, 36, 10, 3),
      line(26, 42, 74, 42),
      rect(36, 50, 28, 22, 2),
      "M 46 64 L 54 64 L 50 56 Z",
      line(40, 58, 60, 58),
    )],
    ["Olive oil bottle", join(
      "M 40 92 L 40 52 C 40 44 32 38 32 28 L 32 14 L 68 14 L 68 28 C 68 38 60 44 60 52 L 60 92 Z",
      line(32, 14, 68, 14),
      line(36, 30, 64, 30),
      roundedRect(34, 54, 32, 26, 2),
      leaf(50, 62, 12, 4, -60),
      line(40, 72, 60, 72),
    )],
    ["Milk bottle", join(
      "M 36 92 L 36 50 C 36 42 42 38 42 30 L 42 16 L 58 16 L 58 30 C 58 38 64 42 64 50 L 64 92 Z",
      line(42, 16, 58, 16),
      line(42, 26, 58, 26),
      roundedRect(42, 46, 16, 12, 2),
      line(36, 72, 64, 72),
      line(44, 64, 56, 64),
    )],
    ["Cheese wheel", join(
      ellipse(50, 62, 36, 16),
      "M 14 62 L 14 48 L 50 30 L 86 48 L 86 62",
      "M 14 48 L 50 30 L 86 48",
      line(50, 30, 50, 62),
      circle(32, 52, 4),
      circle(68, 54, 5),
      circle(50, 42, 3),
    )],
    ["Egg carton", join(
      "M 10 48 L 90 48 L 84 78 L 16 78 Z",
      "M 10 48 C 20 34 34 34 42 48 C 50 34 66 34 74 48 C 82 34 88 40 90 48",
      ...Array.from({ length: 3 }, (_, index) => line(28 + index * 22, 48, 28 + index * 22, 78)),
      line(10, 64, 90, 64),
      ellipse(50, 40, 10, 6),
    )],
    ["Beehive", join(
      ...Array.from({ length: 4 }, (_, index) => ellipse(50, 38 + index * 12, 30 - index * 3, 8)),
      "M 24 76 C 24 86 76 86 76 76",
      circle(44, 82, 3),
      circle(56, 82, 3),
      ...Array.from({ length: 3 }, (_, index) => circle(62 + index * 6, 22 - index * 4, 2)),
      leaf(30, 82, 12, 4, 140),
    )],
    ["Watering can", join(
      "M 24 40 L 68 40 L 72 82 C 66 88 30 88 24 82 Z",
      "M 68 46 C 82 42 90 52 86 60",
      "M 24 50 C 14 54 14 68 24 72",
      "M 40 40 C 40 28 60 28 60 40",
      "M 72 30 L 88 22 L 92 28 L 78 38",
      line(32, 58, 62, 58),
    )],
    ["Wheelbarrow", join(
      "M 10 50 L 66 50 L 78 70 L 22 70 Z",
      "M 10 50 L 6 40 L 22 36",
      circle(30, 82, 8),
      line(30, 70, 30, 74),
      line(66, 60, 92, 44),
      line(92, 44, 94, 50),
      line(84, 48, 84, 58),
      "M 24 58 C 34 54 50 54 58 58",
    )],
    ["Farmhouse", join(
      "M 12 50 L 50 20 L 88 50",
      rect(18, 50, 64, 42),
      rect(40, 66, 20, 26, 1),
      rect(24, 58, 12, 12, 1),
      rect(64, 58, 12, 12, 1),
      line(18, 92, 82, 92),
      circle(50, 30, 4),
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Market & farm",
    tags: ["agriculture", "market", "farm", "harvest", "food", "produce"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 1,
  }));
}

export function harvestAssets() {
  return [...orchard(), ...citrus(), ...berries(), ...field(), ...market()];
}
