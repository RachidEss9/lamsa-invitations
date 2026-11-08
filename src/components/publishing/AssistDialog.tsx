import { useMemo, useState } from "react";
import { Lightbulb, RefreshCw, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  analyzeLayout,
  applySuggestion,
  suggestionsForPages,
  type LayoutSuggestion,
} from "@/lib/publishing/layout-assist";
import { updatePage } from "@/lib/publishing/operations";
import type { PublicationDocument } from "@/lib/publishing/model";
import { PageThumb } from "./PageThumb";
import { cn } from "@/lib/utils";

/**
 * Assisted layout. This is a local heuristic panel: it proposes compositions
 * for the pages the user chooses, previews the actual result, and applies only
 * what is confirmed. Nothing here calls an external service.
 */
export interface AssistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: PublicationDocument;
  currentPageId: string;
  onApply: (document: PublicationDocument, label: string) => void;
}

export function AssistDialog({
  open,
  onOpenChange,
  document,
  currentPageId,
  onApply,
}: AssistDialogProps) {
  const analysis = useMemo(() => analyzeLayout(document), [document]);
  const [selectedPages, setSelectedPages] = useState<string[]>([currentPageId]);
  const [variants, setVariants] = useState<Record<string, number>>({});
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [previewing, setPreviewing] = useState<LayoutSuggestion | null>(null);

  const suggestions = useMemo(
    () =>
      suggestionsForPages(analysis, selectedPages).filter(
        (suggestion) => !dismissed.includes(suggestion.id),
      ),
    [analysis, dismissed, selectedPages],
  );

  const previewDocument = useMemo(() => {
    if (!previewing) return null;
    return applySuggestion(
      document,
      {
        ...previewing,
        propose: (page) => previewing.propose(page, variants[previewing.id]),
      },
    );
  }, [document, previewing, variants]);

  const applyAll = (items: LayoutSuggestion[]) => {
    if (items.length === 0) return;
    let next = document;
    for (const suggestion of items) {
      next = updatePage(next, suggestion.pageId, (page) =>
        suggestion.propose(page, variants[suggestion.id]),
      );
    }
    onApply(next, "Apply layout suggestion");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-auto scroll-slim border-[var(--rule)] bg-[var(--paper)] p-0">
        <DialogHeader className="border-b border-[var(--rule)] px-4 py-3">
          <DialogTitle className="flex items-center gap-2 font-display text-lg text-[var(--ink)]">
            <Lightbulb className="size-4 text-[var(--red)]" />
            Layout suggestions
          </DialogTitle>
          <DialogDescription className="text-[0.75rem] leading-relaxed text-[var(--ink-soft)]">
            Deterministic composition heuristics, labelled as suggestions rather
            than design decisions. Each apply is one undoable edit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-4 py-3">
          <section>
            <h3 className="font-meta text-[0.5rem] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
              Pages to review
            </h3>
            <div className="mt-2 flex flex-wrap gap-1">
              {document.pages.map((page, index) => {
                const active = selectedPages.includes(page.id);
                return (
                  <button
                    key={page.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setSelectedPages((current) =>
                        current.includes(page.id)
                          ? current.filter((id) => id !== page.id)
                          : [...current, page.id],
                      )
                    }
                    className={cn(
                      "min-w-7 rounded-[2px] border px-1.5 py-1 font-meta text-[0.52rem] tabular-nums",
                      active
                        ? "border-[var(--red)] text-[var(--red)]"
                        : "border-[var(--rule)] text-[var(--ink-soft)]",
                    )}
                    title={page.name || `Page ${index + 1}`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </section>

          {analysis.issues.filter((issue) => selectedPages.includes(issue.pageId))
            .length > 0 ? (
            <section>
              <h3 className="font-meta text-[0.5rem] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                Observations
              </h3>
              <ul className="mt-1 space-y-1">
                {analysis.issues
                  .filter((issue) => selectedPages.includes(issue.pageId))
                  .map((issue) => (
                    <li
                      key={`${issue.pageId}-${issue.code}`}
                      className="text-[0.72rem] leading-relaxed text-[var(--ink-soft)]"
                    >
                      · {issue.detail}
                    </li>
                  ))}
              </ul>
            </section>
          ) : null}

          <section className="space-y-2">
            {suggestions.length === 0 ? (
              <p className="rounded-[3px] border border-[var(--rule)] px-3 py-4 text-center text-[0.75rem] text-[var(--ink-soft)]">
                No layout suggestions for the selected pages. Compositions
                already read as deliberate, or there are no photographs to
                arrange.
              </p>
            ) : (
              suggestions.map((suggestion) => {
                const variant = variants[suggestion.id] ?? 0;
                return (
                  <div
                    key={`${suggestion.id}:${variant}`}
                    data-suggestion
                    className="rounded-[3px] border border-[var(--rule)] p-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[0.8rem] text-[var(--ink)]">
                          {suggestion.title}
                          <span className="ml-2 font-meta text-[0.48rem] uppercase tracking-[0.1em] text-[var(--ink-soft)]">
                            page{" "}
                            {document.pages.findIndex(
                              (page) => page.id === suggestion.pageId,
                            ) + 1}
                          </span>
                        </p>
                        <p className="mt-0.5 text-[0.72rem] leading-relaxed text-[var(--ink-soft)]">
                          {suggestion.rationale}
                        </p>
                        <ul className="mt-1 space-y-0.5">
                          {suggestion.changes.map((change) => (
                            <li
                              key={change}
                              className="text-[0.66rem] text-[var(--ink-soft)]"
                            >
                              · {change}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {previewing?.id === suggestion.id && previewDocument ? (
                        <div className="shrink-0">
                          <PageThumb
                            page={
                              previewDocument.pages.find(
                                (page) => page.id === suggestion.pageId,
                              ) ?? previewDocument.pages[0]!
                            }
                            document={previewDocument}
                            className="shadow-[0_0_0_0.5px_color-mix(in_oklab,var(--ink)_24%,transparent)]"
                          />
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        className="h-6 rounded-[2px] px-2 font-meta text-[0.5rem] uppercase tracking-[0.1em]"
                        onClick={() => applyAll([suggestion])}
                      >
                        Apply
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 rounded-[2px] px-2 font-meta text-[0.5rem] uppercase tracking-[0.1em]"
                        onClick={() =>
                          setPreviewing((current) =>
                            current?.id === suggestion.id ? null : suggestion,
                          )
                        }
                      >
                        {previewing?.id === suggestion.id ? "Hide preview" : "Preview"}
                      </Button>
                      {suggestion.variantCount && suggestion.variantCount > 1 ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 gap-1 rounded-[2px] px-2 font-meta text-[0.5rem] uppercase tracking-[0.1em]"
                          onClick={() =>
                            setVariants((current) => ({
                              ...current,
                              [suggestion.id]: variant + 1,
                            }))
                          }
                        >
                          <RefreshCw className="size-2.5" />
                          Another
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 gap-1 rounded-[2px] px-2 font-meta text-[0.5rem] uppercase tracking-[0.1em] text-[var(--ink-soft)]"
                        onClick={() =>
                          setDismissed((current) => [...current, suggestion.id])
                        }
                      >
                        <X className="size-2.5" />
                        Reject
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </section>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--rule)] px-4 py-3">
          <Button
            type="button"
            variant="outline"
            className="h-8 rounded-[3px] font-meta text-[0.55rem] uppercase tracking-[0.1em]"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            className="h-8 rounded-[3px] font-meta text-[0.55rem] uppercase tracking-[0.12em]"
            disabled={suggestions.length === 0}
            onClick={() => applyAll(suggestions)}
          >
            Apply all suggestions
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
