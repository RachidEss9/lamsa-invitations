import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A frame that keeps a whole design page visible inside a preview container.
 *
 * The frame takes the page's own aspect ratio and never grows past the height
 * budget it is given, so the browser lays it out to `min(container width,
 * budget)` with the correct proportion. The page itself is then drawn at its
 * real design size and scaled by one transform, which guarantees the complete
 * page is visible — never cropped, stretched or enlarged — and keeps every
 * element, finish and reveal hit area anchored to its design coordinates.
 */
export interface PreviewFrameProps {
  /** The page being previewed, or a record of its dimensions. */
  page?: { width: number; height: number } | null;
  /** The page artwork rendered inside the scaled stage. */
  children: React.ReactNode;
  /** Height budget the card may occupy, defaults to 82% of the viewport. */
  fitHeight?: string;
  /** Extra className on the card. */
  className?: string;
}

export function PreviewFrame({
  page,
  children,
  fitHeight = "82dvh",
  className,
}: PreviewFrameProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ scale: 0, width: 0, height: 0 });

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host || !page) return;
    const measure = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (!width || !height) return;
      const scale = Math.min(width / page.width, height / page.height);
      const next = {
        scale,
        width: Math.round(scale * page.width),
        height: Math.round(scale * page.height),
      };
      setBox((current) =>
        Math.abs(current.scale - next.scale) < 0.001 &&
        Math.abs(current.height - next.height) < 1
          ? current
          : next,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, [page, fitHeight]);

  if (!page) {
    return (
      <div
        ref={hostRef}
        className={cn("relative w-full overflow-hidden", className)}
        data-preview-frame
      >
        {children}
      </div>
    );
  }

  return (
    <div
      ref={hostRef}
      className={cn("relative mx-auto w-full overflow-hidden", className)}
      data-preview-frame
      style={{
        aspectRatio: `${page.width} / ${page.height}`,
        maxHeight: fitHeight,
        width: box.width || undefined,
        height: box.height || undefined,
      }}
    >
      {box.scale > 0 && (
        <div
          className="absolute left-0 top-0"
          style={{ width: box.width, height: box.height }}
        >
          <div
            className="origin-top-left"
            style={{
              width: page.width,
              height: page.height,
              transform: `scale(${box.scale})`,
            }}
          >
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
