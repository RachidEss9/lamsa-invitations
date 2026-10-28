import { DesignPageView } from "@/components/invitation/DesignPageView";
import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  pageSizeOf,
  type DesignPage,
  type EasingId,
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
  type InteractiveEvent,
  type InteractiveOpeningSettings,
  type InteractiveStage,
} from "@/lib/opening-interactive";
import { OPENING_REFERENCE } from "@/lib/opening-artwork";
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
 * Every box below is the reference artwork's own geometry, measured from the
 * supplied layers and scaled by `OPENING_REFERENCE.scale` — the envelope keeps
 * the landscape proportions of the reference instead of being stretched into
 * a portrait box. The flap hinges on the envelope's top edge and points at
 * `flapTip`, where the wax sits.
 */
const S = OPENING_REFERENCE.scale;
/** Reference rows → artboard pixels. */
const refY = (rows: number) => rows * S;

const SCENE = {
  /** The reference board: one scene wide, laid at the top of the artboard. */
  board: { w: 1000, h: refY(513) },
  /** Opaque pocket band (reference rows 116…513). */
  interior: { top: refY(116), h: refY(397) },
  /** Contact detail at the flap's tip (reference rows 307…513). */
  wall: { top: refY(307), h: refY(206) },
  /** The lid: the flap triangle, hinged on the envelope's top edge. */
  lid: { top: refY(89), h: refY(360 - 89) },
  /** The pocket front: everything below the flap's point. */
  pocket: { top: refY(360) },
  card: { x: 342, y: 350, w: 315, h: 560 },
  /** How far the card rises and how much it grows when presented. */
  cardRise: -260,
  cardGrow: 0.25,
  /** The pressed wax, at its place on the flap. */
  seal: { cx: refY(367), cy: refY(316), r: Math.round(refY(104) / 2) },
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
  /** The suite's paper: the colour the built-in envelope stock is drawn in. */
  background: string;
  /** What sits behind everything when no backdrop asset is assigned. */
  stageBackground?: string;
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

/*
 * The envelope, its flap, its tissue and its wax are the supplied reference
 * layers (see `@/lib/opening-artwork`) rather than drawn shapes: the seal is
 * the pressed wax itself, broken into its two real halves.
 */

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
  stageBackground,
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
  const [fit, setFit] = useState({ w: 0, h: 0 });

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
      setFit({ w: width, h: height });
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
      easing: EasingId,
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

  // The cover variant ends the moment the flap has opened — that open state is
  // the hand-off to the page underneath.
  useEffect(() => {
    if (variant === "cover" && state.stage === "open" && previewStage == null) finish();
  }, [variant, state.stage, previewStage, finish]);

  /* --- gestures -------------------------------------------------------- */

  const pinned = previewStage != null;
  const stage = previewStage ?? state.stage;
  const hint = previewStage != null ? null : interactiveHint(state.stage, variant);

  // Pure over an explicit stage, so it is safe to call while rendering.
  const canGesture = (channel: "flap" | "card", currentStage: InteractiveStage) => {
    if (pinned || reducedMotion) return false;
    if (interactiveBusy(currentStage)) return false;
    return channel === "flap" ? currentStage === "unsealed" : currentStage === "open";
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

  const onGesturePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    const channel =
      (event.currentTarget.dataset.gesture as "flap" | "card" | undefined) ?? "flap";
    if (!canGesture(channel, stateRef.current.stage)) return;
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

  const sealWax = stationery?.sealColor?.trim() || palette.accent;
  const paper = palette.background;
  const liningColour = stationery?.lining?.trim() || undefined;

  const backdropLayer = settings?.layers?.backdrop;
  const bodyLayer = settings?.layers?.body;
  const flapLayer = settings?.layers?.flap;
  const linerLayer = settings?.layers?.liner;
  const sealLayer = settings?.layers?.seal;
  const sealUrl = sealLayer?.storageId ? imageUrls[sealLayer.storageId] : undefined;

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
    left: fit.w ? (fit.w - DESIGN_WIDTH * scale) / 2 : 0,
    top: fit.h ? (fit.h - DESIGN_HEIGHT * scale) / 2 : 0,
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
      <div style={artboardStyle}>
        {/* ---------------- backdrop ---------------- */}
        <BackdropLayer
          asset={backdropLayer}
          url={backdropLayer ? imageUrls[backdropLayer.storageId] : undefined}
          fallback={stageBackground ?? background}
        />
        {/* The reference stage: the same photograph with the envelope removed,
            continued below the board by the floor colour it ends in. */}
        {!backdropLayer && (
          <>
            <img
              src={OPENING_REFERENCE.images.ground}
              alt=""
              aria-hidden
              className="pointer-events-none absolute left-0 top-0"
              data-ref-layer="ground"
              style={{ width: SCENE.board.w, height: SCENE.board.h }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute left-0"
              data-ref-layer="floor"
              style={{
                top: SCENE.board.h,
                width: SCENE.board.w,
                height: DESIGN_HEIGHT - SCENE.board.h,
                background: OPENING_REFERENCE.floor,
              }}
            />
          </>
        )}
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

        {/* ------------- the reference envelope's pocket ------------------- */}
        {/* Its contact shadow, cut from the shell mask. */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 top-0"
          data-ref-layer="shell-shadow"
          style={{
            left: 0,
            top: 0,
            width: SCENE.board.w,
            height: SCENE.board.h,
            background: "rgba(0,0,0,0.5)",
            opacity: 0.2,
            transform: `translateY(${cardP * 60}px)`,
            maskImage: `url(${OPENING_REFERENCE.images.mask})`,
            WebkitMaskImage: `url(${OPENING_REFERENCE.images.mask})`,
            maskSize: "100% 100%",
            WebkitMaskSize: "100% 100%",
          }}
        />
        {/* The opaque pocket band, with the flap lifted out of it. */}
        <div
          aria-hidden
          className="absolute overflow-hidden"
          data-ref-layer="interior"
          style={{
            left: 0,
            top: SCENE.interior.top,
            width: SCENE.board.w,
            height: SCENE.interior.h,
            transform: `translateY(${cardP * 60}px)`,
          }}
        >
          <img
            src={OPENING_REFERENCE.images.interior}
            alt=""
            className="absolute left-0"
            style={{
              top: -SCENE.interior.top,
              width: SCENE.board.w,
              height: SCENE.board.h,
            }}
          />
        </div>

        {/* The envelope outside the flap — its shoulders and its pocket —
            so opening the flap shows the real paper underneath. */}
        {["left", "right"].map((side) => (
          <div
            key={side}
            aria-hidden
            className="absolute left-0 top-0"
            data-ref-layer={`shell-${side}`}
            style={{
              width: SCENE.board.w,
              height: SCENE.board.h,
              transform: `translateY(${cardP * 60}px)`,
              clipPath:
                side === "left"
                  ? `polygon(0 ${SCENE.lid.top}px, 50% ${SCENE.pocket.top}px, 50% ${SCENE.board.h}px, 0 ${SCENE.board.h}px)`
                  : `polygon(100% ${SCENE.lid.top}px, 100% ${SCENE.board.h}px, 50% ${SCENE.board.h}px, 50% ${SCENE.pocket.top}px)`,
            }}
          >
            <img
              src={OPENING_REFERENCE.images.body}
              alt=""
              className="absolute left-0"
              style={{ top: 0, width: SCENE.board.w, height: SCENE.board.h }}
            />
            {bodyLayer && (
              <LayerImage
                className="absolute left-0"
                style={{ top: 0, width: SCENE.board.w, height: SCENE.board.h }}
                url={bodyLayer.storageId ? imageUrls[bodyLayer.storageId] : undefined}
                alt=""
              />
            )}
          </div>
        ))}

        {/* ---------------- the real invitation ---------------- */}
        {variant === "full" && page && (
          <div
            className="absolute overflow-hidden"
            style={{ left: 0, top: 0, width: SCENE.board.w, height: SCENE.board.h }}
          >
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
            {/*
              The reference card the invitation is printed on. It faces the
              guest while the card is being pulled, then gives way to the real
              invitation underneath the moment the pull is complete.
            */}
            <div
              aria-hidden
              data-card-cover
              className="absolute inset-0"
              style={{
                opacity: cardP >= 0.999 ? 0 : 1,
                transition: "opacity 420ms ease",
                pointerEvents: "none",
              }}
            >
              <img
                src={OPENING_REFERENCE.images.revealFrame}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              <img
                src={OPENING_REFERENCE.images.revealCard}
                alt=""
                className="absolute"
                style={{
                  left: `${OPENING_REFERENCE.reveal.card.x * 100}%`,
                  top: `${OPENING_REFERENCE.reveal.card.y * 100}%`,
                  width: `${OPENING_REFERENCE.reveal.card.w * 100}%`,
                  height: `${OPENING_REFERENCE.reveal.card.h * 100}%`,
                  objectFit: "cover",
                }}
              />
            </div>
            {!pinned && (
              <button
                type="button"
                aria-label={
                  stage === "presented" ? "Open the invitation" : "Pull the invitation out"
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    activate();
                  }
                }}
                data-gesture="card"
                onPointerDown={onGesturePointerDown}
                onPointerMove={onGesturePointerMove}
                onPointerUp={onGesturePointerUp}
                onPointerCancel={onGesturePointerUp}
                className="absolute inset-0 cursor-grab active:cursor-grabbing"
                style={{ touchAction: "none" }}
              />
            )}
            </div>
          </div>
        )}

        {/* ------------- the pocket front, standing before the card -------- */}
        <div
          aria-hidden
          className="absolute overflow-hidden"
          data-ref-layer="pocket"
          style={{
            left: 0,
            top: SCENE.pocket.top,
            width: SCENE.board.w,
            height: SCENE.board.h - SCENE.pocket.top,
            transform: `translateY(${cardP * 60}px)`,
            pointerEvents: "none",
            filter: "drop-shadow(0 46px 70px rgba(0,0,0,0.42))",
          }}
        >
          <img
            src={OPENING_REFERENCE.images.body}
            alt=""
            className="absolute left-0"
            style={{ top: -SCENE.pocket.top, width: SCENE.board.w, height: SCENE.board.h }}
          />
          {/* The host's own envelope artwork, when one is assigned. */}
          {bodyLayer && (
            <LayerImage
              className="absolute left-0"
              style={{ top: -SCENE.pocket.top, width: SCENE.board.w, height: SCENE.board.h }}
              url={bodyLayer.storageId ? imageUrls[bodyLayer.storageId] : undefined}
              alt=""
            />
          )}
        </div>

        {/* ------------- the flap, hinged on the envelope's top edge ------- */}
        <div
          data-ref-layer="lid"
          className="absolute overflow-hidden"
          style={{
            left: 0,
            top: SCENE.lid.top,
            width: SCENE.board.w,
            height: SCENE.lid.h,
            /* The flap triangle, straight from the reference silhouette. */
            clipPath: "polygon(0 0, 100% 0, 50% 100%)",
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
            data-gesture="flap"
            onPointerDown={onGesturePointerDown}
            onPointerMove={onGesturePointerMove}
            onPointerUp={onGesturePointerUp}
            onPointerCancel={onGesturePointerUp}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                activate();
              }
            }}
            className="absolute inset-0 border-0 bg-transparent p-0"
            style={{
              transformOrigin: "50% 0%",
              transform: `rotateX(${-flapP * 158}deg)`,
              transformStyle: "preserve-3d",
              touchAction: "none",
              cursor: canGesture("flap", stage) ? "grab" : "default",
            }}
          >
            {/* Front of the flap: the reference envelope, cut to the flap. */}
            <span
              aria-hidden
              className="absolute inset-0 overflow-hidden"
              style={{ backfaceVisibility: "hidden" }}
            >
              <img
                src={OPENING_REFERENCE.images.body}
                alt=""
                className="absolute left-0"
                style={{ top: -SCENE.lid.top, width: SCENE.board.w, height: SCENE.board.h }}
              />
              <img
                src={OPENING_REFERENCE.images.flap}
                alt=""
                className="absolute left-0"
                style={{ top: -SCENE.lid.top, width: SCENE.board.w, height: refY(124) }}
              />
              <img
                src={OPENING_REFERENCE.images.wall}
                alt=""
                className="absolute left-0"
                style={{
                  top: SCENE.wall.top - SCENE.lid.top,
                  width: SCENE.board.w,
                  height: SCENE.wall.h,
                }}
              />
              {flapLayer && (
                <LayerImage
                  className="absolute left-0"
                  style={{ top: -SCENE.lid.top, width: SCENE.board.w, height: SCENE.board.h }}
                  url={flapLayer.storageId ? imageUrls[flapLayer.storageId] : undefined}
                  alt=""
                />
              )}
            </span>

            {/* Back of the flap: the tissue the guest uncovers. */}
            <span
              aria-hidden
              className="absolute inset-0 overflow-hidden"
              style={{
                transform: "rotateX(180deg)",
                backfaceVisibility: "hidden",
                background: liningColour ?? paper,
              }}
            >
              <img
                src={OPENING_REFERENCE.images.liner}
                alt=""
                className="absolute left-0"
                style={{ top: -SCENE.lid.top, width: SCENE.board.w, height: refY(122) }}
              />
              {/* The host's own liner artwork, when one is assigned. */}
              {linerLayer && (
                <LayerImage
                  className="absolute left-0"
                  style={{ top: -SCENE.lid.top, width: SCENE.board.w, height: SCENE.board.h }}
                  url={linerLayer.storageId ? imageUrls[linerLayer.storageId] : undefined}
                  alt=""
                />
              )}
            </span>
          </button>
        </div>

        {/* ------------- the sealed envelope: the whole reference ---------- */}
        <img
          src={OPENING_REFERENCE.images.scene}
          alt=""
          aria-hidden
          data-ref-layer="sealed"
          className="pointer-events-none absolute left-0 top-0"
          style={{
            width: SCENE.board.w,
            height: SCENE.board.h,
            /* It lifts away with the flap, leaving the real layers beneath. */
            opacity: 1 - flapP,
          }}
        />

        {/* ---------------- wax seal ---------------- */}
        {!pinned && (stage === "sealed" || stage === "breaking") && (
          <button
            type="button"
            aria-label="Tap the seal to begin"
            onClick={activate}
            disabled={interactiveBusy(state.stage)}
            className="absolute grid place-items-center rounded-full border-0 bg-transparent p-0"
            style={{
              left: SCENE.seal.cx - SCENE.seal.r,
              top: SCENE.seal.cy - SCENE.seal.r,
              width: SCENE.seal.r * 2,
              height: SCENE.seal.r * 2,
              cursor: "pointer",
              touchAction: "manipulation",
              filter: `drop-shadow(0 10px 16px rgba(0,0,0,${0.4 - sealP * 0.3}))`,
            }}
          >
            <svg
              viewBox={`${-SCENE.seal.r} ${-SCENE.seal.r} ${SCENE.seal.r * 2} ${SCENE.seal.r * 2}`}
              className="h-full w-full overflow-visible"
            >
              <defs>
                {/* An uploaded seal is broken down the middle. */}
                <clipPath id={`${uid}-left`}>
                  <rect
                    x={-SCENE.seal.r}
                    y={-SCENE.seal.r}
                    width={SCENE.seal.r}
                    height={SCENE.seal.r * 2}
                  />
                </clipPath>
                <clipPath id={`${uid}-right`}>
                  <rect x={0} y={-SCENE.seal.r} width={SCENE.seal.r} height={SCENE.seal.r * 2} />
                </clipPath>
              </defs>
              {/* The intact seal, straight from the reference, until it cracks. */}
              {sealP === 0 && (
                <image
                  href={sealUrl || OPENING_REFERENCE.images.seal}
                  x={-SCENE.seal.r}
                  y={-SCENE.seal.r}
                  width={SCENE.seal.r * 2}
                  height={SCENE.seal.r * 2}
                  preserveAspectRatio="xMidYMid meet"
                />
              )}
              <g
                style={{
                  transform: `translate(${-sealP * SCENE.seal.r}px, ${sealP * 47}px) rotate(${-sealP * 42}deg)`,
                  transformOrigin: "0px 0px",
                  visibility: sealP === 0 ? "hidden" : "visible",
                  opacity: 1 - clamp01((sealP - 0.62) / 0.38),
                }}
              >
                {sealUrl ? (
                  <image
                    href={sealUrl}
                    x={-SCENE.seal.r}
                    y={-SCENE.seal.r}
                    width={SCENE.seal.r * 2}
                    height={SCENE.seal.r * 2}
                    preserveAspectRatio="xMidYMid meet"
                    clipPath={`url(#${uid}-left)`}
                  />
                ) : (
                  <image
                    href={OPENING_REFERENCE.images.sealLeft}
                    x={-SCENE.seal.r}
                    y={-SCENE.seal.r}
                    width={SCENE.seal.r * 2}
                    height={SCENE.seal.r * 2}
                  />
                )}
              </g>
              <g
                style={{
                  transform: `translate(${sealP * SCENE.seal.r}px, ${sealP * 43}px) rotate(${sealP * 38}deg)`,
                  transformOrigin: "0px 0px",
                  visibility: sealP === 0 ? "hidden" : "visible",
                  opacity: 1 - clamp01((sealP - 0.62) / 0.38),
                }}
              >
                {sealUrl ? (
                  <image
                    href={sealUrl}
                    x={-SCENE.seal.r}
                    y={-SCENE.seal.r}
                    width={SCENE.seal.r * 2}
                    height={SCENE.seal.r * 2}
                    preserveAspectRatio="xMidYMid meet"
                    clipPath={`url(#${uid}-right)`}
                  />
                ) : (
                  <image
                    href={OPENING_REFERENCE.images.sealRight}
                    x={-SCENE.seal.r}
                    y={-SCENE.seal.r}
                    width={SCENE.seal.r * 2}
                    height={SCENE.seal.r * 2}
                  />
                )}
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
  const baseOpacity = typeof style?.opacity === "number" ? style.opacity : 1;
  return (
    <img
      src={url}
      alt={alt}
      className={className}
      style={{ ...style, opacity: baseOpacity * (ready ? 1 : 0), transition: "opacity 240ms ease" }}
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
      onError={() => setFailed(true)}    />
  );
}
