/**
 * Turning a library asset into a publication object.
 *
 * An element becomes a normal `shape` object whose `path` is already in page
 * points. That single decision buys selection, move, resize, rotation,
 * layering, grouping, duplicate, undo/redo, autosave and vector PDF output from
 * machinery the editor already has — no parallel "library object" model.
 */

import type { AssetGeometry } from "@/lib/library/types";
import { placePathInFrame, scaledStrokeWidth, transformPathData } from "@/lib/library/catalog";
import { createShape } from "./factory";
import type { ObjectFrame, ShapeObject } from "./model";

/** Ink used for a freshly inserted asset; editable in the inspector. */
export const ELEMENT_INK = "#1c1b18";

export interface ElementAsset extends AssetGeometry {
  id: string;
  name: string;
}

export interface ElementFrameOptions {
  layerId: string;
  frame: ObjectFrame;
  asset: ElementAsset;
  fill?: string;
  stroke?: string;
}

/**
 * Creates the shape object for an inserted element. The path is baked into the
 * frame's page coordinates so the object renders identically in the editor,
 * thumbnails and PDF.
 */
export function elementShape({
  layerId,
  frame,
  asset,
  fill = ELEMENT_INK,
  stroke = ELEMENT_INK,
}: ElementFrameOptions): ShapeObject {
  const isStroke = asset.ink === "stroke";
  return createShape({
    layerId,
    x: frame.x,
    y: frame.y,
    width: frame.width,
    height: frame.height,
    rotation: frame.rotation,
    shape: "path",
    path: placePathInFrame(asset.d, frame),
    fill: isStroke ? undefined : fill,
    stroke: isStroke ? stroke : undefined,
    strokeWidth: isStroke ? scaledStrokeWidth(asset, frame) : 0,
    opacity: asset.opacity,
    name: asset.name,
  });
}

/**
 * Mirrors a shape's path inside its own frame. Because the path is the only
 * copy of the artwork, flip is a real geometry edit and undoes like one.
 */
export function flipShapePath(object: ShapeObject, axis: "x" | "y"): string | undefined {
  if (object.shape !== "path" || !object.path) return object.path;
  const { x, y, width, height } = object.frame;
  return transformPathData(object.path, (px, py) =>
    axis === "x" ? [x * 2 + width - px, py] : [px, y * 2 + height - py],
  );
}

/** True when the path looks like something the shape inspector can flip. */
export function isPathShape(object: { kind: string; shape?: string; path?: string }) {
  return object.kind === "shape" && object.shape === "path" && Boolean(object.path);
}
