import { useMemo, useState } from "react";
import { ImageOff, Loader2, Pencil, Search, Star, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface UploadRecord {
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

interface UploadsPanelProps {
  uploads: readonly UploadRecord[];
  loading: boolean;
  favouriteSet: ReadonlySet<string>;
  onToggleFavourite: (id: string) => void;
  onDelete: (upload: UploadRecord) => void;
  onEdit: (upload: UploadRecord) => void;
  onUpload: () => void;
}

export function uploadTags(upload: UploadRecord): string[] {
  const payload = upload.payload as { tags?: unknown } | null;
  return Array.isArray(payload?.tags)
    ? payload.tags.filter((tag): tag is string => typeof tag === "string")
    : [];
}

/**
 * The owner's own files. They stay in `libraryItems` — the same rows Studio's
 * library has always used — so nothing here duplicates storage or content.
 */
export function UploadsPanel({
  uploads,
  loading,
  favouriteSet,
  onToggleFavourite,
  onDelete,
  onEdit,
  onUpload,
}: UploadsPanelProps) {
  const [query, setQuery] = useState("");
  const [onlyFavourites, setOnlyFavourites] = useState(false);
  const [preview, setPreview] = useState<UploadRecord | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return uploads.filter((upload) => {
      if (onlyFavourites && !favouriteSet.has(upload._id)) return false;
      if (!needle) return true;
      return (
        upload.name.toLowerCase().includes(needle) ||
        (upload.category ?? "").toLowerCase().includes(needle) ||
        uploadTags(upload).some((tag) => tag.toLowerCase().includes(needle))
      );
    });
  }, [uploads, query, onlyFavourites, favouriteSet]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--rule)] px-2.5 py-2">
        <label className="flex min-w-[180px] flex-1 items-center gap-1.5 rounded-sm border border-[var(--rule)] bg-[var(--paper-light)] px-2">
          <Search className="size-3 text-[var(--ink-soft)]" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search your uploads"
            aria-label="Search uploads"
            className="h-7 border-0 bg-transparent px-0 text-[0.72rem] shadow-none focus-visible:ring-0"
          />
        </label>
        <button
          type="button"
          aria-pressed={onlyFavourites}
          onClick={() => setOnlyFavourites((value) => !value)}
          className={cn(
            "flex items-center gap-1 rounded-full border px-2 py-1 font-meta text-[0.5rem] uppercase tracking-[0.08em]",
            onlyFavourites
              ? "border-[var(--gold)] text-[var(--gold)]"
              : "border-[var(--rule)] text-[var(--ink-soft)]",
          )}
        >
          <Star className={cn("size-3", onlyFavourites && "fill-current")} />
          Favorites
        </button>
        <Button
          type="button"
          variant="outline"
          onClick={onUpload}
          className="h-7 gap-1 rounded-[3px] px-2 font-meta text-[0.5rem] uppercase tracking-[0.08em]"
        >
          <Upload className="size-3" />
          Upload file
        </Button>
      </div>

      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 font-meta text-[0.55rem] uppercase tracking-[0.1em] text-[var(--ink-soft)]">
            <Loader2 className="size-3.5 animate-spin" />
            Loading uploads
          </div>
        ) : filtered.length === 0 ? (
          <div className="mx-auto mt-6 max-w-[360px] rounded-sm border border-dashed border-[var(--rule)] px-4 py-8 text-center">
            <ImageOff className="mx-auto size-5 text-[color-mix(in_oklab,var(--ink-soft)_65%,transparent)]" />
            <p className="mt-2 text-[0.76rem] leading-5 text-[var(--ink-soft)]">
              {uploads.length === 0
                ? "No uploads yet. Add a JPEG, PNG, WebP, AVIF or SVG and it joins your library."
                : "No upload matches that search or filter."}
            </p>
            {uploads.length === 0 ? (
              <Button
                type="button"
                variant="outline"
                onClick={onUpload}
                className="mt-3 h-7 gap-1 rounded-[3px] px-2.5 font-meta text-[0.52rem] uppercase tracking-[0.08em]"
              >
                <Upload className="size-3" />
                Add your first file
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((upload) => {
              const starred = favouriteSet.has(upload._id);
              return (
                <div
                  key={upload._id}
                  className="group relative overflow-hidden rounded-sm border border-[var(--rule)] bg-[var(--paper-light)]"
                >
                  <button
                    type="button"
                    onClick={() => setPreview(upload)}
                    className="block w-full"
                    aria-label={`Preview ${upload.name}`}
                  >
                    <span className="flex h-[120px] w-full items-center justify-center overflow-hidden bg-[color-mix(in_oklab,var(--ink)_5%,transparent)]">
                      {upload.url ? (
                        <img
                          src={upload.url}
                          alt={upload.name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageOff className="size-4 text-[var(--ink-soft)]" />
                      )}
                    </span>
                  </button>
                  <div className="px-2 py-1.5">
                    <p className="truncate text-[0.68rem] text-[var(--ink)]">{upload.name}</p>
                    <p className="font-meta text-[0.44rem] uppercase tracking-[0.05em] text-[var(--ink-soft)]">
                      {upload.category ? categoryText(upload.category) : "Uncategorised"} ·{" "}
                      {new Date(upload.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="absolute right-1 top-1 flex gap-1">
                    <button
                      type="button"
                      aria-pressed={starred}
                      aria-label={starred ? "Remove from favorites" : "Add to favorites"}
                      onClick={() => onToggleFavourite(upload._id)}
                      className={cn(
                        "grid size-6 place-items-center rounded-full bg-[var(--paper)]/90",
                        starred ? "text-[var(--gold)]" : "text-[var(--ink-soft)]",
                      )}
                    >
                      <Star className={cn("size-3", starred && "fill-current")} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Edit ${upload.name}`}
                      onClick={() => onEdit(upload)}
                      className="grid size-6 place-items-center rounded-full bg-[var(--paper)]/90 text-[var(--ink-soft)]"
                    >
                      <Pencil className="size-3" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${upload.name}`}
                      onClick={() => onDelete(upload)}
                      className="grid size-6 place-items-center rounded-full bg-[var(--paper)]/90 text-[var(--red)]"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-[560px] gap-0 overflow-hidden p-0">
          {preview ? (
            <>
              <DialogHeader className="border-b border-[var(--rule)] px-4 py-3">
                <DialogTitle className="font-display text-[1.15rem]">{preview.name}</DialogTitle>
                <DialogDescription className="font-meta text-[0.5rem] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
                  My upload · {preview.category ? categoryText(preview.category) : "Uncategorised"}
                </DialogDescription>
              </DialogHeader>
              <div className="flex max-h-[420px] items-center justify-center bg-[color-mix(in_oklab,var(--ink)_5%,transparent)] p-4">
                {preview.url ? (
                  <img
                    src={preview.url}
                    alt={preview.name}
                    className="max-h-[380px] w-auto max-w-full object-contain"
                  />
                ) : (
                  <ImageOff className="size-6 text-[var(--ink-soft)]" />
                )}
              </div>
              <div className="space-y-2 px-4 py-3">
                {uploadTags(preview).length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {uploadTags(preview).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-[var(--rule)] px-2 py-0.5 font-meta text-[0.46rem] uppercase tracking-[0.06em] text-[var(--ink-soft)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                <p className="text-[0.72rem] leading-5 text-[var(--ink-soft)]">
                  {preview.description || "No description yet. Use Edit to add one."}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      onEdit(preview);
                      setPreview(null);
                    }}
                    className="h-8 flex-1 gap-1.5 rounded-[3px] font-meta text-[0.52rem] uppercase tracking-[0.08em]"
                  >
                    <Pencil className="size-3" /> Edit details
                  </Button>
                  {preview.url ? (
                    <a
                      href={preview.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-8 flex-1 items-center justify-center rounded-[3px] border border-[var(--rule)] font-meta text-[0.52rem] uppercase tracking-[0.08em] text-[var(--ink)] hover:border-[var(--red)]"
                    >
                      Open original
                    </a>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function categoryText(value: string): string {
  const category = LIBRARY_CATEGORY_LOOKUP[value];
  return category ?? value.replace(/-/g, " ");
}

const LIBRARY_CATEGORY_LOOKUP: Record<string, string> = {
  shapes: "Shapes & Geometry",
  botanical: "Botanical & Nature",
  decorative: "Luxury & Decorative",
  editorial: "Editorial Elements",
  icons: "Icons & Symbols",
  frames: "Photo Frames & Masks",
  print: "Print & Craft",
  textures: "Textures & Backgrounds",
};

export type UploadCategory = keyof typeof LIBRARY_CATEGORY_LOOKUP;
