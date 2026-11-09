import {
  circle,
  ellipse,
  line,
  rect,
  rotatePath,
  roundedRect,
  star,
  sweep,
} from "../paths.mjs";

const join = (...parts) => parts.flat(Infinity).filter(Boolean).join(" ");

function supplies() {
  const defs = [
    ["School backpack", join(
      "M 22 42 C 22 26 34 18 50 18 C 66 18 78 26 78 42 L 78 84 L 62 84 L 62 68 L 38 68 L 38 84 L 22 84 Z",
      "M 30 22 C 30 12 70 12 70 22",
      roundedRect(34, 48, 32, 16, 2),
      line(38, 56, 62, 56),
      line(22, 62, 34, 62),
      line(66, 62, 78, 62),
      star(50, 32, 5, 2, 5),
    )],
    ["Lunchbox", join(
      roundedRect(14, 34, 72, 46, 6),
      "M 14 46 L 86 46",
      "M 36 34 C 36 22 64 22 64 34",
      roundedRect(40, 52, 20, 14, 2),
      line(44, 58, 56, 58),
      star(28, 38, 4, 1.6, 4),
      star(72, 38, 4, 1.6, 4),
    )],
    ["Water bottle", join(
      "M 38 30 L 62 30 L 66 86 C 62 92 38 92 34 86 Z",
      roundedRect(40, 16, 20, 14, 3),
      rect(44, 8, 12, 8, 2),
      line(36, 44, 64, 44),
      line(36, 58, 64, 58),
      star(50, 70, 5, 2, 5),
    )],
    ["Pencil case", join(
      "M 12 44 C 12 36 88 36 88 44 L 88 68 C 88 76 12 76 12 68 Z",
      line(12, 54, 88, 54),
      ...Array.from({ length: 6 }, (_, index) => line(20 + index * 12, 44, 20 + index * 12, 54)),
      circle(50, 61, 2),
      "M 88 50 C 94 52 94 60 88 62",
    )],
    ["Crayons", join(
      ...Array.from({ length: 4 }, (_, index) => {
        const x = 18 + index * 17;
        return join(
          `M ${x} 40 L ${x + 11} 40 L ${x + 11} 86 L ${x} 86 Z`,
          `M ${x} 40 L ${x + 5.5} 26 L ${x + 11} 40`,
          `M ${x + 3} 48 L ${x + 8} 48`,
        );
      }),
      line(12, 86, 88, 86),
    )],
    ["Glue bottle", join(
      "M 34 36 L 66 36 L 66 84 C 62 90 38 90 34 84 Z",
      "M 40 36 L 40 26 L 60 26 L 60 36",
      "M 44 26 L 44 14 L 56 14 L 56 26",
      "M 50 14 L 50 6",
      rect(40, 48, 20, 18, 2),
      line(44, 56, 56, 56),
      line(44, 62, 52, 62),
    )],
    ["Safety scissors", join(
      "M 18 18 L 50 50 L 44 56 L 12 26 Z",
      "M 18 82 L 50 50 L 44 44 L 12 74 Z",
      circle(58, 44, 8),
      circle(58, 58, 8),
      circle(58, 44, 3),
      circle(58, 58, 3),
    )],
    ["Protractor", join(
      sweep(50, 70, 38, 38, 180, 360),
      line(12, 70, 88, 70),
      line(50, 70, 50, 32),
      ...Array.from({ length: 13 }, (_, index) => {
        const angle = ((180 + index * 15) * Math.PI) / 180;
        const inner = index % 3 === 0 ? 28 : 32;
        return line(50 + Math.cos(angle) * inner, 70 + Math.sin(angle) * inner, 50 + Math.cos(angle) * 36, 70 + Math.sin(angle) * 36);
      }),
      circle(50, 70, 4),
    )],
    ["Geometry set", join(
      rect(8, 30, 84, 40, 3),
      "M 26 62 L 36 40 L 46 62 Z",
      "M 56 40 L 56 62 L 78 40 Z",
      "M 22 50 L 46 50",
      line(16, 36, 84, 36),
    )],
    ["Paint palette", join(
      "M 14 52 C 14 30 42 20 62 26 C 84 32 90 52 76 64 C 66 74 54 68 54 58 C 54 50 48 46 44 52 C 40 60 28 64 20 60 Z",
      ...Array.from({ length: 5 }, (_, index) => {
        const angle = ((200 + index * 28) * Math.PI) / 180;
        return circle(50 + Math.cos(angle) * 26, 50 + Math.sin(angle) * 18, 5);
      }),
      circle(34, 56, 4),
    )],
    ["Artist paintbrush", join(
      line(30, 92, 64, 26),
      roundedRect(58, 18, 14, 16, 4),
      "M 64 18 C 60 8 74 4 78 12 C 82 20 72 24 64 18 Z",
      line(34, 82, 40, 82),
      circle(50, 60, 1.4),
    )],
    ["Chalkboard eraser", join(
      "M 16 50 L 76 50 L 84 74 L 24 74 Z",
      "M 16 50 L 16 58 L 24 82 L 24 74",
      rect(26, 58, 44, 8, 2),
      ...Array.from({ length: 4 }, (_, index) => line(30 + index * 10, 60, 34 + index * 10, 64)),
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "School supplies",
    tags: ["education", "school", "supplies", "classroom", "students", "learning"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 1,
  }));
}

function classroom() {
  const defs = [
    ["Blackboard", join(
      rect(6, 12, 88, 66),
      rect(12, 18, 76, 54, 1),
      line(20, 32, 54, 32),
      line(20, 42, 68, 42),
      line(20, 52, 44, 52),
      line(58, 32, 78, 32),
      rect(28, 78, 44, 8, 2),
      ellipse(36, 82, 4, 2),
      ellipse(46, 82, 4, 2),
    )],
    ["Whiteboard", join(
      roundedRect(6, 10, 88, 68, 2),
      ...Array.from({ length: 3 }, (_, index) => line(18, 26 + index * 10, 18 + (index + 1) * 18, 26 + index * 10)),
      "M 62 26 L 78 40 L 72 46 L 56 32 Z",
      rect(22, 84, 56, 6, 2),
      line(24, 62, 58, 62),
    )],
    ["Easel", join(
      line(28, 10, 18, 92),
      line(72, 10, 82, 92),
      line(50, 8, 50, 92),
      rect(18, 26, 64, 44, 1),
      line(18, 34, 82, 34),
      "M 24 44 L 36 58 L 44 50 L 54 66 L 74 40",
      line(24, 76, 76, 76),
    )],
    ["School desk", join(
      "M 10 46 L 90 42 L 90 50 L 10 54 Z",
      line(16, 54, 16, 90),
      line(80, 50, 80, 90),
      rect(26, 54, 48, 10, 1),
      line(26, 64, 74, 64),
      "M 26 54 L 26 88",
      "M 74 54 L 74 88",
      circle(12, 38, 3),
      rect(44, 30, 14, 4, 1),
    )],
    ["Locker", join(
      rect(16, 8, 68, 84),
      line(50, 8, 50, 92),
      ...Array.from({ length: 3 }, (_, index) => line(16, 22 + index * 22, 50, 22 + index * 22)),
      ...Array.from({ length: 3 }, (_, index) => line(50, 22 + index * 22, 84, 22 + index * 22)),
      ...Array.from({ length: 3 }, (_, index) => line(36, 14 + index * 22, 36, 18 + index * 22)),
      ...Array.from({ length: 3 }, (_, index) => line(60, 14 + index * 22, 60, 18 + index * 22)),
      circle(30, 32, 1.4),
      circle(64, 32, 1.4),
    )],
    ["School bell", join(
      "M 24 60 C 24 30 76 30 76 60 Z",
      line(20, 60, 80, 60),
      ellipse(50, 60, 30, 4),
      circle(50, 26, 4),
      line(50, 30, 50, 38),
      line(38, 68, 62, 68),
      line(50, 68, 50, 76),
      circle(50, 80, 4),
    )],
    ["Timetable", join(
      roundedRect(10, 10, 80, 80, 2),
      line(10, 26, 90, 26),
      ...Array.from({ length: 5 }, (_, index) => line(10, 40 + index * 11, 90, 40 + index * 11)),
      ...Array.from({ length: 4 }, (_, index) => line(24 + index * 18, 26, 24 + index * 18, 90)),
      ...Array.from({ length: 5 }, (_, row) =>
        Array.from({ length: 3 }, (_, col) => line(28 + col * 18, 33 + row * 11, 36 + col * 18, 33 + row * 11)).join(" "),
      ),
      circle(50, 18, 2),
    )],
    ["Attendance book", join(
      "M 14 18 L 84 14 L 84 84 L 14 88 Z",
      line(14, 30, 84, 26),
      ...Array.from({ length: 5 }, (_, index) => line(22, 40 + index * 8, 76, 37 + index * 8)),
      line(72, 40, 78, 46),
      line(78, 40, 72, 46),
      "M 84 70 C 92 70 94 78 86 82",
    )],
    ["Reading rug", join(
      ellipse(50, 64, 40, 20),
      ellipse(50, 64, 32, 15),
      ...Array.from({ length: 8 }, (_, index) => {
        const angle = (index * 45 * Math.PI) / 180;
        return line(50 + Math.cos(angle) * 32, 64 + Math.sin(angle) * 15, 50 + Math.cos(angle) * 40, 64 + Math.sin(angle) * 20);
      }),
      "M 30 46 L 42 46 L 42 54 C 42 58 30 58 30 54 Z",
      line(36, 46, 36, 42),
    )],
    ["Bulletin board", join(
      rect(8, 10, 84, 72),
      rect(14, 16, 72, 60),
      rect(20, 24, 20, 16, 1),
      rect(46, 22, 18, 22, 1),
      rect(68, 30, 14, 12, 1),
      circle(26, 60, 4),
      star(50, 58, 6, 2.4, 4),
      circle(72, 58, 3),
    )],
    ["Teacher podium", join(
      "M 22 90 L 26 46 L 74 46 L 78 90 Z",
      "M 18 46 L 82 46 L 78 38 L 22 38 Z",
      line(28, 58, 72, 58),
      line(30, 70, 70, 70),
      rect(40, 20, 20, 16, 1),
      line(44, 26, 56, 26),
    )],
    ["Abacus", join(
      rect(10, 16, 80, 70, 2),
      ...Array.from({ length: 5 }, (_, index) => line(10, 28 + index * 13, 90, 28 + index * 13)),
      ...Array.from({ length: 6 }, (_, col) =>
        Array.from({ length: 3 }, (_, bead) => circle(18 + col * 12.8, 28 + ((bead + col) % 5) * 13, 4)).join(" "),
      ),
      line(10, 16, 90, 16),
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Classroom",
    tags: ["education", "classroom", "school", "teacher", "learning", "lesson"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 1,
  }));
}

function science() {
  const defs = [
    ["Laboratory microscope", join(
      "M 38 18 L 56 18 L 60 44 L 44 44 Z",
      "M 44 44 C 38 52 38 64 44 72 L 56 72",
      line(30, 36, 38, 30),
      "M 28 72 L 68 72 L 72 88 L 24 88 Z",
      line(50, 44, 50, 60),
      circle(50, 66, 6),
      line(58, 22, 70, 52),
      ellipse(58, 16, 6, 3),
    )],
    ["Test tube", join(
      "M 40 10 L 60 10 L 60 70 C 60 82 40 82 40 70 Z",
      line(40, 10, 60, 10),
      line(42, 30, 58, 30),
      circle(50, 44, 2),
      circle(46, 58, 1.4),
      circle(54, 66, 1.4),
      "M 36 74 L 34 88 L 66 88 L 64 74",
    )],
    ["Erlenmeyer flask", join(
      "M 40 8 L 60 8 L 60 30 L 80 80 C 84 90 16 90 20 80 L 40 30 Z",
      line(40, 8, 60, 8),
      line(38, 30, 62, 30),
      line(28, 66, 72, 66),
      circle(36, 74, 2),
      circle(50, 78, 2),
      circle(62, 72, 1.4),
    )],
    ["Beaker", join(
      "M 30 12 L 70 12 L 70 80 C 70 88 30 88 30 80 Z",
      "M 30 12 L 30 6 L 70 6 L 70 12",
      line(36, 34, 40, 34),
      line(36, 44, 44, 44),
      line(36, 54, 40, 54),
      line(30, 66, 70, 66),
      circle(44, 74, 2),
    )],
    ["Atom diagram", join(
      ellipse(50, 50, 40, 14),
      rotatePath(ellipse(50, 50, 40, 14), 60),
      rotatePath(ellipse(50, 50, 40, 14), 120),
      circle(50, 50, 6),
      circle(90, 50, 3),
      circle(30, 32, 3),
      circle(60, 78, 3),
    )],
    ["Magnet", join(
      "M 30 24 L 44 24 L 44 54 C 44 68 56 68 56 54 L 56 24 L 70 24 L 70 56 C 70 80 30 80 30 56 Z",
      line(30, 36, 44, 36),
      line(56, 36, 70, 36),
      "M 24 24 L 50 24",
      "M 50 24 L 76 24",
    )],
    ["Telescope", join(
      "M 24 36 L 68 20 L 76 38 L 32 54 Z",
      "M 68 20 L 74 16 L 80 30 L 76 38",
      ellipse(74, 24, 4, 8),
      "M 44 50 L 32 88",
      "M 52 48 L 64 88",
      line(28, 74, 58, 66),
      star(84, 12, 5, 2, 5),
    )],
    ["Glass prism", join(
      "M 32 20 L 70 82 L 10 82 Z",
      ...Array.from({ length: 3 }, (_, index) => line(64, 30, 84, 22 + index * 8)),
      "M 72 18 L 90 8",
      "M 70 82 L 92 70",
    )],
    ["Plant cell", join(
      roundedRect(12, 14, 76, 72, 10),
      rect(20, 22, 60, 56, 6),
      circle(50, 48, 16),
      circle(52, 46, 4),
      ellipse(32, 60, 8, 4),
      ellipse(68, 60, 7, 4),
      ellipse(34, 34, 6, 5),
      ...Array.from({ length: 3 }, (_, index) => circle(62 + index * 4, 32 + (index % 2) * 5, 2)),
    )],
    ["DNA helix", join(
      ...Array.from({ length: 5 }, (_, index) => {
        const y = 14 + index * 16;
        return join(
          `M 30 ${y} C 42 ${y + 6} 58 ${y - 6} 70 ${y}`,
          `M 30 ${y + 8} C 42 ${y + 14} 58 ${y + 2} 70 ${y + 8}`,
          line(34 + index * 1.2, y + 1, 66 - index * 1.2, y + 7),
        );
      }),
      line(30, 14, 30, 92),
      line(70, 14, 70, 92),
    )],
    ["Anatomy heart", join(
      "M 52 20 C 44 8 24 12 22 34 C 20 56 40 74 52 90 C 64 74 84 56 82 34 C 80 12 60 8 52 20 Z",
      "M 52 28 C 48 42 54 52 46 66",
      "M 46 44 C 38 44 34 52 34 58",
      "M 56 46 C 64 44 68 50 70 56",
      line(62, 30, 72, 24),
    )],
    ["Molecule", join(
      circle(30, 34, 9),
      circle(70, 28, 9),
      circle(58, 70, 9),
      circle(24, 72, 6),
      line(38, 36, 61, 30),
      line(64, 37, 60, 61),
      line(51, 66, 30, 68),
      line(26, 41, 25, 66),
      star(82, 72, 4, 1.6, 4),
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Science",
    tags: ["education", "science", "laboratory", "stem", "learning", "school"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 0.85,
  }));
}

function graduation() {
  const defs = [
    ["Mortarboard cap", join(
      "M 10 34 L 50 18 L 90 34 L 50 50 Z",
      line(50, 50, 50, 62),
      "M 24 41 L 24 68 C 24 80 76 80 76 68 L 76 41",
      line(78, 36, 78, 72),
      "M 78 72 C 74 78 82 82 84 76",
      circle(78, 76, 2),
      line(18, 62, 26, 62),
    )],
    ["Diploma scroll", join(
      roundedRect(10, 34, 72, 32, 14),
      ellipse(20, 50, 8, 16),
      ellipse(74, 50, 8, 16),
      line(26, 50, 62, 50),
      line(26, 58, 54, 58),
      "M 76 50 L 94 50 L 94 62 L 80 62",
      star(82, 56, 3, 1.2, 4),
    )],
    ["Diploma cover", join(
      "M 18 16 L 82 16 L 82 84 L 50 92 L 18 84 Z",
      line(18, 22, 50, 30),
      line(82, 22, 50, 30),
      "M 36 46 L 50 40 L 64 46 L 64 64 L 36 64 Z",
      star(50, 52, 5, 2, 6),
      line(28, 74, 72, 74),
    )],
    ["Graduation tassel", join(
      circle(50, 12, 4),
      line(50, 16, 50, 34),
      roundedRect(38, 34, 24, 10, 3),
      ...Array.from({ length: 9 }, (_, index) => line(42 + index * 2, 44, 36 + index * 3.6, 88)),
      line(34, 48, 66, 48),
    )],
    ["Academic gown", join(
      "M 36 22 L 22 34 L 16 74 L 26 78 L 34 56 L 34 92 L 66 92 L 66 56 L 74 78 L 84 74 L 78 34 L 64 22 Z",
      "M 36 22 L 50 42 L 64 22",
      line(50, 42, 50, 92),
      "M 36 34 C 40 44 60 44 64 34",
      line(34, 60, 66, 60),
    )],
    ["Academic hood", join(
      "M 18 26 C 34 16 66 16 82 26 L 72 72 L 50 88 L 28 72 Z",
      "M 18 26 C 34 34 66 34 82 26",
      "M 28 72 C 38 56 62 56 72 72",
      line(50, 34, 50, 70),
      "M 42 44 L 58 44",
      line(50, 88, 50, 96),
    )],
    ["Certificate", join(
      rect(8, 18, 84, 60),
      rect(14, 24, 72, 48),
      line(34, 34, 66, 34),
      line(30, 42, 70, 42),
      line(24, 56, 48, 56),
      line(56, 56, 76, 56),
      circle(50, 66, 6),
      star(50, 66, 4, 1.6, 5),
      "M 44 88 L 50 82 L 56 88",
    )],
    ["Yearbook", join(
      rect(18, 10, 64, 82, 2),
      line(18, 24, 82, 24),
      rect(26, 30, 48, 30, 1),
      "M 26 56 L 44 56 M 26 60 L 36 60",
      line(58, 36, 68, 36),
      line(58, 44, 68, 44),
      line(26, 74, 74, 74),
      line(26, 82, 58, 82),
      circle(72, 18, 2),
    )],
    ["Class ring", join(
      circle(50, 56, 26),
      circle(50, 56, 18),
      "M 34 30 L 42 8 L 50 22 L 58 8 L 66 30",
      star(50, 56, 9, 3.6, 5),
      line(42, 44, 58, 44),
    )],
    ["Graduation invitation", join(
      roundedRect(16, 10, 68, 82, 2),
      line(24, 24, 76, 24),
      "M 14 38 L 50 18 L 86 38",
      line(28, 46, 72, 46),
      star(50, 58, 7, 2.8, 6),
      line(32, 70, 68, 70),
      line(36, 80, 64, 80),
      line(26, 84, 74, 84),
    )],
    ["Honor cord", join(
      "M 30 10 C 24 34 36 50 30 70 C 26 82 36 90 44 92",
      "M 70 10 C 76 34 64 50 70 70 C 74 82 64 90 56 92",
      star(50, 26, 6, 2.4, 5),
      star(50, 46, 6, 2.4, 5),
      "M 44 92 L 50 84 L 56 92",
      circle(50, 82, 3),
    )],
    ["Mortarboard and scroll", join(
      "M 8 32 L 42 18 L 76 32 L 42 46 Z",
      line(42, 46, 42, 54),
      "M 22 37 L 22 58 C 22 66 62 66 62 58 L 62 37",
      line(66, 34, 66, 60),
      "M 66 60 C 62 65 70 68 72 64",
      "M 52 66 L 88 66 L 88 76 L 52 76 Z",
      ellipse(52, 71, 4, 5),
      line(58, 71, 82, 71),
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Graduation",
    tags: ["education", "graduation", "academic", "diploma", "ceremony", "school"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 1,
  }));
}

function campus() {
  const defs = [
    ["Schoolhouse", join(
      rect(16, 40, 68, 52),
      "M 10 40 L 50 14 L 90 40",
      "M 50 14 L 50 4",
      "M 26 40 C 26 30 40 26 50 32 C 60 26 74 30 74 40",
      rect(42, 66, 16, 26, 1),
      rect(24, 52, 12, 12, 1),
      rect(64, 52, 12, 12, 1),
      circle(50, 24, 3),
    )],
    ["University gate", join(
      "M 10 92 L 10 36 L 24 36 L 24 28 L 36 28 L 36 36 L 64 36 L 64 28 L 76 28 L 76 36 L 90 36 L 90 92",
      line(10, 48, 90, 48),
      "M 36 92 L 36 64 C 36 50 64 50 64 64 L 64 92",
      ...Array.from({ length: 4 }, (_, index) => line(42 + index * 5.4, 64, 42 + index * 5.4, 92)),
      "M 50 12 L 50 20",
      star(50, 24, 4, 1.6, 8),
    )],
    ["Campus library", join(
      "M 12 92 L 12 44 L 50 20 L 88 44 L 88 92",
      "M 20 44 L 20 92 M 80 44 L 80 92",
      ...Array.from({ length: 4 }, (_, index) => rect(28 + index * 12, 56, 8, 36, 1)),
      line(50, 20, 50, 12),
      sweep(50, 50, 16, 16, 200, 340),
    )],
    ["Dormitory", join(
      rect(14, 28, 72, 64),
      line(14, 40, 86, 40),
      ...Array.from({ length: 3 }, (_, row) =>
        Array.from({ length: 3 }, (_, col) => rect(22 + col * 22, 46 + row * 16, 10, 8, 1)).join(" "),
      ),
      rect(44, 76, 12, 16, 1),
      "M 14 28 L 50 12 L 86 28",
      line(40, 12, 40, 20),
    )],
    ["Lecture hall", join(
      "M 8 88 L 80 66 L 80 88 Z",
      ...Array.from({ length: 5 }, (_, index) => line(14 + index * 5, 82 - index * 3, 76 - index * 3, 74 - index * 4)),
      rect(60, 20, 28, 20, 1),
      line(66, 28, 82, 28),
      line(66, 34, 78, 34),
      line(20, 40, 44, 34),
      circle(32, 30, 5),
    )],
    ["Stadium", join(
      "M 10 52 C 10 26 90 26 90 52 L 90 74 C 90 90 10 90 10 74 Z",
      ellipse(50, 62, 28, 12),
      ...Array.from({ length: 5 }, (_, index) => line(16, 58 + index * 5, 84, 58 + index * 5)),
      ...Array.from({ length: 6 }, (_, index) => line(24 + index * 10, 40, 24 + index * 10, 48)),
      line(50, 38, 50, 46),
    )],
    ["Laboratory building", join(
      rect(12, 30, 76, 62),
      line(12, 42, 88, 42),
      ...Array.from({ length: 3 }, (_, index) => rect(22 + index * 22, 50, 12, 18, 1)),
      rect(38, 78, 24, 14, 1),
      "M 40 12 C 46 12 46 20 50 20 C 54 20 54 12 60 12",
      line(50, 20, 50, 30),
      circle(50, 8, 4),
    )],
    ["Bell tower", join(
      rect(36, 24, 28, 68),
      "M 36 24 L 50 8 L 64 24",
      "M 44 24 L 44 92 M 56 24 L 56 92",
      "M 40 54 C 40 42 60 42 60 54 Z",
      line(38, 54, 62, 54),
      circle(50, 62, 3),
      line(50, 65, 50, 70),
      rect(44, 78, 12, 14, 1),
    )],
    ["Campus tree", join(
      "M 50 92 L 50 56",
      "M 50 56 L 36 44 M 50 56 L 64 44 M 50 50 L 50 36",
      ...Array.from({ length: 8 }, (_, index) => {
        const angle = ((index * 45 - 90) * Math.PI) / 180;
        return circle(50 + Math.cos(angle) * 20, 36 + Math.sin(angle) * 16, 12);
      }),
      line(42, 92, 58, 92),
    )],
    ["Campus fountain", join(
      ellipse(50, 72, 34, 10),
      line(50, 42, 50, 72),
      ellipse(50, 42, 12, 4),
      ...Array.from({ length: 5 }, (_, index) => {
        const angle = ((200 + index * 35) * Math.PI) / 180;
        return `M 50 42 Q ${50 + Math.cos(angle) * 18} ${24 + Math.sin(angle) * 8} ${50 + Math.cos(angle) * 28} ${62 + Math.sin(angle) * 6}`;
      }),
      ...Array.from({ length: 7 }, (_, index) => circle(26 + index * 7, 68, 1.4)),
    )],
    ["Quad bench", join(
      "M 12 52 L 88 52 L 88 58 L 12 58 Z",
      line(18, 58, 18, 84),
      line(82, 58, 82, 84),
      "M 12 40 L 88 40 L 88 46 L 12 46 Z",
      line(20, 46, 20, 52),
      line(80, 46, 80, 52),
      line(18, 84, 26, 84),
      line(74, 84, 82, 84),
    )],
    ["Notice board", join(
      line(50, 6, 50, 20),
      roundedRect(14, 20, 72, 54, 2),
      rect(20, 26, 24, 18, 1),
      rect(50, 26, 30, 18, 1),
      rect(20, 50, 16, 16, 1),
      rect(42, 50, 18, 16, 1),
      rect(66, 50, 14, 16, 1),
      line(50, 74, 50, 84),
      line(36, 90, 64, 90),
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Campus",
    tags: ["education", "campus", "university", "school", "architecture", "learning"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 1,
  }));
}

export function educationAssets() {
  return [...supplies(), ...classroom(), ...science(), ...graduation(), ...campus()];
}
