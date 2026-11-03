import { useAutosave } from "@/components/platform/useAutosave";
import { projectPath } from "@/lib/platform/project";
import { reorderSections, updateSection, ensureSections, appendSection, removeSection } from "@/lib/sections";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Wordmark } from "@/components/brand/Wordmark";
import { DesignPageView, DesignStage } from "@/components/invitation/DesignPageView";
import { PreviewFrame } from "@/components/invitation/PreviewFrame";
import { useQueries } from "convex/react";
import { useSearchParams } from "react-router-dom";
import { useStudio } from "@/components/auth/studio-context";
import { usePageContext } from "@/components/studio/usePageContext";
import { useGuests } from "@/components/studio/useGuests";
import { useDevice } from "@/components/studio/useDevice";
import { SuiteBar } from "@/components/studio/SuiteBar";
import { IconButton } from "@/components/ui/button";
import { PlusIcon, LayoutIcon, PagesIcon, LayersIcon, ColourIcon, SectionsIcon, PlayIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const DEVICE_WIDTH = {
  desktop: "100%",
  tablet: "min(100%, 820px)",
  phone: "min(100%, 430px)",
} as const;

export function Studio() {
  const { page, pageIndex, zoom, selectedIds, setZoom, overlays, toggleOverlay, onSelect, onAddPage, onDeletePage, setLeftOpen, setRightOpen } = useStudio();
  const { content } = usePageContext();
  const { guestOpen, setGuestOpen, design, imageUrls } = useGuests();
  const { device } = useDevice();

  return (
    <div className="flex min-h-screen flex-col bg-[var(--surface-card)]">
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--edge)] bg-[var(--surface-overlay)] px-4 py-2">
        <div className="flex items-center gap-2">
          <Wordmark />
          <span className="hidden text-sm font-semibold text-ink sm:inline">LAMSA</span>
        </div>
        <div className="flex items-center gap-1">
          <SuiteBar />
          <div className="ml-auto flex items-center gap-1">
            <button type="button" className="pressable h-8 rounded-full border border-[var(--edge)] px-3 text-[0.66rem] font-medium text-ink/60 transition-colors hover:border-[var(--edge-strong)] hover:text-ink">
              Save
            </button>
          </div>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col gap-0">
        <div className="flex min-h-0 flex-1 flex-col gap-0">
          <aside className="relative z-20 hidden shrink-0 border-r border-[var(--edge)] bg-[var(--surface-card)] lg:flex">
            <div className="flex w-[46px] shrink-0 flex-col items-center gap-1 border-r border-[var(--edge)] bg-[var(--surface-sunk)]/40 py-2">
              <button type="button" className="pressable grid size-8 place-items-center rounded-[11px] text-ink/45 hover:bg-[var(--ink)]/5 hover:text-ink">
                <PlusIcon className="size-[16px]" strokeWidth={1.7} />
              </button>
              <button type="button" className="pressable grid size-8 place-items-center rounded-[11px] text-ink/45 hover:bg-[var(--ink)]/5 hover:text-ink">
                <LayersIcon className="size-[16px]" strokeWidth={1.7} />
              </button>
              <button type="button" className="pressable grid size-8 place-items-center rounded-[11px] text-ink/45 hover:bg-[var(--ink)]/5 hover:text-ink">
                <ColourIcon className="size-[16px]" strokeWidth={1.7} />
              </button>
              <button type="button" className="pressable grid size-8 place-items-center rounded-[11px] text-ink/45 hover:bg-[var(--ink)]/5 hover:text-ink">
                <PagesIcon className="size-[16px]" strokeWidth={1.7} />
              </button>
              <button type="button" className="pressable grid size-8 place-items-center rounded-[11px] text-ink/45 hover:bg-[var(--ink)]/5 hover:text-ink">
                <SectionsIcon className="size-[16px]" strokeWidth={1.7} />
              </button>
            </div>
            <div className="min-h-0 overflow-y-auto scroll-slim">
              <LayersPanel />
            </div>
          </aside>
          <div className="flex min-w-0 flex-1 flex-col gap-0">
            <div className="relative flex min-h-0 flex-1 flex-col">
              <div className="relative mx-auto flex min-h-0 w-full flex-1 items-stretch justify-center p-2 sm:p-4" style={{ maxWidth: DEVICE_WIDTH[device] }}>
                <StudioCanvas
                  key={page.id}
                  page={page}
                  time={100000}
                  zoom={zoom}
                  imageUrls={imageUrls}
                  selectedIds={selectedIds}
                  rtl={Boolean(content.rtl)}
                  onSelect={onSelect}
                  onZoom={setZoom}
                  overlays={overlays}
                  toggleOverlay={toggleOverlay}
                />
              </div>
              <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-t border-ink/15 bg-[var(--paper-light)] px-3 py-2">
                <span className="shrink-0 font-meta text-[8px] uppercase tracking-[0.14em] text-ink/35">Pages</span>
                {design.pages.map((candidate, index) => (
                  <div key={candidate.id} className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => {}}
                      className={cn(
                        "block w-[52px] overflow-hidden border bg-white text-left transition-colors",
                        index === pageIndex ? "border-[var(--red)]" : "border-ink/20 hover:border-ink/50",
                      )}
                      aria-label={`Page ${index + 1}: ${candidate.name}`}
                    >
                      <DesignStage width={candidate.width} height={candidate.height}>
                        {() => <DesignPageView page={candidate} time={100000} imageUrls={imageUrls} guestName={null} rtl={Boolean(content.rtl)} ignoreExit />}
                      </DesignStage>
                    </button>
                    <span className="mt-0.5 block text-center font-meta text-[7px] text-ink/35">
                      {index + 1} · {candidate.name.slice(0, 10)}
                    </span>
                  </div>
                ))}
                <button type="button" className="ml-auto grid h-[69px] w-[52px] shrink-0 place-items-center border border-dashed border-ink/25 text-ink/40 hover:border-ink hover:text-ink" aria-label="Add page">
                  <PlusIcon className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
