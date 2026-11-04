import { describe, expect, it } from "vitest";
import {
  PUBLICATION_DOCUMENT_VERSION,
  PUBLICATION_OBJECT_VERSION,
  type PublicationDocument,
} from "./model";
import {
  createAssetRef,
  createDocument,
  createImageFrame,
  createLine,
  createMasterPage,
  createPage,
  createShape,
  createStory,
  createTextFrame,
} from "./factory";
import { createSequentialIds } from "./ids";
import { validatePublicationDocument } from "./validate";
import { pageSpec } from "./geometry";
import { PT_PER_MM } from "./units";

/**
 * A factory-built document must be complete and internally consistent on the
 * first try: spreads derived from pages, sides assigned, layers and a body
 * style present, and validation clean.
 */

const SPEC = pageSpec({ width: 400, height: 600 });

function errorsOf(document: PublicationDocument) {
  return validatePublicationDocument(document).filter((issue) => issue.severity === "error");
}

describe("createDocument", () => {
  it("builds a deterministic, valid album from its preset", () => {
    const document = createDocument({
      presetId: "album-12x12",
      pageCount: 5,
      ids: createSequentialIds(),
      now: 1_700_000_000_000,
    });

    expect(document.id).toBe("pub_1");
    expect(document.version).toBe(PUBLICATION_DOCUMENT_VERSION);
    expect(document.docType).toBe("album");
    expect(document.title).toBe("Untitled Album");
    expect(document.displayUnit).toBe("in");
    expect(document.spec.trim).toEqual({ width: 864, height: 864 });
    expect(document.facingPages).toBe(true);
    expect(document.metadata.createdAt).toBe(1_700_000_000_000);
    expect(errorsOf(document)).toEqual([]);
  });

  it("creates pages in order with their own layer stack", () => {
    const document = createDocument({
      presetId: "menu-a4",
      pageCount: 3,
      ids: createSequentialIds(),
      now: 1,
    });
    expect(document.pages.map((page) => page.id)).toEqual(["page_1", "page_2", "page_3"]);
    expect(document.pages.map((page) => page.name)).toEqual(["Page 1", "Page 2", "Page 3"]);
    expect(document.pages[0]!.layers.map((layer) => layer.name)).toEqual([
      "Background",
      "Content",
      "Notes",
    ]);
    expect(document.pages[0]!.objects).toEqual([]);
    expect(document.pages[0]!.hidden).toBe(false);
  });

  it("derives the spread plan and page sides", () => {
    const document = createDocument({
      presetId: "album-12x12",
      pageCount: 5,
      ids: createSequentialIds(),
      now: 1,
    });
    expect(document.spreads.map((spread) => spread.kind)).toEqual(["single", "facing", "facing"]);
    expect(document.spreads.map((spread) => spread.id)).toEqual([
      "spread_1",
      "spread_2",
      "spread_3",
    ]);
    expect(document.pages.map((page) => page.side)).toEqual([
      "right",
      "left",
      "right",
      "left",
      "right",
    ]);
  });

  it("gives every page its own spread in a non-facing document", () => {
    const document = createDocument({ presetId: "menu-a4", pageCount: 3, now: 1 });
    expect(document.spreads.map((spread) => spread.kind)).toEqual([
      "single",
      "single",
      "single",
    ]);
    expect(document.pages.every((page) => page.side === "single")).toBe(true);
  });

  it("honours display, facing and grid overrides", () => {
    const document = createDocument({
      presetId: "magazine-a4",
      facingPages: false,
      displayUnit: "pt",
      grid: { columns: 6 },
      now: 1,
    });
    expect(document.facingPages).toBe(false);
    expect(document.displayUnit).toBe("pt");
    expect(document.grid.columns).toBe(6);
    expect(document.grid.gutter).toBeGreaterThan(0);
    expect(document.pages[0]!.side).toBe("single");
  });

  it("resolves a preset by document category", () => {
    expect(createDocument({ docType: "book", now: 1 }).presetId).toBe("book-6x9");
    expect(createDocument({ docType: "catalogue", now: 1 }).presetId).toBe("catalogue-a4");
    expect(createDocument({ docType: "portfolio", now: 1 }).docType).toBe("portfolio");
  });

  it("falls back to the default preset for an unknown id", () => {
    expect(createDocument({ presetId: "does-not-exist", now: 1 }).presetId).toBe("album-12x12");
  });

  it("requires real dimensions for a custom document", () => {
    expect(() => createDocument({ presetId: "custom", now: 1 })).toThrow(RangeError);
    const document = createDocument({
      presetId: "custom",
      trim: { width: 300, height: 400 },
      pageCount: 2,
      now: 1,
    });
    expect(document.docType).toBe("custom");
    expect(document.spec.trim).toEqual({ width: 300, height: 400 });
    expect(errorsOf(document)).toEqual([]);
  });

  it("clamps the page count to a usable range", () => {
    expect(createDocument({ pageCount: 0, now: 1 }).pages).toHaveLength(1);
    expect(createDocument({ pageCount: -4, now: 1 }).pages).toHaveLength(1);
    expect(createDocument({ pageCount: 9_999, now: 1 }).pages).toHaveLength(512);
  });

  it("supports a title override and trims whitespace", () => {
    expect(createDocument({ title: "  Wedding 2027  ", now: 1 }).title).toBe("Wedding 2027");
    expect(createDocument({ title: "   ", now: 1 }).title).toBe("Untitled Album");
  });

  it("converts custom dimensions from the document unit only at the edge", () => {
    const document = createDocument({
      presetId: "custom",
      trim: { width: 210 * PT_PER_MM, height: 297 * PT_PER_MM },
      now: 1,
    });
    expect(document.spec.trim.width).toBeCloseTo(595.2755905511812, 9);
  });
});

describe("createPage", () => {
  it("creates an independent page with defaults", () => {
    const page = createPage(SPEC, { ids: createSequentialIds(), name: "Insert" });
    expect(page.name).toBe("Insert");
    expect(page.side).toBe("single");
    expect(page.spec.trim).toEqual(SPEC.trim);
    expect(page.layers).toHaveLength(3);
    expect(page.objects).toEqual([]);
  });

  it("does not share the spec object with the caller", () => {
    const page = createPage(SPEC);
    page.spec.margins.top = 99;
    expect(SPEC.margins.top).toBe(0);
  });
});

describe("object factories", () => {
  const ids = createSequentialIds();
  const base = { layerId: "layer_1", x: 10, y: 20, width: 100, height: 50, ids };

  it("creates a text frame with sane typography defaults", () => {
    const frame = createTextFrame({ ...base, name: "Body" });
    expect(frame).toMatchObject({
      id: "object_1",
      kind: "text-frame",
      version: PUBLICATION_OBJECT_VERSION,
      name: "Body",
      columns: 1,
      gutter: 0,
      verticalAlign: "top",
      overflow: "thread",
      opacity: 1,
    });
    expect(frame.frame).toEqual({ x: 10, y: 20, width: 100, height: 50, rotation: 0 });
  });

  it("creates an image frame with an identity crop", () => {
    const frame = createImageFrame({ ...base, assetId: "asset_1" });
    expect(frame).toMatchObject({
      kind: "image-frame",
      assetId: "asset_1",
      fit: "fill",
      mask: "rect",
      crop: { scale: 1, offsetX: 0, offsetY: 0 },
    });
  });

  it("creates shapes and lines with non-negative strokes", () => {
    const shape = createShape({ ...base, fill: "#000", strokeWidth: -2 });
    expect(shape).toMatchObject({ kind: "shape", shape: "rectangle", strokeWidth: 0 });
    const line = createLine({ ...base, strokeWidth: -1 });
    expect(line).toMatchObject({ kind: "line", strokeWidth: 0, cap: "butt" });
  });

  it("clamps text columns and gutters", () => {
    const frame = createTextFrame({ ...base, columns: 0, gutter: -5 });
    expect(frame.columns).toBe(1);
    expect(frame.gutter).toBe(0);
  });

  it("creates stories with paragraphs and frame references", () => {
    const story = createStory("Letter", {
      ids: createSequentialIds(),
      paragraphs: [
        {
          id: "paragraph_1",
          runs: [{ text: "Dear guest" }],
        },
      ],
      frames: [{ pageId: "page_1", objectId: "object_1" }],
    });
    expect(story.id).toBe("story_1");
    expect(story.overflow).toBe("thread");
    expect(story.paragraphs[0]!.runs[0]!.text).toBe("Dear guest");
    expect(story.frames).toHaveLength(1);
  });

  it("creates a master page with a default stack", () => {
    const master = createMasterPage("Running head", { ids: createSequentialIds() });
    expect(master.id).toBe("master_1");
    expect(master.appliesTo).toBe("both");
    expect(master.objects).toEqual([]);
    expect(master.layers).toHaveLength(3);
  });

  it("creates asset references with dimensions", () => {
    const asset = createAssetRef("Cover.jpg", {
      ids: createSequentialIds(),
      width: 4000,
      height: 3000,
      tags: ["cover"],
    });
    expect(asset.id).toBe("asset_1");
    expect(asset.width).toBe(4000);
    expect(asset.tags).toEqual(["cover"]);
  });
});
