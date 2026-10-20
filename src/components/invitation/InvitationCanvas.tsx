import type { CSSProperties } from "react";
import {
  formatEventDate,
  formatEventTime,
  fontPairById,
  isPairedOccasion,
  isRevealLayout,
  type InvitationContent,
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
  const { palette } = content;
  // LAMSA v5: right-to-left invitations read in Amiri regardless of the
  // chosen pair, exactly like the brand-kit Arabic preset.
  const display = content.rtl
    ? '"Amiri", "Times New Roman", serif'
    : fontPairById(content.fontPair).family;
  const scripted = content.fontPair === "script" || content.fontPair === "arabic" || content.rtl;
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
      <div aria-hidden className="paper-texture absolute inset-0" />
      <div
        aria-hidden
        className="paper-grain absolute inset-0 opacity-[0.06] mix-blend-multiply"
      />
      {frame}

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
