import {
  circle,
  ellipse,
  leaf,
  line,
  polygon,
  rect,
  rotatePath,
  roundedRect,
  star,
  sweep,
} from "../paths.mjs";

const join = (...parts) => parts.flat(Infinity).filter(Boolean).join(" ");

const rays = (cx, cy, inner, outer, count, phase = -90) =>
  Array.from({ length: count }, (_, index) => {
    const angle = ((phase + (index * 360) / count) * Math.PI) / 180;
    return line(
      cx + Math.cos(angle) * inner,
      cy + Math.sin(angle) * inner,
      cx + Math.cos(angle) * outer,
      cy + Math.sin(angle) * outer,
    );
  });

function sunMoon() {
  const crescent = join(
    "M 62 12 C 34 20 20 44 30 66 C 40 88 66 94 86 80 C 64 86 44 74 42 56 C 40 38 50 22 62 12 Z",
    star(76, 26, 7, 3, 4),
  );
  const phases = (inner) =>
    Array.from({ length: 5 }, (_, index) => {
      const cx = 14 + index * 18;
      return inner(index, cx);
    }).join(" ");
  const defs = [
    ["Sun with rays", join(
      circle(50, 50, 22),
      rays(50, 50, 26, 42, 16),
      circle(50, 50, 10),
    )],
    ["Sun and horizon", join(
      circle(50, 62, 22),
      ...Array.from({ length: 9 }, (_, index) => {
        const angle = ((190 + index * 20) * Math.PI) / 180;
        return line(
          50 + Math.cos(angle) * 26,
          62 + Math.sin(angle) * 26,
          50 + Math.cos(angle) * 40,
          62 + Math.sin(angle) * 40,
        );
      }),
      circle(50, 62, 10),
      line(6, 82, 94, 82),
      line(4, 90, 96, 90),
    )],
    ["Crescent moon", crescent],
    ["Full moon", join(
      circle(50, 50, 36),
      circle(38, 38, 7),
      circle(62, 60, 10),
      circle(58, 30, 4),
      circle(34, 66, 5),
      circle(72, 42, 3),
    )],
    ["Moon phases", phases((index, cx) => {
      if (index === 0) return circle(cx, 50, 13);
      if (index === 4) return circle(cx, 50, 13);
      return join(circle(cx, 50, 13), `M ${cx} 37 C ${cx + (index < 2 ? 12 : -12)} 44 ${cx + (index < 2 ? 12 : -12)} 56 ${cx} 63 Z`);
    })],
    ["Solar eclipse", join(
      circle(50, 50, 32),
      circle(50, 50, 24),
      ...Array.from({ length: 12 }, (_, index) => {
        const angle = (index * 30 * Math.PI) / 180;
        return line(50 + Math.cos(angle) * 36, 50 + Math.sin(angle) * 36, 50 + Math.cos(angle) * 44, 50 + Math.sin(angle) * 44);
      }),
    )],
    ["Sun halo", join(
      circle(50, 50, 16),
      circle(50, 50, 26),
      circle(50, 50, 36),
      rays(50, 50, 36, 44, 24),
    )],
    ["Crescent with clouds", join(
      "M 56 14 C 36 22 28 40 34 56 C 40 70 54 76 68 72 C 52 72 42 60 42 48 C 42 34 48 22 56 14 Z",
      "M 10 72 C 18 62 30 62 36 70 C 44 60 58 60 64 70 L 78 70 C 86 62 94 66 94 74 L 10 74 Z",
      star(24, 30, 4, 1.6, 4),
      star(78, 40, 3.4, 1.4, 4),
    )],
    ["Moon and stars", join(
      "M 46 16 C 28 24 22 42 30 56 C 38 70 56 72 68 64 C 50 68 38 56 38 44 C 38 32 42 22 46 16 Z",
      star(70, 24, 7, 3, 4),
      star(80, 44, 4, 1.6, 4),
      star(26, 72, 4, 1.6, 4),
      circle(66, 82, 2),
    )],
    ["Sunrise", join(
      circle(50, 58, 18),
      rays(50, 58, 22, 34, 9, 200),
      line(4, 72, 96, 72),
      line(10, 80, 90, 80),
      "M 18 72 C 26 64 34 66 38 72",
      "M 62 72 C 68 64 78 66 84 72",
      star(20, 26, 4, 1.6, 4),
      star(82, 20, 3.4, 1.4, 4),
    )],
    ["Sunset", join(
      circle(50, 66, 16),
      rays(50, 66, 20, 30, 9, 200),
      line(4, 80, 96, 80),
      line(4, 88, 96, 88),
      "M 6 80 C 20 72 36 74 46 80",
      "M 54 80 C 66 72 82 74 94 80",
      "M 50 18 L 50 30",
      star(30, 32, 3.4, 1.4, 4),
    )],
    ["Crater moon", join(
      circle(50, 50, 34),
      circle(38, 38, 7),
      circle(60, 34, 5),
      circle(64, 58, 10),
      circle(36, 64, 8),
      circle(50, 78, 4),
      circle(26, 50, 3),
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Sun & moon",
    tags: ["celestial", "sun", "moon", "night", "mystical", "sky"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 1,
  }));
}

function stars() {
  const defs = [
    ["Four-point sparkle", star(50, 50, 42, 9, 4)],
    ["Eight-point star motif", join(star(50, 50, 40, 15, 8), star(50, 50, 22, 8, 8, -67.5))],
    ["Starburst", join(
      circle(50, 50, 8),
      rays(50, 50, 10, 44, 24),
      star(50, 50, 16, 6, 8),
    )],
    ["Constellation: plough", join(
      ...[[16, 26], [36, 20], [56, 30], [74, 26], [70, 50], [48, 54], [30, 44]].map(([x, y]) => star(x, y, 4, 1.6, 4)),
      line(16, 26, 36, 20),
      line(36, 20, 56, 30),
      line(56, 30, 74, 26),
      line(74, 26, 70, 50),
      line(70, 50, 48, 54),
      line(48, 54, 30, 44),
      line(30, 44, 16, 26),
    )],
    ["Constellation: hunter", join(
      ...[[50, 10], [30, 26], [70, 26], [34, 44], [66, 44], [50, 58], [38, 76], [62, 76], [50, 40]].map(([x, y]) => star(x, y, 4, 1.6, 4)),
      line(50, 10, 50, 40),
      line(30, 26, 50, 40),
      line(70, 26, 50, 40),
      line(34, 44, 50, 40),
      line(66, 44, 50, 40),
      line(50, 40, 50, 58),
      line(50, 58, 38, 76),
      line(50, 58, 62, 76),
      line(34, 44, 38, 76),
      line(66, 44, 62, 76),
    )],
    ["Shooting star", join(
      star(72, 28, 16, 6, 4),
      ...Array.from({ length: 4 }, (_, index) => line(58 - index * 9, 42 + index * 9, 36 - index * 9, 66 + index * 9)),
      ...Array.from({ length: 4 }, (_, index) => line(64 - index * 8, 34 + index * 8, 46 - index * 8, 54 + index * 8)),
    )],
    ["Star cluster", join(
      ...[[24, 24], [46, 16], [68, 28], [34, 44], [58, 48], [20, 64], [44, 72], [72, 64], [80, 44], [52, 34]].map(([x, y], index) => star(x, y, 4 + (index % 3) * 2, 1.6 + (index % 2), 4)),
    )],
    ["North star", join(
      star(50, 50, 30, 11, 4),
      star(50, 50, 44, 5, 4, -45),
      circle(50, 50, 5),
      circle(50, 50, 40),
    )],
    ["Star map", join(
      circle(50, 50, 38),
      circle(50, 50, 33),
      line(12, 50, 88, 50),
      line(50, 12, 50, 88),
      sweep(50, 50, 38, 24, 0, 360),
      ...[[34, 32], [60, 30], [70, 52], [44, 60], [56, 70]].map(([x, y]) => star(x, y, 3, 1.2, 4)),
      line(34, 32, 60, 30),
      line(60, 30, 70, 52),
      line(70, 52, 44, 60),
      line(44, 60, 34, 32),
      line(44, 60, 56, 70),
    )],
    ["Comet with tail", join(
      circle(70, 30, 12),
      ...Array.from({ length: 6 }, (_, index) => `M ${58 - index * 4} ${42 + index * 4} C ${46 - index * 5} ${46 + index * 4} ${36 - index * 5} ${52 + index * 5} ${22 - index * 3} ${58 + index * 4}`),
      ...Array.from({ length: 3 }, (_, index) => circle(30 - index * 6, 24 + index * 8, 2)),
      star(84, 18, 4, 1.6, 4),
    )],
    ["Spiral galaxy", join(
      ...Array.from({ length: 3 }, (_, arm) =>
        Array.from({ length: 18 }, (_, index) => {
          const angle = (index * 0.5 + arm * 2.09) * Math.PI;
          const radius = 4 + index * 2;
          return circle(50 + Math.cos(angle) * radius, 50 + Math.sin(angle) * radius * 0.55, 1.6);
        }).join(" "),
      ),
      ellipse(50, 50, 12, 6),
      circle(50, 50, 3),
    )],
    ["Nova burst", join(
      ...Array.from({ length: 12 }, (_, index) => {
        const angle = (index * 30 * Math.PI) / 180;
        const radius = index % 2 ? 26 : 44;
        return line(50 + Math.cos(angle) * 8, 50 + Math.sin(angle) * 8, 50 + Math.cos(angle) * radius, 50 + Math.sin(angle) * radius);
      }),
      star(50, 50, 12, 4.4, 8),
      circle(50, 50, 5),
    )],
    ["Orbit ring", join(
      circle(50, 50, 30),
      ellipse(50, 50, 44, 12),
      rotatePath(ellipse(50, 50, 44, 12), 40),
      circle(50, 50, 8),
      circle(88, 56, 4),
      circle(20, 36, 4),
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Stars & constellations",
    tags: ["celestial", "star", "constellation", "galaxy", "night", "mystical"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 1,
  }));
}

function zodiac() {
  const glyph = (d) => join(circle(50, 50, 40), circle(50, 50, 36), d);
  const defs = [
    ["Aries glyph", glyph("M 50 72 L 50 44 C 50 30 36 28 34 38 M 50 44 C 50 30 64 28 66 38")],
    ["Taurus glyph", glyph("M 34 28 C 34 46 50 56 50 72 C 50 56 66 46 66 28")],
    ["Gemini glyph", glyph("M 36 30 L 36 70 M 64 30 L 64 70 M 36 30 L 64 30 M 36 70 L 64 70 M 44 30 C 44 46 44 54 44 70 M 56 30 C 56 46 56 54 56 70")],
    ["Cancer glyph", glyph("M 32 44 C 40 36 60 36 68 44 M 68 56 C 60 64 40 64 32 56 M 28 40 C 28 36 32 34 34 38 M 72 60 C 72 64 68 66 66 62")],
    ["Leo glyph", glyph("M 30 66 C 30 54 40 50 46 56 C 54 64 44 74 38 76 C 50 72 60 62 60 50 C 60 34 46 28 38 34")],
    ["Virgo glyph", glyph("M 26 40 C 26 34 34 34 34 40 L 34 70 M 34 42 C 34 34 44 34 44 42 L 44 70 M 44 42 C 44 34 54 34 54 42 L 54 68 C 54 76 62 80 70 72 C 60 80 52 74 52 66")],
    ["Libra glyph", glyph("M 24 72 L 76 72 M 32 60 L 44 46 M 68 60 L 56 46 M 44 46 L 56 46 M 44 46 C 44 38 50 34 50 34 C 50 34 56 38 56 46")],
    ["Scorpio glyph", glyph("M 24 40 C 24 34 32 34 32 40 L 32 70 M 32 42 C 32 34 42 34 42 42 L 42 70 M 42 42 C 42 34 52 34 52 42 L 52 70 M 52 42 L 72 70 L 78 64 M 72 70 L 72 58")],
    ["Sagittarius glyph", glyph("M 26 74 L 70 30 M 70 30 L 58 30 M 70 30 L 70 42 M 34 50 L 66 50")],
    ["Capricorn glyph", glyph("M 24 62 C 24 44 40 36 48 48 C 56 60 42 72 34 64 M 48 48 C 62 48 70 58 66 70 C 62 80 52 78 48 70")],
    ["Aquarius glyph", glyph("M 24 46 L 40 38 L 56 46 L 72 38 M 24 62 L 40 54 L 56 62 L 72 54")],
    ["Pisces glyph", glyph("M 34 30 L 34 70 M 66 30 L 66 70 M 34 42 C 44 46 56 46 66 42 M 34 58 C 44 54 56 54 66 58")],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Zodiac",
    tags: ["celestial", "zodiac", "astrology", "sign", "mystical", "horoscope"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 1,
  }));
}

function mystic() {
  const tarot = (emblem) => join(
    roundedRect(22, 6, 56, 88, 4),
    roundedRect(28, 12, 44, 76, 2),
    emblem,
    ...Array.from({ length: 5 }, (_, index) => circle(30 + index * 10, 88, 1.2)),
    star(50, 8, 3, 1.2, 4),
  );
  const defs = [
    ["Tarot card frame", tarot(join(
      circle(50, 44, 13),
      rays(50, 44, 16, 24, 12),
      star(50, 68, 5, 2, 4),
    ))],
    ["Crystal ball", join(
      circle(50, 46, 28),
      "M 30 68 C 38 80 62 80 70 68",
      ellipse(50, 78, 22, 5),
      line(28, 40, 38, 30),
      ...Array.from({ length: 3 }, (_, index) => star(30 + index * 14, 44 + (index % 2) * 10, 3, 1.2, 4)),
    )],
    ["Crystal cluster", join(
      polygon(50, 6, 12, 8, 3, 0),
      polygon(34, 26, 9, 6, 3, 0),
      polygon(66, 24, 8, 6, 3, 0),
      "M 50 14 L 50 58 L 38 70 M 34 32 L 34 64 L 26 74 M 66 30 L 66 62 L 74 72",
      line(22, 92, 78, 92),
      star(50, 80, 5, 2, 4),
    )],
    ["Pendulum", join(
      line(50, 6, 50, 26),
      line(28, 26, 72, 26),
      line(50, 26, 50, 62),
      polygon(50, 80, 12, 10, 3, 90),
      circle(50, 70, 3),
      star(50, 22, 3, 1.2, 4),
    )],
    ["Spell jar", join(
      roundedRect(30, 26, 40, 60, 6),
      rect(28, 16, 44, 10, 3),
      line(30, 40, 70, 40),
      ...Array.from({ length: 5 }, (_, index) => circle(38 + index * 6, 62 + (index % 2) * 8, 2)),
      ...Array.from({ length: 4 }, (_, index) => leaf(34 + index * 8, 52, 10, 4, index % 2 ? 60 : 120)),
      star(50, 48, 4, 1.6, 4),
    )],
    ["Cauldron", join(
      "M 18 46 C 18 66 30 80 50 84 C 70 80 82 66 82 46 Z",
      ellipse(50, 46, 32, 6),
      "M 18 46 C 10 46 8 54 16 58 M 82 46 C 90 46 92 54 84 58",
      line(30, 84, 26, 92),
      line(70, 84, 74, 92),
      line(34, 34, 46, 22),
      line(50, 34, 60, 20),
      ...Array.from({ length: 3 }, (_, index) => circle(44 + index * 6, 30 - index * 4, 2)),
    )],
    ["Wand", join(
      line(24, 88, 68, 40),
      star(74, 30, 12, 5, 4),
      star(62, 20, 4, 1.6, 4),
      star(86, 42, 4, 1.6, 4),
      line(28, 80, 36, 72),
    )],
    ["All-seeing eye", join(
      "M 10 50 C 24 30 76 30 90 50 C 76 70 24 70 10 50 Z",
      circle(50, 50, 12),
      circle(50, 50, 5),
      ...Array.from({ length: 4 }, (_, index) => line(34 + index * 12, 34 - (index % 2) * 3, 32 + index * 12, 24 - (index % 2) * 3)),
    )],
    ["Moon tarot card", tarot(join(
      "M 56 28 C 40 34 34 48 40 60 C 46 72 60 74 70 68 C 54 68 46 58 46 48 C 46 38 50 34 56 28 Z",
      star(64, 34, 3.4, 1.4, 4),
      line(30, 76, 70, 76),
    ))],
    ["Sun tarot card", tarot(join(
      circle(50, 48, 12),
      rays(50, 48, 15, 24, 12),
      line(30, 76, 70, 76),
      star(50, 76, 3.4, 1.4, 4),
    ))],
    ["Incense burner", join(
      circle(50, 56, 26),
      circle(50, 56, 20),
      line(26, 70, 18, 88),
      line(74, 70, 82, 88),
      line(36, 76, 30, 90),
      line(64, 76, 70, 90),
      "M 38 34 C 30 26 42 20 38 12",
      "M 50 34 C 44 24 56 18 52 8",
      "M 62 34 C 56 26 68 20 64 12",
      line(18, 90, 82, 90),
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Mystic",
    tags: ["celestial", "mystical", "magic", "tarot", "crystal", "ritual"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 0.72,
  }));
}

function nightSky() {
  const defs = [
    ["Milky Way band", join(
      "M 4 24 C 30 38 64 42 96 30 L 96 46 C 64 58 30 54 4 40 Z",
      ...Array.from({ length: 14 }, (_, index) => star(10 + index * 6, 30 + Math.sin(index * 0.8) * 8 + 4, 1.8, 0.7, 4)),
      ...Array.from({ length: 8 }, (_, index) => circle(14 + index * 11, 36 + Math.cos(index) * 6, 1)),
    )],
    ["Aurora", join(
      ...Array.from({ length: 4 }, (_, band) =>
        `M ${12 + band * 6} 8 C ${40 + band * 8} 30 ${24 + band * 6} 56 ${46 + band * 8} 92`,
      ),
      ...Array.from({ length: 4 }, (_, band) =>
        `M ${24 + band * 6} 6 C ${52 + band * 8} 28 ${36 + band * 6} 54 ${58 + band * 8} 92`,
      ),
      star(18, 20, 3, 1.2, 4),
      star(78, 30, 3, 1.2, 4),
      star(70, 74, 2.4, 1, 4),
    )],
    ["Cloud and moon", join(
      "M 58 20 C 46 24 40 36 44 46 C 48 56 60 58 68 54 C 56 54 50 46 50 38 C 50 30 52 24 58 20 Z",
      "M 12 66 C 18 54 34 52 42 62 C 48 52 64 52 70 62 C 78 56 88 62 88 70 L 12 70 Z",
      star(76, 28, 3.4, 1.4, 4),
      star(22, 36, 3, 1.2, 4),
    )],
    ["Starry arch", join(
      "M 12 88 L 12 52 C 12 20 88 20 88 52 L 88 88",
      "M 20 88 L 20 54 C 20 28 80 28 80 54 L 80 88",
      ...Array.from({ length: 7 }, (_, index) => {
        const angle = ((190 + index * 27) * Math.PI) / 180;
        return star(50 + Math.cos(angle) * 34, 54 + Math.sin(angle) * 34, 3.4, 1.4, 4);
      }),
    )],
    ["Celestial border", join(
      line(4, 16, 96, 16),
      line(4, 84, 96, 84),
      ...Array.from({ length: 6 }, (_, index) => {
        const x = 12 + index * 15;
        return join(circle(x, 50, 9), `M ${x - 5} 50 C ${x - 2} 44 ${x + 2} 44 ${x + 5} 50 C ${x + 2} 56 ${x - 2} 56 ${x - 5} 50 Z`, star(x + 6, 44, 2.4, 1, 4));
      }),
    )],
    ["Moon wreath", join(
      "M 54 12 C 62 26 58 44 46 52 C 34 60 20 56 14 44 C 20 66 44 80 64 68 C 84 56 78 26 54 12 Z",
      ...Array.from({ length: 8 }, (_, index) => {
        const angle = ((210 + index * 20) * Math.PI) / 180;
        return leaf(50 + Math.cos(angle) * 34, 50 + Math.sin(angle) * 34, 12, 4, (angle * 180) / Math.PI + 90);
      }),
      star(66, 26, 4, 1.6, 4),
    )],
    ["Ringed planet", join(
      circle(50, 50, 22),
      ellipse(50, 52, 44, 10),
      line(12, 44, 22, 40),
      line(30, 32, 36, 24),
      circle(62, 42, 4),
      circle(40, 60, 3),
      star(82, 20, 3.4, 1.4, 4),
    )],
    ["Astrolabe", join(
      circle(50, 50, 38),
      circle(50, 50, 32),
      circle(50, 50, 20),
      ...Array.from({ length: 8 }, (_, index) => {
        const angle = (index * 45 * Math.PI) / 180;
        return line(50 + Math.cos(angle) * 20, 50 + Math.sin(angle) * 20, 50 + Math.cos(angle) * 38, 50 + Math.sin(angle) * 38);
      }),
      line(50, 6, 50, 18),
      line(50, 82, 50, 94),
      line(6, 50, 18, 50),
      line(82, 50, 94, 50),
      "M 30 30 C 40 36 60 36 70 30",
    )],
    ["Armillary sphere", join(
      circle(50, 50, 34),
      ellipse(50, 50, 34, 12),
      rotatePath(ellipse(50, 50, 34, 12), 60),
      rotatePath(ellipse(50, 50, 34, 12), 120),
      line(50, 8, 50, 20),
      line(50, 80, 50, 92),
      circle(50, 50, 4),
    )],
    ["Zodiac wheel", join(
      circle(50, 50, 40),
      circle(50, 50, 32),
      circle(50, 50, 20),
      ...Array.from({ length: 12 }, (_, index) => {
        const angle = (index * 30 * Math.PI) / 180;
        return line(50 + Math.cos(angle) * 32, 50 + Math.sin(angle) * 32, 50 + Math.cos(angle) * 40, 50 + Math.sin(angle) * 40);
      }),
      ...Array.from({ length: 12 }, (_, index) => {
        const angle = ((index * 30 + 15) * Math.PI) / 180;
        return star(50 + Math.cos(angle) * 26, 50 + Math.sin(angle) * 26, 3, 1.2, 4);
      }),
      star(50, 50, 9, 3.6, 8),
    )],
    ["Observatory", join(
      "M 16 90 L 16 56 C 16 36 84 36 84 56 L 84 90",
      "M 30 90 L 30 58 C 30 46 70 46 70 58 L 70 90",
      rect(44, 70, 12, 20, 1),
      line(50, 38, 62, 14),
      circle(62, 14, 3),
      line(10, 90, 90, 90),
      ...Array.from({ length: 5 }, (_, index) => line(20 + index * 15, 46, 24 + index * 15, 40)),
    )],
    ["Sundial", join(
      ellipse(50, 74, 34, 12),
      line(50, 74, 50, 48),
      "M 50 48 L 28 34",
      "M 28 34 L 34 44 L 48 50 Z",
      ...Array.from({ length: 7 }, (_, index) => {
        const angle = ((195 + index * 25) * Math.PI) / 180;
        return line(50 + Math.cos(angle) * 28, 74 + Math.sin(angle) * 8, 50 + Math.cos(angle) * 34, 74 + Math.sin(angle) * 10);
      }),
      star(50, 16, 4, 1.6, 4),
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Night sky",
    tags: ["celestial", "night", "sky", "astronomy", "stars", "mystical"],
    ink: "stroke",
    strokeWidth: 1.3,
    aspect: 1.3,
  }));
}

export function celestialAssets() {
  return [...sunMoon(), ...stars(), ...zodiac(), ...mystic(), ...nightSky()];
}
