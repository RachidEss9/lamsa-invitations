import { describe, expect, it } from "vitest";

import {
  createDocument,
  createParagraph,
  createStory,
  createTextFrame,
} from "./factory";
import type { PublicationDocument, Story } from "./model";
import type { IdFactory } from "./ids";
import {
  applyCharacterFormat,
  applyFormatToRange,
  applyParagraphFormat,
  connectThread,
  createCharacterStyle,
  createParagraphStyle,
  disconnectThread,
  duplicateParagraphStyle,
  estimateOverflow,
  moveThreadFrame,
  offsetToParagraph,
  removeCharacterStyle,
  removeParagraphStyle,
  renameStyle,
  reorderThread,
  resolveCharacter,
  resolveParagraph,
  resolvedDirection,
  storyLength,
  threadIssues,
} from "./typography";

let sequence = 0;
const ids: IdFactory = (prefix) => `${prefix}_test_${++sequence}`;

function fixture() {
  const document = createDocument({
    presetId: "custom",
    trim: { width: 400, height: 600 },
    pageCount: 2,
  });
  const first = document.pages[0]!;
  const second = document.pages[1]!;
  const frameA = createTextFrame({
    id: "frame_a",
    layerId: first.layers[1]!.id,
    x: 20,
    y: 20,
    width: 100,
    height: 50,
    storyId: "story_body",
    columns: 1,
    inset: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  const frameB = createTextFrame({
    id: "frame_b",
    layerId: second.layers[1]!.id,
    x: 20,
    y: 20,
    width: 100,
    height: 50,
  });
  const story = createStory("Body", {
    id: "story_body",
    paragraphs: [
      createParagraph("Hello world", { id: "p1" }),
      createParagraph("مرحبا بالعالم", { id: "p2" }),
    ],
    frames: [{ pageId: first.id, objectId: frameA.id }],
  });
  const withFrames: PublicationDocument = {
    ...document,
    metadata: { ...document.metadata, language: "ar" },
    pages: [
      { ...first, objects: [frameA] },
      { ...second, objects: [frameB] },
    ],
    stories: [story],
  };
  return { document: withFrames, story, frameA, frameB, first, second };
}

describe("character and paragraph resolution", () => {
  it("layers run overrides over named styles over paragraph styles", () => {
    const { document, story } = fixture();
    const body = document.styles.paragraph[0]!;
    const paragraph = {
      ...story.paragraphs[0]!,
      styleId: body.id,
      format: { alignment: "right" as const, direction: "rtl" as const },
    };
    const arabic = createParagraphStyle(
      { ...body, name: "Arabic body", fontId: "arabic", size: 14, leading: 22 },
      document.styles.paragraph,
      ids,
    );
    const doc = {
      ...document,
      styles: {
        ...document.styles,
        paragraph: [arabic],
        character: [{ id: "char_bold", name: "Bold", fontWeight: 700 }],
      },
    };
    const styled = { ...paragraph, styleId: arabic.id };
    const resolved = resolveParagraph(doc, styled);
    expect(resolved.fontId).toBe("arabic");
    expect(resolved.size).toBe(14);
    expect(resolved.leading).toBe(22);
    expect(resolved.alignment).toBe("right");
    expect(resolvedDirection(doc, styled)).toBe("rtl");

    const run = resolveCharacter(doc, styled, {
      text: "مرحبا",
      styleId: "char_bold",
      format: { color: "#8a1020", underline: true },
    });
    expect(run.fontWeight).toBe(700);
    expect(run.color).toBe("#8a1020");
    expect(run.underline).toBe(true);
    expect(run.size).toBe(14);
  });

  it("keeps auto direction tied to the document language without reversing text", () => {
    const { document, story } = fixture();
    const paragraph = story.paragraphs[1]!;
    expect(resolvedDirection(document, paragraph)).toBe("rtl");
    expect(resolvedDirection({ ...document, metadata: { ...document.metadata, language: "en-GB" } }, paragraph)).toBe("ltr");
    expect(paragraph.runs[0]!.text).toBe("مرحبا بالعالم");
  });

  it("applies character and paragraph patches without mutating the source", () => {
    const { story } = fixture();
    const bold = applyCharacterFormat(story, { fontWeight: 700 }, "p1");
    expect(bold.paragraphs[0]!.runs[0]!.format?.fontWeight).toBe(700);
    expect(bold.paragraphs[1]!.runs[0]!.format).toBeUndefined();
    expect(story.paragraphs[0]!.runs[0]!.format).toBeUndefined();

    const aligned = applyParagraphFormat(story, { alignment: "justify" }, "p2");
    expect(aligned.paragraphs[1]!.format?.alignment).toBe("justify");
    expect(aligned.paragraphs[0]!.format).toBeUndefined();
  });
});

describe("range formatting", () => {
  it("counts paragraph newlines and styles only the selected characters", () => {
    const { story } = fixture();
    expect(storyLength(story)).toBe("Hello world\nمرحبا بالعالم".length);
    expect(offsetToParagraph(story, 0)).toEqual({ paragraphIndex: 0, offset: 0 });
    expect(offsetToParagraph(story, 11)).toEqual({ paragraphIndex: 0, offset: 11 });
    expect(offsetToParagraph(story, 12)).toEqual({ paragraphIndex: 1, offset: 0 });

    const formatted = applyFormatToRange(story, 6, 11, {
      fontWeight: 700,
      underline: true,
    });
    expect(formatted.paragraphs[0]!.runs.map((run) => run.text)).toEqual([
      "Hello ",
      "world",
    ]);
    expect(formatted.paragraphs[0]!.runs[1]!.format).toMatchObject({
      fontWeight: 700,
      underline: true,
    });
    expect(formatted.paragraphs[0]!.runs[0]!.format).toBeUndefined();
    expect(formatted.paragraphs[1]).toBe(story.paragraphs[1]);
  });

  it("does not rewrite a paragraph when the range misses it", () => {
    const { story } = fixture();
    expect(applyFormatToRange(story, 0, 5, { fontStyle: "italic" })).not.toBe(story);
    expect(applyFormatToRange(story, 0, 0, { fontStyle: "italic" })).toBe(story);
  });
});

describe("reusable styles", () => {
  it("creates and renames unique style names", () => {
    const { document } = fixture();
    const first = createParagraphStyle(
      { ...document.styles.paragraph[0]!, name: "Body" },
      document.styles.paragraph,
      ids,
    );
    expect(first.name).toBe("Body 2");
    const renamed = renameStyle(first, "  Caption  ");
    expect(renamed.name).toBe("Caption");
    expect(renameStyle(first, "   ")).toBe(first);
  });

  it("duplicates with a distinct id and name", () => {
    const { document } = fixture();
    const source = document.styles.paragraph[0]!;
    const copy = duplicateParagraphStyle(source, [source], ids);
    expect(copy.id).not.toBe(source.id);
    expect(copy.name).toBe("Body copy");
    expect(copy.size).toBe(source.size);
  });

  it("deletes paragraph styles by moving references to a safe fallback", () => {
    const { document, story } = fixture();
    const body = document.styles.paragraph[0]!;
    const caption = createParagraphStyle(
      { ...body, name: "Caption" },
      document.styles.paragraph,
      ids,
    );
    const used = {
      ...story,
      paragraphs: story.paragraphs.map((paragraph) => ({
        ...paragraph,
        styleId: caption.id,
      })),
    };
    const result = removeParagraphStyle(
      [body, caption],
      caption.id,
      [used],
    );
    expect(result.styles.map((style) => style.id)).toEqual([body.id]);
    expect(result.stories[0]!.paragraphs[0]!.styleId).toBe(body.id);
    expect(result.stories[0]!.paragraphs[0]!.runs[0]!.text).toBe("Hello world");
  });

  it("deletes character styles without losing text or other formatting", () => {
    const { document, story } = fixture();
    const emphasis = createCharacterStyle(
      { name: "Emphasis", fontWeight: 700 },
      document.styles.character,
      ids,
    );
    const used = {
      ...story,
      paragraphs: story.paragraphs.map((paragraph) => ({
        ...paragraph,
        runs: paragraph.runs.map((run) => ({
          ...run,
          styleId: emphasis.id,
          format: { color: "#111111" },
        })),
      })),
    };
    const result = removeCharacterStyle([emphasis], emphasis.id, [used]);
    expect(result.styles).toEqual([]);
    const run = result.stories[0]!.paragraphs[0]!.runs[0]!;
    expect(run.styleId).toBeUndefined();
    expect(run.text).toBe("Hello world");
    expect(run.format?.color).toBe("#111111");
  });
});

describe("story threading", () => {
  it("connects a frame on another page in both directions", () => {
    const { document } = fixture();
    const result = connectThread(document, "story_body", document.pages[1]!.id, "frame_b");
    expect(result.story.frames).toHaveLength(2);
    const pageB = result.document.pages[1]!;
    expect(pageB.objects[0]!.kind === "text-frame" && pageB.objects[0]!.storyId).toBe(
      "story_body",
    );
  });

  it("refuses a frame already owned by another story", () => {
    const { document, frameB, second } = fixture();
    const claimed = {
      ...document,
      pages: document.pages.map((page) =>
        page.id === second.id
          ? { ...page, objects: [{ ...frameB, storyId: "other_story" }] }
          : page,
      ),
    };
    expect(() =>
      connectThread(claimed, "story_body", second.id, frameB.id),
    ).toThrow(/another story/i);
  });

  it("reorders a thread without paying attention to page order", () => {
    const { document, story } = fixture();
    const connected = connectThread(document, story.id, document.pages[1]!.id, "frame_b")
      .story;
    const reordered = reorderThread(connected, "frame_b", -1);
    expect(reordered.frames.map((frame) => frame.objectId)).toEqual([
      "frame_b",
      "frame_a",
    ]);
    expect(reorderThread(reordered, "frame_b", -1)).toBe(reordered);
  });

  it("removes a frame but keeps every character of the story", () => {
    const { document } = fixture();
    const result = disconnectThread(document, "story_body", "frame_a");
    expect(result.story.frames).toEqual([]);
    expect(result.story.paragraphs[0]!.runs[0]!.text).toBe("Hello world");
    expect(result.story.paragraphs[1]!.runs[0]!.text).toBe("مرحبا بالعالم");
    const page = result.document.pages[0]!;
    expect(page.objects).toHaveLength(1);
    expect(page.objects[0]!.kind === "text-frame" && page.objects[0]!.storyId).toBeUndefined();
  });

  it("moves a frame to another page without changing its geometry or order", () => {
    const { document, story } = fixture();
    const moved = moveThreadFrame(document, story.id, "frame_a", document.pages[1]!.id);
    expect(moved.stories[0]!.frames[0]!.pageId).toBe(document.pages[1]!.id);
    expect(moved.pages[0]!.objects).toHaveLength(0);
    const object = moved.pages[1]!.objects.find((entry) => entry.id === "frame_a")!;
    expect(object.frame).toEqual(story.frames[0] ? document.pages[0]!.objects[0]!.frame : object.frame);
    expect(object.kind === "text-frame" && object.storyId).toBe("story_body");
  });

  it("detects missing, shared, duplicate and circular links", () => {
    const { document, story, second, frameB } = fixture();
    const broken: Story = {
      ...story,
      frames: [
        ...story.frames,
        { pageId: second.id, objectId: frameB.id },
        { pageId: "missing_page", objectId: "missing_frame" },
      ],
    };
    const secondStory = createStory("Repeat", {
      id: "story_two",
      frames: [{ pageId: document.pages[0]!.id, objectId: "frame_a" }],
    });
    const doc: PublicationDocument = {
      ...document,
      stories: [broken, secondStory],
      pages: document.pages.map((page) =>
        page.id === second.id
          ? {
              ...page,
              objects: [
                { ...frameB, storyId: "story_two" },
                { ...frameB, id: "frame_c" },
              ],
            }
          : page,
      ),
    };
    const issues = threadIssues(doc);
    expect(issues.some((issue) => issue.kind === "missing-page")).toBe(true);
    expect(issues.some((issue) => issue.kind === "shared")).toBe(true);
    expect(issues.some((issue) => issue.kind === "circular")).toBe(true);

    const duplicate = threadIssues({
      ...doc,
      stories: [
        {
          ...story,
          frames: [
            { pageId: document.pages[0]!.id, objectId: "frame_a" },
            { pageId: document.pages[0]!.id, objectId: "frame_a" },
          ],
        },
      ],
    });
    expect(duplicate.some((issue) => issue.kind === "duplicate")).toBe(true);
  });
});

describe("overflow and columns", () => {
  const text = "x".repeat(150);

  it("estimates the characters left over in a single-column frame", () => {
    const { document, frameA } = fixture();
    const story = createStory("Overflow", {
      paragraphs: [createParagraph(text, { id: "p" })],
      frames: [{ pageId: document.pages[0]!.id, objectId: frameA.id }],
    });
    const estimate = estimateOverflow(document, story, [frameA]);
    expect(estimate.totalCharacters).toBe(150);
    expect(estimate.frames[0]!.characters).toBe(54);
    expect(estimate.hiddenCharacters).toBe(96);
    expect(estimate.overflowing).toBe(true);
    expect(estimate.overflowFrame).toBe(0);
    expect(estimate.hiddenParagraphs).toBeGreaterThanOrEqual(1);
  });

  it("splits capacity across columns and removes the gutter", () => {
    const { document, frameA } = fixture();
    const columnFrame = { ...frameA, columns: 2, gutter: 10 };
    const story = createStory("Overflow", {
      paragraphs: [createParagraph(text, { id: "p" })],
      frames: [{ pageId: document.pages[0]!.id, objectId: frameA.id }],
    });
    const estimate = estimateOverflow(document, story, [columnFrame]);
    expect(estimate.frames[0]!.columns).toBe(2);
    expect(estimate.frames[0]!.columnWidth).toBe(45);
    expect(estimate.frames[0]!.characters).toBe(48);
    expect(estimate.frames[0]!.characters).toBeLessThan(54);
  });

  it("responds to frame resizing and insets", () => {
    const { document, frameA } = fixture();
    const story = createStory("Resize", {
      paragraphs: [createParagraph(text, { id: "p" })],
      frames: [{ pageId: document.pages[0]!.id, objectId: frameA.id }],
    });
    const small = estimateOverflow(document, story, [frameA]);
    const tall = estimateOverflow(document, story, [{ ...frameA, frame: { ...frameA.frame, height: 500 } }]);
    const inset = estimateOverflow(document, story, [
      { ...frameA, inset: { top: 20, right: 20, bottom: 20, left: 20 } },
    ]);
    expect(tall.frames[0]!.characters).toBeGreaterThan(small.frames[0]!.characters);
    expect(tall.overflowing).toBe(false);
    expect(inset.frames[0]!.characters).toBeLessThan(small.frames[0]!.characters);
  });

  it("reports an empty story as fitting without inventing overflow", () => {
    const { document, frameA } = fixture();
    const story = createStory("Empty", { frames: [{ pageId: document.pages[0]!.id, objectId: frameA.id }] });
    const estimate = estimateOverflow(document, story, [frameA]);
    expect(estimate.totalCharacters).toBe(0);
    expect(estimate.overflowing).toBe(false);
    expect(estimate.overflowFrame).toBeNull();
  });
});
