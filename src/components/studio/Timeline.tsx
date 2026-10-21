import { cn } from "@/lib/utils";
import {
  ANIMATION_PRESETS,
  type DesignPage,
  type ElementKind,
  type TimelineClip,
} from "@/lib/design";
import {
  Eye,
  EyeOff,
  Image as ImageIcon,
  Lock,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Shapes,
  Type,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface TimelineProps {
  page: DesignPage;
  clips: TimelineClip[];
  duration: number;
  time: number;
  playing: boolean;
  selectedIds: string[];
  pixelsPerSecond: number;
  onSeek: (time: number) => void;
  onPlayToggle: () => void;
  onRestart: () => void;
  onSelect: (ids: string[]) => void;
  onClipChange: (elementId: string, value: { start?: number; duration?: number }) => void;
  onPreviewClip: (elementId: string) => void;
  onZoom: (value: number) => void;
}

const LABEL_WIDTH = 148;
const ROW_HEIGHT = 32;

const KIND_ICONS: Record<ElementKind, typeof Type> = {
  text: Type,
  image: ImageIcon,
  shape: Shapes,
  motif: Shapes,
};

function formatTime(ms: number) {
  const seconds = Math.max(0, ms) / 1000;
  return `${seconds.toFixed(2)}s`;
}

export function Timeline({
  page,
  clips,
  duration,
  time,
  playing,
  selectedIds,
  pixelsPerSecond,
  onSeek,
  onPlayToggle,
  onRestart,
  onSelect,
  onClipChange,
  onPreviewClip,
  onZoom,
}: TimelineProps) {
  const rulerRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<
    | { kind: "playhead" }
    | { kind: "clip"; elementId: string; mode: "move" | "resize"; startX: number; start: number; length: number }
    | null
  >(null);

  const pps = pixelsPerSecond;
  const trackWidth = Math.max(320, (duration / 1000) * pps);
  const ticks: number[] = [];
  const step = pps > 90 ? 500 : pps > 40 ? 1000 : 2000;
  for (let value = 0; value <= duration; value += step) ticks.push(value);

  const timeFromClientX = (clientX: number) => {
    const node = rulerRef.current;
    if (!node) return 0;
    const rect = node.getBoundingClientRect();
    const raw = ((clientX - rect.left) / pps) * 1000;
    return Math.min(duration, Math.max(0, Math.round(raw / 10) * 10));
  };

  useEffect(() => {
    if (!drag) return;
    const move = (event: PointerEvent) => {
      const current = drag;
      if (!current) return;
      if (current.kind === "playhead") {
        onSeek(timeFromClientX(event.clientX));
        return;
      }
      const delta = ((event.clientX - current.startX) / pps) * 1000;
      if (current.mode === "move") {
        const next = Math.max(0, Math.round((current.start + delta) / 50) * 50);
        onClipChange(current.elementId, { start: next });
      } else {
        const next = Math.max(100, Math.round((current.length + delta) / 50) * 50);
        onClipChange(current.elementId, { duration: next });
      }
    };
    const up = () => setDrag(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, pps, duration, onSeek, onClipChange]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--paper-light)]">
      <div className="flex items-center gap-2 border-b border-ink/12 px-3 py-1.5">
        <button
          type="button"
          onClick={onPlayToggle}
          className="grid size-7 place-items-center bg-ink text-[#f2f1ed] hover:bg-[var(--red)]"
          aria-label={playing ? "Pause preview" : "Play preview"}
        >
          {playing ? <Pause className="size-3" /> : <Play className="size-3" />}
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="grid size-7 place-items-center border border-ink/20 text-ink/65 hover:border-ink hover:text-ink"
          aria-label="Restart from the beginning"
        >
          <RotateCcw className="size-3" />
        </button>
        <span className="ml-1 font-meta text-[10px] tabular-nums text-ink/70">
          {formatTime(time)} <span className="text-ink/35">/ {formatTime(duration)}</span>
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => onZoom(Math.max(24, pps - 20))}
            className="grid size-6 place-items-center border border-ink/15 text-ink/60 hover:border-ink"
            aria-label="Zoom timeline out"
          >
            <Minus className="size-3" />
          </button>
          <span className="w-8 text-center font-meta text-[9px] text-ink/45">
            {Math.round((pps / 80) * 100)}%
          </span>
          <button
            type="button"
            onClick={() => onZoom(Math.min(260, pps + 20))}
            className="grid size-6 place-items-center border border-ink/15 text-ink/60 hover:border-ink"
            aria-label="Zoom timeline in"
          >
            <Plus className="size-3" />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          className="shrink-0 overflow-y-auto border-r border-ink/12"
          style={{ width: LABEL_WIDTH }}
        >
          <div className="h-6 border-b border-ink/10 bg-[var(--paper-deep)]/50" />
          {page.elements.map((element) => {
            const Icon = KIND_ICONS[element.kind];
            const selected = selectedIds.includes(element.id);
            return (
              <button
                key={element.id}
                type="button"
                onClick={() => onSelect([element.id])}
                className={cn(
                  "flex w-full items-center gap-1.5 border-b border-ink/8 px-2 text-left",
                  selected ? "bg-[var(--red)]/8 text-ink" : "text-ink/60 hover:bg-ink/4",
                )}
                style={{ height: ROW_HEIGHT }}
                title={element.name}
              >
                <Icon className="size-3 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-[10px]">{element.name}</span>
                {element.locked && <Lock className="size-2.5 shrink-0" />}
                {element.hidden ? (
                  <EyeOff className="size-2.5 shrink-0" />
                ) : (
                  <Eye className="size-2.5 shrink-0 opacity-40" />
                )}
              </button>
            );
          })}
        </div>

        <div className="min-w-0 flex-1 overflow-auto">
          <div style={{ width: trackWidth }} className="relative">
            <div
              ref={rulerRef}
              className="relative h-6 cursor-ew-resize border-b border-ink/10 bg-[var(--paper-deep)]/50"
              onPointerDown={(event) => {
                onSeek(timeFromClientX(event.clientX));
                setDrag({ kind: "playhead" });
              }}
            >
              {ticks.map((tick) => (
                <span
                  key={tick}
                  className="absolute top-0 h-full border-l border-ink/15 pl-1 font-meta text-[8px] leading-6 text-ink/40"
                  style={{ left: (tick / 1000) * pps }}
                >
                  {tick / 1000}s
                </span>
              ))}
            </div>

            <div className="relative">
              {page.elements.map((element) => {
                const clip = clips.find((item) => item.elementId === element.id);
                return (
                  <div
                    key={element.id}
                    className="relative border-b border-ink/8"
                    style={{ height: ROW_HEIGHT }}
                  >
                    {!clip && (
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 font-meta text-[8px] uppercase tracking-[0.12em] text-ink/25">
                        Not animated
                      </span>
                    )}
                    {clip && (
                      <>
                        <div
                          role="button"
                          tabIndex={0}
                          aria-label={`${clip.label} clip`}
                          className={cn(
                            "group absolute top-1 flex h-[calc(100%-8px)] cursor-grab items-center overflow-hidden border text-left",
                            selectedIds.includes(element.id)
                              ? "border-[var(--red)] bg-[var(--red)]/15"
                              : "border-ink/25 bg-ink/8 hover:bg-ink/12",
                          )}
                          style={{
                            left: (clip.start / 1000) * pps,
                            width: Math.max(26, (clip.duration / 1000) * pps),
                          }}
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            onSelect([element.id]);
                            setDrag({
                              kind: "clip",
                              elementId: element.id,
                              mode: "move",
                              startX: event.clientX,
                              start: clip.start,
                              length: clip.duration,
                            });
                          }}
                          onDoubleClick={() => onPreviewClip(element.id)}
                        >
                          <span className="pointer-events-none truncate px-1.5 font-meta text-[8px] uppercase tracking-[0.08em] text-ink/70">
                            {ANIMATION_PRESETS.find((preset) => preset.id === clip.preset)?.label ?? clip.preset}
                          </span>
                          <span
                            className="absolute inset-y-0 right-0 w-2 cursor-ew-resize bg-[var(--red)]/0 hover:bg-[var(--red)]/30"
                            onPointerDown={(event) => {
                              event.stopPropagation();
                              setDrag({
                                kind: "clip",
                                elementId: element.id,
                                mode: "resize",
                                startX: event.clientX,
                                start: clip.start,
                                length: clip.duration,
                              });
                            }}
                          />
                        </div>
                        {clip.exitStart !== undefined && (
                          <div
                            className="pointer-events-none absolute top-2 h-[calc(100%-16px)] border border-dashed border-ink/35 bg-transparent"
                            style={{
                              left: (clip.exitStart / 1000) * pps,
                              width: Math.max(10, ((clip.exitDuration ?? 0) / 1000) * pps),
                            }}
                            title="Exit animation"
                          />
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div
              className="pointer-events-none absolute inset-y-0 z-30 w-px bg-[var(--red)]"
              style={{ left: (time / 1000) * pps }}
            >
              <span className="absolute -left-[5px] top-0 size-[10px] rotate-45 bg-[var(--red)]" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-ink/12 px-3 py-1 font-meta text-[8px] uppercase tracking-[0.12em] text-ink/40">
        <span className="flex items-center gap-1"><RotateCw className="size-2.5" /> Drag a clip to retime it</span>
        <span className="hidden sm:inline">Double-click a clip to replay</span>
        <span className="ml-auto">{clips.length} animated · {page.elements.length} layers</span>
      </div>
    </div>
  );
}
