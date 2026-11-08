import { CornerUpLeft, CornerUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The operation log. One row per logical user action, newest first; rows that
 * have been undone stay visible so redo has a name. The panel drives the same
 * `performUndo`/`performRedo` as the toolbar — there is one history, not two.
 */
export interface HistoryPanelProps {
  history: readonly {
    id: string;
    label: string;
    kind: "content" | "structure";
    state: "done" | "undone";
  }[];
  canUndo: boolean;
  canRedo: boolean;
  busy: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export function HistoryPanel({
  history,
  canUndo,
  canRedo,
  busy,
  onUndo,
  onRedo,
}: HistoryPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-1 border-b border-[var(--rule)] p-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 flex-1 gap-1 rounded-[3px] font-meta text-[0.55rem] uppercase tracking-[0.1em]"
          disabled={!canUndo || busy}
          onClick={onUndo}
        >
          <CornerUpLeft className="size-3" />
          Undo
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 flex-1 gap-1 rounded-[3px] font-meta text-[0.55rem] uppercase tracking-[0.1em]"
          disabled={!canRedo || busy}
          onClick={onRedo}
        >
          <CornerUpRight className="size-3" />
          Redo
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto scroll-slim">
        {history.length === 0 ? (
          <p className="p-3 text-[0.72rem] leading-relaxed text-[var(--ink-soft)]">
            Edits appear here as you work. Page, master and layer commands are
            undoable too — one row per command.
          </p>
        ) : (
          <ol className="divide-y divide-[var(--rule)]" data-history-list>
            {history.map((entry) => (
              <li
                key={entry.id}
                data-history-entry
                data-state={entry.state}
                className={cn(
                  "flex items-start gap-2 px-3 py-2",
                  entry.state === "undone" && "opacity-45",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-1 size-1.5 shrink-0 rounded-full",
                    entry.kind === "structure"
                      ? "bg-[var(--red)]"
                      : "bg-[var(--olive,#6b7150)]",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.72rem] leading-snug text-[var(--ink)]">
                    {entry.label}
                  </span>
                  <span className="font-meta text-[0.48rem] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
                    {entry.kind === "structure" ? "Page structure" : "Content"}
                    {entry.state === "undone" ? " · undone" : ""}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
      <p className="border-t border-[var(--rule)] px-3 py-2 font-meta text-[0.48rem] uppercase tracking-[0.1em] leading-relaxed text-[var(--ink-soft)]">
        ⌘Z / Ctrl+Z undo · ⇧⌘Z redo. History is per session; resolving a save
        conflict or opening a recovery draft starts a new one.
      </p>
    </div>
  );
}
