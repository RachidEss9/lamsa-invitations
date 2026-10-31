import { InvitationJourney } from "@/components/invitation/InvitationJourney";
import type { DesignDocument } from "@/lib/design";
import {
  previewForcesAnimation,
  previewSurfaceStyle,
  type FinishPreviewMode,
} from "@/lib/finishes";
import type { JourneyPhase } from "@/lib/journey";
import { useMemo, useState } from "react";

interface SequentialGuestPreviewProps {
  design: DesignDocument;
  imageUrls: Record<string, string>;
  guestName?: string | null;
  names?: string;
  rtl?: boolean;
  reducedMotion: boolean;
  palette: { background: string; ink: string; accent: string };
  onClose: () => void;
  /** The preview environment the studio chose — presentation only. */
  previewMode?: FinishPreviewMode;
}

/**
 * The owner's rehearsal of the guest journey. It renders the very same
 * `InvitationJourney` as the public page, inside a quiet viewing room, so the
 * opening, the transitions, the reveals and the closing can be tested before
 * publishing.
 */
export function SequentialGuestPreview({
  design,
  imageUrls,
  guestName,
  names,
  rtl,
  reducedMotion,
  palette,
  onClose,
  previewMode = "studio",
}: SequentialGuestPreviewProps) {
  const previewStyle = previewSurfaceStyle(previewMode);
  const forceFinishAnimations = previewForcesAnimation(previewMode);
  const [restartSignal, setRestartSignal] = useState(0);
  const [step, setStep] = useState(1);
  const [total, setTotal] = useState(design.pages.length);
  const [phase, setPhase] = useState<JourneyPhase>(
    design.opening.experience === "none" || reducedMotion ? "page" : "opening",
  );

  // Keep the whole card, including the progress flourish at its foot, inside
  // the viewing room on short screens.
  const stageWidth = useMemo(
    () => "min(92vw, 500px, calc((100vh - 210px) * 0.75))",
    [],
  );

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-[#101010]">
      <div className="flex items-center justify-between gap-3 border-b border-white/12 px-4 py-3 text-[#f2f1ed]">
        <div className="min-w-0">
          <p className="font-ui text-[10px] font-medium uppercase tracking-[0.22em] text-white/70">
            Guest journey preview
          </p>
          <p className="mt-0.5 truncate font-meta text-[8px] uppercase tracking-[0.16em] text-white/35">
            {phase === "opening"
              ? "Opening · exactly what guests see"
              : phase === "closing"
                ? "Closing · exactly what guests see"
                : `Section ${step} of ${total} · exactly what guests see`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setRestartSignal((value) => value + 1)}
            className="h-9 border border-white/20 px-3 font-ui text-[9px] uppercase tracking-[0.16em] text-white/75 transition-colors hover:border-white hover:text-white"
            aria-label="Replay the opening and the whole guest journey"
          >
            Replay opening
          </button>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center border border-white/20 text-white/70 transition-colors hover:border-white hover:text-white"
            aria-label="Close guest experience preview"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-4"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 py-4">
        <div
          style={{
            width: stageWidth,
            filter: previewStyle.filter,
            transform: previewStyle.transform,
            transformOrigin: previewStyle.transformOrigin,
          }}
        >
          <InvitationJourney
            design={design}
            imageUrls={imageUrls}
            guestName={guestName}
            names={names}
            rtl={rtl}
            reducedMotion={reducedMotion}
            accent={palette.accent}
            ink={palette.ink}
            restartSignal={restartSignal}
            forceFinishAnimations={forceFinishAnimations}
            onStepChange={(next, count) => {
              setStep(next + 1);
              setTotal(count);
            }}
            onPhaseChange={setPhase}
          />
        </div>
        {/* The preview environment's light: presentation only, never part of
            the invitation itself. */}
        {previewStyle.background ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10"
            style={{ background: previewStyle.background }}
          />
        ) : null}
      </div>

      <div className="border-t border-white/12 px-4 py-3 text-[#f2f1ed]">
        <p className="text-[10px] leading-relaxed text-white/40">
          The opening reveals the real first section; tap the engraved flourish
          at the foot of a settled section to move on, and watch each saved page
          transition into the next. Replay opening runs the whole story again.
          Nothing here is a separate demo: it is the same journey the public link
          renders.
        </p>
      </div>
    </div>
  );
}
