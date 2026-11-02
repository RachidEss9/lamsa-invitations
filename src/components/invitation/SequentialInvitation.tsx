import { useState } from "react";
import { InvitationJourney, type JourneyPhase } from "./InvitationJourney";
import { type DesignDocument } from "@/lib/design";

interface SequentialInvitationProps {
  design: DesignDocument;
  imageUrls: Record<string, string>;
  guestName?: string | null;
  names?: string;
  rtl?: boolean;
  reducedMotion?: boolean;
  active?: boolean;
  accent?: string;
  ink?: string;
  restartSignal?: number;
  forceFinishAnimations?: boolean;
  onStepChange?: (step: number, total: number) => void;
  onPhaseChange?: (phase: JourneyPhase) => void;
  className?: string;
}

/**
 * The public guest experience for an invitation whose pages are sequential.
 * It plays the same journey as the studio's guest rehearsal but refuses any
 * edit, tying the read-only journey to a single deep link.
 */
export function SequentialInvitation({
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
}: SequentialInvitationProps) {
  const [restartSignalInternal] = useState(restartSignal);

  const handlePhaseChange = (phase: JourneyPhase) => {
    onPhaseChange?.(phase);
  };

  return (
    <div
      className={`relative flex flex-col overflow-hidden first:${rtl ? "text-right" : "text-left"} ${
        rtl ? "font-arabic" : ""
      }`}
      style={{
        background: design.pages[0].background,
      }}
    >
      {active && (
        <InvitationJourney
          key={restartSignalInternal}
          design={design}
          imageUrls={imageUrls}
          guestName={guestName}
          names={names}
          rtl={rtl}
          reducedMotion={reducedMotion}
          active={active}
          accent={accent}
          ink={ink}
          forceFinishAnimations={forceFinishAnimations}
          onStepChange={onStepChange}
          onPhaseChange={handlePhaseChange}
          className={className}
        />
      )}
    </div>
  );
}
