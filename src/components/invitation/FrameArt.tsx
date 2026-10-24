import { frameById, type FrameSpec } from "@/lib/frames";

/**
 * Renders one decorative frame as live vector artwork.
 *
 * The border is drawn in a stretched 0–100 box so it follows the invitation's
 * real page ratio; the corner ornament is drawn square and mirrored into each
 * corner, so it never distorts when the frame is resized. Stroke weight uses
 * `non-scaling-stroke`, which keeps the printed line weight exactly as chosen
 * instead of growing with the element.
 */
export function FrameArt({
  frame,
  color = "#710014",
  strokeWidth = 2,
  className,
}: {
  frame: FrameSpec;
  color?: string;
  strokeWidth?: number;
  className?: string;
}) {
  const weight = Math.max(0.4, strokeWidth);
  const corners = [
    { key: "tl", transform: undefined },
    { key: "tr", transform: "translate(100 0) scale(-1 1)" },
    { key: "bl", transform: "translate(0 100) scale(1 -1)" },
    { key: "br", transform: "translate(100 100) scale(-1 -1)" },
  ] as const;

  return (
    <div
      className={className}
      data-frame-art={frame.id}
      style={{ position: "relative", width: "100%", height: "100%" }}
    >
      <svg
        aria-hidden
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        className="overflow-visible"
      >
        {frame.outline.map((d, index) => (
          <path
            key={`outline-${index}`}
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={weight}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      {frame.corner &&
        corners.map((corner) => (
          <svg
            key={corner.key}
            aria-hidden
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
            style={{
              position: "absolute",
              width: `${frame.corner!.size}%`,
              aspectRatio: "1 / 1",
              top: corner.key.startsWith("t") ? 0 : undefined,
              bottom: corner.key.startsWith("b") ? 0 : undefined,
              left: corner.key.endsWith("l") ? 0 : undefined,
              right: corner.key.endsWith("r") ? 0 : undefined,
              overflow: "visible",
            }}
          >
            <g transform={corner.transform}>
              {frame.corner!.art.map((d, index) => (
                <path
                  key={`${corner.key}-${index}`}
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeWidth={weight}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
          </svg>
        ))}
    </div>
  );
}

/** Small square thumbnail of a frame, for the library grid. */
export function FrameThumb({
  frame,
  color = "#710014",
  className,
}: {
  frame: FrameSpec;
  color?: string;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{ width: "100%", height: "100%", padding: 6 }}
    >
      <FrameArt frame={frame} color={color} strokeWidth={1.2} />
    </div>
  );
}

/** Convenience for canvas renderers that only have the stored frame id. */
export function FrameArtById({
  id,
  color,
  strokeWidth,
}: {
  id: string;
  color?: string;
  strokeWidth?: number;
}) {
  const frame = frameById(id);
  if (!frame) return null;
  return <FrameArt frame={frame} color={color} strokeWidth={strokeWidth} />;
}
