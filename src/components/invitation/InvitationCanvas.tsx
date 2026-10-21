import type { CSSProperties } from "react";
import {
  formatEventDate,
  formatEventTime,
  fontPairById,
  isPairedOccasion,
  isRevealLayout,
  SCRIPT_FONT_PAIRS,
  type InvitationContent,
  type InvitationTemplateBackground,
  isInvitationTemplateBackground,
} from "@/lib/invitation";
import { cn } from "@/lib/utils";
import { Motif } from "./Motif";

interface InvitationCanvasProps {
  content: InvitationContent;
  /** Guest name shown only on personalized public links. */
  recipientName?: string | null;
  className?: string;
  style?: CSSProperties;
}

/**
 * A single fixed-proportion invitation (3:4) whose type scales with its
 * container. The same component powers thumbnails, the editor preview, the
 * public invitation, and image export, so what you see is what you share.
 */
export function InvitationCanvas({
  content,
  recipientName,
  className,
  style,
}: InvitationCanvasProps) {
  const { palette, background } = content;
  const backdrop =
    background && isInvitationTemplateBackground(background)
      ? background
      : undefined;
  // LAMSA v5: right-to-left invitations read in Amiri regardless of the
  // chosen pair, exactly like the brand-kit Arabic preset.
  const arabicPair =
    content.fontPair === "arabic" ||
    content.fontPair === "ruqaa" ||
    content.fontPair === "kufi";
  const display =
    content.rtl && !arabicPair
      ? '"Amiri", "Times New Roman", serif'
      : fontPairById(content.fontPair).family;
  const scripted = SCRIPT_FONT_PAIRS.includes(content.fontPair) || content.rtl;
  const paired = isPairedOccasion(content.occasion);
  const primary = content.names.primary.trim() || "Your name";
  const secondary = content.names.secondary.trim();
  const date = formatEventDate(content.date);
  const time = formatEventTime(content.time);
  const centered = content.layout !== "editorial";
  const reveal = isRevealLayout(content.layout);
  const longestName = Math.max(
    primary.length,
    paired ? secondary.length : 0,
    7,
  );
  const baseNameSize = scripted
    ? Math.max(8.6, 108 / longestName)
    : Math.max(7.2, 92 / longestName);
  const nameSize = Math.min(scripted ? 15 : 11.8, baseNameSize);

  // LAMSA v5 reveal layouts each present a distinct frame: the arch card is
  // a sand-line arch with a glow, the envelope carries a wax seal in place of
  // the motif, and the ribbon keeps a centered rule plus crimson bands.
  const frame = reveal
    ? content.layout === "arch"
      ? (
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            inset: "3.4cqw",
            border: `0.26cqw solid ${palette.accent}`,
            borderRadius:
              "999cqw 999cqw 1.6cqw 1.6cqw / 24cqw 24cqw 1.6cqw 1.6cqw",
            opacity: 0.85,
            boxShadow: `0 0 7cqw ${palette.accent}2e`,
          }}
        />
      )
      : content.layout === "ribbon"
        ? (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute"
              style={{
                inset: "4.2cqw",
                border: `0.2cqw solid ${palette.accent}`,
                opacity: 0.45,
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0"
              style={{ top: 0, height: "2.2cqw", background: palette.accent }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0"
              style={{ bottom: 0, height: "2.2cqw", background: palette.accent }}
            />
          </>
        )
        : null
    : content.layout === "classic" ? (
      <>
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            inset: "3.8cqw",
            border: `0.22cqw solid ${palette.accent}`,
            opacity: 0.65,
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            inset: "5.1cqw",
            border: `0.1cqw solid ${palette.accent}`,
            opacity: 0.4,
          }}
        />
      </>
    ) : content.layout === "centered" ? (
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          inset: "4.2cqw",
          border: `0.2cqw solid ${palette.accent}`,
          opacity: 0.45,
        }}
      />
    ) : (
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          left: "5.6cqw",
          top: "9cqw",
          bottom: "9cqw",
          width: "0.18cqw",
          background: palette.accent,
          opacity: 0.4,
        }}
      />
    );

  return (
    <div
      className={cn("relative isolate w-full overflow-hidden", className)}
      dir={content.rtl ? "rtl" : "ltr"}
      style={{
        aspectRatio: "3 / 4",
        backgroundColor: palette.background,
        color: palette.ink,
        containerType: "inline-size",
        fontFamily: '"IBM Plex Sans", system-ui, "Helvetica Neue", sans-serif',
        ...style,
      }}
    >
      {backdrop && (
        <InvitationCanvasBackdrop seed={backdrop.storageSeed} fx={backdrop.fx} />
      )}
      <div aria-hidden className="paper-texture absolute inset-0" />
      <div
        aria-hidden
        className="paper-grain absolute inset-0 opacity-[0.06] mix-blend-multiply"
      />
      {frame}

      {/* Corner vector: a second, quieter mark the host can choose. */}
      {content.cornerMotif && content.cornerMotif !== "none" && (
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            top: "5cqw",
            [content.rtl ? "left" : "right"]: "5cqw",
            width: "14cqw",
            height: "14cqw",
            color: palette.accent,
            opacity: 0.34,
          }}
        >
          <Motif
            id={content.cornerMotif}
            className="h-full w-full"
            strokeWidth={0.7}
          />
        </div>
      )}

      <div
        className={cn(
          "relative flex h-full flex-col",
          centered
            ? "items-center text-center"
            : content.rtl
              ? "items-end text-right"
              : "items-start text-left",
        )}
        style={{
          padding: content.layout === "editorial" ? "8cqw 9cqw 8cqw 10.5cqw" : "9cqw 11cqw",
        }}
      >
        <header className={cn("flex flex-col", centered ? "items-center" : "items-start")}>
          <div
            aria-hidden
            className="mb-[2.6cqw]"
            style={{
              width: "13cqw",
              height: "13cqw",
              opacity: 0.85,
            }}
          >
            {content.layout === "envelope" ? (
              <span
                className="grid h-full w-full place-items-center rounded-full"
                style={{
                  background: palette.accent,
                  boxShadow: `0 0.6cqw 1.8cqw ${(palette.accent)}59`,
                }}
              >
                <Motif
                  id={content.motif}
                  className="h-[62%] w-[62%]"
                  strokeWidth={1.5}
                />
              </span>
            ) : (
              <Motif id={content.motif} className="h-full w-full" strokeWidth={0.8} />
            )}
          </div>
          <p
            className="line-clamp-2"
            style={{
              fontSize: "2.05cqw",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              lineHeight: 1.7,
              opacity: 0.78,
              maxWidth: "82%",
            }}
          >
            {content.eyebrow || "You are invited"}
          </p>
          {recipientName && (
            <p
              className="line-clamp-1"
              style={{
                marginTop: "2.4cqw",
                fontFamily: display,
                fontStyle: "italic",
                fontSize: "3.8cqw",
                color: palette.accent,
                lineHeight: 1.2,
              }}
            >
              For {recipientName}
            </p>
          )}
        </header>

        <div className="flex min-h-0 flex-1 flex-col justify-center">
          {paired ? (
            <div className="flex flex-col" style={{ gap: "0.4cqw" }}>
              <span
                className="line-clamp-2"
                style={{
                  fontFamily: display,
                  fontSize: `${nameSize}cqw`,
                  lineHeight: 0.98,
                  letterSpacing: "-0.012em",
                }}
              >
                {primary}
              </span>
              <span
                aria-hidden={!secondary}
                style={{
                  fontFamily: display,
                  fontStyle: "italic",
                  fontSize: "5cqw",
                  lineHeight: 1.12,
                  color: palette.accent,
                }}
              >
                {secondary ? "&" : ""}
              </span>
              <span
                className="line-clamp-2"
                style={{
                  fontFamily: display,
                  fontSize: `${nameSize}cqw`,
                  lineHeight: 0.98,
                  letterSpacing: "-0.012em",
                }}
              >
                {secondary || "Your name"}
              </span>
            </div>
          ) : (
            <div className="flex flex-col" style={{ gap: "1.6cqw" }}>
              <span
                className="line-clamp-2"
                style={{
                  fontFamily: display,
                  fontSize: `${Math.min(scripted ? 15 : 11.8, Math.max(scripted ? 8.6 : 7.4, (scripted ? 104 : 88) / Math.max(primary.length, 8)))}cqw`,
                  lineHeight: 1.02,
                  letterSpacing: "-0.01em",
                }}
              >
                {primary}
              </span>
              {secondary && (
                <span
                  style={{
                    fontFamily: display,
                    fontStyle: "italic",
                    fontSize: "4cqw",
                    lineHeight: 1.3,
                    color: palette.accent,
                  }}
                >
                  {secondary}
                </span>
              )}
            </div>
          )}
        </div>

        <div
          className={cn("flex flex-col", centered ? "items-center" : "items-start")}
          style={{ gap: "1.4cqw", width: "100%" }}
        >
          <div
            aria-hidden
            style={{
              width: "12cqw",
              height: "0.16cqw",
              background: palette.accent,
              opacity: 0.6,
              marginBottom: "1.6cqw",
            }}
          />
          <p
            style={{
              fontFamily: display,
              fontSize: "2.75cqw",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              lineHeight: 1.55,
            }}
          >
            {date}
          </p>
          {(time || content.venueName) && (
            <p
              className="line-clamp-2"
              style={{
                fontSize: "2.1cqw",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                opacity: 0.72,
                lineHeight: 1.6,
              }}
            >
              {[time, content.venueName].filter(Boolean).join("  ·  ")}
            </p>
          )}
          {content.venueAddress && (
            <p
              className="line-clamp-2"
              style={{
                fontSize: "1.95cqw",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                opacity: 0.55,
                lineHeight: 1.5,
              }}
            >
              {content.venueAddress}
            </p>
          )}

          {content.message && (
            <p
              className="line-clamp-3"
              style={{
                fontFamily: display,
                fontStyle: "italic",
                fontSize: "2.9cqw",
                lineHeight: 1.65,
                opacity: 0.82,
                marginTop: "2.8cqw",
                maxWidth: centered ? "82%" : "94%",
              }}
            >
              {content.message}
            </p>
          )}

          <p
            style={{
              fontSize: "1.55cqw",
              letterSpacing: "0.42em",
              textTransform: "uppercase",
              opacity: 0.42,
              marginTop: "3.4cqw",
              paddingLeft: "0.42em",
            }}
          >
            LAMSA
          </p>
        </div>
      </div>
    </div>
  );
}

function InvitationCanvasBackdrop({
  seed,
  fx,
}: {
  seed: string;
  fx?: InvitationFxSpec;
}) {
  const hash =
    typeof crypto !== "undefined" && "subtle" in crypto
      ? "" +
        crypto
          .createHash
          ? crypto.createHash("sha256").update(seed).digest("hex").slice(0, 8)
          : "x" +
            parseInt(
              Array.from(
                new Uint8Array(
                  crypto.subtle
                    ? crypto.subtle.digest("SHA-256", new TextEncoder().encode(seed))
                    : new ArrayBuffer(0),
                ),
                (b) => b,
              ).join(""),
              16,
            ).toString(16).slice(0, 8)
      : Math.random().toString(36).slice(2, 8);

  const imageUrl = `/templates/airvendor/${seed.split("/").pop() || seed}.jpg`;

  return (
    <div className="absolute inset-0 h-full w-full overflow-hidden" aria-hidden>
      <img
        src={imageUrl}
        alt=""
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
        style={{ objectPosition: "center" }}
      />
      {fx && (
        <div className="absolute inset-0" aria-hidden style={{ pointerEvents: "none" }}>
          {fx.dust && (
            <DustField color={fx.dust[0]} count={fx.dust[1]} seed={hash} />
          )}
          {fx.petals && (
            <PetalField color={fx.petals[0]} count={fx.petals[1]} seed={hash} />
          )}
          {fx.sweep && <Sweeper />}
          {fx.flick && <Flicker />}
          {fx.glow && (
            <GlowField points={fx.glow} seed={hash} />
          )}
          {fx.spark && (
            <SparkField points={fx.spark} seed={hash} />
          )}
        </div>
      ]}
    </div>
  );
}

function reducedMotion() {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function seededRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31 * h + seed.charCodeAt(i), 0x6cd4e4b) >>> 0) || 1;
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
    h = Math.imul(h ^ (h >>> 15), 0x84647515);
    return (h >>> 0) / 4294967296;
  };
}

function DustField({ color, count, seed }: { color: string; count: number; seed: string }) {
  const sprites = useMemo(() => {
    const rnd = seededRandom(seed + ":dust");
    return Array.from({ length: count }, () => ({
      id: Math.random().toString(36).slice(2, 8),
      left: rnd() * 100,
      top: 40 + rnd() * 60,
      size: 2 + rnd() * 3,
      duration: 5 + rnd() * 7,
      delay: -(rnd() * 9),
    }));
  }, [count, seed]);

  if (reducedMotion()) return null;

  return (
    <div
      className="absolute inset-0"
      aria-hidden
      style={{ pointerEvents: "none" }}
    >
      {sprites.map((sprite) => (
        <div
          key={sprite.id}
          className="absolute rounded-full animate-dust"
          style={{
            left: `${sprite.left}%`,
            top: `${sprite.top}%`,
            width: `${sprite.size}px`,
            height: `${sprite.size}px`,
            background: color,
            boxShadow: `0 0 ${sprite.size * 2}px ${color}`,
            animationDuration: `${sprite.duration}s`,
            animationDelay: `${sprite.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function PetalField({ color, count, seed }: { color: string; count: number; seed: string }) {
  const sprites = useMemo(() => {
    const rnd = seededRandom(seed + ":petal");
    return Array.from({ length: count }, () => ({
      id: Math.random().toString(36).slice(2, 8),
      left: rnd() * 95,
      size: 7 + rnd() * 6,
      duration: 8 + rnd() * 6,
      delay: -(rnd() * 12),
    }));
  }, [count, seed]);

  if (reducedMotion()) return null;

  return (
    <div
      className="absolute inset-0"
      aria-hidden
      style={{ pointerEvents: "none" }}
    >
      {sprites.map((sprite) => (
        <div
          key={sprite.id}
          className="absolute rounded-[60%_0_60%_40%] animate-petal"
          style={{
            left: `${sprite.left}%`,
            top: "-6%",
            width: `${sprite.size}px`,
            height: `${sprite.size * 1.3}px`,
            background: color,
            boxShadow: "inset -2px -2px 3px rgba(0,0,0,0.3)",
            animationDuration: `${sprite.duration}s`,
            animationDelay: `${sprite.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function Sweeper() {
  if (reducedMotion()) return null;
  return (
    <div
      className="absolute left-0 top-0 h-full w-[35%] animate-sweep"
      aria-hidden
      style={{
        top: "-10%",
        bottom: "-10%",
        background: "linear-gradient(90deg,transparent,rgba(255,244,214,0.28),transparent)",
        transform: "skewX(-18deg)",
        mixBlendMode: "screen",
      }}
    />
  );
}

function Flicker() {
  if (reducedMotion()) return null;
  return (
    <div
      className="absolute inset-0 animate-flicker"
      aria-hidden
      style={{
        background: "#ffb04a",
        mixBlendMode: "soft-light",
      }}
    />
  );
}

function GlowField({ points, seed }: { points: [number, number, number][]; seed: string }) {
  const items = useMemo(() => {
    const rnd = seededRandom(seed + ":glow");
    return points.map((point, index) => ({
      id: Math.random().toString(36).slice(2, 8),
      left: point[0] * 100,
      top: point[1] * 100,
      size: point[2] * 100,
      delay: -(index * 0.7 + rnd() * 0.4),
    }));
  }, [points, seed]);

  if (reducedMotion()) return null;

  return (
    <div
      className="absolute inset-0"
      aria-hidden
      style={{ pointerEvents: "none" }}
    >
      {items.map((item) => (
        <div
          key={item.id}
          className="absolute rounded-full animate-glow"
          style={{
            left: `${item.left}%`,
            top: `calc(${item.top}% - ${item.size * 0.5}%)`,
            width: `${item.size}%`,
            aspectRatio: "1 / 1",
            background:
              "radial-gradient(circle,rgba(255,200,110,0.85),rgba(255,170,60,0) 68%)",
            mixBlendMode: "screen",
            animationDelay: `${item.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function SparkField({ points, seed }: { points: [number, number][]; seed: string }) {
  const items = useMemo(() => {
    const rnd = seededRandom(seed + ":spark");
    return points.map((point, index) => ({
      id: Math.random().toString(36).slice(2, 8),
      left: point[0] * 100,
      top: point[1] * 100,
      delay: -(index * 0.5 + rnd() * 0.4),
    }));
  }, [points, seed]);

  if (reducedMotion()) return null;

  return (
    <div
      className="absolute inset-0"
      aria-hidden
      style={{ pointerEvents: "none" }}
    >
      {items.map((item) => (
        <div
          key={item.id}
          className="absolute size-3.5 animate-spark"
          style={{
            left: `${item.left}%`,
            top: `${item.top}%`,
            background:
              "radial-gradient(circle,#fff 0,rgba(255,255,255,0.9) 12%,transparent 14%),linear-gradient(#fff,#fff) center/1px 100% no-repeat,linear-gradient(#fff,#fff) center/100% 1px no-repeat",
            animationDelay: `${item.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

