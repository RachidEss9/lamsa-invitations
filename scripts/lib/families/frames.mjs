import { arc, circle, ellipse, line, mulberry, polygon, rect, roundedRect, star, sweep } from "../paths.mjs";

const join = (...parts) => parts.filter(Boolean).join(" ");

/* -------------------------------------------------------------------------- */
/* Polaroid and instant frames                                                */
/* -------------------------------------------------------------------------- */

function polaroid(radius, bottom, inset) {
  return join(
    roundedRect(10, 10, 80, 80, radius),
    roundedRect(16, 16, 68, 80 - 16 - bottom - inset, radius * 0.6),
  );
}

function polaroids() {
  const defs = [
    ["Polaroid frame", polaroid(0, 16, 2)],
    ["Polaroid, soft corner", polaroid(3, 18, 2)],
    ["Instant frame", polaroid(0, 22, 3)],
    ["Wide instant frame", polaroid(2, 12, 2)],
    ["Square instant frame", join(rect(8, 8, 84, 84), rect(14, 14, 72, 58), line(14, 78, 86, 78))],
    ["Polaroid with caption rule", join(polaroid(0, 18, 2), line(24, 82, 76, 82))],
    ["Double polaroid", join(roundedRect(6, 12, 42, 76, 2), rect(11, 17, 32, 52), roundedRect(52, 12, 42, 76, 2), rect(57, 17, 32, 52))],
    ["Polaroid stack", join(roundedRect(14, 6, 72, 80, 2), roundedRect(8, 14, 72, 80, 2), rect(14, 20, 60, 56))],
  ];
  return defs.map(([name, d]) => ({
    subcategory: "Polaroid frames",
    name,
    tags: ["polaroid", "photo frame", "instant", "picture", "scrapbook"],
    ink: "stroke",
    strokeWidth: 1.6,
    aspect: 0.92,
    d,
  }));
}

/* -------------------------------------------------------------------------- */
/* Arch, circle and oval frames                                               */
/* -------------------------------------------------------------------------- */

function archFrame(x, y, w, h, thickness) {
  const r = w / 2;
  const bottom = y + h;
  return join(
    `M ${x} ${bottom} L ${x} ${y + r}`,
    sweep(x + r, y + r, r, r, 180, 360),
    `L ${x + w} ${bottom}`,
    `M ${x + thickness} ${bottom} L ${x + thickness} ${y + r}`,
    sweep(x + r, y + r, r - thickness, r - thickness, 180, 360),
    `L ${x + w - thickness} ${bottom}`,
  );
}

function archFrames() {
  const defs = [
    ["Arch frame", archFrame(14, 12, 72, 78, 4)],
    ["Fine arch frame", archFrame(10, 8, 80, 84, 1.6)],
    ["Arched photo frame", archFrame(16, 16, 68, 70, 6)],
    ["Pointed arch frame", join(
      "M 14 86 L 14 44 Q 14 16 50 10 Q 86 16 86 44 L 86 86",
      "M 20 86 L 20 46 Q 20 22 50 17 Q 80 22 80 46 L 80 86",
    )],
    ["Horseshoe photo frame", join(
      "M 12 88 L 12 50 C 12 24 28 10 50 10 C 72 10 88 24 88 50 L 88 88",
      "M 18 88 L 18 52 C 18 30 32 16 50 16 C 68 16 82 30 82 52 L 82 88",
    )],
    ["Arch window frame", join(archFrame(10, 10, 80, 80, 3), line(50, 20, 50, 90), line(14, 56, 86, 56))],
    ["Arch mat frame", join(archFrame(8, 8, 84, 84, 6), archFrame(18, 18, 64, 74, 2))],
    ["Tall arch frame", join(
      "M 26 92 L 26 36 C 26 18 38 8 50 8 C 62 8 74 18 74 36 L 74 92",
      "M 32 92 L 32 38 C 32 24 40 15 50 15 C 60 15 68 24 68 38 L 68 92",
    )],
  ];
  return defs.map(([name, d]) => ({
    subcategory: "Arch frames",
    name,
    tags: ["arch", "photo frame", "mask", "portrait", "editorial"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 0.8,
    d,
  }));
}

function circularFrames() {
  const defs = [
    ["Circle frame", circle(50, 50, 45)],
    ["Double circle frame", join(circle(50, 50, 46), circle(50, 50, 40))],
    ["Circle mat frame", join(circle(50, 50, 46), circle(50, 50, 38), circle(50, 50, 30))],
    ["Dashed circle frame", join(circle(50, 50, 44), ...Array.from({ length: 20 }, (_, i) => {
      const angle = (i * 18 * Math.PI) / 180;
      return line(50 + Math.cos(angle) * 38, 50 + Math.sin(angle) * 38, 50 + Math.cos(angle) * 44, 50 + Math.sin(angle) * 44);
    }))],
    ["Scalloped circle frame", join(...Array.from({ length: 16 }, (_, i) => circle(50 + Math.cos((i * 22.5 * Math.PI) / 180) * 42, 50 + Math.sin((i * 22.5 * Math.PI) / 180) * 42, 7)), circle(50, 50, 34))],
    ["Circle with ticks", join(circle(50, 50, 38), ...Array.from({ length: 24 }, (_, i) => {
      const a = (i * 15 * Math.PI) / 180;
      return line(50 + Math.cos(a) * 42, 50 + Math.sin(a) * 42, 50 + Math.cos(a) * 48, 50 + Math.sin(a) * 48);
    }))],
    ["Circle in square", join(rect(8, 8, 84, 84), circle(50, 50, 38))],
    ["Beaded circle frame", join(circle(50, 50, 42), ...Array.from({ length: 24 }, (_, i) => {
      const a = (i * 15 * Math.PI) / 180;
      return circle(50 + Math.cos(a) * 42, 50 + Math.sin(a) * 42, 2.2);
    }))],
  ];
  return defs.map(([name, d]) => ({
    subcategory: "Circular frames",
    name,
    tags: ["circle", "photo frame", "mask", "round", "portrait"],
    ink: "stroke",
    strokeWidth: 1.5,
    aspect: 1,
    d,
  }));
}

function ovalFrames() {
  const defs = [
    ["Oval frame", ellipse(50, 50, 34, 44)],
    ["Double oval frame", join(ellipse(50, 50, 38, 46), ellipse(50, 50, 32, 40))],
    ["Oval mat frame", join(ellipse(50, 50, 40, 46), ellipse(50, 50, 32, 38), ellipse(50, 50, 24, 30))],
    ["Oval with ticks", join(ellipse(50, 50, 36, 44), ...Array.from({ length: 20 }, (_, i) => {
      const a = (i * 18 * Math.PI) / 180;
      return line(50 + Math.cos(a) * 40, 50 + Math.sin(a) * 48, 50 + Math.cos(a) * 44, 50 + Math.sin(a) * 52);
    }))],
    ["Oval and rule", join(ellipse(50, 42, 32, 34), line(20, 84, 80, 84), line(30, 90, 70, 90))],
    ["Vertical oval frame", ellipse(50, 50, 28, 46)],
    ["Dashed oval frame", join(...Array.from({ length: 16 }, (_, i) => sweep(50, 50, 40, 46, i * 22.5, i * 22.5 + 14)), ellipse(50, 50, 32, 38))],
    ["Oval crest frame", join(ellipse(50, 54, 36, 40), star(50, 12, 8, 3.4, 5), line(26, 90, 74, 90))],
  ];
  return defs.map(([name, d]) => ({
    subcategory: "Oval frames",
    name,
    tags: ["oval", "photo frame", "mask", "portrait", "classic"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 0.8,
    d,
  }));
}

/* -------------------------------------------------------------------------- */
/* Collage, film and torn frames                                              */
/* -------------------------------------------------------------------------- */

function collageFrames() {
  const defs = [
    ["Duo collage", join(rect(8, 8, 84, 40), rect(8, 52, 84, 40))],
    ["Side-by-side collage", join(rect(8, 8, 40, 84), rect(52, 8, 40, 84))],
    ["Quad collage", join(rect(8, 8, 40, 40), rect(52, 8, 40, 40), rect(8, 52, 40, 40), rect(52, 52, 40, 40))],
    ["Triptych collage", join(rect(6, 8, 26, 84), rect(37, 8, 26, 84), rect(68, 8, 26, 84))],
    ["Hero collage", join(rect(6, 6, 88, 54), rect(6, 64, 26, 30), rect(37, 64, 26, 30), rect(68, 64, 26, 30))],
    ["Mosaic collage", join(rect(6, 6, 52, 52), rect(62, 6, 32, 24), rect(62, 34, 32, 24), rect(6, 62, 32, 32), rect(42, 62, 52, 32))],
    ["Staggered collage", join(rect(6, 10, 48, 36), rect(46, 10, 48, 36), rect(6, 54, 48, 36), rect(46, 54, 48, 36))],
    ["Feature strip collage", join(rect(6, 6, 88, 62), rect(6, 72, 26, 22), rect(37, 72, 26, 22), rect(68, 72, 26, 22))],
  ];
  return defs.map(([name, d]) => ({
    subcategory: "Collage frames",
    name,
    tags: ["collage", "grid", "photo frame", "album", "layout"],
    ink: "stroke",
    strokeWidth: 1.6,
    aspect: 1,
    d,
  }));
}

function filmFrames() {
  const sprockets = (y) =>
    Array.from({ length: 7 }, (_, i) => roundedRect(6 + i * 13.5, y, 7, 7, 1.5)).join(" ");
  const defs = [
    ["Film strip", join(rect(2, 20, 96, 60), rect(10, 30, 80, 40), sprockets(24), sprockets(69))],
    ["35 mm strip", join(rect(2, 14, 96, 72), rect(8, 24, 84, 52), ...Array.from({ length: 6 }, (_, i) => rect(10 + i * 14, 16, 6, 6)), ...Array.from({ length: 6 }, (_, i) => rect(10 + i * 14, 78, 6, 6)))],
    ["Three-frame strip", join(rect(2, 18, 96, 64), rect(6, 28, 26, 44), rect(37, 28, 26, 44), rect(68, 28, 26, 44), ...Array.from({ length: 7 }, (_, i) => rect(6 + i * 13.5, 21, 6, 5)), ...Array.from({ length: 7 }, (_, i) => rect(6 + i * 13.5, 74, 6, 5)))],
    ["Vertical film strip", join(rect(18, 2, 64, 96), rect(28, 8, 44, 84), ...Array.from({ length: 6 }, (_, i) => rect(21, 10 + i * 14, 5, 6)), ...Array.from({ length: 6 }, (_, i) => rect(74, 10 + i * 14, 5, 6)))],
    ["Film frame", join(roundedRect(6, 6, 88, 88, 4), roundedRect(12, 12, 76, 76, 2), ...Array.from({ length: 5 }, (_, i) => rect(12 + i * 16, 2, 8, 6)), ...Array.from({ length: 5 }, (_, i) => rect(12 + i * 16, 92, 8, 6)))],
    ["Contact sheet", join(rect(4, 4, 92, 92), ...Array.from({ length: 9 }, (_, i) => rect(8 + (i % 3) * 29, 8 + Math.floor(i / 3) * 29, 25, 25)))],
    ["Negative strip", join(rect(2, 26, 96, 48), rect(6, 34, 88, 32), ...Array.from({ length: 8 }, (_, i) => line(10 + i * 11, 30, 10 + i * 11, 38)), ...Array.from({ length: 8 }, (_, i) => line(10 + i * 11, 62, 10 + i * 11, 70)))],
    ["Panorama film", join(rect(2, 34, 96, 32), rect(6, 38, 88, 24), ...Array.from({ length: 9 }, (_, i) => rect(8 + i * 10, 35, 5, 4)), ...Array.from({ length: 9 }, (_, i) => rect(8 + i * 10, 61, 5, 4)))],
  ];
  return defs.map(([name, d]) => ({
    subcategory: "Film strips",
    name,
    tags: ["film", "strip", "photo frame", "cinema", "analogue"],
    ink: "stroke",
    strokeWidth: 1.3,
    aspect: name.startsWith("Vertical") ? 0.7 : 2.6,
    d,
  }));
}

function tornEdge(seed) {
  const random = mulberry(seed);
  const top = [];
  const right = [];
  const bottom = [];
  const left = [];
  const steps = 8;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    top.push([6 + t * 88, 6 + (random() - 0.5) * 7]);
    bottom.push([6 + t * 88, 94 + (random() - 0.5) * 7]);
    left.push([6 + (random() - 0.5) * 7, 6 + t * 88]);
    right.push([94 + (random() - 0.5) * 7, 6 + t * 88]);
  }
  const poly = (points) => points.map(([x, y], i) => `${i ? "L" : "M"} ${Math.round(x * 100) / 100} ${Math.round(y * 100) / 100}`).join(" ");
  return join(`${poly(top)} ${poly(right)} ${poly(bottom)} ${poly(left)} Z`, "M 14 14 L 86 14 L 86 86 L 14 86 Z");
}

function tornFrames() {
  const defs = [
    ["Torn paper frame", tornEdge(3)],
    ["Torn paper frame, wide", tornEdge(11)],
    ["Torn note frame", tornEdge(23)],
    ["Torn strip frame", tornEdge(37)],
    ["Torn edge, single", tornEdge(53)],
    ["Torn paper with rule", join(tornEdge(71), line(22, 88, 78, 88))],
    ["Deckled edge frame", join("M 8 12 L 92 8 L 88 92 L 12 88 Z", "M 16 20 L 84 16 L 80 84 L 20 80 Z")],
    ["Rough mat frame", join(tornEdge(97), tornEdge(101))],
  ];
  return defs.map(([name, d]) => ({
    subcategory: "Torn-paper frames",
    name,
    tags: ["torn paper", "texture", "photo frame", "collage", "handmade"],
    ink: "stroke",
    strokeWidth: 1.5,
    aspect: 1,
    d,
  }));
}

function masks() {
  const defs = [
    ["Arch mask", join(archFrame(4, 4, 92, 92, 2), line(4, 96, 96, 96))],
    ["Scallop mask", join(rect(6, 50, 88, 44), ...Array.from({ length: 5 }, (_, i) => arc(15 + i * 17.5, 50, 10, 10, 180, 360)))],
    ["Hexagon mask", polygon(50, 50, 46, 46, 6)],
    ["Shield mask", "M 12 12 L 88 12 L 88 60 C 88 78 70 88 50 94 C 30 88 12 78 12 60 Z"],
    ["Ticket mask", join(rect(4, 22, 92, 56), arc(4, 50, 8, 8, 90, 270), arc(96, 50, 8, 8, 270, 90))],
    ["Tag mask", "M 14 14 L 72 14 L 94 50 L 72 86 L 14 86 Z"],
    ["Capsule mask", roundedRect(10, 24, 80, 52, 26)],
    ["Petal mask", join(circle(34, 34, 22), circle(66, 34, 22), circle(34, 66, 22), circle(66, 66, 22))],
    ["Bracket mask", "M 6 24 L 6 6 L 94 6 L 94 24 L 94 76 L 94 94 L 6 94 L 6 76 L 6 24 Z"],
    ["Ogee mask", join(sweep(50, 92, 44, 70, 180, 360), line(6, 92, 94, 92))],
  ];
  return defs.map(([name, d]) => ({
    subcategory: "Decorative photo masks",
    name,
    tags: ["mask", "photo", "crop shape", "frame", "decorative"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: name === "Tag mask" ? 1.1 : 1,
    d,
  }));
}

export function frameAssets() {
  return [
    ...polaroids(),
    ...archFrames(),
    ...circularFrames(),
    ...ovalFrames(),
    ...collageFrames(),
    ...filmFrames(),
    ...tornFrames(),
    ...masks(),
  ];
}
