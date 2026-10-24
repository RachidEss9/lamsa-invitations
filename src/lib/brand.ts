/**
 * LAMSA brand tokens.
 *
 * The atelier palette is paper, ink, and one vermilion. Type is set in
 * Instrument Serif for display, Archivo for interface, and Space Mono for
 * folios and file numbers. The supplied logo set in `public/brand` carries the
 * arch symbol and lowercase wordmark on every surface.
 */
export const brand = {
  name: "LAMSA",
  tagline: "An invitation atelier.",
  description:
    "Compose one considered invitation, address it to every guest by name, and send a link worth opening.",
  colors: {
    crimson: "#710014",
    sand: "#b38f6f",
    pearl: "#f2f1ed",
    obsidian: "#161616",
    paper: "#f2f1ed",
    paperDeep: "#e9e6dc",
    card: "#f7f6f2",
    ink: "#161616",
    inkSoft: "#6a665e",
    line: "#dcd9cf",
    olive: "#6d5539",
    gold: "#b38f6f",
  },
  /** Logo artwork, exactly as supplied. Fixed fills: pick the matching tone. */
  logos: {
    lockupCrimson: "/brand/lamsa-lockup-crimson.svg",
    lockupInk: "/brand/lamsa-lockup-ink.svg",
    lockupPaper: "/brand/lamsa-lockup-paper.svg",
    wordmarkCrimson: "/brand/lamsa-wordmark-crimson.svg",
    symbolCrimson: "/brand/lamsa-symbol-crimson.svg",
    icon: "/brand/lamsa-icon.svg",
  },
  fonts: {
    display: '"Sorgena", "Bodoni Moda", "Instrument Serif", serif',
    ui: '"Montserrat Variable", "Montserrat", system-ui, sans-serif',
    meta: '"Space Mono", ui-monospace, monospace',
    script: '"Pinyon Script", "Snell Roundhand", cursive',
    arabic: '"Amiri", "Times New Roman", serif',
  },
} as const;

export type Brand = typeof brand;
