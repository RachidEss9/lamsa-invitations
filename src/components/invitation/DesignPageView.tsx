import {
  coveredElementIds,
  elementStyleAt,
  pageBackgroundStyle,
  pageSizeOf,
  personalize,
  type DesignElement,
  type DesignPage,
  type RevealConfig,
} from "@/lib/design";
import {
  effectFilter,
  gradientCss,
  insetShadow,
  isHexColour,
  outlineWidth,
} from "@/lib/effects";
import { ensureDesignFonts, fontFamilyFor } from "@/lib/fonts";
import { frameById } from "@/lib/frames";
import { cn } from "@/lib/utils";
import { FrameArt } from "./FrameArt";
import { Motif } from "./Motif";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function easeOut(t: number) {
  return 1 - Math.pow(1 - clamp(t, 0, 1), 3);
}

/* -------------------------------------------------------------------------- */
/* Shape art                                                                  */
/* -------------------------------------------------------------------------- */

const SHAPE_PATHS: Record<string, string> = {
  heart:
    "M50 89 C22 69 4 52 4 34 C4 18 16 8 30 8 C40 8 47 14 50 22 C53 14 60 8 70 8 C84 8 96 18 96 34 C96 52 78 69 50 89Z",
  arch: "M6 97 L6 47 C6 23 26 4 50 4 C74 4 94 23 94 47 L94 97 Z",
  leaf: "M50 3 C84 20 95 55 50 97 C5 55 16 20 50 3 Z",
  star:
    "M50 3 L61.8 36.5 L97 38.2 L69.3 59.8 L78.5 94 L50 74.2 L21.5 94 L30.7 59.8 L3 38.2 L38.2 36.5 Z",
  triangle: "M50 4 L98 96 L2 96 Z",
  diamond: "M50 2 L98 50 L50 98 L2 50 Z",
  hexagon: "M25 3 L75 3 L98 50 L75 97 L25 97 L2 50 Z",
  shield: "M50 3 C68 12 84 14 96 14 L96 48 C96 76 76 92 50 98 C24 92 4 76 4 48 L4 14 C16 14 32 12 50 3 Z",
  scallop:
    "M50 3 C60 3 68 8 73 14 C81 11 91 15 95 24 C99 32 96 41 92 47 C97 54 97 65 91 72 C93 81 86 90 77 92 C72 98 62 100 55 96 C50 100 42 100 37 96 C30 100 20 98 15 92 C6 90 -1 81 1 72 C-5 65 -5 54 0 47 C-4 41 -7 32 -3 24 C1 15 11 11 19 14 C24 8 32 3 42 3 Z",
};

function ShapeArt({
  element,
  clipId,
  imageUrl,
}: {
  element: DesignElement;
  clipId?: string;
  imageUrl?: string;
}) {
  const shape = element.shape ?? "rect";
  const fill = element.fill ?? element.color ?? "#161616";
  const stroke = element.stroke;
  const strokeWidth = element.strokeWidth ?? 0;
  const radius = shape === "capsule" ? 50 : (element.radius ?? 0);
  // A gradient is a live paint, not a new shape: the vector path stays
  // identical, so editing the form, stroke or effects never loses detail.
  const gradient = element.effects?.gradient;
  const gradientId = clipId ? `lamsa-gradient-${clipId}` : undefined;
  const gradientActive = Boolean(gradient?.enabled && gradientId && shape !== "frame");
  const shade = gradientActive ? `url(#${gradientId})` : fill;

  // Image-in-shape: the picture is clipped to the vector, not to the box.
  const maskedImage = element.imageInShape && imageUrl;

  // The rule is a horizontal stroke, not a filled box.
  if (shape === "line") {
    return (
      <svg
        aria-hidden
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-full w-full overflow-visible"
      >
        <line
          x1={0}
          y1={50}
          x2={100}
          y2={50}
          stroke={fill}
          strokeWidth={Math.max(0.8, element.h / 2)}
          vectorEffect="non-scaling-stroke"
          style={{ strokeWidth: Math.max(1, element.h) }}
        />
      </svg>
    );
  }

  const path = SHAPE_PATHS[shape];
  const imageScale = Math.max(0.1, element.imageZoom ?? 1);

  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="h-full w-full overflow-visible"
    >
      <defs>
        {path && clipId && (
          <clipPath id={clipId}>
            <path d={path} />
          </clipPath>
        )}
        {gradientActive && gradient && gradientId && (
          <linearGradient
            id={gradientId}
            x1="0"
            y1="0.5"
            x2="1"
            y2="0.5"
            gradientTransform={`rotate(${gradient.angle - 90} 0.5 0.5)`}
          >
            <stop
              offset="0%"
              stopColor={isHexColour(gradient.from) ? gradient.from : "#710014"}
            />
            <stop
              offset="100%"
              stopColor={isHexColour(gradient.to) ? gradient.to : "#c3a469"}
            />
          </linearGradient>
        )}
      </defs>
      {shape === "rect" || shape === "frame" || shape === "capsule" ? (
        maskedImage ? (
          <image
            href={imageUrl}
            width={100}
            height={100}
            preserveAspectRatio="xMidYMid slice"
            x={((1 - 1 / imageScale) * 50).toFixed(3)}
            y={((1 - 1 / imageScale) * 50).toFixed(3)}
            width={100 / imageScale}
            height={100 / imageScale}
            clipPath={clipId ? `url(#${clipId})` : undefined}
            style={{ clipPath: `inset(0 round ${radius}px)` }}
          />
        ) : shape === "frame" ? (
          <rect
            x={0.5}
            y={0.5}
            width={99}
            height={99}
            rx={Math.max(0, radius)}
            fill="transparent"
            stroke={element.frameStrokeOnImage ? stroke ?? "#b38f6f" : "transparent"}
            strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke"
          />
        ) : (
          <rect
            x={0.5}
            y={0.5}
            width={99}
            height={99}
            rx={Math.max(0, radius)}
            fill={shade}
            stroke={stroke}
            strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke"
          />
        )
      ) : shape === "ellipse" ? (
        maskedImage ? (
          <image
            href={imageUrl}
            width={100}
            height={100}
            preserveAspectRatio="xMidYMid slice"
            x={((1 - 1 / imageScale) * 50).toFixed(3)}
            y={((1 - 1 / imageScale) * 50).toFixed(3)}
            width={100 / imageScale}
            height={100 / imageScale}
            clipPath={clipId ? `url(#${clipId})` : undefined}
            style={{ clipPath: "ellipse(50% 50% at 50% 50%)" }}
          />
        ) : (
          <ellipse
            cx={50}
            cy={50}
            rx={49}
            ry={49}
            fill={shade}
            stroke={stroke}
            strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke"
          />
        )
      ) : (
        <>
          {maskedImage && clipId ? (
            <image
              href={imageUrl}
              width={100}
              height={100}
              preserveAspectRatio="xMidYMid slice"
              x={((1 - 1 / imageScale) * 50).toFixed(3)}
              y={((1 - 1 / imageScale) * 50).toFixed(3)}
              width={100 / imageScale}
              height={100 / imageScale}
              clipPath={`url(#${clipId})`}
            />
          ) : (
            <path d={path} fill={shade} />
          )}
          {(strokeWidth > 0 || (element.frameStrokeOnImage && stroke)) && (
            <path
              d={path}
              fill="none"
              stroke={stroke ?? shade}
              strokeWidth={strokeWidth}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </>
      )}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Element art                                                                */
/* -------------------------------------------------------------------------- */

function ElementVisual({
  element,
  imageUrls,
  guestName,
  rtl,
  clipId,
}: {
  element: DesignElement;
  imageUrls: Record<string, string>;
  guestName?: string | null;
  rtl?: boolean;
  clipId: string;
}) {
  if (element.kind === "text") {
    const direction =
      element.direction === "rtl"
        ? "rtl"
        : element.direction === "ltr"
          ? "ltr"
          : rtl
            ? "rtl"
            : "ltr";
    const transform =
      element.textTransform ?? (element.uppercase ? "uppercase" : "none");
    const borderWidth = element.textBorderWidth ?? 0;
    const gradient = element.effects?.gradient;
    const gradientText = Boolean(gradient?.enabled);
    const glyphStroke = outlineWidth(element.effects);
    const outline = element.effects?.outline;
    return (
      <div
        className="flex h-full w-full overflow-hidden"
        style={{
          alignItems:
            element.verticalAlign === "top"
              ? "flex-start"
              : element.verticalAlign === "bottom"
                ? "flex-end"
                : "center",
          justifyContent: "center",
          padding: element.textPadding ?? (borderWidth || element.textBackground ? 10 : 0),
          background: element.textBackground,
          border: borderWidth > 0 ? `${borderWidth}px solid ${element.textBorder ?? "transparent"}` : undefined,
          borderRadius: element.textRadius ?? 0,
          boxShadow: element.textShadow ? "0 18px 44px rgba(22,22,22,0.24)" : undefined,
        }}
      >
        <div
          className="w-full whitespace-pre-wrap break-words"
          style={{
            fontFamily: fontFamilyFor(element.font ?? "cormorant-garamond"),
            fontSize: element.fontSize ?? 26,
            fontWeight: element.fontWeight ?? 400,
            fontStyle: element.italic ? "italic" : "normal",
            letterSpacing: `${element.letterSpacing ?? 0}em`,
            lineHeight: element.lineHeight ?? 1.4,
            textAlign: element.align ?? "center",
            textTransform: transform,
            color: gradientText ? "transparent" : (element.color ?? "#161616"),
            // A gradient fill is painted as a background clipped to the
            // glyphs, which keeps the words selectable, editable and sharp at
            // every zoom instead of being baked into an image.
            backgroundImage:
              gradientText && gradient ? gradientCss(gradient) : undefined,
            WebkitBackgroundClip: gradientText ? "text" : undefined,
            backgroundClip: gradientText ? "text" : undefined,
            WebkitTextFillColor: gradientText ? "transparent" : undefined,
            textDecoration: element.textDecoration ?? "none",
            textDecorationColor: gradientText
              ? (element.color ?? "#161616")
              : undefined,
            WebkitTextStroke:
              glyphStroke > 0 && outline
                ? `${glyphStroke}px ${outline.color}`
                : undefined,
            direction,
            unicodeBidi: element.direction === "auto" ? "plaintext" : "normal",
          }}
          dir={direction}
        >
          {personalize(element.text, guestName)}
        </div>
      </div>
    );
  }

  if (element.kind === "image") {
    const url = element.imageStorageId ? imageUrls[element.imageStorageId] : "";
    if (!url) {
      return (
        <div
          className="grid h-full w-full place-items-center border border-dashed text-center text-[13px] uppercase tracking-[0.18em]"
          style={{
            borderColor: `${element.color ?? "#b38f6f"}80`,
            color: element.color ?? "#b38f6f",
            borderRadius: element.imageRadius ?? 0,
          }}
        >
          Image
        </div>
      );
    }
    const photo = (
      <img
        src={url}
        alt={element.name}
        draggable={false}
        className="h-full w-full select-none"
        style={{
          objectFit: element.fit ?? "cover",
          objectPosition: `${element.imagePosition?.x ?? 50}% ${element.imagePosition?.y ?? 50}%`,
          borderRadius: element.imageRadius ?? 0,
          border: element.imageBorder
            ? `${element.imageBorder}px solid ${element.stroke ?? "#b38f6f"}`
            : undefined,
          boxShadow: element.imageShadow
            ? "0 22px 50px rgba(22,22,22,0.22)"
            : undefined,
        }}
      />
    );
    const photoInner = insetShadow(element.effects);
    if (!photoInner) return photo;
    return (
      <div className="relative h-full w-full">
        {photo}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            boxShadow: photoInner,
            borderRadius: element.imageRadius ?? 0,
          }}
        />
      </div>
    );
  }

  if (element.kind === "motif") {
    return (
      <div
        className="h-full w-full"
        style={{ color: element.color ?? element.fill ?? "#161616" }}
      >
        <Motif
          id={element.motif ?? "sprig"}
          className="h-full w-full"
          strokeWidth={element.strokeWidth ?? 0.8}
        />
      </div>
    );
  }

  // A decorative frame is drawn as vector artwork instead of a plain keyline.
  // It is still a shape layer, so nothing else about editing changes.
  const frame = frameById(element.frameArt);
  if (frame) {
    return (
      <FrameArt
        frame={frame}
        color={
          element.stroke && element.stroke !== "transparent"
            ? element.stroke
            : (element.color ?? element.fill ?? "#710014")
        }
        strokeWidth={element.strokeWidth ?? 2}
      />
    );
  }

  const coverImage = element.imageStorageId
    ? imageUrls[element.imageStorageId]
    : undefined;
  const shapeArt = (
    <ShapeArt element={element} clipId={clipId} imageUrl={coverImage} />
  );

  // An inner shadow only reads correctly on a closed, boxed form. The overlay
  // is separate from the vector, so the fill, mask image and effects all stay
  // independently editable.
  const shape = element.shape ?? "rect";
  const boxed = shape === "rect" || shape === "capsule" || shape === "ellipse";
  const shapeInner = boxed ? insetShadow(element.effects) : undefined;
  if (!shapeInner) return shapeArt;
  const boxRadius =
    shape === "capsule" ? "999px" : shape === "ellipse" ? "50%" : `${element.radius ?? 0}px`;
  return (
    <div className="relative h-full w-full">
      {shapeArt}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ boxShadow: shapeInner, borderRadius: boxRadius }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Reveal cover                                                               */
/* -------------------------------------------------------------------------- */

function useRevealProgress(
  active: boolean,
  duration: number,
  reducedMotion: boolean,
) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let frame = 0;
    if (!active) {
      frame = requestAnimationFrame(() => setProgress(0));
      return () => cancelAnimationFrame(frame);
    }
    if (reducedMotion) {
      frame = requestAnimationFrame(() => setProgress(1));
      return () => cancelAnimationFrame(frame);
    }
    const start = performance.now();
    const tick = (now: number) => {
      const p = clamp((now - start) / Math.max(1, duration), 0, 1);
      setProgress(p);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, duration, reducedMotion]);
  return progress;
}

function coverExitStyle(reveal: RevealConfig, p: number): CSSProperties {
  const eased = easeOut(p);
  switch (reveal.effect) {
    case "dissolve":
      return { opacity: 1 - eased, filter: `blur(${eased * 18}px)` };
    case "wipe": {
      const inset =
        reveal.direction === "left"
          ? `0 0 0 ${eased * 100}%`
          : reveal.direction === "right"
            ? `0 ${eased * 100}% 0 0`
            : reveal.direction === "down"
              ? `${eased * 100}% 0 0 0`
              : `0 0 ${eased * 100}% 0`;
      return { clipPath: `inset(${inset})`, opacity: 1 };
    }
    case "flip":
      return {
        transform: `perspective(1400px) rotateY(${eased * -96}deg)`,
        opacity: 1 - eased * 0.25,
        transformOrigin: "left center",
      };
    case "fadeAway":
    default:
      return {
        opacity: 1 - eased,
        transform: `translateY(${-eased * 22}px) scale(${1 - eased * 0.03})`,
      };
  }
}

function RevealCover({
  element,
  revealed,
  onReveal,
  duration,
  reducedMotion,
  interactive = true,
  children,
}: {
  element: DesignElement;
  revealed: boolean;
  onReveal: () => void;
  duration: number;
  reducedMotion: boolean;
  interactive?: boolean;
  children: ReactNode;
}) {
  const progress = useRevealProgress(revealed, duration, reducedMotion);
  const done = revealed && progress >= 1;
  const hint = element.reveal?.hint;
  return (
    <div
      className="h-full w-full"
      style={done ? { visibility: "hidden" } : coverExitStyle(element.reveal!, progress)}
    >
      {children}
      {!revealed && interactive && (
        <button
          type="button"
          onClick={onReveal}
          className="absolute inset-0 z-30 cursor-pointer rounded-[inherit] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--red)]"
          style={{ background: "transparent" }}
          aria-label={hint || `Reveal what is under ${element.name}`}
        >
          <span className="sr-only">{hint || "Tap to reveal"}</span>
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export interface DesignPageViewProps {
  page: DesignPage;
  time: number;
  imageUrls: Record<string, string>;
  guestName?: string | null;
  rtl?: boolean;
  interactive?: boolean;
  reducedMotion?: boolean;
  editor?: boolean;
  selectedIds?: string[];
  onReveal?: (targetId: string, interactionId: string) => void;
  revealed?: Set<string>;
  /** Studio-only: covers being tested, treated as opened. */
  revealPreview?: Set<string>;
  /** Studio design view: show exits as still present. */
  ignoreExit?: boolean;
  /** Studio inline editing: the text editor replaces this layer visually. */
  hideElementId?: string | null;
  /**
   * Time at which the card entered the viewport, in page milliseconds. Scroll
   * triggered elements wait for this moment (null) and then animate locally.
   */
  scrollActivationTime?: number | null;
  className?: string;
  style?: CSSProperties;
}

export function DesignPageView({
  page,
  time,
  imageUrls,
  guestName,
  rtl,
  interactive = false,
  reducedMotion = false,
  editor = false,
  selectedIds,
  onReveal,
  revealed,
  revealPreview,
  ignoreExit,
  hideElementId,
  scrollActivationTime = 0,
  className,
  style,
}: DesignPageViewProps) {
  const [localRevealed, setLocalRevealed] = useState<Set<string>>(new Set());
  const opened = revealed ?? localRevealed;
  const covered = coveredElementIds(page);

  // Fetch only the faces this page actually sets, and only when needed. The
  // public invitation and the studio share this path, so what you see in the
  // editor is what guests download.
  useEffect(() => {
    ensureDesignFonts(
      page.elements
        .filter((element) => element.kind === "text")
        .map((element) => ({
          id: element.font,
          weight: element.fontWeight ?? 400,
          italic: element.italic,
        })),
    );
  }, [page.elements]);

  const handleReveal = (targetId: string, interactionId: string) => {
    if (!interactive) return;
    if (!revealed) {
      setLocalRevealed((previous) => new Set(previous).add(interactionId));
    }
    onReveal?.(targetId, interactionId);
  };

  const size = pageSizeOf(page);

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      dir={rtl ? "rtl" : "ltr"}
      style={{
        width: size.width,
        height: size.height,
        containerType: "inline-size",
        ...pageBackgroundStyle(page.background),
        ...style,
      }}
    >
      <div aria-hidden className="paper-texture pointer-events-none absolute inset-0" />
      {page.texture && page.texture !== "none" && (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 opacity-[0.16] mix-blend-multiply",
            `texture-${page.texture}`,
          )}
        />
      )}
      <div
        aria-hidden
        className="paper-grain pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-multiply"
      />
      {page.elements.map((element) => {
        if (element.hidden && !editor) return null;
        if (hideElementId === element.id) return null;
        const isCovered = covered.has(element.id);
        const cover = page.elements.find(
          (candidate) => candidate.reveal?.targetId === element.id,
        );
        const isRevealed = Boolean(
          cover?.reveal &&
            (opened.has(cover.reveal.interactionId) ||
              revealPreview?.has(cover.reveal.interactionId)),
        );
        if (isCovered && !isRevealed && !editor) return null;

        // Scroll-triggered layers wait for the card to enter the viewport and
        // then run their own deferred clock, so they never fire unseen.
        const scrollTriggered = element.animation.trigger === "scroll";
        const elementTime = scrollTriggered
          ? scrollActivationTime == null
            ? 0
            : element.animation.delay +
              Math.max(0, time - scrollActivationTime)
          : time;
        const animated = elementStyleAt(element, elementTime, { ignoreExit });
        const selected = selectedIds?.includes(element.id);
        const dimmed = isCovered && !isRevealed && editor;

        const content = (
          <div
            data-element-id={element.id}
            data-element-kind={element.kind}
            className={cn(
              "absolute",
              element.hidden && "opacity-40",
              selected && "outline-1 outline-offset-4 outline-dashed outline-[var(--red)]",
            )}
            style={{
              left: element.x,
              top: element.y,
              width: element.w,
              height: element.h,
              ...animated.style,
              // Motion may already carry a filter (blur, for example); the
              // layer's own shadow and glow compose with it rather than
              // replacing the entrance animation's look.
              filter:
                [animated.style.filter, effectFilter(element.effects)]
                  .filter(Boolean)
                  .join(" ") || undefined,
              opacity: dimmed ? 0.25 : animated.style.opacity,
              pointerEvents: interactive ? "auto" : "none",
              outline: dimmed ? "1px dashed rgba(113,0,20,0.55)" : undefined,
              zIndex: undefined,
            }}
          >
            <ElementVisual
              element={element}
              imageUrls={imageUrls}
              guestName={guestName}
              rtl={rtl}
              clipId={`clip-${element.id}`}
            />
            {dimmed && (
              <span className="absolute -top-4 left-0 bg-[#710014] px-1.5 py-0.5 text-[11px] uppercase tracking-[0.16em] text-white">
                Covered
              </span>
            )}
          </div>
        );

        if (element.reveal && element.reveal.targetId) {
          return (
            <div
              key={element.id}
              className="absolute"
              style={{
                left: element.x,
                top: element.y,
                width: element.w,
                height: element.h,
                transform: animated.style.transform,
                opacity: animated.style.opacity,
                filter:
                  [animated.style.filter, effectFilter(element.effects)]
                    .filter(Boolean)
                    .join(" ") || undefined,
                zIndex: 20,
              }}
            >
              <RevealCover
                element={element}
                revealed={isRevealed}
                onReveal={() =>
                  handleReveal(element.reveal!.targetId, element.reveal!.interactionId)
                }
                duration={element.reveal.duration}
                reducedMotion={reducedMotion}
                interactive={interactive}
              >
                <ElementVisual
                  element={{ ...element, x: 0, y: 0 }}
                  imageUrls={imageUrls}
                  guestName={guestName}
                  rtl={rtl}
                  clipId={`clip-cover-${element.id}`}
                />
              </RevealCover>
            </div>
          );
        }

        return <div key={element.id}>{content}</div>;
      })}
    </div>
  );
}  /* -------------------------------------------------------------------------- */
/* Scaled stage                                                               */
/* -------------------------------------------------------------------------- */

export function useStageScale(width: number) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => setScale(node.clientWidth / width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [width]);

  return { ref, scale };
}

export function DesignStage({
  className,
  width,
  height,
  children,
}: {
  className?: string;
  /** Canvas size in design units; defaults to the classic studio card. */
  width?: number;
  height?: number;
  children: (scale: number) => ReactNode;
}) {
  const stageWidth = width && width > 0 ? width : undefined;
  const stageHeight = height && height > 0 ? height : undefined;
  const size = pageSizeOf(
    stageWidth && stageHeight ? { width: stageWidth, height: stageHeight } : null,
  );
  const { ref, scale } = useStageScale(size.width);
  return (
    <div
      ref={ref}
      className={cn("relative w-full overflow-hidden", className)}
      style={{ aspectRatio: `${size.width} / ${size.height}` }}
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
        {children(scale)}
      </div>
    </div>
  );
}

