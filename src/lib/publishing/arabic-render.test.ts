import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ObjectArt } from "@/components/publishing/ObjectArt";
import { createDocument, createStory, createTextFrame } from "./factory";
import type { PublicationDocument, StoryParagraph, TextFrameObject } from "./model";

/**
 * Server rendering is not a shaping engine, but it does catch the mistakes a
 * browser cannot recover from: reversed Arabic, a missing `dir`, an LTR
 * paragraph inside an Arabic document, or a canvas editing surface that
 * inherits `user-select: none` and therefore cannot select text.
 */
function arabicDocument() {
  const document = createDocument({
    presetId: "custom",
    trim: { width: 400, height: 600 },
    pageCount: 2,
  });
  document.metadata.language = "ar";
  const paragraphs: StoryParagraph[] = [
    {
      id: "para_ar",
      runs: [
        {
          text: "مرحبًا بالعالم، هذا نص عربي طويل لاختبار التفاف الأسطر والأعمدة.",
        },
      ],
    },
    {
      id: "para_en",
      format: { direction: "ltr", alignment: "left" },
      runs: [{ text: "English only: LAMSA Publishing Studio." }],
    },
    {
      id: "para_mixed",
      runs: [
        { text: "Mixed English and العربية ١٢٣ 456، مع علامات ترقيم: ، ؛ ؟" },
        {
          text: " نص عريض",
          format: { fontWeight: 700, fontId: "arabic" },
        },
      ],
    },
  ];
  const story = createStory("Arabic QA", { id: "story_ar", paragraphs });
  document.stories = [story];
  const frame = createTextFrame({
    layerId: document.pages[0]!.layers[1]!.id,
    x: 20,
    y: 20,
    width: 220,
    height: 180,
    name: "Arabic text",
    storyId: story.id,
    columns: 2,
    gutter: 12,
    inset: { top: 6, right: 8, bottom: 6, left: 8 },
  });
  document.pages[0]!.objects = [frame];
  return { document, frame };
}

function render(document: PublicationDocument, object: TextFrameObject, editing = false) {
  return renderToStaticMarkup(
    createElement(ObjectArt, {
      document,
      object,
      editing,
      onTextDraft: () => undefined,
      onTextEnd: () => undefined,
      onTextSelection: () => undefined,
    }),
  );
}

describe("Arabic and mixed-direction rendering", () => {
  it("renders Arabic text right-to-left without reversing its characters", () => {
    const { document, frame } = arabicDocument();
    const html = render(document, frame);

    expect(html).toContain("مرحبًا بالعالم، هذا نص عربي طويل");
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("Amiri");
    expect(html).toContain("columns:2");
    expect(html).toContain("column-gap:12px");
  });

  it("keeps an explicitly English paragraph LTR and preserves mixed content", () => {
    const { document, frame } = arabicDocument();
    const html = render(document, frame);

    expect(html).toContain('dir="ltr"');
    expect(html).toContain("English only: LAMSA Publishing Studio.");
    expect(html).toContain("Mixed English and العربية ١٢٣ 456، مع علامات ترقيم: ، ؛ ؟");
    expect(html).toContain("نص عريض");
    expect(html).toContain("font-weight:700");
  });

  it("re-enables native selection and RTL direction in the editing surface", () => {
    const { document, frame } = arabicDocument();
    const html = render(document, frame, true);

    expect(html).toContain("<textarea");
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("user-select:text");
    expect(html).toContain("مرحبًا بالعالم");
  });
});
