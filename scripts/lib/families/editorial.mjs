import {
  arc,
  circle,
  ellipse,
  line,
  polygon,
  rect,
  roundedRect,
  star,
  sweep,
  wave,
} from "../paths.mjs";

const join = (...parts) => parts.filter(Boolean).join(" ");

function sectionDividers() {
  const defs = [
    ["Rule with diamond", join(line(6, 50, 42, 50), line(58, 50, 94, 50), polygon(50, 50, 6, 6, 4))],
    ["Section number rule", join(line(6, 50, 74, 50), circle(84, 50, 8), line(84, 44, 84, 56))],
    ["Wide editorial rule", join(line(2, 50, 98, 50), line(2, 54, 98, 54))],
    ["Short caption rule", join(line(34, 50, 66, 50))],
    ["Rule and triangle", join(line(6, 50, 84, 50), polygon(90, 50, 6, 7, 3, 90))],
    ["Double stagger rule", join(line(6, 44, 62, 44), line(38, 56, 94, 56))],
    ["Thick-thin rule", join(rect(6, 47, 88, 4), line(6, 56, 94, 56))],
    ["Centred tick rule", join(line(6, 50, 46, 50), line(54, 50, 94, 50), line(50, 42, 50, 58))],
    ["Dot cluster rule", join(line(6, 50, 38, 50), line(62, 50, 94, 50), circle(44, 50, 2), circle(50, 50, 3), circle(56, 50, 2))],
    ["Slash rule", join(line(6, 54, 40, 46), line(36, 54, 70, 46), line(66, 54, 94, 46))],
    ["Arrow rule", join(line(6, 50, 80, 50), line(72, 42, 82, 50), line(72, 58, 82, 50))],
    ["Bracket rule", join(line(12, 42, 6, 50), line(6, 50, 12, 58), line(88, 42, 94, 50), line(94, 50, 88, 58), line(20, 50, 80, 50))],
    ["Wave rule", wave(50, 8, 2)],
    ["Zigzag rule", join(...Array.from({ length: 10 }, (_, i) => line(4 + i * 9.4, i % 2 ? 44 : 56, 8 + i * 9.4, i % 2 ? 56 : 44)))],
    ["Press rule", join(rect(6, 47, 26, 6), line(38, 50, 94, 50))],
    ["Numbered rule", join(line(6, 50, 30, 50), line(38, 50, 62, 50), line(70, 50, 94, 50), circle(34, 50, 3), circle(66, 50, 3))],
  ];
  return defs.map(([name, d]) => ({
    subcategory: "Section dividers",
    name,
    tags: ["divider", "editorial", "magazine", "section", "rule"],
    ink: name === "Thick-thin rule" || name === "Press rule" ? "fill" : "stroke",
    strokeWidth: 1.7,
    aspect: 4.2,
    d,
  }));
}

function pageNumbers() {
  const defs = [
    ["Ring number frame", circle(50, 50, 34)],
    ["Diamond number frame", polygon(50, 50, 34, 34, 4)],
    ["Bracket number frame", join(line(2, 24, 2, 76), line(2, 24, 22, 24), line(2, 76, 22, 76), line(78, 24, 98, 24), line(98, 24, 98, 76), line(78, 76, 98, 76))],
    ["Rule number frame", join(line(14, 26, 80, 26), line(14, 74, 80, 74))],
    ["Double rule number", join(line(6, 30, 94, 30), line(6, 70, 94, 70), line(50, 38, 50, 62))],
    ["Leaf number frame", join(circle(50, 50, 36), ...Array.from({ length: 8 }, (_, i) => line(50 + Math.cos((i * 45 * Math.PI) / 180) * 36, 50 + Math.sin((i * 45 * Math.PI) / 180) * 36, 50 + Math.cos((i * 45 * Math.PI) / 180) * 44, 50 + Math.sin((i * 45 * Math.PI) / 180) * 44)))],
    ["Corner number frame", join(line(8, 30, 8, 8), line(8, 8, 30, 8), line(70, 8, 92, 8), line(92, 8, 92, 30), line(92, 70, 92, 92), line(92, 92, 70, 92), line(30, 92, 8, 92), line(8, 92, 8, 70))],
    ["Orb number frame", join(circle(50, 50, 40), circle(50, 50, 32), line(18, 50, 32, 50), line(68, 50, 82, 50))],
    ["Ticket number frame", join(roundedRect(16, 26, 68, 48, 10), line(50, 26, 50, 74))],
    ["Star number frame", join(star(50, 50, 38, 30, 12), circle(50, 50, 22))],
    ["Stacked number frame", join(line(22, 26, 78, 26), line(30, 74, 70, 74), line(44, 38, 56, 38))],
    ["Oval number frame", join(ellipse(50, 50, 32, 40), line(32, 50, 68, 50))],
  ];
  return defs.map(([name, d]) => ({
    subcategory: "Page number decorations",
    name,
    tags: ["page number", "folio", "editorial", "book", "frame"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: name === "Bracket number frame" || name === "Rule number frame" || name === "Double rule number" ? 1.8 : 1,
    d,
  }));
}

function labels() {
  const defs = [
    ["Label tag", "M 8 22 L 74 22 L 92 50 L 74 78 L 8 78 Z"],
    ["Ribbon label", "M 6 26 L 84 26 L 84 40 L 94 50 L 84 60 L 84 74 L 6 74 Z"],
    ["Banner label", "M 12 20 L 88 20 L 88 34 L 96 50 L 88 66 L 88 80 L 12 80 L 12 66 L 4 50 L 12 34 Z"],
    ["Bookmark label", "M 22 10 L 78 10 L 78 84 L 50 70 L 22 84 Z"],
    ["Pill label", roundedRect(6, 20, 88, 60, 30)],
    ["Corner label", "M 6 20 L 70 20 L 94 50 L 70 80 L 6 80 Z"],
    ["Framed label", join(rect(6, 24, 88, 52), line(12, 30, 82, 30), line(12, 70, 82, 70))],
    ["Torn label", "M 8 24 L 22 20 L 36 26 L 50 19 L 64 25 L 78 20 L 92 26 L 92 74 L 78 78 L 64 72 L 50 79 L 36 73 L 22 78 L 8 74 Z"],
    ["Double-ended label", "M 10 28 L 90 28 L 84 50 L 90 72 L 10 72 L 16 50 Z"],
    ["Ticket label", join(roundedRect(4, 26, 92, 48, 6), arc(4, 50, 5, 5, 90, 270), arc(96, 50, 5, 5, 270, 90))],
    ["Speech label", "M 10 20 L 90 20 L 90 66 L 46 66 L 32 82 L 34 66 L 10 66 Z"],
    ["Boxed label", join(rect(6, 22, 88, 56), polygon(6, 22, 6, 6, 4), polygon(94, 22, 6, 6, 4))],
    ["Rounded tag label", join(roundedRect(8, 22, 84, 56, 12), line(24, 50, 76, 50))],
    ["Stacked label", join(rect(6, 14, 88, 30), rect(14, 52, 88, 30))],
  ];
  return defs.map(([name, d]) => ({
    subcategory: "Labels",
    name,
    tags: ["label", "tag", "editorial", "layout", "shape"],
    ink: "stroke",
    strokeWidth: 1.6,
    aspect: 2.4,
    d,
  }));
}

function badges() {
  const defs = [
    ["Rosette badge", join(...Array.from({ length: 16 }, (_, i) => sweep(50, 50, i % 2 ? 32 : 42, i % 2 ? 32 : 42, i * 22.5, i * 22.5 + 24)), circle(50, 50, 24))],
    ["Ribbon badge", join(rect(22, 8, 56, 56), "M 22 48 L 10 58 L 22 60 L 22 76 L 34 66 L 46 76 L 46 56", "M 78 48 L 90 58 L 78 60 L 78 76 L 66 66 L 54 76 L 54 56")],
    ["Star badge", join(star(50, 42, 34, 20, 8), line(38, 74, 30, 94), line(62, 74, 70, 94))],
    ["Hexagon badge", join(polygon(50, 50, 42, 42, 6, -90), polygon(50, 50, 32, 32, 6, -90))],
    ["Seal badge", join(circle(50, 44, 32), line(30, 68, 22, 92), line(50, 72, 50, 96), line(70, 68, 78, 92))],
    ["Banner badge", join("M 10 26 L 90 26 L 80 50 L 90 74 L 10 74 L 20 50 Z", line(24, 42, 76, 42), line(24, 58, 76, 58))],
    ["Shield badge", join("M 20 14 L 80 14 L 80 54 C 80 72 66 82 50 88 C 34 82 20 72 20 54 Z", line(32, 40, 68, 40))],
    ["Diamond badge", join(polygon(50, 8, 30, 34, 4), line(20, 74, 38, 94), line(80, 74, 62, 94))],
    ["Laurel badge", join(circle(50, 50, 34), ...Array.from({ length: 9 }, (_, i) => line(50 + Math.cos(((200 + i * 20) * Math.PI) / 180) * 38, 50 + Math.sin(((200 + i * 20) * Math.PI) / 180) * 38, 50 + Math.cos(((200 + i * 20) * Math.PI) / 180) * 44, 50 + Math.sin(((200 + i * 20) * Math.PI) / 180) * 44)))],
    ["Double circle badge", join(circle(50, 50, 42), circle(50, 50, 34), star(50, 50, 16, 7, 5))],
    ["Scallop badge", join(...Array.from({ length: 12 }, (_, i) => circle(50 + Math.cos((i * 30 * Math.PI) / 180) * 34, 50 + Math.sin((i * 30 * Math.PI) / 180) * 34, 10)), circle(50, 50, 28))],
    ["Tab badge", join(roundedRect(6, 26, 88, 48, 8), rect(6, 26, 22, 48), line(28, 38, 86, 38), line(28, 62, 86, 62))],
    ["Burst badge", join(star(50, 48, 40, 32, 18), line(34, 84, 26, 96), line(66, 84, 74, 96))],
    ["Framed badge", join(rect(10, 18, 80, 64), rect(16, 24, 68, 52), line(28, 50, 72, 50))],
  ];
  return defs.map(([name, d]) => ({
    subcategory: "Badges",
    name,
    tags: ["badge", "emblem", "editorial", "sticker", "label"],
    ink: "stroke",
    strokeWidth: 1.5,
    aspect: 1.1,
    d,
  }));
}

function pullQuotes() {
  const defs = [
    ["Open quote mark", join("M 18 82 C 10 70 12 48 24 34 C 36 20 52 16 64 22 C 72 26 74 36 66 40 C 58 44 50 38 52 30 C 46 32 38 40 34 52 C 32 60 34 68 40 74 Z")],
    ["Double quote mark", join(
      "M 10 78 C 4 66 6 48 16 36 C 26 24 38 20 46 26 C 52 30 52 38 46 42 C 40 46 32 42 34 34 C 30 36 24 44 22 54 C 20 62 22 70 28 76 Z",
      "M 54 78 C 48 66 50 48 60 36 C 70 24 82 20 90 26 C 96 30 96 38 90 42 C 84 46 76 42 78 34 C 74 36 68 44 66 54 C 64 62 66 70 72 76 Z",
    )],
    ["Quote rules", join(line(10, 30, 90, 30), line(10, 38, 62, 38), line(10, 66, 90, 66), line(10, 74, 54, 74))],
    ["Quote block", join(rect(8, 8, 6, 84), line(22, 24, 92, 24), line(22, 38, 84, 38), line(22, 60, 92, 60), line(22, 74, 70, 74))],
    ["Quote star", join(star(22, 24, 12, 5, 5), line(42, 20, 92, 20), line(42, 32, 80, 32), line(12, 62, 92, 62), line(12, 76, 68, 76))],
    ["Quote bracket", join(line(8, 18, 8, 82), line(8, 18, 20, 18), line(8, 82, 20, 82), line(30, 36, 92, 36), line(30, 52, 84, 52), line(30, 68, 74, 68))],
    ["Quote diamond", join(polygon(14, 14, 8, 8, 4), line(30, 14, 92, 14), line(30, 44, 92, 44), line(30, 60, 70, 60), line(12, 80, 92, 80))],
    ["Quote ticks", join(...Array.from({ length: 3 }, (_, i) => line(12, 30 + i * 18, 24, 24 + i * 18)), line(34, 30, 92, 30), line(34, 48, 92, 48), line(34, 66, 78, 66))],
    ["Quote frame", join(rect(6, 6, 88, 88), line(18, 24, 82, 24), line(18, 36, 82, 36), line(18, 64, 82, 64), line(18, 76, 62, 76))],
    ["Quote wave", join(wave(24, 6, 2), line(12, 44, 88, 44), line(12, 58, 88, 58), line(12, 72, 62, 72))],
    ["Quote rule pair", join(line(6, 20, 50, 20), line(56, 20, 94, 20), line(6, 30, 94, 30), line(6, 68, 94, 68), line(6, 78, 50, 78), line(56, 78, 94, 78))],
    ["Quote ornament", join(arc(50, 70, 34, 34, 200, 340), line(16, 70, 84, 70), circle(50, 28, 4))],
  ];
  return defs.map(([name, d]) => ({
    subcategory: "Pull quote decorations",
    name,
    tags: ["quote", "editorial", "article", "mark", "decoration"],
    ink: name === "Open quote mark" || name === "Double quote mark" || name === "Quote ornament" ? "fill" : "stroke",
    strokeWidth: 1.4,
    aspect: name === "Open quote mark" || name === "Double quote mark" ? 1 : 2.4,
    d,
  }));
}

function callouts() {
  const defs = [
    ["Callout box", rect(6, 6, 88, 70)],
    ["Callout with tail", "M 8 10 L 92 10 L 92 72 L 46 72 L 32 90 L 34 72 L 8 72 Z"],
    ["Rounded callout", roundedRect(6, 8, 88, 68, 12)],
    ["Note box", join(rect(6, 8, 88, 68), rect(6, 8, 6, 68))],
    ["Quote callout", join(rect(6, 8, 88, 68), line(16, 24, 82, 24), line(16, 36, 82, 36), line(16, 56, 70, 56))],
    ["Numbered callout", join(circle(22, 22, 14), rect(40, 8, 54, 60))],
    ["Dashed callout", join(rect(6, 8, 88, 68), ...Array.from({ length: 10 }, (_, i) => line(10 + i * 9, 8, 14 + i * 9, 8)))],
    ["Sidebar callout", join(rect(6, 6, 24, 78), line(38, 20, 92, 20), line(38, 32, 92, 32), line(38, 48, 92, 48), line(38, 60, 78, 60))],
    ["Callout flag", "M 6 12 L 70 12 L 94 40 L 70 68 L 6 68 Z"],
    ["Bracket callout", join(line(4, 10, 4, 78), line(4, 10, 14, 10), line(4, 78, 14, 78), line(18, 24, 94, 24), line(18, 40, 94, 40), line(18, 56, 70, 56))],
    ["Callout with corner", join("M 8 8 L 74 8 L 92 26 L 92 76 L 8 76 Z", line(74, 8, 74, 26), line(74, 26, 92, 26))],
    ["Callout stack", join(rect(12, 12, 82, 52), rect(6, 20, 82, 52))],
  ];
  return defs.map(([name, d]) => ({
    subcategory: "Callout boxes",
    name,
    tags: ["callout", "box", "note", "editorial", "layout"],
    ink: "stroke",
    strokeWidth: 1.5,
    aspect: 1.4,
    d,
  }));
}

function infographic() {
  const defs = [
    ["Step circle", join(circle(50, 50, 38), line(36, 50, 64, 50), line(50, 36, 50, 64))],
    ["Process diamond", join(polygon(50, 50, 42, 42, 4), circle(50, 50, 8))],
    ["Arrow block", "M 6 34 L 58 34 L 58 18 L 94 50 L 58 82 L 58 66 L 6 66 Z"],
    ["Chevron block", "M 6 24 L 46 24 L 62 50 L 46 76 L 6 76 L 22 50 Z"],
    ["Step stack", join(rect(8, 60, 26, 30), rect(38, 40, 26, 50), rect(68, 20, 26, 70))],
    ["Pie segment", join(circle(50, 50, 40), "M 50 50 L 50 10", sweep(50, 50, 40, 40, -90, 0), "Z")],
    ["Process flow", join(rect(4, 34, 28, 32), polygon(38, 50, 12, 16, 3, 90), rect(56, 34, 28, 32), polygon(90, 50, 12, 16, 3, 90))],
    ["Circle steps", join(circle(50, 50, 40), circle(50, 50, 26), line(50, 10, 50, 24), line(50, 76, 50, 90), line(10, 50, 24, 50), line(76, 50, 90, 50))],
    ["Funnel", "M 8 14 L 92 14 L 62 50 L 62 86 L 38 74 L 38 50 Z"],
    ["Matrix", join(rect(8, 8, 84, 84), line(36, 8, 36, 92), line(64, 8, 64, 92), line(8, 36, 92, 36), line(8, 64, 92, 64))],
    ["Timeline node", join(line(6, 50, 94, 50), circle(26, 50, 9), circle(50, 50, 9), circle(74, 50, 9))],
    ["Growth bars", join(line(8, 90, 92, 90), rect(16, 56, 14, 34), rect(38, 42, 14, 48), rect(60, 28, 14, 62), rect(82, 14, 14, 76))],
  ];
  return defs.map(([name, d]) => ({
    subcategory: "Infographic shapes",
    name,
    tags: ["infographic", "diagram", "process", "editorial", "chart"],
    ink: name === "Arrow block" || name === "Chevron block" || name === "Funnel" ? "fill" : "stroke",
    strokeWidth: 1.5,
    aspect: 1,
    d,
  }));
}

function timelines() {
  const nodes = (count) =>
    join(line(6, 50, 94, 50), ...Array.from({ length: count }, (_, i) => {
      const x = 12 + (76 / Math.max(1, count - 1)) * i;
      return circle(x, 50, 6);
    }));
  const alternating = (count) =>
    join(line(50, 6, 50, 94), ...Array.from({ length: count }, (_, i) => {
      const y = 14 + (72 / Math.max(1, count - 1)) * i;
      return join(circle(50, y, 5), line(50, y, i % 2 ? 24 : 76, y));
    }));
  const defs = [
    ["Timeline four nodes", nodes(4)],
    ["Timeline six nodes", nodes(6)],
    ["Vertical timeline", alternating(4)],
    ["Timeline with ticks", join(line(6, 50, 94, 50), ...Array.from({ length: 9 }, (_, i) => line(10 + i * 10, 42, 10 + i * 10, 58)))],
    ["Arrow timeline", join(line(6, 50, 84, 50), line(78, 42, 88, 50), line(78, 58, 88, 50), circle(20, 50, 5), circle(48, 50, 5), circle(76, 50, 5))],
    ["Ring timeline", join(circle(50, 50, 38), circle(14, 50, 5), circle(86, 50, 5), circle(50, 86, 5), circle(50, 14, 5))],
    ["Dashed timeline", join(...Array.from({ length: 10 }, (_, i) => line(6 + i * 9.4, 50, 10 + i * 9.4, 50)), circle(50, 50, 7))],
    ["Timeline block", join(rect(6, 42, 88, 16), ...Array.from({ length: 4 }, (_, i) => rect(14 + i * 22, 42, 4, 16)))],
    ["Step timeline", join(...Array.from({ length: 4 }, (_, i) => join(line(12 + i * 24, 70, 24 + i * 24, 70), line(24 + i * 24, 70, 24 + i * 24, 40 + (i % 2) * 12), circle(24 + i * 24, 40 + (i % 2) * 12, 4))))],
    ["Timeline arc", join(arc(50, 100, 44, 62, 200, 340), circle(10, 70, 4), circle(50, 40, 4), circle(90, 70, 4))],
  ];
  return defs.map(([name, d]) => ({
    subcategory: "Timelines",
    name,
    tags: ["timeline", "infographic", "process", "editorial", "diagram"],
    ink: "stroke",
    strokeWidth: 1.6,
    aspect: name === "Vertical timeline" ? 0.8 : 3.4,
    d,
  }));
}

function charts() {
  const bars = (heights) => join(line(8, 92, 92, 92), ...heights.map((h, i) => rect(14 + i * 15, 92 - h, 10, h)));
  const defs = [
    ["Bar chart frame", join(line(8, 8, 8, 92), line(8, 92, 92, 92), bars([26, 40, 34, 58, 46]).replace(/^M[^M]*/, ""))],
    ["Line chart frame", join(line(8, 8, 8, 92), line(8, 92, 92, 92), "M 12 74 L 30 56 L 46 64 L 66 36 L 88 24")],
    ["Area chart frame", join(line(8, 8, 8, 92), line(8, 92, 92, 92), "M 12 78 L 30 60 L 46 68 L 66 40 L 88 28 L 88 92 L 12 92 Z")],
    ["Pie chart frame", join(circle(50, 50, 40), line(50, 50, 50, 10), line(50, 50, 84, 70))],
    ["Donut chart frame", join(circle(50, 50, 40), circle(50, 50, 24), line(50, 50, 90, 50))],
    ["Scatter frame", join(line(8, 8, 8, 92), line(8, 92, 92, 92), circle(24, 70, 4), circle(38, 52, 4), circle(54, 62, 4), circle(68, 36, 4), circle(82, 46, 4))],
    ["Stacked bars", join(line(8, 92, 92, 92), rect(18, 60, 14, 32), rect(18, 40, 14, 20), rect(44, 52, 14, 40), rect(44, 30, 14, 22), rect(70, 66, 14, 26), rect(70, 44, 14, 22))],
    ["Radar chart", join(polygon(50, 50, 40, 40, 6), polygon(50, 50, 26, 26, 6), polygon(50, 50, 12, 12, 6), ...Array.from({ length: 6 }, (_, i) => line(50, 50, 50 + Math.cos((i * 60 * Math.PI) / 180) * 40, 50 + Math.sin((i * 60 * Math.PI) / 180) * 40)))],
    ["Chart axes", join(line(10, 10, 10, 90), line(10, 90, 90, 90), line(10, 10, 16, 10), line(90, 90, 90, 84), ...Array.from({ length: 4 }, (_, i) => line(10, 74 - i * 18, 90, 74 - i * 18)))],
    ["Progress arcs", join(arc(50, 50, 40, 40, 150, 390), arc(50, 50, 30, 30, 150, 320))],
    ["Chart with legend", join(line(8, 8, 8, 92), line(8, 92, 60, 92), rect(66, 20, 8, 8), line(78, 24, 94, 24), rect(66, 40, 8, 8), line(78, 44, 94, 44))],
    ["Sparkline panel", join(rect(6, 10, 88, 80), "M 12 70 L 26 58 L 40 64 L 54 44 L 68 50 L 82 32 L 88 36")],
  ];
  return defs.map(([name, d]) => ({
    subcategory: "Charts & diagram components",
    name,
    tags: ["chart", "data", "editorial", "infographic", "diagram"],
    ink: "stroke",
    strokeWidth: 1.5,
    aspect: name === "Radar chart" || name === "Pie chart frame" || name === "Donut chart frame" ? 1 : 1.2,
    d,
  }));
}

export function editorialAssets() {
  return [
    ...sectionDividers(),
    ...pageNumbers(),
    ...labels(),
    ...badges(),
    ...pullQuotes(),
    ...callouts(),
    ...infographic(),
    ...timelines(),
    ...charts(),
  ];
}
