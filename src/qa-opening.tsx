import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { InteractiveOpening } from "@/components/invitation/InteractiveOpening";
import { defaultAnimation, type DesignPage } from "@/lib/design";
import "./index.css";

/** Standalone harness for the reference-driven opening: open qa-opening.html
 * through the dev server, tap the wax seal and step through the real scene —
 * the same renderer the Studio preview and the published invitation use.
 */
const page: DesignPage = {
  id: "qa",
  name: "QA",
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

function Harness() {
  const [runs, setRuns] = useState(0);
  const [done, setDone] = useState(false);

  return (
    <div className="relative h-screen w-screen bg-[#101010] text-[#f6f1e6]">
      <InteractiveOpening
        key={runs}
        variant="full"
        page={page}
        accent="#a3182f"
        background="#f6f1e6"
        ink="#4a000d"
        onDone={() => setDone(true)}
        className="absolute inset-0"
      />
      <div className="absolute left-3 top-3 z-30 flex gap-2">
        <button
          type="button"
          className="rounded border border-white/30 bg-black/50 px-3 py-1.5 text-[11px] uppercase tracking-widest"
          onClick={() => {
            setDone(false);
            setRuns((n) => n + 1);
          }}
        >
          Replay
        </button>
        <span className="rounded border border-white/15 bg-black/50 px-3 py-1.5 text-[11px]">
          {done ? "opened" : "sealed"}
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
