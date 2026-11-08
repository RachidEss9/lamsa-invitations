import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  Point,
  PublicationDocument,
  PublicationObject,
  PublicationPage,
  Rect,
} from "@/lib/publishing/model";
import type { SpreadGeometry } from "@/lib/publishing/spreads";
import { frameCenter } from "@/lib/publishing/object-transform";
import {
  frameRotatePoint,
  handlePoint,
  hitTestPage,
  objectsInRect,
  RESIZE_HANDLES,
  resizeFrameByHandle,
  rotationForPointer,
  snapMove,
  type ResizeHandle,
} from "@/lib/publishing/canvas";
import { rotatePoint } from "@/lib/publishing/object-transform";
import { trimBox } from "@/lib/publishing/geometry";
import {
  pageAtStagePoint,
  pagePointToStage,
  stageLayout,
  stagePointToPage,
  zoomAtPoint,
} from "@/lib/publishing/viewport";
import { PageView, type PageChrome } from "./PageView";
import { Rulers } from "./Rulers";
import type { AssetResolver } from "./ObjectArt";
import type { LengthUnit } from "@/lib/publishing/units";
import type { ImageCropDraft } from "@/lib/publishing/image";
import { cn } from "@/lib/utils";

/**
 * The canvas: pan, zoom-in-place, selection, transform.
 *
 * The browser owns scrolling (trackpad panning and scrollbars stay native);
 * this component owns ctrl/cmd+wheel zoom, which holds the content under the
 * pointer still, and every object gesture.
 *
 * A gesture never touches the session while it runs. Its result lives in local
 * preview state (rendered, uncommitted), and pointer-up records exactly one
 * page edit — one history entry, one autosave batch, per gesture.
 */

const FIT_PADDING = 48;
const DRAG_THRESHOLD = 3;
/** Pointer tolerance for snapping, in screen pixels. */
const SNAP_PX = 6;
const MIN_SIZE = 2;

type HandleId = ResizeHandle | "rotate";

interface DragState {
  kind: "move" | "resize" | "rotate" | "marquee" | "pan" | "crop";
  pageId: string;
  /** Page-local pointer position where the gesture began. */
  originPage: Point;
  /** Stage-space pointer position where the gesture began. */
  originStage: Point;
  pointerId: number;
  ids: readonly string[];
  /** Frames of every object the gesture may touch, before it began. */
  baseFrames: Record<string, PublicationObject["frame"]>;
  /** Selection at gesture start (marquee additive mode). */
  baseSelection: readonly string[];
  resizeHandle?: HandleId;
  moved: boolean;
  /** Previous page point for incremental crop panning. */
  lastPage?: Point;
  scroll?: { left: number; top: number };
}

interface StageMarquee {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface EditorCanvasProps {
  document: PublicationDocument;
  geometry: SpreadGeometry;
  chrome: PageChrome;
  selection: readonly string[];
  /** Screen pixels per point. */
  zoom: number;
  /** False in preview: no handles, object gestures become pans. */
  editable: boolean;
  spaceHeld: boolean;
  assetResolver?: AssetResolver;
  /** Uncommitted crop shown while the crop tool is active. */
  cropPreview?: (ImageCropDraft & { objectId: string }) | null;
  onCropPan?: (dx: number, dy: number) => void;
  onDropAsset?: (objectId: string, assetId: string) => void;
  onSelect: (ids: readonly string[]) => void;
  /** Commit a finished gesture as a single page edit (history + autosave). */
  onEditPage: (pageId: string, page: PublicationPage) => void;
  onZoom: (zoom: number) => void;
  /** Bumping this value makes the canvas re-fit the spread. */
  fitSignal: number;
  /** Double-clicking a non-text object (opens it in the inspector). */
  onActivateObject?: (objectId: string) => void;
  /** Double-clicking a text frame enters direct text editing. */
  editingObjectId?: string;
  onEditText?: (objectId: string) => void;
  /** Double-clicking an image frame enters the crop tool. */
  onEditImage?: (objectId: string) => void;
  onTextDraft?: (objectId: string, text: string) => void;
  onTextEnd?: () => void;
  onTextSelection?: (objectId: string, start: number, end: number) => void;
  /** Physical rulers; dragging out of one adds a guide. */
  showRulers?: boolean;
  unit?: LengthUnit;
  onAddGuide?: (axis: "x" | "y", positionPoints: number) => void;
}

export function EditorCanvas({
  document,
  geometry,
  chrome,
  selection,
  zoom,
  editable,
  spaceHeld,
  assetResolver,
  cropPreview,
  onCropPan,
  onDropAsset,
  onSelect,
  onEditPage,
  onZoom,
  fitSignal,
  onActivateObject,
  editingObjectId,
  onEditText,
  onEditImage,
  onTextDraft,
  onTextEnd,
  onTextSelection,
  showRulers = false,
  unit = "mm",
  onAddGuide,
}: EditorCanvasProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [marquee, setMarquee] = useState<StageMarquee | null>(null);
  const [snapMarks, setSnapMarks] = useState<
    { axis: "x" | "y"; pageId: string; position: number }[]
  >([]);
  const [previewFrames, setPreviewFrames] = useState<
    Record<string, PublicationObject["frame"]>
  >({});
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const previewFramesRef = useRef(previewFrames);
  // Gesture handlers must read current props, not the ones from first render;
  // the refs are synchronised after commit, before any pointer can arrive.
  const live = useRef({ document, selection, zoom, editable, spaceHeld, onCropPan });

  useEffect(() => {
    previewFramesRef.current = previewFrames;
  }, [previewFrames]);

  useEffect(() => {
    live.current = { document, selection, zoom, editable, spaceHeld, onCropPan };
  }, [document, selection, zoom, editable, spaceHeld, onCropPan]);

  const layout = useMemo(() => stageLayout(geometry, zoom), [geometry, zoom]);

  /* --------------------------------------------------------------- renders */

  const displayDocument = useMemo(() => {
    let next = document;
    if (Object.keys(previewFrames).length > 0) {
      next = applyPreviewFrames(next, previewFrames);
    }
    if (cropPreview) {
      next = {
        ...next,
        pages: next.pages.map((page) => ({
          ...page,
          objects: page.objects.map((object) =>
            object.id === cropPreview.objectId && object.kind === "image-frame"
              ? {
                  ...object,
                  fit: cropPreview.fit,
                  crop: cropPreview.crop,
                  focal: cropPreview.focal,
                }
              : object,
          ),
        })),
      };
    }
    return next;
  }, [document, previewFrames, cropPreview]);

  const pagesToRender = useMemo(
    () =>
      layout.pages
        .map((box) => ({
          stageBox: box,
          page: displayDocument.pages.find((page) => page.id === box.pageId),
        }))
        .filter(
          (
            entry,
          ): entry is {
            stageBox: (typeof layout.pages)[number];
            page: PublicationPage;
          } => Boolean(entry.page),
        ),
    [layout, displayDocument],
  );

  /* --------------------------------------------------------------- fitting */

  const fitToView = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const next = Math.min(
      (scroller.clientWidth - FIT_PADDING * 2) / geometry.bleed.width,
      (scroller.clientHeight - FIT_PADDING * 2) / geometry.bleed.height,
      1,
    );
    const clamped = Math.round(Math.max(0.05, Math.min(16, next)) * 1000) / 1000;
    onZoom(clamped);
    requestAnimationFrame(() => {
      scroller.scrollTo({
        left: Math.max(
          0,
          (geometry.bleed.width * clamped + FIT_PADDING * 2 - scroller.clientWidth) / 2,
        ),
        top: Math.max(
          0,
          (geometry.bleed.height * clamped + FIT_PADDING * 2 - scroller.clientHeight) / 2,
        ),
      });
    });
  }, [geometry.bleed.height, geometry.bleed.width, onZoom]);

  // Re-centre when the *spread* changes. Zoom deliberately does not re-centre:
  // zooming is anchored to the pointer or the viewport, never to the stage.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollTo({
      left: Math.max(0, (layout.width + FIT_PADDING * 2 - scroller.clientWidth) / 2),
      top: Math.max(0, (layout.height + FIT_PADDING * 2 - scroller.clientHeight) / 2),
    });
  }, [geometry.spreadId, geometry.bleed.width, geometry.bleed.height]); // eslint-disable-line react-hooks/exhaustive-deps

  // The toolbar's "fit" arrives as an imperative edge.
  useEffect(() => {
    if (fitSignal > 0) fitToView();
  }, [fitSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  // First paint fits the spread; later page switches keep the designer's zoom.
  const didInitialFit = useRef(false);
  useEffect(() => {
    if (didInitialFit.current) return;
    didInitialFit.current = true;
    fitToView();
  }, [fitToView]);

  /* ------------------------------------------------------------- utilities */

  const stagePointFromClient = (clientX: number, clientY: number): Point => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const pageIdAtClient = (clientX: number, clientY: number): string | null =>
    pageAtStagePoint(layout, stagePointFromClient(clientX, clientY));

  const pagePointFromClient = (
    clientX: number,
    clientY: number,
    pageId: string,
  ): Point | null =>
    stagePointToPage(layout, pageId, stagePointFromClient(clientX, clientY));

  const pageRectFromStage = (pageId: string, rect: StageMarquee): Rect | null => {
    const from = stagePointToPage(layout, pageId, {
      x: Math.min(rect.x1, rect.x2),
      y: Math.min(rect.y1, rect.y2),
    });
    const to = stagePointToPage(layout, pageId, {
      x: Math.max(rect.x1, rect.x2),
      y: Math.max(rect.y1, rect.y2),
    });
    if (!from || !to) return null;
    return { x: from.x, y: from.y, width: to.x - from.x, height: to.y - from.y };
  };

  const buildPageWith = (
    pageId: string,
    frames: Record<string, PublicationObject["frame"]>,
  ): PublicationPage | null => {
    const page = live.current.document.pages.find((entry) => entry.id === pageId);
    if (!page) return null;
    if (Object.keys(frames).length === 0) return page;
    return applyPreviewFrames(page, frames) as PublicationPage;
  };

  /** The resize/rotate grip within reach of the pointer, in screen pixels. */
  function handleAtPointer(
    page: PublicationPage,
    pointer: Point,
    stagePoint: Point,
  ): HandleId | null {
    const ids = live.current.selection;
    if (ids.length !== 1) return null;
    const object = page.objects.find((entry) => entry.id === ids[0]);
    if (!object || object.locked) return null;
    const tolerance = 8;
    const frame = object.frame;
    const centre = frameCenter(frame);
    const grips: Array<{ handle: HandleId; point: Point }> = [
      ...RESIZE_HANDLES.map((handle) => ({
        handle: handle as HandleId,
        point: rotatePoint(handlePoint(frame, handle), centre, frame.rotation),
      })),
      {
        handle: "rotate",
        point: frameRotatePoint(frame, 16 / live.current.zoom),
      },
    ];
    for (const grip of grips) {
      const stageGrip = pagePointToStage(layout, page.id, grip.point);
      if (!stageGrip) continue;
      if (Math.hypot(stageGrip.x - stagePoint.x, stageGrip.y - stagePoint.y) <= tolerance) {
        return grip.handle;
      }
    }
    return null;
  }

  const clearGesture = () => {
    dragRef.current = null;
    setMarquee(null);
    setSnapMarks([]);
    setPreviewFrames({});
  };

  function framesAppliedTo(
    base: Record<string, PublicationObject["frame"]>,
    dx: number,
    dy: number,
  ): Record<string, PublicationObject["frame"]> {
    const frames: Record<string, PublicationObject["frame"]> = {};
    for (const [id, frame] of Object.entries(base)) {
      frames[id] = { ...frame, x: frame.x + dx, y: frame.y + dy };
    }
    return frames;
  }

  /** Page point → stage px, for the snap hairline overlay. */
  function snapMarkLine(
    pageId: string,
    axis: "x" | "y",
    position: number,
  ): { x1: number; y1: number; x2: number; y2: number } | null {
    const page = document.pages.find((entry) => entry.id === pageId);
    if (!page) return null;
    const trim = trimBox(page.spec);
    const a =
      axis === "x"
        ? pagePointToStage(layout, pageId, { x: position, y: trim.y })
        : pagePointToStage(layout, pageId, { x: trim.x, y: position });
    const b =
      axis === "x"
        ? pagePointToStage(layout, pageId, {
            x: position,
            y: trim.y + trim.height,
          })
        : pagePointToStage(layout, pageId, {
            x: trim.x + trim.width,
            y: position,
          });
    if (!a || !b) return null;
    return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
  }

  /*------------------------------------------------------------------ wheel */

  // A native, non-passive listener: React's synthetic wheel handler is passive
  // at the root, so preventDefault there would not stop the browser zoom.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const handler = (event: WheelEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return; // everything else scrolls
      event.preventDefault();
      const rect = scroller.getBoundingClientRect();
      // "pan" here is the stage's offset inside the scroll container —
      // padding minus scroll — exactly the shape `zoomAtPoint` expects.
      const anchor = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const current = live.current.zoom;
      const next = zoomAtPoint(
        {
          zoom: current,
          panX: FIT_PADDING - scroller.scrollLeft,
          panY: FIT_PADDING - scroller.scrollTop,
        },
        current * Math.pow(1.0018, event.deltaY),
        anchor,
      );
      onZoom(Math.round(next.zoom * 1000) / 1000);
      scroller.scrollTo({
        left: Math.max(0, FIT_PADDING - next.panX),
        top: Math.max(0, FIT_PADDING - next.panY),
      });
    };
    scroller.addEventListener("wheel", handler, { passive: false });
    return () => scroller.removeEventListener("wheel", handler);
  }, [onZoom]);

  /*-------------------------------------------------------------- gestures */

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button === 2) return; // context menus belong to the browser
      const scroller = scrollerRef.current;
      if (!scroller) return;

      const target = event.target as Element;
      const handle = (target.closest?.("[data-handle]")?.getAttribute("data-handle") ??
        null) as HandleId | null;
      const pageId =
        target.closest?.("[data-page-id]")?.getAttribute("data-page-id") ??
        pageIdAtClient(event.clientX, event.clientY) ??
        "";

      // Middle button, the space bar, and preview mode grab the paper.
      if (event.button === 1 || spaceHeld || !editable) {
        dragRef.current = {
          kind: "pan",
          pageId,
          originPage: { x: 0, y: 0 },
          originStage: stagePointFromClient(event.clientX, event.clientY),
          pointerId: event.pointerId,
          ids: [],
          baseFrames: {},
          baseSelection: selection,
          moved: false,
          scroll: { left: scroller.scrollLeft, top: scroller.scrollTop },
        };
        scroller.setPointerCapture(event.pointerId);
        event.preventDefault();
        return;
      }

      if (!pageId) {
        onSelect([]);
        return;
      }
      const page = live.current.document.pages.find((entry) => entry.id === pageId);
      const pointer = pagePointFromClient(event.clientX, event.clientY, pageId);
      if (!page || !pointer) return;

      const originStage = stagePointFromClient(event.clientX, event.clientY);

      // Crop mode owns the image frame. A click elsewhere does nothing rather
      // than leaving the tool or selecting another object by accident.
      if (cropPreview) {
        const hit = hitTestPage(page, pointer);
        const cropObject = page.objects.find(
          (object) => object.id === cropPreview.objectId,
        );
        if (!cropObject || hit?.id !== cropPreview.objectId) return;
        dragRef.current = {
          kind: "crop",
          pageId,
          originPage: pointer,
          originStage,
          pointerId: event.pointerId,
          ids: [cropPreview.objectId],
          baseFrames: { [cropPreview.objectId]: cropObject.frame },
          baseSelection: [cropPreview.objectId],
          moved: false,
          lastPage: pointer,
        };
        scroller.setPointerCapture(event.pointerId);
        event.preventDefault();
        return;
      }

      // Handles sit in an SVG owned by the page, but the scroller captures the
      // pointer, so the grip is found geometrically instead of by DOM hit.
      const activeHandle = handle ?? handleAtPointer(page, pointer, originStage);

      if (activeHandle && selection.length > 0) {
        const subject = selection[0]!;
        const subjectObject = page.objects.find((object) => object.id === subject);
        if (subjectObject) {
          dragRef.current = {
            kind: activeHandle === "rotate" ? "rotate" : "resize",
            pageId,
            originPage: pointer,
            originStage,
            pointerId: event.pointerId,
            ids: [subject],
            baseFrames: { [subject]: subjectObject.frame },
            baseSelection: selection,
            resizeHandle: activeHandle,
            moved: false,
          };
          scroller.setPointerCapture(event.pointerId);
          return;
        }
      }

      const hit = hitTestPage(page, pointer);
      if (hit && isInteractive(hit, page)) {
        // Clicking one member of a group selects the whole group; the ids are
        // read from the page so a grouped selection moves as one object.
        const grouped = hit.groupId
          ? page.objects
              .filter((object) => object.groupId === hit.groupId)
              .map((object) => object.id)
          : [hit.id];
        const idsOnDown = selection.includes(hit.id) ? selection : grouped;
        if (event.shiftKey) {
          const next = selection.includes(hit.id)
            ? selection.filter((id) => !grouped.includes(id))
            : [...selection, ...grouped.filter((id) => !selection.includes(id))];
          onSelect(next);
          return;
        }
        if (!selection.includes(hit.id)) onSelect(idsOnDown);
        dragRef.current = {
          kind: "move",
          pageId,
          originPage: pointer,
          originStage,
          pointerId: event.pointerId,
          ids: idsOnDown,
          baseFrames: Object.fromEntries(
            idsOnDown.map((id) => [
              id,
              page.objects.find((object) => object.id === id)?.frame ?? hit.frame,
            ]),
          ),
          baseSelection: selection,
          moved: false,
        };
        scroller.setPointerCapture(event.pointerId);
        return;
      }

      // Empty page space: clear the selection and open a marquee.
      if (!event.shiftKey) onSelect([]);
      dragRef.current = {
        kind: "marquee",
        pageId,
        originPage: pointer,
        originStage,
        pointerId: event.pointerId,
        ids: [],
        baseFrames: {},
        baseSelection: event.shiftKey ? selection : [],
        moved: false,
      };
      scroller.setPointerCapture(event.pointerId);
      setMarquee({ x1: originStage.x, y1: originStage.y, x2: originStage.x, y2: originStage.y });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selection, spaceHeld, editable, cropPreview],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;
      const scroller = scrollerRef.current;
      if (!scroller) return;

      const stagePoint = stagePointFromClient(event.clientX, event.clientY);

      if (drag.kind === "pan" && drag.scroll) {
        scroller.scrollLeft = drag.scroll.left - (stagePoint.x - drag.originStage.x);
        scroller.scrollTop = drag.scroll.top - (stagePoint.y - drag.originStage.y);
        drag.moved = true;
        return;
      }

      const pagePoint = pagePointFromClient(event.clientX, event.clientY, drag.pageId);
      if (!pagePoint) return;
      if (
        drag.kind !== "resize" &&
        drag.kind !== "rotate" &&
        !drag.moved &&
        Math.abs(pagePoint.x - drag.originPage.x) <= DRAG_THRESHOLD &&
        Math.abs(pagePoint.y - drag.originPage.y) <= DRAG_THRESHOLD
      ) {
        return; // still a click, as the eye can tell
      }
      drag.moved = true;

      if (drag.kind === "crop") {
        const previous = drag.lastPage ?? drag.originPage;
        live.current.onCropPan?.(pagePoint.x - previous.x, pagePoint.y - previous.y);
        drag.lastPage = pagePoint;
        return;
      }

      const documentNow = live.current.document;
      const pageNow = documentNow.pages.find((entry) => entry.id === drag.pageId);

      if (drag.kind === "move" && pageNow) {
        const dx0 = pagePoint.x - drag.originPage.x;
        const dy0 = pagePoint.y - drag.originPage.y;
        // Snap decisions are made against the pre-drag frames, so a gesture
        // never compounds against its own live preview.
        const basePage = resetFrames(pageNow, drag.baseFrames);
        const snap = snapMove(basePage, documentNow, drag.ids, { x: dx0, y: dy0 }, SNAP_PX / live.current.zoom);
        setPreviewFrames(framesAppliedTo(drag.baseFrames, snap.dx, snap.dy));
        const marks: { axis: "x" | "y"; pageId: string; position: number }[] = [];
        if (snap.snappedX !== null) {
          marks.push({ axis: "x", pageId: drag.pageId, position: snap.snappedX });
        }
        if (snap.snappedY !== null) {
          marks.push({ axis: "y", pageId: drag.pageId, position: snap.snappedY });
        }
        setSnapMarks(marks);
        return;
      }

      if (drag.kind === "resize" && pageNow && drag.resizeHandle && drag.resizeHandle !== "rotate") {
        const base = drag.baseFrames[drag.ids[0]!];
        if (!base) return;
        const next = resizeFrameByHandle(
          base,
          drag.resizeHandle,
          { x: pagePoint.x - drag.originPage.x, y: pagePoint.y - drag.originPage.y },
          { minSize: MIN_SIZE, keepAspect: event.shiftKey },
        );
        setPreviewFrames({ [drag.ids[0]!]: next });
        return;
      }

      if (drag.kind === "rotate" && pageNow) {
        const base = drag.baseFrames[drag.ids[0]!];
        if (!base) return;
        setPreviewFrames({
          [drag.ids[0]!]: {
            ...base,
            rotation: rotationForPointer(frameCenter(base), pagePoint, {
              step: event.shiftKey ? 15 : 0,
            }),
          },
        });
        return;
      }

      if (drag.kind === "marquee") {
        setMarquee({
          x1: drag.originStage.x,
          y1: drag.originStage.y,
          x2: stagePoint.x,
          y2: stagePoint.y,
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;

      if (drag.kind === "pan" || drag.kind === "crop") {
        dragRef.current = null;
        return;
      }

      if (drag.kind === "marquee") {
        const stagePoint = stagePointFromClient(event.clientX, event.clientY);
        const movedFar =
          Math.abs(stagePoint.x - drag.originStage.x) > DRAG_THRESHOLD ||
          Math.abs(stagePoint.y - drag.originStage.y) > DRAG_THRESHOLD;
        const full = {
          x1: drag.originStage.x,
          y1: drag.originStage.y,
          x2: stagePoint.x,
          y2: stagePoint.y,
        };
        const page = live.current.document.pages.find((entry) => entry.id === drag.pageId);
        const rect = movedFar && page ? pageRectFromStage(drag.pageId, full) : null;
        dragRef.current = null;
        setMarquee(null);
        if (!page || !rect) return;
        const union = new Set(drag.baseSelection);
        for (const object of objectsInRect(page, rect)) union.add(object.id);
        onSelect([...union]);
        return;
      }

      const frames = { ...previewFramesRef.current };
      dragRef.current = null;
      setMarquee(null);
      setSnapMarks([]);
      if (!drag.moved) {
        setPreviewFrames({});
        return;
      }
      const page = buildPageWith(drag.pageId, frames);
      if (page) onEditPage(drag.pageId, page);
      setPreviewFrames({});
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onEditPage, onSelect],
  );

  const onPointerCancel = useCallback(() => {
    clearGesture();
  }, []);

  const onDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!editable || !onActivateObject) return;
      const pageId =
        (event.target as Element)
          .closest?.("[data-page-id]")
          ?.getAttribute("data-page-id") ?? pageIdAtClient(event.clientX, event.clientY);
      if (!pageId) return;
      const page = live.current.document.pages.find((entry) => entry.id === pageId);
      const pointer = pagePointFromClient(event.clientX, event.clientY, pageId);
      if (!page || !pointer) return;
      const hit = hitTestPage(page, pointer);
      if (!hit || !isInteractive(hit, page)) return;
      if (cropPreview) return;
      if (hit.kind === "text-frame" && onEditText) {
        onEditText(hit.id);
        return;
      }
      if (hit.kind === "image-frame" && onEditImage) {
        onEditImage(hit.id);
        return;
      }
      onActivateObject?.(hit.id);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editable, onActivateObject, onEditText, onEditImage, cropPreview],
  );

  const onDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!onDropAsset || !event.dataTransfer.types.includes("application/x-lamsa-asset")) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      const pageId = pageIdAtClient(event.clientX, event.clientY);
      const page = live.current.document.pages.find((entry) => entry.id === pageId);
      const pointer = pageId
        ? pagePointFromClient(event.clientX, event.clientY, pageId)
        : null;
      if (!page || !pointer) {
        setDropTargetId(null);
        return;
      }
      const hit = hitTestPage(page, pointer);
      setDropTargetId(hit?.kind === "image-frame" ? hit.id : null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onDropAsset],
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!onDropAsset) return;
      event.preventDefault();
      setDropTargetId(null);
      const assetId = event.dataTransfer.getData("application/x-lamsa-asset");
      const pageId = pageIdAtClient(event.clientX, event.clientY);
      const page = live.current.document.pages.find((entry) => entry.id === pageId);
      const pointer = pageId
        ? pagePointFromClient(event.clientX, event.clientY, pageId)
        : null;
      if (!assetId || !page || !pointer) return;
      const hit = hitTestPage(page, pointer);
      if (hit?.kind === "image-frame") onDropAsset(hit.id, assetId);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onDropAsset],
  );

  const cursor: string = cropPreview
    ? "move"
    : spaceHeld || !editable
      ? "grab"
      : "default";

  return (
    <div
      ref={scrollerRef}
      className={cn(
        "relative flex-1 overflow-auto scroll-slim bg-[var(--paper-deep)]",
        spaceHeld && "cursor-grab",
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onDoubleClick={onDoubleClick}
      onDragOver={onDragOver}
      onDragLeave={() => setDropTargetId(null)}
      onDrop={onDrop}
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, color-mix(in oklab, var(--ink) 8%, transparent) 1px, transparent 0)",
        backgroundSize: "18px 18px",
        touchAction: cropPreview ? "none" : undefined,
      }}
    >
      <div style={{ padding: FIT_PADDING, width: "max-content", height: "max-content" }}>
        <div
          ref={stageRef}
          className="relative"
          style={{
            width: layout.width,
            height: layout.height,
            background: "color-mix(in oklab, var(--ink) 10%, var(--rail, #141413))",
            boxShadow:
              "0 1px 2px rgba(21,21,21,0.06), 0 24px 48px -28px rgba(21,21,21,0.35)",
            cursor,
            userSelect: "none",
          }}
        >
          {showRulers && onAddGuide ? (
            <Rulers
              width={layout.width}
              height={layout.height}
              zoom={zoom}
              unit={unit}
              onAddGuide={onAddGuide}
            />
          ) : null}
          {pagesToRender.map(({ page, stageBox }) => (
            <PageView
              key={page.id}
              page={page}
              document={displayDocument}
              box={{
                left: stageBox.left,
                top: stageBox.top,
                width: stageBox.width,
                height: stageBox.height,
                scale: zoom,
              }}
              chrome={chrome}
              selectedIds={selection}
              activeHandleSubject={
                !cropPreview && selection.length === 1 ? selection[0] : undefined
              }
              resolveAsset={assetResolver}
              editable={editable}
              editingObjectId={editingObjectId}
              cropObjectId={cropPreview?.objectId}
              dropTargetId={dropTargetId ?? undefined}
              onTextDraft={onTextDraft}
              onTextEnd={onTextEnd}
              onTextSelection={onTextSelection}
            />
          ))}

          {/* Stage-space overlays: marquee and snap lines. Zero pointer cost. */}
          <svg
            className="pointer-events-none absolute left-0 top-0"
            width={layout.width}
            height={layout.height}
          >
            {marquee ? (
              <rect
                x={Math.min(marquee.x1, marquee.x2)}
                y={Math.min(marquee.y1, marquee.y2)}
                width={Math.abs(marquee.x2 - marquee.x1)}
                height={Math.abs(marquee.y2 - marquee.y1)}
                fill="color-mix(in oklab, var(--gold) 14%, transparent)"
                stroke="var(--gold)"
                strokeWidth={1}
                strokeDasharray="4 3"
              />
            ) : null}
            {snapMarks.map((mark) => {
              const line = snapMarkLine(mark.pageId, mark.axis, mark.position);
              if (!line) return null;
              return (
                <line
                  key={`snap-${mark.pageId}-${mark.axis}`}
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke="var(--red)"
                  strokeWidth={1}
                  strokeDasharray="2 3"
                />
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ helpers */

/**
 * Objects a layer's lock protects are visible but not manipulable; the canvas
 * still reports them as selection targets through the panels.
 */
function isInteractive(object: PublicationObject, page: PublicationPage): boolean {
  if (object.locked) return false;
  return !page.layers.find((layer) => layer.id === object.layerId)?.locked;
}

/** Overloads: substitute frames on one page, or across the whole document. */
function applyPreviewFrames(
  document: PublicationDocument,
  frames: Record<string, PublicationObject["frame"]>,
): PublicationDocument;
function applyPreviewFrames(
  page: PublicationPage,
  frames: Record<string, PublicationObject["frame"]>,
): PublicationPage;
function applyPreviewFrames(
  source: PublicationDocument | PublicationPage,
  frames: Record<string, PublicationObject["frame"]>,
): PublicationDocument | PublicationPage {
  if ("title" in source) {
    return {
      ...source,
      pages: source.pages.map((page) =>
        page.objects.some((object) => frames[object.id])
          ? ({
              ...page,
              objects: page.objects.map(
                (object) =>
                  (frames[object.id]
                    ? { ...object, frame: frames[object.id]! }
                    : object) as PublicationObject,
              ),
            } as PublicationPage)
          : page,
      ),
    };
  }
  const page = source;
  return {
    ...page,
    objects: page.objects.map(
      (object) =>
        (frames[object.id] ? { ...object, frame: frames[object.id]! } : object) as PublicationObject,
    ),
  };
}

/** Puts the named objects back to their pre-gesture frames. */
function resetFrames(
  page: PublicationPage,
  baseFrames: Record<string, PublicationObject["frame"]>,
): PublicationPage {
  if (Object.keys(baseFrames).length === 0) return page;
  return {
    ...page,
    objects: page.objects.map((object) =>
      baseFrames[object.id] ? ({ ...object, frame: baseFrames[object.id]! } as PublicationObject) : object,
    ),
  };
}
