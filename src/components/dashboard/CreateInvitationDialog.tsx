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
import { blankInvitationContent } from "@/lib/dashboard";
import {
  OCCASIONS,
  TEMPLATES,
  occasionLabel,
  templateById,
  type Occasion,
} from "@/lib/invitation";
import { cn } from "@/lib/utils";
import { ArrowRight, Check, Loader2, Plus, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

const BLANK = "blank";
const PREVIEW_LIMIT = 9;

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
  onCreate: (selection: string) => void;
}) {
  const initial = initialTemplateId
    ? templateById(initialTemplateId)
    : null;
  const [occasion, setOccasion] = useState<Occasion>(
    initial?.occasion ?? "wedding",
  );
  const [selection, setSelection] = useState<string>(
    initial?.id ?? BLANK,
  );
  const [expanded, setExpanded] = useState(false);
  const blank = useMemo(() => blankInvitationContent(), []);

  const templates = useMemo(
    () => TEMPLATES.filter((template) => template.occasion === occasion),
    [occasion],
  );
  const shown = expanded ? templates : templates.slice(0, PREVIEW_LIMIT);
  const selectedTemplate = selection === BLANK ? null : templateById(selection);
  const selectedName = selectedTemplate?.name ?? "A blank invitation";
  const description =
    selectedTemplate?.description ??
    "An empty canvas with placeholders, ready for your own words and details.";
  const palette = selectedTemplate?.palette ?? templateById("the-vow").palette;
  const occasionName = selectedTemplate
    ? occasionLabel(selectedTemplate.occasion)
    : "Any occasion";

  const chooseOccasion = (next: Occasion) => {
    setOccasion(next);
    setExpanded(false);
    if (selection === BLANK) return;
    const stillVisible = TEMPLATES.some(
      (template) => template.id === selection && template.occasion === next,
    );
    if (!stillVisible) {
      const first = TEMPLATES.find((template) => template.occasion === next);
      if (first) setSelection(first.id);
    }
  };

  const preview =
    selection === BLANK ? (
      <BlankPreview content={blank} />
    ) : (
      <TemplatePreview templateId={selection} />
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
              Begin with a design, or with a blank page.
            </DialogTitle>
            <DialogDescription className="mt-2 max-w-[40rem] text-[0.86rem] leading-relaxed text-ink/62">
              Every starting point opens the real canvas studio. Words, palette,
              type and animation are yours to change — nothing here is a fixed
              template.
            </DialogDescription>
          </header>

          <div className="grid min-h-0 flex-1 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-8">
              <button
                type="button"
                onClick={() => setSelection(BLANK)}
                aria-pressed={selection === BLANK}
                className={cn(
                  "group flex w-full items-center gap-4 border p-3 text-left transition-colors duration-200",
                  selection === BLANK
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
                    Start with a blank invitation
                  </span>
                  <span className="mt-1 block text-[0.72rem] leading-relaxed text-ink/56">
                    A full editable canvas with placeholders — no sample copy to
                    delete.
                  </span>
                </span>
                <span
                  className={cn(
                    "grid size-4 shrink-0 place-items-center border transition-colors",
                    selection === BLANK
                      ? "border-[var(--red)] bg-[var(--red)] text-[#f2f1ed]"
                      : "border-ink/25",
                  )}
                >
                  {selection === BLANK && <Check className="size-2.5" />}
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
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => chooseOccasion(item.id)}
                    aria-pressed={occasion === item.id}
                    className={cn(
                      "border px-2.5 py-1.5 font-meta text-[0.5rem] uppercase tracking-[0.12em] transition-colors duration-200",
                      occasion === item.id
                        ? "border-ink bg-ink text-[#f2f1ed]"
                        : "border-ink/15 text-ink/58 hover:border-ink/40 hover:text-ink",
                    )}
                  >
                    {item.label}
                  </button>
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

              {templates.length === 0 && (
                <p className="mt-6 text-[0.8rem] leading-relaxed text-ink/58">
                  No designs filed under this occasion yet. Start blank, or choose
                  another occasion and change it inside the studio.
                </p>
              )}
            </div>

            <aside className="hidden min-h-0 flex-col border-l border-ink/12 bg-[var(--paper-deep)]/55 lg:flex">
              <div className="flex items-baseline justify-between border-b border-ink/12 px-6 py-3 font-meta text-[0.48rem] uppercase tracking-[0.12em] text-ink/52">
                <span>The proof</span>
                <span className="truncate pl-3">{selectedName}</span>
              </div>
              <div className="flex min-h-0 flex-1 items-center justify-center p-8">
                <div className="w-full max-w-[290px] border border-ink/12 bg-[var(--paper-light)] p-2 shadow-[0_30px_70px_rgba(21,21,21,0.16)]">
                  {preview}
                </div>
              </div>
              <div className="border-t border-ink/12 px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="eyebrow text-ink/50">{occasionName}</p>
                    <p className="mt-1 truncate font-ui text-[1.3rem] font-semibold leading-tight tracking-[-0.02em]">
                      {selectedName}
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
                <p className="mt-2 text-[0.74rem] leading-relaxed text-ink/56">
                  {description}
                </p>
                <Button
                  type="button"
                  onClick={() => onCreate(selection)}
                  disabled={creating}
                  className="mt-5 h-11 w-full"
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

          <div className="flex items-center gap-3 border-t border-ink/12 bg-[var(--paper)] px-5 py-3 lg:hidden">
            <span className="w-8 shrink-0 border border-ink/10 bg-white p-0.5">
              {preview}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-ui text-[0.82rem] font-semibold leading-tight">
                {selectedName}
              </span>
              <span className="block truncate font-meta text-[0.44rem] uppercase tracking-[0.1em] text-ink/48">
                {occasionName}
              </span>
            </span>
            <Button
              type="button"
              onClick={() => onCreate(selection)}
              disabled={creating}
              className="h-10 shrink-0 px-4"
            >
              {creating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowRight className="size-4" />
              )}
              Create
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
