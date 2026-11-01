import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClosingStage } from "@/components/invitation/ClosingStage";
import { DesignPageView } from "@/components/invitation/DesignPageView";
import { JourneyCue } from "@/components/invitation/JourneyCue";
import { PresentationStage } from "@/components/invitation/PresentationStage";
import { personalize, type DesignDocument } from "@/lib/design";
import {
  advancePhase,
  continueState,
  journeyPages,
  journeyStartsAtOpening,
  pageDuration,
  pageEntranceEnd,
  type JourneyPhase,
} from "@/lib/journey";
import { cn } from "@/lib/utils";

export type { JourneyPhase };

interface InvitationJourneyProps {
  design: DesignDocument;
  imageUrls: Record<string, string>;
  guestName?: string | null;
  names?: string;
  rtl?: boolean;
  reducedMotion?: boolean;
  active?: boolean;
  accent?: string;
  ink?: string;
  /** Bumped by the studio's preview to run the whole story again. */
  restartSignal?: number;
  /** Motion Preview plays enabled finish effects regardless of a pause. */
  forceFinishAnimations?: boolean;
  /** Reports the guest's position for the preview's progress read-out. */
  onStepChange?: (step: number, total: number) => void;
  onPhaseChange?: (phase: JourneyPhase) => void;
  className?: string;
}

/**
 * The sequential guest journey: the presentation stage opens the invitation,
 * one section is shown at a time behind a single Continue flourish, and the
 * final section hands over to the closing. The public page and the studio's
 * guest preview render exactly this component, so rehearsing is the real run.
 */
export function InvitationJourney({
  design,
  imageUrls,
  guestName,
  names,
  rtl,
  reducedMotion = false,
  active = true,
  accent = "#710014",
  ink = "#161616",
  restartSignal = 0,
  forceFinishAnimations = false,
  onStepChange,
  onPhaseChange,
  className,
}: InvitationJourneyProps) {
  const pages = useMemo(() => journeyPages(design), [design]);
  const total = pages.length;
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<JourneyPhase>(() =>
    journeyStartsAtOpening(design, reducedMotion) ? "opening" : "page",
  );
  const page = pages[step] ?? null;
  const namesText = useMemo(
    () => personalize(names ?? "", guestName ?? ""),
    [names, guestName],
  );
  const closingEnabled = design.closing?.enabled ?? false;
  const duration = pageDuration(page);
  const entranceEnd = pageEntranceEnd(page);

  /* The section's own clock: reduced motion lands on the settled frame,
     otherwise the entrance plays from zero on every step. */
  const [time, setTime] = useState(() => (reducedMotion ? duration : 0));
  const timeRef = useRef(time);
  const frameRef = useRef(0);

  useEffect(() => {
    const initial = reducedMotion ? duration : 0;
    timeRef.current = initial;
    setTime(initial);
    if (reducedMotion || !active || phase !== "page") return;
    let last = performance.now();
    const tick = (now: number) => {
      const next = Math.min(duration, timeRef.current + (now - last));
      last = now;
      timeRef.current = next;
      setTime(next);
      if (next < duration) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [phase, step, reducedMotion, active, duration]);

  /* The Continue affordance waits for this beat — until the section's own
     entrance has played out, the guest is still reading, not clicking. */
  const [settled, setSettled] = useState(reducedMotion);

  useEffect(() => {
    if (reducedMotion) {
      setSettled(true);
      return;
    }
    if (phase !== "page") return;
    setSettled(false);
    const timer = window.setTimeout(() => setSettled(true), entranceEnd);
    return () => window.clearTimeout(timer);
  }, [phase, step, reducedMotion, entranceEnd]);

  /* The studio preview's "Replay opening" runs the whole story again. */
  useEffect(() => {
    setStep(0);
    setPhase(
      journeyStartsAtOpening(design, reducedMotion) ? "opening" : "page",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restartSignal]);

  useEffect(() => {
    onStepChange?.(step, total);
  }, [step, total, onStepChange]);

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

  const handleOpen = useCallback(() => {
    setPhase("page");
  }, []);

  const handleAdvance = useCallback(() => {
    const next = advancePhase(step, total, closingEnabled);
    setStep(next.step);
    setPhase(next.phase);
  }, [step, total, closingEnabled]);

  const handleReplay = useCallback(() => {
    setStep(0);
    setPhase(
      journeyStartsAtOpening(design, reducedMotion) ? "opening" : "page",
    );
  }, [design, reducedMotion]);

  const progress = continueState(
    { duration, settled, reducedMotion },
    step,
    total,
    closingEnabled,
  );
  const announcement = progress.finishes
    ? "Close the invitation"
    : `Continue to section ${Math.min(step + 2, total)} of ${total}`;

  let stage = null;
  if (phase === "opening") {
    stage = (
      <PresentationStage
        opening={design.opening}
        page={page}
        imageUrls={imageUrls}
        accent={accent}
        background={page?.background ?? "#f2f1ed"}
        guestName={guestName}
        names={namesText}
        rtl={rtl}
        reducedMotion={reducedMotion}
        finishes={design.finishes}
        onDone={handleOpen}
        className={className}
      />
    );
  } else if (phase === "closing") {
    stage = (
      <ClosingStage
        closing={design.closing}
        accent={accent}
        background={page?.background ?? "#f2f1ed"}
        ink={ink}
        guestName={guestName}
        names={namesText}
        reducedMotion={reducedMotion}
        onReplay={handleReplay}
      />
    );
  } else if (page) {
    stage = (
      <DesignPageView
        key={page.id}
        page={page}
        time={time}
        imageUrls={imageUrls}
        guestName={guestName}
        rtl={rtl}
        interactive
        reducedMotion={reducedMotion}
        finishes={design.finishes}
        forceFinishAnimations={forceFinishAnimations}
      />
    );
  }

  const journeyCue =
    phase === "page" && progress.visible ? (
      <JourneyCue
        label={progress.label}
        ariaLabel={announcement}
        accent={accent}
        background={page?.background ?? "#f2f1ed"}
        ink={ink}
        rtl={rtl}
        reducedMotion={reducedMotion}
        onAdvance={handleAdvance}
        className={className}
      />
    ) : null;

  return (
    <div
      className={cn("relative w-full", className)}
      role="region"
      aria-label={`Invitation for ${namesText}`}
      tabIndex={0}
    >
      <div
        className="relative w-full overflow-hidden bg-[var(--paper-light)] shadow-[0_24px_70px_rgba(22,22,22,0.16)]"
        style={{ aspectRatio: "1000 / 1333.33" }}
      >
        <div className="sr-only" aria-live="polite">
          {phase === "opening"
            ? "Choose a scene and open the invitation."
            : announcement}
        </div>
        {stage}
        {journeyCue}
      </div>
    </div>
  );
}