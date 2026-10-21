import type { MotifId } from "@/lib/invitation";

/**
 * Hand-drawn line motifs used across invitation designs. Thin strokes keep
 * them letterpress-like rather than decorative clip-art. Every mark is drawn
 * inside a 100×100 box so it can be used as a header, a corner ornament, or a
 * seal without adjustment.
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

      {id === "branch" && (
        <g {...shared}>
          <path d="M20 86C38 68 58 44 80 16" />
          <path d="M31 74c-9-2-15-9-15-18 9 1 16 8 15 18Z" opacity="0.85" />
          <path d="M42 61c4-9 12-14 21-13-3 9-12 14-21 13Z" />
          <path d="M50 51c-9-2-14-9-14-17 9 1 15 8 14 17Z" opacity="0.85" />
          <path d="M61 38c3-8 11-13 19-12-3 8-10 13-19 12Z" />
          <path d="M69 27c-7-2-11-8-11-15 8 1 12 7 11 15Z" opacity="0.8" />
          <circle cx="72" cy="20" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="33" cy="80" r="1.1" fill="currentColor" stroke="none" opacity="0.7" />
        </g>
      )}

      {id === "wreath" && (
        <g {...shared}>
          <path d="M50 88c-20 0-33-14-33-33 0-11 5-21 13-27" />
          <path d="M50 88c20 0 33-14 33-33 0-11-5-21-13-27" />
          <path d="M22 45c-7-2-11-8-11-15 7 1 12 7 11 15Z" />
          <path d="M21 58c-8 0-14-4-16-11 8-1 14 3 16 11Z" opacity="0.8" />
          <path d="M25 70c-7 2-14 0-18-6 7-3 14-1 18 6Z" />
          <path d="M34 80c-5 5-12 6-18 2 4-6 11-8 18-2Z" opacity="0.8" />
          <path d="M78 45c7-2 11-8 11-15-7 1-12 7-11 15Z" />
          <path d="M79 58c8 0 14-4 16-11-8-1-14 3-16 11Z" opacity="0.8" />
          <path d="M75 70c7 2 14 0 18-6-7-3-14-1-18 6Z" />
          <path d="M66 80c5 5 12 6 18 2-4-6-11-8-18-2Z" opacity="0.8" />
          <path d="M50 82v-6M50 71v-4" opacity="0.5" />
        </g>
      )}

      {id === "vine" && (
        <g {...shared}>
          <path d="M18 82c14 2 20-10 16-20-5-12 4-21 16-18 14 4 18-10 32-12" />
          <path d="M34 62c-7-4-9-11-6-18 7 3 10 10 6 18Z" />
          <path d="M44 46c-2-8 2-14 9-17 2 8-1 14-9 17Z" opacity="0.8" />
          <path d="M60 48c6-5 13-5 19 0-5 5-13 5-19 0Z" />
          <path d="M70 34c-1-8 3-14 11-16 1 8-3 14-11 16Z" opacity="0.75" />
          <circle cx="27" cy="74" r="1.2" fill="currentColor" stroke="none" opacity="0.7" />
          <circle cx="39" cy="55" r="1.1" fill="currentColor" stroke="none" opacity="0.6" />
          <circle cx="77" cy="54" r="1.2" fill="currentColor" stroke="none" opacity="0.6" />
        </g>
      )}

      {id === "palm" && (
        <g {...shared}>
          <path d="M50 88V42" />
          <path d="M50 42c-14-2-25-11-29-24 14 3 25 12 29 24Z" />
          <path d="M50 42c14-2 25-11 29-24-14 3-25 12-29 24Z" />
          <path d="M50 42c-10-10-12-23-6-35 9 10 12 24 6 35Z" opacity="0.75" />
          <path d="M50 42c2-13 10-23 21-27-2 13-10 23-21 27Z" opacity="0.6" />
          <path d="M40 88h20" opacity="0.5" />
        </g>
      )}

      {id === "peony" && (
        <g {...shared}>
          <path d="M50 50c-9-3-15-11-14-21 10 2 16 10 14 21Z" />
          <path d="M50 50c9-3 15-11 14-21-10 2-16 10-14 21Z" />
          <path d="M50 50c-3-9-1-18 6-24 5 7 4 17-6 24Z" opacity="0.7" />
          <path d="M50 50c-10 4-21 2-27-6 9-5 19-3 27 6Z" />
          <path d="M50 50c10 4 21 2 27-6-9-5-19-3-27 6Z" />
          <path d="M50 50c-7 7-17 10-27 7 4-9 14-14 27-7Z" opacity="0.8" />
          <path d="M50 50c7 7 17 10 27 7-4-9-14-14-27-7Z" opacity="0.8" />
          <path d="M50 50c-3 10-1 20 6 27 6-8 5-18-6-27Z" opacity="0.65" />
          <circle cx="50" cy="50" r="2.2" fill="currentColor" stroke="none" opacity="0.8" />
        </g>
      )}

      {id === "butterfly" && (
        <g {...shared}>
          <path d="M50 44v28" />
          <path d="M50 48c-6-12-18-19-28-17-3 11 6 24 20 26" />
          <path d="M50 48c6-12 18-19 28-17 3 11-6 24-20 26" />
          <path d="M50 56c-7 6-14 13-12 22 8 1 12-6 12-14" opacity="0.75" />
          <path d="M50 56c7 6 14 13 12 22-8 1-12-6-12-14" opacity="0.75" />
          <path d="M50 44c-2-5-5-8-9-9M50 44c2-5 5-8 9-9" />
          <circle cx="50" cy="51" r="1.2" fill="currentColor" stroke="none" />
        </g>
      )}

      {id === "shell" && (
        <g {...shared}>
          <path d="M20 66c4-24 15-40 30-48 15 8 26 24 30 48-19 8-41 8-60 0Z" />
          <path d="M50 18v48M50 20c-8 12-12 28-12 46M50 20c8 12 12 28 12 46" opacity="0.7" />
          <path d="M32 34c-5 8-8 19-9 30M68 34c5 8 8 19 9 30" opacity="0.5" />
          <path d="M20 66c8 8 18 12 30 12s22-4 30-12" />
          <path d="M44 78h12" opacity="0.6" />
        </g>
      )}

      {id === "gem" && (
        <g {...shared}>
          <path d="M32 28h36l16 18-34 38L16 46Z" />
          <path d="M32 28l10 18h16l10-18M16 46h68M42 46l8 38 8-38" opacity="0.7" />
          <path d="M50 12v10" opacity="0.45" />
        </g>
      )}

      {id === "compass" && (
        <g {...shared}>
          <circle cx="50" cy="50" r="26" />
          <circle cx="50" cy="50" r="32" opacity="0.35" />
          <path d="M50 14v14M50 72v14M14 50h14M72 50h14" />
          <path d="M50 26l6 18-6 30-6-30Z" />
          <path d="M26 50l18-6 30 6-30 6Z" opacity="0.7" />
          <circle cx="50" cy="50" r="1.8" fill="currentColor" stroke="none" />
        </g>
      )}

      {id === "sunburst" && (
        <g {...shared}>
          <circle cx="50" cy="50" r="10" />
          <circle cx="50" cy="50" r="16" opacity="0.35" />
          {Array.from({ length: 16 }).map((_, index) => {
            const angle = (index * Math.PI * 2) / 16;
            const inner = 20;
            const outer = index % 2 === 0 ? 40 : 32;
            return (
              <path
                key={index}
                d={`M${50 + Math.cos(angle) * inner} ${50 + Math.sin(angle) * inner}L${50 + Math.cos(angle) * outer} ${50 + Math.sin(angle) * outer}`}
                opacity={index % 2 === 0 ? 0.9 : 0.5}
              />
            );
          })}
        </g>
      )}

      {id === "moon" && (
        <g {...shared}>
          <path d="M32 18a32 32 0 1 0 0 64 27 27 0 0 1 0-64Z" />
          <circle cx="62" cy="34" r="4" opacity="0.6" />
          <circle cx="74" cy="50" r="6" opacity="0.8" />
          <circle cx="60" cy="66" r="3" opacity="0.5" />
          <path d="M86 32a10 10 0 1 0-10 14" opacity="0.45" />
        </g>
      )}

      {id === "wave" && (
        <g {...shared}>
          <path d="M12 72c10-14 20-14 30 0s20 14 30 0 20-14 30 0" />
          <path d="M12 56c10-14 20-14 30 0s20 14 30 0 20-14 30 0" opacity="0.7" />
          <path d="M12 40c10-14 20-14 30 0s20 14 30 0 20-14 30 0" opacity="0.45" />
          <circle cx="50" cy="24" r="2" fill="currentColor" stroke="none" opacity="0.6" />
        </g>
      )}

      {id === "trellis" && (
        <g {...shared}>
          <path d="M18 18h64v64H18Z" />
          <path d="M18 18l64 64M82 18L18 82" opacity="0.6" />
          <path d="M18 34l16-16M66 82l16-16M18 66l16 16M66 18l16 16" opacity="0.35" />
          <circle cx="50" cy="50" r="2" fill="currentColor" stroke="none" />
        </g>
      )}

      {id === "frame" && (
        <g {...shared}>
          <path d="M30 14h40c9 0 16 16 16 36s-7 36-16 36H30c-9 0-16-16-16-36s7-36 16-36Z" />
          <path d="M30 20h40c7 0 12 13 12 30s-5 30-12 30H30c-7 0-12-13-12-30s5-30 12-30Z" opacity="0.45" />
          <path d="M50 24v8M50 68v8" opacity="0.5" />
          <circle cx="50" cy="12" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="50" cy="88" r="1.4" fill="currentColor" stroke="none" />
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

      {id === "crescent" && (
        <g {...shared}>
          <path d="M62 14a38 38 0 1 0 0 72 33 33 0 0 1 0-72Z" />
          <path d="M60 20a31 31 0 1 0 0 60 25 25 0 0 1 0-60Z" opacity="0.45" />
          <circle cx="72" cy="26" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="80" cy="40" r="1" fill="currentColor" stroke="none" opacity="0.7" />
          <circle cx="84" cy="56" r="0.9" fill="currentColor" stroke="none" opacity="0.5" />
        </g>
      )}

      {id === "rattle" && (
        <g {...shared}>
          <circle cx="50" cy="42" r="21" />
          <circle cx="50" cy="42" r="15" opacity="0.4" />
          <circle cx="43" cy="36" r="1.6" fill="currentColor" stroke="none" opacity="0.7" />
          <circle cx="55" cy="45" r="1.4" fill="currentColor" stroke="none" opacity="0.6" />
          <path d="M50 63v16" />
          <path d="M44 84c2-3 10-3 12 0-2 2-10 2-12 0Z" />
        </g>
      )}
    </svg>
  );
}
