import { DesignPageView } from "@/components/invitation/DesignPageView";
import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  pageSizeOf,
  type DesignPage,
  type EnvelopeSettings,
} from "@/lib/design";
import { pageEntranceEnd } from "@/lib/journey";
import {
  channelForStage,
  channelsForStage,
  easingValue,
  interactiveBusy,
  interactiveHint,
  interactiveMotionOf,
  initialInteractiveState,
  reduceInteractive,
  stageFromProgress,
  type InteractiveEvent,
  type InteractiveOpeningSettings,
  type InteractiveStage,
  type OpeningLayerId,
} from "@/lib/opening-interactive";
import { cn } from "@/lib/utils";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

/* -------------------------------------------------------------------------- */
/* Geometry — one artboard, in design units                                   */
/* -------------------------------------------------------------------------- */

/**
 * The scene is built in the same 1000 × 1333 artboard the invitation lives in,
 * then scaled to fit whatever stage hosts it, so the editor preview and the
 * published invitation share exact proportions on any phone.
 *
 * The sealed envelope hides the card completely: the flap covers the upper
 * band, the pocket wall covers the lower band, and they overlap, so there is
 * never a gap the invitation could leak through.
 */
const SCENE = {
  envelope: { x: 130, y: 520, w: 740, h: 800 },
  flapH: 470,
  /** Top of the pocket wall, in artboard units. */
  wallTop: 940,
  card: { x: 210, y: 540, w: 580, h: 772 },
  /** How far the card rises and how much it grows when presented. */
  cardRise: -260,
  cardGrow: 0.25,
  seal: { cx: 500, cy: 990, r: 82 },
  /** Screen pixels of drag that complete the flap lift / card pull. */
  flapDragPx: 130,
  cardDragPx: 170,
} as const;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

interface Palette {
  accent: string;
  background: string;
  ink: string;
}

interface InteractiveOpeningProps {
  /** Saved engine settings; absent means the built-in artwork, no uploads. */
  settings?: InteractiveOpeningSettings;
  page?: DesignPage | null;
  imageUrls?: Record<string, string>;
  guestName?: string | null;
  rtl?: boolean;
  accent: string;
  background: string;
  ink: string;
  stationery?: EnvelopeSettings;
  /**
   * `cover` is the pre-page touch moment: it stops once the flap is open and
   * hands over. `full` runs the whole interaction, card included.
   */
  variant?: "full" | "cover";
  /** Pins the scene to one stage for the editor's step previews. */
  previewStage?: InteractiveStage | null;
  reducedMotion?: boolean;
  onDone: () => void;
  className?: string;
}

/* -------------------------------------------------------------------------- */
/* Artwork                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The wax seal, drawn as an irregular pressed-wax blob rather than a circle.
 * It is built once and clipped twice along a jagged fracture, so breaking it
 * separates two real halves of the same seal instead of swapping a shape.
 */
function sealArt(monogram: string, wax: string, ink: string) {
  const blob =
    "M0,-76 C16,-80 30,-70 44,-63 C58,-56 73,-46 75,-30 C77,-13 68,-2 66,14 " +
    "C64,30 71,47 58,59 C46,70 29,66 14,72 C-2,78 -19,75 -33,67 C-47,59 -65,61 -73,47 " +
    "C-81,33 -72,16 -74,0 C-76,-17 -85,-33 -75,-47 C-65,-61 -47,-58 -33,-66 " +
    "C-19,-74 -14,-74 0,-76 Z";
  const leftClip =
    "M-92,-92 H-4 L1,-64 L-6,-34 L3,-4 L-5,28 L4,60 L-3,92 H-92 Z";
  const rightClip = "M4,-92 H92 V92 H-3 L4,60 L-5,28 L3,-4 L-6,-34 L1,-64 Z";

  const art = (
    <>
      <path d={blob} fill="url(#wax-g)" />
      {/* Pressed ring: a dark groove with a light lip below it. */}
      <circle r="53" fill="none" stroke={ink} strokeOpacity="0.35" strokeWidth="3.5" />
      <circle r="50" fill="none" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="2" />
      <text
        y="10"
        textAnchor="middle"
        fontFamily='"Cormorant Garamond", Georgia, serif'
        fontWeight={600}
        fontSize={monogram.length > 2 ? 34 : 44}
        letterSpacing={monogram.length > 1 ? "0.04em" : undefined}
        fill={ink}
        fillOpacity="0.5"
      >
        {monogram}
      </text>
      <ellipse cx="-24" cy="-34" rx="30" ry="18" fill="url(#wax-hi)" transform="rotate(-24)" />
    </>
  );

  return { blob, leftClip, rightClip, art };
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export function InteractiveOpening({
  settings,
  page,
  imageUrls = {},
  guestName,
  rtl,
  accent,
  background,
  ink,
  stationery,
  variant = "full",
  previewStage = null,
  reducedMotion = false,
  onDone,
  className,
}: InteractiveOpeningProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const motion = interactiveMotionOf(settings);
  const palette: Palette = { accent, background, ink };

  const [state, setState] = useState(initialInteractiveState);
  const [channels, setChannels] = useState({ seal: 0, flap: 0, card: 0 });
  const [scale, setScale] = useState(0);

  const boxRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef(state);
  const channelsRef = useRef(channels);
  const onDoneRef = useRef(onDone);
  const finishedRef = useRef(false);
  const tweenRef = useRef<number | null>(null);
  const gestureRef = useRef<{
    channel: "flap" | "card";
    startY: number;
    moved: boolean;
    origin: number;
    pointerId: number;
  } | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    channelsRef.current = channels;
  }, [channels]);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const dispatch = useCallback((event: InteractiveEvent) => {
    setState((previous) => reduceInteractive(previous, event));
  }, []);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onDoneRef.current();
  }, []);

  /* --- fit the artboard to the stage ---------------------------------- */

  useEffect(() => {
    const node = boxRef.current;
    if (!node) return;
    const measure = () => {
      const width = node.clientWidth;
      const height = node.clientHeight;
      if (!width || !height) return;
      setScale(Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  /* --- the tween: one channel moving at a time ------------------------ */

  const stopTween = useCallback(() => {
    if (tweenRef.current !== null) {
      cancelAnimationFrame(tweenRef.current);
      tweenRef.current = null;
    }
  }, []);

  const tweenChannel = useCallback(
    (
      channel: "seal" | "flap" | "card",
      to: number,
      duration: number,
      easing: ReturnType<typeof easingValue> extends never ? never : Parameters<typeof easingValue>[0],
      onSettled?: () => void,
    ) => {
      stopTween();
      const from = channelsRef.current[channel];
      const apply = (value: number) => {
        channelsRef.current = { ...channelsRef.current, [channel]: value };
        setChannels((previous) => ({ ...previous, [channel]: value }));
      };
      if (duration <= 16 || reducedMotion || from === to) {
        apply(to);
        onSettled?.();
        return;
      }
      const start = performance.now();
      const tick = (now: number) => {
        const progress = clamp01((now - start) / duration);
        apply(from + (to - from) * easingValue(easing, progress));
        if (progress < 1) {
          tweenRef.current = requestAnimationFrame(tick);
        } else {
          tweenRef.current = null;
          onSettled?.();
        }
      };
      tweenRef.current = requestAnimationFrame(tick);
    },
    [reducedMotion, stopTween],
  );

  // A stage change drives its own channel: the seal cracks, the flap swings,
  // the card draws. Starting from wherever the guest left it, so a drag that
  // was released halfway continues instead of jumping.
  useEffect(() => {
    if (previewStage != null) return;
    const channel = channelForStage(state.stage);
    if (!channel) return;
    const easing =
      channel === "flap"
        ? motion.flapEasing
        : channel === "card"
          ? motion.pullEasing
          : "easeOut";
    const total =
      channel === "seal" ? motion.sealMs : channel === "flap" ? motion.flapMs : motion.pullMs;
    const remaining = Math.max(0, total * (1 - channelsRef.current[channel]));
    tweenChannel(channel, 1, remaining, easing, () => dispatch({ type: "settled" }));
    return stopTween;
    // The stage is the trigger; timing values are read fresh each entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.stage, previewStage]);

  // Reduced motion hands the invitation straight over: no autoplay of a
  // sequence the guest cannot comfortably follow.
  useEffect(() => {
    if (reducedMotion && previewStage == null) finish();
  }, [reducedMotion, previewStage, finish]);

  /* --- gestures -------------------------------------------------------- */

  const pinned = previewStage != null;
  const stage = previewStage ?? state.stage;
  const hint = previewStage != null ? null : interactiveHint(state.stage, variant);

  const canGesture = (channel: "flap" | "card") => {
    if (pinned || reducedMotion) return false;
    if (interactiveBusy(stateRef.current.stage)) return false;
    return channel === "flap"
      ? stateRef.current.stage === "unsealed"
      : stateRef.current.stage === "open";
  };

  const activate = () => {
    if (pinned) return;
    const current = stateRef.current;
    // The final tap is the hand-off, not a state change.
    if (current.stage === "presented") {
      finish();
      return;
    }
    if (interactiveBusy(current.stage)) return;
    dispatch({ type: "activate" });
  };

  const onGesturePointerDown =
    (channel: "flap" | "card") => (event: ReactPointerEvent<HTMLElement>) => {
      if (!canGesture(channel)) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      gestureRef.current = {
        channel,
        startY: event.clientY,
        moved: false,
        origin: channelsRef.current[channel],
        pointerId: event.pointerId,
      };
    };

  const onGesturePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const travel = gesture.channel === "flap" ? SCENE.flapDragPx : SCENE.cardDragPx;
    const delta = gesture.startY - event.clientY;
    if (Math.abs(delta) > 8) gesture.moved = true;
    const progress = clamp01(Math.max(gesture.origin, delta / travel));
    dispatch({ type: "drag", progress });
    channelsRef.current = { ...channelsRef.current, [gesture.channel]: progress };
    setChannels((previous) => ({ ...previous, [gesture.channel]: progress }));
  };

  const onGesturePointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    gestureRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (!gesture.moved) {
      // A tap counts as the movement, so small screens never feel unresponsive.
      dispatch({ type: "activate" });
      return;
    }
    const progress = channelsRef.current[gesture.channel];
    dispatch({ type: "release", progress });
    if (progress < 0.42) {
      // Not far enough: spring back rather than stalling halfway.
      tweenChannel(gesture.channel, 0, 260, "easeOut");
    }
  };

  /* --- derived visual values ------------------------------------------ */

  const shown = previewStage != null ? channelsForStage(previewStage) : channels;
  const sealP = shown.seal;
  const flapP = shown.flap;
  const cardP = shown.card;

  const env = SCENE.envelope;
  const sealWax = stationery?.sealColor?.trim() || palette.accent;
  const monogram = (stationery?.sealInitials ?? "").trim().slice(0, 3) || "✦";
  const seal = sealArt(monogram, sealWax, palette.ink);
  const paper = palette.background;
  const liningColour = stationery?.lining?.trim() || undefined;

  const backdropLayer = settings?.layers?.backdrop;
  const bodyLayer = settings?.layers?.body;
  const flapLayer = settings?.layers?.flap;
  const linerLayer = settings?.layers?.liner;
  const sealLayer = settings?.layers?.seal;

  const pageSize = page ? pageSizeOf(page) : null;
  const contentScale = pageSize
    ? Math.min(SCENE.card.w / pageSize.width, SCENE.card.h / pageSize.height)
    : 1;
  const contentOffsetX = pageSize ? (SCENE.card.w - pageSize.width * contentScale) / 2 : 0;
  const contentOffsetY = pageSize ? (SCENE.card.h - pageSize.height * contentScale) / 2 : 0;
  const settledTime = page ? Math.max(900, pageEntranceEnd(page)) : 1200;

  const cardContent = useMemo(() => {
    if (!page) return null;
    return (
      <DesignPageView
        page={page}
        time={settledTime}
        imageUrls={imageUrls}
        guestName={guestName}
        rtl={rtl}
        reducedMotion={reducedMotion}
        scrollActivationTime={0}
      />
    );
  }, [page, settledTime, imageUrls, guestName, rtl, reducedMotion]);

  const artboardStyle: CSSProperties = {
    position: "absolute",
    width: DESIGN_WIDTH,
    height: DESIGN_HEIGHT,
    transform: `scale(${scale || 0.0001})`,
    transformOrigin: "top left",
    visibility: scale ? "visible" : "hidden",
  };

  return (
    <div
      ref={boxRef}
      className={cn("absolute inset-0 overflow-hidden", className)}
      data-interactive-opening={settings?.scene ?? "envelope-seal"}
      data-stage={stage}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: DESIGN_WIDTH,
          height: DESIGN_HEIGHT,
          transform: scale
            ? `translate(${`calc(50% - ${DESIGN_WIDTH * scale * 0.5}px)`}, ${`calc(50% - ${DESIGN_HEIGHT * scale * 0.5}px)`}) scale(${scale})`
            : "scale(0.0001)",
          transformOrigin: "top left",
          visibility: scale ? "visible" : "hidden",
        }}
      >
        {/* ---------------- backdrop ---------------- */}
        <BackdropLayer
          asset={backdropLayer}
          url={backdropLayer ? imageUrls[backdropLayer.storageId] : undefined}
          fallback={background}
        />
        {/* Stage lighting: one light source, consistent for every layer. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 80% at 50% 34%, rgba(255,255,255,0.10), transparent 46%), radial-gradient(140% 100% at 50% 120%, rgba(0,0,0,0.5), transparent 60%)",
          }}
        />

        <div
          aria-hidden
          className="paper-grain pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-multiply"
        />

        {/* ---------------- the envelope itself ---------------- */}
        <div
          className="absolute"
          style={{
            left: env.x,
            top: env.y,
            width: env.w,
            height: env.h,
            perspective: 1700,
            transform: `translateY(${cardP * 60}px)`,
            filter: "drop-shadow(0 46px 70px rgba(0,0,0,0.42))",
          }}
        >
          {/* Interior and pocket back */}
          <svg
            viewBox={`0 0 ${env.w} ${env.h}`}
            className="absolute inset-0 h-full w-full"
            aria-hidden
          >
            <defs>
              <linearGradient id={`${uid}-paper`} x1="0" y1="0" x2="0.3" y2="1">
                <stop offset="0" stopColor={paper} />
                <stop offset="0.55" stopColor={paper} />
                <stop offset="1" stopColor={paper} stopOpacity="0.86" />
              </linearGradient>
              <linearGradient id={`${uid}-well`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="rgba(0,0,0,0.5)" />
                <stop offset="0.34" stopColor="rgba(0,0,0,0.12)" />
                <stop offset="1" stopColor="rgba(0,0,0,0.26)" />
              </linearGradient>
              <pattern
                id={`${uid}-liner`}
                width="46"
                height="46"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <rect width="46" height="46" fill={liningColour ?? paper} />
                <circle cx="23" cy="23" r="7" fill="rgba(255,255,255,0.35)" />
                <circle cx="0" cy="0" r="3" fill="rgba(0,0,0,0.12)" />
                <circle cx="46" cy="46" r="3" fill="rgba(0,0,0,0.12)" />
              </pattern>
              <filter id={`${uid}-grain`}>
                <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
                <feColorMatrix type="saturate" values="0" />
              </filter>
            </defs>
            {/* Outer shell */}
            <rect width={env.w} height={env.h} rx="10" fill={`url(#${uid}-paper)`} />
            {/* Printed liner inside the pocket */}
            <rect
              x="14"
              y="14"
              width={env.w - 28}
              height={env.h - 28}
              rx="7"
              fill={`url(#${uid}-liner)`}
              opacity={liningColour ? 0.9 : 0.5}
            />
            {/* The pocket sits in shadow beneath the flap */}
            <rect
              x="14"
              y="14"
              width={env.w - 28}
              height={env.h - 28}
              rx="7"
              fill={`url(#${uid}-well)`}
            />
            <rect
              width={env.w}
              height={env.h}
              rx="10"
              filter={`url(#${uid}-grain)`}
              opacity="0.1"
              style={{ mixBlendMode: "multiply" }}
            />
            <rect
              x="0.5"
              y="0.5"
              width={env.w - 1}
              height={env.h - 1}
              rx="10"
              fill="none"
              stroke="rgba(0,0,0,0.22)"
            />
          </svg>

          {bodyLayer && (
            <LayerImage
              className="absolute inset-0 h-full w-full rounded-[10px] object-cover"
              url={bodyLayer.storageId ? imageUrls[bodyLayer.storageId] : undefined}
              alt=""
            />
          )}
        </div>

        {/* ---------------- the real invitation ---------------- */}
        {variant === "full" && page && (
          <div
            data-opening-card
            className="absolute overflow-hidden"
            style={{
              left: SCENE.card.x,
              top: SCENE.card.y,
              width: SCENE.card.w,
              height: SCENE.card.h,
              borderRadius: 8,
              background: page.background,
              transform: `translateY(${SCENE.cardRise * cardP}px) scale(${1 + SCENE.cardGrow * cardP})`,
              transformOrigin: "50% 50%",
              boxShadow: `0 ${Math.round(26 - cardP * 12)}px ${Math.round(60 - cardP * 24)}px rgba(0,0,0,${0.34 - cardP * 0.14})`,
              willChange: "transform",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: contentOffsetX,
                top: contentOffsetY,
                width: pageSize?.width,
                height: pageSize?.height,
                transform: `scale(${contentScale})`,
                transformOrigin: "top left",
              }}
            >
              {cardContent}
            </div>
            {!pinned && (
              <button
                type="button"
                aria-label={
                  stage === "presented" ? "Open the invitation" : "Pull the invitation out"
                }
                onClick={activate}
                onPointerDown={onGesturePointerDown("card")}
                onPointerMove={onGesturePointerMove}
                onPointerUp={onGesturePointerUp}
                onPointerCancel={onGesturePointerUp}
                className="absolute inset-0 cursor-grab active:cursor-grabbing"
                style={{ touchAction: "none" }}
              />
            )}
          </div>
        )}

        {/* ---------------- pocket wall (in front of the card) ------------- */}
        <div
          aria-hidden
          className="absolute"
          style={{
            left: env.x,
            top: SCENE.wallTop,
            width: env.w,
            height: env.y + env.h - SCENE.wallTop,
            transform: `translateY(${cardP * 60}px)`,
            pointerEvents: "none",
          }}
        >
          <svg
            viewBox={`0 0 ${env.w} ${env.h + env.y - SCENE.wallTop}`}
            className="h-full w-full"
          >
            <defs>
              <linearGradient id={`${uid}-wall`} x1="0" y1="0" x2="0.2" y2="1">
                <stop offset="0" stopColor={paper} />
                <stop offset="1" stopColor="rgba(0,0,0,0.06)" stopOpacity="0.5" />
              </linearGradient>
              <linearGradient id={`${uid}-wallshade`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="rgba(0,0,0,0.3)" />
                <stop offset="0.18" stopColor="rgba(0,0,0,0)" />
              </linearGradient>
              <filter id={`${uid}-grain2`}>
                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" />
                <feColorMatrix type="saturate" values="0" />
              </filter>
            </defs>
            <rect width={env.w} height={env.h + env.y - SCENE.wallTop} rx="10" fill={paper} />
            <rect width={env.w} height={env.h + env.y - SCENE.wallTop} rx="10" fill={`url(#${uid}-wall)`} />
            <rect
              width={env.w}
              height="120"
              fill={`url(#${uid}-wallshade)`}
            />
            <rect
              width={env.w}
              height={env.h + env.y - SCENE.wallTop}
              rx="10"
              filter={`url(#${uid}-grain2)`}
              opacity="0.1"
              style={{ mixBlendMode: "multiply" }}
            />
            {/* Fold seams converging on the centre, as on a real pocket. */}
            <path
              d={`M0,${env.h + env.y - SCENE.wallTop} L${env.w / 2},96`}
              stroke="rgba(0,0,0,0.14)"
              fill="none"
            />
            <path
              d={`M${env.w},${env.h + env.y - SCENE.wallTop} L${env.w / 2},96`}
              stroke="rgba(0,0,0,0.14)"
              fill="none"
            />
            <path d={`M0,2 L${env.w},2`} stroke="rgba(255,255,255,0.5)" fill="none" />
          </svg>
        </div>

        {/* ---------------- flap, hinged along the envelope's top edge ------ */}
        <div
          className="absolute"
          style={{
            left: env.x,
            top: env.y,
            width: env.w,
            height: SCENE.flapH,
            perspective: 1700,
            transform: `translateY(${cardP * 60}px)`,
            pointerEvents: !pinned && stage === "unsealed" && !interactiveBusy(state.stage) ? "auto" : "none",
            opacity: 1 - cardP,
          }}
        >
          <button
            type="button"
            aria-label="Lift the flap"
            disabled={pinned}
            onPointerDown={onGesturePointerDown("flap")}
            onPointerMove={onGesturePointerMove}
            onPointerUp={onGesturePointerUp}
            onPointerCancel={onGesturePointerUp}
            onClick={undefined}
            className="absolute inset-0 border-0 bg-transparent p-0"
            style={{
              transformOrigin: "50% 0%",
              transform: `rotateX(${-flapP * 158}deg)`,
              transformStyle: "preserve-3d",
              touchAction: "none",
              cursor: canGesture("flap") ? "grab" : "default",
            }}
          >
            {/* Front of the flap: paper */}
            <span
              aria-hidden
              className="absolute inset-0"
              style={{ backfaceVisibility: "hidden" }}
            >
              <svg viewBox={`0 0 ${env.w} ${SCENE.flapH}`} className="h-full w-full">
                <defs>
                  <linearGradient id={`${uid}-flap`} x1="0" y1="0" x2="0.25" y2="1">
                    <stop offset="0" stopColor={paper} />
                    <stop offset="1" stopColor="rgba(0,0,0,0.1)" stopOpacity="0.75" />
                  </linearGradient>
                  <filter id={`${uid}-grain3`}>
                    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
                    <feColorMatrix type="saturate" values="0" />
                  </filter>
                </defs>
                <path
                  d={`M0,0 H${env.w} L${env.w / 2 + 4},${SCENE.flapH - 14} Q${env.w / 2},${SCENE.flapH} ${env.w / 2 - 4},${SCENE.flapH - 14} Z`}
                  fill={paper}
                />
                <path
                  d={`M0,0 H${env.w} L${env.w / 2 + 4},${SCENE.flapH - 14} Q${env.w / 2},${SCENE.flapH} ${env.w / 2 - 4},${SCENE.flapH - 14} Z`}
                  fill={`url(#${uid}-flap)`}
                />
                <path
                  d={`M0,0 H${env.w} L${env.w / 2 + 4},${SCENE.flapH - 14} Q${env.w / 2},${SCENE.flapH} ${env.w / 2 - 4},${SCENE.flapH - 14} Z`}
                  filter={`url(#${uid}-grain3)`}
                  opacity="0.1"
                  style={{ mixBlendMode: "multiply" }}
                />
                {/* The crease the flap folds on */}
                <path d="M0,6 H1000" transform="scale(0.74,1)" stroke="rgba(0,0,0,0.18)" fill="none" />
              </svg>
            </span>

            {/* Back of the flap: the liner the guest uncovers */}
            <span
              aria-hidden
              className="absolute inset-0"
              style={{ transform: "rotateX(180deg)", backfaceVisibility: "hidden" }}
            >
              <svg viewBox={`0 0 ${env.w} ${SCENE.flapH}`} className="h-full w-full">
                <defs>
                  <pattern
                    id={`${uid}-liner2`}
                    width="46"
                    height="46"
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(45)"
                  >
                    <rect width="46" height="46" fill={liningColour ?? paper} />
                    <circle cx="23" cy="23" r="7" fill="rgba(255,255,255,0.35)" />
                    <circle cx="0" cy="0" r="3" fill="rgba(0,0,0,0.12)" />
                    <circle cx="46" cy="46" r="3" fill="rgba(0,0,0,0.12)" />
                  </pattern>
                </defs>
                <path
                  d={`M0,0 H${env.w} L${env.w / 2 + 4},${SCENE.flapH - 14} Q${env.w / 2},${SCENE.flapH} ${env.w / 2 - 4},${SCENE.flapH - 14} Z`}
                  fill={`url(#${uid}-liner2)`}
                  opacity={liningColour ? 0.95 : 0.7}
                />
                <path
                  d={`M14,14 H${env.w - 14} L${env.w / 2 + 4},${SCENE.flapH - 24} Q${env.w / 2},${SCENE.flapH - 12} ${env.w / 2 - 4},${SCENE.flapH - 24} Z`}
                  fill="none"
                  stroke={palette.accent}
                  strokeOpacity="0.5"
                  strokeWidth="2"
                />
              </svg>
            </span>

            {flapLayer && (
              <LayerImage
                className="absolute inset-0 h-full w-full object-cover"
                style={{
                  clipPath: `polygon(0 0, 100% 0, ${env.w / 2 + 4}px ${SCENE.flapH - 14}px, 50% 100%, ${env.w / 2 - 4}px ${SCENE.flapH - 14}px)`,
                }}
                url={flapLayer.storageId ? imageUrls[flapLayer.storageId] : undefined}
                alt=""
              />
            )}
          </button>
        </div>

        {/* ---------------- wax seal ---------------- */}
        {!pinned && stage === "sealed" && (
          <button
            type="button"
            aria-label="Tap the seal to begin"
            onClick={activate}
            disabled={interactiveBusy(state.stage)}
            className="absolute grid place-items-center rounded-full border-0 bg-transparent p-0"
            style={{
              left: SCENE.seal.cx - 96,
              top: SCENE.seal.cy - 96,
              width: 192,
              height: 192,
              cursor: "pointer",
              touchAction: "manipulation",
              filter: `drop-shadow(0 10px 16px rgba(0,0,0,${0.4 - sealP * 0.3}))`,
            }}
          >
            <svg viewBox="-96 -96 192 192" className="h-full w-full overflow-visible">
              <defs>
                <radialGradient id={`${uid}-wax-g`} cx="0.36" cy="0.3" r="0.85">
                  <stop offset="0" stopColor="rgba(255,255,255,0.5)" />
                  <stop offset="0.35" stopColor={sealWax} />
                  <stop offset="1" stopColor="rgba(0,0,0,0.55)" />
                </radialGradient>
                <radialGradient id={`${uid}-wax-hi`}>
                  <stop offset="0" stopColor="rgba(255,255,255,0.55)" />
                  <stop offset="1" stopColor="rgba(255,255,255,0)" />
                </radialGradient>
                <clipPath id={`${uid}-left`}>
                  <path d={seal.leftClip} />
                </clipPath>
                <clipPath id={`${uid}-right`}>
                  <path d={seal.rightClip} />
                </clipPath>
              </defs>
              <g
                clipPath={`url(#${uid}-left)`}
                style={{
                  transform: `translate(${-sealP * 104}px, ${sealP * 64}px) rotate(${-sealP * 42}deg)`,
                  transformOrigin: "0px 0px",
                  opacity: 1 - clamp01((sealP - 0.62) / 0.38),
                }}
              >
                <g fill={`url(#${uid}-wax-g)`} />
                {seal.art}
                <g style={{ fill: sealWax }}>{null}</g>
              </g>
              <g
                clipPath={`url(#${uid}-right)`}
                style={{
                  transform: `translate(${sealP * 104}px, ${sealP * 58}px) rotate(${sealP * 38}deg)`,
                  transformOrigin: "0px 0px",
                  opacity: 1 - clamp01((sealP - 0.62) / 0.38),
                }}
              >
                {seal.art}
              </g>
              {/* Wax crumbs thrown clear of the fracture */}
              {[
                { a: -34, d: 118, r: 5 },
                { a: 28, d: 130, r: 4 },
                { a: -12, d: 150, r: 3.4 },
                { a: 44, d: 96, r: 3 },
                { a: -52, d: 92, r: 3.6 },
              ].map((crumb, index) => (
                <circle
                  key={index}
                  cx={Math.sin((crumb.a * Math.PI) / 180) * crumb.d * sealP}
                  cy={Math.cos((crumb.a * Math.PI) / 180) * crumb.d * sealP + sealP * 70}
                  r={crumb.r}
                  fill={sealWax}
                  opacity={sealP > 0.05 ? 1 - clamp01((sealP - 0.55) / 0.45) : 0}
                />
              ))}
            </svg>
          </button>
        )}

        {/* The host's own seal artwork, when supplied, splits the same way. */}
        {sealLayer && !pinned && stage !== "presented" && (
          <div
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              left: SCENE.seal.cx - 96,
              top: SCENE.seal.cy - 96,
              width: 192,
              height: 192,
            }}
          >
            <LayerImage
              className="h-full w-full object-contain"
              style={{
                opacity: 1 - clamp01((sealP - 0.62) / 0.38),
                transform: `translateX(${-sealP * 40}px) rotate(${-sealP * 24}deg)`,
                clipPath: "polygon(0 0, 52% 0, 48% 100%, 0 100%)",
              }}
              url={sealLayer.storageId ? imageUrls[sealLayer.storageId] : undefined}
              alt=""
            />
            <LayerImage
              className="h-full w-full object-contain"
              style={{
                opacity: 1 - clamp01((sealP - 0.62) / 0.38),
                transform: `translateX(${sealP * 40}px) rotate(${sealP * 24}deg)`,
                clipPath: "polygon(52% 0, 100% 0, 100% 100%, 48% 100%)",
              }}
              url={sealLayer.storageId ? imageUrls[sealLayer.storageId] : undefined}
              alt=""
            />
          </div>
        )}

        {/* The liner artwork, when supplied, covers the flap's inner face. */}
        {linerLayer && (
          <div
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              left: env.x,
              top: env.y,
              width: env.w,
              height: SCENE.flapH,
              transform: `translateY(${cardP * 60}px) rotateX(${-flapP * 158}deg)`,
              transformOrigin: "50% 0%",
              opacity: (1 - cardP) * flapP,
            }}
          >
            <LayerImage
              className="h-full w-full object-cover"
              url={linerLayer.storageId ? imageUrls[linerLayer.storageId] : undefined}
              alt=""
            />
          </div>
        )}
      </div>

      {/* ---------------- guest guidance ---------------- */}
      {hint && (
        <button
          type="button"
          onClick={activate}
          className="absolute bottom-[7%] left-1/2 z-20 -translate-x-1/2 rounded-full border px-6 py-3 font-ui text-[0.66rem] uppercase tracking-[0.24em] shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur-sm transition-transform duration-200 hover:scale-[1.02] focus-visible:outline-none"
          style={{
            borderColor: `rgba(127, 127, 127, 0.35)`,
            background: `rgba(255, 255, 255, 0.86)`,
            color: palette.ink,
          }}
          data-hint
        >
          {hint}
          <span
            aria-hidden
            className="ml-3 inline-block h-1.5 w-1.5 rounded-full align-middle"
            style={{ background: palette.accent }}
          />
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Layer artwork                                                              */
/* -------------------------------------------------------------------------- */

/**
 * One assigned asset. The built-in vector art stays underneath until the image
 * has actually decoded, so a slow or broken upload can never flash a blank
 * layer — the worst case is that the built-in artwork simply remains.
 */
function LayerImage({
  url,
  className,
  style,
  alt = "",
}: {
  url?: string;
  className?: string;
  style?: CSSProperties;
  alt?: string;
}) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!url || failed) return null;
  return (
    <img
      src={url}
      alt={alt}
      className={className}
      style={{ ...style, opacity: (style?.opacity ?? 1) * (ready ? 1 : 0), transition: "opacity 240ms ease" }}
      onLoad={() => setReady(true)}
      onError={() => setFailed(true)}
      data-layer-image
    />
  );
}

function BackdropLayer({
  asset,
  url,
  fallback,
}: {
  asset?: { storageId: string; kind: "image" | "video" };
  url?: string;
  fallback: string;
}) {
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  if (!asset || !url || failed) {
    return (
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: fallback }}
        data-backdrop="colour"
      />
    );
  }

  if (asset.kind === "video") {
    return (
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src={url}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onError={() => setFailed(true)}
        data-backdrop="video"
        aria-hidden
      />
    );
  }

  return (
    <img
      className="absolute inset-0 h-full w-full object-cover"
      src={url}
      alt=""
      aria-hidden
      data-backdrop="image"
      style={{ opacity: ready ? 1 : 0, transition: "opacity 300ms ease" }}
      onLoad={() => setReady(true)}
      onError={() => setFailed(true)}
    />
  );
}

export { stageFromProgress };