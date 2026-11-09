import {
  arc,
  blob,
  circle,
  ellipse,
  leaf,
  line,
  mulberry,
  petal,
  polygon,
  rect,
  round,
  roundedRect,
  star,
  sweep,
  wave,
} from "../paths.mjs";

const join = (...parts) => parts.filter(Boolean).join(" ");
const polar = (cx, cy, r, angle) => [
  cx + Math.cos((angle * Math.PI) / 180) * r,
  cy + Math.sin((angle * Math.PI) / 180) * r,
];

/* -------------------------------------------------------------------------- */
/* Arches                                                                     */
/* -------------------------------------------------------------------------- */

function archPath(style, w, h) {
  const half = w / 2;
  const baseY = 96;
  const topY = 100 - h;
  const shoulder = topY + (style === "keyhole" ? h * 0.34 : h * 0.42);
  const cx = 50;
  switch (style) {
    case "pointed":
    case "lancet": {
      const apex = style === "lancet" ? topY : topY + h * 0.02;
      return join(
        `M ${round(cx - half)} ${baseY}`,
        `L ${round(cx - half)} ${round(shoulder)}`,
        `Q ${round(cx - half)} ${round(apex + h * 0.1)} ${cx} ${round(apex)}`,
        `Q ${round(cx + half)} ${round(apex + h * 0.1)} ${round(cx + half)} ${round(shoulder)}`,
        `L ${round(cx + half)} ${baseY}`,
      );
    }
    case "horseshoe": {
      const rise = h * 0.5;
      return join(
        `M ${round(cx - half)} ${baseY}`,
        `L ${round(cx - half)} ${round(baseY - rise * 0.35)}`,
        sweep(cx, baseY - rise * 0.55, half, rise * 0.75, 155, 385),
        `L ${round(cx + half)} ${baseY}`,
      );
    }
    case "keyhole": {
      const radius = w * 0.36;
      return join(
        `M ${round(cx - half)} ${baseY}`,
        `L ${round(cx - radius)} ${round(baseY - h * 0.36)}`,
        circle(cx, topY + radius, radius),
        `L ${round(cx + radius)} ${round(baseY - h * 0.36)}`,
        `L ${round(cx + half)} ${baseY}`,
      );
    }
    case "tudor": {
      const apex = topY + h * 0.08;
      return join(
        `M ${round(cx - half)} ${baseY}`,
        `L ${round(cx - half)} ${round(topY + h * 0.3)}`,
        `C ${round(cx - half)} ${round(apex + h * 0.12)} ${round(cx - half * 0.35)} ${round(apex)} ${cx} ${round(apex)}`,
        `C ${round(cx + half * 0.35)} ${round(apex)} ${round(cx + half)} ${round(apex + h * 0.12)} ${round(cx + half)} ${round(topY + h * 0.3)}`,
        `L ${round(cx + half)} ${baseY}`,
      );
    }
    case "scalloped": {
      const r = w / 6;
      const base = topY + h * 0.34;
      return join(
        `M ${round(cx - half)} ${baseY}`,
        `L ${round(cx - half)} ${round(base)}`,
        arc(cx - half + r, base, r, r, 180, 360),
        arc(cx, base, r, r, 180, 360),
        arc(cx + half - r, base, r, r, 180, 360),
        `L ${round(cx + half)} ${baseY}`,
      );
    }
    case "ogee": {
      const apex = topY;
      return join(
        `M ${round(cx - half)} ${baseY}`,
        `L ${round(cx - half)} ${round(shoulder)}`,
        `C ${round(cx - half)} ${round(apex + h * 0.18)} ${round(cx - half * 0.55)} ${round(apex + h * 0.3)} ${cx} ${round(apex)}`,
        `C ${round(cx + half * 0.55)} ${round(apex + h * 0.3)} ${round(cx + half)} ${round(apex + h * 0.18)} ${round(cx + half)} ${round(shoulder)}`,
        `L ${round(cx + half)} ${baseY}`,
      );
    }
    case "segmental":
      return join(
        `M ${round(cx - half)} ${baseY}`,
        `L ${round(cx - half)} ${round(topY + h * 0.42)}`,
        sweep(cx, topY + h * 0.42, half, -h * 0.32, 180, 360),
        `L ${round(cx + half)} ${baseY}`,
      );
    case "chapel":
      return join(
        `M ${round(cx - half)} ${baseY}`,
        `L ${round(cx - half)} ${round(topY + h * 0.24)}`,
        sweep(cx, topY + h * 0.24, half, half, 180, 360),
        `L ${round(cx + half)} ${baseY}`,
      );
    case "flat-round":
      return join(
        `M ${round(cx - half)} ${baseY}`,
        `L ${round(cx - half)} ${round(topY + h * 0.2)}`,
        `C ${round(cx - half)} ${round(topY + h * 0.05)} ${round(cx - half * 0.6)} ${topY} ${cx} ${topY}`,
        `C ${round(cx + half * 0.6)} ${topY} ${round(cx + half)} ${round(topY + h * 0.05)} ${round(cx + half)} ${round(topY + h * 0.2)}`,
        `L ${round(cx + half)} ${baseY}`,
      );
    case "round":
    default:
      return join(
        `M ${round(cx - half)} ${baseY}`,
        `L ${round(cx - half)} ${round(topY + half)}`,
        sweep(cx, topY + half, half, half, 180, 360),
        `L ${round(cx + half)} ${baseY}`,
      );
  }
}

/* -------------------------------------------------------------------------- */
/* Builders                                                                   */
/* -------------------------------------------------------------------------- */

function geometric() {
  const solids = [
    ["Triangle", 3, 0],
    ["Diamond", 4, -90],
    ["Pentagon", 5, -90],
    ["Hexagon", 6, -90],
    ["Heptagon", 7, -90],
    ["Octagon", 8, 22.5],
    ["Nonagon", 9, -90],
    ["Decagon", 10, -90],
  ];
  const stars = [
    ["Five-point star", 5, 0.42],
    ["Six-point star", 6, 0.58],
    ["Seven-point star", 7, 0.5],
    ["Eight-point star", 8, 0.62],
    ["Twelve-point star", 12, 0.78],
    ["Sixteen-point star", 16, 0.84],
  ];
  return [
    ...solids.map(([name, sides], index) => ({
      subcategory: "Geometric",
      name,
      tags: ["geometric", "solid", `${sides} sides`, "shape"],
      ink: "fill",
      aspect: 1,
      d: polygon(50, 50, 42 - index * 0.7, 40 - index * 0.6, sides, -90),
    })),
    ...stars.map(([name, points, ratio], index) => ({
      subcategory: "Geometric",
      name,
      tags: ["star", "geometry", "celestial", name.split("-")[0].toLowerCase()],
      ink: "fill",
      aspect: 1,
      d: star(50, 50, 44 - index * 1.4, (44 - index * 1.4) * ratio, points),
    })),
    {
      subcategory: "Geometric",
      name: "Rosette twelve",
      tags: ["rosette", "ornament", "geometry", "outline"],
      ink: "stroke",
      strokeWidth: 1.4,
      aspect: 1,
      d: join(
        circle(50, 50, 42),
        star(50, 50, 38, 24, 12),
        circle(50, 50, 15),
      ),
    },
    {
      subcategory: "Geometric",
      name: "Hex lattice",
      tags: ["hexagon", "lattice", "pattern", "outline"],
      ink: "stroke",
      strokeWidth: 1.2,
      aspect: 1,
      d: join(
        polygon(50, 28, 17, 17, 6, -90),
        polygon(31, 62, 17, 17, 6, -90),
        polygon(69, 62, 17, 17, 6, -90),
      ),
    },
    {
      subcategory: "Geometric",
      name: "Interlocking squares",
      tags: ["square", "geometry", "abstract", "outline"],
      ink: "stroke",
      strokeWidth: 1.3,
      aspect: 1,
      d: join(
        rect(18, 18, 46, 46),
        rect(36, 36, 46, 46),
        rect(27, 27, 46, 46),
      ),
    },
    {
      subcategory: "Geometric",
      name: "Quatrefoil tile",
      tags: ["quatrefoil", "tile", "moroccan", "outline"],
      ink: "stroke",
      strokeWidth: 1.3,
      aspect: 1,
      d: join(
        circle(39, 39, 19),
        circle(61, 39, 19),
        circle(39, 61, 19),
        circle(61, 61, 19),
        rect(20, 20, 60, 60),
      ),
    },
  ];
}

function organic() {
  const names = [
    "Pebble",
    "Lagoon",
    "Dune",
    "Moss",
    "Ember",
    "Riverstone",
    "Bloom shadow",
    "Cloud form",
    "Clay",
    "Tide pool",
    "Almond",
    "Terra",
    "Willow form",
    "Honey drop",
  ];
  const seeds = [11, 29, 47, 61, 83, 97, 113, 131, 149, 167, 181, 199, 223, 241];
  return names.map((name, index) => ({
    subcategory: "Organic",
    name,
    tags: ["organic", "blob", "modern", "silhouette"],
    ink: index % 4 === 3 ? "stroke" : "fill",
    strokeWidth: 1.8,
    aspect: 1,
    d: blob(50, 50, 34 + (index % 3) * 3, 10, 0.16 + (index % 4) * 0.05, seeds[index]),
  }));
}

function abstractForms() {
  const defs = [
    ["Orbit rings", join(circle(50, 50, 42), circle(50, 50, 29), circle(50, 50, 16))],
    ["Eclipse", join(circle(50, 50, 41), circle(50, 50, 30))],
    ["Half-moon stack", join(arc(50, 62, 38, 24, 180, 360), arc(50, 70, 26, 16, 180, 360), line(12, 62, 88, 62))],
    ["Quarter fans", join(arc(50, 50, 42, 42, 180, 360), arc(50, 50, 30, 30, 200, 340), arc(50, 50, 18, 18, 220, 320))],
    ["Aperture", join(circle(50, 50, 42), star(50, 50, 38, 12, 8))],
    ["Ripple field", join(arc(50, 70, 50, 34, 200, 340), arc(50, 70, 40, 26, 200, 340), arc(50, 70, 30, 18, 200, 340), arc(50, 70, 20, 10, 200, 340))],
    ["Offset discs", join(circle(37, 42, 25), circle(62, 58, 25))],
    ["Arch rhythm", join(arc(25, 72, 14, 34, 180, 360), arc(50, 72, 14, 48, 180, 360), arc(75, 72, 14, 34, 180, 360))],
    ["Quadrant", join(line(15, 85, 85, 15), line(15, 15, 85, 85), circle(50, 50, 35))],
    ["Echo arcs", join(arc(10, 50, 40, 40, -90, 90), arc(10, 50, 28, 28, -90, 90), arc(10, 50, 16, 16, -90, 90))],
    ["Crescent field", join(circle(42, 50, 34), circle(56, 50, 34))],
    ["Meridian", join(circle(50, 50, 42), ellipse(50, 50, 16, 42), line(8, 50, 92, 50))],
    ["Comet", join(circle(64, 40, 17), arc(64, 40, 30, 30, 120, 300), arc(64, 40, 42, 42, 130, 290))],
    ["Constellation", join(circle(24, 30, 6), circle(52, 46, 4), circle(74, 26, 5), circle(66, 70, 6), line(24, 30, 52, 46), line(52, 46, 74, 26), line(52, 46, 66, 70))],
  ];
  return defs.map(([name, d], index) => ({
    subcategory: "Abstract",
    name,
    tags: ["abstract", "modern", "geometric", "line art"],
    ink: index === 6 || index === 10 ? "fill" : "stroke",
    strokeWidth: 1.6,
    aspect: 1,
    d,
  }));
}

function arches() {
  const styles = [
    ["Round", "round"],
    ["Pointed", "pointed"],
    ["Horseshoe", "horseshoe"],
    ["Keyhole", "keyhole"],
    ["Tudor", "tudor"],
    ["Scalloped", "scalloped"],
    ["Ogee", "ogee"],
    ["Segmental", "segmental"],
    ["Chapel", "chapel"],
    ["Arched top", "flat-round"],
    ["Lancet", "lancet"],
  ];
  const assets = [];
  styles.forEach(([label, style], index) => {
    const widths = [58, 72];
    widths.forEach((w, widthIndex) => {
      const h = widthIndex === 0 ? 74 : 58;
      assets.push({
        subcategory: "Arches",
        name: `${label} arch${widthIndex ? ", wide" : ""}`,
        tags: ["arch", "frame", "window", style, "architecture"],
        ink: "stroke",
        strokeWidth: widthIndex ? 2.2 : 1.6,
        aspect: w / h,
        d: archPath(style, w, h),
      });
    });
  });
  return assets;
}

function waves() {
  const defs = [
    ["Single swell", wave(50, 16, 1)],
    ["Double swell", join(wave(38, 10, 1), wave(58, 10, 1))],
    ["Triple tide", join(wave(32, 8, 1), wave(50, 8, 1), wave(68, 8, 1))],
    ["Crest", wave(50, 22, 1, Math.PI / 3)],
    ["Current", wave(50, 14, 2)],
    ["Ripple", wave(50, 10, 3)],
    ["Serpentine", wave(50, 18, 1.5)],
    ["Breaker", join(wave(42, 14, 1.5), wave(60, 8, 1.5, Math.PI))],
    ["Drift", join(wave(34, 6, 2), wave(50, 6, 2), wave(66, 6, 2))],
    ["Seigaiha", join(...Array.from({ length: 4 }, (_, row) => Array.from({ length: 4 }, (_, col) => arc(14 + col * 24 + (row % 2) * 12, 30 + row * 20, 16, 16, 180, 360)).join(" ")))],
    ["Undulate", wave(50, 26, 1)],
    ["Surf band", join(wave(46, 12, 2, 0), wave(54, 12, 2, Math.PI))],
    ["Ebb", join(wave(40, 18, 1), line(4, 70, 96, 70))],
    ["Flow lines", join(wave(30, 7, 2), wave(43, 7, 2), wave(56, 7, 2), wave(69, 7, 2))],
  ];
  return defs.map(([name, d]) => ({
    subcategory: "Waves",
    name,
    tags: ["wave", "water", "flow", "line art"],
    ink: "stroke",
    strokeWidth: 1.7,
    aspect: name === "Seigaiha" ? 1 : 2.6,
    d,
  }));
}

function rings() {
  const defs = [];
  const add = (name, d, tags, aspect = 1, ink = "stroke", strokeWidth = 1.6) =>
    defs.push({ subcategory: "Circles & rings", name, tags: ["circle", "ring", ...tags], ink, strokeWidth, aspect, d });

  add("Halo", circle(50, 50, 43), ["halo", "fine"]);
  add("Double halo", join(circle(50, 50, 44), circle(50, 50, 36)), ["double", "frame"]);
  add("Triple halo", join(circle(50, 50, 44), circle(50, 50, 35), circle(50, 50, 26)), ["triple", "frame"]);
  add("Fine ring", circle(50, 50, 46), ["fine", "minimal"], 1, "stroke", 0.9);
  add("Bold ring", circle(50, 50, 38), ["bold", "stamp"], 1, "stroke", 4.5);
  add("Dotted ring", Array.from({ length: 24 }, (_, i) => {
    const [x, y] = polar(50, 50, 42, (i / 24) * 360);
    return circle(x, y, 1.9);
  }).join(" "), ["dotted", "round"], 1, "fill");
  add("Tick ring", Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * 360;
    const [x1, y1] = polar(50, 50, 39, a);
    const [x2, y2] = polar(50, 50, 45, a);
    return line(x1, y1, x2, y2);
  }).join(" "), ["ticks", "clock"]);
  add("Segmented ring", Array.from({ length: 8 }, (_, i) => arc(50, 50, 42, 42, i * 45 + 4, i * 45 + 38)).join(" "), ["segments", "decorative"], 1, "stroke", 2.4);
  add("Orbit", join(circle(50, 50, 40), ellipse(50, 50, 47, 20)), ["orbit", "planet"]);
  add("Ring with cardinal dots", join(circle(50, 50, 42), circle(50, 8, 2.6), circle(50, 92, 2.6), circle(8, 50, 2.6), circle(92, 50, 2.6)), ["dots", "compass"], 1, "stroke", 1.4);
  add("Concentric sun", join(circle(50, 50, 44), circle(50, 50, 30), circle(50, 50, 16), circle(50, 50, 5)), ["sun", "concentric"], 1, "stroke", 1.2);
  add("Broken arc", join(arc(50, 50, 42, 42, 20, 160), arc(50, 50, 42, 42, 200, 340)), ["arc", "open"], 1, "stroke", 2.6);
  add("Ripple rings", join(circle(50, 50, 44), arc(50, 50, 32, 32, 180, 360), arc(50, 50, 20, 20, 0, 180)), ["ripple", "decorative"]);
  add("Dotted orbit", join(circle(50, 50, 38), ...Array.from({ length: 12 }, (_, i) => {
    const [x, y] = polar(50, 50, 46, i * 30);
    return circle(x, y, 2);
  })), ["orbit", "dotted"], 1, "stroke", 1.2);
  add("Rosette ring", join(circle(50, 50, 43), ...Array.from({ length: 16 }, (_, i) => {
    const [x, y] = polar(50, 50, 43, i * 22.5);
    return circle(x, y, 3.4);
  })), ["rosette", "ornament"], 1, "stroke", 1.2);
  add("Solid disc", circle(50, 50, 40), ["disc", "solid"], 1, "fill", 0);
  add("Half disc", arc(50, 50, 40, 40, 180, 360), ["semicircle", "solid"], 1, "fill", 0);
  add("Ring of leaves", join(circle(50, 50, 40), ...Array.from({ length: 10 }, (_, i) => leaf(50, 18, 11, 4.5, i * 36 + 90))), ["laurel", "botanical"]);
  return defs;
}

function rules() {
  const defs = [
    ["Hairline rule", line(4, 50, 96, 50), 0.8],
    ["Medium rule", line(2, 50, 98, 50), 1.8],
    ["Heavy rule", line(6, 50, 94, 50), 3.4],
    ["Double rule", join(line(3, 46, 97, 46), line(3, 54, 97, 54)), 1.2],
    ["Triple rule", join(line(3, 43, 97, 43), line(3, 50, 97, 50), line(3, 57, 97, 57)), 1],
    ["Dashed rule", join(...Array.from({ length: 11 }, (_, i) => line(3 + i * 9, 50, 3 + i * 9 + 5, 50))), 1.8],
    ["Dotted rule", join(...Array.from({ length: 21 }, (_, i) => line(4 + i * 4.6, 50, 4.6 + i * 4.6, 50))), 3],
    ["Long dash rule", join(...Array.from({ length: 5 }, (_, i) => line(3 + i * 19, 50, 3 + i * 19 + 12, 50))), 2.2],
    ["Zigzag rule", join(...Array.from({ length: 16 }, (_, i) => line(3 + i * 6, i % 2 ? 44 : 56, 9 + i * 6, i % 2 ? 56 : 44))), 1.4],
    ["Tapered rule", "M 3 50 Q 50 42 97 50 Q 50 58 3 50 Z", 0],
    ["Centre tick rule", join(line(3, 50, 44, 50), line(56, 50, 97, 50), line(50, 44, 50, 56)), 1.6],
    ["Diamond rule", join(line(3, 50, 43, 50), line(57, 50, 97, 50), polygon(50, 50, 7, 7, 4)), 1.6],
    ["Wave rule", wave(50, 9, 1.5), 1.8],
    ["Split rule", join(line(3, 46, 97, 46), line(3, 54, 97, 54), circle(50, 50, 4)), 1],
  ];
  return defs.map(([name, d, strokeWidth]) => ({
    subcategory: "Decorative lines",
    name,
    tags: ["line", "rule", "divider", "editorial"],
    ink: name === "Tapered rule" ? "fill" : "stroke",
    strokeWidth,
    aspect: 4.8,
    d,
  }));
}

function borders() {
  const edgeTicks = (count, inset, length) =>
    Array.from({ length: count }, (_, i) => {
      const x = inset + ((100 - inset * 2) / (count - 1)) * i;
      return join(line(x, inset, x, inset + length), line(x, 100 - inset, x, 100 - inset - length));
    }).join(" ");
  const sideTicks = (count, inset, length) =>
    Array.from({ length: count }, (_, i) => {
      const y = inset + ((100 - inset * 2) / (count - 1)) * i;
      return join(line(inset, y, inset + length, y), line(100 - inset, y, 100 - inset - length, y));
    }).join(" ");
  const defs = [
    ["Hairline border", rect(6, 6, 88, 88), 0.8, 0.72],
    ["Double border", join(rect(5, 5, 90, 90), rect(10, 10, 80, 80)), 1.1, 0.72],
    ["Triple border", join(rect(4, 4, 92, 92), rect(8, 8, 84, 84), rect(12, 12, 76, 76)), 1, 0.72],
    ["Dashed border", join(...Array.from({ length: 24 }, (_, i) => {
      const t = i / 24;
      const x = 5 + t * 90;
      return i % 2 === 0 ? line(x, 5, x + 2, 5) : "";
    }), rect(5, 5, 90, 90)), 1.4, 0.72],
    ["Dotted border", join(rect(6, 6, 88, 88), ...Array.from({ length: 19 }, (_, i) => circle(6 + i * 4.9, 6, 1.1)), ...Array.from({ length: 19 }, (_, i) => circle(6 + i * 4.9, 94, 1.1))), 1, 0.72],
    ["Corner ticks", join(rect(6, 6, 88, 88), edgeTicks(9, 6, 5), sideTicks(9, 6, 5)), 1.2, 0.72],
    ["Corner squares", join(rect(6, 6, 88, 88), rect(3, 3, 8, 8), rect(89, 3, 8, 8), rect(3, 89, 8, 8), rect(89, 89, 8, 8)), 1, 0.72],
    ["Corner diamonds", join(rect(6, 6, 88, 88), polygon(6, 6, 5, 5, 4), polygon(94, 6, 5, 5, 4), polygon(6, 94, 5, 5, 4), polygon(94, 94, 5, 5, 4)), 1, 0.72],
    ["Chain border", join(rect(6, 6, 88, 88), ...Array.from({ length: 14 }, (_, i) => circle(10 + i * 6, 6, 2.2)), ...Array.from({ length: 14 }, (_, i) => circle(10 + i * 6, 94, 2.2))), 1, 0.72],
    ["Sawtooth border", join(rect(6, 6, 88, 88), ...Array.from({ length: 15 }, (_, i) => line(6 + i * 6, 6, 9 + i * 6, 12)), ...Array.from({ length: 15 }, (_, i) => line(6 + i * 6, 94, 9 + i * 6, 88))), 1.1, 0.72],
    ["Step corners", join(rect(6, 6, 88, 88), line(16, 6, 16, 16), line(6, 16, 16, 16), line(84, 6, 84, 16), line(84, 16, 94, 16), line(16, 94, 16, 84), line(6, 84, 16, 84), line(84, 94, 84, 84), line(84, 84, 94, 84)), 1.1, 0.72],
    ["Stitch border", join(rect(5, 5, 90, 90), ...Array.from({ length: 30 }, (_, i) => line(8 + i * 3, 9, 10 + i * 3, 9))), 0.9, 0.72],
    ["Mosaic border", join(rect(5, 5, 90, 90), rect(9, 9, 82, 82), ...Array.from({ length: 12 }, (_, i) => line(11 + i * 7, 9, 11 + i * 7, 13))), 1, 0.72],
    ["Bracket border", join(line(6, 26, 6, 6), line(6, 6, 26, 6), line(74, 6, 94, 6), line(94, 6, 94, 26), line(6, 74, 6, 94), line(6, 94, 26, 94), line(74, 94, 94, 94), line(94, 74, 94, 94)), 1.3, 0.72],
  ];
  return defs.map(([name, d, strokeWidth, aspect]) => ({
    subcategory: "Borders",
    name,
    tags: ["border", "page", "frame", "print"],
    ink: "stroke",
    strokeWidth,
    aspect,
    d,
  }));
}

function frames() {
  const defs = [
    ["Soft rectangle", roundedRect(8, 8, 84, 84, 10), 1.4],
    ["Pill frame", roundedRect(8, 26, 84, 48, 24), 1.4],
    ["Squared frame", rect(8, 8, 84, 84), 1.2],
    ["Inset frame", join(rect(7, 7, 86, 86), rect(12, 12, 76, 76)), 1],
    ["Triple inset frame", join(rect(6, 6, 88, 88), rect(10, 10, 80, 80), rect(14, 14, 72, 72)), 0.9],
    ["Ticket frame", join(rect(6, 12, 88, 76), arc(6, 50, 6, 6, 90, 270), arc(94, 50, 6, 6, 270, 90)), 1.2],
    ["Cut-corner frame", join("M 22 8 L 78 8 L 92 22 L 92 78 L 78 92 L 22 92 L 8 78 L 8 22 Z"), 1.3],
    ["Octagon frame", polygon(50, 50, 44, 44, 8, 22.5), 1.3],
    ["Arch window", archPath("round", 72, 80), 1.6],
    ["Horseshoe window", archPath("horseshoe", 66, 78), 1.6],
    ["Scalloped frame", join(roundedRect(8, 8, 84, 84, 6), ...Array.from({ length: 7 }, (_, i) => arc(20 + i * 10, 8, 5, 5, 180, 360))), 1.1],
    ["Corner notch frame", join("M 14 8 L 86 8 L 86 14 L 92 14 L 92 86 L 86 86 L 86 92 L 14 92 L 14 86 L 8 86 L 8 14 L 14 14 Z"), 1.2],
    ["Bracket frame", join(line(8, 32, 8, 8), line(8, 8, 32, 8), line(68, 8, 92, 8), line(92, 8, 92, 32), line(8, 68, 8, 92), line(8, 92, 32, 92), line(68, 92, 92, 92), line(92, 68, 92, 92), rect(22, 22, 56, 56)), 1.2],
    ["Scallop-edge keyline", join(rect(16, 16, 68, 68), ...Array.from({ length: 5 }, (_, i) => arc(24 + i * 13, 16, 6.5, 6.5, 180, 360)), ...Array.from({ length: 5 }, (_, i) => arc(24 + i * 13, 84, 6.5, 6.5, 0, 180))), 1],
  ];
  return defs.map(([name, d, strokeWidth]) => ({
    subcategory: "Frames",
    name,
    tags: ["frame", "keyline", "print", "border"],
    ink: "stroke",
    strokeWidth,
    aspect: 0.72,
    d,
  }));
}

function dividers() {
  const defs = [
    ["Diamond divider", join(line(4, 50, 42, 50), line(58, 50, 96, 50), polygon(50, 50, 7, 7, 4))],
    ["Star divider", join(line(4, 50, 41, 50), line(59, 50, 96, 50), star(50, 50, 8, 3.4, 6))],
    ["Dot trio divider", join(line(4, 50, 38, 50), line(62, 50, 96, 50), circle(44, 50, 2.4), circle(50, 50, 3.2), circle(56, 50, 2.4))],
    ["Leaf pair divider", join(line(4, 50, 36, 50), line(64, 50, 96, 50), leaf(50, 50, 16, 5, 200), leaf(50, 50, 16, 5, -20))],
    ["Fleur divider", join(line(4, 50, 40, 50), line(60, 50, 96, 50), petal(50, 50, 14, 6, -90), petal(50, 50, 12, 5, 20), petal(50, 50, 12, 5, 160))],
    ["Ring divider", join(line(4, 50, 40, 50), line(60, 50, 96, 50), circle(50, 50, 7), circle(50, 50, 2))],
    ["Chevron divider", join(line(4, 50, 40, 50), line(60, 50, 96, 50), line(44, 44, 50, 50), line(50, 50, 44, 56), line(56, 44, 50, 50), line(50, 50, 56, 56))],
    ["Scallop divider", join(line(4, 50, 34, 50), line(66, 50, 96, 50), circle(41, 50, 5), circle(50, 50, 7), circle(59, 50, 5))],
    ["Cross divider", join(line(4, 50, 39, 50), line(61, 50, 96, 50), line(50, 37, 50, 63), line(44, 50, 56, 50))],
    ["Bar divider", join(line(4, 50, 38, 50), line(62, 50, 96, 50), rect(45, 46, 10, 8))],
    ["Taper divider", join(line(4, 50, 32, 50), "M 34 50 Q 50 42 66 50 Q 50 58 34 50 Z", line(68, 50, 96, 50))],
    ["Arch divider", join(line(4, 54, 36, 54), line(64, 54, 96, 54), arc(50, 54, 12, 16, 180, 360))],
    ["Double rule divider", join(line(4, 44, 96, 44), line(4, 56, 96, 56), circle(50, 50, 3.4))],
    ["Dot line divider", join(...Array.from({ length: 21 }, (_, i) => line(2 + i * 4.8, 50, 2.4 + i * 4.8, 50)), circle(50, 50, 4.4))],
    ["Laurel divider", join(line(4, 50, 33, 50), line(67, 50, 96, 50), leaf(44, 50, 12, 4, 210), leaf(44, 50, 12, 4, 150), leaf(56, 50, 12, 4, 30), leaf(56, 50, 12, 4, -30))],
    ["Sunburst divider", join(line(4, 50, 34, 50), line(66, 50, 96, 50), ...Array.from({ length: 9 }, (_, i) => line(50, 50, 50 + Math.cos(((i * 20 - 80) * Math.PI) / 180) * 10, 50 + Math.sin(((i * 20 - 80) * Math.PI) / 180) * 10)))],
    ["Triple diamond divider", join(line(4, 50, 30, 50), line(70, 50, 96, 50), polygon(40, 50, 4, 4, 4), polygon(50, 50, 6, 6, 4), polygon(60, 50, 4, 4, 4))],
    ["Rope divider", join(line(4, 50, 96, 50), ...Array.from({ length: 16 }, (_, i) => arc(8 + i * 5.6, 50, 4, 4, 200, 340)))],
  ];
  return defs.map(([name, d]) => ({
    subcategory: "Dividers",
    name,
    tags: ["divider", "rule", "editorial", "ornament"],
    ink: name.startsWith("Dot line") ? "fill" : "stroke",
    strokeWidth: 1.5,
    aspect: 3.8,
    d,
  }));
}

function patterns() {
  const dots = (gap, r) =>
    Array.from({ length: Math.floor(100 / gap) + 1 }, (_, ix) =>
      Array.from({ length: Math.floor(100 / gap) + 1 }, (_, iy) =>
        circle(ix * gap, iy * gap, r),
      ).join(" "),
    ).join(" ");
  const lines = (angle, gap) =>
    Array.from({ length: 22 }, (_, i) => {
      const offset = i * gap;
      const a = (angle * Math.PI) / 180;
      return line(
        offset - 50 * Math.sin(a),
        50 - 50 * Math.cos(a),
        offset + 50 * Math.sin(a),
        50 + 50 * Math.cos(a),
      );
    }).join(" ");
  const defs = [
    ["Dot grid", dots(12.5, 2), "fill", 0],
    ["Fine dot grid", dots(8, 1), "fill", 0],
    ["Chevron repeat", join(...Array.from({ length: 7 }, (_, i) => line(i * 16 - 8, 20, i * 16 + 8, 30)), ...Array.from({ length: 7 }, (_, i) => line(i * 16 - 8, 60, i * 16 + 8, 70))), "stroke", 1.6],
    ["Diagonal hatch", lines(45, 8), "stroke", 1],
    ["Crosshatch", join(lines(45, 11), lines(-45, 11)), "stroke", 0.8],
    ["Herringbone", join(...Array.from({ length: 6 }, (_, row) => Array.from({ length: 3 }, (_, col) => join(line(col * 32 + (row % 2) * 16, row * 16, col * 32 + 16 + (row % 2) * 16, row * 16 + 16), line(col * 32 + 16 + (row % 2) * 16, row * 16 + 16, col * 32 + 32 + (row % 2) * 16, row * 16))).join(" "))), "stroke", 1.2],
    ["Diamond tiles", Array.from({ length: 4 }, (_, row) => Array.from({ length: 4 }, (_, col) => polygon(12 + col * 25 + (row % 2) * 12, 12 + row * 25, 13, 13, 4)).join(" ")).join(" "), "stroke", 1.1],
    ["Scale pattern", Array.from({ length: 5 }, (_, row) => Array.from({ length: 5 }, (_, col) => arc(10 + col * 21 + (row % 2) * 10, 14 + row * 19, 11, 11, 180, 360)).join(" ")).join(" "), "stroke", 1.2],
    ["Basket weave", join(...Array.from({ length: 12 }, (_, i) => rect(4 + (i % 4) * 24, 4 + Math.floor(i / 4) * 24, 18, 18))), "stroke", 1.1],
    ["Triangle mosaic", Array.from({ length: 5 }, (_, row) => Array.from({ length: 5 }, (_, col) => polygon(10 + col * 20 + (row % 2) * 10, 10 + row * 18, 10, 10, 3, (row + col) % 2 ? 30 : 90)).join(" ")).join(" "), "fill", 0],
    ["Terrazzo", join(...Array.from({ length: 22 }, (_, i) => {
      const random = mulberry(i * 37 + 7);
      return blob(random() * 84 + 8, random() * 84 + 8, 2 + random() * 4, 6, 0.4, i + 3);
    })), "fill", 0],
    ["Undulating stripes", join(...Array.from({ length: 8 }, (_, i) => wave(12 + i * 11, 4, 1))), "stroke", 1.4],
    ["Windowpane check", join(...Array.from({ length: 6 }, (_, i) => line(8 + i * 17, 4, 8 + i * 17, 96)), ...Array.from({ length: 6 }, (_, i) => line(4, 8 + i * 17, 96, 8 + i * 17))), "stroke", 1],
    ["Scallop tiles", Array.from({ length: 4 }, (_, row) => Array.from({ length: 4 }, (_, col) => circle(12 + col * 25 + (row % 2) * 12, 12 + row * 25, 8)).join(" ")).join(" "), "stroke", 1.1],
  ];
  return defs.map(([name, d, ink, strokeWidth]) => ({
    subcategory: "Grids & patterns",
    name,
    tags: ["pattern", "tile", "repeat", "texture"],
    ink,
    strokeWidth,
    aspect: 1,
    d,
  }));
}

export function shapesAssets() {
  return [
    ...geometric(),
    ...organic(),
    ...abstractForms(),
    ...arches(),
    ...waves(),
    ...rings(),
    ...rules(),
    ...borders(),
    ...frames(),
    ...dividers(),
    ...patterns(),
  ];
}
