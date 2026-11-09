import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, ArrowUpRight, Clock, Grid2X2, Star, Upload } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ASSET_META, LIBRARY_VIEWS, viewById } from "@/lib/library/catalog";
import { Wordmark } from "@/components/brand/Wordmark";
import { ElementsBrowser } from "@/components/library/ElementsBrowser";
import { UploadsPanel } from "@/components/library/UploadsPanel";
import {
  EditUploadDialog,
  UploadDialog,
} from "@/components/library/UploadDialog";
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
 * The main LAMSA Library: a resource manager over the same catalogue the
 * publishing editor's Elements panel uses.
 *
 * Every section is a view of those records — no section copies a file, and a
 * star or a recent-use entry follows the asset id, so switching sections never
 * changes which asset you are looking at.
 */

type SectionId = (typeof LIBRARY_VIEWS)[number]["id"] | "uploads";

interface UploadRecord {
  _id: string;
  name: string;
  category?: string;
  description?: string;
  url: string | null;
  storageId?: string;
  payload?: unknown;
  createdAt: number;
  updatedAt: number;
}

export default function LibraryPage() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("section") ?? "elements";
  const known = LIBRARY_VIEWS.some((view) => view.id === requested);
  const section: SectionId = known ? (requested as SectionId) : requested === "uploads" ? "uploads" : "elements";

  const view = viewById(section) ?? LIBRARY_VIEWS[0]!;

  const uploadsQuery = useQuery(api.library.listMine, { kind: "asset" });
  const favouritesResult = useQuery(api.libraryAssets.listFavourites);
  const favourites = useMemo(() => favouritesResult ?? [], [favouritesResult]);
  const favouriteSet = useMemo(() => new Set(favourites), [favourites]);
  const toggleFavourite = useMutation(api.libraryAssets.toggleFavourite);
  const removeItem = useMutation(api.library.remove);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<UploadRecord | null>(null);
  const [editing, setEditing] = useState<UploadRecord | null>(null);

  const uploads = (uploadsQuery ?? []) as UploadRecord[];

  const counts = useMemo(() => {
    const byView = new Map<string, number>();
    for (const entry of LIBRARY_VIEWS) {
      byView.set(
        entry.id,
        ASSET_META.filter((asset) => {
          if (entry.categories && !entry.categories.includes(asset.category)) return false;
          if (entry.subcategories && !entry.subcategories.includes(asset.subcategory)) return false;
          if (entry.favouritesOnly) return favouriteSet.has(asset.id);
          return true;
        }).length,
      );
    }
    return byView;
  }, [favouriteSet]);

  const setSection = (next: SectionId) => {
    setParams(next === "elements" ? {} : { section: next }, { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--paper)] text-[var(--ink)]">
      <header className="sticky top-0 z-30 border-b border-[var(--rule)] bg-[var(--paper)]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6">
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 font-meta text-[0.52rem] uppercase tracking-[0.12em] text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
          >
            <ArrowLeft className="size-3.5" strokeWidth={1.8} />
            Studio
          </Link>
          <span className="hidden h-4 w-px bg-[var(--rule)] sm:block" />
          <Wordmark className="h-5 w-auto" />
          <span className="h-4 w-px bg-[var(--rule)]" />
          <span className="font-meta text-[0.52rem] uppercase tracking-[0.16em] text-[var(--red)]">
            Library
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/publishing"
              className="flex items-center gap-1 font-meta text-[0.52rem] uppercase tracking-[0.1em] text-[var(--ink-soft)] transition-colors hover:text-[var(--red)]"
            >
              Publishing studio
              <ArrowUpRight className="size-3" />
            </Link>
            <Button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="h-7 gap-1 rounded-[3px] bg-[var(--red)] px-2.5 font-meta text-[0.52rem] uppercase tracking-[0.1em] text-white hover:bg-[color-mix(in_oklab,var(--red)_88%,black)]"
            >
              <Upload className="size-3" />
              Upload
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1440px] flex-1 grid-cols-1 gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[208px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-[64px] lg:h-[calc(100vh-84px)]">
          <nav aria-label="Library sections" className="flex gap-1 overflow-x-auto pb-2 lg:max-h-[calc(100vh-210px)] lg:flex-col lg:overflow-y-auto lg:pr-1">
            {LIBRARY_VIEWS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setSection(entry.id)}
                aria-current={section === entry.id ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center justify-between gap-2 rounded-[3px] border px-2.5 py-1.5 text-left font-meta text-[0.54rem] uppercase tracking-[0.09em] transition-colors lg:w-full",
                  section === entry.id
                    ? "border-[var(--red)] bg-[color-mix(in_oklab,var(--red)_5%,transparent)] text-[var(--red)]"
                    : "border-transparent text-[var(--ink-soft)] hover:border-[var(--rule)] hover:text-[var(--ink)]",
                )}
              >
                <span className="flex items-center gap-1.5">
                  {entry.id === "favourites" ? (
                    <Star className="size-3" />
                  ) : entry.id === "recents" ? (
                    <Clock className="size-3" />
                  ) : null}
                  {entry.label}
                </span>
                <span className="tabular-nums opacity-60">
                  {entry.id === "favourites" ? favouriteSet.size : counts.get(entry.id) ?? 0}
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSection("uploads")}
              aria-current={section === "uploads" ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center justify-between gap-2 rounded-[3px] border px-2.5 py-1.5 text-left font-meta text-[0.54rem] uppercase tracking-[0.09em] transition-colors lg:w-full",
                section === "uploads"
                  ? "border-[var(--red)] bg-[color-mix(in_oklab,var(--red)_5%,transparent)] text-[var(--red)]"
                  : "border-transparent text-[var(--ink-soft)] hover:border-[var(--rule)] hover:text-[var(--ink)]",
              )}
            >
              My Uploads
              <span className="tabular-nums opacity-60">{uploads.length}</span>
            </button>
          </nav>
          <div className="mt-3 hidden rounded-[3px] border border-[var(--rule)] p-2.5 lg:block">
            <p className="font-meta text-[0.46rem] uppercase tracking-[0.12em] text-[var(--gold)]">
              One catalogue
            </p>
            <p className="mt-1 text-[0.66rem] leading-4 text-[var(--ink-soft)]">
              {ASSET_META.length.toLocaleString()} original vectors, shared with the publishing
              editor. The same record appears under every section it belongs to.
            </p>
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="font-display text-[1.8rem] leading-tight tracking-[0.01em]">
                {section === "uploads" ? "My Uploads" : view.label}
              </h1>
              <p className="mt-0.5 max-w-[68ch] text-[0.78rem] leading-6 text-[var(--ink-soft)]">
                {section === "uploads"
                  ? "Your own files, kept with this account and available beside the catalogue."
                  : view.blurb}
              </p>
            </div>
            <span className="flex items-center gap-1.5 font-meta text-[0.48rem] uppercase tracking-[0.1em] text-[var(--ink-soft)]">
              <Grid2X2 className="size-3" />
              {section === "uploads"
                ? `${uploads.length} upload${uploads.length === 1 ? "" : "s"}`
                : `${(counts.get(view.id) ?? 0).toLocaleString()} assets`}
            </span>
          </div>

          <div className="min-h-[520px] flex-1 overflow-hidden rounded-[var(--radius-tile)] border border-[var(--edge)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]">
            {section === "uploads" ? (
              <UploadsPanel
                uploads={uploads}
                loading={uploadsQuery === undefined}
                favouriteSet={favouriteSet}
                onToggleFavourite={(id) =>
                  void toggleFavourite({ assetId: id }).catch(() =>
                    toast.error("The favorite could not be saved."),
                  )
                }
                onDelete={setConfirmDelete}
                onEdit={setEditing}
                onUpload={() => setUploadOpen(true)}
              />
            ) : (
              <ElementsBrowser
                key={view.id}
                view={view}
                mode="library"
                className="h-full"
              />
            )}
          </div>
        </section>
      </div>

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={(name) => {
          toast.success(`${name} added to My Uploads.`);
          setSection("uploads");
        }}
      />

      <EditUploadDialog
        key={editing?._id ?? "no-upload"}
        upload={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          toast.success("Upload details saved.");
        }}
      />

      <AlertDialog open={Boolean(confirmDelete)} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this upload?</AlertDialogTitle>
            <AlertDialogDescription>
              “{confirmDelete?.name}” will be removed from your library. Files already placed inside
              an invitation are kept by that design.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep file</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[var(--red)] text-white hover:bg-[color-mix(in_oklab,var(--red)_88%,black)]"
              onClick={() => {
                const target = confirmDelete;
                setConfirmDelete(null);
                if (!target) return;
                void removeItem({ id: target._id as Id<"libraryItems"> })
                  .then(() => toast.success("Upload deleted."))
                  .catch(() => toast.error("The upload could not be deleted."));
              }}
            >
              Delete upload
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
