import type { CSSProperties } from "react";
import {
  formatEventDate,
  formatEventTime,
  fontPairById,
  isPairedOccasion,
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
  const display = fontPairById(content.fontPair).family;
  const paired = isPairedOccasion(content.occasion);
  const primary = content.names.primary.trim() || "Your name";
  const secondary = content.names.secondary.trim();
  const date = formatEventDate(content.date);
  const time = formatEventTime(content.time);
  const centered = content.layout !== "editorial";
  const longestName = Math.max(
    primary.length,
    paired ? secondary.length : 0,
    7,
  );
  const nameSize = Math.min(11.8, Math.max(7.2, 92 / longestName));

  const frame =
    content.layout === "classic" ? (
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
      style={{
        aspectRatio: "3 / 4",
        backgroundColor: palette.background,
        color: palette.ink,
        containerType: "inline-size",
        fontFamily: '"Jost", "Helvetica Neue", sans-serif',
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
          centered ? "items-center text-center" : "items-start text-left",
        )}
        style={{
          padding: content.layout === "editorial" ? "8cqw 9cqw 8cqw 10.5cqw" : "9cqw 11cqw",
        }}
      >
        <header className={cn("flex flex-col", centered ? "items-center" : "items-start")}>
          <div
            aria-hidden
            className="mb-[2.6cqw]"
            style={{ width: "13cqw", height: "13cqw", opacity: 0.85 }}
          >
            <Motif id={content.motif} className="h-full w-full" strokeWidth={0.8} />
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
                  fontSize: `${Math.min(11.8, Math.max(7.4, 88 / Math.max(primary.length, 8)))}cqw`,
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
