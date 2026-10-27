/**
 * TEMPORARY visual-QA harness — mounts the real opening engine at a phone-sized
 * stage so it can be driven and screenshotted headlessly. Deleted after QA.
 */
import { StrictMode, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { InteractiveOpening } from "@/components/invitation/InteractiveOpening";
import { OpeningStage } from "@/components/invitation/OpeningStage";
import type { DesignDocument, DesignElement, DesignPage } from "@/lib/design";
import type { InteractiveStage } from "@/lib/opening-interactive";
import "./index.css";

const params = new URLSearchParams(window.location.search);
const mode = params.get("mode") ?? "interactive";
const withLayers = params.get("layers") === "1";
const reducedMotion = params.get("rm") === "1";
const pinned = params.get("stage") as InteractiveStage | null;

const INK = "#161616";
const ACCENT = "#710014";
const PAPER = "#f2ede4";

function text(overrides: Partial<DesignElement> & { id: string; text: string }): DesignElement {
  return {
    kind: "text",
    name: overrides.id,
    x: 90,
    y: 260,
    w: 820,
    h: 160,
    rotation: 0,
    opacity: 1,
    locked: false,
    hidden: false,
    font: "cormorant-garamond",
    fontSize: 88,
    color: INK,
    align: "center",
    animation: {
      enabled: false,
      preset: "fadeUp",
      trigger: "load",
      delay: 0,
      duration: 800,
      easing: "easeOut",
    },
    ...overrides,
  } as DesignElement;
}

const page: DesignPage = {
  id: "page-cover",
  name: "Cover",
  background: PAPER,
  elements: [
    text({ id: "eyebrow", text: "Together with their families", y: 190, fontSize: 30, color: ACCENT }),
    text({ id: "names", text: "Amelia & Søren", y: 300, fontSize: 132, font: "great-vibes" }),
    text({ id: "date", text: "Sunday, 14 June 2026 · 16:00", y: 560, fontSize: 44 }),
    text({ id: "venue", text: "The Garden Hall, Marrakech", y: 660, fontSize: 40 }),
    text({
      id: "rtl",
      text: "بفارحة سعيدة",
      y: 780,
      fontSize: 46,
      font: "amiri",
      w: 820,
      h: 120,
    }),
  ],
};

const fixtureLayers = {
  backdrop: { storageId: "qa-backdrop", kind: "image" as const },
  body: { storageId: "qa-body", kind: "image" as const },
  flap: { storageId: "qa-flap", kind: "image" as const },
  liner: { storageId: "qa-liner", kind: "image" as const },
  seal: { storageId: "qa-seal", kind: "image" as const },
};

/** Solid-colour PNG data URLs stand in for uploaded assets. */
function swatch(color: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><rect width='80' height='80' fill='${color}'/><text x='40' y='48' font-size='24' text-anchor='middle' fill='#fff'>QA</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const imageUrls: Record<string, string> = withLayers
  ? {
      "qa-backdrop": swatch("#2b2118"),
      "qa-body": swatch("#5b3a2e"),
      "qa-flap": swatch("#7a5240"),
      "qa-liner": swatch("#31424a"),
      "qa-seal": swatch("#8a1220"),
    }
  : {};

function Harness() {
  const [doneCount, setDoneCount] = useState(0);
  const settings = useMemo(
    () => ({
      enabled: true,
      scene: "envelope-seal" as const,
      ...(withLayers ? { layers: fixtureLayers } : {}),
    }),
    [],
  );

  const design: DesignDocument = useMemo(
    () =>
      ({
        version: 1,
        pages: [page],
        opening: {
          experience: "envelope",
          duration: 1700,
          autoOpen: false,
          interactive: settings,
        },
        closing: { enabled: false, style: "seal", message: "", duration: 1200 },
        transition: { preset: "fade", duration: 700 },
        startedAt: 1_700_000_000_000,
      }) as DesignDocument,
    [settings],
  );

  if (mode === "stage") {
    // The path the studio preview and the public journey both use.
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "grid",
          placeItems: "center",
          background: "#101010",
        }}
      >
        <div
          data-qa-frame
          style={{ position: "relative", width: "min(100vw, 426px)", aspectRatio: "3 / 4" }}
        >
          <OpeningStage
            opening={design.opening}
            page={page}
            imageUrls={imageUrls}
            accent={ACCENT}
            background={PAPER}
            ink={INK}
            guestName="Layla"
            names="Amelia & Søren"
            autoOpen={false}
            reducedMotion={reducedMotion}
            onDone={() => setDoneCount((count) => count + 1)}
          />
        </div>
        <span data-qa-done style={{ display: "none" }}>
          {doneCount}
        </span>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#101010" }} data-qa-root>
      <InteractiveOpening
        settings={settings}
        page={page}
        imageUrls={imageUrls}
        guestName="Layla"
        accent={ACCENT}
        background={PAPER}
        stageBackground="#141414"
        ink={INK}
        variant="full"
        previewStage={pinned}
        reducedMotion={reducedMotion}
        onDone={() => setDoneCount((count) => count + 1)}
      />
      <span data-qa-done style={{ display: "none" }}>
        {doneCount}
      </span>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Harness />
  </StrictMode>,
);