import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClosingStage } from "@/components/invitation/ClosingStage";
import { DesignPageView } from "@/components/invitation/DesignPageView";
import { JourneyCue } from "@/components/invitation/JourneyCue";
import { PreviewFrame } from "@/components/invitation/PreviewFrame";
import { personalize, type DesignDocument } from "@/lib/design";
import {
  advancePhase,
  continueState,
  journeyPages,
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
  /** Motion Preview plays enabled finish effects regardless of a pause. */
  forceFinishAnimations?: boolean;
  /** Reports the guest's position for the preview's progress read-out. */
  onStepChange?: (step: number, total: number) => void;
  onPhaseChange?: (phase: JourneyPhase) => void;
  /**
   * The height budget the whole card may occupy. The card is sized from the
   * page's own aspect ratio against this budget and the caller's width, so the
   * complete page is always visible: never cropped, never stretched.
   */
  fitHeight?: string;
  className?: string;
}

/** 
 * The sequential guest journey: one section is shown at a time behind a
 * single Continue flourish, and the final section hands over to the closing.
 * The public page and the studio's guest preview render exactly this component,
 * so rehearsal is the real run.
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
  forceFinishAnimations = false,
  onStepChange,
  onPhaseChange,
  fitHeight = "82dvh",
  className,
}: InvitationJourneyProps) {
  const pages = useMemo(() => journeyPages(design), [design]);
  const total = pages.length;
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<JourneyPhase>(() =>
    "page",
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

  // The section's clock starts on the first frame, so nothing is written to
  // state while the effect body is still running.
  useEffect(() => {
    const initial = reducedMotion ? duration : 0;
    timeRef.current = initial;
    let frame = requestAnimationFrame(() => {
      setTime(initial);
      if (reducedMotion || !active || phase !== "page") return;
      let last = performance.now();
      const tick = (now: number) => {
        const next = Math.min(duration, timeRef.current + (now - last));
        last = now;
        timeRef.current = next;
        setTime(next);
        if (next < duration) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    frameRef.current = frame;
    return () => cancelAnimationFrame(frame);
  }, [phase, step, reducedMotion, active, duration]);

  /* The Continue affordance waits for this beat — until the section's own
     entrance has played out, the guest is still reading, not clicking. */
  const [settledStep, setSettledStep] = useState<number | null>(null);
  const settled = reducedMotion || settledStep === step;

  useEffect(() => {
    if (reducedMotion || phase !== "page") return;
    const timer = window.setTimeout(() => setSettledStep(step), entranceEnd);
    return () => window.clearTimeout(timer);
  }, [phase, step, reducedMotion, entranceEnd]);

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
      "page",
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
      <div
        className="absolute inset-0"
        style={{
          background: page?.background ?? "#f2f1ed",
        }}
      >
        <DesignPageView
          key={page?.id}
          page={page}
          time={0}
          imageUrls={imageUrls}
          guestName={guestName}
          rtl={rtl}
          interactive
          reducedMotion={reducedMotion}
          finishes={design.finishes}
          onReveal={handleOpen}
        />
      </div>
    );
  } else if (phase === "closing") {
    stage = (
      <ClosingStage
        closing={design.closing}
        accent={accent}
        guestName={guestName}
        names={namesText}
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
      <PreviewFrame
        page={page ? { width: page.width!, height: page.height! } : null}
        fitHeight={fitHeight}
        className="relative mx-auto w-full overflow-hidden bg-[var(--paper-light)] shadow-[0_24px_70px_rgba(22,22,22,0.16)]"
      >
        <div className="absolute inset-0">{stage}</div>
        <div className="sr-only" aria-live="polite">
          {phase === "opening"
            ? "Choose a scene and open the invitation."
            : announcement}
        </div>
        {journeyCue}
      </PreviewFrame>
    </div>
  );
}
