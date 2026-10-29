import { DesignPageView } from "@/components/invitation/DesignPageView";
import { pageSizeOf, type DesignPage } from "@/lib/design";
import { fontFamilyFor } from "@/lib/fonts";
import { pageEntranceEnd } from "@/lib/journey";
import {
  OPENING_SKIP_LABEL,
  OPENING_START_LABEL,
  OPENING_STYLE_DURATION,
  monogramOf,
  openingStyleFrame,
  smooth,
  type OpeningStyleFrame,
  type OpeningStyleId,
} from "@/lib/opening-style";
import { cn } from "@/lib/utils";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * The core opening engine.
 *
 * It animates the *environment* around the invitation and hands the stage over
 * once the card is presented. Three rules hold it together:
 *
 *  1. The invitation is rendered exactly once, by the existing invitation
 *     renderer (`DesignPageView`), inside its own page box. It is never
 *     re-created as a background, a photo, or a stand-in.
 *  2. The box is fitted with a *contain* scale centred in the stage, so the
 *     page keeps its own aspect ratio in any container — phone, desktop or the
 *     editor's preview frame — and is never stretched or cropped.
 *  3. Only opacity ever touches the invitation; every other transform belongs
 *     to the environment. At `reveal === 1` the card sits in its correct final
 *     state with nothing left covering it.
 *
 * Animation state lives entirely here (progress + a start flag), never in the
 * saved design document, so replaying, skipping or editing a style cannot
 * mutate the invitation itself.
 */

interface OpeningEngineProps {
  style: OpeningStyleId;
  page: DesignPage | null;
  imageUrls?: Record<string, string>;
  guestName?: string | null;
  /** The couple/host names, used for the monogram and the start prompt. */
  names?: string;
  rtl?: boolean;
  accent: string;
  background: string;
  ink: string;
  reducedMotion?: boolean;
  /** Running length of the run, in ms. */
  duration?: number;
  /** Copy shown on the start screen above the start button. */
  startNote?: string;
  /** The style's own start prompt, so each style reads differently. */
  startLabel?: string;
  /** Starts without a tap — used by previews and reduced motion. */
  autoStart?: boolean;
  /** Holds one exact frame instead of playing, for the editor's stage strip. */
  stillAt?: number | null;
  onDone: () => void;
  className?: string;
}

function rgba(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((character) => character + character)
          .join("")
      : value.slice(0, 6);
  const number = Number.parseInt(full, 16);
  if (Number.isNaN(number)) return `rgba(0, 0, 0, ${alpha})`;
  const r = (number >> 16) & 255;
  const g = (number >> 8) & 255;
  const b = number & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* -------------------------------------------------------------------------- */
/* Environments                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Cinematic Reveal — a spotlight grows out of a dark room while the vignette
 * lets go. The card is uncovered by light rather than by a moving panel.
 */
function CinematicEnvironment({
  frame,
  ink,
  diag,
}: {
  frame: OpeningStyleFrame;
  ink: string;
  diag: number;
}): ReactNode {
  const hole = frame.spotlight * diag * 0.8;
  const mask = `radial-gradient(circle at 50% 46%, transparent ${hole * 0.55}px, black ${hole}px)`;
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(135% 100% at 50% 38%, ${rgba(ink, 0.94)} 0%, #060606 72%)`,
          opacity: frame.backdrop,
          transform: `scale(${1.06 - frame.spotlight * 0.06})`,
          maskImage: mask,
          WebkitMaskImage: mask,
        }}
      />
      {/* The light itself, brightening as it opens. */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 46%, rgba(255,255,255,${0.14 * frame.spotlight}) 0%, rgba(255,255,255,0) ${Math.max(8, frame.spotlight * 58)}%)`,
          opacity: frame.vignette,
        }}
      />
      {/* Soft depth: the vignette recedes as the card settles. */}
      <div
        className="absolute inset-0"
        style={{
          boxShadow: `inset 0 0 ${Math.round(200 * frame.vignette)}px ${Math.round(72 * frame.vignette)}px rgba(0,0,0,0.92)`,
          opacity: frame.vignette,
        }}
      />
      <div
        className="paper-grain absolute inset-0 mix-blend-overlay"
        style={{ opacity: 0.07 * frame.backdrop }}
      />
    </>
  );
}

/**
 * Golden Monogram — metallic initials rise, a highlight sweeps across them,
 * then they part along a gold rule and the card sits behind them.
 */
function MonogramEnvironment({
  frame,
  ink,
  accent,
  monogram,
  displayFont,
  rtl,
}: {
  frame: OpeningStyleFrame;
  ink: string;
  accent: string;
  monogram: string;
  displayFont: string;
  rtl: boolean;
}): ReactNode {
  const ruleOpacity = frame.rule * (1 - smooth(frame.progress, 0.8, 1));
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(165deg, ${rgba(ink, 1)} 0%, #090909 58%, ${rgba(ink, 0.97)} 100%)`,
          opacity: frame.backdrop,
        }}
      />
      <div className="absolute inset-0 grid place-items-center px-6">
        <div
          className="flex flex-col items-center"
          style={{ transform: `scale(${0.94 + frame.letters * 0.06})` }}
        >
          <span
            dir={rtl ? "rtl" : "ltr"}
            style={{
              fontFamily: displayFont,
              fontSize: "clamp(3.2rem, 20vw, 8.5rem)",
              lineHeight: 1.05,
              fontWeight: 600,
              letterSpacing: "0.05em",
              opacity: frame.letters,
              backgroundImage:
                "linear-gradient(100deg, #6f521a 0%, #d9b45c 16%, #f7e7b6 34%, #ffffff 44%, #f0d78f 54%, #b98f34 72%, #e8c877 100%)",
              backgroundSize: "280% 100%",
              backgroundPosition: `${-40 + frame.shimmer * 190}% 50%`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              WebkitTextFillColor: "transparent",
            }}
          >
            {monogram}
          </span>
          <span
            aria-hidden
            style={{
              marginTop: "1rem",
              height: 2,
              width: `${frame.rule * 44}%`,
              minWidth: ruleOpacity > 0.01 ? 10 : 0,
              opacity: ruleOpacity,
              background:
                "linear-gradient(90deg, transparent, rgba(232,200,119,0.75) 24%, #fff6d8 50%, rgba(232,200,119,0.75) 76%, transparent)",
            }}
          />
        </div>
      </div>
      <div
        className="absolute inset-0"
        style={{
          boxShadow: `inset 0 0 ${Math.round(210 * frame.vignette)}px ${Math.round(64 * frame.vignette)}px rgba(0,0,0,0.85)`,
          opacity: frame.vignette,
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-30 mix-blend-soft-light"
        style={{
          background: `radial-gradient(circle at 50% 44%, ${rgba(accent, 0.5)}, transparent 62%)`,
        }}
      />
      <div className="paper-grain absolute inset-0 mix-blend-overlay" style={{ opacity: 0.06 * frame.backdrop }} />
    </>
  );
}

/**
 * Silk Flow — a ribbon sweeps across the stage and the backdrop peels away in
 * its wake, so the card is uncovered in the ribbon's trail. Pure CSS: a pair
 * of blurred gradient bands and one clip-path. No video, no 3D.
 */
function SilkEnvironment({
  frame,
  ink,
  accent,
}: {
  frame: OpeningStyleFrame;
  ink: string;
  accent: string;
}): ReactNode {
  const lead = -34 + frame.ribbon * 172;
  // The ribbon fades as it leaves the stage, so nothing lingers at the edge
  // once the invitation is presented.
  const fade =
    (1 - Math.abs(frame.ribbon * 2 - 1) * 0.2) *
    (1 - smooth(frame.progress, 0.6, 1));
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(160deg, ${rgba(ink, 1)} 0%, #0a0a0a 54%, ${rgba(ink, 0.98)} 100%)`,
          opacity: frame.backdrop,
          clipPath: `inset(0 0 0 ${frame.wipe * 100}%)`,
        }}
      />
      {/* The wide silk band. */}
      <div
        className="absolute"
        style={{
          top: "46%",
          left: `${lead}%`,
          transform: "translate(-50%, -50%) rotate(-12deg)",
          width: "82%",
          height: "42%",
          borderRadius: "50%",
          background: `linear-gradient(102deg, rgba(255,255,255,0) 0%, ${rgba(accent, 0.34)} 15%, rgba(255,247,218,0.88) 48%, ${rgba(accent, 0.4)} 78%, rgba(255,255,255,0) 100%)`,
          filter: "blur(9px)",
          opacity: fade,
        }}
      />
      {/* A thinner highlight riding just ahead of it. */}
      <div
        className="absolute"
        style={{
          top: "53%",
          left: `${lead + 9}%`,
          transform: "translate(-50%, -50%) rotate(-9deg)",
          width: "58%",
          height: "22%",
          borderRadius: "50%",
          background:
            "linear-gradient(96deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 46%, rgba(255,255,255,0) 100%)",
          filter: "blur(13px)",
          opacity: fade * 0.7,
        }}
      />
      <div className="paper-grain absolute inset-0 mix-blend-overlay" style={{ opacity: 0.06 * frame.backdrop }} />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Engine                                                                     */
/* -------------------------------------------------------------------------- */

export function OpeningEngine({
  style,
  page,
  imageUrls = {},
  guestName,
  names,
  rtl,
  accent,
  background,
  ink,
  reducedMotion = false,
  duration = OPENING_STYLE_DURATION[style],
  startNote,
  startLabel = OPENING_START_LABEL,
  autoStart = false,
  stillAt = null,
  onDone,
  className,
}: OpeningEngineProps) {
  const still = typeof stillAt === "number";
  const [started, setStarted] = useState(() => Boolean(autoStart));
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(() =>
    still ? (stillAt as number) : 0,
  );
  const [fit, setFit] = useState({ w: 0, h: 0, scale: 0 });

  /** True once the run has begun — including a host-set auto start. */
  const active = started || autoStart;

  const boxRef = useRef<HTMLDivElement | null>(null);
  const startRef = useRef<number | null>(null);
  const doneRef = useRef(onDone);
  const finishedRef = useRef(false);

  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    // The stage rests on the finished invitation: reveal complete, nothing
    // covering it, ready for a guest to read even if nobody unmounts us.
    setDone(true);
    doneRef.current();
  }, []);

  const pageBox = pageSizeOf(page);
  const runLength = Math.max(400, duration);

  /* --- contain-fit the page box into whatever stage hosts it ----------- */
  useEffect(() => {
    const node = boxRef.current;
    if (!node) return;
    const measure = () => {
      const w = node.clientWidth;
      const h = node.clientHeight;
      if (!w || !h) return;
      // Contain, never cover: the page keeps its own aspect ratio exactly.
      const scale = Math.min(w / pageBox.width, h / pageBox.height);
      setFit({ w, h, scale });
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [pageBox.width, pageBox.height]);

  // Reduced motion hands the invitation straight over: no environment at all.
  useEffect(() => {
    if (reducedMotion && !still) finish();
  }, [reducedMotion, still, finish]);

  /* --- the run ---------------------------------------------------------- */
  useEffect(() => {
    if (still || reducedMotion || !active || done) return;
    let frame = 0;
    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const next = Math.min(1, (now - startRef.current) / runLength);
      setProgress(next);
      if (next < 1) frame = requestAnimationFrame(tick);
      else finish();
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, still, reducedMotion, runLength, finish, done]);

  // If animation frames never arrive (throttled tab, stalled compositor) the
  // guest must still reach the invitation.
  useEffect(() => {
    if (still || reducedMotion || !active || done) return;
    const timer = window.setTimeout(finish, runLength + 1800);
    return () => window.clearTimeout(timer);
  }, [active, still, reducedMotion, runLength, finish, done]);

  const shown = still ? (stillAt as number) : done ? 1 : progress;
  const frame = openingStyleFrame(style, shown);

  const settledTime = page ? Math.max(900, pageEntranceEnd(page)) : 1200;
  const cardContent = useMemo(
    () =>
      page ? (
        <DesignPageView
          page={page}
          time={settledTime}
          imageUrls={imageUrls}
          guestName={guestName}
          rtl={rtl}
          reducedMotion={reducedMotion}
          scrollActivationTime={0}
        />
      ) : null,
    [page, settledTime, imageUrls, guestName, rtl, reducedMotion],
  );

  const titleElement = page?.elements.find(
    (element) => element.kind === "text" && element.font,
  );
  const displayFont = fontFamilyFor(titleElement?.font ?? "cormorant-garamond");

  const diag = Math.hypot(fit.w || 640, fit.h || 960);
  const showStart = !still && !reducedMotion && !active;
  const showSkip = !still && !reducedMotion && active && frame.progress < 1;

  const state = still
    ? "still"
    : !active
      ? "idle"
      : frame.progress >= 1
        ? "done"
        : "playing";

  return (
    <div
      ref={boxRef}
      data-opening-engine={style}
      data-stage={state}
      className={cn("absolute inset-0 overflow-hidden", className)}
      dir={rtl ? "rtl" : "ltr"}
      style={{ background: background }}
    >
      {/*
        The invitation: one instance, its own page box, contain-fitted and
        centred. Only its opacity animates, so its geometry is never touched.
      */}
      {page && cardContent && (
        <div
          data-opening-card
          className="absolute"
          style={{
            width: pageBox.width,
            height: pageBox.height,
            left: fit.w ? (fit.w - pageBox.width * fit.scale) / 2 : 0,
            top: fit.h ? (fit.h - pageBox.height * fit.scale) / 2 : 0,
            transform: `scale(${fit.scale || 0.0001})`,
            transformOrigin: "top left",
            opacity: frame.reveal,
            visibility: fit.scale ? "visible" : "hidden",
          }}
        >
          {cardContent}
        </div>
      )}

      {/* The environment, above the card and never interactive. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
        data-opening-environment={style}
      >
        {style === "cinematic" && (
          <CinematicEnvironment frame={frame} ink={ink} diag={diag} />
        )}
        {style === "monogram" && (
          <MonogramEnvironment
            frame={frame}
            ink={ink}
            accent={accent}
            monogram={monogramOf(names || guestName)}
            displayFont={displayFont}
            rtl={Boolean(rtl)}
          />
        )}
        {style === "silk" && (
          <SilkEnvironment frame={frame} ink={ink} accent={accent} />
        )}
      </div>

      {/* Clear start interaction. */}
      {showStart && (
        <button
          type="button"
          onClick={() => setStarted(true)}
          aria-label={startLabel}
          className="absolute inset-0 z-30 flex cursor-pointer flex-col items-center justify-center gap-4 focus-visible:outline-none"
        >
          {startNote ? (
            <span
              className="max-w-[22rem] text-center font-display text-base leading-relaxed sm:text-lg"
              style={{ color: "rgba(246,243,236,0.82)" }}
            >
              {startNote}
            </span>
          ) : null}
          <span
            className="rounded-full border px-7 py-3.5 font-ui text-[0.6rem] uppercase tracking-[0.26em] transition-transform duration-200 hover:scale-[1.03] active:scale-[0.99]"
            style={{
              borderColor: rgba(accent, 0.55),
              background: "rgba(8,8,8,0.55)",
              color: "#f6f3ec",
              backdropFilter: "blur(6px)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
            }}
          >
            {OPENING_START_LABEL}
          </span>
        </button>
      )}

      {/* Discreet skip, always available once the run has begun. */}
      {showSkip && (
        <button
          type="button"
          aria-label={OPENING_SKIP_LABEL}
          onClick={finish}
          className="absolute z-40 rounded-sm border px-3 py-1.5 font-ui text-[0.55rem] uppercase tracking-[0.22em] transition-opacity duration-200 hover:opacity-100 focus-visible:opacity-100"
          style={{
            insetInlineEnd: "1rem",
            top: "1rem",
            borderColor: "rgba(255,255,255,0.28)",
            color: "#f6f3ec",
            background: "rgba(0,0,0,0.42)",
            opacity: 0.75,
            backdropFilter: "blur(4px)",
          }}
        >
          Skip
        </button>
      )}
    </div>
  );
}
