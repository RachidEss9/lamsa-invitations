import type { MotifId } from "@/lib/invitation";

/**
 * Hand-drawn line motifs used across invitation designs. Thin strokes keep
 * them letterpress-like rather than decorative clip-art.
 */
export function Motif({
  id,
  className,
  strokeWidth = 0.9,
}: {
  id: MotifId;
  className?: string;
  strokeWidth?: number;
}) {
  if (id === "none") return null;

  const shared = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      {id === "arch" && (
        <g {...shared}>
          <path d="M24 82V48a26 26 0 0 1 52 0v34" />
          <path d="M30 82V49a20 20 0 0 1 40 0v33" opacity="0.55" />
          <path d="M50 22v-7M46.5 18.5h7" />
          <circle cx="50" cy="56" r="1.3" fill="currentColor" stroke="none" />
        </g>
      )}

      {id === "sprig" && (
        <g {...shared}>
          <path d="M50 88c0-22 0-38 0-54" />
          <path d="M50 56c-8-2-14-8-15-16 8 1 14 7 15 16Z" />
          <path d="M50 55c8-2 14-8 15-16-8 1-14 7-15 16Z" opacity="0.8" />
          <path d="M50 70c-7-2-12-7-13-14 7 1 12 6 13 14Z" opacity="0.8" />
          <path d="M50 69c7-2 12-7 13-14-7 1-12 6-13 14Z" />
          <path d="M50 40c-5-2-9-6-10-12 6 1 9 5 10 12Z" opacity="0.7" />
          <path d="M50 39c5-2 9-6 10-12-6 1-9 5-10 12Z" opacity="0.7" />
          <path d="M43 88h14" opacity="0.55" />
        </g>
      )}

      {id === "sun" && (
        <g {...shared}>
          <circle cx="50" cy="50" r="15" />
          <circle cx="50" cy="50" r="21" opacity="0.35" />
          <path d="M50 18V8M50 92V82M18 50H8M92 50H82M27 27l-7-7M73 73l7 7M73 27l7-7M27 73l-7 7" />
          <path d="M36 36l-4-4M64 64l4 4M64 36l4-4M36 64l-4 4" opacity="0.45" />
        </g>
      )}

      {id === "fan" && (
        <g {...shared}>
          <path d="M50 84V48" />
          <path d="M50 48c-16-2-29-12-34-27 16 3 29 13 34 27Z" />
          <path d="M50 48c16-2 29-12 34-27-16 3-29 13-34 27Z" />
          <path d="M50 48c-10-8-15-20-14-33 10 8 15 20 14 33Z" opacity="0.6" />
          <path d="M50 48c10-8 15-20 14-33-10 8-15 20-14 33Z" opacity="0.6" />
          <path d="M36 84h28" opacity="0.55" />
          <circle cx="50" cy="48" r="1.4" fill="currentColor" stroke="none" />
        </g>
      )}

      {id === "star" && (
        <g {...shared}>
          <path d="M50 16c2.5 18 11.5 27 29.5 29.5C61.5 48 52.5 57 50 75 47.5 57 38.5 48 20.5 45.5 38.5 43 47.5 34 50 16Z" />
          <path d="M50 36c1.2 8 5.5 12.5 13.5 13.7C55.5 51 51.2 55.5 50 63.5 48.8 55.5 44.5 51 36.5 49.7 44.5 48.5 48.8 44 50 36Z" opacity="0.45" />
          <circle cx="50" cy="82" r="1" fill="currentColor" stroke="none" />
        </g>
      )}
    </svg>
  );
}
