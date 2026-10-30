import { DesignPageView } from "@/components/invitation/DesignPageView";
import { SceneStage, type StageBox } from "@/components/invitation/SceneStage";
import { SceneThumb } from "@/components/invitation/SceneThumb";
import { personalize, pageSizeOf, type DesignPage, type OpeningSettings } from "@/lib/design";
import { pageEntranceEnd } from "@/lib/journey";
import {
  AUTO_HOLD_MS,
  CONTINUE_LABEL,
  CLOSED_LABEL,
  HANDOFF_MS,
  OPEN_LABEL,
  REPLAY_LABEL,
  SCENES,
  SCENE_IDS,
  layerStyle,
  sceneDurations,
  sceneFromExperience,
  type SceneId,
  type SceneState,
} from "@/lib/presentation";
import { cn } from "@/lib/utils";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

interface PresentationStageProps {
  opening: OpeningSettings;
  /**
   * The real first section, rendered as the invitation the scene reveals —
   * never a stand-in that is swapped out afterwards.
   */
  page?: DesignPage | null;
  imageUrls?: Record<string, string>;
  accent: string;
  /** The invitation's own background; becomes the handoff wash. */
  background: string;
  guestName?: string | null;
  names?: string;
  rtl?: boolean;
  autoOpen?: boolean;
  reducedMotion?: boolean;
  /** Fires when the guest continues from the revealed invitation. */
  onDone: () => void;
  className?: string;
}

const REPLAY_HOLD_MS = 300;

/**
 * The presentation stage: scene selection, playback and the hand-off into
 * the real invitation.
 *
 * One component owns the whole beat: the guest picks one of three scenes
 * (a living preview of the real layers), the scene plays its manifest
 * choreography around the invitation — which sits once, at the manifest's
 * slot — and a single Continue control carries them on to the first section.
 * The same stage serves the published invitation, the studio's previews and
 * the guest preview.
 */
export function PresentationStage({
  opening,
  page,
  imageUrls = {},
  accent,
  background,
  guestName,
  names,
  rtl,
  autoOpen = false,
  reducedMotion = false,
  onDone,
  className,
}: PresentationStageProps) {
  const auto = autoOpen || opening.autoOpen;
  const initialScene = useMemo(
    () => sceneFromExperience(opening.experience),
    [opening.experience],
  );

  const [activeScene, setActiveScene] = useState<SceneId>(initialScene);
  const [state, setState] = useState<SceneState>(() =>
    reducedMotion ? "revealed" : "pre",
  );
  const [leaving, setLeaving] = useState(false);
  /** True only while the guest may act: never during a sequence's hold. */
  const [controlsOn, setControlsOn] = useState(() => reducedMotion);
  const [box, setBox] = useState<StageBox | null>(null);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const timers = useRef<number[]>([]);
  const seq = useRef(0);
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

  const clearTimers = useCallback(() => {
    for (const timer of timers.current) window.clearTimeout(timer);
    timers.current = [];
  }, []);

  const after = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  // Measure the container the journey (or dialog) gives us: the 3:2 stage is
  // contained within it, letterboxed in the scene's own frame colour.
  useLayoutEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const measure = () => setBox({ width: node.clientWidth, height: node.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  /**
   * Run a scene from its first frame: snap to the pre state, play the
   * entrance, land on the closed state — and, for an auto-start or a replay,
   * carry on through the reveal.
   */
  const runSequence = useCallback(
    (sceneId: SceneId, options: { auto?: boolean; play?: boolean } = {}) => {
      clearTimers();
      const mine = ++seq.current;
      setActiveScene(sceneId);
      setControlsOn(false);
      if (reducedMotion) {
        setState("revealed");
        setControlsOn(true);
        return;
      }
      setState("pre");
      const { enter, reveal } = sceneDurations(sceneId);
      let started = false;
      const begin = () => {
        if (started || mine !== seq.current) return;
        started = true;
        setState("intro");
        after(enter, () => {
          if (mine !== seq.current) return;
          setState("closed");
          if (options.auto || options.play) {
            after(options.play ? REPLAY_HOLD_MS : AUTO_HOLD_MS, () => {
              if (mine !== seq.current) return;
              setState("opening");
              after(reveal, () => {
                if (mine !== seq.current) return;
                setState("revealed");
                setControlsOn(true);
              });
            });
          } else {
            setControlsOn(true);
          }
        });
      };
      // One paint at the pre state, so the entrance transitions from frame one.
      requestAnimationFrame(() => requestAnimationFrame(begin));
      after(80, begin); // fallback if animation frames never fire
    },
    [after, clearTimers, reducedMotion],
  );

  const startReveal = useCallback(() => {
    clearTimers();
    const mine = seq.current;
    setControlsOn(false);
    if (reducedMotion) {
      setState("revealed");
      setControlsOn(true);
      return;
    }
    setState("opening");
    const { reveal } = sceneDurations(activeScene);
    after(reveal, () => {
      if (mine !== seq.current) return;
      setState("revealed");
      setControlsOn(true);
    });
  }, [activeScene, after, clearTimers, reducedMotion]);

  // The stage only mounts when a presentation exists; this is a safety net.
  useEffect(() => {
    if (opening.experience === "none") {
      finish();
      return;
    }
    if (reducedMotion) {
      setState("revealed");
      setControlsOn(true);
      return;
    }
    runSequence(initialScene, { auto });
    return () => {
      clearTimers();
      seq.current += 1;
    };
    // The entrance runs once per mount; scene changes restart it explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chooseScene = (sceneId: SceneId) => {
    if (leaving) return;
    runSequence(sceneId, {});
  };

  const replay = () => {
    if (leaving) return;
    runSequence(activeScene, { play: true });
  };

  const returnToClosed = () => {
    if (leaving) return;
    clearTimers();
    setState("closed");
    setControlsOn(true);
  };

  const leave = () => {
    if (leaving || finishedRef.current) return;
    clearTimers();
    setLeaving(true);
    after(HANDOFF_MS, finish);
  };

  const welcome = personalize(opening.welcome, guestName).trim();
  const showPicker = state === "closed" && controlsOn && !leaving;
  const showRevealed = state === "revealed" && controlsOn && !leaving;

  const entranceEnd = page ? pageEntranceEnd(page) : 0;

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={names ? `Invitation presentation for ${names}` : "Invitation presentation"}
      dir={rtl ? "rtl" : "ltr"}
      className={cn("absolute inset-0 z-40 overflow-hidden", className)}
      style={{ background }}
      data-testid="presentation-stage"
    >
      {/* The handoff wash: the invitation's own background, crossfaded in
          before the stage leaves so the first section arrives without a jump. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background,
          opacity: leaving ? 1 : 0,
          transition: `opacity ${HANDOFF_MS}ms ease`,
        }}
      />
      <div
        className={cn("absolute inset-0", leaving && "pointer-events-none opacity-0")}
        style={{ transition: `opacity ${HANDOFF_MS}ms ease` }}
      >
        <SceneStage
          key={activeScene}
          scene={activeScene}
          state={state}
          box={box ?? undefined}
          reducedMotion={reducedMotion}
        >
          {(slot) => {
            if (!page) return null;
            const size = pageSizeOf(page);
            const fit =
              slot.width > 0 && slot.height > 0
                ? Math.min(slot.width / size.width, slot.height / size.height)
                : 0;
            const invitationStyle = layerStyle(
              SCENES[activeScene].invitation,
              state,
              1,
            ) as CSSProperties;
            return (
              <div
                className="lamsa-invitation"
                data-testid="invitation"
                style={invitationStyle}
              >
                <div
                  style={{
                    position: "absolute",
                    left: (slot.width - size.width * fit) / 2,
                    top: (slot.height - size.height * fit) / 2,
                    width: size.width,
                    height: size.height,
                    transform: `scale(${fit})`,
                    transformOrigin: "top left",
                  }}
                >
                  <DesignPageView
                    page={page}
                    time={entranceEnd}
                    imageUrls={imageUrls}
                    guestName={guestName}
                    rtl={rtl}
                    reducedMotion={reducedMotion}
                  />
                </div>
              </div>
            );
          }}
        </SceneStage>

        {/* Scene selection / the closed state. */}
        {showPicker && (
          <div
            className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-4 pb-5 pt-14 sm:gap-4 sm:pb-6"
            style={{
              background:
                "linear-gradient(to top, rgba(8,4,5,0.72) 0%, rgba(8,4,5,0.35) 55%, transparent 100%)",
            }}
          >
            {welcome && (
              <p
                className="max-w-[34rem] text-center font-ui text-[11px] uppercase tracking-[0.22em] text-[var(--lamsa-ivory-100)]/85"
              >
                {welcome}
              </p>
            )}
            <div className="flex items-end justify-center gap-2.5 sm:gap-4">
              {SCENE_IDS.map((sceneId) => (
                <button
                  key={sceneId}
                  type="button"
                  onClick={() => chooseScene(sceneId)}
                  aria-pressed={sceneId === activeScene}
                  aria-label={`Preview ${SCENES[sceneId].title}`}
                  className={cn(
                    "group relative block w-[30vw] max-w-[152px] overflow-hidden border transition-[border-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lamsa-champagne)]",
                    sceneId === activeScene
                      ? "border-[var(--lamsa-champagne)] shadow-[0_0_0_1px_var(--lamsa-champagne)]"
                      : "border-white/25 hover:border-white/70",
                  )}
                >
                  <SceneThumb scene={sceneId} />
                  <span
                    className={cn(
                      "absolute inset-x-0 bottom-0 bg-black/50 px-1 py-[3px] text-center font-ui text-[8px] uppercase tracking-[0.14em] transition-colors",
                      sceneId === activeScene
                        ? "text-[var(--lamsa-champagne)]"
                        : "text-[var(--lamsa-ivory-100)]/80 group-hover:text-[var(--lamsa-ivory-100)]",
                    )}
                  >
                    {SCENES[sceneId].title.replace(/^The /, "")}
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={startReveal}
              className="h-12 min-w-[13.5rem] px-8 font-ui text-[12px] font-semibold uppercase tracking-[0.2em] text-[var(--lamsa-ivory-100)] transition-transform duration-150 hover:scale-[1.02] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lamsa-ivory-100)]/70"
              style={{ background: accent }}
            >
              {OPEN_LABEL}
            </button>
          </div>
        )}

        {/* The revealed invitation. */}
        {showRevealed && (
          <div
            className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2.5 px-4 pb-5 pt-14 sm:gap-3 sm:pb-6"
            style={{
              background:
                "linear-gradient(to top, rgba(8,4,5,0.72) 0%, rgba(8,4,5,0.35) 55%, transparent 100%)",
            }}
          >
            <div className="flex items-center gap-2.5 sm:gap-3">
              {!reducedMotion && (
                <button
                  type="button"
                  onClick={replay}
                  className="h-11 border border-white/40 px-5 font-ui text-[11px] uppercase tracking-[0.18em] text-[var(--lamsa-ivory-100)] transition-colors hover:border-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lamsa-ivory-100)]/70"
                >
                  {REPLAY_LABEL}
                </button>
              )}
              <button
                type="button"
                onClick={returnToClosed}
                className="h-11 border border-white/40 px-5 font-ui text-[11px] uppercase tracking-[0.18em] text-[var(--lamsa-ivory-100)] transition-colors hover:border-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lamsa-ivory-100)]/70"
              >
                {CLOSED_LABEL}
              </button>
            </div>
            <button
              type="button"
              onClick={leave}
              className="h-12 min-w-[13.5rem] px-8 font-ui text-[12px] font-semibold uppercase tracking-[0.2em] text-[var(--lamsa-ivory-100)] transition-transform duration-150 hover:scale-[1.02] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lamsa-ivory-100)]/70"
              style={{ background: accent }}
            >
              {CONTINUE_LABEL}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
