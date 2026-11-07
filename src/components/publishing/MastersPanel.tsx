import { useState } from "react";
import {
  Copy,
  Eye,
  EyeOff,
  Layers,
  Pencil,
  Plus,
  RotateCcw,
  Scissors,
  Trash2,
} from "lucide-react";

import type {
  MasterPage,
  PublicationDocument,
  PublicationObject,
  PublicationPage,
} from "@/lib/publishing/model";
import {
  masterAsPage,
  masterObjectsForPage,
  masterUsageCount,
  overriddenObjects,
} from "@/lib/publishing/masters";
import { PageThumb } from "./PageThumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * Master pages panel.
 *
 * Masters are publication furniture, so they live beside Pages, Layers and
 * Assets rather than in a separate navigator. The panel does the whole
 * workflow in one place: create, rename, duplicate, delete, open a master for
 * editing, and apply one to the current page or to a multi-page selection.
 */

export interface MastersPanelProps {
  document: PublicationDocument;
  /** The page whose assignment and overrides are shown. */
  page: PublicationPage;
  activeMasterId?: string;
  busy?: boolean;
  onCreate: () => void;
  onDuplicate: (masterId: string) => void;
  onRename: (masterId: string, name: string) => void;
  onDelete: (masterId: string) => void;
  onEnter: (masterId: string) => void;
  onAssign: (pageIds: readonly string[], masterId: string | undefined) => void;
  onOverride: (objectId: string, patch: { hidden?: boolean }) => void;
  onRestore: (objectId: string) => void;
  onDetach: (objectId: string) => void;
}

function objectLabel(object: PublicationObject): string {
  if (object.kind === "text-frame") return object.name || "Text frame";
  if (object.kind === "image-frame") return object.name || "Image frame";
  if (object.kind === "shape") return object.name || "Shape";
  if (object.kind === "line") return object.name || "Line";
  return object.name || "Object";
}

export function MastersPanel({
  document,
  page,
  activeMasterId,
  busy,
  onCreate,
  onDuplicate,
  onRename,
  onDelete,
  onEnter,
  onAssign,
  onOverride,
  onRestore,
  onDetach,
}: MastersPanelProps) {
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  // Only the *extra* pages are state. The page being edited is always part of
  // the selection (derived below), so "Apply" can never silently skip the page
  // the designer is looking at, and switching pages needs no effect.
  const [pickedPages, setPickedPages] = useState<string[]>([]);
  const selectedPages = pickedPages.includes(page.id)
    ? pickedPages
    : [page.id, ...pickedPages];

  const assigned = document.masters.find((master) => master.id === page.masterId);
  const assignedObjects = assigned
    ? masterObjectsForPage({ ...page, masterOverrides: undefined }, assigned)
    : [];
  const overrides = overriddenObjects(page, assigned);
  const overriddenIds = new Set(
    (page.masterOverrides ?? []).map((entry) => entry.objectId),
  );
  const allAssignedObjects = assigned
    ? masterAsPage(assigned, document).objects
    : [];

  const togglePage = (pageId: string) => {
    // The current page is fixed in the selection: clicking it is a no-op.
    if (pageId === page.id) return;
    setPickedPages((current) =>
      current.includes(pageId)
        ? current.filter((id) => id !== pageId)
        : [...current, pageId].sort(
            (a, b) =>
              document.pages.findIndex((entry) => entry.id === a) -
              document.pages.findIndex((entry) => entry.id === b),
          ),
    );
  };

  const startRename = (master: MasterPage) => {
    setRenaming(master.id);
    setDraftName(master.name);
  };

  const commitRename = () => {
    if (!renaming) return;
    const name = draftName.trim();
    if (name) onRename(renaming, name);
    setRenaming(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-[var(--rule)] px-3 py-2">
        <span className="font-meta text-[0.58rem] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
          Masters · {document.masters.length}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-1.5 font-meta text-[0.55rem] uppercase tracking-[0.1em] text-[var(--red)]"
          disabled={busy}
          onClick={onCreate}
        >
          <Plus className="h-3 w-3" />
          New
        </Button>
      </div>

      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-1.5 p-2">
          {document.masters.length === 0 ? (
            <p className="px-1 py-6 text-[0.7rem] leading-relaxed text-[var(--ink-soft)]">
              No masters yet. A master holds reusable furniture — folios,
              running heads, rules, frames — and paints beneath every page that
              uses it.
            </p>
          ) : null}

          {document.masters.map((master) => {
            const active = master.id === activeMasterId;
            const usage = masterUsageCount(document, master.id);
            const isAssigned = master.id === page.masterId;
            return (
              <div
                key={master.id}
                className={cn(
                  "rounded-[3px] border p-1.5 transition-colors",
                  active
                    ? "border-[var(--red)] bg-[color-mix(in_oklab,var(--red)_6%,transparent)]"
                    : isAssigned
                      ? "border-[var(--rule)] bg-[var(--paper-light)]"
                      : "border-transparent hover:border-[var(--rule)]",
                )}
                data-master-row={master.id}
              >
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="shrink-0 overflow-hidden rounded-[2px] border border-[var(--rule)] bg-white"
                    title="Open this master for editing"
                    onClick={() => onEnter(master.id)}
                  >
                    <PageThumb
                      page={masterAsPage(master, document)}
                      document={document}
                      className="h-auto w-[54px]"
                    />
                  </button>
                  <div className="min-w-0 flex-1">
                    {renaming === master.id ? (
                      <Input
                        autoFocus
                        value={draftName}
                        aria-label={`Rename ${master.name}`}
                        onChange={(event) => setDraftName(event.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") commitRename();
                          if (event.key === "Escape") setRenaming(null);
                        }}
                        className="h-6 rounded-[3px] border-[var(--rule)] bg-[var(--paper)] text-[0.72rem] shadow-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => onEnter(master.id)}
                        className="block w-full truncate text-left text-[0.74rem] leading-tight text-[var(--ink)] hover:text-[var(--red)]"
                      >
                        {master.name}
                      </button>
                    )}
                    <p className="mt-0.5 font-meta text-[0.52rem] uppercase tracking-[0.08em] text-[var(--ink-soft)]">
                      {usage === 0 ? "Unused" : `${usage} page${usage === 1 ? "" : "s"}`}
                      {isAssigned ? " · this page" : ""}
                    </p>
                    <div className="mt-1 flex items-center gap-0.5">
                      <button
                        type="button"
                        title="Rename"
                        aria-label={`Rename ${master.name}`}
                        onClick={() => startRename(master)}
                        className="rounded-[2px] p-1 text-[var(--ink-soft)] hover:bg-[var(--paper-light)] hover:text-[var(--ink)]"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        title="Duplicate"
                        aria-label={`Duplicate ${master.name}`}
                        onClick={() => onDuplicate(master.id)}
                        className="rounded-[2px] p-1 text-[var(--ink-soft)] hover:bg-[var(--paper-light)] hover:text-[var(--ink)]"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        title="Delete master"
                        aria-label={`Delete ${master.name}`}
                        onClick={() => onDelete(master.id)}
                        className="rounded-[2px] p-1 text-[var(--ink-soft)] hover:bg-[var(--paper-light)] hover:text-[var(--red)]"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                      <span className="ml-auto font-meta text-[0.5rem] uppercase tracking-[0.08em] text-[var(--ink-soft)]">
                        {master.objects.length} obj
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-[var(--rule)] p-2">
          <p className="font-meta text-[0.55rem] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
            Assignment
          </p>
          <div className="mt-1.5">
            <Select
              value={page.masterId ?? "none"}
              onValueChange={(value) =>
                onAssign([page.id], value === "none" ? undefined : value)
              }
            >
              <SelectTrigger
                aria-label="Master for this page"
                className="h-7 rounded-[3px] border-[var(--rule)] bg-[var(--paper)] text-[0.7rem] shadow-none"
              >
                <SelectValue placeholder="No master" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No master</SelectItem>
                {document.masters.map((master) => (
                  <SelectItem key={master.id} value={master.id}>
                    {master.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="mt-2 font-meta text-[0.52rem] uppercase tracking-[0.08em] text-[var(--ink-soft)]">
            Apply to pages
          </p>
          <div className="mt-1 grid grid-cols-6 gap-1">
            {document.pages.map((entry, index) => {
              const checked = selectedPages.includes(entry.id);
              // Pages already using the master under inspection are marked, so
              // "apply to pages" is a decision made with the usage visible.
              const uses = entry.masterId === (activeMasterId ?? page.masterId);
              return (
                <button
                  key={entry.id}
                  type="button"
                  aria-label={`Select page ${index + 1}`}
                  aria-pressed={checked}
                  title={
                    entry.masterId
                      ? `Page ${index + 1} · master ${
                          document.masters.find((m) => m.id === entry.masterId)?.name ??
                          "missing"
                        }`
                      : `Page ${index + 1} · no master`
                  }
                  onClick={() => togglePage(entry.id)}
                  className={cn(
                    "relative h-5 rounded-[2px] border font-meta text-[0.55rem] tabular-nums transition-colors",
                    checked
                      ? "border-[var(--red)] bg-[var(--red)] text-white"
                      : "border-[var(--rule)] text-[var(--ink-soft)] hover:text-[var(--ink)]",
                    uses && !checked && "border-[color-mix(in_oklab,var(--red)_45%,var(--rule))]",
                  )}
                >
                  {index + 1}
                  {uses ? (
                    <span
                      aria-hidden
                      className={cn(
                        "absolute right-0.5 top-0.5 h-1 w-1 rounded-full",
                        checked ? "bg-white" : "bg-[var(--red)]",
                      )}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="mt-1.5 flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-6 flex-1 rounded-[3px] border-[var(--rule)] px-1 font-meta text-[0.52rem] uppercase tracking-[0.08em]"
              disabled={busy || selectedPages.length === 0}
              onClick={() =>
                onAssign(selectedPages, page.masterId ?? document.masters[0]?.id)
              }
            >
              Assign to {selectedPages.length}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 rounded-[3px] px-1.5 font-meta text-[0.52rem] uppercase tracking-[0.08em] text-[var(--ink-soft)]"
              disabled={busy || selectedPages.length === 0}
              onClick={() => onAssign(selectedPages, undefined)}
            >
              Clear
            </Button>
          </div>
        </div>

        <div className="border-t border-[var(--rule)] p-2 pb-6">
          <p className="font-meta text-[0.55rem] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
            Master objects on this page
          </p>
          {!assigned ? (
            <p className="mt-1.5 text-[0.66rem] leading-relaxed text-[var(--ink-soft)]">
              This page has no master. Assign one above to inherit its furniture.
            </p>
          ) : allAssignedObjects.length === 0 ? (
            <p className="mt-1.5 text-[0.66rem] leading-relaxed text-[var(--ink-soft)]">
              “{assigned.name}” has no objects yet.
            </p>
          ) : (
            <ul className="mt-1.5 space-y-1">
              {allAssignedObjects.map((object) => {
                const override = overrides.find((entry) => entry.object.id === object.id);
                const listed = assignedObjects.some((entry) => entry.id === object.id);
                return (
                  <li
                    key={object.id}
                    className="flex items-center gap-1 rounded-[2px] px-1 py-0.5 hover:bg-[var(--paper-light)]"
                    data-master-object={object.id}
                  >
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-[0.68rem]",
                        listed ? "text-[var(--ink)]" : "text-[var(--ink-soft)] line-through",
                      )}
                      title={objectLabel(object)}
                    >
                      {objectLabel(object)}
                    </span>
                    {overriddenIds.has(object.id) ? (
                      <span className="font-meta text-[0.48rem] uppercase tracking-[0.06em] text-[var(--red)]">
                        overridden
                      </span>
                    ) : null}
                    <button
                      type="button"
                      aria-label={
                        override?.override.hidden
                          ? `Show ${objectLabel(object)} on this page`
                          : `Hide ${objectLabel(object)} on this page`
                      }
                      title="Hide on this page"
                      onClick={() => onOverride(object.id, { hidden: !override?.override.hidden })}
                      className="rounded-[2px] p-0.5 text-[var(--ink-soft)] hover:text-[var(--ink)]"
                    >
                      {override?.override.hidden ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                    </button>
                    {overriddenIds.has(object.id) ? (
                      <button
                        type="button"
                        aria-label={`Restore ${objectLabel(object)}`}
                        title="Restore master version"
                        onClick={() => onRestore(object.id)}
                        className="rounded-[2px] p-0.5 text-[var(--ink-soft)] hover:text-[var(--ink)]"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      aria-label={`Detach ${objectLabel(object)}`}
                      title="Copy onto this page as a normal object"
                      onClick={() => onDetach(object.id)}
                      className="rounded-[2px] p-0.5 text-[var(--ink-soft)] hover:text-[var(--ink)]"
                    >
                      <Scissors className="h-3 w-3" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-2 flex items-start gap-1 font-meta text-[0.5rem] uppercase leading-relaxed tracking-[0.06em] text-[color-mix(in_oklab,var(--ink-soft)_80%,transparent)]">
            <Layers className="mt-0.5 h-2.5 w-2.5 shrink-0" />
            Overrides affect this page only; the master keeps its original.
          </p>
        </div>
      </div>
    </div>
  );
}
