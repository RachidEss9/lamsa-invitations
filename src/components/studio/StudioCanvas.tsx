import {
  pageSizeOf,
  rulerTicksFor,
  type DesignElement,
  type DesignPage,
  type DesignUnit,
} from "@/lib/design";
import { cn } from "@/lib/utils";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { createPortal } from "react-dom";
import { DesignPageView } from "@/components/invitation/DesignPageView";
import { EnvelopeGuides } from "@/components/studio/EnvelopeGuides";
import { geometryForPage, type EnvelopeGeometry } from "@/lib/envelope";
import { equalSpacingGuides, type SpacingSegments } from "@/lib/smart-guides";
import { effectFilter, gradientCss, outlineWidth } from "@/lib/effects";
import { fontFamilyFor } from "@/lib/fonts";
import { cleanEditedText, shouldCommitText } from "@/lib/studio-edit";

type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export type CanvasContextAction =
  | "copy"
  | "cut"
  | "paste"
  | "duplicate"
  | "delete"
  | "group"
  | "ungroup"
  | "lock"
  | "unlock"
  | "hide"
  | "show"
  | "flipX"
  | "flipY"
  | "front"
  | "back"
  | "selectAll";

interface StudioCanvasProps {
  page: DesignPage;
  time: number;
  zoom: number;
  imageUrls: Record<string, string>;
  selectedIds: string[];
  showHidden: boolean;
  revealPreview: Set<string>;
  guestName?: string | null;
  rtl?: boolean;
  aspectLocked: boolean;
  ignoreExit?: boolean;
  /** Canvas overlays. They are drawing aids only and never saved. */
  showGrid?: boolean;
  showRulers?: boolean;
  showSafeArea?: boolean;
  /**
   * Display unit for rulers and measurements. It only changes what the
   * workspace reads out — every stored number stays in canvas units.
   */
  unit?: DesignUnit;
  /** Snapping to the page, centrelines, guides and neighbouring layers. */
  enableSnap?: boolean;
  /** Drafting guides: the user's own guides, centrelines and the trim edge. */
  showGuides?: boolean;
  /** The user's guides for this page, in canvas units. */
  userGuides?: { x: number[]; y: number[] };
  onUserGuidesChange?: (next: { x: number[]; y: number[] }) => void;
  /** Artwork / Print mode (false) hides every material finish on the canvas. */
  materialPreview?: boolean;
  /**
   * Envelope drafting guides for the piece being edited: flap, address
   * windows, postage-safe zone and liner fit. Screen only — the overlay sits
   * outside the page, so no export can pick it up by accident.
   */
  envelope?: {
    geometry: EnvelopeGeometry;
    view: "front" | "back";
    liner?: { widthMm: number; heightMm: number } | null;
  } | null;
  resetViewToken?: number;
  editRequest?: { id: string; token: number } | null;
  onZoom: (value: number) => void;
  onSelect: (ids: string[]) => void;
  onMove: (updates: { id: string; x: number; y: number }[]) => void;
  onResize: (id: string, box: { x: number; y: number; w: number; h: number }) => void;
  onRotate: (id: string, rotation: number) => void;
  onReveal: (targetId: string, interactionId: string) => void;
  onAltDuplicate?: () => void;
  onTextCommit?: (id: string, text: string) => void;
  onContextAction?: (action: CanvasContextAction) => void;
  /** Reports inline text editing so the studio can protect the layer. */
  onEditingChange?: (editing: boolean) => void;
}

const SNAP_THRESHOLD = 7;

/**
 * Coalesces pointer updates to one per animation frame.
 *
 * Trackpads and high-refresh phones deliver move events faster than the
 * browser paints, and every event used to rewrite the whole design document —
 * Studio, Inspector, layers and canvas all re-rendered in between frames. Only
 * the latest geometry is kept, so a drag costs at most one design update per
 * frame and still lands exactly where the pointer stopped.
 */
function useFrameBatch() {
  const frame = useRef<number | null>(null);
  const pending = useRef<(() => void) | null>(null);

  const schedule = useCallback((run: () => void) => {
    pending.current = run;
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const next = pending.current;
      pending.current = null;
      next?.();
    });
  }, []);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
      pending.current = null;
    },
    [],
  );

  return schedule;
}

/**
 * The eight grab points of a selected layer, in fractions of its own box.
 * They are rendered in design coordinates so they follow the layer's rotation,
 * but their hit area is divided by the zoom, so they stay the same size on
 * screen — and finger-sized on a phone — at any magnification.
 */
const HANDLES: {
  id: Handle;
  label: string;
  x: number;
  y: number;
  cursor: string;
}[] = [
  { id: "nw", label: "Resize from the top left", x: 0, y: 0, cursor: "nwse-resize" },
  { id: "n", label: "Resize from the top", x: 0.5, y: 0, cursor: "ns-resize" },
  { id: "ne", label: "Resize from the top right", x: 1, y: 0, cursor: "nesw-resize" },
  { id: "e", label: "Resize from the right", x: 1, y: 0.5, cursor: "ew-resize" },
  { id: "se", label: "Resize from the bottom right", x: 1, y: 1, cursor: "nwse-resize" },
  { id: "s", label: "Resize from the bottom", x: 0.5, y: 1, cursor: "ns-resize" },
  { id: "sw", label: "Resize from the bottom left", x: 0, y: 1, cursor: "nesw-resize" },
  { id: "w", label: "Resize from the left", x: 0, y: 0.5, cursor: "ew-resize" },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

interface DragState {
  mode: "move" | "resize" | "rotate";
  handle?: Handle;
  startX: number;
  startY: number;
  originals: Map<string, DesignElement>;
  anchor: DesignElement;
  centerX: number;
  centerY: number;
  startAngle: number;
}

interface EditingState {
  id: string;
  original: string;
  caret: { x: number; y: number } | null;
}

interface MenuState {
  x: number;
  y: number;
  elementId: string | null;
}

function ContextMenu({
  menu,
  locked,
  hidden,
  hasSelection,
  onAction,
  onClose,
}: {
  menu: MenuState;
  locked: boolean;
  hidden: boolean;
  hasSelection: boolean;
  onAction: (action: CanvasContextAction) => void;
  onClose: () => void;
}) {
  const mod =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
      ? "⌘"
      : "Ctrl";
  const shift = "⇧";
  return createPortal(
    <ContextMenuBody
      menu={menu}
      locked={locked}
      hidden={hidden}
      hasSelection={hasSelection}
      mod={mod}
      shift={shift}
      onAction={onAction}
      onClose={onClose}
    />,
    document.body,
  );
}

function ContextMenuBody({
  menu,
  locked,
  hidden,
  hasSelection,
  mod,
  shift,
  onAction,
  onClose,
}: {
  menu: MenuState;
  locked: boolean;
  hidden: boolean;
  hasSelection: boolean;
  mod: string;
  shift: string;
  onAction: (action: CanvasContextAction) => void;
  onClose: () => void;
}) {
  const items: {
    action: CanvasContextAction;
    label: string;
    shortcut?: string;
    divider?: boolean;
    disabled?: boolean;
  }[] = menu.elementId
    ? [
        { action: "duplicate", label: "Duplicate", shortcut: `${mod}D` },
        { action: "copy", label: "Copy", shortcut: `${mod}C` },
        { action: "cut", label: "Cut", shortcut: `${mod}X` },
        { action: "paste", label: "Paste", shortcut: `${mod}V` },
        { action: "delete", label: "Delete", shortcut: "Del", divider: true },
        { action: "group", label: "Group", shortcut: `${mod}G`, disabled: !hasSelection },
        { action: "ungroup", label: "Ungroup", shortcut: `${shift}${mod}G` },
        {
          action: locked ? "unlock" : "lock",
          label: locked ? "Unlock" : "Lock",
          shortcut: `${shift}${mod}L`,
          divider: true,
        },
        {
          action: hidden ? "show" : "hide",
          label: hidden ? "Show layer" : "Hide layer",
          shortcut: `${shift}${mod}H`,
        },
        { action: "flipX", label: "Flip horizontally", shortcut: `${shift}H` },
        { action: "flipY", label: "Flip vertically", shortcut: `${shift}V` },
        { action: "front", label: "Bring to front", shortcut: `${mod}]` },
        { action: "back", label: "Send to back", shortcut: `${mod}[` },
      ]
    : [
        { action: "paste", label: "Paste", shortcut: `${mod}V` },
        { action: "selectAll", label: "Select all", shortcut: `${mod}A` },
      ];

  return (
    <div
      role="menu"
      aria-label="Canvas actions"
      className="fixed z-[120] w-[218px] overflow-hidden rounded-[var(--radius-card)] border border-[var(--edge)] bg-[var(--surface-overlay)] py-1.5 shadow-[var(--shadow-sheet)]"
      style={{
        left: Math.max(8, Math.min(menu.x, window.innerWidth - 230)),
        top: Math.max(8, Math.min(menu.y, window.innerHeight - 400)),
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      <p className="section-label px-3 pb-1.5 pt-1">
        {menu.elementId ? "Layer" : "Canvas"}
      </p>
      {items.map((item) => (
        <button
          key={item.action}
          type="button"
          role="menuitem"
          disabled={item.disabled}
          onClick={() => {
            onAction(item.action);
            onClose();
          }}
          className={cn(
            "mx-1 flex w-[calc(100%-0.5rem)] items-center justify-between rounded-[var(--radius-control)] px-2.5 py-1.5 text-left font-ui text-[12px] text-ink/80 transition-colors hover:bg-[var(--accent)] hover:text-ink disabled:cursor-not-allowed disabled:opacity-35",
            item.divider && "mt-1 border-t border-[var(--edge)] pt-2",
          )}
        >
          <span>{item.label}</span>
          {item.shortcut && (
            <span className="font-meta text-[9px] text-ink/35">{item.shortcut}</span>
          )}
        </button>
      ))}
      <p className="mx-1 mt-1 border-t border-[var(--edge)] px-2 pt-1.5 pb-0.5 text-[9px] leading-relaxed text-ink/35">
        Space + drag to pan · Wheel to zoom
      </p>
    </div>
  );
}

export function StudioCanvas({
  page,
  time,
  zoom,
  imageUrls,
  selectedIds,
  showHidden,
  revealPreview,
  guestName,
  rtl,
  aspectLocked,
  ignoreExit,
  showGrid = false,
  showRulers = false,
  showSafeArea = false,
  unit = "mm",
  enableSnap = true,
  showGuides = false,
  userGuides = { x: [], y: [] },
  onUserGuidesChange,
  materialPreview = true,
  envelope = null,
  resetViewToken = 0,
  editRequest,
  onZoom,
  onSelect,
  onMove,
  onResize,
  onRotate,
  onReveal,
  onAltDuplicate,
  onContextAction,
  onTextCommit,
  onEditingChange,
}: StudioCanvasProps) {
  const schedule = useFrameBatch();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const designRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  // Guards against a commit firing twice when Enter is followed by a blur.
  const editFinished = useRef(false);
  const [fit, setFit] = useState(0);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [guides, setGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });
  // Equal-gap guides, drawn as short dashes across the two matching gaps.
  const [spacing, setSpacing] = useState<SpacingSegments[]>([]);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [panning, setPanning] = useState(false);
  const panOrigin = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);

  const pinch = useRef<{
    distance: number;
    zoom: number;
    centerX: number;
    centerY: number;
  } | null>(null);

  const scale = Math.max(0.05, fit * zoom);
  const size = pageSizeOf(page);
  const selected = page.elements.filter((element) => selectedIds.includes(element.id));

  // Handles are only meaningful for one unlocked layer: a multi-selection keeps
  // its per-layer outlines and is moved together, and a locked layer has no
  // transform at all. Inline text editing hides them so the caret is reachable.
  const selectionBox =
    selected.length === 1 && !selected[0].locked && !editing ? selected[0] : null;
  const coarsePointer =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;

  /* Handle sizing. The hit box is measured in screen pixels and divided by the
     zoom, then capped against the layer so a tiny ornament's handles can never
     cover the artwork they belong to. */
  const handleHit = selectionBox
    ? Math.max(
        6 / scale,
        Math.min(
          (coarsePointer ? 30 : 18) / scale,
          Math.min(selectionBox.w, selectionBox.h) * 0.3,
        ),
      )
    : 0;
  const handleDot = Math.min(handleHit * 0.62, 11 / scale);
  const rotateGap = (coarsePointer ? 30 : 24) / scale;

  // Overlay geometry. The grid is a percentage of the artboard, so it looks
  // the same on a 1000 px card and a 2480 px A4 print canvas. The safe area
  // uses the page's saved print margin, or a sensible 4% when none is set.
  const gridStep = Math.max(20, size.width / 20);
  const safeMargin = Math.max(
    0,
    page.margin && page.margin > 0
      ? page.margin
      : Math.round(size.width * 0.04),
  );
  /* Bleed beyond the trim, in canvas units. The band is drawn outside the
     page box, so the guide shows exactly what the guillotine will cut away. */
  const bleed = Math.max(0, page.bleed ?? 0);
  /* Rulers tick in the workspace's display unit: millimetres on a printed
     suite, inches on a 5 × 7, pixels on a story. Both axes are labelled, so a
     measurement read off the ruler is always a physical one — the zoom only
     changes how large those ticks appear, never the number on them. */
  const rulerXTicks = rulerTicksFor(size.width, unit);
  const rulerYTicks = rulerTicksFor(size.height, unit);


  // Inline editing is local to the canvas; the studio needs to know so it can
  // disable Delete while a caret is inside a text layer.
  useEffect(() => {
    onEditingChange?.(Boolean(editing));
    return () => {
      if (editing) onEditingChange?.(false);
    };
  }, [editing, onEditingChange]);

  useEffect(() => {
    const node = hostRef.current;
    if (!node) return;
    const measure = () => {
      const width = node.clientWidth;
      const height = node.clientHeight;
      setFit(Math.min((width - 56) / size.width, (height - 56) / size.height));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [size.width, size.height]);

  useEffect(() => {
    if (!editRequest) return;
    const element = page.elements.find((candidate) => candidate.id === editRequest.id);
    if (!element || element.kind !== "text" || element.locked) return;
    const frame = requestAnimationFrame(() => {
      setMenu(null);
      editFinished.current = false;
      setEditing({ id: element.id, original: element.text ?? "", caret: null });
    });
    return () => cancelAnimationFrame(frame);
  }, [editRequest, page.elements]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setPan({ x: 0, y: 0 }));
    return () => cancelAnimationFrame(frame);
  }, [resetViewToken]);

  const selectOnlyIfNeeded = useCallback(
    (element: DesignElement, additive: boolean) => {
      const grouped = element.groupId
        ? page.elements
            .filter((candidate) => candidate.groupId === element.groupId)
            .map((candidate) => candidate.id)
        : [];
      const targetIds = grouped.length > 0 ? grouped : [element.id];
      if (additive) {
        const next = new Set(selectedIds);
        targetIds.forEach((id) => (next.has(id) ? next.delete(id) : next.add(id)));
        onSelect([...next]);
        return targetIds;
      }
      if (!selectedIds.includes(element.id)) {
        onSelect(targetIds);
        return targetIds;
      }
      return targetIds;
    },
    [onSelect, page.elements, selectedIds],
  );

  const beginMove = (event: ReactPointerEvent, element: DesignElement) => {
    if (spaceHeld || event.button !== 0) return;
    event.stopPropagation();
    if (element.locked && !event.shiftKey) {
      onSelect([element.id]);
      return;
    }
    const ids = selectOnlyIfNeeded(element, event.shiftKey);
    if (element.locked) return;
    if (event.altKey) {
      onAltDuplicate?.();
    }
    event.stopPropagation();
    const originals = new Map(
      page.elements
        .filter((candidate) => ids.includes(candidate.id) && !candidate.locked)
        .map((candidate) => [candidate.id, candidate]),
    );
    const next: DragState = {
      mode: "move",
      startX: event.clientX,
      startY: event.clientY,
      originals,
      anchor: element,
      centerX: element.x + element.w / 2,
      centerY: element.y + element.h / 2,
      startAngle: 0,
    };
    setDrag(next);
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  };

  /**
   * Starts a resize from one of the eight handles. Only the layer that owns the
   * handle is transformed: the engine works in that layer's own axes, so a
   * rotated card grows along its own edges instead of the screen's.
   */
  const beginResize = (event: ReactPointerEvent, handle: Handle) => {
    const element = selected[0];
    if (!element || element.locked || editing) return;
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    setMenu(null);
    setDrag({
      mode: "resize",
      handle,
      startX: event.clientX,
      startY: event.clientY,
      originals: new Map([[element.id, element]]),
      anchor: element,
      centerX: 0,
      centerY: 0,
      startAngle: 0,
    });
  };

  /**
   * Starts a rotation from the handle above the layer. The pivot is the layer's
   * centre in screen space, which is what the engine measures its angle from.
   */
  const beginRotate = (event: ReactPointerEvent) => {
    const element = selected[0];
    if (!element || element.locked || editing) return;
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    setMenu(null);
    const host = designRef.current?.getBoundingClientRect();
    const centerX = (host?.left ?? 0) + (element.x + element.w / 2) * scale;
    const centerY = (host?.top ?? 0) + (element.y + element.h / 2) * scale;
    setDrag({
      mode: "rotate",
      startX: event.clientX,
      startY: event.clientY,
      originals: new Map([[element.id, element]]),
      anchor: element,
      centerX,
      centerY,
      startAngle: Math.atan2(event.clientY - centerY, event.clientX - centerX),
    });
  };

  /* ------------------------------------------------------------- drag / pan */

  useEffect(() => {
    if (!drag) return;

    const handleMove = (event: PointerEvent) => {
      const current = drag;
      if (!current) return;
      const dx = (event.clientX - current.startX) / scale;
      const dy = (event.clientY - current.startY) / scale;

      if (current.mode === "move") {
        const anchor = current.anchor;
        let snapDx = dx;
        let snapDy = dy;

        if (current.originals.size === 1 && !event.altKey && enableSnap) {
          const candidateX = anchor.x + dx;
          const candidateY = anchor.y + dy;
          const xTargets = [
            0,
            size.width / 2 - anchor.w / 2,
            size.width - anchor.w,
            ...(showGuides
              ? userGuides.x.flatMap((guide) => [
                  guide,
                  guide - anchor.w / 2,
                  guide - anchor.w,
                ])
              : []),
            ...page.elements
              .filter((element) => element.id !== anchor.id && !element.hidden)
              .flatMap((element) => [
                element.x,
                element.x + element.w / 2 - anchor.w / 2,
                element.x + element.w - anchor.w,
              ]),
          ];
          const yTargets = [
            0,
            size.height / 2 - anchor.h / 2,
            size.height - anchor.h,
            ...(showGuides
              ? userGuides.y.flatMap((guide) => [
                  guide,
                  guide - anchor.h / 2,
                  guide - anchor.h,
                ])
              : []),
            ...page.elements
              .filter((element) => element.id !== anchor.id && !element.hidden)
              .flatMap((element) => [
                element.y,
                element.y + element.h / 2 - anchor.h / 2,
                element.y + element.h - anchor.h,
              ]),
          ];
          const xSnap = xTargets.find((target) => Math.abs(target - candidateX) < SNAP_THRESHOLD);
          const ySnap = yTargets.find((target) => Math.abs(target - candidateY) < SNAP_THRESHOLD);
          if (xSnap !== undefined) {
            snapDx = xSnap - anchor.x;
            setGuides((previous) => ({ ...previous, x: [xSnap + anchor.w / 2] }));
          } else {
            setGuides((previous) => ({ ...previous, x: [] }));
          }
          if (ySnap !== undefined) {
            snapDy = ySnap - anchor.y;
            setGuides((previous) => ({ ...previous, y: [ySnap + anchor.h / 2] }));
          } else {
            setGuides((previous) => ({ ...previous, y: [] }));
          }

          /* Equal gaps fill only the axes an edge or centre snap did not
             claim, so the two systems can never pull the layer apart. */
          const spacingSnap = equalSpacingGuides(
            {
              x: anchor.x + snapDx,
              y: anchor.y + snapDy,
              w: anchor.w,
              h: anchor.h,
            },
            page.elements.filter(
              (candidate) =>
                candidate.id !== anchor.id && !candidate.hidden && !candidate.locked,
            ),
            SNAP_THRESHOLD,
          );
          if (xSnap === undefined) snapDx += spacingSnap.dx;
          if (ySnap === undefined) snapDy += spacingSnap.dy;
          setSpacing(
            spacingSnap.segments.filter((segment) =>
              segment.orientation === "vertical"
                ? xSnap === undefined
                : ySnap === undefined,
            ),
          );
        } else {
          setSpacing([]);
        }

        const moves = [...current.originals.values()].map((element) => ({
          id: element.id,
          x: Math.round(clamp(element.x + snapDx, -element.w + 40, size.width - 40)),
          y: Math.round(clamp(element.y + snapDy, -element.h + 40, size.height - 40)),
        }));
        schedule(() => onMove(moves));
        return;
      }

      if (current.mode === "rotate") {
        const angle = Math.atan2(
          event.clientY - current.centerY,
          event.clientX - current.centerX,
        );
        const delta = ((angle - current.startAngle) * 180) / Math.PI;
        let rotation = current.anchor.rotation + delta;
        // Shift snaps to a clean fifteen degrees; free rotation stays precise.
        rotation = event.shiftKey ? Math.round(rotation / 15) * 15 : Math.round(rotation);
        rotation = ((rotation % 360) + 360) % 360;
        schedule(() => onRotate(current.anchor.id, rotation));
        return;
      }

      const handle = current.handle ?? "se";
      const original = current.originals.get(current.anchor.id) ?? current.anchor;
      // Work in the element's own axes so a rotated layer resizes along its
      // edges instead of the screen axes.
      const theta = (original.rotation * Math.PI) / 180;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      const localDx = dx * cos + dy * sin;
      const localDy = -dx * sin + dy * cos;
      let { x, y, w, h } = original;
      const minW = 24;
      const minH = 20;

      if (handle.includes("e")) w = Math.max(minW, original.w + localDx);
      if (handle.includes("s")) h = Math.max(minH, original.h + localDy);
      if (handle.includes("w")) {
        w = Math.max(minW, original.w - localDx);
        x = original.x + (original.w - w);
      }
      if (handle.includes("n")) {
        h = Math.max(minH, original.h - localDy);
        y = original.y + (original.h - h);
      }

      const proportional = aspectLocked || event.shiftKey;
      if (proportional && handle.length === 2) {
        const ratio = original.w / Math.max(1, original.h);
        const flipX = handle.includes("w");
        const flipY = handle.includes("n");
        if (Math.abs(w - original.w) >= Math.abs(h - original.h)) {
          h = w / ratio;

          y = flipY ? original.y + original.h - h : original.y;
        } else {
          w = h * ratio;
          x = flipX ? original.x + original.w - w : original.x;
        }
      }

      // Keep the opposite corner or edge pinned in screen space even when the
      // layer is rotated: the box grows around the handle the host grabbed.
      if (Math.abs(original.rotation) > 0.01) {
        const centerX0 = original.x + original.w / 2;
        const centerY0 = original.y + original.h / 2;
        const anchorX = handle.includes("e")
          ? original.x
          : handle.includes("w")
            ? original.x + original.w
            : centerX0;
        const anchorY = handle.includes("s")
          ? original.y
          : handle.includes("n")
            ? original.y + original.h
            : centerY0;
        const worldX =
          centerX0 + cos * (anchorX - centerX0) - sin * (anchorY - centerY0);
        const worldY =
          centerY0 + sin * (anchorX - centerX0) + cos * (anchorY - centerY0);
        const nextCenterX = x + w / 2;
        const nextCenterY = y + h / 2;
        const nextAnchorX = handle.includes("e")
          ? x
          : handle.includes("w")
            ? x + w
            : nextCenterX;
        const nextAnchorY = handle.includes("s")
          ? y
          : handle.includes("n")
            ? y + h
            : nextCenterY;
        const nextWorldX =
          nextCenterX +
          cos * (nextAnchorX - nextCenterX) -
          sin * (nextAnchorY - nextCenterY);
        const nextWorldY =
          nextCenterY +
          sin * (nextAnchorX - nextCenterX) +
          cos * (nextAnchorY - nextCenterY);
        x += worldX - nextWorldX;
        y += worldY - nextWorldY;
      }

      /* Resizing snaps the same way moving does: the edge being dragged lands
         on the page, its centre line, or a neighbouring layer. Rotated layers
         and proportional resizes stay free, because snapping either would
         fight the ratio or the layer's own axes. */
      if (!proportional && Math.abs(original.rotation) < 0.01 && enableSnap) {
        const others = page.elements.filter(
          (candidate) =>
            candidate.id !== original.id && !candidate.hidden && !candidate.locked,
        );
        const guideTargets = (list: number[]) => (showGuides ? list : []);
        const xTargets = [
          0,
          size.width / 2,
          size.width,
          ...guideTargets(userGuides.x),
          ...others.flatMap((element) => [
            element.x,
            element.x + element.w / 2,
            element.x + element.w,
          ]),
        ];
        const yTargets = [
          0,
          size.height / 2,
          size.height,
          ...guideTargets(userGuides.y),
          ...others.flatMap((element) => [
            element.y,
            element.y + element.h / 2,
            element.y + element.h,
          ]),
        ];
        const nearest = (value: number, targets: number[]) =>
          targets
            .filter((target) => Math.abs(target - value) < SNAP_THRESHOLD)
            .sort((a, b) => Math.abs(a - value) - Math.abs(b - value))[0];
        const linesX: number[] = [];
        const linesY: number[] = [];

        if (handle.includes("e")) {
          const hit = nearest(x + w, xTargets);
          if (hit !== undefined) {
            w = Math.max(minW, hit - x);
            linesX.push(hit);
          }
        }
        if (handle.includes("w")) {
          const right = x + w;
          const hit = nearest(x, xTargets);
          if (hit !== undefined) {
            x = hit;
            w = Math.max(minW, right - hit);
            linesX.push(hit);
          }
        }
        if (handle.includes("s")) {
          const hit = nearest(y + h, yTargets);
          if (hit !== undefined) {
            h = Math.max(minH, hit - y);
            linesY.push(hit);
          }
        }
        if (handle.includes("n")) {
          const bottom = y + h;
          const hit = nearest(y, yTargets);
          if (hit !== undefined) {
            y = hit;
            h = Math.max(minH, bottom - hit);
            linesY.push(hit);
          }
        }
        setGuides({ x: linesX, y: linesY });
      }

      const box = {
        x: Math.round(x),
        y: Math.round(y),
        w: Math.round(w),
        h: Math.round(h),
      };
      schedule(() => onResize(current.anchor.id, box));
    };

    const end = () => {
      setDrag(null);
      setGuides({ x: [], y: [] });
      setSpacing([]);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [aspectLocked, drag, enableSnap, onMove, onResize, onRotate, page.elements, scale, schedule, showGuides, size.height, size.width, userGuides.x, userGuides.y]);

  useEffect(() => {
    if (!panning) return;
    const move = (event: PointerEvent) => {
      const origin = panOrigin.current;
      if (!origin) return;
      setPan({
        x: origin.panX + event.clientX - origin.x,
        y: origin.panY + event.clientY - origin.y,
      });
    };
    const end = () => {
      setPanning(false);
      panOrigin.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [panning]);

  /* ---------------------------------------------------------- draft guides */

  /**
   * A guide being created from a ruler (`index: null`) or dragged around the
   * page. Guides are a workspace aid, never design data: they live in the
   * studio and no export path can pick them up.
   */
  const [guideDrag, setGuideDrag] = useState<{
    axis: "x" | "y";
    at: number;
    index: number | null;
  } | null>(null);

  /* The top ruler lays horizontal guides, the left ruler vertical ones — the
     same rule every drafting app follows. */
  const startGuideFromRuler = (axis: "x" | "y", event: ReactPointerEvent) => {
    if (!onUserGuidesChange) return;
    const rect = designRef.current?.getBoundingClientRect();
    if (!rect) return;
    const raw =
      axis === "x"
        ? (event.clientX - rect.left) / scale
        : (event.clientY - rect.top) / scale;
    event.preventDefault();
    event.stopPropagation();
    setGuideDrag({ axis, at: raw, index: null });
  };

  const startGuideMove = (
    axis: "x" | "y",
    index: number,
    event: ReactPointerEvent,
  ) => {
    if (!onUserGuidesChange) return;
    event.preventDefault();
    event.stopPropagation();
    setGuideDrag({
      axis,
      at: axis === "x" ? userGuides.x[index] : userGuides.y[index],
      index,
    });
  };

  useEffect(() => {
    if (!guideDrag || !onUserGuidesChange) return;
    const axis = guideDrag.axis;
    const index = guideDrag.index;

    /** Pointer → canvas units along the dragged axis, and whether it is over
        the page (a guide dropped off the page is deleted, not clamped). */
    const positionAt = (event: PointerEvent) => {
      const rect = designRef.current?.getBoundingClientRect();
      if (!rect) return null;
      const raw =
        axis === "x"
          ? (event.clientX - rect.left) / scale
          : (event.clientY - rect.top) / scale;
      const limit = axis === "x" ? size.width : size.height;
      return { raw, inside: raw >= 0 && raw <= limit, at: clamp(raw, 0, limit) };
    };

    const commit = (updater: (list: number[]) => number[]) => {
      const next = { x: [...userGuides.x], y: [...userGuides.y] };
      next[axis] = updater(next[axis]);
      onUserGuidesChange(next);
    };

    const move = (event: PointerEvent) => {
      const position = positionAt(event);
      if (!position) return;
      if (index !== null) {
        commit((list) =>
          list.map((value, itemIndex) => (itemIndex === index ? position.at : value)),
        );
      }
      setGuideDrag((current) =>
        current ? { ...current, at: position.at } : current,
      );
    };

    const end = (event: PointerEvent) => {
      const position = positionAt(event);
      if (position && index === null && position.inside) {
        // Released on the page: keep it, sorted so the list stays readable.
        commit((list) => [...list, position.at].sort((a, b) => a - b));
      } else if (position && index !== null && !position.inside) {
        // Dropped back onto a ruler (or off the page): the guide is deleted.
        commit((list) => list.filter((_, itemIndex) => itemIndex !== index));
      }
      setGuideDrag(null);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [guideDrag, onUserGuidesChange, scale, size.height, size.width, userGuides.x, userGuides.y]);

  useEffect(() => {
    const typing = (target: EventTarget | null) => {
      const node = target as HTMLElement | null;
      return Boolean(
        node &&
          (node.tagName === "INPUT" ||
            node.tagName === "TEXTAREA" ||
            node.tagName === "SELECT" ||
            node.isContentEditable),
      );
    };
    const down = (event: KeyboardEvent) => {
      if (event.code !== "Space" || typing(event.target)) return;
      event.preventDefault();
      setSpaceHeld(true);
    };
    const up = (event: KeyboardEvent) => {
      if (event.code === "Space") setSpaceHeld(false);
    };
    const blur = () => setSpaceHeld(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  /* -------------------------------------------------------- inline editing */


  /**
   * Leaves inline editing once. `commit` is false for Escape, and an empty box
   * keeps the original wording instead of silently deleting the layer.
   */
  const finishEditing = useCallback(
    (commit: boolean) => {
      if (editFinished.current) return;
      editFinished.current = true;
      const state = editing;
      if (!state) {
        setEditing(null);
        return;
      }
      const raw = editorRef.current?.innerText ?? state.original;
      const text = cleanEditedText(raw);
      setEditing(null);
      setDrag(null);
      if (!commit) return;
      if (!shouldCommitText(text, state.original)) return;
      onTextCommit?.(state.id, text);
    },
    [editing, onTextCommit],
  );

  useLayoutEffect(() => {
    if (!editing) return;
    const node = editorRef.current;
    if (!node) return;
    node.textContent = editing.original;
    node.focus({ preventScroll: true });
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(false);
    if (editing.caret && typeof document.caretRangeFromPoint === "function") {
      const point = document.caretRangeFromPoint(editing.caret.x, editing.caret.y);
      if (point && node.contains(point.startContainer)) {
        selection.removeAllRanges();
        selection.addRange(point);
        return;
      }
    }
    selection.removeAllRanges();
    selection.addRange(range);
  }, [editing]);

  /* --------------------------------------------------------------- menu */

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(null);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", key);
    window.addEventListener("blur", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", key);
      window.removeEventListener("blur", close);
    };
  }, [menu]);

  /* ---------------------------------------------------------- wheel / pan */

  useEffect(() => {
    const node = hostRef.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        const next = clamp(zoom * (1 - event.deltaY * 0.0015), 0.4, 2.4);
        const rect = node.getBoundingClientRect();
        const offsetX = event.clientX - (rect.left + rect.width / 2);
        const offsetY = event.clientY - (rect.top + rect.height / 2);
        const ratio = next / Math.max(0.001, zoom);
        setPan((previous) => ({
          x: previous.x - (offsetX - previous.x) * (ratio - 1),
          y: previous.y - (offsetY - previous.y) * (ratio - 1),
        }));
        onZoom(next);
      } else {
        setPan((previous) => ({
          x: previous.x - event.deltaX,
          y: previous.y - event.deltaY,
        }));
      }
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [onZoom, zoom]);

  const handleTouches = (event: ReactTouchEvent) => {
    if (event.touches.length !== 2) {
      pinch.current = null;
      return;
    }
    const [a, b] = [event.touches[0], event.touches[1]];
    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const centerX = (a.clientX + b.clientX) / 2;
    const centerY = (a.clientY + b.clientY) / 2;
    if (!pinch.current) {
      pinch.current = { distance, zoom, centerX, centerY };
      return;
    }
    const previous = pinch.current;
    const host = hostRef.current?.getBoundingClientRect();
    const ratio = distance / Math.max(1, previous.distance);
    const next = clamp(previous.zoom * ratio, 0.4, 2.4);
    if (host) {
      const offsetX = centerX - (host.left + host.width / 2);
      const offsetY = centerY - (host.top + host.height / 2);
      const zoomRatio = next / Math.max(0.001, previous.zoom);
      setPan((current) => ({
        x:
          current.x +
          (centerX - previous.centerX) -
          (offsetX - current.x) * (zoomRatio - 1),
        y:
          current.y +
          (centerY - previous.centerY) -
          (offsetY - current.y) * (zoomRatio - 1),
      }));
    }
    onZoom(next);
  };

  return (
    <div
      ref={hostRef}
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      onPointerDown={(event) => {
        if (event.button === 1 || spaceHeld) {
          event.preventDefault();
          panOrigin.current = {
            x: event.clientX,
            y: event.clientY,
            panX: pan.x,
            panY: pan.y,
          };
          setPanning(true);
          return;
        }
        if (event.pointerType === "touch" && zoom > 1.02) {
          panOrigin.current = {
            x: event.clientX,
            y: event.clientY,
            panX: pan.x,
            panY: pan.y,
          };
          setPanning(true);
          return;
        }
        onSelect([]);
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        setMenu({ x: event.clientX, y: event.clientY, elementId: null });
      }}
      onTouchStart={handleTouches}
      onTouchMove={handleTouches}
      style={{
        touchAction: "none",
        cursor: panning ? "grabbing" : spaceHeld ? "grab" : "default",
      }}
    >
      <div
        className="relative shrink-0 shadow-[0_30px_80px_rgba(22,22,22,0.18)]"
        style={{
          width: size.width * scale,
          height: size.height * scale,
          transform: `translate(${pan.x}px, ${pan.y}px)`,
        }}
      >
        <div
          ref={designRef}
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: size.width,
            height: size.height,
            transform: `scale(${scale})`,
          }}
        >
          <DesignPageView
            page={page}
            time={time}
            imageUrls={imageUrls}
            guestName={guestName}
            rtl={rtl}
            interactive={false}
            editor
            showHidden={showHidden}
            selectedIds={[]}
            revealPreview={revealPreview}
            onReveal={onReveal}
            ignoreExit={ignoreExit}
            hideElementId={editing?.id}
            materialPreview={materialPreview}
            className="shadow-none"
          />

          {/* Grid and safe-area overlays: drawing aids, never printed, never
              saved. Both live in design coordinates so they scale with zoom. */}
          {showGrid && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.5]"
              style={{
                zIndex: 4,
                backgroundImage:
                  "linear-gradient(to right, rgba(113,0,20,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(113,0,20,0.14) 1px, transparent 1px)",
                backgroundSize: `${gridStep}px ${gridStep}px`,
              }}
            />
          )}
          {/* Print guides: bleed, trim and safe area, each drawn distinctly.
              They live on the canvas only — no export path reads them. */}
          {showSafeArea && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ zIndex: 5 }}
            >
              {bleed > 0 && (
                <div
                  className="absolute border border-dashed border-[#a67c00]/65"
                  style={{
                    left: -bleed,
                    top: -bleed,
                    width: size.width + bleed * 2,
                    height: size.height + bleed * 2,
                  }}
                />
              )}
              <div className="absolute inset-0 border border-[#710014]/55" />
              {safeMargin > 0 && (
                <div
                  className="absolute border border-dashed border-[#710014]/35"
                  style={{
                    left: safeMargin,
                    top: safeMargin,
                    width: Math.max(1, size.width - safeMargin * 2),
                    height: Math.max(1, size.height - safeMargin * 2),
                  }}
                />
              )}
            </div>
          )}

          {/* Centre lines: optional drafting aids for centring by eye. */}
          {showGuides && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ zIndex: 6 }}
            >
              <span
                className="absolute top-0 h-full border-l border-dashed border-[#710014]/30"
                style={{ left: size.width / 2 }}
              />
              <span
                className="absolute left-0 w-full border-t border-dashed border-[#710014]/30"
                style={{ top: size.height / 2 }}
              />
            </div>
          )}

          {/* Envelope drafting guides: measurement, never artwork. */}
          {envelope && (
            <EnvelopeGuides
              geometry={geometryForPage(envelope.geometry, size.width, size.height)}
              view={envelope.view}
              width={size.width}
              height={size.height}
              scale={scale}
              liner={envelope.liner}
            />
          )}

          {/* Selection and hit layer, in the same design coordinates. */}
          <div className="absolute inset-0" style={{ zIndex: 50 }}>
            {page.elements.map((element, index) => {
              if (element.hidden && !showHidden) return null;
              const isSelected = selectedIds.includes(element.id);
              return (
                <div
                  key={element.id}
                  role="button"
                  tabIndex={-1}
                  aria-label={`${element.name} layer`}
                  className={cn(
                    "absolute cursor-move",
                    element.locked && "cursor-not-allowed",
                    editing?.id === element.id && "pointer-events-none opacity-0",
                  )}
                  style={{
                    left: element.x,
                    top: element.y,
                    width: element.w,
                    height: element.h,
                    transform: `rotate(${element.rotation}deg)`,
                    zIndex: index,
                    // Divided by the zoom so the selection line stays a crisp
                    // hairline instead of dissolving when the card is fitted.
                    outline: isSelected
                      ? `${Math.max(1.2 / scale, 0.6)}px solid #710014`
                      : element.locked
                        ? `${Math.max(1 / scale, 0.6)}px dashed rgba(113,0,20,0.32)`
                        : "none",
                  }}
                  onPointerDown={(event) =>
                    beginMove(event as ReactPointerEvent, element)
                  }
                  onDoubleClick={(event) => {
                    if (element.kind !== "text" || element.locked) return;
                    event.stopPropagation();
                    setDrag(null);
                    setMenu(null);
                    editFinished.current = false;
                    setEditing({
                      id: element.id,
                      original: element.text ?? "",
                      caret: { x: event.clientX, y: event.clientY },
                    });
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (!selectedIds.includes(element.id)) onSelect([element.id]);
                    setMenu({
                      x: event.clientX,
                      y: event.clientY,
                      elementId: element.id,
                    });
                  }}
                >
                  {isSelected && !element.locked && !editing && (
                    <span
                      className="absolute left-0 top-0 -translate-y-full bg-[#710014] px-1.5 py-0.5 text-[11px] uppercase tracking-[0.12em] text-[#f2f1ed]"
                      style={{ transform: `translateY(-100%) rotate(${-element.rotation}deg)` }}
                    >
                      {element.name}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Inline text editing. The editor is drawn in the layer's own place
              with the same family, size, leading, tracking, case, fill and
              outline as the artwork, so what is typed is what is saved. */}
          {editing && (() => {
            const element = page.elements.find(
              (candidate) => candidate.id === editing.id,
            );
            if (!element) return null;
            const effects = element.effects;
            const gradient = effects?.gradient;
            const gradientText = Boolean(gradient?.enabled);
            const glyphStroke = outlineWidth(effects);
            const outline = effects?.outline;
            const direction =
              element.direction === "rtl"
                ? ("rtl" as const)
                : element.direction === "ltr"
                  ? ("ltr" as const)
                  : rtl
                    ? ("rtl" as const)
                    : ("ltr" as const);
            const borderWidth = element.textBorderWidth ?? 0;
            return (
              <div
                className="absolute"
                style={{
                  left: element.x,
                  top: element.y,
                  width: element.w,
                  height: element.h,
                  transform: `rotate(${element.rotation}deg)`,
                  zIndex: 72,
                  display: "flex",
                  overflow: "hidden",
                  alignItems:
                    element.verticalAlign === "top"
                      ? "flex-start"
                      : element.verticalAlign === "bottom"
                        ? "flex-end"
                        : "center",
                  justifyContent: "center",
                  padding:
                    element.textPadding ??
                    (borderWidth || element.textBackground ? 10 : 0),
                  background: element.textBackground,
                  border:
                    borderWidth > 0
                      ? `${borderWidth}px solid ${element.textBorder ?? "transparent"}`
                      : undefined,
                  borderRadius: element.textRadius ?? 0,
                  boxShadow: element.textShadow
                    ? "0 18px 44px rgba(22,22,22,0.24)"
                    : undefined,
                  filter: effectFilter(effects),
                }}
                onPointerDown={(event) => event.stopPropagation()}
                onDoubleClick={(event) => event.stopPropagation()}
              >
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  role="textbox"
                  aria-label={`Edit ${element.name}`}
                  aria-multiline="true"
                  spellCheck={false}
                  dir={direction}
                  onKeyDown={(event) => {
                    event.stopPropagation();
                    if (event.key === "Escape") {
                      event.preventDefault();
                      finishEditing(false);
                      return;
                    }
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      finishEditing(true);
                    }
                  }}
                  onBlur={() => finishEditing(true)}
                  className="w-full whitespace-pre-wrap break-words outline-none"
                  style={{
                    fontFamily: fontFamilyFor(
                      element.font ?? "cormorant-garamond",
                    ),
                    fontSize: element.fontSize ?? 26,
                    fontWeight: element.fontWeight ?? 400,
                    fontStyle: element.italic ? "italic" : "normal",
                    letterSpacing: `${element.letterSpacing ?? 0}em`,
                    lineHeight: element.lineHeight ?? 1.4,
                    textAlign: element.align ?? "center",
                    textTransform:
                      element.textTransform ??
                      (element.uppercase ? "uppercase" : "none"),
                    textDecoration: element.textDecoration ?? "none",
                    color: gradientText
                      ? "transparent"
                      : (element.color ?? "#161616"),
                    backgroundImage:
                      gradientText && gradient ? gradientCss(gradient) : undefined,
                    WebkitBackgroundClip: gradientText ? "text" : undefined,
                    backgroundClip: gradientText ? "text" : undefined,
                    WebkitTextFillColor: gradientText ? "transparent" : undefined,
                    WebkitTextStroke:
                      glyphStroke > 0 && outline
                        ? `${glyphStroke}px ${outline.color}`
                        : undefined,
                    direction,
                    unicodeBidi:
                      element.direction === "auto" ? "plaintext" : "normal",
                    caretColor: element.color ?? "#710014",
                  }}
                />
              </div>
            );
          })()}

          {/* Direct manipulation: eight resize points and a rotation grip on the
              selected layer. The wrapper is the layer's own box, so the whole
              frame turns with the card; only the controls are counter-sized. */}
          {selectionBox && (
            <div
              className="absolute"
              style={{
                left: selectionBox.x,
                top: selectionBox.y,
                width: selectionBox.w,
                height: selectionBox.h,
                transform: `rotate(${selectionBox.rotation}deg)`,
                zIndex: 58,
                pointerEvents: "none",
              }}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute left-1/2"
                style={{
                  bottom: "100%",
                  width: Math.max(1 / scale, 1),
                  // Reaches the centre of the grip, so the stem meets the dot.
                  height: rotateGap + handleDot / 2,
                  marginLeft: -Math.max(1 / scale, 1) / 2,
                  background: "#710014",
                  opacity: 0.55,
                }}
              />
              <button
                type="button"
                title="Rotate layer — hold Shift for 15° steps"
                aria-label="Rotate layer"
                onPointerDown={beginRotate}
                className="absolute rounded-full"
                style={{
                  left: "50%",
                  bottom: `calc(100% + ${rotateGap}px)`,
                  width: handleHit,
                  height: handleHit,
                  marginLeft: -handleHit / 2,
                  marginBottom: -handleHit / 2,
                  pointerEvents: "auto",
                  touchAction: "none",
                  cursor: "grab",
                  background: "transparent",
                }}
              >
                <span
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
                  style={{
                    width: handleDot,
                    height: handleDot,
                    border: `${Math.max(1.4 / scale, 0.5)}px solid #710014`,
                    boxShadow: "0 1px 3px rgba(22,22,22,0.28)",
                  }}
                />
              </button>
              {HANDLES.map((handle) => (
                <button
                  key={handle.id}
                  type="button"
                  title={handle.label}
                  aria-label={handle.label}
                  onPointerDown={(event) => beginResize(event, handle.id)}
                  className="absolute"
                  style={{
                    left: handle.x * 100 + "%",
                    top: handle.y * 100 + "%",
                    width: handleHit,
                    height: handleHit,
                    marginLeft: -handleHit / 2,
                    marginTop: -handleHit / 2,
                    pointerEvents: "auto",
                    touchAction: "none",
                    cursor: handle.cursor,
                    background: "transparent",
                    border: 0,
                    padding: 0,
                  }}
                >
                  <span
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
                    style={{
                      width: handleDot,
                      height: handleDot,
                      border: `${Math.max(1.4 / scale, 0.5)}px solid #710014`,
                      boxShadow: "0 1px 3px rgba(22,22,22,0.28)",
                    }}
                  />
                </button>
              ))}
            </div>
          )}

          {/* Centre guides the drag is currently snapping to. They sit above
              the artwork but below the handles so they never hide a control. */}
          {(guides.x.length > 0 || guides.y.length > 0 || spacing.length > 0) && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ zIndex: 55 }}
            >
              {spacing.map((segment, index) =>
                segment.orientation === "vertical" ? (
                  <span
                    key={`spacing-v-${index}`}
                    className="absolute border-l border-dashed border-[#710014]/55"
                    style={{
                      left: segment.at,
                      top: Math.min(segment.from, segment.to),
                      height: Math.abs(segment.to - segment.from),
                    }}
                  />
                ) : (
                  <span
                    key={`spacing-h-${index}`}
                    className="absolute border-t border-dashed border-[#710014]/55"
                    style={{
                      top: segment.at,
                      left: Math.min(segment.from, segment.to),
                      width: Math.abs(segment.to - segment.from),
                    }}
                  />
                ),
              )}
              {guides.x.map((x) => (
                <span
                  key={`x-${x}`}
                  className="absolute inset-y-0 w-px bg-[#710014]/70"
                  style={{ left: x }}
                />
              ))}
              {guides.y.map((y) => (
                <span
                  key={`y-${y}`}
                  className="absolute inset-x-0 h-px bg-[#710014]/70"
                  style={{ top: y }}
                />
              ))}
            </div>
          )}

          {/* The user's own guides. They sit above the artwork so they can be
              grabbed, but their hit strip is only a few pixels wide, so a click
              anywhere else still reaches the layer underneath. */}
          {(showGuides || guideDrag?.index === null) && (
            <div className="absolute inset-0" style={{ zIndex: 54 }}>
              {showGuides &&
                userGuides.x.map((gx, index) => (
                <div
                  key={`guide-x-${index}`}
                  className="absolute top-0 cursor-ew-resize"
                  style={{
                    left: gx - Math.max(6, 8 / scale) / 2,
                    width: Math.max(6, 8 / scale),
                    height: size.height,
                  }}
                  onPointerDown={(event) => startGuideMove("x", index, event)}
                >
                  <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[#35708f]" />
                </div>
              ))}
              {showGuides &&
                userGuides.y.map((gy, index) => (
                <div
                  key={`guide-y-${index}`}
                  className="absolute left-0 cursor-ns-resize"
                  style={{
                    top: gy - Math.max(6, 8 / scale) / 2,
                    height: Math.max(6, 8 / scale),
                    width: size.width,
                  }}
                  onPointerDown={(event) => startGuideMove("y", index, event)}
                >
                  <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-[#35708f]" />
                </div>
              ))}
              {/* A guide being pulled out of a ruler follows the pointer until
                  it is released on the page — or dropped off it to cancel. */}
              {guideDrag?.index === null &&
                (guideDrag.axis === "x" ? (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute top-0 w-px bg-[#35708f]/70"
                    style={{ left: guideDrag.at, height: size.height }}
                  />
                ) : (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute left-0 h-px bg-[#35708f]/70"
                    style={{ top: guideDrag.at, width: size.width }}
                  />
                ))}
            </div>
          )}
        </div>

        {showRulers && (
          <>
            {/* Top ruler: reads the horizontal axis. Dragging out of it lays a
                horizontal guide down the page. */}
            <div
              aria-hidden
              title="Drag down from the ruler to drop a horizontal guide"
              className="absolute cursor-ns-resize border border-ink/15 bg-[var(--paper-light)] text-[8px] text-ink/45"
              style={{
                left: 0,
                top: -16,
                height: 14,
                width: size.width * scale,
                zIndex: 60,
              }}
              onPointerDown={(event) => startGuideFromRuler("y", event)}
            >
              {rulerXTicks.map((tick) => (
                <span
                  key={`x-${tick.value}`}
                  className="absolute top-0 h-full"
                  style={{ left: tick.value * scale }}
                >
                  <span
                    className="absolute left-0 top-0 w-px bg-ink/25"
                    style={{ height: tick.major ? 7 : 4 }}
                  />
                  {tick.major && (
                    <span className="absolute left-1 top-1/2 -translate-y-1/2 whitespace-nowrap tabular-nums">
                      {tick.label}
                    </span>
                  )}
                </span>
              ))}
              <span
                className="absolute right-0 top-0 flex h-full items-center bg-[var(--paper-light)] px-1 font-meta uppercase tracking-[0.08em] text-ink/40"
                style={{ fontSize: 7 }}
              >
                {unit}
              </span>
            </div>
            {/* Left ruler: reads the vertical axis, labels turned on their side. */}
            <div
              aria-hidden
              title="Drag across the ruler to drop a vertical guide"
              className="absolute cursor-ew-resize border border-ink/15 bg-[var(--paper-light)] text-[8px] text-ink/45"
              style={{
                left: -16,
                top: 0,
                width: 14,
                height: size.height * scale,
                zIndex: 60,
              }}
              onPointerDown={(event) => startGuideFromRuler("x", event)}
            >
              {rulerYTicks.map((tick) => (
                <span
                  key={`y-${tick.value}`}
                  className="absolute left-0 w-full"
                  style={{ top: tick.value * scale }}
                >
                  <span
                    className="absolute left-0 top-0 h-px bg-ink/25"
                    style={{ width: tick.major ? 7 : 4 }}
                  />
                  {tick.major && (
                    <span
                      className="absolute left-px whitespace-nowrap tabular-nums"
                      style={{
                        top: 4,
                        transform: "rotate(-90deg)",
                        transformOrigin: "0 0",
                      }}
                    >
                      {tick.label}
                    </span>
                  )}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
      {menu && (
        <ContextMenu
          menu={menu}
          locked={Boolean(menu.elementId) && selected.every((element) => element.locked)}
          hidden={Boolean(menu.elementId) && selected.every((element) => element.hidden)}
          hasSelection={selectedIds.length > 0}
          onAction={(action) => onContextAction?.(action)}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}



