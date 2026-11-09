import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowDownToLine,
  Clock,
  Grid2X2,
  Loader2,
  Search,
  Star,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import {
  ASSET_META,
  cachedGeometry,
  filterAssets,
  loadCategoryGeometry,
  registerGeometry,
  type LibraryView,
} from "@/lib/library/catalog";
import {
  LIBRARY_CATEGORIES,
  categoryLabel,
  type LibraryAssetMeta,
  type LibraryCategoryId,
} from "@/lib/library/types";
import type { ElementAsset } from "@/lib/publishing/elements";
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
import { AssetArt } from "./AssetArt";

/**
 * The shared Elements Library browser.
 *
 * Publishing Studio renders it in the editor's Elements panel; the main
 * Library workspace renders the same component in a wide layout. Both read the
 * same `ASSET_META`, the same geometry cache and the same favourites rows, so
 * there is never a second copy of an asset or a second idea of what a category
 * contains.
 */

const PAGE_SIZE = 36;
const loadedCategories = new Set<LibraryCategoryId>();

const CATEGORY_TABS: Array<[LibraryCategoryId | "all", string]> = [
  ["all", "All"],
  ...LIBRARY_CATEGORIES.map(
    (entry): [LibraryCategoryId, string] => [entry.id, entry.label],
  ),
];

export interface ElementsBrowserProps {
  view?: LibraryView;
  mode?: "studio" | "library";
  initialCategory?: LibraryCategoryId | "all";
  onInsert?: (asset: ElementAsset) => void;
  className?: string;
}

export function ElementsBrowser({
  view,
  mode = "studio",
  initialCategory = "all",
  onInsert,
  className,
}: ElementsBrowserProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<LibraryCategoryId | "all">(initialCategory);
  const [subcategory, setSubcategory] = useState<string>("all");
  const [special, setSpecial] = useState<"all" | "favorites" | "recent">("all");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [preview, setPreview] = useState<LibraryAssetMeta | null>(null);
  const [, setGeometryTick] = useState(0);
  const [inserting, setInserting] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const favouritesResult = useQuery(api.libraryAssets.listFavourites);
  const recentsResult = useQuery(api.libraryAssets.listRecents);
  const toggleFavourite = useMutation(api.libraryAssets.toggleFavourite);

  const favourites = useMemo(() => favouritesResult ?? [], [favouritesResult]);
  const recents = useMemo(() => recentsResult ?? [], [recentsResult]);
  const favouriteSet = useMemo(() => new Set(favourites), [favourites]);
  const recentIds = useMemo(() => recents.map((row) => row.assetId), [recents]);

  const filtered = useMemo(
    () =>
      filterAssets(ASSET_META, {
        view,
        category,
        subcategory,
        query,
        favourites: favouriteSet,
        favouritesOnly: special === "favorites",
        recents: recentIds,
        recentsOnly: special === "recent",
      }),
    [view, category, subcategory, query, favouriteSet, special, recentIds],
  );

  const subcategories = useMemo(() => {
    const pool = filterAssets(ASSET_META, { view, category });
    const counts = new Map<string, number>();
    for (const asset of pool) {
      counts.set(asset.subcategory, (counts.get(asset.subcategory) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [view, category]);

  const shown = filtered.slice(0, visible);

  /**
   * Load only the categories the visible cards belong to. Search can surface
   * results from anywhere, so this follows the results rather than the whole
   * catalogue.
   */
  const needed = useMemo(() => {
    const set = new Set<LibraryCategoryId>();
    for (const asset of shown) set.add(asset.category);
    return [...set].sort();
  }, [shown]);
  const neededKey = needed.join("|");

  useEffect(() => {
    const missing = neededKey
      ? (neededKey.split("|") as LibraryCategoryId[]).filter(
          (id) => !loadedCategories.has(id),
        )
      : [];
    if (missing.length === 0) return;
    let cancelled = false;
    void Promise.all(
      missing.map(async (id) => {
        const geometry = await loadCategoryGeometry(id);
        registerGeometry(geometry);
        loadedCategories.add(id);
      }),
    )
      .then(() => {
        if (!cancelled) setGeometryTick((tick) => tick + 1);
      })
      .catch(() => {
        // A failed chunk leaves the cards as skeletons; the next scroll or
        // category change retries, and browsing metadata still works.
      });
    return () => {
      cancelled = true;
    };
  }, [neededKey]);

  /** A new filter starts at the top of the grid, not halfway down. */
  const resetPaging = () => {
    setVisible(PAGE_SIZE);
    scroller.current?.scrollTo({ top: 0 });
  };

  const insert = async (asset: LibraryAssetMeta) => {
    if (!onInsert) return;
    const geometry = cachedGeometry(asset.id);
    if (!geometry) {
      toast.error("The artwork is still loading. Try again in a moment.");
      return;
    }
    setInserting(asset.id);
    try {
      onInsert({ ...geometry, id: asset.id, name: asset.name });
      setPreview(null);
    } finally {
      setInserting(null);
    }
  };

  const toggleStar = (event: React.MouseEvent, asset: LibraryAssetMeta) => {
    event.stopPropagation();
    void toggleFavourite({ assetId: asset.id }).catch(() => {
      toast.error("The favorite could not be saved.");
    });
  };

  const compact = mode === "studio";
  const totalLabel = `${filtered.length.toLocaleString()} ${filtered.length === 1 ? "asset" : "assets"}`;

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className="space-y-1.5 border-b border-[var(--rule)] px-2 py-1.5">
        <label className="flex items-center gap-1.5 rounded-sm border border-[var(--rule)] bg-[var(--paper-light)] px-2">
          <Search className="size-3 shrink-0 text-[var(--ink-soft)]" />
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              resetPaging();
            }}
            placeholder="Search elements, tags…"
            aria-label="Search elements"
            className="h-7 border-0 bg-transparent px-0 text-[0.72rem] shadow-none focus-visible:ring-0"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                resetPaging();
              }}
              className="text-[var(--ink-soft)] hover:text-[var(--ink)]"
            >
              <X className="size-3" />
            </button>
          ) : null}
        </label>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-pressed={special === "favorites"}
            onClick={() => {
              setSpecial((value) => (value === "favorites" ? "all" : "favorites"));
              resetPaging();
            }}
            className={cn(
              "flex items-center gap-1 rounded-full border px-2 py-0.5 font-meta text-[0.48rem] uppercase tracking-[0.08em] transition-colors",
              special === "favorites"
                ? "border-[var(--gold)] text-[var(--gold)]"
                : "border-[var(--rule)] text-[var(--ink-soft)] hover:text-[var(--ink)]",
            )}
          >
            <Star className={cn("size-2.5", special === "favorites" && "fill-current")} />
            Favorites
            {favourites.length > 0 ? (
              <span className="tabular-nums">{favourites.length}</span>
            ) : null}
          </button>
          <button
            type="button"
            aria-pressed={special === "recent"}
            onClick={() => {
              setSpecial((value) => (value === "recent" ? "all" : "recent"));
              resetPaging();
            }}
            className={cn(
              "flex items-center gap-1 rounded-full border px-2 py-0.5 font-meta text-[0.48rem] uppercase tracking-[0.08em] transition-colors",
              special === "recent"
                ? "border-[var(--red)] text-[var(--red)]"
                : "border-[var(--rule)] text-[var(--ink-soft)] hover:text-[var(--ink)]",
            )}
          >
            <Clock className="size-2.5" />
            Recent
          </button>
          <span className="ml-auto font-meta text-[0.46rem] uppercase tracking-[0.08em] text-[var(--ink-soft)]">
            {totalLabel}
          </span>
        </div>

        <div className="-mx-0.5 flex gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORY_TABS.map(
            ([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={category === id}
                onClick={() => {
                  setCategory(id);
                  setSubcategory("all");
                  resetPaging();
                }}
                className={cn(
                  "shrink-0 rounded-full border px-2 py-0.5 font-meta text-[0.48rem] uppercase tracking-[0.06em] transition-colors",
                  category === id
                    ? "border-[var(--red)] text-[var(--red)]"
                    : "border-[var(--rule)] text-[var(--ink-soft)] hover:text-[var(--ink)]",
                )}
              >
                {label}
              </button>
            ),
          )}
        </div>

        {subcategories.length > 1 ? (
          <div className="-mx-0.5 flex gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              aria-pressed={subcategory === "all"}
              onClick={() => {
                setSubcategory("all");
                resetPaging();
              }}
              className={cn(
                "shrink-0 rounded-[3px] px-1.5 py-0.5 font-meta text-[0.46rem] uppercase tracking-[0.05em]",
                subcategory === "all"
                  ? "bg-[color-mix(in_oklab,var(--ink)_8%,transparent)] text-[var(--ink)]"
                  : "text-[var(--ink-soft)] hover:text-[var(--ink)]",
              )}
            >
              All types
            </button>
            {subcategories.map(([name, count]) => (
              <button
                key={name}
                type="button"
                aria-pressed={subcategory === name}
                onClick={() => {
                  setSubcategory(name);
                  resetPaging();
                }}
                className={cn(
                  "shrink-0 rounded-[3px] px-1.5 py-0.5 font-meta text-[0.46rem] uppercase tracking-[0.05em]",
                  subcategory === name
                    ? "bg-[color-mix(in_oklab,var(--ink)_8%,transparent)] text-[var(--ink)]"
                    : "text-[var(--ink-soft)] hover:text-[var(--ink)]",
                )}
              >
                {name}
                <span className="ml-1 tabular-nums opacity-60">{count}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div ref={scroller} className="scroll-slim min-h-0 flex-1 overflow-y-auto p-2">
        {shown.length === 0 ? (
          <div className="mx-1 mt-2 rounded-sm border border-dashed border-[var(--rule)] px-3 py-8 text-center">
            <Grid2X2 className="mx-auto size-4 text-[color-mix(in_oklab,var(--ink-soft)_65%,transparent)]" />
            <p className="mt-2 text-[0.72rem] leading-5 text-[var(--ink-soft)]">
              {special === "favorites"
                ? "No favorites yet. Star an asset and it collects here."
                : special === "recent"
                  ? "Nothing placed yet. Insert an element and it will appear here."
                  : "No elements match that search. Try a category or a shorter word."}
            </p>
          </div>
        ) : (
          <div
            className={cn(
              "grid gap-2",
              compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
            )}
          >
            {shown.map((asset) => {
              const geometry = cachedGeometry(asset.id);
              const starred = favouriteSet.has(asset.id);
              return (
                <div
                  key={asset.id}
                  role="button"
                  tabIndex={0}
                  draggable={Boolean(onInsert) && Boolean(geometry)}
                  title={`${asset.name} · ${categoryLabel(asset.category)} · drag onto a page or click to preview`}
                  aria-label={`${asset.name}, ${categoryLabel(asset.category)}`}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("application/x-lamsa-element", asset.id);
                    event.dataTransfer.setData("text/plain", asset.name);
                    event.dataTransfer.effectAllowed = "copy";
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setPreview(asset);
                    }
                  }}
                  onClick={() => setPreview(asset)}
                  className={cn(
                    "group relative cursor-pointer overflow-hidden rounded-sm border border-[var(--rule)] bg-[var(--paper-light)] text-left transition-colors hover:border-[var(--red)]",
                    "focus-visible:border-[var(--red)] focus-visible:outline-none",
                  )}
                >
                  <span
                    className={cn(
                      "flex w-full items-center justify-center overflow-hidden bg-[color-mix(in_oklab,var(--ink)_3%,transparent)] p-2 text-[var(--ink)]",
                      compact ? "h-[68px]" : "h-[104px]",
                    )}
                  >
                    <AssetArt asset={asset} className="max-h-full max-w-full" />
                  </span>
                  <span className="block truncate px-1.5 pt-1 text-[0.62rem] text-[var(--ink)]">
                    {asset.name}
                  </span>
                  <span className="block truncate px-1.5 pb-1 font-meta text-[0.44rem] uppercase tracking-[0.04em] text-[var(--ink-soft)]">
                    {asset.subcategory}
                  </span>
                  <button
                    type="button"
                    aria-pressed={starred}
                    aria-label={starred ? "Remove from favorites" : "Add to favorites"}
                    title={starred ? "Remove from favorites" : "Add to favorites"}
                    onClick={(event) => toggleStar(event, asset)}
                    className={cn(
                      "absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-[var(--paper)]/90 transition-colors",
                      starred
                        ? "text-[var(--gold)]"
                        : "text-[var(--ink-soft)] opacity-0 focus-visible:opacity-100 group-hover:opacity-100",
                    )}
                  >
                    <Star className={cn("size-3", starred && "fill-current")} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {filtered.length > shown.length ? (
          <div className="mt-3 flex flex-col items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setVisible((value) => value + PAGE_SIZE)}
              className="h-7 rounded-[3px] px-3 font-meta text-[0.5rem] uppercase tracking-[0.1em]"
            >
              Show {Math.min(PAGE_SIZE, filtered.length - shown.length)} more
            </Button>
            <p className="font-meta text-[0.44rem] uppercase tracking-[0.08em] text-[var(--ink-soft)]">
              {loadedCategories.size} of {LIBRARY_CATEGORIES.length} categories loaded
            </p>
          </div>
        ) : null}
      </div>

      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-[520px] gap-0 overflow-hidden p-0">
          {preview ? (
            <>
              <DialogHeader className="border-b border-[var(--rule)] px-4 py-3">
                <DialogTitle className="font-display text-[1.15rem] leading-tight">
                  {preview.name}
                </DialogTitle>
                <DialogDescription className="font-meta text-[0.5rem] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
                  {categoryLabel(preview.category)} · {preview.subcategory} · {preview.source}
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center justify-center bg-[color-mix(in_oklab,var(--ink)_4%,transparent)] p-6">
                <div
                  className="flex h-[230px] w-[230px] items-center justify-center rounded-[2px] bg-[var(--paper)] p-6 text-[var(--ink)] shadow-[0_1px_0_rgba(0,0,0,0.04)]"
                  style={{ aspectRatio: `${preview.aspect}` }}
                >
                  <AssetArt asset={preview} />
                </div>
              </div>
              <div className="space-y-3 px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {preview.tags.slice(0, 8).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-[var(--rule)] px-2 py-0.5 font-meta text-[0.46rem] uppercase tracking-[0.06em] text-[var(--ink-soft)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 font-meta text-[0.5rem] uppercase tracking-[0.06em]">
                  <div className="flex justify-between border-b border-[var(--rule)] pb-1">
                    <dt className="text-[var(--ink-soft)]">Type</dt>
                    <dd>{preview.type === "vector" ? "Vector SVG" : "Raster"}</dd>
                  </div>
                  <div className="flex justify-between border-b border-[var(--rule)] pb-1">
                    <dt className="text-[var(--ink-soft)]">Editing</dt>
                    <dd>{preview.ink === "fill" ? "Fill" : "Fill + stroke"}</dd>
                  </div>
                  <div className="flex justify-between border-b border-[var(--rule)] pb-1">
                    <dt className="text-[var(--ink-soft)]">Added</dt>
                    <dd>{new Date(preview.createdAt).toLocaleDateString()}</dd>
                  </div>
                  <div className="flex justify-between border-b border-[var(--rule)] pb-1">
                    <dt className="text-[var(--ink-soft)]">Asset ID</dt>
                    <dd className="max-w-[120px] truncate normal-case tracking-normal">
                      {preview.id}
                    </dd>
                  </div>
                </dl>
                <div className="flex items-center gap-2">
                  {onInsert ? (
                    <Button
                      type="button"
                      onClick={() => void insert(preview)}
                      disabled={inserting === preview.id}
                      className="h-8 flex-1 gap-1.5 rounded-[3px] bg-[var(--red)] px-3 font-meta text-[0.54rem] uppercase tracking-[0.1em] text-white hover:bg-[color-mix(in_oklab,var(--red)_88%,black)]"
                    >
                      {inserting === preview.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <ArrowDownToLine className="size-3.5" />
                      )}
                      {inserting === preview.id ? "Placing…" : "Insert into page"}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(event) => toggleStar(event, preview)}
                    className="h-8 gap-1.5 rounded-[3px] px-3 font-meta text-[0.54rem] uppercase tracking-[0.1em]"
                  >
                    <Star
                      className={cn(
                        "size-3.5",
                        favouriteSet.has(preview.id) && "fill-[var(--gold)] text-[var(--gold)]",
                      )}
                    />
                    {favouriteSet.has(preview.id) ? "Favorited" : "Favorite"}
                  </Button>
                </div>
                <p className="text-center font-meta text-[0.44rem] uppercase tracking-[0.08em] text-[var(--ink-soft)]">
                  {onInsert
                    ? "Drag the card onto a page, or insert it centred. It stays a vector object."
                    : "Vectors stay editable: recolour, scale, rotate and flip without quality loss."}
                </p>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
