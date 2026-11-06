/**
 * Typography and text-layout rules.
 *
 * The renderer, the inspector and the tests all use these pure functions, so
 * "bold" or "RTL" means the same thing on the canvas, in a thumbnail and in a
 * saved document. Type sizes, leading, tracking and indents are stored in
 * points (or 1/1000 em for tracking); only the final CSS conversion happens in
 * the component.
 */

import type {
  CharacterFormat,
  CharacterStyle,
  ParagraphFormat,
  ParagraphStyle,
  PublicationDocument,
  PublicationPage,
  Story,
  StoryFrameRef,
  StoryParagraph,
  TextDirection,
  TextFrameObject,
  TextRun,
} from "./model";
import { defaultIds, type IdFactory } from "./ids";
import { fontFamilyFor } from "./render";

/* -------------------------------------------------------------------------- */
/* Fonts                                                                      */
/* -------------------------------------------------------------------------- */

export interface PublishingFont {
  id: string;
  name: string;
  /** The CSS family the browser is asked for, for availability checks. */
  probe: string;
  supportsArabic: boolean;
  classification: "serif" | "sans" | "display" | "mono" | "script";
}

/**
 * The document font tokens. These are the application's own open stacks; no
 * font service is contacted. A missing family falls back through the stack,
 * and every display/serif/sans stack includes an Arabic face so mixed text
 * never falls into tofu.
 */
export const PUBLISHING_FONTS: readonly PublishingFont[] = [
  {
    id: "serif",
    name: "LAMSA Serif",
    probe: "Bodoni Moda",
    supportsArabic: true,
    classification: "serif",
  },
  {
    id: "display",
    name: "LAMSA Display",
    probe: "Sorgena",
    supportsArabic: true,
    classification: "display",
  },
  {
    id: "sans",
    name: "LAMSA Sans",
    probe: "Montserrat",
    supportsArabic: true,
    classification: "sans",
  },
  {
    id: "arabic",
    name: "Arabic Naskh",
    probe: "Amiri",
    supportsArabic: true,
    classification: "serif",
  },
  {
    id: "mono",
    name: "LAMSA Mono",
    probe: "Space Mono",
    supportsArabic: false,
    classification: "mono",
  },
  {
    id: "script",
    name: "LAMSA Script",
    probe: "Pinyon Script",
    supportsArabic: false,
    classification: "script",
  },
] as const;

export function publishingFont(fontId: string | undefined): PublishingFont {
  return (
    PUBLISHING_FONTS.find((font) => font.id === fontId) ??
    PUBLISHING_FONTS[0]!
  );
}

/**
 * A font token is only a preference: the CSS stack is what the browser draws.
 * This reports whether the *preferred* face is available, so the inspector can
 * say "fallback" honestly instead of pretending the font loaded.
 */
export function fontAvailability(
  fontId: string | undefined,
  fonts: { check?: (font: string) => boolean } | undefined,
): "loaded" | "fallback" | "unknown" {
  if (!fonts?.check) return "unknown";
  try {
    return fonts.check(`16px "${publishingFont(fontId).probe}"`)
      ? "loaded"
      : "fallback";
  } catch {
    return "unknown";
  }
}

/* -------------------------------------------------------------------------- */
/* Resolved formatting                                                        */
/* -------------------------------------------------------------------------- */

export const DEFAULT_CHARACTER_FORMAT: Required<
  Omit<CharacterFormat, "color">
> & { color: string } = {
  fontId: "serif",
  size: 11,
  fontWeight: 400,
  fontStyle: "normal",
  color: "#171716",
  opacity: 1,
  tracking: 0,
  leading: 14,
  underline: false,
  strikethrough: false,
  baseline: "normal",
};

export interface ResolvedParagraphFormat {
  fontId: string;
  size: number;
  fontWeight: number;
  fontStyle: "normal" | "italic";
  color: string;
  leading: number;
  tracking: number;
  alignment: "left" | "center" | "right" | "justify";
  direction: TextDirection;
  spaceBefore: number;
  spaceAfter: number;
  firstLineIndent: number;
  leftIndent: number;
  rightIndent: number;
  hyphenate: boolean;
}

export interface ResolvedCharacterFormat {
  fontId: string;
  size: number;
  fontWeight: number;
  fontStyle: "normal" | "italic";
  color: string;
  opacity: number;
  tracking: number;
  leading: number;
  underline: boolean;
  strikethrough: boolean;
  baseline: "normal" | "super" | "sub";
}

export function paragraphStyleFor(
  document: PublicationDocument,
  paragraph: StoryParagraph,
): ParagraphStyle | undefined {
  const styles = document.styles.paragraph;
  return (
    styles.find((style) => style.id === paragraph.styleId) ??
    styles[0] ??
    undefined
  );
}

export function characterStyleFor(
  document: PublicationDocument,
  styleId: string | undefined,
): CharacterStyle | undefined {
  if (!styleId) return undefined;
  return document.styles.character.find((style) => style.id === styleId);
}

/**
 * Style + one-off paragraph override + document base. The result is what the
 * canvas actually draws; no optional fields leak into the renderer.
 */
export function resolveParagraph(
  document: PublicationDocument,
  paragraph: StoryParagraph,
): ResolvedParagraphFormat {
  const style = paragraphStyleFor(document, paragraph);
  const format = paragraph.format ?? {};
  return {
    fontId: format.fontId ?? style?.fontId ?? "serif",
    size: format.size ?? style?.size ?? 11,
    fontWeight: format.fontWeight ?? style?.fontWeight ?? 400,
    fontStyle: format.fontStyle ?? style?.fontStyle ?? "normal",
    color: format.color ?? style?.color ?? "#171716",
    leading:
      format.leading ??
      style?.leading ??
      Math.round((format.size ?? style?.size ?? 11) * 1.25),
    tracking: format.tracking ?? style?.tracking ?? 0,
    alignment: format.alignment ?? style?.alignment ?? "left",
    direction: format.direction ?? style?.direction ?? "auto",
    spaceBefore: format.spaceBefore ?? style?.spaceBefore ?? 0,
    spaceAfter: format.spaceAfter ?? style?.spaceAfter ?? 0,
    firstLineIndent: format.firstLineIndent ?? style?.firstLineIndent ?? 0,
    leftIndent: format.leftIndent ?? style?.leftIndent ?? 0,
    rightIndent: format.rightIndent ?? style?.rightIndent ?? 0,
    hyphenate: format.hyphenate ?? style?.hyphenate ?? false,
  };
}

/**
 * Character resolution order: run override → named character style →
 * paragraph formatting. A colour or weight omitted by a style never erases a
 * value set lower down.
 */
export function resolveCharacter(
  document: PublicationDocument,
  paragraph: StoryParagraph,
  run: TextRun,
): ResolvedCharacterFormat {
  const base = resolveParagraph(document, paragraph);
  const named = characterStyleFor(document, run.styleId);
  const format = run.format ?? {};
  return {
    fontId: format.fontId ?? named?.fontId ?? base.fontId,
    size: format.size ?? named?.size ?? base.size,
    fontWeight: format.fontWeight ?? named?.fontWeight ?? base.fontWeight,
    fontStyle: format.fontStyle ?? named?.fontStyle ?? base.fontStyle,
    color: format.color ?? named?.color ?? base.color,
    opacity: format.opacity ?? named?.opacity ?? 1,
    tracking: format.tracking ?? named?.tracking ?? base.tracking,
    leading: format.leading ?? named?.leading ?? base.leading,
    underline: format.underline ?? named?.underline ?? false,
    strikethrough: format.strikethrough ?? named?.strikethrough ?? false,
    baseline: format.baseline ?? named?.baseline ?? "normal",
  };
}

/** CSS `direction` for a paragraph: explicit choice, else the doc language. */
export function resolvedDirection(
  document: PublicationDocument,
  paragraph: StoryParagraph,
): "ltr" | "rtl" {
  const choice = resolveParagraph(document, paragraph).direction;
  if (choice === "ltr" || choice === "rtl") return choice;
  const language = (document.metadata.language || "").toLowerCase().split(/[-_]/)[0];
  return ["ar", "fa", "he", "ur", "ps", "sd", "ug"].includes(language ?? "")
    ? "rtl"
    : "ltr";
}

export function characterCss(
  format: ResolvedCharacterFormat,
): Record<string, string | number> {
  const css: Record<string, string | number> = {
    fontFamily: fontFamilyFor(format.fontId),
    fontSize: `${format.size}px`,
    fontWeight: format.fontWeight,
    fontStyle: format.fontStyle,
    color: format.color,
    letterSpacing: `${format.tracking / 1000}em`,
    opacity: format.opacity,
  };
  if (format.underline) css.textDecoration = "underline";
  if (format.strikethrough) {
    css.textDecoration =
      format.underline ? "underline line-through" : "line-through";
  }
  if (format.baseline === "super") {
    css.verticalAlign = "super";
    css.fontSize = `${format.size * 0.72}px`;
  }
  if (format.baseline === "sub") {
    css.verticalAlign = "sub";
    css.fontSize = `${format.size * 0.72}px`;
  }
  return css;
}

/* -------------------------------------------------------------------------- */
/* Editing stories                                                            */
/* -------------------------------------------------------------------------- */

export function forEachRun(
  story: Story,
  updater: (run: TextRun, paragraph: StoryParagraph) => TextRun,
): Story {
  return {
    ...story,
    paragraphs: story.paragraphs.map((paragraph) => ({
      ...paragraph,
      runs: paragraph.runs.map((run) => updater(run, paragraph)),
    })),
  };
}

/** Applies a character patch to every run, or only one paragraph. */
export function applyCharacterFormat(
  story: Story,
  patch: CharacterFormat,
  paragraphId?: string,
): Story {
  return {
    ...story,
    paragraphs: story.paragraphs.map((paragraph) => {
      if (paragraphId && paragraph.id !== paragraphId) return paragraph;
      return {
        ...paragraph,
        runs: paragraph.runs.map((run) => ({
          ...run,
          format: { ...run.format, ...patch },
        })),
      };
    }),
  };
}

export function applyParagraphFormat(
  story: Story,
  patch: ParagraphFormat,
  paragraphId?: string,
): Story {
  return {
    ...story,
    paragraphs: story.paragraphs.map((paragraph) => {
      if (paragraphId && paragraph.id !== paragraphId) return paragraph;
      return { ...paragraph, format: { ...paragraph.format, ...patch } };
    }),
  };
}

export function applyParagraphStyle(story: Story, styleId: string | undefined): Story {
  return {
    ...story,
    paragraphs: story.paragraphs.map((paragraph) => ({
      ...paragraph,
      ...(styleId ? { styleId } : { styleId: undefined }),
      // Named style replaces direct paragraph overrides; that is what applying
      // a style means.
      format: undefined,
    })),
  };
}

export function applyCharacterStyle(story: Story, styleId: string): Story {
  return forEachRun(story, (run) => ({ ...run, styleId, format: undefined }));
}

/* -------------------------------------------------------------------------- */
/* Range formatting                                                           */
/* -------------------------------------------------------------------------- */

export interface StoryOffset {
  paragraphIndex: number;
  offset: number;
}

/** Offsets count the plain-text newline between paragraphs, like a textarea. */
export function storyLength(story: Story): number {
  return (
    story.paragraphs.reduce(
      (total, paragraph) =>
        total + paragraph.runs.reduce((n, run) => n + run.text.length, 0),
      0,
    ) + Math.max(0, story.paragraphs.length - 1)
  );
}

export function offsetToParagraph(story: Story, offset: number): StoryOffset {
  let remaining = Math.max(0, offset);
  for (let index = 0; index < story.paragraphs.length; index += 1) {
    const length = story.paragraphs[index]!.runs.reduce((n, run) => n + run.text.length, 0);
    if (remaining <= length) return { paragraphIndex: index, offset: remaining };
    remaining -= length + 1;
  }
  const last = Math.max(0, story.paragraphs.length - 1);
  return {
    paragraphIndex: last,
    offset:
      story.paragraphs[last]?.runs.reduce((n, run) => n + run.text.length, 0) ?? 0,
  };
}

/**
 * Applies formatting to a plain-text selection. Paragraphs are split only
 * where a run boundary is crossed, so styling a word never restyles the rest
 * of the sentence.
 */
export function applyFormatToRange(
  story: Story,
  start: number,
  end: number,
  patch: CharacterFormat,
): Story {
  const from = Math.max(0, Math.min(start, end));
  const to = Math.max(start, end);
  if (to <= from) return story;
  let cursor = 0;
  return {
    ...story,
    paragraphs: story.paragraphs.map((paragraph) => {
      const paragraphStart = cursor;
      const length = paragraph.runs.reduce((n, run) => n + run.text.length, 0);
      cursor += length + 1;
      if (to <= paragraphStart || from >= paragraphStart + length) return paragraph;
      const runs: TextRun[] = [];
      let runCursor = paragraphStart;
      for (const run of paragraph.runs) {
        const runStart = runCursor;
        const runEnd = runCursor + run.text.length;
        runCursor = runEnd;
        const localFrom = Math.max(from, runStart) - runStart;
        const localTo = Math.min(to, runEnd) - runStart;
        if (localTo <= localFrom) {
          runs.push(run);
          continue;
        }
        const before = run.text.slice(0, localFrom);
        const selected = run.text.slice(localFrom, localTo);
        const after = run.text.slice(localTo);
        if (before) runs.push({ ...run, text: before });
        runs.push({
          ...run,
          text: selected,
          format: { ...run.format, ...patch },
        });
        if (after) runs.push({ ...run, text: after });
      }
      return { ...paragraph, runs };
    }),
  };
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                     */
/* -------------------------------------------------------------------------- */

export function createParagraphStyle(
  format: Partial<ParagraphStyle>,
  existing: readonly ParagraphStyle[],
  ids: IdFactory = defaultIds,
): ParagraphStyle {
  const base = existing[0];
  const name = uniqueStyleName(format.name || "Paragraph style", [
    ...existing.map((style) => style.name),
  ]);
  return {
    id: ids("style"),
    name,
    fontId: format.fontId ?? base?.fontId ?? "serif",
    size: format.size ?? base?.size ?? 11,
    leading: format.leading ?? base?.leading ?? 14,
    tracking: format.tracking ?? base?.tracking ?? 0,
    alignment: format.alignment ?? base?.alignment ?? "left",
    direction: format.direction ?? base?.direction ?? "auto",
    spaceBefore: format.spaceBefore ?? 0,
    spaceAfter: format.spaceAfter ?? 0,
    firstLineIndent: format.firstLineIndent ?? 0,
    leftIndent: format.leftIndent ?? 0,
    rightIndent: format.rightIndent ?? 0,
    fontWeight: format.fontWeight ?? base?.fontWeight ?? 400,
    fontStyle: format.fontStyle ?? base?.fontStyle ?? "normal",
    color: format.color ?? base?.color,
    hyphenate: format.hyphenate ?? false,
  };
}

export function createCharacterStyle(
  format: Partial<CharacterStyle>,
  existing: readonly CharacterStyle[],
  ids: IdFactory = defaultIds,
): CharacterStyle {
  return {
    ...format,
    id: ids("style"),
    name: uniqueStyleName(format.name || "Character style", [
      ...existing.map((style) => style.name),
    ]),
  };
}

export function uniqueStyleName(base: string, names: readonly string[]): string {
  const clean = base.trim().slice(0, 80) || "Untitled style";
  if (!names.includes(clean)) return clean;
  let index = 2;
  while (names.includes(`${clean} ${index}`)) index += 1;
  return `${clean} ${index}`;
}

export function renameStyle<T extends { name: string }>(style: T, name: string): T {
  const clean = name.trim().slice(0, 80);
  return clean ? { ...style, name: clean } : style;
}

export function duplicateParagraphStyle(
  style: ParagraphStyle,
  existing: readonly ParagraphStyle[],
  ids: IdFactory = defaultIds,
): ParagraphStyle {
  return {
    ...style,
    id: ids("style"),
    name: uniqueStyleName(`${style.name} copy`, existing.map((entry) => entry.name)),
  };
}

export function duplicateCharacterStyle(
  style: CharacterStyle,
  existing: readonly CharacterStyle[],
  ids: IdFactory = defaultIds,
): CharacterStyle {
  return {
    ...style,
    id: ids("style"),
    name: uniqueStyleName(`${style.name} copy`, existing.map((entry) => entry.name)),
  };
}

/** Removing a paragraph style leaves its text intact and clears references. */
export function removeParagraphStyle(
  styles: ParagraphStyle[],
  styleId: string,
  stories: readonly Story[],
): { styles: ParagraphStyle[]; stories: Story[] } {
  const remaining = styles.filter((style) => style.id !== styleId);
  const fallback = remaining[0]?.id;
  return {
    styles: remaining,
    stories: stories.map((story) => {
      if (!story.paragraphs.some((paragraph) => paragraph.styleId === styleId)) {
        return story;
      }
      return {
        ...story,
        paragraphs: story.paragraphs.map((paragraph) =>
          paragraph.styleId === styleId
            ? { ...paragraph, styleId: fallback }
            : paragraph,
        ),
      };
    }),
  };
}

/** Removing a character style drops the reference, never the text. */
export function removeCharacterStyle(
  styles: CharacterStyle[],
  styleId: string,
  stories: readonly Story[],
): { styles: CharacterStyle[]; stories: Story[] } {
  return {
    styles: styles.filter((style) => style.id !== styleId),
    stories: stories.map((story) => {
      const uses = story.paragraphs.some((paragraph) =>
        paragraph.runs.some((run) => run.styleId === styleId),
      );
      if (!uses) return story;
      return forEachRun(story, (run) => {
        if (run.styleId !== styleId) return run;
        const next = { ...run };
        delete next.styleId;
        return next;
      });
    }),
  };
}

/* -------------------------------------------------------------------------- */
/* Threading                                                                  */
/* -------------------------------------------------------------------------- */

export interface ThreadIssue {
  kind:
    | "missing-frame"
    | "missing-page"
    | "wrong-kind"
    | "duplicate"
    | "shared"
    | "circular";
  storyId: string;
  pageId?: string;
  objectId?: string;
  message: string;
}

export interface ThreadEntry {
  pageId: string;
  pageIndex: number;
  pageName: string;
  objectId: string;
  objectName: string;
  frame: TextFrameObject;
}

function textFramesOn(document: PublicationDocument): Array<{
  page: PublicationPage;
  pageIndex: number;
  frame: TextFrameObject;
}> {
  return document.pages.flatMap((page, pageIndex) =>
    page.objects
      .filter((object): object is TextFrameObject => object.kind === "text-frame")
      .map((frame) => ({ page, pageIndex, frame })),
  );
}

export function resolveThread(
  document: PublicationDocument,
  story: Story,
): ThreadEntry[] {
  const frames = new Map(
    textFramesOn(document).map((entry) => [entry.frame.id, entry]),
  );
  return story.frames.flatMap((ref) => {
    const entry = frames.get(ref.objectId);
    if (!entry || entry.page.id !== ref.pageId) return [];
    return [
      {
        pageId: entry.page.id,
        pageIndex: entry.pageIndex,
        pageName: entry.page.name,
        objectId: entry.frame.id,
        objectName: entry.frame.name || "Text frame",
        frame: entry.frame,
      },
    ];
  });
}

/**
 * Broken and circular relationships: missing pages/objects, non-text frames,
 * the same frame twice in one thread, and a frame claimed by two stories.
 * Circular links are exactly that last case at the object level; the thread
 * itself is a flat ordered list, so it cannot point back into itself.
 */
export function threadIssues(document: PublicationDocument): ThreadIssue[] {
  const issues: ThreadIssue[] = [];
  const owners = new Map<string, string>();
  const pages = new Map(document.pages.map((page) => [page.id, page]));
  for (const story of document.stories) {
    const seen = new Set<string>();
    for (const ref of story.frames) {
      const page = pages.get(ref.pageId);
      if (!page) {
        issues.push({
          kind: "missing-page",
          storyId: story.id,
          pageId: ref.pageId,
          objectId: ref.objectId,
          message: "A frame points at a page that no longer exists.",
        });
        continue;
      }
      const object = page.objects.find((entry) => entry.id === ref.objectId);
      if (!object) {
        issues.push({
          kind: "missing-frame",
          storyId: story.id,
          pageId: ref.pageId,
          objectId: ref.objectId,
          message: "A frame in this thread no longer exists.",
        });
        continue;
      }
      if (object.kind !== "text-frame") {
        issues.push({
          kind: "wrong-kind",
          storyId: story.id,
          pageId: ref.pageId,
          objectId: ref.objectId,
          message: "Only text frames can belong to a story.",
        });
        continue;
      }
      if (object.storyId && object.storyId !== story.id) {
        issues.push({
          kind: "circular",
          storyId: story.id,
          pageId: ref.pageId,
          objectId: ref.objectId,
          message:
            "The frame points at a different story while this story claims it — a circular link.",
        });
      }
      if (seen.has(object.id)) {
        issues.push({
          kind: "duplicate",
          storyId: story.id,
          pageId: ref.pageId,
          objectId: ref.objectId,
          message: "The same frame appears twice in this thread.",
        });
      }
      seen.add(object.id);
      const owner = owners.get(object.id);
      if (owner && owner !== story.id) {
        issues.push({
          kind: "shared",
          storyId: story.id,
          pageId: ref.pageId,
          objectId: ref.objectId,
          message: "This frame is already threaded to another story.",
        });
      }
      owners.set(object.id, story.id);
    }
  }
  return issues;
}

/**
 * Connects a frame at the end of a story. The returned document has both
 * sides updated (story refs and the frame's `storyId`), so saving either
 * record cannot leave a half-link behind.
 */
export function connectThread(
  document: PublicationDocument,
  storyId: string,
  pageId: string,
  objectId: string,
): { document: PublicationDocument; story: Story } {
  const story = document.stories.find((entry) => entry.id === storyId);
  if (!story) throw new Error("Story not found.");
  const page = document.pages.find((entry) => entry.id === pageId);
  if (!page) throw new Error("Page not found.");
  const object = page.objects.find((entry) => entry.id === objectId);
  if (!object || object.kind !== "text-frame") {
    throw new Error("Choose a text frame to connect.");
  }
  if (object.storyId && object.storyId !== storyId) {
    throw new Error("That frame already belongs to another story.");
  }
  if (story.frames.some((ref) => ref.objectId === objectId)) {
    throw new Error("That frame is already in this thread.");
  }
  const nextStory: Story = {
    ...story,
    frames: [...story.frames, { pageId, objectId }],
  };
  const nextDocument: PublicationDocument = {
    ...document,
    stories: document.stories.map((entry) =>
      entry.id === storyId ? nextStory : entry,
    ),
    pages: document.pages.map((entry) =>
      entry.id !== pageId
        ? entry
        : {
            ...entry,
            objects: entry.objects.map((candidate) =>
              candidate.id === objectId
                ? ({ ...candidate, storyId } as TextFrameObject)
                : candidate,
            ),
          },
    ),
  };
  return { document: nextDocument, story: nextStory };
}

/**
 * Removes one frame from a thread. The story and all of its text survive; the
 * frame keeps its geometry and simply stops showing that story.
 */
export function disconnectThread(
  document: PublicationDocument,
  storyId: string,
  objectId: string,
): { document: PublicationDocument; story: Story } {
  const story = document.stories.find((entry) => entry.id === storyId);
  if (!story) throw new Error("Story not found.");
  const nextStory: Story = {
    ...story,
    frames: story.frames.filter((ref) => ref.objectId !== objectId),
  };
  return {
    story: nextStory,
    document: {
      ...document,
      stories: document.stories.map((entry) =>
        entry.id === storyId ? nextStory : entry,
      ),
      pages: document.pages.map((page) => ({
        ...page,
        objects: page.objects.map((object) =>
          object.id === objectId && object.kind === "text-frame"
            ? ({ ...object, storyId: undefined } as TextFrameObject)
            : object,
        ),
      })),
    },
  };
}

export function reorderThread(
  story: Story,
  objectId: string,
  direction: -1 | 1,
): Story {
  const index = story.frames.findIndex((ref) => ref.objectId === objectId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= story.frames.length) return story;
  const frames = [...story.frames];
  const [entry] = frames.splice(index, 1);
  frames.splice(target, 0, entry!);
  return { ...story, frames };
}

/**
 * Moves a threaded frame to another page without touching its story, text,
 * geometry or order. The object keeps its id and layer when that layer exists
 * on the destination page, otherwise it joins the destination content layer.
 */
export function moveThreadFrame(
  document: PublicationDocument,
  storyId: string,
  objectId: string,
  toPageId: string,
): PublicationDocument {
  const story = document.stories.find((entry) => entry.id === storyId);
  if (!story) throw new Error("Story not found.");
  const ref = story.frames.find((frame) => frame.objectId === objectId);
  if (!ref) throw new Error("That frame is not in this story.");
  if (ref.pageId === toPageId) return document;
  const fromPage = document.pages.find((page) => page.id === ref.pageId);
  const toPage = document.pages.find((page) => page.id === toPageId);
  if (!fromPage || !toPage) throw new Error("Page not found.");
  const object = fromPage.objects.find((entry) => entry.id === objectId);
  if (!object || object.kind !== "text-frame") {
    throw new Error("Only a text frame can be moved between pages.");
  }
  const fallbackLayer =
    toPage.layers.find((layer) => layer.id === object.layerId) ??
    toPage.layers.find((layer) => layer.name === "Content") ??
    toPage.layers[toPage.layers.length - 1] ??
    toPage.layers[0];
  if (!fallbackLayer) throw new Error("The destination page has no layer.");
  const moved = { ...object, layerId: fallbackLayer.id } as TextFrameObject;
  return {
    ...document,
    stories: document.stories.map((entry) =>
      entry.id === storyId
        ? {
            ...entry,
            frames: entry.frames.map((frame) =>
              frame.objectId === objectId ? { ...frame, pageId: toPageId } : frame,
            ),
          }
        : entry,
    ),
    pages: document.pages.map((page) => {
      if (page.id === fromPage.id) {
        return {
          ...page,
          objects: page.objects.filter((entry) => entry.id !== objectId),
        };
      }
      if (page.id === toPage.id) {
        return { ...page, objects: [...page.objects, moved] };
      }
      return page;
    }),
  };
}

/* -------------------------------------------------------------------------- */
/* Overflow                                                                   */
/* -------------------------------------------------------------------------- */

export interface FrameCapacity {
  columns: number;
  columnWidth: number;
  lines: number;
  characters: number;
}

export interface OverflowEstimate {
  totalCharacters: number;
  capacity: number;
  hiddenCharacters: number;
  hiddenParagraphs: number;
  overflowing: boolean;
  /** Per-frame capacity in thread order. */
  frames: FrameCapacity[];
  /** Frame index whose capacity ends before the text does, if any. */
  overflowFrame: number | null;
}

function arabicRatio(text: string): number {
  const arabic = text.match(/[\u0600-\u06ff\u0750-\u077f]/g)?.length ?? 0;
  return text.length > 0 ? arabic / text.length : 0;
}

/**
 * Deterministic layout estimate shared by the inspector and the canvas badge.
 * It counts average glyph advance (Arabic is slightly wider in the fallback
 * naskh faces), line height and paragraph spacing. The browser still owns the
 * final shaping; this number is an estimate, labelled as such in the UI.
 */
export function estimateOverflow(
  document: PublicationDocument,
  story: Story | undefined,
  frames: readonly TextFrameObject[],
): OverflowEstimate {
  const capacities = frames.map((frame) => capacityOf(document, frame, story));
  const paragraphs = story?.paragraphs ?? [];
  let total = 0;
  for (const paragraph of paragraphs) total += paragraph.runs.reduce((n, run) => n + run.text.length, 0);
  if (total === 0) {
    return {
      totalCharacters: 0,
      capacity: capacities.reduce((n, frame) => n + frame.characters, 0),
      hiddenCharacters: 0,
      hiddenParagraphs: 0,
      overflowing: false,
      frames: capacities,
      overflowFrame: null,
    };
  }
  let remaining = total;
  let overflowFrame: number | null = null;
  for (let index = 0; index < capacities.length; index += 1) {
    remaining -= capacities[index]!.characters;
    if (remaining <= 0) break;
    overflowFrame = index;
  }
  const hiddenCharacters = Math.max(0, remaining);
  const hiddenParagraphs = hiddenCharacters > 0 ? Math.max(1, Math.ceil(hiddenCharacters / 80)) : 0;
  return {
    totalCharacters: total,
    capacity: capacities.reduce((n, frame) => n + frame.characters, 0),
    hiddenCharacters,
    hiddenParagraphs,
    overflowing: hiddenCharacters > 0 || frames.length === 0,
    frames: capacities,
    overflowFrame,
  };
}

export function capacityOf(
  document: PublicationDocument,
  frame: TextFrameObject,
  story?: Story,
): FrameCapacity {
  const paragraph = story?.paragraphs[0];
  const resolved = paragraph
    ? resolveParagraph(document, paragraph)
    : undefined;
  const size = resolved?.size ?? 11;
  const leading = Math.max(1, resolved?.leading ?? 14);
  const columns = Math.max(1, Math.trunc(frame.columns) || 1);
  const gutter = Math.max(0, frame.gutter);
  const innerWidth = Math.max(
    1,
    frame.frame.width - frame.inset.left - frame.inset.right - gutter * (columns - 1),
  );
  const columnWidth = innerWidth / columns;
  const innerHeight = Math.max(1, frame.frame.height - frame.inset.top - frame.inset.bottom);
  const lines = Math.max(0, Math.floor(innerHeight / leading));
  const sample = story ? story.paragraphs.map((p) => p.runs.map((r) => r.text).join("")).join("") : "";
  const ratio = arabicRatio(sample);
  const averageAdvance = size * (0.5 + ratio * 0.08);
  const charsPerLine = Math.max(1, Math.floor(columnWidth / Math.max(1, averageAdvance)));
  return {
    columns,
    columnWidth,
    lines,
    characters: Math.max(0, charsPerLine * lines * columns),
  };
}

/** A frame's own thread position, for the inspector's "3 of 5" readout. */
export function threadPosition(
  story: Story | undefined,
  objectId: string,
): { index: number; total: number } | null {
  if (!story) return null;
  const index = story.frames.findIndex((ref) => ref.objectId === objectId);
  return index >= 0 ? { index: index + 1, total: story.frames.length } : null;
}

export type { StoryFrameRef };
