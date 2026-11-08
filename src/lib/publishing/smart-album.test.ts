import { describe, expect, it } from "vitest";

import { buildAlbumDocument, planAlbum, type AlbumConfig } from "./smart-album";
import { validatePublicationDocument } from "./validate";

const images = [
  { id: "a", name: "a.jpg", width: 600, height: 400 },
  { id: "b", name: "b.jpg", width: 400, height: 600 },
  { id: "c", name: "c.jpg", width: 500, height: 500 },
  { id: "d", name: "d.jpg", width: 800, height: 500 },
  { id: "e", name: "e.jpg", width: 500, height: 700 },
];

function config(overrides: Partial<AlbumConfig> = {}): AlbumConfig {
  return {
    title: "Summer",
    assetIds: images.map((image) => image.id),
    presetId: "album-12x12",
    orientation: "auto",
    style: "classic",
    imagesPerPage: 1,
    coverLayout: "full-bleed",
    spacing: 18,
    margin: 12,
    captions: false,
    ...overrides,
  };
}

const assets = images.map((image) => ({
  id: image.id,
  name: image.name,
  width: image.width,
  height: image.height,
  mime: "image/jpeg",
  tags: [],
}));

describe("Smart Album", () => {
  it("plans a cover plus interior pages, without dropping a photograph", () => {
    const plan = planAlbum(config(), images, {
      documentSpec: { width: 864, height: 864 },
      marginPt: 12,
    });
    expect(plan.pages[0]!.cover).toBe(true);
    const total = plan.pages.reduce((count, page) => count + page.assetIds.length, 0);
    expect(total).toBe(images.length);
    expect(plan.widthPt).toBe(864);
    expect(plan.heightPt).toBe(864);
  });

  it("varies layouts instead of repeating one pattern on every page", () => {
    const plan = planAlbum(config(), images, {
      documentSpec: { width: 864, height: 864 },
      marginPt: 12,
    });
    const interior = plan.pages.filter((page) => !page.cover).map((page) => page.pattern);
    expect(new Set(interior).size).toBeGreaterThan(1);
  });

  it("responds to two, three and four images per page", () => {
    for (const perPage of [2, 3, 4] as const) {
      const plan = planAlbum(config({ imagesPerPage: perPage, style: "mosaic" }), images, {
        documentSpec: { width: 864, height: 864 },
        marginPt: 12,
      });
      const interior = plan.pages.filter((page) => !page.cover);
      expect(interior.every((page) => page.frames.length === page.assetIds.length)).toBe(
        true,
      );
      expect(interior.every((page) => page.assetIds.length <= perPage)).toBe(true);
    }
  });

  it("builds a real, valid editable document with shared asset references", () => {
    const built = buildAlbumDocument(config(), images, assets, {
      presetSize: { width: 864, height: 864 },
      facingPages: false,
      now: 1_700_000_000_000,
    });
    expect(validatePublicationDocument(built.document).filter((issue) => issue.severity === "error")).toEqual([]);
    expect(built.document.pages.length).toBe(built.summary.pages);
    const frames = built.document.pages.flatMap((page) =>
      page.objects.filter((object) => object.kind === "image-frame"),
    );
    expect(frames.length).toBeGreaterThan(0);
    expect(frames.every((frame) => frame.kind === "image-frame" && frame.assetId)).toBe(
      true,
    );
    expect(built.document.assets.map((asset) => asset.id).sort()).toEqual(
      images.map((image) => image.id).sort(),
    );
  });

  it("is deterministic for the same input and changes when the style changes", () => {
    const options = { presetSize: { width: 864, height: 864 }, facingPages: false, now: 1 };
    const first = buildAlbumDocument(config(), images, assets, options);
    const second = buildAlbumDocument(config(), images, assets, options);
    expect(second.document.pages.map((page) => page.objects.map((object) => object.frame))).toEqual(
      first.document.pages.map((page) => page.objects.map((object) => object.frame)),
    );
    const editorial = buildAlbumDocument(config({ style: "editorial" }), images, assets, options);
    expect(
      editorial.document.pages.map((page) => page.objects.map((object) => object.frame)),
    ).not.toEqual(first.document.pages.map((page) => page.objects.map((object) => object.frame)));
  });

  it("honours a landscape orientation and a no-cover album", () => {
    const landscape = planAlbum(config({ orientation: "landscape", coverLayout: "none" }), images, {
      documentSpec: { width: 800, height: 600 },
      marginPt: 12,
    });
    expect(landscape.widthPt).toBeGreaterThan(landscape.heightPt);
    expect(landscape.pages.every((page) => !page.cover)).toBe(true);
  });

  it("creates caption stories only when captions are requested", () => {
    const withCaptions = buildAlbumDocument(config({ captions: true }), images, assets, {
      presetSize: { width: 864, height: 864 },
      facingPages: false,
    });
    expect(withCaptions.document.stories.length).toBeGreaterThan(0);
    const without = buildAlbumDocument(config(), images, assets, {
      presetSize: { width: 864, height: 864 },
      facingPages: false,
    });
    expect(without.document.stories).toHaveLength(0);
  });

  it("keeps every generated page inside the normal page/object architecture", () => {
    const built = buildAlbumDocument(config({ imagesPerPage: 4 }), images, assets, {
      presetSize: { width: 864, height: 864 },
      facingPages: false,
    });
    for (const page of built.document.pages) {
      expect(page.layers.length).toBeGreaterThan(0);
      expect(page.spec.trim.width).toBeGreaterThan(0);
      const layerIds = new Set(page.layers.map((layer) => layer.id));
      expect(page.objects.every((object) => layerIds.has(object.layerId))).toBe(true);
    }
  });
});
