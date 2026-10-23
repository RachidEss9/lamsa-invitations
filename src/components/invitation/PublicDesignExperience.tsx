import { ClosingStage } from "@/components/invitation/ClosingStage";
import { DesignPageView, useStageScale } from "@/components/invitation/DesignPageView";
import {
  pageTransitionStyle,
  pageSizeOf,
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
  names?: string;
  rtl?: boolean;
  reducedMotion: boolean;
  active: boolean;
  accent?: string;
  ink?: string;
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
  names,
  rtl,
  reducedMotion,
  active,
  accent = "#710014",
  ink = "#161616",
  className,
}: PublicDesignExperienceProps) {
  const pages = useMemo(() => visiblePages(design), [design]);
  const [pageIndex, setPageIndex] = useState(0);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [transition, setTransition] = useState(1);
  const [scrollActivationTime, setScrollActivationTime] = useState<number | null>(
    null,
  );
  const [reducedClosingReady, setReducedClosingReady] = useState(false);
  const timeRef = useRef(0);
  const page = pages[Math.min(pageIndex, pages.length - 1)];
  const pageSize = pageSizeOf(page ?? null);
  const { ref, scale } = useStageScale(pageSize.width);

  const duration = timelineDuration(page);
  const lastPage = pageIndex === pages.length - 1;

  // Reduced-motion playback is static, so give the last page a short readable
  // beat before the optional closing instead of hiding it immediately.
  useEffect(() => {
    if (!active || !reducedMotion) return;
    const reset = requestAnimationFrame(() => setReducedClosingReady(false));
    const timer = window.setTimeout(() => setReducedClosingReady(true), 2200);
    return () => {
      cancelAnimationFrame(reset);
      window.clearTimeout(timer);
    };
  }, [active, pageIndex, reducedMotion]);

  const finished = reducedMotion
    ? reducedClosingReady
    : !playing && time >= duration - 5;
  const showClosing = design.closing.enabled && lastPage && finished;

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

  // Scroll-triggered layers wait until the card itself is in view. The
  // observer is re-created per page so a page change re-arms the gate even
  // while the card remains on screen.
  useEffect(() => {
    if (!active) return;
    if (reducedMotion) {
      const frame = requestAnimationFrame(() => setScrollActivationTime(0));
      return () => cancelAnimationFrame(frame);
    }
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      const frame = requestAnimationFrame(() =>
        setScrollActivationTime(timeRef.current),
      );
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setScrollActivationTime((previous) => previous ?? timeRef.current);
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [active, pageIndex, reducedMotion, ref]);

  const hasScrollLayers = page.elements.some(
    (element) => element.animation.enabled && element.animation.trigger === "scroll",
  );

  useEffect(() => {
    if (!active || !playing || reducedMotion) return;
    // Let the page clock wait for the card to be seen before it starts, so
    // scroll-triggered layers are never skipped and the closing never arrives
    // before the invitation has actually played.
    if (hasScrollLayers && scrollActivationTime == null) return;
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
  }, [active, duration, hasScrollLayers, playing, reducedMotion, scrollActivationTime]);

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
    setScrollActivationTime(0);
    setRevealed(new Set());
  };

  const goTo = (next: number) => {
    const bounded = Math.min(pages.length - 1, Math.max(0, next));
    if (bounded === pageIndex) return;
    setPageIndex(bounded);
    setTime(0);
    timeRef.current = 0;
    // The card is already on screen when a guest changes page.
    setScrollActivationTime(0);
    setTransition(0);
    setPlaying(true);
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        ref={ref}
        className="relative w-full overflow-hidden bg-[var(--paper-light)] shadow-[0_30px_80px_rgba(22,22,22,0.2)]"
        style={{ aspectRatio: `${pageSize.width} / ${pageSize.height}` }}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: pageSize.width,
            height: pageSize.height,
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
              scrollActivationTime={reducedMotion ? 0 : scrollActivationTime}
              onReveal={(targetId, interactionId) =>
                setRevealed((previous) => {
                  void targetId;
                  return new Set(previous).add(interactionId);
                })
              }
            />
          </div>
        </div>

        {showClosing && (
          <ClosingStage
            closing={design.closing}
            accent={accent}
            background={page.background}
            ink={ink}
            guestName={guestName}
            names={names}
            reducedMotion={reducedMotion}
            onReplay={() => {
              setPageIndex(0);
              timeRef.current = 0;
              setTime(0);
              setScrollActivationTime(0);
              setRevealed(new Set());
              setTransition(1);
              setPlaying(true);
            }}
          />
        )}

        {pages.length > 1 && !showClosing && (
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
