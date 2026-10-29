import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { OpeningStage } from "@/components/invitation/OpeningStage";
import {
  defaultAnimation,
  type DesignPage,
  type OpeningExperienceId,
  type OpeningSettings,
} from "@/lib/design";
import "./index.css";

/**
 * Standalone harness for the opening engine: open qa-opening.html through the
 * dev server to watch the same renderer the Studio preview and the published
 * invitation use, with a real (if small) invitation being revealed.
 */
const page: DesignPage = {
  id: "qa",
  name: "QA",
  width: 1000,
  height: 1333,
  background: "#f6f1e6",
  elements: [
    {
      id: "qa-title",
      kind: "text",
      name: "Title",
      x: 120,
      y: 380,
      w: 760,
      h: 220,
      rotation: 0,
      opacity: 1,
      locked: false,
      hidden: false,
      animation: defaultAnimation("fadeUp"),
      text: "Amira & Yusuf",
      fontSize: 128,
      fontWeight: 400,
      align: "center",
      color: "#4a000d",
      lineHeight: 1.1,
    },
    {
      id: "qa-line",
      kind: "text",
      name: "Line",
      x: 160,
      y: 640,
      w: 680,
      h: 120,
      rotation: 0,
      opacity: 1,
      locked: false,
      hidden: false,
      animation: defaultAnimation("fadeUp", 200),
      text: "Saturday, 14 June — dinner at eight",
      fontSize: 44,
      align: "center",
      color: "#5a3b33",
    },
  ],
};

const STYLES: OpeningExperienceId[] = ["cinematic", "monogram", "silk"];

/*
 * `?style=silk` picks the style and `?still=0.4` freezes one exact frame, so
 * the harness can be screenshotted at a precise moment without clicking
 * through the run (headless capture has no pointer).
 */
const params = new URLSearchParams(window.location.search);
const START_STYLE = (params.get("style") as OpeningExperienceId | null) ??
  "cinematic";
const START_STILL = (() => {
  const raw = Number(params.get("still"));
  return params.has("still") && Number.isFinite(raw) ? raw : undefined;
})();
/** `?hold=1` keeps the engine idle, so the guest's start prompt is visible. */
const HOLD = params.get("hold") === "1";

function openingFor(style: OpeningExperienceId): OpeningSettings {
  return {
    experience: style,
    duration: 3200,
    autoOpen: !HOLD,
    welcome: "For {{guest}}",
  };
}

function Harness() {
  const [style, setStyle] = useState<OpeningExperienceId>(START_STYLE);
  const [runs, setRuns] = useState(0);
  const [done, setDone] = useState(false);

  return (
    <div className="relative h-screen w-screen bg-[#101010] text-[#f6f1e6]">
      <OpeningStage
        key={`${style}-${runs}`}
        opening={openingFor(style)}
        page={page}
        imageUrls={{}}
        accent="#a3182f"
        background="#f6f1e6"
        ink="#4a000d"
        guestName="Amira"
        names="Amira & Yusuf"
        stillAt={START_STILL}
        onDone={() => setDone(true)}
        className="absolute inset-0"
      />
      <div className="absolute left-3 top-3 z-50 flex flex-wrap gap-2">
        {STYLES.map((styleId) => (
          <button
            key={styleId}
            type="button"
            className="rounded border border-white/30 bg-black/50 px-3 py-1.5 text-[11px] uppercase tracking-widest"
            onClick={() => {
              setDone(false);
              setStyle(styleId);
              setRuns((value) => value + 1);
            }}
          >
            {styleId}
          </button>
        ))}
        <button
          type="button"
          className="rounded border border-white/30 bg-black/50 px-3 py-1.5 text-[11px] uppercase tracking-widest"
          onClick={() => {
            setDone(false);
            setRuns((value) => value + 1);
          }}
        >
          Replay
        </button>
        <span className="rounded border border-white/15 bg-black/50 px-3 py-1.5 text-[11px]">
          {done ? "opened" : "closed"}
        </span>
      </div>
    </div>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <Harness />
    </StrictMode>,
  );
}
