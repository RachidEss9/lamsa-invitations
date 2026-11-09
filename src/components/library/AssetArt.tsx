import { cachedGeometry } from "@/lib/library/catalog";
import type { LibraryAssetMeta } from "@/lib/library/types";
import { cn } from "@/lib/utils";

/**
 * Draws a catalogue asset from its path. Both the thumbnail and the large
 * preview use the same SVG, so what a designer browses is exactly what will be
 * placed on the page.
 */
export function AssetArt({
  asset,
  className,
  strokeColor = "currentColor",
  fillColor = "currentColor",
  title,
}: {
  asset: LibraryAssetMeta;
  className?: string;
  strokeColor?: string;
  fillColor?: string;
  title?: string;
}) {
  const geometry = cachedGeometry(asset.id);
  if (!geometry) {
    return (
      <span
        className={cn(
          "block animate-pulse rounded-[2px] bg-[color-mix(in_oklab,var(--ink)_7%,transparent)]",
          className,
        )}
        aria-hidden
      />
    );
  }
  const isStroke = geometry.ink === "stroke";
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("block h-full w-full", className)}
      role="img"
      aria-label={title ?? asset.name}
      preserveAspectRatio="xMidYMid meet"
    >
      <path
        d={geometry.d}
        fill={isStroke ? "none" : fillColor}
        stroke={isStroke ? strokeColor : "none"}
        strokeWidth={isStroke ? geometry.strokeWidth : 0}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={geometry.opacity}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
