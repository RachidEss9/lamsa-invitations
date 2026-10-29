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
  type OpeningSettings,
} from "@/lib/design";
import { monogramOf, type OpeningStyleId } from "@/lib/opening-style";
import {
  OPENING_LOOKS,
  OPENING_STAGES,
  OPENING_STORE_KEY,
  applySavedOpening,
  openingSummary,
  parseSavedOpenings,
  removeSavedOpening,
  serializeSavedOpenings,
  upsertSavedOpening,
  type OpeningLook,
  type SavedOpening,
} from "@/lib/openings";
import { cn } from "@/lib/utils";
import { Play, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

interface OpeningDesignerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opening: OpeningSettings;
  onChange: (opening: OpeningSettings) => void;
  /**
   * Slider movement arrives dozens of a second; these updates are folded into
   * a single undo step when the pointer is released.
   */
  onLiveChange?: (opening: OpeningSettings) => void;
  page: DesignPage | null;
  imageUrls: Record<string, string>;
  accent: string;
  background: string;
  ink: string;
  guestName?: string | null;
  names?: string;
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

/**
 * A small, honest swatch for one style. It draws the style's own gesture — a
 * spotlight, metallic initials, a ribbon — not a stand-in invitation, so a
 * host can tell the three apart without the preview having to play.
 */
function StyleSwatch({
  style,
  names,
  accent,
}: {
  style: OpeningStyleId;
  names?: string;
  accent: string;
}) {
  return (
    <span
      aria-hidden
      className="relative block h-16 w-full overflow-hidden"
      style={{ background: "linear-gradient(165deg, #141414, #050505)" }}
    >
      {style === "cinematic" && (
        <span
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 45%, rgba(255,247,230,0.7) 0%, rgba(255,247,230,0.12) 42%, transparent 68%)",
            boxShadow: "inset 0 0 26px 12px rgba(0,0,0,0.85)",
          }}
        />
      )}
      {style === "monogram" && (
        <span
          className="absolute inset-0 grid place-items-center font-display text-2xl"
          style={{
            backgroundImage:
              "linear-gradient(100deg, #6f521a, #d9b45c 30%, #fff6d8 50%, #b98f34 72%, #e8c877)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            WebkitTextFillColor: "transparent",
          }}
        >
          {monogramOf(names)}
        </span>
      )}
      {style === "silk" && (
        <span
          className="absolute left-1/2 top-1/2 block h-9 w-[150%] -translate-x-1/2 -translate-y-1/2 -rotate-6 rounded-full blur-[6px]"
          style={{
            background: `linear-gradient(102deg, transparent, ${accent}55 22%, rgba(255,247,230,0.85) 52%, ${accent}66 78%, transparent)`,
          }}
        />
      )}
    </span>
  );
}

/**
 * The Opening Designer: choose one of the three opening styles, dress the
 * environment, and watch the real invitation play it.
 *
 * Everything saved here is read by the same `OpeningStage` the public
 * invitation uses, so what the host sees is what a guest sees. The invitation
 * in the preview is the saved design itself — never a stand-in.
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
}: OpeningDesignerProps) {
  const [runToken, setRunToken] = useState(0);
  const [stillId, setStillId] = useState<string | null>(null);
  const [presetName, setPresetName] = useState("");
  const [libraryVersion, setLibraryVersion] = useState(0);

  const saved = useMemo(
    () => (open ? readLibrary() : []),
    [open, libraryVersion],
  );

  const patch = (next: Partial<OpeningSettings>) =>
    onChange({ ...opening, ...next });

  const live = onLiveChange ?? onChange;
  const patchLive = (next: Partial<OpeningSettings>) =>
    live({ ...opening, ...next });

  const still = stillId
    ? (OPENING_STAGES.find((stage) => stage.id === stillId) ?? null)
    : null;

  const applyLook = (look: OpeningLook) =>
    patch({
      experience: look.experience,
      tone: look.tone,
      palette: { ...look.palette },
      duration: look.duration,
    });

  const play = () => {
    setStillId(null);
    setRunToken((value) => value + 1);
  };

  const previewKey = `${runToken}-${stillId ?? "play"}`;
  const hasStyle = opening.experience !== "none";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[980px] gap-0 overflow-hidden p-0">
        <div className="max-h-[86vh] overflow-y-auto">
          <div className="border-b border-ink/10 px-5 py-4">
            <DialogTitle className="font-display text-lg">
              Opening
            </DialogTitle>
            <DialogDescription className="mt-1 text-[11px] leading-relaxed text-ink/55">
              One opening, three sequences. The invitation in the preview is
              your own saved design, revealed exactly as a guest will see it.
            </DialogDescription>
          </div>

          <div className="grid gap-5 p-5 md:grid-cols-[1fr_360px]">
            {/* ------------------------------ styles ------------------------------ */}
            <div className="space-y-5">
              <section>
                <h3 className="mb-2 font-meta text-[10px] uppercase tracking-[0.18em] text-ink/45">
                  Style
                </h3>
                <div className="grid gap-2 sm:grid-cols-3">
                  {OPENING_EXPERIENCES.filter(
                    (experience) => experience.id !== "none",
                  ).map((experience) => {
                    const active = opening.experience === experience.id;
                    return (
                      <button
                        key={experience.id}
                        type="button"
                        onClick={() => patch({ experience: experience.id })}
                        aria-pressed={active}
                        className={cn(
                          "group border p-1.5 text-left transition-colors",
                          active
                            ? "border-[var(--red)] bg-[var(--red)]/[0.04]"
                            : "border-ink/15 hover:border-ink/45",
                        )}
                      >
                        <StyleSwatch
                          style={experience.id as OpeningStyleId}
                          names={names}
                          accent={accent}
                        />
                        <span className="mt-2 block px-1 font-display text-[13px]">
                          {experience.label}
                        </span>
                        <span className="mb-1 block px-1 text-[10px] leading-snug text-ink/45">
                          {experience.note}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => patch({ experience: "none" })}
                  aria-pressed={opening.experience === "none"}
                  className={cn(
                    "mt-2 w-full border px-3 py-2 text-left text-[11px] transition-colors",
                    opening.experience === "none"
                      ? "border-[var(--red)] text-ink"
                      : "border-ink/15 text-ink/55 hover:border-ink/40",
                  )}
                >
                  No opening — go straight to the first section
                </button>
              </section>

              {/* ------------------------------ tone ------------------------------ */}
              <section>
                <h3 className="mb-2 font-meta text-[10px] uppercase tracking-[0.18em] text-ink/45">
                  Environment
                </h3>
                <div className="flex flex-wrap gap-2">
                  {OPENING_TONES.map((tone) => {
                    const active = (opening.tone ?? "") === tone.id;
                    return (
                      <button
                        key={tone.id}
                        type="button"
                        onClick={() => patch({ tone: tone.id })}
                        aria-pressed={active}
                        className={cn(
                          "flex items-center gap-2 border px-2.5 py-1.5 text-left transition-colors",
                          active
                            ? "border-[var(--red)]"
                            : "border-ink/15 hover:border-ink/45",
                        )}
                      >
                        <span
                          aria-hidden
                          className="size-4 rounded-full border border-black/15"
                          style={{ background: tone.swatch }}
                        />
                        <span className="text-[11px]">{tone.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* ---------------------------- wording ---------------------------- */}
              <section className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-[10px] text-ink/55">
                    Welcome line
                  </span>
                  <Input
                    value={opening.welcome}
                    onChange={(event) => patch({ welcome: event.target.value })}
                    className="h-8 rounded-none text-[11px]"
                  />
                  <span className="mt-1 block text-[9px] text-ink/35">
                    Shown above the start button. Use {"{{guest}}"} for the
                    guest's name.
                  </span>
                </label>
                <div>
                  <span className="mb-1 block text-[10px] text-ink/55">
                    Length — {(opening.duration / 1000).toFixed(1)}s
                  </span>
                  <Slider
                    value={[opening.duration]}
                    min={1600}
                    max={8000}
                    step={100}
                    onValueChange={(value) =>
                      patchLive({ duration: value[0] ?? 3000 })
                    }
                    aria-label="Opening length in milliseconds"
                  />
                </div>
              </section>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-[11px] text-ink/60">
                  <Switch
                    checked={opening.autoOpen}
                    onCheckedChange={(autoOpen) => patch({ autoOpen })}
                  />
                  Start without a tap
                </label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-none text-[10px]"
                    onClick={play}
                  >
                    <Play className="size-3" /> Preview
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-none text-[10px]"
                    onClick={() => setRunToken((value) => value + 1)}
                  >
                    <RotateCcw className="size-3" /> Replay
                  </Button>
                </div>
              </div>

              {/* ------------------------------ looks ------------------------------ */}
              <section>
                <h3 className="mb-2 font-meta text-[10px] uppercase tracking-[0.18em] text-ink/45">
                  Curated looks
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {OPENING_LOOKS.map((look) => (
                    <button
                      key={look.id}
                      type="button"
                      title={look.note}
                      onClick={() => applyLook(look)}
                      className="border border-ink/15 px-2.5 py-1.5 text-[10px] transition-colors hover:border-ink/50"
                    >
                      {look.name}
                    </button>
                  ))}
                </div>
              </section>

              {/* ------------------------------ saved ------------------------------ */}
              <section>
                <h3 className="mb-2 font-meta text-[10px] uppercase tracking-[0.18em] text-ink/45">
                  Saved openings
                </h3>
                <div className="flex gap-2">
                  <Input
                    value={presetName}
                    onChange={(event) => setPresetName(event.target.value)}
                    placeholder="Name this opening"
                    className="h-8 flex-1 rounded-none text-[11px]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-none text-[10px]"
                    disabled={!presetName.trim()}
                    onClick={() => {
                      writeLibrary(
                        upsertSavedOpening(saved, opening, presetName.trim()),
                      );
                      setPresetName("");
                      setLibraryVersion((value) => value + 1);
                    }}
                  >
                    <Plus className="size-3" /> Save
                  </Button>
                </div>
                {saved.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {saved.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-center justify-between gap-2 border border-ink/12 px-2 py-1.5"
                      >
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => {
                            patch(applySavedOpening(opening, entry));
                            play();
                          }}
                        >
                          <span className="block truncate text-[11px]">
                            {entry.label}
                          </span>
                          <span className="block truncate text-[9px] text-ink/40">
                            {openingSummary(entry.opening)}
                          </span>
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${entry.label}`}
                          onClick={() => {
                            writeLibrary(removeSavedOpening(saved, entry.id));
                            setLibraryVersion((value) => value + 1);
                          }}
                          className="text-ink/40 transition-colors hover:text-[var(--red)]"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            {/* ------------------------------ preview ------------------------------ */}
            <div className="space-y-3">
              <div className="relative aspect-[3/4] w-full overflow-hidden border border-ink/12 bg-black">
                {hasStyle ? (
                  <OpeningStage
                    key={previewKey}
                    opening={{ ...opening, autoOpen: true }}
                    page={page}
                    imageUrls={imageUrls}
                    accent={accent}
                    background={background}
                    ink={ink}
                    guestName={guestName}
                    names={names}
                    stillAt={still?.progress}
                    onDone={() => {
                      // The preview simply rests on the finished invitation.
                    }}
                  />
                ) : (
                  <div className="grid h-full place-items-center px-6 text-center text-[11px] text-ink/50">
                    Choose a style to preview the opening with your invitation.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-4 gap-1">
                {OPENING_STAGES.map((stage) => {
                  const active = stillId === stage.id;
                  return (
                    <button
                      key={stage.id}
                      type="button"
                      title={stage.note}
                      disabled={!hasStyle}
                      onClick={() => {
                        setStillId(active ? null : stage.id);
                        setRunToken((value) => value + 1);
                      }}
                      className={cn(
                        "border px-1 py-1.5 text-[9px] leading-tight transition-colors disabled:opacity-40",
                        active
                          ? "border-[var(--red)] text-ink"
                          : "border-ink/15 text-ink/55 hover:border-ink/40",
                      )}
                    >
                      {stage.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[9px] leading-relaxed text-ink/35">
                {still
                  ? still.note
                  : "Tap a moment to hold that frame, or play to watch the whole sequence."}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
