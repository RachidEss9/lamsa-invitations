import { memo } from "react";

import type { PublicationDocument, PublicationPage } from "@/lib/publishing/model";
import { bleedBox } from "@/lib/publishing/geometry";
import { ObjectArt } from "./ObjectArt";
import {
  masterBackgroundFor,
  masterForPage,
  masterObjectsForPage,
} from "@/lib/publishing/masters";
import { cn } from "@/lib/utils";

/**
 * A page thumbnail. Thumbnails never fetch assets and never draw chrome: at
 * this size, colour, shape and rhythm are the information a person needs, and
 * skipping image fetches keeps a 40-page panel cheap.
 */

export const THUMB_WIDTH = 112;

export const PageThumb = memo(function PageThumb({
  page,
  document,
  className,
}: {
  page: PublicationPage;
  document: PublicationDocument;
  className?: string;
}) {
  const bleed = bleedBox(page.spec);
  const master = masterForPage(document, page);
  const masterObjects = masterObjectsForPage(page, master);
  const masterBackground = masterBackgroundFor(master);
  const width = THUMB_WIDTH;
  const height = bleed.width > 0 ? (bleed.height / bleed.width) * width : width;
  return (
    <svg
      viewBox={`${bleed.x} ${bleed.y} ${bleed.width} ${bleed.height}`}
      width={width}
      height={Math.round(height)}
      className={cn("block", className)}
      aria-hidden
    >
      <rect
        x={bleed.x}
        y={bleed.y}
        width={bleed.width}
        height={bleed.height}
        fill={page.background.color || "#ffffff"}
      />
      {page.hidden ? null : (
        <g pointerEvents="none">
          {masterBackground ? (
            <rect
              x={bleed.x}
              y={bleed.y}
              width={bleed.width}
              height={bleed.height}
              fill={masterBackground.color || "transparent"}
            />
          ) : null}
          {masterObjects.map((object) => (
            <ObjectArt
              key={`master-${object.id}`}
              object={object}
              document={document}
            />
          ))}
          {page.objects
            .filter((object) => !object.hidden)
            .map((object) => (
              <ObjectArt key={object.id} object={object} document={document} />
            ))}
        </g>
      )}
      {page.hidden ? (
        <rect
          x={bleed.x}
          y={bleed.y}
          width={bleed.width}
          height={bleed.height}
          fill="color-mix(in oklab, var(--ink) 18%, transparent)"
        />
      ) : null}
    </svg>
  );
});
