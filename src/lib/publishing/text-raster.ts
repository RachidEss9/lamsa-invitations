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

/** The rasteriser must never quietly draw Arabic in a fallback/notdef face. */
export class ArabicFontUnavailableError extends Error {
  constructor() {
    super(
      "The Arabic font (Amiri) did not load, so this PDF was not created. Arabic text cannot be drawn with the built-in PDF fonts. Check the connection, reload the studio and export again.",
    );
    this.name = "ArabicFontUnavailableError";
  }
}

function hasNonLatinText(at: TextFrameObject, document: PublicationDocument): boolean {
  const story = at.storyId
    ? document.stories.find((entry) => entry.id === at.storyId)
    : undefined;
  if (!story) return false;
  return story.paragraphs.some((paragraph) =>
    paragraph.runs.some((run) =>
      Array.from(run.text).some((character) => (character.codePointAt(0) ?? 0) > 255),
    ),
  );
}

/** Waits for webfonts, but never longer than one export step should take. */
async function fontsSettled(fonts: FontFaceSet): Promise<void> {
  await Promise.race([
    fonts.ready,
    new Promise<void>((resolve) => setTimeout(resolve, 6000)),
  ]);
}

const ARABIC_FACE_NAMES = new Set(["amiri", "noto naskh arabic"]);

/**
 * A loaded face for one of the Arabic families, not merely "a font answered".
 * `FontFaceSet.check()` returns true for an unknown family (it falls through to
 * the system stack), which would let a blocked webfont look healthy and ship
 * missing-glyph boxes. Walking the declared faces catches that case.
 */
function arabicFontAvailable(fonts: FontFaceSet): boolean {
  let available = false;
  fonts.forEach((face) => {
    const family = face.family.replace(/["']/g, "").toLowerCase();
    if (ARABIC_FACE_NAMES.has(family) && face.status === "loaded") {
      available = true;
    }
  });
  return available;
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

  const needsArabicFont = hasNonLatinText(object, document);

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
    const fonts = window.document.fonts;
    if (fonts) {
      await fontsSettled(fonts);
      // The frame is already in the DOM, so its font requests are part of
      // `ready`. If the stack still has no Arabic face, the capture would draw
      // missing-glyph boxes; fail the export instead of shipping them.
      if (needsArabicFont && !arabicFontAvailable(fonts)) {
        throw new ArabicFontUnavailableError();
      }
    } else if (needsArabicFont) {
      throw new ArabicFontUnavailableError();
    }

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
    if (error instanceof ArabicFontUnavailableError) throw error;
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
