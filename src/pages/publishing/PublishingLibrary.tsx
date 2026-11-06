import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Layers,
  LayoutGrid,
  Loader2,
  Plus,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { DocType } from "@/lib/publishing/model";
import {
  DOCUMENT_PRESETS,
  defaultPresetForDocType,
  presetById,
  type DocumentPreset,
} from "@/lib/publishing/presets";
import { editorHref } from "@/lib/publishing/routes";
import { fromPoints, toPoints, type LengthUnit } from "@/lib/publishing/units";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * The publishing library — the entry point of the workspace.
 *
 * It lists the studio's real publications from Convex and creates new ones
 * from the same eight preset definitions the model uses. Choosing "magazine"
 * is choosing columns, mirrored margins, facing pages and millimetres; the
 * editor then adapts its settings to that document rather than switching to a
 * second implementation.
 */

const DOC_TYPE_LABEL: Record<DocType, string> = {
  album: "Album",
  magazine: "Magazine",
  catalogue: "Catalogue",
  book: "Book",
  brochure: "Brochure",
  portfolio: "Portfolio",
  menu: "Menu",
  custom: "Custom",
};

const DOC_TYPE_BLURB: Record<DocType, string> = {
  album: "Lay-flat photo stories, square and generous.",
  magazine: "Editorial pages with a column grid and mirrored gutters.",
  catalogue: "Product tables, specs and price lists at A4.",
  book: "Long-form text with binding-aware inner margins.",
  brochure: "Folded panels, landscape, single pages.",
  portfolio: "Wide presentation spreads for selected work.",
  menu: "Card stock, trimmed to the edge, one or a few pages.",
  custom: "Any trim size the job needs.",
};

const DOC_TYPES: DocType[] = [
  "album",
  "magazine",
  "catalogue",
  "book",
  "brochure",
  "portfolio",
  "menu",
  "custom",
];

function relativeTime(timestamp: number): string {
  const delta = Date.now() - timestamp;
  const minutes = Math.round(delta / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export default function PublishingLibrary() {
  const navigate = useNavigate();
  const publications = useQuery(api.publishing.publications.listMine, {});
  const createPublication = useMutation(api.publishing.publications.createPublication);

  const [open, setOpen] = useState(false);
  const [docType, setDocType] = useState<DocType>("magazine");
  const [title, setTitle] = useState("");
  const [customWidth, setCustomWidth] = useState("210");
  const [customHeight, setCustomHeight] = useState("297");
  const [customUnit, setCustomUnit] = useState<LengthUnit>("mm");
  const [creating, setCreating] = useState(false);

  const preset: DocumentPreset | undefined = useMemo(
    () => defaultPresetForDocType(docType),
    [docType],
  );

  const resetForm = () => {
    setTitle("");
    setDocType("magazine");
    setCustomWidth("210");
    setCustomHeight("297");
    setCustomUnit("mm");
  };

  async function create() {
    if (!preset) return;
    const trimWidth = Number.parseFloat(customWidth.replace(",", "."));
    const trimHeight = Number.parseFloat(customHeight.replace(",", "."));
    if (preset.requiresSize && (!(trimWidth > 0) || !(trimHeight > 0))) {
      toast.error("A custom publication needs a positive width and height.");
      return;
    }
    setCreating(true);
    try {
      const result = await createPublication({
        presetId: preset.id,
        docType,
        title: title.trim() || `Untitled ${DOC_TYPE_LABEL[docType].toLowerCase()}`,
        trim: preset.requiresSize
          ? {
              width: toPoints(trimWidth, customUnit),
              height: toPoints(trimHeight, customUnit),
            }
          : undefined,
        displayUnit: preset.requiresSize ? customUnit : preset.unit,
      });
      toast.success("Publication created.");
      setOpen(false);
      resetForm();
      navigate(editorHref(result.publicationId));
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "The publication could not be created.",
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <header className="border-b border-[var(--rule)] bg-[var(--paper-light)]">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-baseline gap-3">
            <Link
              to="/dashboard"
              className="font-meta text-[0.55rem] uppercase tracking-[0.18em] text-[var(--ink-soft)] hover:text-[var(--red)]"
            >
              LAMSA Studio
            </Link>
            <span className="h-3 w-px bg-[var(--rule)]" />
            <h1 className="font-display text-[1.35rem] leading-none tracking-[0.01em]">
              Publishing Studio
            </h1>
          </div>
          <Dialog open={open} onOpenChange={(next) => (setOpen(next), next || resetForm())}>
            <DialogTrigger asChild>
              <Button className="h-8 gap-1.5 rounded-[3px] bg-[var(--red)] px-3 font-meta text-[0.58rem] uppercase tracking-[0.1em] text-white hover:bg-[color-mix(in_oklab,var(--red)_88%,black)]">
                <Plus className="size-3.5" /> New publication
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl border-[var(--rule)] bg-[var(--paper-light)]">
              <DialogHeader>
                <DialogTitle className="font-display text-[1.4rem]">
                  Start a publication
                </DialogTitle>
                <DialogDescription className="text-[0.8rem] leading-6 text-[var(--ink-soft)]">
                  The category sets the page size, bleed, margins, grid and whether pages face one
                  another. Everything stays editable afterwards.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-4 gap-1.5">
                  {DOC_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      title={DOC_TYPE_BLURB[type]}
                      onClick={() => setDocType(type)}
                      className={cn(
                        "rounded-[3px] border px-1.5 py-2 text-left transition-colors",
                        docType === type
                          ? "border-[var(--red)] bg-[color-mix(in_oklab,var(--red)_7%,transparent)]"
                          : "border-[var(--rule)] hover:border-[color-mix(in_oklab,var(--ink-soft)_50%,transparent)]",
                      )}
                    >
                      <span className="block font-meta text-[0.58rem] uppercase tracking-[0.08em]">
                        {DOC_TYPE_LABEL[type]}
                      </span>
                      <span className="mt-0.5 block text-[0.6rem] leading-4 text-[var(--ink-soft)]">
                        {presetById(defaultPresetForDocType(type)?.id ?? "")?.facingPages
                          ? "Facing"
                          : "Single"}
                      </span>
                    </button>
                  ))}
                </div>

                <p className="border-l-2 border-[var(--gold)] pl-3 text-[0.74rem] leading-5 text-[var(--ink-soft)]">
                  {preset?.description}
                </p>

                <label className="grid gap-1">
                  <span className="font-meta text-[0.55rem] uppercase tracking-[0.1em] text-[var(--ink-soft)]">
                    Title
                  </span>
                  <Input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={`Untitled ${DOC_TYPE_LABEL[docType].toLowerCase()}`}
                    className="h-8 rounded-[3px] border-[var(--rule)] bg-[var(--paper)] text-[0.82rem] shadow-none"
                  />
                </label>

                {preset?.requiresSize ? (
                  <div className="grid gap-1">
                    <span className="font-meta text-[0.55rem] uppercase tracking-[0.1em] text-[var(--ink-soft)]">
                      Trim size
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Input
                        value={customWidth}
                        onChange={(event) => setCustomWidth(event.target.value)}
                        inputMode="decimal"
                        aria-label="Trim width"
                        className="h-8 rounded-[3px] border-[var(--rule)] bg-[var(--paper)] text-right font-meta text-[0.72rem] shadow-none"
                      />
                      <span className="text-[var(--ink-soft)]">×</span>
                      <Input
                        value={customHeight}
                        onChange={(event) => setCustomHeight(event.target.value)}
                        inputMode="decimal"
                        aria-label="Trim height"
                        className="h-8 rounded-[3px] border-[var(--rule)] bg-[var(--paper)] text-right font-meta text-[0.72rem] shadow-none"
                      />
                      <Select
                        value={customUnit}
                        onValueChange={(value) => setCustomUnit(value as LengthUnit)}
                      >
                        <SelectTrigger className="h-8 w-[74px] rounded-[3px] border-[var(--rule)] bg-[var(--paper)] font-meta text-[0.66rem] shadow-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mm">mm</SelectItem>
                          <SelectItem value="in">in</SelectItem>
                          <SelectItem value="pt">pt</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : preset?.size ? (
                  <p className="font-meta text-[0.6rem] tabular-nums text-[var(--ink-soft)]">
                    Trim {fromPoints(preset.size.width, preset.unit)} ×{" "}
                    {fromPoints(preset.size.height, preset.unit)} {preset.unit} ·{" "}
                    {preset.facingPages ? "facing pages" : "single pages"} ·{" "}
                    {preset.defaultPageCount} pages to start
                  </p>
                ) : null}
              </div>

              <DialogFooter>
                <Button
                  variant="ghost"
                  className="h-8 rounded-[3px] font-meta text-[0.58rem] uppercase tracking-[0.1em]"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => void create()}
                  disabled={creating || !preset}
                  className="h-8 gap-1.5 rounded-[3px] bg-[var(--red)] px-3 font-meta text-[0.58rem] uppercase tracking-[0.1em] text-white hover:bg-[color-mix(in_oklab,var(--red)_88%,black)]"
                >
                  {creating ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  Create & open
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="mx-auto max-w-[1240px] px-6 pb-20 pt-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-meta text-[0.55rem] uppercase tracking-[0.18em] text-[var(--gold)]">
              Phase 3A · Editor shell
            </p>
            <h2 className="mt-1 font-display text-[2rem] leading-tight tracking-[0.01em]">
              Publications
            </h2>
            <p className="mt-1 max-w-2xl text-[0.82rem] leading-6 text-[var(--ink-soft)]">
              One editor for albums, magazines, catalogues, books, brochures, portfolios, menus and
              custom jobs. Pages are real spreads with bleed and margins; objects are real model
              records, saved as you work.
            </p>
          </div>
          <div className="flex items-center gap-4 font-meta text-[0.55rem] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
            <span className="flex items-center gap-1.5">
              <Layers className="size-3.5" /> {publications?.length ?? 0} documents
            </span>
            <span className="hidden items-center gap-1.5 sm:flex">
              <LayoutGrid className="size-3.5" /> Convex persistence
            </span>
          </div>
        </div>

        {publications === undefined ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="h-[178px] animate-pulse rounded-[2px] border border-[var(--rule)] bg-[var(--paper-light)]"
              />
            ))}
          </div>
        ) : publications.length === 0 ? (
          <div className="border border-dashed border-[var(--rule)] bg-[var(--paper-light)] px-8 py-16 text-center">
            <BookOpen className="mx-auto size-6 text-[color-mix(in_oklab,var(--ink-soft)_65%,transparent)]" />
            <h3 className="mt-3 font-display text-[1.35rem]">No publications yet</h3>
            <p className="mx-auto mt-1 max-w-md text-[0.8rem] leading-6 text-[var(--ink-soft)]">
              Start with a magazine for an editorial grid, an album for photography, or a menu for a
              single trimmed card. Each is the same editor underneath.
            </p>
            <Button
              onClick={() => setOpen(true)}
              className="mt-5 h-8 gap-1.5 rounded-[3px] bg-[var(--red)] px-3 font-meta text-[0.58rem] uppercase tracking-[0.1em] text-white hover:bg-[color-mix(in_oklab,var(--red)_88%,black)]"
            >
              <Plus className="size-3.5" /> New publication
            </Button>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {publications.map((publication) => {
              const preset = presetById(publication.presetId);
              const unit = publication.displayUnit as LengthUnit;
              const ratio =
                publication.spec && publication.spec.trim.height > 0
                  ? publication.spec.trim.width / publication.spec.trim.height
                  : 0.77;
              return (
                <li key={publication._id}>
                  <Link
                    to={editorHref(publication._id)}
                    className="group flex h-full flex-col justify-between gap-5 border border-[var(--rule)] bg-[var(--paper-light)] p-4 transition-colors hover:border-[color-mix(in_oklab,var(--red)_55%,var(--rule))]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-meta text-[0.55rem] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                          {DOC_TYPE_LABEL[publication.docType as DocType] ?? publication.docType}
                          {publication.facingPages ? " · facing" : " · single"}
                        </p>
                        <h3 className="mt-1 truncate font-display text-[1.15rem] leading-snug">
                          {publication.title}
                        </h3>
                      </div>
                      <ArrowUpRight className="mt-1 size-4 shrink-0 text-[var(--ink-soft)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--red)]" />
                    </div>

                    <div className="flex items-end justify-between gap-3">
                      <div className="flex items-end gap-2">
                        <span
                          aria-hidden
                          className="block border border-[color-mix(in_oklab,var(--ink)_35%,transparent)] bg-[var(--paper)] shadow-[var(--shadow-soft)]"
                          style={{
                            width: `${Math.round(38 * Math.min(1.6, Math.max(0.55, ratio)))}px`,
                            height: "48px",
                          }}
                        />
                        <dl className="font-meta text-[0.58rem] tabular-nums leading-4 text-[var(--ink-soft)]">
                          <dt className="sr-only">Pages</dt>
                          <dd>{publication.pageCount} pages</dd>
                          <dt className="sr-only">Updated</dt>
                          <dd>{relativeTime(publication.updatedAt)}</dd>
                          <dt className="sr-only">Size</dt>
                          <dd>
                            {publication.spec
                              ? `${fromPoints(publication.spec.trim.width, unit)} × ${fromPoints(
                                  publication.spec.trim.height,
                                  unit,
                                )} ${unit}`
                              : "—"}
                          </dd>
                        </dl>
                      </div>
                      <span className="flex items-center gap-1 font-meta text-[0.55rem] uppercase tracking-[0.12em] text-[var(--ink-soft)] group-hover:text-[var(--red)]">
                        Open <ArrowRight className="size-3" />
                      </span>
                    </div>

                    {preset ? (
                      <p className="line-clamp-2 text-[0.7rem] leading-5 text-[var(--ink-soft)]">
                        {preset.description}
                      </p>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <footer className="border-t border-[var(--rule)] bg-[var(--paper-light)]">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-2 px-6 py-4 font-meta text-[0.55rem] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
          <span>
            {DOCUMENT_PRESETS.length} presets · one document model · one editor
          </span>
          <Link to="/dashboard" className="hover:text-[var(--red)]">
            Back to the studio
          </Link>
        </div>
      </footer>
    </main>
  );
}
