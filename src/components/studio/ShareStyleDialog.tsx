import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SHARED_STYLE_ASPECTS,
  piecePages,
  suiteOf,
  type ShareStyleOptions,
  type SharedStyleAspect,
} from "@/lib/suite";
import type { DesignDocument } from "@/lib/design";
import { cn } from "@/lib/utils";
import { Check, Palette } from "lucide-react";
import { useEffect, useState } from "react";

export interface ShareStyleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  design: DesignDocument;
  sourcePieceId: string | null;
  /** Layer ids on the source piece the host currently has selected. */
  selectedElementIds: string[];
  onApply: (options: ShareStyleOptions) => void;
}

/**
 * Coordinated design, on purpose.
 *
 * The host picks exactly which aspects travel and exactly which pieces receive
 * them. Nothing is pre-selected, the source piece is never a target, and the
 * whole action is one undo step — so sharing a style can never quietly
 * overwrite artwork nobody meant to change.
 */
export function ShareStyleDialog({
  open,
  onOpenChange,
  design,
  sourcePieceId,
  selectedElementIds,
  onApply,
}: ShareStyleDialogProps) {
  const source = suiteOf(design).find((piece) => piece.id === sourcePieceId) ?? null;
  const others = suiteOf(design).filter((piece) => piece.id !== sourcePieceId);
  const [targets, setTargets] = useState<string[]>([]);
  const [aspects, setAspects] = useState<SharedStyleAspect[]>(["background", "palette"]);

  // Re-open with a clean, honest slate: previous choices never leak into the
  // next piece the host shares a style with.
  useEffect(() => {
    if (open) {
      setTargets([]);
      setAspects(["background", "palette"]);
    }
  }, [open]);

  if (!source) return null;

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  const elementAspectEnabled = selectedElementIds.length > 0;

  const apply = () => {
    onApply({
      sourcePieceId: source.id,
      targetPieceIds: targets,
      aspects,
      elementIds: selectedElementIds,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-ui text-lg">
            <Palette className="size-4 text-[var(--red)]" />
            Share style across the suite
          </DialogTitle>
          <DialogDescription className="text-[11px] leading-relaxed text-ink/55">
            Copy the look of <span className="text-ink">{source.name}</span> onto
            chosen pieces. Only the aspects you tick move — the wording, photos
            and layout of every other piece stay exactly as they are.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <section>
            <p className="section-label mb-1.5">Apply to</p>
            {others.length === 0 ? (
              <p className="border border-dashed border-[var(--edge)] p-3 text-[10px] leading-relaxed text-ink/50">
                This suite has one piece. Add another piece to share a style
                with it.
              </p>
            ) : (
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setTargets(
                        targets.length === others.length
                          ? []
                          : others.map((piece) => piece.id),
                      )
                    }
                    className="pressable rounded-full border border-[var(--edge)] px-2.5 py-1 text-[9px] uppercase tracking-[0.1em] text-ink/55 hover:text-ink"
                  >
                    {targets.length === others.length ? "Clear all" : "All pieces"}
                  </button>
                  <span className="font-ui text-[0.62rem] text-ink/40">
                    {targets.length} of {others.length} selected
                  </span>
                </div>
                {others.map((piece) => {
                  const checked = targets.includes(piece.id);
                  return (
                    <button
                      key={piece.id}
                      type="button"
                      onClick={() => setTargets(toggle(targets, piece.id))}
                      aria-pressed={checked}
                      className={cn(
                        "flex w-full items-center gap-2.5 border px-3 py-2 text-left transition-colors",
                        checked
                          ? "border-[var(--red)]/50 bg-[var(--red)]/5"
                          : "border-[var(--edge)] hover:border-[var(--edge-strong)]",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-4 shrink-0 place-items-center border",
                          checked
                            ? "border-[var(--red)] bg-[var(--red)] text-white"
                            : "border-ink/25",
                        )}
                      >
                        {checked && <Check className="size-3" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-ui text-[0.7rem] text-ink">
                          {piece.name}
                        </span>
                        <span className="block font-ui text-[0.6rem] text-ink/45">
                          {piecePages(design, piece).length} page
                          {piecePages(design, piece).length === 1 ? "" : "s"}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <p className="section-label mb-1.5">What travels</p>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {SHARED_STYLE_ASPECTS.map((aspect) => {
                const disabled = aspect.id === "elements" && !elementAspectEnabled;
                const checked = aspects.includes(aspect.id);
                return (
                  <button
                    key={aspect.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => setAspects(toggle(aspects, aspect.id))}
                    aria-pressed={checked}
                    title={
                      disabled
                        ? "Select layers on the piece first"
                        : aspect.note
                    }
                    className={cn(
                      "flex items-start gap-2 border px-2.5 py-2 text-left transition-colors",
                      checked
                        ? "border-[var(--red)]/50 bg-[var(--red)]/5"
                        : "border-[var(--edge)] hover:border-[var(--edge-strong)]",
                      disabled && "cursor-not-allowed opacity-45",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid size-4 shrink-0 place-items-center border",
                        checked
                          ? "border-[var(--red)] bg-[var(--red)] text-white"
                          : "border-ink/25",
                      )}
                    >
                      {checked && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-ui text-[0.68rem] text-ink">
                        {aspect.label}
                      </span>
                      <span className="block font-ui text-[0.58rem] leading-snug text-ink/45">
                        {aspect.id === "elements" && !elementAspectEnabled
                          ? "Select layers on this piece first"
                          : aspect.note}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            {elementAspectEnabled && (
              <p className="mt-1.5 font-ui text-[0.6rem] text-ink/45">
                {selectedElementIds.length} selected layer
                {selectedElementIds.length === 1 ? "" : "s"} will be copied, scaled
                to each piece.
              </p>
            )}
          </section>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-9 rounded-none text-[10px] uppercase tracking-[0.12em]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={targets.length === 0 || aspects.length === 0}
            onClick={apply}
            className="h-9 rounded-none text-[10px] uppercase tracking-[0.12em]"
          >
            Apply to {targets.length} piece{targets.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
