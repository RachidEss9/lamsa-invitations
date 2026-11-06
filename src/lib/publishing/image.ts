/**
 * Image placement and cropping geometry.
 *
 * Frame geometry and image geometry are deliberately separate. The frame is
 * still the object's `frame`; a crop only describes how the source artwork is
 * positioned inside that fixed window. Every crop value is normalised:
 *
 * - `scale` is a zoom relative to contain/cover, independent of pixels.
 * - `offsetX/Y` are fractions of the frame width/height.
 * - `rotation` is degrees around the artwork centre.
 * - `focal` is the source point (0–1) the designer wants at the frame centre.
 *
 * That makes a crop render identically at fit-to-screen, 400% zoom, thumbnail
 * size and print output without consulting the screen. Older image frames
 * without `normalized` keep a centred fit rather than treating legacy point
 * offsets as fractions.
 */

import type {
  ImageCrop,
  ImageFit,
  ImageFrameObject,
  ObjectFrame,
  Point,
} from "./model";
import { normalizeAngle } from "./object-transform";

export interface ImageSource {
  width: number;
  height: number;
}

export interface ResolvedCrop {
  zoom: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
  /** True when offsets are fractions rather than legacy point values. */
  normalized: boolean;
}

export interface ImagePlacement {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  centerX: number;
  centerY: number;
}

export const IMAGE_ZOOM_MIN = 0.1;
export const IMAGE_ZOOM_MAX = 8;
export const IMAGE_CROP_DEFAULT: ImageCrop = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  normalized: true,
  rotation: 0,
};

function finite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

/** A stored crop as numeric, safe placement values. */
export function resolveImageCrop(crop: ImageCrop | undefined): ResolvedCrop {
  return {
    zoom: clamp(finite(crop?.scale ?? 1, 1), IMAGE_ZOOM_MIN, IMAGE_ZOOM_MAX),
    offsetX: clamp(finite(crop?.offsetX ?? 0, 0), -10, 10),
    offsetY: clamp(finite(crop?.offsetY ?? 0, 0), -10, 10),
    rotation: normalizeAngle(finite(crop?.rotation ?? 0, 0)),
    normalized: crop?.normalized === true,
  };
}

export function defaultImageCrop(rotation = 0): ImageCrop {
  return {
    ...IMAGE_CROP_DEFAULT,
    rotation: normalizeAngle(rotation),
  };
}

export function resetImageCrop(fit: ImageFit): ImageCrop {
  void fit;
  return defaultImageCrop();
}

export function cropIsDefault(crop: ImageCrop | undefined): boolean {
  const resolved = resolveImageCrop(crop);
  return (
    Math.abs(resolved.zoom - 1) < 1e-6 &&
    Math.abs(resolved.offsetX) < 1e-6 &&
    Math.abs(resolved.offsetY) < 1e-6 &&
    Math.abs(resolved.rotation) < 1e-6
  );
}

function sourceAspect(asset: ImageSource | undefined, frame: ObjectFrame): number {
  if (asset && asset.width > 0 && asset.height > 0) {
    return asset.width / asset.height;
  }
  return frame.width / Math.max(0.5, frame.height);
}

/**
 * The unrotated image size at zoom 1. Contain shows the whole source; cover
 * grows it until both frame axes are filled. Stretch is retained only so old
 * documents render exactly as they did, and is never a new-frame default.
 */
export function imageBaseline(
  frame: ObjectFrame,
  asset: ImageSource | undefined,
  fit: ImageFit,
): { width: number; height: number } {
  const frameWidth = Math.max(0.5, frame.width);
  const frameHeight = Math.max(0.5, frame.height);
  const aspect = Math.max(0.001, sourceAspect(asset, frame));
  const frameAspect = frameWidth / frameHeight;

  if (fit === "stretch") {
    return { width: frameWidth, height: frameHeight };
  }
  if (fit === "fit") {
    return aspect >= frameAspect
      ? { width: frameWidth, height: frameWidth / aspect }
      : { width: frameHeight * aspect, height: frameHeight };
  }
  // Cover is the default for new placements.
  return aspect >= frameAspect
    ? { width: frameHeight * aspect, height: frameHeight }
    : { width: frameWidth, height: frameWidth / aspect };
}

/** Rotated bounding-box size for an image rectangle. */
export function rotatedImageSize(
  width: number,
  height: number,
  rotation: number,
): { width: number; height: number } {
  const radians = (rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  return {
    width: width * cos + height * sin,
    height: width * sin + height * cos,
  };
}

/**
 * Resolve one image frame to an SVG rectangle in page points. The returned
 * rectangle never exposes a blank edge for cover/custom crops; a contain crop
 * stays centred and inside the frame.
 */
export function imagePlacement(
  frame: ObjectFrame,
  asset: ImageSource | undefined,
  fit: ImageFit,
  crop: ImageCrop | undefined,
  focal: Point | undefined,
): ImagePlacement {
  const frameWidth = Math.max(0.5, frame.width);
  const frameHeight = Math.max(0.5, frame.height);
  const resolved = resolveImageCrop(crop);
  const base = imageBaseline(frame, asset, fit);

  let width = base.width * resolved.zoom;
  let height = base.height * resolved.zoom;

  // Rotating a cover crop would expose corners, so grow just enough to keep
  // the rotated bounding box covering the frame. Contain keeps its breathing
  // room because showing the complete image is the point of that mode.
  if (fit !== "fit" && Math.abs(resolved.rotation) > 1e-6) {
    const rotated = rotatedImageSize(width, height, resolved.rotation);
    const coverBoost = Math.max(1, frameWidth / rotated.width, frameHeight / rotated.height);
    width *= coverBoost;
    height *= coverBoost;
  }

  const focus = {
    x: clamp01(focal?.x ?? 0.5),
    y: clamp01(focal?.y ?? 0.5),
  };
  const offsetX = resolved.normalized ? resolved.offsetX : 0;
  const offsetY = resolved.normalized ? resolved.offsetY : 0;
  const centerX = frame.x + frameWidth / 2;
  const centerY = frame.y + frameHeight / 2;

  let x = centerX + (0.5 - focus.x) * width + offsetX * frameWidth - width / 2;
  let y = centerY + (0.5 - focus.y) * height + offsetY * frameHeight - height / 2;

  // Never show paper through a cover/custom crop. Small images in contain mode
  // are simply centred.
  x =
    width <= frameWidth
      ? frame.x + (frameWidth - width) / 2
      : clamp(x, frame.x + frameWidth - width, frame.x);
  y =
    height <= frameHeight
      ? frame.y + (frameHeight - height) / 2
      : clamp(y, frame.y + frameHeight - height, frame.y);

  return {
    x,
    y,
    width,
    height,
    rotation: resolved.rotation,
    centerX: x + width / 2,
    centerY: y + height / 2,
  };
}

/** Drag the artwork inside a fixed frame. */
export function panImageCrop(
  frame: ObjectFrame,
  crop: ImageCrop | undefined,
  dx: number,
  dy: number,
): ImageCrop {
  const current = resolveImageCrop(crop);
  const frameWidth = Math.max(0.5, frame.width);
  const frameHeight = Math.max(0.5, frame.height);
  return {
    scale: current.zoom,
    offsetX: clamp(current.offsetX + dx / frameWidth, -10, 10),
    offsetY: clamp(current.offsetY + dy / frameHeight, -10, 10),
    normalized: true,
    rotation: current.rotation,
  };
}

export function zoomImageCrop(
  crop: ImageCrop | undefined,
  zoom: number,
): ImageCrop {
  const current = resolveImageCrop(crop);
  return {
    scale: clamp(finite(zoom, 1), IMAGE_ZOOM_MIN, IMAGE_ZOOM_MAX),
    offsetX: current.offsetX,
    offsetY: current.offsetY,
    normalized: true,
    rotation: current.rotation,
  };
}

export function rotateImageCrop(
  crop: ImageCrop | undefined,
  rotation: number,
): ImageCrop {
  const current = resolveImageCrop(crop);
  return {
    scale: current.zoom,
    offsetX: current.offsetX,
    offsetY: current.offsetY,
    normalized: true,
    rotation: normalizeAngle(rotation),
  };
}

/**
 * The three presentation modes the inspector exposes. `fill` is cover, `fit`
 * is contain, and custom is an explicitly non-default crop built on cover.
 */
export type ImageCropMode = "contain" | "cover" | "custom";

export function imageCropMode(
  fit: ImageFit,
  crop: ImageCrop | undefined,
): ImageCropMode {
  if (!cropIsDefault(crop)) return "custom";
  if (fit === "stretch") return "custom";
  return fit === "fit" ? "contain" : "cover";
}

export function cropForMode(
  mode: ImageCropMode,
  current?: ImageCrop,
): { fit: ImageFit; crop: ImageCrop } {
  if (mode === "contain") {
    return { fit: "fit", crop: defaultImageCrop() };
  }
  if (mode === "cover") {
    return { fit: "fill", crop: defaultImageCrop() };
  }
  return {
    fit: "fill",
    crop: {
      ...defaultImageCrop(current?.rotation ?? 0),
      normalized: true,
    },
  };
}

/** Image rendering facts shared by the canvas and thumbnails. */
export function imageRenderFacts(
  object: ImageFrameObject,
  asset: ImageSource | undefined,
): ImagePlacement {
  return imagePlacement(object.frame, asset, object.fit, object.crop, object.focal);
}

/** The uncommitted state shown while the crop tool is open. */
export interface ImageCropDraft {
  fit: ImageFit;
  crop: ImageCrop;
  focal: Point;
}

export function cropDraftFor(object: ImageFrameObject): ImageCropDraft {
  const legacy = object.crop.normalized !== true;
  return {
    fit: object.fit,
    crop: {
      ...defaultImageCrop(object.crop.rotation ?? 0),
      scale: object.crop.scale,
      // Legacy offsets were points from a renderer that ignored them. Start
      // those frames centred rather than reinterpreting the old number as a
      // frame-sized displacement.
      offsetX: legacy ? 0 : object.crop.offsetX,
      offsetY: legacy ? 0 : object.crop.offsetY,
      normalized: true,
    },
    focal: object.focal ?? { x: 0.5, y: 0.5 },
  };
}

