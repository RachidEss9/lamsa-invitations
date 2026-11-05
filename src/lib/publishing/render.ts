/**
 * Presentation helpers shared by the canvas, the thumbnails and the
 * inspector.
 *
 * This module resolves *document data* into *rendering facts* — a font stack,
 * a paragraph list, an SVG path — without importing React. That keeps the
 * renderer thin and lets the tests assert the typography and geometry the
 * canvas actually draws.
 */

import type {
  CharacterStyle,
  ImageFit,
  ParagraphStyle,
  PublicationDocument,
  PublicationObject,
  PublicationPage,
  Rect,
  Story,
  StoryParagraph,
  TextFrameObject,
} from "./model";
import { defaultIds, type IdFactory } from "./ids";
import { frameBounds } from "./object-transform";

/* -------------------------------------------------------------------------- */
/* Typography                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Document font ids are tokens, never CSS stacks. The interface fonts are
 * already loaded by the application, so the canvas borrows the same stacks
 * and Arabic text falls through to the Arabic face rather than a generic
 * serif.
 */
const FONT_STACKS: Record<string, string> = {
  serif: 'var(--font-display, "Bodoni Moda", "Times New Roman", serif)',
  display: 'var(--font-display, "Bodoni Moda", "Times New Roman", serif)',
  sans: "var(--font-ui, system-ui, sans-serif)",
  ui: "var(--font-ui, system-ui, sans-serif)",
  mono: 'var(--font-meta, ui-monospace, "SFMono-Regular", monospace)',
  arabic: 'var(--font-arabic, "Amiri", "Noto Naskh Arabic", serif)',
  script: 'var(--font-script, "Pinyon Script", cursive)',
};

export function fontFamilyFor(fontId: string | undefined): string {
  if (!fontId) return FONT_STACKS.serif!;
  return FONT_STACKS[fontId] ?? fontId;
}

const RTL_LANGUAGES = new Set(["ar", "fa", "he", "ur", "ps", "sd", "ug"]);

/** Arabic, Farsi, Hebrew and Urdu read right to left on the page. */
export function textDirection(language: string | undefined): "rtl" | "ltr" | "auto" {
  if (!language) return "auto";
  const base = language.toLowerCase().split(/[-_]/)[0] ?? "";
  return RTL_LANGUAGES.has(base) ? "rtl" : "auto";
}

export function paragraphStyleFor(
  document: PublicationDocument,
  paragraph: StoryParagraph,
): ParagraphStyle | undefined {
  const styles = document.styles.paragraph;
  return (
    styles.find((style) => style.id === paragraph.styleId) ?? styles[0] ?? undefined
  );
}

export function characterStyleFor(
  document: PublicationDocument,
  styleId: string | undefined,
): CharacterStyle | undefined {
  if (!styleId) return undefined;
  return document.styles.character.find((style) => style.id === styleId);
}

/** The plain text of a story, one paragraph per line (for the inspector). */
export function storyText(story: Story | undefined): string {
  if (!story) return "";
  return story.paragraphs.map((paragraph) => runsText(paragraph)).join("\n");
}

function runsText(paragraph: StoryParagraph): string {
  return paragraph.runs.map((run) => run.text).join("");
}

/**
 * Turns edited plain text back into paragraphs. Ids of unchanged paragraphs
 * are preserved, so editing one line never invalidates the rest of the story.
 */
export function paragraphsFromText(
  text: string,
  existing: readonly StoryParagraph[] = [],
  ids: IdFactory = defaultIds,
): StoryParagraph[] {
  const lines = text.split("\n");
  return lines.map((line, index) => {
    const previous = existing[index];
    const runs = [{ text: line, ...(previous?.runs[0]?.styleId ? { styleId: previous.runs[0].styleId } : {}) }];
    if (previous && runsText(previous) === line && previous.runs.length === 1) {
      return previous;
    }
    return {
      id: previous?.id ?? ids("paragraph"),
      ...(previous?.styleId ? { styleId: previous.styleId } : {}),
      runs,
    };
  });
}

export function storyForFrame(
  document: PublicationDocument,
  object: PublicationObject,
): Story | undefined {
  if (object.kind !== "text-frame" || !object.storyId) return undefined;
  return document.stories.find((story) => story.id === object.storyId);
}

/** Frames whose stories thread through more than one frame. */
export function frameThreadLength(
  document: PublicationDocument,
  object: PublicationObject,
): number {
  return storyForFrame(document, object)?.frames.length ?? 0;
}

/* -------------------------------------------------------------------------- */
/* Image frames                                                               */
/* -------------------------------------------------------------------------- */

/** SVG `preserveAspectRatio` for each fit mode. */
export function imagePreserveAspectRatio(fit: ImageFit): string {
  switch (fit) {
    case "fit":
      return "xMidYMid meet";
    case "stretch":
      return "none";
    case "fill":
    default:
      return "xMidYMid slice";
  }
}

/* -------------------------------------------------------------------------- */
/* Shapes                                                                     */
/* -------------------------------------------------------------------------- */

/** Points for a regular polygon inscribed in a rectangle, as SVG `points`. */
export function polygonPoints(rect: Rect, sides: number): string {
  const count = Math.max(3, Math.min(64, Math.trunc(sides) || 3));
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  const radiusX = rect.width / 2;
  const radiusY = rect.height / 2;
  const points: string[] = [];
  for (let index = 0; index < count; index += 1) {
    // Start at the top so even-sided polygons read upright.
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
    points.push(
      `${centerX + Math.cos(angle) * radiusX},${centerY + Math.sin(angle) * radiusY}`,
    );
  }
  return points.join(" ");
}

/* -------------------------------------------------------------------------- */
/* Labels and readouts                                                        */
/* -------------------------------------------------------------------------- */

const KIND_LABELS: Record<string, string> = {
  "text-frame": "Text",
  "image-frame": "Image",
  shape: "Shape",
  line: "Line",
  generic: "Unsupported",
};

export function objectKindLabel(object: PublicationObject): string {
  if (object.kind === "generic") {
    return object.originalKind ? `Unsupported · ${object.originalKind}` : "Unsupported";
  }
  return KIND_LABELS[object.kind] ?? "Object";
}

export function objectTitle(object: PublicationObject): string {
  return object.name.trim() || objectKindLabel(object);
}

export function pageLabel(page: PublicationPage, index: number): string {
  const name = page.name.trim();
  return name && name !== "Page" ? name : `Page ${index + 1}`;
}

/** Text frame content as it should read in a placeholder. */
export function textFramePreview(document: PublicationDocument, object: TextFrameObject): string {
  const story = storyForFrame(document, object);
  const text = storyText(story).trim();
  return text || "";
}

/** The bounds an object occupies, for the inspector's position readout. */
export function objectBounds(object: PublicationObject): Rect {
  return frameBounds(object.frame);
}
