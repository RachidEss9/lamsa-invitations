import {
  circle,
  ellipse,
  leaf,
  line,
  rect,
  roundedRect,
  star,
} from "../paths.mjs";

const join = (...parts) => parts.flat(Infinity).filter(Boolean).join(" ");

function paper() {
  const defs = [
    ["Letterhead", join(
      rect(14, 6, 72, 88),
      line(50, 16, 50, 30),
      line(50, 16, 56, 22),
      line(22, 40, 78, 40),
      line(22, 48, 66, 48),
      line(22, 62, 78, 62),
      line(22, 68, 78, 68),
      line(22, 74, 78, 74),
      line(22, 80, 54, 80),
    )],
    ["Notecard", join(
      roundedRect(10, 12, 80, 76, 2),
      "M 10 12 L 44 12 L 10 46 Z",
      leaf(22, 24, 18, 5, 45),
      line(48, 38, 82, 38),
      line(48, 48, 74, 48),
      line(20, 70, 80, 70),
    )],
    ["Correspondence card", join(
      rect(14, 18, 72, 64),
      rect(20, 24, 60, 52),
      line(50, 24, 50, 76),
      line(26, 38, 44, 38),
      line(26, 46, 44, 46),
      line(56, 60, 74, 60),
      star(50, 50, 4, 1.6, 4),
    )],
    ["Postcard back", join(
      rect(6, 14, 88, 72),
      line(50, 14, 50, 86),
      line(12, 28, 42, 28),
      line(12, 36, 42, 36),
      line(12, 44, 38, 44),
      rect(56, 22, 28, 22, 1),
      line(56, 54, 88, 54),
      line(56, 62, 84, 62),
      line(56, 70, 80, 70),
    )],
    ["Memo sheet", join(
      rect(16, 8, 68, 84),
      rect(16, 8, 68, 14),
      line(24, 34, 76, 34),
      line(24, 44, 76, 44),
      line(24, 54, 76, 54),
      line(24, 64, 60, 64),
      line(24, 74, 68, 74),
      circle(24, 40, 1.2),
      circle(24, 50, 1.2),
    )],
    ["Lined page", join(
      rect(12, 6, 76, 88),
      line(20, 22, 80, 22),
      ...Array.from({ length: 12 }, (_, index) => line(20, 30 + index * 6, 80, 30 + index * 6)),
      line(20, 22, 20, 92),
    )],
    ["Dot grid page", join(
      rect(12, 6, 76, 88),
      ...Array.from({ length: 11 }, (_, row) =>
        Array.from({ length: 9 }, (_, col) => circle(20 + col * 8, 22 + row * 7, 0.9)).join(" "),
      ),
    )],
    ["Graph sheet", join(
      rect(12, 6, 76, 88),
      ...Array.from({ length: 9 }, (_, index) => line(18 + index * 8.5, 10, 18 + index * 8.5, 90)),
      ...Array.from({ length: 10 }, (_, index) => line(16, 14 + index * 8, 88, 14 + index * 8)),
    )],
    ["To-do list", join(
      roundedRect(16, 8, 68, 84, 2),
      line(24, 22, 76, 22),
      ...Array.from({ length: 6 }, (_, index) => {
        const y = 36 + index * 9;
        return join(roundedRect(24, y - 3, 5, 5, 1), line(34, y, index % 2 ? 64 : 72, y));
      }),
      "M 24 84 L 36 80 L 44 84 L 52 78",
    )],
    ["Weekly planner", join(
      rect(10, 10, 80, 80),
      line(10, 24, 90, 24),
      ...Array.from({ length: 6 }, (_, index) => line(10 + (index + 1) * 11.4, 24, 10 + (index + 1) * 11.4, 90)),
      line(10, 44, 90, 44),
      line(10, 64, 90, 64),
      ...Array.from({ length: 7 }, (_, index) => circle(21 + index * 11.4, 17, 2)),
    )],
    ["Journal page", join(
      rect(12, 6, 76, 88),
      line(20, 26, 80, 26),
      ...Array.from({ length: 9 }, (_, index) => line(20, 36 + index * 6, 78, 36 + index * 6)),
      line(20, 36, 20, 84),
      "M 60 16 C 54 10 62 4 68 10 C 72 14 66 20 62 18",
      line(20, 88, 54, 88),
    )],
    ["Envelope", join(
      rect(8, 26, 84, 54),
      "M 8 26 L 50 60 L 92 26",
      "M 8 80 L 36 54",
      "M 92 80 L 64 54",
      star(50, 68, 4, 1.6, 4),
      line(76, 32, 88, 32),
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Paper",
    tags: ["stationery", "paper", "letterhead", "note", "print", "office"],
    ink: "stroke",
    strokeWidth: 1.3,
    aspect: 0.8,
  }));
}

function writing() {
  const defs = [
    ["Fountain pen", join(
      "M 26 74 L 44 28 L 56 28 L 74 74",
      line(44, 28, 56, 28),
      "M 46 28 L 50 8 L 54 28",
      line(34, 60, 66, 60),
      line(38, 50, 62, 50),
      line(30, 72, 70, 72),
      circle(50, 66, 2),
    )],
    ["Fountain nib", join(
      "M 50 6 L 64 30 L 60 72 L 50 92 L 40 72 L 36 30 Z",
      line(50, 20, 50, 74),
      circle(50, 46, 4),
      circle(50, 62, 2),
      line(42, 34, 58, 34),
      line(44, 40, 56, 40),
    )],
    ["Graphite pencil", join(
      "M 36 8 L 64 8 L 64 78 L 50 94 L 36 78 Z",
      line(36, 8, 64, 8),
      line(36, 20, 64, 20),
      line(36, 78, 64, 78),
      line(50, 78, 50, 94),
      line(42, 26, 42, 78),
      line(58, 26, 58, 78),
    )],
    ["Mechanical pencil", join(
      "M 40 10 L 60 10 L 60 60 L 50 72 L 40 60 Z",
      rect(44, 2, 12, 8, 2),
      line(40, 24, 60, 24),
      line(46, 34, 54, 34),
      line(46, 44, 54, 44),
      line(50, 72, 50, 86),
      line(46, 86, 54, 86),
      circle(50, 90, 3),
    )],
    ["Ballpoint pen", join(
      "M 44 14 L 56 14 L 60 58 L 54 64 L 46 64 L 40 58 Z",
      rect(44, 4, 12, 10, 2),
      line(50, 8, 50, 2),
      line(40, 36, 60, 36),
      "M 46 64 L 50 88 L 54 64",
      line(46, 70, 54, 70),
      circle(50, 88, 1.6),
    )],
    ["Dip pen", join(
      "M 50 6 L 58 14 L 54 62 L 50 72 L 46 62 L 42 14 Z",
      line(50, 20, 50, 62),
      circle(50, 36, 3),
      line(44, 58, 56, 58),
      "M 50 72 L 48 88 L 52 88 Z",
      "M 54 88 L 62 96",
    )],
    ["Ink bottle", join(
      "M 24 44 L 76 44 L 76 72 C 76 82 24 82 24 72 Z",
      "M 32 44 L 32 30 L 68 30 L 68 44",
      roundedRect(38, 18, 24, 12, 2),
      line(24, 54, 76, 54),
      rect(32, 58, 36, 14, 2),
      line(38, 64, 62, 64),
    )],
    ["Letter opener", join(
      "M 20 88 L 70 16 L 78 22 L 28 92 Z",
      line(24, 84, 72, 20),
      "M 70 16 L 84 10 L 80 24 Z",
      rect(12, 82, 16, 12, 3),
      circle(16, 88, 1.6),
    )],
    ["Measuring ruler", join(
      rect(8, 40, 84, 20),
      ...Array.from({ length: 9 }, (_, index) => line(16 + index * 9.4, 40, 16 + index * 9.4, 48)),
      ...Array.from({ length: 4 }, (_, index) => line(20 + index * 18.8, 40, 20 + index * 18.8, 44)),
      line(8, 52, 92, 52),
    )],
    ["Eraser", join(
      roundedRect(20, 36, 60, 30, 5),
      "M 20 36 L 30 26 L 90 26 L 80 36",
      line(30, 26, 30, 56),
      line(46, 40, 66, 40),
      star(58, 50, 4, 1.6, 4),
    )],
    ["Calligraphy pen", join(
      "M 40 8 L 60 8 L 58 44 L 50 52 L 42 44 Z",
      line(42, 20, 58, 20),
      "M 50 52 L 50 70",
      "M 42 70 L 58 70 L 54 90 L 46 90 Z",
      line(44, 76, 56, 76),
      star(50, 14, 3, 1.2, 4),
    )],
    ["Quill holder", join(
      "M 30 90 L 42 46 L 58 46 L 70 90 Z",
      ellipse(50, 46, 16, 5),
      line(38, 66, 62, 66),
      "M 50 46 L 50 20 C 46 10 58 4 62 12 L 58 28 Z",
      line(52, 20, 60, 24),
      circle(50, 82, 3),
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Writing tools",
    tags: ["stationery", "writing", "pen", "pencil", "calligraphy", "office"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 0.65,
  }));
}

function desk() {
  const defs = [
    ["Paperclip", join(
      "M 64 16 L 32 16 C 18 16 18 40 32 40 L 62 40 C 72 40 72 54 62 54 L 38 54 C 32 54 32 64 38 64 L 60 64",
      "M 64 16 C 76 16 76 30 64 30 L 36 30",
    )],
    ["Binder clip", join(
      roundedRect(28, 46, 44, 34, 3),
      "M 36 46 L 42 18 L 46 18 L 42 46",
      "M 64 46 L 58 18 L 54 18 L 58 46",
      line(28, 56, 72, 56),
      roundedRect(40, 10, 8, 10, 2),
      roundedRect(52, 10, 8, 10, 2),
    )],
    ["Push pin", join(
      circle(50, 34, 18),
      circle(50, 34, 10),
      line(50, 52, 50, 86),
      line(46, 86, 54, 86),
      "M 40 18 C 44 10 56 10 60 18",
    )],
    ["Staple", join(
      "M 20 40 L 20 66 L 26 66 L 26 46 L 74 46 L 74 66 L 80 66 L 80 40 Z",
      line(20, 40, 26, 40),
      line(74, 40, 80, 40),
      line(32, 54, 68, 54),
    )],
    ["Washi tape", join(
      "M 16 30 C 30 24 70 24 84 30 L 84 54 C 70 60 30 60 16 54 Z",
      ...Array.from({ length: 5 }, (_, index) => star(28 + index * 12, 42, 4, 1.6, 4)),
      line(16, 30, 16, 54),
      line(84, 30, 84, 54),
    )],
    ["Scissors", join(
      "M 20 16 L 52 50 L 44 58 L 12 26 Z",
      "M 20 84 L 52 50 L 44 42 L 12 72 Z",
      circle(60, 44, 8),
      circle(60, 60, 8),
      line(52, 52, 72, 52),
    )],
    ["Glue stick", join(
      roundedRect(34, 20, 32, 66, 6),
      rect(38, 12, 24, 10, 3),
      line(34, 36, 66, 36),
      rect(40, 42, 20, 24, 2),
      line(44, 52, 56, 52),
      line(44, 58, 52, 58),
    )],
    ["Stapler", join(
      "M 14 62 L 76 44 L 86 50 L 24 70 Z",
      "M 14 62 L 14 74 L 24 78 L 24 70",
      "M 24 70 L 76 56 L 76 64",
      "M 76 44 C 84 40 88 44 86 50",
      circle(30, 68, 2),
    )],
    ["Desk organizer", join(
      "M 14 42 L 86 42 L 82 88 L 18 88 Z",
      line(14, 52, 86, 52),
      ...Array.from({ length: 4 }, (_, index) => line(30 + index * 14, 52, 30 + index * 14, 88)),
      rect(20, 30, 8, 12, 1),
      rect(34, 26, 8, 16, 1),
      rect(50, 32, 8, 10, 1),
      line(24, 30, 24, 20),
      line(38, 26, 38, 16),
    )],
    ["Rubber stamp", join(
      "M 30 20 L 70 20 L 70 44 L 60 48 L 60 58 L 40 58 L 40 48 L 30 44 Z",
      rect(34, 10, 32, 10, 2),
      rect(28, 58, 44, 10, 2),
      line(34, 72, 66, 72),
      star(50, 34, 6, 2.4, 4),
    )],
    ["Ink pad", join(
      roundedRect(12, 38, 76, 34, 3),
      rect(20, 46, 60, 18, 2),
      line(20, 52, 80, 52),
      line(20, 58, 80, 58),
      roundedRect(8, 30, 84, 8, 2),
      line(30, 78, 70, 78),
    )],
    ["Desk calendar", join(
      "M 16 26 L 84 26 L 80 86 L 20 86 Z",
      "M 28 26 L 32 8 M 72 26 L 68 8",
      line(16, 36, 84, 36),
      ...Array.from({ length: 4 }, (_, index) => line(16 + index * 17, 36, 16 + index * 17, 86)),
      ...Array.from({ length: 4 }, (_, index) => line(20, 48 + index * 10, 80, 48 + index * 10)),
      circle(50, 31, 2),
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Desk",
    tags: ["stationery", "desk", "office", "clip", "tool", "supplies"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 1,
  }));
}

function correspondence() {
  const defs = [
    ["Folded letter", join(
      "M 14 26 L 86 26 L 86 80 L 50 58 L 14 80 Z",
      "M 14 26 L 50 54 L 86 26",
      line(26, 36, 56, 36),
      line(26, 44, 70, 44),
      line(26, 70, 44, 70),
      star(50, 68, 3.4, 1.4, 4),
    )],
    ["Open envelope", join(
      "M 8 30 L 50 66 L 92 30 L 92 86 L 8 86 Z",
      "M 8 30 L 50 66 L 92 30",
      "M 8 86 L 40 58",
      "M 92 86 L 60 58",
      rect(52, 36, 30, 22, 1),
      line(58, 42, 76, 42),
      line(58, 50, 72, 50),
    )],
    ["Airmail border", join(
      rect(8, 18, 84, 64),
      ...Array.from({ length: 7 }, (_, index) => line(8 + index * 12, 18, 20 + index * 12, 30)),
      ...Array.from({ length: 7 }, (_, index) => line(8 + index * 12, 82, 20 + index * 12, 70)),
      ...Array.from({ length: 5 }, (_, index) => line(8, 30 + index * 12, 20, 42 + index * 12)),
      ...Array.from({ length: 5 }, (_, index) => line(92, 30 + index * 12, 80, 42 + index * 12)),
      "M 8 18 L 50 54 L 92 18",
    )],
    ["Envelope flap", join(
      "M 6 26 L 94 26 L 94 82 L 50 46 L 6 82 Z",
      "M 6 26 L 50 62 L 94 26",
      line(26, 38, 50, 56),
      line(74, 38, 50, 56),
      star(50, 64, 4, 1.6, 4),
    )],
    ["Letter seal", join(
      circle(50, 50, 30),
      circle(50, 50, 23),
      star(50, 50, 14, 5, 8),
      circle(50, 50, 5),
      "M 22 72 C 34 82 66 82 78 72",
      circle(28, 74, 2),
      circle(72, 74, 2),
    )],
    ["Address label", join(
      roundedRect(10, 30, 80, 40, 3),
      line(18, 40, 44, 40),
      line(18, 50, 54, 50),
      line(18, 60, 38, 60),
      rect(60, 38, 22, 16, 1),
      line(64, 46, 78, 46),
    )],
    ["Return address", join(
      rect(12, 18, 24, 34),
      line(16, 24, 32, 24),
      line(16, 30, 32, 30),
      line(16, 36, 28, 36),
      line(16, 42, 30, 42),
      rect(48, 34, 42, 48, 2),
      line(54, 50, 84, 50),
      line(54, 58, 78, 58),
      line(54, 66, 70, 66),
    )],
    ["Folded note", join(
      "M 18 14 L 82 14 L 82 72 L 50 86 L 18 72 Z",
      line(18, 14, 50, 34),
      line(82, 14, 50, 34),
      line(28, 40, 72, 40),
      line(28, 50, 64, 50),
      line(28, 60, 56, 60),
    )],
    ["RSVP envelope", join(
      rect(12, 32, 76, 44),
      "M 12 32 L 50 58 L 88 32",
      "M 12 76 L 36 54",
      "M 88 76 L 64 54",
      roundedRect(56, 38, 24, 12, 1),
      line(60, 44, 76, 44),
      "M 22 44 L 38 44",
    )],
    ["Thank-you note", join(
      rect(16, 18, 68, 64),
      "M 50 64 C 42 56 32 62 37 70 C 41 76 50 80 50 80 C 50 80 59 76 63 70 C 68 62 58 56 50 64 Z",
      line(26, 30, 54, 30),
      line(26, 38, 46, 38),
      "M 70 86 L 90 86 L 90 94 L 70 94 Z",
      "M 70 86 L 80 91 L 90 86",
    )],
    ["Invitation card", join(
      rect(14, 14, 72, 72),
      rect(20, 20, 60, 60),
      line(30, 32, 70, 32),
      line(30, 42, 60, 42),
      star(50, 56, 7, 2.8, 6),
      line(34, 70, 66, 70),
    )],
    ["Letter bundle", join(
      rect(12, 24, 56, 40),
      rect(24, 18, 56, 40),
      rect(18, 32, 56, 40),
      line(18, 44, 74, 44),
      line(18, 54, 64, 54),
      "M 64 34 C 78 22 90 34 84 46",
      "M 78 46 L 86 56 L 72 58",
      line(12, 74, 88, 74),
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Correspondence",
    tags: ["stationery", "letter", "envelope", "correspondence", "mail", "invitation"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 1.2,
  }));
}

function marks() {
  const defs = [
    ["Postmark", join(
      circle(34, 50, 24),
      circle(34, 50, 18),
      ...Array.from({ length: 5 }, (_, index) => line(10, 38 + index * 6, 22, 38 + index * 6)),
      ...Array.from({ length: 5 }, (_, index) => line(46, 38 + index * 6, 58, 38 + index * 6)),
      line(58, 44, 74, 40),
      line(60, 52, 82, 48),
      line(58, 60, 76, 58),
    )],
    ["Cancellation stamp", join(
      rect(10, 34, 56, 32),
      line(18, 42, 58, 42),
      line(18, 50, 52, 50),
      line(18, 58, 44, 58),
      ...Array.from({ length: 4 }, (_, index) => line(70, 32 + index * 10, 92, 28 + index * 10)),
    )],
    ["Monogram stamp", join(
      circle(50, 50, 34),
      circle(50, 50, 28),
      "M 42 38 L 50 30 L 58 38 L 58 62 L 42 62",
      "M 42 50 L 56 50",
      ...Array.from({ length: 8 }, (_, index) => {
        const angle = (index * 45 * Math.PI) / 180;
        return circle(50 + Math.cos(angle) * 38, 50 + Math.sin(angle) * 38, 2);
      }),
    )],
    ["Library stamp", join(
      roundedRect(12, 24, 76, 52, 3),
      line(12, 38, 88, 38),
      line(20, 48, 36, 48),
      line(44, 48, 68, 48),
      line(20, 60, 44, 60),
      line(52, 60, 80, 60),
      star(50, 31, 4, 1.6, 4),
    )],
    ["Date stamp", join(
      roundedRect(12, 16, 76, 68, 4),
      line(12, 30, 88, 30),
      line(24, 48, 76, 48),
      line(24, 60, 64, 60),
      line(24, 72, 72, 72),
      circle(72, 23, 3),
    )],
    ["Parcel stamp", join(
      rect(12, 20, 76, 60),
      rect(18, 26, 64, 48),
      "M 24 56 L 36 36 L 48 52 L 58 40 L 70 58 Z",
      circle(66, 36, 3),
      ...Array.from({ length: 6 }, (_, index) => circle(18 + index * 13, 20, 2)),
    )],
    ["Fragile stamp", join(
      "M 20 30 L 80 30 L 80 58 L 50 76 L 20 58 Z",
      line(30, 42, 70, 42),
      line(34, 50, 66, 50),
      "M 40 62 L 46 54 L 54 62",
      ...Array.from({ length: 5 }, (_, index) => line(26 + index * 10, 24, 30 + index * 10, 30)),
    )],
    ["Priority label", join(
      "M 8 32 L 68 32 L 92 50 L 68 68 L 8 68 Z",
      line(16, 44, 54, 44),
      line(16, 56, 46, 56),
      "M 70 42 L 80 50 L 70 58",
      circle(74, 50, 2),
    )],
    ["Airmail sticker", join(
      circle(50, 50, 34),
      "M 24 56 C 30 40 46 34 62 40 C 72 44 74 50 70 54",
      "M 70 54 L 78 48 L 80 58 Z",
      line(34, 36, 40, 30),
      line(46, 30, 50, 24),
    )],
    ["Wax seal impression", join(
      ...Array.from({ length: 14 }, (_, index) => {
        const angle = (index * (360 / 14) * Math.PI) / 180;
        return circle(50 + Math.cos(angle) * 32, 50 + Math.sin(angle) * 32, 8);
      }),
      circle(50, 50, 28),
      star(50, 50, 14, 5, 6),
      circle(50, 50, 5),
    )],
    ["Postage stamp sheet", join(
      rect(10, 8, 80, 80),
      ...Array.from({ length: 3 }, (_, index) => line(10 + (index + 1) * 20, 8, 10 + (index + 1) * 20, 88)),
      ...Array.from({ length: 3 }, (_, index) => line(10, 8 + (index + 1) * 20, 90, 8 + (index + 1) * 20)),
      ...Array.from({ length: 9 }, (_, index) =>
        star(21 + (index % 3) * 20, 19 + Math.floor(index / 3) * 20, 4, 1.6, 4),
      ),
    )],
    ["Franking mark", join(
      rect(10, 30, 80, 36),
      line(16, 38, 60, 38),
      line(16, 46, 56, 46),
      line(16, 54, 44, 54),
      ...Array.from({ length: 6 }, (_, index) => line(64 + index * 4, 34, 64 + index * 4, 62)),
      star(50, 24, 4, 1.6, 4),
    )],
  ];
  return defs.map(([name, d]) => ({
    name,
    d,
    subcategory: "Marks & stamps",
    tags: ["stationery", "stamp", "postmark", "mail", "seal", "print"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 1,
  }));
}

export function stationeryAssets() {
  return [...paper(), ...writing(), ...desk(), ...correspondence(), ...marks()];
}
