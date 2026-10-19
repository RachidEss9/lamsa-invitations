/**
 * LAMSA brand tokens — TEMPORARY.
 *
 * The official LAMSA Brand Identity package is not available yet, so these
 * values are deliberately centralised here (and mirrored as CSS tokens in
 * src/index.css) and easy to replace. No logo mark is invented: the wordmark
 * is set in type until the official logo is supplied.
 */
export const brand = {
  name: "LAMSA",
  tagline: "Invitations, considered.",
  description:
    "A quiet studio for wedding, engagement, birthday, and graduation invitations — designed to be opened, not scrolled past.",
  colors: {
    paper: "#f4efe5",
    paperDeep: "#eae2d3",
    card: "#fbf7ee",
    ink: "#24211b",
    inkSoft: "#6b6557",
    line: "#ddd3c0",
    olive: "#5c6650",
    gold: "#ab8a52",
  },
  fonts: {
    display: '"Cormorant Garamond", "Times New Roman", serif',
    ui: '"Jost", "Helvetica Neue", Helvetica, Arial, sans-serif',
  },
} as const;

export type Brand = typeof brand;
