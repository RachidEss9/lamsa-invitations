import type { DesignElement } from "@/lib/design";

/**
 * A reusable typography style.
 *
 * Only lettering travels: family, size, weight, spacing, case, alignment, and
 * ink. Position, box size, rotation, animation, and content belong to the
 * layer itself, so applying a saved style can never move or retype a layer.
 */
export const TYPE_STYLE_KEYS = [
  "font",
  "fontSize",
  "fontWeight",
  "italic",
  "uppercase",
  "letterSpacing",
  "lineHeight",
  "align",
  "color",
  "textTransform",
] as const;

export type TypeStyle = Partial<
  Pick<DesignElement, (typeof TYPE_STYLE_KEYS)[number]>
>;

export interface SavedTypeStyle {
  id: string;
  name: string;
  style: TypeStyle;
}

export function extractTypeStyle(
  element: DesignElement | null | undefined,
): TypeStyle {
  if (!element || element.kind !== "text") return {};
  const style: TypeStyle = {};
  for (const key of TYPE_STYLE_KEYS) {
    const value = element[key];
    if (value !== undefined) {
      // Explicit assignment keeps the union type narrow per key.
      (style as Record<string, unknown>)[key] = value;
    }
  }
  return style;
}

/** Applies a saved style to a text layer, leaving its geometry untouched. */
export function applyTypeStyle(
  element: DesignElement,
  style: TypeStyle,
): DesignElement {
  if (element.kind !== "text") return element;
  return { ...element, ...style };
}

export function describeTypeStyle(style: TypeStyle, fontName: string): string {
  const parts = [fontName];
  if (style.fontSize) parts.push(`${Math.round(style.fontSize)} px`);
  if (style.fontWeight && style.fontWeight !== 400) parts.push(`${style.fontWeight}`);
  if (style.letterSpacing) parts.push(`${style.letterSpacing.toFixed(2)} em tracking`);
  if (style.uppercase || style.textTransform === "uppercase") parts.push("uppercase");
  return parts.join(" · ");
}
