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
  "textDecoration",
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

/* -------------------------------------------------------------------------- */
/* Role presets                                                              */
/* -------------------------------------------------------------------------- */

export interface TypeRolePreset {
  id: "names" | "heading" | "subtitle" | "date" | "body";
  label: string;
  note: string;
  style: TypeStyle;
}

/**
 * The five levels an invitation actually uses. A preset only sets lettering
 * scale, weight and rhythm, so it never re-colours the palette or rewrites the
 * host's words; Arabic stays safe because tracking stays low.
 */
export const TYPE_ROLE_PRESETS: TypeRolePreset[] = [
  {
    id: "names",
    label: "Names",
    note: "The couple, at display scale",
    style: {
      fontSize: 64,
      fontWeight: 500,
      letterSpacing: 0.01,
      lineHeight: 1.08,
      textTransform: "none",
      align: "center",
    },
  },
  {
    id: "heading",
    label: "Heading",
    note: "A section title in small caps",
    style: {
      fontSize: 34,
      fontWeight: 600,
      letterSpacing: 0.08,
      lineHeight: 1.18,
      textTransform: "uppercase",
      align: "center",
    },
  },
  {
    id: "subtitle",
    label: "Subtitle",
    note: "A quiet supporting line",
    style: {
      fontSize: 21,
      fontWeight: 400,
      letterSpacing: 0.03,
      lineHeight: 1.5,
      textTransform: "none",
      align: "center",
    },
  },
  {
    id: "date",
    label: "Date",
    note: "Wide, letter-spaced details",
    style: {
      fontSize: 17,
      fontWeight: 500,
      letterSpacing: 0.14,
      lineHeight: 1.35,
      textTransform: "uppercase",
      align: "center",
    },
  },
  {
    id: "body",
    label: "Body",
    note: "Readable programme copy",
    style: {
      fontSize: 15,
      fontWeight: 400,
      letterSpacing: 0.01,
      lineHeight: 1.7,
      textTransform: "none",
      align: "center",
    },
  },
];

export function describeTypeStyle(style: TypeStyle, fontName: string): string {
  const parts = [fontName];
  if (style.fontSize) parts.push(`${Math.round(style.fontSize)} px`);
  if (style.fontWeight && style.fontWeight !== 400) parts.push(`${style.fontWeight}`);
  if (style.letterSpacing) parts.push(`${style.letterSpacing.toFixed(2)} em tracking`);
  if (style.uppercase || style.textTransform === "uppercase") parts.push("uppercase");
  if (style.textDecoration === "underline") parts.push("underlined");
  if (style.textDecoration === "line-through") parts.push("struck through");
  return parts.join(" · ");
}
