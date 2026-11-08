import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { ArrowDown, ArrowUp, Check, ChevronLeft, Sparkles } from "lucide-react";

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
import { DOCUMENT_PRESETS, presetById } from "@/lib/publishing/presets";
import {
  DEFAULT_ALBUM_CONFIG,
  buildAlbumDocument,
  planAlbum,
  type AlbumConfig,
  type AlbumCoverLayout,
  type AlbumOrientation,
  type AlbumStyle,
} from "@/lib/publishing/smart-album";
import type { PublicationDocument } from "@/lib/publishing/model";
import type { StudioAssetRecord } from "@/hooks/publishing/usePublishingEditor";
import { PageThumb } from "./PageThumb";
import { cn } from "@/lib/utils";

/**
 * Smart Album setup.
 *
 * The preview is the real generated document, rendered with the same page
 * thumbnail the Pages panel uses, so what the user approves is what the new
 * publication will contain. Creation runs through the guarded Convex mutation
 * and opens the new publication in the normal editor.
 */
export interface SmartAlbumDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: PublicationDocument;
  assets: readonly StudioAssetRecord[];
  onCreated: (publicationId: string) => void;
}

const STYLES: { id: AlbumStyle; label: string; note: string }[] = [
  { id: "classic", label: "Classic", note: "Alternating full bleed and margins" },
  { id: "editorial", label: "Editorial", note: "Asymmetric compositions and captions" },
  { id: "mosaic", label: "Mosaic", note: "Denser grids for many photographs" },
  { id: "filmstrip", label: "Filmstrip", note: "One or two frames per page" },
];

const COVERS: { id: AlbumCoverLayout; label: string }[] = [
  { id: "full-bleed", label: "Full bleed" },
  { id: "centred", label: "Centred" },
  { id: "bordered", label: "Bordered" },
  { id: "none", label: "No cover" },
];

export function SmartAlbumDialog({
  open,
  onOpenChange,
  document,
  assets,
  onCreated,
}: SmartAlbumDialogProps) {
  const createFromDocument = useMutation(
    api.publishing.publications.createFromDocument,
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState("Album");
  const [presetId, setPresetId] = useState("album-12x12");
  const [orientation, setOrientation] = useState<AlbumOrientation>("auto");
  const [style, setStyle] = useState<AlbumStyle>("classic");
  const [imagesPerPage, setImagesPerPage] = useState<1 | 2 | 3 | 4>(1);
  const [coverLayout, setCoverLayout] = useState<AlbumCoverLayout>("full-bleed");
  const [spacing, setSpacing] = useState(DEFAULT_ALBUM_CONFIG.spacing);
  const [margin, setMargin] = useState(DEFAULT_ALBUM_CONFIG.margin);
  const [captions, setCaptions] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config: AlbumConfig = useMemo(
    () => ({
      ...DEFAULT_ALBUM_CONFIG,
      title,
      assetIds: selected,
      presetId,
      orientation,
      style,
      imagesPerPage,
      coverLayout,
      spacing,
      margin,
      captions,
    }),
    [
      captions,
      coverLayout,
      imagesPerPage,
      margin,
      orientation,
      presetId,
      selected,
      spacing,
      style,
      title,
    ],
  );

  const preset = presetById(presetId);
  const presetSize = preset?.size ?? document.spec.trim;

  const preview = useMemo(() => {
    if (selected.length === 0) return null;
    const albumAssets = assets.filter((asset) => selected.includes(asset.assetId));
    return buildAlbumDocument(
      config,
      albumAssets.map((asset) => ({
        id: asset.assetId,
        name: asset.filename,
        width: asset.width,
        height: asset.height,
      })),
      albumAssets.map((asset) => ({
        id: asset.assetId,
        name: asset.filename,
        width: asset.width,
        height: asset.height,
        mime: asset.mimeType,
        tags: [...asset.tags],
      })),
      {
        presetSize,
        facingPages: false,
      },
    );
  }, [assets, config, presetSize, selected]);

  const plan = useMemo(() => {
    if (selected.length === 0) return null;
    const albumAssets = assets.filter((asset) => selected.includes(asset.assetId));
    return planAlbum(
      config,
      albumAssets.map((asset) => ({
        id: asset.assetId,
        name: asset.filename,
        width: asset.width,
        height: asset.height,
      })),
      { documentSpec: presetSize, marginPt: margin },
    );
  }, [assets, config, margin, presetSize, selected]);

  const toggle = (assetId: string) => {
    setSelected((current) =>
      current.includes(assetId)
        ? current.filter((id) => id !== assetId)
        : [...current, assetId],
    );
  };

  const move = (assetId: string, direction: -1 | 1) => {
    setSelected((current) => {
      const index = current.indexOf(assetId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  };

  const create = async () => {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      const result = await createFromDocument({
        sourcePublicationId: document.id as Id<"publications">,
        document: preview.document as never,
        title: title.trim() || "Album",
      });
      onCreated(result.publicationId);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The album could not be created.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-auto scroll-slim border-[var(--rule)] bg-[var(--paper)] p-0">
        <DialogHeader className="border-b border-[var(--rule)] px-4 py-3">
          <DialogTitle className="flex items-center gap-2 font-display text-lg text-[var(--ink)]">
            <Sparkles className="size-4 text-[var(--red)]" />
            Smart Album
          </DialogTitle>
          <DialogDescription className="text-[0.75rem] leading-relaxed text-[var(--ink-soft)]">
            Builds a new, fully editable publication from your photographs. Your
            library files are referenced, not copied, and the existing
            publication is never touched.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 px-4 py-3 lg:grid-cols-[1fr_280px]">
          <div className="min-w-0 space-y-3">
            <section>
              <h3 className="font-meta text-[0.5rem] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                Photographs ({selected.length} chosen)
              </h3>
              {assets.length === 0 ? (
                <p className="mt-2 text-[0.75rem] text-[var(--ink-soft)]">
                  This publication has no photographs yet. Upload some in the
                  Assets panel first.
                </p>
              ) : (
                <div className="mt-2 grid max-h-48 grid-cols-4 gap-1.5 overflow-auto scroll-slim sm:grid-cols-6">
                  {assets.map((asset) => {
                    const chosen = selected.includes(asset.assetId);
                    const position = selected.indexOf(asset.assetId);
                    return (
                      <button
                        key={asset.assetId}
                        type="button"
                        onClick={() => toggle(asset.assetId)}
                        title={asset.filename}
                        className={cn(
                          "relative aspect-square overflow-hidden rounded-[2px] border",
                          chosen
                            ? "border-[var(--red)] ring-1 ring-[var(--red)]"
                            : "border-[var(--rule)]",
                        )}
                      >
                        {asset.thumbnailUrl ?? asset.proxyUrl ?? asset.originalUrl ? (
                          <img
                            src={
                              asset.thumbnailUrl ??
                              asset.proxyUrl ??
                              asset.originalUrl ??
                              ""
                            }
                            alt={asset.filename}
                            className="size-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span className="flex size-full items-center justify-center bg-[var(--paper-light)] text-[0.55rem] text-[var(--ink-soft)]">
                            no image
                          </span>
                        )}
                        {chosen ? (
                          <span className="absolute right-0 top-0 flex size-4 items-center justify-center bg-[var(--red)] text-white">
                            <Check className="size-2.5" />
                          </span>
                        ) : null}
                        {chosen && position >= 0 ? (
                          <span className="absolute bottom-0 left-0 bg-black/60 px-1 font-meta text-[0.5rem] text-white">
                            {position + 1}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
              {selected.length > 0 ? (
                <ol className="mt-2 max-h-28 space-y-0.5 overflow-auto scroll-slim">
                  {selected.map((assetId, index) => {
                    const asset = assets.find((entry) => entry.assetId === assetId);
                    return (
                      <li
                        key={assetId}
                        className="flex items-center gap-1 rounded-[2px] px-1 py-0.5 text-[0.7rem] text-[var(--ink)]"
                      >
                        <span className="w-4 font-meta text-[0.5rem] text-[var(--ink-soft)]">
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          {asset?.filename ?? assetId}
                        </span>
                        <button
                          type="button"
                          aria-label="Move earlier"
                          className="text-[var(--ink-soft)] hover:text-[var(--red)]"
                          onClick={() => move(assetId, -1)}
                        >
                          <ArrowUp className="size-3" />
                        </button>
                        <button
                          type="button"
                          aria-label="Move later"
                          className="text-[var(--ink-soft)] hover:text-[var(--red)]"
                          onClick={() => move(assetId, 1)}
                        >
                          <ArrowDown className="size-3" />
                        </button>
                      </li>
                    );
                  })}
                </ol>
              ) : null}
            </section>

            {preview && plan ? (
              <section>
                <h3 className="font-meta text-[0.5rem] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                  Preview · {preview.summary.pages} pages ·{" "}
                  {Math.round(plan.widthPt)} × {Math.round(plan.heightPt)} pt
                </h3>
                <div className="mt-2 flex gap-2 overflow-x-auto scroll-slim pb-1">
                  {preview.document.pages.slice(0, 10).map((page, index) => (
                    <div key={page.id} className="shrink-0">
                      <PageThumb
                        page={page}
                        document={preview.document}
                        className="shadow-[0_0_0_0.5px_color-mix(in_oklab,var(--ink)_22%,transparent)]"
                      />
                      <p className="mt-1 text-center font-meta text-[0.48rem] uppercase tracking-[0.1em] text-[var(--ink-soft)]">
                        {index + 1} · {plan.pages[index]?.pattern.replace(/-/g, " ")}
                      </p>
                    </div>
                  ))}
                  {preview.document.pages.length > 10 ? (
                    <div className="flex w-16 shrink-0 items-center justify-center font-meta text-[0.5rem] text-[var(--ink-soft)]">
                      +{preview.document.pages.length - 10}
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}
          </div>

          <div className="space-y-3">
            <Field label="Album title">
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-7 rounded-[3px] text-[0.78rem]"
              />
            </Field>
            <Field label="Size">
              <select
                value={presetId}
                onChange={(event) => setPresetId(event.target.value)}
                className="h-7 w-full rounded-[3px] border border-[var(--rule)] bg-[var(--paper)] px-1 text-[0.75rem]"
                aria-label="Album size"
              >
                {DOCUMENT_PRESETS.filter((entry) => entry.size).map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Orientation">
              <div className="flex gap-1">
                {(["auto", "portrait", "landscape"] as const).map((value) => (
                  <Choice
                    key={value}
                    active={orientation === value}
                    onClick={() => setOrientation(value)}
                  >
                    {value}
                  </Choice>
                ))}
              </div>
            </Field>
            <Field label="Layout style">
              <div className="grid grid-cols-2 gap-1">
                {STYLES.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setStyle(entry.id)}
                    className={cn(
                      "rounded-[2px] border px-2 py-1 text-left text-[0.66rem] leading-tight",
                      style === entry.id
                        ? "border-[var(--red)] text-[var(--red)]"
                        : "border-[var(--rule)] text-[var(--ink)]",
                    )}
                  >
                    {entry.label}
                    <span className="mt-0.5 block text-[0.56rem] text-[var(--ink-soft)]">
                      {entry.note}
                    </span>
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Images per page">
              <div className="flex gap-1">
                {([1, 2, 3, 4] as const).map((value) => (
                  <Choice
                    key={value}
                    active={imagesPerPage === value}
                    onClick={() => setImagesPerPage(value)}
                  >
                    {value}
                  </Choice>
                ))}
              </div>
            </Field>
            <Field label="Cover">
              <select
                value={coverLayout}
                onChange={(event) =>
                  setCoverLayout(event.target.value as AlbumCoverLayout)
                }
                className="h-7 w-full rounded-[3px] border border-[var(--rule)] bg-[var(--paper)] px-1 text-[0.75rem]"
                aria-label="Cover layout"
              >
                {COVERS.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label={`Spacing ${Math.round(spacing)} pt`}>
                <input
                  type="range"
                  min={0}
                  max={48}
                  step={2}
                  value={spacing}
                  onChange={(event) => setSpacing(Number(event.target.value))}
                  className="w-full"
                  aria-label="Spacing"
                />
              </Field>
              <Field label={`Margin ${Math.round(margin)} pt`}>
                <input
                  type="range"
                  min={0}
                  max={48}
                  step={2}
                  value={margin}
                  onChange={(event) => setMargin(Number(event.target.value))}
                  className="w-full"
                  aria-label="Margin"
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-[0.72rem] text-[var(--ink)]">
              <input
                type="checkbox"
                checked={captions}
                onChange={(event) => setCaptions(event.target.checked)}
              />
              Caption single-image pages
            </label>
          </div>
        </div>

        {error ? (
          <p className="mx-4 mb-2 rounded-[3px] border border-[var(--red)] px-3 py-2 text-[0.72rem] text-[var(--red)]">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-2 border-t border-[var(--rule)] px-4 py-3">
          <p className="text-[0.68rem] leading-relaxed text-[var(--ink-soft)]">
            {selected.length === 0
              ? "Choose at least one photograph."
              : `${preview?.summary.pages ?? 0} pages will be created as a new publication.`}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-[3px] font-meta text-[0.55rem] uppercase tracking-[0.1em]"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-8 gap-1.5 rounded-[3px] font-meta text-[0.55rem] uppercase tracking-[0.12em]"
              disabled={busy || selected.length === 0}
              onClick={() => void create()}
            >
              <ChevronLeft className="size-3.5 rotate-180" />
              {busy ? "Creating…" : "Create album"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-meta text-[0.5rem] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function Choice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded-[2px] border px-1.5 py-1 font-meta text-[0.55rem] uppercase tracking-[0.08em]",
        active
          ? "border-[var(--red)] text-[var(--red)]"
          : "border-[var(--rule)] text-[var(--ink-soft)]",
      )}
    >
      {children}
    </button>
  );
}
