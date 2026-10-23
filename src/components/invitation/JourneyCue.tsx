import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface JourneyCueProps {
  /** Short visible word: Continue, or Close on the final section. */
  label: string;
  /** Full screen-reader label, including the destination. */
  ariaLabel: string;
  accent: string;
  background: string;
  ink: string;
  /** The invitation's own display face, so the cue belongs to the artwork. */
  fontFamily?: string;
  rtl?: boolean;
  reducedMotion?: boolean;
  onAdvance: () => void;
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
  if (Number.isNaN(number)) return `rgba(22, 22, 22, ${alpha})`;
  return `rgba(${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}, ${alpha})`;
}

/**
 * The way forward through the invitation.
 *
 * It is not a button plaque or a carousel control: it is a small engraved
 * flourish in the invitation's own ink, with a fine rule that grows under the
 * guest's hand. The whole ornament is the touch target (56px tall), and the
 * spoken label always names the destination.
 */
export function JourneyCue({
  label,
  ariaLabel,
  accent,
  background,
  ink,
  fontFamily,
  rtl,
  reducedMotion = false,
  onAdvance,
  className,
}: JourneyCueProps) {
  // With reduced motion the cue is simply present; otherwise it lifts in a
  // beat after the section settles, so it never competes with the entrance.
  const [shown, setShown] = useState(reducedMotion);
  const visible = shown || reducedMotion;

  useEffect(() => {
    if (reducedMotion) return;
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion]);

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 z-30 flex h-[24%] items-end justify-center",
        className,
      )}
      style={{
        paddingBottom: "3.5%",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(10px)",
        transition: "opacity .6s ease, transform .6s cubic-bezier(.16,1,.3,1)",
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to top, ${rgba(background, 0.78)} 0%, ${rgba(
            background,
            0.32,
          )} 46%, ${rgba(background, 0)} 100%)`,
        }}
      />

      <button
        type="button"
        data-journey-cue
        onClick={onAdvance}
        aria-label={ariaLabel}
        dir={rtl ? "rtl" : "ltr"}
        className="group pointer-events-auto relative flex min-h-[56px] min-w-[76px] flex-col items-center justify-end gap-1.5 px-3 pb-1 pt-2 transition-transform duration-200 active:scale-[0.96] active:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
        style={{ color: ink, outlineColor: accent }}
      >
        <span
          aria-hidden
          className="block transition-[width,opacity] duration-500 group-hover:opacity-100 group-focus-visible:opacity-100"
          style={{
            height: 1,
            width: visible ? 34 : 8,
            background: accent,
            opacity: 0.55,
            boxShadow: `0 0 12px ${rgba(accent, 0.45)}`,
          }}
        />

        <svg
          aria-hidden
          viewBox="0 0 44 58"
          className="h-[42px] w-[32px] overflow-visible transition-transform duration-500 group-hover:translate-y-0.5 group-focus-visible:translate-y-0.5"
          style={{
            color: accent,
            animation: reducedMotion ? undefined : "lamsa-cue-drift 3.4s ease-in-out infinite",
          }}
        >
          <path
            d="M22 3v30"
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
            strokeLinecap="round"
            opacity={0.75}
          />
          <path
            d="M22 33l-7 8M22 33l7 8"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.1}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M22 18c-8 0-11-7-5-12 4 3 5 7 5 12zM22 18c8 0 11-7 5-12-4 3-5 7-5 12z"
            fill="none"
            stroke="currentColor"
            strokeWidth={0.9}
            opacity={0.8}
          />
          <circle cx={22} cy={3} r={1.7} fill="currentColor" opacity={0.9} />
        </svg>

        <span
          className="whitespace-nowrap text-[9px] uppercase leading-none transition-[letter-spacing,opacity] duration-500 group-hover:opacity-100"
          style={{
            fontFamily,
            letterSpacing: "0.26em",
            color: ink,
            opacity: 0.62,
          }}
        >
          {label}
        </span>
      </button>
    </div>
  );
}
