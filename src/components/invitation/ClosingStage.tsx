import { personalize, type ClosingSettings } from "@/lib/design";
import { cn } from "@/lib/utils";
import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

interface ClosingStageProps {
  closing: ClosingSettings;
  accent: string;
  background: string;
  ink: string;
  guestName?: string | null;
  names?: string;
  reducedMotion?: boolean;
  onReplay?: () => void;
  className?: string;
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function easeOut(t: number) {
  return 1 - Math.pow(1 - clamp(t), 3);
}

/**
 * The configured ending. This is its own experience, shown only after the last
 * page has finished; it is not a page transition and never interrupts normal
 * navigation.
 */
export function ClosingStage({
  closing,
  accent,
  background,
  ink,
  guestName,
  names,
  reducedMotion = false,
  onReplay,
  className,
}: ClosingStageProps) {
  const [progress, setProgress] = useState(0);
  const replayRef = useRef(onReplay);
  useEffect(() => {
    replayRef.current = onReplay;
  }, [onReplay]);

  useEffect(() => {
    if (reducedMotion) {
      const frame = requestAnimationFrame(() => setProgress(1));
      return () => cancelAnimationFrame(frame);
    }
    let frame = 0;
    const start = performance.now();
    const duration = Math.max(500, closing.duration);
    const tick = (now: number) => {
      const next = clamp((now - start) / duration);
      setProgress(next);
      if (next < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [closing.duration, reducedMotion]);

  const p = easeOut(progress);
  const note = personalize(closing.message, guestName ?? "").replace(
    /\{\{\s*names\s*\}\}/gi,
    names ?? ""
  );
  const noteOpacity = clamp((p - 0.3) / 0.7);

  const darkStyle = closing.style === "fade";
  const foreground = darkStyle ? background : ink;

  let scene: ReactNode = null;

  if (closing.style === "seal") {
    scene = (
      <>
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${accent} 0%, ${background} 78%)`,
            opacity: p,
          }}
        />
        <div
          className="absolute left-1/2 top-[13%] grid place-items-center rounded-full shadow-[0_24px_60px_rgba(0,0,0,0.28)]"
          style={{
            width: "min(22%, 112px)",
            aspectRatio: "1",
            background: `radial-gradient(circle at 34% 28%, #a3182f, ${accent} 62%, #3e000a)`,
            color: background,
            transform: `translateX(-50%) scale(${0.55 + p * 0.45}) rotate(${(1 - p) * -12}deg)`,
            opacity: clamp(p * 2.2),
          }}
        >
          <span className="font-display text-[clamp(0.7rem,2vw,1rem)] tracking-[0.2em]">
            LAMSA
          </span>
        </div>
      </>
    );
  } else if (closing.style === "curtain") {
    scene = (
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 w-[51%]"
          style={{
            background: `repeating-linear-gradient(90deg, ${accent} 0 28px, #52000f 28px 46px)`,
            transform: `translateX(${(p - 1) * 100}%)`,
          }}
        />
        <div
          className="absolute inset-y-0 right-0 w-[51%]"
          style={{
            background: `repeating-linear-gradient(90deg, #52000f 0 18px, ${accent} 18px 46px)`,
            transform: `translateX(${(1 - p) * 100}%)`,
          }}
        />
      </div>
    );
  } else if (closing.style === "fade") {
    scene = (
      <div
        className="absolute inset-0"
        style={{ background: ink, opacity: p * 0.97 }}
      />
    );
  } else {
    scene = (
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(110% 80% at 50% 20%, ${accent}26 0%, ${background} 70%)`,
          opacity: p,
        }}
      />
    );
  }

  return (
    <div
      className={cn("absolute inset-0 z-50 overflow-hidden", className)}
      style={{ background: closing.style === "fade" ? "transparent" : background }}
      role="group"
      aria-label="Closing of the invitation"
    >
      {scene}
      <div
        aria-hidden
        className="paper-grain pointer-events-none absolute inset-0 opacity-[0.07]"
      />
      <div
        className="absolute inset-0 flex flex-col items-center justify-center px-[12%] text-center"
        style={{ opacity: noteOpacity, color: foreground }}
      >
        <span
          aria-hidden
          className="mb-5 block h-px w-10"
          style={{ background: closing.style === "fade" ? accent : accent, opacity: 0.8 }}
        />
        <p
          className="whitespace-pre-line font-display leading-[1.2]"
          style={{
            fontSize: "clamp(1.3rem, 5vw, 2.2rem)",
            letterSpacing: "-0.005em",
          }}
        >
          {note || "With love"}
        </p>
        <p
          className="mt-5 text-[0.58rem] uppercase tracking-[0.34em]"
          style={{ opacity: 0.55 }}
        >
          LAMSA
        </p>
      </div>

      {onReplay && (
        <button
          type="button"
          onClick={() => replayRef.current?.()}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 border px-3 py-1.5 text-[0.5rem] uppercase tracking-[0.2em] backdrop-blur-sm transition-opacity"
          style={{
            borderColor: `${foreground}66`,
            color: foreground,
            opacity: clamp((p - 0.6) * 3),
          }}
          aria-label="Replay the invitation from the beginning"
        >
          <RotateCcw className="mr-1 inline size-2.5" /> Replay
        </button>
      )}
    </div>
  );
}
