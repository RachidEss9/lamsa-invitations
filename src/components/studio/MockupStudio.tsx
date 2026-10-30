import { DesignPageView, DesignStage } from "@/components/invitation/DesignPageView";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import sealUrl from "@/assets/opening/seal.png";
import { pageSizeOf, type DesignDocument } from "@/lib/design";
import { pieceKindSpec, type PieceKind } from "@/lib/suite";
import {
  MOCKUP_SCENES,
  MOCKUP_SURFACES,
  clampPlacement,
  defaultMockupState,
  flapBoxFor,
  loadMockupState,
  missingSceneKinds,
  mockupExportName,
  mockupPieces,
  normalizeMockupState,
  resolvePlacements,
  sceneById,
  scenePieceIds,
  stageSizeFor,
  surfaceById,
  writeMockupState,
  type MockupPlacement,
  type MockupState,
  type PlacementOverride,
} from "@/lib/mockup";
import { downloadBlob } from "@/lib/print";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  Download,
  Loader2,
  Presentation,
  RotateCcw,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-[var(--edge)] px-4 py-3">
      <p className="section-label mb-2">{title}</p>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

interface MockupStudioProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  design: DesignDocument;
  /** Stable key for saving arrangements — never the artwork itself. */
  designKey: string;
  imageUrls: Record<string, string>;
  title: string;
  rtl?: boolean;
  /**
   * Creates a real, editable suite piece (envelope, RSVP, details, liner …)
   * through the studio's own add-piece flow and returns its id, so the new
   * piece appears in the arrangement immediately. Never a placeholder.
   */
  onCreatePiece: (kind: PieceKind) => string | null;
  /** Adds a real inside page to the invitation for the folded scene. */
  onAddInsidePage: () => void;
}

/**
 * The mockup workspace: the owner's real pieces restaged as product photography
 * on configurable surfaces. Every card is the saved page at its true
 * proportions; surfaces, shadows, tilt, thickness, seal and ribbon are screen
 * simulations that never touch the print pipeline, and the export is a PNG or
 * JPEG labelled `…-mockup`, never the print-ready PDF.
 */
export function MockupStudio({
  open,
  onOpenChange,
  design,
  designKey,
  imageUrls,
  title,
  rtl,
  onCreatePiece,
  onAddInsidePage,
}: MockupStudioProps) {
  const pieces = useMemo(() => mockupPieces(design), [design]);
  const [draft, setDraft] = useState<MockupState | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ placement: MockupPlacement; px: number; py: number } | null>(null);
  const loadedFor = useRef<string | null>(null);

  // Load the saved arrangement once per workspace visit.
  useEffect(() => {
    if (!open) {
      loadedFor.current = null;
      return;
    }
    if (loadedFor.current === designKey) return;
    loadedFor.current = designKey;
    setDraft(loadMockupState(designKey, pieces) ?? defaultMockupState(pieces));
    setSelectedSlot(null);
    setDone(false);
    setError(null);
    setPresenting(false);
  }, [open, designKey, pieces]);

  const state = useMemo(
    () => normalizeMockupState(draft, pieces) ?? defaultMockupState(pieces),
    [draft, pieces],
  );

  // Arrangements are saved continuously, outside the design document — but
  // never the built-in defaults before the saved arrangement has loaded.
  useEffect(() => {
    if (open && draft) writeMockupState(designKey, state);
  }, [open, designKey, draft, state]);

  const scene = sceneById(state.sceneId);
  const surface = surfaceById(state.surfaceId);
  const selectedPieces = state.pieceIds
    .map((id) => pieces.find((piece) => piece.id === id))
    .filter((piece): piece is NonNullable<typeof piece> => Boolean(piece));
  const stage = stageSizeFor(scene, selectedPieces);
  const placements = resolvePlacements(
    scene,
    pieces,
    state.pieceIds,
    state.overrides,
  );
  const pieceById = new Map(pieces.map((piece) => [piece.id, piece]));
  const active = placements.find((item) => item.slotId === selectedSlot) ?? null;
  const activePiece = active ? pieceById.get(active.pieceId) : undefined;

  // What this scene still needs from the project, and what it can show now.
  const missingKinds = missingSceneKinds(scene, pieces);
  const invitationPiece = pieces.find((piece) => piece.kind === "invitation");
  const needsInsidePage = Boolean(
    scene.needsInside && invitationPiece && invitationPiece.pages.length < 2,
  );
  const flapPlacement = placements.find((item) => item.style === "flap");
  const flapPiece = flapPlacement
    ? pieceById.get(flapPlacement.pieceId)
    : undefined;
  const openFlap =
    flapPlacement && flapPiece ? flapBoxFor(flapPlacement, flapPiece, stage) : null;

  const patch = (value: Partial<MockupState>) => setDraft({ ...state, ...value });

  /** Scene changes also pull the pieces the scene composes with onto the stage. */
  const changeScene = (sceneId: string) => {
    const next = sceneById(sceneId);
    patch({
      sceneId,
      overrides: {},
      pieceIds: scenePieceIds(next, pieces, state.pieceIds),
    });
  };

  const updateOverrides = (slotId: string, values: PlacementOverride) => {
    setDraft({
      ...state,
      overrides: {
        ...state.overrides,
        [slotId]: { ...(state.overrides[slotId] ?? {}), ...values },
      },
    });
  };

  const togglePiece = (pieceId: string) => {
    const chosen = state.pieceIds.includes(pieceId);
    if (chosen && state.pieceIds.length <= 1) return;
    patch({
      pieceIds: chosen
        ? state.pieceIds.filter((id) => id !== pieceId)
        : [...state.pieceIds, pieceId],
    });
  };

  const onPiecePointerDown = (
    placement: MockupPlacement,
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (presenting || busy) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = { placement, px: event.clientX, py: event.clientY };
    setSelectedSlot(placement.slotId);
  };

  const onPiecePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const rect = stageRef.current?.getBoundingClientRect();
    if (!drag || !rect || rect.width <= 0) return;
    const next = clampPlacement({
      ...drag.placement,
      x: drag.placement.x + (event.clientX - drag.px) / rect.width,
      y: drag.placement.y + (event.clientY - drag.py) / rect.height,
    });
    updateOverrides(drag.placement.slotId, { x: next.x, y: next.y });
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const exportMockup = async (format: "png" | "jpeg") => {
    if (busy) return;
    setError(null);
    setDone(false);
    setBusy("Preparing image");
    try {
      const node = stageRef.current;
      if (!node) {
        throw new Error("The mockup stage did not render. Close and reopen this window.");
      }
      if (document.fonts?.ready) await document.fonts.ready;
      const { snapdom } = await import("@zumer/snapdom");
      setBusy("Rendering at high resolution");
      const width = node.getBoundingClientRect().width || 640;
      const scale = Math.min(6, Math.max(1, 2400 / width));
      const shot = await snapdom(node, { scale, dpr: 1, embedFonts: true });
      const canvas = await shot.toCanvas();
      setBusy("Encoding image");
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(
          resolve,
          format === "png" ? "image/png" : "image/jpeg",
          0.92,
        ),
      );
      canvas.width = 1;
      canvas.height = 1;
      if (!blob) throw new Error("This browser could not encode the mockup image.");
      downloadBlob(blob, mockupExportName(title, format));
      setDone(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The mockup image could not be exported.",
      );
    } finally {
      setBusy(null);
    }
  };

  const stageNode = (
    <div
      ref={stageRef}
      data-mockup-scene={scene.id}
      className="relative w-full overflow-hidden"
      style={{
        aspectRatio: `${stage.widthMm} / ${stage.heightMm}`,
        background: surface.css,
        perspective: "1400px",
        boxShadow: "inset 0 0 120px rgba(20,18,16,0.07)",
      }}
      onPointerDown={() => {
        if (!presenting) setSelectedSlot(null);
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          transform: `rotateX(${state.tilt}deg)`,
          transformOrigin: "50% 60%",
        }}
      >
        {state.ribbon && (
          <span
            aria-hidden
            className="absolute inset-y-0 left-[45%] w-[8%]"
            style={{
              zIndex: 0,
              background:
                "linear-gradient(90deg, rgba(110,24,40,0.85) 0%, rgba(155,60,78,0.9) 45%, rgba(96,18,34,0.85) 100%)",
              boxShadow: "0 0 22px rgba(0,0,0,0.22)",
            }}
          />
        )}
        {openFlap && (
          <div
            data-mockup-flap="open"
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              left: `${openFlap.x * 100}%`,
              top: `${openFlap.y * 100}%`,
              width: `${openFlap.w * 100}%`,
              height: `${openFlap.h * 100}%`,
              transform: `translate(-50%, -50%) rotate(${openFlap.rotation}deg)`,
              zIndex: 1,
              filter: "drop-shadow(0 -3px 8px rgba(20,16,12,0.22))",
            }}
          >
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
              <polygon
                points="0,100 100,100 50,3"
                fill="rgba(22,20,18,0.07)"
                stroke="rgba(22,20,18,0.2)"
                strokeWidth="0.5"
              />
            </svg>
          </div>
        )}
        {placements.map((placement) => {
          const piece = pieceById.get(placement.pieceId);
          const page = piece?.pages[placement.pageIndex] ?? piece?.pages[0];
          if (!piece || !page) return null;
          const size = pageSizeOf(page);
          return (
            <div
              key={placement.slotId}
              data-mockup-piece={piece.id}
              data-mockup-kind={piece.kind}
              className={cn(
                "absolute touch-none select-none",
                !presenting && "cursor-grab active:cursor-grabbing",
              )}
              style={{
                left: `${placement.x * 100}%`,
                top: `${placement.y * 100}%`,
                width: `${placement.w * placement.scale * 100}%`,
                transform: `translate(-50%, -50%) rotate(${placement.rotation}deg)`,
                zIndex: placement.z,
                filter: `drop-shadow(0 ${Math.round(5 + state.light * 0.16)}px ${Math.round(9 + state.light * 0.32)}px rgba(24,20,16,${(0.14 + state.light * 0.0032).toFixed(3)}))`,
              }}
              onPointerDown={(event) => onPiecePointerDown(placement, event)}
              onPointerMove={onPiecePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              title={piece.name}
            >
              <div
                className="relative"
                style={{
                  boxShadow:
                    state.thickness > 0
                      ? `0 ${state.thickness}px 0 -0.5px rgba(120,110,95,0.55)`
                      : undefined,
                }}
              >
                <DesignStage width={size.width} height={size.height}>
                  {() => (
                    <DesignPageView
                      page={page}
                      time={100000}
                      imageUrls={imageUrls}
                      guestName={null}
                      rtl={rtl}
                      ignoreExit
                      materialPreview={false}
                    />
                  )}
                </DesignStage>
                {piece.kind === "envelope" &&
                  placement.pageIndex === 1 &&
                  placement.style !== "flap" && (
                    <svg
                      data-mockup-flap="closed"
                      aria-hidden
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      className="pointer-events-none absolute inset-0 h-full w-full"
                    >
                      <polygon
                        points="0,0 100,0 50,56"
                        fill="rgba(22,20,18,0.05)"
                        stroke="rgba(22,20,18,0.16)"
                        strokeWidth="0.5"
                      />
                    </svg>
                  )}
                {placement.style === "flap" && (
                  <div
                    data-mockup-mouth
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-[12%]"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(16,13,11,0.34), rgba(16,13,11,0))",
                    }}
                  />
                )}
                {/* Editor chrome only: never while presenting, never captured
                    in an export — the downloaded image contains just the art. */}
                {selectedSlot === placement.slotId && !presenting && !busy && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -inset-[3px] border border-[#710014]/70"
                  />
                )}
              </div>
            </div>
          );
        })}
        {state.seal && (
          <img
            src={sealUrl}
            alt=""
            aria-hidden
            className="absolute w-[8%] max-w-[96px] select-none"
            style={{
              left: "76%",
              top: "84%",
              zIndex: 40,
              transform: "translate(-50%, -50%) rotate(-8deg)",
              filter: `drop-shadow(0 ${4 + state.light / 30}px ${5 + state.light / 22}px rgba(20,16,12,0.35))`,
            }}
          />
        )}
        {scene.id === "box" && (
          <div
            data-mockup-tray
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              left: "5%",
              top: "6%",
              right: "5%",
              bottom: "6%",
              borderRadius: 10,
              zIndex: 60,
              boxShadow:
                "inset 0 0 0 10px rgba(56,46,38,0.9), inset 0 10px 24px rgba(0,0,0,0.30), inset 0 -8px 18px rgba(0,0,0,0.18), 0 16px 36px rgba(24,20,16,0.28)",
            }}
          />
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(value) => !busy && onOpenChange(value)}>
      <DialogContent className="max-h-[94vh] gap-0 overflow-y-auto p-0 sm:max-w-[min(1080px,calc(100%_-_2rem))]">
        <DialogHeader className="border-b border-ink/12 px-4 py-3">
          <DialogTitle className="flex items-center gap-2 font-ui text-xl font-semibold tracking-[-0.01em]">
            <Presentation className="size-4 text-[var(--red)]" />
            Mockup studio
          </DialogTitle>
          <DialogDescription className="text-[11px] leading-relaxed text-ink/55">
            Your real pieces, restaged as product photography. This is a screen
            presentation only — surfaces, shadows, tilt, thickness, the seal,
            envelope flaps and the box tray are simulations. Print-ready PDFs
            stay under Export.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col-reverse lg:grid lg:grid-cols-[320px_1fr]">
          <div className="border-t border-ink/12 lg:border-t-0 lg:border-r">
            <Section title="Scene">
              <div className="grid grid-cols-2 gap-1.5">
                {MOCKUP_SCENES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    title={item.note}
                    aria-pressed={state.sceneId === item.id}
                    onClick={() => changeScene(item.id)}
                    className={cn(
                      "border px-2 py-1.5 text-left text-[9px] leading-tight uppercase tracking-[0.06em] transition-colors",
                      state.sceneId === item.id
                        ? "border-ink bg-ink text-[#f2f1ed]"
                        : "border-ink/20 bg-[var(--paper-light)] text-ink/60 hover:border-ink",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="text-[9px] leading-relaxed text-ink/40">{scene.note}</p>
            </Section>

            {(missingKinds.length > 0 || needsInsidePage) && (
              <Section title="Missing for this scene">
                {missingKinds.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] leading-relaxed text-ink/55">
                      This scene composes with{" "}
                      {missingKinds
                        .map((kind) => pieceKindSpec(kind).label)
                        .join(", ")}{" "}
                      {missingKinds.length === 1 ? "that does" : "that do"} not
                      exist in this project yet. Nothing is faked or substituted
                      — create the real piece and it appears on stage
                      immediately.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {missingKinds.map((kind) => (
                        <Button
                          key={kind}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 rounded-none text-[9px] uppercase tracking-[0.1em]"
                          onClick={() => {
                            const created = onCreatePiece(kind);
                            if (created) {
                              patch({
                                pieceIds: [
                                  ...new Set([...state.pieceIds, created]),
                                ],
                              });
                            }
                          }}
                        >
                          Create {pieceKindSpec(kind).label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {needsInsidePage && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] leading-relaxed text-ink/55">
                      The folded scene shows a face and an inside spread side by
                      side. This invitation has one page so far.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 rounded-none text-[9px] uppercase tracking-[0.1em]"
                      onClick={onAddInsidePage}
                    >
                      Add inside page
                    </Button>
                  </div>
                )}
              </Section>
            )}

            <Section title={`Pieces · ${selectedPieces.length}`}>
              {pieces.length === 0 ? (
                <p className="text-[10px] leading-relaxed text-ink/50">
                  This project has no visible pieces yet.
                </p>
              ) : (
                <div className="space-y-1">
                  {pieces.map((piece) => {
                    const chosen = state.pieceIds.includes(piece.id);
                    return (
                      <button
                        key={piece.id}
                        type="button"
                        aria-pressed={chosen}
                        onClick={() => togglePiece(piece.id)}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 border px-2 py-1.5 text-left transition-colors",
                          chosen
                            ? "border-[var(--red)]/50 bg-[var(--red)]/5"
                            : "border-ink/15 hover:border-ink/40",
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[10px] text-ink/80">
                            {piece.name}
                          </span>
                          <span className="block text-[8px] uppercase tracking-[0.08em] text-ink/40">
                            {piece.kind} · {Math.round(piece.widthMm)} ×{" "}
                            {Math.round(piece.heightMm)} mm
                          </span>
                        </span>
                        {chosen && <Check className="size-3.5 shrink-0 text-[var(--red)]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </Section>

            {active && activePiece && (
              <Section title={`Selected · ${activePiece.name}`}>
                <label className="block">
                  <span className="mb-1 block text-[10px] text-ink/55">
                    Rotation {Math.round(active.rotation)}°
                  </span>
                  <Slider
                    value={[active.rotation]}
                    min={-180}
                    max={180}
                    step={1}
                    onValueChange={([value]) =>
                      updateOverrides(active.slotId, { rotation: value })
                    }
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] text-ink/55">
                    Scale {active.scale.toFixed(2)}×
                  </span>
                  <Slider
                    value={[active.scale]}
                    min={0.3}
                    max={2.5}
                    step={0.05}
                    onValueChange={([value]) =>
                      updateOverrides(active.slotId, { scale: value })
                    }
                  />
                </label>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 flex-1"
                    onClick={() =>
                      updateOverrides(active.slotId, { z: active.z + 1 })
                    }
                  >
                    <ArrowUp className="size-3" /> Raise
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 flex-1"
                    onClick={() =>
                      updateOverrides(active.slotId, {
                        z: Math.max(1, active.z - 1),
                      })
                    }
                  >
                    <ArrowDown className="size-3" /> Lower
                  </Button>
                </div>
                <p className="text-[9px] leading-relaxed text-ink/40">
                  Drag the piece on the stage to reposition it. Nothing here
                  changes the saved invitation.
                </p>
              </Section>
            )}

            <Section title="Presentation">
              <div className="flex flex-wrap gap-1.5">
                {MOCKUP_SURFACES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    title={item.label}
                    aria-pressed={state.surfaceId === item.id}
                    onClick={() => patch({ surfaceId: item.id })}
                    className={cn(
                      "size-8 rounded-full border shadow-[var(--shadow-xs)]",
                      state.surfaceId === item.id
                        ? "border-ink ring-1 ring-ink/40"
                        : "border-ink/20",
                    )}
                    style={{ background: item.css }}
                  />
                ))}
              </div>
              <label className="block">
                <span className="mb-1 block text-[10px] text-ink/55">
                  Light & shadow {state.light}
                </span>
                <Slider
                  value={[state.light]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={([value]) => patch({ light: value })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] text-ink/55">
                  Perspective tilt {state.tilt}°
                </span>
                <Slider
                  value={[state.tilt]}
                  min={-14}
                  max={14}
                  step={1}
                  onValueChange={([value]) => patch({ tilt: value })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] text-ink/55">
                  Paper thickness {state.thickness.toFixed(1)}
                </span>
                <Slider
                  value={[state.thickness]}
                  min={0}
                  max={3}
                  step={0.5}
                  onValueChange={([value]) => patch({ thickness: value })}
                />
              </label>
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn("h-7 flex-1", state.seal && "border-[var(--red)] text-[var(--red)]")}
                  aria-pressed={state.seal}
                  onClick={() => patch({ seal: !state.seal })}
                >
                  Wax seal
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn("h-7 flex-1", state.ribbon && "border-[var(--red)] text-[var(--red)]")}
                  aria-pressed={state.ribbon}
                  onClick={() => patch({ ribbon: !state.ribbon })}
                >
                  Ribbon
                </Button>
              </div>
            </Section>

            <div className="space-y-2 p-4">
              {error && (
                <p className="flex items-start gap-1.5 border border-[var(--red)]/30 bg-[var(--red)]/5 p-2 text-[10px] leading-relaxed text-[var(--red)]">
                  <AlertCircle className="mt-0.5 size-3 shrink-0" /> {error}
                </p>
              )}
              {done && !busy && (
                <p className="flex items-center gap-1.5 text-[10px] text-ink/60">
                  <Check className="size-3 text-[var(--red)]" /> Mockup image
                  downloaded.
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setPresenting(true)}
                className="h-8 w-full rounded-none text-[9px] uppercase tracking-[0.12em]"
              >
                <Presentation className="size-3.5" /> Presentation mode
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  onClick={() => void exportMockup("png")}
                  disabled={Boolean(busy)}
                  className="h-8 rounded-none text-[9px] uppercase tracking-[0.12em]"
                >
                  {busy ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Download className="size-3.5" />
                  )}
                  {busy ?? "PNG"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void exportMockup("jpeg")}
                  disabled={Boolean(busy)}
                  className="h-8 rounded-none text-[9px] uppercase tracking-[0.12em]"
                >
                  <Download className="size-3.5" /> JPEG
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => patch({ overrides: {} })}
                className="h-8 w-full rounded-none text-[9px] uppercase tracking-[0.12em]"
              >
                <RotateCcw className="size-3.5" /> Reset layout
              </Button>
              <p className="text-[9px] leading-relaxed text-ink/35">
                Mockup images are presentation files, named{" "}
                <span className="font-medium">…-mockup.png</span>. They are never
                the printable artwork — use Export for the print-ready PDF.
                Arrangements are saved on this device and never alter the design.
              </p>
            </div>
          </div>

          <div className="bg-[var(--paper-deep)] p-3 sm:p-4">
            {!presenting && stageNode}
            {!presenting && (
              <p className="mx-auto mt-2 max-w-[640px] text-center text-[9px] leading-relaxed text-ink/40">
                {Math.round(stage.widthMm)} × {Math.round(stage.heightMm)} mm
                stage · drag pieces to arrange,
                tap one to rotate and restack it.
              </p>
            )}
          </div>
        </div>

        {presenting && (
          <div className="fixed inset-0 z-[130] flex flex-col items-center justify-center gap-4 bg-[#141210] p-4 sm:p-8">
            <div className="w-full max-w-[940px] shadow-[0_40px_120px_rgba(0,0,0,0.6)]">
              {stageNode}
            </div>
            <button
              type="button"
              onClick={() => setPresenting(false)}
              className="flex items-center gap-2 rounded-full border border-white/25 bg-black/40 px-4 py-2 font-ui text-[10px] uppercase tracking-[0.14em] text-white/85 backdrop-blur transition-colors hover:bg-black/60"
            >
              <X className="size-3.5" /> Close presentation
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
