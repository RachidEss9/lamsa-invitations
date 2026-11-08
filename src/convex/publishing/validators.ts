import { v } from "convex/values";

/**
 * Convex-side validators for publishing rows.
 *
 * These mirror the Phase 1 model. Object payloads stay extensible (a newer
 * object kind is normalised to `generic` by the foundation), so the object
 * validator declares every field the current engine understands plus a `data`
 * bag; semantic validation still runs through `validatePublicationDocument`
 * before anything is written. No critical row is accepted on `v.any()` alone.
 */

export const docTypeValidator = v.union(
  v.literal("album"),
  v.literal("magazine"),
  v.literal("catalogue"),
  v.literal("book"),
  v.literal("brochure"),
  v.literal("portfolio"),
  v.literal("menu"),
  v.literal("custom"),
);

export const publicationStatusValidator = v.union(
  v.literal("draft"),
  v.literal("archived"),
);

export const lengthUnitValidator = v.union(
  v.literal("pt"),
  v.literal("mm"),
  v.literal("cm"),
  v.literal("in"),
);

export const sizeValidator = v.object({
  width: v.number(),
  height: v.number(),
});

export const edgesValidator = v.object({
  top: v.number(),
  right: v.number(),
  bottom: v.number(),
  left: v.number(),
});

export const pageSpecValidator = v.object({
  trim: sizeValidator,
  bleed: v.number(),
  margins: edgesValidator,
  mirrorMargins: v.boolean(),
});

export const gridValidator = v.object({
  enabled: v.boolean(),
  columns: v.number(),
  gutter: v.number(),
  baseline: v.number(),
});

export const backgroundValidator = v.object({
  color: v.string(),
  assetId: v.optional(v.string()),
});

export const layerValidator = v.object({
  id: v.string(),
  name: v.string(),
  locked: v.boolean(),
  hidden: v.boolean(),
  printable: v.boolean(),
  color: v.optional(v.string()),
});

export const frameValidator = v.object({
  x: v.number(),
  y: v.number(),
  width: v.number(),
  height: v.number(),
  rotation: v.number(),
});

/**
 * One object. Kind-specific fields are optional here because the union is
 * validated semantically per kind in the foundation; the storage shape stays
 * one validator so a page row does not need a five-way union.
 */
export const objectValidator = v.object({
  version: v.number(),
  id: v.string(),
  kind: v.union(
    v.literal("text-frame"),
    v.literal("image-frame"),
    v.literal("shape"),
    v.literal("line"),
    v.literal("generic"),
  ),
  name: v.string(),
  layerId: v.string(),
  frame: frameValidator,
  locked: v.boolean(),
  hidden: v.boolean(),
  opacity: v.number(),
  groupId: v.optional(v.string()),
  styleId: v.optional(v.string()),

  // Text frame.
  storyId: v.optional(v.string()),
  columns: v.optional(v.number()),
  gutter: v.optional(v.number()),
  inset: v.optional(edgesValidator),
  verticalAlign: v.optional(
    v.union(v.literal("top"), v.literal("middle"), v.literal("bottom")),
  ),
  overflow: v.optional(
    v.union(v.literal("clip"), v.literal("thread"), v.literal("shrink")),
  ),
  fitToFrame: v.optional(v.boolean()),

  // Image frame.
  assetId: v.optional(v.string()),
  fit: v.optional(
    v.union(v.literal("fill"), v.literal("fit"), v.literal("stretch")),
  ),
  crop: v.optional(
    v.object({
      scale: v.number(),
      offsetX: v.number(),
      offsetY: v.number(),
      normalized: v.optional(v.boolean()),
      rotation: v.optional(v.number()),
    }),
  ),
  focal: v.optional(v.object({ x: v.number(), y: v.number() })),
  mask: v.optional(
    v.union(v.literal("rect"), v.literal("ellipse"), v.literal("path")),
  ),
  maskPath: v.optional(v.string()),

  // Shape.
  shape: v.optional(
    v.union(
      v.literal("rectangle"),
      v.literal("ellipse"),
      v.literal("polygon"),
      v.literal("path"),
    ),
  ),
  path: v.optional(v.string()),
  sides: v.optional(v.number()),
  fill: v.optional(v.string()),
  stroke: v.optional(v.string()),
  strokeWidth: v.optional(v.number()),
  cornerRadius: v.optional(v.number()),

  // Line.
  cap: v.optional(
    v.union(v.literal("butt"), v.literal("round"), v.literal("square")),
  ),
  dash: v.optional(v.array(v.number())),

  // Generic / forward-compatible.
  originalKind: v.optional(v.string()),
  data: v.optional(v.any()),
});

export const guideValidator = v.object({
  id: v.string(),
  axis: v.union(v.literal("x"), v.literal("y")),
  position: v.number(),
  scope: v.union(v.literal("document"), v.literal("page")),
  pageId: v.optional(v.string()),
});

const textAlignValidator = v.union(
  v.literal("left"),
  v.literal("center"),
  v.literal("right"),
  v.literal("justify"),
);

const textDirectionValidator = v.union(
  v.literal("ltr"),
  v.literal("rtl"),
  v.literal("auto"),
);

const fontWeightValidator = v.optional(v.number());
const fontStyleValidator = v.optional(
  v.union(v.literal("normal"), v.literal("italic")),
);

export const characterFormatValidator = v.object({
  fontId: v.optional(v.string()),
  size: v.optional(v.number()),
  fontWeight: fontWeightValidator,
  fontStyle: fontStyleValidator,
  color: v.optional(v.string()),
  opacity: v.optional(v.number()),
  tracking: v.optional(v.number()),
  leading: v.optional(v.number()),
  underline: v.optional(v.boolean()),
  strikethrough: v.optional(v.boolean()),
  baseline: v.optional(
    v.union(v.literal("normal"), v.literal("super"), v.literal("sub")),
  ),
});

export const paragraphFormatValidator = v.object({
  fontId: v.optional(v.string()),
  size: v.optional(v.number()),
  fontWeight: fontWeightValidator,
  fontStyle: fontStyleValidator,
  color: v.optional(v.string()),
  leading: v.optional(v.number()),
  tracking: v.optional(v.number()),
  alignment: v.optional(textAlignValidator),
  direction: v.optional(textDirectionValidator),
  spaceBefore: v.optional(v.number()),
  spaceAfter: v.optional(v.number()),
  firstLineIndent: v.optional(v.number()),
  leftIndent: v.optional(v.number()),
  rightIndent: v.optional(v.number()),
  hyphenate: v.optional(v.boolean()),
});

export const paragraphStyleValidator = v.object({
  id: v.string(),
  name: v.string(),
  fontId: v.string(),
  size: v.number(),
  leading: v.number(),
  tracking: v.number(),
  alignment: textAlignValidator,
  direction: v.optional(textDirectionValidator),
  spaceBefore: v.number(),
  spaceAfter: v.number(),
  firstLineIndent: v.number(),
  leftIndent: v.optional(v.number()),
  rightIndent: v.optional(v.number()),
  fontWeight: fontWeightValidator,
  fontStyle: fontStyleValidator,
  color: v.optional(v.string()),
  hyphenate: v.boolean(),
});

export const characterStyleValidator = v.object({
  id: v.string(),
  name: v.string(),
  ...characterFormatValidator.fields,
});

export const styleSetValidator = v.object({
  paragraph: v.array(paragraphStyleValidator),
  character: v.array(characterStyleValidator),
});

export const textRunValidator = v.object({
  text: v.string(),
  styleId: v.optional(v.string()),
  format: v.optional(characterFormatValidator),
});

export const storyParagraphValidator = v.object({
  id: v.string(),
  styleId: v.optional(v.string()),
  format: v.optional(paragraphFormatValidator),
  runs: v.array(textRunValidator),
});

export const storyFrameValidator = v.object({
  pageId: v.string(),
  objectId: v.string(),
});

export const storyValidator = v.object({
  version: v.number(),
  id: v.string(),
  name: v.string(),
  paragraphs: v.array(storyParagraphValidator),
  frames: v.array(storyFrameValidator),
  overflow: v.union(v.literal("thread"), v.literal("stop")),
});

/** One page's deviation from a master object; only listed keys differ. */
export const masterObjectOverrideValidator = v.object({
  objectId: v.string(),
  hidden: v.optional(v.boolean()),
  frame: v.optional(frameValidator),
  opacity: v.optional(v.number()),
});

export const publicationPageValidator = v.object({
  version: v.number(),
  id: v.string(),
  name: v.string(),
  side: v.union(v.literal("left"), v.literal("right"), v.literal("single")),
  masterId: v.optional(v.string()),
  masterOverrides: v.optional(v.array(masterObjectOverrideValidator)),
  spec: pageSpecValidator,
  background: backgroundValidator,
  layers: v.array(layerValidator),
  objects: v.array(objectValidator),
  hidden: v.boolean(),
});

export const masterPageValidator = v.object({
  version: v.number(),
  id: v.string(),
  name: v.string(),
  description: v.optional(v.string()),
  appliesTo: v.union(v.literal("left"), v.literal("right"), v.literal("both")),
  spec: v.optional(pageSpecValidator),
  background: backgroundValidator,
  layers: v.array(layerValidator),
  objects: v.array(objectValidator),
});

export const documentMetadataValidator = v.object({
  author: v.optional(v.string()),
  client: v.optional(v.string()),
  jobNumber: v.optional(v.string()),
  language: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const spreadGutterValidator = v.object({
  firstPageId: v.string(),
  gutter: v.number(),
});

/** Writable publication settings shared by create and update. */
export const publicationSettingsValidator = v.object({
  title: v.optional(v.string()),
  docType: v.optional(docTypeValidator),
  presetId: v.optional(v.string()),
  displayUnit: v.optional(lengthUnitValidator),
  spec: v.optional(pageSpecValidator),
  facingPages: v.optional(v.boolean()),
  defaultGutter: v.optional(v.number()),
  grid: v.optional(gridValidator),
  guides: v.optional(v.array(guideValidator)),
  metadata: v.optional(documentMetadataValidator),
});

export const versionSettingsValidator = v.object({
  title: v.string(),
  docType: docTypeValidator,
  presetId: v.string(),
  displayUnit: lengthUnitValidator,
  spec: pageSpecValidator,
  facingPages: v.boolean(),
  defaultGutter: v.number(),
  spreadGutters: v.array(spreadGutterValidator),
  grid: gridValidator,
  styles: styleSetValidator,
  guides: v.array(guideValidator),
  metadata: documentMetadataValidator,
  extensions: v.optional(v.any()),
});

export const assetTagsValidator = v.array(v.string());

export const assetMetadataValidator = v.object({
  caption: v.optional(v.string()),
  alt: v.optional(v.string()),
  license: v.optional(v.string()),
  notes: v.optional(v.string()),
});

export const presetPayloadValidator = v.object({
  size: sizeValidator,
  unit: lengthUnitValidator,
  bleed: v.number(),
  margins: edgesValidator,
  mirrorMargins: v.boolean(),
  facingPages: v.boolean(),
  grid: gridValidator,
  defaultPageCount: v.number(),
});
