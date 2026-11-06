import { useMemo, useState } from "react";
import { ImageOff, Search } from "lucide-react";

import type { PublicationDocument } from "@/lib/publishing/model";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * The assets panel, prepared for Phase 3B.
 *
 * Phase 2 stores assets and their variants, so the panel can list real
 * artwork with a real thumbnail today. Placing one creates a genuine
 * image-frame on the active page — that part is already useful. What is not
 * here yet (uploads, derivative selection, crop editing) is named in the
 * report rather than faked with disabled buttons.
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
  createdAt: number;
}

export interface AssetsPanelProps {
  document: PublicationDocument;
  assets: readonly StudioAsset[];
  busy?: boolean;
  onInsertAsset: (asset: StudioAsset) => void;
}

export function AssetsPanel({ assets, busy, onInsertAsset }: AssetsPanelProps) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return assets;
    return assets.filter(
      (asset) =>
        asset.filename.toLowerCase().includes(needle) ||
        asset.tags.some((tag) => tag.toLowerCase().includes(needle)),
    );
  }, [assets, query]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-[var(--rule)] px-3 py-2">
        <span className="font-meta text-[0.6rem] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
          Assets · {assets.length}
        </span>
        <span className="font-meta text-[0.55rem] uppercase tracking-[0.1em] text-[color-mix(in_oklab,var(--ink-soft)_75%,transparent)]">
          Place on page
        </span>
      </div>

      <div className="border-b border-[var(--rule)] px-2 py-1.5">
        <label className="flex items-center gap-1.5 rounded-sm border border-[var(--rule)] bg-[var(--paper-light)] px-2">
          <Search className="size-3 text-[var(--ink-soft)]" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search artwork"
            className="h-6 border-0 bg-transparent px-0 text-[0.72rem] shadow-none focus-visible:ring-0"
          />
        </label>
      </div>

      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <div className="mx-1 mt-2 rounded-sm border border-dashed border-[var(--rule)] px-3 py-6 text-center">
            <ImageOff className="mx-auto size-4 text-[color-mix(in_oklab,var(--ink-soft)_65%,transparent)]" />
            <p className="mt-2 text-[0.72rem] leading-5 text-[var(--ink-soft)]">
              {assets.length === 0
                ? "No artwork yet. Uploads and image derivatives arrive in Phase 3B; the frames this panel places are already stored in the document."
                : "No artwork matches that search."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((asset) => {
              const src = asset.thumbnailUrl ?? asset.proxyUrl ?? asset.originalUrl;
              return (
                <button
                  key={asset._id}
                  type="button"
                  disabled={busy}
                  title={`${asset.filename} · ${asset.width}×${asset.height}`}
                  onClick={() => onInsertAsset(asset)}
                  className={cn(
                    "group overflow-hidden rounded-sm border border-[var(--rule)] bg-[var(--paper-light)] text-left transition-colors",
                    "hover:border-[var(--red)] disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                >
                  <span className="block h-[64px] w-full overflow-hidden bg-[color-mix(in_oklab,var(--ink)_6%,transparent)]">
                    {src ? (
                      <img
                        src={src}
                        alt={asset.filename}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageOff className="m-auto h-full size-4 text-[var(--ink-soft)]" />
                    )}
                  </span>
                  <span className="block truncate px-1.5 py-1 text-[0.62rem] text-[var(--ink)]">
                    {asset.filename}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
