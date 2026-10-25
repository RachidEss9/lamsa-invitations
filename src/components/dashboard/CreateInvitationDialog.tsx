import { DesignPageView, DesignStage } from "@/components/invitation/DesignPageView";
import {
  BlankPreview,
  TemplatePreview,
} from "@/components/dashboard/InvitationPreview";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  blankInvitationContent,
  scratchInvitation,
  type ScratchDesignInput,
} from "@/lib/dashboard";
import {
  DESIGN_UNITS,
  OPENING_EXPERIENCES,
  PAGE_TEXTURES,
  SIZE_PRESETS,
  toDesignPx,
  type DesignOutput,
  type DesignUnit,
  type OpeningExperienceId,
  type PageTextureId,
  type SizePreset,
} from "@/lib/design";
import {
  OCCASIONS,
  TEMPLATES,
  occasionLabel,
  templateById,
  type Occasion,
} from "@/lib/invitation";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Loader2,
  Plus,
  Ruler,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";

const PREVIEW_LIMIT = 9;
const PRESET_STORE = "lamsa.sizePresets.v1";

/** The classic studio canvas, used when a host wants a quick blank start. */
const QUICK_BLANK: ScratchDesignInput = {
  name: "Untitled invitation",
  unit: "px",
  width: 1000,
  height: 1333.33,
  output: "digital",
  background: { color: "#fbfaf7", gradient: null },
  margin: 0,
  bleed: 0,
  pages: 1,
  texture: "cotton",
  opening: "none",
};

export type CreateTarget =
  | { kind: "template"; templateId: string }
  | { kind: "scratch"; input: ScratchDesignInput };

interface SavedPreset {
  id: string;
  label: string;
  unit: DesignUnit;
  width: number;
  height: number;
}

function readSavedPresets(): SavedPreset[] {
  try {
    const raw = localStorage.getItem(PRESET_STORE);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedPreset[];
    return Array.isArray(parsed) ? parsed.slice(0, 12) : [];
  } catch {
    return [];
  }
}

function writeSavedPresets(presets: SavedPreset[]) {
  try {
    localStorage.setItem(PRESET_STORE, JSON.stringify(presets));
  } catch {
    // A blocked storage quota only loses the presets, never the invitation.
  }
}

/* -------------------------------------------------------------------------- */
/* New design setup                                                           */
/* -------------------------------------------------------------------------- */

const OUTPUTS: { id: DesignOutput; label: string; note: string }[] = [
  { id: "digital", label: "Digital", note: "For screens, links and messaging" },
  { id: "print", label: "Print", note: "Prepared for a printer, with bleed" },
  { id: "both", label: "Both", note: "One design, screen and paper" },
];

function Field({
  label,
  note,
  children,
  className,
}: {
  label: string;
  note?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <span className="section-label block">{label}</span>
      {children}
      {note && (
        <span className="block text-[10px] leading-relaxed text-ink/45">
          {note}
        </span>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "pressable h-7 rounded-full border px-2.5 text-left font-ui text-[0.66rem] font-medium tracking-[0.02em] transition-colors",
        active
          ? "border-ink bg-ink text-[var(--paper-light)]"
          : "border-[var(--edge)] text-ink/65 hover:border-[var(--edge-strong)] hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Create dialog                                                              */
/* -------------------------------------------------------------------------- */

export function CreateInvitationDialog({
  open,
  onOpenChange,
  initialTemplateId,
  creating,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTemplateId?: string | null;
  creating: boolean;
  onCreate: (target: CreateTarget) => void;
}) {
  const initial = initialTemplateId ? templateById(initialTemplateId) : null;
  const [occasion, setOccasion] = useState<Occasion>(
    initial?.occasion ?? "wedding",
  );
  const [selection, setSelection] = useState<string>(initial?.id ?? "blank");
  const [track, setTrack] = useState<"start" | "scratch">("start");
  const [expanded, setExpanded] = useState(false);
  const blank = useMemo(() => blankInvitationContent(), []);

  // --- New design setup -------------------------------------------------
  const [unit, setUnit] = useState<DesignUnit>("mm");
  const [sizeId, setSizeId] = useState<string>("a5");
  const [width, setWidth] = useState("148");
  const [height, setHeight] = useState("210");
  const [output, setOutput] = useState<DesignOutput>("digital");
  const [bgColor, setBgColor] = useState("#f4f3ef");
  const [gradientOn, setGradientOn] = useState(false);
  const [gradientFrom, setGradientFrom] = useState("#f7f2e8");
  const [gradientTo, setGradientTo] = useState("#e7dcc9");
  const [texture, setTexture] = useState<PageTextureId>("cotton");
  const [margin, setMargin] = useState("6");
  const [bleed, setBleed] = useState("3");
  const [pages, setPages] = useState("1");
  const [opening, setOpening] = useState<OpeningExperienceId>("none");
  const [designName, setDesignName] = useState("");

  const [presetLabel, setPresetLabel] = useState("");

  // Presets live in local storage; the dialog reads them whenever it opens or
  // one is added or removed, so there is no state to keep in sync.
  const [presetVersion, setPresetVersion] = useState(0);
  const savedPresets = useMemo(
    () => (open ? readSavedPresets() : []),
    [open, presetVersion],
  );



  const templates = useMemo(
    () => TEMPLATES.filter((template) => template.occasion === occasion),
    [occasion],
  );
  const shown = expanded ? templates : templates.slice(0, PREVIEW_LIMIT);
  const selectedTemplate =
    selection !== "blank" ? templateById(selection) : null;
  const palette = selectedTemplate?.palette ?? templateById("the-vow").palette;
  const occasionName = selectedTemplate
    ? occasionLabel(selectedTemplate.occasion)
    : "Any occasion";

  const scratch: ScratchDesignInput = useMemo(
    () => ({
      name: designName.trim() || "Untitled invitation",
      unit,
      width: Math.max(1, Number(width) || 1),
      height: Math.max(1, Number(height) || 1),
      output,
      background: {
        color: bgColor,
        gradient: gradientOn
          ? { from: gradientFrom, to: gradientTo, angle: 145 }
          : null,
      },
      margin: Math.max(0, Number(margin) || 0),
      bleed: Math.max(0, Number(bleed) || 0),
      pages: Math.max(1, Math.min(20, Math.round(Number(pages) || 1))),
      texture,
      opening,
    }),
    [
      bgColor,
      bleed,
      designName,
      gradientFrom,
      gradientOn,
      gradientTo,
      height,
      margin,
      opening,
      output,
      pages,
      texture,
      unit,
      width,
    ],
  );

  const scratchPreview = useMemo(() => scratchInvitation(scratch), [scratch]);

  const choosePreset = (preset: SizePreset) => {
    setSizeId(preset.id);
    setUnit(preset.unit);
    setWidth(String(Math.round(preset.width * 100) / 100));
    setHeight(String(Math.round(preset.height * 100) / 100));
  };

  const presetMatches = (preset: SizePreset) =>
    preset.unit === unit &&
    Math.abs(preset.width - (Number(width) || 0)) < 0.51 &&
    Math.abs(preset.height - (Number(height) || 0)) < 0.51;

  const allPresets: SizePreset[] = [
    ...savedPresets.map((preset) => ({
      id: preset.id,
      label: preset.label,
      note: "Saved preset",
      unit: preset.unit,
      width: preset.width,
      height: preset.height,
    })),
    ...SIZE_PRESETS,
  ];

  const saveCurrentPreset = () => {
    const label =
      presetLabel.trim() ||
      `${Math.round(Number(width) || 0)} × ${Math.round(Number(height) || 0)} ${unit}`;
    const next: SavedPreset[] = [
      {
        id: `saved_${Date.now().toString(36)}`,
        label,
        unit,
        width: Number(width) || 1,
        height: Number(height) || 1,
      },
      ...savedPresets.filter((preset) => preset.label !== label),
    ].slice(0, 12);
    writeSavedPresets(next);
    setPresetVersion((value) => value + 1);
    setPresetLabel("");
  };

  const removeSavedPreset = (id: string) => {
    const next = savedPresets.filter((preset) => preset.id !== id);
    writeSavedPresets(next);
    setPresetVersion((value) => value + 1);
  };

  const chooseOccasion = (next: Occasion) => {
    setOccasion(next);
    setExpanded(false);
    if (selection === "blank") return;
    const stillVisible = TEMPLATES.some(
      (template) => template.id === selection && template.occasion === next,
    );
    if (!stillVisible) {
      const first = TEMPLATES.find(
        (template) => template.occasion === next,
      );
      if (first) setSelection(first.id);
    }
  };

  const templatePreview =
    selectedTemplate == null ? (
      <BlankPreview content={blank} />
    ) : (
      <TemplatePreview templateId={selectedTemplate.id} />
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[94vh] gap-0 overflow-hidden border-ink/15 bg-[var(--paper)] p-0 sm:max-w-[1060px]"
      >
        <div className="flex max-h-[94vh] min-h-0 flex-col">
          <header className="border-b border-ink/12 px-5 pb-5 pt-6 sm:px-8 sm:pb-6">
            <div className="flex items-baseline gap-3 pr-10">
              <span className="font-meta text-[0.55rem] text-[var(--red)]">
                01
              </span>
              <span className="h-px w-5 bg-ink/30" />
              <span className="eyebrow text-ink/56">New invitation</span>
            </div>
            <DialogTitle className="mt-3 max-w-[42rem] font-ui text-[clamp(1.9rem,4.4vw,2.7rem)] font-semibold leading-[0.98] tracking-[-0.035em]">
              {track === "scratch"
                ? "Set the page, then begin."
                : "Begin with a design, with a blank canvas, or with a blank page."}
            </DialogTitle>
            <DialogDescription className="mt-2 max-w-[40rem] text-[0.86rem] leading-relaxed text-ink/62">
              {track === "scratch"
                ? "Choose the size, paper and opening. The canvas opens genuinely empty, at your own dimensions — nothing is filled in for you."
                : "Every starting point opens the real canvas studio: a pre-made design you can edit, a blank canvas you size yourself, or a quick blank page. Words, palette, type and animation are yours to change — nothing here is a fixed template."}
            </DialogDescription>
          </header>

          {track === "scratch" ? (
            <ScratchSetup
              unit={unit}
              setUnit={(next) => {
                setUnit(next);
                setSizeId("custom");
              }}
              width={width}
              setWidth={(value) => {
                setWidth(value);
                setSizeId("custom");
              }}
              height={height}
              setHeight={(value) => {
                setHeight(value);
                setSizeId("custom");
              }}
              sizeId={sizeId}
              allPresets={allPresets}
              presetMatches={presetMatches}
              choosePreset={choosePreset}
              removeSavedPreset={removeSavedPreset}
              presetLabel={presetLabel}
              setPresetLabel={setPresetLabel}
              saveCurrentPreset={saveCurrentPreset}
              output={output}
              setOutput={setOutput}
              bgColor={bgColor}
              setBgColor={setBgColor}
              gradientOn={gradientOn}
              setGradientOn={setGradientOn}
              gradientFrom={gradientFrom}
              setGradientFrom={setGradientFrom}
              gradientTo={gradientTo}
              setGradientTo={setGradientTo}
              texture={texture}
              setTexture={setTexture}
              margin={margin}
              setMargin={setMargin}
              bleed={bleed}
              setBleed={setBleed}
              pages={pages}
              setPages={setPages}
              opening={opening}
              setOpening={setOpening}
              designName={designName}
              setDesignName={setDesignName}
              preview={scratchPreview}
              creating={creating}
              onCreate={() => onCreate({ kind: "scratch", input: scratch })}
              onBack={() => setTrack("start")}
            />
          ) : (
            <div className="grid min-h-0 flex-1 lg:grid-cols-[1.08fr_0.92fr]">
              <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-8">
                <button
                  type="button"
                  onClick={() => setTrack("scratch")}
                  className="group flex w-full items-center gap-4 border border-ink/15 p-3 text-left transition-colors hover:border-ink/60"
                >
                  <span className="grid size-11 shrink-0 place-items-center border border-ink/15 bg-[var(--paper-light)] text-ink/70 transition-colors group-hover:border-ink group-hover:text-ink">
                    <Ruler className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 font-ui text-[1.02rem] font-semibold leading-tight">
                      Create from scratch
                    </span>
                    <span className="mt-1 block text-[0.72rem] leading-relaxed text-ink/56">
                      Set your own size, paper and opening on an empty canvas —
                      A5, 5 × 7, a story, or any measurement you like.
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-ink/35 transition-transform group-hover:translate-x-0.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setSelection("blank")}
                  aria-pressed={selection === "blank"}
                  className={cn(
                    "group mt-4 flex w-full items-center gap-4 border p-3 text-left transition-colors duration-200",
                    selection === "blank"
                      ? "border-ink bg-[var(--paper-light)]"
                      : "border-ink/15 hover:border-ink/40",
                  )}
                >
                  <span className="w-11 shrink-0 border border-ink/10 bg-white p-1 shadow-[0_6px_18px_rgba(21,21,21,0.08)] sm:w-12">
                    <BlankPreview content={blank} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 font-ui text-[1.02rem] font-semibold leading-tight">
                      <Plus className="size-3.5 text-[var(--red)]" />
                      Quick blank canvas
                    </span>
                    <span className="mt-1 block text-[0.72rem] leading-relaxed text-ink/56">
                      The classic 3:4 canvas with placeholders, ready for your
                      own words and details.
                    </span>
                  </span>
                  <span
                    className={cn(
                      "grid size-4 shrink-0 place-items-center border transition-colors",
                      selection === "blank"
                        ? "border-[var(--red)] bg-[var(--red)] text-[#f2f1ed]"
                        : "border-ink/25",
                    )}
                  >
                    {selection === "blank" && <Check className="size-2.5" />}
                  </span>
                </button>

                <div className="mt-6 flex items-baseline justify-between gap-3">
                  <p className="flex items-center gap-2 font-meta text-[0.52rem] uppercase tracking-[0.14em] text-ink/62">
                    <Sparkles className="size-3 text-[var(--gold)]" />
                    From the collection
                  </p>
                  <p className="font-meta text-[0.48rem] uppercase tracking-[0.12em] text-ink/40">
                    {templates.length} designs
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {OCCASIONS.map((item) => (
                    <Chip
                      key={item.id}
                      active={occasion === item.id}
                      onClick={() => chooseOccasion(item.id)}
                    >
                      {item.label}
                    </Chip>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3">
                  {shown.map((template) => {
                    const selected = selection === template.id;
                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => setSelection(template.id)}
                        aria-pressed={selected}
                        className="group min-w-0 text-left"
                      >
                        <span
                          className={cn(
                            "relative block overflow-hidden border bg-[var(--paper-light)] p-1.5 transition-[border-color,box-shadow,transform] duration-300",
                            selected
                              ? "border-ink shadow-[0_14px_30px_rgba(21,21,21,0.12)]"
                              : "border-ink/12 group-hover:border-ink/35 group-hover:shadow-[0_10px_24px_rgba(21,21,21,0.08)]",
                          )}
                        >
                          <TemplatePreview templateId={template.id} />
                          {selected && (
                            <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center bg-[var(--red)] text-[#f2f1ed]">
                              <Check className="size-3" />
                            </span>
                          )}
                        </span>
                        <span className="mt-2 block truncate font-ui text-[0.8rem] font-semibold leading-tight">
                          {template.name}
                        </span>
                        <span className="mt-0.5 block truncate font-meta text-[0.42rem] uppercase tracking-[0.1em] text-ink/44">
                          {occasionLabel(template.occasion)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {templates.length > PREVIEW_LIMIT && !expanded && (
                  <button
                    type="button"
                    onClick={() => setExpanded(true)}
                    className="mt-4 inline-flex items-center gap-2 border-b border-ink/25 pb-1 font-meta text-[0.5rem] uppercase tracking-[0.12em] text-ink/60 transition-colors hover:border-[var(--red)] hover:text-[var(--red)]"
                  >
                    Show all {templates.length} designs
                    <ArrowRight className="size-3" />
                  </button>
                )}
              </div>

              <aside className="hidden min-h-0 flex-col border-l border-ink/12 bg-[var(--paper-deep)]/55 lg:flex">
                <div className="flex items-baseline justify-between border-b border-ink/12 px-6 py-3 font-meta text-[0.48rem] uppercase tracking-[0.12em] text-ink/52">
                  <span>The proof</span>
                  <span className="truncate pl-3">
                    {selectedTemplate?.name ?? "A blank invitation"}
                  </span>
                </div>
                <div className="flex min-h-0 flex-1 items-center justify-center p-8">
                  <div className="w-full max-w-[290px] border border-ink/12 bg-[var(--paper-light)] p-2 shadow-[0_30px_70px_rgba(21,21,21,0.16)]">
                    {templatePreview}
                  </div>
                </div>
                <div className="border-t border-ink/12 px-6 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="eyebrow text-ink/50">{occasionName}</p>
                      <p className="mt-1 truncate font-ui text-[1.3rem] font-semibold leading-tight tracking-[-0.02em]">
                        {selectedTemplate?.name ?? "A blank invitation"}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-0.5 pt-1">
                      {[palette.background, palette.accent, palette.ink].map(
                        (color) => (
                          <span
                            key={color}
                            aria-hidden
                            className="size-2.5 rounded-full border border-black/10"
                            style={{ backgroundColor: color }}
                          />
                        ),
                      )}
                    </span>
                  </div>
                  <Button
                    type="button"
                    disabled={creating}
                    className="mt-5 h-11 w-full"
                    onClick={() => {
                      if (selection === "blank") {
                        onCreate({ kind: "scratch", input: QUICK_BLANK });
                        return;
                      }
                      onCreate({ kind: "template", templateId: selection });
                    }}
                  >
                    {creating ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ArrowRight className="size-4" />
                    )}
                    Create invitation
                  </Button>
                </div>
              </aside>
            </div>
          )}

          {track === "start" && (
            <div className="flex items-center gap-3 border-t border-ink/12 bg-[var(--paper)] px-5 py-3 lg:hidden">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-ui text-[0.82rem] font-semibold leading-tight">
                  {selectedTemplate?.name ?? "A blank invitation"}
                </span>
                <span className="block truncate font-meta text-[0.44rem] uppercase tracking-[0.1em] text-ink/48">
                  {occasionName}
                </span>
              </span>
              <Button
                type="button"
                disabled={creating}
                className="h-10 shrink-0 px-4"
                onClick={() => {
                  if (selection === "blank") {
                    setTrack("scratch");
                    return;
                  }
                  onCreate({ kind: "template", templateId: selection });
                }}
              >
                {creating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : selection === "blank" ? (
                  <Ruler className="size-4" />
                ) : (
                  <ArrowRight className="size-4" />
                )}
                {selection === "blank" ? "Set up" : "Create"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* The setup panel                                                           */
/* -------------------------------------------------------------------------- */

function ScratchSetup({
  unit,
  setUnit,
  width,
  setWidth,
  height,
  setHeight,
  sizeId,
  allPresets,
  presetMatches,
  choosePreset,
  removeSavedPreset,
  presetLabel,
  setPresetLabel,
  saveCurrentPreset,
  output,
  setOutput,
  bgColor,
  setBgColor,
  gradientOn,
  setGradientOn,
  gradientFrom,
  setGradientFrom,
  gradientTo,
  setGradientTo,
  texture,
  setTexture,
  margin,
  setMargin,
  bleed,
  setBleed,
  pages,
  setPages,
  opening,
  setOpening,
  designName,
  setDesignName,
  preview,
  creating,
  onCreate,
  onBack,
}: {
  unit: DesignUnit;
  setUnit: (unit: DesignUnit) => void;
  width: string;
  setWidth: (value: string) => void;
  height: string;
  setHeight: (value: string) => void;
  sizeId: string;
  allPresets: SizePreset[];
  presetMatches: (preset: SizePreset) => boolean;
  choosePreset: (preset: SizePreset) => void;
  removeSavedPreset: (id: string) => void;
  presetLabel: string;
  setPresetLabel: (value: string) => void;
  saveCurrentPreset: () => void;
  output: DesignOutput;
  setOutput: (output: DesignOutput) => void;
  bgColor: string;
  setBgColor: (value: string) => void;
  gradientOn: boolean;
  setGradientOn: (value: boolean) => void;
  gradientFrom: string;
  setGradientFrom: (value: string) => void;
  gradientTo: string;
  setGradientTo: (value: string) => void;
  texture: PageTextureId;
  setTexture: (texture: PageTextureId) => void;
  margin: string;
  setMargin: (value: string) => void;
  bleed: string;
  setBleed: (value: string) => void;
  pages: string;
  setPages: (value: string) => void;
  opening: OpeningExperienceId;
  setOpening: (opening: OpeningExperienceId) => void;
  designName: string;
  setDesignName: (value: string) => void;
  preview: ReturnType<typeof scratchInvitation>;
  creating: boolean;
  onCreate: () => void;
  onBack: () => void;
}) {
  const widthPx = toDesignPx(Math.max(1, Number(width) || 1), unit);
  const heightPx = toDesignPx(Math.max(1, Number(height) || 1), unit);
  return (
    <div className="grid min-h-0 flex-1 lg:grid-cols-[1.08fr_0.92fr]">
      <div className="min-h-0 space-y-6 overflow-y-auto px-5 py-5 sm:px-8">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 font-meta text-[0.5rem] uppercase tracking-[0.14em] text-ink/55 transition-colors hover:text-ink"
        >
          <ArrowRight className="size-3 rotate-180" />
          Back to starting points
        </button>

        <div className="space-y-3">
          <Field label="Invitation name">
            <Input
              value={designName}
              onChange={(event) => setDesignName(event.target.value)}
              placeholder="e.g. Layla & Omar — dinner"
              className="h-10 rounded-none border-ink/20 bg-[var(--paper-light)] text-[13px]"
            />
          </Field>
        </div>

        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="section-label">Page size</span>
            <div className="flex gap-1">
              {DESIGN_UNITS.map((item) => (
                <Chip
                  key={item.id}
                  active={unit === item.id}
                  onClick={() => setUnit(item.id)}
                  title={item.note}
                >
                  {item.label}
                </Chip>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={`Width (${unit})`}>
              <Input
                type="number"
                min={1}
                value={width}
                onChange={(event) => setWidth(event.target.value)}
                className="h-10 rounded-none border-ink/20 bg-[var(--paper-light)] text-[13px]"
              />
            </Field>
            <Field label={`Height (${unit})`}>
              <Input
                type="number"
                min={1}
                value={height}
                onChange={(event) => setHeight(event.target.value)}
                className="h-10 rounded-none border-ink/20 bg-[var(--paper-light)] text-[13px]"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {allPresets.map((preset) => {
              const saved = preset.id.startsWith("saved_");
              return (
                <div key={preset.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => choosePreset(preset)}
                    className={cn(
                      "w-full border px-2.5 py-2 text-left transition-colors",
                      sizeId === preset.id || presetMatches(preset)
                        ? "border-ink bg-[var(--paper-light)]"
                        : "border-ink/15 hover:border-ink/45",
                    )}
                  >
                    <span className="block truncate font-ui text-[11px] font-semibold">
                      {preset.label}
                    </span>
                    <span className="block truncate font-meta text-[8px] uppercase tracking-[0.1em] text-ink/45">
                      {Math.round(preset.width)} × {Math.round(preset.height)}{" "}
                      {preset.unit}
                    </span>
                  </button>
                  {saved && (
                    <button
                      type="button"
                      onClick={() => removeSavedPreset(preset.id)}
                      aria-label={`Delete preset ${preset.label}`}
                      className="absolute right-1 top-1 grid size-5 place-items-center text-ink/40 opacity-0 transition-opacity hover:text-[var(--red)] focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-2">
            <Input
              value={presetLabel}
              onChange={(event) => setPresetLabel(event.target.value)}
              placeholder="Name this size to reuse it"
              className="h-9 flex-1 rounded-none border-ink/20 bg-[var(--paper-light)] text-[12px]"
            />
            <Button
              type="button"
              variant="outline"
              onClick={saveCurrentPreset}
              className="h-9 shrink-0 rounded-none px-3 text-[10px] uppercase tracking-[0.12em]"
            >
              Save preset
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Output">
            <div className="grid gap-1.5">
              {OUTPUTS.map((item) => (
                <Chip
                  key={item.id}
                  active={output === item.id}
                  onClick={() => setOutput(item.id)}
                >
                  {item.label}
                  <span
                    className={cn(
                      "ml-2 text-[9px]",
                      output === item.id ? "text-[var(--paper)]/60" : "text-ink/40",
                    )}
                  >
                    {item.note}
                  </span>
                </Chip>
              ))}
            </div>
          </Field>

          <div className="space-y-4">
            <Field label="Pages">
              <Input
                type="number"
                min={1}
                max={20}
                value={pages}
                onChange={(event) => setPages(event.target.value)}
                className="h-10 rounded-none border-ink/20 bg-[var(--paper-light)] text-[13px]"
              />
            </Field>
            <Field label="Opening experience">
              <Select
                value={opening}
                onValueChange={(value) =>
                  setOpening(value as OpeningExperienceId)
                }
              >
                <SelectTrigger className="h-10 rounded-none border-ink/20 bg-[var(--paper-light)] text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPENING_EXPERIENCES.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Paper colour">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={bgColor}
                onChange={(event) => setBgColor(event.target.value)}
                aria-label="Page colour"
                className="h-10 w-12 cursor-pointer border border-ink/20 bg-transparent p-1"
              />
              <Input
                value={bgColor}
                onChange={(event) => setBgColor(event.target.value)}
                className="h-10 flex-1 rounded-none border-ink/20 bg-[var(--paper-light)] font-mono text-[12px]"
              />
            </div>
          </Field>

          <Field label="Paper surface">
            <div className="grid grid-cols-2 gap-1.5">
              {PAGE_TEXTURES.map((item) => (
                <Chip
                  key={item.id}
                  active={texture === item.id}
                  onClick={() => setTexture(item.id)}
                  title={item.note}
                >
                  {item.label}
                </Chip>
              ))}
            </div>
          </Field>
        </div>

        <div className="space-y-2">
          <Chip active={gradientOn} onClick={() => setGradientOn(!gradientOn)}>
            Add a soft gradient wash
          </Chip>
          {gradientOn && (
            <div className="flex flex-wrap items-end gap-3">
              <Field label="From">
                <input
                  type="color"
                  value={gradientFrom}
                  onChange={(event) => setGradientFrom(event.target.value)}
                  aria-label="Gradient start colour"
                  className="h-10 w-12 cursor-pointer border border-ink/20 bg-transparent p-1"
                />
              </Field>
              <Field label="To">
                <input
                  type="color"
                  value={gradientTo}
                  onChange={(event) => setGradientTo(event.target.value)}
                  aria-label="Gradient end colour"
                  className="h-10 w-12 cursor-pointer border border-ink/20 bg-transparent p-1"
                />
              </Field>
              <span className="pb-2 text-[10px] text-ink/45">
                145° · diagonal
              </span>
            </div>
          )}
        </div>

        {(output === "print" || output === "both") && (
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Safe margin (${unit})`}>
              <Input
                type="number"
                min={0}
                value={margin}
                onChange={(event) => setMargin(event.target.value)}
                className="h-10 rounded-none border-ink/20 bg-[var(--paper-light)] text-[13px]"
              />
            </Field>
            <Field label={`Bleed (${unit})`}>
              <Input
                type="number"
                min={0}
                value={bleed}
                onChange={(event) => setBleed(event.target.value)}
                className="h-10 rounded-none border-ink/20 bg-[var(--paper-light)] text-[13px]"
              />
            </Field>
          </div>
        )}
      </div>

      <aside className="flex min-h-0 flex-col border-l border-ink/12 bg-[var(--paper-deep)]/55">
        <div className="flex items-baseline justify-between border-b border-ink/12 px-6 py-3 font-meta text-[0.48rem] uppercase tracking-[0.12em] text-ink/52">
          <span>Live proof</span>
          <span className="truncate pl-3">
            {Math.round(widthPx)} × {Math.round(heightPx)} px
          </span>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-6">
          <div className="w-full max-w-[260px] border border-ink/12 bg-white p-2 shadow-[0_30px_70px_rgba(21,21,21,0.16)]">
            <PreviewSheet input={preview} />
          </div>
        </div>
        <div className="border-t border-ink/12 px-6 py-5">
          <p className="eyebrow text-ink/50">
            {OUTPUTS.find((item) => item.id === output)?.label}
          </p>
          <p className="mt-1 font-ui text-[1.15rem] font-semibold leading-tight tracking-[-0.02em]">
            {designName.trim() || "Untitled invitation"}
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-ink/55">
            {Math.round(widthPx)} × {Math.round(heightPx)} canvas units ·{" "}
            {PAGE_TEXTURES.find((item) => item.id === texture)?.label} surface ·{" "}
            {pages} {Number(pages) === 1 ? "page" : "pages"}
            {opening !== "none"
              ? ` · opens with ${OPENING_EXPERIENCES.find((item) => item.id === opening)?.label.toLowerCase()}`
              : ""}
          </p>
          <Button
            type="button"
            disabled={creating}
            onClick={onCreate}
            className="mt-5 h-11 w-full"
          >
            {creating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowRight className="size-4" />
            )}
            Create the design
          </Button>
        </div>
      </aside>
    </div>
  );
}

function PreviewSheet({ input }: { input: ReturnType<typeof scratchInvitation> }) {
  const page = input.design.pages[0];
  if (!page) return null;
  return (
    <div className="relative">
      <DesignStage
        width={page.width}
        height={page.height}
        className="w-full bg-white"
      >
        {() => (
          <DesignPageView
            page={page}
            time={0}
            imageUrls={{}}
            guestName={null}
            reducedMotion
            scrollActivationTime={0}
          />
        )}
      </DesignStage>
      <span className="pointer-events-none absolute inset-0 border border-black/5" />
    </div>
  );
}
