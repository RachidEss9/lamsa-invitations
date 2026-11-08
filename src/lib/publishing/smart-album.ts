/**
 * Smart Album.
 *
 * Turns a selection of library photographs into a real publication: the output
 * is built from the same pages, layers, image frames and stories the editor
 * already edits, so nothing about the result is a special case. Layouts are
 * deterministic heuristics that respond to image orientation and page shape;
 * there is no model call and no invented "AI" step.
 */

import { createDocument, createImageFrame, createParagraph, createStory } from "./factory";
import { bleedBox, safeBox } from "./geometry";
import type {
  AssetRef,
  ImageFrameObject,
  PublicationDocument,
  PublicationObject,
  PublicationPage,
  Rect,
  Size,
} from "./model";
import { addPage } from "./operations";

export type AlbumStyle = "classic" | "editorial" | "mosaic" | "filmstrip";
export type AlbumCoverLayout = "full-bleed" | "centred" | "bordered" | "none";
export type AlbumOrientation = "auto" | "portrait" | "landscape";

export interface AlbumImage {
  id: string;
  name: string;
  width: number;
  height: number;
}

export interface AlbumConfig {
  title: string;
  assetIds: string[];
  presetId: string;
  docType?: "album" | "portfolio" | "catalogue";
  orientation: AlbumOrientation;
  style: AlbumStyle;
  /** 1–4 photographs per page. */
  imagesPerPage: 1 | 2 | 3 | 4;
  coverLayout: AlbumCoverLayout;
  /** Space between photographs, in points. */
  spacing: number;
  /** Extra page margin, in points, on top of the preset's own margins. */
  margin: number;
  /** Print a caption under the photograph on single-image layouts. */
  captions: boolean;
}

export const DEFAULT_ALBUM_CONFIG: Omit<AlbumConfig, "assetIds" | "title"> = {
  presetId: "album-12x12",
  docType: "album",
  orientation: "auto",
  style: "classic",
  imagesPerPage: 1,
  coverLayout: "full-bleed",
  spacing: 18,
  margin: 12,
  captions: false,
};

export type AlbumPattern =
  | "full-bleed"
  | "single-margin"
  | "two-side"
  | "two-stacked"
  | "three-composition"
  | "four-grid"
  | "hero-support"
  | "editorial-asym"
  | "image-caption";

export const ALBUM_PATTERNS: readonly {
  id: AlbumPattern;
  name: string;
  images: number;
  description: string;
}[] = [
  { id: "full-bleed", name: "Full bleed", images: 1, description: "One photograph to the trim edge." },
  { id: "single-margin", name: "Single with margins", images: 1, description: "One photograph inside the safe area." },
  { id: "image-caption", name: "Image with caption", images: 1, description: "One photograph with a caption line beneath." },
  { id: "two-side", name: "Two side by side", images: 2, description: "Two photographs sharing the page width." },
  { id: "two-stacked", name: "Two stacked", images: 2, description: "Two photographs stacked vertically." },
  { id: "three-composition", name: "Three composition", images: 3, description: "One large photograph with two supporting ones." },
  { id: "four-grid", name: "Four grid", images: 4, description: "A balanced two by two grid." },
  { id: "hero-support", name: "Hero and support", images: 3, description: "A dominant photograph above a pair." },
  { id: "editorial-asym", name: "Editorial asymmetric", images: 3, description: "An off-centre large photograph with a stacked pair." },
];

export interface PlannedAlbumPage {
  pattern: AlbumPattern;
  assetIds: string[];
  /** Full page rects in points, top-left origin. */
  frames: Rect[];
  caption?: { frame: Rect; text: string };
  cover: boolean;
}

export interface AlbumPlan {
  pages: PlannedAlbumPage[];
  widthPt: number;
  heightPt: number;
  /** The chosen trim, after orientation is applied. */
  trim: Size;
}

function inset(rect: Rect, amount: number): Rect {
  return {
    x: rect.x + amount,
    y: rect.y + amount,
    width: Math.max(1, rect.width - amount * 2),
    height: Math.max(1, rect.height - amount * 2),
  };
}

/** Splits a rect into two along an axis, leaving `gap` between the halves. */
export function splitRect(
  rect: Rect,
  axis: "horizontal" | "vertical",
  gap: number,
  ratio = 0.5,
): [Rect, Rect] {
  const clamped = Math.min(0.85, Math.max(0.15, ratio));
  if (axis === "horizontal") {
    const firstWidth = Math.max(1, (rect.width - gap) * clamped);
    return [
      { ...rect, width: firstWidth },
      { ...rect, x: rect.x + firstWidth + gap, width: Math.max(1, rect.width - firstWidth - gap) },
    ];
  }
  const firstHeight = Math.max(1, (rect.height - gap) * clamped);
  return [
    { ...rect, height: firstHeight },
    {
      ...rect,
      y: rect.y + firstHeight + gap,
      height: Math.max(1, rect.height - firstHeight - gap),
    },
  ];
}

function grid2x2(rect: Rect, gap: number): Rect[] {
  const [top, bottom] = splitRect(rect, "vertical", gap);
  const [topLeft, topRight] = splitRect(top, "horizontal", gap);
  const [bottomLeft, bottomRight] = splitRect(bottom, "horizontal", gap);
  return [topLeft, topRight, bottomLeft, bottomRight];
}

/** Whether an asset reads wider than tall (used to choose compositions). */
export function isLandscape(image: AlbumImage | undefined): boolean {
  return Boolean(image && image.width >= image.height);
}

/** Deterministic pattern rotation, avoiding the same pattern on two pages. */
export function choosePattern(
  style: AlbumStyle,
  count: number,
  pageIndex: number,
  images: AlbumImage[],
): AlbumPattern {
  const landscape = isLandscape(images[0]);
  if (count === 1) {
    if (style === "classic") {
      return pageIndex % 3 === 0 ? "full-bleed" : "single-margin";
    }
    if (style === "editorial") {
      return pageIndex % 2 === 0 ? "image-caption" : "full-bleed";
    }
    if (style === "filmstrip") return pageIndex % 2 === 0 ? "full-bleed" : "single-margin";
    return pageIndex % 4 === 0 ? "full-bleed" : "single-margin";
  }
  if (count === 2) {
    if (style === "mosaic") return pageIndex % 2 === 0 ? "two-side" : "two-stacked";
    return landscape ? "two-side" : "two-stacked";
  }
  if (count === 3) {
    if (style === "editorial") return pageIndex % 2 === 0 ? "editorial-asym" : "hero-support";
    return landscape ? "hero-support" : "three-composition";
  }
  return "four-grid";
}

/**
 * Builds the pattern's rectangles inside the page's safe area. `full-bleed`
 * intentionally reaches into the bleed, which is what makes it print edge to
 * edge instead of showing a white hairline after trimming.
 */
export function patternFrames(
  pattern: AlbumPattern,
  page: PublicationPage,
  gap: number,
): { frames: Rect[]; caption?: Rect } {
  const safe = safeBox(page.spec, page.side);
  const bleed = bleedBox(page.spec);
  const trim = { x: 0, y: 0, width: page.spec.trim.width, height: page.spec.trim.height };
  switch (pattern) {
    case "full-bleed":
      return { frames: [{ x: bleed.x, y: bleed.y, width: bleed.width, height: bleed.height }] };
    case "single-margin":
      return { frames: [safe] };
    case "image-caption": {
      const captionHeight = Math.max(18, Math.min(48, safe.height * 0.08));
      const image = { ...safe, height: Math.max(1, safe.height - captionHeight - gap) };
      return {
        frames: [image],
        caption: { x: safe.x, y: image.y + image.height + gap, width: safe.width, height: captionHeight },
      };
    }
    case "two-side": {
      const [left, right] = splitRect(safe, "horizontal", gap, 0.5);
      return { frames: [left, right] };
    }
    case "two-stacked": {
      const [top, bottom] = splitRect(safe, "vertical", gap, 0.5);
      return { frames: [top, bottom] };
    }
    case "three-composition": {
      const [left, right] = splitRect(safe, "horizontal", gap, 0.64);
      const [topRight, bottomRight] = splitRect(right, "vertical", gap, 0.5);
      return { frames: [left, topRight, bottomRight] };
    }
    case "four-grid":
      return { frames: grid2x2(safe, gap) };
    case "hero-support": {
      const [hero, rest] = splitRect(safe, "vertical", gap, 0.68);
      const [left, right] = splitRect(rest, "horizontal", gap, 0.5);
      return { frames: [hero, left, right] };
    }
    case "editorial-asym": {
      const [left, right] = splitRect(safe, "horizontal", gap, 0.38);
      const [topLeft, bottomLeft] = splitRect(left, "vertical", gap, 0.56);
      return { frames: [right, topLeft, bottomLeft] };
    }
    default:
      return { frames: [trim] };
  }
}

/**
 * Places photographs into pages. The cover is planned separately so changing
 * it never reshuffles the interior, and every interior page keeps its images
 * when a layout is regenerated.
 */
export function planAlbum(
  config: AlbumConfig,
  images: readonly AlbumImage[],
  options: { documentSpec: Size; marginPt: number } = {
    documentSpec: { width: 864, height: 864 },
    marginPt: 0,
  },
): AlbumPlan {
  const available = config.assetIds
    .map((id) => images.find((image) => image.id === id))
    .filter((image): image is AlbumImage => Boolean(image));
  const pages: PlannedAlbumPage[] = [];
  const perPage = config.imagesPerPage;
  const interior = available;

  const coverImages = config.coverLayout === "none" || interior.length === 0 ? [] : [interior[0]!];
  const interiorImages = config.coverLayout === "none" ? interior : interior.slice(1);

  const trim = { ...options.documentSpec };
  if (config.orientation === "landscape" && trim.height > trim.width) {
    const width = trim.height;
    trim.height = trim.width;
    trim.width = width;
  } else if (config.orientation === "portrait" && trim.width > trim.height) {
    const width = trim.height;
    trim.height = trim.width;
    trim.width = width;
  }

  const makePage = (
    assetIds: string[],
    index: number,
    cover: boolean,
  ): PlannedAlbumPage => {
    const imagesForPage = assetIds
      .map((id) => images.find((image) => image.id === id))
      .filter((image): image is AlbumImage => Boolean(image));
    let pattern = cover
      ? "full-bleed"
      : choosePattern(config.style, imagesForPage.length, index, imagesForPage);
    // The caption switch must actually produce captions in every style; classic
    // otherwise rotates only between full bleed and single margin.
    if (
      !cover &&
      config.captions &&
      imagesForPage.length === 1 &&
      pattern !== "image-caption"
    ) {
      pattern = "image-caption";
    }
    const spec = {
      trim,
      bleed: 9,
      margins: { top: config.margin + 24, right: config.margin + 24, bottom: config.margin + 24, left: config.margin + 24 },
      mirrorMargins: false,
    };
    const surrogate = {
      spec,
      side: "single" as const,
    } as PublicationPage;
    const planned = patternFrames(pattern, surrogate, config.spacing);
    return {
      pattern,
      assetIds: imagesForPage.map((image) => image.id),
      frames: planned.frames.slice(0, Math.max(1, imagesForPage.length)),
      ...(planned.caption && config.captions
        ? {
            caption: {
              frame: planned.caption,
              text: imagesForPage[0]?.name ?? "",
            },
          }
        : {}),
      cover,
    };
  };

  if (coverImages.length > 0) {
    pages.push(makePage(coverImages.map((image) => image.id), 0, true));
  }
  for (let index = 0; index < interiorImages.length; index += perPage) {
    pages.push(
      makePage(
        interiorImages.slice(index, index + perPage).map((image) => image.id),
        pages.length,
        false,
      ),
    );
  }
  if (pages.length === 0) {
    // An empty album is still a valid, editable publication: one blank page.
    pages.push(makePage([], 0, false));
  }

  return {
    pages,
    widthPt: trim.width,
    heightPt: trim.height,
    trim,
  };
}

/** The cover's own composition, independent of the interior pattern rules. */
export function coverFrame(layout: AlbumCoverLayout, page: PublicationPage, gap: number): Rect {
  const safe = safeBox(page.spec, page.side);
  const bleed = bleedBox(page.spec);
  if (layout === "full-bleed") {
    return { x: bleed.x, y: bleed.y, width: bleed.width, height: bleed.height };
  }
  if (layout === "bordered") {
    return inset(safe, gap);
  }
  // Centred: a square-ish window that leaves the page colour visible.
  const size = Math.min(safe.width, safe.height) * 0.72;
  return {
    x: safe.x + (safe.width - size) / 2,
    y: safe.y + (safe.height - size) / 2,
    width: size,
    height: size,
  };
}

export interface BuiltAlbum {
  document: PublicationDocument;
  summary: { pages: number; images: number; cover: AlbumCoverLayout };
}

/**
 * Builds the real publication document. The caller persists it through the
 * normal publication mutation, so the album is editable from the first save.
 */
export function buildAlbumDocument(
  config: AlbumConfig,
  images: readonly AlbumImage[],
  assets: readonly AssetRef[],
  options: { presetSize: Size; facingPages: boolean; now?: number },
): BuiltAlbum {
  const base = createDocument({
    title: config.title.trim() || "Untitled album",
    presetId: config.presetId,
    docType: config.docType ?? "album",
    facingPages: false,
    pageCount: 1,
    ...(options.now !== undefined ? { now: options.now } : {}),
  });
  const plan = planAlbum(config, images, {
    documentSpec: options.presetSize,
    marginPt: config.margin,
  });

  // Rebuild the page list with the plan's trim and margins, keeping the
  // document's master/style/asset envelope untouched.
  let document: PublicationDocument = {
    ...base,
    spec: {
      ...base.spec,
      trim: plan.trim,
      margins: {
        top: config.margin + 24,
        right: config.margin + 24,
        bottom: config.margin + 24,
        left: config.margin + 24,
      },
    },
    facingPages: options.facingPages,
    assets: assets.map((asset) => ({ ...asset })),
    metadata: { ...base.metadata, updatedAt: options.now ?? Date.now() },
  };
  document = { ...document, pages: [] };

  const usedAssets = new Set<string>();

  plan.pages.forEach((planned, index) => {
    document = addPage(document, { at: index, name: `${planned.cover ? "Cover" : "Plate"} ${index + 1}` });
    const page = document.pages[index]!;
    const objects: PublicationObject[] = [];
    const layerId = page.layers.find((layer) => layer.name === "Content")?.id ?? page.layers[0]!.id;
    const frames = planned.cover
      ? [coverFrame(config.coverLayout === "none" ? "centred" : config.coverLayout, page, config.spacing)]
      : planned.frames;
    planned.assetIds.forEach((assetId, imageIndex) => {
      const frame = frames[imageIndex];
      if (!frame) return;
      usedAssets.add(assetId);
      objects.push(
        createImageFrame({
          layerId,
          x: frame.x,
          y: frame.y,
          width: frame.width,
          height: frame.height,
          name: images.find((image) => image.id === assetId)?.name ?? `Image ${imageIndex + 1}`,
          assetId,
          fit: "fill",
          mask: "rect",
          crop: { scale: 1, offsetX: 0, offsetY: 0, normalized: true },
          focal: { x: 0.5, y: 0.5 },
        }),
      );
    });

    if (planned.caption) {
      const story = createStory(`Caption ${index + 1}`, {
        frames: [{ pageId: page.id, objectId: "caption" }],
        paragraphs: [createParagraph(planned.caption.text)],
      });
      // The frame id must match the story's thread ref, so create it first
      // with a placeholder and then adopt the real paragraph/story ids.
      const frame = planned.caption.frame;
      const textFrameId = `object_${page.id}_caption`.slice(0, 120);
      story.frames = [{ pageId: page.id, objectId: textFrameId }];
      document = { ...document, stories: [...document.stories, story] };
      objects.push({
        version: 1,
        id: textFrameId,
        kind: "text-frame",
        name: "Caption",
        layerId,
        frame: { x: frame.x, y: frame.y, width: frame.width, height: frame.height, rotation: 0 },
        locked: false,
        hidden: false,
        opacity: 1,
        storyId: story.id,
        columns: 1,
        gutter: 0,
        inset: { top: 0, right: 0, bottom: 0, left: 0 },
        verticalAlign: "top",
        overflow: "clip",
        fitToFrame: false,
      });
    }

    document = {
      ...document,
      pages: document.pages.map((entry) =>
        entry.id === page.id ? { ...entry, objects } : entry,
      ),
    };
  });

  document = {
    ...document,
    assets: document.assets.filter((asset) => usedAssets.has(asset.id)),
  };

  return {
    document,
    summary: { pages: document.pages.length, images: usedAssets.size, cover: config.coverLayout },
  };
}

export type { ImageFrameObject };
