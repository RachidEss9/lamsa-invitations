import { DesignPageView } from "@/components/invitation/DesignPageView";
import { OpeningStage } from "@/components/invitation/OpeningStage";
import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  pageTransitionStyle,
  timelineDuration,
  visiblePages,
  type DesignDocument,
} from "@/lib/design";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

interface GuestExperienceProps {
  design: DesignDocument;
  imageUrls: Record<string, string>;
  guestName?: string | null;
  rtl?: boolean;
  reducedMotion: boolean;
  palette: { background: string; ink: string; accent: string };
  onClose: () => void;
  mode?: "guest" | "timeline";
  startPage?: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * A realistic run of the published experience: opening, pages, timing, and
 * interactions. It reads the same design document the canvas and timeline
 * edit, so nothing here is a demo animation.
 */
export function GuestExperience({
  design,
  imageUrls,
  guestName,
  rtl,
  reducedMotion,
  palette,
  onClose,
  mode = "guest",
  startPage = 0,
}: GuestExperienceProps) {
  const pages = useMemo(() => visiblePages(design), [design]);
  const [phase, setPhase] = useState<"opening" | "invitation">(
    mode === "timeline" || reducedMotion || design.opening.experience === "none"
      ? "invitation"
      : "opening",
  );
  const [pageIndex, setPageIndex] = useState(
    clamp(startPage, 0, pages.length - 1),
  );
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const measure = () => setScale(node.clientWidth / DESIGN_WIDTH);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [transition, setTransition] = useState(1);
  const page = pages[Math.min(pageIndex, pages.length - 1)];
  const duration = timelineDuration(page);
  const frameRef = useRef(0);
  const timeRef = useRef(0);

  useEffect(() => {
    if (phase !== "invitation" || !playing) return;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      const next = timeRef.current + delta;
      if (next >= duration) {
        if (mode === "guest" && pageIndex < pages.length - 1) {
          timeRef.current = 0;
          setTime(0);
          setPageIndex((index) => index + 1);
          setTransition(0);
        } else {
          timeRef.current = duration;
          setTime(duration);
          setPlaying(false);
        }
        return;
      }
      timeRef.current = next;
      setTime(next);
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [duration, mode, pageIndex, phase, playing, pages.length]);

  useEffect(() => {
    if (transition >= 1) return;
    if (reducedMotion) {
      const frame = requestAnimationFrame(() => setTransition(1));
      return () => cancelAnimationFrame(frame);
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = clamp(
        (now - start) / Math.max(200, design.transition.duration),
        0,
        1,
      );
      setTransition(p);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [design.transition.duration, mode, reducedMotion, startPage, transition]);

  const goToPage = (index: number) => {
    const bounded = clamp(index, 0, pages.length - 1);
    if (bounded === pageIndex) return;
    timeRef.current = 0;
    setPageIndex(bounded);
    setTime(0);
    setTransition(0);
    setPlaying(true);
  };

  const restart = () => {
    timeRef.current = 0;
    setPageIndex(mode === "timeline" ? clamp(startPage, 0, pages.length - 1) : 0);
    setTime(0);
    setTransition(1);
    setRevealed(new Set());
    setPlaying(true);
    if (mode === "guest" && design.opening.experience !== "none") {
      setPhase("opening");
    }
  };

  const stageWidth = "min(92vw, 520px)";

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-[#0e0d0c]">
      <div className="flex items-center justify-between border-b border-white/12 px-4 py-2.5 text-[#f2f1ed]">
        <div className="flex items-center gap-2">
          <Sparkles className="size-3.5 text-[#b38f6f]" />
          <span className="font-meta text-[9px] uppercase tracking-[0.2em] text-white/60">
            {mode === "timeline" ? "Timeline preview" : "Guest experience"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-meta text-[9px] uppercase tracking-[0.16em] text-white/40">
            Page {pageIndex + 1} / {pages.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center border border-white/20 text-white/70 hover:border-white hover:text-white"
            aria-label="Close guest experience"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-3 py-3">
        <div
          ref={stageRef}
          className="relative overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,0.6)]"
          style={{
            width: stageWidth,
            aspectRatio: `${DESIGN_WIDTH} / ${DESIGN_HEIGHT}`,
            maxHeight: "calc(100vh - 170px)",
          }}
        >
          <div className="absolute inset-0">
            <div
              className="absolute inset-0"
              style={{
                ...pageTransitionStyle(design.transition, transition),
              }}
            >
              <div
                className="absolute left-0 top-0 origin-top-left"
                style={{
                  width: DESIGN_WIDTH,
                  height: DESIGN_HEIGHT,
                  transform: `scale(${scale || 0.0001})`,
                  visibility: scale ? "visible" : "hidden",
                }}
              >
                <DesignPageView
                  page={page}
                  time={time}
                  imageUrls={imageUrls}
                  guestName={guestName}
                  rtl={rtl}
                  interactive
                  reducedMotion={reducedMotion}
                  revealed={revealed}
                  onReveal={(targetId, interactionId) =>
                    setRevealed((previous) => {
                      const next = new Set(previous);
                      next.add(interactionId);
                      void targetId;
                      return next;
                    })
                  }
                />
              </div>
            </div>

            {phase === "opening" && (
              <OpeningStage
                opening={design.opening}
                accent={palette.accent}
                background={palette.background}
                ink={palette.ink}
                guestName={guestName}
                autoOpen={design.opening.autoOpen}
                reducedMotion={reducedMotion}
                coverUrl={
                  design.opening.coverStorageId
                    ? imageUrls[design.opening.coverStorageId]
                    : undefined
                }
                onDone={() => {
                  setPhase("invitation");
                  timeRef.current = 0;
                  setTime(0);
                  setPlaying(true);
                }}
              />
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-white/12 bg-[#141312] px-4 py-3 text-[#f2f1ed]">
        <input
          type="range"
          min={0}
          max={duration}
          step={10}
          value={Math.min(time, duration)}
          onChange={(event) => {
            const next = Number(event.target.value);
            timeRef.current = next;
            setTime(next);
            setPlaying(false);
          }}
          className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-[#710014]"
          aria-label="Scrub the invitation timeline"
        />
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPlaying((value) => !value)}
            className="grid size-8 place-items-center bg-[#f2f1ed] text-[#161616] hover:bg-[#b38f6f]"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          </button>
          <button
            type="button"
            onClick={restart}
            className="grid size-8 place-items-center border border-white/20 text-white/75 hover:border-white"
            aria-label="Restart the experience"
          >
            <RotateCcw className="size-3.5" />
          </button>
          {mode === "guest" && (
            <button
              type="button"
              onClick={() => {
                setPhase("opening");
                setTime(0);
                setRevealed(new Set());
              }}
              className="h-8 border border-white/20 px-2.5 font-meta text-[9px] uppercase tracking-[0.14em] text-white/70 hover:border-white hover:text-white"
            >
              Replay opening
            </button>
          )}
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => goToPage(pageIndex - 1)}
              disabled={pageIndex === 0 || mode === "timeline"}
              className="grid size-8 place-items-center border border-white/20 text-white/75 disabled:opacity-30"
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => goToPage(pageIndex + 1)}
              disabled={pageIndex >= pages.length - 1 || mode === "timeline"}
              className="grid size-8 place-items-center border border-white/20 text-white/75 disabled:opacity-30"
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
        <div className="mt-1.5 flex items-center justify-between font-meta text-[8px] uppercase tracking-[0.12em] text-white/35">
          <span>{page.name}</span>
          <span>{(time / 1000).toFixed(2)}s / {(duration / 1000).toFixed(2)}s</span>
        </div>
      </div>
    </div>
  );
}
