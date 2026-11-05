/**
 * Structural validation.
 *
 * Validation inspects the document as saved — it does not repair it first, so
 * a corrupt page size or a dangling story reference is reported rather than
 * quietly normalised away. Errors mean the document cannot be trusted (or
 * printed); warnings mean it will open but something is probably not what the
 * author meant.
 *
 * The checks cover the invariants the rest of the engine relies on: physical
 * dimensions, unique ids, a spread plan that covers every page exactly once,
 * layers that exist, and story threads that point at real text frames.
 */

import {
  DEFAULT_GRID,
  DOC_TYPES,
  OBJECT_KINDS,
  PUBLICATION_DOCUMENT_VERSION,
  isDocType,
} from "./model";
import { isLengthUnit } from "./units";

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  /** Stable machine code, e.g. `page/duplicate-id`. */
  code: string;
  severity: ValidationSeverity;
  /** Where the problem is: `pages[2].objects[0].frame.width`. */
  path: string;
  message: string;
}

type RawRecord = Record<string, unknown>;

function isRecord(value: unknown): value is RawRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function listOf(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

class Collector {
  readonly issues: ValidationIssue[] = [];

  error(code: string, path: string, message: string): void {
    this.issues.push({ code, severity: "error", path, message });
  }

  warn(code: string, path: string, message: string): void {
    this.issues.push({ code, severity: "warning", path, message });
  }
}

interface Context {
  pageIds: Set<string>;
  objectKinds: Map<string, string>;
  /** pageId → object ids, for story frame checks. */
  objectPages: Map<string, string>;
  objectIds: Set<string>;
  storyIds: Set<string>;
  styleIds: Set<string>;
  /** Stable asset ids this document declares; frame references must resolve. */
  assetIds: Set<string>;
  claimedFrames: Set<string>;
  spreadPageIds: Set<string>;
}

/**
 * A frame or background may name an asset; when it does, the asset has to be
 * part of this document, otherwise deleting a row could never be proven safe
 * and a restored version could point at a file nobody owns.
 */
function validateAssetRef(
  value: unknown,
  path: string,
  c: Collector,
  context: Context,
): void {
  if (value === undefined) return;
  if (typeof value !== "string" || !context.assetIds.has(value)) {
    c.error(
      "asset/ref-missing",
      path,
      "The reference points at an asset that is not in this publication",
    );
  }
}

function validateEdges(
  value: unknown,
  path: string,
  c: Collector,
  limit?: { width: number; height: number },
): void {
  if (value === undefined) return;
  if (!isRecord(value)) {
    c.error("spec/margins", path, "Margins must be an object with four sides");
    return;
  }
  let totalX = 0;
  let totalY = 0;
  for (const side of ["top", "right", "bottom", "left"] as const) {
    const margin = value[side];
    if (margin === undefined) continue;
    if (!isFiniteNumber(margin) || margin < 0) {
      c.error(
        `spec/margin-${side}`,
        `${path}.${side}`,
        `The ${side} margin must be a finite, non-negative number of points`,
      );
      continue;
    }
    if (side === "left" || side === "right") totalX += margin;
    else totalY += margin;
  }
  if (limit) {
    if (totalX >= limit.width) {
      c.error(
        "spec/margins-overflow-x",
        path,
        "The left and right margins leave no printable width",
      );
    }
    if (totalY >= limit.height) {
      c.error(
        "spec/margins-overflow-y",
        path,
        "The top and bottom margins leave no printable height",
      );
    }
  }
}

function validateSpec(
  value: unknown,
  path: string,
  c: Collector,
  options: { requireTrim: boolean },
): void {
  if (!isRecord(value)) {
    if (options.requireTrim) {
      c.error("spec/missing", path, "The document needs a page specification");
    }
    return;
  }
  const trim = value.trim;
  if (trim === undefined) {
    if (options.requireTrim) {
      c.error("spec/trim", `${path}.trim`, "A trim size is required");
    }
  } else if (!isRecord(trim)) {
    c.error("spec/trim", `${path}.trim`, "The trim size must be an object");
  } else {
    const width = trim.width;
    const height = trim.height;
    if (!isFiniteNumber(width) || width <= 0) {
      c.error("spec/trim-width", `${path}.trim.width`, "Trim width must be a positive number of points");
    }
    if (!isFiniteNumber(height) || height <= 0) {
      c.error(
        "spec/trim-height",
        `${path}.trim.height`,
        "Trim height must be a positive number of points",
      );
    }
    if (isFiniteNumber(width) && isFiniteNumber(height) && width > 0 && height > 0) {
      validateEdges(value.margins, `${path}.margins`, c, { width, height });
    }
  }
  if (value.bleed !== undefined && (!isFiniteNumber(value.bleed) || value.bleed < 0)) {
    c.error("spec/bleed", `${path}.bleed`, "Bleed must be a finite, non-negative number of points");
  }
  if (value.mirrorMargins !== undefined && typeof value.mirrorMargins !== "boolean") {
    c.error("spec/mirror", `${path}.mirrorMargins`, "mirrorMargins must be a boolean");
  }
}

function validateFrame(value: unknown, path: string, c: Collector): void {
  if (!isRecord(value)) {
    c.error("object/frame", path, "An object needs a frame");
    return;
  }
  for (const key of ["x", "y", "rotation"] as const) {
    if (!isFiniteNumber(value[key])) {
      c.error("object/frame-number", `${path}.${key}`, `frame.${key} must be a finite number`);
    }
  }
  for (const key of ["width", "height"] as const) {
    if (!isFiniteNumber(value[key]) || (value[key] as number) < 0) {
      c.error(
        "object/frame-size",
        `${path}.${key}`,
        `frame.${key} must be a finite, non-negative number`,
      );
    }
  }
}

function validateObjects(
  value: unknown,
  path: string,
  layerIds: Set<string>,
  c: Collector,
  context: Context,
  pageId: string,
): void {
  const objects = listOf(value);
  objects.forEach((entry, index) => {
    const objectPath = `${path}[${index}]`;
    if (!isRecord(entry)) {
      c.error("object/not-object", objectPath, "An object must be an object");
      return;
    }
    const id = entry.id;
    if (typeof id !== "string" || id.length === 0) {
      c.error("object/id", `${objectPath}.id`, "An object needs a stable id");
    } else {
      if (context.objectIds.has(id)) {
        c.error("object/duplicate-id", `${objectPath}.id`, `Duplicate object id "${id}"`);
      }
      context.objectIds.add(id);
      context.objectKinds.set(id, typeof entry.kind === "string" ? entry.kind : "unknown");
      context.objectPages.set(id, pageId);
    }

    const kind = entry.kind;
    if (typeof kind !== "string" || !(OBJECT_KINDS as readonly string[]).includes(kind)) {
      c.warn(
        "object/unknown-kind",
        `${objectPath}.kind`,
        `Unrecognised object kind "${String(kind)}"; it is preserved as a generic object`,
      );
    }

    validateFrame(entry.frame, `${objectPath}.frame`, c);

    if (typeof entry.layerId !== "string" || !layerIds.has(entry.layerId)) {
      c.error(
        "object/layer",
        `${objectPath}.layerId`,
        "The object's layer does not exist on its page",
      );
    }
    if (
      entry.opacity !== undefined &&
      (!isFiniteNumber(entry.opacity) || entry.opacity < 0 || entry.opacity > 1)
    ) {
      c.error("object/opacity", `${objectPath}.opacity`, "Opacity must be between 0 and 1");
    }
    if (entry.version !== undefined && (!isFiniteNumber(entry.version) || entry.version < 1)) {
      c.error("object/version", `${objectPath}.version`, "Object version must be a positive number");
    }
    if (kind === "text-frame") {
      if (
        entry.columns !== undefined &&
        (!isFiniteNumber(entry.columns) || entry.columns < 1)
      ) {
        c.error("text/columns", `${objectPath}.columns`, "A text frame needs at least one column");
      }
      if (entry.gutter !== undefined && (!isFiniteNumber(entry.gutter) || entry.gutter < 0)) {
        c.error("text/gutter", `${objectPath}.gutter`, "Column gutter must be non-negative");
      }
      if (
        entry.storyId !== undefined &&
        (typeof entry.storyId !== "string" || !context.storyIds.has(entry.storyId))
      ) {
        c.error(
          "text/story-missing",
          `${objectPath}.storyId`,
          "The frame points at a story that does not exist",
        );
      }
    }
    if (kind === "image-frame") {
      validateAssetRef(entry.assetId, `${objectPath}.assetId`, c, context);
      if (
        entry.crop !== undefined &&
        (!isRecord(entry.crop) || !isFiniteNumber(entry.crop.scale) || (entry.crop.scale as number) <= 0)
      ) {
        c.error("image/crop", `${objectPath}.crop`, "Image crop scale must be positive");
      }
    }
    if (kind === "shape" && entry.shape !== undefined) {
      const shapes = ["rectangle", "ellipse", "polygon", "path"];
      if (typeof entry.shape !== "string" || !shapes.includes(entry.shape)) {
        c.error("shape/kind", `${objectPath}.shape`, "Unknown shape kind");
      }
    }
  });
}

function validateLayers(
  value: unknown,
  path: string,
  c: Collector,
): Set<string> {
  const ids = new Set<string>();
  listOf(value).forEach((entry, index) => {
    const layerPath = `${path}[${index}]`;
    if (!isRecord(entry)) {
      c.error("layer/not-object", layerPath, "A layer must be an object");
      return;
    }
    if (typeof entry.id !== "string" || entry.id.length === 0) {
      c.error("layer/id", `${layerPath}.id`, "A layer needs a stable id");
      return;
    }
    if (ids.has(entry.id)) {
      c.error("layer/duplicate-id", `${layerPath}.id`, `Duplicate layer id "${entry.id}"`);
    }
    ids.add(entry.id);
    if (typeof entry.name !== "string" || entry.name.trim() === "") {
      c.warn("layer/name", `${layerPath}.name`, "A layer should have a name");
    }
  });
  return ids;
}

function validatePage(
  value: unknown,
  path: string,
  c: Collector,
  context: Context,
  facingPages: boolean,
): void {
  if (!isRecord(value)) {
    c.error("page/not-object", path, "A page must be an object");
    return;
  }
  const id = value.id;
  if (typeof id !== "string" || id.length === 0) {
    c.error("page/id", `${path}.id`, "A page needs a stable id");
  } else {
    if (context.pageIds.has(id)) {
      c.error("page/duplicate-id", `${path}.id`, `Duplicate page id "${id}"`);
    }
    context.pageIds.add(id);
  }
  if (typeof value.name !== "string" || value.name.trim() === "") {
    c.warn("page/name", `${path}.name`, "A page should have a name");
  }
  validateSpec(value.spec, `${path}.spec`, c, { requireTrim: false });

  const side = value.side;
  if (side !== undefined && !["left", "right", "single"].includes(String(side))) {
    c.error("page/side", `${path}.side`, "A page side must be left, right or single");
  }
  if (!facingPages && side !== undefined && side !== "single") {
    c.warn(
      "page/side-single",
      `${path}.side`,
      "A non-facing document stores every page as a single page",
    );
  }

  if (value.background !== undefined && !isRecord(value.background)) {
    c.error("page/background", `${path}.background`, "A page background must be an object");
  } else if (isRecord(value.background)) {
    validateAssetRef(
      value.background.assetId,
      `${path}.background.assetId`,
      c,
      context,
    );
  }

  const layerIds = validateLayers(value.layers, `${path}.layers`, c);
  if (layerIds.size === 0) {
    c.error("page/layers", `${path}.layers`, "A page needs at least one layer");
  }
  validateObjects(
    value.objects,
    `${path}.objects`,
    layerIds,
    c,
    context,
    typeof id === "string" ? id : "",
  );
}

function validateMasters(value: unknown, c: Collector, context: Context): void {
  const masterIds = new Set<string>();
  listOf(value).forEach((entry, index) => {
    const path = `masters[${index}]`;
    if (!isRecord(entry)) {
      c.error("master/not-object", path, "A master must be an object");
      return;
    }
    if (typeof entry.id !== "string" || entry.id.length === 0) {
      c.error("master/id", `${path}.id`, "A master needs a stable id");
    } else {
      if (masterIds.has(entry.id)) {
        c.error("master/duplicate-id", `${path}.id`, `Duplicate master id "${entry.id}"`);
      }
      masterIds.add(entry.id);
    }
    if (entry.appliesTo !== undefined && !["left", "right", "both"].includes(String(entry.appliesTo))) {
      c.error("master/applies-to", `${path}.appliesTo`, "A master applies to left, right or both");
    }
    validateSpec(entry.spec, `${path}.spec`, c, { requireTrim: false });
    if (entry.background !== undefined && !isRecord(entry.background)) {
      c.error("master/background", `${path}.background`, "A master background must be an object");
    } else if (isRecord(entry.background)) {
      validateAssetRef(
        entry.background.assetId,
        `${path}.background.assetId`,
        c,
        context,
      );
    }
    const layerIds = validateLayers(entry.layers, `${path}.layers`, c);
    validateObjects(entry.objects, `${path}.objects`, layerIds, c, context, "");
  });
}

/** First pass: story ids must be known before text frames are checked. */
function collectStoryIds(value: unknown, context: Context): void {
  for (const entry of listOf(value)) {
    if (isRecord(entry) && typeof entry.id === "string" && entry.id.length > 0) {
      context.storyIds.add(entry.id);
    }
  }
}

function validateStories(value: unknown, c: Collector, context: Context): void {
  const seenStories = new Set<string>();
  listOf(value).forEach((entry, index) => {
    const path = `stories[${index}]`;
    if (!isRecord(entry)) {
      c.error("story/not-object", path, "A story must be an object");
      return;
    }
    if (typeof entry.id !== "string" || entry.id.length === 0) {
      c.error("story/id", `${path}.id`, "A story needs a stable id");
    } else {
      if (seenStories.has(entry.id)) {
        c.error("story/duplicate-id", `${path}.id`, `Duplicate story id "${entry.id}"`);
      }
      seenStories.add(entry.id);
      context.storyIds.add(entry.id);
    }

    listOf(entry.paragraphs).forEach((paragraph, paragraphIndex) => {
      if (!isRecord(paragraph)) {
        c.error(
          "story/paragraph",
          `${path}.paragraphs[${paragraphIndex}]`,
          "A paragraph must be an object",
        );
        return;
      }
      if (
        paragraph.styleId !== undefined &&
        (typeof paragraph.styleId !== "string" || !context.styleIds.has(paragraph.styleId))
      ) {
        c.warn(
          "story/style-missing",
          `${path}.paragraphs[${paragraphIndex}].styleId`,
          "The paragraph style does not exist",
        );
      }
      listOf(paragraph.runs).forEach((run, runIndex) => {
        if (!isRecord(run) || typeof run.text !== "string") {
          c.error(
            "story/run",
            `${path}.paragraphs[${paragraphIndex}].runs[${runIndex}]`,
            "A text run needs a string",
          );
        }
      });
    });

    listOf(entry.frames).forEach((frame, frameIndex) => {
      const framePath = `${path}.frames[${frameIndex}]`;
      if (!isRecord(frame)) {
        c.error("story/frame", framePath, "A story frame reference must be an object");
        return;
      }
      const { pageId, objectId } = frame;
      if (typeof pageId !== "string" || !context.pageIds.has(pageId)) {
        c.error("story/frame-page", `${framePath}.pageId`, "The frame's page does not exist");
        return;
      }
      if (typeof objectId !== "string" || !context.objectKinds.has(objectId)) {
        c.error("story/frame-object", `${framePath}.objectId`, "The frame's object does not exist");
        return;
      }
      if (context.objectPages.get(objectId) !== pageId) {
        c.error(
          "story/frame-page-mismatch",
          framePath,
          "The frame object does not live on the referenced page",
        );
      }
      if (context.objectKinds.get(objectId) !== "text-frame") {
        c.error(
          "story/frame-kind",
          framePath,
          "Only text frames can belong to a story",
        );
      }
      if (context.claimedFrames.has(objectId)) {
        c.error(
          "story/frame-claimed",
          framePath,
          "A frame can only belong to one story",
        );
      }
      context.claimedFrames.add(objectId);
    });
  });
}

function validateSpreads(value: unknown, c: Collector, context: Context): void {
  listOf(value).forEach((entry, index) => {
    const path = `spreads[${index}]`;
    if (!isRecord(entry)) {
      c.error("spread/not-object", path, "A spread must be an object");
      return;
    }
    const kind = entry.kind;
    if (kind !== "single" && kind !== "facing") {
      c.error("spread/kind", `${path}.kind`, "A spread is single or facing");
    }
    const pageIds = listOf(entry.pageIds);
    if (kind === "single" && pageIds.length !== 1) {
      c.error("spread/single-pages", `${path}.pageIds`, "A single spread holds exactly one page");
    }
    if (kind === "facing" && pageIds.length !== 2) {
      c.error("spread/facing-pages", `${path}.pageIds`, "A facing spread holds exactly two pages");
    }
    if (entry.gutter !== undefined && (!isFiniteNumber(entry.gutter) || entry.gutter < 0)) {
      c.error("spread/gutter", `${path}.gutter`, "A spread gutter must be non-negative");
    }
    pageIds.forEach((pageId, pageIndex) => {
      if (typeof pageId !== "string") {
        c.error("spread/page-id", `${path}.pageIds[${pageIndex}]`, "A page id must be a string");
        return;
      }
      if (!context.pageIds.has(pageId)) {
        c.error(
          "spread/unknown-page",
          `${path}.pageIds[${pageIndex}]`,
          `Spread references unknown page "${pageId}"`,
        );
      }
      if (context.spreadPageIds.has(pageId)) {
        c.error(
          "spread/duplicate-page",
          `${path}.pageIds[${pageIndex}]`,
          `Page "${pageId}" appears in more than one spread`,
        );
      }
      context.spreadPageIds.add(pageId);
    });
  });

  for (const pageId of context.pageIds) {
    if (!context.spreadPageIds.has(pageId)) {
      c.error(
        "spread/missing-page",
        "spreads",
        `Page "${pageId}" is not placed in any spread`,
      );
    }
  }
}

function validateAssets(value: unknown, c: Collector): void {
  const ids = new Set<string>();
  listOf(value).forEach((entry, index) => {
    const path = `assets[${index}]`;
    if (!isRecord(entry)) {
      c.error("asset/not-object", path, "An asset reference must be an object");
      return;
    }
    if (typeof entry.id !== "string" || entry.id.length === 0) {
      c.error("asset/id", `${path}.id`, "An asset needs a stable id");
    } else if (ids.has(entry.id)) {
      c.error("asset/duplicate-id", `${path}.id`, `Duplicate asset id "${entry.id}"`);
    } else {
      ids.add(entry.id);
    }
    for (const key of ["width", "height"] as const) {
      if (entry[key] !== undefined && (!isFiniteNumber(entry[key]) || (entry[key] as number) < 0)) {
        c.error("asset/size", `${path}.${key}`, `Asset ${key} must be non-negative`);
      }
    }
  });
}

function validateGuides(value: unknown, c: Collector, context: Context): void {
  listOf(value).forEach((entry, index) => {
    const path = `guides[${index}]`;
    if (!isRecord(entry)) {
      c.error("guide/not-object", path, "A guide must be an object");
      return;
    }
    if (entry.axis !== "x" && entry.axis !== "y") {
      c.error("guide/axis", `${path}.axis`, "A guide runs along x or y");
    }
    if (!isFiniteNumber(entry.position)) {
      c.error("guide/position", `${path}.position`, "A guide needs a finite position");
    }
    if (entry.scope !== undefined && entry.scope !== "document" && entry.scope !== "page") {
      c.error("guide/scope", `${path}.scope`, "A guide is document-wide or page-local");
    }
    if (
      entry.scope === "page" &&
      (typeof entry.pageId !== "string" || !context.pageIds.has(entry.pageId))
    ) {
      c.error("guide/page", `${path}.pageId`, "A page guide must reference an existing page");
    }
  });
}

/** All structural problems with a saved document. */
export function validatePublicationDocument(input: unknown): ValidationIssue[] {
  const c = new Collector();
  if (!isRecord(input)) {
    c.error("document/not-object", "", "A publication document must be an object");
    return c.issues;
  }

  if (input.version === undefined) {
    c.warn("document/version-missing", "version", "No schema version; assuming version 1");
  } else if (!isFiniteNumber(input.version) || input.version < 1) {
    c.error("document/version", "version", "The schema version must be a positive number");
  } else if (input.version > PUBLICATION_DOCUMENT_VERSION) {
    c.error(
      "document/version-newer",
      "version",
      `Document version ${input.version} is newer than this build (${PUBLICATION_DOCUMENT_VERSION})`,
    );
  }

  if (typeof input.id !== "string" || input.id.length === 0) {
    c.error("document/id", "id", "The document needs a stable id");
  }
  if (typeof input.title !== "string" || input.title.trim() === "") {
    c.warn("document/title", "title", "The document has no title");
  }
  if (!isDocType(input.docType)) {
    c.error(
      "document/doc-type",
      "docType",
      `Unknown document category; expected one of ${DOC_TYPES.join(", ")}`,
    );
  }
  if (input.displayUnit !== undefined && !isLengthUnit(input.displayUnit)) {
    c.error("document/unit", "displayUnit", "Unknown display unit");
  }
  if (typeof input.facingPages !== "boolean") {
    c.warn("document/facing", "facingPages", "facingPages should be a boolean");
  }

  validateSpec(input.spec, "spec", c, { requireTrim: true });

  if (input.grid !== undefined) {
    const grid = input.grid;
    if (!isRecord(grid)) {
      c.error("grid/not-object", "grid", "The grid must be an object");
    } else {
      if (grid.columns !== undefined && (!isFiniteNumber(grid.columns) || grid.columns < 1)) {
        c.error("grid/columns", "grid.columns", "A grid needs at least one column");
      }
      if (grid.gutter !== undefined && (!isFiniteNumber(grid.gutter) || grid.gutter < 0)) {
        c.error("grid/gutter", "grid.gutter", "The grid gutter must be non-negative");
      }
      if (grid.baseline !== undefined && (!isFiniteNumber(grid.baseline) || grid.baseline < 0)) {
        c.error("grid/baseline", "grid.baseline", "The baseline grid must be non-negative");
      }
    }
  } else {
    c.warn("grid/missing", "grid", `No grid saved; the default ${DEFAULT_GRID.columns}-column grid applies`);
  }

  const context: Context = {
    pageIds: new Set(),
    objectKinds: new Map(),
    objectPages: new Map(),
    objectIds: new Set(),
    storyIds: new Set(),
    styleIds: new Set(),
    assetIds: new Set(),
    claimedFrames: new Set(),
    spreadPageIds: new Set(),
  };

  for (const entry of listOf(input.assets)) {
    if (isRecord(entry) && typeof entry.id === "string") {
      context.assetIds.add(entry.id);
    }
  }

  if (isRecord(input.styles)) {
    for (const entry of listOf(input.styles.paragraph)) {
      if (isRecord(entry) && typeof entry.id === "string") context.styleIds.add(entry.id);
    }
    for (const entry of listOf(input.styles.character)) {
      if (isRecord(entry) && typeof entry.id === "string") context.styleIds.add(entry.id);
    }
  }

  collectStoryIds(input.stories, context);

  const pages = listOf(input.pages);
  if (pages.length === 0) {
    c.error("document/pages", "pages", "A document needs at least one page");
  }

  const facing = input.facingPages === true;
  const masterIds = new Set<string>();
  for (const entry of listOf(input.masters)) {
    if (isRecord(entry) && typeof entry.id === "string") masterIds.add(entry.id);
  }

  pages.forEach((page, index) => {
    validatePage(page, `pages[${index}]`, c, context, facing);
    if (isRecord(page) && page.masterId !== undefined) {
      if (typeof page.masterId !== "string" || !masterIds.has(page.masterId)) {
        c.error(
          "page/master-missing",
          `pages[${index}].masterId`,
          "The page's master does not exist",
        );
      }
    }
  });

  validateMasters(input.masters, c, context);
  validateStories(input.stories, c, context);
  validateSpreads(input.spreads, c, context);
  validateAssets(input.assets, c);
  validateGuides(input.guides, c, context);

  if (input.stories !== undefined && !Array.isArray(input.stories)) {
    c.error("story/list", "stories", "Stories must be an array");
  }

  if (!Array.isArray(input.spreads)) {
    c.error("spread/list", "spreads", "Spreads must be an array");
  }

  return c.issues;
}

/** Throws the first batch of problems, for callers that require a valid doc. */
export function assertValidPublicationDocument(input: unknown): void {
  const issues = validatePublicationDocument(input);
  const errors = issues.filter((issue) => issue.severity === "error");
  if (errors.length === 0) return;
  const lines = errors
    .slice(0, 12)
    .map((issue) => `• ${issue.path || "document"}: ${issue.message}`)
    .join("\n");
  throw new Error(
    `Invalid publication document (${errors.length} error${errors.length === 1 ? "" : "s"}):\n${lines}`,
  );
}

