import { describe, expect, it } from "vitest";
import type { PublicationDocument } from "./model";
import { createDocument } from "./factory";
import {
  emptyPublicationDocument,
  normalizePublicationDocument,
} from "./normalize";
import { createSequentialIds } from "./ids";
import { validatePublicationDocument } from "./validate";

/**
 * Normalisation is the compatibility boundary: incomplete drafts load, newer
 * object kinds survive intact, and derived structures (spreads, sides, story
 * threads) are rebuilt instead of trusted.
 */

function clone(document: PublicationDocument): Record<string, unknown> {
  return JSON.parse(JSON.stringify(document)) as Record<string, unknown>;
}

function errorsOf(document: unknown) {
  return validatePublicationDocument(document).filter((issue) => issue.severity === "error");
}

const BASE = createDocument({
  presetId: "album-12x12",
  pageCount: 4,
  ids: createSequentialIds(),
  now: 1000,
});

describe("normalizePublicationDocument", () => {
  it("fills in an empty input with a usable custom document", () => {
    const document = normalizePublicationDocument({}, { now: 500 });
    expect(document.version).toBe(1);
    expect(document.docType).toBe("custom");
    expect(document.pages).toHaveLength(1);
    expect(document.spreads).toHaveLength(1);
    expect(document.pages[0]!.side).toBe("single");
    expect(document.styles.paragraph.length).toBeGreaterThan(0);
    expect(document.metadata.createdAt).toBe(500);
    expect(errorsOf(document)).toEqual([]);
  });

  it("keeps the identity and derived structure of a saved document", () => {
    const normalized = normalizePublicationDocument(BASE, { now: 2000 });
    expect(normalized.id).toBe(BASE.id);
    expect(normalized.title).toBe(BASE.title);
    expect(normalized.pages.map((page) => page.id)).toEqual(BASE.pages.map((page) => page.id));
    expect(normalized.spreads.map((spread) => spread.id)).toEqual(
      BASE.spreads.map((spread) => spread.id),
    );
    expect(normalized.spreads.map((spread) => spread.pageIds)).toEqual(
      BASE.spreads.map((spread) => spread.pageIds),
    );
  });

  it("keeps a saved id and never rewrites a safe one", () => {
    const document = normalizePublicationDocument({ id: "pub_custom_1", pages: [] });
    expect(document.id).toBe("pub_custom_1");
  });

  it("rebuilds a spread plan that disagrees with the page order", () => {
    const raw = clone(BASE);
    raw.spreads = [
      { id: "spread_bad", index: 0, kind: "facing", pageIds: ["page_missing"], gutter: 0 },
    ];
    const normalized = normalizePublicationDocument(raw);
    expect(normalized.spreads.map((spread) => spread.pageIds)).toEqual([
      [BASE.pages[0]!.id],
      [BASE.pages[1]!.id, BASE.pages[2]!.id],
      [BASE.pages[3]!.id],
    ]);
    expect(normalized.spreads.some((spread) => spread.id === "spread_bad")).toBe(false);
  });

  it("keeps the saved spread gutter when rebuilding the plan", () => {
    const raw = clone(BASE);
    const spreads = raw.spreads as Record<string, unknown>[];
    spreads[1]!.gutter = 24;
    const normalized = normalizePublicationDocument(raw);
    const facing = normalized.spreads.find((spread) => spread.kind === "facing");
    expect(facing?.gutter).toBe(24);
  });

  it("preserves unknown object kinds instead of destroying them", () => {
    const raw = clone(BASE);
    const pages = raw.pages as Record<string, unknown>[];
    const layers = pages[0]!.layers as Record<string, unknown>[];
    (pages[0]!.objects as unknown[]).push({
      id: "object_chart",
      kind: "chart",
      name: "Sales",
      layerId: layers[1]!.id,
      frame: { x: 10, y: 20, width: 100, height: 80, rotation: 0 },
      data: { series: [1, 2, 3] },
    });

    const normalized = normalizePublicationDocument(raw);
    const object = normalized.pages[0]!.objects[0]!;
    expect(object.kind).toBe("generic");
    if (object.kind === "generic") {
      expect(object.originalKind).toBe("chart");
      expect(object.data).toEqual({ series: [1, 2, 3] });
      expect(object.name).toBe("Sales");
    }
  });

  it("keeps unknown payloads but repairs invalid frames", () => {
    const raw = clone(BASE);
    const pages = raw.pages as Record<string, unknown>[];
    const layers = pages[0]!.layers as Record<string, unknown>[];
    (pages[0]!.objects as unknown[]).push({
      id: "object_weird",
      kind: "future-widget",
      layerId: layers[0]!.id,
      frame: { x: Number.NaN, y: 0, width: -20, height: Number.POSITIVE_INFINITY, rotation: 720 },
    });

    const normalized = normalizePublicationDocument(raw);
    const object = normalized.pages[0]!.objects[0]!;
    expect(object.frame).toEqual({ x: 0, y: 0, width: 0, height: 0, rotation: 0 });
  });

  it("regenerates duplicate page and object ids", () => {
    const raw = clone(BASE);
    const pages = raw.pages as Record<string, unknown>[];
    pages[1]!.id = pages[0]!.id;
    const layers = pages[0]!.layers as Record<string, unknown>[];
    (pages[0]!.objects as unknown[]).push(
      {
        id: "object_dup",
        kind: "shape",
        layerId: layers[0]!.id,
        frame: { x: 0, y: 0, width: 10, height: 10, rotation: 0 },
      },
      {
        id: "object_dup",
        kind: "shape",
        layerId: layers[0]!.id,
        frame: { x: 10, y: 0, width: 10, height: 10, rotation: 0 },
      },
    );

    const normalized = normalizePublicationDocument(raw, { ids: createSequentialIds() });
    const pageIds = normalized.pages.map((page) => page.id);
    expect(new Set(pageIds).size).toBe(pageIds.length);
    const objectIds = normalized.pages[0]!.objects.map((object) => object.id);
    expect(new Set(objectIds).size).toBe(objectIds.length);
  });

  it("prunes story references that no longer resolve", () => {
    const raw = clone(BASE);
    const pages = raw.pages as Record<string, unknown>[];
    const layers = pages[0]!.layers as Record<string, unknown>[];
    (pages[0]!.objects as unknown[]).push({
      id: "object_text",
      kind: "text-frame",
      layerId: layers[1]!.id,
      frame: { x: 0, y: 0, width: 100, height: 100, rotation: 0 },
      storyId: "story_missing",
    });
    raw.stories = [
      {
        id: "story_1",
        name: "Cut",
        paragraphs: [{ id: "paragraph_1", runs: [{ text: "Hello" }] }],
        frames: [{ pageId: BASE.pages[0]!.id, objectId: "object_ghost" }],
      },
    ];

    const normalized = normalizePublicationDocument(raw);
    expect(normalized.stories[0]!.frames).toEqual([]);
    const object = normalized.pages[0]!.objects[0]!;
    expect(object.kind).toBe("text-frame");
    if (object.kind === "text-frame") {
      expect(object.storyId).toBeUndefined();
    }
  });

  it("links a text frame and its story in both directions", () => {
    const raw = clone(BASE);
    const pages = raw.pages as Record<string, unknown>[];
    const layers = pages[0]!.layers as Record<string, unknown>[];
    (pages[0]!.objects as unknown[]).push({
      id: "object_text",
      kind: "text-frame",
      layerId: layers[1]!.id,
      frame: { x: 0, y: 0, width: 100, height: 100, rotation: 0 },
    });
    raw.stories = [
      {
        id: "story_1",
        name: "Letter",
        paragraphs: [{ id: "paragraph_1", runs: [{ text: "Hello" }] }],
        frames: [{ pageId: BASE.pages[0]!.id, objectId: "object_text" }],
      },
    ];

    const normalized = normalizePublicationDocument(raw);
    expect(normalized.stories[0]!.frames).toHaveLength(1);
    const object = normalized.pages[0]!.objects[0]!;
    if (object.kind === "text-frame") {
      expect(object.storyId).toBe("story_1");
    } else {
      throw new Error("Expected a text frame");
    }
  });

  it("drops a master reference that no longer exists", () => {
    const raw = clone(BASE);
    const pages = raw.pages as Record<string, unknown>[];
    pages[0]!.masterId = "master_missing";
    const normalized = normalizePublicationDocument(raw);
    expect(normalized.pages[0]!.masterId).toBeUndefined();
  });

  it("keeps a per-page trim override separate from the document spec", () => {
    const raw = clone(BASE);
    const pages = raw.pages as Record<string, unknown>[];
    pages[2]!.spec = {
      trim: { width: 300, height: 400 },
      bleed: 5,
      margins: { top: 10, right: 10, bottom: 10, left: 10 },
      mirrorMargins: false,
    };
    const normalized = normalizePublicationDocument(raw);
    expect(normalized.spec.trim).toEqual({ width: 864, height: 864 });
    expect(normalized.pages[2]!.spec.trim).toEqual({ width: 300, height: 400 });
  });

  it("clamps negative bleed and margins", () => {
    const raw = clone(BASE);
    raw.spec = {
      trim: { width: 400, height: 600 },
      bleed: -10,
      margins: { top: -5, right: 20, bottom: 20, left: 999 },
      mirrorMargins: false,
    };
    const normalized = normalizePublicationDocument(raw);
    expect(normalized.spec.bleed).toBe(0);
    expect(normalized.spec.margins.top).toBe(0);
    expect(normalized.spec.margins.left).toBeLessThanOrEqual(399);
  });

  it("prunes page guides that point at a missing page", () => {
    const raw = clone(BASE);
    raw.guides = [
      { id: "guide_ok", axis: "x", position: 100, scope: "document" },
      {
        id: "guide_bad",
        axis: "y",
        position: 100,
        scope: "page",
        pageId: "page_missing",
      },
    ];
    const normalized = normalizePublicationDocument(raw);
    expect(normalized.guides.map((guide) => guide.id)).toEqual(["guide_ok"]);
  });

  it("refuses a document written by a newer build", () => {
    expect(() => normalizePublicationDocument({ version: 99 })).toThrow(RangeError);
  });

  it("refuses input that is not a document", () => {
    expect(() => normalizePublicationDocument(null)).toThrow(TypeError);
    expect(() => normalizePublicationDocument("hello")).toThrow(TypeError);
  });

  it("creates a body paragraph style when the document has none", () => {
    const raw = clone(BASE);
    raw.styles = { paragraph: [], character: [] };
    const normalized = normalizePublicationDocument(raw);
    expect(normalized.styles.paragraph).toHaveLength(1);
    expect(normalized.styles.paragraph[0]!.name).toBe("Body");
  });

  it("keeps sane defaults for a missing clock", () => {
    const before = Date.now();
    const document = normalizePublicationDocument({});
    expect(document.metadata.createdAt).toBeGreaterThanOrEqual(before);
    expect(document.metadata.updatedAt).toBeGreaterThanOrEqual(before);
  });

  it("normalises the explicit empty document helper", () => {
    const document = emptyPublicationDocument({ now: 42 });
    expect(document.docType).toBe("custom");
    expect(document.pages).toHaveLength(1);
    expect(document.metadata.createdAt).toBe(42);
    expect(errorsOf(document)).toEqual([]);
  });
});
