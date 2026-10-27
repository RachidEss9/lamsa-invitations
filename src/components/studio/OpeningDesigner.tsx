import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { OpeningStage } from "@/components/invitation/OpeningStage";
import {
  OPENING_EXPERIENCES,
  OPENING_TONES,
  OPENING_LAYERS,
  EASINGS,
  type DesignPage,
  type EasingId,
  type EnvelopeSettings,
  type InteractiveOpeningSettings,
  type OpeningLayerId,
  type OpeningSettings,
} from "@/lib/design";
import {
  ENVELOPE_PRESETS,
  defaultEnvelopeSettings,
  envelopeMillimetres,
  envelopePresetFor,
  usableLining,
} from "@/lib/envelope";
import {
  OPENING_STAGES,
  OPENING_STORE_KEY,
  applySavedOpening,
  openingSummary,
  parseSavedOpenings,
  removeSavedOpening,
  serializeSavedOpenings,
  upsertSavedOpening,
  type SavedOpening,
} from "@/lib/openings";
import {
  OPENING_TEMPLATES,
  OPENING_STEP_ROLES,
  applyOpeningTemplate,
  defaultSequence,
  makeStep,
  sequenceTotalMs,
  type OpeningStep,
  type OpeningStepRole,
} from "@/lib/opening-sequence";
import { openingPresetOf } from "@/lib/opening";
import { interactiveMotionOf } from "@/lib/opening-interactive";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Loader2,
  Play,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";

interface OpeningDesignerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opening: OpeningSettings;
  onChange: (opening: OpeningSettings) => void;
  /**
   * Slider movement arrives dozens of times a second; these updates are folded
   * into a single undo step when the pointer is released.
   */
  onLiveChange?: (opening: OpeningSettings) => void;
  page: DesignPage | null;
  imageUrls: Record<string, string>;
  accent: string;
  background: string;
  ink: string;
  guestName?: string | null;
  names?: string;
  coverUrl?: string;
  /**
   * Cover upload lives with the host's storage code; the designer only hands
   * over the picked file and shows the busy state.
   */
  onCoverUpload?: (file: File) => Promise<void>;
  uploadingCover?: boolean;
  /** Assigns reference artwork (image or clip) to one layer of the scene. */
  onLayerUpload?: (layer: OpeningLayerId, file: File) => Promise<void>;
  uploadingLayer?: OpeningLayerId | null;
}

function readLibrary(): SavedOpening[] {
  try {
    return parseSavedOpenings(window.localStorage.getItem(OPENING_STORE_KEY));
  } catch {
    return [];
  }
}

function writeLibrary(list: SavedOpening[]) {
  try {
    window.localStorage.setItem(OPENING_STORE_KEY, serializeSavedOpenings(list));
  } catch {
    // A full or blocked storage keeps the design working; it only loses the
    // reusable presets, which is never worth interrupting the host for.
  }
}

const DEFAULT_MOTION = {
  startScale: 0.62,
  rise: 540,
  cardStart: 0.34,
};

/** The four steps of the guest-driven opening, pinned as stills for preview. */
const INTERACTIVE_STILLS: {
  id: string;
  label: string;
  note: string;
  progress: number;
}[] = [
  { id: "is-sealed", label: "Sealed", note: "The suite, untouched", progress: 0.05 },
  { id: "is-unsealed", label: "Seal gone", note: "Wax broken away", progress: 0.3 },
  { id: "is-open", label: "Flap open", note: "Liner shown, card seated", progress: 0.55 },
  { id: "is-presented", label: "Card out", note: "Invitation presented", progress: 0.92 },
];

/**
 * The Opening Designer: one place to choose a suite, dress it in materials and
 * colours, shape how the invitation leaves it, and watch the real opening play.
 *
 * Everything saved here is read by the same `OpeningStage` the public
 * invitation uses, so what the host sees is what a guest sees.
 */
export function OpeningDesigner({
  open,
  onOpenChange,
  opening,
  onChange,
  onLiveChange,
  page,
  imageUrls,
  accent,
  background,
  ink,
  guestName,
  names,
  coverUrl,
  onCoverUpload,
  uploadingCover = false,
  onLayerUpload,
  uploadingLayer = null,
}: OpeningDesignerProps) {
  const [runToken, setRunToken] = useState(0);
  const [stillStage, setStillStage] = useState<string | null>(null);
  const [presetName, setPresetName] = useState("");
  const [libraryVersion, setLibraryVersion] = useState(0);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [previewReduced, setPreviewReduced] = useState(false);
  const stationery = opening.stationery;
  const envelopeMm = envelopeMillimetres(stationery);
  const envelopePreset = envelopePresetFor(stationery);

  const saved = useMemo(
    () => (open ? readLibrary() : []),
    [open, libraryVersion],
  );

  const patch = (next: Partial<OpeningSettings>) =>
    onChange({ ...opening, ...next });

  const live = onLiveChange ?? onChange;
  const patchLive = (next: Partial<OpeningSettings>) =>
    live({ ...opening, ...next });

  const patchMotionLive = (next: Partial<typeof DEFAULT_MOTION>) =>
    live({ ...opening, motion: { ...opening.motion, ...next } });

  const patchPalette = (next: { accent?: string; hull?: string; paper?: string }) =>
    onChange({ ...opening, palette: { ...opening.palette, ...next } });

  /* --------------------- Guest-driven (interactive) opening ---------------- */

  const interactiveMotion = interactiveMotionOf(opening.interactive);

  const patchInteractive = (next: Partial<InteractiveOpeningSettings>) =>
    patch({
      interactive: {
        enabled: true,
        scene: "envelope-seal",
        ...opening.interactive,
        ...next,
      },
    });

  const patchInteractiveLive = (next: Partial<InteractiveOpeningSettings>) =>
    patchLive({
      interactive: {
        enabled: true,
        scene: "envelope-seal",
        ...opening.interactive,
        ...next,
      },
    });

  // Stationery starts from the effective size the suite is already showing, so
  // nudging one dimension never jumps the envelope to an unrelated preset.
  const stationeryBase = (): EnvelopeSettings => ({
    ...defaultEnvelopeSettings(),
    width: envelopeMm.width,
    height: envelopeMm.height,
    ...(opening.stationery ?? {}),
  });
  const patchStationery = (next: Partial<EnvelopeSettings>) =>
    patch({ stationery: { ...stationeryBase(), ...next } });
  const patchStationeryLive = (next: Partial<EnvelopeSettings>) =>
    patchLive({ stationery: { ...stationeryBase(), ...next } });

  /* ------------------------- Choreography sequence ------------------------ */

  const sequence = opening.sequence;
  const presetId = openingPresetOf(opening.experience) ?? "fade";
  const selectedStep =
    sequence?.find((step) => step.id === selectedStepId) ?? null;

  const setSequence = (steps: OpeningStep[] | undefined) =>
    patch({ sequence: steps });

  const updateStep = (id: string, next: Partial<OpeningStep>) =>
    setSequence((sequence ?? []).map((step) => (step.id === id ? { ...step, ...next } : step)));

  const updateStepLive = (id: string, next: Partial<OpeningStep>) =>
    patchLive({
      sequence: (sequence ?? []).map((step) =>
        step.id === id ? { ...step, ...next } : step,
      ),
    });

  const moveStep = (index: number, delta: number) => {
    const steps = [...(sequence ?? [])];
    const target = index + delta;
    if (target < 0 || target >= steps.length) return;
    const [moved] = steps.splice(index, 1);
    steps.splice(target, 0, moved);
    setSequence(steps);
    replay();
  };

  const deleteStep = (id: string) => {
    const steps = (sequence ?? []).filter((step) => step.id !== id);
    if (selectedStepId === id) setSelectedStepId(null);
    setSequence(steps.length > 0 ? steps : undefined);
    replay();
  };

  const addStep = () => {
    const present = new Set((sequence ?? []).map((step) => step.role));
    const role =
      (OPENING_STEP_ROLES.find((entry) => !present.has(entry.id))?.id ??
        "card") as OpeningStepRole;
    const step = makeStep(role);
    setSequence([...(sequence ?? []), step]);
    setSelectedStepId(step.id);
  };

  const replay = () => {
    setStillStage(null);
    setRunToken((value) => value + 1);
  };

  const interactiveEnabled = opening.interactive?.enabled === true;
  // The guest-driven opening has its own four steps to preview; the automatic
  // scene keeps the classic stage strip.
  const stageStills = interactiveEnabled ? INTERACTIVE_STILLS : OPENING_STAGES;
  const stillProgress =
    stillStage === null
      ? null
      : stageStills.find((stage) => stage.id === stillStage)?.progress ?? null;

  const motion = {
    startScale: opening.motion?.startScale ?? DEFAULT_MOTION.startScale,
    rise: opening.motion?.rise ?? DEFAULT_MOTION.rise,
    cardStart: opening.motion?.cardStart ?? DEFAULT_MOTION.cardStart,
  };

  const hasMaterial = opening.experience === "envelope" || opening.experience === "wax-seal";
  // Materials and colours restart the preview so the change is visible at once;
  // the emergence sliders do not, because dragging them would restart the run
  // dozens of times a second. The replay control shows the new choreography.
  const previewKey = `${runToken}-${stillStage ?? "play"}-${previewReduced ? "rm" : "full"}-${interactiveEnabled ? "interactive" : "auto"}-${Object.values(opening.interactive?.layers ?? {}).map((asset) => asset?.storageId ?? "").join(".")}-${opening.experience}-${opening.tone ?? ""}-${opening.palette?.accent ?? ""}-${opening.palette?.hull ?? ""}-${opening.palette?.paper ?? ""}-${opening.background ?? ""}-${stationery?.width ?? ""}x${stationery?.height ?? ""}-${stationery?.flapDepth ?? ""}-${stationery?.lining ?? ""}-${stationery?.sealColor ?? ""}-${stationery?.sealInitials ?? ""}-${stationery?.showFlap ?? ""}-${stationery?.showLiner ?? ""}-${stationery?.showSeal ?? ""}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94dvh] w-[calc(100vw-0.75rem)] max-w-[1100px] gap-0 overflow-hidden p-0 sm:w-full">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--edge)] px-4 py-3 pr-12">
          <div className="min-w-0">
            <DialogTitle className="font-ui text-[13px] uppercase tracking-[0.22em] text-ink">
              Opening designer
            </DialogTitle>
            <DialogDescription className="mt-1 text-[10px] text-ink/45">
              Materials, emergence and timing — saved with this invitation.
            </DialogDescription>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-md px-3 text-[10px] uppercase tracking-[0.14em]"
              onClick={() => setStillStage(stageStills[0].id)}
            >
              Hold frame
            </Button>
            <Button
              type="button"
              className="h-8 rounded-md px-3 text-[10px] uppercase tracking-[0.14em]"
              onClick={replay}
            >
              <Play className="size-3" /> Replay
            </Button>
          </div>
        </div>

        <div className="grid max-h-[calc(94dvh-3.75rem)] grid-cols-1 overflow-y-auto md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:overflow-hidden">
          {/* Live preview of the real opening */}
          <div className="border-b border-ink/10 bg-[var(--paper-deep)]/40 px-4 py-4 md:border-b-0 md:border-r">
            <div className="mx-auto w-full max-w-[320px]">
              <div className="relative aspect-[3/4] w-full overflow-hidden border border-[var(--edge)] bg-[var(--paper-light)] shadow-[0_18px_40px_rgba(22,22,22,0.14)]">
                <OpeningStage
                  key={previewKey}
                  opening={{ ...opening, autoOpen: stillProgress === null }}
                  page={page}
                  imageUrls={imageUrls}
                  accent={accent}
                  background={background}
                  ink={ink}
                  guestName={guestName ?? null}
                  names={names}
                  coverUrl={coverUrl}
                  reducedMotion={previewReduced}
                  stillAt={stillProgress ?? undefined}
                  onDone={() => undefined}
                />
              </div>

              <p className="mt-2 section-label">
                {stillProgress === null
                  ? interactiveEnabled
                    ? "Waiting for the guest"
                    : "Playing the full sequence"
                  : `Held at ${stageStills.find((stage) => stage.id === stillStage)?.label ?? ""}`}
              </p>

              {/* Sequence stages: pick one to hold that exact frame. */}
              <div
                role="group"
                aria-label="Opening stages"
                className="mt-2 grid grid-cols-4 gap-1"
              >
                {stageStills.map((stage) => (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => setStillStage(stage.id)}
                    aria-pressed={stillStage === stage.id}
                    title={stage.note}
                    className={cn(
                      "rounded-md border px-1.5 py-1.5 text-[8.5px] uppercase tracking-[0.09em] transition-[background-color,border-color,color] duration-150",
                      stillStage === stage.id
                        ? "border-[var(--red)]/70 bg-[var(--red)]/10 text-ink"
                        : "border-[var(--edge)] text-ink/50 hover:border-ink/45 hover:text-ink",
                    )}
                  >
                    {stage.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={replay}
                className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-md border border-[var(--edge)] py-1.5 text-[9px] uppercase tracking-[0.14em] text-ink/55 transition-[background-color,border-color,color] duration-150 hover:border-ink/45 hover:text-ink"
              >
                <RotateCcw className="size-3" /> Play the full opening
              </button>
              <div className="mt-1.5 flex min-h-9 items-center justify-between rounded-md border border-[var(--edge)] px-2">
                <span className="text-[10px] text-ink/55">
                  Preview reduced motion
                </span>
                <Switch
                  checked={previewReduced}
                  onCheckedChange={setPreviewReduced}
                  aria-label="Preview reduced motion"
                  className="scale-90"
                />
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="min-h-0 space-y-4 overflow-y-auto px-4 py-3">
            <section>
              <p className="section-label">
                Suite
              </p>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {OPENING_EXPERIENCES.map((experience) => (
                  <button
                    key={experience.id}
                    type="button"
                    onClick={() => patch({ experience: experience.id })}
                    aria-pressed={opening.experience === experience.id}
                    className={cn(
                      "rounded-md border px-2 py-1.5 text-left text-[10px] leading-tight transition-[background-color,border-color,color] duration-150",
                      opening.experience === experience.id
                        ? "border-[var(--red)]/70 bg-[var(--red)]/10 text-ink"
                        : "border-[var(--edge)] text-ink/60 hover:border-ink/45 hover:text-ink",
                    )}
                  >
                    {experience.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="section-label">Guest-driven opening</p>
                <Switch
                  checked={interactiveEnabled}
                  onCheckedChange={(enabled) =>
                    patch({
                      interactive: enabled
                        ? {
                            scene: "envelope-seal" as const,
                            ...opening.interactive,
                            enabled: true,
                          }
                        : undefined,
                    })
                  }
                  aria-label="Guest-driven opening"
                  className="scale-90"
                />
              </div>

              {interactiveEnabled ? (
                <>
                  <p className="text-[9px] leading-relaxed text-ink/40">
                    The guest breaks the wax seal, lifts the flap and pulls the
                    invitation out — the very engine the published invitation
                    runs. Nothing autoplays before they take part.
                  </p>

                  <div>
                    <span className="mb-1 block text-[9px] uppercase tracking-[0.1em] text-ink/45">
                      Artwork per layer
                    </span>
                    <ul className="divide-y divide-ink/10 border border-ink/10">
                      {OPENING_LAYERS.map((layer) => {
                        const asset = opening.interactive?.layers?.[layer.id];
                        const url = asset ? imageUrls[asset.storageId] : undefined;
                        return (
                          <li key={layer.id} className="flex items-center gap-2 px-2 py-2">
                            <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-md border border-[var(--edge)] bg-[var(--paper-light)]">
                              {url && asset?.kind === "video" ? (
                                <video
                                  src={url}
                                  muted
                                  playsInline
                                  className="size-full object-cover"
                                  aria-hidden
                                />
                              ) : url ? (
                                <img src={url} alt="" className="size-full object-cover" />
                              ) : (
                                <span className="text-[7.5px] uppercase tracking-[0.08em] text-ink/30">
                                  Built-in
                                </span>
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[10.5px] text-ink/80">
                                {layer.label}
                              </span>
                              <span className="block truncate text-[8.5px] text-ink/35">
                                {layer.note}
                              </span>
                            </span>
                            <label className="shrink-0 cursor-pointer rounded-md border border-[var(--edge)] px-2 py-1.5 text-[8.5px] uppercase tracking-[0.1em] text-ink/55 transition-[background-color,border-color,color] duration-150 hover:border-ink/45 hover:text-ink">
                              <span className="flex min-h-5 items-center gap-1">
                                {uploadingLayer === layer.id ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : null}
                                {asset ? "Replace" : layer.acceptsVideo ? "Image / clip" : "Assign"}
                              </span>
                              <input
                                type="file"
                                accept={
                                  layer.acceptsVideo
                                    ? "image/png,image/jpeg,image/webp,video/mp4,video/webm"
                                    : "image/png,image/jpeg,image/webp"
                                }
                                className="sr-only"
                                disabled={uploadingLayer != null || !onLayerUpload}
                                onChange={(event) => {
                                  const file = event.target.files?.[0];
                                  event.target.value = "";
                                  if (file) void onLayerUpload?.(layer.id, file);
                                }}
                              />
                            </label>
                            <button
                              type="button"
                              aria-label={`Remove the ${layer.label} artwork`}
                              disabled={!asset}
                              onClick={() => {
                                const layers = { ...opening.interactive?.layers };
                                delete layers[layer.id];
                                patchInteractive({
                                  layers: Object.keys(layers).length ? layers : undefined,
                                });
                              }}
                              className="grid size-8 shrink-0 place-items-center rounded-md text-ink/40 transition-colors duration-150 hover:bg-[var(--red)]/[0.06] hover:text-[var(--red)] disabled:pointer-events-none disabled:opacity-25"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="mt-1.5 text-[9px] leading-relaxed text-ink/35">
                      Assigned artwork replaces the built-in vector art on that
                      layer; if an upload fails to load, the built-in art stays.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="section-label">Movement</p>
                      <button
                        type="button"
                        onClick={() => patchInteractive({ motion: undefined })}
                        className="rounded px-2 text-[9px] uppercase tracking-[0.1em] text-ink/45 transition-[background-color,color] duration-150 hover:bg-ink/[0.03] hover:text-[var(--red)]"
                      >
                        Reset
                      </button>
                    </div>
                    <RangeRow
                      label="Seal reaction"
                      value={`${interactiveMotion.sealMs} ms`}
                      min={150}
                      max={1600}
                      step={30}
                      current={interactiveMotion.sealMs}
                      onInput={(value) =>
                        patchInteractiveLive({
                          motion: { ...opening.interactive?.motion, sealMs: value },
                        })
                      }
                    />
                    <RangeRow
                      label="Flap swing"
                      value={`${interactiveMotion.flapMs} ms`}
                      min={300}
                      max={4000}
                      step={60}
                      current={interactiveMotion.flapMs}
                      onInput={(value) =>
                        patchInteractiveLive({
                          motion: { ...opening.interactive?.motion, flapMs: value },
                        })
                      }
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {EASINGS.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          aria-pressed={interactiveMotion.flapEasing === entry.id}
                          onClick={() =>
                            patchInteractive({
                              motion: {
                                ...opening.interactive?.motion,
                                flapEasing: entry.id as EasingId,
                              },
                            })
                          }
                          className={cn(
                            "min-h-8 rounded-md border px-2 text-[9px] uppercase tracking-[0.08em] transition-[background-color,border-color,color] duration-150",
                            interactiveMotion.flapEasing === entry.id
                              ? "border-[var(--red)]/70 bg-[var(--red)]/10 text-ink"
                              : "border-[var(--edge)] text-ink/55 hover:border-ink/45 hover:text-ink",
                          )}
                        >
                          {entry.label}
                        </button>
                      ))}
                    </div>
                    <RangeRow
                      label="Card pull"
                      value={`${interactiveMotion.pullMs} ms`}
                      min={300}
                      max={4000}
                      step={60}
                      current={interactiveMotion.pullMs}
                      onInput={(value) =>
                        patchInteractiveLive({
                          motion: { ...opening.interactive?.motion, pullMs: value },
                        })
                      }
                    />
                  </div>

                  <p className="text-[9px] leading-relaxed text-ink/35">
                    Use the four step buttons by the preview to hold any stage,
                    and Replay to restart from the sealed state.
                  </p>
                </>
              ) : (
                <p className="text-[9px] leading-relaxed text-ink/40">
                  Turn this on to let guests unseal and open the invitation by
                  hand. Off, the saved automatic opening plays instead.
                </p>
              )}
            </section>

            {hasMaterial && (
              <section>
                <p className="section-label">
                  Material
                </p>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {OPENING_TONES.map((tone) => (
                    <button
                      key={tone.id}
                      type="button"
                      onClick={() => patch({ tone: tone.id })}
                      aria-pressed={(opening.tone ?? "crimson") === tone.id}
                      className={cn(
                        "rounded-md border p-1.5 text-left transition-[background-color,border-color,color] duration-150",
                        (opening.tone ?? "crimson") === tone.id
                          ? "border-[var(--red)]/70"
                          : "border-[var(--edge)] hover:border-ink/45",
                      )}
                    >
                      <span
                        className="block h-5 w-full border border-ink/10 rounded-md"
                        style={{ background: tone.swatch }}
                      />
                      <span className="mt-1.5 block text-[10px] text-ink/70">{tone.label}</span>
                      <span className="block text-[8.5px] leading-tight text-ink/35">
                        {tone.note}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {hasMaterial && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="section-label">
                    Envelope
                  </p>
                  <span className="font-meta text-[0.58rem] tabular-nums text-ink/35">
                    {envelopeMm.width} × {envelopeMm.height} mm
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {ENVELOPE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      title={preset.note}
                      aria-pressed={envelopePreset?.id === preset.id}
                      onClick={() =>
                        patchStationery({
                          width: preset.width,
                          height: preset.height,
                        })
                      }
                      className={cn(
                        "rounded-md border px-1.5 py-1.5 text-[9px] uppercase tracking-[0.08em] transition-[background-color,border-color,color] duration-150",
                        envelopePreset?.id === preset.id
                          ? "border-[var(--red)]/70 bg-[var(--red)]/10 text-ink"
                          : "border-[var(--edge)] text-ink/55 hover:border-ink/45 hover:text-ink",
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 block text-[9px] uppercase tracking-[0.1em] text-ink/45">
                      Width mm
                    </span>
                    <Input
                      type="number"
                      min={40}
                      max={500}
                      value={envelopeMm.width}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        if (!Number.isFinite(value)) return;
                        patchStationery({
                          width: Math.min(500, Math.max(40, value)),
                        });
                      }}
                      className="h-8 rounded-md text-[11px] tabular-nums"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[9px] uppercase tracking-[0.1em] text-ink/45">
                      Height mm
                    </span>
                    <Input
                      type="number"
                      min={40}
                      max={500}
                      value={envelopeMm.height}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        if (!Number.isFinite(value)) return;
                        patchStationery({
                          height: Math.min(500, Math.max(40, value)),
                        });
                      }}
                      className="h-8 rounded-md text-[11px] tabular-nums"
                    />
                  </label>
                </div>
                <RangeRow
                  label="Flap depth"
                  value={`${Math.round((stationery?.flapDepth ?? 0.523) * 100)}%`}
                  min={20}
                  max={75}
                  step={1}
                  current={Math.round((stationery?.flapDepth ?? 0.523) * 100)}
                  onInput={(value) => patchStationeryLive({ flapDepth: value / 100 })}
                />
                <div>
                  <span className="mb-1 block text-[9px] uppercase tracking-[0.1em] text-ink/45">
                    Parts
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { key: "showFlap", label: "Flap", on: true },
                        // A liner is an addition: nothing printed inside until
                        // the host asks for one, exactly as the stage renders it.
                        { key: "showLiner", label: "Liner", on: false },
                        { key: "showSeal", label: "Seal", on: true },
                      ] as const
                    ).map((part) => {
                      // Absent means the part follows its own historic default.
                      const shown = stationery?.[part.key] ?? part.on;
                      return (
                        <button
                          key={part.key}
                          type="button"
                          aria-pressed={shown}
                          onClick={() =>
                            patchStationery({ [part.key]: !shown })
                          }
                          className={cn(
                            "rounded-md border px-2 py-1.5 text-[9px] uppercase tracking-[0.08em] transition-[background-color,border-color,color] duration-150",
                            shown
                              ? "border-[var(--red)]/70 bg-[var(--red)]/10 text-ink"
                              : "border-[var(--edge)] text-ink/40 hover:border-ink/45 hover:text-ink",
                          )}
                        >
                          {part.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 block text-[9px] uppercase tracking-[0.1em] text-ink/45">
                      Lining
                    </span>
                    <span className="flex items-center gap-1 rounded-md border border-[var(--edge)] px-1">
                      <input
                        type="color"
                        aria-label="Envelope lining colour"
                        value={usableLining(stationery?.lining) ?? "#9c1930"}
                        onChange={(event) =>
                          patchStationery({ lining: event.target.value })
                        }
                        className="h-6 w-6 shrink-0 cursor-pointer border-0 bg-transparent p-0 rounded-full"
                      />
                      <span className="min-w-0 flex-1 truncate text-[9px] uppercase tracking-[0.06em] text-ink/40">
                        {usableLining(stationery?.lining) ?? "suite tone"}
                      </span>
                      {stationery?.lining && (
                        <button
                          type="button"
                          onClick={() => patchStationery({ lining: undefined })}
                          className="shrink-0 rounded px-1 text-[8px] uppercase text-ink/35 hover:text-[var(--red)]"
                        >
                          Auto
                        </button>
                      )}
                    </span>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[9px] uppercase tracking-[0.1em] text-ink/45">
                      Wax
                    </span>
                    <span className="flex items-center gap-1 rounded-md border border-[var(--edge)] px-1">
                      <input
                        type="color"
                        aria-label="Wax seal colour"
                        value={usableLining(stationery?.sealColor) ?? accent}
                        onChange={(event) =>
                          patchStationery({ sealColor: event.target.value })
                        }
                        className="h-6 w-6 shrink-0 cursor-pointer border-0 bg-transparent p-0 rounded-full"
                      />
                      <span className="min-w-0 flex-1 truncate text-[9px] uppercase tracking-[0.06em] text-ink/40">
                        {usableLining(stationery?.sealColor) ?? "suite accent"}
                      </span>
                      {stationery?.sealColor && (
                        <button
                          type="button"
                          onClick={() => patchStationery({ sealColor: undefined })}
                          className="shrink-0 rounded px-1 text-[8px] uppercase text-ink/35 hover:text-[var(--red)]"
                        >
                          Auto
                        </button>
                      )}
                    </span>
                  </label>
                </div>
                <label className="block">
                  <span className="mb-1 block text-[9px] uppercase tracking-[0.1em] text-ink/45">
                    Seal initials
                  </span>
                  <Input
                    value={stationery?.sealInitials ?? ""}
                    maxLength={3}
                    placeholder="A & J"
                    onChange={(event) =>
                      patchStationery({
                        sealInitials: event.target.value.slice(0, 3),
                      })
                    }
                    className="h-8 rounded-none text-[11px]"
                  />
                  <span className="mt-1 block text-[9px] text-ink/35">
                    Up to three characters, stamped into the wax.
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => patch({ stationery: undefined })}
                  className="rounded px-2 text-[9px] uppercase tracking-[0.1em] text-ink/45 transition-[background-color,color] duration-150 hover:bg-ink/[0.03] hover:text-[var(--red)]"
                >
                  Use the classic suite
                </button>
              </section>
            )}

            <section>
              <div className="flex items-center justify-between">
                <p className="section-label">
                  Suite colours
                </p>
                <button
                  type="button"
                  onClick={() => patch({ palette: undefined })}
                  className="rounded px-2 text-[9px] uppercase tracking-[0.1em] text-ink/45 transition-[background-color,color] duration-150 hover:bg-ink/[0.03] hover:text-[var(--red)]"
                >
                  Use design palette
                </button>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(
                  [
                    { key: "accent", label: "Accent", fallback: accent },
                    { key: "hull", label: "Surface", fallback: ink },
                    { key: "paper", label: "Paper", fallback: background },
                  ] as const
                ).map((entry) => {
                  const value = opening.palette?.[entry.key] ?? "";
                  const flat = /^#[0-9a-f]{3,6}$/i.test(value) ? value : "#ffffff";
                  return (
                    <label key={entry.key} className="block">
                      <span className="mb-1 block text-[9px] uppercase tracking-[0.1em] text-ink/45">
                        {entry.label}
                      </span>
                  <span className="flex items-center gap-1 rounded-md border border-[var(--edge)] px-1">
                    <input
                      type="color"
                      value={flat}
                      aria-label={`${entry.label} colour`}
                      onChange={(event) => patchPalette({ [entry.key]: event.target.value })}
                      className="h-6 w-6 shrink-0 cursor-pointer border-0 bg-transparent p-0 rounded-full"
                    />
                    <input
                      value={value}
                      placeholder="design"
                      aria-label={`${entry.label} hex`}
                      onChange={(event) =>
                        patchPalette({ [entry.key]: event.target.value || undefined })
                      }
                      className="h-7 min-w-0 bg-transparent text-[10px] outline-none placeholder:text-ink/25"
                    />
                  </span>
                    </label>
                  );
                })}
              </div>
            </section>

            <section className="space-y-3">
              <p className="section-label">
                Stage
              </p>
              <div>
                <span className="mb-1 block text-[9px] uppercase tracking-[0.1em] text-ink/45">
                  Background
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    aria-pressed={!opening.background}
                    onClick={() => patch({ background: undefined })}
                    className={cn(
                      "min-h-8 rounded-md border px-2.5 text-[9px] uppercase tracking-[0.08em] transition-[background-color,border-color,color] duration-150",
                      !opening.background
                        ? "border-[var(--red)]/70 bg-[var(--red)]/10 text-ink"
                        : "border-[var(--edge)] text-ink/55 hover:border-ink/45 hover:text-ink",
                    )}
                  >
                    Auto
                  </button>
                  {[
                    { label: "Accent", value: accent },
                    { label: "Ink", value: ink },
                    { label: "Paper", value: background },
                  ].map((swatch) => (
                    <button
                      key={swatch.label}
                      type="button"
                      title={swatch.label}
                      aria-pressed={opening.background === swatch.value}
                      onClick={() => patch({ background: swatch.value })}
                      className={cn(
                        "min-h-8 rounded-md border px-2 text-[9px] uppercase tracking-[0.08em] transition-[border-color] duration-150",
                        opening.background === swatch.value
                          ? "border-[var(--red)]/70"
                          : "border-[var(--edge)] hover:border-ink/45",
                      )}
                    >
                      <span
                        aria-hidden
                        className="mr-1.5 inline-block size-3 rounded-full border border-ink/15 align-[-2px]"
                        style={{ background: swatch.value }}
                      />
                      {swatch.label}
                    </button>
                  ))}
                  <span className="flex min-h-8 items-center gap-1 rounded-md border border-[var(--edge)] px-1.5">
                    <input
                      type="color"
                      aria-label="Custom stage background colour"
                      value={
                        /^#[0-9a-f]{3,8}$/i.test(opening.background ?? "")
                          ? opening.background!
                          : "#161616"
                      }
                      onChange={(event) =>
                        patch({ background: event.target.value })
                      }
                      className="h-5 w-5 shrink-0 cursor-pointer border-0 bg-transparent p-0 rounded-full"
                    />
                    <span className="text-[9px] uppercase tracking-[0.08em] text-ink/45">
                      Custom
                    </span>
                  </span>
                </div>
              </div>
              <div>
                <span className="mb-1 block text-[9px] uppercase tracking-[0.1em] text-ink/45">
                  Cover
                </span>
                {coverUrl ? (
                  <div className="mb-1.5 flex items-center gap-2">
                    <img
                      src={coverUrl}
                      alt="Opening cover"
                      className="h-12 w-12 rounded-md border border-[var(--edge)] object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => patch({ coverStorageId: undefined })}
                      className="min-h-8 rounded px-2 text-[9px] uppercase tracking-[0.1em] text-ink/45 transition-colors duration-150 hover:text-[var(--red)]"
                    >
                      Remove
                    </button>
                  </div>
                ) : null}
                {onCoverUpload ? (
                  <label className="flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-[var(--edge)] text-[9px] uppercase tracking-[0.14em] text-ink/55 transition-[background-color,border-color,color] duration-150 hover:border-ink/45 hover:text-ink">
                    {uploadingCover ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <ImagePlus className="size-3.5" />
                    )}
                    <span>{coverUrl ? "Replace cover" : "Upload cover"}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      disabled={uploadingCover}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (file) void onCoverUpload(file);
                      }}
                    />
                  </label>
                ) : (
                  <p className="text-[9px] leading-relaxed text-ink/35">
                    The cover image is chosen in the Opening panel.
                  </p>
                )}
              </div>
            </section>

            <section className="space-y-3">
              <p className="section-label">
                The card's emergence
              </p>
              <RangeRow
                label="Starting size"
                value={`${Math.round(motion.startScale * 100)}%`}
                min={35}
                max={110}
                step={1}
                current={Math.round(motion.startScale * 100)}
                onInput={(value) => patchMotionLive({ startScale: value / 100 })}
              />
              <RangeRow
                label="Rise from inside"
                value={`${Math.round(motion.rise)} px`}
                min={0}
                max={900}
                step={10}
                current={Math.round(motion.rise)}
                onInput={(value) => patchMotionLive({ rise: value })}
              />
              <RangeRow
                label="Emerges at"
                value={`${Math.round(motion.cardStart * 100)}%`}
                min={0}
                max={70}
                step={1}
                current={Math.round(motion.cardStart * 100)}
                onInput={(value) => patchMotionLive({ cardStart: value / 100 })}
              />
              <button
                type="button"
                onClick={() => patch({ motion: undefined })}
                className="rounded px-2 text-[9px] uppercase tracking-[0.1em] text-ink/45 transition-[background-color,color] duration-150 hover:bg-ink/[0.03] hover:text-[var(--red)]"
              >
                Reset to the suite's own choreography
              </button>
            </section>

            <section className="space-y-3">
              <p className="section-label">
                Timing and words
              </p>
              <RangeRow
                label="Length"
                value={`${(opening.duration / 1000).toFixed(1)} s`}
                min={2400}
                max={3600}
                step={100}
                current={opening.duration}
                onInput={(value) => patchLive({ duration: value })}
              />
              {sequence && sequence.length > 0 ? (
                <p className="-mt-2 text-[9px] leading-relaxed text-ink/35">
                  The choreography below sets the run at{" "}
                  {(sequenceTotalMs(sequence) / 1000).toFixed(1)} s; this length
                  is the fallback used when no sequence is set.
                </p>
              ) : null}
              <label className="block">
                <span className="mb-1 block text-[9px] uppercase tracking-[0.1em] text-ink/45">
                  Welcome line
                </span>
                <Input
                  value={opening.welcome}
                  onChange={(event) => patch({ welcome: event.target.value })}
                  className="h-8 rounded-none text-[11px]"
                />
                <span className="mt-1 block text-[9px] text-ink/35">
                  {"{{guest}}"} becomes the guest's name.
                </span>
              </label>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-ink/55">Play automatically</span>
                <Switch
                  checked={opening.autoOpen}
                  onCheckedChange={(autoOpen) => patch({ autoOpen })}
                  className="scale-90"
                />
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="section-label">
                  Choreography
                </p>
                {sequence ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSequence(undefined);
                      setSelectedStepId(null);
                      replay();
                    }}
                    className="rounded px-2 text-[9px] uppercase tracking-[0.1em] text-ink/45 transition-[background-color,color] duration-150 hover:bg-ink/[0.03] hover:text-[var(--red)]"
                  >
                    Use the suite's timing
                  </button>
                ) : null}
              </div>

              <div>
                <span className="mb-1 block text-[9px] uppercase tracking-[0.1em] text-ink/45">
                  Templates
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {OPENING_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      title={template.note}
                      onClick={() => {
                        onChange(applyOpeningTemplate(template, opening));
                        setSelectedStepId(null);
                        replay();
                      }}
                      className="rounded-md border border-[var(--edge)] px-2 py-1.5 text-left text-[10px] leading-tight text-ink/60 transition-[background-color,border-color,color] duration-150 hover:border-ink/45 hover:text-ink"
                    >
                      {template.name}
                    </button>
                  ))}
                </div>
              </div>

              {sequence && sequence.length > 0 ? (
                <>
                  <div>
                    <span className="mb-1 block text-[9px] uppercase tracking-[0.1em] text-ink/45">
                      Steps — {(sequenceTotalMs(sequence) / 1000).toFixed(1)} s
                    </span>
                    <ol className="divide-y divide-ink/10 border border-ink/10">
                      {sequence.map((step, index) => {
                        const role = OPENING_STEP_ROLES.find(
                          (entry) => entry.id === step.role,
                        );
                        const selected = step.id === selectedStepId;
                        const easing = EASINGS.find(
                          (entry) => entry.id === step.easing,
                        );
                        return (
                          <li
                            key={step.id}
                            className={cn(
                              "flex items-center gap-1 px-2 py-1.5",
                              selected && "bg-[var(--red)]/[0.06]",
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedStepId(step.id)}
                              aria-pressed={selected}
                              className="min-h-9 min-w-0 flex-1 rounded-md text-left"
                            >
                              <span className="block truncate text-[10.5px] text-ink/80">
                                {index + 1}. {role?.label ?? step.role}
                              </span>
                              <span className="block truncate font-meta text-[8.5px] tabular-nums text-ink/40">
                                {step.delay > 0 ? "+" : ""}
                                {step.delay} ms gap · {step.duration} ms ·{" "}
                                {easing?.label ?? step.easing}
                              </span>
                            </button>
                            <button
                              type="button"
                              aria-label={`Move ${role?.label ?? step.role} earlier`}
                              disabled={index === 0}
                              onClick={() => moveStep(index, -1)}
                              className="grid size-8 shrink-0 place-items-center rounded-md text-ink/45 transition-colors duration-150 hover:bg-ink/[0.04] hover:text-ink disabled:pointer-events-none disabled:opacity-25"
                            >
                              <ChevronUp className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Move ${role?.label ?? step.role} later`}
                              disabled={index === sequence.length - 1}
                              onClick={() => moveStep(index, 1)}
                              className="grid size-8 shrink-0 place-items-center rounded-md text-ink/45 transition-colors duration-150 hover:bg-ink/[0.04] hover:text-ink disabled:pointer-events-none disabled:opacity-25"
                            >
                              <ChevronDown className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete ${role?.label ?? step.role}`}
                              onClick={() => deleteStep(step.id)}
                              className="grid size-8 shrink-0 place-items-center rounded-md text-ink/40 transition-colors duration-150 hover:bg-[var(--red)]/[0.06] hover:text-[var(--red)]"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                    <button
                      type="button"
                      onClick={addStep}
                      className="mt-1.5 flex min-h-9 w-full items-center justify-center gap-1.5 rounded-md border border-[var(--edge)] text-[9px] uppercase tracking-[0.14em] text-ink/55 transition-[background-color,border-color,color] duration-150 hover:border-ink/45 hover:text-ink"
                    >
                      <Plus className="size-3" /> Add step
                    </button>
                  </div>

                  {selectedStep ? (
                    <div className="space-y-3 rounded-md border border-[var(--edge)] p-2">
                      <div>
                        <span className="mb-1 block text-[9px] uppercase tracking-[0.1em] text-ink/45">
                          Movement
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {OPENING_STEP_ROLES.map((role) => (
                            <button
                              key={role.id}
                              type="button"
                              title={role.note}
                              aria-pressed={selectedStep.role === role.id}
                              onClick={() =>
                                updateStep(selectedStep.id, { role: role.id })
                              }
                              className={cn(
                                "rounded-md border px-2 py-1.5 text-left text-[9.5px] leading-tight transition-[background-color,border-color,color] duration-150",
                                selectedStep.role === role.id
                                  ? "border-[var(--red)]/70 bg-[var(--red)]/10 text-ink"
                                  : "border-[var(--edge)] text-ink/55 hover:border-ink/45 hover:text-ink",
                              )}
                            >
                              {role.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <RangeRow
                        label="Gap before"
                        value={`${selectedStep.delay > 0 ? "+" : ""}${selectedStep.delay} ms`}
                        min={-3000}
                        max={5000}
                        step={50}
                        current={selectedStep.delay}
                        onInput={(value) =>
                          updateStepLive(selectedStep.id, { delay: value })
                        }
                      />
                      <RangeRow
                        label="Duration"
                        value={`${selectedStep.duration} ms`}
                        min={120}
                        max={6000}
                        step={60}
                        current={selectedStep.duration}
                        onInput={(value) =>
                          updateStepLive(selectedStep.id, { duration: value })
                        }
                      />
                      <div>
                        <span className="mb-1 block text-[9px] uppercase tracking-[0.1em] text-ink/45">
                          Easing
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {EASINGS.map((entry) => (
                            <button
                              key={entry.id}
                              type="button"
                              aria-pressed={selectedStep.easing === entry.id}
                              onClick={() =>
                                updateStep(selectedStep.id, {
                                  easing: entry.id as EasingId,
                                })
                              }
                              className={cn(
                                "min-h-8 rounded-md border px-2 text-[9px] uppercase tracking-[0.08em] transition-[background-color,border-color,color] duration-150",
                                selectedStep.easing === entry.id
                                  ? "border-[var(--red)]/70 bg-[var(--red)]/10 text-ink"
                                  : "border-[var(--edge)] text-ink/55 hover:border-ink/45 hover:text-ink",
                              )}
                            >
                              {entry.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[9px] leading-relaxed text-ink/40">
                      Select a step to retime it. A negative gap overlaps the
                      movement before it, the way a flap is still swinging while
                      the card starts to rise.
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      className="h-8 flex-1 rounded-md px-3 text-[10px] uppercase tracking-[0.1em]"
                      onClick={replay}
                    >
                      <Play className="size-3" /> Preview
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 flex-1 rounded-md px-3 text-[10px] uppercase tracking-[0.1em]"
                      onClick={() => {
                        const steps = defaultSequence(presetId, sequenceTotalMs(sequence));
                        setSequence(steps);
                        setSelectedStepId(steps[0]?.id ?? null);
                        replay();
                      }}
                    >
                      <RotateCcw className="size-3" /> Reset
                    </Button>
                  </div>
                </>
              ) : (
                <div>
                  <p className="text-[9px] leading-relaxed text-ink/40">
                    The suite plays its own timing. Turn it into steps to retime
                    every movement — each one stays editable afterwards.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const steps = defaultSequence(presetId);
                      setSequence(steps);
                      setSelectedStepId(steps[0]?.id ?? null);
                      replay();
                    }}
                    className="mt-2 flex min-h-9 w-full items-center justify-center gap-1.5 rounded-md border border-[var(--edge)] text-[9px] uppercase tracking-[0.14em] text-ink/60 transition-[background-color,border-color,color] duration-150 hover:border-ink/45 hover:text-ink"
                  >
                    <Plus className="size-3" /> Edit as steps
                  </button>
                </div>
              )}
            </section>

            <section>
              <p className="section-label">
                Saved openings
              </p>
              <div className="mt-2 flex gap-1">
                <Input
                  value={presetName}
                  placeholder="Name this opening"
                  onChange={(event) => setPresetName(event.target.value)}
                  className="h-8 rounded-none text-[11px]"
                />                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 shrink-0 rounded-md px-3 text-[10px] uppercase tracking-[0.1em]"
                    onClick={() => {
                      writeLibrary(
                        upsertSavedOpening(readLibrary(), opening, presetName),
                      );
                      setPresetName("");
                      setLibraryVersion((value) => value + 1);
                    }}
                  >
                    Save
                  </Button>

              </div>
              {saved.length === 0 ? (
                <p className="mt-2 text-[9px] leading-relaxed text-ink/35">
                  Saved openings can be applied to any invitation — only the suite,
                  colours and choreography travel.
                </p>
              ) : (
                <ul className="mt-2 divide-y divide-ink/10 border border-ink/10">
                  {saved.map((entry) => (
                    <li key={entry.id} className="flex items-center gap-2 rounded-md px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onChange(applySavedOpening(opening, entry));
                          replay();
                        }}
                        className="min-w-0 flex-1 rounded-md text-left"
                      >
                        <span className="block truncate text-[10.5px] text-ink/80">
                          {entry.label}
                        </span>
                        <span className="block truncate text-[8.5px] uppercase tracking-[0.08em] text-ink/35">
                          {openingSummary(entry.opening)}
                        </span>
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${entry.label}`}
                        onClick={() => {
                          writeLibrary(removeSavedOpening(readLibrary(), entry.id));
                          setLibraryVersion((value) => value + 1);
                        }}
                        className="shrink-0 rounded-full p-1 text-ink/40 hover:bg-[var(--red)]/[0.06] hover:text-[var(--red)]"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RangeRow({
  label,
  value,
  min,
  max,
  step,
  current,
  onInput,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  current: number;
  onInput: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] text-ink/55">{label}</span>
        <span className="font-meta text-[9px] tabular-nums text-ink/40">{value}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[Math.min(max, Math.max(min, current))]}
        onValueChange={([next]) => onInput(next)}
        aria-label={label}
      />
    </div>
  );
}
