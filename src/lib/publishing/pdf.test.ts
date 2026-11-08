import { describe, expect, it } from "vitest";
import { PDFDocument, PDFName } from "pdf-lib";

import {
  createDocument,
  createImageFrame,
  createParagraph,
  createShape,
  createStory,
  createTextFrame,
} from "./factory";
import { createSequentialIds } from "./ids";
import type {
  PublicationDocument,
  PublicationPage,
  TextFrameObject,
} from "./model";
import {
  cropMarkSegments,
  defaultExportSettings,
  encodable,
  exportPublicationPdf,
  exportPageSize,
  parseCssColor,
  textFrameNeedsRaster,
} from "./pdf";

const ids = createSequentialIds(6000);

function fixture(): PublicationDocument {
  const document = createDocument({ title: "Export", pageCount: 2, ids });
  const story = createStory("Body", {
    paragraphs: [createParagraph("LAMSA proof")],
    ids,
  });
  return {
    ...document,
    stories: [story],
    pages: document.pages.map((page, index) =>
      index === 0
        ? {
            ...page,
            objects: [
              createShape({
                name: "Panel",
                layerId: layer(page),
                x: 40,
                y: 40,
                width: 200,
                height: 160,
                fill: "#d9d2c3",
                strokeWidth: 0,
              }),
              createTextFrame({
                name: "Body",
                layerId: layer(page),
                x: 48,
                y: 220,
                width: 300,
                height: 120,
                storyId: story.id,
              }),
              createImageFrame({
                name: "Photo",
                layerId: layer(page),
                x: 300,
                y: 40,
                width: 160,
                height: 160,
                assetId: "asset_missing",
              }),
            ],
          }
        : page,
    ),
  };
}

function layer(page: PublicationPage): string {
  return page.layers[page.layers.length - 1]!.id;
}

describe("PDF export", () => {
  it("writes a real PDF with the right page count, dimensions and order", async () => {
    const document = fixture();
    const result = await exportPublicationPdf(document, {
      settings: defaultExportSettings("print"),
      loadAsset: async () => null,
    });

    expect(new TextDecoder().decode(result.bytes.slice(0, 5))).toBe("%PDF-");
    expect(result.pages).toHaveLength(2);
    const loaded = await PDFDocument.load(result.bytes);
    expect(loaded.getPageCount()).toBe(2);
    const first = loaded.getPage(0);
    expect(Math.round(first.getWidth())).toBe(Math.round(document.pages[0]!.spec.trim.width));
    expect(Math.round(first.getHeight())).toBe(Math.round(document.pages[1]!.spec.trim.height));
    expect(result.pages.map((page) => page.pageId)).toEqual(
      document.pages.map((page) => page.id),
    );
  });

  it("honours a selected page range and keeps the requested order", async () => {
    const document = fixture();
    const reversed = [...document.pages].reverse().map((page) => page.id);
    const result = await exportPublicationPdf(document, {
      settings: { ...defaultExportSettings("digital"), pageIds: reversed.slice(0, 1) },
      loadAsset: async () => null,
    });
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0]!.pageId).toBe(reversed[0]);
  });

  it("keeps Latin text selectable and reports non-Latin text instead of faking it", async () => {
    const document = fixture();
    const result = await exportPublicationPdf(document, {
      settings: defaultExportSettings("print"),
      loadAsset: async () => null,
    });
    expect(result.stats.textFrames).toBe(1);
    expect(result.skippedTextFrames).toHaveLength(0);

    const arabic = createStory("Arabic", {
      paragraphs: [createParagraph("مرحبا")],
      ids,
    });
    const withArabic: PublicationDocument = {
      ...document,
      stories: [arabic],
      pages: document.pages.map((page, index) =>
        index === 0
          ? {
              ...page,
              objects: [
                createTextFrame({
                  name: "Arabic",
                  layerId: layer(page),
                  x: 40,
                  y: 40,
                  width: 300,
                  height: 120,
                  storyId: arabic.id,
                }),
              ],
            }
          : page,
      ),
    };
    const arabicResult = await exportPublicationPdf(withArabic, {
      settings: defaultExportSettings("print"),
      loadAsset: async () => null,
    });
    // The writer reports the frame it skipped, so the UI can point at it.
    expect(arabicResult.skippedTextFrames).toHaveLength(1);
    expect(arabicResult.skippedTextFrames[0]).toMatch(/^object_/);
    expect(arabicResult.warnings.some((warning) => /cannot be embedded/i.test(warning))).toBe(
      true,
    );
  });

  it("preserves non-Latin frames as positioned images when a rasteriser is supplied", async () => {
    const document = fixture();
    const arabic = createStory("Arabic", {
      paragraphs: [createParagraph("مرحبا بالعالم")],
      ids,
    });
    const frame = createTextFrame({
      name: "Arabic",
      layerId: layer(document.pages[0]!),
      x: 40,
      y: 40,
      width: 300,
      height: 120,
      storyId: arabic.id,
    });
    const withArabic: PublicationDocument = {
      ...document,
      stories: [arabic],
      pages: document.pages.map((page, index) =>
        index === 0 ? { ...page, objects: [frame] } : page,
      ),
    };
    expect(textFrameNeedsRaster(withArabic, frame)).toBe(true);
    const latinFrame = document.pages[0]!.objects!.find(
      (object) => object.kind === "text-frame",
    ) as TextFrameObject;
    expect(textFrameNeedsRaster(document, latinFrame)).toBe(false);

    const png = Uint8Array.from(
      atob(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      ),
      (character) => character.charCodeAt(0),
    );
    let calls = 0;
    const result = await exportPublicationPdf(withArabic, {
      settings: defaultExportSettings("print"),
      loadAsset: async () => null,
      rasterTextFrame: async () => {
        calls += 1;
        return png;
      },
    });
    expect(calls).toBe(1);
    expect(result.skippedTextFrames).toHaveLength(0);
    expect(result.rasterizedTextFrames).toEqual([frame.id]);
    expect(result.stats.rasterTextFrames).toBe(1);
    expect(result.warnings.some((warning) => /not selectable/i.test(warning))).toBe(true);

    const pdf = await PDFDocument.load(result.bytes);
    expect(pdf.getPageCount()).toBe(2);
    expect(pdf.getPage(0).node.Resources()?.lookup(PDFName.of("XObject"))).toBeDefined();
  });

  it("adds bleed to the media box and draws crop marks only when asked", async () => {
    const document = fixture();
    const plain = await exportPublicationPdf(document, {
      settings: { ...defaultExportSettings("print"), cropMarks: false, includeBleed: false },
      loadAsset: async () => null,
    });
    const bleed = await exportPublicationPdf(document, {
      settings: { ...defaultExportSettings("print-bleed"), cropMarks: true, includeBleed: true },
      loadAsset: async () => null,
    });
    const plainPdf = await PDFDocument.load(plain.bytes);
    const bleedPdf = await PDFDocument.load(bleed.bytes);
    expect(bleedPdf.getPage(0).getWidth()).toBeGreaterThan(plainPdf.getPage(0).getWidth());
    expect(bleed.bytes.length).toBeGreaterThan(plain.bytes.length);
    expect(
      cropMarkSegments(
        { width: 200, height: 200 },
        { x: 20, y: 20, width: 160, height: 160 },
        12,
        4,
      ).length,
    ).toBeGreaterThan(0);
  });

  it("reports a missing photograph instead of writing a blank placeholder silently", async () => {
    const document = fixture();
    const result = await exportPublicationPdf(document, {
      settings: defaultExportSettings("print"),
      loadAsset: async () => null,
    });
    expect(result.missingImages.length).toBe(1);
    expect(result.warnings.some((warning) => /photo|image/i.test(warning))).toBe(true);
  });

  it("embeds supplied image bytes and counts the image", async () => {
    const document = fixture();
    // 1×1 transparent PNG.
    const png = Uint8Array.from(
      atob(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      ),
      (char) => char.charCodeAt(0),
    );
    const result = await exportPublicationPdf(document, {
      settings: defaultExportSettings("print"),
      loadAsset: async () => ({ bytes: png, mime: "image/png" }),
    });
    expect(result.missingImages).toHaveLength(0);
    expect(result.stats.images).toBe(1);
  });

  it("parses the colour formats the model stores", () => {
    const red = parseCssColor("#710014");
    expect(red.red).toBeCloseTo(113 / 255, 4);
    expect(red.green).toBeCloseTo(0, 4);
    expect(red.blue).toBeCloseTo(20 / 255, 4);
    expect(parseCssColor("transparent").red).toBe(1);
    expect(parseCssColor(undefined).red).toBe(0);
    expect(encodable("LAMSA")).toBe(true);
    expect(encodable("مرحبا")).toBe(false);
  });

  it("computes the media size from the page spec", () => {
    const document = fixture();
    const size = exportPageSize(document.pages[0]!, {
      ...defaultExportSettings("print"),
      includeBleed: true,
    });
    expect(size.width).toBeCloseTo(
      document.pages[0]!.spec.trim.width + document.pages[0]!.spec.bleed * 2,
      5,
    );
  });
});
