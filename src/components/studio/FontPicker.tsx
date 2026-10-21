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
  FONT_CATEGORIES,
  FONT_LIBRARY,
  ensureFont,
  fontById,
  fontSamples,
  type FontCategory,
  type FontDef,
} from "@/lib/fonts";
import { cn } from "@/lib/utils";
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  Clock3,
  Loader2,
  Search,
  Star,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const RECENT_KEY = "lamsa.fonts.recent";
const FAVORITES_KEY = "lamsa.fonts.favorites";

function readList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeList(key: string, value: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable in private windows; the picker still works.
  }
}

function FontPreviewCard({
  font,
  sample,
  active,
  favorite,
  onPick,
  onFavorite,
}: {
  font: FontDef;
  sample: string;
  active: boolean;
  favorite: boolean;
  onPick: () => void;
  onFavorite: () => void;
}) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "unavailable">("idle");

  useEffect(() => {
    const node = ref.current;
    if (!node || visible) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          setStatus((current) => (current === "idle" ? "loading" : current));
          observer.disconnect();
        }
      },
      { rootMargin: "280px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible || status !== "loading") return;
    let cancelled = false;
    void ensureFont(font.id, 400).then((ok) => {
      if (!cancelled) setStatus(ok ? "ready" : "unavailable");
    });
    return () => {
      cancelled = true;
    };
  }, [visible, status, font.id]);

  const samples = fontSamples(font, sample);
  const arabicPrimary = font.script === "arabic";

  return (
    <div
      className={cn(
        "group relative border text-left transition-colors",
        active ? "border-ink bg-ink/[0.035]" : "border-ink/15 hover:border-ink/60",
      )}
    >
      <button
        ref={ref}
        type="button"
        onClick={onPick}
        className="block w-full px-3 pb-2.5 pt-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--red)]"
      >
        <div className="flex items-start justify-between gap-2">
          <span className="min-w-0">
            <span className="block truncate text-[10px] font-medium uppercase tracking-[0.12em] text-ink/55">
              {font.name}
            </span>
            <span className="mt-0.5 block truncate text-[9px] text-ink/35">
              {font.categories.join(" · ")}
              {font.weights.length > 1 ? ` · ${font.weights.join("/")}` : ""}
            </span>
          </span>
          {active && <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--red)]" />}
        </div>

        <span
          className="mt-2.5 block truncate text-[21px] leading-[1.22] text-ink"
          style={{ fontFamily: font.family }}
          dir={arabicPrimary ? "rtl" : "ltr"}
        >
          {arabicPrimary ? samples.arabic : samples.latin}
        </span>
        {font.script !== "latin" && (
          <span
            className="mt-1 block truncate text-[12px] leading-[1.3] text-ink/55"
            style={{ fontFamily: font.family }}
            dir={arabicPrimary ? "ltr" : "rtl"}
          >
            {arabicPrimary ? samples.latin : samples.arabic}
          </span>
        )}
      </button>

      <div className="flex min-h-6 items-center justify-between gap-2 border-t border-ink/8 px-3 py-1">
        <span className="flex items-center gap-1 text-[8px] uppercase tracking-[0.14em] text-ink/35">
          {status === "loading" && (
            <>
              <Loader2 className="size-2.5 animate-spin" /> Loading
            </>
          )}
          {status === "ready" && "Ready"}
          {status === "unavailable" && (
            <span className="text-[var(--red)]/80">Unavailable · fallback</span>
          )}
          {status === "idle" && (font.script === "arabic" ? "Arabic" : font.script === "both" ? "Arabic + Latin" : "Latin")}
        </span>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onFavorite();
          }}
          aria-label={favorite ? `Remove ${font.name} from favorites` : `Favorite ${font.name}`}
          aria-pressed={favorite}
          className="grid size-6 place-items-center text-ink/30 transition-colors hover:text-[var(--red)]"
        >
          <Star className={cn("size-3", favorite && "fill-current text-[var(--red)]")} />
        </button>
      </div>
    </div>
  );
}

export function FontPicker({
  value,
  sampleText,
  onSelect,
  className,
}: {
  value: string;
  sampleText?: string;
  onSelect: (fontId: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [script, setScript] = useState<"all" | "arabic" | "latin">("all");
  const [category, setCategory] = useState<FontCategory | "all">("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sort, setSort] = useState<"curated" | "az">("curated");
  const [sample, setSample] = useState(
    sampleText?.trim().slice(0, 90) || "Alexandra & Omar",
  );
  const [favorites, setFavorites] = useState<string[]>(() => readList(FAVORITES_KEY));
  const [recent, setRecent] = useState<string[]>(() => readList(RECENT_KEY));

  const current = fontById(value);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = FONT_LIBRARY.filter((font) => {
      if (favoritesOnly && !favorites.includes(font.id)) return false;
      if (script === "arabic" && font.script === "latin") return false;
      if (script === "latin" && font.script === "arabic") return false;
      if (category !== "all" && !font.categories.includes(category)) return false;
      if (
        needle &&
        !`${font.name} ${font.categories.join(" ")} ${font.note ?? ""}`
          .toLowerCase()
          .includes(needle)
      ) {
        return false;
      }
      return true;
    });
    if (sort === "az") return [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [category, favorites, favoritesOnly, query, script, sort]);

  const recentFonts = recent
    .map((id) => FONT_LIBRARY.find((font) => font.id === fontById(id).id))
    .filter((font): font is FontDef => Boolean(font))
    .slice(0, 6);

  const pick = (font: FontDef) => {
    onSelect(font.id);
    const nextRecent = [font.id, ...recent.filter((id) => id !== font.id)].slice(0, 10);
    setRecent(nextRecent);
    writeList(RECENT_KEY, nextRecent);
    setOpen(false);
  };

  const toggleFavorite = (font: FontDef) => {
    const next = favorites.includes(font.id)
      ? favorites.filter((id) => id !== font.id)
      : [...favorites, font.id];
    setFavorites(next);
    writeList(FAVORITES_KEY, next);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setSample(sampleText?.trim().slice(0, 90) || "Alexandra & Omar");
          setOpen(true);
        }}
        className={cn(
          "h-9 w-full justify-between rounded-none border-ink/20 px-2.5 text-left text-[11px] font-normal",
          className,
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span
            className="shrink-0 text-[17px] leading-none"
            style={{ fontFamily: current.family }}
            aria-hidden
          >
            Aa
          </span>
          <span className="truncate">{current.name}</span>
        </span>
        <ChevronDown className="size-3.5 shrink-0 text-ink/45" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="grid max-h-[88vh] max-w-3xl grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-0 overflow-hidden border-ink/20 p-0">
          <DialogHeader className="border-b border-ink/12 px-5 py-4">
            <DialogTitle className="font-display text-2xl">Type library</DialogTitle>
            <DialogDescription className="text-[11px] leading-relaxed text-ink/50">
              {FONT_LIBRARY.length} open-source families, loaded from Google Fonts only
              when previewed or used. Arabic sets right-to-left; mixed lines fall back
              glyph by glyph.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 border-b border-ink/12 px-5 py-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink/35" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search Playfair, Naskh, script…"
                  className="h-9 rounded-none border-ink/20 pl-8 text-[12px]"
                  autoFocus
                />
              </label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setFavoritesOnly((next) => !next)}
                  aria-pressed={favoritesOnly}
                  className={cn(
                    "flex h-9 items-center gap-1.5 border px-2.5 text-[9px] uppercase tracking-[0.12em]",
                    favoritesOnly
                      ? "border-ink bg-ink text-[#f2f1ed]"
                      : "border-ink/20 text-ink/55 hover:border-ink",
                  )}
                >
                  <Star className={cn("size-3", favoritesOnly && "fill-current")} />
                  Saved
                </button>
                <button
                  type="button"
                  onClick={() => setSort((next) => (next === "az" ? "curated" : "az"))}
                  className="flex h-9 items-center gap-1.5 border border-ink/20 px-2.5 text-[9px] uppercase tracking-[0.12em] text-ink/55 hover:border-ink"
                  title="Change sort order"
                >
                  <ArrowUpDown className="size-3" />
                  {sort === "az" ? "A–Z" : "Curated"}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(["all", "arabic", "latin"] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setScript(id)}
                  className={cn(
                    "border px-2.5 py-1 text-[9px] uppercase tracking-[0.14em]",
                    script === id
                      ? "border-[var(--red)] bg-[var(--red)] text-[#f2f1ed]"
                      : "border-ink/15 text-ink/50 hover:border-ink",
                  )}
                >
                  {id === "all" ? "All scripts" : id}
                </button>
              ))}
              <span className="mx-1 h-4 w-px bg-ink/15" />
              <button
                type="button"
                onClick={() => setCategory("all")}
                className={cn(
                  "border px-2.5 py-1 text-[9px] uppercase tracking-[0.14em]",
                  category === "all"
                    ? "border-ink bg-ink text-[#f2f1ed]"
                    : "border-ink/15 text-ink/50 hover:border-ink",
                )}
              >
                Every style
              </button>
              {FONT_CATEGORIES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCategory(item.id)}
                  className={cn(
                    "border px-2.5 py-1 text-[9px] uppercase tracking-[0.14em]",
                    category === item.id
                      ? "border-ink bg-ink text-[#f2f1ed]"
                      : "border-ink/15 text-ink/50 hover:border-ink",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-[9px] uppercase tracking-[0.12em] text-ink/40">
                Preview text
              </span>
              <Input
                value={sample}
                onChange={(event) => setSample(event.target.value)}
                className="h-8 rounded-none border-ink/15 text-[11px]"
                placeholder="Type your invitation wording"
              />
            </label>

            {recentFonts.length > 0 && !query && !favoritesOnly && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="flex items-center gap-1 text-[8px] uppercase tracking-[0.14em] text-ink/35">
                  <Clock3 className="size-2.5" /> Recent
                </span>
                {recentFonts.map((font) => (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => pick(font)}
                    className="border border-ink/12 px-2 py-0.5 text-[10px] hover:border-ink"
                    style={{ fontFamily: font.family }}
                  >
                    {font.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {filtered.length === 0 ? (
              <p className="py-10 text-center text-[12px] text-ink/45">
                No families match that search. Try “serif”, “Arabic”, or a family name.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((font) => (
                  <FontPreviewCard
                    key={font.id}
                    font={font}
                    sample={sample}
                    active={current.id === font.id}
                    favorite={favorites.includes(font.id)}
                    onPick={() => pick(font)}
                    onFavorite={() => toggleFavorite(font)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink/12 px-5 py-2.5 text-[9px] text-ink/40">
            <span>{filtered.length} families shown</span>
            <span>Free fonts · SIL OFL / Apache · Latin + Arabic fallbacks</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
