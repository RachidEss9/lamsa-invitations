/**
 * Defaults a document is born with.
 *
 * These live apart from the factory and the normaliser so both can share the
 * exact same defaults without importing each other.
 */

import type { CharacterStyle, ParagraphStyle, StyleSet } from "./model";
import { defaultIds, type IdFactory } from "./ids";

export const DEFAULT_PARAGRAPH_STYLE_NAME = "Body";

export function createParagraphStyle(
  options: Partial<ParagraphStyle> & { ids?: IdFactory } = {},
): ParagraphStyle {
  const { ids = defaultIds, ...rest } = options;
  return {
    id: rest.id ?? ids("style"),
    name: rest.name ?? DEFAULT_PARAGRAPH_STYLE_NAME,
    fontId: rest.fontId ?? "serif",
    size: rest.size ?? 11,
    leading: rest.leading ?? 14,
    tracking: rest.tracking ?? 0,
    alignment: rest.alignment ?? "left",
    spaceBefore: rest.spaceBefore ?? 0,
    spaceAfter: rest.spaceAfter ?? 0,
    firstLineIndent: rest.firstLineIndent ?? 0,
    hyphenate: rest.hyphenate ?? false,
  };
}

export function createCharacterStyle(
  options: Partial<CharacterStyle> & { ids?: IdFactory } = {},
): CharacterStyle {
  const { ids = defaultIds, ...rest } = options;
  return {
    id: rest.id ?? ids("style"),
    name: rest.name ?? "Emphasis",
    fontId: rest.fontId,
    size: rest.size,
    tracking: rest.tracking,
    color: rest.color,
  };
}

/** One body paragraph style, so a new document can set text immediately. */
export function createDefaultStyles(ids: IdFactory = defaultIds): StyleSet {
  return {
    paragraph: [createParagraphStyle({ ids })],
    character: [],
  };
}
