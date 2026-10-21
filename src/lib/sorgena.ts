/**
 * Sorgena is the LAMSA brand typeface and is licensed, not open source, so it
 * cannot be bundled or fetched from a public CDN. This loader looks for the
 * licensed webfonts in /public/fonts/sorgena and registers them when they are
 * present. Without them the app falls back to Bodoni Moda / Instrument Serif
 * for display and Archivo for interface text, so nothing ever renders in a
 * broken font.
 *
 * Expected files (woff2, variable or static; see public/fonts/sorgena/README.md):
 *   Sorgena-Variable.woff2 / Sorgena-Variable-Italic.woff2
 *   SorgenaText-Variable.woff2 / SorgenaText-Variable-Italic.woff2
 *   Sorgena-Regular|Medium|Semibold|Bold(.woff2)
 *   SorgenaText-Regular|Medium|Semibold|Bold(.woff2)
 */

const BASE = "/fonts/sorgena/";

interface Face {
  family: "Sorgena" | "Sorgena Text";
  file: string;
  weight: string;
  style: "normal" | "italic";
}

const FACES: Face[] = [
  {
    family: "Sorgena",
    file: "Sorgena-Variable.woff2",
    weight: "300 700",
    style: "normal",
  },
  {
    family: "Sorgena",
    file: "Sorgena-Variable-Italic.woff2",
    weight: "300 700",
    style: "italic",
  },
  { family: "Sorgena", file: "Sorgena-Regular.woff2", weight: "400", style: "normal" },
  { family: "Sorgena", file: "Sorgena-Italic.woff2", weight: "400", style: "italic" },
  { family: "Sorgena", file: "Sorgena-Medium.woff2", weight: "500", style: "normal" },
  { family: "Sorgena", file: "Sorgena-Semibold.woff2", weight: "600", style: "normal" },
  { family: "Sorgena", file: "Sorgena-Bold.woff2", weight: "700", style: "normal" },
  {
    family: "Sorgena Text",
    file: "SorgenaText-Variable.woff2",
    weight: "300 700",
    style: "normal",
  },
  {
    family: "Sorgena Text",
    file: "SorgenaText-Variable-Italic.woff2",
    weight: "300 700",
    style: "italic",
  },
  {
    family: "Sorgena Text",
    file: "SorgenaText-Regular.woff2",
    weight: "400",
    style: "normal",
  },
  {
    family: "Sorgena Text",
    file: "SorgenaText-Italic.woff2",
    weight: "400",
    style: "italic",
  },
  {
    family: "Sorgena Text",
    file: "SorgenaText-Medium.woff2",
    weight: "500",
    style: "normal",
  },
  {
    family: "Sorgena Text",
    file: "SorgenaText-Semibold.woff2",
    weight: "600",
    style: "normal",
  },
  {
    family: "Sorgena Text",
    file: "SorgenaText-Bold.woff2",
    weight: "700",
    style: "normal",
  },
];

let started = false;

export function ensureSorgena(): void {
  if (started || typeof document === "undefined") return;
  started = true;

  const style = document.createElement("style");
  style.dataset.lamsa = "sorgena";
  document.head.appendChild(style);

  const register = (face: Face) => {
    style.textContent += [
      "@font-face {",
      `  font-family: "${face.family}";`,
      `  src: url("${BASE}${face.file}") format("woff2");`,
      `  font-weight: ${face.weight};`,
      `  font-style: ${face.style};`,
      "  font-display: swap;",
      "}",
      "",
    ].join("\n");
  };

  // A HEAD request keeps missing files out of the console: the app simply
  // keeps its fallback stack until the licensed files are added.
  for (const face of FACES) {
    void fetch(BASE + face.file, { method: "HEAD" })
      .then((response) => {
        if (!response.ok) return;
        // Dev servers answer unknown paths with the HTML shell; only register
        // an actual font file, never the fallback document.
        const type = response.headers.get("content-type") ?? "";
        if (/text\/html/i.test(type)) return;
        register(face);
      })
      .catch(() => {
        // Offline or blocked request: the fallback stack still renders.
      });
  }
}
