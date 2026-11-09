import {
  arc,
  circle,
  ellipse,
  leaf,
  line,
  mapPath,
  polygon,
  rect,
  roundedRect,
  star,
  sweep,
} from "../paths.mjs";

const join = (...parts) => parts.filter(Boolean).join(" ");
const dot = (x, y, r = 2.2) => circle(x, y, r);

/** A line-icon: consistent 8-unit padding, round geometry, one stroke weight. */
const icon = (name, domain, parts, aspect = 1) => ({
  subcategory: domain,
  name,
  tags: ["icon", domain.toLowerCase(), "line icon", "symbol", "pictogram"],
  ink: "stroke",
  strokeWidth: 2.6,
  aspect,
  d: parts,
});

const heart = "M 50 84 C 24 66 12 52 12 38 C 12 26 22 18 32 18 C 40 18 46 23 50 30 C 54 23 60 18 68 18 C 78 18 88 26 88 38 C 88 52 76 66 50 84 Z";
const leafIcon = "M 50 86 C 20 74 14 46 22 24 C 44 24 72 34 82 62 C 78 76 66 86 50 86 Z M 30 78 C 40 62 50 50 66 38";
const cloud = "M 26 74 C 14 74 8 64 12 54 C 8 42 18 32 30 34 C 34 22 50 18 60 26 C 74 22 88 32 86 46 C 94 52 92 72 78 74 Z";

function wedding() {
  return [
    icon("Wedding rings", "Wedding & celebrations", join(circle(38, 58, 24), circle(62, 58, 24), polygon(50, 16, 7, 7, 4))),
    icon("Champagne glasses", "Wedding & celebrations", join("M 24 18 L 44 18 L 40 48 L 28 48 Z", line(34, 48, 34, 80), line(22, 82, 46, 82), "M 56 18 L 76 18 L 72 48 L 60 48 Z", line(66, 48, 66, 80), line(54, 82, 78, 82))),
    icon("Wedding cake", "Wedding & celebrations", join(rect(22, 54, 56, 26), rect(32, 34, 36, 20), rect(42, 18, 16, 16), line(50, 10, 50, 18), line(14, 80, 86, 80), ...Array.from({ length: 3 }, (_, i) => line(32 + i * 8, 60, 32 + i * 8, 74)))),
    icon("Gift box", "Wedding & celebrations", join(rect(18, 40, 64, 44), line(50, 40, 50, 84), rect(14, 30, 72, 12), "M 50 30 C 34 30 26 24 26 16 C 26 10 34 8 40 14 C 46 20 50 30 50 30 C 50 30 54 20 60 14 C 66 8 74 10 74 16 C 74 24 66 30 50 30 Z")),
    icon("Celebration heart", "Wedding & celebrations", heart),
    icon("Ribbon bow", "Wedding & celebrations", join("M 50 52 C 30 32 12 36 14 52 C 16 68 36 66 50 52 Z", "M 50 52 C 70 32 88 36 86 52 C 84 68 64 66 50 52 Z", circle(50, 52, 6), "M 50 58 L 38 88", "M 50 58 L 62 88")),
    icon("Candle", "Wedding & celebrations", join(rect(36, 36, 28, 48), ellipse(50, 80, 22, 6), line(50, 36, 50, 28), "M 50 26 C 44 20 46 14 50 10 C 54 14 56 20 50 26 Z")),
    icon("Dove", "Wedding & celebrations", join("M 14 60 C 30 46 48 46 58 52 C 58 38 68 30 82 30 C 74 42 74 52 66 60 C 54 68 34 68 22 64 C 18 68 16 74 16 80 C 12 72 12 64 14 60 Z")),
    icon("Confetti popper", "Wedding & celebrations", join(polygon(26, 74, 18, 14, 3, 210), dot(66, 24, 3), dot(78, 44, 2.4), dot(58, 46, 2), dot(86, 62, 3), dot(48, 22, 2.6), line(38, 62, 66, 34))),
    icon("Ceremony arch", "Wedding & celebrations", join(arc(50, 58, 36, 36, 180, 360), line(14, 58, 14, 84), line(86, 58, 86, 84), line(8, 88, 92, 88), line(50, 22, 50, 32))),
    icon("Invitation envelope", "Wedding & celebrations", join(rect(12, 26, 76, 52), "M 12 26 L 50 56 L 88 26")),
    icon("Music note", "Wedding & celebrations", join(ellipse(34, 72, 11, 8), line(45, 72, 45, 24), "M 45 24 C 58 26 68 34 68 46", ellipse(62, 64, 11, 8), line(73, 64, 73, 40))),
  ];
}

function food() {
  return [
    icon("Fork and knife", "Food & restaurants", join(line(30, 14, 30, 86), line(22, 14, 22, 40), line(38, 14, 38, 40), arc(30, 40, 8, 8, 0, 180), line(70, 14, 70, 86), "M 70 14 C 84 18 86 34 78 46 L 70 46")),
    icon("Dinner plate", "Food & restaurants", join(circle(50, 50, 38), circle(50, 50, 24))),
    icon("Coffee cup", "Food & restaurants", join("M 20 34 L 68 34 L 64 82 C 63 87 58 90 52 90 L 36 90 C 30 90 25 87 24 82 Z", sweep(76, 56, 14, 14, -80, 80), line(14, 34, 76, 34), line(30, 22, 36, 12), line(46, 22, 52, 12))),
    icon("Wine glass", "Food & restaurants", join("M 28 14 L 72 14 C 72 42 62 58 50 60 C 38 58 28 42 28 14 Z", line(50, 60, 50, 84), line(34, 86, 66, 86))),
    icon("Burger", "Food & restaurants", join(arc(50, 40, 34, 22, 180, 360), line(14, 44, 86, 44), line(14, 58, 86, 58), "M 16 68 C 30 76 70 76 84 68 L 82 80 C 68 88 32 88 18 80 Z")),
    icon("Pizza slice", "Food & restaurants", join("M 50 12 L 86 82 C 70 90 30 90 14 82 Z", line(20, 58, 80, 58), dot(38, 48, 3.4), dot(58, 58, 3.4), dot(48, 70, 3))),
    icon("Ice cream", "Food & restaurants", join("M 32 46 L 68 46 L 50 88 Z", circle(38, 34, 13), circle(58, 34, 13), circle(50, 22, 12), line(32, 46, 68, 46))),
    icon("Bread loaf", "Food & restaurants", join("M 14 60 C 14 36 32 24 50 24 C 68 24 86 36 86 60 L 86 72 C 86 80 80 84 72 84 L 28 84 C 20 84 14 80 14 72 Z", line(32, 44, 38, 58), line(46, 40, 52, 54), line(60, 44, 66, 58))),
    icon("Chef hat", "Food & restaurants", join(arc(30, 34, 16, 16, 0, 360), arc(50, 24, 18, 18, 0, 360), arc(70, 34, 16, 16, 0, 360), rect(30, 46, 40, 26), line(30, 62, 70, 62))),
    icon("Cocktail glass", "Food & restaurants", join("M 18 18 L 82 18 L 50 54 Z", line(50, 54, 50, 84), line(30, 86, 70, 86), line(26, 10, 74, 10), dot(68, 30, 3))),
    icon("Teapot", "Food & restaurants", join(ellipse(48, 56, 26, 22), "M 22 52 C 12 50 10 42 16 36", line(60, 36, 72, 26), circle(74, 22, 6), "M 34 74 C 30 82 24 84 18 84")),
    icon("Cupcake", "Food & restaurants", join("M 28 50 L 72 50 L 66 84 L 34 84 Z", circle(36, 42, 10), circle(50, 34, 11), circle(64, 42, 10), line(33, 62, 67, 62), line(50, 10, 50, 22))),
  ];
}

function travel() {
  return [
    icon("Aeroplane", "Travel", join("M 50 10 C 55 10 58 18 58 26 L 58 40 L 88 58 L 88 68 L 58 58 L 58 74 L 68 82 L 68 88 L 50 84 L 32 88 L 32 82 L 42 74 L 42 58 L 12 68 L 12 58 L 42 40 L 42 26 C 42 18 45 10 50 10 Z")),
    icon("Suitcase", "Travel", join(rect(12, 34, 76, 48, 8), "M 36 34 L 36 24 C 36 20 40 16 44 16 L 56 16 C 60 16 64 20 64 24 L 64 34", line(12, 56, 88, 56), line(32, 82, 32, 88), line(68, 82, 68, 88))),
    icon("Map pin", "Travel", join("M 50 14 C 30 14 16 28 16 46 C 16 70 50 90 50 90 C 50 90 84 70 84 46 C 84 28 70 14 50 14 Z", circle(50, 44, 12))),
    icon("Compass", "Travel", join(circle(50, 50, 38), circle(50, 50, 4), polygon(50, 22, 8, 24, 4), line(50, 78, 50, 74), line(22, 50, 26, 50), line(74, 50, 78, 50))),
    icon("Globe", "Travel", join(circle(50, 50, 38), ellipse(50, 50, 16, 38), line(12, 50, 88, 50), arc(50, 50, 38, 20, 0, 180))),
    icon("Camera", "Travel", join(roundedRect(10, 30, 80, 50, 8), "M 32 30 L 38 20 L 62 20 L 68 30", circle(50, 56, 16), line(78, 40, 82, 40))),
    icon("Sun and sea", "Travel", join(circle(50, 36, 18), ...Array.from({ length: 8 }, (_, i) => line(50 + Math.cos((i * 45 * Math.PI) / 180) * 24, 36 + Math.sin((i * 45 * Math.PI) / 180) * 24, 50 + Math.cos((i * 45 * Math.PI) / 180) * 32, 36 + Math.sin((i * 45 * Math.PI) / 180) * 32)), "M 10 76 Q 24 68 38 76 Q 52 84 66 76 Q 80 68 94 76")),
    icon("Mountains", "Travel", join("M 6 80 L 34 34 L 50 58 L 60 42 L 94 80 Z", "M 30 46 L 38 34 L 46 46", line(50, 58, 54, 52))),
    icon("Sailboat", "Travel", join("M 50 14 L 50 66 L 18 66 Z", "M 50 26 L 78 66 L 50 66", "M 12 74 L 88 74 L 76 86 L 24 86 Z", line(50, 86, 50, 92))),
    icon("Train", "Travel", join(roundedRect(20, 14, 60, 56, 12), rect(30, 24, 40, 20, 4), line(20, 56, 80, 56), line(30, 70, 22, 86), line(70, 70, 78, 86), line(30, 86, 70, 86))),
    icon("Bicycle", "Travel", join(circle(24, 66, 16), circle(76, 66, 16), line(24, 66, 44, 40), line(44, 40, 62, 66), line(44, 40, 54, 40), line(62, 66, 76, 66), line(58, 66, 68, 40), line(62, 40, 74, 40))),
    icon("Passport", "Travel", join(roundedRect(24, 10, 52, 80, 6), circle(50, 42, 14), line(36, 62, 64, 62), line(36, 72, 64, 72))),
  ];
}

function fashion() {
  return [
    icon("Dress", "Fashion", join("M 36 16 L 44 24 L 56 24 L 64 16 L 72 28 L 64 36 L 82 84 L 18 84 L 36 36 L 28 28 Z", line(44, 24, 50, 44), line(56, 24, 50, 44))),
    icon("Hanger", "Fashion", join("M 34 24 C 34 14 46 10 52 16 C 58 22 50 30 50 34", line(50, 34, 14, 64), line(50, 34, 86, 64), line(14, 64, 86, 64))),
    icon("Handbag", "Fashion", join(roundedRect(16, 36, 68, 48, 8), "M 34 36 C 34 20 44 14 50 14 C 56 14 66 20 66 36", line(16, 50, 84, 50))),
    icon("Heel shoe", "Fashion", join("M 14 74 C 24 56 40 44 62 44 C 76 44 84 52 86 62 L 88 82 L 76 82 L 72 72 L 22 82 Z", line(62, 44, 66, 58))),
    icon("Sunglasses", "Fashion", join(ellipse(30, 50, 18, 14), ellipse(70, 50, 18, 14), line(48, 48, 52, 48), line(12, 46, 6, 38), line(88, 46, 94, 38), line(30, 50, 30, 54))),
    icon("Hat", "Fashion", join(ellipse(50, 62, 40, 12), "M 26 62 C 26 38 36 24 50 24 C 64 24 74 38 74 62 Z", line(28, 56, 72, 56))),
    icon("Perfume bottle", "Fashion", join(roundedRect(30, 36, 40, 50, 8), rect(40, 22, 20, 14, 4), rect(44, 12, 12, 10, 3), line(38, 54, 62, 54))),
    icon("Lipstick", "Fashion", join(rect(36, 44, 28, 42, 4), rect(36, 34, 28, 10), "M 38 34 L 38 16 C 38 12 44 10 50 12 L 62 16 L 62 34 Z", line(36, 56, 64, 56))),
    icon("Silk ribbon", "Fashion", join("M 12 38 C 26 26 42 30 50 42 C 58 30 74 26 88 38 C 82 52 64 56 50 50 C 36 56 18 52 12 38 Z", line(50, 50, 40, 88), line(50, 50, 62, 88))),
    icon("Button", "Fashion", join(circle(50, 50, 34), circle(50, 50, 26), dot(42, 42, 4), dot(58, 42, 4), dot(42, 58, 4), dot(58, 58, 4))),
    icon("Needle and thread", "Fashion", join(line(26, 82, 72, 24), circle(74, 20, 5), "M 20 50 C 30 40 40 60 50 50 C 60 40 70 60 80 50", line(26, 82, 32, 76))),
    icon("Watch", "Fashion", join(circle(50, 50, 24), rect(42, 8, 16, 18, 4), rect(42, 74, 16, 18, 4), line(50, 50, 50, 36), line(50, 50, 60, 56))),
  ];
}

function architecture() {
  return [
    icon("House", "Architecture", join("M 12 46 L 50 16 L 88 46", rect(22, 46, 56, 40), rect(42, 62, 16, 24), line(32, 56, 40, 56), line(60, 56, 68, 56))),
    icon("Office tower", "Architecture", join(rect(26, 12, 48, 74), line(26, 30, 74, 30), line(26, 48, 74, 48), line(26, 66, 74, 66), ...Array.from({ length: 3 }, (_, i) => line(36 + i * 14, 18, 36 + i * 14, 26)))),
    icon("Column", "Architecture", join(rect(24, 14, 52, 8), rect(24, 78, 52, 8), line(32, 22, 32, 78), line(44, 22, 44, 78), line(56, 22, 56, 78), line(68, 22, 68, 78))),
    icon("Arch doorway", "Architecture", join(arc(50, 54, 28, 28, 180, 360), line(22, 54, 22, 86), line(78, 54, 78, 86), line(14, 88, 86, 88), line(50, 54, 50, 86))),
    icon("Window", "Architecture", join(rect(18, 14, 64, 72, 4), line(50, 14, 50, 86), line(18, 50, 82, 50))),
    icon("Stairs", "Architecture", join("M 14 84 L 14 68 L 32 68 L 32 52 L 50 52 L 50 36 L 68 36 L 68 20 L 86 20 L 86 84 Z")),
    icon("Dome", "Architecture", join(arc(50, 54, 32, 32, 180, 360), line(18, 54, 18, 82), line(82, 54, 82, 82), line(10, 84, 90, 84), line(50, 22, 50, 10), circle(50, 10, 3))),
    icon("Bridge", "Architecture", join(arc(50, 86, 38, 34, 180, 360), line(12, 86, 88, 86), line(12, 52, 12, 86), line(88, 52, 88, 86), line(12, 52, 26, 52), line(26, 52, 30, 70), line(74, 52, 70, 70), line(88, 52, 74, 52))),
    icon("Blueprint", "Architecture", join(rect(10, 24, 80, 56), line(18, 32, 42, 32), line(18, 42, 36, 42), line(18, 52, 46, 52), rect(52, 32, 28, 24), line(52, 64, 80, 64))),
    icon("Key", "Architecture", join(circle(30, 42, 16), line(42, 50, 82, 82), line(70, 74, 80, 64), line(62, 68, 70, 60))),
    icon("Door", "Architecture", join(rect(22, 12, 56, 76), rect(30, 22, 40, 34), circle(68, 62, 3), line(30, 66, 70, 66))),
    icon("Skyline", "Architecture", join("M 8 84 L 8 54 L 22 54 L 22 84", "M 28 84 L 28 38 L 44 38 L 44 84", "M 50 84 L 50 24 L 66 24 L 66 84", "M 72 84 L 72 46 L 92 46 L 92 84", line(4, 88, 96, 88))),
  ];
}

function business() {
  return [
    icon("Briefcase", "Business", join(roundedRect(10, 32, 80, 52, 6), "M 34 32 L 34 22 C 34 18 38 16 42 16 L 58 16 C 62 16 66 18 66 22 L 66 32", line(10, 52, 90, 52), rect(44, 48, 12, 10, 2))),
    icon("Bar chart", "Business", join(line(12, 84, 88, 84), line(12, 84, 12, 16), rect(24, 60, 12, 24), rect(44, 44, 12, 40), rect(64, 28, 12, 56))),
    icon("Pie chart", "Business", join(circle(50, 50, 36), line(50, 50, 50, 14), line(50, 50, 82, 66))),
    icon("Handshake", "Business", join("M 8 50 L 26 36 L 44 46 L 56 36 L 74 46 L 92 32", "M 26 36 L 34 56 L 50 62 L 66 56 L 74 46", line(50, 62, 50, 72))),
    icon("Telephone", "Business", join("M 26 16 C 20 16 16 22 18 30 C 24 56 44 76 70 82 C 78 84 84 80 84 74 L 84 62 L 66 56 L 58 64 C 48 58 42 52 36 42 L 44 34 L 38 16 Z")),
    icon("Mail", "Business", join(rect(12, 26, 76, 48, 4), "M 12 26 L 50 56 L 88 26")),
    icon("Calendar", "Business", join(roundedRect(14, 20, 72, 66, 6), line(14, 38, 86, 38), line(30, 12, 30, 26), line(70, 12, 70, 26), dot(32, 52, 3), dot(50, 52, 3), dot(68, 52, 3), dot(32, 68, 3), dot(50, 68, 3))),
    icon("Clock", "Business", join(circle(50, 50, 38), line(50, 50, 50, 24), line(50, 50, 70, 60))),
    icon("Target", "Business", join(circle(50, 50, 38), circle(50, 50, 24), circle(50, 50, 10), line(50, 50, 80, 20), line(72, 16, 82, 12), line(84, 26, 88, 18))),
    icon("Lightbulb", "Business", join("M 34 44 C 22 32 28 14 50 14 C 72 14 78 32 66 44 C 60 50 60 56 60 62 L 40 62 C 40 56 40 50 34 44 Z", line(40, 70, 60, 70), line(44, 78, 56, 78))),
    icon("Gears", "Business", join(circle(40, 44, 14), circle(70, 66, 10), ...Array.from({ length: 8 }, (_, i) => line(40 + Math.cos((i * 45 * Math.PI) / 180) * 14, 44 + Math.sin((i * 45 * Math.PI) / 180) * 14, 40 + Math.cos((i * 45 * Math.PI) / 180) * 21, 44 + Math.sin((i * 45 * Math.PI) / 180) * 21)), ...Array.from({ length: 6 }, (_, i) => line(70 + Math.cos((i * 60 * Math.PI) / 180) * 10, 66 + Math.sin((i * 60 * Math.PI) / 180) * 10, 70 + Math.cos((i * 60 * Math.PI) / 180) * 16, 66 + Math.sin((i * 60 * Math.PI) / 180) * 16)))),
    icon("Bank", "Business", join("M 10 36 L 50 14 L 90 36 Z", line(10, 42, 90, 42), rect(10, 42, 80, 6), line(20, 52, 20, 80), line(40, 52, 40, 80), line(60, 52, 60, 80), line(80, 52, 80, 80), line(12, 86, 88, 86))),
  ];
}

function education() {
  return [
    icon("Open book", "Education", join("M 50 26 C 38 18 22 18 12 22 L 12 78 C 24 74 38 74 50 82 C 62 74 76 74 88 78 L 88 22 C 78 18 62 18 50 26 Z", line(50, 26, 50, 82))),
    icon("Graduation cap", "Education", join("M 8 34 L 50 16 L 92 34 L 50 52 Z", "M 26 44 L 26 66 C 26 74 36 80 50 80 C 64 80 74 74 74 66 L 74 44", line(84, 38, 84, 66), circle(84, 70, 4))),
    icon("Pencil", "Education", join("M 24 76 L 30 58 L 72 16 L 86 30 L 44 72 Z", line(30, 58, 44, 72), line(66, 22, 80, 36))),
    icon("Paintbrush", "Education", join("M 22 78 C 20 64 30 58 40 60 L 62 30 L 74 40 L 46 70 C 44 80 34 86 22 78 Z", line(62, 30, 72, 20), line(72, 20, 82, 30))),
    icon("Palette", "Education", join("M 50 14 C 24 14 10 32 10 50 C 10 72 26 86 44 86 C 54 86 54 76 50 70 C 44 62 52 56 62 56 L 78 56 C 86 56 90 48 90 40 C 90 24 72 14 50 14 Z", dot(32, 34, 4), dot(50, 26, 4), dot(68, 34, 4), dot(28, 54, 4))),
    icon("Ruler", "Education", join("M 12 68 L 68 12 L 88 32 L 32 88 Z", line(24, 56, 32, 64), line(36, 44, 44, 52), line(48, 32, 56, 40), line(60, 20, 68, 28))),
    icon("Calculator", "Education", join(rect(22, 10, 56, 80, 6), rect(32, 20, 36, 16), ...Array.from({ length: 6 }, (_, i) => dot(38 + (i % 3) * 12, 52 + Math.floor(i / 3) * 16, 3.4)))),
    icon("Microscope", "Education", join("M 32 84 L 76 84", "M 40 84 C 40 66 52 58 64 54", "M 56 44 L 70 30", "M 44 56 L 56 42", circle(34, 62, 12))),
    icon("Atom", "Education", join(
      circle(50, 50, 6),
      ellipse(50, 50, 40, 16),
      rotated(ellipse(50, 50, 40, 16), 60),
      rotated(ellipse(50, 50, 40, 16), 120),
    )),
    icon("Globe study", "Education", join(circle(50, 50, 36), ellipse(50, 50, 15, 36), line(14, 50, 86, 50), line(22, 30, 78, 30), line(22, 70, 78, 70))),
    icon("Apple", "Education", join("M 50 30 C 40 20 22 24 22 44 C 22 66 38 84 50 88 C 62 84 78 66 78 44 C 78 24 60 20 50 30 Z", line(50  , 30, 52, 16), leaf(52, 18, 14, 5, -40))),
    icon("Backpack", "Education", join(roundedRect(20, 34, 60, 52, 10), "M 34 34 C 34 18 66 18 66 34", rect(34, 56, 32, 18, 4), line(20, 54, 10, 74), line(80, 54, 90, 74))),
  ];
}

// Ellipse rotation for the atom icon: re-emit a rotated copy of the path.
function rotated(d, degrees) {
  const radians = (degrees * Math.PI) / 180;
  return mapPath(d, (x, y) => {
    const dx = x - 50;
    const dy = y - 50;
    return [
      50 + dx * Math.cos(radians) - dy * Math.sin(radians),
      50 + dx * Math.sin(radians) + dy * Math.cos(radians),
    ];
  });
}

function lifestyle() {
  return [
    icon("Tea cup", "Lifestyle", join("M 16 36 L 66 36 L 62 78 C 61 84 56 88 50 88 L 32 88 C 26 88 21 84 20 78 Z", sweep(74, 56, 14, 14, -80, 80), "M 8 84 L 76 84", line(28, 48, 28, 66), line(40, 48, 40, 66), line(52, 48, 52, 66))),
    icon("Potted plant", "Lifestyle", join("M 30 58 L 70 58 L 64 88 L 36 88 Z", "M 50 58 C 50 40 38 30 28 26 C 28 42 36 52 50 58 Z", "M 50 58 C 50 40 62 30 72 26 C 72 42 64 52 50 58 Z", "M 50 58 L 50 34")),
    icon("Candle light", "Lifestyle", join(rect(32, 42, 36, 44, 4), "M 50 38 C 42 30 44 22 50 16 C 56 22 58 30 50 38 Z", line(26, 86, 74, 86))),
    icon("Bed", "Lifestyle", join("M 10 56 L 10 82", "M 10 56 L 10 44 L 44 44 L 44 56", rect(44, 48, 46, 20), line(10, 68, 90, 68), line(90, 56, 90, 82), rect(18, 34, 22, 10, 4))),
    icon("Bathtub", "Lifestyle", join("M 10 52 L 90 52 L 82 80 C 80 86 74 88 68 88 L 32 88 C 26 88 20 86 18 80 Z", line(20, 38, 20, 52), sweep(26, 38, 8, 8, 180, 360), line(28, 88, 24, 96), line(72, 88, 76, 96))),
    icon("Meditation", "Lifestyle", join(circle(50, 26, 10), "M 50 36 L 50 58", "M 28 48 L 50 42 L 72 48", "M 50 58 L 24 72 L 76 72 Z", line(26, 82, 74, 82))),
    icon("Headphones", "Lifestyle", join(arc(50, 52, 34, 34, 180, 360), roundedRect(12, 46, 18, 34, 8), roundedRect(70, 46, 18, 34, 8), line(30, 52, 30, 66), line(70, 52, 70, 66))),
    icon("Sun", "Lifestyle", join(circle(50, 50, 20), ...Array.from({ length: 8 }, (_, i) => line(50 + Math.cos((i * 45 * Math.PI) / 180) * 28, 50 + Math.sin((i * 45 * Math.PI) / 180) * 28, 50 + Math.cos((i * 45 * Math.PI) / 180) * 40, 50 + Math.sin((i * 45 * Math.PI) / 180) * 40)))),
    icon("Moon", "Lifestyle", "M 62 12 C 40 14 24 32 24 54 C 24 74 38 88 58 88 C 70 88 80 82 86 74 C 60 78 42 58 46 36 C 48 24 54 16 62 12 Z"),
    icon("Sparkle", "Lifestyle", join(star(50, 50, 40, 16, 4), star(50, 50, 20, 8, 4))),
    icon("Botanical leaf", "Lifestyle", leafIcon),
    icon("Home heart", "Lifestyle", join("M 14 50 L 50 20 L 86 50", rect(24, 50, 52, 36), "M 50 78 C 38 68 34 60 38 54 C 42 48 48 50 50 55 C 52 50 58 48 62 54 C 66 60 62 68 50 78 Z")),
  ];
}

function technology() {
  return [
    icon("Laptop", "Technology", join(rect(18, 18, 64, 44, 4), line(6, 78, 94, 78), "M 34 78 L 38 68 L 62 68 L 66 78")),
    icon("Phone", "Technology", join(roundedRect(30, 8, 40, 84, 8), line(40, 18, 60, 18), circle(50, 82, 3))),
    icon("Tablet", "Technology", join(roundedRect(20, 10, 60, 80, 8), circle(50, 82, 3), line(40, 18, 60, 18))),
    icon("Wifi", "Technology", join(sweep(50, 78, 8, 8, 225, 315), sweep(50, 78, 22, 22, 215, 325), sweep(50, 78, 38, 38, 210, 330), dot(50, 78, 3))),
    icon("Battery", "Technology", join(rect(14, 34, 66, 32, 6), rect(82, 44, 8, 12, 2), rect(22, 42, 16, 16, 2), rect(42, 42, 16, 16, 2))),
    icon("Cloud", "Technology", cloud),
    icon("Code brackets", "Technology", join("M 34 26 L 12 50 L 34 74", "M 66 26 L 88 50 L 66 74", line(56, 20, 44, 80))),
    icon("Cursor", "Technology", join("M 32 14 L 32 76 L 48 62 L 58 86 L 70 80 L 60 56 L 80 56 Z")),
    icon("Keyboard", "Technology", join(roundedRect(8, 32, 84, 40, 6), ...Array.from({ length: 3 }, (_, row) => Array.from({ length: 5 }, (_, col) => dot(20 + col * 15, 44 + row * 10, 2)).join(" ")))),
    icon("Server", "Technology", join(rect(18, 14, 64, 26, 4), rect(18, 48, 64, 26, 4), dot(28, 27, 3), dot(28, 61, 3), line(40, 27, 72, 27), line(40, 61, 72, 61))),
    icon("Headset", "Technology", join(arc(50, 48, 32, 30, 180, 360), roundedRect(16, 40, 16, 30, 6), roundedRect(68, 40, 16, 30, 6), "M 72 70 C 72 82 60 86 52 86")),
    icon("Router", "Technology", join(roundedRect(12, 54, 76, 28, 6), line(28, 54, 22, 34), line(72, 54, 78, 34), dot(26, 68, 3), dot(38, 68, 3), line(52, 68, 76, 68))),
  ];
}

function general() {
  return [
    icon("Plus", "General symbols", join(line(20, 50, 80, 50), line(50, 20, 50, 80))),
    icon("Minus", "General symbols", line(20, 50, 80, 50)),
    icon("Check", "General symbols", "M 18 52 L 40 74 L 82 26"),
    icon("Cross", "General symbols", join(line(24, 24, 76, 76), line(76, 24, 24, 76))),
    icon("Arrow", "General symbols", join(line(12, 50, 84, 50), line(64, 32, 84, 50), line(64, 68, 84, 50))),
    icon("Star", "General symbols", star(50, 50, 38, 18, 5)),
    icon("Heart pulse", "General symbols", join(heart, "M 30 52 L 42 52 L 46 44 L 54 62 L 58 52 L 70 52")),
    icon("Quotation", "General symbols", join(
      "M 18 76 C 10 64 12 46 24 34 C 34 24 46 22 54 28 C 60 32 60 40 54 44 C 48 48 40 44 42 36 C 38 38 30 46 28 56 C 26 64 28 70 34 76 Z",
      "M 62 76 C 54 64 56 46 68 34 C 78 24 88 22 94 28 C 100 34 98 42 92 44 C 86 46 80 42 82 36 C 78 38 72 46 70 56 C 68 64 70 70 76 76 Z",
    )),
    icon("Play", "General symbols", polygon(50, 16, 34, 40, 3, 90)),
    icon("Location", "General symbols", join("M 50 12 C 32 12 18 26 18 44 C 18 66 50 90 50 90 C 50 90 82 66 82 44 C 82 26 68 12 50 12 Z", circle(50, 42, 10))),
    icon("Search", "General symbols", join(circle(42, 42, 26), line(62, 62, 86, 86))),
    icon("Settings", "General symbols", join(circle(50, 50, 14), ...Array.from({ length: 8 }, (_, i) => line(50 + Math.cos((i * 45 * Math.PI) / 180) * 20, 50 + Math.sin((i * 45 * Math.PI) / 180) * 20, 50 + Math.cos((i * 45 * Math.PI) / 180) * 30, 50 + Math.sin((i * 45 * Math.PI) / 180) * 30)))),
  ];
}

export function iconAssets() {
  return [
    ...wedding(),
    ...food(),
    ...travel(),
    ...fashion(),
    ...architecture(),
    ...business(),
    ...education(),
    ...lifestyle(),
    ...technology(),
    ...general(),
  ];
}
