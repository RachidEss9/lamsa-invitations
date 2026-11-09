import {
  circle,
  ellipse,
  leaf,
  line,
  petal,
  polygon,
  rect,
  star,
  sweep,
} from "../paths.mjs";

const join = (...parts) => parts.flat(Infinity).filter(Boolean).join(" ");

/** An arch outline: jambs, spring line and a head that can be pointed or lobed. */
function archFrame(half, spring, apex, base = 92, head = "point") {
  const left = 50 - half;
  const right = 50 + half;
  if (head === "ogee") {
    return join(
      `M ${left} ${base} L ${left} ${spring}`,
      `C ${left} ${spring - 24} ${50 - half * 0.2} ${apex + 10} 50 ${apex}`,
      `C ${50 + half * 0.2} ${apex + 10} ${right} ${spring - 24} ${right} ${spring}`,
      `L ${right} ${base}`,
    );
  }
  if (head === "multifoil") {
    return join(
      `M ${left} ${base} L ${left} ${spring}`,
      `C ${left} ${spring - 14} ${left + half * 0.3} ${spring - 22} ${left + half * 0.4} ${spring - 12}`,
      `C ${left + half * 0.3} ${apex} 50 ${apex - 6} 50 ${apex}`,
      `C 50 ${apex - 6} ${right - half * 0.3} ${apex} ${right - half * 0.4} ${spring - 12}`,
      `C ${right - half * 0.3} ${spring - 22} ${right} ${spring - 14} ${right} ${spring}`,
      `L ${right} ${base}`,
    );
  }
  if (head === "horseshoe") {
    return join(
      `M ${left} ${base} L ${left} ${spring}`,
      `C ${left} ${apex - 8} ${50 - half * 0.5} ${apex - 14} 50 ${apex - 14}`,
      `C ${50 + half * 0.5} ${apex - 14} ${right} ${apex - 8} ${right} ${spring}`,
      `L ${right} ${base}`,
    );
  }
  return join(
    `M ${left} ${base} L ${left} ${spring}`,
    `C ${left} ${apex + 14} ${50 - half * 0.45} ${apex} 50 ${apex}`,
    `C ${50 + half * 0.45} ${apex} ${right} ${apex + 14} ${right} ${spring}`,
    `L ${right} ${base}`,
  );
}

function arches() {
  const frame = (half, spring, apex, inner = 7) =>
    join(archFrame(half, spring, apex), archFrame(half - inner, spring, apex + inner * 0.7, 92));
  const defs = [
    ["Pointed arch niche", frame(34, 46, 18)],
    ["Ogee arch frame", join(archFrame(34, 48, 18, 92, "ogee"), archFrame(27, 48, 25, 92, "ogee"))],
    ["Horseshoe arch frame", join(archFrame(35, 48, 20, 92, "horseshoe"), archFrame(28, 48, 27, 92, "horseshoe"))],
    ["Multifoil arch frame", join(archFrame(36, 50, 18, 92, "multifoil"), circle(50, 46, 13))],
    ["Keyhole arch frame", join("M 20 92 L 20 50 C 20 22 80 22 80 50 L 80 92", "M 28 92 L 28 52 C 28 32 72 32 72 52 L 72 92", circle(50, 40, 9))],
    ["Mihrab niche", join(archFrame(28, 48, 16), archFrame(23, 48, 21), line(24, 78, 76, 78), star(50, 34, 5, 2, 8))],
    ["Three-arch arcade", join(
      archFrame(13, 50, 34, 88),
      "M 37 88 L 37 52 C 37 36 63 36 63 52 L 63 88",
      "M 63 88 L 63 52 C 63 36 89 36 89 52 L 89 88",
      line(4, 88, 96, 88),
      line(4, 46, 96, 46),
    )],
    ["Twin arch screen", join(
      "M 10 92 L 10 46 C 10 28 38 28 46 44 C 54 28 82 28 82 46 L 82 92",
      "M 46 92 L 46 54 C 46 46 54 46 54 54 L 54 92",
      line(10, 66, 46, 66),
      line(54, 66, 82, 66),
      circle(46, 50, 2.4),
      circle(54, 50, 2.4),
    )],
    ["Arch with columns", join(
      archFrame(30, 44, 20),
      "M 16 44 L 16 92 M 12 44 L 20 44 M 12 92 L 20 92 M 14 50 L 18 50 M 14 58 L 18 58 M 14 66 L 18 66",
      "M 84 44 L 84 92 M 80 44 L 88 44 M 80 92 L 88 92 M 82 50 L 86 50 M 82 58 L 86 58 M 82 66 L 86 66",
      line(10, 92, 90, 92),
      line(12, 38, 88, 38),
      star(50, 26, 6, 2.4, 8),
    )],
    ["Scalloped arch window", join(
      "M 18 92 L 18 48 C 18 20 34 14 50 26 C 66 14 82 20 82 48 L 82 92",
      ...Array.from({ length: 5 }, (_, index) => circle(30 + index * 10, 40 - (index === 2 ? 8 : 0), 5)),
      line(18, 58, 82, 58),
    )],
    ["Star-headed arch", join(
      archFrame(34, 48, 22),
      star(50, 22, 9, 3.6, 8),
      line(34, 62, 66, 62),
      line(38, 72, 62, 72),
    )],
    ["Muqarnas arch", join(
      archFrame(36, 50, 18),
      ...Array.from({ length: 3 }, (_, row) =>
        Array.from({ length: 5 - row }, (_, index) =>
          `M ${32 + index * 9 + row * 4.5} ${34 + row * 6} Q ${36.5 + index * 9 + row * 4.5} ${28 + row * 6} ${41 + index * 9 + row * 4.5} ${34 + row * 6}`,
        ).join(" "),
      ),
      line(20, 70, 80, 70),
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Arches",
    tags: ["islamic", "arch", "moorish", "architecture", "frame", "ornament"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 0.72,
  }));
}

function geometry() {
  const defs = [
    ["Eight-fold star rosette", join(star(50, 50, 40, 18, 8), star(50, 50, 40, 18, 8, -67.5), circle(50, 50, 12))],
    ["Twelve-fold star rosette", join(star(50, 50, 40, 21, 12), circle(50, 50, 22), star(50, 50, 12, 6, 12))],
    ["Girih hexagon tile", join(polygon(50, 50, 40, 40, 6), polygon(50, 50, 26, 26, 6, -60), line(50, 10, 50, 90), line(15, 30, 85, 70), line(15, 70, 85, 30))],
    ["Interlaced star", join(star(50, 50, 40, 17, 8), star(50, 50, 30, 13, 8, -67.5), star(50, 50, 20, 9, 8), circle(50, 50, 6))],
    ["Ten-point star tile", join(star(50, 50, 40, 20, 10), polygon(50, 50, 24, 24, 10), circle(50, 50, 7))],
    ["Strapwork square", join(rect(10, 10, 80, 80), rect(20, 20, 60, 60), line(10, 10, 90, 90), line(90, 10, 10, 90), star(50, 50, 16, 6, 8))],
    ["Octagon tessellation", join(polygon(50, 50, 40, 40, 8), polygon(50, 50, 28, 28, 8, 22.5), ...Array.from({ length: 4 }, (_, index) => line(50, 50, 50 + Math.cos((index * 90 * Math.PI) / 180) * 40, 50 + Math.sin((index * 90 * Math.PI) / 180) * 40)))],
    ["Sixteen-point star panel", join(star(50, 50, 41, 22, 16), star(50, 50, 26, 14, 16, -101.25), circle(50, 50, 8))],
    ["Pentagonal girih", join(polygon(50, 50, 40, 40, 5), polygon(50, 50, 40, 40, 5, -18), polygon(50, 50, 26, 26, 5), star(50, 50, 12, 5, 5))],
    ["Sixfold knot", join(circle(50, 50, 30), ...Array.from({ length: 6 }, (_, index) => {
      const angle = (index * 60 * Math.PI) / 180;
      return circle(50 + Math.cos(angle) * 18, 50 + Math.sin(angle) * 18, 16);
    }))],
    ["Star and cross tile", join(star(50, 50, 34, 15, 8), rect(80, 10, 10, 10), rect(10, 80, 10, 10), rect(80, 80, 10, 10), rect(10, 10, 10, 10))],
    ["Dodecagon rosette", join(polygon(50, 50, 40, 40, 12), ...Array.from({ length: 6 }, (_, index) => petal(50, 50, 30, 8, index * 60)), circle(50, 50, 11))],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Geometry",
    tags: ["islamic", "geometry", "girih", "tile", "pattern", "rosette"],
    ink: "stroke",
    strokeWidth: 1.3,
    aspect: 1,
  }));
}

function arabesque() {
  const splitLeaf = join(
    "M 50 90 C 44 66 32 54 20 44 C 34 38 44 44 50 54 C 56 44 66 38 80 44 C 68 54 56 66 50 90 Z",
    line(50, 90, 50, 40),
    leaf(50, 38, 18, 6, -90),
    leaf(32, 58, 18, 5, 140),
    leaf(68, 58, 18, 5, 40),
  );
  const vine = join(
    "M 10 84 C 20 58 38 62 46 48 C 54 34 72 30 90 16",
    ...Array.from({ length: 6 }, (_, index) => {
      const x = 18 + index * 12;
      const y = 76 - index * 10;
      return leaf(x, y, 12, 4, index % 2 ? 60 : 210);
    }),
    ...Array.from({ length: 3 }, (_, index) => circle(34 + index * 18, 58 - index * 14, 3.4)),
  );
  const corner = join(
    "M 14 14 L 14 46 C 14 30 30 14 46 14 Z",
    leaf(14, 14, 30, 9, 45),
    leaf(28, 28, 24, 8, 45),
    "M 14 60 C 22 52 30 54 34 60",
    circle(38, 20, 3),
  );
  const medallion = join(
    ...Array.from({ length: 8 }, (_, index) => {
      const angle = (index * 45 * Math.PI) / 180;
      return petal(50 + Math.cos(angle) * 12, 50 + Math.sin(angle) * 12, 22, 9, (angle * 180) / Math.PI);
    }),
    ...Array.from({ length: 8 }, (_, index) => {
      const angle = ((index * 45 + 22.5) * Math.PI) / 180;
      return leaf(50 + Math.cos(angle) * 34, 50 + Math.sin(angle) * 34, 12, 4, (angle * 180) / Math.PI + 90);
    }),
    circle(50, 50, 10),
    circle(50, 50, 4),
  );
  const border = join(
    line(6, 18, 94, 18),
    line(6, 82, 94, 82),
    ...Array.from({ length: 6 }, (_, index) => {
      const x = 12 + index * 15;
      return join(petal(x, 50, 12, 6, -90), petal(x, 50, 12, 6, 90), leaf(x + 7, 50, 10, 3, 90));
    }),
  );
  const spandrel = join(
    "M 8 92 L 8 10 C 34 10 56 32 56 58 C 56 76 42 92 8 92 Z",
    leaf(22, 22, 26, 8, 45),
    leaf(30, 34, 26, 8, 45),
    leaf(38, 46, 22, 7, 45),
    "M 16 84 C 32 76 40 62 40 48",
  );
  const halfMedallion = join(
    ...Array.from({ length: 5 }, (_, index) => petal(50, 78, 26, 10, -150 + index * 30)),
    sweep(50, 78, 40, 40, 180, 360),
    circle(50, 78, 8),
    line(10, 78, 90, 78),
  );
  const cloudBand = join(
    "M 4 44 C 16 24 28 24 32 36 C 36 24 48 20 54 32 C 60 20 72 22 76 34 C 82 24 94 28 96 44 C 84 62 72 62 66 52 C 60 64 48 66 42 54 C 36 66 22 64 16 52 C 10 62 2 58 4 44 Z",
    ...Array.from({ length: 5 }, (_, index) => circle(20 + index * 15, 38 + (index % 2) * 6, 2.2)),
  );
  const archArabesque = join(
    "M 22 92 L 22 50 C 22 26 78 26 78 50 L 78 92",
    ...Array.from({ length: 5 }, (_, index) => leaf(30 + index * 10, 46, 16, 5, 90)),
    ...Array.from({ length: 3 }, (_, index) => circle(38 + index * 12, 70, 4)),
    star(50, 24, 6, 2.4, 8),
  );
  const floralRosette = join(
    ...Array.from({ length: 12 }, (_, index) => petal(50, 50, 24, 7, index * 30, 0.4)),
    ...Array.from({ length: 12 }, (_, index) => petal(50, 50, 13, 4, index * 30 + 15, 0.4)),
    circle(50, 50, 12),
    circle(50, 50, 5),
  );
  const trefoil = join(
    petal(50, 44, 26, 10, -90),
    petal(38, 54, 24, 10, 150),
    petal(62, 54, 24, 10, 30),
    circle(50, 54, 12),
    leaf(50, 62, 16, 5, 90),
    "M 50 78 L 50 92",
  );
  const scrollPair = join(
    "M 8 76 C 24 76 30 60 24 46 C 18 32 32 22 46 30",
    "M 92 76 C 76 76 70 60 76 46 C 82 32 68 22 54 30",
    ...Array.from({ length: 4 }, (_, index) => leaf(18 + index * 18, 60 - index * 4, 12, 4, index % 2 ? 60 : 200)),
    star(50, 34, 9, 3.6, 8),
    line(50, 42, 50, 76),
    circle(50, 80, 3),
  );
  return [
    ["Split palmette", "Arabesque", splitLeaf],
    ["Islimi vine scroll", "Arabesque", vine],
    ["Arabesque corner", "Arabesque", corner],
    ["Arabesque medallion", "Arabesque", medallion],
    ["Islimi border", "Arabesque", border],
    ["Arabesque spandrel", "Arabesque", spandrel],
    ["Half medallion", "Arabesque", halfMedallion],
    ["Cloud band", "Arabesque", cloudBand],
    ["Arabesque arch", "Arabesque", archArabesque],
    ["Floral arabesque rosette", "Arabesque", floralRosette],
    ["Trefoil arabesque", "Arabesque", trefoil],
    ["Scroll pair", "Arabesque", scrollPair],
  ].map(([name, subcategory, d]) => ({
    name,
    d,
    subcategory,
    tags: ["islamic", "arabesque", "islimi", "ornament", "floral", "scroll"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 1,
  }));
}

function faith() {
  const crescentStar = join(
    "M 62 18 C 38 24 24 44 30 64 C 36 84 58 94 78 84 C 58 88 42 76 40 60 C 38 42 48 28 62 18 Z",
    star(72, 32, 12, 5, 5),
  );
  const dome = join(
    "M 18 84 L 18 56 C 18 40 32 34 50 34 C 68 34 82 40 82 56 L 82 84",
    "M 50 8 C 44 18 34 24 34 34 C 34 42 42 46 50 46 C 58 46 66 42 66 34 C 66 24 56 18 50 8 Z",
    line(50, 8, 50, 4),
    circle(50, 3, 2),
    line(12, 84, 88, 84),
    ...Array.from({ length: 5 }, (_, index) => `M ${24 + index * 13} 84 L ${24 + index * 13} 70`),
  );
  const minaret = join(
    "M 38 92 L 38 34 L 44 34 L 44 24 L 50 14 L 56 24 L 56 34 L 62 34 L 62 92",
    line(34, 92, 66, 92),
    line(34, 42, 66, 42),
    line(36, 54, 64, 54),
    line(36, 66, 64, 66),
    star(50, 10, 4, 1.6, 8),
    ...Array.from({ length: 3 }, (_, index) => `M ${42 + index * 4} ${46 + index * 12} Q 50 ${50 + index * 12} ${58 - index * 4} ${46 + index * 12}`),
  );
  const beads = join(
    ...Array.from({ length: 16 }, (_, index) => {
      const angle = ((index * 22.5 + 180) * Math.PI) / 180;
      return circle(50 + Math.cos(angle) * 34, 46 + Math.sin(angle) * 34, 3.4);
    }),
    line(50, 12, 50, 4),
    "M 50 4 C 54 0 60 4 58 8",
    "M 50 80 L 46 88 L 50 96 L 54 88 Z",
  );
  const quranStand = join(
    "M 50 92 L 26 20 L 74 20 Z",
    "M 26 20 L 50 34 L 74 20",
    line(34, 34, 66, 34),
    line(31, 46, 69, 46),
    line(28, 58, 72, 58),
    line(25, 72, 75, 72),
    star(50, 14, 3.4, 1.4, 8),
  );
  const lamp = join(
    "M 40 20 L 60 20 L 64 34 L 64 46 C 64 56 58 62 58 70 L 58 84 L 42 84 L 42 70 C 42 62 36 56 36 46 L 36 34 Z",
    line(50, 84, 50, 92),
    line(43, 92, 57, 92),
    line(40, 28, 60, 28),
    line(36, 46, 64, 46),
    ...Array.from({ length: 4 }, (_, index) => line(42 + index * 5, 52, 42 + index * 5, 66)),
    "M 44 70 Q 50 76 56 70",
    circle(50, 18, 2.4),
  );
  const fanous = join(
    "M 50 8 L 50 18",
    "M 40 18 L 60 18 L 62 30 L 62 56 L 58 64 L 50 70 L 42 64 L 38 56 L 38 30 Z",
    "M 38 30 L 62 30",
    "M 38 56 L 62 56",
    line(50, 30, 50, 70),
    "M 44 34 L 56 48 M 56 34 L 44 48",
    line(50, 70, 50, 78),
    line(44, 78, 56, 78),
    star(50, 78, 3.4, 1.4, 8),
  );
  const mosque = join(
    "M 12 86 L 12 64 L 26 64 L 26 48 C 26 38 36 36 40 46 L 40 86",
    "M 60 86 L 60 46 C 64 36 74 38 74 48 L 74 64 L 88 64 L 88 86",
    "M 40 86 L 40 58 C 40 44 60 44 60 58 L 60 86",
    "M 46 86 L 46 70 C 46 62 54 62 54 70 L 54 86",
    "M 40 52 C 44 44 56 44 60 52",
    ...Array.from({ length: 3 }, (_, index) => circle(16 + index * 5, 72, 2.4)),
    line(6, 86, 94, 86),
  );
  const rug = join(
    "M 18 12 L 82 12 L 82 84 L 50 94 L 18 84 Z",
    rect(26, 20, 48, 54),
    star(50, 44, 16, 7, 8),
    ...Array.from({ length: 3 }, (_, index) => line(26, 26 + index * 16, 74, 26 + index * 16)),
    line(42, 84, 50, 90),
    line(58, 84, 50, 90),
  );
  const crescentFinial = join(
    "M 50 92 L 50 44",
    "M 42 44 L 58 44",
    "M 50 44 C 38 36 38 20 48 14 C 42 24 44 34 54 38 C 62 34 64 22 58 14 C 68 20 68 36 56 44 Z",
    circle(50, 48, 3),
    line(38, 92, 62, 92),
  );
  const starFinial = join(
    line(50, 92, 50, 40),
    star(50, 28, 18, 7, 8),
    star(50, 28, 8, 3.4, 8),
    line(42, 92, 58, 92),
    "M 50 46 C 42 54 42 62 50 66 C 58 62 58 54 50 46 Z",
  );
  const minbar = join(
    "M 20 92 L 20 24 L 80 24 L 80 92",
    "M 20 24 L 14 16 L 86 16 L 80 24",
    ...Array.from({ length: 5 }, (_, index) => line(20, 36 + index * 10, 80, 36 + index * 10)),
    "M 26 92 L 26 78 L 38 78 L 38 92",
    "M 62 92 L 62 78 L 74 78 L 74 92",
    "M 44 16 L 50 6 L 56 16",
  );
  return [
    ["Crescent and star", "Faith & architecture", crescentStar],
    ["Dome and drum", "Faith & architecture", dome],
    ["Minaret", "Faith & architecture", minaret],
    ["Prayer beads", "Faith & architecture", beads],
    ["Quran stand", "Faith & architecture", quranStand],
    ["Mihrab lamp", "Faith & architecture", lamp],
    ["Fanous lantern", "Faith & architecture", fanous],
    ["Mosque silhouette", "Faith & architecture", mosque],
    ["Prayer rug", "Faith & architecture", rug],
    ["Crescent finial", "Faith & architecture", crescentFinial],
    ["Star finial", "Faith & architecture", starFinial],
    ["Minbar pulpit", "Faith & architecture", minbar],
  ].map(([name, subcategory, d]) => ({
    name,
    d,
    subcategory,
    tags: ["islamic", "mosque", "faith", "ramadan", "architecture", "symbol"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 1,
  }));
}

function ornament() {
  const screen = join(
    rect(10, 10, 80, 80),
    ...Array.from({ length: 4 }, (_, index) => {
      const x = 28 + index * 15;
      return join(
        `M ${x} 10 L ${x} 90`,
        `M ${50 - (index + 1) * 10} 20 L ${50 + (index + 1) * 10} 80`,
        `M ${50 + (index + 1) * 10} 20 L ${50 - (index + 1) * 10} 80`,
      );
    }),
    star(50, 50, 12, 5, 8),
  );
  const jali = join(
    rect(8, 8, 84, 84),
    ...Array.from({ length: 3 }, (_, row) =>
      Array.from({ length: 3 }, (_, col) => {
        const x = 25 + col * 25;
        const y = 25 + row * 25;
        return join(star(x, y, 11, 4.6, 8), circle(x, y, 4));
      }).join(" "),
    ),
  );
  const zellige = join(
    ...Array.from({ length: 16 }, (_, index) => {
      const x = 17 + (index % 4) * 22;
      const y = 17 + Math.floor(index / 4) * 22;
      return polygon(x, y, 13, 13, 8, index % 2 ? 22.5 : 0);
    }),
    line(4, 50, 96, 50),
    line(50, 4, 50, 96),
  );
  const muqarnasDome = join(
    sweep(50, 86, 38, 38, 180, 360),
    ...Array.from({ length: 4 }, (_, row) =>
      Array.from({ length: 5 - row }, (_, index) =>
        `M ${28 + index * 11 + row * 5.5} ${54 + row * 7} Q ${33.5 + index * 11 + row * 5.5} ${47 + row * 7} ${39 + index * 11 + row * 5.5} ${54 + row * 7}`,
      ).join(" "),
    ),
    line(12, 86, 88, 86),
    star(50, 12, 5, 2, 8),
  );
  const fountain = join(
    ellipse(50, 76, 34, 12),
    ellipse(50, 76, 26, 8),
    line(50, 44, 50, 76),
    ellipse(50, 44, 12, 4),
    ...Array.from({ length: 6 }, (_, index) => {
      const angle = ((200 + index * 28) * Math.PI) / 180;
      return `M 50 44 Q ${50 + Math.cos(angle) * 20} ${30 + Math.sin(angle) * 10} ${50 + Math.cos(angle) * 30} ${66 + Math.sin(angle) * 6}`;
    }),
    ...Array.from({ length: 8 }, (_, index) => circle(24 + index * 7.5, 72, 1.4)),
  );
  const henna = join(
    ...Array.from({ length: 8 }, (_, index) => petal(50, 54, 26, 8, index * 45, 0.45)),
    ...Array.from({ length: 8 }, (_, index) => petal(50, 54, 14, 4, index * 45 + 22.5, 0.45)),
    circle(50, 54, 12),
    circle(50, 54, 5),
    line(50, 80, 50, 92),
    leaf(38, 84, 14, 5, 150),
    leaf(62, 84, 14, 5, 30),
  );
  const lanternRow = join(
    line(4, 16, 96, 16),
    ...Array.from({ length: 4 }, (_, index) => {
      const x = 17 + index * 22;
      const tall = index % 2 ? 0 : 6;
      return join(
        line(x, 16, x, 24 + tall),
        `M ${x - 8} ${24 + tall} L ${x + 8} ${24 + tall} L ${x + 6} ${38 + tall} L ${x + 6} ${62 + tall} L ${x} ${72 + tall} L ${x - 6} ${62 + tall} L ${x - 6} ${38 + tall} Z`,
        line(x - 6, 38 + tall, x + 6, 38 + tall),
        line(x - 6, 62 + tall, x + 6, 62 + tall),
        line(x, 72 + tall, x, 80 + tall),
      );
    }),
  );
  const geometricBorder = join(
    line(4, 20, 96, 20),
    line(4, 80, 96, 80),
    ...Array.from({ length: 8 }, (_, index) => {
      const x = 10 + index * 11.4;
      return join(star(x, 50, 8, 3.4, 8), circle(x, 50, 2));
    }),
    line(4, 28, 96, 28),
    line(4, 72, 96, 72),
  );
  const archBorder = join(
    ...Array.from({ length: 3 }, (_, index) => {
      const x = 20 + index * 30;
      return join(
        `M ${x - 12} 76 L ${x - 12} 44 C ${x - 12} 28 ${x + 12} 28 ${x + 12} 44 L ${x + 12} 76`,
        `M ${x - 7} 76 L ${x - 7} 46 C ${x - 7} 34 ${x + 7} 34 ${x + 7} 46 L ${x + 7} 76`,
      );
    }),
    line(2, 76, 98, 76),
    line(2, 86, 98, 86),
  );
  const starLattice = join(
    ...Array.from({ length: 4 }, (_, row) =>
      Array.from({ length: 4 }, (_, col) => {
        const x = 17 + col * 22 + (row % 2) * 11;
        const y = 17 + row * 22;
        return star(x, y, 10, 4, 8);
      }).join(" "),
    ),
    ...Array.from({ length: 4 }, (_, index) => line(0, 17 + index * 22, 100, 17 + index * 22)),
  );
  const arabesqueCorner = join(
    "M 8 8 L 8 52 C 8 30 30 8 52 8 Z",
    leaf(8, 8, 38, 11, 45),
    leaf(24, 24, 30, 9, 45),
    leaf(38, 38, 22, 7, 45),
    "M 8 66 C 20 56 32 58 40 66 C 32 74 18 76 8 68",
    circle(44, 16, 3),
  );
  const domePlan = join(
    circle(50, 50, 40),
    circle(50, 50, 30),
    circle(50, 50, 20),
    ...Array.from({ length: 16 }, (_, index) => {
      const angle = (index * 22.5 * Math.PI) / 180;
      return line(50 + Math.cos(angle) * 20, 50 + Math.sin(angle) * 20, 50 + Math.cos(angle) * 40, 50 + Math.sin(angle) * 40);
    }),
    star(50, 50, 10, 4, 8),
  );
  return [
    ["Mashrabiya screen", "Ornament", screen],
    ["Jali panel", "Ornament", jali],
    ["Zellige tile", "Ornament", zellige],
    ["Muqarnas dome", "Ornament", muqarnasDome],
    ["Courtyard fountain", "Ornament", fountain],
    ["Henna flower", "Ornament", henna],
    ["Lantern row", "Ornament", lanternRow],
    ["Geometric border", "Ornament", geometricBorder],
    ["Arch border", "Ornament", archBorder],
    ["Star lattice", "Ornament", starLattice],
    ["Arabesque corner ornament", "Ornament", arabesqueCorner],
    ["Dome ceiling plan", "Ornament", domePlan],
  ].map(([name, subcategory, d]) => ({
    name,
    d,
    subcategory,
    tags: ["islamic", "ornament", "pattern", "screen", "tile", "border"],
    ink: "stroke",
    strokeWidth: 1.3,
    aspect: 1,
  }));
}

export function islamicAssets() {
  return [...arches(), ...geometry(), ...arabesque(), ...faith(), ...ornament()];
}
