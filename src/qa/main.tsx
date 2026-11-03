import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { SequentialInvitation } from "@/components/invitation/SequentialInvitation";
import { createDefaultDesign, normalizeDesign } from "@/lib/design";
import { draftFromTemplate } from "@/lib/invitation";
import "@/index.css";

const client = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

function measure(selector: string) {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

function Harness() {
  const [template, setTemplate] = useState("adeline");
  const [containerWidth, setContainerWidth] = useState(540);

  const content = useMemo(() => draftFromTemplate(template), [template]);
  const design = useMemo(
    () => normalizeDesign(createDefaultDesign(content), content),
    [content],
  );

  useEffect(() => {
    (window as unknown as Record<string, unknown>).__qa = {
      setTemplate,
      setWidth: setContainerWidth,
      report: () => {
        const card = document.querySelector("[data-qa-card]");
        const page = document.querySelector("[data-qa-card] [data-page-edge]");
        if (!card || !page) return { error: "missing nodes" };
        const c = card.getBoundingClientRect();
        const p = page.getBoundingClientRect();
        const visibleW = Math.max(0, Math.min(c.right, p.right) - Math.max(c.left, p.left));
        const visibleH = Math.max(0, Math.min(c.bottom, p.bottom) - Math.max(c.top, p.top));
        return {
          card: { w: Math.round(c.width), h: Math.round(c.height) },
          page: { w: Math.round(p.width), h: Math.round(p.height) },
          designPage: {
            w: design.pages[0].width,
            h: design.pages[0].height,
          },
          visibleFraction: {
            w: +(visibleW / p.width).toFixed(3),
            h: +(visibleH / p.height).toFixed(3),
          },
          overflowsCard: p.width > c.width + 1 || p.height > c.height + 1,
        };
      },
      measure,
      content,
    };
  }, [design, content]);

  return (
    <div className="min-h-screen bg-[var(--paper-deep)] p-4">
      <div className="mx-auto" style={{ width: containerWidth, maxWidth: "100%" }}>
        <div data-qa-card className="w-full">
          <SequentialInvitation
            design={design}
            imageUrls={{}}
            names={content.names.primary}
            rtl={Boolean(content.rtl)}
            active
            accent={content.palette.accent}
            ink={content.palette.ink}
          />
        </div>
      </div>
      <pre id="qa-out" className="mx-auto mt-6 max-w-[720px] text-[11px]" />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexProvider client={client}>
      <Harness />
    </ConvexProvider>
  </StrictMode>,
);
