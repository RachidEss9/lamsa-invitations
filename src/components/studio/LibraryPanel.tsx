import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { InvitationCanvas } from "@/components/invitation/InvitationCanvas";
import { DesignPageView, DesignStage } from "@/components/invitation/DesignPageView";
import { Motif } from "@/components/invitation/Motif";
import { OpeningStage } from "@/components/invitation/OpeningStage";
import {
  BUILTIN_ASSETS,
  BUILTIN_ASSET_CATEGORIES,
  type BuiltinAsset,
} from "@/lib/assets";
import { PAGE_LAYOUTS } from "@/lib/layouts";
import { REVEAL_PRESETS, type RevealPreset } from "@/lib/reveals";
import { BUILTIN_STYLES, type BuiltinStyle } from "@/lib/styles";
import { FONT_LIBRARY, fontById, fontFamilyFor } from "@/lib/fonts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ANIMATION_PRESETS,
  OPENING_EXPERIENCES,
  createDefaultDesign,
  isDesignDocument,
  normalizeDesign,
  type DesignDocument,
  type ElementAnimation,
  type OpeningSettings,
  type StylePreset,
} from "@/lib/design";
import {
  TEMPLATES,
  draftFromTemplate,
  type InvitationContent,
} from "@/lib/invitation";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  Archive,
  ArchiveRestore,
  Copy,
  Film,
  ImagePlus,
  LayoutTemplate,
  Loader2,
  Pencil,
  Play,
  Plus,
  Sparkles,
  Trash2,
  Type,
  X,
} from "lucide-react";
import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { toast } from "sonner";

type LibraryKind = "template" | "opening" | "animation" | "asset" | "style";

interface SavedItem {
  _id: Id<"libraryItems">;
  kind: LibraryKind;
  name: string;
  category?: string;
  description?: string;
  payload: unknown;
  storageId?: Id<"_storage">;
  url?: string | null;
  imageUrls?: Record<string, string>;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
}

interface LibraryPanelProps {
  open: boolean;
  onClose: () => void;
  content: InvitationContent;
  design: DesignDocument;
  selectedIds: string[];
  selectedAnimations: ElementAnimation[];
  onApplyTemplate: (design: DesignDocument, name: string) => void;
  onApplyOpening: (opening: OpeningSettings) => void;
  onApplyAnimation: (animation: ElementAnimation) => void;
  onApplyStyle: (style: StylePreset) => void;
  onPlaceAsset: (storageId: string, name: string, url?: string | null) => void;
  onAddPageLayout: (layoutId: string) => void;
  onApplyBuiltinAsset: (asset: BuiltinAsset) => void;
  onAddRevealPreset: (preset: RevealPreset) => void;
}

const TABS: { id: LibraryKind; label: string; icon: typeof Type }[] = [
  { id: "template", label: "Templates", icon: LayoutTemplate },
  { id: "opening", label: "Openings", icon: Film },
  { id: "animation", label: "Motion", icon: Play },
  { id: "asset", label: "Assets", icon: ImagePlus },
  { id: "style", label: "Styles", icon: Type },
];

function ShapePreview({
  shape,
  fill,
  stroke,
}: {
  shape: string;
  fill: string;
  stroke?: string;
}) {
  const paths: Record<string, string> = {
    heart:
      "M50 89 C22 69 4 52 4 34 C4 18 16 8 30 8 C40 8 47 14 50 22 C53 14 60 8 70 8 C84 8 96 18 96 34 C96 52 78 69 50 89Z",
    arch: "M6 97 L6 47 C6 23 26 4 50 4 C74 4 94 23 94 47 L94 97 Z",
    leaf: "M50 3 C84 20 95 55 50 97 C5 55 16 20 50 3 Z",
    star:
      "M50 3 L61.8 36.5 L97 38.2 L69.3 59.8 L78.5 94 L50 74.2 L21.5 94 L30.7 59.8 L3 38.2 L38.2 36.5 Z",
  };
  if (shape === "line") {
    return <span className="block h-[2px] w-3/4" style={{ background: fill }} />;
  }
  if (shape === "rect" || shape === "frame") {
    return (
      <span
        className="block h-3/4 w-2/3"
        style={{ border: `1.5px solid ${stroke ?? fill}`, background: shape === "frame" ? "transparent" : fill }}
      />
    );
  }
  if (shape === "ellipse") {
    return (
      <span
        className="block size-3/4 rounded-full"
        style={{ border: stroke ? `1.5px solid ${stroke}` : undefined, background: fill }}
      />
    );
  }
  return (
    <svg viewBox="0 0 100 100" className="h-3/4 w-3/4" aria-hidden>
      <path d={paths[shape]} fill={fill} />
    </svg>
  );
}

function AssetThumb({ asset, content }: { asset: BuiltinAsset; content: InvitationContent }) {
  const accent = content.palette.accent;
  const ink = content.palette.ink;
  const paper = content.palette.background;
  if (asset.preview.type === "background") {
    return <span className="block h-full w-full" style={{ background: asset.background }} />;
  }
  if (asset.preview.type === "motif") {
    return (
      <span className="grid h-full w-full place-items-center" style={{ color: accent }}>
        <Motif id={asset.preview.motif} className="h-3/4 w-3/4" strokeWidth={0.9} />
      </span>
    );
  }
  if (asset.preview.type === "shape") {
    return (
      <span className="grid h-full w-full place-items-center">
        <ShapePreview
          shape={asset.preview.shape}
          fill={accent}
          stroke={asset.preview.shape === "frame" ? accent : undefined}
        />
      </span>
    );
  }
  const first = asset.elements?.find((element) => element.kind === "shape");
  const secondary = asset.elements?.find((element) => element.kind === "motif");
  return (
    <span className="relative grid h-full w-full place-items-center">
      {first && (
        <ShapePreview
          shape={first.shape ?? "ellipse"}
          fill={
            first.fill ??
            (first.fillToken === "ink" ? ink : first.fillToken === "paper" ? paper : accent)
          }
          stroke={
            first.stroke ??
            (first.strokeToken === "accent" ? accent : first.strokeToken === "ink" ? ink : undefined)
          }
        />
      )}
      {secondary && (
        <span className="absolute inset-0 grid place-items-center" style={{ color: paper }}>
          <Motif id={secondary.motif ?? "star"} className="h-1/3 w-1/3" strokeWidth={1.2} />
        </span>
      )}
    </span>
  );
}

function LibrarySection({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-ink/12 px-5 py-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-meta text-[9px] uppercase tracking-[0.2em] text-ink/45">
          {title}
        </p>
        {action}
      </div>
      {children}
    </section>
  );
}

function ItemNameEditor({
  value,
  onSave,
  onCancel,
}: {
  value: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(value);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (name.trim()) onSave(name.trim());
      }}
      className="flex items-center gap-1"
    >
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        autoFocus
        className="h-7 rounded-none text-[11px]"
      />
      <button type="submit" className="text-[10px] uppercase tracking-[0.1em] text-[var(--red)]">
        Save
      </button>
      <button type="button" onClick={onCancel} className="text-ink/40">
        <X className="size-3" />
      </button>
    </form>
  );
}

function SavedActions({
  item,
  onRename,
  onDuplicate,
  onArchive,
  onDelete,
}: {
  item: SavedItem;
  onRename: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="mt-2 flex items-center gap-1.5">
      <button type="button" onClick={onRename} className="border border-ink/15 p-1 text-ink/55 hover:border-ink hover:text-ink" title="Rename">
        <Pencil className="size-3" />
      </button>
      <button type="button" onClick={onDuplicate} className="border border-ink/15 p-1 text-ink/55 hover:border-ink hover:text-ink" title="Duplicate">
        <Copy className="size-3" />
      </button>
      <button type="button" onClick={onArchive} className="border border-ink/15 p-1 text-ink/55 hover:border-ink hover:text-ink" title={item.archived ? "Restore" : "Archive"}>
        {item.archived ? <ArchiveRestore className="size-3" /> : <Archive className="size-3" />}
      </button>
      <button type="button" onClick={onDelete} className="ml-auto border border-ink/15 p-1 text-ink/55 hover:border-[var(--red)] hover:text-[var(--red)]" title="Delete">
        <Trash2 className="size-3" />
      </button>
    </div>
  );
}

export function LibraryPanel({
  open,
  onClose,
  content,
  design,
  selectedIds,
  selectedAnimations,
  onApplyTemplate,
  onApplyOpening,
  onApplyAnimation,
  onApplyStyle,
  onPlaceAsset,
  onAddPageLayout,
  onApplyBuiltinAsset,
  onAddRevealPreset,
}: LibraryPanelProps) {
  const items = useQuery(api.library.listMine, {}) as SavedItem[] | undefined;
  const createItem = useMutation(api.library.create);
  const updateItem = useMutation(api.library.update);
  const duplicateItem = useMutation(api.library.duplicate);
  const removeItem = useMutation(api.library.remove);
  const generateUploadUrl = useMutation(api.library.generateUploadUrl);

  const [tab, setTab] = useState<LibraryKind>("template");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<"curated" | "az">("curated");
  const [showArchived, setShowArchived] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SavedItem | null>(null);
  const [openingPreview, setOpeningPreview] = useState<OpeningSettings | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [styleName, setStyleName] = useState("");
  const [styleFont, setStyleFont] = useState<StylePreset["fontPair"]>(
    fontById(content.fontPair).id,
  );
  const fileRef = useRef<HTMLInputElement | null>(null);

  const saved = useMemo(
    () => (items ?? []).filter((item) => item.kind === tab),
    [items, tab],
  );
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = saved.filter((item) => {
      if (!showArchived && item.archived) return false;
      if (showArchived && !item.archived) return false;
      if (category !== "all" && (item.category ?? "") !== category) return false;
      if (!query) return true;
      return `${item.name} ${item.category ?? ""} ${item.description ?? ""}`
        .toLowerCase()
        .includes(query);
    });
    return sort === "az" ? [...list].sort((a, b) => a.name.localeCompare(b.name)) : list;
  }, [category, saved, search, showArchived, sort]);

  const categories = useMemo(
    () =>
      [...new Set(saved.map((item) => item.category).filter(Boolean))] as string[],
    [saved],
  );

  const builtInTemplates = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = TEMPLATES.filter((template) => {
      if (
        category !== "all" &&
        template.occasion !== category &&
        template.style !== category
      ) {
        return false;
      }
      if (!query) return true;
      return `${template.name} ${template.description} ${template.occasion} ${template.style ?? ""}`
        .toLowerCase()
        .includes(query);
    });
    return sort === "az" ? [...list].sort((a, b) => a.name.localeCompare(b.name)) : list;
  }, [category, search, sort]);

  const builtInLayouts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = PAGE_LAYOUTS.filter((layout) =>
      !query
        ? true
        : `${layout.name} ${layout.category} ${layout.note}`.toLowerCase().includes(query),
    );
    return sort === "az" ? [...list].sort((a, b) => a.name.localeCompare(b.name)) : list;
  }, [search, sort]);

  const builtInAssets = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = BUILTIN_ASSETS.filter((asset) => {
      if (category !== "all" && asset.category !== category) return false;
      if (!query) return true;
      return `${asset.name} ${asset.category} ${asset.note}`.toLowerCase().includes(query);
    });
    return sort === "az" ? [...list].sort((a, b) => a.name.localeCompare(b.name)) : list;
  }, [category, search, sort]);

  const layoutPreviews = useMemo(
    () => builtInLayouts.map((layout) => ({ layout, page: layout.build(content) })),
    [builtInLayouts, content],
  );

  const saveRecord = async (
    kind: LibraryKind,
    name: string,
    payload: unknown,
    description?: string,
  ) => {
    if (!name.trim()) {
      toast.error("Give this item a name first.");
      return;
    }
    setSaving(true);
    try {
      await createItem({
        kind,
        name: name.trim(),
        payload,
        description,
      });
      toast.success("Saved to your library.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this item.");
    } finally {
      setSaving(false);
    }
  };

  const handleAssetUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      toast.error("Choose a PNG, JPG, WebP, or GIF image.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Choose an image under 8 MB.");
      return;
    }
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl({});
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error(`Upload failed (${response.status}).`);
      const result = (await response.json()) as { storageId: Id<"_storage"> };
      await createItem({
        kind: "asset",
        name: file.name.replace(/\.[^.]+$/, "").slice(0, 80) || "Asset",
        payload: { fileName: file.name, mime: file.type, size: file.size },
        storageId: result.storageId,
      });
      toast.success("Asset uploaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
        <DialogContent className="max-w-[1040px] gap-0 overflow-hidden p-0 sm:max-h-[86vh]">
          <DialogHeader className="border-b border-ink/12 px-5 py-4">
            <DialogTitle className="font-display text-xl">Creative library</DialogTitle>
            <DialogDescription className="text-[11px] text-ink/50">
              Built-in pieces and your own saved records, applied directly to this
              invitation without leaving the canvas.
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-col sm:flex-row" style={{ maxHeight: "calc(86vh - 84px)" }}>
            <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-ink/12 p-2 sm:w-[150px] sm:flex-col sm:border-b-0 sm:border-r sm:p-3">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setTab(id);
                    setSearch("");
                    setCategory("all");
                    setShowArchived(false);
                  }}
                  className={cn(
                    "flex shrink-0 items-center gap-2 px-2.5 py-2 text-left text-[11px] transition-colors",
                    tab === id
                      ? "bg-ink text-[#f2f1ed]"
                      : "text-ink/60 hover:bg-ink/5 hover:text-ink",
                  )}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              ))}
              <div className="mt-auto hidden pt-4 sm:block">
                <p className="font-meta text-[8px] uppercase leading-relaxed tracking-[0.1em] text-ink/35">
                  {saved.length} saved
                  <br />
                  {items?.length ?? 0} total records
                </p>
              </div>
            </nav>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="flex flex-wrap items-center gap-2 border-b border-ink/12 px-4 py-2.5">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={`Search ${tab}s…`}
                  className="h-8 max-w-[220px] rounded-none text-[11px]"
                />
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-8 w-[150px] rounded-none text-[11px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {tab === "template" &&
                      [
                        ...new Set(
                          TEMPLATES.flatMap((template) => [
                            template.occasion,
                            ...(template.style ? [template.style] : []),
                          ]),
                        ),
                      ].map((value) => (
                        <SelectItem key={value} value={value}>
                          {value[0].toUpperCase() + value.slice(1)}
                        </SelectItem>
                      ))}
                    {tab === "asset" &&
                      BUILTIN_ASSET_CATEGORIES.map((value) => (
                        <SelectItem key={value} value={value}>{value}</SelectItem>
                      ))}
                    {categories.map((value) => (
                      <SelectItem key={value} value={value}>{value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sort} onValueChange={(value) => setSort(value as "curated" | "az")}>
                  <SelectTrigger className="h-8 w-[112px] rounded-none text-[11px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="curated">Curated</SelectItem>
                    <SelectItem value="az">Name A–Z</SelectItem>
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  onClick={() => setShowArchived((value) => !value)}
                  className={cn(
                    "h-8 border px-2 text-[9px] uppercase tracking-[0.12em]",
                    showArchived
                      ? "border-ink bg-ink text-[#f2f1ed]"
                      : "border-ink/20 text-ink/55 hover:border-ink",
                  )}
                >
                  Archived
                </button>
                <span className="ml-auto font-meta text-[9px] uppercase tracking-[0.1em] text-ink/35">
                  {tab === "template"
                    ? `${builtInTemplates.length} templates · ${builtInLayouts.length} layouts`
                    : tab === "asset"
                      ? `${builtInAssets.length} built-in · ${filtered.length} saved`
                      : tab === "animation"
                        ? `${ANIMATION_PRESETS.length - 1} presets · ${REVEAL_PRESETS.length} reveals`
                        : tab === "opening"
                          ? `${OPENING_EXPERIENCES.length} openings`
                          : `${BUILTIN_STYLES.length} styles · ${filtered.length} saved`}
                </span>
              </div>

              {tab === "template" && (
                <>
                  <LibrarySection title="Saved templates">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Input
                        value={templateName}
                        onChange={(event) => setTemplateName(event.target.value)}
                        placeholder="Name this template"
                        className="h-8 max-w-[220px] rounded-none text-[11px]"
                      />
                      <Button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          void saveRecord(
                            "template",
                            templateName || `${design.pages[0]?.name ?? "Untitled"} template`,
                            { design },
                            "Saved from the canvas studio",
                          )
                        }
                        className="h-8 rounded-none text-[10px] uppercase tracking-[0.12em]"
                      >
                        {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                        Save current design
                      </Button>
                      <span className="font-meta text-[9px] uppercase tracking-[0.1em] text-ink/30">
                        Creates a reusable copy
                      </span>
                    </div>
                    {filtered.length === 0 ? (
                      <div className="border border-dashed border-ink/20 p-4">
                        <p className="text-[11px] leading-relaxed text-ink/50">
                          No saved templates yet. Save the current canvas to reuse it
                          on another invitation without altering this one.
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {filtered.map((item) => {
                          const payload = item.payload as { design?: unknown };
                          const templateDesign = payload?.design;
                          return (
                            <div key={item._id} className="border border-ink/15 bg-[var(--paper-light)] p-2">
                              <div className="relative overflow-hidden border border-ink/10 bg-[#f2f1ed]">
                                {isDesignDocument(templateDesign) ? (
                                  <DesignStage>
                                    {() => (
                                      <DesignPageView
                                        page={normalizeDesign(templateDesign, content).pages[0]}
                                        time={100000}
                                        imageUrls={item.imageUrls ?? {}}
                                        guestName="Guest"
                                      />
                                    )}
                                  </DesignStage>
                                ) : (
                                  <div className="grid aspect-[3/4] place-items-center text-[10px] text-ink/40">
                                    No preview
                                  </div>
                                )}
                              </div>
                              <p className="mt-2 truncate font-display text-[14px]">{item.name}</p>
                              <p className="text-[9px] uppercase tracking-[0.1em] text-ink/35">
                                Saved · {item.archived ? "Archived" : "Ready"}
                              </p>
                              {editingId === item._id ? (
                                <ItemNameEditor
                                  value={item.name}
                                  onSave={(name) => {
                                    void updateItem({ id: item._id, name });
                                    setEditingId(null);
                                  }}
                                  onCancel={() => setEditingId(null)}
                                />
                              ) : null}
                              <div className="mt-2 flex gap-1">
                                <Button
                                  type="button"
                                  className="h-7 flex-1 rounded-none text-[9px] uppercase tracking-[0.1em]"
                                  onClick={() =>
                                    isDesignDocument(templateDesign) &&
                                    onApplyTemplate(
                                      normalizeDesign(templateDesign, content),
                                      item.name,
                                    )
                                  }
                                >
                                  Apply
                                </Button>
                              </div>
                              <SavedActions
                                item={item}
                                onRename={() => setEditingId(item._id)}
                                onDuplicate={() => void duplicateItem({ id: item._id })}
                                onArchive={() =>
                                  void updateItem({ id: item._id, archived: !item.archived })
                                }
                                onDelete={() => setPendingDelete(item)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </LibrarySection>

                  <LibrarySection title="Page & section layouts">
                    <p className="mb-3 text-[10px] leading-relaxed text-ink/45">
                      Each layout adds a new editable page with real type, rules, ornaments,
                      and placeholders. Nothing on the page is a static image.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {layoutPreviews.map(({ layout, page }) => (
                        <div
                          key={layout.id}
                          className="group border border-ink/15 p-2 transition-colors hover:border-ink"
                        >
                          <DesignStage>
                            {() => (
                              <DesignPageView
                                page={page}
                                time={100000}
                                imageUrls={{}}
                                ignoreExit
                              />
                            )}
                          </DesignStage>
                          <p className="mt-2 font-display text-[14px] leading-tight">
                            {layout.name}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-[9px] leading-relaxed text-ink/40">
                            {layout.note}
                          </p>
                          <Button
                            type="button"
                            className="mt-2 h-7 w-full rounded-none text-[9px] uppercase tracking-[0.1em]"
                            onClick={() => onAddPageLayout(layout.id)}
                          >
                            <Plus className="size-3" /> Add page
                          </Button>
                        </div>
                      ))}
                    </div>
                    {layoutPreviews.length === 0 && (
                      <p className="text-[11px] text-ink/45">No layouts match this search.</p>
                    )}
                  </LibrarySection>

                  <LibrarySection title="Built-in templates">
                    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {builtInTemplates.map((template) => {
                        const draft = draftFromTemplate(template.id);
                        return (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => {
                              const next = createDefaultDesign(draft);
                              onApplyTemplate(next, template.name);
                            }}
                            className="group border border-ink/15 p-2 text-left transition-colors hover:border-ink"
                          >
                            <div className="editorial-shadow overflow-hidden">
                              <InvitationCanvas content={draft} />
                            </div>
                            <p className="mt-2 font-display text-[14px] leading-tight group-hover:text-[var(--red)]">
                              {template.name}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-[9px] leading-relaxed text-ink/40">
                              {template.description}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </LibrarySection>
                </>
              )}

              {tab === "opening" && (
                <>
                  <LibrarySection title="Current opening">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[11px] text-ink/60">
                        {OPENING_EXPERIENCES.find(
                          (experience) => experience.id === design.opening.experience,
                        )?.label ?? "No opening"}
                        {" · "}
                        {(design.opening.duration / 1000).toFixed(1)}s
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 rounded-none text-[10px]"
                        onClick={() => {
                          setOpeningPreview(design.opening);
                          setPreviewKey((key) => key + 1);
                        }}
                      >
                        <Play className="size-3.5" /> Preview
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 rounded-none text-[10px]"
                        disabled={saving}
                        onClick={() =>
                          void saveRecord(
                            "opening",
                            `${OPENING_EXPERIENCES.find((experience) => experience.id === design.opening.experience)?.label ?? "Opening"} preset`,
                            design.opening,
                            "Saved opening experience",
                          )
                        }
                      >
                        <Plus className="size-3.5" /> Save preset
                      </Button>
                    </div>
                  </LibrarySection>

                  <LibrarySection title="Built-in experiences">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {OPENING_EXPERIENCES.map((experience) => (
                        <div
                          key={experience.id}
                          className={cn(
                            "flex items-start gap-3 border p-3",
                            design.opening.experience === experience.id
                              ? "border-[var(--red)] bg-[var(--red)]/5"
                              : "border-ink/15",
                          )}
                        >
                          <Sparkles className="mt-0.5 size-3.5 shrink-0 text-[var(--red)]" />
                          <div className="min-w-0 flex-1">
                            <p className="font-display text-[15px] leading-tight">{experience.label}</p>
                            <p className="mt-0.5 text-[10px] leading-relaxed text-ink/45">{experience.note}</p>
                            <div className="mt-2 flex gap-1.5">
                              <Button
                                type="button"
                                className="h-7 rounded-none text-[9px] uppercase tracking-[0.1em]"
                                onClick={() => {
                                  onApplyOpening({ ...design.opening, experience: experience.id });
                                  setOpeningPreview({ ...design.opening, experience: experience.id });
                                  setPreviewKey((key) => key + 1);
                                }}
                              >
                                Use
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="h-7 rounded-none text-[9px] uppercase tracking-[0.1em]"
                                onClick={() => {
                                  setOpeningPreview({ ...design.opening, experience: experience.id });
                                  setPreviewKey((key) => key + 1);
                                }}
                              >
                                Preview
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </LibrarySection>

                  <LibrarySection title="Saved openings">
                    {filtered.length === 0 ? (
                      <p className="text-[11px] text-ink/45">No saved opening presets yet.</p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {filtered.map((item) => {
                          const opening = item.payload as OpeningSettings;
                          return (
                            <div key={item._id} className="border border-ink/15 p-3">
                              <p className="font-display text-[15px]">{item.name}</p>
                              <p className="text-[9px] uppercase tracking-[0.1em] text-ink/40">
                                {opening?.experience ?? "none"} · {((opening?.duration ?? 0) / 1000).toFixed(1)}s
                              </p>
                              <div className="mt-2 flex gap-1.5">
                                <Button
                                  type="button"
                                  className="h-7 rounded-none text-[9px] uppercase tracking-[0.1em]"
                                  onClick={() => onApplyOpening({ ...design.opening, ...opening })}
                                >
                                  Apply
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-7 rounded-none text-[9px] uppercase tracking-[0.1em]"
                                  onClick={() => {
                                    setOpeningPreview({ ...design.opening, ...opening });
                                    setPreviewKey((key) => key + 1);
                                  }}
                                >
                                  Preview
                                </Button>
                              </div>
                              <SavedActions
                                item={item}
                                onRename={() => setEditingId(item._id)}
                                onDuplicate={() => void duplicateItem({ id: item._id })}
                                onArchive={() => void updateItem({ id: item._id, archived: !item.archived })}
                                onDelete={() => setPendingDelete(item)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </LibrarySection>
                </>
              )}

              {tab === "animation" && (
                <>
                  <LibrarySection title="Apply to selection">
                    <p className="text-[11px] leading-relaxed text-ink/50">
                      {selectedIds.length === 0
                        ? "Select one or more layers on the canvas, then choose a preset."
                        : `${selectedIds.length} layer${selectedIds.length === 1 ? "" : "s"} selected.`}
                    </p>
                    <div className="mt-3 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                      {ANIMATION_PRESETS.filter((preset) => preset.id !== "none").map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          disabled={selectedAnimations.length === 0}
                          onClick={() => {
                            const source = selectedAnimations[0];
                            if (!source) return;
                            onApplyAnimation({
                              ...source,
                              preset: preset.id,
                              enabled: true,
                            });
                          }}
                          className="border border-ink/15 p-2 text-left transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <p className="text-[11px] font-medium">
                            {preset.label}
                            <span className="ml-1.5 text-[8px] uppercase tracking-[0.1em] text-ink/30">
                              {preset.group}
                            </span>
                          </p>
                          <p className="text-[9px] leading-snug text-ink/40">{preset.note}</p>
                        </button>
                      ))}
                    </div>
                    {selectedAnimations.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-3 h-8 rounded-none text-[10px]"
                        disabled={saving}
                        onClick={() =>
                          void saveRecord(
                            "animation",
                            `${ANIMATION_PRESETS.find((preset) => preset.id === selectedAnimations[0].preset)?.label ?? "Motion"} preset`,
                            selectedAnimations[0],
                            "Saved element animation",
                          )
                        }
                      >
                        <Plus className="size-3.5" /> Save current motion
                      </Button>
                    )}
                  </LibrarySection>

                  <LibrarySection title="Interactive reveals">
                    <p className="mb-3 text-[10px] leading-relaxed text-ink/45">
                      Each preset creates a real cover and a linked target on this page.
                      Tap the cover in Guest preview or on the published invitation to
                      test the reveal. When a text or image layer is selected, it becomes
                      the target where appropriate.
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {REVEAL_PRESETS.filter((preset) => {
                        const query = search.trim().toLowerCase();
                        return !query
                          ? true
                          : `${preset.name} ${preset.note} ${preset.category}`
                              .toLowerCase()
                              .includes(query);
                      }).map((preset) => (
                        <div key={preset.id} className="border border-ink/15 p-3">
                          <div
                            className="mb-2 grid h-16 place-items-center overflow-hidden"
                            style={{ background: content.palette.background }}
                          >
                            {preset.cover.kind === "motif" ? (
                              <span style={{ color: content.palette.accent }}>
                                <Motif
                                  id={preset.cover.motif}
                                  className="size-12"
                                  strokeWidth={1}
                                />
                              </span>
                            ) : (
                              <ShapePreview
                                shape={preset.cover.shape}
                                fill={content.palette.accent}
                                stroke={content.palette.ink}
                              />
                            )}
                          </div>
                          <p className="font-display text-[14px] leading-tight">{preset.name}</p>
                          <p className="mt-0.5 text-[9px] leading-relaxed text-ink/40">{preset.note}</p>
                          <p className="mt-1 text-[8px] uppercase tracking-[0.12em] text-ink/30">
                            {preset.category} · {preset.effect} · {preset.duration}ms
                          </p>
                          <Button
                            type="button"
                            className="mt-2 h-7 w-full rounded-none text-[9px] uppercase tracking-[0.1em]"
                            onClick={() => onAddRevealPreset(preset)}
                          >
                            <Plus className="size-3" /> Add reveal
                          </Button>
                        </div>
                      ))}
                    </div>
                  </LibrarySection>

                  <LibrarySection title="Saved presets">
                    {filtered.length === 0 ? (
                      <p className="text-[11px] text-ink/45">No saved animation presets yet.</p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {filtered.map((item) => {
                          const animation = item.payload as ElementAnimation;
                          return (
                            <div key={item._id} className="border border-ink/15 p-3">
                              <p className="font-display text-[15px]">{item.name}</p>
                              <p className="text-[9px] uppercase tracking-[0.1em] text-ink/40">
                                {animation?.preset} · {animation?.duration ?? 0}ms
                              </p>
                              <Button
                                type="button"
                                disabled={selectedAnimations.length === 0}
                                className="mt-2 h-7 rounded-none text-[9px] uppercase tracking-[0.1em]"
                                onClick={() =>
                                  onApplyAnimation({
                                    ...animation,
                                    delay: selectedAnimations[0]?.delay ?? 0,
                                  })
                                }
                              >
                                Apply to selection
                              </Button>
                              <SavedActions
                                item={item}
                                onRename={() => setEditingId(item._id)}
                                onDuplicate={() => void duplicateItem({ id: item._id })}
                                onArchive={() => void updateItem({ id: item._id, archived: !item.archived })}
                                onDelete={() => setPendingDelete(item)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </LibrarySection>
                </>
              )}

              {tab === "asset" && (
                <>
                <LibrarySection title="Built-in design assets">
                  <p className="mb-3 text-[10px] leading-relaxed text-ink/45">
                    Vector ornaments, backgrounds, frames, dividers, seals and masks drawn
                    by the atelier. They are inserted as editable layers or applied to the
                    current page, never as flat screenshots.
                  </p>
                  {builtInAssets.length === 0 ? (
                    <p className="text-[11px] text-ink/45">No built-in assets match this search.</p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
                      {builtInAssets.map((asset) => (
                        <div key={asset.id} className="border border-ink/15 p-2">
                          <div className="aspect-[4/3] overflow-hidden border border-ink/10">
                            <AssetThumb asset={asset} content={content} />
                          </div>
                          <p className="mt-1.5 truncate text-[11px]">{asset.name}</p>
                          <p className="text-[8px] uppercase tracking-[0.1em] text-ink/35">
                            {asset.category}
                          </p>
                          <Button
                            type="button"
                            className="mt-2 h-7 w-full rounded-none text-[9px] uppercase tracking-[0.1em]"
                            onClick={() => onApplyBuiltinAsset(asset)}
                          >
                            {asset.background ? "Apply page" : "Place on page"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </LibrarySection>

                <LibrarySection
                  title="Design assets"
                  action={
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploading}
                      onClick={() => fileRef.current?.click()}
                      className="h-8 rounded-none text-[10px]"
                    >
                      {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}
                      Upload
                    </Button>
                  }
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="sr-only"
                    onChange={(event) => void handleAssetUpload(event)}
                  />
                  {filtered.length === 0 ? (
                    <p className="text-[11px] leading-relaxed text-ink/45">
                      Upload backgrounds, photographs, frames, or ornaments. Files are
                      stored in the studio's existing storage and can be placed on any
                      page.
                    </p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {filtered.map((item) => (
                        <div key={item._id} className="border border-ink/15 p-2">
                          <div className="aspect-[4/3] overflow-hidden bg-[var(--paper-deep)]">
                            {item.url ? (
                              <img src={item.url} alt={item.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="grid h-full place-items-center text-[10px] text-ink/35">
                                Missing file
                              </div>
                            )}
                          </div>
                          <p className="mt-1.5 truncate text-[11px]">{item.name}</p>
                          <Button
                            type="button"
                            disabled={!item.storageId}
                            className="mt-2 h-7 w-full rounded-none text-[9px] uppercase tracking-[0.1em]"
                            onClick={() =>
                              item.storageId &&
                              onPlaceAsset(item.storageId, item.name, item.url ?? undefined)
                            }
                          >
                            Place on page
                          </Button>
                          {editingId === item._id ? (
                            <ItemNameEditor
                              value={item.name}
                              onSave={(name) => {
                                void updateItem({ id: item._id, name });
                                setEditingId(null);
                              }}
                              onCancel={() => setEditingId(null)}
                            />
                          ) : null}
                          <SavedActions
                            item={item}
                            onRename={() => setEditingId(item._id)}
                            onDuplicate={() => void duplicateItem({ id: item._id })}
                            onArchive={() => void updateItem({ id: item._id, archived: !item.archived })}
                            onDelete={() => setPendingDelete(item)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </LibrarySection>
                </>
              )}

              {tab === "style" && (
                <>
                  <LibrarySection title="Save the current style">
                    <div className="flex flex-wrap items-end gap-2">
                      <div>
                        <p className="mb-1 text-[9px] uppercase tracking-[0.12em] text-ink/40">Name</p>
                        <Input
                          value={styleName}
                          onChange={(event) => setStyleName(event.target.value)}
                          placeholder="House style"
                          className="h-8 w-[180px] rounded-none text-[11px]"
                        />
                      </div>
                      <div>
                        <p className="mb-1 text-[9px] uppercase tracking-[0.12em] text-ink/40">Typeface</p>
                        <Select value={styleFont} onValueChange={setStyleFont}>
                          <SelectTrigger className="h-8 w-[170px] rounded-none text-[11px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FONT_LIBRARY.map((font) => (
                              <SelectItem key={font.id} value={font.id}>{font.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        disabled={saving}
                        className="h-8 rounded-none text-[10px]"
                        onClick={() =>
                          void saveRecord("style", styleName || "House style", {
                            palette: {
                              background: design.pages[0]?.background ?? content.palette.background,
                              ink: content.palette.ink,
                              accent: content.palette.accent,
                            },
                            fontPair: styleFont,
                            background: design.pages[0]?.background,
                          } satisfies StylePreset)
                        }
                      >
                        <Plus className="size-3.5" /> Save style
                      </Button>
                    </div>
                  </LibrarySection>

                  <LibrarySection title="Built-in styles">
                    <p className="mb-3 text-[10px] leading-relaxed text-ink/45">
                      A style changes the page treatment, palette, and all text typefaces.
                      Copy, photographs, positions, shapes, and interactions stay exactly as
                      they are. Undo is available.
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {BUILTIN_STYLES.filter((style) => {
                        const query = search.trim().toLowerCase();
                        return !query
                          ? true
                          : `${style.name} ${style.note}`.toLowerCase().includes(query);
                      })
                        .sort((a, b) => (sort === "az" ? a.name.localeCompare(b.name) : 0))
                        .map((preset: BuiltinStyle) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => onApplyStyle(preset)}
                          className="border border-ink/15 p-3 text-left hover:border-ink"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span>
                              <span className="block font-display text-[15px]">{preset.name}</span>
                              <span className="mt-0.5 block text-[8px] uppercase tracking-[0.1em] text-ink/35">
                                {preset.note}
                              </span>
                            </span>
                            <span
                              className="text-[19px] leading-none text-ink/65"
                              style={{ fontFamily: fontFamilyFor(preset.fontPair) }}
                            >
                              Aa
                            </span>
                          </div>
                          <div className="mt-2 flex gap-1">
                            {[preset.palette.background, preset.palette.ink, preset.palette.accent].map((color, index) => (
                              <span key={`${color}-${index}`} className="size-4 border border-ink/10" style={{ background: color }} />
                            ))}
                            <span className="ml-auto text-[9px] text-ink/35">
                              {fontById(preset.fontPair).name}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </LibrarySection>

                  <LibrarySection title="Saved styles">
                    {filtered.length === 0 ? (
                      <p className="text-[11px] text-ink/45">No saved styles yet.</p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {filtered.map((item) => {
                          const style = item.payload as StylePreset;
                          return (
                            <div key={item._id} className="border border-ink/15 p-3">
                              <p className="font-display text-[15px]">{item.name}</p>
                              <p className="text-[8px] uppercase tracking-[0.1em] text-ink/35">
                                {fontById(style?.fontPair).name}
                              </p>
                              <div className="mt-2 flex gap-1">
                                {[style?.palette?.background, style?.palette?.ink, style?.palette?.accent].map((color, index) => (
                                  <span key={index} className="size-4 border border-ink/10" style={{ background: color ?? "#eee" }} />
                                ))}
                              </div>
                              <Button
                                type="button"
                                className="mt-2 h-7 rounded-none text-[9px] uppercase tracking-[0.1em]"
                                onClick={() => onApplyStyle(style)}
                              >
                                Apply style
                              </Button>
                              <SavedActions
                                item={item}
                                onRename={() => setEditingId(item._id)}
                                onDuplicate={() => void duplicateItem({ id: item._id })}
                                onArchive={() => void updateItem({ id: item._id, archived: !item.archived })}
                                onDelete={() => setPendingDelete(item)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </LibrarySection>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(openingPreview)} onOpenChange={(value) => !value && setOpeningPreview(null)}>
        <DialogContent className="max-w-[440px] overflow-hidden p-0">
          {openingPreview && (
            <div className="relative aspect-[3/4] w-full">
              <OpeningStage
                key={previewKey}
                opening={{ ...openingPreview, autoOpen: false, experience: openingPreview.experience }}
                accent={content.palette.accent}
                background={content.palette.background}
                ink={content.palette.ink}
                guestName="Amelia"
                names={[content.names.primary, content.names.secondary].filter(Boolean).join(" & ") || "LAMSA"}
                onDone={() => undefined}
                reducedMotion={false}
              />
              <button
                type="button"
                onClick={() => setPreviewKey((key) => key + 1)}
                className="absolute right-3 top-3 z-50 border border-ink/20 bg-[var(--paper-light)] px-2 py-1 text-[9px] uppercase tracking-[0.12em]"
              >
                Replay
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pendingDelete)} onOpenChange={(value) => !value && setPendingDelete(null)}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Delete “{pendingDelete?.name}”?</DialogTitle>
            <DialogDescription className="text-[12px] leading-relaxed">
              The saved record and its file are removed from your library. Invitations
              already using it keep their own copy of the design.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="h-9 rounded-none" onClick={() => setPendingDelete(null)}>
              Keep it
            </Button>
            <Button
              type="button"
              className="h-9 rounded-none"
              onClick={async () => {
                if (!pendingDelete) return;
                try {
                  await removeItem({ id: pendingDelete._id });
                  toast.success("Removed from the library.");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Could not remove it.");
                } finally {
                  setPendingDelete(null);
                }
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
}
