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
  type DesignPage,
  type EnvelopeSettings,
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
import { cn } from "@/lib/utils";
import { Play, RotateCcw, Trash2 } from "lucide-react";
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
}: OpeningDesignerProps) {
  const [runToken, setRunToken] = useState(0);
  const [stillStage, setStillStage] = useState<string | null>(null);
  const [presetName, setPresetName] = useState("");
  const [libraryVersion, setLibraryVersion] = useState(0);
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

  const replay = () => {
    setStillStage(null);
    setRunToken((value) => value + 1);
  };

  const stillProgress =
    stillStage === null
      ? null
      : OPENING_STAGES.find((stage) => stage.id === stillStage)?.progress ?? null;

  const motion = {
    startScale: opening.motion?.startScale ?? DEFAULT_MOTION.startScale,
    rise: opening.motion?.rise ?? DEFAULT_MOTION.rise,
    cardStart: opening.motion?.cardStart ?? DEFAULT_MOTION.cardStart,
  };

  const hasMaterial = opening.experience === "envelope" || opening.experience === "wax-seal";
  // Materials and colours restart the preview so the change is visible at once;
  // the emergence sliders do not, because dragging them would restart the run
  // dozens of times a second. The replay control shows the new choreography.
  const previewKey = `${runToken}-${stillStage ?? "play"}-${opening.experience}-${opening.tone ?? ""}-${opening.palette?.accent ?? ""}-${opening.palette?.hull ?? ""}-${opening.palette?.paper ?? ""}-${stationery?.width ?? ""}x${stationery?.height ?? ""}-${stationery?.flapDepth ?? ""}-${stationery?.lining ?? ""}-${stationery?.sealColor ?? ""}-${stationery?.sealInitials ?? ""}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94dvh] w-[calc(100vw-0.75rem)] max-w-[1100px] gap-0 overflow-hidden p-0 sm:w-full">
        <div className="flex flex-wrap items-center gap-3 border-b border-ink/12 px-4 py-3 pr-12">
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
              className="h-8 rounded-none px-3 text-[10px] uppercase tracking-[0.14em]"
              onClick={() => setStillStage("sealed")}
            >
              Hold frame
            </Button>
            <Button
              type="button"
              className="h-8 rounded-none px-3 text-[10px] uppercase tracking-[0.14em]"
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
              <div className="relative aspect-[3/4] w-full overflow-hidden border border-ink/12 bg-[var(--paper-light)] shadow-[0_18px_40px_rgba(22,22,22,0.14)]">
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
                  stillAt={stillProgress ?? undefined}
                  onDone={() => undefined}
                />
              </div>

              <p className="mt-2 font-meta text-[9px] uppercase tracking-[0.16em] text-ink/40">
                {stillProgress === null
                  ? "Playing the full sequence"
                  : `Held at ${OPENING_STAGES.find((stage) => stage.id === stillStage)?.label ?? ""}`}
              </p>

              {/* Sequence stages: pick one to hold that exact frame. */}
              <div
                role="group"
                aria-label="Opening stages"
                className="mt-2 grid grid-cols-4 gap-1"
              >
                {OPENING_STAGES.map((stage) => (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => setStillStage(stage.id)}
                    aria-pressed={stillStage === stage.id}
                    title={stage.note}
                    className={cn(
                      "border px-1 py-1.5 text-[8.5px] uppercase tracking-[0.1em] transition-colors",
                      stillStage === stage.id
                        ? "border-[var(--red)] bg-[var(--red)]/8 text-ink"
                        : "border-ink/15 text-ink/50 hover:border-ink/40 hover:text-ink",
                    )}
                  >
                    {stage.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={replay}
                className="mt-1.5 flex w-full items-center justify-center gap-1.5 border border-ink/15 py-1.5 text-[9px] uppercase tracking-[0.14em] text-ink/55 transition-colors hover:border-ink hover:text-ink"
              >
                <RotateCcw className="size-3" /> Play the full opening
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="min-h-0 space-y-5 overflow-y-auto px-4 py-4">
            <section>
              <p className="font-meta text-[9px] uppercase tracking-[0.18em] text-ink/45">
                Suite
              </p>
              <div className="mt-2 grid grid-cols-2 gap-1">
                {OPENING_EXPERIENCES.map((experience) => (
                  <button
                    key={experience.id}
                    type="button"
                    onClick={() => patch({ experience: experience.id })}
                    aria-pressed={opening.experience === experience.id}
                    className={cn(
                      "border px-2 py-1.5 text-left text-[10px] leading-tight transition-colors",
                      opening.experience === experience.id
                        ? "border-[var(--red)] bg-[var(--red)]/8 text-ink"
                        : "border-ink/15 text-ink/60 hover:border-ink/40 hover:text-ink",
                    )}
                  >
                    {experience.label}
                  </button>
                ))}
              </div>
            </section>

            {hasMaterial && (
              <section>
                <p className="font-meta text-[9px] uppercase tracking-[0.18em] text-ink/45">
                  Material
                </p>
                <div className="mt-2 grid grid-cols-3 gap-1">
                  {OPENING_TONES.map((tone) => (
                    <button
                      key={tone.id}
                      type="button"
                      onClick={() => patch({ tone: tone.id })}
                      aria-pressed={(opening.tone ?? "crimson") === tone.id}
                      className={cn(
                        "border p-1.5 text-left transition-colors",
                        (opening.tone ?? "crimson") === tone.id
                          ? "border-[var(--red)]"
                          : "border-ink/15 hover:border-ink/40",
                      )}
                    >
                      <span
                        className="block h-5 w-full border border-ink/10"
                        style={{ background: tone.swatch }}
                      />
                      <span className="mt-1 block text-[10px] text-ink/70">{tone.label}</span>
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
                  <p className="font-meta text-[9px] uppercase tracking-[0.18em] text-ink/45">
                    Envelope
                  </p>
                  <span className="font-meta text-[9px] tabular-nums text-ink/35">
                    {envelopeMm.width} × {envelopeMm.height} mm
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
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
                        "border px-1.5 py-1.5 text-[9px] uppercase tracking-[0.08em] transition-colors",
                        envelopePreset?.id === preset.id
                          ? "border-[var(--red)] bg-[var(--red)]/8 text-ink"
                          : "border-ink/15 text-ink/55 hover:border-ink/40 hover:text-ink",
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
                      className="h-8 rounded-none text-[11px] tabular-nums"
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
                      className="h-8 rounded-none text-[11px] tabular-nums"
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
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 block text-[9px] uppercase tracking-[0.1em] text-ink/45">
                      Lining
                    </span>
                    <span className="flex items-center gap-1 border border-ink/15 px-1">
                      <input
                        type="color"
                        aria-label="Envelope lining colour"
                        value={usableLining(stationery?.lining) ?? "#9c1930"}
                        onChange={(event) =>
                          patchStationery({ lining: event.target.value })
                        }
                        className="h-6 w-6 shrink-0 cursor-pointer border-0 bg-transparent p-0"
                      />
                      <span className="min-w-0 flex-1 truncate text-[9px] uppercase tracking-[0.06em] text-ink/40">
                        {usableLining(stationery?.lining) ?? "suite tone"}
                      </span>
                      {stationery?.lining && (
                        <button
                          type="button"
                          onClick={() => patchStationery({ lining: undefined })}
                          className="shrink-0 px-1 text-[8px] uppercase text-ink/35 hover:text-[var(--red)]"
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
                    <span className="flex items-center gap-1 border border-ink/15 px-1">
                      <input
                        type="color"
                        aria-label="Wax seal colour"
                        value={usableLining(stationery?.sealColor) ?? accent}
                        onChange={(event) =>
                          patchStationery({ sealColor: event.target.value })
                        }
                        className="h-6 w-6 shrink-0 cursor-pointer border-0 bg-transparent p-0"
                      />
                      <span className="min-w-0 flex-1 truncate text-[9px] uppercase tracking-[0.06em] text-ink/40">
                        {usableLining(stationery?.sealColor) ?? "suite accent"}
                      </span>
                      {stationery?.sealColor && (
                        <button
                          type="button"
                          onClick={() => patchStationery({ sealColor: undefined })}
                          className="shrink-0 px-1 text-[8px] uppercase text-ink/35 hover:text-[var(--red)]"
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
                  className="text-[9px] uppercase tracking-[0.1em] text-ink/40 hover:text-[var(--red)]"
                >
                  Use the classic suite
                </button>
              </section>
            )}

            <section>
              <div className="flex items-center justify-between">
                <p className="font-meta text-[9px] uppercase tracking-[0.18em] text-ink/45">
                  Suite colours
                </p>
                <button
                  type="button"
                  onClick={() => patch({ palette: undefined })}
                  className="text-[9px] uppercase tracking-[0.1em] text-ink/40 hover:text-[var(--red)]"
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
                      <span className="flex items-center gap-1 border border-ink/15 px-1">
                        <input
                          type="color"
                          value={flat}
                          aria-label={`${entry.label} colour`}
                          onChange={(event) => patchPalette({ [entry.key]: event.target.value })}
                          className="h-6 w-6 shrink-0 cursor-pointer border-0 bg-transparent p-0"
                        />
                        <input
                          value={value}
                          placeholder="design"
                          aria-label={`${entry.label} hex`}
                          onChange={(event) =>
                            patchPalette({ [entry.key]: event.target.value || undefined })
                          }
                          className="h-7 w-full min-w-0 bg-transparent text-[10px] outline-none placeholder:text-ink/25"
                        />
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>

            <section className="space-y-3">
              <p className="font-meta text-[9px] uppercase tracking-[0.18em] text-ink/45">
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
                className="text-[9px] uppercase tracking-[0.1em] text-ink/40 hover:text-[var(--red)]"
              >
                Reset to the suite's own choreography
              </button>
            </section>

            <section className="space-y-3">
              <p className="font-meta text-[9px] uppercase tracking-[0.18em] text-ink/45">
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

            <section>
              <p className="font-meta text-[9px] uppercase tracking-[0.18em] text-ink/45">
                Saved openings
              </p>
              <div className="mt-2 flex gap-1">
                <Input
                  value={presetName}
                  placeholder="Name this opening"
                  onChange={(event) => setPresetName(event.target.value)}
                  className="h-8 rounded-none text-[11px]"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 shrink-0 rounded-none px-3 text-[10px] uppercase tracking-[0.1em]"
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
                    <li key={entry.id} className="flex items-center gap-2 px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onChange(applySavedOpening(opening, entry));
                          replay();
                        }}
                        className="min-w-0 flex-1 text-left"
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
                        className="shrink-0 p-1 text-ink/35 hover:text-[var(--red)]"
                      >
                        <Trash2 className="size-3" />
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
