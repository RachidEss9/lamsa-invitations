import { openingHint, personalize, type OpeningSettings } from "@/lib/design";
import { cn } from "@/lib/utils";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

interface OpeningStageProps {
  opening: OpeningSettings;
  accent: string;
  background: string;
  ink: string;
  guestName?: string | null;
  /** Couple or host names for the typographic and image openers. */
  names?: string;
  autoOpen?: boolean;
  reducedMotion?: boolean;
  coverUrl?: string;
  /** Fires once the opening animation has finished. */
  onDone: () => void;
  className?: string;
}

/**
 * The opening experience: a real, touchable entrance that is separate from
 * page transitions and element animation. It only ever plays once at the
 * start; navigation between pages uses `PageTransition` instead.
 */
export function OpeningStage({
  opening,
  accent,
  background,
  ink,
  guestName,
  names = "LAMSA",
  autoOpen = false,
  reducedMotion = false,
  coverUrl,
  onDone,
  className,
}: OpeningStageProps) {
  const [phase, setPhase] = useState<"idle" | "playing">("idle");
  const [progress, setProgress] = useState(0);
  const doneRef = useRef(onDone);

  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  const begin = () => {
    if (phase === "playing") return;
    if (reducedMotion) {
      doneRef.current();
      return;
    }
    setPhase("playing");
  };

  useEffect(() => {
    if (!autoOpen) return;
    const timer = window.setTimeout(begin, 550);
    return () => window.clearTimeout(timer);
    // The auto-open timer is intentionally armed once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen]);

  useEffect(() => {
    if (phase !== "playing") return;
    let frame = 0;
    const start = performance.now();
    const duration = Math.max(600, opening.duration);
    const tick = (now: number) => {
      const p = clamp((now - start) / duration);
      setProgress(p);
      if (p < 1) frame = requestAnimationFrame(tick);
      else doneRef.current();
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, opening.duration]);

  const p = easeInOut(progress);
  const experience = opening.experience;
  const welcome = personalize(opening.welcome, guestName);

  const hint = openingHint(experience);

  const panelStyle: CSSProperties = {
    background: `linear-gradient(135deg, ${accent} 0%, #4b000d 100%)`,
  };

  let scene: ReactNode = null;

  if (experience === "envelope" || experience === "wax-seal") {
    scene = (
      <div
        className="relative"
        style={{ width: "min(82vw, 430px)", height: "min(58vw, 300px)" }}
      >
        <div
          className="absolute inset-0 overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.35)]"
          style={{ background: background }}
        >
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: `repeating-linear-gradient(115deg, transparent 0 22px, ${accent} 22px 23px)`,
            }}
          />
          {coverUrl && (
            <img
              src={coverUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div
            className="absolute inset-x-0 bottom-0 grid place-items-end px-8 pb-8"
            style={{
              height: "58%",
              background: `linear-gradient(to top, ${background}, transparent)`,
            }}
          >
            <p
              className="text-[0.62rem] uppercase tracking-[0.3em]"
              style={{ color: ink, opacity: 0.6 }}
            >
              LAMSA
            </p>
          </div>
        </div>

        {/* Card lifting out of the envelope */}
        <div
          className="absolute left-[6%] right-[6%] top-[16%] h-[86%] border shadow-[0_20px_50px_rgba(0,0,0,0.28)]"
          style={{
            background,
            borderColor: `${accent}66`,
            transform: `translateY(${-p * 42}%)`,
            opacity: clamp(p * 2),
          }}
        />

        {/* Envelope pocket */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-x-0 bottom-0"
            style={{
              height: "62%",
              background: `linear-gradient(160deg, ${accent}, #52000f)`,
              clipPath: "polygon(0 100%, 0 32%, 50% 0, 100% 32%, 100% 100%)",
            }}
          />
          <div
            className="absolute inset-x-0 top-0 origin-top"
            style={{
              height: "62%",
              background: `linear-gradient(200deg, #8d0019, ${accent})`,
              clipPath: "polygon(0 0, 100% 0, 50% 100%)",
              transform: `rotateX(${p * 168}deg)`,
              transformStyle: "preserve-3d",
              backfaceVisibility: "hidden",
              opacity: p > 0.5 ? clamp(1 - (p - 0.5) * 1.4) : 1,
            }}
          />
        </div>

        {/* Wax seal */}
        <div
          className="absolute left-1/2 top-[54%] grid size-[74px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[1.05rem] shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
          style={{
            background: `radial-gradient(circle at 35% 30%, #a3182f, ${accent} 60%, #4a000c)`,
            color: background,
            transform: `translate(-50%, -50%) scale(${1 - p * 0.7}) rotate(${p * 18}deg)`,
            opacity: clamp(1 - p * 2.2),
          }}
        >
          ✦
        </div>
      </div>
    );
  } else if (experience === "arch") {
    scene = (
      <div className="relative grid place-items-center">
        <div
          className="absolute rounded-full blur-3xl"
          style={{
            width: "min(70vw, 380px)",
            height: "min(70vw, 380px)",
            background: accent,
            opacity: 0.22 * (1 - p),
          }}
        />
        <div
          style={{
            width: "min(72vw, 330px)",
            height: "min(100vw, 460px)",
            borderRadius: "999px 999px 16px 16px / 240px 240px 16px 16px",
            border: `1.5px solid ${accent}`,
            background: `rgba(255,255,255,${0.04 + p * 0.05})`,
            boxShadow: `0 0 60px ${accent}55, inset 0 0 70px ${accent}22`,
            transform: `scale(${0.82 + p * 0.2})`,
            opacity: clamp(1 - p * 0.9),
          }}
        />
        <span
          className="absolute text-3xl"
          style={{ color: accent, opacity: clamp(1 - p * 1.4) }}
        >
          ✦
        </span>
      </div>
    );
  } else if (experience === "curtain") {
    scene = (
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 w-1/2 origin-left"
          style={{
            ...panelStyle,
            background: `repeating-linear-gradient(90deg, ${accent} 0 26px, #58000f 26px 42px)`,
            transform: `translateX(${-p * 103}%)`,
          }}
        />
        <div
          className="absolute inset-y-0 right-0 w-1/2"
          style={{
            ...panelStyle,
            background: `repeating-linear-gradient(90deg, #58000f 0 42px, ${accent} 42px 68px)`,
            transform: `translateX(${p * 103}%)`,
          }}
        />
        <span
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl"
          style={{ color: accent, opacity: clamp(1 - p * 2) }}
        >
          ✦
        </span>
      </div>
    );
  } else if (experience === "door") {
    scene = (
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ perspective: "1400px" }}
      >
        <div
          className="absolute inset-y-0 left-0 w-1/2 origin-left border-r"
          style={{
            background: `linear-gradient(90deg, #1d0308, ${accent})`,
            borderColor: `${background}33`,
            transform: `rotateY(${-p * 104}deg)`,
            boxShadow: "inset -30px 0 60px rgba(0,0,0,0.4)",
          }}
        />
        <div
          className="absolute inset-y-0 right-0 w-1/2 origin-right"
          style={{
            background: `linear-gradient(270deg, #1d0308, ${accent})`,
            transform: `rotateY(${p * 104}deg)`,
            boxShadow: "inset 30px 0 60px rgba(0,0,0,0.4)",
          }}
        />
        <span
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm uppercase tracking-[0.3em]"
          style={{ color: background, opacity: clamp(1 - p * 2) }}
        >
          LAMSA
        </span>
      </div>
    );
  } else if (experience === "cards") {
    scene = (
      <div className="relative grid place-items-center">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="absolute border shadow-[0_30px_60px_rgba(0,0,0,0.28)]"
            style={{
              width: "min(64vw, 270px)",
              height: "min(85vw, 360px)",
              background: index === 2 ? background : accent,
              borderColor: `${background}55`,
              transform: `translateY(${-p * (90 + index * 60)}%) rotate(${
                (index - 1) * (6 + p * 10)
              }deg)`,
              opacity: clamp(1 - p * 1.2 + index * 0.1),
            }}
          />
        ))}
      </div>
    );
  } else if (experience === "folding") {
    scene = (
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ perspective: "1500px", background: "#120307" }}
      >
        <div
          className="absolute inset-y-0 left-0 w-1/2 origin-left border-r shadow-[0_0_60px_rgba(0,0,0,0.35)]"
          style={{
            background: `linear-gradient(120deg, #3f0009, ${accent})`,
            borderColor: `${background}44`,
            transform: `rotateY(${-p * 96}deg)`,
            transformStyle: "preserve-3d",
          }}
        />
        <div
          className="absolute inset-y-0 right-0 w-1/2 origin-right border-l shadow-[0_0_60px_rgba(0,0,0,0.35)]"
          style={{
            background: `linear-gradient(240deg, #3f0009, ${accent})`,
            borderColor: `${background}44`,
            transform: `rotateY(${p * 96}deg)`,
            transformStyle: "preserve-3d",
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
          style={{ opacity: clamp(1 - p * 1.6) }}
        >
          <p className="text-[0.55rem] uppercase tracking-[0.34em]" style={{ color: accent }}>
            The gatefold
          </p>
          <p className="mt-3 font-display text-[clamp(2rem,8vw,3.2rem)] leading-none" style={{ color: background }}>
            {names}
          </p>
        </div>
      </div>
    );
  } else if (experience === "paper") {
    scene = (
      <div className="absolute inset-0 overflow-hidden" style={{ perspective: "1200px" }}>
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="absolute inset-x-0 origin-top border-b shadow-[0_18px_40px_rgba(0,0,0,0.22)]"
            style={{
              top: `${index * 33.34}%`,
              height: "33.4%",
              background:
                index % 2 === 0
                  ? `linear-gradient(180deg, ${background}, #e7e1d3)`
                  : `linear-gradient(180deg, #e7e1d3, ${background})`,
              borderColor: `${accent}33`,
              transformOrigin: "top center",
              transform: `rotateX(${(1 - p) * (index === 1 ? -118 : 72)}deg)`,
              opacity: clamp(1 - p * 0.25),
            }}
          >
            <div
              className="absolute inset-x-0 top-0 h-px"
              style={{ background: `${accent}55` }}
            />
          </div>
        ))}
        <p
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center font-display text-[clamp(1.8rem,7vw,3rem)] leading-tight"
          style={{ color: accent, opacity: p }}
        >
          {names}
        </p>
      </div>
    );
  } else if (experience === "typography") {
    scene = (
      <div className="max-w-[640px] px-6 text-center">
        <p
          className="text-[0.55rem] uppercase tracking-[0.4em]"
          style={{ color: accent, opacity: 0.55 + p * 0.45 }}
        >
          You are invited
        </p>
        <h2
          className="mt-5 overflow-hidden font-display text-[clamp(2.6rem,11vw,5.4rem)] leading-[0.95]"
          style={{
            color: ink,
            letterSpacing: `${0.18 - p * 0.14}em`,
            clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
            transform: `translateY(${(1 - p) * 24}px)`,
          }}
        >
          {names}
        </h2>
        <p
          className="mt-6 text-[0.62rem] uppercase tracking-[0.3em]"
          style={{ color: accent, opacity: p }}
        >
          {welcome}
        </p>
      </div>
    );
  } else if (experience === "floral") {
    scene = (
      <div className="relative grid place-items-center">
        {Array.from({ length: 14 }).map((_, index) => (
          <span
            key={index}
            aria-hidden
            className="absolute rounded-full border"
            style={{
              width: `${8 + index * 4}px`,
              height: `${22 + index * 4}px`,
              borderColor: `${accent}${index % 2 ? "88" : "55"}`,
              borderRadius: "999px 999px 4px 4px",
              transform: `rotate(${index * (360 / 14)}deg) translateY(-${80 + p * 110}px)`,
              opacity: clamp(1 - p * 0.7),
            }}
          />
        ))}
        <div
          className="relative z-10 text-center"
          style={{ opacity: clamp(p * 1.4) }}
        >
          <p className="text-[0.55rem] uppercase tracking-[0.34em]" style={{ color: accent }}>
            With joy
          </p>
          <p className="mt-4 font-display text-[clamp(2rem,9vw,3.6rem)] leading-none" style={{ color: ink }}>
            {names}
          </p>
        </div>
      </div>
    );
  } else if (experience === "cinematic") {
    scene = (
      <div className="absolute inset-0 overflow-hidden">
        {coverUrl && (
          <img
            src={coverUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ transform: `scale(${1.08 + p * 0.06})`, opacity: 0.55 }}
          />
        )}
        <div
          className="absolute inset-x-0 top-0 z-10 bg-[#0b0b0b]"
          style={{ height: `${(1 - p) * 22}%` }}
        />
        <div
          className="absolute inset-x-0 bottom-0 z-10 bg-[#0b0b0b]"
          style={{ height: `${(1 - p) * 22}%` }}
        />
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center" style={{ opacity: clamp(p * 1.3) }}>
            <p className="text-[0.55rem] uppercase tracking-[0.4em] text-[#f2f1ed]/55">
              A private celebration
            </p>
            <p className="mt-4 font-display text-[clamp(2.4rem,10vw,4.6rem)] leading-none text-[#f2f1ed]">
              {names}
            </p>
          </div>
        </div>
      </div>
    );
  } else if (experience === "image") {
    scene = (
      <div className="absolute inset-0 overflow-hidden">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              transform: `scale(${1.02 + p * 0.16})`,
              filter: `brightness(${0.55 + p * 0.25})`,
            }}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(80% 60% at 50% 40%, ${accent}aa, #140309 75%)`,
              transform: `scale(${1.02 + p * 0.16})`,
            }}
          />
        )}
        <div
          className="absolute inset-0 flex flex-col items-center justify-end pb-[16vh] text-center"
          style={{
            background: `linear-gradient(to top, ${background}cc, transparent 65%)`,
            opacity: clamp(p * 1.2),
          }}
        >
          <p className="font-display text-[clamp(2rem,8vw,3.4rem)] leading-none" style={{ color: ink }}>
            {names}
          </p>
          <p className="mt-2 text-[0.6rem] uppercase tracking-[0.3em]" style={{ color: accent }}>
            {welcome}
          </p>
        </div>
      </div>
    );
  } else if (experience === "fade") {
    scene = (
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(70% 60% at 50% 50%, ${accent}33 0%, #0c0c0c 70%)`,
          opacity: 1 - p,
        }}
      />
    );
  } else if (experience === "personal") {
    scene = (
      <div className="max-w-[520px] px-8 text-center">
        <p
          className="text-[0.58rem] uppercase tracking-[0.34em]"
          style={{ color: accent }}
        >
          Private invitation
        </p>
        <h2
          className="mt-6 font-display text-[clamp(2.2rem,7vw,3.6rem)] leading-[1.02]"
          style={{ color: ink }}
        >
          {guestName ? (
            <>
              {personalize("For {{guest}}", guestName)}
            </>
          ) : (
            <>You are expected</>
          )}
        </h2>
        <p
          className="mt-5 text-[0.72rem] uppercase tracking-[0.22em]"
          style={{ color: ink, opacity: 0.6 }}
        >
          {welcome || "A note from the host"}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "absolute inset-0 z-40 flex flex-col items-center justify-center overflow-hidden",
        className,
      )}
      style={{
        background:
          experience === "arch" ||
          experience === "fade" ||
          experience === "wax-seal" ||
          experience === "cinematic" ||
          experience === "image"
            ? `radial-gradient(120% 90% at 50% 100%, ${accent}44, #121212 72%)`
            : background,
        color: ink,
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Opening the invitation"
    >
      <div aria-hidden className="paper-grain pointer-events-none absolute inset-0 opacity-[0.07]" />

      {scene}

      {phase === "idle" ? (
        <button
          type="button"
          onClick={begin}
          className="absolute inset-0 z-30 flex cursor-pointer flex-col items-center justify-end gap-6 pb-[12vh] focus-visible:outline-none"
          aria-label={hint || "Open the invitation"}
        >
          <span
            className="rounded-full border px-6 py-3 text-[0.6rem] uppercase tracking-[0.28em] backdrop-blur-sm transition-transform hover:scale-[1.03]"
            style={{
              borderColor: `${accent}88`,
              color: accent,
              background: `${background}55`,
            }}
          >
            {hint || "Open"}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => doneRef.current()}
          className="absolute bottom-6 right-6 z-30 text-[0.55rem] uppercase tracking-[0.24em] opacity-60 hover:opacity-100"
          style={{ color: ink }}
        >
          Skip
        </button>
      )}
    </div>
  );
}
