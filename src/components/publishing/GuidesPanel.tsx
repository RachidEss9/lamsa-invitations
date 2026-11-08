import { Lock, LockOpen, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { guidesForPage, makeGuide } from "@/lib/publishing/guides";
import { columnRects, safeBox, trimBox } from "@/lib/publishing/geometry";
import { formatLength, type LengthUnit } from "@/lib/publishing/units";
import type {
  Guide,
  PublicationDocument,
  PublicationPage,
} from "@/lib/publishing/model";
import { cn } from "@/lib/utils";

/**
 * Guides and layout aids for the active page. Guides live in the document and
 * autosave with it; the lock switch is an editor preference for this session,
 * not publication data, so a locked sheet cannot be nudged by accident.
 */
export interface GuidesPanelProps {
  document: PublicationDocument;
  page: PublicationPage | null;
  unit: LengthUnit;
  locked: boolean;
  onLockChange: (locked: boolean) => void;
  onAddGuide: (guide: Guide) => void;
  onMoveGuide: (guideId: string, position: number) => void;
  onRemoveGuide: (guideId: string) => void;
  onClearGuides: (scope: Guide["scope"]) => void;
  chrome: { guides: boolean; margins: boolean; columns: boolean; grid: boolean; baseline: boolean; bleed: boolean };
  onToggleChrome: (key: keyof GuidesPanelProps["chrome"]) => void;
}

export function GuidesPanel({
  document,
  page,
  unit,
  locked,
  onLockChange,
  onAddGuide,
  onMoveGuide,
  onRemoveGuide,
  onClearGuides,
  chrome,
  onToggleChrome,
}: GuidesPanelProps) {
  const pageGuides = page ? guidesForPage(document.guides, page.id) : [];
  const trim = page ? trimBox(page.spec) : null;
  const safe = page ? safeBox(page.spec, page.side) : null;

  const addAt = (axis: Guide["axis"], position: number, scope: Guide["scope"] = "page") => {
    if (!page) return;
    onAddGuide(makeGuide(axis, Math.round(position * 10) / 10, scope, page.id));
  };

  const addMargins = () => {
    if (!page || !safe) return;
    const guides = [
      makeGuide("x", safe.x, "page", page.id),
      makeGuide("x", safe.x + safe.width, "page", page.id),
      makeGuide("y", safe.y, "page", page.id),
      makeGuide("y", safe.y + safe.height, "page", page.id),
    ];
    onAddGuide(guides[0]!);
    onAddGuide(guides[1]!);
    onAddGuide(guides[2]!);
    onAddGuide(guides[3]!);
  };

  const addColumns = () => {
    if (!page || !trim) return;
    const columns = columnRects(page.spec, document.grid, page.side);
    if (columns.length === 0) return;
    // Only the gutters become guides; the outer edges are the margins.
    for (let index = 1; index < columns.length; index += 1) {
      const column = columns[index]!;
      onAddGuide(makeGuide("x", column.x - document.grid.gutter / 2, "page", page.id));
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-1 border-b border-[var(--rule)] px-2 py-1.5">
        <span className="font-meta text-[0.5rem] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
          {pageGuides.length} guide{pageGuides.length === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          onClick={() => onLockChange(!locked)}
          className={cn(
            "flex items-center gap-1 rounded-[2px] border px-1.5 py-0.5 font-meta text-[0.5rem] uppercase tracking-[0.1em]",
            locked
              ? "border-[var(--red)] text-[var(--red)]"
              : "border-[var(--rule)] text-[var(--ink-soft)]",
          )}
        >
          {locked ? <Lock className="size-2.5" /> : <LockOpen className="size-2.5" />}
          {locked ? "Locked" : "Unlocked"}
        </button>
      </div>

      <div className="space-y-2 border-b border-[var(--rule)] p-2">
        <div className="flex flex-wrap gap-1">
          <Quick
            disabled={locked || !page}
            onClick={() => addAt("x", trim ? trim.width / 2 : 0)}
          >
            <Plus className="size-2.5" /> Vertical centre
          </Quick>
          <Quick
            disabled={locked || !page}
            onClick={() => addAt("y", trim ? trim.height / 2 : 0)}
          >
            <Plus className="size-2.5" /> Horizontal centre
          </Quick>
          <Quick disabled={locked || !page} onClick={addMargins}>
            <Plus className="size-2.5" /> Margins
          </Quick>
          <Quick
            disabled={locked || !page || document.grid.columns < 2}
            onClick={addColumns}
          >
            <Plus className="size-2.5" /> Columns
          </Quick>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {(
            [
              ["guides", "Guides"],
              ["margins", "Margins"],
              ["columns", "Columns"],
              ["baseline", "Baseline"],
              ["grid", "Grid"],
              ["bleed", "Bleed"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => onToggleChrome(key)}
              className={cn(
                "rounded-[2px] border px-1.5 py-1 font-meta text-[0.5rem] uppercase tracking-[0.08em]",
                chrome[key]
                  ? "border-[var(--red)] text-[var(--red)]"
                  : "border-[var(--rule)] text-[var(--ink-soft)]",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto scroll-slim">
        {pageGuides.length === 0 ? (
          <p className="p-3 text-[0.72rem] leading-relaxed text-[var(--ink-soft)]">
            No guides on this page. Drag from a ruler (enable Guides in the
            toolbar) or use the buttons above.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--rule)]" data-guide-list>
            {pageGuides.map((guide) => (
              <li key={guide.id} className="flex items-center gap-1 px-2 py-1">
                <span className="w-4 font-meta text-[0.52rem] uppercase text-[var(--ink-soft)]">
                  {guide.axis}
                </span>
                <Input
                  type="number"
                  step={1}
                  min={0}
                  max={guide.axis === "x" ? trim?.width : trim?.height}
                  value={Math.round(guide.position * 10) / 10}
                  disabled={locked}
                  onChange={(event) =>
                    onMoveGuide(guide.id, Number(event.target.value) || 0)
                  }
                  aria-label={`${guide.axis} guide position`}
                  className="h-6 flex-1 rounded-[2px] px-1 text-[0.7rem] tabular-nums"
                />
                <span className="font-meta text-[0.5rem] text-[var(--ink-soft)]">
                  {formatLength(guide.position, unit)}
                </span>
                {guide.scope === "document" ? (
                  <span className="rounded-[2px] bg-[color-mix(in_oklab,var(--gold)_28%,transparent)] px-1 font-meta text-[0.45rem] uppercase text-[var(--olive)]">
                    all
                  </span>
                ) : null}
                <button
                  type="button"
                  aria-label="Delete guide"
                  disabled={locked}
                  onClick={() => onRemoveGuide(guide.id)}
                  className="text-[var(--ink-soft)] hover:text-[var(--red)] disabled:opacity-40"
                >
                  <Trash2 className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-1 border-t border-[var(--rule)] p-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-6 flex-1 rounded-[2px] font-meta text-[0.48rem] uppercase tracking-[0.08em]"
          disabled={locked || !page}
          onClick={() => onClearGuides("page")}
        >
          Clear page
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-6 flex-1 rounded-[2px] font-meta text-[0.48rem] uppercase tracking-[0.08em]"
          disabled={locked}
          onClick={() => onClearGuides("document")}
        >
          Clear all pages
        </Button>
      </div>
    </div>
  );
}

function Quick({
  disabled,
  onClick,
  children,
}: {
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex items-center gap-0.5 rounded-[2px] border border-[var(--rule)] px-1.5 py-1 font-meta text-[0.48rem] uppercase tracking-[0.06em] text-[var(--ink-soft)] hover:border-[var(--red)] hover:text-[var(--red)] disabled:opacity-40"
    >
      {children}
    </button>
  );
}
