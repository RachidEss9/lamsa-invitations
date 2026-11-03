

import type { LayerMaterial, MaterialBlend } from "@/lib/materials";
import type { FinishSurface } from "@/lib/finishes";

import { LibraryPanel } from "@/components/studio/LibraryPanel";
import { StudioCanvas } from "@/components/studio/StudioCanvas";
import { SequentialInvitation } from "@/components/invitation/SequentialInvitation";
import { createRoot } from "react-dom/client";
import { useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  applyFinishPresetToDesign,
  clearFinishesFromDesign,
  normalizeDesign,
  type DesignDocument,
  type DesignElement,
} from "@/lib/design";
import { pushHistory, redoHistory, undoHistory, type HistoryStacks } from "@/lib/studio-edit";
import { useEffect, useMemo, useState } from "react";
import { FINISH_PREVIEW_MODES, finishSurfaceOf, finishesFor, normalizeFinishesConfig, previewForcesAnimation, previewSurfaceStyle, type FinishLayer, type FinishPreviewMode, type FinishesConfig } from "@/lib/finishes";
import { FinishComposer } from "@/components/studio/FinishComposer";
import { TEMPLATES, displayTitle, draftFromTemplate, type InvitationContent } from "@/lib/invitation";

const ANIMATION: any = {
  enabled: true,
  preset: "fade",
  trigger: "load",
  delay: 0,
  duration: 900,
  easing: "easeOut",
};

const BASE_DESIGN: DesignDocument = {
  version: 1,
  pages: [
    {
      id: "cover",
      name: "Cover",
      background: "#f7f3ea",
      elements: [
        {
          id: "names",
          name: "Names (Arabic, curved)",
          kind: "text",
          x: 90,
          y: 150,
          w: 800,
          h: 280,
          rotation: 0,
          opacity: 1,
          text: "ليلى وعمر",
          font: "amiri",
          fontSize: 64,
          fontWeight: 400,
          align: "center",
          direction: "rtl",
          curve: 0.28,
          color: "#1b1b1b",
          animation: ANIMATION,
        },
        {
          id: "date",
          name: "Date (Arabic)",
          kind: "text",
          x: 140,
          y: 500,
          w: 700,
          h: 90,
          rotation: 0,
          opacity: 1,
          text: "١٢ ديسمبر ٢٠٢٦",
          font: "amiri",
          fontSize: 30,
          align: "center",
          direction: "rtl",
          color: "#710014",
          animation: ANIMATION,
        },
        {
          id: "rule",
          name: "Rule",
          kind: "shape",
          shape: "rect",
          x: 300,
          y: 640,
          w: 380,
          h: 8,
          rotation: 0,
          opacity: 1,
          fill: "#710014",
          animation: ANIMATION,
        },
        {
          id: "latin",
          name: "Latin subtitle",
          kind: "text",
          x: 140,
          y: 700,
          w: 700,
          h: 70,
          rotation: 0,
          opacity: 1,
          text: "Save the date",
          font: "cormorant-garamond",
          fontSize: 26,
          align: "center",
          color: "#2b2b2b",
          animation: ANIMATION,
        },
      ],
    },
    {
      id: "details",
      name: "Details",
      background: "#efe8da",
      texture: "linen",
      elements: [],
    },
  ],
  closing: { enabled: false, style: "message", message: "", duration: 800 },
  transition: { preset: "fade", duration: 600 },
};

export interface QaCheck {
  name: string;
  pass: boolean;
  detail: string;
}

/** Data-integrity checks written with the real library functions. */
function runChecks(design: DesignDocument, content: InvitationContent): QaCheck[] {
  const checks: QaCheck[] = [];
  const push = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const saved = JSON.parse(JSON.stringify(design)) as unknown;

  // 1. Save → reload keeps the finishes exactly.
  const reloaded = normalizeDesign(saved, content);
  push(
    "save-load-round-trip",
    JSON.stringify(reloaded) === JSON.stringify(design),
    JSON.stringify(reloaded.finishes) === JSON.stringify(design.finishes)
      ? "finishes identical after normalizeDesign"
      : `finishes changed: ${JSON.stringify(reloaded.finishes)}`,
  );

  // 3. Legacy opening data is dropped on load.
  const legacyRaw = { ...(saved as object), opening: { scene: "cinematic-envelope", intensity: 0.8 } };
  const legacy = normalizeDesign(legacyRaw, content);
  push(
    "legacy-opening-dropped",
    !Object.prototype.hasOwnProperty.call(legacy, "opening"),
    Object.keys(legacy).includes("opening") ? "opening survived normalize" : "opening key dropped",
  );

  // 5. Applying a preset supersedes the older material preset on every surface.
  const linen: LayerMaterial = { preset: "linen", enabled: true, intensity: 0.6, scale: 1, opacity: 1, blend: "normal", foil: "#00000000", foilStrength: 0.5, relief: 0, softness: 0, finish: "matte" } as LayerMaterial;
  const foilPatch: LayerMaterial = { preset: "wax", enabled: true, intensity: 0.7, scale: 1, opacity: 1, blend: "normal", foil: "#710014ff", foilStrength: 0.5, relief: 0, softness: 0, finish: "matte" } as LayerMaterial;
  const withMaterial = (before: DesignDocument): DesignDocument =>
    ({
      ...before,
      pages: before.pages.map((page) => ({
        ...page,
        material: linen,
        elements: page.elements.map((element) => ({ ...element, material: foilPatch })),
      })),
  push(
  );
      rtl: true,
  const [design, setDesign] = useState<DesignDocument>(BASE_DESIGN);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<FinishPreviewMode>("studio");
  const [materialPreview, setMaterialPreview] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [guestOpen, setGuestOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  const page = design.pages[0]!;
  const selectedElement =
    page.elements.find((element) => selectedIds.includes(element.id)) ?? null;
  const layers: FinishLayer[] = selectedElement
    ? selectedElement.finishes ?? []
    : page.finishes ?? [];

  const changeConfig = useCallback((next: FinishesConfig | undefined) => {
            ignoreExit
            materialPreview={materialPreview && !comparing}
            finishes={design.finishes}
            finishPreviewMode={preview}
            onZoom={setZoom}
            onSelect={setSelectedIds}
            onMove={() => {}}
            onResize={() => {}}
            onRotate={() => {}}
            onReveal={() => {}}
          />
              selectedAnimations={[]}
              tab="finishes"
              onApplyTemplate={() => {}}
              onApplyAnimation={() => {}}
              onApplyFont={() => {}}
              onApplyStyle={() => {}}
              onAddPageLayout={() => {}}
              onApplyBuiltinAsset={() => {}}
              onAddFrame={() => {}}
              onAddRevealPreset={() => {}}
              finishConfig={design.finishes}
              onFinishConfigChange={changeConfig}
              onApplyFinishPreset={applyPreset}
              activeFinishPreset={design.finishes?.preset}
              finishPreviewMode={preview}
              onFinishPreviewMode={setPreview}
              onOpenFinishPreview={() => setGuestOpen(true)}
              materialPreview={materialPreview}
              onSetMaterialPreview={setMaterialPreview}
              onResetFinishes={resetFinishes}
            />
            </div>
          </div>
          <DialogFooter className="items-center gap-2 border-t border-[var(--edge)] px-5 py-3">
            <span className="mr-auto font-ui text-[0.62rem] uppercase tracking-[0.1em] text-ink/45">
              {FINISH_PREVIEW_MODES.find((mode) => mode.id === preview)?.label}
            </span>
            <button type="button" className="chip" onClick={() => setGuestOpen(false)}>
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <pre id="qa-checks" className="hidden">
        {JSON.stringify(checks)}
      </pre>
    </div>
  );
}

createRoot(document.getElementById("qa-root")!).render(<App />);
