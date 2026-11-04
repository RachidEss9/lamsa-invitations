import { Wordmark } from "@/components/brand/Wordmark";
import {
  DesignPageView,
  DesignStage,
} from "@/components/invitation/DesignPageView";
import { SuiteBar } from "@/components/studio/SuiteBar";
import { StudioCanvas } from "@/components/studio/StudioCanvas";
import { LayersPanel } from "@/components/studio/LayersPanel";
import {
  useStudio,
  type StudioSessionValue,
} from "@/components/auth/studio-context";
import {
  suiteOf,
  activePiece,
  piecePages,
  selectPiece,
  type DesignSuite,
  type SuitePiece,
} from "@/lib/suite";
import type { DesignDocument, DesignPage } from "@/lib/design";
import { cn } from "@/lib/utils";
import {
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { toast } from "sonner";
import {
  LayoutGrid,
  Layers,
  Palette,
  FileText,
  AlignLeft,
  Plus,
} from "lucide-react";

interface StudioPageContext {
  rtl: boolean;
  guestName: string | null;
}

const DEVICE_WIDTH = {
  desktop: "100%",
  tablet: "min(100%, 820px)",
  phone: "min(100%, 430px)",
} as const;

const KIND_ICON: Record<SuitePiece["kind"], typeof LayoutGrid> = {
  invitation: LayoutGrid,
  "save-the-date": LayoutGrid,
  rsvp: FileText,
  details: FileText,
  "thank-you": FileText,
  menu: FileText,
  "place-card": FileText,
  "belly-band": Layers,
  envelope: Palette,
  liner: Layers,
  custom: FileText,
};

function useStudioSession() {
  const value = useStudio();
  const empty: StudioSessionValue = { email: null, lock: () => {} };
  return value ?? empty;
}

function useStudioDesign() {
  const design = undefined as DesignDocument | undefined;

  const [pageIndex, setPageIndex] = useState(0);
  const [rtl, setRtl] = useState(false);
  const [guestName, setGuestName] = useState<string | null>(null);
  const designRef = useRef<DesignDocument | null>(null);

  useMemo(() => {
    designRef.current = design ?? null;
  }, [design]);

  const suite = design?.suite ?? undefined;
  const pieces = suite ? suite.pieces : [];
  const active = activePiece(design ?? ({} as DesignDocument));
  const activePieceId =
    active && pieces.length > 0 ? active.id : (suite?.activePieceId ?? null);

  const setDesignRtl = useCallback((value: boolean) => {
    setRtl(value);
  }, []);

  const openGuestPreview = useCallback(() => {
    // Guest preview is reached through the public route for now.
  }, []);

  const closeGuestPreview = useCallback(() => {
    setGuestName(null);
  }, []);

  return {
    design: design ?? ({} as DesignDocument),
    imageUrls: {} as Record<string, string>,
    pageIndex,
    setPageIndex,
    rtl,
    setRtl,
    guestName,
    setGuestName,
    openGuestPreview,
    closeGuestPreview,
    activePieceId,
    pieces,
    setDesignRtl,
  };
}

export default function Studio() {
  const session = useStudioSession();
  const studio = useStudioDesign();

  const design = studio.design;
  const pieces = studio.pieces;
  const activePieceId = studio.activePieceId;

  const selectSuitePiece = useCallback(
    (pieceId: string) => {
      const result = selectPiece(design, pieceId);
      if (result) {
        studio.setPageIndex(result.pageIndex);
      }
    },
    [design, studio.setPageIndex],
  );

  const addPiece = useCallback(
    (kind: SuitePiece["kind"]) => {
      toast.info("Add piece from the suite panel.");
    },
    [],
  );

  const duplicatePiece = useCallback(() => {
    toast.info("Duplicate the active piece.");
  }, []);

  const deletePiece = useCallback(() => {
    toast.info("Delete the active piece.");
  }, []);

  const movePiece = useCallback(
    (direction: -1 | 1) => {
      toast.info("Move the active piece.");
    },
    [],
  );

  const renamePiece = useCallback(
    (name: string) => {
      toast.info("Rename the active piece.");
    },
    [],
  );

  const setGuestVisible = useCallback(
    (visible: boolean) => {
      toast.info("Toggle guest visibility.");
    },
    [],
  );

  const updatePiecePrint = useCallback(
    () => {
      toast.info("Update print brief.");
    },
    [],
  );

  const shareStyle = useCallback(() => {
    toast.info("Share style across the suite.");
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--surface-card)]">
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--edge)] bg-[var(--surface-overlay)] px-4 py-2">
        <div className="flex items-center gap-2">
          <Wordmark />
          <span className="hidden text-sm font-semibold text-ink sm:inline">
            LAMSA
          </span>
        </div>
        <div className="flex items-center gap-1">
          <SuiteBar
            design={design}
            activePieceId={activePieceId}
            onSelect={selectSuitePiece}
            onAdd={addPiece}
            onDuplicate={duplicatePiece}
            onDelete={deletePiece}
            onMove={movePiece}
            onRename={renamePiece}
            onGuestVisible={setGuestVisible}
            onPrint={updatePiecePrint}
            onShareStyle={shareStyle}
          />
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              className="pressable h-8 rounded-full border border-[var(--edge)] px-3 text-[0.66rem] font-medium text-ink/60 transition-colors hover:border-[var(--edge-strong)] hover:text-ink"
            >
              Save
            </button>
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-0">
        <div className="flex min-h-0 flex-1 flex-col gap-0">
          <aside className="relative z-20 hidden shrink-0 border-r border-[var(--edge)] bg-[var(--surface-card)] lg:flex">
            <div className="flex w-[46px] shrink-0 flex-col items-center gap-1 border-r border-[var(--edge)] bg-[var(--surface-sunk)]/40 py-2">
              <button
                type="button"
                className="pressable grid size-8 place-items-center rounded-[11px] text-ink/45 hover:bg-[var(--ink)]/5 hover:text-ink"
                aria-label="Add layer"
              >
                <Plus className="size-[16px]" strokeWidth={1.7} />
              </button>
              <button
                type="button"
                className="pressable grid size-8 place-items-center rounded-[11px] text-ink/45 hover:bg-[var(--ink)]/5 hover:text-ink"
                aria-label="Layers"
              >
                <Layers className="size-[16px]" strokeWidth={1.7} />
              </button>
              <button
                type="button"
                className="pressable grid size-8 place-items-center rounded-[11px] text-ink/45 hover:bg-[var(--ink)]/5 hover:text-ink"
                aria-label="Colour"
              >
                <Palette className="size-[16px]" strokeWidth={1.7} />
              </button>
              <button
                type="button"
                className="pressable grid size-8 place-items-center rounded-[11px] text-ink/45 hover:bg-[var(--ink)]/5 hover:text-ink"
                aria-label="Pages"
              >
                <FileText className="size-[16px]" strokeWidth={1.7} />
              </button>
              <button
                type="button"
                className="pressable grid size-8 place-items-center rounded-[11px] text-ink/45 hover:bg-[var(--ink)]/5 hover:text-ink"
                aria-label="Sections"
              >
                <AlignLeft className="size-[16px]" strokeWidth={1.7} />
              </button>
            </div>
            <div className="min-h-0 overflow-y-auto scroll-slim">
              <LayersPanel
                page={design.pages[studio.pageIndex] ?? {
                  id: "",
                  name: "",
                  background: "#ffffff",
                  elements: [],
                }}
                selectedIds={[]}
                imageUrls={{} as Record<string, string>}
                onSelect={() => {}}
                onRename={(_id, _name) => {}}
                onDuplicate={(_id) => {}}
                onDelete={(_id) => {}}
                onToggleHidden={(_id) => {}}
                onToggleLocked={(_id) => {}}
                onNudge={(_id, _direction) => {}}
                onPlace={(_id, _targetId) => {}}
                onGroup={() => {}}
                onUngroup={() => {}}
              />
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col gap-0">
            <div className="relative flex min-h-0 flex-1 flex-col">
              <div
                className="relative mx-auto flex min-h-0 w-full flex-1 items-stretch justify-center p-2 sm:p-4"
                style={{ maxWidth: DEVICE_WIDTH["desktop"] }}
              >
                <StudioCanvas
                  key={design.pages[studio.pageIndex]?.id ?? ""}
                  page={design.pages[studio.pageIndex] ?? {
                    id: "",
                    name: "",
                    background: "#ffffff",
                    elements: [],
                  }}
                  time={100000}
                  zoom={1}
                  imageUrls={{} as Record<string, string>}
                  selectedIds={[]}
                  showHidden={false}
                  revealPreview={new Set()}
                  guestName={null}
                  rtl={studio.rtl}
                  aspectLocked={false}
                  ignoreExit
                  onZoom={() => {}}
                  onSelect={() => {}}
                  onMove={() => {}}
                  onResize={() => {}}
                  onRotate={() => {}}
                  onReveal={() => {}}
                  onTextCommit={() => {}}
                  onEditingChange={() => {}}
                  onTextOverflow={() => {}}
                />
              </div>

              <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-t border-ink/15 bg-[var(--paper-light)] px-3 py-2">
                <span className="shrink-0 font-meta text-[8px] uppercase tracking-[0.14em] text-ink/35">
                  Pages
                </span>
                {design.pages.map(
                  (
                    candidate: {
                      id: string;
                      name: string;
                      width?: number;
                      height?: number;
                    },
                    index: number,
                  ) => (
                    <div key={candidate.id} className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => studio.setPageIndex(index)}
                        className={cn(
                          "block w-[52px] overflow-hidden border bg-white text-left transition-colors",
                          index === studio.pageIndex
                            ? "border-[var(--red)]"
                            : "border-ink/20 hover:border-ink/50",
                        )}
                        aria-label={`Page ${index + 1}: ${candidate.name}`}
                      >
                        <DesignStage
                          width={candidate.width}
                          height={candidate.height}
                        >
                          {() => (
                            <DesignPageView
                              page={candidate as any as DesignPage}
                              time={100000}
                              imageUrls={studio.imageUrls}
                              guestName={null}
                              rtl={studio.rtl}
                              ignoreExit
                            />
                          )}
                        </DesignStage>
                      </button>
                      <span className="mt-0.5 block text-center font-meta text-[7px] text-ink/35">
                        {index + 1} · {candidate.name.slice(0, 10)}
                      </span>
                    </div>
                  ),
                )}
                <button
                  type="button"
                  className="ml-auto grid h-[69px] w-[52px] shrink-0 place-items-center border border-dashed border-ink/25 text-ink/40 hover:border-ink hover:text-ink"
                  aria-label="Add page"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
