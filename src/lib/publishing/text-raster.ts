/**
 * Browser rasteriser for text the PDF font set cannot encode.
 *
 * Arabic (and every other non-WinAnsi script) needs shaping, bidi and the same
 * line/column layout as the editor. Rather than reimplement those engines, this
 * module hands the frame's real SVG/foreignObject markup to the browser and
 * captures the result. The PDF writer places that capture at the frame's exact
 * position, so the text looks right but is not selectable. Callers must say so
 * in the export report.
 */

import { createElement } from "react";
import { createRoot } from "react-dom/client";

import { ObjectArt } from "@/components/publishing/ObjectArt";
import type { PublicationDocument, TextFrameObject } from "./model";

/** Print-quality target; capped so a single frame cannot exhaust memory. */
const TARGET_DPI = 300;
const MAX_PIXELS = 12_000_000;

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/**
 * Renders one text frame to a transparent PNG at (approximately) 300 dpi.
 * Returns null when the browser canvas is unavailable or encoding fails.
 */
export async function rasterizeTextFrame(
  document: PublicationDocument,
  object: TextFrameObject,
): Promise<Uint8Array | null> {
  const width = Math.max(1, object.frame.width);
  const height = Math.max(1, object.frame.height);
  if (typeof window === "undefined" || !window.document?.body) return null;

  const scale = Math.min(
    TARGET_DPI / 72,
    Math.sqrt(MAX_PIXELS / (width * height)),
  );

  const host = window.document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = [
    "position:fixed",
    "left:-100000px",
    "top:0",
    `width:${width}px`,
    `height:${height}px`,
    "background:transparent",
    "pointer-events:none",
    "z-index:-1",
  ].join(";");
  window.document.body.appendChild(host);

  const root = createRoot(host);
  let canvas: HTMLCanvasElement | null = null;
  try {
    root.render(
      createElement(
        "svg",
        {
          xmlns: "http://www.w3.org/2000/svg",
          width,
          height,
          viewBox: `${object.frame.x} ${object.frame.y} ${width} ${height}`,
          style: { background: "transparent", display: "block" },
        },
        createElement(ObjectArt, { document, object }),
      ),
    );
    // React's root render is scheduled; two frames let layout and webfont
    // fallback settle before the capture.
    await nextFrame();
    if (window.document.fonts?.ready) await window.document.fonts.ready;

    const { snapdom } = await import("@zumer/snapdom");
    const capture = await snapdom(host.firstElementChild as Element, {
      scale,
      dpr: 1,
      embedFonts: true,
      backgroundColor: "transparent",
    });
    canvas = await capture.toCanvas();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas?.toBlob(resolve, "image/png"),
    );
    if (!blob) return null;
    return new Uint8Array(await blob.arrayBuffer());
  } catch (error) {
    console.error("Text rasterisation failed", error);
    return null;
  } finally {
    root.unmount();
    host.remove();
    if (canvas) {
      canvas.width = 1;
      canvas.height = 1;
    }
  }
}
