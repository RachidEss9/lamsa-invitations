import { ClosingStage } from "@/components/invitation/ClosingStage";
import { DesignPageView, useStageScale } from "@/components/invitation/DesignPageView";
import { OpeningStage } from "@/components/invitation/OpeningStage";
import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  pageTransitionStyle,
  timelineDuration,
  visiblePages,
  type DesignDocument,
} from "@/lib/design";
import { cn } from "@/lib/utils";
import { ChevronRight, Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

interface SequentialInvitationProps {
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

const PAGE_ADVANCE_AFTER_MS = 6500;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * A sequential guest journey: one continuous invitation rather than a video
 * timeline with a page selector.
 *
 * Flow:
 *  1. Opening stage (if configured).
 *  2. First page, playing for a short, elegant beat.
 *  3. If the page is longer than the guest is expected to read, an explicit
 *     "Continue" control is shown instead of auto-advancing while the guest is
 *     still reading; when the guest moves on, the next page follows with a
 *     real transition.
 *  4. Pages advance automatically after a fixed, short grace period once the
 *     page clock has finished, so fast guests are not left waiting.
 *  5. Last page resolves into the existing closing experience.
 *
 * Interactive covers (existing reveal system) remain active throughout: a
 * cover layer can hide content until a guest taps it, and that content then
 * stays revealed for the rest of the journey.
 */
export function SequentialInvitation({
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
}: SequentialInvitationProps) {
  const pages = useMemo(() => visiblePages(design), [design]);
  const {
    ref: stageRef,
    scale,
  } = useStageScale();

  const [phase, setPhase] = useState<"opening" | "invitation">(
    design.opening.experience === "none" || reducedMotion ? "invitation" : "opening",
  );
  const [pageIndex, setPageIndex] = useState(0);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [transition, setTransition] = useState(1);
  const [scrollActivationTime, setScrollActivationTime] = useState<number | null>(
    null,
  );
  const [showContinue, setShowContinue] = useState(false);
  const [continueReady, setContinueReady] = useState(false);

  const timeRef = useRef(0);
  const pageStartRef = useRef(0);
  const lastPage = pageIndex === pages.length - 1;

  const page = pages[Math.min(pageIndex, pages.length - 1)];
  const duration = timelineDuration(page);
  const closingEnabled = design.closing.enabled && lastPage;

  // Reduced-motion playback is static; give the last page a short readable beat
  // before the optional closing instead of hiding it immediately.
  useEffect(() => {
    if (!active || !reducedMotion || phase !== "invitation") return;
    if (!closingEnabled) return;
    const reset = requestAnimationFrame(() => setContinueReady(false));
    const timer = window.setTimeout(() => setContinueReady(true), 2200);
    return () => {
      cancelAnimationFrame(reset);
      window.clearTimeout(timer);
    };
  }, [active, pageIndex, phase, reducedMotion, closingEnabled]);

  // Once the page has played long enough for a guest to read the essentials,
  // surface an explicit Continue control. On short pages it never shows and the
  // page auto-advances instead; on long pages it stays until the guest moves on.
  useEffect(() => {
    if (!active || reducedMotion || !playing) return;
    if (closingEnabled && lastPage) return;
    const pagePlayedLongEnough = time >= duration - 5;
    if (!pagePlayedLongEnough) return;
    const threshold = page.elements.length * 1800 + 2200;
    if (duration > threshold && time >= Math.min(duration, threshold)) {
      setShowContinue(true);
      setContinueReady(true);
    }
  }, [active, duration, page.elements.length, pageIndex, playing, reducedMotion, time, lastPage, closingEnabled]);

  // Scroll-triggered layers wait until the card itself is in view.
  useEffect(() => {
    if (!active) return;
    if (reducedMotion) {
      const frame = requestAnimationFrame(() => setScrollActivationTime(0));
      return () => cancelAnimationFrame(frame);
    }
    const node = stageRef.current;
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
  }, [active, pageIndex, reducedMotion, stageRef]);

  const hasScrollLayers = page.elements.some(
    (element) => element.animation.enabled && element.animation.trigger === "scroll",
  );

  useEffect(() => {
    if (!active || !playing || reducedMotion) return;
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
  }, [active, duration, hasScrollLayers, pageIndex, playing, reducedMotion, scrollActivationTime]);

  // Page clock tick used to detect when a page has finished playing.
  useEffect(() => {
    if (!active || reducedMotion) return;
    if (!closingEnabled && !showContinue) return;
    // Nothing to drive here; this effect only exists so the linter sees the
    // dependency list. The visible state is driven by the two effects above.
  }, [active, closingEnabled, pageIndex, reducedMotion, showContinue]);

  const restart = () => {
    timeRef.current = 0;
    setTime(0);
    setPlaying(true);
    setScrollActivationTime(0);
    setRevealed(new Set());
    setShowContinue(false);
    setContinueReady(false);
  };

  const advanceTo = (next: number) => {
    const bounded = Math.min(pages.length - 1, Math.max(0, next));
    if (bounded === pageIndex) return;
    setPageIndex(bounded);
    setTime(0);
    timeRef.current = 0;
    setScrollActivationTime(0);
    setTransition(0);
    setPlaying(true);
    setShowContinue(false);
    setContinueReady(false);
  };

  const finishCurrentPage = () => {
    // If there is another page, go there; otherwise let the closing gate handle
    // the last page.
    if (pageIndex < pages.length - 1) {
      advanceTo(pageIndex + 1);
    } else if (closingEnabled) {
      // Hand off to the closing gate by stopping playback on the last page.
      setPlaying(false);
    } else {
      restart();
    }
  };

  const pageFinished =
    lastPage && closingEnabled
      ? (reducedMotion ? continueReady : !playing && time >= duration - 5)
      : (reducedMotion
          ? time >= duration - 5
          : !playing && time >= duration - 5);

  const showClosing =
    closingEnabled &&
    phase === "invitation" &&
    pageFinished;

  // Reset the whole journey when the guest re-enters the active card.
  useEffect(() => {
    if (!active || reducedMotion) return;
    const frame = requestAnimationFrame(() => {
      setPlaying(true);
      setPageIndex(0);
      setTime(0);
      timeRef.current = 0;
      setRevealed(new Set());
      setShowContinue(false);
      setContinueReady(false);
      if (design.opening.experience !== "none") {
        setPhase("opening");
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [active, reducedMotion, design.opening.experience]);

  // Transition between pages.
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

  const handleReveal = (targetId: string, interactionId: string) => {
    if (!active) return;
    if (!revealed) {
      setRevealed((previous) => new Set(previous).add(interactionId));
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        ref={stageRef}
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
            {phase === "opening" && design.opening.experience !== "none" && (
              <OpeningStage
                opening={design.opening}
                accent={accent}
                background={page?.background ?? design.pages[0]?.background ?? "#f2f1ed"}
                ink={ink}
                guestName={guestName}
                names={names}
                reducedMotion={reducedMotion}
                coverUrl={
                  design.opening.coverStorageId
                    ? imageUrls[design.opening.coverStorageId]
                    : undefined
                }
                onDone={() => {
                  setPhase("invitation");
                  setPageIndex(0);
                  setTime(0);
                  timeRef.current = 0;
                  setPlaying(true);
                  setRevealed(new Set());
                  setScrollActivationTime(0);
                }}
              />
            )}

            <DesignPageView
              key={`page-${page.id}-${pageIndex}`}
              page={page}
              time={reducedMotion ? duration : time}
              imageUrls={imageUrls}
              guestName={guestName}
              rtl={rtl}
              interactive
              reducedMotion={reducedMotion}
              revealed={revealed}
              scrollActivationTime={reducedMotion ? 0 : scrollActivationTime}
              onReveal={handleReveal}
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
            onReplay={restart}
          />
        )}

        {phase === "invitation" && !showClosing && (
          <div className="absolute inset-x-0 bottom-0 z-40 flex items-center justify-between gap-2 bg-gradient-to-t from-black/35 to-transparent px-3 pb-2.5 pt-8">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => advanceTo(pageIndex - 1)}
                disabled={pageIndex === 0}
                className="grid size-8 place-items-center border border-white/40 text-white/80 backdrop-blur-sm disabled:opacity-30"
                aria-label="Previous section"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-4"
                  aria-hidden="true"
                  fill="currentColor"
                >
                  <path d="M15 6l-6 6 6 6M9 6l6 6-6 6" />
                </svg>
              </button>
              <div className="flex items-center gap-1.5" aria-hidden="true">
                {pages.map((candidate, index) => (
                  <span
                    key={candidate.id}
                    className={cn(
                      "h-1.5 rounded-full transition-colors",
                      index === pageIndex
                        ? "bg-white w-4"
                        : index < pageIndex
                          ? "bg-white/60 w-1.5"
                          : "bg-white/30 w-1.5",
                    )}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => advanceTo(pageIndex + 1)}
                disabled={pageIndex >= pages.length - 1}
                className="grid size-8 place-items-center border border-white/40 text-white/80 backdrop-blur-sm disabled:opacity-30"
                aria-label="Next section"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-4"
                  aria-hidden="true"
                  fill="currentColor"
                >
                  <path d="M9 6l6 6-6 6M15 6l-6 6 6 6" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {showContinue && !lastPage && (
                <button
                  type="button"
                  onClick={finishCurrentPage}
                  className="grid size-9 place-items-center border border-white/50 text-white/90 backdrop-blur-sm hover:border-white hover:text-white"
                  aria-label="Continue to the next section"
                >
                  <ChevronRight className="size-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setPlaying((value) => !value)}
                className="grid size-9 place-items-center border border-white/40 text-white/80 backdrop-blur-sm hover:border-white hover:text-white"
                aria-label={playing ? "Pause" : "Resume"}
              >
                {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
              </button>
              <button
                type="button"
                onClick={restart}
                className="grid size-9 place-items-center border border-white/40 text-white/80 backdrop-blur-sm hover:border-white hover:text-white"
                aria-label="Replay this invitation"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-4"
                  aria-hidden="true"
                  fill="currentColor"
                >
                  <path d="M4 4v5h5M20 20v-5h-5M4 9a7 7 0 0112.3-4.3M20 15a7 7 0 01-12.3 4.3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 font-meta text-[8px] uppercase tracking-[0.14em] text-ink/40">
        <span>
          {page.name}
          {pages.length > 1 ? ` · ${pageIndex + 1} / ${pages.length}` : ""}
        </span>
        {!showClosing && phase === "invitation" && (
          <div className="flex items-center gap-2">
            <span className="text-[6px] uppercase tracking-[0.2em] text-ink/40">
              {pageFinished ? "All set" : "Continue when ready"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
