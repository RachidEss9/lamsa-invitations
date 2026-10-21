import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  type DesignElement,
  type DesignPage,
} from "@/lib/design";
import { cn } from "@/lib/utils";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { DesignPageView } from "@/components/invitation/DesignPageView";

type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

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
  onZoom: (value: number) => void;
  onSelect: (ids: string[]) => void;
  onMove: (updates: { id: string; x: number; y: number }[]) => void;
  onResize: (id: string, box: { x: number; y: number; w: number; h: number }) => void;
  onRotate: (id: string, rotation: number) => void;
  onReveal: (targetId: string, interactionId: string) => void;
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
  onZoom,
  onSelect,
  onMove,
  onResize,
  onRotate,
  onReveal,
}: StudioCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [fit, setFit] = useState(0);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [guides, setGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);

  useEffect(() => {
    const node = hostRef.current;
    if (!node) return;
    const measure = () => {
      const width = node.clientWidth;
      const height = node.clientHeight;
      // Fit the 3:4 stage inside the available area with breathing room.
      setFit(Math.min((width - 56) / DESIGN_WIDTH, (height - 56) / DESIGN_HEIGHT));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const scale = Math.max(0.05, fit * zoom);
  const selected = page.elements.filter((element) => selectedIds.includes(element.id));
  const single = selected.length === 1 ? selected[0] : null;

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
    event.stopPropagation();
    if (element.locked && !event.shiftKey) {
      onSelect([element.id]);
      return;
    }
    const ids = selectOnlyIfNeeded(element, event.shiftKey);
    if (element.locked) return;
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
    event.stopPropagation();
    const originals = new Map([[element.id, element]]);
    const centerX = element.x + element.w / 2;
    const centerY = element.y + element.h / 2;
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
            DESIGN_WIDTH / 2 - anchor.w / 2,
            DESIGN_WIDTH - anchor.w,
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
            DESIGN_HEIGHT / 2 - anchor.h / 2,
            DESIGN_HEIGHT - anchor.h,
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
          x: Math.round(clamp(element.x + snapDx, -element.w + 40, DESIGN_WIDTH - 40)),
          y: Math.round(clamp(element.y + snapDy, -element.h + 40, DESIGN_HEIGHT - 40)),
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
        if (!event.altKey) rotation = Math.round(rotation / 5) * 5;
        rotation = ((Math.round(rotation) % 360) + 360) % 360;
        onRotate(current.anchor.id, rotation);
        return;
      }

      const handle = current.handle ?? "se";
      const original = current.originals.get(current.anchor.id) ?? current.anchor;
      let { x, y, w, h } = original;
      const minW = 24;
      const minH = 20;

      if (handle.includes("e")) w = Math.max(minW, original.w + dx);
      if (handle.includes("s")) h = Math.max(minH, original.h + dy);
      if (handle.includes("w")) {
        w = Math.max(minW, original.w - dx);
        x = original.x + (original.w - w);
      }
      if (handle.includes("n")) {
        h = Math.max(minH, original.h - dy);
        y = original.y + (original.h - h);
      }

      if (aspectLocked && (handle.length === 2 || handle === "n" || handle === "s")) {
        const ratio = original.w / Math.max(1, original.h);
        if (handle === "n" || handle === "s") {
          w = h * ratio;
          x = original.x + (original.w - w) / 2;
        } else {
          h = w / ratio;
          y = original.y + (original.h - h) / 2;
        }
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
    const node = hostRef.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      onZoom(clamp(zoom * (1 - event.deltaY * 0.0015), 0.4, 2.4));
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [onZoom, zoom]);

  const guidesForRender = useMemo(() => guides, [guides]);

  const handleTouches = (event: ReactTouchEvent) => {
    if (event.touches.length !== 2) {
      pinch.current = null;
      return;
    }
    const [a, b] = [event.touches[0], event.touches[1]];
    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    if (!pinch.current) {
      pinch.current = { distance, zoom };
    } else {
      const ratio = distance / Math.max(1, pinch.current.distance);
      onZoom(clamp(pinch.current.zoom * ratio, 0.4, 2.4));
    }
  };

  return (
    <div
      ref={hostRef}
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      onPointerDown={() => onSelect([])}
      onTouchStart={handleTouches}
      onTouchMove={handleTouches}
      style={{ touchAction: "none" }}
    >
      <div
        className="relative shrink-0 shadow-[0_30px_80px_rgba(22,22,22,0.18)]"
        style={{
          width: DESIGN_WIDTH * scale,
          height: DESIGN_HEIGHT * scale,
        }}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: DESIGN_WIDTH,
            height: DESIGN_HEIGHT,
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
                >
                  {isSelected && !element.locked && (
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

            {single && !single.locked && (
              <div
                className="pointer-events-none absolute"
                style={{
                  left: single.x,
                  top: single.y,
                  width: single.w,
                  height: single.h,
                  transform: `rotate(${single.rotation}deg)`,
                  zIndex: 60,
                }}
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
                      <span
                        key={handle}
                        className="pointer-events-auto absolute size-2.5 -translate-x-1/2 -translate-y-1/2 border border-[#710014] bg-[#f2f1ed]"
                        style={{
                          left: position.left,
                          top: position.top,
                          cursor: position.cursor,
                        }}
                        onPointerDown={(event) =>
                          beginHandle(event as ReactPointerEvent, single, "resize", handle)
                        }
                      />
                    );
                  },
                )}
                <span
                  className="pointer-events-auto absolute left-1/2 top-0 size-3 -translate-x-1/2 -translate-y-8 cursor-grab rounded-full border border-[#710014] bg-[#f2f1ed]"
                  onPointerDown={(event) =>
                    beginHandle(event as ReactPointerEvent, single, "rotate")
                  }
                />
              </div>
            )}

            {guidesForRender.x.map((x) => (
              <div
                key={`gx-${x}`}
                className="pointer-events-none absolute inset-y-0 w-px"
                style={{ left: x, background: "rgba(113,0,20,0.55)", zIndex: 55 }}
              />
            ))}
            {guidesForRender.y.map((y) => (
              <div
                key={`gy-${y}`}
                className="pointer-events-none absolute inset-x-0 h-px"
                style={{ top: y, background: "rgba(113,0,20,0.55)", zIndex: 55 }}
              />
            ))}
          </div>
        </div>
      </div>

      <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 font-meta text-[9px] uppercase tracking-[0.18em] text-ink/35">
        1000 × 1333 · 3:4 {drag ? "· moving" : ""}
      </p>
    </div>
  );
}
