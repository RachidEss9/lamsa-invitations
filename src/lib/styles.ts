import type { StylePreset } from "@/lib/design";

export interface BuiltinStyle extends StylePreset {
  name: string;
  note: string;
}

/**
 * Style presets only change colour, page treatment, and typography. Copy,
 * images, positions, shapes, and interactions are left exactly as they are.
 */
export const BUILTIN_STYLES: BuiltinStyle[] = [
  {
    name: "Crimson didone",
    note: "Bodoni Moda · black and vermilion",
    palette: { background: "#f2f1ed", ink: "#161616", accent: "#710014" },
    fontPair: "bodoni-moda",
  },
  {
    name: "Sand Cormorant",
    note: "Cormorant Garamond · warm paper",
    palette: { background: "#f2f1ed", ink: "#2b2723", accent: "#b38f6f" },
    fontPair: "cormorant-garamond",
  },
  {
    name: "Obsidian Cinzel",
    note: "Cinzel · engraved night",
    palette: { background: "#161616", ink: "#f2f1ed", accent: "#b38f6f" },
    background:
      "radial-gradient(110% 80% at 50% 10%, #2a2420 0%, #161616 62%, #0d0d0d 100%)",
    fontPair: "cinzel",
  },
  {
    name: "Pearl Italiana",
    note: "Italiana · quiet couture",
    palette: { background: "#f7f4ec", ink: "#22201c", accent: "#8a8275" },
    fontPair: "italiana",
  },
  {
    name: "Botanical Garamond",
    note: "EB Garamond · pressed leaves",
    palette: { background: "#eef1e6", ink: "#2f3a2a", accent: "#7d8a5c" },
    background:
      "linear-gradient(152deg, #f2f4eb 0%, #e7ecdc 58%, #dfe6d2 100%)",
    fontPair: "eb-garamond",
  },
  {
    name: "Modern Manrope",
    note: "Manrope · gallery white",
    palette: { background: "#f4f4f1", ink: "#17181a", accent: "#c4472f" },
    fontPair: "manrope",
  },
  {
    name: "Romance script",
    note: "Great Vibes · blush paper",
    palette: { background: "#f9ebe8", ink: "#4a2a26", accent: "#b9746d" },
    background:
      "radial-gradient(90% 70% at 50% 0%, #fdf3f0 0%, #f8e8e4 60%, #f2ddd8 100%)",
    fontPair: "great-vibes",
  },
  {
    name: "Arabic Amiri",
    note: "Amiri · sand and Naskh",
    palette: { background: "#f6ecdc", ink: "#3b2a1c", accent: "#9b6b3d" },
    fontPair: "amiri",
  },
  {
    name: "Moroccan jade",
    note: "Scheherazade New · zellige",
    palette: { background: "#f4ead8", ink: "#20372c", accent: "#a67c36" },
    background:
      "linear-gradient(135deg, #f7eeda 0%, #efe0c3 46%, #e7d3ad 100%)",
    fontPair: "scheherazade-new",
  },
  {
    name: "Corporate Montserrat",
    note: "Montserrat · boardroom navy",
    palette: { background: "#f1f2f4", ink: "#1a2433", accent: "#9c7a3c" },
    fontPair: "montserrat",
  },
  {
    name: "Mauve Bodoni",
    note: "Bodoni Moda · wine and rose",
    palette: { background: "#efe6ea", ink: "#3a2630", accent: "#8b4f62" },
    background:
      "linear-gradient(168deg, #f4ecef 0%, #ece0e5 55%, #e5d5dc 100%)",
    fontPair: "bodoni-moda",
  },
  {
    name: "Minimal Inter",
    note: "Inter · soft white",
    palette: { background: "#f8f8f5", ink: "#1c1c1c", accent: "#5f6368" },
    fontPair: "inter",
  },
  {
    name: "Playful Fraunces",
    note: "Fraunces · marigold joy",
    palette: { background: "#f8e8c8", ink: "#4c2b12", accent: "#c17a24" },
    fontPair: "fraunces",
  },
  {
    name: "Nocturne Cormorant",
    note: "Cormorant Garamond · after dark",
    palette: { background: "#1d2024", ink: "#eee6d7", accent: "#b6a27c" },
    background:
      "linear-gradient(182deg, #23262b 0%, #1d2024 44%, #131518 100%)",
    fontPair: "cormorant-garamond",
  },
];
