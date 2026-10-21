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
    crimson: "#c63a17",
    sand: "#b4864a",
    pearl: "#ede8dc",
    obsidian: "#16150f",
    paper: "#ede8dc",
    paperDeep: "#e3dccb",
    card: "#f5f1e6",
    ink: "#17160f",
    inkSoft: "#6a6455",
    line: "#cdc6b3",
    olive: "#3d4737",
    gold: "#b4864a",
  },
  fonts: {
    display: '"Instrument Serif", "Cormorant Garamond", serif',
    ui: '"Archivo", system-ui, Helvetica, Arial, sans-serif',
    meta: '"Space Mono", ui-monospace, monospace',
    script: '"Pinyon Script", "Snell Roundhand", cursive',
    arabic: '"Amiri", "Times New Roman", serif',
  },
} as const;

export type Brand = typeof brand;
