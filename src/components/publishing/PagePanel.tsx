import { useState } from "react";
import {
  ArrowLeftToLine,
  ArrowRightToLine,
  ChevronDown,
  ChevronUp,
  Copy,
  FilePlus2,
  Trash2,
} from "lucide-react";

import type { PublicationDocument, PublicationPage } from "@/lib/publishing/model";
import { pageIndexOf } from "@/lib/publishing/operations";
import type { Spread } from "@/lib/publishing/model";
import { PageThumb } from "./PageThumb";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

/**
 * The pages panel: the document's spine. Structure (add, duplicate, delete,
 * reorder) is server-driven in the publishing model — pages, spreads and
 * master assignments are consistent because the document is rebuilt, not
 * hand-patched — so this panel calls the editor's mutations and renders the
 * result.
 */

export interface PagePanelProps {
  document: PublicationDocument;
  activePageId: string;
  dirtyPages: ReadonlySet<string>;
  busy?: boolean;
  onActivate: (pageId: string) => void;
  onAddPage: (afterPageId: string) => void;
  onDuplicatePage: (pageId: string) => void;
  onDeletePage: (pageId: string) => void;
  onMovePage: (pageId: string, toIndex: number) => void;
}

export function PagePanel({
  document,
  activePageId,
  dirtyPages,
  busy,
  onActivate,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  onMovePage,
}: PagePanelProps) {
  const [confirmDelete, setConfirmDelete] = useState<PublicationPage | null>(null);
  const masterName = (masterId: string | undefined) =>
    masterId ? document.masters.find((master) => master.id === masterId)?.name : undefined;

  const deleteDisabled = document.pages.length <= 1;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-1 border-b border-[var(--rule)] px-3 py-2">
        <span className="font-meta text-[0.6rem] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
          Pages · {document.pages.length}
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            title="New page after the active page"
            disabled={busy}
            onClick={() => onAddPage(activePageId)}
          >
            <FilePlus2 className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            title="Duplicate active page"
            disabled={busy || !activePageId}
            onClick={() => activePageId && onDuplicatePage(activePageId)}
          >
            <Copy className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-[var(--red)]"
            title={deleteDisabled ? "A publication keeps at least one page" : "Delete active page"}
            disabled={busy || !activePageId || deleteDisabled}
            onClick={() => {
              const page = document.pages.find((entry) => entry.id === activePageId);
              if (page) setConfirmDelete(page);
            }}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {document.spreads.map((spread: Spread) => (
          <div key={spread.id} className="mb-1">
            {document.facingPages ? (
              <div className="px-1 pb-1 pt-1 font-meta text-[0.55rem] uppercase tracking-[0.14em] text-[color-mix(in_oklab,var(--ink-soft)_70%,transparent)]">
                {spread.kind === "facing" ? `Facing spread ${spread.index + 1}` : `Solo`}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {spread.pageIds.map((pageId) => {
                const index = pageIndexOf(document, pageId);
                const page = document.pages[index];
                if (!page) return null;
                const active = pageId === activePageId;
                return (
                  <button
                    key={pageId}
                    type="button"
                    onClick={() => onActivate(pageId)}
                    className={cn(
                      "group relative w-[128px] rounded-sm border bg-[var(--paper-light)] p-1.5 text-left transition-colors",
                      active
                        ? "border-[var(--red)] shadow-[0_0_0_1px_var(--red)]"
                        : "border-[var(--rule)] hover:border-[color-mix(in_oklab,var(--ink-soft)_45%,transparent)]",
                    )}
                    title={page.name || `Page ${index + 1}`}
                  >
                    <div className="flex justify-center rounded-[1px] bg-[color-mix(in_oklab,var(--ink)_6%,transparent)] p-1">
                      <PageThumb
                        page={page}
                        document={document}
                        className="rounded-[1px] shadow-[0_0_0_0.5px_color-mix(in_oklab,var(--ink)_28%,transparent)]"
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-1">
                      <span className="truncate font-meta text-[0.58rem] uppercase tracking-[0.1em] text-[var(--ink)]">
                        {index + 1}
                        {page.name.trim() && page.name !== "Page" ? ` · ${page.name}` : ""}
                      </span>
                      {masterName(page.masterId) ? (
                        <span
                          className="shrink-0 rounded-[2px] bg-[color-mix(in_oklab,var(--gold)_26%,transparent)] px-1 font-meta text-[0.52rem] uppercase text-[var(--olive)]"
                          title={`Master · ${masterName(page.masterId)}`}
                        >
                          M
                        </span>
                      ) : null}
                    </div>
                    {dirtyPages.has(pageId) ? (
                      <span
                        className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-[var(--red)]"
                        title="Unsaved edits"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Reorder controls travel with the active page row, so they exist */}
        {/* whether or not the list is long. */}
        <div className="sticky bottom-0 mt-2 flex items-center justify-center gap-1 border-t border-[var(--rule)] bg-[var(--paper)] py-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 font-meta text-[0.62rem] uppercase tracking-[0.12em]"
            title="Move to the start"
            disabled={busy || !activePageId || pageIndexOf(document, activePageId) === 0}
            onClick={() => activePageId && onMovePage(activePageId, 0)}
          >
            <ArrowLeftToLine className="size-3" /> First
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            title="Move one page earlier"
            disabled={busy || !activePageId || pageIndexOf(document, activePageId) === 0}
            onClick={() => {
              if (!activePageId) return;
              const index = pageIndexOf(document, activePageId);
              onMovePage(activePageId, Math.max(0, index - 1));
            }}
          >
            <ChevronUp className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            title="Move one page later"
            disabled={
              busy ||
              !activePageId ||
              pageIndexOf(document, activePageId) === document.pages.length - 1
            }
            onClick={() => {
              if (!activePageId) return;
              const index = pageIndexOf(document, activePageId);
              onMovePage(activePageId, Math.min(document.pages.length - 1, index + 1));
            }}
          >
            <ChevronDown className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 font-meta text-[0.62rem] uppercase tracking-[0.12em]"
            title="Move to the end"
            disabled={
              busy ||
              !activePageId ||
              pageIndexOf(document, activePageId) === document.pages.length - 1
            }
            onClick={() =>
              activePageId && onMovePage(activePageId, document.pages.length - 1)
            }
          >
            Last <ArrowRightToLine className="size-3" />
          </Button>
        </div>
      </div>

      <AlertDialog open={Boolean(confirmDelete)} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this page?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete
                ? `“${confirmDelete.name.trim() || "Untitled page"}” and every object on it will be removed from the publication. This cannot be undone from the editor.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep the page</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[var(--red)] text-white hover:bg-[color-mix(in_oklab,var(--red)_88%,black)]"
              onClick={() => {
                if (confirmDelete) onDeletePage(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Delete page
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
