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
 * entrance, and finally the closing. No loop: once a guest has seen the last
 * page, the invitation rests where it landed.
 */
export function InvitationJourney({
  design,
  imageUrls,
  guestName,
  names,
  rtl,
  reducedMotion,
  accent,
  ink,
  active = true,
  className,
  forceFinishAnimations = false,
  restartSignal = 0,
}: InvitationJourneyProps) {
  const [phase, setPhase] = useState<JourneyPhase>("opening");
  const [step, setStep] = useState(0);
  const [total, setTotal] = useState(design.pages.length);
  const [revealed, setRevealed] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const pages = useMemo(() => journeyPages(design), [design]);
  const firstPage = pages[0];
  const lastPage = pages[pages.length - 1];
  const opening = journeyStartsAtOpening(design) ? design.opening.experience : "none";
  const hasOpening = opening !== "none";
  const continueLabel = phase === "closing" ? "Close" : (step + 1 < total ? "Continue" : "Close");

  const handleContinue = useCallback(() => {
    if (phase === "opening") {
      if (hasOpening) {
        setPhase("page");
        setStep(0);
        setTotal(design.pages.length);
        setRevealed(true);
        return;
      }
      if (step + 1 < total) {
        setStep((s) => s + 1);
      }
      return;
    }
    if (phase === "closing" && step + 1 >= total) return;
    setStep((s) => s + 1);
  }, [phase, step, total, hasOpening, design.pages.length]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.target instanceof HTMLElement && event.target.closest("input, textarea")) {
      return;
    }
    if (event.key === "ArrowRight" || event.key === "ArrowDown" || event.key === "PageDown") {
      event.preventDefault();
      handleContinue();
    }
  };

  const handleTouchStart = (event: React.TouchEvent) => {
    if (event.target instanceof HTMLElement && event.target.closest("input, textarea")) return;
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (!touchStart.current) return;
    const target = event.target as HTMLElement;
    if (target.closest("input, textarea")) {
      touchStart.current = null;
      return;
    }
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart.current.x;
    const dy = touch.clientY - touchStart.current.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.5) {
      touchStart.current = null;
      return;
    }
    const forward = rtl ? dx > 0 : dx < 0;
    if (forward) handleContinue();
    touchStart.current = null;
  };

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
        className="relative w-full overflow-hidden bg-[var(--paper-light)] shadow-[0_24px_70px_rgba(22,22,22,0.16)]"
      >
        {phase !== "opening" && (
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              width: pageSizeOf(firstPage).width,
              height: pageSizeOf(firstPage).height,
              transform: `scale(${1 || 0.0001})`,
              visibility: "visible",
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: firstPage.background ?? "#f2f1ed",
              }}
            >
              {phase === "opening" && hasOpening && (
                <PresentationStage
                  opening={design.opening}
                  page={firstPage}
                  imageUrls={imageUrls}
                  accent="#710014"
                  background={firstPage.background ?? "#f2f1ed"}
                  guestName={guestName}
                  names={names}
                  rtl={rtl}
                  autoOpen={true}
                  reducedMotion={reducedMotion}
                  finishes={design.finishes}
                  onDone={() => setPhase("page")}
                />
              )}
              {phase === "page" && (
                <DesignPageView
                  page={pages[step]}
                  time={0}
                  imageUrls={imageUrls}
                  guestName={guestName}
                  rtl={rtl}
                  reducedMotion={reducedMotion}
                  finishes={design.finishes}
                  revealed={revealed}
                  onReveal={() => setRevealed(true)}
                />
              )}
              {phase === "closing" && (
                <PresentationStage
                  opening={design.opening}
                  page={lastPage}
                  imageUrls={imageUrls}
                  accent="#710014"
                  background={lastPage.background ?? "#f2f1ed"}
                  guestName={guestName}
                  names={names}
                  rtl={rtl}
                  autoOpen={true}
                  reducedMotion={reducedMotion}
                  finishes={design.finishes}
                  onDone={() => setPhase("page")}
                />
              )}
            </div>
          </div>
        )}
        <JourneyCue
          fontFamily="cormorant-garamond"
          label={continueLabel}
          ariaLabel={continueLabel === "Close" ? "Close the invitation" : `Continue to section ${Math.min(step + 2, total)} of ${total}`}
          accent="#710014"
          background={firstPage.background ?? "#f2f1ed"}
          ink="#161616"
          rtl={rtl}
          reducedMotion={reducedMotion}
          onAdvance={handleContinue}
        />
        {!active && (
          <div className="absolute inset-0 z-20 bg-black/40" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
