import type { DesignPage } from "@/lib/design";
import type { ColourPalette } from "@/lib/palettes";

/**
 * Colour actions behind the studio Library's Colours category.
 *
 * Both helpers are pure so the behaviour a button in the Library promises can
 * be checked without a browser: one recolours selected layers on a page, the
 * other derives the single-colour swatch wall from the curated palettes.
 */

export interface LibrarySwatch {
  hex: string;
  /** The palette this colour was first seen in. */
  palette: string;
  role: "paper" | "ink" | "accent";
}

/**
 * Applies one colour to the selected layers of a page.
 *
 * Text and motifs carry their ink in `color`; shapes carry it in `fill`.
 * Photographs are never tinted, and layers outside the selection are returned
 * untouched. The page object is preserved when nothing would change, so the
 * editor does not record an empty history step.
 */
export function recolourSelection(
  page: DesignPage,
  ids: readonly string[],
  hex: string,
): DesignPage {
  if (ids.length === 0) return page;
  const wanted = new Set(ids);
  let changed = false;

  const elements = page.elements.map((element) => {
    if (!wanted.has(element.id)) return element;
    if (element.kind === "text" || element.kind === "motif") {
      if (element.color === hex) return element;
      changed = true;
      return { ...element, color: hex };
    }
    if (element.kind === "shape") {
      if (element.fill === hex) return element;
      changed = true;
      return { ...element, fill: hex };
    }
    return element;
  });

  return changed ? { ...page, elements } : page;
}

/**
 * The distinct colours of the curated palettes, in palette order.
 *
 * Duplicates are compared case-insensitively, so a palette that repeats its
 * ink and accent contributes the colour once — the swatch wall stays a set,
 * not a list of repeats.
 */
export function paletteSwatches(
  palettes: readonly ColourPalette[],
): LibrarySwatch[] {
  const seen = new Set<string>();
  const swatches: LibrarySwatch[] = [];

  for (const palette of palettes) {
    const roles: { role: LibrarySwatch["role"]; hex: string }[] = [
      { role: "paper", hex: palette.paper },
      { role: "ink", hex: palette.ink },
      { role: "accent", hex: palette.accent },
    ];
    for (const { role, hex } of roles) {
      const key = hex.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      swatches.push({ hex, palette: palette.name, role });
    }
  }

  return swatches;
}
