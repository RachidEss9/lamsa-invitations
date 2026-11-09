import { arc, circle, ellipse, leaf, line, polygon, rect, roundedRect, star, sweep } from "../paths.mjs";

const join = (...parts) => parts.filter(Boolean).join(" ");

function printLabels() {
  const defs = [
    ["Jar label", join(roundedRect(10, 14, 80, 72, 6), roundedRect(16, 22, 68, 56, 4))],
    ["Kraft label", join(rect(10, 18, 80, 64), line(18, 30, 82, 30), line(18, 70, 82, 70))],
    ["Scalloped label", join(roundedRect(8, 20, 84, 60, 10), ...Array.from({ length: 7 }, (_, i) => circle(16 + i * 11.3, 20, 4)), ...Array.from({ length: 7 }, (_, i) => circle(16 + i * 11.3, 80, 4)))],
    ["Apothecary label", join(rect(8, 12, 84, 76), line(16, 26, 84, 26), line(16, 74, 84, 74), line(24, 40, 76, 40), line(24, 50, 76, 50), line(30, 62, 70, 62))],
    ["Round label", join(circle(50, 50, 42), circle(50, 50, 34))],
    ["Oval label", join(ellipse(50, 50, 44, 32), ellipse(50, 50, 36, 24))],
    ["Bottle label", join("M 22 10 L 78 10 L 78 90 L 22 90 Z", line(28, 24, 72, 24), line(28, 76, 72, 76))],
    ["Square label", join(rect(14, 14, 72, 72), line(20, 28, 80, 28), line(20, 40, 80, 40), line(20, 66, 80, 66))],
    ["Wide label", join(roundedRect(4, 28, 92, 44, 4), line(12, 42, 88, 42), line(12, 58, 60, 58))],
    ["Ornament label", join(roundedRect(10, 16, 80, 68, 4), line(10, 30, 90, 30), line(10, 70, 90, 70), star(50, 50, 7, 3, 5))],
  ];
  return defs.map(([name, d]) => ({
    subcategory: "Labels",
    name,
    tags: ["label", "print", "packaging", "stationery", "sticker"],
    ink: "stroke",
    strokeWidth: 1.5,
    aspect: 1.2,
    d,
  }));
}

function stickers() {
  const defs = [
    ["Round sticker", join(circle(50, 50, 44), circle(50, 50, 34))],
    ["Star sticker", star(50, 50, 46, 22, 5)],
    ["Heart sticker", "M 50 86 C 22 66 10 50 10 36 C 10 22 22 14 34 14 C 42 14 48 19 50 26 C 52 19 58 14 66 14 C 78 14 90 22 90 36 C 90 50 78 66 50 86 Z"],
    ["Seal sticker", join(...Array.from({ length: 16 }, (_, i) => circle(50 + Math.cos((i * 22.5 * Math.PI) / 180) * 36, 50 + Math.sin((i * 22.5 * Math.PI) / 180) * 36, 9)), circle(50, 50, 34))],
    ["Badge sticker", join(rect(10, 22, 80, 56), polygon(30, 22, 8, 8, 4), polygon(70, 22, 8, 8, 4), polygon(30, 78, 8, 8, 4), polygon(70, 78, 8, 8, 4))],
    ["Arc sticker", join(arc(50, 86, 42, 42, 180, 360), line(8, 86, 92, 86), arc(50, 86, 32, 32, 180, 360))],
    ["Tag sticker", "M 16 16 L 70 16 L 92 50 L 70 84 L 16 84 Z"],
    ["Frame sticker", join(roundedRect(6, 6, 88, 88, 14), roundedRect(14, 14, 72, 72, 10))],
    ["Label sticker", join(rect(6, 30, 88, 40), line(14, 42, 86, 42), line(14, 58, 60, 58))],
    ["Diamond sticker", join(polygon(50, 8, 36, 42, 4), polygon(50, 18, 26, 32, 4))],
  ];
  return defs.map(([name, d]) => ({
    subcategory: "Stickers",
    name,
    tags: ["sticker", "decal", "print", "packaging", "label"],
    ink: "stroke",
    strokeWidth: 1.8,
    aspect: 1,
    d,
  }));
}

function tags() {
  const defs = [
    ["Classic tag", join("M 18 10 L 58 10 L 82 34 L 82 90 L 18 90 Z", circle(24, 22, 4))],
    ["Rounded tag", join(roundedRect(12, 18, 76, 64, 8), circle(24, 34, 4), line(34, 34, 78, 34))],
    ["Swing tag", join(polygon(30, 14, 26, 18, 4), rect(20, 34, 60, 50, 4), line(28, 48, 72, 48))],
    ["Bookmark tag", join("M 28 8 L 72 8 L 72 88 L 50 74 L 28 88 Z")],
    ["Tie tag", join(polygon(50, 10, 18, 12, 4), rect(24, 30, 52, 54, 6), line(32, 48, 68, 48))],
    ["Scallop tag", join("M 16 16 L 84 16 L 84 84 L 16 84 Z", ...Array.from({ length: 6 }, (_, i) => circle(22 + i * 11.2, 16, 3.4)), ...Array.from({ length: 6 }, (_, i) => circle(22 + i * 11.2, 84, 3.4)))],
    ["Gift tag", join(polygon(50, 8, 20, 14, 4), rect(22, 30, 56, 54, 4), circle(50, 18, 3.4))],
    ["Luggage tag", join(roundedRect(12, 20, 76, 64, 10), circle(26, 36, 4), line(36, 36, 80, 36), line(20, 52, 80, 52))],
    ["Wide tag", join(rect(6, 26, 88, 48), circle(18, 50, 4), line(28, 42, 86, 42), line(28, 58, 66, 58))],
    ["Pennant tag", "M 10 16 L 90 16 L 90 62 L 50 88 L 10 62 Z"],
  ];
  return defs.map(([name, d]) => ({
    subcategory: "Tags",
    name,
    tags: ["tag", "label", "print", "stationery", "gift"],
    ink: "stroke",
    strokeWidth: 1.5,
    aspect: 0.85,
    d,
  }));
}

function tickets() {
  const perforation = (y) => Array.from({ length: 12 }, (_, i) => circle(12 + i * 7, y, 1.4)).join(" ");
  const defs = [
    ["Event ticket", join(rect(4, 24, 92, 52), line(66, 24, 66, 76), arc(66, 50, 6, 6, 90, 270).replace(/^M[^C]*/, "") ? "" : "", perforation(20), perforation(80))],
    ["Cinema ticket", join(rect(6, 20, 88, 60), line(60, 20, 60, 80), line(14, 34, 52, 34), line(14, 46, 52, 46), line(14, 58, 40, 58))],
    ["Raffle ticket", join(rect(4, 22, 92, 56), line(50, 22, 50, 78), line(10, 36, 44, 36), line(10, 48, 44, 48), line(56, 36, 90, 36), line(56, 48, 90, 48), line(56, 60, 76, 60))],
    ["Admit one ticket", join(roundedRect(6, 24, 88, 52, 4), circle(6, 50, 5), circle(94, 50, 5), line(30, 38, 70, 38), line(30, 50, 60, 50), line(30, 62, 54, 62))],
    ["Boardwalk ticket", join(rect(4, 26, 92, 48), ...Array.from({ length: 10 }, (_, i) => line(10 + i * 9.4, 26, 10 + i * 9.4, 32)), ...Array.from({ length: 10 }, (_, i) => line(10 + i * 9.4, 68, 10 + i * 9.4, 74)))],
    ["Stub ticket", join(rect(4, 28, 70, 44), rect(74, 28, 22, 44), line(74, 28, 74, 72), line(12, 40, 64, 40), line(12, 54, 58, 54))],
    ["Tear-off ticket", join(rect(4, 24, 92, 52), line(70, 24, 70, 76), ...Array.from({ length: 8 }, (_, i) => circle(80 + (i % 2) * 8, 32 + Math.floor(i / 2) * 12, 2.2)))],
    ["Perforated ticket", join(rect(4, 24, 92, 52), ...Array.from({ length: 14 }, (_, i) => circle(10 + i * 6, 24, 1.6)), ...Array.from({ length: 14 }, (_, i) => circle(10 + i * 6, 76, 1.6)))],
    ["Round ticket", join(circle(50, 50, 40), circle(50, 50, 32), line(26, 50, 74, 50))],
    ["Vintage ticket", join(rect(6, 24, 88, 52), rect(12, 30, 76, 40), line(18, 42, 82, 42), line(18, 56, 66, 56))],
  ];
  return defs.map(([name, d]) => ({
    subcategory: "Tickets",
    name,
    tags: ["ticket", "print", "event", "perforated", "stationery"],
    ink: "stroke",
    strokeWidth: 1.5,
    aspect: 2.1,
    d,
  }));
}

function bookmarks() {
  const defs = [
    ["Bookmark", join("M 32 8 L 68 8 L 68 88 L 50 74 L 32 88 Z")],
    ["Tassel bookmark", join(rect(30, 8, 40, 78), line(50, 74, 50, 94), ...Array.from({ length: 5 }, (_, i) => line(42 + i * 4, 84, 34 + i * 8, 96)))],
    ["Double bookmark", join(rect(20, 8, 26, 84), rect(54, 8, 26, 84), polygon(33, 82, 6, 8, 3, 180), polygon(67, 82, 6, 8, 3, 180))],
    ["Round bookmark", join(circle(50, 50, 40), line(50, 10, 50, 90), circle(50, 18, 4))],
    ["Ornate bookmark", join(rect(30, 6, 40, 82), star(50, 22, 9, 4, 4), line(38, 44, 62, 44), line(38, 54, 62, 54), polygon(50, 82, 8, 12, 3, 180))],
    ["Clip bookmark", join(rect(28, 18, 44, 66, 4), rect(34, 8, 32, 14, 4), star(50, 52, 10, 4.4, 5))],
    ["Wide bookmark", join(rect(22, 8, 56, 84), line(30, 26, 70, 26), line(30, 38, 70, 38), line(30, 58, 70, 58))],
    ["Corner bookmark", join("M 8 8 L 88 8 L 88 54 L 48 88 L 8 54 Z", star(48, 34, 12, 5, 4))],
  ];
  return defs.map(([name, d]) => ({
    subcategory: "Bookmarks",
    name,
    tags: ["bookmark", "reading", "print", "stationery", "gift"],
    ink: "stroke",
    strokeWidth: 1.5,
    aspect: 0.55,
    d,
  }));
}

function giftTags() {
  const defs = [
    ["Gift tag", join(roundedRect(14, 24, 72, 62, 6), circle(50, 18, 5), line(30, 42, 70, 42), line(30, 54, 60, 54))],
    ["Gift tag with string", join(roundedRect(14, 26, 72, 60, 6), circle(50, 18, 4), "M 50 14 C 42 6 30 8 30 16 C 30 22 38 24 42 20")],
    ["Kraft gift tag", join("M 18 22 L 62 22 L 82 46 L 62 70 L 18 70 Z", circle(26, 32, 4), line(32, 46, 74, 46), line(32, 58, 64, 58))],
    ["Scallop gift tag", join(roundedRect(14, 24, 72, 60, 10), circle(50, 16, 4), ...Array.from({ length: 6 }, (_, i) => circle(22 + i * 11.2, 84, 4)))],
    ["Wide gift tag", join(rect(8, 30, 84, 52), circle(20, 20, 4), line(20, 16, 20, 30), line(30, 46, 80, 46), line(30, 60, 66, 60))],
    ["Oval gift tag", join(ellipse(50, 54, 42, 30), circle(50, 16, 4), line(34, 54, 66, 54))],
    ["Tie-on tag", join(polygon(50, 12, 16, 12, 4), rect(26, 32, 48, 54, 4), line(34, 50, 66, 50), line(34, 62, 58, 62))],
    ["Holiday tag", join(roundedRect(16, 24, 68, 62, 6), star(50, 50, 14, 6, 6), circle(50, 18, 4))],
    ["Boutique tag", join(rect(12, 26, 76, 58), circle(24, 36, 4), line(34, 42, 80, 42), line(34, 54, 72, 54), line(34, 66, 56, 66))],
    ["Tag set", join(rect(6, 20, 40, 56, 4), circle(16, 30, 3), rect(54, 20, 40, 56, 4), circle(64, 30, 3), line(62, 48, 86, 48), line(14, 48, 38, 48))],
  ];
  return defs.map(([name, d]) => ({
    subcategory: "Gift tags",
    name,
    tags: ["gift tag", "present", "print", "stationery", "label"],
    ink: "stroke",
    strokeWidth: 1.5,
    aspect: 1,
    d,
  }));
}

function packaging() {
  const defs = [
    ["Tuck box net", join(rect(26, 26, 48, 48), rect(26, 8, 48, 18), rect(26, 74, 48, 18), rect(8, 26, 18, 48), rect(74, 26, 18, 48), line(26, 26, 74, 74))],
    ["Sleeve net", join(rect(10, 26, 80, 48), rect(10, 8, 80, 18), rect(10, 74, 80, 18), line(30, 26, 30, 74), line(70, 26, 70, 74))],
    ["Pillow box", join(rect(16, 30, 68, 40), arc(16, 30, 14, 14, 270, 360), arc(84, 30, 14, 14, 180, 270), arc(16, 70, 14, 14, 0, 90), arc(84, 70, 14, 14, 90, 180))],
    ["Pouch net", join(rect(18, 18, 64, 64), "M 18 18 L 30 6 L 50 14 L 70 6 L 82 18", line(24, 30, 76, 30), line(24, 70, 76, 70))],
    ["Bottle wrap", join("M 20 8 L 80 8 L 80 92 L 20 92 Z", line(20, 30, 80, 30), line(20, 70, 80, 70), line(50, 8, 50, 92))],
    ["Bag net", join(rect(16, 26, 68, 60), rect(16, 14, 68, 12), "M 30 14 C 30 6 70 6 70 14", line(16, 40, 84, 40))],
    ["Wrap band", join(rect(6, 30, 88, 40), polygon(6, 30, 10, 10, 4), polygon(94, 30, 10, 10, 4), line(20, 50, 80, 50))],
    ["Label plate", join(roundedRect(10, 20, 80, 60, 4), line(18, 34, 82, 34), line(18, 46, 82, 46), line(18, 62, 60, 62))],
  ];
  return defs.map(([name, d]) => ({
    subcategory: "Packaging decorations",
    name,
    tags: ["packaging", "dieline", "box", "print", "product"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 1,
    d,
  }));
}

function envelopes() {
  const defs = [
    ["Envelope liner", join(rect(6, 6, 88, 88), "M 6 6 L 50 46 L 94 6")],
    ["Flap pattern", join("M 6 6 L 94 6 L 50 58 Z", line(24, 6, 50, 34), line(76, 6, 50, 34))],
    ["Envelope back", join(rect(6, 22, 88, 56), "M 6 22 L 50 54 L 94 22", "M 6 78 L 40 50", "M 94 78 L 60 50")],
    ["Wax seal", join(circle(50, 50, 32), star(50, 50, 20, 8, 6), ...Array.from({ length: 8 }, (_, i) => circle(50 + Math.cos((i * 45 * Math.PI) / 180) * 38, 50 + Math.sin((i * 45 * Math.PI) / 180) * 38, 5)))],
    ["Envelope monogram", join(rect(6, 24, 88, 52), "M 6 24 L 50 56 L 94 24", circle(50, 68, 9))],
    ["Envelope corner motif", join(rect(6, 24, 88, 52), "M 6 24 L 50 56 L 94 24", leaf(16, 68, 16, 5, 45), leaf(84, 68, 16, 5, 135))],
    ["Envelope seal band", join(rect(6, 24, 88, 52), rect(6, 58, 88, 10), "M 6 24 L 50 56 L 94 24")],
    ["Envelope stamp frame", join(rect(6, 20, 88, 60), rect(66, 30, 20, 24), ...Array.from({ length: 8 }, (_, i) => line(10 + i * 11, 20, 10 + i * 11, 24)))],
  ];
  return defs.map(([name, d]) => ({
    subcategory: "Envelope decorations",
    name,
    tags: ["envelope", "stationery", "wedding", "invitation", "print"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 1.5,
    d,
  }));
}

function businessCards() {
  const defs = [
    ["Business card frame", join(rect(8, 26, 84, 48), line(16, 38, 60, 38), line(16, 50, 72, 50))],
    ["Card monogram", join(rect(8, 26, 84, 48), circle(50, 50, 14))],
    ["Card stripe", join(rect(8, 26, 84, 48), rect(8, 26, 6, 48), line(24, 42, 80, 42))],
    ["Card divider", join(rect(8, 26, 84, 48), line(50, 34, 50, 66), line(58, 44, 84, 44), line(58, 56, 76, 56))],
    ["Card corner mark", join(rect(8, 26, 84, 48), polygon(8, 26, 10, 10, 3, 90), line(26, 54, 70, 54))],
    ["Card rule box", join(rect(8, 26, 84, 48), rect(14, 32, 30, 36), line(50, 42, 86, 42), line(50, 54, 80, 54))],
    ["Card vertical", join(rect(30, 6, 40, 88), line(38, 20, 62, 20), line(38, 78, 62, 78))],
    ["Card deckled edge", join("M 8 26 L 92 24 L 90 74 L 10 76 Z", line(18, 40, 60, 39), line(18, 52, 74, 51))],
  ];
  return defs.map(([name, d]) => ({
    subcategory: "Business card decorations",
    name,
    tags: ["business card", "stationery", "identity", "print", "layout"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: 1.7,
    d,
  }));
}

function invitationOrnaments() {
  const defs = [
    ["Invitation crest", join(polygon(50, 10, 14, 9, 4), line(30, 34, 70, 34), line(26, 44, 74, 44), leaf(26, 66, 22, 7, 200), leaf(74, 66, 22, 7, -20), line(50, 30, 50, 58))],
    ["Invitation arch", join(arc(50, 58, 34, 34, 180, 360), line(16, 58, 16, 84), line(84, 58, 84, 84), line(22, 62, 22, 80), line(78, 62, 78, 80), circle(50, 22, 4))],
    ["Wedding monogram frame", join(circle(50, 50, 38), circle(50, 50, 30), star(50, 12, 7, 3, 5), star(50, 88, 7, 3, 5))],
    ["Invitation rule", join(line(8, 50, 38, 50), line(62, 50, 92, 50), polygon(50, 50, 8, 8, 4), leaf(34, 50, 14, 4, 200), leaf(66, 50, 14, 4, -20))],
    ["Floral invitation frame", join(rect(10, 10, 80, 80), leaf(10, 90, 26, 8, -45), leaf(90, 90, 26, 8, -135), circle(50, 10, 5))],
    ["Invitation seal", join(circle(50, 50, 34), ...Array.from({ length: 12 }, (_, i) => line(50 + Math.cos((i * 30 * Math.PI) / 180) * 34, 50 + Math.sin((i * 30 * Math.PI) / 180) * 34, 50 + Math.cos((i * 30 * Math.PI) / 180) * 42, 50 + Math.sin((i * 30 * Math.PI) / 180) * 42)))],
    ["Invitation border", join(rect(8, 8, 84, 84), rect(14, 14, 72, 72), line(8, 8, 22, 22), line(92, 8, 78, 22), line(8, 92, 22, 78), line(92, 92, 78, 79))],
    ["Invitation flourish", join(line(4, 74, 30, 74), line(70, 74, 96, 74), leaf(38, 74, 16, 5, 200), leaf(62, 74, 16, 5, -20), star(50, 40, 10, 4.4, 4), line(50, 50, 50, 66))],
    ["Invitation corner", join(line(8, 8, 30, 8), line(8, 8, 8, 30), leaf(18, 18, 22, 7, 45), leaf(28, 28, 18, 6, 45))],
    ["Invitation date frame", join(rect(12, 30, 76, 40), line(20, 42, 80, 42), line(20, 58, 80, 58), circle(50, 50, 3))],
  ];
  return defs.map(([name, d], index) => ({
    subcategory: "Invitation ornaments",
    name,
    tags: ["invitation", "wedding", "ornament", "stationery", "luxury"],
    ink: "stroke",
    strokeWidth: 1.4,
    aspect: index === 3 || index === 7 ? 2.6 : 1,
    d,
  }));
}

export function printAssets() {
  return [
    ...printLabels(),
    ...stickers(),
    ...tags(),
    ...tickets(),
    ...bookmarks(),
    ...giftTags(),
    ...packaging(),
    ...envelopes(),
    ...businessCards(),
    ...invitationOrnaments(),
  ];
}
