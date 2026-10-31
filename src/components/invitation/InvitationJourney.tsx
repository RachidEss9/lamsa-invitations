import { ClosingStage } from "@/components/invitation/ClosingStage";
import { DesignPageView, useStageScale } from "@/components/invitation/DesignPageView";
import { JourneyCue } from "@/components/invitation/JourneyCue";
import { PresentationStage } from "@/components/invitation/PresentationStage";
import {
  pageTransitionFrames,
  pageSizeOf,
  type DesignDocument,
  type DesignPage,
} from "@/lib/design";
import { fontFamilyFor } from "@/lib/fonts";
import {
  advancePhase,
  continueState,
  initialTiming,
  journeyPages,
  journeyStartsAtOpening,
  pageDuration,
  pageEntranceEnd,
  type JourneyPhase,
} from "@/lib/journey";
import { cn } from "@/lib/utils";
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
  /** Motion Preview plays enabled finish effects regardless of a pause. */
  forceFinishAnimations?: boolean;
  /** Motion Preview plays enabled finish effects regardless of a pause. */
  forceFinishAnimations?: boolean;
  /** Motion Preview plays enabled finish effects regardless of a pause. */
  forceFinishAnimations?: boolean;
  /** Motion Preview plays enabled finish effects regardless of a pause. */
  forceFinishAnimations?: boolean;
  /** Motion Preview plays enabled finish effects regardless of a pause. */
  forceFinishAnimations?: boolean;
  /** Motion Preview plays enabled finish effects regardless of a pause. */
  forceFinishAnimations?: boolean;
  /** Motion Preview plays enabled finish effects regardless of a pause. */
  forceFinishAnimations?: boolean;
  /** Motion Preview plays enabled finish effects regardless of a pause. */
  forceFinishAnimations?: boolean;
  /** Motion Preview plays enabled finish effects regardless of a pause. */
  forceFinishAnimations?: boolean;
  /** Motion Preview plays enabled finish effects regardless of a pause. */
  forceFinishAnimations?: boolean;
  /** Motion Preview plays enabled finish effects regardless of a pause. */
  forceFinishAnimations?: boolean;
  /** Motion Preview plays enabled finish effects regardless of a pause. */
  forceFinishAnimations?: boolean;
  /** Motion Preview plays enabled finish effects regardless of a pause. */
  forceFinishAnimations?: boolean;
  /** Motion Preview plays enabled finish effects regardless of a pause. */
  forceFinishAnimations?: boolean;
  /** Motion Preview plays enabled finish effects regardless of a pause. */
  forceFinishAnimations?: boolean;
  /** Motion Preview plays enabled finish effects regardless of a pause. */
  forceFinishAnimations?: boolean;
  /** Motion Preview plays enabled finish effects regardless of a pause. */
  forceFinishAnimations?: boolean;
  /** Motion Preview plays enabled finish effects regardless of a pause. */
  forceFinishAnimations?: boolean;
  /** Motion Preview plays enabled finish effects regardless of a pause. */
  forceFinishAnimations?: boolean;
  /** Motion Preview plays enabled finish effects regardless of a pause. */
  forceFinishAnimations?: boolean;
  /** Motion Preview plays enabled finish effects regardless of a pause. */
  forceFinishAnimations?: boolean;
  /** Motion Preview plays enabled finish effects regardless of a pause. */
  forceFinishAnimations?: boolean;
  /** Motion Preview plays enabled finish effects regardless of a pause. */
  forceFinishAnimations?: boolean;
  /** Motion Preview plays enabled finish effects regardless of a pause. */
  forceFinishAnimations?: boolean;
  /** Motion Preview plays enabled finish effects regardless of a pause. */
  forceFinishAnimations?: boolean;
  /** Motion Preview plays enabled finish effects regardless of a pause. */
  forceFinishAnimations?: boolean;
  /** Motion Preview plays enabled finish effects regardless of a pause. */
  forceFinishAnimations?: boolean;
  /** Motion Preview plays enabled finish effects regardless of a pause. */
  forceFinishAnimations?: boolean;
  /** Motion Preview plays enabled finish effects regardless of a pause. */
  forceFinishAnimations?: boolean;
  /** Motion Preview plays enabled finish effects regardless of a pause. */
  forceFinishAnimations?: boolean;
  /** Motion Preview plays enabled finish effects regardless of a pause. */
  forceFinishAnimations?: boolean;
  /** Motion Preview plays enabled finish effects regardless of a pause. */
  forceFinishAnimations?: boolean;
  /** Motion Preview plays enabled finish effects regardless of a pause. */
  forceFinishAnimations?: boolean;
  /** Increment to replay the journey from its opening. */
  restartSignal?: number;
  onStepChange?: (step: number, total: number) => void;
  onPhaseChange?: (phase: JourneyPhase) => void;
}

const CONTINUE_BEAT_MS = 320;

interface OutgoingPage {
  page: DesignPage;
  time: number;
  key: string;
}

/**
 * The single guest-facing invitation journey.
 *
 * One continuous experience: the opening — in which the real first section is
 * the card being revealed — then each saved page in order, playing its own
 * entrance choreography, then the configured closing. There is no page picker
 * and no player chrome. The guest moves on with a small engraved flourish that
 * appears once the section has settled, by swipe, or with the arrow keys.
 *
 * The public invitation, the studio's guest preview and the opening dialog all
 * render the same implementation.
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
  const pageSize = pageSizeOf(pages[0] ?? null);
  const { ref: stageRef, scale } = useStageScale(pageSize.width);

  const [phase, setPhase] = useState<JourneyPhase>(() =>
    journeyStartsAtOpening(design, reducedMotion) ? "opening" : "page",
  );
  const [step, setStep] = useState(0);
  const [time, setTime] = useState(() =>
    initialTiming(pages[0] ?? null, reducedMotion).time,
  );
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [transition, setTransition] = useState(1);
  const [outgoing, setOutgoing] = useState<OutgoingPage | null>(null);
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
  const frames = pageTransitionFrames(design.transition, transition, {
    rtl: rtl ?? false,
  });

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
    setOutgoing(null);
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

  // Settle the section, then wait one short beat before offering the way on so
  // the flourish does not appear on top of the last entrance animation.
  useEffect(() => {
    if (phase !== "page" || !settled) return;
    if (ready) return;
    const timer = window.setTimeout(
      () => setReady(true),
      reducedMotion ? 0 : CONTINUE_BEAT_MS,
    );
    return () => window.clearTimeout(timer);
  }, [phase, reducedMotion, ready, settled, step]);

  // If animation frames never fire (a throttled tab, a stalled compositor), the
  // guest must still be able to move on. This settles the section and reveals
  // its finished state.
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
      // Once the incoming page owns the frame, the outgoing copy can go.
      else setOutgoing(null);
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
      setOutgoing(null);
      setTransition(reducedMotion ? 1 : 0);
      setPhase("closing");
      return;
    }
    if (next.step !== step) {
      // Keep the section the guest just read on screen while the next one
      // arrives, so a page change is a continuation rather than a cut. A
      // reduced-motion guest asks for no transition at all.
      if (!reducedMotion) {
        setOutgoing({
          page: page!,
          time: Math.max(timeRef.current, entrance),
          key: `${page?.id ?? "page"}-${step}`,
        });
      }
      resetPage(next.step);
    }
  }, [
    closingEnabled,
    continueInfo.visible,
    entrance,
    page,
    phase,
    reducedMotion,
    resetPage,
    step,
    total,
  ]);

  const handleReveal = useCallback((_targetId: string, interactionId: string) => {
    setRevealed((previous) => {
      if (previous.has(interactionId)) return previous;
      const next = new Set(previous);
      next.add(interactionId);
      return next;
    });
  }, []);

  const handleOpeningDone = () => {
    const first = pages[0] ?? null;
    // The opening has already shown this section settling into place, so the
    // first page hands over fully revealed at exactly the same position.
    const settledAt = Math.max(900, pageEntranceEnd(first));
    setPhase("page");
    setStep(0);
    timeRef.current = settledAt;
    setTime(settledAt);
    setTransition(1);
    setOutgoing(null);
    setRevealed(new Set());
    setScrollActivationTime(0);
    setReady(false);
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
    if (
      event.key === "ArrowRight" ||
      event.key === "ArrowDown" ||
      event.key === "PageDown"
    ) {
      event.preventDefault();
      handleContinue();
    }
  };

  if (!page) return null;

  const titleElement = page.elements.find(
    (element) => element.kind === "text" && element.font,
  );
  const cueFont = fontFamilyFor(titleElement?.font ?? "cormorant-garamond");
  const cueLabel = continueInfo.finishes ? "Close" : "Continue";
  const cueAriaLabel = continueInfo.finishes
    ? "Close the invitation"
    : `Continue to section ${Math.min(step + 2, total)} of ${total}`;

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
        style={{ aspectRatio: `${pageSize.width} / ${pageSize.height}` }}
      >
        {phase !== "opening" && (
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              width: pageSize.width,
              height: pageSize.height,
              transform: `scale(${scale || 0.0001})`,
              visibility: scale ? "visible" : "hidden",
            }}
          >
            <>
              {outgoing && (
                <div
                  key={`out-${outgoing.key}`}
                  aria-hidden
                  className="absolute inset-0"
                  style={{ ...frames.outgoing, transition: "opacity 0ms linear 0ms" }}
                >
                  <DesignPageView
                    page={outgoing.page}
                    time={outgoing.time}
                    imageUrls={imageUrls}
                    guestName={guestName}
                    rtl={rtl}
                    reducedMotion={reducedMotion}
                    finishes={design.finishes}
                    revealed={revealed}
                    scrollActivationTime={0}
                  />
                </div>
              )}

              <div
                key={`in-${page.id}-${step}`}
                className="absolute inset-0"
                aria-hidden={phase === "closing"}
                style={phase === "page" ? frames.incoming : undefined}
              >
                <DesignPageView
                  page={page}
                  // Reduced motion shows the section fully entered, never its
                  // exit state, so nothing is hidden from the guest.
                  time={reducedMotion ? entrance : time}
                  imageUrls={imageUrls}
                  guestName={guestName}
                  rtl={rtl}
                  interactive
                  reducedMotion={reducedMotion}
                  finishes={design.finishes}
                  revealed={revealed}
                  scrollActivationTime={reducedMotion ? 0 : scrollActivationTime}
                  onReveal={handleReveal}
                />
              </div>

              {phase === "closing" && (
                <div
                  className="absolute inset-0 z-50"
                  style={frames.incoming}
                >
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
                </div>
              )}
            </>
          </div>
        )}

        {phase === "opening" && (
          <PresentationStage
            opening={design.opening}
            page={page}
            imageUrls={imageUrls}
            accent={accent}
            background={page.background}
            guestName={guestName}
            names={names}
            rtl={rtl}
            autoOpen={design.opening.autoOpen}
            reducedMotion={reducedMotion}
            finishes={design.finishes}
            onDone={handleOpeningDone}
          />
        )}

        {phase === "page" && continueInfo.visible && (
          <JourneyCue
            label={cueLabel}
            ariaLabel={cueAriaLabel}
            accent={accent}
            background={page.background}
            ink={ink}
            fontFamily={cueFont}
            rtl={rtl}
            reducedMotion={reducedMotion}
            onAdvance={handleContinue}
          />
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {phase === "opening"
          ? "Choose a scene and open the invitation."
          : phase === "closing"
            ? "The closing note."
            : `Section ${step + 1} of ${total}: ${page?.name ?? ""}`}
      </p>
    </div>
  );
}
