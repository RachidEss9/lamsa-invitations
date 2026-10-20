import { useState } from "react";
import { REVEAL_HINTS, type RevealLayoutId } from "@/lib/invitation";

interface RevealOpeningProps {
  layout: RevealLayoutId;
  accent: string;
  /** Stage background for the envelope/ribbon openers. */
  background: string;
  go: boolean;
  reducedMotion: boolean;
  onOpen: () => void;
}

interface Petal {
  left: number;
  duration: number;
  delay: number;
  dx: number;
  scale: number;
  color: string;
}

/** Petal colours straight from the LAMSA v5 brand kit. */
const PETAL_COLORS = ["#710014", "#b38f6f", "#f2f1ed", "#a3182f"];

/**
 * The touch-to-reveal openers from the LAMSA v5 brand kit: a glowing arch
 * that brightens and lifts, a crimson envelope whose wax seal cracks open,
 * and two ribbons parting beneath a satin bow. Falling petals run behind
 * every opener, and the whole stage is a button.
 */
export function RevealOpening({
  layout,
  accent,
  background,
  go,
  reducedMotion,
  onOpen,
}: RevealOpeningProps) {
  const [petals] = useState<Petal[]>(() =>
    Array.from({ length: 18 }, (_, i) => ({
      left: Math.random() * 100,
      duration: 6 + Math.random() * 5,
      delay: -(Math.random() * 8),
      dx: (Math.random() - 0.5) * 90,
      scale: 0.7 + Math.random() * 0.8,
      color: PETAL_COLORS[i % PETAL_COLORS.length],
    })),
  );

  const hint = (
    <p
      className="lamsa-hint relative z-10 text-center text-[0.7rem] font-semibold uppercase tracking-[0.24em]"
      style={{ color: accent }}
    >
      {REVEAL_HINTS[layout]}
    </p>
  );

  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-center gap-10 px-6"
      data-lamsa-go={reducedMotion ? "true" : String(go)}
      style={
        layout === "arch"
          ? {
              background:
                "radial-gradient(120% 90% at 50% 100%, #4a000d, #161616 70%)",
            }
          : { background }
      }
    >
      <div
        aria-hidden
        className="paper-grain absolute inset-0 opacity-[0.07] mix-blend-screen"
      />
      {/* Falling petals sit behind every opener. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {petals.map((petal, index) => (
          <i
            key={index}
            className="lamsa-petal"
            style={{
              left: `${petal.left}%`,
              background: petal.color,
              animationDuration: `${petal.duration}s`,
              animationDelay: `${petal.delay}s`,
              ["--dx" as string]: `${petal.dx}px`,
              transform: `scale(${petal.scale})`,
            }}
          />
        ))}
      </div>

      {layout === "arch" && (
        <button
          type="button"
          onClick={onOpen}
          className="group relative z-10 grid place-items-center outline-none"
          aria-label={REVEAL_HINTS[layout]}
        >
          <span
            className="lamsa-arch relative z-10 grid place-items-end"
            style={{
              width: "min(74vw, 330px)",
              height: "min(102vw, 380px)",
              borderRadius: "999px 999px 18px 18px / 220px 220px 18px 18px",
              border: `1.5px solid ${accent}`,
              background: "rgba(242, 241, 237, 0.06)",
              backdropFilter: "blur(2px)",
              boxShadow:
                "0 0 0 1px rgba(255,255,255,0.08), 0 0 40px rgba(224,137,154,0.33), inset 0 0 50px rgba(179,143,111,0.13)",
            }}
          >
            <span
              className="pointer-events-none grid h-24 w-24 place-items-center pb-16 text-3xl"
              style={{ color: accent }}
            >
              ✦
            </span>
          </span>
        </button>
      )}

      {layout === "arch" && hint}

      {layout === "envelope" && (
        <button
          type="button"
          onClick={onOpen}
          className="relative z-10 grid place-items-center py-10 outline-none"
          aria-label={REVEAL_HINTS[layout]}
        >
          <span
            className="lamsa-env relative"
            style={{
              width: "min(76vw, 320px)",
              height: "min(46vw, 210px)",
              background: "#5a0010",
              borderRadius: 6,
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
              zIndex: 6,
            }}
          >
            <span
              aria-hidden
              className="absolute inset-0"
              style={{
                background: "linear-gradient(135deg, #7d0a1e, #5a0010)",
                clipPath: "polygon(0 100%, 50% 40%, 100% 100%)",
              }}
            />
            <span
              aria-hidden
              className="lamsa-flap absolute left-0 right-0 top-0 z-[2]"
              style={{
                height: "60%",
                background: "linear-gradient(#8a0a22, #6a0a1c)",
                clipPath: "polygon(0 0, 100% 0, 50% 100%)",
              }}
            />
            <span
              aria-hidden
              className="lamsa-seal z-[3] grid place-items-center text-2xl"
              style={{
                position: "absolute",
                left: "50%",
                top: "calc(60% - 6px)",
                width: 54,
                height: 54,
                marginLeft: -27,
                marginTop: -27,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle at 35% 30%, #d9bb98, #b38f6f 55%, #7d5f43)",
                boxShadow: "0 4px 10px rgba(0,0,0,0.45)",
                color: "#5a0010",
              }}
            >
              ✦
            </span>
          </span>
        </button>
      )}

      {layout === "envelope" && hint}

      {layout === "ribbon" && (
        <>
          <div
            aria-hidden
            className="absolute inset-y-0 left-0 z-[6] w-1/2 overflow-hidden"
          >
            <span
              className="lamsa-curtain absolute inset-0"
              data-side="left"
              style={{
                background:
                  "linear-gradient(90deg, #4a000d, #a3182f 38%, #710014 72%, #5a0010)",
              }}
            />
          </div>
          <div
            aria-hidden
            className="absolute inset-y-0 right-0 z-[6] w-1/2 overflow-hidden"
          >
            <span
              className="lamsa-curtain absolute inset-0"
              data-side="right"
              style={{
                background:
                  "linear-gradient(270deg, #4a000d, #a3182f 38%, #710014 72%, #5a0010)",
              }}
            />
          </div>
          <button
            type="button"
            onClick={onOpen}
            className="relative z-[7] grid place-items-center py-10 outline-none"
            aria-label={REVEAL_HINTS[layout]}
          >
            <svg
              className="lamsa-bow"
              width="min(58vw, 230px)"
              viewBox="0 0 200 120"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="lamsa-bow-g" x1="0" x2="1">
                  <stop offset="0" stopColor="#4a000d" />
                  <stop offset="0.5" stopColor="#b01c35" />
                  <stop offset="1" stopColor="#4a000d" />
                </linearGradient>
              </defs>
              <path
                d="M100 60C70 20 20 10 8 40c-8 24 40 40 92 20z"
                fill="url(#lamsa-bow-g)"
              />
              <path
                d="M100 60C130 20 180 10 192 40c8 24-40 40-92 20z"
                fill="url(#lamsa-bow-g)"
              />
              <path
                d="M96 66L60 112l32-14zM104 66l36 46-32-14z"
                fill="#5a0010"
              />
              <rect x="88" y="46" width="24" height="28" rx="8" fill="#7d0a1e" />
            </svg>
          </button>
        </>
      )}

      {layout === "ribbon" && (
        <p
          className="lamsa-hint relative z-10 text-center text-[0.7rem] font-semibold uppercase tracking-[0.24em]"
          style={{ color: "#710014" }}
        >
          {REVEAL_HINTS[layout]}
        </p>
      )}
    </div>
  );
}
