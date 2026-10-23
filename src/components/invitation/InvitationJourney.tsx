import { ClosingStage } from "@/components/invitation/ClosingStage";
import { DesignPageView, useStageScale } from "@/components/invitation/DesignPageView";
import { OpeningStage } from "@/components/invitation/OpeningStage";
import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  pageTransitionStyle,
  type DesignDocument,
} from "@/lib/design";
import {
  advancePhase,
  continueState,
  initialTiming,
  journeyPages,
  journeyProgress,
  journeyStartsAtOpening,
  pageDuration,
  pageEntranceEnd,
  type JourneyPhase,
} from "@/lib/journey";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface InvitationJourneyProps {
  design: DesignDocument;
  imageUrls: Record<string, string>;
  guestName?: string | null;
  names?: string;
  rtl?: boolean;
  reducedMotion: boolean;
  accent?: string;
  ink?: string;
  active?: boolean;
  className?: string;
  /** Increment to replay the journey from its opening. */
  restartSignal?: number;
  onStepChange?: (step: number, total: number) => void;
  onPhaseChange?: (phase: JourneyPhase) => void;
}

const CONTINUE_BEAT_MS = 350;

/**
 * The single guest-facing invitation journey.
 *
 * One continuous experience: opening cover → each saved page in order, playing
 * its own entrance choreography → the existing closing stage. There is no page
 * picker and no player chrome. The guest moves on with one Continue control
 * that appears only once the current section has settled, by swipe, or with the
 * right arrow key.
 *
 * The public invitation and the studio's guest preview both render this
 * component, so what an owner previews is exactly what a guest receives.
 */
export function InvitationJourney({
  design,
  imageUrls,
  guestName,
  names,
  rtl,
  reducedMotion,
  accent = "#710014",
  ink = "#161616",
  active = true,
  className,
  restartSignal,
  onStepChange,
  onPhaseChange,
}: InvitationJourneyProps) {
  const pages = useMemo(() => journeyPages(design), [design]);
  const total = pages.length;
  const { ref: stageRef, scale } = useStageScale();

  const [phase, setPhase] = useState<JourneyPhase>(() =>
    journeyStartsAtOpening(design, reducedMotion) ? "opening" : "page",
  );
  const [step, setStep] = useState(0);
  const [time, setTime] = useState(() =>
    initialTiming(pages[0] ?? null, reducedMotion).time,
  );
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [transition, setTransition] = useState(1);
  const [scrollActivationTime, setScrollActivationTime] = useState<number | null>(
    reducedMotion ? 0 : null,
  );
  const [ready, setReady] = useState(reducedMotion);

  const timeRef = useRef(time);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const page = pages[Math.min(step, total - 1)];
  const duration = pageDuration(page);
  const entrance = pageEntranceEnd(page);
  const closingEnabled = design.closing.enabled && step === total - 1;
  const settled = reducedMotion || (phase === "page" && time >= entrance);

  useEffect(() => {
    onStepChange?.(step, total);
  }, [onStepChange, step, total]);

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [onPhaseChange, phase]);

  const resetPage = useCallback(
    (nextStep: number) => {
      setStep(nextStep);
      timeRef.current = 0;
      setTime(0);
      setTransition(reducedMotion ? 1 : 0);
      setScrollActivationTime(0);
      setReady(reducedMotion);
    },
    [reducedMotion],
  );

  const restart = useCallback(() => {
    setRevealed(new Set());
    setPhase(journeyStartsAtOpening(design, reducedMotion) ? "opening" : "page");
    setTransition(1);
    timeRef.current = 0;
    setTime(initialTiming(pages[0] ?? null, reducedMotion).time);
    setStep(0);
    setScrollActivationTime(reducedMotion ? 0 : null);
    setReady(reducedMotion);
  }, [design, pages, reducedMotion]);

  // Keep the parent's replay control in step with the journey's own restart.
  const restartRef = useRef(restart);
  useEffect(() => {
    restartRef.current = restart;
  }, [restart]);
  useEffect(() => {
    if (restartSignal === undefined || restartSignal === 0) return;
    restartRef.current();
  }, [restartSignal]);

  // Settle the section, then wait one short beat before offering Continue so
  // the control does not appear on top of the last entrance animation.
  useEffect(() => {
    if (phase !== "page" || !settled) return;
    if (ready) return;
    const timer = window.setTimeout(() => setReady(true), reducedMotion ? 0 : CONTINUE_BEAT_MS);
    return () => window.clearTimeout(timer);
  }, [phase, reducedMotion, ready, settled, step]);

  // If animation frames never fire (a throttled tab, a browser that dropped
  // rAF, a stalled animation), the guest must still be able to move on. This
  // safety net settles the section and reveals its finished state.
  useEffect(() => {
    if (phase !== "page" || reducedMotion) return;
    const fallback = window.setTimeout(() => {
      const finish = Math.max(entrance, timeRef.current);
      timeRef.current = finish;
      setTime((current) => Math.max(current, finish));
      setReady(true);
    }, duration + 1500);
    return () => window.clearTimeout(fallback);
  }, [duration, entrance, phase, reducedMotion, step]);

  // The page clock: advance entrance and exit animations on their own timeline.
  useEffect(() => {
    if (!active || phase !== "page" || reducedMotion) return;
    if (timeRef.current >= duration) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const next = timeRef.current + (now - last);
      last = now;
      if (next >= duration) {
        timeRef.current = duration;
        setTime(duration);
        return;
      }
      timeRef.current = next;
      setTime(next);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, duration, phase, reducedMotion, step]);

  // Scroll-triggered layers wait until the card is actually in view.
  useEffect(() => {
    if (!active || phase !== "page" || reducedMotion) return;
    const node = stageRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setScrollActivationTime(0);
      return;
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
  }, [active, phase, reducedMotion, stageRef, step]);

  // The page transition animates once, on the way in.
  useEffect(() => {
    if (transition >= 1 || reducedMotion) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(
        1,
        (now - start) / Math.max(240, design.transition.duration),
      );
      setTransition(progress);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [design.transition.duration, reducedMotion, transition]);

  const continueInfo = continueState(
    { duration, settled: ready, reducedMotion },
    step,
    total,
    closingEnabled,
  );

  const handleContinue = useCallback(() => {
    if (phase !== "page" || !continueInfo.visible) return;
    const next = advancePhase(step, total, closingEnabled);
    if (next.phase === "closing") {
      setPhase("closing");
      return;
    }
    if (next.step !== step) resetPage(next.step);
  }, [closingEnabled, continueInfo.visible, phase, resetPage, step, total]);

  const handleReveal = useCallback((_targetId: string, interactionId: string) => {
    setRevealed((previous) => {
      if (previous.has(interactionId)) return previous;
      const next = new Set(previous);
      next.add(interactionId);
      return next;
    });
  }, []);

  const handleOpeningDone = () => {
    setPhase("page");
    setStep(0);
    timeRef.current = 0;
    setTime(reducedMotion ? pageDuration(pages[0] ?? null) : 0);
    setRevealed(new Set());
    setScrollActivationTime(reducedMotion ? 0 : null);
    setReady(reducedMotion);
  };

  const handleTouchStart = (event: React.TouchEvent) => {
    const touch = event.changedTouches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || !continueInfo.visible) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const forward = rtl ? dx > 0 : dx < 0;
    if (forward) handleContinue();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.target instanceof HTMLElement && event.target.closest("input, textarea")) {
      return;
    }
    if (event.key === "ArrowRight" || event.key === "ArrowDown" || event.key === "PageDown") {
      event.preventDefault();
      handleContinue();
    }
  };

  if (!page) return null;

  return (
    <div
      className={cn("relative w-full", className)}
      role="region"
      aria-label={names ? `Invitation for ${names}` : "Invitation"}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        ref={stageRef}
        className="relative w-full overflow-hidden bg-[var(--paper-light)] shadow-[0_24px_70px_rgba(22,22,22,0.16)]"
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
            {phase === "opening" && (
              <OpeningStage
                opening={design.opening}
                accent={accent}
                background={page?.background ?? "#f2f1ed"}
                ink={ink}
                guestName={guestName}
                names={names}
                autoOpen={design.opening.autoOpen}
                reducedMotion={reducedMotion}
                coverUrl={
                  design.opening.coverStorageId
                    ? imageUrls[design.opening.coverStorageId]
                    : undefined
                }
                onDone={handleOpeningDone}
              />
            )}

            <DesignPageView
              key={`journey-${page.id}-${step}`}
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

        {phase === "closing" && (
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

        {phase === "page" && continueInfo.visible && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex flex-col items-center gap-2 bg-gradient-to-t from-black/30 to-transparent px-4 pb-4 pt-12">
            <button
              type="button"
              onClick={handleContinue}
              aria-label={
                continueInfo.finishes
                  ? "Close the invitation"
                  : `Continue to section ${Math.min(step + 2, total)} of ${total}`
              }
              className="pointer-events-auto inline-flex min-h-11 items-center gap-2 border border-ink/15 bg-[var(--paper-light)]/95 px-5 py-2.5 font-ui text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--ink)] shadow-[0_10px_30px_rgba(0,0,0,0.22)] backdrop-blur transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--red)]"
            >
              {continueInfo.label}
              <ChevronRight className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        {phase === "page" && (
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-30 h-[2px] bg-ink/10"
            aria-hidden="true"
          >
            <div
              className="h-full bg-[var(--red)] transition-[width] duration-500 ease-out"
              style={{ width: `${journeyProgress(step, total) * 100}%` }}
            />
          </div>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {phase === "opening"
          ? "The invitation cover. Open it to begin."
          : phase === "closing"
            ? "The closing note."
            : `Section ${step + 1} of ${total}: ${page?.name ?? ""}`}
      </p>
    </div>
  );
}
