/**
 * LAMSA brand tokens.
 *
 * The atelier palette is paper, ink, and one vermilion. Type is set in
 * Instrument Serif for display, Archivo for interface, and Space Mono for
 * folios and file numbers. No logo mark is used: the wordmark is set in type.
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
  fonts: {
    display: '"Sorgena", "Bodoni Moda", "Instrument Serif", serif',
    ui: '"Sorgena Text", "Sorgena", "Archivo", system-ui, sans-serif',
    meta: '"Space Mono", ui-monospace, monospace',
    script: '"Pinyon Script", "Snell Roundhand", cursive',
    arabic: '"Amiri", "Times New Roman", serif',
  },
} as const;

export type Brand = typeof brand;
