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

interface SequentialGuestPreviewProps {
  design: DesignDocument;
  imageUrls: Record<string, string>;
  guestName?: string | null;
  names?: string;
  rtl?: boolean;
  reducedMotion: boolean;
  palette: { background: string; ink: string; accent: string };
  onClose: () => void;
}

const PAGE_ADVANCE_AFTER_MS = 6500;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function SequentialGuestPreview({
  design,
  imageUrls,
  guestName,
  names,
  rtl,
  reducedMotion,
  palette,
  onClose,
}: SequentialGuestPreviewProps) {
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
  const lastPage = pageIndex === pages.length - 1;
  const closingEnabled = design.closing.enabled && lastPage;

  const page = pages[Math.min(pageIndex, pages.length - 1)];
  const duration = timelineDuration(page);

  useEffect(() => {
    if (!reducedMotion || phase !== "invitation") return;
    if (!closingEnabled) return;
    const reset = requestAnimationFrame(() => setContinueReady(false));
    const timer = window.setTimeout(() => setContinueReady(true), 2200);
    return () => {
      cancelAnimationFrame(reset);
      window.clearTimeout(timer);
    };
  }, [pageIndex, phase, reducedMotion, closingEnabled]);

  useEffect(() => {
    if (!playing || reducedMotion) return;
    if (closingEnabled && lastPage) return;
    const pagePlayedLongEnough = time >= duration - 5;
    if (!pagePlayedLongEnough) return;
    const threshold = page.elements.length * 1800 + 2200;
    if (duration > threshold && time >= Math.min(duration, threshold)) {
      setShowContinue(true);
      setContinueReady(true);
    }
  }, [duration, page.elements.length, pageIndex, playing, reducedMotion, time, lastPage, closingEnabled]);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      const next = timeRef.current + delta;
      if (next >= duration) {
        if (lastPage && closingEnabled) {
          timeRef.current = duration;
          setTime(duration);
          setPlaying(false);
        } else if (showContinue && !lastPage) {
          // Pause briefly to let the guest press Continue.
          timeRef.current = duration;
          setTime(duration);
          setPlaying(false);
        } else {
          timeRef.current = 0;
          setTime(0);
          setPageIndex((index) => index + 1);
          setTransition(0);
          timeRef.current = 0;
          frame = requestAnimationFrame(tick);
        }
        return;
      }
      timeRef.current = next;
      setTime(next);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [
    duration,
    lastPage,
    closingEnabled,
    pageIndex,
    playing,
    reducedMotion,
    showContinue,
    pages.length,
  ]);

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
        (now - start) / Math.max(200, design.transition.duration),
      );
      setTransition(progress);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [design.transition.duration, reducedMotion, transition]);

  useEffect(() => {
    if (!reducedMotion) return;
    if (!closingEnabled) return;
    const reset = requestAnimationFrame(() => setContinueReady(false));
    const timer = window.setTimeout(() => setContinueReady(true), 2200);
    return () => {
      cancelAnimationFrame(reset);
      window.clearTimeout(timer);
    };
  }, [pageIndex, reducedMotion, closingEnabled]);

  const restart = () => {
    timeRef.current = 0;
    setTime(0);
    setPlaying(true);
    setScrollActivationTime(0);
    setRevealed(new Set());
    setShowContinue(false);
    setContinueReady(false);
    setPageIndex(0);
    if (design.opening.experience !== "none") {
      setPhase("opening");
    }
  };

  const advanceTo = (next: number) => {
    const bounded = Math.min(pages.length - 1, Math.max(0, next));
    if (bounded === pageIndex) return;
    setPageIndex(bounded);
    setTime(0);
    timeRef.current = 0;
    setTransition(0);
    setPlaying(true);
    setShowContinue(false);
    setContinueReady(false);
  };

  const finishCurrentPage = () => {
    if (pageIndex < pages.length - 1) {
      advanceTo(pageIndex + 1);
    } else if (closingEnabled) {
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
    closingEnabled && phase === "invitation" && pageFinished;

  useEffect(() => {
    if (!reducedMotion) return;
    const reset = requestAnimationFrame(() => setContinueReady(false));
    const timer = window.setTimeout(() => setContinueReady(true), 2200);
    return () => {
      cancelAnimationFrame(reset);
      window.clearTimeout(timer);
    };
  }, [pageIndex, reducedMotion, closingEnabled]);

  const handleReveal = (targetId: string, interactionId: string) => {
    setRevealed((previous) => new Set(previous).add(interactionId));
  };

  const stageWidth = "min(92vw, 520px)";

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-[#0e0d0c]">
      <div className="flex items-center justify-between border-b border-white/12 px-4 py-2.5 text-[#f2f1ed]">
        <div className="flex items-center gap-2">
          <span className="font-meta text-[9px] uppercase tracking-[0.2em] text-white/60">
            Guest experience preview
          </span>
          <span className="font-meta text-[9px] uppercase tracking-[0.16em] text-white/40">
            Section {pageIndex + 1} / {pages.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={restart}
            className="h-8 border border-white/20 px-2.5 font-meta text-[9px] uppercase tracking-[0.14em] text-white/75 hover:border-white"
          >
            Replay
          </button>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center border border-white/20 text-white/70 hover:border-white hover:text-white"
            aria-label="Close guest experience preview"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-4"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
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
              style={{ ...pageTransitionStyle(design.transition, transition) }}
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
                {phase === "opening" && design.opening.experience !== "none" && (
                  <OpeningStage
                    opening={design.opening}
                    accent={palette.accent}
                    background={palette.background}
                    ink={palette.ink}
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
                  key={`preview-${page.id}-${pageIndex}`}
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
          </div>

          {showClosing && (
            <ClosingStage
              closing={design.closing}
              accent={palette.accent}
              background={page.background}
              ink={palette.ink}
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
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-white/12 bg-[#141312] px-4 py-3 text-[#f2f1ed]">
        <div className="mt-1.5 flex items-center justify-between font-meta text-[8px] uppercase tracking-[0.12em] text-white/35">
          <span>{page.name}</span>
          {!showClosing && phase === "invitation" && (
            <span className="text-[6px] uppercase tracking-[0.2em] text-white/40">
              {pageFinished ? "All set" : "Continue when ready"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
