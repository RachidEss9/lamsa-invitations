import { DesignPageView, DesignStage, useStageScale } from "@/components/invitation/DesignPageView";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { pageSizeOf, visiblePages, type DesignDocument, type DesignPage } from "@/lib/design";
import type { FinishesConfig } from "@/lib/finishes";
import {
  DETAIL_VIEW_KINDS,
  PRESENTATION_BACKDROPS,
  PRESENTATION_LAYOUTS,
  addView,
  backdropById,
  cropOffset,
  defaultPresentation,
  detailViewsFor,
  exportDimensions,
  exportScale,
  focusRegion,
  layoutById,
  loadPresentation,
  moveView,
  newViewId,
  presentationExportName,
  removeView,
  savePresentation,
  spanFor,
  updateView,
  withStyle,
  type CropRegion,
  type DetailView,
  type DetailViewKind,
  type PresentationDoc,
  type PresentationFormat,
} from "@/lib/detail-presentation";
import { downloadBlob } from "@/lib/print";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Check,
  Crop,
  Download,
  Frame,
  Layers,
  Loader2,
  Maximize2,
  Presentation,
  Type,
  X,
} from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-[var(--edge)] px-4 py-3">
      <p className="section-label mb-2">{title}</p>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

const VIEW_ICONS: Record<DetailViewKind, typeof X> = {
  full: Maximize2,
  typography: Type,
  paper: Layers,
  artwork: Frame,
  focus: Crop,
};

const kindLabel = (kind: DetailViewKind) =>
  DETAIL_VIEW_KINDS.find((entry) => entry.id === kind)?.label ?? kind;

function IconAction({
  label,
  action,
  disabled,
  onClick,
  children,
}: {
  label: string;
  action: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-action={action}
      disabled={disabled}
      onClick={onClick}
      className="grid size-6 place-items-center text-ink/45 transition-colors hover:text-ink focus-visible:text-ink disabled:opacity-25"
    >
      {children}
    </button>
  );
}

/** Live size of the composed page — the preview and the export share it. */
function useMeasuredBox<T extends HTMLElement>(ref: RefObject<T | null>, active: boolean) {
  const [box, setBox] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    if (!active) return;
    const node = ref.current;
    if (!node) return;
    const measure = () => setBox({ width: node.clientWidth, height: node.clientHeight });
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, active]);
  return box;
}

/**
 * One plate of the presentation: a viewport that shows exactly `region` of the
 * source page. The page is laid out in its own design units and scaled by the
 * real zoom factor, so lettering re-typesets at the crop's resolution instead
 * of being stretched from a thumbnail.
 */
function CropPlate({
  page,
  view,
  imageUrls,
  rtl,
  finishes,
}: {
  page: DesignPage;
  view: DetailView;
  imageUrls: Record<string, string>;
  rtl: boolean;
  finishes?: FinishesConfig;
}) {
  const size = pageSizeOf(page);
  const { ref, scale } = useStageScale(view.region.w);
  const offset = cropOffset(view.region, scale);
  return (
    <div
      ref={ref}
      data-detail-plate={view.id}
      data-crop={`${Math.round(view.region.x)},${Math.round(view.region.y)},${Math.round(view.region.w)},${Math.round(view.region.h)}`}
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: `${view.region.w} / ${view.region.h}` }}
    >
      <div
        style={{
          position: "absolute",
          left: offset.left,
          top: offset.top,
          width: size.width,
          height: size.height,
          transform: `scale(${scale || 0.0001})`,
          transformOrigin: "0 0",
          visibility: scale ? "visible" : "hidden",
        }}
      >
        <DesignPageView
          page={page}
          time={100000}
          imageUrls={imageUrls}
          guestName={null}
          rtl={rtl}
          finishes={finishes}
          ignoreExit
        />
      </div>
    </div>
  );
}

interface DetailPresentationStudioProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  design: DesignDocument;
  /** Stable key for saving presentations — never the artwork itself. */
  designKey: string;
  imageUrls: Record<string, string>;
  title: string;
  rtl?: boolean;
}

/**
 * The Detail Presentation workspace: close-up views cropped from the saved
 * invitation, composed on a restrained editorial page and exported as a
 * high-resolution PNG or JPEG labelled `…-presentation`.
 *
 * Every plate re-renders the real page through `DesignPageView` — the same
 * path the editor, the public invitation and the print export use — so a crop
 * is always the artwork itself, never a simulation. The print-ready PDF
 * pipeline is untouched.
 */
export function DetailPresentationStudio({
  open,
  onOpenChange,
  design,
  designKey,
  imageUrls,
  title,
  rtl,
}: DetailPresentationStudioProps) {
  const pages = useMemo(() => visiblePages(design), [design]);
  const pageById = useMemo(
    () => new Map(design.pages.map((page) => [page.id, page])),
    [design],
  );

  const [draft, setDraft] = useState<PresentationDoc | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sourcePageId, setSourcePageId] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [selection, setSelection] = useState<CropRegion | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const loadedFor = useRef<string | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const focusRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  // Load the saved presentation once per workspace visit.
  useEffect(() => {
    if (!open) {
      loadedFor.current = null;
      return;
    }
    if (loadedFor.current === designKey) return;
    loadedFor.current = designKey;
    setDraft(loadPresentation(designKey, design));
    setSelectedId(null);
    setFocusMode(false);
    setSelection(null);
    setHint(null);
    setError(null);
    setDone(null);
  }, [open, designKey, design]);

  const doc = useMemo(
    () => draft ?? loadPresentation(designKey, design) ?? defaultPresentation(design),
    [draft, designKey, design],
  );

  // Presentations are saved continuously, outside the design document — but
  // never the built-in default before the saved presentation has loaded.
  useEffect(() => {
    if (open && draft) savePresentation(designKey, doc);
  }, [open, draft, designKey, doc]);

  const sourcePage = pages.find((page) => page.id === sourcePageId) ?? pages[0] ?? null;
  const layout = layoutById(doc.style.layoutId);
  const backdrop = backdropById(doc.style.backgroundId);
  const selected = doc.views.find((view) => view.id === selectedId) ?? null;
  const stageBox = useMeasuredBox(stageRef, open && !focusMode);
  const exportDims =
    stageBox.width > 0 && stageBox.height > 0
      ? exportDimensions(stageBox.width, stageBox.height, exportScale(stageBox.width))
      : null;

  // Typography and spacing scale with the page itself, so the preview and the
  // exported image keep identical proportions at any screen size.
  const sheetWidth = stageBox.width || 640;
  const padPx = sheetWidth * (0.045 + (doc.style.margin / 100) * 0.075);
  const gapPx = sheetWidth * (0.014 + (doc.style.gap / 100) * 0.046);
  const titlePx = Math.max(9, sheetWidth * 0.021);
  const captionPx = Math.max(8, sheetWidth * 0.014);
  const bodyPx = Math.max(9, sheetWidth * 0.016);

  const apply = (next: PresentationDoc) => setDraft(next);

  const addViews = (kind: DetailViewKind) => {
    if (!sourcePage) return;
    const derived = detailViewsFor(kind, sourcePage, 3);
    if (derived.length === 0) {
      setHint(
        kind === "typography"
          ? "This page has no text layers to frame yet."
          : "This page has no decorative layers to frame yet.",
      );
      return;
    }
    const fresh = derived.filter(
      (candidate) =>
        !doc.views.some(
          (view) =>
            view.kind === candidate.kind &&
            view.pageId === candidate.pageId &&
            view.region.x === candidate.region.x &&
            view.region.y === candidate.region.y &&
            view.region.w === candidate.region.w &&
            view.region.h === candidate.region.h,
        ),
    );
    if (fresh.length === 0) {
      setHint(`${kindLabel(kind)} of this page is already in the presentation.`);
      return;
    }
    setHint(null);
    let next = doc;
    for (const view of fresh) next = addView(next, view);
    apply(next);
    setSelectedId(fresh[0].id);
  };

  const reorder = (id: string, delta: -1 | 1) => {
    const index = doc.views.findIndex((view) => view.id === id);
    if (index < 0) return;
    apply(moveView(doc, id, index + delta));
  };

  const remove = (id: string) => {
    apply(removeView(doc, id));
    if (selectedId === id) setSelectedId(null);
  };

  const clampPx = (value: number, max: number) => Math.min(Math.max(value, 0), max);
  const frameRect = () => focusRef.current?.getBoundingClientRect() ?? null;

  const onFocusPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = frameRect();
    if (!rect || rect.width <= 0) return;
    event.preventDefault();
    // Pointer capture is an optimisation; browsers may refuse it mid-drag.
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // The drag still tracks through pointermove without capture.
    }
    const point = {
      x: clampPx(event.clientX - rect.left, rect.width),
      y: clampPx(event.clientY - rect.top, rect.height),
    };
    dragRef.current = point;
    setSelection({ x: point.x, y: point.y, w: 0, h: 0 });
  };

  const onFocusPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = dragRef.current;
    const rect = frameRect();
    if (!start || !rect || rect.width <= 0) return;
    const cx = clampPx(event.clientX - rect.left, rect.width);
    const cy = clampPx(event.clientY - rect.top, rect.height);
    setSelection({
      x: Math.min(start.x, cx),
      y: Math.min(start.y, cy),
      w: Math.abs(cx - start.x),
      h: Math.abs(cy - start.y),
    });
  };

  const endFocusDrag = () => {
    dragRef.current = null;
  };

  const commitFocus = () => {
    const rect = frameRect();
    if (!sourcePage || !rect || !selection) return;
    if (selection.w < 12 || selection.h < 12) {
      setHint("Drag a larger area to frame a detail.");
      return;
    }
    const view: DetailView = {
      id: newViewId("focus"),
      kind: "focus",
      pageId: sourcePage.id,
      region: focusRegion(selection, { width: rect.width, height: rect.height }, sourcePage),
      title: "",
      caption: "",
    };
    apply(addView(doc, view));
    setSelectedId(view.id);
    setFocusMode(false);
    setSelection(null);
    setHint(null);
  };

  const exportPresentation = async (format: PresentationFormat) => {
    if (busy) return;
    setError(null);
    setDone(null);
    setBusy("Preparing page");
    try {
      if (doc.views.length === 0) {
        throw new Error("Add at least one detail view before exporting.");
      }
      const node = stageRef.current;
      if (!node) {
        throw new Error("The presentation page did not render. Close and reopen this window.");
      }
      if (document.fonts?.ready) await document.fonts.ready;
      await Promise.all(
        Array.from(node.querySelectorAll("img")).map((image) =>
          image.decode?.().catch(() => undefined),
        ),
      );
      // Let the selection chrome leave the page before it is captured.
      await new Promise((resolve) => setTimeout(resolve, 80));
      const rect = node.getBoundingClientRect();
      const width = rect.width || node.offsetWidth;
      const height = rect.height || node.offsetHeight;
      if (!width || !height) {
        throw new Error("The presentation page has no size yet — try again in a moment.");
      }
      const scale = exportScale(width);
      const dimensions = exportDimensions(width, height, scale);
      setBusy(`Rendering ${dimensions.width} × ${dimensions.height} px`);
      const { snapdom } = await import("@zumer/snapdom");
      const shot = await snapdom(node, { scale, dpr: 1, embedFonts: true });
      const canvas = await shot.toCanvas();
      setBusy("Encoding image");
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(
          resolve,
          format === "png" ? "image/png" : "image/jpeg",
          0.92,
        ),
      );
      canvas.width = 1;
      canvas.height = 1;
      if (!blob) throw new Error("This browser could not encode the presentation image.");
      downloadBlob(blob, presentationExportName(title, format));
      setDone(
        `${dimensions.width} × ${dimensions.height} px ${
          format === "png" ? "PNG" : "JPEG"
        } saved as ${presentationExportName(title, format)}.`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The presentation image could not be exported.",
      );
    } finally {
      setBusy(null);
    }
  };

  const stageNode = (
    <div
      ref={stageRef}
      data-detail-presentation={layout.id}
      data-background={backdrop.id}
      className="relative mx-auto w-full shadow-[0_24px_70px_rgba(24,20,16,0.16)]"
      style={{
        background: backdrop.css,
        color: backdrop.ink,
        padding: `${padPx}px`,
        maxWidth: 920,
      }}
    >
      {doc.views.length === 0 ? (
        <div
          data-empty-stage=""
          className="flex min-h-[260px] flex-col items-center justify-center gap-2 border border-dashed border-current/25 text-center"
        >
          <p style={{ fontSize: bodyPx, color: backdrop.sub }}>
            Add a detail view to compose your presentation.
          </p>
        </div>
      ) : (
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${layout.columns}, minmax(0,1fr))`,
            gap: `${gapPx}px`,
            justifyItems: doc.style.align,
          }}
        >
          {doc.views.map((view, index) => {
            const page = pageById.get(view.pageId);
            if (!page) return null;
            const hasCaption = doc.style.showTitles && Boolean(view.title || view.caption);
            return (
              <figure
                key={view.id}
                data-detail-view={view.id}
                data-view-kind={view.kind}
                data-view-index={index}
                className="relative m-0 min-w-0"
                style={{
                  gridColumn: `span ${spanFor(layout, index, doc.views.length)}`,
                  width: `${doc.style.size}%`,
                }}
              >
                <CropPlate
                  page={page}
                  view={view}
                  imageUrls={imageUrls}
                  rtl={Boolean(rtl)}
                  finishes={design.finishes}
                />
                {hasCaption && (
                  <figcaption
                    style={{ textAlign: doc.style.align, marginTop: gapPx * 0.55 }}
                  >
                    {view.title && (
                      <span
                        className="block font-ui uppercase"
                        style={{ fontSize: titlePx, letterSpacing: "0.16em", lineHeight: 1.4 }}
                      >
                        {view.title}
                      </span>
                    )}
                    {view.caption && (
                      <span
                        className="block"
                        style={{
                          fontSize: captionPx,
                          lineHeight: 1.55,
                          color: backdrop.sub,
                          marginTop: view.title ? Math.max(3, titlePx * 0.2) : 0,
                        }}
                      >
                        {view.caption}
                      </span>
                    )}
                  </figcaption>
                )}
                {selectedId === view.id && !busy && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -inset-1.5 border border-[#710014]/60"
                  />
                )}
              </figure>
            );
          })}
        </div>
      )}
    </div>
  );

  const focusSize = sourcePage ? pageSizeOf(sourcePage) : null;
  const focusNode = sourcePage && focusSize ? (
    <div className="mx-auto w-full max-w-[760px]">
      <div
        ref={focusRef}
        data-focus-frame=""
        className="relative w-full touch-none select-none shadow-[0_24px_70px_rgba(24,20,16,0.16)]"
        style={{
          aspectRatio: `${focusSize.width} / ${focusSize.height}`,
          cursor: focusMode ? "crosshair" : "default",
        }}
        onPointerDown={onFocusPointerDown}
        onPointerMove={onFocusPointerMove}
        onPointerUp={endFocusDrag}
        onPointerCancel={endFocusDrag}
      >
        <DesignStage width={focusSize.width} height={focusSize.height}>
          {() => (
            <DesignPageView
              page={sourcePage}
              time={100000}
              imageUrls={imageUrls}
              guestName={null}
              rtl={Boolean(rtl)}
              finishes={design.finishes}
              ignoreExit
            />
          )}
        </DesignStage>
        {selection && selection.w > 0 && selection.h > 0 && (
          <span
            aria-hidden
            data-focus-selection=""
            className="pointer-events-none absolute border-2 border-dashed border-[#710014] bg-[#710014]/10"
            style={{
              left: selection.x,
              top: selection.y,
              width: selection.w,
              height: selection.h,
            }}
          />
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-[380px] text-[10px] leading-relaxed text-ink/55">
          Drag across the invitation to frame your own detail. The crop is taken
          from the saved artwork at the page's own proportions.
        </p>
        <div className="flex gap-1.5">
          <Button
            type="button"
            size="sm"
            data-focus-commit
            disabled={!selection || selection.w < 12 || selection.h < 12}
            onClick={commitFocus}
            className="h-7 rounded-none text-[9px] uppercase tracking-[0.1em]"
          >
            Add focus view
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-focus-clear
            disabled={!selection}
            onClick={() => setSelection(null)}
            className="h-7 rounded-none text-[9px] uppercase tracking-[0.1em]"
          >
            Clear
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-focus-cancel
            onClick={() => {
              setFocusMode(false);
              setSelection(null);
            }}
            className="h-7 rounded-none text-[9px] uppercase tracking-[0.1em]"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <Dialog open={open} onOpenChange={(value) => !busy && onOpenChange(value)}>
      <DialogContent className="max-h-[94vh] gap-0 overflow-y-auto p-0 sm:max-w-[min(1280px,calc(100%_-_2rem))]">
        <DialogHeader className="border-b border-ink/12 px-4 py-3">
          <DialogTitle className="flex items-center gap-2 font-ui text-xl font-semibold tracking-[-0.01em]">
            <Presentation className="size-4 text-[var(--red)]" />
            Detail presentation
          </DialogTitle>
          <DialogDescription className="text-[11px] leading-relaxed text-ink/55">
            Close-up views of your saved invitation, composed as one editorial
            page and exported as a high-resolution image. Every crop is the real
            artwork — nothing here simulates foil, grain or embossing — and
            print-ready PDFs stay under Export.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col lg:grid lg:grid-cols-[264px_minmax(0,1fr)_280px] lg:items-start">
          {/* ---------------------------------------------------------------- */}
          {/* Views                                                            */}
          {/* ---------------------------------------------------------------- */}
          <aside className="order-2 border-t border-ink/12 lg:order-1 lg:max-h-[calc(94vh-108px)] lg:border-t-0 lg:border-r lg:overflow-y-auto">
            <Section title="Add views">
              <label className="block">
                <span className="mb-1 block text-[10px] text-ink/55">Source page</span>
                <Select
                  value={sourcePage?.id ?? ""}
                  onValueChange={(value) => {
                    setSourcePageId(value);
                    setHint(null);
                  }}
                >
                  <SelectTrigger className="h-8 text-[11px]">
                    <SelectValue placeholder="Page" />
                  </SelectTrigger>
                  <SelectContent>
                    {pages.map((page) => (
                      <SelectItem key={page.id} value={page.id}>
                        {page.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <div className="grid grid-cols-2 gap-1.5">
                {DETAIL_VIEW_KINDS.filter((kind) => kind.id !== "focus").map((kind) => {
                  const Icon = VIEW_ICONS[kind.id];
                  const available = sourcePage
                    ? detailViewsFor(kind.id, sourcePage, 3).length > 0
                    : false;
                  return (
                    <button
                      key={kind.id}
                      type="button"
                      data-add-view={kind.id}
                      title={kind.note}
                      disabled={!available}
                      onClick={() => addViews(kind.id)}
                      className={cn(
                        "flex items-center gap-1.5 border px-2 py-1.5 text-left text-[9px] uppercase tracking-[0.06em] transition-colors",
                        available
                          ? "border-ink/20 bg-[var(--paper-light)] text-ink/70 hover:border-ink hover:text-ink"
                          : "border-ink/10 text-ink/30",
                      )}
                    >
                      <Icon className="size-3 shrink-0" />
                      {kindLabel(kind.id).replace(" Detail", "")}
                    </button>
                  );
                })}
              </div>

              <Button
                type="button"
                variant="outline"
                data-focus-start
                disabled={!sourcePage}
                onClick={() => {
                  setFocusMode(true);
                  setSelection(null);
                  setHint(null);
                }}
                className={cn(
                  "h-8 w-full rounded-none text-[9px] uppercase tracking-[0.1em]",
                  focusMode && "border-[var(--red)] text-[var(--red)]",
                )}
              >
                <Crop className="size-3.5" /> Custom focus
              </Button>

              {hint && (
                <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-ink/55">
                  <AlertCircle className="mt-0.5 size-3 shrink-0" /> {hint}
                </p>
              )}
            </Section>

            <Section title={`Presentation · ${doc.views.length}`}>
              {doc.views.length === 0 ? (
                <p className="text-[10px] leading-relaxed text-ink/50">
                  No views yet. Add one above, or draw a custom focus on the
                  invitation.
                </p>
              ) : (
                <div className="space-y-1">
                  {doc.views.map((view, index) => {
                    const Icon = VIEW_ICONS[view.kind];
                    return (
                      <div
                        key={view.id}
                        data-view-row={view.id}
                        data-view-index={index}
                        className={cn(
                          "flex items-center gap-1.5 border px-2 py-1.5 transition-colors",
                          selectedId === view.id
                            ? "border-[var(--red)]/55 bg-[var(--red)]/5"
                            : "border-ink/15",
                        )}
                      >
                        <button
                          type="button"
                          data-select-view={view.id}
                          onClick={() => setSelectedId(view.id)}
                          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                        >
                          <Icon className="size-3 shrink-0 text-ink/45" />
                          <span className="min-w-0">
                            <span className="block truncate text-[10px] text-ink/80">
                              {view.title || kindLabel(view.kind)}
                            </span>
                            <span className="block truncate text-[8px] uppercase tracking-[0.08em] text-ink/40">
                              {pageById.get(view.pageId)?.name}
                            </span>
                          </span>
                        </button>
                        <span className="flex shrink-0 items-center">
                          <IconAction
                            label="Move up"
                            action="up"
                            disabled={index === 0}
                            onClick={() => reorder(view.id, -1)}
                          >
                            <ArrowUp className="size-3" />
                          </IconAction>
                          <IconAction
                            label="Move down"
                            action="down"
                            disabled={index === doc.views.length - 1}
                            onClick={() => reorder(view.id, 1)}
                          >
                            <ArrowDown className="size-3" />
                          </IconAction>
                          <IconAction
                            label="Remove view"
                            action="remove"
                            onClick={() => remove(view.id)}
                          >
                            <X className="size-3" />
                          </IconAction>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>

            {selected && (
              <Section title="Selected view">
                <label className="block">
                  <span className="mb-1 block text-[10px] text-ink/55">Title</span>
                  <Input
                    data-view-title
                    value={selected.title}
                    maxLength={120}
                    placeholder="Optional title"
                    onChange={(event) =>
                      apply(updateView(doc, selected.id, { title: event.target.value }))
                    }
                    className="h-8 text-[11px]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] text-ink/55">Short description</span>
                  <Textarea
                    data-view-caption
                    value={selected.caption}
                    maxLength={280}
                    rows={2}
                    placeholder="A short line about this detail"
                    onChange={(event) =>
                      apply(updateView(doc, selected.id, { caption: event.target.value }))
                    }
                    className="text-[11px]"
                  />
                </label>
                <p className="text-[9px] leading-relaxed text-ink/40">
                  Crop {Math.round(selected.region.w)} × {Math.round(selected.region.h)} units
                  on {pageById.get(selected.pageId)?.name} — the saved artwork, unretouched.
                </p>
              </Section>
            )}
          </aside>

          {/* ---------------------------------------------------------------- */}
          {/* Stage                                                            */}
          {/* ---------------------------------------------------------------- */}
          <main className="order-1 px-4 py-4 lg:order-2 lg:px-6 lg:py-5">
            {focusMode ? focusNode : stageNode}
            <p className="mx-auto mt-3 max-w-[760px] text-center text-[9px] leading-relaxed text-ink/45">
              {focusMode
                ? "Custom focus · nothing is drawn or generated, the crop only selects the saved page."
                : `Live preview · ${layout.label} · ${doc.views.length} view${
                    doc.views.length === 1 ? "" : "s"
                  }${
                    exportDims
                      ? ` · exports at ${exportDims.width} × ${exportDims.height} px`
                      : ""
                  }.`}
            </p>
          </main>

          {/* ---------------------------------------------------------------- */}
          {/* Composer                                                         */}
          {/* ---------------------------------------------------------------- */}
          <aside className="order-3 border-t border-ink/12 lg:max-h-[calc(94vh-108px)] lg:border-t-0 lg:border-l lg:overflow-y-auto">
            <Section title="Layout">
              <div className="grid grid-cols-2 gap-1.5">
                {PRESENTATION_LAYOUTS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    data-layout-option={item.id}
                    title={item.note}
                    aria-pressed={layout.id === item.id}
                    onClick={() => apply(withStyle(doc, { layoutId: item.id }))}
                    className={cn(
                      "border px-2 py-1.5 text-left text-[9px] uppercase tracking-[0.06em] transition-colors",
                      layout.id === item.id
                        ? "border-ink bg-ink text-[#f2f1ed]"
                        : "border-ink/20 bg-[var(--paper-light)] text-ink/60 hover:border-ink",
                    )}
                  >
                    {item.label}
                    <span className="mt-0.5 block text-[8px] leading-tight normal-case tracking-normal opacity-70">
                      {item.note}
                    </span>
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Composition">
              <label className="block">
                <span className="mb-1 block text-[10px] text-ink/55">
                  Image size {doc.style.size}
                </span>
                <Slider
                  value={[doc.style.size]}
                  min={40}
                  max={100}
                  step={1}
                  onValueChange={([value]) => apply(withStyle(doc, { size: value }))}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] text-ink/55">
                  Spacing {doc.style.gap}
                </span>
                <Slider
                  value={[doc.style.gap]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={([value]) => apply(withStyle(doc, { gap: value }))}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] text-ink/55">
                  Margins {doc.style.margin}
                </span>
                <Slider
                  value={[doc.style.margin]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={([value]) => apply(withStyle(doc, { margin: value }))}
                />
              </label>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-ink/55">Alignment</span>
                <span className="ml-auto flex gap-1">
                  {(
                    [
                      ["start", AlignLeft, "Align left"],
                      ["center", AlignCenter, "Align centre"],
                      ["end", AlignRight, "Align right"],
                    ] as const
                  ).map(([value, Icon, label]) => (
                    <button
                      key={value}
                      type="button"
                      data-align-option={value}
                      aria-label={label}
                      title={label}
                      aria-pressed={doc.style.align === value}
                      onClick={() => apply(withStyle(doc, { align: value }))}
                      className={cn(
                        "grid size-7 place-items-center border transition-colors",
                        doc.style.align === value
                          ? "border-ink bg-ink text-[#f2f1ed]"
                          : "border-ink/20 text-ink/55 hover:border-ink",
                      )}
                    >
                      <Icon className="size-3.5" />
                    </button>
                  ))}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-ink/60">Titles &amp; captions</span>
                <Switch
                  data-show-titles
                  checked={doc.style.showTitles}
                  onCheckedChange={(value) => apply(withStyle(doc, { showTitles: value }))}
                />
              </div>
            </Section>

            <Section title="Background">
              <div className="flex flex-wrap gap-1.5">
                {PRESENTATION_BACKDROPS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    title={item.label}
                    data-background-option={item.id}
                    aria-pressed={backdrop.id === item.id}
                    onClick={() => apply(withStyle(doc, { backgroundId: item.id }))}
                    className={cn(
                      "size-8 rounded-full border shadow-[var(--shadow-xs)]",
                      backdrop.id === item.id
                        ? "border-ink ring-1 ring-ink/40"
                        : "border-ink/20",
                    )}
                    style={{ background: item.css }}
                  />
                ))}
              </div>
              <p className="text-[9px] leading-relaxed text-ink/40">
                Flat, restrained grounds only — no gradients or simulated paper.
              </p>
            </Section>

            <div className="space-y-2 p-4">
              <p className="text-[9px] uppercase tracking-[0.12em] text-ink/45">
                Export
              </p>
              <p data-export-dimensions className="text-[10px] text-ink/70">
                {exportDims
                  ? `${exportDims.width} × ${exportDims.height} px`
                  : "Measuring page…"}
              </p>
              {error && (
                <p
                  data-export-error
                  className="flex items-start gap-1.5 border border-[var(--red)]/30 bg-[var(--red)]/5 p-2 text-[10px] leading-relaxed text-[var(--red)]"
                >
                  <AlertCircle className="mt-0.5 size-3 shrink-0" /> {error}
                </p>
              )}
              {busy && (
                <p data-export-busy className="flex items-center gap-1.5 text-[10px] text-ink/60">
                  <Loader2 className="size-3 animate-spin" /> {busy}
                </p>
              )}
              {done && !busy && (
                <p data-export-done className="flex items-start gap-1.5 text-[10px] leading-relaxed text-ink/60">
                  <Check className="mt-0.5 size-3 shrink-0 text-[var(--red)]" /> {done}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  data-export="png"
                  onClick={() => void exportPresentation("png")}
                  disabled={Boolean(busy)}
                  className="h-8 rounded-none text-[9px] uppercase tracking-[0.12em]"
                >
                  {busy ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Download className="size-3.5" />
                  )}
                  PNG
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  data-export="jpeg"
                  onClick={() => void exportPresentation("jpeg")}
                  disabled={Boolean(busy)}
                  className="h-8 rounded-none text-[9px] uppercase tracking-[0.12em]"
                >
                  <Download className="size-3.5" /> JPEG
                </Button>
              </div>
              <p className="text-[9px] leading-relaxed text-ink/35">
                Presentation images download as{" "}
                <span className="font-medium">…-presentation.png</span> /{" "}
                <span className="font-medium">…-presentation.jpg</span> — high-resolution
                screen exports of this composed page, completely separate from the
                print-ready invitation PDF. Views and layout are saved on this device
                and never alter the design.
              </p>
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
