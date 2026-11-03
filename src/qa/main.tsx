/**
 * TEMPORARY QA HARNESS — not part of the product.
 *
 * The Studio route is behind an emailed one-time code plus a PIN, so browser
 * automation cannot sign in. This harness mounts the real, unmodified
 * StudioCanvas / LibraryPanel (finishes tab) / FinishComposer / guest
 * SequentialInvitation against a fixture invitation, so the finish rendering
 * and the finish controls can be driven by a real browser.
 *
 * It also runs data-integrity checks with the real library functions
 * (normalizeDesign, applyFinishPresetToDesign, pushHistory/undoHistory/…).
 */
import "../index.css";
import { createRoot } from "react-dom/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FinishComposer } from "@/components/studio/FinishComposer";
import { LibraryPanel } from "@/components/studio/LibraryPanel";
import { StudioCanvas } from "@/components/studio/StudioCanvas";
import { SequentialInvitation } from "@/components/invitation/SequentialInvitation";
import {
  applyFinishPresetToDesign,
  clearFinishesFromDesign,
  normalizeDesign,
  type DesignDocument,
  type DesignElement,
} from "@/lib/design";
import {
  FINISH_PREVIEW_MODES,
  finishSurfaceOf,
  finishesFor,
  normalizeFinishesConfig,
  previewForcesAnimation,
  previewSurfaceStyle,
  type FinishLayer,
  type FinishPreviewMode,
  type FinishesConfig,
} from "@/lib/finishes";
import {
  TEMPLATES,
  displayTitle,
  draftFromTemplate,
  type InvitationContent,
} from "@/lib/invitation";
import { pushHistory, redoHistory, undoHistory, type HistoryStacks } from "@/lib/studio-edit";

const ANIMATION = {
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
} as DesignDocument;

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

  // 2. Preview environments are presentation only.
  const hasPreviewKey = Object.prototype.hasOwnProperty.call(design, "finishPreviewMode");
  push(
    "preview-environment-not-stored",
    !hasPreviewKey,
    hasPreviewKey ? "design carries finishPreviewMode" : "design carries no preview key",
  );

  // 3. Legacy opening data is dropped on load.
  const legacyRaw = { ...(saved as object), opening: { scene: "cinematic-envelope", intensity: 0.8 } };
  const legacy = normalizeDesign(legacyRaw, content);
  push(
    "legacy-opening-dropped",
    !Object.prototype.hasOwnProperty.call(legacy, "opening"),
    Object.keys(legacy).includes("opening") ? "opening survived normalize" : "opening key dropped",
  );

  // 4. A preset application is a single undo step that restores exactly.
  const before = design;
  const after = applyFinishPresetToDesign(before, "royal-gold");
  let stacks: HistoryStacks = { past: pushHistory([], before), future: [] };
  const undone = undoHistory(stacks, after);
  stacks = undone?.stacks ?? stacks;
  const back = undone?.snapshot ?? after;
  const redone = redoHistory(stacks, back);
  push(
    "preset-undo-redo",
    Boolean(undone) &&
      Boolean(redone) &&
      JSON.stringify(back) === JSON.stringify(before) &&
      JSON.stringify(redone?.snapshot) === JSON.stringify(after),
    undone && redone
      ? `undo restored ${back.pages[0]?.finishes?.length ?? 0} page layers, redo restored ${redone.snapshot.pages[0]?.finishes?.length ?? 0}`
      : "history returned null",
  );

  // 5. Applying a preset supersedes the older material preset on every surface.
  const withMaterial: DesignDocument = {
    ...before,
    pages: before.pages.map((page) => ({
      ...page,
      material: { id: "linen" },
      elements: page.elements.map((element) => ({
        ...element,
        material: { id: "gold-foil" },
      })),
    })),
  } as DesignDocument;
  const dressed = applyFinishPresetToDesign(withMaterial, "pearl");
  const materialLeft = [
    ...dressed.pages.map((page) => page.material),
    ...dressed.pages.flatMap((page) => page.elements.map((element) => element.material)),
  ].filter(Boolean);
  push(
    "single-finish-system",
    materialLeft.length === 0,
    materialLeft.length === 0
      ? "preset cleared every legacy material"
      : `${materialLeft.length} material fields survived the preset`,
  );

  // 6. Curved Arabic text is a path surface: metal/relief only, no textures.
  const curved = BASE_DESIGN.pages[0]!.elements.find((element) => element.id === "names")!;
  const surface = finishSurfaceOf(curved);
  const curvedOptions = finishesFor(curved, "element");
  const textures = curvedOptions.filter((option) => option.surface === "surface");
  push(
    "curved-text-finishes",
    surface === "outline" && textures.length === 0 && curvedOptions.length > 0,
    `surface=${String(surface)}, offers=${curvedOptions.length}, textures=${textures.length}`,
  );

  // 7. Reset clears every stack and the light, keeping the artwork.
  const cleared = clearFinishesFromDesign(after);
  const stacksLeft = cleared.pages.reduce(
    (total, page) => total + (page.finishes?.length ?? 0),
    0,
  );
  const artworkKept =
    JSON.stringify(cleared.pages.map((page) => page.elements.map((element) => element.text))) ===
    JSON.stringify(after.pages.map((page) => page.elements.map((element) => element.text)));
  push(
    "reset-clears-finishes",
    stacksLeft === 0 && cleared.finishes === undefined && artworkKept,
    `stacks=${stacksLeft}, finishes=${String(cleared.finishes)}, artworkKept=${artworkKept}`,
  );

  // 8. Every preview environment has a distinct presentation treatment.
  const treatments = FINISH_PREVIEW_MODES.map((mode) =>
    JSON.stringify({ ...previewSurfaceStyle(mode.id), motion: previewForcesAnimation(mode.id) }),
  );
  push(
    "six-preview-environments",
    FINISH_PREVIEW_MODES.length === 6 && new Set(treatments).size === 6,
    `${FINISH_PREVIEW_MODES.length} modes, ${new Set(treatments).size} distinct treatments`,
  );

  return checks;
}

function App() {
  const content = useMemo(() => {
    const template = TEMPLATES.find((entry) => entry.rtl) ?? TEMPLATES[0]!;
    return {
      ...draftFromTemplate(template.id),
      names: "ليلى وعمر",
      rtl: true,
    } satisfies InvitationContent;
  }, []);

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
    const normalized = normalizeFinishesConfig(next);
    setDesign((current) => ({ ...current, finishes: normalized }));
  }, []);

  const applyPreset = useCallback((presetId: string) => {
    setDesign((current) => applyFinishPresetToDesign(current, presetId));
    setMaterialPreview(true);
  }, []);

  const resetFinishes = useCallback(() => {
    setDesign((current) => clearFinishesFromDesign(current));
  }, []);

  const writeLayers = useCallback(
    (next: FinishLayer[]) => {
      setDesign((current) => ({
        ...current,
        pages: current.pages.map((entry, index) =>
          index !== 0
            ? entry
            : {
                ...entry,
                finishes: selectedElement ? entry.finishes : next.length ? next : undefined,
                elements: selectedElement
                  ? entry.elements.map((element) =>
                      element.id === selectedElement.id
                        ? { ...element, finishes: next.length ? next : undefined }
                        : element,
                    )
                  : entry.elements,
              },
        ),
      }));
    },
    [selectedElement],
  );

  const checks = useMemo(() => runChecks(design, content), [design, content]);

  useEffect(() => {
    (window as unknown as Record<string, unknown>).__qa = {
      design,
      preview,
      selectedIds,
      materialPreview,
      comparing,
      guestOpen,
      zoom,
      checks,
      select: (ids: string[]) => setSelectedIds(ids),
      setZoom,
    };
  }, [design, preview, selectedIds, materialPreview, comparing, guestOpen, zoom, checks]);

  return (
    <div className="flex h-screen flex-col bg-[var(--paper-deep)] text-ink">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--edge)] bg-[var(--surface-card)] px-3 py-1.5">
        <span className="section-label">Finishes QA harness</span>
        <span className="font-meta text-[10px] text-ink/45">
          preview={preview} · comparing={String(comparing)} · finishes=
          {design.finishes?.preset ?? "none"} · layers={String(layers.length)}
        </span>
        <div className="ml-auto flex gap-1.5">
          <button type="button" className="chip" onClick={() => setSelectedIds([])}>
            Page scope
          </button>
          <button type="button" className="chip" onClick={() => setSelectedIds(["names"])}>
            Select curved Arabic
          </button>
          <button type="button" className="chip" onClick={() => setSelectedIds(["rule"])}>
            Select shape
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1" data-qa-canvas>
          <StudioCanvas
            page={page}
            time={1200}
            zoom={zoom}
            imageUrls={{}}
            selectedIds={selectedIds}
            showHidden={false}
            revealPreview={new Set()}
            guestName={null}
            rtl
            aspectLocked={false}
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
        </div>

        <aside className="flex w-[400px] shrink-0 flex-col border-l border-[var(--edge)] bg-[var(--surface-card)]">
          <div className="min-h-0 flex-1 overflow-y-auto" data-qa-library>
            <LibraryPanel
              open
              onClose={() => {}}
              content={content}
              design={design}
              selectedIds={selectedIds}
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
          <div className="max-h-[46vh] shrink-0 overflow-y-auto border-t border-[var(--edge)] p-3" data-qa-composer>
            <FinishComposer
              scope={selectedElement ? "element" : "page"}
              element={selectedElement}
              layers={layers}
              onChange={writeLayers}
              previewMode={materialPreview}
              onShowFinishes={() => setMaterialPreview(true)}
              onCompare={setComparing}
            />
          </div>
        </aside>
      </div>

      <Dialog open={guestOpen} onOpenChange={setGuestOpen}>
        <DialogContent className="max-w-[min(680px,calc(100%-1.5rem))] gap-0 p-0">
          <DialogHeader className="border-b border-[var(--edge)] px-5 py-4">
            <DialogTitle>Guest preview</DialogTitle>
            <DialogDescription>
              The journey the public link plays, with this invitation's saved
              finishes and studio light.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70dvh] overflow-auto bg-[var(--paper-deep)] p-4">
            <div
              data-guest-preview={preview}
              className="relative mx-auto w-full max-w-[540px] overflow-hidden"
              style={previewSurfaceStyle(preview)}
            >
              <SequentialInvitation
                design={design}
                imageUrls={{}}
                guestName={null}
                names={displayTitle(content)}
                rtl
                active
                accent={content.palette.accent}
                ink={content.palette.ink}
                forceFinishAnimations={previewForcesAnimation(preview)}
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
