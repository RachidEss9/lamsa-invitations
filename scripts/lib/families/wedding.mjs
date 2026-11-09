import {
  circle,
  ellipse,
  leaf,
  line,
  petal,
  polygon,
  rect,
  roundedRect,
  star,
  sweep,
} from "../paths.mjs";

const join = (...parts) => parts.flat(Infinity).filter(Boolean).join(" ");

const petalRing = (cx, cy, radius, count, length, width, phase = -90) =>
  Array.from({ length: count }, (_, index) => {
    const angle = ((phase + (index * 360) / count) * Math.PI) / 180;
    return petal(
      cx + Math.cos(angle) * radius,
      cy + Math.sin(angle) * radius,
      length,
      width,
      (angle * 180) / Math.PI,
    );
  });

const leavesAlong = (cx, cy, rx, ry, count, size) =>
  Array.from({ length: count }, (_, index) => {
    const angle = ((180 + (index * 180) / (count - 1)) * Math.PI) / 180;
    return leaf(
      cx + Math.cos(angle) * rx,
      cy + Math.sin(angle) * ry,
      size,
      size * 0.38,
      (angle * 180) / Math.PI + 90,
    );
  });

function ceremony() {
  const arch = join(
    "M 18 94 L 18 46 C 18 16 82 16 82 46 L 82 94",
    "M 26 94 L 26 48 C 26 24 74 24 74 48 L 74 94",
    ...leavesAlong(50, 30, 28, 20, 7, 15),
    circle(50, 15, 4),
  );
  const cakeThree = join(
    roundedRect(20, 60, 60, 26, 2),
    roundedRect(28, 38, 44, 22, 2),
    roundedRect(36, 20, 28, 18, 2),
    "M 20 66 Q 26 60 32 66 Q 38 60 44 66 Q 50 60 56 66 Q 62 60 68 66 Q 74 60 80 66",
    "M 28 44 Q 34 38 40 44 Q 46 38 52 44 Q 58 38 64 44 Q 70 38 72 44",
    circle(50, 14, 3.4),
    line(50, 17, 50, 20),
  );
  const cakeFour = join(
    roundedRect(16, 70, 68, 20, 2),
    roundedRect(24, 52, 52, 18, 2),
    roundedRect(32, 36, 36, 16, 2),
    roundedRect(40, 22, 20, 14, 2),
    ...Array.from({ length: 4 }, (_, row) =>
      Array.from({ length: 6 }, (_, index) =>
        circle(28 + index * 8 + (row % 2) * 4, 76 + row * 6, 1.4),
      ).join(" "),
    ),
    ...Array.from({ length: 5 }, (_, index) => circle(30 + index * 10, 58, 1.6)),
    star(50, 16, 5, 2.2, 5),
  );
  const topper = join(
    star(50, 16, 6, 2.4, 5),
    "M 42 26 C 36 34 38 44 44 50 C 50 56 56 48 54 40 C 52 32 46 28 42 26 Z",
    "M 58 26 C 64 34 62 44 56 50 C 50 56 44 48 46 40 C 48 32 54 28 58 26 Z",
    line(50, 50, 50, 56),
    roundedRect(36, 56, 28, 8, 2),
  );
  const champagneTower = join(
    ...Array.from({ length: 3 }, (_, index) => {
      const y = 40 + index * 18;
      const count = 3 - index;
      return Array.from({ length: count }, (_, glass) => {
        const x = 50 + (glass - (count - 1) / 2) * 18;
        return join(
          `M ${x - 7} ${y} Q ${x} ${y + 10} ${x + 7} ${y} Z`,
          line(x, y + 9, x, y + 15),
          line(x - 4, y + 15, x + 4, y + 15),
        );
      }).join(" ");
    }),
    line(14, 88, 86, 88),
  );
  const ringCushion = join(
    roundedRect(15, 40, 70, 44, 7),
    line(15, 52, 85, 52),
    line(15, 70, 85, 70),
    circle(42, 60, 9),
    circle(54, 60, 9),
    polygon(20, 40, 6, 6, 3, 0),
    polygon(80, 40, 6, 6, 3, 180),
    line(50, 50, 50, 58),
  );
  const unityCandles = join(
    rect(22, 50, 10, 38),
    rect(68, 50, 10, 38),
    rect(45, 40, 10, 48),
    "M 27 50 C 23 44 27 38 27 36 C 27 38 31 44 27 50 Z",
    "M 73 50 C 69 44 73 38 73 36 C 73 38 77 44 73 50 Z",
    "M 50 40 C 46 33 50 27 50 25 C 50 27 54 33 50 40 Z",
    line(18, 88, 82, 88),
    leaf(34, 78, 12, 4, -20),
    leaf(66, 78, 12, 4, 200),
  );
  const runner = join(
    "M 26 12 L 74 12 L 88 92 L 12 92 Z",
    "M 34 12 L 66 12 L 76 92 L 24 92 Z",
    ...Array.from({ length: 9 }, (_, index) => {
      const x = 24 + index * 6.5;
      const y = 24 + ((index * 37) % 60);
      return petal(x, y, 6, 2.6, index % 2 ? 40 : 130);
    }),
  );
  const seatingChart = join(
    roundedRect(14, 10, 72, 80, 3),
    line(20, 22, 80, 22),
    ...Array.from({ length: 4 }, (_, row) => {
      const y = 36 + row * 12;
      return join(
        circle(27, y, 3),
        line(35, y, 60, y),
        circle(66, y, 3),
        line(70, y, 78, y),
      );
    }),
    star(50, 16, 4.4, 1.8, 6),
  );
  const guestBook = join(
    "M 10 30 C 26 24 42 28 50 34 C 58 28 74 24 90 30 L 90 76 C 74 70 58 76 50 82 C 42 76 26 70 10 76 Z",
    line(50, 34, 50, 82),
    line(18, 40, 42, 40),
    line(18, 48, 42, 48),
    line(58, 40, 82, 40),
    "M 58 54 L 74 48 L 74 62 L 58 68 Z",
    line(74, 48, 82, 44),
  );
  const placeSetting = join(
    circle(44, 52, 30),
    circle(44, 52, 22),
    circle(44, 52, 7),
    "M 82 26 L 82 76 M 78 26 L 78 44 M 86 26 L 86 44",
    "M 10 28 L 10 76 M 6 28 L 6 44 L 14 44 L 14 28",
    line(24, 26, 24, 76),
  );
  const tableNumber = join(
    "M 30 86 L 30 24 L 50 14 L 70 24 L 70 86 Z",
    line(30, 86, 70, 86),
    "M 44 34 L 50 30 L 50 54 M 44 54 L 56 54",
    leaf(34, 68, 11, 4, 200),
    leaf(66, 68, 11, 4, -20),
    circle(50, 20, 2.2),
  );
  return [
    [arch, "Floral ceremony arch", "Ceremony", ["wedding", "arch", "ceremony", "floral", "altar", "arbour"]],
    [cakeThree, "Three-tier wedding cake", "Ceremony", ["wedding", "cake", "ceremony", "dessert", "reception"]],
    [cakeFour, "Four-tier wedding cake", "Ceremony", ["wedding", "cake", "ceremony", "dessert", "tiered"]],
    [topper, "Heart cake topper", "Ceremony", ["wedding", "cake topper", "hearts", "ceremony", "sweetheart"]],
    [champagneTower, "Champagne coupe tower", "Ceremony", ["wedding", "champagne", "toast", "reception", "coupe"]],
    [ringCushion, "Ring cushion", "Ceremony", ["wedding", "rings", "cushion", "vows", "ceremony"]],
    [unityCandles, "Unity candle set", "Ceremony", ["wedding", "candle", "unity", "ceremony", "flame"]],
    [runner, "Petalled aisle runner", "Ceremony", ["wedding", "aisle", "runner", "petals", "ceremony"]],
    [seatingChart, "Seating chart board", "Ceremony", ["wedding", "seating", "chart", "reception", "plan"]],
    [guestBook, "Guest book and pen", "Ceremony", ["wedding", "guest book", "pen", "reception", "keepsake"]],
    [placeSetting, "Place setting", "Ceremony", ["wedding", "place setting", "plate", "cutlery", "reception"]],
    [tableNumber, "Table number tent card", "Ceremony", ["wedding", "table number", "card", "reception", "stationery"]],
  ].map(([d, name, subcategory, tags]) => ({ d, name, subcategory, tags, ink: "stroke", strokeWidth: 1.4, aspect: 1 }));
}

function florals() {
  const bouquet = join(
    petalRing(50, 46, 7, 8, 14, 6, -90),
    petal(50, 40, 16, 7, -90),
    leaf(28, 58, 22, 7, 140),
    leaf(72, 58, 22, 7, 40),
    leaf(50, 70, 18, 6, 90),
    "M 36 74 C 30 82 34 88 42 86 M 64 74 C 70 82 66 88 58 86",
    "M 38 78 C 34 84 36 88 40 89 C 44 88 44 82 40 78 Z",
    "M 62 78 C 66 84 64 88 60 89 C 56 88 56 82 60 78 Z",
  );
  const boutonniere = join(
    petalRing(50, 42, 4, 6, 11, 4.6, -90),
    leaf(35, 58, 24, 7, 115),
    leaf(65, 58, 24, 7, 65),
    "M 48 60 L 46 90",
    line(42, 72, 56, 70),
  );
  const corsage = join(
    petalRing(38, 42, 3.2, 6, 9, 4, -90),
    petalRing(58, 34, 3.2, 6, 8, 3.6, -90),
    petalRing(54, 54, 3.2, 6, 8, 3.6, -90),
    leaf(24, 55, 16, 5, 120),
    leaf(72, 48, 16, 5, 60),
    "M 30 62 C 22 72 30 78 40 72 M 62 62 C 70 72 62 78 52 72",
  );
  const crown = join(
    "M 20 58 C 16 34 38 22 50 30 C 62 22 84 34 80 58",
    "M 20 58 C 28 66 72 66 80 58",
    ...petalRing(50, 44, 19, 7, 9, 4, -150),
    ...Array.from({ length: 5 }, (_, index) => leaf(30 + index * 10, 58, 9, 3, 90)),
  );
  const hangingHoop = join(
    circle(50, 52, 28),
    line(50, 10, 50, 24),
    line(38, 12, 62, 12),
    ...petalRing(50, 78, 20, 6, 9, 4, -150),
    leaf(30, 62, 14, 4, 150),
    leaf(70, 62, 14, 4, 30),
    "M 50 80 L 46 96 M 50 80 L 54 96",
  );
  const pewPosy = join(
    petalRing(50, 36, 4, 6, 10, 4, -90),
    leaf(36, 52, 18, 5, 130),
    leaf(64, 52, 18, 5, 50),
    "M 44 50 C 38 64 34 74 32 88 M 56 50 C 62 64 66 74 68 88",
    line(32, 88, 28, 94),
    line(68, 88, 72, 94),
  );
  const centrepiece = join(
    "M 34 58 C 34 76 40 86 50 86 C 60 86 66 76 66 58 Z",
    line(30, 58, 70, 58),
    ...petalRing(50, 42, 10, 7, 15, 6, -90),
    leaf(26, 52, 20, 6, 150),
    leaf(74, 52, 20, 6, 30),
    leaf(36, 34, 18, 5, -110),
    leaf(64, 34, 18, 5, -70),
  );
  const garland = join(
    sweep(50, 54, 42, 12, 190, 350),
    ...Array.from({ length: 7 }, (_, index) => {
      const angle = ((200 + index * 23) * Math.PI) / 180;
      const x = 50 + Math.cos(angle) * 42;
      const y = 54 + Math.sin(angle) * 12;
      return join(
        leaf(x, y, 12, 4, index % 2 ? 140 : 40),
        index % 2 === 0 ? circle(x, y + 2, 3.2) : "",
      );
    }),
  );
  const petals = join(
    ...Array.from({ length: 12 }, (_, index) => {
      const x = 12 + ((index * 29) % 76);
      const y = 16 + ((index * 47) % 68);
      return petal(x, y, 11, 4.6, (index * 67) % 360);
    }),
  );
  const streamer = join(
    "M 14 12 C 24 26 18 38 26 50 C 34 62 26 74 36 88",
    "M 34 10 C 44 24 38 36 46 48 C 54 60 46 74 56 88",
    "M 58 12 C 68 26 62 38 70 50 C 78 62 70 74 80 88",
    "M 78 14 C 86 26 82 38 88 48",
  );
  const flowerGirlBasket = join(
    "M 24 48 L 76 48 L 68 86 L 32 86 Z",
    "M 28 48 C 30 24 70 24 72 48",
    "M 24 58 L 76 58",
    ...petalRing(50, 44, 12, 6, 7, 3.4, -150),
    leaf(30, 34, 14, 4, -40),
  );
  const backdrop = join(
    rect(12, 12, 76, 80),
    line(20, 12, 20, 92),
    line(80, 12, 80, 92),
    ...petalRing(50, 24, 18, 5, 8, 4, -160),
    leaf(20, 80, 24, 7, 45),
    leaf(80, 80, 24, 7, 135),
    circle(50, 46, 6),
  );
  return [
    [bouquet, "Bridal bouquet", "Florals", ["wedding", "bouquet", "flowers", "bride", "floral"]],
    [boutonniere, "Boutonniere", "Florals", ["wedding", "boutonniere", "rose", "groom", "floral"]],
    [corsage, "Floral corsage", "Florals", ["wedding", "corsage", "flowers", "guest", "floral"]],
    [crown, "Floral crown", "Florals", ["wedding", "crown", "flowers", "bride", "floral"]],
    [hangingHoop, "Hanging floral hoop", "Florals", ["wedding", "hoop", "flowers", "backdrop", "floral"]],
    [pewPosy, "Pew end posy", "Florals", ["wedding", "pew", "posy", "ceremony", "floral"]],
    [centrepiece, "Table centrepiece", "Florals", ["wedding", "centrepiece", "vase", "flowers", "reception"]],
    [garland, "Table garland", "Florals", ["wedding", "garland", "vine", "table", "floral"]],
    [petals, "Scattered rose petals", "Florals", ["wedding", "petals", "rose", "confetti", "floral"]],
    [streamer, "Silk ribbon streamers", "Florals", ["wedding", "ribbon", "streamer", "decor", "silk"]],
    [flowerGirlBasket, "Flower girl basket", "Florals", ["wedding", "basket", "flower girl", "petals", "ceremony"]],
    [backdrop, "Floral backdrop panel", "Florals", ["wedding", "backdrop", "panel", "flowers", "photo"]],
  ].map(([d, name, subcategory, tags]) => ({ d, name, subcategory, tags, ink: "stroke", strokeWidth: 1.4, aspect: 1 }));
}

function paper() {
  const saveDate = join(
    roundedRect(18, 8, 64, 84, 3),
    line(26, 22, 74, 22),
    roundedRect(28, 32, 44, 34, 2),
    line(28, 43, 72, 43),
    line(28, 54, 72, 55),
    ...Array.from({ length: 4 }, (_, row) =>
      Array.from({ length: 5 }, (_, col) => circle(33 + col * 8.5, 48 + row * 5, 0.9)).join(" "),
    ),
    "M 50 76 C 44 70 38 76 42 81 C 45 85 50 88 50 88 C 50 88 55 85 58 81 C 62 76 56 70 50 76 Z",
    line(26, 78, 40, 78),
    line(60, 78, 74, 78),
  );
  const suite = join(
    roundedRect(8, 22, 48, 64, 2),
    roundedRect(24, 14, 52, 68, 2),
    roundedRect(40, 24, 52, 64, 2),
    line(32, 28, 66, 28),
    line(48, 38, 84, 38),
    line(48, 48, 78, 48),
    line(48, 58, 72, 58),
    star(58, 70, 4, 1.6, 5),
    line(16, 36, 44, 36),
    line(16, 48, 40, 48),
  );
  const rsvp = join(
    roundedRect(22, 10, 56, 62, 2),
    line(30, 24, 70, 24),
    roundedRect(30, 34, 5, 5, 1),
    line(40, 36, 68, 36),
    roundedRect(30, 46, 5, 5, 1),
    line(40, 48, 68, 48),
    line(30, 58, 56, 58),
    "M 18 72 L 82 72 L 82 92 L 18 92 Z",
    "M 18 72 L 50 84 L 82 72",
  );
  const menu = join(
    roundedRect(24, 6, 52, 88, 2),
    line(34, 20, 66, 20),
    line(34, 30, 60, 30),
    ...Array.from({ length: 3 }, (_, index) => {
      const y = 44 + index * 14;
      return join(line(32, y, 60, y), line(66, y, 68, y), line(32, y - 4, 52, y - 4));
    }),
    leaf(66, 34, 8, 3, 40),
  );
  const fan = join(
    "M 50 88 L 18 36 C 28 22 72 22 82 36 Z",
    ...Array.from({ length: 9 }, (_, index) => {
      const x = 18 + index * 8;
      return line(50, 88, x, 30);
    }),
    sweep(50, 88, 38, 38, 198, 342),
    circle(50, 88, 2.4),
  );
  const placeCard = join(
    "M 14 64 L 50 34 L 86 64 L 86 86 L 14 86 Z",
    line(14, 64, 50, 64),
    line(50, 64, 50, 86),
    leaf(50, 52, 16, 5, -90),
    line(32, 74, 68, 74),
  );
  const welcomeSign = join(
    rect(16, 24, 68, 50),
    line(16, 34, 84, 34),
    line(26, 46, 74, 46),
    line(30, 56, 70, 56),
    line(28, 74, 28, 94),
    line(72, 74, 72, 94),
    ...petalRing(50, 24, 14, 5, 6, 3, -160),
    leaf(30, 24, 12, 4, -140),
  );
  const favourTag = join(
    "M 26 22 L 62 22 L 82 44 L 62 66 L 26 66 Z",
    circle(34, 32, 3),
    line(42, 40, 70, 40),
    line(42, 50, 64, 50),
    "M 54 66 C 50 78 56 88 50 96 C 44 88 50 78 46 66",
  );
  const thankYou = join(
    roundedRect(14, 18, 72, 64, 3),
    "M 50 64 C 42 56 32 62 37 70 C 41 76 50 80 50 80 C 50 80 59 76 63 70 C 68 62 58 56 50 64 Z",
    line(24, 30, 56, 30),
    line(24, 40, 46, 40),
    "M 60 84 L 86 84 L 86 94 L 60 94 Z",
    "M 60 84 L 73 90 L 86 84",
  );
  const liner = join(
    rect(6, 24, 88, 56),
    "M 6 24 L 50 60 L 94 24",
    "M 6 80 L 38 50",
    "M 94 80 L 62 50",
    ...Array.from({ length: 5 }, (_, index) => leaf(14 + index * 18, 30, 10, 3, 30)),
  );
  const monogramWreath = join(
    ...Array.from({ length: 9 }, (_, index) => {
      const angle = ((200 + index * 20) * Math.PI) / 180;
      return leaf(50 + Math.cos(angle) * 30, 50 + Math.sin(angle) * 30, 13, 4, (angle * 180) / Math.PI + 90);
    }),
    ...Array.from({ length: 9 }, (_, index) => {
      const angle = ((340 + index * 20) * Math.PI) / 180;
      return leaf(50 + Math.cos(angle) * 30, 50 + Math.sin(angle) * 30, 13, 4, (angle * 180) / Math.PI + 90);
    }),
    circle(50, 50, 22),
    "M 44 42 L 50 36 L 56 42 L 56 58 L 44 58",
  );
  const detailsCard = join(
    roundedRect(18, 16, 64, 68, 2),
    line(26, 28, 66, 28),
    circle(32, 42, 4),
    line(32, 46, 32, 50),
    line(38, 46, 62, 46),
    "M 28 62 L 36 54 L 44 62 M 28 62 L 28 70 L 44 70",
    line(50, 62, 64, 62),
    line(50, 70, 58, 70),
    line(64, 52, 64, 62),
  );
  return [
    [saveDate, "Save the date card", "Paper & invitations", ["wedding", "save the date", "calendar", "stationery", "announcement"]],
    [suite, "Invitation suite", "Paper & invitations", ["wedding", "invitation", "suite", "stationery", "cards"]],
    [rsvp, "RSVP card", "Paper & invitations", ["wedding", "rsvp", "reply", "stationery", "envelope"]],
    [menu, "Wedding menu card", "Paper & invitations", ["wedding", "menu", "dinner", "stationery", "reception"]],
    [fan, "Ceremony program fan", "Paper & invitations", ["wedding", "program", "fan", "ceremony", "stationery"]],
    [placeCard, "Tent place card", "Paper & invitations", ["wedding", "place card", "tent", "reception", "stationery"]],
    [welcomeSign, "Welcome sign", "Paper & invitations", ["wedding", "welcome", "sign", "entrance", "reception"]],
    [favourTag, "Favour tag", "Paper & invitations", ["wedding", "favour", "tag", "gift", "stationery"]],
    [thankYou, "Thank-you card", "Paper & invitations", ["wedding", "thank you", "card", "heart", "stationery"]],
    [liner, "Envelope liner with motif", "Paper & invitations", ["wedding", "envelope", "liner", "stationery", "invitation"]],
    [monogramWreath, "Monogram wreath", "Paper & invitations", ["wedding", "monogram", "wreath", "laurel", "stationery"]],
    [detailsCard, "Details card", "Paper & invitations", ["wedding", "details", "card", "schedule", "stationery"]],
  ].map(([d, name, subcategory, tags]) => ({ d, name, subcategory, tags, ink: "stroke", strokeWidth: 1.4, aspect: 1 }));
}

function symbols() {
  const interlocked = join(circle(39, 50, 23), circle(61, 50, 23));
  const knot = join(
    circle(40, 48, 19),
    circle(60, 52, 19),
    "M 28 62 C 20 74 30 84 42 76 M 72 38 C 80 26 70 16 58 24",
  );
  const doves = join(
    "M 16 58 C 28 40 42 36 48 46 C 54 34 66 30 78 38 C 72 42 66 44 60 48 C 64 58 56 66 46 62 C 38 70 24 68 16 58 Z",
    "M 48 46 C 52 52 52 58 46 62",
    "M 66 40 C 68 44 70 46 74 46",
    "M 20 70 C 32 64 40 66 44 74 C 34 78 26 76 20 70 Z",
    star(50, 20, 4, 1.6, 5),
  );
  const bells = join(
    "M 26 18 C 26 42 18 46 18 62 L 44 62 C 44 46 36 42 36 18 Z",
    "M 56 18 C 56 42 48 46 48 62 L 74 62 C 74 46 66 42 66 18 Z",
    line(31, 18, 31, 10),
    line(61, 18, 61, 10),
    circle(31, 68, 4),
    circle(61, 68, 4),
    "M 31 10 C 28 4 34 2 36 6",
    "M 61 10 C 58 4 64 2 66 6",
    line(18, 78, 82, 78),
  );
  const horseshoe = join(
    "M 34 92 L 34 44 C 34 20 66 20 66 44 L 66 92 L 56 92 L 56 46 C 56 32 44 32 44 46 L 44 92 Z",
    ...Array.from({ length: 5 }, (_, index) => circle(28 + (index % 2) * 44, 36 + Math.floor(index / 2) * 14, 1.8)),
    line(40, 92, 44, 92),
    line(56, 92, 60, 92),
  );
  const loveKnot = join(
    "M 50 16 C 34 16 26 30 38 38 C 20 40 18 62 34 64 C 26 80 44 88 52 72 C 60 88 78 80 70 64 C 86 62 84 40 66 38 C 78 30 66 16 50 16 Z",
    circle(50, 50, 12),
    line(50, 38, 50, 62),
  );
  const sparkler = join(
    line(50, 46, 50, 94),
    ...Array.from({ length: 12 }, (_, index) => {
      const angle = (index * 30 * Math.PI) / 180;
      return line(
        50 + Math.cos(angle) * 6,
        38 + Math.sin(angle) * 6,
        50 + Math.cos(angle) * 20,
        38 + Math.sin(angle) * 20,
      );
    }),
    ...Array.from({ length: 8 }, (_, index) => {
      const angle = ((index * 45 + 22) * Math.PI) / 180;
      return star(50 + Math.cos(angle) * 26, 38 + Math.sin(angle) * 26, 2.4, 0.9, 4);
    }),
  );
  const confetti = join(
    ...Array.from({ length: 16 }, (_, index) => {
      const angle = (index * 137 * Math.PI) / 180;
      const radius = 12 + (index % 5) * 8;
      const x = 50 + Math.cos(angle) * radius;
      const y = 50 + Math.sin(angle) * radius;
      return index % 3 === 0
        ? circle(x, y, 2.4)
        : index % 3 === 1
          ? rect(x - 2, y - 2, 4, 4)
          : polygon(x, y, 3, 3, 3, index * 30);
    }),
    star(50, 50, 5, 2, 5),
  );
  const heartArrow = join(
    "M 50 82 C 32 66 16 54 16 38 C 16 24 30 18 42 26 C 46 29 48 33 50 37 C 52 33 54 29 58 26 C 70 18 84 24 84 38 C 84 54 68 66 50 82 Z",
    line(30, 46, 78, 18),
    polygon(78, 18, 8, 8, 3, 45),
    line(30, 46, 22, 54),
    line(26, 42, 34, 50),
  );
  const cupidBow = join(
    "M 22 20 C 8 38 8 62 22 80",
    line(22, 20, 22, 80),
    line(22, 50, 88, 50),
    polygon(88, 50, 8, 8, 3, 90),
    line(22, 50, 12, 50),
    "M 22 36 C 30 42 30 58 22 64",
  );
  const laurelFrame = join(
    ...Array.from({ length: 8 }, (_, index) => {
      const angle = ((200 + index * 20) * Math.PI) / 180;
      return leaf(50 + Math.cos(angle) * 31, 50 + Math.sin(angle) * 31, 14, 4.6, (angle * 180) / Math.PI + 90);
    }),
    ...Array.from({ length: 8 }, (_, index) => {
      const angle = ((340 + index * 20) * Math.PI) / 180;
      return leaf(50 + Math.cos(angle) * 31, 50 + Math.sin(angle) * 31, 14, 4.6, (angle * 180) / Math.PI + 90);
    }),
    "M 44 40 L 50 34 L 56 40 L 56 60 L 44 60",
    circle(50, 18, 2.4),
    circle(50, 82, 2.4),
  );
  const champagnePour = join(
    "M 24 14 L 40 14 L 40 34 C 40 42 32 46 32 54 L 32 62 L 40 62 L 40 68 L 24 68 L 24 62 L 32 62 L 32 54 C 32 46 24 42 24 34 Z",
    "M 32 14 L 40 14",
    "M 40 40 C 50 46 54 58 54 70",
    "M 44 62 Q 50 72 62 70 Q 70 68 70 60 L 62 60 Q 60 64 54 64 Q 50 64 48 60 Z",
    line(46, 70, 54, 70),
    line(50, 70, 50, 80),
    line(44, 80, 56, 80),
    ...Array.from({ length: 5 }, (_, index) => circle(46 + (index % 2) * 12, 46 + Math.floor(index / 2) * 8, 1.4)),
  );
  return [
    [interlocked, "Interlocking wedding rings", "Symbols", ["wedding", "rings", "marriage", "symbol", "engagement"]],
    [knot, "Double ring love knot", "Symbols", ["wedding", "knot", "rings", "symbol", "eternity"]],
    [doves, "Dove pair", "Symbols", ["wedding", "doves", "peace", "symbol", "ceremony"]],
    [bells, "Wedding bells", "Symbols", ["wedding", "bells", "celebration", "symbol", "chapel"]],
    [horseshoe, "Lucky horseshoe", "Symbols", ["wedding", "horseshoe", "luck", "symbol", "charm"]],
    [loveKnot, "Celtic love knot", "Symbols", ["wedding", "celtic", "knot", "symbol", "eternity"]],
    [sparkler, "Sparkler", "Symbols", ["wedding", "sparkler", "celebration", "send-off", "light"]],
    [confetti, "Confetti burst", "Symbols", ["wedding", "confetti", "celebration", "burst", "party"]],
    [heartArrow, "Heart and arrow", "Symbols", ["wedding", "heart", "arrow", "love", "symbol"]],
    [cupidBow, "Cupid bow and arrow", "Symbols", ["wedding", "cupid", "bow", "arrow", "love"]],
    [laurelFrame, "Laurel initials frame", "Symbols", ["wedding", "laurel", "monogram", "frame", "symbol"]],
    [champagnePour, "Champagne pour", "Symbols", ["wedding", "champagne", "pour", "toast", "celebration"]],
  ].map(([d, name, subcategory, tags]) => ({ d, name, subcategory, tags, ink: "stroke", strokeWidth: 1.4, aspect: 1 }));
}

function party() {
  const balloonArch = join(
    ...Array.from({ length: 11 }, (_, index) => {
      const angle = ((180 + index * 18) * Math.PI) / 180;
      const x = 50 + Math.cos(angle) * 36;
      const y = 58 + Math.sin(angle) * 34;
      const rx = 7 + (index % 3);
      return join(ellipse(x, y, rx, rx * 1.2), line(x, y + rx * 1.2, x + 1, y + rx * 1.2 + 5));
    }),
    line(14, 62, 14, 94),
    line(86, 62, 86, 94),
    line(14, 94, 26, 94),
    line(86, 94, 74, 94),
  );
  const hat = join(
    "M 32 78 L 50 18 L 68 78 Z",
    "M 32 78 C 38 84 62 84 68 78",
    ...Array.from({ length: 4 }, (_, index) => line(38 + index * 4, 62 - index * 10, 50 + index * 4, 62 - index * 10)),
    circle(50, 14, 4.4),
    line(50, 18, 50, 12),
  );
  const pinata = join(
    star(50, 44, 34, 16, 6),
    line(50, 10, 50, 22),
    "M 50 10 C 58 6 62 12 58 16",
    ...Array.from({ length: 6 }, (_, index) => {
      const angle = ((index * 60 - 90) * Math.PI) / 180;
      return line(50 + Math.cos(angle) * 34, 44 + Math.sin(angle) * 34, 50 + Math.cos(angle) * 42, 44 + Math.sin(angle) * 42);
    }),
    line(50, 78, 50, 92),
  );
  const cupcakeTower = join(
    line(18, 88, 82, 88),
    line(30, 88, 30, 62),
    line(70, 88, 70, 62),
    line(24, 62, 76, 62),
    ...Array.from({ length: 3 }, (_, index) => {
      const x = 32 + index * 18;
      return join(
        `M ${x - 8} 52 L ${x + 8} 52 L ${x + 5} 62 L ${x - 5} 62 Z`,
        `M ${x - 8} 52 C ${x - 8} 42 ${x + 8} 42 ${x + 8} 52 Z`,
        circle(x, 40, 2.2),
      );
    }),
    "M 30 62 C 38 56 62 56 70 62",
  );
  const slice = join(
    "M 22 78 L 50 24 L 78 78 Z",
    line(36, 50, 64, 50),
    line(29, 64, 71, 64),
    "M 50 24 C 47 18 52 14 56 17",
    circle(56, 14, 3),
    line(22, 78, 78, 78),
  );
  const toast = join(
    "M 18 20 L 34 20 L 32 52 Q 26 62 26 70 L 26 76 L 34 76 L 34 82 L 18 82 L 18 76 L 26 76 L 26 70 Q 26 62 20 52 Z",
    "M 66 20 L 82 20 L 80 52 Q 74 62 74 70 L 74 76 L 82 76 L 82 82 L 66 82 L 66 76 L 74 76 L 74 70 Q 74 62 68 52 Z",
    ...Array.from({ length: 6 }, (_, index) => circle(38 + (index % 3) * 10, 24 + Math.floor(index / 3) * 8, 1.4)),
    line(34, 34, 54, 30),
    star(50, 42, 3, 1.2, 4),
  );
  const fireworks = join(
    ...Array.from({ length: 12 }, (_, index) => {
      const angle = (index * 30 * Math.PI) / 180;
      const inner = 12;
      const outer = 32 + (index % 3) * 6;
      return join(
        line(50 + Math.cos(angle) * inner, 50 + Math.sin(angle) * inner, 50 + Math.cos(angle) * outer, 50 + Math.sin(angle) * outer),
        circle(50 + Math.cos(angle) * (outer + 3), 50 + Math.sin(angle) * (outer + 3), 1.4),
      );
    }),
    circle(50, 50, 3),
  );
  const streamerCurtain = join(
    ...Array.from({ length: 6 }, (_, index) =>
      sweep(14 + index * 14, 54, 4, 40, 200, 340),
    ),
    line(8, 12, 92, 12),
    line(20, 92, 20, 84),
    line(48, 92, 48, 82),
    line(76, 92, 76, 86),
  );
  const giftStack = join(
    rect(26, 58, 48, 30),
    rect(34, 34, 34, 24),
    line(50, 58, 50, 88),
    line(26, 70, 74, 70),
    line(34, 46, 68, 46),
    line(50, 34, 50, 58),
    "M 50 34 C 42 26 32 32 40 40 M 50 34 C 58 26 68 32 60 40",
    line(20, 88, 80, 88),
  );
  const bunting = join(
    sweep(50, 24, 44, 12, 190, 350),
    ...Array.from({ length: 7 }, (_, index) => {
      const angle = ((200 + index * 23) * Math.PI) / 180;
      const x = 50 + Math.cos(angle) * 44;
      const y = 24 + Math.sin(angle) * 12;
      return polygon(x, y + 10, 7, 11, 3, 180);
    }),
  );
  const candle = join(
    rect(40, 38, 20, 50),
    line(40, 30, 40, 38),
    line(60, 30, 60, 38),
    "M 50 38 C 44 30 50 22 50 18 C 50 22 56 30 50 38 Z",
    "M 44 44 C 41 50 45 54 41 60",
    "M 56 56 C 59 62 55 66 59 72",
    circle(50, 18, 1.2),
  );
  const cracker = join(
    roundedRect(14, 44, 24, 18, 4),
    roundedRect(62, 44, 24, 18, 4),
    "M 38 46 L 50 40 L 62 46 L 62 60 L 50 66 L 38 60 Z",
    line(30, 36, 38, 48),
    line(70, 36, 62, 48),
    "M 50 28 C 44 22 50 16 50 12 C 50 16 56 22 50 28 Z",
    star(50, 52, 5, 2, 5),
  );
  return [
    [balloonArch, "Balloon arch", "Party", ["wedding", "balloon", "arch", "party", "celebration"]],
    [hat, "Striped party hat", "Party", ["wedding", "hat", "party", "birthday", "celebration"]],
    [pinata, "Star pinata", "Party", ["wedding", "pinata", "star", "party", "fiesta"]],
    [cupcakeTower, "Cupcake tower", "Party", ["wedding", "cupcake", "tower", "party", "dessert"]],
    [slice, "Cake slice", "Party", ["wedding", "cake", "slice", "dessert", "party"]],
    [toast, "Toasting flutes", "Party", ["wedding", "toast", "flutes", "party", "celebration"]],
    [fireworks, "Firework burst", "Party", ["wedding", "fireworks", "burst", "party", "celebration"]],
    [streamerCurtain, "Streamer curtain", "Party", ["wedding", "streamer", "curtain", "party", "decor"]],
    [giftStack, "Stacked gifts", "Party", ["wedding", "gift", "presents", "party", "celebration"]],
    [bunting, "Bunting flags", "Party", ["wedding", "bunting", "flags", "party", "garland"]],
    [candle, "Birthday candle", "Party", ["wedding", "candle", "birthday", "flame", "party"]],
    [cracker, "Celebration cracker", "Party", ["wedding", "cracker", "party", "favour", "celebration"]],
  ].map(([d, name, subcategory, tags]) => ({ d, name, subcategory, tags, ink: "stroke", strokeWidth: 1.4, aspect: 1 }));
}

export function weddingAssets() {
  return [...ceremony(), ...florals(), ...paper(), ...symbols(), ...party()];
}
