import { describe, expect, it } from "vitest";
import {
  createDocument,
  createPage,
  createParagraph,
  createStory,
  createTextFrame,
  type PublicationDocument,
} from "./factory";
import {
  fontFamilyFor,
  frameThreadLength,
  imagePreserveAspectRatio,
  objectBounds,
  objectKindLabel,
  objectTitle,
  pageLabel,
  paragraphsFromText,
  polygonPoints,
  storyForFrame,
  storyText,
  textDirection,
  textFramePreview,
} from "./render";

/**
 * Rendering resolves document data into render facts. The tests cover what
 * the canvas, thumbnails and inspector all rely on: font stacks with Arabic
 * support, paragraph identity preservation, SVG shapes and kind labels.
 */

function documentWithStory(): PublicationDocument {
  const document = createDocument({
    presetId: "custom",
    trim: { width: 400, height: 600 },
    pageCount: 1,
  });
  const page = document.pages[0]!;
  const layer = page.layers[1]!;
  const frame = createTextFrame({
    layerId: layer.id,
    x: 0,
    y: 0,
    width: 100,
    height: 50,
    id: "object_text",
    storyId: "story_body",
  });
  const story = createStory("Body", {
    id: "story_body",
    paragraphs: [
      { id: "para_1", runs: [{ text: "مرحبا بالعالم" }] },
      { id: "para_2", runs: [{ text: "Second line" }] },
    ],
    frames: [{ pageId: page.id, objectId: "object_text" }],
  });
  return {
    ...document,
    stories: [story],
    pages: [{ ...page, objects: [frame] }],
  };
}

describe("typography", () => {
  it("resolves font tokens to interface stacks with Arabic fallbacks", () => {
    expect(fontFamilyFor("serif")).toContain("var(--font-display");
    expect(fontFamilyFor("sans")).toContain("var(--font-ui");
    expect(fontFamilyFor("arabic")).toContain("--font-arabic");
    // An unknown id passes through (a CSS stack carried in the id itself).
    expect(fontFamilyFor('"Bodoni Moda", serif')).toBe('"Bodoni Moda", serif');
    expect(fontFamilyFor(undefined)).toBeTruthy();
  });

  it("marks RTL languages and leaves the rest to the browser", () => {
    expect(textDirection("ar")).toBe("rtl");
    expect(textDirection("fa-IR")).toBe("rtl");
    expect(textDirection("he")).toBe("rtl");
    expect(textDirection("en")).toBe("auto");
    expect(textDirection(undefined)).toBe("auto");
  });

  it("rebuilds paragraphs from edited text without invalidating stable ids", () => {
    const existing = [
      { id: "para_a", runs: [{ text: "Hello" }] },
      { id: "para_b", runs: [{ text: "World" }] },
    ];
    const rebuilt = paragraphsFromText("Hello\nWorld", existing);
    expect(rebuilt[0]!.id).toBe("para_a");
    expect(rebuilt[1]!.id).toBe("para_b");
    expect(rebuilt[0]).toBe(existing[0]);

    // Editing one paragraph only rebuilds that one.
    const edited = paragraphsFromText("Hello\nThere", existing);
    expect(edited[0]).toBe(existing[0]);
    expect(edited[1]!.id).toBe("para_b");
    expect(edited[1]!.runs[0]!.text).toBe("There");

    // New lines grow the set with fresh ids.
    const grown = paragraphsFromText("Hello\nWorld\nExtra", existing);
    expect(grown).toHaveLength(3);
    expect(grown[2]!.id).not.toBe(existing[0]!.id);
    expect(grown[2]!.runs[0]!.text).toBe("Extra");
  });
});

describe("stories", () => {
  it("reads plain text with one line per paragraph", () => {
    expect(storyText(documentWithStory().stories[0])).toBe("مرحبا بالعالم\nSecond line");
    expect(storyText(undefined)).toBe("");
  });

  it("connects frames to their stories in both directions", () => {
    const document = documentWithStory();
    const object = document.pages[0]!.objects[0]!;
    expect(storyForFrame(document, object)!.id).toBe("story_body");
    expect(frameThreadLength(document, object)).toBe(1);
  });

  it("previews frame text without inventing content", () => {
    const document = documentWithStory();
    const object = document.pages[0]!.objects[0]!;
    expect(textFramePreview(document, object)).toBe("مرحبا بالعالم\nSecond line");
    expect(textFramePreview(document, { ...object, storyId: undefined })).toBe("");
  });
});

describe("shapes", () => {
  it("computes polygon points starting at the top", () => {
    const points = polygonPoints({ x: 0, y: 0, width: 100, height: 100 }, 4);
    expect(points.split(" ")[0]).toBe("50,0");
    expect(points.split(" ")).toHaveLength(4);
    expect(polygonPoints({ x: 0, y: 0, width: 100, height: 50 }, 3).split(" ")).toHaveLength(3);
    // Fewer than three sides is forced to a triangle.
    expect(polygonPoints({ x: 0, y: 0, width: 10, height: 10 }, 2).split(" ")).toHaveLength(3);
  });
});

describe("images", () => {
  it("maps fit modes to preserveAspectRatio values", () => {
    expect(imagePreserveAspectRatio("fill")).toBe("xMidYMid slice");
    expect(imagePreserveAspectRatio("fit")).toBe("xMidYMid meet");
    expect(imagePreserveAspectRatio("stretch")).toBe("none");
  });
});

describe("labels and bounds", () => {
  it("labels every phase-1 kind, unsupported kinds included", () => {
    expect(objectKindLabel({ kind: "text-frame" } as never)).toBe("Text");
    expect(objectKindLabel({ kind: "image-frame" } as never)).toBe("Image");
    expect(objectKindLabel({ kind: "shape" } as never)).toBe("Shape");
    expect(objectKindLabel({ kind: "line" } as never)).toBe("Line");
    expect(
      objectKindLabel({ kind: "generic", originalKind: "chart" } as never),
    ).toBe("Unsupported · chart");
  });

  it("titles objects by name with a kind fallback", () => {
    expect(objectTitle({ name: "", kind: "shape" } as never)).toBe("Shape");
  });

  it("labels pages by name or position", () => {
    const page = createPage({
      trim: { width: 400, height: 600 },
      bleed: 0,
      margins: { top: 36, right: 36, bottom: 36, left: 36 },
      mirrorMargins: false,
    });
    expect(pageLabel({ ...page, name: "" }, 0)).toBe("Page 1");
    expect(pageLabel(page, 3)).toBe("Page 4");
  });

  it("measures rotated frames as their containing box in points", () => {
    const bounds = objectBounds({
      frame: { x: 5, y: 6, width: 70, height: 80, rotation: 45 },
    } as never);
    expect(bounds.width).toBeGreaterThan(70);
    expect(bounds.height).toBeGreaterThan(80);
  });
});

describe("paragraph factory", () => {
  it("wraps a run for new stories", () => {
    const paragraph = createParagraph("Hello");
    expect(paragraph.runs[0]!.text).toBe("Hello");
  });
});
