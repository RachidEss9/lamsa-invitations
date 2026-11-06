import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ObjectArt } from "@/components/publishing/ObjectArt";
import { createDocument, createImageFrame } from "./factory";
import { normalizePublicationDocument } from "./normalize";
import type { ImageCrop, ImageFrameObject, PublicationDocument } from "./model";

function imageDocument(crop: ImageCrop): {
  document: PublicationDocument;
  object: ImageFrameObject;
} {
  const document = createDocument({
    presetId: "custom",
    trim: { width: 400, height: 600 },
    pageCount: 1,
  });
  const object = createImageFrame({
    layerId: document.pages[0]!.layers[1]!.id,
    x: 30,
    y: 40,
    width: 200,
    height: 100,
    assetId: "asset_photo",
    fit: "fill",
    crop,
    focal: { x: 0.5, y: 0.5 },
  });
  document.pages[0]!.objects = [object];
  return { document, object };
}

function renderImage(
  document: PublicationDocument,
  object: ImageFrameObject,
  resolve: boolean,
) {
  return renderToStaticMarkup(
    createElement(ObjectArt, {
      document,
      object,
      resolveAsset: resolve
        ? () => ({ url: "https://assets.example/photo.jpg", width: 400, height: 200 })
        : undefined,
    }),
  );
}

describe("image rendering", () => {
  it("clips the cropped artwork to the frame and preserves aspect-driven placement", () => {
    const { document, object } = imageDocument({
      scale: 2,
      offsetX: 0.1,
      offsetY: -0.05,
      normalized: true,
      rotation: 15,
    });
    const html = renderImage(document, object, true);

    expect(html).toContain("<clipPath");
    expect(html).toContain("clip-path=\"url(#image-clip-");
    expect(html).toContain("https://assets.example/photo.jpg");
    expect(html).toContain("preserveAspectRatio=\"none\"");
    expect(html).toContain("rotate(15");
    expect(html).toContain('width="200"');
  });

  it("renders an explicit missing-asset placeholder instead of crashing", () => {
    const { document, object } = imageDocument({
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      normalized: true,
    });
    const html = renderImage(document, object, false);

    expect(html).toContain("IMAGE UNAVAILABLE");
    expect(html).not.toContain("<image");
  });

  it("renders an empty image frame distinctly", () => {
    const { document, object } = imageDocument({
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      normalized: true,
    });
    const html = renderImage(document, { ...object, assetId: undefined }, false);

    expect(html).toContain("EMPTY IMAGE FRAME");
  });

  it("normalizes legacy crops as centered without losing zoom or rotation", () => {
    const { document } = imageDocument({
      scale: 1.4,
      offsetX: 30,
      offsetY: 12,
      rotation: 20,
    } as ImageCrop);
    const raw = JSON.parse(JSON.stringify(document)) as PublicationDocument;
    const legacyObject = raw.pages[0]!.objects[0]!;
    if (legacyObject.kind === "image-frame") {
      delete legacyObject.crop.normalized;
    }
    const normalized = normalizePublicationDocument(raw);
    const image = normalized.pages[0]!.objects[0]!;
    expect(image.kind).toBe("image-frame");
    if (image.kind !== "image-frame") return;
    expect(image.crop.normalized).toBe(false);
    expect(image.crop.offsetX).toBe(30);
    expect(image.crop.rotation).toBe(20);

    const html = renderImage(normalized, image, true);
    // The legacy point offset is not treated as a frame fraction; the crop
    // still renders centred with its saved zoom.
    expect(html).toContain("<image");
    expect(html).not.toContain("translate");
  });
});
