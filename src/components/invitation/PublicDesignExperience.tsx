import { DesignPageView, useStageScale } from "@/components/invitation/DesignPageView";
import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  pageTransitionStyle,
  timelineDuration,
  visiblePages,
  type DesignDocument,
} from "@/lib/design";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

interface PublicDesignExperienceProps {
  design: DesignDocument;
  imageUrls: Record<string, string>;
  guestName?: string | null;
  rtl?: boolean;
  reducedMotion: boolean;
  active: boolean;
  className?: string;
}

/**
 * The published canvas experience: real timing, real pages, real interactions.
 * It is rendered from the same design document the studio saves.
 */
export function PublicDesignExperience({
  design,
  imageUrls,
  guestName,
  rtl,
  reducedMotion,
  active,
  className,
}: PublicDesignExperienceProps) {
  const pages = useMemo(() => visiblePages(design), [design]);
  const [pageIndex, setPageIndex] = useState(0);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [transition, setTransition] = useState(1);
  const timeRef = useRef(0);
  const { ref, scale } = useStageScale();

  const page = pages[Math.min(pageIndex, pages.length - 1)];
  const duration = timelineDuration(page);

  useEffect(() => {
    if (!active || reducedMotion) return;
    const frame = requestAnimationFrame(() => {
      setPlaying(true);
      setPageIndex(0);
      setTime(0);
      timeRef.current = 0;
      setRevealed(new Set());
    });
    return () => cancelAnimationFrame(frame);
  }, [active, reducedMotion]);

  useEffect(() => {
    if (!active || !playing || reducedMotion) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      const next = timeRef.current + delta;
      if (next >= duration) {
        timeRef.current = duration;
        setTime(duration);
        setPlaying(false);
        return;
      }
      timeRef.current = next;
      setTime(next);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, duration, playing, reducedMotion]);

  useEffect(() => {
    if (transition >= 1) return;
    if (reducedMotion) {
      const frame = requestAnimationFrame(() => setTransition(1));
      return () => cancelAnimationFrame(frame);
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(
        1,
        (now - start) / Math.max(220, design.transition.duration),
      );
      setTransition(progress);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [design.transition.duration, reducedMotion, transition]);

  const restart = () => {
    timeRef.current = 0;
    setTime(0);
    setPlaying(true);
    setRevealed(new Set());
  };

  const goTo = (next: number) => {
    const bounded = Math.min(pages.length - 1, Math.max(0, next));
    if (bounded === pageIndex) return;
    setPageIndex(bounded);
    setTime(0);
    timeRef.current = 0;
    setTransition(0);
    setPlaying(true);
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        ref={ref}
        className="relative w-full overflow-hidden bg-[var(--paper-light)] shadow-[0_30px_80px_rgba(22,22,22,0.2)]"
        style={{ aspectRatio: `${DESIGN_WIDTH} / ${DESIGN_HEIGHT}` }}
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
          <div
            className="absolute inset-0"
            style={pageTransitionStyle(design.transition, transition)}
          >
            <DesignPageView
              key={page.id}
              page={page}
              time={reducedMotion ? duration : time}
              imageUrls={imageUrls}
              guestName={guestName}
              rtl={rtl}
              interactive
              reducedMotion={reducedMotion}
              revealed={revealed}
              onReveal={(targetId, interactionId) =>
                setRevealed((previous) => {
                  void targetId;
                  return new Set(previous).add(interactionId);
                })
              }
            />
          </div>
        </div>

        {pages.length > 1 && (
          <div className="absolute inset-x-0 bottom-0 z-40 flex items-center justify-between gap-2 bg-gradient-to-t from-black/35 to-transparent px-3 pb-2.5 pt-8">
            <button
              type="button"
              onClick={() => goTo(pageIndex - 1)}
              disabled={pageIndex === 0}
              className="grid size-8 place-items-center border border-white/40 text-white/80 backdrop-blur-sm disabled:opacity-30"
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </button>
            <div className="flex items-center gap-1.5">
              {pages.map((candidate, index) => (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => goTo(index)}
                  aria-label={`Page ${index + 1}`}
                  aria-current={index === pageIndex}
                  className={cn(
                    "size-1.5 rounded-full transition-colors",
                    index === pageIndex ? "bg-white" : "bg-white/40",
                  )}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => goTo(pageIndex + 1)}
              disabled={pageIndex >= pages.length - 1}
              className="grid size-8 place-items-center border border-white/40 text-white/80 backdrop-blur-sm disabled:opacity-30"
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 font-meta text-[8px] uppercase tracking-[0.14em] text-ink/40">
        <span>
          {page.name}
          {pages.length > 1 ? ` · ${pageIndex + 1} / ${pages.length}` : ""}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPlaying((value) => !value)}
            className="flex items-center gap-1 hover:text-ink"
            aria-label={playing ? "Pause animation" : "Play animation"}
          >
            {playing ? <Pause className="size-3" /> : <Play className="size-3" />}
            {playing ? "Playing" : "Paused"}
          </button>
          <button
            type="button"
            onClick={restart}
            className="flex items-center gap-1 hover:text-ink"
            aria-label="Replay this page"
          >
            <RotateCcw className="size-3" /> Replay
          </button>
        </div>
      </div>
    </div>
  );
}
