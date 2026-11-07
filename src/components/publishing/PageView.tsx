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
import { estimateOverflow, resolveThread } from "@/lib/publishing/typography";
import {
  masterBackgroundFor,
  masterForPage,
  masterObjectsForPage,
} from "@/lib/publishing/masters";

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
  /** The frame with an open native text editor, if any. */
  editingObjectId?: string;
  /** The image frame whose crop draft is being edited. */
  cropObjectId?: string;
  /** An image frame currently under an artwork drag. */
  dropTargetId?: string;
  onTextDraft?: (objectId: string, text: string) => void;
  onTextEnd?: () => void;
  onTextSelection?: (objectId: string, start: number, end: number) => void;
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
  editingObjectId,
  onTextDraft,
  onTextEnd,
  onTextSelection,
}: {
  page: PublicationPage;
  document: PublicationDocument;
  chrome: PageChrome;
  resolveAsset?: AssetResolver;
  editingObjectId?: string;
  onTextDraft?: (objectId: string, text: string) => void;
  onTextEnd?: () => void;
  onTextSelection?: (objectId: string, start: number, end: number) => void;
}) {
  const bleed = bleedBox(page.spec);
  // Inheritance is resolved at paint time, never copied into the page: one
  // master edit repaints every page that uses it.
  const master = masterForPage(document, page);
  const masterObjects = masterObjectsForPage(page, master);
  const masterBackground = masterBackgroundFor(master);
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
      {/*
        Master paint order, then the page's own: master background, master
        objects (bottom to top), then the page's objects (bottom to top). The
        page paper above is the sheet itself, so it never covers furniture.
      */}
      {masterBackground ? (
        <g data-master={master?.id} data-master-background="true">
          <rect
            x={bleed.x}
            y={bleed.y}
            width={bleed.width}
            height={bleed.height}
            fill={masterBackground.color || "transparent"}
          />
          {masterBackground.assetId && resolveAsset
            ? (() => {
                const asset = resolveAsset(masterBackground.assetId);
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
        </g>
      ) : null}
      {masterObjects.length > 0 ? (
        <g data-master={master?.id} data-master-objects="true">
          {masterObjects.map((object) => (
            <ObjectArt
              key={`master-${object.id}`}
              object={object}
              document={document}
              resolveAsset={resolveAsset}
            />
          ))}
        </g>
      ) : null}
      {/* Paint order is layers then objects, bottom to top, exactly as stored. */}
      {page.objects
        .filter((object) => !object.hidden)
        .map((object) => (
          <ObjectArt
            key={object.id}
            object={object}
            document={document}
            resolveAsset={resolveAsset}
            editing={editingObjectId === object.id}
            onTextDraft={
              onTextDraft
                ? (text) => onTextDraft(object.id, text)
                : undefined
            }
            onTextEnd={onTextEnd}
            onTextSelection={
              onTextSelection
                ? (start, end) => onTextSelection(object.id, start, end)
                : undefined
            }
          />
        ))}
      <TextOverflowMarkers page={page} document={document} />
      <LayerChrome page={page} document={document} chrome={chrome} />
    </g>
  );
});

/**
 * Overflow is marked on the frame that runs out of room, not on every frame
 * in the thread. The inspector reports the exact estimate; this badge keeps
 * the problem visible at any zoom without covering the text.
 */
const TextOverflowMarkers = memo(function TextOverflowMarkers({
  page,
  document,
}: {
  page: PublicationPage;
  document: PublicationDocument;
}) {
  const markers = page.objects.flatMap((object) => {
    if (object.kind !== "text-frame" || !object.storyId) return [];
    const story = document.stories.find((entry) => entry.id === object.storyId);
    if (!story) return [];
    const thread = resolveThread(document, story);
    const estimate = estimateOverflow(
      document,
      story,
      thread.map((entry) => entry.frame),
    );
    if (!estimate.overflowing || estimate.hiddenCharacters <= 0) return [];
    if (estimate.overflowFrame === null) return [];
    if (thread[estimate.overflowFrame]?.objectId !== object.id) return [];
    return [{ object, estimate }];
  });
  return (
    <g pointerEvents="none">
      {markers.map(({ object, estimate }) => {
        const x = object.frame.x + object.frame.width - 2;
        const y = object.frame.y + 2;
        return (
          <g
            key={`overflow-${object.id}`}
            data-overflow-frame={object.id}
            transform={`rotate(${object.frame.rotation} ${object.frame.x + object.frame.width / 2} ${object.frame.y + object.frame.height / 2})`}
          >
            <title>
              {`${estimate.hiddenCharacters} characters do not fit in this thread`}
            </title>
            <path
              d={`M ${x} ${y} h -10 l 10 10 z`}
              fill="var(--red, #710014)"
              stroke="#ffffff"
              strokeWidth={1.5}
            />
          </g>
        );
      })}
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
  editingObjectId,
  cropObjectId,
  dropTargetId,
  onTextDraft,
  onTextEnd,
  onTextSelection,
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
          editingObjectId={editingObjectId}
          onTextDraft={onTextDraft}
          onTextEnd={onTextEnd}
          onTextSelection={onTextSelection}
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
      {cropObjectId ? (
        <CropArt page={page} objectId={cropObjectId} scale={box.scale} />
      ) : null}
      {dropTargetId ? (
        <DropTargetArt page={page} objectId={dropTargetId} />
      ) : null}
    </svg>
  );
});

/** Crop boundaries stay visually distinct from selection: rule-of-thirds
 * guides, corner brackets and a red/white dashed frame. */
const CropArt = memo(function CropArt({
  page,
  objectId,
  scale,
}: {
  page: PublicationPage;
  objectId: string;
  scale: number;
}) {
  const object = page.objects.find((entry) => entry.id === objectId);
  if (!object || object.kind !== "image-frame") return null;
  const { frame } = object;
  const center = frameCenter(frame);
  const thirdX = frame.width / 3;
  const thirdY = frame.height / 3;
  const grip = Math.min(18, 11 / Math.max(0.08, scale));
  const inset = Math.min(grip, frame.width / 3, frame.height / 3);
  const corners = [
    `M ${frame.x} ${frame.y + inset} v ${-inset} h ${inset}`,
    `M ${frame.x + frame.width - inset} ${frame.y} h ${inset} v ${inset}`,
    `M ${frame.x + frame.width} ${frame.y + frame.height - inset} v ${inset} h ${-inset}`,
    `M ${frame.x + inset} ${frame.y + frame.height} h ${-inset} v ${-inset}`,
  ];
  return (
    <g
      pointerEvents="none"
      transform={
        frame.rotation === 0
          ? undefined
          : `rotate(${frame.rotation} ${center.x} ${center.y})`
      }
    >
      <rect
        x={frame.x}
        y={frame.y}
        width={frame.width}
        height={frame.height}
        fill="none"
        stroke="#ffffff"
        strokeWidth={2.5}
        vectorEffect="non-scaling-stroke"
      />
      <rect
        x={frame.x}
        y={frame.y}
        width={frame.width}
        height={frame.height}
        fill="none"
        stroke="var(--red, #710014)"
        strokeWidth={1.25}
        strokeDasharray="5 4"
        vectorEffect="non-scaling-stroke"
      />
      <g stroke="#ffffff" strokeOpacity={0.72} strokeWidth={1} vectorEffect="non-scaling-stroke">
        <line x1={frame.x + thirdX} y1={frame.y} x2={frame.x + thirdX} y2={frame.y + frame.height} />
        <line
          x1={frame.x + thirdX * 2}
          y1={frame.y}
          x2={frame.x + thirdX * 2}
          y2={frame.y + frame.height}
        />
        <line x1={frame.x} y1={frame.y + thirdY} x2={frame.x + frame.width} y2={frame.y + thirdY} />
        <line
          x1={frame.x}
          y1={frame.y + thirdY * 2}
          x2={frame.x + frame.width}
          y2={frame.y + thirdY * 2}
        />
      </g>
      <g
        fill="none"
        stroke="var(--red, #710014)"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      >
        {corners.map((path) => (
          <path key={path} d={path} />
        ))}
      </g>
    </g>
  );
});

const DropTargetArt = memo(function DropTargetArt({
  page,
  objectId,
}: {
  page: PublicationPage;
  objectId: string;
}) {
  const object = page.objects.find((entry) => entry.id === objectId);
  if (!object || object.kind !== "image-frame") return null;
  const { frame } = object;
  const center = frameCenter(frame);
  return (
    <g
      pointerEvents="none"
      transform={
        frame.rotation === 0
          ? undefined
          : `rotate(${frame.rotation} ${center.x} ${center.y})`
      }
    >
      <rect
        x={frame.x}
        y={frame.y}
        width={frame.width}
        height={frame.height}
        fill="color-mix(in oklab, var(--red) 12%, transparent)"
        stroke="var(--red, #710014)"
        strokeWidth={2}
        strokeDasharray="6 4"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
});
