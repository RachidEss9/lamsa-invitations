import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { useReducedMotion } from "framer-motion";
import { ClosingStage } from "@/components/invitation/ClosingStage";
import { DesignPageView } from "@/components/invitation/DesignPageView";
import { PresentationStage } from "@/components/invitation/PresentationStage";
import { JourneyCue } from "@/components/invitation/JourneyCue";
import {
  personalize,
  pageSizeOf,
  type DesignDocument,
  type DesignPage,
} from "@/lib/design";
import { cn } from "@/lib/utils";
import type { FinishesConfig } from "@/lib/finishes";

export type JourneyPhase = "opening" | "page" | "closing";

export function InvitationJourney({
  design,
  imageUrls,
  guestName,
  names,
  rtl,
  reducedMotion,
  active = true,
  accent = "#710014",
  ink = "#161616",
  className,
}: {
  design: DesignDocument;
  imageUrls: Record<string, string>;
  guestName?: string | null;
  names?: string;
  rtl?: boolean;
  reducedMotion?: boolean;
  active?: boolean;
  accent?: string;
  ink?: string;
  className?: string;
}) {
  const [phase, setPhase] = useState<JourneyPhase>("opening");
  const [step, setStep] = useState(0);
  const [namesText, setNamesText] = useState(() =>
    personalize(names ?? "", guestName ?? ""),
  );
  const reducedMotionState = useReducedMotion();
  const isOpening = phase === "opening";
  const total = design.pages.length;
  const isLast = step + 1 >= total;

  const handleOpen = useCallback(() => {
    setPhase("page");
  }, []);

  const handleAdvance = useCallback(() => {
    setStep((current) => {
      const next = current + 1;
      if (next >= total) {
        setPhase("closing");
      }
      return next;
    });
  }, [total]);

  const handleClose = useCallback(() => {
    setPhase("closing");
  }, []);

  const handleReplay = useCallback(() => {
    setPhase("opening");
    setStep(0);
  }, []);

  const page = useMemo(() => design.pages[step], [design, step]);

  const handleReveal = useCallback(
    (targetId: string, interactionId: string) => {
      void targetId;
      void interactionId;
    },
    [active],
  );

  const stage = useMemo(() => {
    if (isOpening) {
      return (
        <PresentationStage
          opening={design.opening}
          imageUrls={imageUrls}
          guestName={guestName}
          names={namesText}
          rtl={rtl}
          reducedMotion={reducedMotionState}
          finishes={design.finishes}
          accent={accent}
          background={page.background}
          onDone={handleOpen}
          className={className}
        />
      );
    }
    if (phase === "closing") {
      return (
        <ClosingStage
          closing={design.closing}
          accent={accent}
          background={page.background}
          ink={ink}
          guestName={guestName}
          names={namesText}
          reducedMotion={reducedMotionState}
          onReplay={handleReplay}
        />
      );
    }
    return (
      <DesignPageView
        key={page.id}
        page={page}
        time={reducedMotionState ? pageSizeOf(page).width : 0}
        imageUrls={imageUrls}
        guestName={guestName}
        rtl={rtl}
        interactive
        reducedMotion={reducedMotionState}
        onReveal={handleReveal}
        finishes={design.finishes}
        forceFinishAnimations={false}
        revealPreview={new Set() as Set<string>}
        ignoreExit
        hideElementId={null}
        showHidden
        scrollActivationTime={0}
        materialPreview
        className={className}
      />
    );
  },    [isOpening,
    phase,
    design,
    imageUrls,
    guestName,
    namesText,
    rtl,
    reducedMotionState,
    page,
    active,
    accent,
    ink,
    handleOpen,
    handleReveal,
    handleReplay,
  ]);

  const { label, ariaLabel } = useMemo(() => {
    if (isLast) {
      return {
        label: "Close the invitation",
        ariaLabel: "Close the invitation",
      };
    }
    return {
      label: "Continue",
      ariaLabel: `Continue to section ${total - (total - step) + 1} of ${total}`,
    };
  }, [isLast, step, total]);

  const journeyCue = useMemo(() => {
    if (isOpening) return null;
    return (
      <JourneyCue
        label={label}
        ariaLabel={ariaLabel}
        accent={accent}
        background={page.background}
        ink={ink}
        rtl={rtl}
        reducedMotion={reducedMotionState}
        onAdvance={handleAdvance}
        className={className}
      />
    );
  }, [
    isOpening,
    label,
    ariaLabel,
    accent,
    page,
    ink,
    rtl,
    reducedMotionState,
    handleAdvance,
  ]);

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
          {isOpening
            ? "Choose a scene and open the invitation."
            : isLast
            ? "Close the invitation"
            : `Continue to section ${total - (total - step) + 1} of ${total}`}
        </div>
        {stage}
        {journeyCue}
      </div>
    </div>
  );
}
