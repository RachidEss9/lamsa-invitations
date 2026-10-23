import {
  pageSizeOf,
  type DesignElement,
  type DesignPage,
} from "@/lib/design";
import { fontFamilyFor } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { createPortal } from "react-dom";
import { DesignPageView } from "@/components/invitation/DesignPageView";

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
      className="fixed z-[120] w-[214px] border border-ink/20 bg-[#f7f6f2] py-1 shadow-[0_18px_50px_rgba(22,22,22,0.22)]"
      style={{
        left: Math.min(menu.x, window.innerWidth - 224),
        top: Math.min(menu.y, window.innerHeight - 380),
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      <p className="px-3 pb-1 pt-1.5 font-meta text-[8px] uppercase tracking-[0.18em] text-ink/35">
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
            "flex w-full items-center justify-between px-3 py-1.5 text-left text-[11px] transition-colors hover:bg-ink hover:text-[#f2f1ed] disabled:cursor-not-allowed disabled:opacity-35",
            item.divider && "mt-1 border-t border-ink/10 pt-2",
          )}
        >
          <span>{item.label}</span>
          {item.shortcut && <span className="text-[9px] opacity-50">{item.shortcut}</span>}
        </button>
      ))}
      <p className="border-t border-ink/10 px-3 pb-1 pt-1.5 text-[8px] leading-relaxed text-ink/35">
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
  resetViewToken = 0,
  editRequest,
  onZoom,
  onSelect,
  onMove,
  onResize,
  onRotate,
  onReveal,
  onAltDuplicate,
  onTextCommit,
  onContextAction,
  onEditingChange,
}: StudioCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const designRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [fit, setFit] = useState(0);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [guides, setGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [panning, setPanning] = useState(false);
  const panOrigin = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const isCoarseTouch = useMemo(
    () =>
      typeof window !== "undefined"
        ? window.matchMedia("(pointer: coarse)").matches
        : false,
    [],
  );
  const handleSize = isCoarseTouch ? 18 : 11;
  const rotateSize = isCoarseTouch ? 20 : 15;
  const pinch = useRef<{
    distance: number;
    zoom: number;
    centerX: number;
    centerY: number;
  } | null>(null);

  const scale = Math.max(0.05, fit * zoom);
  const size = pageSizeOf(page);
  const selected = page.elements.filter((element) => selectedIds.includes(element.id));
  const single = selected.length === 1 ? selected[0] : null;
  const editingElement = editing
    ? page.elements.find((element) => element.id === editing.id) ?? null
    : null;

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

  const beginHandle = (
    event: ReactPointerEvent,
    element: DesignElement,
    mode: "resize" | "rotate",
    handle?: Handle,
  ) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    const originals = new Map([[element.id, element]]);
    // Rotation is measured in screen space, so the element centre has to be
    // converted from design coordinates through the canvas scale and pan.
    const rect = designRef.current?.getBoundingClientRect();
    const centerX = (rect?.left ?? 0) + (element.x + element.w / 2) * scale;
    const centerY = (rect?.top ?? 0) + (element.y + element.h / 2) * scale;
    setDrag({
      mode,
      handle,
      startX: event.clientX,
      startY: event.clientY,
      originals,
      anchor: element,
      centerX,
      centerY,
      startAngle: Math.atan2(event.clientY - centerY, event.clientX - centerX),
    });
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
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

        if (current.originals.size === 1 && !event.altKey) {
          const candidateX = anchor.x + dx;
          const candidateY = anchor.y + dy;
          const xTargets = [
            0,
            size.width / 2 - anchor.w / 2,
            size.width - anchor.w,
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
        }

        const moves = [...current.originals.values()].map((element) => ({
          id: element.id,
          x: Math.round(clamp(element.x + snapDx, -element.w + 40, size.width - 40)),
          y: Math.round(clamp(element.y + snapDy, -element.h + 40, size.height - 40)),
        }));
        onMove(moves);
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
        onRotate(current.anchor.id, rotation);
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

      onResize(current.anchor.id, {
        x: Math.round(x),
        y: Math.round(y),
        w: Math.round(w),
        h: Math.round(h),
      });
    };

    const end = () => {
      setDrag(null);
      setGuides({ x: [], y: [] });
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [aspectLocked, drag, onMove, onResize, onRotate, page.elements, scale]);

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

  const finishEditing = useCallback(
    (cancel = false) => {
      const node = editorRef.current;
      const current = editing;
      if (!current) return;
      if (!cancel && node && onTextCommit) {
        const text = node.innerText.replace(/\u00a0/g, " ");
        if (text !== current.original) onTextCommit(current.id, text);
      }
      setEditing(null);
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

  const guidesForRender = useMemo(() => guides, [guides]);

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
            selectedIds={[]}
            revealPreview={revealPreview}
            onReveal={onReveal}
            ignoreExit={ignoreExit}
            hideElementId={editing?.id}
            className="shadow-none"
          />

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
                    outline: isSelected ? "1.5px solid #710014" : "none",
                  }}
                  onPointerDown={(event) =>
                    beginMove(event as ReactPointerEvent, element)
                  }
                  onDoubleClick={(event) => {
                    if (element.kind !== "text" || element.locked) return;
                    event.stopPropagation();
                    setDrag(null);
                    setMenu(null);
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

            {single && !single.locked && !editing && (                    <button
                      type="button"
                      className="pointer-events-none absolute"
                      style={{
                        left: single.x,
                        top: single.y,
                        width: single.w,
                        height: single.h,
                        transform: `rotate(${single.rotation}deg)`,
                        zIndex: 60,
                      }}
                      aria-hidden="true"
                    >
                      {(["nw", "n", "ne", "e", "se", "s", "sw", "w"] as Handle[]).map(
                        (handle) => {
                          const positions: Record<Handle, { left: string; top: string; cursor: string }> = {
                            nw: { left: "0", top: "0", cursor: "nwse-resize" },
                            n: { left: "50%", top: "0", cursor: "ns-resize" },
                            ne: { left: "100%", top: "0", cursor: "nesw-resize" },
                            e: { left: "100%", top: "50%", cursor: "ew-resize" },
                            se: { left: "100%", top: "100%", cursor: "nwse-resize" },
                            s: { left: "50%", top: "100%", cursor: "ns-resize" },
                            sw: { left: "0", top: "100%", cursor: "nesw-resize" },
                            w: { left: "0", top: "50%", cursor: "ew-resize" },
                          };
                    const position = positions[handle];
                    return (
                      <button
                        type="button"
                        key={handle}
                        className={cn(
                          "pointer-events-auto rounded-full border",
                          "inset-0 -translate-x-1/2 -translate-y-1/2",
                          isCoarseTouch || handle.length === 1
                            ? "bg-[#710014]/20"
                            : "border-[#710014] bg-[#f2f1ed]",
                        )}
                        style={{
                          left: position.left,
                          top: position.top,
                          width: handleSize / scale,
                          height: handleSize / scale,
                          borderWidth: 1.5 / scale,
                          cursor: position.cursor,
                          touchAction: "none",
                        }}
              aria-label={`Resize ${handle}`}
              onPointerDown={(event) =>
                beginHandle(event as ReactPointerEvent, single, "resize", handle)
              }
              onTouchStart={(event) =>
                beginHandle(event as unknown as ReactPointerEvent, single, "resize", handle)
              }
            >
              {isCoarseTouch || handle.length === 1 ? (
                <span
                  className="ring-1 ring-[#710014]"
                  style={{ width: 3 / scale, height: 3 / scale, margin: "auto", display: "block" }}
                />
              ) : null}
            </button>
          );
                  },
                )}
                <button
                  type="button"
                  className="pointer-events-auto rounded-full border cursor-grab bg-[#f2f1ed] -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: "50%",
                    top: -(rotateSize / scale + 9 / scale),
                    width: rotateSize / scale,
                    height: rotateSize / scale,
                    borderWidth: 1.5 / scale,
                    touchAction: "none",
                  }}
                  aria-label="Rotate"
                  onPointerDown={(event) =>
                    beginHandle(event as ReactPointerEvent, single, "rotate")
                  }
                  onTouchStart={(event) =>
                    beginHandle(event as unknown as ReactPointerEvent, single, "rotate")
                  }
                  onPointerMove={(event) => event.stopPropagation()}
                  onTouchMove={(event) => event.stopPropagation()}                />
              </div
            )}

{}/* The inline text editor sits in design coordinates so its type,
                wrapping and rotation match the final rendering exactly. */}
            {editing && editingElement && (
<div>
<div>
  <div>
</div>

<div>
<div>
  <BoxGuideHandles x={guidesForRender.x} y={guidesForRender.y} zIndex={55} />
</div>
</div>
</div>
</div>}

                  width: editingElement.w,
                  height: editingElement.h,
                  transform: `rotate(${editingElement.rotation}deg)`,
                  zIndex: 80,
                }}
              >
                <div
                  ref={editorRef}
                  role="textbox"
                  aria-multiline="true"
                  aria-label={`Edit ${editingElement.name}`}
                  contentEditable
                  suppressContentEditableWarning
                  spellCheck
                  onPointerDown={(event) => event.stopPropagation()}
                  onDoubleClick={(event) => event.stopPropagation()}
                  onBlur={() => finishEditing()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                      event.preventDefault();
                      finishEditing();
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      finishEditing(true);
                    }
                  }}
                  className="h-full w-full whitespace-pre-wrap break-words outline-none"
                  style={{
                    fontFamily: fontFamilyFor(editingElement.font),
                    fontSize: editingElement.fontSize ?? 26,
                    fontWeight: editingElement.fontWeight ?? 400,
                    fontStyle: editingElement.italic ? "italic" : "normal",
                    letterSpacing: `${editingElement.letterSpacing ?? 0}em`,
                    lineHeight: editingElement.lineHeight ?? 1.4,
                    textAlign: editingElement.align ?? "center",
                    textTransform:
                      editingElement.textTransform ??
                      (editingElement.uppercase ? "uppercase" : "none"),
                    color: editingElement.color ?? "#161616",
                    padding: editingElement.textPadding ?? 0,
                    background: editingElement.textBackground,
                    borderRadius: editingElement.textRadius ?? 0,
                    direction:
                      editingElement.direction === "rtl"
                        ? "rtl"
                        : editingElement.direction === "ltr"
                          ? "ltr"
                          : rtl
                            ? "rtl"
                            : "ltr",
                    boxShadow: "0 0 0 1.5px #710014",
                    caretColor: "#710014",
                  }}
                  dir={
                    editingElement.direction === "rtl"
                      ? "rtl"
                      : editingElement.direction === "ltr"
                        ? "ltr"
                        : rtl
                          ? "rtl"
                          : "ltr"
                  }
                />
                <span className="mt-1 block bg-[#710014] px-1.5 py-0.5 text-center text-[10px] uppercase tracking-[0.12em] text-[#f2f1ed]">
                  Enter to finish · Esc to cancel
                </span>
              </div>
            )}

            {guidesForRender.x.map((x) => (
              <div
                key={`gx-${x}`}
                className="pointer-events-none absolute inset-y-0 w-px"
                style={{ left: x, background: "rgba(113,0,20,0.55)", zIndex: 55 }}
              />
            ))}
            {guidesForRender.y.map((y) => (                <div
                key={`gy-${y}`}
                className="pointer-events-none absolute inset-x-0 h-px"
                style={{ top: y, background: isFinePrintActive ? "rgba(113,0,20,0.35)" : "rgba(113,0,20,0.55)", zIndex: 55 }}              />
            ))}
          </div>
        </div>
      </div>

      <BoxGuideHandles x={guidesForRender.x} y={guidesForRender.y} zIndex={55} />

      <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap font-meta text-[9px] text-ink/40">
          {t({ width: Math.round(sizeDraftValue.width), height: Math.round(sizeDraftValue.height), unit: "px" })}
          · {guideLabel}
          · Space + drag to pan · ⌘/Ctrl + wheel to zoom
          {drag ? " · moving" : ""}
        </p>


        {t({ width: Math.round(sizeDraftValue.width), height: Math.round(sizeDraftValue.height), unit: "px" })}
        · {guideLabel}
        · Space + drag to pan · ⌘/Ctrl + wheel to zoom
        {drag ? " · moving" : ""}
      </p>

      {menu && (
        <ContextMenu
          menu={menu}
          locked={Boolean(menu.elementId) && selected.every((element) => element.locked)}
          hidden={Boolean(menu.elementId) && selected.every((element) => element.hidden)}
          hasSelection={selectedIds.length > 0}
          onAction={(action) => onContextAction?.(action)}
          onClose={() => setMenu(null)}      <BoxGuideHandles x={guidesForRender.x} y={guidesForRender.y} zIndex={55} />
      )}
    </div>
  );
}

/*------------------------------------------------------------------------**/
/* Box composition behaviour around layer handles                           **/
/*------------------------------------------------------------------------**/

/**
 * All editing on the Canvas shares a core behaviour model: the box is the
 * anchor for transform, resize and rotate, and while it is focused it owns
 * pointer handling so nothing else on the page fights for the pointer.
 */

const BOX_COMMENT = "";
