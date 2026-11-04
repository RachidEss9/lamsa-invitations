import { describe, expect, it } from "vitest";
import type { PublicationDocument } from "./model";
import { DOCUMENT_PRESETS } from "./presets";
import { createDocument } from "./factory";
import { createSequentialIds } from "./ids";
import {
  assertValidPublicationDocument,
  validatePublicationDocument,
} from "./validate";

/**
 * Validation reports what normalisation would repair, so corrupt or
 * contradictory documents never reach an editor or a printer unnoticed.
 */

const BASE = createDocument({
  presetId: "album-12x12",
  pageCount: 4,
  ids: createSequentialIds(),
  now: 1000,
});

function clone(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(BASE)) as Record<string, unknown>;
}

function codesOf(document: unknown, severity?: "error" | "warning"): string[] {
  return validatePublicationDocument(document)
    .filter((issue) => (severity ? issue.severity === severity : true))
    .map((issue) => issue.code);
}

function errorsOf(document: unknown): string[] {
  return codesOf(document, "error");
}

function objectOnPage(
  raw: Record<string, unknown>,
  pageIndex: number,
  object: Record<string, unknown>,
): void {
  const pages = raw.pages as Record<string, unknown>[];
  (pages[pageIndex]!.objects as unknown[]).push(object);
}

function shapeObject(id: string, layerId: string): Record<string, unknown> {
  return {
    version: 1,
    id,
    kind: "shape",
    name: "Box",
    layerId,
    frame: { x: 0, y: 0, width: 10, height: 10, rotation: 0 },
    opacity: 1,
    shape: "rectangle",
    strokeWidth: 0,
    cornerRadius: 0,
  };
}

function firstLayerId(raw: Record<string, unknown>, pageIndex = 0): string {
  const pages = raw.pages as Record<string, unknown>[];
  const layers = pages[pageIndex]!.layers as Record<string, unknown>[];
  return String(layers[1]!.id ?? layers[0]!.id);
}

describe("valid documents", () => {
  it("accepts the factory output", () => {
    expect(errorsOf(BASE)).toEqual([]);
  });

  it("accepts a fresh document for every preset", () => {
    for (const preset of DOCUMENT_PRESETS) {
      const document = createDocument({
        presetId: preset.id,
        trim: preset.size ? undefined : { width: 300, height: 400 },
        pageCount: 2,
        now: 1,
      });
      expect(errorsOf(document), preset.id).toEqual([]);
    }
  });

  it("accepts a page whose master exists", () => {
    const raw = clone();
    const pages = raw.pages as Record<string, unknown>[];
    raw.masters = [
      {
        version: 1,
        id: "master_head",
        name: "Running head",
        appliesTo: "both",
        background: { color: "#ffffff" },
        layers: pages[0]!.layers,
        objects: [],
      },
    ];
    pages[0]!.masterId = "master_head";
    expect(errorsOf(raw)).toEqual([]);
  });

  it("warns rather than errors for a missing schema version", () => {
    const raw = clone();
    delete raw.version;
    expect(errorsOf(raw)).toEqual([]);
    expect(codesOf(raw, "warning")).toContain("document/version-missing");
  });
});

describe("invalid envelopes", () => {
  it("rejects values that are not documents", () => {
    expect(errorsOf(null)).toContain("document/not-object");
    expect(errorsOf("text")).toContain("document/not-object");
    expect(errorsOf([])).toContain("document/not-object");
  });

  it("rejects a newer schema version", () => {
    const raw = clone();
    raw.version = 99;
    expect(errorsOf(raw)).toContain("document/version-newer");
  });

  it("rejects an unknown document category", () => {
    const raw = clone();
    raw.docType = "zine";
    expect(errorsOf(raw)).toContain("document/doc-type");
  });

  it("rejects a document without pages", () => {
    const raw = clone();
    raw.pages = [];
    raw.spreads = [];
    expect(errorsOf(raw)).toContain("document/pages");
  });
});

describe("invalid page specification", () => {
  it("requires a trim size", () => {
    const raw = clone();
    raw.spec = { bleed: 0, margins: { top: 0, right: 0, bottom: 0, left: 0 } };
    expect(errorsOf(raw)).toContain("spec/trim");
  });

  it("rejects a zero or negative trim", () => {
    const raw = clone();
    raw.spec = {
      trim: { width: 0, height: -10 },
      bleed: 0,
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
      mirrorMargins: false,
    };
    expect(errorsOf(raw)).toContain("spec/trim-width");
    expect(errorsOf(raw)).toContain("spec/trim-height");
  });

  it("rejects negative bleed", () => {
    const raw = clone();
    (raw.spec as Record<string, unknown>).bleed = -3;
    expect(errorsOf(raw)).toContain("spec/bleed");
  });

  it("rejects margins that consume the page", () => {
    const raw = clone();
    (raw.spec as Record<string, unknown>).margins = {
      top: 500,
      right: 10,
      bottom: 500,
      left: 10,
    };
    expect(errorsOf(raw)).toContain("spec/margins-overflow-y");
  });
});

describe("invalid pages and objects", () => {
  it("rejects duplicate page ids", () => {
    const raw = clone();
    const pages = raw.pages as Record<string, unknown>[];
    pages[1]!.id = pages[0]!.id;
    expect(errorsOf(raw)).toContain("page/duplicate-id");
  });

  it("rejects a page without a layer", () => {
    const raw = clone();
    const pages = raw.pages as Record<string, unknown>[];
    pages[0]!.layers = [];
    expect(errorsOf(raw)).toContain("page/layers");
  });

  it("rejects duplicate object ids across pages", () => {
    const raw = clone();
    objectOnPage(raw, 0, shapeObject("object_dup", firstLayerId(raw, 0)));
    objectOnPage(raw, 1, shapeObject("object_dup", firstLayerId(raw, 1)));
    expect(errorsOf(raw)).toContain("object/duplicate-id");
  });

  it("rejects an object on a layer that does not exist", () => {
    const raw = clone();
    objectOnPage(raw, 0, shapeObject("object_lost", "layer_missing"));
    expect(errorsOf(raw)).toContain("object/layer");
  });

  it("rejects an out-of-range opacity", () => {
    const raw = clone();
    const object = shapeObject("object_faded", firstLayerId(raw, 0));
    object.opacity = 1.5;
    objectOnPage(raw, 0, object);
    expect(errorsOf(raw)).toContain("object/opacity");
  });

  it("rejects a broken frame", () => {
    const raw = clone();
    const object = shapeObject("object_broken", firstLayerId(raw, 0));
    object.frame = { x: 0, y: 0, width: -5, height: 10, rotation: 0 };
    objectOnPage(raw, 0, object);
    expect(errorsOf(raw)).toContain("object/frame-size");
  });

  it("warns about an unknown object kind without failing the document", () => {
    const raw = clone();
    const object = shapeObject("object_chart", firstLayerId(raw, 0));
    object.kind = "chart";
    objectOnPage(raw, 0, object);
    expect(codesOf(raw, "warning")).toContain("object/unknown-kind");
    expect(errorsOf(raw)).toEqual([]);
  });
});

describe("stories and text frames", () => {
  it("rejects a text frame that names a missing story", () => {
    const raw = clone();
    objectOnPage(raw, 0, {
      version: 1,
      id: "object_text",
      kind: "text-frame",
      layerId: firstLayerId(raw, 0),
      frame: { x: 0, y: 0, width: 100, height: 100, rotation: 0 },
      storyId: "story_missing",
    });
    expect(errorsOf(raw)).toContain("text/story-missing");
  });

  it("rejects a story frame that does not resolve", () => {
    const raw = clone();
    raw.stories = [
      {
        id: "story_1",
        name: "Letter",
        paragraphs: [],
        frames: [{ pageId: BASE.pages[0]!.id, objectId: "object_ghost" }],
      },
    ];
    expect(errorsOf(raw)).toContain("story/frame-object");
  });

  it("rejects a story frame that is not a text frame", () => {
    const raw = clone();
    objectOnPage(raw, 0, shapeObject("object_box", firstLayerId(raw, 0)));
    raw.stories = [
      {
        id: "story_1",
        name: "Letter",
        paragraphs: [],
        frames: [{ pageId: BASE.pages[0]!.id, objectId: "object_box" }],
      },
    ];
    expect(errorsOf(raw)).toContain("story/frame-kind");
  });

  it("rejects one frame claimed by two stories", () => {
    const raw = clone();
    objectOnPage(raw, 0, {
      version: 1,
      id: "object_text",
      kind: "text-frame",
      layerId: firstLayerId(raw, 0),
      frame: { x: 0, y: 0, width: 100, height: 100, rotation: 0 },
      storyId: "story_1",
    });
    raw.stories = [
      {
        id: "story_1",
        name: "One",
        paragraphs: [],
        frames: [{ pageId: BASE.pages[0]!.id, objectId: "object_text" }],
      },
      {
        id: "story_2",
        name: "Two",
        paragraphs: [],
        frames: [{ pageId: BASE.pages[0]!.id, objectId: "object_text" }],
      },
    ];
    expect(errorsOf(raw)).toContain("story/frame-claimed");
  });
});

describe("spreads", () => {
  it("rejects a spread that references a missing page", () => {
    const raw = clone();
    const spreads = raw.spreads as Record<string, unknown>[];
    spreads.push({
      id: "spread_ghost",
      index: 9,
      kind: "single",
      pageIds: ["page_missing"],
      gutter: 0,
    });
    expect(errorsOf(raw)).toContain("spread/unknown-page");
  });

  it("rejects a page that is not in any spread", () => {
    const raw = clone();
    const spreads = raw.spreads as Record<string, unknown>[];
    spreads.pop();
    expect(errorsOf(raw)).toContain("spread/missing-page");
  });

  it("rejects a facing spread with the wrong number of pages", () => {
    const raw = clone();
    const spreads = raw.spreads as Record<string, unknown>[];
    spreads[1]!.pageIds = [BASE.pages[1]!.id];
    expect(errorsOf(raw)).toContain("spread/facing-pages");
  });
});

describe("assets and guides", () => {
  it("rejects duplicate asset ids", () => {
    const raw = clone();
    raw.assets = [
      { id: "asset_1", name: "a.jpg", width: 100, height: 100, tags: [] },
      { id: "asset_1", name: "b.jpg", width: 100, height: 100, tags: [] },
    ];
    expect(errorsOf(raw)).toContain("asset/duplicate-id");
  });

  it("rejects a page guide on a missing page", () => {
    const raw = clone();
    raw.guides = [
      { id: "guide_1", axis: "x", position: 10, scope: "page", pageId: "page_missing" },
    ];
    expect(errorsOf(raw)).toContain("guide/page");
  });

  it("rejects a malformed guide", () => {
    const raw = clone();
    raw.guides = [{ id: "guide_1", axis: "z", position: 10, scope: "document" }];
    expect(errorsOf(raw)).toContain("guide/axis");
  });
});

describe("assertValidPublicationDocument", () => {
  it("passes a valid document", () => {
    expect(() => assertValidPublicationDocument(BASE)).not.toThrow();
  });

  it("throws with the first errors listed", () => {
    const raw = clone();
    raw.spec = { trim: { width: 0, height: 0 } };
    expect(() => assertValidPublicationDocument(raw)).toThrow(/Invalid publication document/);
    expect(() => assertValidPublicationDocument(raw)).toThrow(/positive number of points/);
  });
});

describe("typed documents", () => {
  it("validates a document after an immutable edit", () => {
    const document: PublicationDocument = BASE;
    expect(errorsOf(document)).toEqual([]);
  });
});
