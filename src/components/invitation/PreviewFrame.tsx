import { useLayoutEffect, useRef, useState } from "react";
import { DesignStage } from "./DesignPageView";
import { pageSizeOf } from "@/lib/design";
import { cn } from "@/lib/utils";

/**
 * A frame that keeps a fixed-size design page completely visible inside an
 * arbitrary preview container. The frame follows the page's own aspect ratio:
 * it is sized from the height budget first (so the card always fits the
 * viewport) and scaled to the width, which guarantees both the whole width and
 * the whole height of the invitation are visible — never cropped, stretched or
 * enlarged. The page itself is rendered by DesignStage, which measures the
 * frame and applies a single transform scale with its origin top-left, so all
 * artwork, finishes, animations and reveal hit areas scale together and stay
 * anchored to their design coordinates.
 */
export interface PreviewFrameProps {
  /** The page the frame renders, or a record of its dimensions. */
  page?: { width: number; height: number } | null;
  /** Children rendered inside the scaled stage (the journey stage, closing etc). */
  children: React.ReactNode;
  /** Height budget the card may occupy, defaults to 82% of the viewport. */
  fitHeight?: string;
  /** Extra className on the card. */
  className?: string;
  /** Reset pan to the top-left of the page after the scale settles. */
  reset?: boolean;
}

export function PreviewFrame({
  page,
  children,
  fitHeight = "82dvh",
  className,
  reset,
}: PreviewFrameProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [currentPage, setCurrentPage] = useState<{ width: number; height: number } | null>(null);

  useLayoutEffect(() => {
    setCurrentPage(page ?? null);
  }, [page]);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (!width || !height) return;
      if (!currentPage) return;
      const fit = Math.min(width / currentPage.width, height / currentPage.height);
      setScale(fit);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    return () => ro.disconnect();
  }, [fitHeight, currentPage]);

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
      className={cn("relative w-full overflow-hidden", className)}
      data-preview-frame
    >
      {scale > 0 && currentPage && (
        <DesignStage
          width={currentPage.width}
          height={currentPage.height}
          className="absolute inset-0"
        >
          {() => children}
        </DesignStage>
      )}
    </div>
  );
}

