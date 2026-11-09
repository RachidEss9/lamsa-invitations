import {
  circle,
  ellipse,
  line,
  polygon,
  rect,
  roundedRect,
  star,
  sweep,
} from "../paths.mjs";

const join = (...parts) => parts.flat(Infinity).filter(Boolean).join(" ");

function landmarks() {
  const defs = [
    ["Eiffel tower", join(
      "M 50 6 L 46 26 L 40 50 L 30 92 L 40 92 L 46 66 L 54 66 L 60 92 L 70 92 L 60 50 L 54 26 Z",
      line(38, 44, 62, 44),
      line(34, 70, 66, 70),
      "M 30 92 C 38 86 62 86 70 92",
      "M 46 26 L 54 26",
      line(50, 6, 50, 0),
    )],
    ["Big Ben clock tower", join(
      rect(34, 26, 32, 66),
      "M 34 26 L 50 12 L 66 26",
      line(50, 12, 50, 4),
      circle(50, 40, 10),
      line(50, 33, 50, 40),
      line(50, 40, 56, 44),
      ...Array.from({ length: 3 }, (_, index) => line(38, 56 + index * 8, 62, 56 + index * 8)),
      rect(42, 76, 16, 16, 1),
    )],
    ["Colosseum", join(
      ellipse(50, 62, 42, 26),
      "M 8 62 L 8 74 C 8 88 92 88 92 74 L 92 62",
      ...Array.from({ length: 6 }, (_, index) => {
        const x = 16 + index * 13.6;
        return join(
          `M ${x} 74 L ${x} 62 C ${x} 54 ${x + 8} 54 ${x + 8} 62 L ${x + 8} 74`,
        );
      }),
      ...Array.from({ length: 7 }, (_, index) => line(14 + index * 12, 54, 14 + index * 12, 46)),
      line(8, 44, 92, 44),
    )],
    ["Pyramids of Giza", join(
      "M 6 88 L 34 34 L 62 88 Z",
      "M 40 88 L 68 44 L 96 88 Z",
      "M 24 88 L 44 52 L 64 88 Z",
      line(6, 88, 96, 88),
      line(26, 56, 34, 56),
      line(32, 68, 40, 68),
      circle(80, 20, 7),
    )],
    ["Taj Mahal", join(
      rect(28, 48, 44, 40),
      "M 28 48 C 28 34 72 34 72 48",
      "M 50 34 L 50 26 C 46 20 54 14 50 8 C 46 14 54 20 50 26",
      line(20, 88, 80, 88),
      "M 18 88 L 18 62 L 26 54 L 26 88",
      "M 82 88 L 82 62 L 74 54 L 74 88",
      "M 42 88 L 42 66 C 42 58 58 58 58 66 L 58 88",
      line(28, 58, 72, 58),
    )],
    ["Japanese pagoda", join(
      line(50, 92, 50, 8),
      ...Array.from({ length: 4 }, (_, index) => {
        const y = 24 + index * 18;
        const w = 34 - index * 6;
        return join(
          `M ${50 - w} ${y + 4} C ${50 - w + 4} ${y} ${50 + w - 4} ${y} ${50 + w} ${y + 4} L ${50 + w - 8} ${y + 8} L ${50 + w - 8} ${y + 16} L ${50 - w + 8} ${y + 16} L ${50 - w + 8} ${y + 8} Z`,
          line(50 - w + 12, y + 8, 50 + w - 12, y + 8),
        );
      }),
      circle(50, 6, 3),
    )],
    ["Windmill", join(
      "M 34 92 L 34 44 L 66 44 L 66 92",
      "M 30 44 L 50 24 L 70 44",
      rect(42, 72, 16, 20, 1),
      circle(50, 40, 4),
      ...Array.from({ length: 4 }, (_, index) => {
        const angle = index * 90;
        const cos = Math.round(Math.cos((angle * Math.PI) / 180));
        const sin = Math.round(Math.sin((angle * Math.PI) / 180));
        return `M ${50 + cos * 8} ${40 + sin * 8} L ${50 + cos * 38} ${40 + sin * 38} L ${50 + cos * 32 - sin * 6} ${40 + sin * 32 + cos * 6} L ${50 + cos * 8 - sin * 4} ${40 + sin * 8 + cos * 4} Z`;
      }),
      line(28, 92, 72, 92),
    )],
    ["Castle", join(
      "M 14 92 L 14 44 L 26 44 L 26 34 L 38 34 L 38 44 L 62 44 L 62 34 L 74 34 L 74 44 L 86 44 L 86 92 Z",
      ...Array.from({ length: 3 }, (_, index) => line(20 + index * 8, 34, 20 + index * 8, 26)),
      ...Array.from({ length: 3 }, (_, index) => line(68 + index * 8, 34, 68 + index * 8, 26)),
      "M 40 92 L 40 66 C 40 58 60 58 60 66 L 60 92",
      "M 26 58 L 34 58 L 34 66 L 26 66 Z",
      "M 66 58 L 74 58 L 74 66 L 66 66 Z",
      line(14, 92, 86, 92),
    )],
    ["Suspension bridge", join(
      line(6, 44, 94, 44),
      "M 6 88 L 22 40 C 38 70 62 70 78 40 L 94 88",
      ...Array.from({ length: 9 }, (_, index) => line(14 + index * 9, 44, 14 + index * 9, 58 + Math.sin((index * Math.PI) / 8) * 22)),
      line(6, 88, 94, 88),
      rect(18, 34, 8, 54),
      rect(74, 34, 8, 54),
    )],
    ["Lighthouse", join(
      "M 38 92 L 42 30 L 58 30 L 62 92 Z",
      ...Array.from({ length: 3 }, (_, index) => line(40 + index * 2, 50 + index * 14, 60 - index * 2, 50 + index * 14)),
      rect(40, 18, 20, 12),
      "M 40 18 L 50 10 L 60 18",
      ...Array.from({ length: 4 }, (_, index) => {
        const angle = ((index * 30 + 15) * Math.PI) / 180;
        return line(50, 14, 50 + Math.cos(angle) * 40, 14 + Math.sin(angle) * 16);
      }),
      "M 30 92 C 38 84 62 84 70 92",
    )],
    ["Skyscraper", join(
      rect(28, 18, 44, 74),
      line(50, 18, 50, 92),
      ...Array.from({ length: 7 }, (_, row) =>
        Array.from({ length: 4 }, (_, col) => rect(32 + col * 10, 24 + row * 9, 6, 5, 1)).join(" "),
      ),
      line(28, 10, 50, 18),
      line(72, 10, 50, 18),
      circle(50, 8, 3),
      line(22, 92, 78, 92),
    )],
    ["Greek temple", join(
      "M 12 30 L 50 10 L 88 30 Z",
      rect(16, 30, 68, 8),
      ...Array.from({ length: 5 }, (_, index) => line(22 + index * 14, 38, 22 + index * 14, 80)),
      ...Array.from({ length: 5 }, (_, index) => line(18 + index * 14, 42, 18 + index * 14, 76)),
      rect(14, 80, 72, 6),
      rect(10, 86, 80, 6),
      line(50, 10, 50, 4),
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Landmarks",
    tags: ["travel", "landmark", "destination", "city", "architecture", "tourism"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 0.8,
  }));
}

function transport() {
  const defs = [
    ["Aeroplane, side view", join(
      "M 8 54 L 40 46 L 62 14 L 70 16 L 58 50 L 84 48 L 92 34 L 97 36 L 92 54 L 97 70 L 92 72 L 84 58 L 58 60 L 70 92 L 62 94 L 40 64 L 8 60 Z",
      line(30, 50, 42, 52),
      circle(52, 34, 2),
    )],
    ["Steam train", join(
      "M 12 78 L 12 48 L 34 48 L 34 38 L 54 38 L 54 48 L 72 48 L 72 62 L 88 62 L 88 78 Z",
      rect(40, 48, 12, 10, 1),
      circle(28, 82, 8),
      circle(52, 82, 8),
      circle(76, 82, 8),
      line(30, 38, 30, 30),
      line(38, 38, 38, 30),
      line(46, 38, 46, 30),
      "M 30 30 C 24 24 30 16 34 20",
      line(8, 90, 94, 90),
    )],
    ["Cruise ship", join(
      "M 10 62 L 90 62 L 82 84 L 18 84 Z",
      "M 24 62 L 32 40 L 68 40 L 76 62",
      rect(36, 30, 24, 10, 2),
      line(40, 46, 40, 54),
      line(50, 46, 50, 54),
      line(60, 46, 60, 54),
      ...Array.from({ length: 4 }, (_, index) => circle(30 + index * 14, 72, 2)),
      line(8, 84, 92, 84),
    )],
    ["Sailing yacht", join(
      "M 50 10 L 50 64 L 22 64 Z",
      "M 56 24 L 76 64 L 56 64 Z",
      "M 12 68 L 88 68 L 78 84 L 22 84 Z",
      line(50, 8, 50, 64),
      "M 12 68 L 18 60",
    )],
    ["Car", join(
      "M 8 68 C 8 60 16 56 24 56 L 32 44 C 36 38 64 38 68 44 L 76 56 C 86 56 92 60 92 68 L 92 76 L 8 76 Z",
      "M 32 56 L 40 46 L 60 46 L 68 56",
      circle(26, 78, 8),
      circle(74, 78, 8),
      rect(12, 64, 6, 4, 1),
      rect(82, 64, 6, 4, 1),
    )],
    ["City bus", join(
      roundedRect(8, 30, 84, 48, 6),
      rect(16, 38, 28, 18, 2),
      rect(50, 38, 34, 18, 2),
      line(8, 64, 92, 64),
      circle(24, 82, 7),
      circle(76, 82, 7),
      rect(44, 68, 12, 8, 1),
      line(16, 58, 84, 58),
    )],
    ["City bicycle", join(
      circle(24, 66, 18),
      circle(76, 66, 18),
      "M 24 66 L 38 40 L 54 66 L 76 66",
      line(38, 40, 60, 40),
      line(54, 66, 60, 40),
      line(54, 66, 44, 28),
      line(36, 26, 48, 26),
      circle(50, 66, 4),
      "M 76 66 L 66 34 L 74 34",
    )],
    ["Scooter", join(
      circle(22, 74, 12),
      circle(76, 74, 12),
      "M 22 74 L 34 44 L 56 44 L 66 70",
      line(56, 44, 74, 40),
      line(30, 36, 44, 36),
      line(34, 44, 34, 36),
      line(76, 40, 76, 30),
      line(70, 30, 82, 30),
      rect(38, 50, 4, 12, 2),
    )],
    ["Hot-air balloon", join(
      "M 50 6 C 24 6 14 26 16 42 C 18 58 36 66 42 74 L 58 74 C 64 66 82 58 84 42 C 86 26 76 6 50 6 Z",
      ...Array.from({ length: 5 }, (_, index) => `M 50 6 C ${30 + index * 10} ${20 + index * 4} ${64 + index * 4} ${34 + index * 4} ${36 + index * 7} 74`),
      line(42, 74, 44, 84),
      line(58, 74, 56, 84),
      rect(40, 84, 20, 14, 2),
      line(10, 96, 90, 96),
    )],
    ["Helicopter", join(
      "M 20 30 L 76 30",
      line(32, 30, 32, 40),
      "M 24 40 C 24 32 74 32 78 46 C 82 60 72 66 56 66 L 24 66 Z",
      "M 24 66 L 12 76 L 28 78",
      line(56, 66, 56, 82),
      line(40, 82, 80, 82),
      circle(42, 50, 10),
      "M 72 50 L 92 50 L 92 60 L 76 60",
    )],
    ["Camper van", join(
      "M 8 36 L 66 36 L 82 52 L 92 52 L 92 76 L 8 76 Z",
      rect(16, 42, 24, 16, 2),
      rect(46, 42, 16, 16, 2),
      line(66, 36, 66, 52),
      line(82, 52, 82, 60),
      circle(26, 80, 7),
      circle(76, 80, 7),
      rect(60, 64, 8, 6, 1),
      line(8, 60, 60, 60),
    )],
    ["Cable car", join(
      line(6, 18, 94, 10),
      line(50, 14, 50, 30),
      "M 32 30 L 68 30 L 64 66 L 36 66 Z",
      rect(38, 36, 24, 12, 1),
      line(38, 54, 62, 54),
      line(32, 30, 36, 66),
      line(68, 30, 64, 66),
      circle(50, 68, 3),
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Transport",
    tags: ["travel", "transport", "journey", "vehicle", "transportation", "holiday"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 1,
  }));
}

function navigation() {
  const defs = [
    ["Desk globe", join(
      circle(50, 50, 36),
      ellipse(50, 50, 14, 36),
      ellipse(50, 50, 26, 36),
      line(14, 50, 86, 50),
      sweep(50, 50, 36, 36, 180, 360),
      sweep(50, 50, 36, 36, 0, 180),
      "M 36 26 C 44 34 56 30 62 22",
    )],
    ["Compass rose", join(
      circle(50, 50, 40),
      circle(50, 50, 34),
      star(50, 50, 30, 9, 8),
      polygon(50, 10, 8, 8, 4, 0),
      ...Array.from({ length: 4 }, (_, index) => {
        const angle = (index * 90 * Math.PI) / 180;
        return line(50 + Math.cos(angle) * 30, 50 + Math.sin(angle) * 30, 50 + Math.cos(angle) * 38, 50 + Math.sin(angle) * 38);
      }),
      circle(50, 50, 4),
    )],
    ["Folded map", join(
      "M 8 26 L 32 18 L 50 26 L 68 18 L 92 26 L 92 78 L 68 86 L 50 78 L 32 86 L 8 78 Z",
      line(32, 18, 32, 86),
      line(68, 18, 68, 86),
      line(8, 40, 32, 34),
      line(68, 34, 92, 40),
      "M 16 62 C 24 52 34 58 42 50 C 50 42 58 52 66 46",
      ...Array.from({ length: 4 }, (_, index) => line(74 + index * 4, 56, 78 + index * 4, 60)),
    )],
    ["Location pin", join(
      "M 50 92 C 34 72 22 58 22 42 C 22 24 36 10 50 10 C 64 10 78 24 78 42 C 78 58 66 72 50 92 Z",
      circle(50, 42, 12),
      circle(50, 42, 5),
      line(30, 30, 36, 24),
    )],
    ["Route line", join(
      "M 10 78 C 26 78 26 42 42 42 C 58 42 58 66 74 66 C 86 66 88 50 94 44",
      circle(10, 78, 4),
      circle(94, 44, 4),
      circle(42, 42, 3),
      ...Array.from({ length: 4 }, (_, index) => line(24 + index * 16, 60 - (index % 2) * 18, 28 + index * 16, 58 - (index % 2) * 18)),
      star(74, 66, 5, 2, 4),
    )],
    ["Coordinate grid", join(
      circle(50, 50, 38),
      ...Array.from({ length: 4 }, (_, index) => ellipse(50, 50, 38, 10 + index * 8)),
      ...Array.from({ length: 4 }, (_, index) => ellipse(50, 50, 10 + index * 8, 38)),
      line(12, 50, 88, 50),
      line(50, 12, 50, 88),
    )],
    ["North arrow", join(
      circle(50, 50, 36),
      polygon(50, 12, 14, 20, 3, 0),
      polygon(50, 88, 8, 10, 3, 180),
      line(50, 12, 50, 88),
      line(50, 50, 30, 62),
      line(50, 50, 70, 62),
      line(50, 40, 50, 26),
    )],
    ["Distance marker", join(
      line(10, 44, 90, 44),
      ...Array.from({ length: 5 }, (_, index) => line(18 + index * 16, 38, 18 + index * 16, 50)),
      line(10, 44, 10, 58),
      line(90, 44, 90, 58),
      line(10, 58, 90, 58),
      line(50, 32, 50, 24),
      circle(50, 20, 5),
    )],
    ["Topographic contours", join(
      ...Array.from({ length: 5 }, (_, index) => {
        const r = 12 + index * 8;
        return `M ${50 - r} 50 C ${50 - r} ${50 - r} ${50 + r} ${50 - r} ${50 + r} 50 C ${50 + r} ${50 + r} ${50 - r} ${50 + r} ${50 - r} 50 Z`;
      }),
      ...Array.from({ length: 3 }, (_, index) => line(20 + index * 22, 20, 30 + index * 18, 30)),
    )],
    ["Latitude globe", join(
      circle(50, 50, 38),
      ...Array.from({ length: 4 }, (_, index) => line(14, 32 + index * 12, 86, 32 + index * 12)),
      ellipse(50, 50, 16, 38),
      ellipse(50, 50, 30, 38),
      line(12, 50, 88, 50),
    )],
    ["Treasure map", join(
      "M 8 18 C 22 12 30 24 44 18 C 58 12 70 24 92 16 L 92 82 C 74 90 60 76 46 82 C 32 88 20 78 8 84 Z",
      "M 24 40 C 32 30 42 36 44 46 C 46 56 34 60 28 52",
      ...Array.from({ length: 4 }, (_, index) => line(62 + index * 6, 58 - index * 6, 68 + index * 6, 54 - index * 6)),
      star(50, 64, 7, 3, 4),
      line(28, 74, 36, 66),
    )],
    ["Atlas book", join(
      "M 10 24 C 26 18 42 22 50 30 C 58 22 74 18 90 24 L 90 80 C 74 74 58 78 50 86 C 42 78 26 74 10 80 Z",
      line(50, 30, 50, 86),
      circle(30, 46, 9),
      ellipse(30, 46, 4, 9),
      line(21, 46, 39, 46),
      "M 60 40 L 80 40 L 80 56 L 60 56 Z",
      line(64, 48, 76, 48),
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Maps & navigation",
    tags: ["travel", "map", "navigation", "geography", "compass", "journey"],
    ink: "stroke",
    strokeWidth: 1.3,
    aspect: 1,
  }));
}

function postcards() {
  const defs = [
    ["Postcard", join(
      rect(6, 24, 88, 52),
      line(50, 24, 50, 76),
      rect(58, 32, 28, 20, 1),
      line(14, 38, 42, 38),
      line(14, 48, 38, 48),
      line(14, 58, 44, 58),
      line(56, 60, 86, 60),
      star(70, 54, 4, 1.6, 4),
    )],
    ["Postage stamp frame", join(
      rect(14, 10, 72, 80),
      rect(20, 16, 60, 68),
      ...Array.from({ length: 7 }, (_, index) => circle(18 + index * 11, 10, 2)),
      ...Array.from({ length: 7 }, (_, index) => circle(18 + index * 11, 90, 2)),
      ...Array.from({ length: 6 }, (_, index) => circle(14, 16 + index * 12, 2)),
      ...Array.from({ length: 6 }, (_, index) => circle(86, 16 + index * 12, 2)),
      "M 26 66 L 38 46 L 52 62 L 62 52 L 74 66 Z",
      circle(62, 32, 5),
    )],
    ["Passport booklet", join(
      roundedRect(22, 8, 56, 84, 4),
      roundedRect(28, 14, 44, 72, 2),
      circle(50, 40, 14),
      line(50, 26, 50, 54),
      line(36, 40, 64, 40),
      line(34, 64, 66, 64),
      line(34, 72, 58, 72),
      star(50, 40, 5, 2, 5),
    )],
    ["Boarding pass", join(
      roundedRect(6, 26, 88, 48, 3),
      line(64, 26, 64, 74),
      line(70, 26, 70, 74),
      line(14, 38, 54, 38),
      line(14, 48, 44, 48),
      line(14, 58, 50, 58),
      rect(76, 36, 12, 10, 1),
      ...Array.from({ length: 6 }, (_, index) => circle(66 + index * 4, 34 + (index % 2) * 32, 1.4)),
      "M 74 58 L 88 58 L 88 66 L 74 66 Z",
    )],
    ["Leather luggage tag", join(
      roundedRect(16, 26, 68, 56, 10),
      circle(28, 38, 4),
      line(36, 38, 76, 38),
      line(24, 52, 64, 52),
      line(24, 64, 52, 64),
      "M 28 34 L 28 26",
      line(60, 44, 72, 44),
    )],
    ["Visa stamp", join(
      rect(12, 22, 76, 56),
      rect(18, 28, 64, 44),
      star(50, 50, 16, 6, 6),
      line(30, 38, 70, 38),
      line(30, 62, 62, 62),
      sweep(50, 50, 26, 26, 200, 340),
      ...Array.from({ length: 5 }, (_, index) => line(24 + index * 13, 84, 24 + index * 13, 90)),
    )],
    ["Souvenir badge", join(
      circle(50, 44, 28),
      circle(50, 44, 22),
      "M 36 66 L 30 92 L 42 84 L 50 94 L 58 84 L 70 92 L 64 66",
      "M 34 44 L 40 36 L 46 40 L 54 30 L 60 36 L 66 34",
      star(50, 44, 10, 4, 6),
    )],
    ["Destination label", join(
      "M 10 30 L 66 30 L 90 50 L 66 70 L 10 70 Z",
      circle(20, 40, 4),
      line(30, 44, 60, 44),
      line(30, 56, 54, 56),
      "M 70 40 L 80 50 L 70 60",
    )],
    ["Itinerary card", join(
      roundedRect(16, 8, 68, 84, 3),
      line(24, 20, 72, 20),
      ...Array.from({ length: 4 }, (_, index) => {
        const y = 34 + index * 13;
        return join(circle(28, y, 3), line(36, y, 74, y), line(36, y + 5, 64, y + 5));
      }),
      line(28, 84, 60, 84),
      circle(72, 84, 3),
    )],
    ["Travel journal", join(
      "M 20 10 L 76 10 L 82 20 L 82 88 L 20 88 Z",
      line(20, 20, 82, 20),
      ...Array.from({ length: 5 }, (_, index) => line(28, 32 + index * 10, 72, 32 + index * 10)),
      "M 76 10 C 88 16 88 28 80 34",
      circle(30, 26, 2),
      "M 70 70 L 80 60 L 82 74 Z",
    )],
    ["Photo corners", join(
      "M 10 10 L 38 10 L 10 38 Z",
      "M 90 10 L 62 10 L 90 38 Z",
      "M 10 90 L 38 90 L 10 62 Z",
      "M 90 90 L 62 90 L 90 62 Z",
      rect(30, 30, 40, 40, 1),
      "M 36 64 L 44 48 L 52 60 L 60 52 L 64 64 Z",
    )],
    ["Airmail envelope", join(
      rect(8, 26, 84, 50),
      "M 8 26 L 50 58 L 92 26",
      "M 8 76 L 38 50",
      "M 92 76 L 62 50",
      ...Array.from({ length: 6 }, (_, index) => {
        const x = 12 + index * 12;
        return line(x, 26, x + 8, 34);
      }),
      ...Array.from({ length: 6 }, (_, index) => {
        const x = 12 + index * 12;
        return line(x, 76, x + 8, 68);
      }),
      rect(62, 34, 20, 14, 1),
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Postcards & stamps",
    tags: ["travel", "postcard", "stamp", "passport", "journey", "holiday"],
    ink: "stroke",
    strokeWidth: 1.3,
    aspect: 1.3,
  }));
}

function scenery() {
  const defs = [
    ["Mountain range", join(
      "M 4 84 L 28 36 L 44 60 L 58 28 L 78 64 L 90 44 L 96 84 Z",
      "M 22 48 L 28 36 L 34 48 L 28 44 Z",
      "M 50 42 L 58 28 L 66 44 L 58 38 Z",
      circle(80, 18, 6),
      line(4, 84, 96, 84),
    )],
    ["Beach and palm", join(
      line(4, 68, 96, 68),
      "M 6 68 C 20 82 42 78 56 86 L 94 86 L 94 68",
      "M 64 68 C 62 46 68 30 78 22",
      ...Array.from({ length: 5 }, (_, index) => {
        const angle = ((-150 + index * 30) * Math.PI) / 180;
        return `M 78 22 Q ${78 + Math.cos(angle) * 22} ${22 + Math.sin(angle) * 10} ${78 + Math.cos(angle) * 34} ${22 + Math.sin(angle) * 22}`;
      }),
      circle(78, 22, 3),
      "M 24 24 C 18 20 22 14 28 16 C 34 18 30 24 24 24 Z",
      sweep(88, 30, 8, 8, 200, 520),
    )],
    ["Desert dunes", join(
      "M 4 82 C 18 54 34 54 46 66 C 58 78 72 44 96 50 L 96 82 Z",
      "M 4 82 C 22 68 34 76 50 82",
      "M 36 82 C 52 70 64 72 76 82",
      circle(74, 22, 9),
      line(62, 18, 86, 26),
      ...Array.from({ length: 5 }, (_, index) => line(44 + index * 8, 38, 48 + index * 8, 42)),
    )],
    ["Palm island", join(
      ellipse(52, 72, 38, 10),
      "M 52 72 C 52 56 54 42 58 30",
      ...Array.from({ length: 4 }, (_, index) => {
        const angle = ((-140 + index * 40) * Math.PI) / 180;
        return `M 58 30 Q ${58 + Math.cos(angle) * 18} ${30 + Math.sin(angle) * 10} ${58 + Math.cos(angle) * 30} ${30 + Math.sin(angle) * 20}`;
      }),
      circle(58, 30, 3),
      "M 16 58 C 20 54 24 58 22 62",
      sweep(30, 68, 16, 4, 180, 360),
      "M 78 62 C 82 58 86 62 84 66",
    )],
    ["Fjord cliffs", join(
      "M 4 86 L 4 30 L 22 22 L 34 44 L 42 34 L 56 68 L 64 52 L 78 38 L 96 48 L 96 86 Z",
      "M 26 86 C 34 70 46 66 56 72 C 66 78 78 70 92 86",
      ...Array.from({ length: 3 }, (_, index) => sweep(60, 76, 10 + index * 6, 2, 180, 360)),
      line(4, 86, 96, 86),
    )],
    ["Canyon", join(
      "M 4 86 L 4 20 L 22 20 L 28 52 L 40 52 L 46 28 L 60 28 L 64 56 L 78 56 L 82 24 L 96 24 L 96 86 Z",
      ...Array.from({ length: 5 }, (_, index) => line(8 + index * 6, 36 + (index % 2) * 12, 20 + index * 6, 32 + (index % 2) * 12)),
      line(4, 86, 96, 86),
      "M 36 86 C 44 72 56 72 64 86",
    )],
    ["Volcano", join(
      "M 6 86 L 34 34 L 44 44 L 50 22 L 58 46 L 68 36 L 94 86 Z",
      "M 50 22 C 44 30 46 38 50 46 C 54 38 56 30 50 22 Z",
      ...Array.from({ length: 3 }, (_, index) => `M ${44 + index * 5} ${22 - index * 4} C ${38 + index * 5} ${12 - index * 4} ${30 + index * 8} ${16 - index * 4} ${28 + index * 8} ${8 - index * 4}`),
      line(6, 86, 94, 86),
      "M 70 60 C 76 52 82 56 86 48",
    )],
    ["Forest trail", join(
      "M 44 92 C 42 74 56 68 54 52 C 52 36 40 30 42 16",
      "M 56 92 C 58 74 44 68 46 52 C 48 36 60 30 58 16",
      ...Array.from({ length: 4 }, (_, index) => {
        const y = 28 + index * 16;
        return join(
          `M ${22 + (index % 2) * 6} ${y + 16} L ${30 + (index % 2) * 6} ${y} L ${38 + (index % 2) * 6} ${y + 16} Z`,
          line(30 + (index % 2) * 6, y + 16, 30 + (index % 2) * 6, y + 22),
        );
      }),
      ...Array.from({ length: 4 }, (_, index) => {
        const y = 34 + index * 14;
        return join(
          `M ${62 + (index % 2) * 5} ${y + 14} L ${70 + (index % 2) * 5} ${y} L ${78 + (index % 2) * 5} ${y + 14} Z`,
          line(70 + (index % 2) * 5, y + 14, 70 + (index % 2) * 5, y + 20),
        );
      }),
    )],
    ["Waterfall", join(
      "M 4 86 L 4 34 L 24 20 L 44 36 L 52 30 L 70 44 L 96 32 L 96 86 Z",
      "M 48 32 C 50 50 44 62 48 86",
      "M 52 32 C 54 50 48 62 52 86",
      "M 56 30 C 58 48 52 64 56 86",
      sweep(52, 86, 12, 4, 180, 360),
      line(4, 86, 96, 86),
    )],
    ["City skyline", join(
      rect(6, 50, 18, 38),
      rect(28, 36, 16, 52),
      rect(48, 20, 18, 68),
      rect(70, 42, 14, 46),
      rect(86, 56, 10, 32),
      ...Array.from({ length: 5 }, (_, index) => line(52, 26 + index * 10, 62, 26 + index * 10)),
      ...Array.from({ length: 3 }, (_, index) => line(32, 44 + index * 12, 40, 44 + index * 12)),
      line(6, 88, 96, 88),
    )],
    ["Countryside", join(
      line(4, 72, 96, 72),
      "M 4 72 C 20 56 34 76 50 64 C 66 52 80 68 96 58 L 96 72",
      "M 18 72 L 18 58 L 30 50 L 42 58 L 42 72",
      line(18, 62, 42, 62),
      "M 60 72 L 60 54 L 72 54 L 72 72",
      line(60, 62, 72, 62),
      circle(84, 26, 7),
      ...Array.from({ length: 5 }, (_, index) => line(8 + index * 6, 82, 12 + index * 6, 86)),
    )],
    ["Coastal cliffs", join(
      "M 4 86 L 4 44 L 18 30 L 34 40 L 40 26 L 58 24 L 66 38 L 82 32 L 96 42 L 96 86 Z",
      "M 40 86 C 44 68 52 64 60 66 C 70 68 78 60 96 72",
      ...Array.from({ length: 4 }, (_, index) => sweep(16 + index * 20, 84, 8, 2, 180, 360)),
      line(4, 86, 96, 86),
      "M 28 44 C 34 40 38 46 34 50",
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Scenery",
    tags: ["travel", "landscape", "scenery", "holiday", "nature", "destination"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 1.4,
  }));
}

export function travelAssets() {
  return [...landmarks(), ...transport(), ...navigation(), ...postcards(), ...scenery()];
}
