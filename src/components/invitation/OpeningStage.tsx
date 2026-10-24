import { DesignPageView } from "@/components/invitation/DesignPageView";
import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  flatBackgroundOf,
  openingHint,
  pageSizeOf,
  personalize,
  type DesignPage,
  type EnvelopeSettings,
  type OpeningSettings,
  type OpeningToneId,
} from "@/lib/design";
import { fontFamilyFor } from "@/lib/fonts";
import { envelopeStageBox, usableLining } from "@/lib/envelope";
import { pageEntranceEnd } from "@/lib/journey";
import {
  openingFrame,
  openingPresetOf,
  openingRunDuration,
  type OpeningFrame,
} from "@/lib/opening";
import { openingPaletteOf, openingToneOf } from "@/lib/openings";
import { cn } from "@/lib/utils";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

interface OpeningStageProps {
  opening: OpeningSettings;
  /**
   * The real first section. It is rendered as the physical invitation card that
   * the opening reveals — not a stand-in that is replaced afterwards.
   */
  page?: DesignPage | null;
  imageUrls?: Record<string, string>;
  accent: string;
  background: string;
  ink: string;
  guestName?: string | null;
  /** Couple or host names for the typographic and image openers. */
  names?: string;
  rtl?: boolean;
  autoOpen?: boolean;
  reducedMotion?: boolean;
  coverUrl?: string;
  /**
   * Holds the opening on one still frame instead of playing it, so the Opening
   * Designer can show exactly what each stage of the sequence looks like.
   */
  stillAt?: number;
  /** Fires once the invitation has settled and the opening is finished. */
  onDone: () => void;
  className?: string;
}

interface Palette {
  accent: string;
  background: string;
  ink: string;
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
  const r = (number >> 16) & 255;
  const g = (number >> 8) & 255;
  const b = number & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* -------------------------------------------------------------------------- */
/* The invitation card                                                        */
/* -------------------------------------------------------------------------- */

function InvitationCard({
  frame,
  box,
  contentScale,
  children,
}: {
  frame: OpeningFrame;
  /** The card's own box in artboard units, so it lands exactly on the page. */
  box: { width: number; height: number };
  /** Converts page pixels into artboard units. */
  contentScale: number;
  children: ReactNode;
}) {
  const style: CSSProperties = {
    position: "absolute",
    left: (DESIGN_WIDTH - box.width) / 2,
    top: (DESIGN_HEIGHT - box.height) / 2,
    width: box.width,
    height: box.height,
    transform: `translate3d(0, ${frame.cardOffsetY}px, 0) scale(${frame.cardScale}) rotate(${frame.cardRotate}deg)`,
    borderRadius: frame.cardRadius,
    boxShadow: `0 ${Math.round(30 - frame.card * 24)}px ${Math.round(
      80 - frame.card * 56,
    )}px ${rgba("#000000", frame.cardShadow)}`,
    transformOrigin: "50% 50%",
    willChange: "transform",
  };

  return (
    <div
      className="absolute overflow-hidden"
      style={style}
      data-opening-card
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: `scale(${contentScale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Envelope                                                                   */
/* -------------------------------------------------------------------------- */

function EnvelopeScene({
  frame,
  palette,
  card,
  guestName,
  tone,
  stationery,
}: {
  frame: OpeningFrame;
  palette: Palette;
  card: ReactNode;
  guestName?: string | null;
  tone: OpeningToneId;
  stationery?: EnvelopeSettings;
}) {
  // The envelope is a real object with a real size; older openings without a
  // stationery choice keep the exact legacy box.
  const box = envelopeStageBox(stationery);
  const liningOverride = usableLining(stationery?.lining);
  const sealColour = usableLining(stationery?.sealColor) ?? palette.accent;
  const sealInitials = (stationery?.sealInitials ?? "").trim().slice(0, 3);
  const body =
    tone === "ink"
      ? `linear-gradient(155deg, ${palette.ink} 0%, #0d0c0b 100%)`
      : tone === "ivory"
        ? `linear-gradient(155deg, ${rgba(palette.background, 1)} 0%, ${rgba(
            palette.background,
            0.9,
          )} 58%, ${rgba(palette.accent, 0.16)} 100%)`
        : `linear-gradient(150deg, ${palette.accent} 0%, ${rgba(palette.accent, 1)} 45%, ${rgba("#2b0007", 1)} 100%)`;
  const lining =
    liningOverride ??
    (tone === "ink"
      ? `linear-gradient(180deg, ${rgba(palette.accent, 0.55)}, ${rgba(palette.ink, 1)})`
      : `linear-gradient(180deg, ${rgba("#9c1930", 1)}, ${palette.accent})`);
  const address = tone === "ivory" ? palette.accent : palette.background;
  const edge =
    tone === "ivory"
      ? rgba(palette.accent, 0.45)
      : rgba(palette.background, 0.14);
  // Once the card has cleared the pocket the envelope drops away beneath it.
  // The pocket stays fully opaque while it is in front of the card, so the card
  // reads as emerging from inside rather than fading through the paper.
  const clear = Math.min(1, Math.max(0, (frame.card - 0.45) / 0.55));
  const envelopeDrift = `translateY(${Math.round(clear * 1420)}px)`;
  // The wax-seal opening leads with a single, larger seal.
  const sealSize = tone === "ink" ? 128 : 96;

  return (
    <>
      {/* Envelope back and interior */}
      <div
        className="absolute inset-0"
        style={{ transform: envelopeDrift }}
      >
      <div
        className="absolute overflow-hidden"
        style={{
          left: box.left,
          top: box.top,
          width: box.width,
          height: box.height,
          background: body,
          borderRadius: 6,
          boxShadow: `0 40px 90px ${rgba("#000000", 0.35)}`,
          border: `1px solid ${edge}`,
        }}
      >
        <div
          className="absolute inset-x-0 top-0"
          style={{
            height: box.flapHeight + 80,
            background: `linear-gradient(180deg, ${rgba("#000000", 0.34)}, ${rgba(
              "#000000",
              0.06,
            )})`,
            borderRadius: "4px 4px 0 0",
          }}
        />
        <div
          className="absolute inset-x-[6%] top-[10%] h-px"
          style={{ background: rgba(palette.background, 0.18) }}
        />
      </div>
      </div>

      {/* The real invitation, held inside the pocket */}
      {card}

      {/* Front pocket, flap and seal */}
      <div className="absolute inset-0" style={{ transform: envelopeDrift }}>
      <div
        className="absolute overflow-hidden"
        style={{
          left: box.left,
          top: box.pocketTop,
          width: box.width,
          height: box.top + box.height - box.pocketTop,
          background: body,
          // The pocket's folded edge rises to meet the flap's point, so the
          // envelope reads shut while the card waits behind it.
          clipPath: "polygon(0 100%, 0 23%, 50% 10%, 100% 23%, 100% 100%)",
          boxShadow: `inset 0 3px 10px ${rgba("#000000", 0.25)}`,
        }}
      >
        <div
          className="absolute inset-x-0 top-0 h-[46%]"
          style={{
            background: `linear-gradient(180deg, ${rgba("#ffffff", 0.1)}, ${rgba(
              "#000000",
              0.16,
            )})`,
          }}
        />
        <div
          className="absolute inset-x-[9%] bottom-[16%] flex flex-col items-center text-center"
          style={{ color: address }}
        >
          <span
            className="text-[16px] uppercase tracking-[0.42em]"
            style={{ opacity: 0.6 }}
          >
            {guestName ? "Prepared for" : "An invitation"}
          </span>
          {guestName && (
            <span
              className="mt-3 max-w-[90%] truncate text-[40px] leading-tight"
              style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
            >
              {guestName}
            </span>
          )}
          <span
            className="mt-4 block h-px w-16"
            style={{ background: rgba(palette.background, 0.35) }}
          />
        </div>
      </div>

      {/* Flap, hinged at the envelope's top edge */}
      <div
        className="absolute"
        style={{
          left: box.left,
          top: box.top,
          width: box.width,
          height: box.flapHeight,
          perspective: 1600,
          transformStyle: "preserve-3d",
          zIndex: 3,
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: lining,
            clipPath: "polygon(0 0, 100% 0, 50% 100%)",
            transformOrigin: "50% 0%",
            // The flap keeps turning past vertical, showing its lining as it
            // falls open above the envelope instead of popping out of view.
            transform: `rotateX(${-frame.frame * 168}deg)`,
            boxShadow: `inset 0 -1px 0 ${rgba("#ffffff", 0.18)}`,
            transition: "none",
          }}
        >
          <div
            className="absolute inset-x-0 bottom-0"
            style={{
              height: "70%",
              background: `linear-gradient(180deg, ${rgba("#000000", 0.16)}, ${rgba(
                "#000000",
                0.34,
              )})`,
              clipPath: "polygon(0 0, 100% 0, 50% 100%)",
            }}
          />
        </div>
      </div>

      {/* Wax seal: it cracks and the two halves fall away */}
      <div
        aria-hidden
        className="absolute"
        style={{
          left: box.left + box.width / 2,
          top: box.sealTop,
          width: sealSize,
          height: sealSize,
          transform: "translate(-50%, -50%)",
          zIndex: 4,
        }}
      >
        {[-1, 1].map((side) => (
          <div
            key={side}
            className="absolute inset-0 grid place-items-center rounded-full"
            style={{
              background: `radial-gradient(circle at 34% 28%, ${rgba("#ffffff", 0.28)}, ${sealColour} 58%, ${rgba("#000000", 0.55)})`,
              clipPath:
                side < 0
                  ? "polygon(0 0, 52% 0, 46% 40%, 54% 66%, 44% 100%, 0 100%)"
                  : "polygon(56% 0, 100% 0, 100% 100%, 46% 100%, 56% 64%, 48% 38%)",
              transform: `translate(${side * frame.seal * sealSize * 0.66}px, ${
                frame.seal * (sealSize + side * 8)
              }px) rotate(${side * frame.seal * 26}deg)`,
              opacity: 1 - frame.seal * 0.9,
              boxShadow: `inset 0 2px 8px ${rgba("#ffffff", 0.22)}, 0 10px 24px ${rgba(
                "#000000",
                0.4,
              )}`,
            }}
          >
            <span
              className="text-white/75"
              style={{
                fontSize: Math.round(
                  sealSize * (sealInitials.length > 2 ? 0.17 : 0.24),
                ),
                letterSpacing: sealInitials ? "0.08em" : undefined,
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                fontWeight: 600,
              }}
            >
              {sealInitials || "✦"}
            </span>
          </div>
        ))}
      </div>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Other opening scenes                                                       */
/* -------------------------------------------------------------------------- */

function sceneChrome(frame: OpeningFrame): CSSProperties {
  return {
    opacity: 1 - frame.retreat,
    transform: `scale(${1 + frame.retreat * 0.03})`,
  };
}

function ArchScene({
  frame,
  palette,
  card,
}: {
  frame: OpeningFrame;
  palette: Palette;
  card: ReactNode;
}) {
  const open = frame.frame;
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(58% 46% at 50% 46%, ${rgba(
            palette.accent,
            0.42,
          )}, ${rgba(palette.ink, 0.9)} 72%)`,
        }}
      />
      {card}
      <div
        aria-hidden
        className="absolute left-1/2 top-[7%] -translate-x-1/2"
        style={{
          width: 690,
          height: 1120,
          borderRadius: "50% 50% 0 0 / 44% 44% 0 0",
          border: `2px solid ${rgba(palette.accent, 0.65)}`,
          boxShadow: `0 0 0 2600px ${rgba(palette.ink, 0.94)}, inset 0 0 120px ${rgba(
            palette.accent,
            0.4,
          )}`,
          transform: `scale(${0.9 + open * 0.26})`,
          opacity: Math.max(0, 1 - open * 1.02),
        }}
      >
        <div
          className="absolute inset-[26px]"
          style={{
            borderRadius: "50% 50% 0 0 / 43% 43% 0 0",
            border: `1px solid ${rgba(palette.background, 0.22)}`,
          }}
        />
      </div>
    </>
  );
}

function CurtainScene({
  frame,
  palette,
  card,
}: {
  frame: OpeningFrame;
  palette: Palette;
  card: ReactNode;
}) {
  const open = frame.frame;
  const panel = `repeating-linear-gradient(90deg, ${rgba(
    palette.accent,
    1,
  )} 0 34px, ${rgba("#3f0009", 1)} 34px 62px, ${rgba(palette.accent, 0.92)} 62px 86px)`;
  return (
    <>
      {card}
      <div aria-hidden className="absolute inset-0 overflow-hidden" style={sceneChrome(frame)}>
        <div
          className="absolute inset-y-0 left-0 w-[54%] origin-left"
          style={{
            background: panel,
            transform: `translateX(${-open * 104}%) scaleX(${1 - open * 0.08})`,
            boxShadow: `inset -40px 0 70px ${rgba("#000000", 0.4)}`,
          }}
        />
        <div
          className="absolute inset-y-0 right-0 w-[54%] origin-right"
          style={{
            background: panel,
            transform: `translateX(${open * 104}%) scaleX(${1 - open * 0.08})`,
            boxShadow: `inset 40px 0 70px ${rgba("#000000", 0.4)}`,
          }}
        />
        <div
          className="absolute inset-x-0 top-0 h-[9%]"
          style={{
            background: `linear-gradient(180deg, ${rgba("#2a0006", 1)}, ${rgba(
              palette.accent,
              0.9,
            )})`,
            transform: `translateY(${-open * 120}%)`,
          }}
        />
      </div>
    </>
  );
}

function DoorScene({
  frame,
  palette,
  card,
}: {
  frame: OpeningFrame;
  palette: Palette;
  card: ReactNode;
}) {
  const open = frame.frame;
  const leaf = (side: -1 | 1) => (
    <div
      key={side}
      className="absolute inset-y-0 w-1/2 overflow-hidden"
      style={{
        left: side < 0 ? 0 : "50%",
        transformOrigin: side < 0 ? "left center" : "right center",
        transform: `rotateY(${side * open * 104}deg)`,
        background: `linear-gradient(${side < 0 ? 90 : 270}deg, ${rgba(
          palette.ink,
          1,
        )}, ${rgba("#2c050b", 1)} 55%, ${rgba(palette.accent, 1)})`,
        boxShadow: `inset ${side * 34}px 0 70px ${rgba("#000000", 0.45)}`,
      }}
    >
      <div
        className="absolute inset-[10%] border"
        style={{ borderColor: rgba(palette.accent, 0.5) }}
      >
        <div
          className="absolute inset-[9%] border"
          style={{ borderColor: rgba(palette.background, 0.14) }}
        />
        <div
          className="absolute left-1/2 top-[46%] size-3 -translate-x-1/2 rounded-full"
          style={{ background: rgba(palette.accent, 0.9) }}
        />
      </div>
    </div>
  );
  return (
    <>
      {card}
      <div
        aria-hidden
        className="absolute inset-0 overflow-hidden"
        style={{ ...sceneChrome(frame), perspective: 1700 }}
      >
        {leaf(-1)}
        {leaf(1)}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(180deg, ${rgba("#000000", 0.5)}, transparent 30%, transparent 70%, ${rgba(
              "#000000",
              0.5,
            )})`,
            opacity: 1 - open,
          }}
        />
      </div>
    </>
  );
}

function CardsScene({
  frame,
  palette,
  card,
}: {
  frame: OpeningFrame;
  palette: Palette;
  card: ReactNode;
}) {
  const open = frame.frame;
  return (
    <>
      {card}
      <div aria-hidden className="absolute inset-0" style={sceneChrome(frame)}>
        {[2, 1, 0].map((index) => (
          <div
            key={index}
            className="absolute left-1/2 top-[6%]"
            style={{
              width: 720,
              height: 1160,
              marginLeft: -360,
              background:
                index === 0
                  ? `linear-gradient(160deg, ${rgba(palette.background, 1)}, ${rgba(
                      palette.background,
                      0.82,
                    )})`
                  : `linear-gradient(160deg, ${rgba(palette.accent, 0.96)}, ${rgba(
                      "#38000a",
                      1,
                    )})`,
              border: `1px solid ${rgba(
                index === 0 ? palette.accent : palette.background,
                0.35,
              )}`,
              boxShadow: `0 30px 70px ${rgba("#000000", 0.32)}`,
              transform: `translateY(${-open * (360 + index * 90)}px) translateX(${
                (index - 1) * open * 120
              }px) rotate(${(index - 1) * open * 16}deg)`,
              opacity: 1 - open * (index === 0 ? 1 : 0.85),
            }}
          >
            <div
              className="absolute inset-[7%] border"
              style={{ borderColor: rgba(palette.background, 0.16) }}
            />
          </div>
        ))}
      </div>
    </>
  );
}

function FoldingScene({
  frame,
  palette,
  card,
}: {
  frame: OpeningFrame;
  palette: Palette;
  card: ReactNode;
}) {
  const open = frame.frame;
  const panel = (side: -1 | 1) => (
    <div
      key={side}
      className="absolute inset-y-0 w-1/2"
      style={{
        left: side < 0 ? 0 : "50%",
        transformOrigin: side < 0 ? "left center" : "right center",
        transform: `rotateY(${side * open * 104}deg)`,
        background: `linear-gradient(${side < 0 ? 100 : 260}deg, ${rgba(
          palette.background,
          1,
        )}, ${rgba(palette.background, 0.86)})`,
        borderRight: side < 0 ? `1px solid ${rgba(palette.accent, 0.35)}` : undefined,
        borderLeft: side > 0 ? `1px solid ${rgba(palette.accent, 0.35)}` : undefined,
        boxShadow: `0 0 70px ${rgba("#000000", 0.22)}`,
      }}
    >
      <div
        className="absolute inset-[12%] border"
        style={{ borderColor: rgba(palette.accent, 0.28) }}
      />
      <span
        className="absolute bottom-[14%] left-1/2 -translate-x-1/2 text-[15px] uppercase tracking-[0.4em]"
        style={{ color: rgba(palette.ink, 0.4) }}
      >
        LAMSA
      </span>
    </div>
  );
  return (
    <>
      {card}
      <div
        aria-hidden
        className="absolute inset-0 overflow-hidden"
        style={{ ...sceneChrome(frame), perspective: 1700 }}
      >
        {panel(-1)}
        {panel(1)}
      </div>
    </>
  );
}

function PaperScene({
  frame,
  palette,
  card,
}: {
  frame: OpeningFrame;
  palette: Palette;
  card: ReactNode;
}) {
  const open = frame.frame;
  return (
    <>
      {card}
      <div
        aria-hidden
        className="absolute inset-0 overflow-hidden"
        style={{ ...sceneChrome(frame), perspective: 1600 }}
      >
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="absolute inset-x-0"
            style={{
              top: `${index * 33.34}%`,
              height: "33.4%",
              background:
                index % 2 === 0
                  ? `linear-gradient(180deg, ${rgba(palette.background, 1)}, ${rgba(
                      palette.background,
                      0.84,
                    )})`
                  : `linear-gradient(180deg, ${rgba(palette.background, 0.84)}, ${rgba(
                      palette.background,
                      1,
                    )})`,
              borderBottom: `1px solid ${rgba(palette.accent, 0.22)}`,
              transformOrigin: "top center",
              transform: `rotateX(${(1 - open) * (index === 1 ? -104 : 68)}deg)`,
              opacity: Math.max(0, 1 - open),
              boxShadow: `0 18px 40px ${rgba("#000000", 0.16)}`,
            }}
          >
            <span
              className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[13px] uppercase tracking-[0.5em]"
              style={{ color: rgba(palette.ink, 0.18) }}
            >
              L A M S A
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

function TypographyScene({
  frame,
  palette,
  card,
  names,
  guestName,
  titleFont,
}: {
  frame: OpeningFrame;
  palette: Palette;
  card: ReactNode;
  names?: string;
  guestName?: string | null;
  titleFont: string;
}) {
  const open = frame.frame;
  return (
    <>
      {card}
      <div
        aria-hidden
        className="absolute inset-0 flex flex-col items-center justify-center text-center"
        style={sceneChrome(frame)}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, ${rgba(
              palette.background,
              0.98,
            )}, ${rgba(palette.background, 0.94)})`,
            opacity: 1 - open,
          }}
        />
        <p
          className="relative text-[18px] uppercase tracking-[0.46em]"
          style={{
            color: rgba(palette.accent, 0.9),
            opacity: 1 - open * 1.6,
            transform: `translateY(${-open * 90}px)`,
          }}
        >
          You are invited
        </p>
        <h2
          className="relative mt-8 max-w-[86%] text-[76px] leading-[0.98]"
          style={{
            fontFamily: titleFont,
            color: palette.ink,
            letterSpacing: `${0.12 - open * 0.1}em`,
            opacity: 1 - open,
            transform: `translateY(${-open * 150}px) scale(${1 + open * 0.04})`,
            clipPath: `inset(0 ${open * 100}% 0 0)`,
          }}
        >
          {names || "LAMSA"}
        </h2>
        <p
          className="relative mt-9 text-[17px] uppercase tracking-[0.36em]"
          style={{
            color: rgba(palette.ink, 0.55),
            opacity: 1 - open * 1.8,
            transform: `translateY(${open * 40}px)`,
          }}
        >
          {personalize(
            guestName ? "For {{guest}}" : "An invitation",
            guestName,
          )}
        </p>
      </div>
    </>
  );
}

function FloralScene({
  frame,
  palette,
  card,
}: {
  frame: OpeningFrame;
  palette: Palette;
  card: ReactNode;
}) {
  const open = frame.frame;
  const petals = Array.from({ length: 18 });
  return (
    <>
      {card}
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(56% 44% at 50% 48%, ${rgba(
              palette.accent,
              0.2,
            )}, transparent 70%)`,
            opacity: 1 - open,
          }}
        />
        {petals.map((_, index) => {
          const angle = index * (360 / petals.length);
          return (
            <div
              key={index}
              className="absolute left-1/2 top-1/2 origin-bottom"
              style={{
                width: index % 3 === 0 ? 30 : 20,
                height: index % 3 === 0 ? 130 : 96,
                marginLeft: index % 3 === 0 ? -15 : -10,
                borderRadius: "60% 60% 46% 46%",
                background:
                  index % 2 === 0
                    ? `linear-gradient(180deg, ${rgba(palette.accent, 0.9)}, ${rgba(
                        palette.accent,
                        0.45,
                      )})`
                    : `linear-gradient(180deg, ${rgba(palette.ink, 0.4)}, ${rgba(
                        palette.ink,
                        0.12,
                      )})`,
                transform: `rotate(${angle}deg) translateY(${-190 - open * 150}px) scale(${
                  1 + open * 0.28
                })`,
                opacity: 1 - open * 1.15,
                filter: `blur(${open * 2}px)`,
              }}
            />
          );
        })}
        <div
          className="absolute left-1/2 top-1/2 size-[430px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            border: `1px solid ${rgba(palette.accent, 0.4)}`,
            transform: `translate(-50%, -50%) scale(${1 + open * 0.4})`,
            opacity: 1 - open * 1.2,
          }}
        />
      </div>
    </>
  );
}

function CinematicScene({
  frame,
  palette,
  card,
  names,
}: {
  frame: OpeningFrame;
  palette: Palette;
  card: ReactNode;
  names?: string;
}) {
  const open = frame.frame;
  return (
    <>
      {card}
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-x-0 top-0 z-10"
          style={{
            height: `${(1 - open) * 15}%`,
            background: "#0b0b0b",
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 z-10"
          style={{
            height: `${(1 - open) * 15}%`,
            background: "#0b0b0b",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(120% 90% at 50% 50%, transparent 40%, ${rgba(
              palette.ink,
              0.55,
            )} 100%)`,
            opacity: 1 - open,
          }}
        />
        <div
          className="absolute inset-0 z-20 grid place-items-center"
          style={{ opacity: 1 - open * 1.5 }}
        >
          <div className="text-center">
            <p className="text-[16px] uppercase tracking-[0.5em] text-[#f2f1ed]/55">
              A private celebration
            </p>
            <p className="mt-6 text-[60px] leading-none text-[#f2f1ed]/90">
              {names || "LAMSA"}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function ImageScene({
  frame,
  palette,
  card,
  coverUrl,
  names,
  guestName,
}: {
  frame: OpeningFrame;
  palette: Palette;
  card: ReactNode;
  coverUrl?: string;
  names?: string;
  guestName?: string | null;
}) {
  const open = frame.frame;
  return (
    <>
      {card}
      <div
        aria-hidden
        className="absolute inset-0 overflow-hidden"
        style={{ opacity: Math.max(0, 1 - open * 1.02) }}
      >
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              transform: `scale(${1.04 + open * 0.12})`,
              filter: `brightness(${0.72 + open * 0.2})`,
            }}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(80% 60% at 50% 40%, ${rgba(
                palette.accent,
                0.85,
              )}, ${rgba(palette.ink, 1)} 78%)`,
              transform: `scale(${1.04 + open * 0.12})`,
            }}
          />
        )}
        <div
          className="absolute inset-0 flex flex-col items-center justify-end pb-[18%] text-center"
          style={{
            background: `linear-gradient(to top, ${rgba(palette.ink, 0.82)}, transparent 66%)`,
            transform: `translateY(${open * -8}%)`,
          }}
        >
          <p className="text-[54px] leading-none text-[#f2f1ed]">{names || "LAMSA"}</p>
          <p className="mt-4 text-[16px] uppercase tracking-[0.34em] text-[#f2f1ed]/65">
            {personalize(guestName ? "For {{guest}}" : "An invitation", guestName)}
          </p>
        </div>
      </div>
    </>
  );
}

function FadeScene({
  frame,
  palette,
  card,
}: {
  frame: OpeningFrame;
  palette: Palette;
  card: ReactNode;
}) {
  const open = frame.frame;
  return (
    <>
      {card}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `radial-gradient(80% 62% at 50% 46%, ${rgba(
            palette.ink,
            0.94,
          )}, #090909 78%)`,
          opacity: 1 - open,
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 grid place-items-center"
        style={{ opacity: Math.max(0, 1 - open * 2.4) }}
      >
        <div className="text-center">
          <p className="text-[16px] uppercase tracking-[0.5em] text-[#f2f1ed]/55">
            LAMSA
          </p>
          <span className="mx-auto mt-6 block h-px w-10 bg-[#f2f1ed]/40" />
        </div>
      </div>
    </>
  );
}

function PersonalScene({
  frame,
  palette,
  card,
  guestName,
  welcome,
  titleFont,
}: {
  frame: OpeningFrame;
  palette: Palette;
  card: ReactNode;
  guestName?: string | null;
  welcome: string;
  titleFont: string;
}) {
  const open = frame.frame;
  return (
    <>
      {card}
      <div
        aria-hidden
        className="absolute inset-0 flex flex-col items-center justify-center px-[10%] text-center"
        style={{
          background: `linear-gradient(180deg, ${rgba(palette.background, 0.98)}, ${rgba(
            palette.background,
            0.94,
          )})`,
          opacity: 1 - open,
          transform: `translateY(${-open * 14}%)`,
        }}
      >
        <p className="text-[17px] uppercase tracking-[0.44em]" style={{ color: rgba(palette.accent, 0.9) }}>
          Private invitation
        </p>
        <h2
          className="mt-8 max-w-[90%] text-[62px] leading-[1.05]"
          style={{ fontFamily: titleFont, color: palette.ink }}
        >
          {guestName ? personalize("For {{guest}}", guestName) : "You are invited"}
        </h2>
        <p
          className="mt-8 max-w-[80%] text-[18px] uppercase tracking-[0.26em]"
          style={{ color: rgba(palette.ink, 0.55) }}
        >
          {welcome || "A note from the host"}
        </p>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* The stage                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The opening: a real, touchable entrance in which the invitation itself is the
 * object being revealed.
 *
 * The card rendered here is the actual first saved page, so the artwork, names,
 * type and colours carry through the whole reveal. When the card has settled at
 * full frame the stage hands over to the journey, which shows the same page in
 * the same place — there is no unrelated animation followed by a swap.
 */
export function OpeningStage({
  opening,
  page,
  imageUrls = {},
  accent,
  background,
  ink,
  guestName,
  names = "LAMSA",
  rtl,
  autoOpen = false,
  reducedMotion = false,
  coverUrl,
  stillAt,
  onDone,
  className,
}: OpeningStageProps) {
  const preset = openingPresetOf(opening.experience) ?? "fade";
  const duration = openingRunDuration(opening.duration);
  // A still is a design tool, not a guest state: it never plays and never
  // reports completion, so the designer can freeze any stage of the sequence.
  const still = typeof stillAt === "number";
  // The opening is composed on the classic artboard and centred inside the
  // page's own frame, so a landscape or story invitation still opens with the
  // same proportions and hands over to the journey without a jump.
  const size = pageSizeOf(page);
  const artScale = Math.max(
    size.width / DESIGN_WIDTH,
    size.height / DESIGN_HEIGHT,
  );
  const cardBox = {
    width: size.width / artScale,
    height: size.height / artScale,
  };
  const [phase, setPhase] = useState<"idle" | "playing">("idle");
  const [progress, setProgress] = useState(0);
  const [scale, setScale] = useState(0);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const doneRef = useRef(onDone);
  const finishedRef = useRef(false);

  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const measure = () => setScale(node.clientWidth / size.width);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [size.width]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setProgress(1);
    doneRef.current();
  };

  const begin = () => {
    if (finishedRef.current || phase === "playing") return;
    if (reducedMotion) {
      finish();
      return;
    }
    setPhase("playing");
  };

  useEffect(() => {
    if (!autoOpen || still) return;
    const timer = window.setTimeout(begin, 550);
    return () => window.clearTimeout(timer);
    // The auto-open timer is intentionally armed once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen, still]);

  // Reduced motion: the card is simply present, and the guest can go on at once.
  useEffect(() => {
    if (!reducedMotion || still) return;
    const frame = requestAnimationFrame(() => {
      setScale((current) => (current || 1));
      finish();
    });
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion, still]);

  useEffect(() => {
    if (phase !== "playing" || reducedMotion || still) return;
    let frame = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      if (start === null) start = now;
      const next = Math.min(1, (now - start) / duration);
      setProgress(next);
      if (next < 1) frame = requestAnimationFrame(tick);
      else finish();
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, phase, reducedMotion, still]);

  // If animation frames never arrive (a throttled tab, a stalled compositor),
  // the guest must still reach the invitation.
  useEffect(() => {
    if (phase !== "playing" || still) return;
    const timer = window.setTimeout(finish, duration + 1600);
    return () => window.clearTimeout(timer);
  }, [duration, phase, still]);

  const frame = openingFrame(
    preset,
    still ? stillAt : progress,
    opening.motion,
  );
  const tone = openingToneOf(opening);
  const hint = openingHint(opening.experience) || "Open the invitation";
  const welcome = personalize(opening.welcome, guestName);
  // Material overrides from the Opening Designer apply to the suite only: the
  // invitation card keeps the design's own palette.
  const colours = openingPaletteOf(
    {
      accent,
      paper: flatBackgroundOf(page?.background ?? background),
      hull: ink,
    },
    opening,
  );
  const palette: Palette = {
    accent: colours.accent,
    background: colours.paper,
    ink: colours.hull,
  };
  const pageBackground = page?.background ?? background;
  // Tints and translucent plates need one flat colour; a saved wash cannot be
  // tinted, so those surfaces fall back to the studio ivory.
  const pageTint = flatBackgroundOf(pageBackground);
  const titleElement = page?.elements.find(
    (element) => element.kind === "text" && element.font,
  );
  const titleFont = fontFamilyFor(titleElement?.font ?? "cormorant-garamond");

  // The page itself never changes during the opening; only the card around it
  // moves. Memoising the page keeps the 60 fps transform from re-rendering
  // every layer and image on a phone.
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
      ) : (
        <div
          className="grid h-full w-full place-items-center"
          style={{ background: "#f2f1ed" }}
        >
          <span className="text-[28px] uppercase tracking-[0.4em] text-[#710014]/60">
            LAMSA
          </span>
        </div>
      ),
    [guestName, imageUrls, page, reducedMotion, rtl, settledTime],
  );
  const card = (
    <InvitationCard
      frame={frame}
      box={cardBox}
      contentScale={1 / artScale}
    >
      {cardContent}
    </InvitationCard>
  );

  let scene: ReactNode;
  switch (preset) {
    case "envelope":
      scene = (
        <EnvelopeScene
          frame={frame}
          palette={palette}
          card={card}
          guestName={guestName}
          tone={tone}
          stationery={opening.stationery}
        />
      );
      break;
    case "wax-seal":
      scene = (
        <EnvelopeScene
          frame={frame}
          palette={palette}
          card={card}
          guestName={guestName}
          tone={tone}
          stationery={opening.stationery}
        />
      );
      break;
    case "arch":
      scene = <ArchScene frame={frame} palette={palette} card={card} />;
      break;
    case "curtain":
      scene = <CurtainScene frame={frame} palette={palette} card={card} />;
      break;
    case "door":
      scene = <DoorScene frame={frame} palette={palette} card={card} />;
      break;
    case "cards":
      scene = <CardsScene frame={frame} palette={palette} card={card} />;
      break;
    case "folding":
      scene = <FoldingScene frame={frame} palette={palette} card={card} />;
      break;
    case "paper":
      scene = <PaperScene frame={frame} palette={palette} card={card} />;
      break;
    case "typography":
      scene = (
        <TypographyScene
          frame={frame}
          palette={palette}
          card={card}
          names={names}
          guestName={guestName}
          titleFont={titleFont}
        />
      );
      break;
    case "floral":
      scene = <FloralScene frame={frame} palette={palette} card={card} />;
      break;
    case "cinematic":
      scene = (
        <CinematicScene frame={frame} palette={palette} card={card} names={names} />
      );
      break;
    case "image":
      scene = (
        <ImageScene
          frame={frame}
          palette={palette}
          card={card}
          coverUrl={coverUrl}
          names={names}
          guestName={guestName}
        />
      );
      break;
    case "personal":
      scene = (
        <PersonalScene
          frame={frame}
          palette={palette}
          card={card}
          guestName={guestName}
          welcome={welcome}
          titleFont={titleFont}
        />
      );
      break;
    case "fade":
    default:
      scene = <FadeScene frame={frame} palette={palette} card={card} />;
      break;
  }

  return (
    <div
      ref={stageRef}
      className={cn("absolute inset-0 z-40 overflow-hidden", className)}
      style={{
        background:
          preset === "envelope" || preset === "wax-seal"
            ? `radial-gradient(120% 90% at 50% 100%, ${rgba(accent, 0.28)}, ${rgba(
                ink,
                0.94,
              )} 72%)`
            : pageBackground,
        color: ink,
      }}
      role="dialog"
      aria-modal="true"
      aria-label={hint}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: size.width,
          height: size.height,
          transform: `scale(${scale || 0.0001})`,
          visibility: scale ? "visible" : "hidden",
        }}
      >
        <div
          aria-hidden
          className="paper-grain pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-multiply"
        />
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: DESIGN_WIDTH,
            height: DESIGN_HEIGHT,
            transform: `translate(${(size.width - DESIGN_WIDTH * artScale) / 2}px, ${
              (size.height - DESIGN_HEIGHT * artScale) / 2
            }px) scale(${artScale})`,
          }}
        >
          {scene}
        </div>
      </div>

      {phase === "idle" && !reducedMotion && !still ? (
        <button
          type="button"
          onClick={begin}
          className="absolute inset-0 z-30 flex cursor-pointer flex-col items-center justify-end pb-[9%] focus-visible:outline-none"
          aria-label={hint}
        >
          <span
            className="pointer-events-none inline-flex flex-col items-center gap-3 rounded-sm border px-7 py-3.5 font-ui text-[0.6rem] uppercase tracking-[0.3em] backdrop-blur-sm transition-all duration-300 hover:scale-[1.02]"
            style={{
              borderColor: rgba(palette.background, 0.4),
              color: palette.background,
              background: rgba(ink, 0.28),
              textShadow: "0 1px 12px rgba(0,0,0,0.35)",
            }}
          >
            {hint}
            <span
              aria-hidden
              className="block h-px w-8"
              style={{ background: rgba(palette.background, 0.55) }}
            />
          </span>
        </button>
      ) : phase === "playing" ? (
        <button
          type="button"
          onClick={finish}
          className="absolute right-4 top-4 z-30 rounded-sm border px-3 py-1.5 font-ui text-[0.55rem] uppercase tracking-[0.22em] transition-opacity hover:opacity-100 focus-visible:opacity-100"
          aria-label="Skip the opening animation"
          style={{
            borderColor: rgba(ink, 0.28),
            color: ink,
            background: rgba(pageTint, 0.78),
            opacity: 0.8,
          }}
        >
          Skip
        </button>
      ) : null}
    </div>
  );
}

