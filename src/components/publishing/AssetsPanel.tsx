import { useMemo, useRef, useState } from "react";
import {
  Check,
  ImageOff,
  ImagePlus,
  Loader2,
  Search,
  TriangleAlert,
  Upload,
} from "lucide-react";

import type { PublicationDocument } from "@/lib/publishing/model";
import { collectAssetReferences } from "@/lib/publishing/persistence";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * The publication's single asset library. It reuses the Phase 2 rows and
 * derivative URLs; it never loads an original just to draw a card. Originals
 * stay reserved for output while the editor reads thumbnails and proxies.
 */

export interface StudioAsset {
  _id: string;
  assetId: string;
  filename: string;
  mimeType: string;
  width: number;
  height: number;
  fileSize: number;
  tags: readonly string[];
  originalUrl: string | null;
  proxyUrl: string | null;
  thumbnailUrl: string | null;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export interface AssetsPanelProps {
  document: PublicationDocument;
  assets: readonly StudioAsset[];
  busy?: boolean;
  uploading?: boolean;
  error?: string;
  /** Name of the selected image frame, which turns Place into Replace. */
  selectedFrameName?: string;
  onPlaceAsset: (asset: StudioAsset) => void;
  onUploadAsset: (file: File) => void;
}

const MIME_LABELS: Record<string, string> = {
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "image/webp": "WebP",
  "image/avif": "AVIF",
  "image/tiff": "TIFF",
};

export function formatAssetBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function assetMimeLabel(asset: StudioAsset): string {
  return MIME_LABELS[asset.mimeType] ?? asset.mimeType.replace("image/", "").toUpperCase();
}

export function AssetsPanel({
  document,
  assets,
  busy,
  uploading,
  error,
  selectedFrameName,
  onPlaceAsset,
  onUploadAsset,
}: AssetsPanelProps) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const usedIds = useMemo(() => collectAssetReferences(document), [document]);
  const missingIds = useMemo(
    () => [...usedIds].filter((id) => !assets.some((asset) => asset.assetId === id)),
    [assets, usedIds],
  );
  const types = useMemo(
    () => [...new Set(assets.map((asset) => asset.mimeType))].sort(),
    [assets],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return assets.filter((asset) => {
      if (typeFilter !== "all" && asset.mimeType !== typeFilter) return false;
      if (!needle) return true;
      return (
        asset.filename.toLowerCase().includes(needle) ||
        asset.tags.some((tag) => tag.toLowerCase().includes(needle))
      );
    });
  }, [assets, query, typeFilter]);

  const selected = assets.find((asset) => asset._id === selectedId) ?? null;
  const selectedUsed = Boolean(selected && usedIds.has(selected.assetId));
  const preview = selected?.thumbnailUrl ?? selected?.proxyUrl ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-[var(--rule)] px-3 py-2">
        <span className="font-meta text-[0.6rem] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
          Assets · {assets.length}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy || uploading}
          onClick={() => fileRef.current?.click()}
          className="h-6 gap-1 rounded-[3px] px-1.5 font-meta text-[0.52rem] uppercase tracking-[0.08em]"
        >
          {uploading ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Upload className="size-3" />
          )}
          Upload
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/tiff"
          className="sr-only"
          aria-label="Upload artwork"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onUploadAsset(file);
          }}
        />
      </div>

      <div className="space-y-1.5 border-b border-[var(--rule)] px-2 py-1.5">
        <label className="flex items-center gap-1.5 rounded-sm border border-[var(--rule)] bg-[var(--paper-light)] px-2">
          <Search className="size-3 text-[var(--ink-soft)]" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search artwork"
            className="h-6 border-0 bg-transparent px-0 text-[0.72rem] shadow-none focus-visible:ring-0"
          />
        </label>
        {types.length > 1 ? (
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-6 rounded-[3px] border-[var(--rule)] bg-[var(--paper-light)] font-meta text-[0.56rem] uppercase tracking-[0.08em] shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All image types</SelectItem>
              {types.map((type) => (
                <SelectItem key={type} value={type}>
                  {MIME_LABELS[type] ?? type.replace("image/", "")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto p-2">
        {error ? (
          <div className="mx-1 mb-2 rounded-sm border border-[color-mix(in_oklab,var(--red)_45%,transparent)] px-2.5 py-2 text-[0.66rem] leading-4 text-[var(--red)]">
            {error}
          </div>
        ) : null}

        {missingIds.length > 0 ? (
          <div className="mx-1 mb-2 rounded-sm border border-[color-mix(in_oklab,var(--gold)_55%,transparent)] bg-[color-mix(in_oklab,var(--gold)_7%,transparent)] px-2.5 py-2">
            <p className="flex items-center gap-1.5 font-meta text-[0.52rem] uppercase tracking-[0.08em] text-[var(--gold)]">
              <TriangleAlert className="size-3" />
              {missingIds.length} missing asset{missingIds.length === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-[0.62rem] leading-4 text-[var(--ink-soft)]">
              A frame still points to artwork that is unavailable. Replace it or restore the
              asset; the frame itself remains editable.
            </p>
          </div>
        ) : null}

        {busy || uploading ? (
          <div className="flex items-center justify-center gap-2 px-2 py-6 font-meta text-[0.58rem] uppercase tracking-[0.1em] text-[var(--ink-soft)]">
            <Loader2 className="size-3 animate-spin" />
            {uploading ? "Preparing artwork" : "Loading assets"}
          </div>
        ) : null}

        {!busy && !uploading && filtered.length === 0 ? (
          <div className="mx-1 mt-2 rounded-sm border border-dashed border-[var(--rule)] px-3 py-6 text-center">
            <ImageOff className="mx-auto size-4 text-[color-mix(in_oklab,var(--ink-soft)_65%,transparent)]" />
            <p className="mt-2 text-[0.72rem] leading-5 text-[var(--ink-soft)]">
              {assets.length === 0
                ? "No artwork yet. Upload a JPEG, PNG, WebP, AVIF or TIFF to start placing images."
                : "No artwork matches that search or type."}
            </p>
            {assets.length === 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 h-6 rounded-[3px] px-2 font-meta text-[0.52rem] uppercase tracking-[0.08em]"
                onClick={() => fileRef.current?.click()}
              >
                <ImagePlus className="mr-1 size-3" />
                Add artwork
              </Button>
            ) : null}
          </div>
        ) : null}

        {!busy && filtered.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((asset) => {
              const src = asset.thumbnailUrl ?? asset.proxyUrl ?? asset.originalUrl;
              const used = usedIds.has(asset.assetId);
              return (
                <button
                  key={asset._id}
                  type="button"
                  draggable={!busy}
                  disabled={busy}
                  title={`${asset.filename} · ${asset.width}×${asset.height} · drag onto an image frame`}
                  aria-pressed={selectedId === asset._id}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("application/x-lamsa-asset", asset.assetId);
                    event.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => setSelectedId(asset._id)}
                  onDoubleClick={() => onPlaceAsset(asset)}
                  className={cn(
                    "group relative overflow-hidden rounded-sm border bg-[var(--paper-light)] text-left transition-colors",
                    selectedId === asset._id
                      ? "border-[var(--red)] ring-1 ring-[var(--red)]"
                      : "border-[var(--rule)] hover:border-[var(--red)]",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                >
                  <span className="block h-[64px] w-full overflow-hidden bg-[color-mix(in_oklab,var(--ink)_6%,transparent)]">
                    {src ? (
                      <img
                        src={src}
                        alt={asset.filename}
                        loading="lazy"
                        draggable={false}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center">
                        <ImageOff className="size-4 text-[var(--ink-soft)]" />
                      </span>
                    )}
                  </span>
                  {used ? (
                    <span
                      title="Used in this publication"
                      className="absolute left-1 top-1 flex items-center gap-0.5 rounded-sm bg-[var(--paper)]/95 px-1 py-0.5 font-meta text-[0.42rem] uppercase tracking-[0.08em] text-[var(--red)]"
                    >
                      <Check className="size-2" />
                      Used
                    </span>
                  ) : null}
                  <span className="block truncate px-1.5 pt-1 text-[0.62rem] text-[var(--ink)]">
                    {asset.filename}
                  </span>
                  <span className="block px-1.5 pb-1 font-meta text-[0.48rem] uppercase tracking-[0.04em] text-[var(--ink-soft)]">
                    {assetMimeLabel(asset)} · {asset.width}×{asset.height}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {selected ? (
        <div className="border-t border-[var(--rule)] bg-[var(--paper-light)] p-2">
          <div className="flex gap-2">
            <span className="h-14 w-16 shrink-0 overflow-hidden rounded-[2px] bg-[color-mix(in_oklab,var(--ink)_6%,transparent)]">
              {preview ? (
                <img
                  src={preview}
                  alt=""
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              ) : (
                <ImageOff className="m-auto size-4 text-[var(--ink-soft)]" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.68rem] font-medium text-[var(--ink)]">
                {selected.filename}
              </p>
              <p className="mt-0.5 font-meta text-[0.52rem] uppercase tracking-[0.06em] text-[var(--ink-soft)]">
                {assetMimeLabel(selected)} · {selected.width}×{selected.height}
              </p>
              <p className="font-meta text-[0.52rem] uppercase tracking-[0.06em] text-[var(--ink-soft)]">
                {formatAssetBytes(selected.fileSize)}
                {selectedUsed ? " · used" : ""}
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => onPlaceAsset(selected)}
            className="mt-2 h-6 w-full gap-1 rounded-[3px] font-meta text-[0.52rem] uppercase tracking-[0.08em]"
          >
            <ImagePlus className="size-3" />
            {selectedFrameName ? `Replace ${selectedFrameName}` : "Place on page"}
          </Button>
          <p className="mt-1 text-center font-meta text-[0.46rem] uppercase tracking-[0.07em] text-[var(--ink-soft)]">
            {selectedFrameName
              ? "The image frame stays in place."
              : "Or drag the card onto an image frame."}
          </p>
        </div>
      ) : null}
    </div>
  );
}
