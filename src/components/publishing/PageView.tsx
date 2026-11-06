import { memo } from "react";

import type { PublicationDocument, PublicationPage } from "@/lib/publishing/model";
import {
  bleedBox,
  columnRects,
  safeBox,
  trimBox,
} from "@/lib/publishing/geometry";
import {
  frameCenter,
  rotatePoint,
} from "@/lib/publishing/object-transform";
import {
  handlePoint,
  RESIZE_HANDLES,
  type ResizeHandle,
} from "@/lib/publishing/canvas";
import type { AssetResolver } from "./ObjectArt";
import { ObjectArt } from "./ObjectArt";

/**
 * One page of the active spread, authored in page points.
 *
 * The page is a single SVG whose viewBox is exactly the page's bleed box, so
 * every coordinate in this component is the model's own — points measured from
 * the page-local top-left. The stage above decides how many screen pixels a
 * point is; this component never does.
 */

export interface PageChrome {
  bleed: boolean;
  margins: boolean;
  grid: boolean;
  columns: boolean;
  baseline: boolean;
  guides: boolean;
}

export const DEFAULT_CHROME: PageChrome = {
  bleed: true,
  margins: true,
  grid: false,
  columns: false,
  baseline: false,
  guides: true,
};

/**
 * Screen hairlines sized in points. A 1pt stroke is invisible at 12% zoom and
 * a slab at 400%, so overlays get `vector-effect: non-scaling-stroke` (SVG)
 * and a hairline thicker than the guide's own 0 weight would suggest: they
 * must stay exactly one screen pixel at every zoom, like ruler marks.
 */
const HAIRLINE = 1;

export interface PageBox {
  left: number;
  top: number;
  width: number;
  height: number;
  /** Screen pixels per point inside this page. */
  scale: number;
}

interface PageViewProps {
  page: PublicationPage;
  document: PublicationDocument;
  box: PageBox;
  chrome: PageChrome;
  /** Object ids drawn as selected. */
  selectedIds: readonly string[];
  /** Handles render on this selected object (the dragged/active one). */
  activeHandleSubject?: string;
  resolveAsset?: AssetResolver;
  /** Editing surface: false in preview mode, so overlays never show handles. */
  editable: boolean;
}

const HANDLE_CURSOR: Record<ResizeHandle, string> = {
  nw: "nwse-resize",
  n: "ns-resize",
  ne: "nesw-resize",
  e: "ew-resize",
  se: "nwse-resize",
  s: "ns-resize",
  sw: "nesw-resize",
  w: "ew-resize",
};

const SELECTION_COLOR = "var(--red, #710014)";

function LayerChrome({ page, document, chrome }: {
  page: PublicationPage;
  document: PublicationDocument;
  chrome: PageChrome;
}) {
  const spec = page.spec;
  const trim = trimBox(spec);
  const bleed = bleedBox(spec);
  return (
    <g pointerEvents="none">
      {chrome.grid && document.grid.enabled ? (
        <>
          {chrome.columns ? (
            <g fill="color-mix(in oklab, var(--ink) 4%, transparent)">
              {columnRects(spec, document.grid, page.side).map((column, index) => (
                <rect
                  key={`col-${index}`}
                  x={column.x}
                  y={column.y}
                  width={column.width}
                  height={column.height}
                />
              ))}
            </g>
          ) : null}
          {document.grid.baseline > 0 && chrome.baseline ? (
            <BaselineRhythm page={page} document={document} />
          ) : null}
        </>
      ) : null}

      {chrome.margins ? (
        (() => {
          const safe = safeBox(spec, page.side);
          return (
            <rect
              x={safe.x}
              y={safe.y}
              width={safe.width}
              height={safe.height}
              fill="none"
              stroke="color-mix(in oklab, #710014 46%, transparent)"
              strokeDasharray="3 3"
              strokeWidth={HAIRLINE}
              vectorEffect="non-scaling-stroke"
            />
          );
        })()
      ) : null}

      {/* Paper edge (trim) always, and the cut line around the bleed on demand. */}
      <rect
        x={trim.x}
        y={trim.y}
        width={trim.width}
        height={trim.height}
        fill="none"
        stroke="color-mix(in oklab, var(--ink) 55%, transparent)"
        strokeWidth={HAIRLINE}
        vectorEffect="non-scaling-stroke"
      />
      {chrome.bleed ? (
        <rect
          x={bleed.x}
          y={bleed.y}
          width={bleed.width}
          height={bleed.height}
          fill="none"
          stroke="color-mix(in oklab, var(--ink) 30%, transparent)"
          strokeWidth={HAIRLINE}
          strokeDasharray="6 4"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}

      {chrome.guides ? <GuideRuler page={page} document={document} /> : null}
    </g>
  );
}

function BaselineRhythm({
  page,
  document,
}: {
  page: PublicationPage;
  document: PublicationDocument;
}) {
  const safe = safeBox(page.spec, page.side);
  const rhythm = document.grid.baseline;
  const step = Math.max(4, rhythm);
  const lines: number[] = [];
  for (let y = safe.y; y <= safe.y + safe.height + 0.05; y += step) {
    lines.push(Math.round(y * 100) / 100);
  }
  return (
    <g
      strokeWidth={HAIRLINE / 2}
      stroke="color-mix(in oklab, var(--ink) 9%, transparent)"
      vectorEffect="non-scaling-stroke"
    >
      {lines.map((y) => (
        <line
          key={`base-${y}`}
          x1={safe.x}
          x2={safe.x + safe.width}
          y1={y}
          y2={y}
        />
      ))}
    </g>
  );
}

/** Document guides cross every page; page guides belong to one. */
function GuideRuler({
  page,
  document,
}: {
  page: PublicationPage;
  document: PublicationDocument;
}) {
  const bleed = bleedBox(page.spec);
  const lines = document.guides.filter(
    (guide) => guide.scope === "document" || guide.pageId === page.id,
  );
  const color = "var(--gold, #b08d57)";
  return (
    <g
      pointerEvents="none"
      stroke={color}
      strokeWidth={HAIRLINE}
      vectorEffect="non-scaling-stroke"
      opacity={0.85}
    >
      {lines.map((guide) => (
        <line
          key={`${guide.id}`}
          x1={guide.axis === "x" ? guide.position : bleed.x}
          x2={guide.axis === "x" ? guide.position : bleed.x + bleed.width}
          y1={guide.axis === "y" ? guide.position : bleed.y}
          y2={guide.axis === "y" ? guide.position : bleed.y + bleed.height}
          strokeDasharray="4 3"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
}

const PageSurface = memo(function PageSurface({
  page,
  document,
  chrome,
  resolveAsset,
}: {
  page: PublicationPage;
  document: PublicationDocument;
  chrome: PageChrome;
  resolveAsset?: AssetResolver;
}) {
  const bleed = bleedBox(page.spec);
  return (
    <g pointerEvents="none">
      <rect
        x={bleed.x}
        y={bleed.y}
        width={bleed.width}
        height={bleed.height}
        fill={page.background.color || "#ffffff"}
      />
      {page.background.assetId && resolveAsset
        ? (() => {
            const asset = resolveAsset(page.background.assetId);
            return asset?.url ? (
              <image
                href={asset.url}
                x={bleed.x}
                y={bleed.y}
                width={bleed.width}
                height={bleed.height}
                preserveAspectRatio="xMidYMid slice"
              />
            ) : null;
          })()
        : null}
      {/* Paint order is layers then objects, bottom to top, exactly as stored. */}
      {page.objects
        .filter((object) => !object.hidden)
        .map((object) => (
          <ObjectArt
            key={object.id}
            object={object}
            document={document}
            resolveAsset={resolveAsset}
          />
        ))}
      <LayerChrome page={page} document={document} chrome={chrome} />
    </g>
  );
});

const SelectionArt = memo(function SelectionArt({
  page,
  selectedIds,
  activeHandleSubject,
  scale,
  editable,
}: {
  page: PublicationPage;
  selectedIds: readonly string[];
  activeHandleSubject?: string;
  scale: number;
  editable: boolean;
}) {
  if (selectedIds.length === 0) return null;
  const wanted = new Set(selectedIds);
  const selected = page.objects.filter((object) => wanted.has(object.id));
  if (selected.length === 0) return null;

  return (
    <g fill="none" stroke={SELECTION_COLOR} pointerEvents="none">
      {selected.map((object) => (
        <SelectionBox
          key={`sel-${object.id}`}
          objectId={object.id}
          objects={page.objects}
          withHandles={editable && activeHandleSubject === object.id}
          scale={scale}
          rotation={object.frame.rotation}
        />
      ))}
    </g>
  );
});

function SelectionBox({
  objects,
  objectId,
  withHandles,
  scale,
  rotation,
}: {
  objects: PublicationPage["objects"];
  objectId: string;
  withHandles: boolean;
  scale: number;
  rotation: number;
}) {
  const object = objects.find((entry) => entry.id === objectId);
  if (!object) return null;
  const { frame } = object;
  const center = frameCenter(frame);
  const stroke = SELECTION_COLOR;
  // Handles stay ~7px on the glass: size shrinks as the view zooms in.
  const size = Math.max(4, 7 / Math.max(0.05, scale));
  const half = size / 2;
  const grip = rotatePoint(
    { x: frame.x + frame.width / 2, y: frame.y - 16 / Math.max(0.05, scale) },
    center,
    rotation,
  );
  return (
    <g>
      <rect
        x={frame.x}
        y={frame.y}
        width={frame.width}
        height={frame.height}
        transform={
          rotation === 0
            ? undefined
            : `rotate(${rotation} ${center.x} ${center.y})`
        }
        stroke={stroke}
        strokeWidth={HAIRLINE}
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
      />
      {withHandles ? (
        <g>
          {RESIZE_HANDLES.map((handle) => {
            const point = rotatePoint(
              handlePoint(frame, handle),
              center,
              rotation,
            );
            return (
              <rect
                key={handle}
                data-handle={handle}
                x={point.x - half}
                y={point.y - half}
                width={size}
                height={size}
                fill="#ffffff"
                stroke={stroke}
                strokeWidth={HAIRLINE}
                vectorEffect="non-scaling-stroke"
                style={{
                  cursor: HANDLE_CURSOR[handle],
                  pointerEvents: "auto",
                }}
                transform={
                  rotation === 0
                    ? undefined
                    : `rotate(${rotation} ${point.x} ${point.y})`
                }
              />
            );
          })}
          <circle
            data-handle="rotate"
            cx={grip.x}
            cy={grip.y}
            r={half}
            fill="#ffffff"
            stroke={stroke}
            strokeWidth={HAIRLINE}
            vectorEffect="non-scaling-stroke"
            style={{ cursor: "grab", pointerEvents: "auto" }}
          />
        </g>
      ) : null}
    </g>
  );
}

/**
 * One page, at any zoom, with all chrome drawn in page points. The stage
 * positions it with CSS; the viewBox does every unit conversion.
 */
export const PageView = memo(function PageView({
  page,
  document,
  box,
  chrome,
  selectedIds,
  activeHandleSubject,
  resolveAsset,
  editable,
}: PageViewProps) {
  const bleed = bleedBox(page.spec);
  return (
    <svg
      width={bleed.width}
      height={bleed.height}
      viewBox={`${bleed.x} ${bleed.y} ${bleed.width} ${bleed.height}`}
      style={{
        position: "absolute",
        left: box.left,
        top: box.top,
        width: Math.round(bleed.width * box.scale),
        height: Math.round(bleed.height * box.scale),
        pointerEvents: "none",
        userSelect: "none",
      }}
      data-page-id={page.id}
    >
      {!page.hidden ? (
        <PageSurface
          page={page}
          document={document}
          chrome={chrome}
          resolveAsset={resolveAsset}
        />
      ) : null}
      {selectedIds.length > 0 ? (
        <SelectionArt
          page={page}
          selectedIds={selectedIds}
          activeHandleSubject={activeHandleSubject}
          scale={box.scale}
          editable={editable}
        />
      ) : null}
    </svg>
  );
});
