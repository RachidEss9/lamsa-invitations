/**
 * LAMSA brand tokens.
 *
 * Mirrors the LAMSA v5 Brand & Templates package: crimson, sand, pearl, and
 * obsidian, with Cormorant Garamond as the display face and IBM Plex Sans as
 * the UI face. Pinyon Script and Amiri cover the new script/Arabic pairs.
 * No logo mark is used: the wordmark is set in type (the official logo
 * arrives later).
 */
export const brand = {
  name: "LAMSA",
  tagline: "Invitations, considered.",
  description:
    "A quiet studio for wedding, engagement, birthday, and graduation invitations — designed to be opened, not scrolled past.",
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
    olive: "#8a6f52",
    gold: "#b38f6f",
  },
  fonts: {
    display: '"Cormorant Garamond", "Times New Roman", serif',
    ui: '"IBM Plex Sans", system-ui, Helvetica, Arial, sans-serif',
    script: '"Pinyon Script", "Snell Roundhand", cursive',
    arabic: '"Amiri", "Times New Roman", serif',
  },
} as const;

export type Brand = typeof brand;
