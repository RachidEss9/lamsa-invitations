import {
  coveredElementIds,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  elementStyleAt,
  personalize,
  type DesignElement,
  type DesignPage,
  type RevealConfig,
} from "@/lib/design";
import { fontPairById } from "@/lib/invitation";
import { cn } from "@/lib/utils";
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
  const radius = element.radius ?? 0;

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
      </defs>
      {shape === "rect" || shape === "frame" ? (
        imageUrl ? (
          <image
            href={imageUrl}
            width={100}
            height={100}
            preserveAspectRatio="xMidYMid slice"
            clipPath={clipId ? `url(#${clipId})` : undefined}
            style={{ clipPath: `inset(0 round ${radius}px)` }}
          />
        ) : (
          <rect
            x={0.5}
            y={0.5}
            width={99}
            height={99}
            rx={Math.max(0, radius)}
            fill={shape === "frame" ? "transparent" : fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke"
          />
        )
      ) : shape === "ellipse" ? (
        imageUrl ? (
          <image
            href={imageUrl}
            width={100}
            height={100}
            preserveAspectRatio="xMidYMid slice"
            clipPath={clipId ? `url(#${clipId})` : undefined}
            style={{ clipPath: "ellipse(50% 50% at 50% 50%)" }}
          />
        ) : (
          <ellipse
            cx={50}
            cy={50}
            rx={49}
            ry={49}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke"
          />
        )
      ) : (
        <>
          {imageUrl && clipId ? (
            <image
              href={imageUrl}
              width={100}
              height={100}
              preserveAspectRatio="xMidYMid slice"
              clipPath={`url(#${clipId})`}
            />
          ) : (
            <path d={path} fill={fill} />
          )}
          {strokeWidth > 0 && (
            <path
              d={path}
              fill="none"
              stroke={stroke ?? fill}
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
    return (
      <div
        className="h-full w-full whitespace-pre-wrap break-words"
        style={{
          fontFamily: fontPairById(element.font ?? "romance").family,
          fontSize: element.fontSize ?? 26,
          fontWeight: element.fontWeight ?? 400,
          fontStyle: element.italic ? "italic" : "normal",
          letterSpacing: `${element.letterSpacing ?? 0}em`,
          lineHeight: element.lineHeight ?? 1.4,
          textAlign: element.align ?? "center",
          textTransform: element.uppercase ? "uppercase" : "none",
          color: element.color ?? "#161616",
          direction: rtl ? "rtl" : "ltr",
        }}
      >
        {personalize(element.text, guestName)}
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
    return (
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

  const coverImage = element.imageStorageId
    ? imageUrls[element.imageStorageId]
    : undefined;
  return (
    <ShapeArt element={element} clipId={clipId} imageUrl={coverImage} />
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
  children,
}: {
  element: DesignElement;
  revealed: boolean;
  onReveal: () => void;
  duration: number;
  reducedMotion: boolean;
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
      {!revealed && (
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
  scrollActivationTime = 0,
  className,
  style,
}: DesignPageViewProps) {
  const [localRevealed, setLocalRevealed] = useState<Set<string>>(new Set());
  const opened = revealed ?? localRevealed;
  const covered = coveredElementIds(page);

  const handleReveal = (targetId: string, interactionId: string) => {
    if (!interactive) return;
    if (!revealed) {
      setLocalRevealed((previous) => new Set(previous).add(interactionId));
    }
    onReveal?.(targetId, interactionId);
  };

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      dir={rtl ? "rtl" : "ltr"}
      style={{
        width: DESIGN_WIDTH,
        height: DESIGN_HEIGHT,
        backgroundColor: page.background,
        containerType: "inline-size",
        ...style,
      }}
    >
      <div aria-hidden className="paper-texture pointer-events-none absolute inset-0" />
      <div
        aria-hidden
        className="paper-grain pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-multiply"
      />
      {page.elements.map((element) => {
        if (element.hidden && !editor) return null;
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
}

/* -------------------------------------------------------------------------- */
/* Scaled stage                                                               */
/* -------------------------------------------------------------------------- */

export function useStageScale() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => setScale(node.clientWidth / DESIGN_WIDTH);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, scale };
}

export function DesignStage({
  className,
  children,
}: {
  className?: string;
  children: (scale: number) => ReactNode;
}) {
  const { ref, scale } = useStageScale();
  return (
    <div
      ref={ref}
      className={cn("relative w-full overflow-hidden", className)}
      style={{ aspectRatio: `${DESIGN_WIDTH} / ${DESIGN_HEIGHT}` }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: DESIGN_WIDTH,
          height: DESIGN_HEIGHT,
          transform: `scale(${scale || 0.0001})`,
          visibility: scale ? "visible" : "hidden",
        }}
      >
        {children(scale)}
      </div>
    </div>
  );
}

