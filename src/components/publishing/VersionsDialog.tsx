import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Check, History, Loader2, Pencil, RotateCcw, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * Named versions.
 *
 * A version is a full, server-side snapshot of the publication (settings,
 * pages, masters, stories and the asset rows they use). This dialog only
 * drives the existing `publishing/versions` mutations: creating a version
 * flushes pending autosave first, and restoring always asks for confirmation
 * because it replaces the open document.
 */
export interface VersionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publicationId: string;
  pageCount: number;
  /** Flush pending autosave so the snapshot contains the latest edits. */
  onBeforeSnapshot: () => Promise<void>;
  /** Called after a restore replaced the document on the server. */
  onRestored: () => void;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function when(createdAt: number): string {
  return new Date(createdAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function VersionsDialog({
  open,
  onOpenChange,
  publicationId,
  pageCount,
  onBeforeSnapshot,
  onRestored,
}: VersionsDialogProps) {
  const id = publicationId as Id<"publications">;
  const versions = useQuery(
    api.publishing.versions.listVersions,
    open ? { publicationId: id } : "skip",
  );
  const createVersion = useMutation(api.publishing.versions.createVersion);
  const renameVersion = useMutation(api.publishing.versions.renameVersion);
  const restoreVersion = useMutation(api.publishing.versions.restoreVersion);

  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState<"create" | "rename" | "restore" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const reset = () => {
    setError(null);
    setBusy(null);
    setRenamingId(null);
    setConfirmId(null);
    setLabel("");
  };

  const create = async () => {
    const name = label.trim();
    if (!name) {
      setError("Give this version a name.");
      return;
    }
    setBusy("create");
    setError(null);
    try {
      await onBeforeSnapshot();
      await createVersion({ publicationId: id, label: name });
      setLabel("");
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(null);
    }
  };

  const saveRename = async (versionId: string) => {
    const name = renameDraft.trim();
    if (!name) {
      setError("Give this version a name.");
      return;
    }
    setBusy("rename");
    setError(null);
    try {
      await renameVersion({
        publicationId: id,
        versionId: versionId as Id<"publicationVersions">,
        label: name,
      });
      setRenamingId(null);
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(null);
    }
  };

  const restore = async (versionId: string) => {
    setBusy("restore");
    setError(null);
    try {
      await restoreVersion({
        publicationId: id,
        versionId: versionId as Id<"publicationVersions">,
      });
      // The open session was built on the pre-restore document versions, so
      // it cannot keep editing safely. The editor reloads into the restored
      // document instead of leaving a stale canvas on screen.
      onRestored();
    } catch (cause) {
      setError(messageOf(cause));
      setBusy(null);
      setConfirmId(null);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-[560px] gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-[var(--rule)] px-5 py-4">
          <DialogTitle className="flex items-center gap-2 font-display text-lg">
            <History className="size-4 text-[var(--red)]" /> Named versions
          </DialogTitle>
          <DialogDescription className="text-[0.72rem] leading-relaxed text-[var(--ink-soft)]">
            A named version saves the whole publication — {pageCount}{" "}
            {pageCount === 1 ? "page" : "pages"}, masters, stories and the images in
            use. Restoring one replaces the open document.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-end gap-2 border-b border-[var(--rule)] px-5 py-3">
          <label className="flex-1">
            <span className="mb-1 block font-meta text-[0.55rem] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
              New version name
            </span>
            <Input
              value={label}
              maxLength={120}
              placeholder="e.g. Client review 2"
              disabled={busy !== null}
              onChange={(event) => {
                setLabel(event.target.value);
                setError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") void create();
              }}
              className="h-8 rounded-[3px] border-[var(--rule)] bg-[var(--paper)] text-[0.78rem] shadow-none"
            />
          </label>
          <Button
            size="sm"
            disabled={busy !== null || !label.trim()}
            onClick={() => void create()}
            className="h-8 rounded-[3px] px-3 font-meta text-[0.6rem] uppercase tracking-[0.1em]"
          >
            {busy === "create" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              "Save version"
            )}
          </Button>
        </div>

        {error ? (
          <p
            role="alert"
            className="border-b border-[var(--rule)] bg-[color-mix(in_oklab,var(--red)_7%,var(--paper))] px-5 py-2 text-[0.72rem] text-[var(--red)]"
          >
            {error}
          </p>
        ) : null}

        <div className="max-h-[46vh] min-h-[132px] overflow-y-auto">
          {versions === undefined ? (
            <p className="flex items-center gap-2 px-5 py-6 text-[0.75rem] text-[var(--ink-soft)]">
              <Loader2 className="size-3.5 animate-spin" /> Loading versions…
            </p>
          ) : versions.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="font-display text-[0.95rem] text-[var(--ink)]">
                No named versions yet
              </p>
              <p className="mx-auto mt-1 max-w-[320px] text-[0.72rem] leading-relaxed text-[var(--ink-soft)]">
                Name the current document before a big change. You can always
                come back to it from here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--rule)]">
              {versions.map((version) => {
                const renaming = renamingId === version._id;
                const confirming = confirmId === version._id;
                return (
                  <li key={version._id} className="px-5 py-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 w-9 shrink-0 rounded-[3px] border border-[var(--rule)] py-0.5 text-center font-meta text-[0.6rem] tabular-nums text-[var(--ink-soft)]">
                        v{version.versionNumber}
                      </span>
                      <div className="min-w-0 flex-1">
                        {renaming ? (
                          <div className="flex items-center gap-1.5">
                            <Input
                              autoFocus
                              value={renameDraft}
                              maxLength={120}
                              onChange={(event) => setRenameDraft(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") void saveRename(version._id);
                                if (event.key === "Escape") setRenamingId(null);
                              }}
                              aria-label="Version name"
                              className="h-7 rounded-[3px] border-[var(--rule)] bg-[var(--paper)] text-[0.78rem] shadow-none"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label="Save name"
                              disabled={busy !== null}
                              onClick={() => void saveRename(version._id)}
                              className="size-7 shrink-0 rounded-[3px] p-0"
                            >
                              <Check className="size-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label="Cancel rename"
                              onClick={() => setRenamingId(null)}
                              className="size-7 shrink-0 rounded-[3px] p-0"
                            >
                              <X className="size-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <p className="truncate text-[0.8rem] font-medium text-[var(--ink)]">
                            {version.label}
                          </p>
                        )}
                        <p className="mt-1 font-meta text-[0.62rem] tabular-nums text-[var(--ink-soft)]">
                          {when(version.createdAt)} · {version.pageCount}{" "}
                          {version.pageCount === 1 ? "page" : "pages"} ·{" "}
                          {version.assetCount}{" "}
                          {version.assetCount === 1 ? "image" : "images"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Rename ${version.label}`}
                          disabled={busy !== null}
                          onClick={() => {
                            setConfirmId(null);
                            setRenamingId(version._id);
                            setRenameDraft(version.label);
                            setError(null);
                          }}
                          className="size-7 rounded-[3px] p-0 text-[var(--ink-soft)] hover:text-[var(--ink)]"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy !== null}
                          onClick={() => {
                            setRenamingId(null);
                            setConfirmId(confirming ? null : version._id);
                            setError(null);
                          }}
                          className="h-7 gap-1 rounded-[3px] px-2 font-meta text-[0.55rem] uppercase tracking-[0.08em]"
                        >
                          <RotateCcw className="size-3" />
                          {confirming ? "Cancel" : "Restore"}
                        </Button>
                      </div>
                    </div>

                    {confirming ? (
                      <div
                        role="group"
                        aria-label={`Confirm restoring ${version.label}`}
                        className="mt-2 rounded-[3px] border border-[var(--red)] bg-[color-mix(in_oklab,var(--red)_5%,var(--paper))] px-3 py-2"
                      >
                        <p className="text-[0.72rem] leading-relaxed text-[var(--ink)]">
                          Replace the open document with <strong>{version.label}</strong>{" "}
                          (v{version.versionNumber}, {when(version.createdAt)})? Work
                          saved after this version will be replaced. Save it as a
                          version first if you might need it.
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <Button
                            size="sm"
                            disabled={busy !== null}
                            onClick={() => void restore(version._id)}
                            className="h-7 rounded-[3px] px-2.5 font-meta text-[0.55rem] uppercase tracking-[0.08em]"
                          >
                            {busy === "restore" ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              "Restore this version"
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy !== null}
                            onClick={() => setConfirmId(null)}
                            className="h-7 rounded-[3px] px-2 font-meta text-[0.55rem] uppercase tracking-[0.08em]"
                          >
                            Keep current
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <p className="border-t border-[var(--rule)] bg-[color-mix(in_oklab,var(--ink)_3%,var(--paper))] px-5 py-2.5 text-[0.66rem] leading-relaxed text-[var(--ink-soft)]">
          Versions are stored on the server with this publication. Restoring never
          deletes image files.
        </p>
      </DialogContent>
    </Dialog>
  );
}
