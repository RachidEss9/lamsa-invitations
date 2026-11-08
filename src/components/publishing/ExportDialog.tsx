import { useMemo, useState } from "react";
import { Download, FileText } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  EXPORT_PROFILES,
  defaultExportSettings,
  exportPublicationPdf,
  type ExportResult,
  type ExportSettings,
} from "@/lib/publishing/pdf";
import type { PublicationDocument, TextFrameObject } from "@/lib/publishing/model";
import { rasterizeTextFrame } from "@/lib/publishing/text-raster";
import type { StudioAssetRecord } from "@/hooks/publishing/usePublishingEditor";
import { cn } from "@/lib/utils";

/**
 * PDF export. The dialog never lies about the pipeline: it offers RGB PDF
 * profiles, bleed and crop marks, and repeats the known limitations (no CMYK,
 * no PDF/X, no Arabic embedding with the built-in fonts).
 */
export interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: PublicationDocument;
  assets: readonly StudioAssetRecord[];
  currentPageId: string;
}

type RangeMode = "all" | "current" | "range";

export function ExportDialog({
  open,
  onOpenChange,
  document,
  assets,
  currentPageId,
}: ExportDialogProps) {
  const [settings, setSettings] = useState<ExportSettings>(() =>
    defaultExportSettings("print"),
  );
  const [range, setRange] = useState<RangeMode>("all");
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(Math.max(1, document.pages.length));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExportResult | null>(null);

  const pageIds = useMemo(() => {
    if (range === "current") return [currentPageId];
    if (range === "range") {
      const start = Math.max(1, Math.min(document.pages.length, from));
      const end = Math.max(start, Math.min(document.pages.length, to));
      return document.pages.slice(start - 1, end).map((page) => page.id);
    }
    return document.pages.map((page) => page.id);
  }, [currentPageId, document.pages, from, range, to]);

  const exportPdf = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      if (pageIds.length === 0) throw new Error("Select at least one page.");
      const byAsset = new Map(assets.map((asset) => [asset.assetId, asset]));
      const output = await exportPublicationPdf(document, {
        settings: { ...settings, pageIds },
        loadAsset: async (assetId) => {
          const asset = byAsset.get(assetId);
          const url =
            settings.imageQuality === "proxy"
              ? asset?.proxyUrl ?? asset?.originalUrl
              : asset?.originalUrl ?? asset?.proxyUrl;
          if (!url) return null;
          const response = await fetch(url);
          if (!response.ok) return null;
          const buffer = await response.arrayBuffer();
          return {
            bytes: new Uint8Array(buffer),
            mime: asset?.mimeType ?? response.headers.get("content-type") ?? "image/png",
          };
        },
        // Arabic and other non-Latin frames go through the browser's shaping
        // engine and arrive as transparent images at print resolution.
        rasterTextFrame: (object: TextFrameObject) =>
          rasterizeTextFrame(document, object),
      });
      setResult(output);
      const name = `${(document.title || "publication")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "publication"}.pdf`;
      const url = URL.createObjectURL(output.blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = name;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The PDF could not be generated in this browser.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-auto scroll-slim border-[var(--rule)] bg-[var(--paper)] p-0">
        <DialogHeader className="border-b border-[var(--rule)] px-4 py-3">
          <DialogTitle className="font-display text-lg text-[var(--ink)]">
            Export PDF
          </DialogTitle>
          <DialogDescription className="text-[0.75rem] leading-relaxed text-[var(--ink-soft)]">
            Vector pages: shapes and lines stay vector, photographs are
            embedded from the original files with their crop applied, and
            Latin-only frames stay selectable. Frames containing Arabic or other
            non-Latin text are preserved as high-resolution images instead of being
            omitted, so that text cannot be selected or searched.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-4 py-3">
          <section>
            <h3 className="font-meta text-[0.5rem] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
              Profile
            </h3>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {EXPORT_PROFILES.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() =>
                    setSettings((current) => ({
                      ...current,
                      profile: profile.id,
                      ...profile.settings,
                    }))
                  }
                  className={cn(
                    "rounded-[3px] border px-3 py-2 text-left",
                    settings.profile === profile.id
                      ? "border-[var(--red)] bg-[color-mix(in_oklab,var(--red)_5%,transparent)]"
                      : "border-[var(--rule)] hover:border-[var(--ink-soft)]",
                  )}
                >
                  <span className="block text-[0.78rem] text-[var(--ink)]">
                    {profile.name}
                  </span>
                  <span className="mt-0.5 block text-[0.68rem] leading-snug text-[var(--ink-soft)]">
                    {profile.description}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-meta text-[0.5rem] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
              Pages
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {(
                [
                  ["all", `All pages (${document.pages.length})`],
                  ["current", "Current page"],
                  ["range", "Page range"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRange(value)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 font-meta text-[0.52rem] uppercase tracking-[0.1em]",
                    range === value
                      ? "border-[var(--red)] text-[var(--red)]"
                      : "border-[var(--rule)] text-[var(--ink-soft)]",
                  )}
                >
                  {label}
                </button>
              ))}
              {range === "range" ? (
                <span className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={1}
                    max={document.pages.length}
                    value={from}
                    onChange={(event) => setFrom(Number(event.target.value) || 1)}
                    aria-label="First page"
                    className="h-7 w-16 rounded-[3px] text-[0.75rem]"
                  />
                  <span className="text-[0.7rem] text-[var(--ink-soft)]">to</span>
                  <Input
                    type="number"
                    min={1}
                    max={document.pages.length}
                    value={to}
                    onChange={(event) => setTo(Number(event.target.value) || 1)}
                    aria-label="Last page"
                    className="h-7 w-16 rounded-[3px] text-[0.75rem]"
                  />
                </span>
              ) : null}
            </div>
          </section>

          <section className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-[0.75rem] text-[var(--ink)]">
              <input
                type="checkbox"
                checked={settings.includeBleed}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    includeBleed: event.target.checked,
                  }))
                }
              />
              Include bleed in the media box
            </label>
            <label className="flex items-center gap-2 text-[0.75rem] text-[var(--ink)]">
              <input
                type="checkbox"
                checked={settings.cropMarks}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    cropMarks: event.target.checked,
                  }))
                }
              />
              Draw crop marks
            </label>
            <label className="flex items-center gap-2 text-[0.75rem] text-[var(--ink)]">
              <input
                type="checkbox"
                checked={settings.includeMasters}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    includeMasters: event.target.checked,
                  }))
                }
              />
              Include master pages
            </label>
            <label className="flex items-center gap-2 text-[0.75rem] text-[var(--ink)]">
              Images
              <select
                value={settings.imageQuality}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    imageQuality: event.target.value as "original" | "proxy",
                  }))
                }
                className="h-7 rounded-[3px] border border-[var(--rule)] bg-[var(--paper)] px-1 text-[0.72rem]"
                aria-label="Image quality"
              >
                <option value="original">Original files</option>
                <option value="proxy">Proxy files</option>
              </select>
            </label>
          </section>

          <p className="rounded-[3px] border border-[var(--rule)] bg-[var(--paper-light)] px-3 py-2 text-[0.68rem] leading-relaxed text-[var(--ink-soft)]">Stated plainly: the file is RGB with no colour management (no CMYK or PDF/X claim); Arabic and other non-Latin frames are images, so their text cannot be selected or searched; rounded shape corners print square.
          </p>

          {error ? (
            <p className="rounded-[3px] border border-[var(--red)] px-3 py-2 text-[0.72rem] text-[var(--red)]">
              {error}
            </p>
          ) : null}

          {result ? (
            <div
              data-export-result
              className="space-y-1 rounded-[3px] border border-[var(--olive,#6b7150)] px-3 py-2 text-[0.72rem] text-[var(--ink)]"
            >
              <p className="flex items-center gap-1.5">
                <FileText className="size-3.5" />
                PDF written: {result.pages.length} page
                {result.pages.length === 1 ? "" : "s"},{" "}
                {Math.round(result.bytes.length / 1024)} KB
              </p>
              <p className="text-[0.68rem] text-[var(--ink-soft)]">
                {result.pages[0]
                  ? `First page ${result.pages[0].widthPt} × ${result.pages[0].heightPt} pt`
                  : "No pages"}
                {" · "}
                {result.stats.images} image{result.stats.images === 1 ? "" : "s"},{" "}
                {result.stats.shapes} vector shape
                {result.stats.shapes === 1 ? "" : "s"}, {result.stats.textFrames}{" "}
                text frame{result.stats.textFrames === 1 ? "" : "s"}
                {result.stats.rasterTextFrames > 0
                  ? ` (${result.stats.rasterTextFrames} preserved as ${
                      result.stats.rasterTextFrames === 1 ? "an image" : "images"
                    }, not selectable)`
                  : ""}
              </p>
              {result.warnings.map((warning) => (
                <p key={warning} className="text-[0.68rem] text-[var(--red)]">
                  {warning}
                </p>
              ))}
              {result.missingImages.length > 0 ? (
                <p className="text-[0.68rem] text-[var(--red)]">
                  {result.missingImages.length} photograph
                  {result.missingImages.length === 1 ? "" : "s"} could not be
                  embedded.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-[var(--rule)] px-4 py-3">
          <span className="font-meta text-[0.5rem] uppercase tracking-[0.1em] text-[var(--ink-soft)]">
            {pageIds.length} page{pageIds.length === 1 ? "" : "s"} selected
          </span>
          <Button
            type="button"
            className="h-8 gap-1.5 rounded-[3px] font-meta text-[0.55rem] uppercase tracking-[0.12em]"
            disabled={busy}
            onClick={() => void exportPdf()}
          >
            <Download className="size-3.5" />
            {busy ? "Composing PDF…" : "Export PDF"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
