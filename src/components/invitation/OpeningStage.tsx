import { OpeningEngine } from "@/components/invitation/OpeningEngine";
import {
  flatBackgroundOf,
  openingHint,
  personalize,
  type DesignPage,
  type OpeningSettings,
  type OpeningToneId,
} from "@/lib/design";
import { openingPaletteOf, openingToneOf } from "@/lib/openings";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef } from "react";

interface OpeningStageProps {
  opening: OpeningSettings;
  /**
   * The real first section. It is rendered as the invitation the opening
   * reveals — never a stand-in that is swapped out afterwards.
   */
  page?: DesignPage | null;
  imageUrls?: Record<string, string>;
  accent: string;
  background: string;
  ink: string;
  guestName?: string | null;
  /** Couple or host names, used by the Golden Monogram style. */
  names?: string;
  rtl?: boolean;
  autoOpen?: boolean;
  reducedMotion?: boolean;
  /**
   * Holds the opening on one still frame instead of playing it, so the editor
   * can show what each moment of a style looks like.
   */
  stillAt?: number;
  /** Fires once the invitation has settled and the opening is finished. */
  onDone: () => void;
  className?: string;
}

/**
 * The deep room each style plays in. The tone the host picked decides the
 * colour of the environment; the invitation's own palette is never touched.
 */
const AMBIENT: Record<OpeningToneId, string> = {
  crimson: "#1c070b",
  ink: "#141414",
  ivory: "#241e16",
};

/**
 * The opening stage: the choreography around the invitation.
 *
 * This component owns *when* the opening runs and hands the guest on to the
 * first section. All drawing lives in `OpeningEngine`, which renders one
 * style's environment over the real invitation. There is no second invitation
 * here, no procedural scene and no competing reveal — the same stage is used
 * by the studio preview, the guest preview and the published invitation.
 */
export function OpeningStage({
  opening,
  page,
  imageUrls = {},
  accent,
  background,
  ink,
  guestName,
  names,
  rtl,
  autoOpen = false,
  reducedMotion = false,
  stillAt,
  onDone,
  className,
}: OpeningStageProps) {
  const still = typeof stillAt === "number";
  const style = opening.experience === "none" ? null : opening.experience;

  const doneRef = useRef(onDone);
  const finishedRef = useRef(false);

  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    doneRef.current();
  }, []);

  // With no opening configured there is nothing to play: hand over at once.
  // The journey only mounts this stage when an opening exists, so this is a
  // safety net rather than a path a guest normally sees. A still frame is a
  // design tool and never reports completion.
  useEffect(() => {
    if (style || still) return;
    finish();
  }, [style, still, finish]);

  if (!style) return null;

  const tone = openingToneOf(opening);
  const ambient = AMBIENT[tone] ?? AMBIENT.ink;
  // Material overrides from the Opening Designer apply to the environment
  // only: the invitation card keeps the design's own palette.
  const colours = openingPaletteOf(
    {
      accent,
      paper: flatBackgroundOf(page?.background ?? background),
      hull: ink,
    },
    opening,
  );
  const hint = openingHint(style) || "Open the invitation";
  const welcome = personalize(opening.welcome, guestName);
  const stageBackground = opening.background ?? ambient;
  // A saved length is honoured inside a sane band; anything unusable falls
  // back to the style's own rhythm so the run is never instant or endless.
  const requested = Number(opening.duration);
  const runLength =
    Number.isFinite(requested) && requested >= 1600 && requested <= 8000
      ? requested
      : undefined;

  return (
    <div
      className={cn("absolute inset-0 z-40 overflow-hidden", className)}
      role="dialog"
      aria-modal="true"
      aria-label={hint}
      style={{ background: stageBackground }}
    >
      <OpeningEngine
        style={style}
        page={page ?? null}
        imageUrls={imageUrls}
        guestName={guestName}
        names={names}
        rtl={rtl}
        accent={colours.accent}
        background={stageBackground}
        ink={ambient}
        reducedMotion={reducedMotion}
        {...(runLength ? { duration: runLength } : {})}
        startLabel={hint}
        startNote={welcome || undefined}
        autoStart={autoOpen || opening.autoOpen}
        stillAt={stillAt ?? null}
        onDone={finish}
      />
    </div>
  );
}
