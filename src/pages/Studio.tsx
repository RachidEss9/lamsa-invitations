import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Wordmark } from "@/components/brand/Wordmark";
import { ClosingStage } from "@/components/invitation/ClosingStage";
import { DesignPageView, DesignStage } from "@/components/invitation/DesignPageView";
import { OpeningStage } from "@/components/invitation/OpeningStage";
import { GuestExperience } from "@/components/studio/GuestExperience";
import { SequentialGuestPreview } from "@/components/studio/SequentialGuestPreview";
import { ColourPanel } from "@/components/studio/ColourPanel";
import { Inspector } from "@/components/studio/Inspector";
import { LayersPanel } from "@/components/studio/LayersPanel";
import {
  LibraryPanel,
  ShapePreview,
  type LibraryTab,
} from "@/components/studio/LibraryPanel";
import { FrameThumb } from "@/components/invitation/FrameArt";
import { OpeningDesigner } from "@/components/studio/OpeningDesigner";
import { PrintExportDialog } from "@/components/studio/PrintExportDialog";
import { ShareStyleDialog } from "@/components/studio/ShareStyleDialog";
import { SuiteBar } from "@/components/studio/SuiteBar";
import { StudioCanvas, type CanvasContextAction } from "@/components/studio/StudioCanvas";
import { ShortcutReference } from "@/components/studio/ShortcutReference";
import { Timeline } from "@/components/studio/Timeline";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  CLOSING_STYLES,
  OPENING_EXPERIENCES,
  PAGE_TRANSITIONS,
  PAGE_TRANSITIONS as TRANSITIONS,
  applyStylePreset,
  clipsForPage,
  defaultAnimation,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  duplicateElements,
  makeElement,
  makeId,
  normalizeDesign,
  pageSizeOf,
  resizePage,
  toDesignPx,
  PAGE_RESIZE_MODES,
  SHAPES,
  timelineDuration,
  type ClosingSettings,
  type DesignDocument,
  type DesignElement,
  type DesignPage,
  type ElementAnimation,
  type OpeningSettings,
  type PageResizeMode,
  type StylePreset,
} from "@/lib/design";
import {
  MOTIFS,
  contentFromInvitation,
  type InvitationContent,
} from "@/lib/invitation";
import { FRAMES, frameBounds, frameLayerIndex, type FrameSpec } from "@/lib/frames";
import { pageLayoutById } from "@/lib/layouts";
import { ensureFont, fontById } from "@/lib/fonts";
import {
  PALETTES,
  readSavedPalettes,
  recolourDesign,
  type ColourPalette,
} from "@/lib/palettes";
import { recolourSelection } from "@/lib/library-colour";
import {
  activePiece,
  addPiece,
  addPageToSuite,
  deletePiece,
  duplicatePiece,
  movePiece,
  pieceForPage,
  piecePages,
  pieceRange,
  removePageFromSuite,
  renamePiece,
  selectPiece,
  setGuestVisible,
  shareStyles,
  suiteOf,
  updateEnvelopeGeometry,
  updatePiecePrint,
  type PieceKind,
  type PiecePrint,
  type ShareStyleOptions,
} from "@/lib/suite";
import {
  ENVELOPE_PRESETS,
  FLAP_SHAPES,
  defaultEnvelopeGeometry,
  envelopePresetFor,
  linerSizeFor,
  type EnvelopeGeometry,
  type FlapShape,
} from "@/lib/envelope";
import {
  MATERIAL_SCOPE_NOTE,
  supportsMaterial,
  type LayerMaterial,
  type MaterialId,
} from "@/lib/materials";
import type { BuiltinAsset } from "@/lib/assets";
import type { RevealPreset } from "@/lib/reveals";
import {
  isDeletable,
  pushHistory,
  redoHistory,
  removeElements,
  selectionAfterDelete,
  undoHistory,
} from "@/lib/studio-edit";
import { applyTypeStyle, type TypeStyle } from "@/lib/type-styles";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  FileText,
  Frame,
  Grid2x2,
  Heart,
  History,
  Image as ImageIcon,
  Layers,
  Layout,
  Library,
  Keyboard,
  Loader2,
  Lock,
  Mail,
  Minus,
  Monitor,
  Palette,
  PanelLeft,
  PanelRight,
  Play,
  Plus,
  Redo2,
  Ruler,
  Shapes,
  Share2,
  Smartphone,
  Sparkles,
  Tablet,
  Trash2,
  Type,
  Undo2,
  Unlock,
} from "lucide-react";
import React from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";

type SaveState = "saved" | "saving" | "unsaved" | "error";
type Device = "desktop" | "tablet" | "phone";
type LeftPanel = "add" | "layers" | "colour" | "opening" | "pages";
type MobileSheet = null | "add" | "layers" | "colour" | "properties" | "pages" | "timeline";

const DEVICE_WIDTH: Record<Device, string> = {
  desktop: "100%",
  tablet: "min(100%, 820px)",
  phone: "min(100%, 430px)",
};

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

function PanelHeading({ title, note }: { title: string; note?: string }) {
  return (
    <div className="border-b border-[var(--edge)] px-4 py-3">
      <p className="section-label">{title}</p>
      {note && (
        <p className="mt-1 font-ui text-[0.68rem] leading-relaxed text-ink/50">
          {note}
        </p>
      )}
    </div>
  );
}

function AddButton({
  icon: Icon,
  label,
  note,
  onClick,
}: {
  icon: typeof Type;
  label: string;
  note: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pressable group flex w-full items-center gap-2.5 rounded-[var(--radius-tile)] border border-[var(--edge)] bg-[var(--surface-card)] px-2.5 py-2 text-left shadow-[var(--shadow-xs)] transition-[border-color,box-shadow,transform] duration-150 hover:border-[var(--edge-strong)] hover:shadow-[var(--shadow-card)]"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--paper-deep)]/70 text-[var(--red)]">
        <Icon className="size-[16px] stroke-[1.7px]" />
      </span>
      <span className="min-w-0">
        <span className="block font-ui text-[0.72rem] font-medium leading-tight text-ink">
          {label}
        </span>
        <span className="mt-0.5 block font-ui text-[0.62rem] leading-relaxed text-ink/45">
          {note}
        </span>
      </span>
    </button>
  );
}

export default function Studio() {
  const { id } = useParams<{ id: string }>();
  const idIsValid = /^[a-z0-9]{26,32}$/.test(id ?? "");
  const invitationId = (id ?? "") as Id<"invitations">;
  const navigate = useNavigate();

  const invitation = useQuery(
    api.invitations.getMine,
    idIsValid ? { id: invitationId } : "skip",
  );
  const saveDesignMutation = useMutation(api.invitations.saveDesign);
  const duplicateInvitation = useMutation(api.invitations.duplicate);
  const publishInvitation = useMutation(api.invitations.publish);
  const unpublishInvitation = useMutation(api.invitations.unpublish);
  const generateUploadUrl = useMutation(api.library.generateUploadUrl);
  const saveDesignVersionMutation = useMutation(api.invitations.saveDesignVersion);
  const restoreDesignVersionMutation = useMutation(
    api.invitations.restoreDesignVersion,
  );

  const [design, setDesignState] = useState<DesignDocument | null>(null);
  const designRef = useRef<DesignDocument | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [device, setDevice] = useState<Device>("desktop");
  // Drawing aids are per-browser preferences, not part of the invitation, so
  // they live here and never touch the saved design.
  const [overlays, setOverlays] = useState<{
    grid: boolean;
    rulers: boolean;
    safe: boolean;
  }>(() => {
    const fallback = { grid: false, rulers: false, safe: false };
    if (typeof window === "undefined") return fallback;
    try {
      const raw = JSON.parse(
        window.localStorage.getItem("lamsa.canvas.overlays") ?? "null",
      ) as Partial<typeof fallback> | null;
      if (!raw || typeof raw !== "object") return fallback;
      return {
        grid: Boolean(raw.grid),
        rulers: Boolean(raw.rulers),
        safe: Boolean(raw.safe),
      };
    } catch {
      return fallback;
    }
  });
  const toggleOverlay = (key: keyof typeof overlays) =>
    setOverlays((current) => {
      const next = { ...current, [key]: !current[key] };
      try {
        window.localStorage.setItem("lamsa.canvas.overlays", JSON.stringify(next));
      } catch {
        // Losing a drawing-aid preference is harmless.
      }
      return next;
    });
  const [aspectLocked, setAspectLocked] = useState(false);
  /**
   * Material Preview draws the studio's paper, foil and relief simulations;
   * Artwork mode is the clean, print-true card the export pipeline captures.
   * It is a viewing preference like the grid or the rulers — never saved into
   * the invitation, and never changing a single pixel of the design.
   */
  const [materialPreview, setMaterialPreview] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      return window.localStorage.getItem("lamsa.canvas.materials") !== "artwork";
    } catch {
      return true;
    }
  });
  const setMaterialMode = useCallback((preview: boolean) => {
    setMaterialPreview(preview);
    try {
      window.localStorage.setItem(
        "lamsa.canvas.materials",
        preview ? "materials" : "artwork",
      );
    } catch {
      // Losing a viewing preference is harmless.
    }
  }, []);
  const [showHidden, setShowHidden] = useState(true);
  const [revealPreview, setRevealPreview] = useState<Set<string>>(new Set());
  const [leftPanel, setLeftPanel] = useState<LeftPanel>("add");
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [timelineOpen, setTimelineOpen] = useState(true);
  const [pixelsPerSecond, setPixelsPerSecond] = useState(80);
  const [librariesOpen, setLibrariesOpen] = useState(false);
  const [libraryTab, setLibraryTab] = useState<LibraryTab>("templates");
  const [guestOpen, setGuestOpen] = useState(false);
  const [timelinePreviewOpen, setTimelinePreviewOpen] = useState(false);
  const [mobileSheet, setMobileSheet] = useState<MobileSheet>(null);
  const [pendingTemplate, setPendingTemplate] = useState<{
    design: DesignDocument;
    name: string;
  } | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareStyleOpen, setShareStyleOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [openingPreview, setOpeningPreview] = useState(0);
  const [showOpeningPreview, setShowOpeningPreview] = useState(false);
  const [showOpeningDesigner, setShowOpeningDesigner] = useState(false);
  const [showClosingPreview, setShowClosingPreview] = useState(false);
  const [closingPreviewKey, setClosingPreviewKey] = useState(0);
  const [localImageUrls, setLocalImageUrls] = useState<Record<string, string>>({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const [historyTick, setHistoryTick] = useState(0);
  const [historyFlags, setHistoryFlags] = useState({ undo: false, redo: false });
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [variationsOpen, setVariationsOpen] = useState(false);
  const [variationBusy, setVariationBusy] = useState<string | null>(null);
  const [versionBusy, setVersionBusy] = useState(false);
  const designVersions = useQuery(
    api.invitations.listDesignVersions,
    historyOpen && idIsValid ? { id: invitationId } : "skip",
  );
  const [resetViewToken, setResetViewToken] = useState(0);
  const [editTextRequest, setEditTextRequest] = useState<{
    id: string;
    token: number;
  } | null>(null);
  // True while a text layer is being edited on the canvas. Delete is disabled
  // then, so a careless Backspace can never destroy the layer being typed into.
  const [canvasEditing, setCanvasEditing] = useState(false);
  const [resizeMode, setResizeMode] = useState<PageResizeMode>("fit");
  /** Units the envelope brief is typed in. Millimetres is how paper is sold. */
  const [envelopeUnit, setEnvelopeUnit] = useState<"mm" | "in">("mm");
  const [sizeDraft, setSizeDraft] = useState({ width: DESIGN_WIDTH, height: DESIGN_HEIGHT });

  const pastRef = useRef<DesignDocument[]>([]);
  const futureRef = useRef<DesignDocument[]>([]);
  const gestureStart = useRef<DesignDocument | null>(null);
  const hydratedRef = useRef<string | null>(null);
  const saveTimer = useRef<number | null>(null);
  const saveVersion = useRef(0);
  const timeRef = useRef(0);
  const clipboardRef = useRef<DesignElement[]>([]);
  const imageFileRef = useRef<HTMLInputElement | null>(null);

  const content = useMemo(
    () => (invitation ? contentFromInvitation(invitation as unknown as InvitationContent) : null),
    [invitation],
  );

  const imageUrls = useMemo(
    () => ({
      ...(invitation?.designImageUrls ?? {}),
      ...localImageUrls,
    }),
    [invitation?.designImageUrls, localImageUrls],
  );

  const persistDesign = useCallback(
    async (next: DesignDocument) => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      const version = saveVersion.current + 1;
      saveVersion.current = version;
      setSaveState("saving");
      try {
        await saveDesignMutation({ id: invitationId, design: next });
        if (version === saveVersion.current) setSaveState("saved");
        return true;
      } catch (error) {
        if (version === saveVersion.current) {
          setSaveState("error");
          toast.error(messageOf(error));
        }
        return false;
      }
    },
    [invitationId, saveDesignMutation],
  );

  const scheduleSave = useCallback(
    (next: DesignDocument) => {
      setSaveState("unsaved");
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        void persistDesign(next);
      }, 800);
    },
    [persistDesign],
  );

  /** A named bookmark the host creates from the history dialog. */
  const snapshotVersion = useCallback(async () => {
    if (versionBusy) return;
    setVersionBusy(true);
    try {
      await saveDesignVersionMutation({ id: invitationId });
      toast.success("Version saved.");
    } catch (error) {
      toast.error(messageOf(error));
    } finally {
      setVersionBusy(false);
    }
  }, [invitationId, saveDesignVersionMutation, versionBusy]);

  /**
   * Replaces the canvas with a saved snapshot. The server keeps the state that
   * was replaced, and the local undo stack is cleared because the restored
   * document is now the starting point.
   */
  /**
   * A colour variation is a whole new invitation: the design is duplicated,
   * recoloured onto the chosen palette and saved as a draft. The source is
   * never written to, so comparing two treatments costs nothing but a record.
   */
  const createVariation = useCallback(
    async (palette: ColourPalette) => {
      if (!design || variationBusy) return;
      setVariationBusy(palette.id);
      try {
        const copyId = await duplicateInvitation({ id: invitationId });
        await saveDesignMutation({
          id: copyId,
          design: recolourDesign(design, palette),
        });
        toast.success(`“${palette.name}” variation filed as a new draft.`);
        setVariationsOpen(false);
        navigate(`/studio/${copyId}`);
      } catch (error) {
        toast.error(messageOf(error));
      } finally {
        setVariationBusy(null);
      }
    },
    [
      design,
      duplicateInvitation,
      invitationId,
      navigate,
      saveDesignMutation,
      variationBusy,
    ],
  );

  const variationPalettes = useMemo<ColourPalette[]>(() => {
    const saved = readSavedPalettes().map((palette) => ({
      ...palette,
      group: "Saved",
    }));
    return [...saved, ...PALETTES];
  }, []);

  const restoreVersion = useCallback(
    async (versionId: Id<"designVersions">) => {
      if (versionBusy || !content) return;
      setVersionBusy(true);
      try {
        if (saveTimer.current) {
          window.clearTimeout(saveTimer.current);
          saveTimer.current = null;
          if (designRef.current) await persistDesign(designRef.current);
        }
        const restored = await restoreDesignVersionMutation({
          id: invitationId,
          versionId,
        });
        const next = normalizeDesign(restored, content);
        designRef.current = next;
        setDesignState(next);
        setSelectedIds([]);
        setPageIndex(0);
        pastRef.current = [];
        futureRef.current = [];
        setHistoryFlags({ undo: false, redo: false });
        setHistoryTick((tick) => tick + 1);
        setSaveState("saved");
        hydratedRef.current = invitationId;
        toast.success("Version restored.");
        setHistoryOpen(false);
      } catch (error) {
        toast.error(messageOf(error));
      } finally {
        setVersionBusy(false);
      }
    },
    [
      content,
      invitationId,
      persistDesign,
      restoreDesignVersionMutation,
      versionBusy,
    ],
  );

  // Hydrate the studio once per invitation. Older invitations with no canvas
  // get a complete starter design built from their existing words, then saved
  // so the public page can render the same document.
  useEffect(() => {
    if (!invitation || !content || hydratedRef.current === invitation._id) return;
    hydratedRef.current = invitation._id;
    const next = normalizeDesign(invitation.design, content);
    designRef.current = next;
    setDesignState(next);
    setPageIndex(0);
    setSelectedIds([]);
    setTime(0);
    timeRef.current = 0;
    pastRef.current = [];
    futureRef.current = [];
    setHistoryFlags({ undo: false, redo: false });
    setSaveState("saved");
    if (!invitation.design) {
      // Deferred so hydration never triggers a synchronous cascading update.
      window.setTimeout(() => void persistDesign(next), 0);
    }
  }, [content, invitation, persistDesign]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (saveState === "unsaved" || saveState === "saving" || saveState === "error") {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [saveState]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = null;
        if (designRef.current) void persistDesign(designRef.current);
      }
    };
  }, [persistDesign]);

  const apply = useCallback(
    (updater: (current: DesignDocument) => DesignDocument) => {
      const current = designRef.current;
      if (!current) return;
      const next = updater(current);
      if (next === current) return;
      pastRef.current = pushHistory(pastRef.current, current);
      futureRef.current = [];
      designRef.current = next;
      setDesignState(next);
      scheduleSave(next);
      setHistoryFlags({ undo: true, redo: false });
      setHistoryTick((tick) => tick + 1);
      gestureStart.current = null;
    },
    [scheduleSave],
  );

  // A drag produces a change per pointer move. Those changes must collapse
  // into one undo step, so a gesture records the design once and commits it on
  // pointer up instead of pushing a hundred near-identical snapshots.
  const applyGesture = useCallback(
    (updater: (current: DesignDocument) => DesignDocument) => {
      const current = designRef.current;
      if (!current) return;
      if (!gestureStart.current) gestureStart.current = current;
      const next = updater(current);
      if (next === current) return;
      designRef.current = next;
      setDesignState(next);
      scheduleSave(next);
    },
    [scheduleSave],
  );

  const gestureElements = useCallback(
    (updater: (elements: DesignElement[]) => DesignElement[]) => {
      applyGesture((current) => ({
        ...current,
        pages: current.pages.map((candidate, index) =>
          index === pageIndex
            ? { ...candidate, elements: updater(candidate.elements) }
            : candidate,
        ),
      }));
    },
    [applyGesture, pageIndex],
  );

  const finishGesture = useCallback(() => {
    const start = gestureStart.current;
    gestureStart.current = null;
    if (!start || !designRef.current || start === designRef.current) return;
    pastRef.current = pushHistory(pastRef.current, start);
    futureRef.current = [];
    setHistoryFlags({ undo: true, redo: false });
    setHistoryTick((tick) => tick + 1);
  }, []);

  useEffect(() => {
    const end = () => finishGesture();
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [finishGesture]);

  const undo = useCallback(() => {
    const current = designRef.current;
    if (!current) return;
    const step = undoHistory(
      { past: pastRef.current, future: futureRef.current },
      current,
    );
    if (!step) return;
    pastRef.current = step.stacks.past;
    futureRef.current = step.stacks.future;
    designRef.current = step.snapshot;
    setDesignState(step.snapshot);
    scheduleSave(step.snapshot);
    setHistoryFlags({
      undo: step.stacks.past.length > 0,
      redo: true,
    });
    setHistoryTick((tick) => tick + 1);
  }, [scheduleSave]);

  const redo = useCallback(() => {
    const current = designRef.current;
    if (!current) return;
    const step = redoHistory(
      { past: pastRef.current, future: futureRef.current },
      current,
    );
    if (!step) return;
    pastRef.current = step.stacks.past;
    futureRef.current = step.stacks.future;
    designRef.current = step.snapshot;
    setDesignState(step.snapshot);
    scheduleSave(step.snapshot);
    setHistoryFlags({
      undo: true,
      redo: step.stacks.future.length > 0,
    });
    setHistoryTick((tick) => tick + 1);
  }, [scheduleSave]);

  const page: DesignPage | null = design?.pages[Math.min(pageIndex, design.pages.length - 1)] ?? null;
  const duration = page ? timelineDuration(page) : 4000;
  const clips = page ? clipsForPage(page) : [];
  const selected = page
    ? page.elements.filter((element) => selectedIds.includes(element.id))
    : [];
  const deletableSelection = selected.filter(isDeletable);
  const canDeleteSelection = !canvasEditing && deletableSelection.length > 0;

  // Pictures and decorative frames keep their proportions when resized, so a
  // portrait can never be squashed by accident. The inspector switch still
  // unlocks the ratio deliberately, and text keeps its free box resizing.
  const aspectDefaultKey = selectedIds.length === 1 ? selectedIds[0] : "";
  useEffect(() => {
    if (!aspectDefaultKey) return;
    const current = designRef.current;
    const element = current?.pages[pageIndex]?.elements.find(
      (candidate) => candidate.id === aspectDefaultKey,
    );
    if (!element) return;
    setAspectLocked(element.kind === "image" || Boolean(element.frameArt));
  }, [aspectDefaultKey, pageIndex]);

  const selectedAnimations = selected.map((element) => element.animation);
  const published = invitation?.status === "published";
  const publicLink = invitation ? `${window.location.origin}/i/${invitation.slug}` : "";

  const seek = useCallback((value: number) => {
    timeRef.current = value;
    setTime(value);
    setAnimating(true);
    setPlaying(false);
  }, []);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      const next = timeRef.current + delta;
      if (next >= duration) {
        timeRef.current = duration;
        setTime(duration);
        setPlaying(false);
        return;
      }
      timeRef.current = next;
      setTime(next);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, playing]);

  useEffect(() => {
    // Page changes start from the top and never replay the opening.
    timeRef.current = 0;
    const frame = requestAnimationFrame(() => {
      setTime(0);
      setPlaying(false);
      setAnimating(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [pageIndex]);

  const patchElement = useCallback(
    (elementId: string, patch: Partial<DesignElement>) => {
      apply((current) => ({
        ...current,
        pages: current.pages.map((candidate, index) =>
          index === pageIndex
            ? {
                ...candidate,
                elements: candidate.elements.map((element) =>
                  element.id === elementId ? { ...element, ...patch } : element,
                ),
              }
            : candidate,
        ),
      }));
    },
    [apply, pageIndex],
  );

  const patchPage = useCallback(
    (patch: Partial<DesignPage>) => {
      apply((current) => ({
        ...current,
        pages: current.pages.map((candidate, index) =>
          index === pageIndex ? { ...candidate, ...patch } : candidate,
        ),
      }));
    },
    [apply, pageIndex],
  );

  const setPageElements = useCallback(
    (updater: (elements: DesignElement[]) => DesignElement[]) => {
      apply((current) => ({
        ...current,
        pages: current.pages.map((candidate, index) =>
          index === pageIndex
            ? { ...candidate, elements: updater(candidate.elements) }
            : candidate,
        ),
      }));
    },
    [apply, pageIndex],
  );

  // The size fields follow the page they belong to until the host types.
  const currentSize = pageSizeOf(page);
  const [sizeTouched, setSizeTouched] = useState(false);
  const sizeDraftValue = sizeTouched ? sizeDraft : currentSize;

  const applyCanvasSize = useCallback(
    (target = sizeDraftValue) => {
      apply((current) => ({
        ...current,
        pages: current.pages.map((candidate, index) =>
          index === pageIndex
            ? resizePage(candidate, target, resizeMode)
            : candidate,
        ),
      }));
      setSizeTouched(false);
      setSizeDraft(target);
      toast.success(
        resizeMode === "preserve"
          ? "Page resized. Your layers are untouched."
          : `Page resized — artwork ${resizeMode === "fit" ? "fitted" : "stretched"}.`,
      );
    },
    [apply, pageIndex, resizeMode, sizeDraftValue],
  );

  const setDeviceCanvasSize = useCallback(
    (orientation: "portrait" | "landscape") => {
      const source = sizeDraftValue;
      const next =
        orientation === "portrait"
          ? { width: Math.min(source.width, source.height), height: Math.max(source.width, source.height) }
          : { width: Math.max(source.width, source.height), height: Math.min(source.width, source.height) };
      setSizeDraft(next);
      setSizeTouched(true);
      applyCanvasSize(next);
    },
    [applyCanvasSize, sizeDraftValue],
  );

  /* ---------------------------------------------------------------------- */
  /* Stationery suite: pieces, coordinated styles, envelope briefs          */
  /* ---------------------------------------------------------------------- */

  const currentPiece = design
    ? (page ? pieceForPage(design, page.id) : null) ?? activePiece(design)
    : null;

  const pieceNameOf = (document: DesignDocument, pieceId: string) =>
    suiteOf(document).find((piece) => piece.id === pieceId)?.name ?? "Piece";

  const addSuitePiece = useCallback(
    (kind: PieceKind) => {
      const source = designRef.current;
      if (!source) return;
      const result = addPiece(source, kind, { afterPieceId: currentPiece?.id });
      if (result.error || !result.design) {
        toast.error(result.error ?? "That piece could not be added.");
        return;
      }
      apply(() => result.design);
      setPageIndex(result.pageIndex);
      setSelectedIds([]);
      toast.success(`“${pieceNameOf(result.design, result.pieceId)}” added to the suite.`);
    },
    [apply, currentPiece],
  );

  const duplicateSuitePiece = useCallback(() => {
    const source = designRef.current;
    const piece = source ? activePiece(source) : null;
    if (!source || !piece) return;
    const result = duplicatePiece(source, piece.id);
    if (result.error || !result.design) {
      toast.error(result.error ?? "That piece could not be duplicated.");
      return;
    }
    apply(() => result.design);
    setPageIndex(result.pageIndex);
    setSelectedIds([]);
    toast.success(`“${pieceNameOf(result.design, result.pieceId)}” created.`);
  }, [apply]);

  const removeSuitePiece = useCallback(() => {
    const source = designRef.current;
    const piece = source ? activePiece(source) : null;
    if (!source || !piece) return;
    const result = deletePiece(source, piece.id);
    if (result.error || !result.design) {
      toast.error(result.error ?? "That piece could not be removed.");
      return;
    }
    apply(() => result.design);
    setPageIndex(result.pageIndex);
    setSelectedIds([]);
    toast.success(`“${piece.name}” removed. Undo restores it.`);
  }, [apply]);

  const reorderSuitePiece = useCallback(
    (direction: -1 | 1) => {
      const source = designRef.current;
      const piece = source ? activePiece(source) : null;
      if (!source || !piece) return;
      const next = movePiece(source, piece.id, direction);
      if (next === source) return;
      apply(() => next);
      const range = pieceRange(next, piece.id);
      if (range) setPageIndex(range.start);
      setSelectedIds([]);
    },
    [apply],
  );

  const onPieceId = (mutate: (current: DesignDocument, pieceId: string) => DesignDocument) => {
    const pieceId = currentPiece?.id;
    if (!pieceId) return;
    apply((current) => mutate(current, pieceId));
  };

  const renameSuitePiece = (name: string) =>
    onPieceId((current, pieceId) => renamePiece(current, pieceId, name));

  const changeSuiteGuestVisible = (visible: boolean) => {
    onPieceId((current, pieceId) => setGuestVisible(current, pieceId, visible));
    toast.success(
      visible
        ? "This piece is now part of the guest experience."
        : "Production only — this piece stays off the public link.",
    );
  };

  const changeSuitePrint = (print: Partial<PiecePrint>) =>
    onPieceId((current, pieceId) => updatePiecePrint(current, pieceId, print));

  const patchEnvelope = (patch: Partial<EnvelopeGeometry>) =>
    onPieceId((current, pieceId) => updateEnvelopeGeometry(current, pieceId, patch));

  /** Resizes every side of the envelope at once and keeps the flap in step. */
  const setEnvelopeSize = (widthMm: number, heightMm: number) => {
    const piece = currentPiece;
    if (!piece || !piece.envelope) return;
    const width = Math.max(40, Math.min(600, Math.round(widthMm * 10) / 10));
    const height = Math.max(40, Math.min(600, Math.round(heightMm * 10) / 10));
    const geometry = piece.envelope;
    const ratio = geometry.heightMm > 0 ? geometry.flap.depthMm / geometry.heightMm : 0.42;
    const target = {
      width: Math.round(toDesignPx(width, "mm")),
      height: Math.round(toDesignPx(height, "mm")),
    };
    apply((current) => {
      const ids = new Set(piece.pageIds);
      const pages = current.pages.map((candidate) =>
        ids.has(candidate.id) ? resizePage(candidate, target, resizeMode) : candidate,
      );
      return updateEnvelopeGeometry({ ...current, pages }, piece.id, {
        widthMm: width,
        heightMm: height,
        flap: {
          ...geometry.flap,
          depthMm: Math.round(height * ratio * 10) / 10,
        },
      });
    });
    setSizeDraft(target);
    setSizeTouched(false);
    toast.success(`Envelope set to ${width} × ${height} mm.`);
  };

  const applySharedStyle = (options: ShareStyleOptions) => {
    let changed = false;
    apply((current) => {
      const next = shareStyles(current, options);
      changed = next !== current;
      return next;
    });
    toast.success(changed ? "Style applied. Undo restores it." : "Nothing to apply.");
  };

  /** Envelope drafting guides for the piece and side being edited. */
  const envelopeGuide = useMemo(() => {
    if (!design || !currentPiece || !page) return null;
    if (currentPiece.kind !== "envelope" || !currentPiece.envelope) return null;
    const side = currentPiece.pageIds.indexOf(page.id);
    const linerPiece = suiteOf(design).find((piece) => piece.kind === "liner");
    const linerPage = linerPiece ? piecePages(design, linerPiece)[0] : undefined;
    const linerSize = linerPage ? pageSizeOf(linerPage) : null;
    return {
      geometry: currentPiece.envelope,
      view: side === 1 ? ("back" as const) : ("front" as const),
      liner:
        currentPiece.envelope.showLiner && linerSize
          ? {
              widthMm: (linerSize.width * 25.4) / 96,
              heightMm: (linerSize.height * 25.4) / 96,
            }
          : null,
    };
  }, [currentPiece, design, page]);

  /**
   * Adds a layer to the current page. `insertIndex` places it at a specific
   * depth in the stack (frames go beneath the content, above any backdrop);
   * everything else appends on top.
   */
  const addElement = (element: DesignElement, insertIndex?: number) => {
    setPageElements((elements) => {
      const at =
        insertIndex === undefined
          ? elements.length
          : Math.max(0, Math.min(insertIndex, elements.length));
      return [...elements.slice(0, at), element, ...elements.slice(at)];
    });
    setSelectedIds([element.id]);
    setAnimating(false);
  };

  const addText = (variant: "heading" | "body" | "caption") => {
    const fontSize = variant === "heading" ? 78 : variant === "body" ? 30 : 16;
    addElement(
      makeElement("text", {
        name: variant === "heading" ? "Heading" : variant === "body" ? "Body text" : "Caption",
        text:
          variant === "heading"
            ? "Your names"
            : variant === "body"
              ? "A few considered words."
              : "A SMALL NOTE",
        fontSize,
        font: (content && content.fontPair) || "cormorant-garamond",
        color: content?.palette.ink ?? "#161616",
        align: "center",
        letterSpacing: variant === "caption" ? 0.28 : 0,
        uppercase: variant === "caption",
        lineHeight: 1.35,
        x: 140,
        y: variant === "heading" ? 520 : 620,
        w: 720,
        h: variant === "heading" ? 160 : 120,
        animation: {
          enabled: true,
          preset: variant === "heading" ? "fadeUp" : "fade",
          trigger: "load",
          delay: 300,
          duration: 1100,
          easing: "easeOut",
        },
      }),
    );
  };

  const addShape = (shape: DesignElement["shape"], imageStorageId?: string) => {
    const element = makeElement("shape", {
      name: shape === "line" ? "Rule" : shape === "frame" ? "Frame" : "Shape",
      shape,
      x: shape === "line" ? 380 : 380,
      y: 640,
      w: shape === "line" ? 240 : 240,
      h: shape === "line" ? 2 : 240,
      fill: content?.palette.accent ?? "#710014",
      stroke: "transparent",
      strokeWidth: 0,
      animation: {
        enabled: true,
        preset: "scaleIn",
        trigger: "load",
        delay: 500,
        duration: 900,
        easing: "easeOut",
      },
      ...(imageStorageId
        ? { imageStorageId, imageInShape: true, imageZoom: 1 }
        : {}),
    });
    addElement(element);
  };

  const addMotif = () => {
    addElement(
      makeElement("motif", {
        name: "Ornament",
        motif: "sprig",
        x: 430,
        y: 250,
        w: 140,
        h: 140,
        color: content?.palette.ink ?? "#161616",
        animation: {
          enabled: true,
          preset: "fade",
          trigger: "load",
          delay: 200,
          duration: 1200,
          easing: "easeOut",
        },
      }),
    );
  };

  const addReveal = () => {
    const target = makeElement("text", {
      name: "Hidden message",
      text: "Meet us under the olive tree at four.",
      x: 170,
      y: 560,
      w: 660,
      h: 220,
      fontSize: 40,
      font: (content && content.fontPair) || "cormorant-garamond",
      color: content?.palette.ink ?? "#161616",
      align: "center",
      lineHeight: 1.4,
      animation: {
        enabled: true,
        preset: "fade",
        trigger: "load",
        delay: 600,
        duration: 900,
        easing: "easeOut",
      },
    });
    const cover = makeElement("shape", {
      name: "Heart cover",
      shape: "heart",
      x: 350,
      y: 520,
      w: 300,
      h: 290,
      fill: content?.palette.accent ?? "#710014",
      opacity: 1,
      animation: {
        enabled: true,
        preset: "scaleIn",
        trigger: "load",
        delay: 700,
        duration: 1000,
        easing: "backOut",
      },
      reveal: {
        interactionId: makeId("interaction"),
        targetId: target.id,
        effect: "fadeAway",
        direction: "up",
        duration: 900,
        trigger: "tap",
        hint: "Tap the heart",
      },
    });
    setPageElements((elements) => [...elements, target, cover]);
    setSelectedIds([cover.id]);
    seek(0);
    setAnimating(true);
    setPlaying(true);
    toast.success("Interactive reveal added. Tap the heart in Guest Experience to test it.");
  };

  const uploadImage = async (file: File): Promise<{ storageId: string; url: string }> => {
    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) {
      throw new Error("Choose a PNG, JPG, WebP, or GIF image.");
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error("Choose an image under 10 MB.");
    }
    const uploadUrl = await generateUploadUrl({});
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!response.ok) throw new Error(`The upload failed (${response.status}).`);
    const result = (await response.json()) as { storageId: string };
    const url = URL.createObjectURL(file);
    setLocalImageUrls((previous) => ({ ...previous, [result.storageId]: url }));
    return { storageId: result.storageId, url };
  };

  const handleAddImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadingImage(true);
    try {
      const { storageId } = await uploadImage(file);
      addElement(
        makeElement("image", {
          name: file.name.replace(/\.[^.]+$/, "").slice(0, 48) || "Image",
          imageStorageId: storageId,
          x: 190,
          y: 470,
          w: 620,
          h: 420,
          fit: "cover",
          animation: {
            enabled: true,
            preset: "scaleIn",
            trigger: "load",
            delay: 400,
            duration: 1100,
            easing: "easeOut",
          },
        }),
      );
    } catch (error) {
      toast.error(messageOf(error));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleInspectorUpload = async (file: File) => {
    if (!selected[0]) return;
    setUploadingImage(true);
    try {
      const { storageId } = await uploadImage(file);
      const element = selected[0];
      if (element.kind === "shape") {
        patchElement(selected[0].id, {
          imageStorageId: storageId,
          imageInShape: true,
          imageZoom: 1,
          imagePosition: { x: 50, y: 50 },
        });
      } else {
        patchElement(selected[0].id, { imageStorageId: storageId });
      }
    } catch (error) {
      toast.error(messageOf(error));
    } finally {
      setUploadingImage(false);
    }
  };

  const deleteSelection = () => {
    if (canvasEditing) {
      toast.error("Finish editing the text before deleting a layer.");
      return;
    }
    if (selectedIds.length === 0 || !page) return;
    const outcome = removeElements(page.elements, selectedIds);
    if (outcome.removed.length === 0) {
      if (outcome.blocked.length > 0) {
        toast.error("Locked layers are protected. Unlock to delete.");
      }
      return;
    }
    setPageElements(() => outcome.elements);
    setSelectedIds((previous) => selectionAfterDelete(previous, outcome));
    if (outcome.blocked.length > 0) {
      toast.success(
        `${outcome.removed.length} layer${outcome.removed.length === 1 ? "" : "s"} deleted · ${outcome.blocked.length} locked kept.`,
      );
    } else {
      toast.success(
        `${outcome.removed.length} layer${outcome.removed.length === 1 ? "" : "s"} deleted. Undo with ⌘/Ctrl + Z.`,
      );
    }
  };

  /* Layer-panel actions act on one explicit layer, so a row can be renamed,
     copied, or deleted without changing what is selected on the canvas. */
  const renameLayer = (layerId: string, name: string) => {
    const clean = name.trim();
    if (!clean) return;
    setPageElements((elements) =>
      elements.map((element) =>
        element.id === layerId ? { ...element, name: clean } : element,
      ),
    );
  };

  const duplicateLayer = (layerId: string) => {
    let created: string[] = [];
    setPageElements((elements) => {
      const before = new Set(elements.map((element) => element.id));
      const next = duplicateElements(elements, [layerId]);
      created = next
        .filter((element) => !before.has(element.id))
        .map((element) => element.id);
      return next;
    });
    if (created.length > 0) {
      setSelectedIds(created);
      setAnimating(false);
      toast.success("Layer duplicated.");
    }
  };

  const deleteLayer = (layerId: string) => {
    if (canvasEditing) {
      toast.error("Finish editing the text before deleting a layer.");
      return;
    }
    if (!page) return;
    const outcome = removeElements(page.elements, [layerId]);
    if (outcome.removed.length === 0) {
      if (outcome.blocked.length > 0) {
        toast.error("Locked layers are protected. Unlock to delete.");
      }
      return;
    }
    setPageElements(() => outcome.elements);
    setSelectedIds((previous) => previous.filter((id) => id !== layerId));
    toast.success("Layer deleted. Undo with ⌘/Ctrl + Z.");
  };

  const toggleLayerHidden = (layerId: string) => {
    setPageElements((elements) =>
      elements.map((element) =>
        element.id === layerId ? { ...element, hidden: !element.hidden } : element,
      ),
    );
  };

  const toggleLayerLocked = (layerId: string) => {
    setPageElements((elements) =>
      elements.map((element) =>
        element.id === layerId ? { ...element, locked: !element.locked } : element,
      ),
    );
  };

  /** +1 moves the layer towards the front of the stack. */
  const nudgeLayer = (layerId: string, direction: -1 | 1) => {
    setPageElements((elements) => {
      const from = elements.findIndex((element) => element.id === layerId);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= elements.length) return elements;
      const next = [...elements];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  };

  const placeLayer = (layerId: string, targetId: string) => {
    setPageElements((elements) => {
      const from = elements.findIndex((element) => element.id === layerId);
      const to = elements.findIndex((element) => element.id === targetId);
      if (from < 0 || to < 0 || from === to) return elements;
      const next = [...elements];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const copySelection = () => {
    if (selected.length === 0) return;
    clipboardRef.current = selected.map((element) => ({ ...element }));
    toast.success(
      `${selected.length} layer${selected.length === 1 ? "" : "s"} copied.`,
    );
  };

  const cutSelection = () => {
    if (selectedIds.length === 0) return;
    copySelection();
    deleteSelection();
  };

  const selectAll = () => {
    if (!page) return;
    const ids = page.elements
      .filter((element) => !element.locked && !element.hidden)
      .map((element) => element.id);
    setSelectedIds(ids);
    setAnimating(false);
    setPlaying(false);
    toast.success(
      ids.length > 0 ? `${ids.length} layers selected.` : "No unlocked layers on this page.",
    );
  };

  const toggleSelectionLock = () => {
    if (selectedIds.length === 0) return;
    const lock = !selected.every((element) => element.locked);
    setPageElements((elements) =>
      elements.map((element) =>
        selectedIds.includes(element.id) ? { ...element, locked: lock } : element,
      ),
    );
    toast.success(lock ? "Selection locked." : "Selection unlocked.");
  };

  const toggleSelectionHidden = () => {
    if (selectedIds.length === 0) return;
    const hidden = !selected.every((element) => element.hidden);
    setPageElements((elements) =>
      elements.map((element) =>
        selectedIds.includes(element.id) ? { ...element, hidden } : element,
      ),
    );
    toast.success(hidden ? "Selection hidden." : "Selection shown.");
  };

  /** Mirrors every unlocked selected layer in its own axes. */
  const flipSelection = (axis: "x" | "y") => {
    const targets = selected.filter((element) => !element.locked);
    if (targets.length === 0) {
      toast.error("Unlock a layer to flip it.");
      return;
    }
    const ids = new Set(targets.map((element) => element.id));
    setPageElements((elements) =>
      elements.map((element) => {
        if (!ids.has(element.id)) return element;
        return axis === "x"
          ? { ...element, flipX: !element.flipX }
          : { ...element, flipY: !element.flipY };
      }),
    );
  };

  const moveSelectionToEdge = (edge: "front" | "back") => {
    if (selectedIds.length === 0) return;
    setPageElements((elements) => {
      const group = elements.filter((element) => selectedIds.includes(element.id));
      const rest = elements.filter((element) => !selectedIds.includes(element.id));
      return edge === "front" ? [...rest, ...group] : [...group, ...rest];
    });
  };

  const fitCanvas = () => {
    setZoom(1);
    setResetViewToken((token) => token + 1);
  };

  const duplicateForDrag = () => {
    if (selectedIds.length === 0) return;
    // Keep the selection on the originals so the drag continues seamlessly;
    // the duplicate stays where the layer started.
    setPageElements((elements) => duplicateElements(elements, selectedIds));
    toast.success("Layer duplicated. Drag to place it.");
  };

  const addPageLayout = (layoutId: string) => {
    if (!content) return;
    const layout = pageLayoutById(layoutId);
    const nextPage = layout.build(content);
    const nextIndex = designRef.current?.pages.length ?? 0;
    apply((current) => ({ ...current, pages: [...current.pages, nextPage] }));
    setPageIndex(nextIndex);
    setSelectedIds([]);
    setTime(0);
    timeRef.current = 0;
    setLibrariesOpen(false);
    toast.success(`${layout.name} page added. Every layer is editable.`);
  };

  const applyBuiltinAsset = (asset: BuiltinAsset) => {
    if (!content) return;
    if (asset.background) {
      patchPage({ background: asset.background });
      setLibrariesOpen(false);
      toast.success(`${asset.name} applied to this page.`);
      return;
    }
    if (!asset.elements?.length) return;
    const resolve = (token?: "accent" | "ink" | "paper") =>
      token === "ink"
        ? content.palette.ink
        : token === "paper"
          ? content.palette.background
          : content.palette.accent;
    const created = asset.elements.map((spec, index) =>
      makeElement(spec.kind, {
        name: spec.name,
        shape: spec.shape,
        motif: spec.motif,
        x: spec.x,
        y: spec.y,
        w: spec.w,
        h: spec.h,
        rotation: spec.rotation ?? 0,
        fill:
          spec.fill ??
          (spec.kind === "shape" ? resolve(spec.fillToken ?? "accent") : undefined),
        color:
          spec.kind === "motif" ? resolve(spec.fillToken ?? "ink") : undefined,
        stroke:
          spec.stroke ??
          (spec.strokeToken ? resolve(spec.strokeToken) : undefined),
        strokeWidth: spec.strokeWidth,
        radius: spec.radius,
        opacity: spec.opacity ?? 1,
        animation: defaultAnimation("fade", 120 + index * 90),
        // Built-in mask assets (arch, heart, ellipse covers) are shapes that
        // should be ready to accept an image. They start with imageInShape
        // disabled so the host can upload a photo and then enable masking.
        ...(spec.kind === "shape" &&
          ("mask" === spec.name?.toLowerCase().slice(-5) || spec.name?.toLowerCase().includes("mask"))
          ? { imageInShape: false }
          : {}),
      }),
    );
    setPageElements((elements) => [...elements, ...created]);
    setSelectedIds(created.map((element) => element.id));
    setAnimating(false);
    setPlaying(false);
    setLibrariesOpen(false);
    toast.success(
      `${asset.name} placed. Move, recolour, or restyle it like any other layer.`,
    );
  };

  /**
   * Adds a decorative frame on its own layer, inset from the page trim. A frame
   * is an ordinary shape element carrying `frameArt`, so selection, moving,
   * resizing, rotation, colour, weight, layer order, saving, and publishing all
   * run through the controls the editor already has.
   *
   * When an image is provided, the frame becomes a masked image: the photo is
   * clipped to the frame's vector shape, with a stroke around it if desired.
   */
  const addFrame = (frame: FrameSpec, imageStorageId?: string) => {
    if (!page || !content) return;
    const pageSize = pageSizeOf(page);
    const bounds = frameBounds(pageSize);
    const element = makeElement("shape", {
      name: frame.name,
      shape: "frame",
      frameArt: frame.id,
      x: bounds.x,
      y: bounds.y,
      w: bounds.w,
      h: bounds.h,
      fill: "transparent",
      stroke: imageStorageId ? "#b38f6f" : (content.palette.accent ?? "#710014"),
      strokeWidth: imageStorageId ? 2 : 2,
      radius: 0,
      opacity: 0.85,
      animation: defaultAnimation("fade", 200),
      ...(imageStorageId
        ? {
            imageStorageId,
            imageInShape: true,
            imageZoom: 1,
            imagePosition: { x: 50, y: 50 },
            frameStrokeOnImage: true,
          }
        : {}),
    });
    addElement(
      element,
      // Beneath the wording and photographs, above a full-page backdrop, so
      // adding a frame never stops you selecting what is already on the card.
      frameLayerIndex(page.elements, pageSize),
    );
    setLibrariesOpen(false);
    setAnimating(false);
    setPlaying(false);
    toast.success(
      imageStorageId
        ? `${frame.name} frame with image added. Resize, rotate, or recolour it like any layer.`
        : `${frame.name} frame added under your content. Resize, rotate, or recolour it like any layer.`,
    );
  };

  const addRevealPreset = (preset: RevealPreset) => {
    if (!page || !content) return;
    const candidates = selected.filter((element) => !element.reveal);
    const preferred = candidates.find((element) =>
      preset.target === "photo" ? element.kind === "image" : element.kind === "text",
    );
    const reusable = candidates.find((element) => element.id === preferred?.id);
    const alreadyCovered = reusable
      ? page.elements.some((element) => element.reveal?.targetId === reusable.id)
      : false;
    const targetElement: DesignElement =
      reusable && !alreadyCovered
        ? reusable
        : makeElement(preset.target === "photo" ? "image" : "text", {
            name:
              preset.target === "photo"
                ? "Revealed photograph"
                : preset.target === "details"
                  ? "Revealed details"
                  : "Revealed message",
            x: 250,
            y: 520,
            w: 500,
            h: preset.target === "photo" ? 420 : 220,
            text:
              preset.target === "photo"
                ? undefined
                : preset.target === "details"
                  ? [content.venueName, content.venueAddress].filter(Boolean).join("\n")
                  : (content.message || "A note for {{guest}}"),
            font: content.fontPair,
            fontSize: preset.target === "details" ? 23 : 28,
            lineHeight: 1.6,
            letterSpacing: 0.04,
            align: "center",
            color: content.palette.ink,
            fit: "cover",
            animation: defaultAnimation("fade", 150),
          });

    const coverWidth =
      preset.cover.kind === "motif"
        ? 280
        : preset.cover.shape === "ellipse"
          ? Math.max(280, Math.min(460, targetElement.w + 20))
          : Math.max(240, Math.min(840, targetElement.w + 40));
    const coverHeight =
      preset.cover.kind === "motif"
        ? 280
        : preset.cover.shape === "heart"
          ? Math.max(220, Math.min(600, targetElement.h + 60))
          : Math.max(260, Math.min(720, targetElement.h + 80));
    const cover = makeElement(preset.cover.kind, {
      name: `${preset.name} cover`,
      shape: preset.cover.kind === "shape" ? preset.cover.shape : undefined,
      motif: preset.cover.kind === "motif" ? preset.cover.motif : undefined,
      x: targetElement.x + (targetElement.w - coverWidth) / 2,
      y: targetElement.y + (targetElement.h - coverHeight) / 2,
      w: coverWidth,
      h: coverHeight,
      fill:
        preset.cover.kind === "shape"
          ? preset.cover.fillToken === "ink"
            ? content.palette.ink
            : preset.cover.fillToken === "paper"
              ? content.palette.background
              : content.palette.accent
          : undefined,
      color:
        preset.cover.kind === "motif"
          ? preset.cover.colorToken === "ink"
            ? content.palette.ink
            : content.palette.accent
          : undefined,
      stroke:
        preset.cover.kind === "shape" && preset.cover.strokeToken
          ? preset.cover.strokeToken === "ink"
            ? content.palette.ink
            : preset.cover.strokeToken === "paper"
              ? content.palette.background
              : content.palette.accent
          : undefined,
      strokeWidth:
        preset.cover.kind === "shape" ? preset.cover.strokeWidth : undefined,
      radius: preset.cover.kind === "shape" ? preset.cover.radius : undefined,
      animation: defaultAnimation("scaleIn", 700),
      reveal: {
        interactionId: makeId("interaction"),
        targetId: targetElement.id,
        effect: preset.effect,
        direction: preset.direction,
        duration: preset.duration,
        trigger: "tap",
        hint: preset.hint,
      },
    });
    setPageElements((elements) => [
      ...elements,
      ...(reusable && !alreadyCovered ? [] : [targetElement]),
      cover,
    ]);
    setSelectedIds([cover.id]);
    setAnimating(true);
    setPlaying(true);
    setLibrariesOpen(false);
    toast.success(`${preset.name} added. Tap the cover in Guest preview to test it.`);
  };

  const handleCanvasContextAction = (action: CanvasContextAction) => {
    switch (action) {
      case "copy":
        copySelection();
        break;
      case "cut":
        cutSelection();
        break;
      case "paste":
        pasteClipboard();
        break;
      case "duplicate":
        duplicateSelection();
        break;
      case "delete":
        deleteSelection();
        break;
      case "group":
        groupSelection();
        break;
      case "ungroup":
        ungroupSelection();
        break;
      case "lock":
        setPageElements((elements) =>
          elements.map((element) =>
            selectedIds.includes(element.id) ? { ...element, locked: true } : element,
          ),
        );
        break;
      case "unlock":
        setPageElements((elements) =>
          elements.map((element) =>
            selectedIds.includes(element.id) ? { ...element, locked: false } : element,
          ),
        );
        break;
      case "hide":
        setPageElements((elements) =>
          elements.map((element) =>
            selectedIds.includes(element.id) ? { ...element, hidden: true } : element,
          ),
        );
        break;
      case "show":
        setPageElements((elements) =>
          elements.map((element) =>
            selectedIds.includes(element.id) ? { ...element, hidden: false } : element,
          ),
        );
        break;
      case "front":
        moveSelectionToEdge("front");
        break;
      case "back":
        moveSelectionToEdge("back");
        break;
      case "selectAll":
        selectAll();
        break;
      case "flipX":
        flipSelection("x");
        break;
      case "flipY":
        flipSelection("y");
        break;
    }
  };

  const pasteClipboard = () => {
    const source = clipboardRef.current;
    if (source.length === 0) return;
    const idMap = new Map<string, string>();
    source.forEach((element) => idMap.set(element.id, makeId(element.kind)));
    const copies = source.map((element) => ({
      ...element,
      id: idMap.get(element.id)!,
      x: element.x + 24,
      y: element.y + 24,
      groupId: undefined,
      reveal: element.reveal
        ? {
            ...element.reveal,
            interactionId: makeId("interaction"),
            targetId: idMap.get(element.reveal.targetId) ?? element.reveal.targetId,
          }
        : undefined,
    }));
    setPageElements((elements) => [...elements, ...copies]);
    setSelectedIds(copies.map((element) => element.id));
    setAnimating(false);
  };

  const duplicateSelection = () => {
    if (selectedIds.length === 0) return;
    let created: string[] = [];
    setPageElements((elements) => {
      const before = new Set(elements.map((element) => element.id));
      const next = duplicateElements(elements, selectedIds);
      created = next.filter((element) => !before.has(element.id)).map((element) => element.id);
      return next;
    });
    // The updater runs synchronously inside `apply`; select the copies.
    if (created.length) {
      setSelectedIds(created);
      setAnimating(false);
    }
  };

  const groupSelection = () => {
    if (selectedIds.length < 2) return;
    const groupId = makeId("group");
    setPageElements((elements) =>
      elements.map((element) =>
        selectedIds.includes(element.id) ? { ...element, groupId } : element,
      ),
    );
  };

  const ungroupSelection = () => {
    setPageElements((elements) =>
      elements.map((element) =>
        selectedIds.includes(element.id) ? { ...element, groupId: undefined } : element,
      ),
    );
  };

  const alignSelection = (kind: "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom") => {
    if (!page) return;
    // The page can be any size the host chose, so alignment uses its real
    // geometry instead of the classic 1000 × 1333 card.
    const { width, height } = pageSizeOf(page);
    const inset = Math.max(16, Math.round(width * 0.04));
    setPageElements((elements) =>
      elements.map((element) => {
        if (!selectedIds.includes(element.id)) return element;
        if (kind === "left") return { ...element, x: inset };
        if (kind === "right") return { ...element, x: width - inset - element.w };
        if (kind === "hcenter") return { ...element, x: (width - element.w) / 2 };
        if (kind === "top") return { ...element, y: inset };
        if (kind === "bottom") return { ...element, y: height - inset - element.h };
        return { ...element, y: (height - element.h) / 2 };
      }),
    );
  };

  const distributeSelection = (axis: "h" | "v") => {
    const items = page?.elements.filter((element) => selectedIds.includes(element.id)) ?? [];
    if (items.length < 3) {
      toast.error("Select at least three layers to distribute them.");
      return;
    }
    const sorted = [...items].sort((a, b) => (axis === "h" ? a.x - b.x : a.y - b.y));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const span =
      axis === "h" ? last.x + last.w - first.x : last.y + last.h - first.y;
    const total = sorted.reduce((sum, item) => sum + (axis === "h" ? item.w : item.h), 0);
    const gap = (span - total) / (sorted.length - 1);
    let cursor = axis === "h" ? first.x : first.y;
    const positions = new Map<string, number>();
    for (const item of sorted) {
      positions.set(item.id, cursor);
      cursor += (axis === "h" ? item.w : item.h) + gap;
    }
    setPageElements((elements) =>
      elements.map((element) =>
        positions.has(element.id)
          ? axis === "h"
            ? { ...element, x: Math.round(positions.get(element.id)!) }
            : { ...element, y: Math.round(positions.get(element.id)!) }
          : element,
      ),
    );
  };

  const orderSelection = (action: "up" | "down" | "front" | "back") => {
    setPageElements((elements) => {
      const chosen = elements.filter((element) => selectedIds.includes(element.id));
      if (chosen.length === 0) return elements;
      const rest = elements.filter((element) => !selectedIds.includes(element.id));
      if (action === "front") return [...rest, ...chosen];
      if (action === "back") return [...chosen, ...rest];
      const next = [...elements];
      const indices = next
        .map((element, index) => (selectedIds.includes(element.id) ? index : -1))
        .filter((index) => index >= 0);
      const ordered = action === "up" ? [...indices].reverse() : indices;
      for (const index of ordered) {
        const target = action === "up" ? index + 1 : index - 1;
        if (target < 0 || target >= next.length) continue;
        if (selectedIds.includes(next[target].id)) continue;
        [next[index], next[target]] = [next[target], next[index]];
      }
      return next;
    });
  };

  const testReveal = (interactionId: string) => {
    setRevealPreview((previous) => new Set(previous).add(interactionId));
    window.setTimeout(() => {
      setRevealPreview((previous) => {
        const next = new Set(previous);
        next.delete(interactionId);
        return next;
      });
    }, 1800);
  };

  const previewAnimation = () => {
    if (!selected[0]) return;
    const start = Math.max(0, selected[0].animation.delay - 250);
    timeRef.current = start;
    setTime(start);
    setAnimating(true);
    setPlaying(true);
  };

  const applyTemplate = (next: DesignDocument, name: string) => {
    setPendingTemplate({ design: next, name });
  };

  const confirmTemplate = () => {
    if (!pendingTemplate || !content) return;
    // A template is a source, never a shared instance: normalise into fresh
    // page, element, animation, and reveal objects before it becomes this
    // invitation's design.
    const fresh = normalizeDesign(pendingTemplate.design, content);
    apply((current) => ({
      ...fresh,
      opening: {
        ...fresh.opening,
        experience:
          fresh.opening.experience === "none"
            ? current.opening.experience
            : fresh.opening.experience,
      },
    }));
    setPageIndex(0);
    setSelectedIds([]);
    setAnimating(false);
    setPendingTemplate(null);
    setLibrariesOpen(false);
    toast.success("Template applied. Your words, details, guests, and RSVP are untouched.");
  };

  const applyOpening = (opening: OpeningSettings) => {
    apply((current) => ({ ...current, opening }));
  };

  // Used by the Opening Designer's sliders: live changes, one undo step.
  const applyOpeningLive = (opening: OpeningSettings) => {
    applyGesture((current) => ({ ...current, opening }));
  };

  const applyClosing = (closing: ClosingSettings) => {
    apply((current) => ({ ...current, closing }));
  };

  const applyAnimation = (animation: ElementAnimation) => {
    if (selectedIds.length === 0) return;
    setPageElements((elements) =>
      elements.map((element) =>
        selectedIds.includes(element.id)
          ? { ...element, animation: { ...animation, delay: element.animation.delay } }
          : element,
      ),
    );
  };

  const applyTypeStyleToSelection = (style: TypeStyle) => {
    const textIds = new Set(
      selected.filter((element) => element.kind === "text").map((element) => element.id),
    );
    if (textIds.size === 0) {
      toast.error("Select a text layer before applying a type style.");
      return;
    }
    apply((current) => ({
      ...current,
      pages: current.pages.map((page) => ({
        ...page,
        elements: page.elements.map((element) =>
          textIds.has(element.id) ? applyTypeStyle(element, style) : element,
        ),
      })),
    }));
    toast.success(
      `Type style applied to ${textIds.size} text layer${textIds.size === 1 ? "" : "s"}.`,
    );
  };

  const applyFont = async (fontId: string) => {
    if (selectedIds.length === 0) return;
    const element = page?.elements.find((candidate) => candidate.id === selectedIds[0]);
    if (!element || element.kind !== "text") {
      toast.error("Select a text layer to change its font.");
      return;
    }
    patchElement(element.id, { font: fontId });
    const font = fontById(fontId);
    const loaded = await ensureFont(fontId, element.fontWeight ?? 400, Boolean(element.italic));
    if (loaded) {
      toast.success(`${font.name} applied to "${element.name}".`);
    } else {
      toast.success(`${font.name} applied — showing fallback face in this browser.`);
    }
  };

  const applyStyle = (style: StylePreset) => {
    if (!content) return;
    const currentDesign = designRef.current;
    if (!currentDesign) return;
    // Map from the design's own dominant inks, not the written invitation's
    // palette, so a style also recolours an applied template.
    const counts = new Map<string, number>();
    for (const element of currentDesign.pages[0]?.elements ?? []) {
      for (const color of [element.color, element.fill, element.stroke]) {
        if (color && color !== "transparent") {
          counts.set(color, (counts.get(color) ?? 0) + 1);
        }
      }
    }
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const previous = {
      background: currentDesign.pages[0]?.background ?? content.palette.background,
      ink: ranked[0]?.[0] ?? content.palette.ink,
      accent: ranked[1]?.[0] ?? content.palette.accent,
    };
    apply((current) => applyStylePreset(current, style, previous));
    toast.success("Style applied to this design.");
  };

  const applyPalette = (palette: ColourPalette) => {
    apply((current) => recolourDesign(current, palette));
    toast.success(`${palette.name} applied.`);
  };

  /**
   * A swatch from the library: recolours the selected layers' ink/fill, or the
   * page background when nothing is selected. Photographs are never touched.
   */
  const applyLibraryColour = (hex: string) => {
    if (selectedIds.length === 0) {
      patchPage({ background: hex });
      toast.success("Page background updated.");
      return;
    }
    apply((current) => ({
      ...current,
      pages: current.pages.map((candidate, index) =>
        index === pageIndex
          ? recolourSelection(candidate, selectedIds, hex)
          : candidate,
      ),
    }));
  };

  /**
   * A finish from the library or the inspector: the selected layers when they
   * have a surface the renderer can honestly draw on, otherwise the page
   * itself. Nothing is baked into artwork — the material is one more setting on
   * the element, so it can be edited or removed just like any other.
   */
  const applyMaterial = (material: LayerMaterial) => {
    if (selectedIds.length === 0) {
      patchPage({ material });
      toast.success("Finish applied to this page.");
      if (!materialPreview) setMaterialMode(true);
      return;
    }
    const eligible = selected.filter((element) => supportsMaterial(element));
    if (eligible.length === 0) {
      toast.error(MATERIAL_SCOPE_NOTE);
      return;
    }
    const ids = new Set(eligible.map((element) => element.id));
    apply((current) => ({
      ...current,
      pages: current.pages.map((candidate, index) =>
        index === pageIndex
          ? {
              ...candidate,
              elements: candidate.elements.map((element) =>
                ids.has(element.id) ? { ...element, material: { ...material } } : element,
              ),
            }
          : candidate,
      ),
    }));
    toast.success(
      eligible.length === 1
        ? `“${eligible[0].name}” is now finished with ${material.preset.replace("-", " ")}.`
        : `Finish applied to ${eligible.length} layers.`,
    );
    // A finish applied while the canvas is showing clean artwork would look
    // like nothing happened, so the preview turns itself back on.
    if (!materialPreview) setMaterialMode(true);
  };

  /** The preset the current target already wears, so a tile can show itself. */
  const activeMaterialId: MaterialId | undefined =
    selectedIds.length === 0
      ? page?.material?.preset
      : selected.length === 1
        ? selected[0].material?.preset
        : undefined;

  const clipChange = (elementId: string, value: { start?: number; duration?: number }) => {
    setPageElements((elements) =>
      elements.map((element) =>
        element.id === elementId
          ? {
              ...element,
              animation: {
                ...element.animation,
                delay: value.start ?? element.animation.delay,
                duration: value.duration ?? element.animation.duration,
              },
            }
          : element,
      ),
    );
  };

  const setPageHidden = (index: number) => {
    apply((current) => ({
      ...current,
      pages: current.pages.map((candidate, position) =>
        position === index ? { ...candidate, hidden: !candidate.hidden } : candidate,
      ),
    }));
  };

  const addPage = (duplicate: boolean) => {
    if (!design) return;
    const current = design.pages[pageIndex];
    const nextPage: DesignPage = duplicate
      ? {
          ...current,
          id: makeId("page"),
          name: `${current.name} copy`,
          elements: current.elements.map((element) => ({
            ...element,
            id: makeId(element.kind),
            reveal: element.reveal
              ? { ...element.reveal, interactionId: makeId("interaction") }
              : undefined,
          })),
        }
      : {
          id: makeId("page"),
          name: `Page ${design.pages.length + 1}`,
          background: current.background,
          elements: [],
        };
    // Re-link duplicated covers to the duplicated content, never the original.
    if (duplicate) {
      const map = new Map<string, string>();
      current.elements.forEach((element, index) => {
        map.set(element.id, nextPage.elements[index].id);
      });
      nextPage.elements = nextPage.elements.map((element) =>
        element.reveal
          ? { ...element, reveal: { ...element.reveal, targetId: map.get(element.reveal.targetId) ?? "" } }
          : element,
      );
    }
    // A new page belongs to the piece being worked on and lands inside its
    // block, so pieces stay contiguous in the page list.
    const piece = activePiece(design);
    const range = piece ? pieceRange(design, piece.id) : null;
    const insertAt = range ? range.end : design.pages.length;
    apply((currentDesign) => {
      const pages = [...currentDesign.pages];
      pages.splice(insertAt, 0, nextPage);
      return addPageToSuite({ ...currentDesign, pages }, nextPage.id);
    });
    setPageIndex(insertAt);
    setSelectedIds([]);
  };

  const deletePage = (index: number) => {
    if (!design || design.pages.length <= 1) {
      toast.error("An invitation needs at least one page.");
      return;
    }
    const target = design.pages[index];
    const owner = target ? pieceForPage(design, target.id) : null;
    if (owner && owner.pageIds.length <= 1 && suiteOf(design).length > 0) {
      toast.error(`“${owner.name}” only has this page — delete the piece instead.`);
      return;
    }
    apply((current) =>
      removePageFromSuite(
        { ...current, pages: current.pages.filter((_, position) => position !== index) },
        target.id,
      ),
    );
    setPageIndex((current) => Math.min(current, design.pages.length - 2));
    setSelectedIds([]);
  };

  const movePage = (index: number, direction: -1 | 1) => {
    if (!design) return;
    // Pages are reordered inside their own piece: a card never slides into
    // another piece's block.
    const owner = pieceForPage(design, design.pages[index].id);
    const range = owner ? pieceRange(design, owner.id) : null;
    const first = range ? range.start : 0;
    const last = range ? range.end - 1 : design.pages.length - 1;
    const target = index + direction;
    if (target < first || target > last) return;
    apply((current) => {
      const pages = [...current.pages];
      [pages[index], pages[target]] = [pages[target], pages[index]];
      return { ...current, pages };
    });
    setPageIndex(target);
  };

  const handlePublish = async () => {
    if (!design) return;
    setPublishing(true);
    try {
      const saved = await persistDesign(design);
      if (!saved) return;
      if (published) {
        setShareOpen(true);
        return;
      }
      await publishInvitation({ id: invitationId });
      setShareOpen(true);
      toast.success("Published. Your canvas is live.");
    } catch (error) {
      toast.error(messageOf(error));
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    try {
      await unpublishInvitation({ id: invitationId });
      setShareOpen(false);
      toast.success("Returned to drafts.");
    } catch (error) {
      toast.error(messageOf(error));
    }
  };

  // Keyboard shortcuts follow the platform modifier (⌘ on macOS, Ctrl
  // elsewhere) and never fire from a field, a textarea, or inline text editing.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (librariesOpen || guestOpen || timelinePreviewOpen || shortcutsOpen || shareOpen) {
        return;
      }
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (mod && key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && key === "y") {
        event.preventDefault();
        redo();
        return;
      }
      if (mod && key === "s") {
        event.preventDefault();
        if (designRef.current) void persistDesign(designRef.current);
        return;
      }
      if (mod && key === "enter") {
        event.preventDefault();
        setGuestOpen((value) => !value);
        return;
      }
      if (mod && key === "d") {
        event.preventDefault();
        duplicateSelection();
        return;
      }
      if (mod && key === "c") {
        event.preventDefault();
        copySelection();
        return;
      }
      if (mod && key === "x") {
        event.preventDefault();
        cutSelection();
        return;
      }
      if (mod && key === "v") {
        event.preventDefault();
        pasteClipboard();
        return;
      }
      if (mod && key === "a") {
        event.preventDefault();
        selectAll();
        return;
      }
      if (mod && key === "g") {
        event.preventDefault();
        if (event.shiftKey) ungroupSelection();
        else groupSelection();
        return;
      }
      if (mod && event.shiftKey && key === "l") {
        event.preventDefault();
        toggleSelectionLock();
        return;
      }
      if (mod && event.shiftKey && key === "h") {
        event.preventDefault();
        toggleSelectionHidden();
        return;
      }
      if (mod && event.key === "]") {
        event.preventDefault();
        moveSelectionToEdge("front");
        return;
      }
      if (mod && event.key === "[") {
        event.preventDefault();
        moveSelectionToEdge("back");
        return;
      }
      if (mod && (event.key === "=" || event.key === "+")) {
        event.preventDefault();
        setZoom((value) => Math.min(2.4, value * 1.2));
        return;
      }
      if (mod && (event.key === "-" || event.key === "_")) {
        event.preventDefault();
        setZoom((value) => Math.max(0.4, value / 1.2));
        return;
      }
      if (mod && event.key === "0") {
        event.preventDefault();
        fitCanvas();
        return;
      }
      if (!mod && event.shiftKey && key === "h") {
        event.preventDefault();
        flipSelection("x");
        return;
      }
      if (!mod && event.shiftKey && key === "v") {
        event.preventDefault();
        flipSelection("y");
        return;
      }
      if (!mod && !event.altKey && key === "p") {
        event.preventDefault();
        setPlaying((value) => !value);
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedIds.length && !canvasEditing) {
          event.preventDefault();
          deleteSelection();
        }
        return;
      }
      if (event.key === "Escape") {
        setSelectedIds([]);
        setShortcutsOpen(false);
        return;
      }
      if (event.key.startsWith("Arrow") && selectedIds.length) {
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
        const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
        setPageElements((elements) =>
          elements.map((element) =>
            selectedIds.includes(element.id)
              ? { ...element, x: element.x + dx, y: element.y + dy }
              : element,
          ),
        );
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, undo, redo, persistDesign, pageIndex, design, librariesOpen, guestOpen, timelinePreviewOpen, shortcutsOpen, shareOpen, canvasEditing]);

  if (invitation === undefined && idIsValid) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="flex h-14 items-center border-b border-ink/15 px-5">
          <Wordmark className="h-[20px]" />
        </header>
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!idIsValid || invitation === null || !design || !page || !content) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <EyeOff className="size-6 text-muted-foreground" />
        <h1 className="mt-5 font-ui text-3xl font-semibold tracking-[-0.02em]">This studio is private.</h1>
        <p className="mt-3 max-w-sm text-[0.85rem] leading-relaxed text-muted-foreground">
          The invitation may have been deleted, or it belongs to another studio.
        </p>
        <Button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="mt-7 rounded-none text-[0.62rem] uppercase tracking-[0.18em]"
        >
          Return to your studio
        </Button>
      </div>
    );
  }

  const namesLabel = content.names.secondary
    ? `${content.names.primary} & ${content.names.secondary}`
    : content.names.primary;

  const saveLabel =
    saveState === "saving"
      ? "Saving"
      : saveState === "unsaved"
        ? "Unsaved changes"
        : saveState === "error"
          ? "Save failed"
          : "All changes saved";

  const openingDesigner = (
    <OpeningDesigner
      open={showOpeningDesigner}
      onOpenChange={setShowOpeningDesigner}
      opening={design.opening}
      onChange={applyOpening}
      onLiveChange={applyOpeningLive}
      page={design.pages.find((candidate) => !candidate.hidden) ?? design.pages[0] ?? null}
      imageUrls={imageUrls}
      accent={content.palette.accent}
      background={content.palette.background}
      ink={content.palette.ink}
      guestName="Amelia"
      names={namesLabel}
      coverUrl={
        design.opening.coverStorageId
          ? imageUrls[design.opening.coverStorageId]
          : undefined
      }
      uploadingCover={uploadingImage}
      onCoverUpload={async (file) => {
        try {
          const { storageId } = await uploadImage(file);
          applyOpening({ ...design.opening, coverStorageId: storageId });
        } catch (error) {
          toast.error(messageOf(error));
        }
      }}
    />
  );

  const openingStagePreview = (
    <Dialog open={showOpeningPreview} onOpenChange={setShowOpeningPreview}>
      <DialogContent className="max-w-[440px] overflow-hidden p-0">
        <div className="relative aspect-[3/4] w-full">
          <OpeningStage
            key={openingPreview}
            opening={{ ...design.opening, autoOpen: false }}
            page={design.pages.find((candidate) => !candidate.hidden) ?? design.pages[0] ?? null}
            imageUrls={imageUrls}
            accent={content.palette.accent}
            background={content.palette.background}
            ink={content.palette.ink}
            guestName="Amelia"
            names={namesLabel}
            coverUrl={
              design.opening.coverStorageId
                ? imageUrls[design.opening.coverStorageId]
                : undefined
            }
            onDone={() => setShowOpeningPreview(false)}
          />              <button
                type="button"
                onClick={() => setOpeningPreview((value) => value + 1)}
                className="absolute left-3 top-3 z-50 border border-ink/20 bg-[var(--paper-light)] px-2 py-1 text-[9px] uppercase tracking-[0.12em]"
                aria-label="Replay opening animation"
              >
                Replay
              </button>
        </div>
      </DialogContent>
    </Dialog>
  );

  const closingPreview = (
    <Dialog open={showClosingPreview} onOpenChange={setShowClosingPreview}>
      <DialogContent className="max-w-[440px] overflow-hidden p-0">
        <div className="relative aspect-[3/4] w-full">
          <ClosingStage
            key={closingPreviewKey}
            closing={design.closing}
            accent={content.palette.accent}
            background={page.background}
            ink={content.palette.ink}
            guestName="Amelia"
            names={namesLabel}
          />
        </div>
      </DialogContent>
    </Dialog>
  );

  // The hidden file input lives outside the panel tree, so the picker is
  // opened from this event handler instead of touching the ref while rendering.
  const pickImageFile = () => imageFileRef.current?.click();

  // The opening cover is chosen from its own file input; the upload lives here
  // so the panel only hands over a plain event handler.
  const uploadOpeningCover = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadingImage(true);
    try {
      const { storageId } = await uploadImage(file);
      applyOpening({ ...design.opening, coverStorageId: storageId });
    } catch (error) {
      toast.error(messageOf(error));
    } finally {
      setUploadingImage(false);
    }
  };

  const renderLeftPanel = () => {
    if (leftPanel === "add") {
      return (
        <>
          <PanelHeading title="Add" note="Every addition is a real, animatable layer." />
          <div className="grid gap-1.5 p-3">
            <AddButton icon={Type} label="Heading" note="Large display names" onClick={() => addText("heading")} />
            <AddButton icon={Type} label="Body text" note="A line of invitation copy" onClick={() => addText("body")} />
            <AddButton icon={Type} label="Caption" note="Small tracked uppercase" onClick={() => addText("caption")} />
            <AddButton icon={ImageIcon} label="Image" note="Upload a photograph or background" onClick={pickImageFile} />
            <AddButton icon={Shapes} label="Shape" note="Rule, heart, arch, leaf, star" onClick={() => addShape("rect")} />
            <AddButton icon={Sparkles} label="Ornament" note="Hand-drawn botanical or celestial mark" onClick={addMotif} />
            <AddButton icon={Heart} label="Interactive reveal" note="A heart cover over a hidden message" onClick={addReveal} />
          </div>
          <div className="border-t border-ink/12 p-3">
            <p className="mb-2 font-meta text-[9px] uppercase tracking-[0.16em] text-ink/40">
              Shapes
            </p>
            <div className="grid grid-cols-5 gap-1">
              {SHAPES.map((shape) => (
                <button
                  key={shape.id}
                  type="button"
                  onClick={() => addShape(shape.id)}
                  title={shape.label}
                  aria-label={`Add ${shape.label}`}
                  className="grid aspect-square place-items-center rounded-md border border-ink/12 bg-[var(--paper-light)] text-ink/60 transition-[border-color,color] duration-150 hover:border-ink/35 hover:text-[var(--red)] focus-visible:ring-2 focus-visible:ring-[var(--gold)]/60 focus-visible:outline-none"
                >
                  <ShapePreview
                    shape={shape.id}
                    fill={content?.palette.accent ?? "#710014"}
                    stroke={shape.id === "frame" ? content?.palette.accent : undefined}
                  />
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-ink/12 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="font-meta text-[9px] uppercase tracking-[0.16em] text-ink/40">
                Decorative frames
              </p>
              <button
                type="button"
                onClick={() => {
                  setLibraryTab("frames");
                  setLibrariesOpen(true);
                }}
                className="inline-flex items-center rounded-full border border-ink/15 px-2 py-0.5 text-[9px] uppercase tracking-[0.08em] text-ink/55 transition-[background-color,border-color,color] duration-150 hover:border-ink/40 hover:text-ink"
              >
                All {FRAMES.length}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {FRAMES.slice(0, 6).map((frame) => (
                <button
                  key={frame.id}
                  type="button"
                  onClick={() => addFrame(frame)}
                  title={frame.name}
                  aria-label={`Add the ${frame.name} frame`}
                  className="overflow-hidden rounded-md border border-ink/12 bg-[var(--paper-light)] transition-[border-color,box-shadow] duration-150 hover:border-ink/35 hover:shadow-[0_6px_16px_rgba(21,21,21,0.08)] focus-visible:ring-2 focus-visible:ring-[var(--gold)]/60 focus-visible:outline-none"
                >
                  <span className="block aspect-[3/4] w-full">
                    <FrameThumb frame={frame} />
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-ink/12 p-3">
            <p className="mb-2 font-meta text-[9px] uppercase tracking-[0.16em] text-ink/40">
              Ornament library
            </p>
            <div className="grid grid-cols-5 gap-1">
              {MOTIFS.filter((motif) => motif.id !== "none").slice(0, 15).map((motif) => (
                <button
                  key={motif.id}
                  type="button"
                  onClick={() =>
                    addElement(
                      makeElement("motif", {
                        name: motif.label,
                        motif: motif.id,
                        x: 420,
                        y: 300,
                        w: 160,
                        h: 160,
                        color: content.palette.ink,
                        animation: {
                          enabled: true,
                          preset: "fade",
                          trigger: "load",
                          delay: 250,
                          duration: 1100,
                          easing: "easeOut",
                        },
                      }),
                    )
                  }
                  className="grid aspect-square place-items-center rounded-md border border-ink/12 bg-[var(--paper-light)] text-ink/60 transition-[border-color,color] duration-150 hover:border-ink/35 hover:text-[var(--red)] focus-visible:ring-2 focus-visible:ring-[var(--gold)]/60 focus-visible:outline-none"
                  title={motif.label}
                >
                  <Sparkles className="size-3" />
                </button>
              ))}
            </div>
          </div>
          {uploadingImage && (
            <p className="px-3 pb-3 text-[10px] text-ink/45">
              <Loader2 className="mr-1 inline size-3 animate-spin" /> Uploading…
            </p>
          )}
        </>
      );
    }

    if (leftPanel === "colour") {
      return (
        <ColourPanel
          page={page}
          selected={selected}
          onPatch={patchElement}
          onPagePatch={patchPage}
          onApplyPalette={applyPalette}
        />
      );
    }

    if (leftPanel === "layers") {
      return (
        <LayersPanel
          page={page}
          selectedIds={selectedIds}
          imageUrls={imageUrls}
          onSelect={(ids) => {
            setSelectedIds(ids);
            setAnimating(false);
            setPlaying(false);
          }}
          onPicked={mobileSheet === "layers" ? () => setMobileSheet(null) : undefined}
          onRename={renameLayer}
          onDuplicate={duplicateLayer}
          onDelete={deleteLayer}
          onToggleHidden={toggleLayerHidden}
          onToggleLocked={toggleLayerLocked}
          onNudge={nudgeLayer}
          onPlace={placeLayer}
          onGroup={groupSelection}
          onUngroup={ungroupSelection}
          deleteHint={
            canvasEditing
              ? "Finish editing the text before deleting a layer."
              : undefined
          }
        />
      );
    }

    if (leftPanel === "opening") {
      return (
        <>
          <PanelHeading
            title="Opening"
            note="The entrance shown once, before the first page. Separate from page transitions."
          />
          <div className="space-y-3 p-3">
            <label className="block">
              <span className="mb-1 block text-[10px] text-ink/55">Experience</span>
              <Select
                value={design.opening.experience}
                onValueChange={(experience) =>
                  applyOpening({ ...design.opening, experience: experience as OpeningSettings["experience"] })
                }
              >
                <SelectTrigger className="h-8 rounded-none text-[11px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OPENING_EXPERIENCES.map((experience) => (
                    <SelectItem key={experience.id} value={experience.id}>
                      {experience.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] text-ink/55">Length (ms)</span>
              <Input
                type="number"
                value={design.opening.duration}
                min={600}
                step={100}
                onChange={(event) =>
                  applyOpening({ ...design.opening, duration: Number(event.target.value) || 600 })
                }
                className="h-8 rounded-none text-[11px]"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] text-ink/55">Welcome line</span>
              <Input
                value={design.opening.welcome}
                onChange={(event) => applyOpening({ ...design.opening, welcome: event.target.value })}
                className="h-8 rounded-none text-[11px]"
              />
              <span className="mt-1 block text-[9px] text-ink/35">Use {"{{guest}}"} for the guest's name.</span>
            </label>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-ink/55">Open automatically</span>
              <Switch
                checked={design.opening.autoOpen}
                onCheckedChange={(autoOpen) => applyOpening({ ...design.opening, autoOpen })}
                className="scale-90"
              />
            </div>
            <div>
              <span className="mb-1 block text-[10px] text-ink/55">Opening cover</span>
              {design.opening.coverStorageId && imageUrls[design.opening.coverStorageId] ? (
                <div className="mb-1.5 flex items-center gap-2">
                  <img
                    src={imageUrls[design.opening.coverStorageId]}
                    alt="Opening cover"
                    className="h-12 w-12 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => applyOpening({ ...design.opening, coverStorageId: undefined })}
                    className="text-[9px] uppercase tracking-[0.1em] text-ink/45 hover:text-[var(--red)]"
                  >
                    Remove
                  </button>
                </div>
              ) : null}
              <label className="flex h-8 cursor-pointer items-center justify-center border border-ink/20 text-[10px] uppercase tracking-[0.1em] text-ink/55 hover:border-ink hover:text-ink">
                {uploadingImage ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <ImageIcon className="size-3.5" />
                )}
                <span className="ml-1.5">Upload cover image</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(event) => void uploadOpeningCover(event)}
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <Button
                type="button"
                className="h-8 rounded-none text-[10px]"
                onClick={() => setShowOpeningDesigner(true)}
              >
                <Sparkles className="size-3.5" /> Design opening
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-8 rounded-none text-[10px]"
                onClick={() => {
                  setOpeningPreview((value) => value + 1);
                  setShowOpeningPreview(true);
                }}
              >
                <Play className="size-3.5" /> Preview
              </Button>
            </div>
            <p className="text-[9px] leading-relaxed text-ink/35">
              Envelope, arch, curtain, doors, layered paper, cinematic fade, and a
              personalised welcome. The opening never replays on page navigation.
            </p>

            <div className="mt-2 border-t border-ink/12 pt-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-meta text-[9px] uppercase tracking-[0.16em] text-ink/45">
                    Closing
                  </p>
                  <p className="mt-0.5 text-[9px] leading-relaxed text-ink/35">
                    Shown once after the last page finishes.
                  </p>
                </div>
                <Switch
                  checked={design.closing.enabled}
                  onCheckedChange={(enabled) =>
                    applyClosing({ ...design.closing, enabled })
                  }
                  className="scale-90"
                />
              </div>
              <div className="mt-2 space-y-2">
                <Select
                  value={design.closing.style}
                  onValueChange={(style) =>
                    applyClosing({
                      ...design.closing,
                      style: style as ClosingSettings["style"],
                    })
                  }
                >
                  <SelectTrigger className="h-8 rounded-none text-[11px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CLOSING_STYLES.map((style) => (
                      <SelectItem key={style.id} value={style.id}>
                        {style.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  value={design.closing.message}
                  onChange={(event) =>
                    applyClosing({ ...design.closing, message: event.target.value })
                  }
                  rows={2}
                  placeholder="With love"
                  className="rounded-none text-[11px] leading-relaxed"
                />
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-ink/50">Length</span>
                  <Input
                    type="number"
                    min={500}
                    step={100}
                    value={design.closing.duration}
                    onChange={(event) =>
                      applyClosing({
                        ...design.closing,
                        duration: Number(event.target.value) || 500,
                      })
                    }
                    className="h-8 w-24 rounded-none text-[11px]"
                  />
                  <span className="text-[9px] text-ink/35">ms</span>
                  <Button
                    type="button"
                    variant="outline"
                    className="ml-auto h-8 rounded-none text-[10px]"
                    onClick={() => {
                      setClosingPreviewKey((key) => key + 1);
                      setShowClosingPreview(true);
                    }}
                  >
                    <Play className="size-3.5" /> Preview
                  </Button>
                </div>
                <p className="text-[9px] leading-relaxed text-ink/35">
                  Use {"{{names}}"} and {"{{guest}}"} in the note. The closing is
                  separate from page transitions and never interrupts navigation.
                </p>
              </div>
            </div>
          </div>
        </>
      );
    }

    const geometry =
      currentPiece?.kind === "envelope" ? currentPiece.envelope ?? null : null;
    const linerPiece = design.suite
      ? suiteOf(design).find((candidate) => candidate.kind === "liner")
      : null;
    const linerPage = linerPiece ? piecePages(design, linerPiece)[0] : undefined;
    const linerSizeMm = linerPage
      ? { widthMm: (pageSizeOf(linerPage).width * 25.4) / 96, heightMm: (pageSizeOf(linerPage).height * 25.4) / 96 }
      : linerSizeFor(geometry ?? defaultEnvelopeGeometry());
    const envelopeWidthMm = (currentSize.width * 25.4) / 96;
    const envelopeHeightMm = (currentSize.height * 25.4) / 96;
    const showUnit = (mm: number) =>
      envelopeUnit === "in"
        ? Math.round((mm / 25.4) * 100) / 100
        : Math.round(mm * 10) / 10;
    const readUnit = (value: number) =>
      envelopeUnit === "in" ? value * 25.4 : value;
    const depthRatio =
      geometry && geometry.heightMm > 0
        ? geometry.flap.depthMm / geometry.heightMm
        : 0.42;
    const activeSide =
      currentPiece && page && currentPiece.pageIds.indexOf(page.id) === 1
        ? "back"
        : "front";

    return (
      <>
        {geometry && (
        <div className="border-b border-ink/12 p-3">
          <p className="mb-1 font-meta text-[9px] uppercase tracking-[0.16em] text-ink/40">
            Envelope
          </p>
          <p className="mb-2.5 text-[10px] leading-relaxed text-ink/45">
            {activeSide === "back"
              ? "Back: the flap, the liner’s fit and the return address."
              : "Front: the recipient window, the stamp and the postage-safe zone."}{" "}
            Every line here is a drafting guide: it never reaches a print
            export unless you ask for it.
          </p>

          <div className="mb-2.5 grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[10px] text-ink/55">Width</span>
              <Input
                type="number"
                step={envelopeUnit === "in" ? 0.1 : 1}
                min={40}
                max={600}
                value={showUnit(envelopeWidthMm)}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (!Number.isFinite(value)) return;
                  setEnvelopeSize(readUnit(value), envelopeHeightMm);
                }}
                className="h-8 rounded-none text-[11px]"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] text-ink/55">Height</span>
              <Input
                type="number"
                step={envelopeUnit === "in" ? 0.1 : 1}
                min={40}
                max={600}
                value={showUnit(envelopeHeightMm)}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (!Number.isFinite(value)) return;
                  setEnvelopeSize(envelopeWidthMm, readUnit(value));
                }}
                className="h-8 rounded-none text-[11px]"
              />
            </label>
          </div>

          <div className="mb-2.5 grid grid-cols-[1fr_auto] items-center gap-2">
            <Select
              value={
                envelopePresetFor({ width: envelopeWidthMm, height: envelopeHeightMm })?.id ??
                "custom"
              }
              onValueChange={(id) => {
                const preset = ENVELOPE_PRESETS.find((item) => item.id === id);
                if (preset) setEnvelopeSize(preset.width, preset.height);
              }}
            >
              <SelectTrigger className="h-8 rounded-none text-[11px]">
                <SelectValue placeholder="Size" />
              </SelectTrigger>
              <SelectContent>
                {ENVELOPE_PRESETS.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.label} · {preset.width} × {preset.height} mm
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom size</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={envelopeUnit}
              onValueChange={(unit) => setEnvelopeUnit(unit as "mm" | "in")}
            >
              <SelectTrigger className="h-8 w-[74px] rounded-none text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mm">mm</SelectItem>
                <SelectItem value="in">inches</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mb-2 grid grid-cols-[1fr_auto] items-center gap-2">
            <Select
              value={geometry.flap.shape}
              onValueChange={(shape) =>
                patchEnvelope({
                  flap: {
                    ...geometry.flap,
                    shape: shape as FlapShape,
                  },
                })
              }
            >
              <SelectTrigger className="h-8 rounded-none text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FLAP_SHAPES.map((flap) => (
                  <SelectItem key={flap.id} value={flap.id}>
                    {flap.label} flap
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="font-meta text-[9px] text-ink/40">
              {Math.round(geometry.flap.depthMm * 10) / 10} mm deep
            </span>
          </div>

          <div className="mb-1">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10px] text-ink/55">Flap depth</span>
              <span className="font-meta text-[9px] text-ink/40">
                {Math.round(depthRatio * 100)}% of the height
              </span>
            </div>
            <Slider
              value={[Math.round(depthRatio * 100)]}
              min={20}
              max={75}
              step={1}
              onValueChange={([value]) => {
                if (value == null) return;
                patchEnvelope({
                  flap: {
                    ...geometry.flap,
                    depthMm:
                      Math.round(geometry.heightMm * (value / 100) * 10) / 10,
                  },
                });
              }}
            />
          </div>

          <div className="mt-3 border-t border-ink/10 pt-2">
            {/* Each row carries a plain patch builder rather than the patch call:
                the panel is render code, and only the event handler below may
                write to the design. */}
            {(
              [
                ["Flap outline", geometry.showFlap, (value: boolean) => ({ showFlap: value })],
                ["Recipient window", geometry.guides.recipient, (value: boolean) => ({ guides: { ...geometry.guides, recipient: value } })],
                ["Stamp area", geometry.guides.stamp, (value: boolean) => ({ guides: { ...geometry.guides, stamp: value } })],
                ["Return address", geometry.guides.returnAddress, (value: boolean) => ({ guides: { ...geometry.guides, returnAddress: value } })],
                ["Postage-safe zone", geometry.guides.postageSafe, (value: boolean) => ({ guides: { ...geometry.guides, postageSafe: value } })],
                ["Liner fit", geometry.showLiner, (value: boolean) => ({ showLiner: value })],
              ] as [string, boolean, (value: boolean) => Partial<EnvelopeGeometry>][]
            ).map(([label, checked, buildPatch]) => (
              <label key={label} className="flex items-center justify-between gap-2 py-1">
                <span className="text-[11px] text-ink/60">{label}</span>
                <Switch
                  checked={checked}
                  onCheckedChange={(value) => patchEnvelope(buildPatch(value))}
                  className="scale-90"
                />
              </label>
            ))}
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 border-t border-ink/10 pt-2">
            <span className="text-[9px] leading-relaxed text-ink/45">
              Liner {showUnit(linerSizeMm.widthMm)} × {showUnit(linerSizeMm.heightMm)}{" "}
              {envelopeUnit} · {linerPage ? "cut and ready to edit" : "not added yet"}
            </span>
            {!linerPage && (
              <Button
                type="button"
                variant="outline"
                onClick={() => addSuitePiece("liner")}
                className="h-7 shrink-0 rounded-none text-[9px] uppercase tracking-[0.1em]"
              >
                <Plus className="size-3" /> Add
              </Button>
            )}
          </div>
        </div>
        )}

        <PanelHeading
          title="Pages"
          note={
            design.suite && currentPiece
              ? `Sides and pages of “${currentPiece.name}”.`
              : "Reorder, duplicate, hide, or remove sections of the invitation."
          }
        />
        <div className="space-y-1 p-2">
          {(design.suite && currentPiece
            ? piecePages(design, currentPiece).map((candidate) => ({
                candidate,
                index: design.pages.findIndex((item) => item.id === candidate.id),
              }))
            : design.pages.map((candidate, index) => ({ candidate, index }))
          ).map(({ candidate, index }) => (
            <div
              key={candidate.id}
              className={cn(
                "border p-2",
                index === pageIndex ? "border-[var(--red)] bg-[var(--red)]/5" : "border-ink/12",
              )}
            >
              <button
                type="button"
                onClick={() => {
                  setPageIndex(index);
                  setSelectedIds([]);
                }}
                className="flex w-full items-center gap-2 text-left"
              >
                <span className="w-4 text-center font-meta text-[9px] text-ink/35">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-[11px]">{candidate.name}</span>
                {candidate.hidden && <span className="text-[8px] uppercase text-ink/35">hidden</span>}
              </button>
              <div className="mt-1.5 flex items-center gap-1">
                <button type="button" onClick={() => movePage(index, -1)} className="border border-ink/15 p-1 text-ink/50 hover:border-ink" title="Move left">
                  <ChevronUp className="size-3" />
                </button>
                <button type="button" onClick={() => movePage(index, 1)} className="border border-ink/15 p-1 text-ink/50 hover:border-ink" title="Move right">
                  <ChevronDown className="size-3" />
                </button>
                <button type="button" onClick={() => setPageHidden(index)} className="border border-ink/15 p-1 text-ink/50 hover:border-ink" title="Hide page">
                  {candidate.hidden ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                </button>
                <button type="button" onClick={() => { setPageIndex(index); addPage(true); }} className="border border-ink/15 p-1 text-ink/50 hover:border-ink" title="Duplicate page">
                  <Copy className="size-3" />
                </button>
                <button type="button" onClick={() => deletePage(index)} className="ml-auto border border-ink/15 p-1 text-ink/50 hover:border-[var(--red)] hover:text-[var(--red)]" title="Delete page">
                  <Trash2 className="size-3" />
                </button>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" className="mt-2 h-8 w-full rounded-none text-[10px]" onClick={() => addPage(false)}>
            <Plus className="size-3.5" /> Add page
          </Button>
        </div>
        <div className="border-t border-ink/12 p-3">
          <p className="mb-2 font-meta text-[9px] uppercase tracking-[0.16em] text-ink/40">
            Page transition
          </p>
          <Select
            value={design.transition.preset}
            onValueChange={(preset) =>
              apply((current) => ({
                ...current,
                transition: { ...current.transition, preset: preset as DesignDocument["transition"]["preset"] },
              }))
            }
          >
            <SelectTrigger className="h-8 rounded-none text-[11px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAGE_TRANSITIONS.map((transition) => (
                <SelectItem key={transition.id} value={transition.id}>{transition.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1.5 text-[9px] leading-relaxed text-ink/35">
            {TRANSITIONS.find((transition) => transition.id === design.transition.preset)?.note}
          </p>
        </div>
        <div className="border-t border-ink/12 p-3">
          <label className="block">
            <span className="mb-1 block text-[10px] text-ink/55">This page's name</span>
            <Input
              value={page.name}
              onChange={(event) => patchPage({ name: event.target.value })}
              className="h-8 rounded-none text-[11px]"
            />
          </label>
        </div>
        <div className="border-t border-ink/12 p-3">
          <p className="mb-1 font-meta text-[9px] uppercase tracking-[0.16em] text-ink/40">
            Canvas size
          </p>
          <p className="mb-2 text-[10px] leading-relaxed text-ink/45">
            This page is {Math.round(currentSize.width)} ×{" "}
            {Math.round(currentSize.height)} design units. Change it below — the
            artwork is never touched until you choose how it should follow.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[10px] text-ink/55">Width</span>
              <Input
                type="number"
                min={40}
                value={Math.round(sizeDraftValue.width)}
                onChange={(event) => {
                  setSizeTouched(true);
                  setSizeDraft((current) => ({
                    ...current,
                    width: Math.max(40, Number(event.target.value) || 40),
                    height: current.height,
                  }));
                }}
                className="h-8 rounded-none text-[11px]"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] text-ink/55">Height</span>
              <Input
                type="number"
                min={40}
                value={Math.round(sizeDraftValue.height)}
                onChange={(event) => {
                  setSizeTouched(true);
                  setSizeDraft((current) => ({
                    ...current,
                    height: Math.max(40, Number(event.target.value) || 40),
                  }));
                }}
                className="h-8 rounded-none text-[11px]"
              />
            </label>
          </div>
          <div className="mt-2 flex gap-1">
            <Button
              type="button"
              variant="outline"
              className="h-8 flex-1 rounded-none text-[10px]"
              onClick={() => setDeviceCanvasSize("portrait")}
            >
              Portrait
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-8 flex-1 rounded-none text-[10px]"
              onClick={() => setDeviceCanvasSize("landscape")}
            >
              Landscape
            </Button>
          </div>
          <p className="mt-3 mb-1 text-[10px] text-ink/55">On resize</p>
          <div className="grid gap-1">
            {PAGE_RESIZE_MODES.map((mode) => (
              <label
                key={mode.id}
                className={cn(
                  "flex cursor-pointer items-start gap-2 border p-2",
                  resizeMode === mode.id
                    ? "border-[var(--red)] bg-[var(--red)]/5"
                    : "border-ink/12 hover:border-ink/40",
                )}
              >
                <input
                  type="radio"
                  name="resize-mode"
                  className="mt-0.5"
                  checked={resizeMode === mode.id}
                  onChange={() => setResizeMode(mode.id)}
                />
                <span className="min-w-0">
                  <span className="block text-[10px] font-medium text-ink/75">
                    {mode.label}
                  </span>
                  <span className="block text-[9px] leading-snug text-ink/45">
                    {mode.note}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <Button
            type="button"
            className="mt-3 h-8 w-full rounded-none text-[10px] uppercase tracking-[0.12em]"
            onClick={() => applyCanvasSize()}
          >
            Resize this page
          </Button>
        </div>
      </>
    );
  };

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[var(--paper-deep)]">        <header className="z-40 flex h-[60px] shrink-0 items-center gap-1.5 overflow-hidden border-b border-[var(--edge)] bg-[var(--surface-overlay)]/95 px-2 backdrop-blur-xl sm:gap-2 sm:px-4">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="pressable grid size-8 shrink-0 place-items-center rounded-full border border-[var(--edge)] bg-[var(--surface-card)] text-ink/60 shadow-[var(--shadow-xs)] transition-[background-color,border-color,color] duration-150 hover:border-[var(--edge-strong)] hover:text-ink"
          aria-label="Back to the studio"
        >
          <ArrowLeft className="size-3.5" />
        </button>
        <Wordmark className="hidden h-[17px] sm:block" />
        <div className="mx-1 hidden h-6 w-px bg-ink/15 sm:block" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-ui text-[15px] font-semibold leading-tight">{content.title}</p>
          <button
            type="button"
            onClick={() => void persistDesign(design)}
            className={cn(
              "flex items-center gap-1 font-meta text-[8px] uppercase tracking-[0.16em]",
              saveState === "error"
                ? "text-[var(--red)]"
                : saveState === "saved"
                  ? "text-ink/55"
                  : "text-ink/40",
            )}
          >
            {saveState === "saving" ? (
              <Loader2 className="size-2.5 animate-spin" />
            ) : saveState === "saved" ? (
              <Check className="size-2.5" />
            ) : saveState === "error" ? (
              <AlertCircle className="size-2.5" />
            ) : (
              <span className="size-1 bg-[var(--gold)]" />
            )}
            {saveLabel} · Canvas
          </button>
        </div>

        <div className="flex items-center gap-0.5 rounded-full border border-[var(--edge)] bg-[var(--surface-card)]/85 p-0.5 shadow-[var(--shadow-xs)]">
          <IconButton label="Undo" onClick={undo} disabled={!historyFlags.undo} className="border-transparent"><Undo2 className="size-3.5" /></IconButton>
          <IconButton label="Redo" onClick={redo} disabled={!historyFlags.redo} className="border-transparent"><Redo2 className="size-3.5" /></IconButton>
        </div>

        {/* Medium headers keep only the drawing aids: showing every workspace
            toggle here clipped the title and the publish action. */}
        <div className="hidden items-center gap-1 md:flex lg:hidden">
          <span className="mx-1 h-5 w-px bg-ink/12" />
          <IconButton label="Grid" active={overlays.grid} onClick={() => toggleOverlay("grid")}><Grid2x2 className="size-3.5" /></IconButton>
          <IconButton label="Rulers" active={overlays.rulers} onClick={() => toggleOverlay("rulers")}><Ruler className="size-3.5" /></IconButton>
          <IconButton label="Safe area" active={overlays.safe} onClick={() => toggleOverlay("safe")}><Frame className="size-3.5" /></IconButton>
        </div>

        <div className="hidden items-center gap-1 lg:flex">
          <span className="mx-1 h-5 w-px bg-ink/10" />
          <div className="flex items-center gap-0.5 rounded-full border border-[var(--edge)] bg-[var(--surface-card)]/85 p-0.5 shadow-[var(--shadow-xs)]">
            <IconButton label="Desktop canvas" className="rounded-full border-transparent" active={device === "desktop"} onClick={() => setDevice("desktop")}><Monitor className="size-3.5" /></IconButton>
            <IconButton label="Tablet canvas" className="rounded-full border-transparent" active={device === "tablet"} onClick={() => setDevice("tablet")}><Tablet className="size-3.5" /></IconButton>
            <IconButton label="Phone canvas" className="rounded-full border-transparent" active={device === "phone"} onClick={() => setDevice("phone")}><Smartphone className="size-3.5" /></IconButton>
          </div>
          <span className="mx-1 h-5 w-px bg-ink/10" />
          <div className="flex items-center gap-0.5 rounded-full border border-[var(--edge)] bg-[var(--surface-card)]/85 p-0.5 shadow-[var(--shadow-xs)]">
            <IconButton label="Grid" className="rounded-full border-transparent" active={overlays.grid} onClick={() => toggleOverlay("grid")}><Grid2x2 className="size-3.5" /></IconButton>
            <IconButton label="Rulers" className="rounded-full border-transparent" active={overlays.rulers} onClick={() => toggleOverlay("rulers")}><Ruler className="size-3.5" /></IconButton>
            <IconButton label="Safe area" className="rounded-full border-transparent" active={overlays.safe} onClick={() => toggleOverlay("safe")}><Frame className="size-3.5" /></IconButton>
          </div>
          <span className="mx-1 h-5 w-px bg-ink/10" />
          <IconButton label="Toggle left panel" active={leftOpen} onClick={() => setLeftOpen((value) => !value)}><PanelLeft className="size-3.5" /></IconButton>
          <IconButton label="Toggle properties" active={rightOpen} onClick={() => setRightOpen((value) => !value)}><PanelRight className="size-3.5" /></IconButton>
          <span className="mx-1 h-5 w-px bg-ink/12" />
          <IconButton label="Version history" onClick={() => setHistoryOpen(true)}><History className="size-3.5" /></IconButton>
          <IconButton label="Colour variations" onClick={() => setVariationsOpen(true)}><Palette className="size-3.5" /></IconButton>
        </div>

        <div className="ml-1 flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => setLibrariesOpen(true)}
            className="hidden h-8 rounded-full px-3 text-[9px] uppercase tracking-[0.12em] sm:inline-flex"
          >
            <Library className="size-3.5" />
            <span className="hidden sm:inline">Libraries</span>
          </Button>
          <span className="hidden sm:block">
            <IconButton
              label="Keyboard shortcuts"
              onClick={() => setShortcutsOpen(true)}
            >
              <Keyboard className="size-3.5" />
            </IconButton>
          </span>
          <Button
            type="button"
            variant="outline"
            onClick={() => setTimelinePreviewOpen(true)}
            className="hidden h-8 rounded-full px-3 text-[9px] uppercase tracking-[0.12em] lg:inline-flex"
          >
            <Play className="size-3.5" />
            Timeline
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setGuestOpen(true)}
            aria-label="Guest preview"
            title="Guest preview"
            className="h-8 rounded-full px-2.5 text-[9px] uppercase tracking-[0.12em]"
          >
            <Eye className="size-3.5" />
            <span className="hidden sm:inline">Guest preview</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setPrintOpen(true)}
            className="h-8 rounded-full px-2.5 text-[9px] uppercase tracking-[0.12em]"
            aria-label="Export a print-ready PDF"
            title="Export a print-ready PDF"
          >
            <FileText className="size-3.5" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button
            type="button"
            onClick={handlePublish}
            disabled={publishing}
            className="h-8 rounded-full px-3.5 text-[9px] uppercase tracking-[0.14em] shadow-[var(--shadow-pill)]"
          >
            {publishing ? <Loader2 className="size-3.5 animate-spin" /> : published ? <Share2 className="size-3.5" /> : <Sparkles className="size-3.5" />}
            {published ? "Share" : "Publish"}
          </Button>
        </div>
      </header>

      {/* The suite strip: one chip per piece of stationery, its brief, and the
          actions that keep a set coordinated. */}
      <SuiteBar
        design={design}
        activePieceId={currentPiece?.id ?? null}
        onSelect={(pieceId) => {
          const selection = selectPiece(design, pieceId);
          if (!selection) return;
          setPageIndex(selection.pageIndex);
          setSelectedIds([]);
        }}
        onAdd={addSuitePiece}
        onDuplicate={duplicateSuitePiece}
        onDelete={removeSuitePiece}
        onMove={reorderSuitePiece}
        onRename={renameSuitePiece}
        onGuestVisible={changeSuiteGuestVisible}
        onPrint={changeSuitePrint}
        onShareStyle={() => setShareStyleOpen(true)}
      />

      <ShareStyleDialog
        open={shareStyleOpen}
        onOpenChange={setShareStyleOpen}
        design={design}
        sourcePieceId={currentPiece?.id ?? null}
        selectedElementIds={selectedIds}
        onApply={applySharedStyle}
      />

      <div className="flex min-h-0 flex-1">
        <aside className="relative z-20 hidden shrink-0 border-r border-[var(--edge)] bg-[var(--surface-card)] lg:flex">
          {/* Panel rail: one icon per panel, with a paper-white tooltip so the
              five workspace areas never need a row of tiny text tabs. */}
          <div className="flex w-[46px] shrink-0 flex-col items-center gap-1 border-r border-[var(--edge)] bg-[var(--surface-sunk)]/40 py-2">
            {([
              { id: "add" as LeftPanel, icon: Plus, label: "Add" },
              { id: "layers" as LeftPanel, icon: Layers, label: "Layers" },
              { id: "colour" as LeftPanel, icon: Palette, label: "Colour" },
              { id: "opening" as LeftPanel, icon: Mail, label: "Opening" },
              { id: "pages" as LeftPanel, icon: Layout, label: "Pages" },
            ]).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  if (leftPanel === id && leftOpen) {
                    setLeftOpen(false);
                    return;
                  }
                  setLeftPanel(id);
                  setLeftOpen(true);
                }}
                aria-label={label}
                aria-pressed={leftPanel === id && leftOpen}
                title={label}
                className={cn(
                  "pressable group relative grid size-8 place-items-center rounded-[11px]",
                  leftPanel === id && leftOpen
                    ? "bg-[var(--ink)] text-[var(--paper)] shadow-[var(--shadow-pill)]"
                    : "text-ink/45 hover:bg-ink/[0.055] hover:text-ink",
                )}
              >
                <Icon className="size-[16px]" strokeWidth={1.7} aria-hidden />
                <span className="pointer-events-none absolute left-full z-50 ml-2 -translate-x-1 rounded-full border border-[var(--edge)] bg-[var(--surface-overlay)] px-2 py-1 font-ui text-[10px] font-medium whitespace-nowrap text-ink opacity-0 shadow-[var(--shadow-pill)] transition-[opacity,translate] duration-150 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100">
                  {label}
                </span>
              </button>
            ))}
          </div>
          <div
            className={cn(
              "min-h-0 overflow-hidden transition-[width] duration-200 ease-[var(--ease-soft)]",
              leftOpen ? "w-[248px]" : "w-0",
            )}
          >
            <div className="h-full overflow-y-auto scroll-slim">{renderLeftPanel()}</div>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="relative flex min-h-0 flex-1 flex-col">
            <div
              className="relative mx-auto flex min-h-0 w-full flex-1 items-stretch justify-center p-2 sm:p-4"
              style={{ maxWidth: DEVICE_WIDTH[device] }}
            >
              <StudioCanvas
                key={page.id}
                page={page}
                time={animating ? time : 100000}
                zoom={zoom}
                imageUrls={imageUrls}
                selectedIds={selectedIds}
                showHidden={showHidden}
                revealPreview={revealPreview}
                guestName={null}
                rtl={Boolean(content.rtl)}
                aspectLocked={aspectLocked}
                ignoreExit={!animating}
                showGrid={overlays.grid}
                showRulers={overlays.rulers}
                showSafeArea={overlays.safe}
                materialPreview={materialPreview}
                envelope={envelopeGuide}
                resetViewToken={resetViewToken}
                editRequest={editTextRequest}
                onZoom={setZoom}
                onSelect={(ids) => {
                  setSelectedIds(ids);
                  setAnimating(false);
                  setPlaying(false);
                }}
                onMove={(updates) =>
                  gestureElements((elements) =>
                    elements.map((element) => {
                      const update = updates.find((item) => item.id === element.id);
                      return update ? { ...element, x: update.x, y: update.y } : element;
                    }),
                  )
                }
                onResize={(elementId, box) =>
                  gestureElements((elements) =>
                    elements.map((element) =>
                      element.id === elementId ? { ...element, ...box } : element,
                    ),
                  )
                }
                onRotate={(elementId, rotation) =>
                  gestureElements((elements) =>
                    elements.map((element) =>
                      element.id === elementId ? { ...element, rotation } : element,
                    ),
                  )
                }
                onReveal={testReveal}
                onAltDuplicate={duplicateForDrag}
                onTextCommit={(elementId, text) => {
                  patchElement(elementId, { text });
                  toast.success("Text updated.");
                }}
                onContextAction={handleCanvasContextAction}
                onEditingChange={setCanvasEditing}
              />
            </div>

            {/* Selection toolbar: every destructive action is one visible tap
             * away on desktop and mobile, and nothing is offered when the
             * selection cannot be deleted. */}
            {selected.length > 0 && (
              <div className="relative z-30 flex shrink-0 flex-wrap items-center gap-1 border-t border-ink/8 bg-white/75 px-3 py-2 backdrop-blur-xl">
                <span className="mr-auto min-w-0 truncate font-meta text-[8px] uppercase tracking-[0.14em] text-ink/45">
                  {selected.length === 1 ? selected[0].name : `${selected.length} layers`}
                  {canvasEditing ? " · editing text" : ""}
                </span>
                <IconButton label="Duplicate selection" onClick={duplicateSelection}>
                  <Copy className="size-3.5" />
                </IconButton>
                <IconButton
                  label={selected.every((element) => element.locked) ? "Unlock selection" : "Lock selection"}
                  onClick={toggleSelectionLock}
                >
                  {selected.every((element) => element.locked) ? (
                    <Unlock className="size-3.5" />
                  ) : (
                    <Lock className="size-3.5" />
                  )}
                </IconButton>
                <IconButton
                  label={selected.every((element) => element.hidden) ? "Show selection" : "Hide selection"}
                  onClick={toggleSelectionHidden}
                >
                  {selected.every((element) => element.hidden) ? (
                    <EyeOff className="size-3.5" />
                  ) : (
                    <Eye className="size-3.5" />
                  )}
                </IconButton>
                <IconButton label="Send to back" onClick={() => moveSelectionToEdge("back")}>
                  <ChevronDown className="size-3.5" />
                </IconButton>
                <IconButton label="Bring to front" onClick={() => moveSelectionToEdge("front")}>
                  <ChevronUp className="size-3.5" />
                </IconButton>
                <button
                  type="button"
                  onClick={deleteSelection}
                  disabled={!canDeleteSelection}
                  title={
                    canvasEditing
                      ? "Finish editing the text before deleting"
                      : canDeleteSelection
                        ? "Delete selected layers (⌫)"
                        : "Locked layers are protected — unlock to delete"
                  }
                  className="flex h-8 items-center gap-1.5 rounded-full border border-[var(--red)] bg-[var(--red)] px-3 text-[9px] uppercase tracking-[0.12em] text-[#f2f1ed] transition-colors hover:bg-[#8a0318] disabled:cursor-not-allowed disabled:border-ink/15 disabled:bg-transparent disabled:text-ink/30"
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </button>
              </div>
            )}

            <div className="pointer-events-none absolute left-3 top-3 z-20 flex flex-col gap-1">
              <span className="pointer-events-auto rounded-md border border-ink/15 bg-[var(--paper-light)]/90 px-2 py-1 font-meta text-[8px] uppercase tracking-[0.12em] text-ink/55 backdrop-blur">
                {page.name} · {page.elements.length} layers
              </span>
              {/* The two ways to look at this card, kept next to the card. */}
              <span className="pointer-events-auto flex w-fit items-center gap-0.5 rounded-full border border-ink/15 bg-[var(--paper-light)]/90 p-0.5 backdrop-blur">
                <button
                  type="button"
                  aria-pressed={!materialPreview}
                  title="Artwork / Print mode — the clean card that exports"
                  onClick={() => setMaterialMode(false)}
                  className={cn(
                    "rounded-full px-2 py-0.5 font-meta text-[8px] uppercase tracking-[0.1em] transition-colors",
                    materialPreview
                      ? "text-ink/50 hover:text-ink"
                      : "bg-[var(--ink)] text-[var(--paper-light)]",
                  )}
                >
                  Artwork
                </button>
                <button
                  type="button"
                  aria-pressed={materialPreview}
                  title="Material Preview — a screen simulation of paper, foil and relief"
                  onClick={() => setMaterialMode(true)}
                  className={cn(
                    "rounded-full px-2 py-0.5 font-meta text-[8px] uppercase tracking-[0.1em] transition-colors",
                    materialPreview
                      ? "bg-[var(--ink)] text-[var(--paper-light)]"
                      : "text-ink/50 hover:text-ink",
                  )}
                >
                  Materials
                </button>
              </span>
              {selected.length > 0 && (
                <span className="pointer-events-auto rounded-md border border-[var(--red)]/30 bg-[var(--paper-light)]/90 px-2 py-1 font-meta text-[8px] uppercase tracking-[0.12em] text-[var(--red)] backdrop-blur">
                  {selected.length === 1 ? selected[0].name : `${selected.length} selected`}
                </span>
              )}
            </div>

            <div
              className={cn(
                "pointer-events-none absolute right-3 z-20 flex flex-col items-end gap-1 transition-[bottom] duration-200",
                selected.length > 0 ? "bottom-[54px]" : "bottom-3",
              )}
            >
              <div className="pointer-events-auto flex items-center gap-0.5 overflow-hidden rounded-full border border-ink/8 bg-white/85 p-0.5 shadow-[var(--shadow-soft)] backdrop-blur">
                <button
                  type="button"
                  onClick={() => setZoom((value) => Math.max(0.4, value / 1.2))}
                  aria-label="Zoom out"
                  className="pressable grid size-7 place-items-center rounded-full text-ink/55 hover:bg-ink/5 hover:text-ink"
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="px-1 font-meta text-[9px] tabular-nums text-ink/45">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((value) => Math.min(2.4, value * 1.2))}
                  aria-label="Zoom in"
                  className="pressable grid size-7 place-items-center rounded-full text-ink/55 hover:bg-ink/5 hover:text-ink"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowHidden((value) => !value)}
                className="pointer-events-auto grid size-8 place-items-center rounded-full border border-ink/8 bg-white/85 text-ink/50 shadow-[var(--shadow-soft)] backdrop-blur transition-[background-color,color] duration-150 hover:bg-ink/5 hover:text-ink"
                title={showHidden ? "Hide hidden layers" : "Show hidden layers"}
              >
                {showHidden ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
              </button>
              <button
                type="button"
                onClick={fitCanvas}
                className="pointer-events-auto rounded-md border border-ink/15 bg-[var(--paper-light)]/90 px-1.5 py-1 font-meta text-[8px] text-ink/50 backdrop-blur transition-[background-color,color] duration-150 hover:bg-ink/5 hover:text-ink"
                title="Fit canvas (⌘/Ctrl + 0)"
              >
                {Math.round(zoom * 100)}%
              </button>
            </div>
          </div>

          {/* Page strip */}
          <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-t border-ink/15 bg-[var(--paper-light)] px-3 py-2">
            <span className="shrink-0 font-meta text-[8px] uppercase tracking-[0.14em] text-ink/35">
              Pages
            </span>
            {design.pages.map((candidate, index) => (
              <div key={candidate.id} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setPageIndex(index);
                    setSelectedIds([]);
                  }}
                  className={cn(
                    "block w-[52px] overflow-hidden border bg-white text-left transition-colors",
                    index === pageIndex ? "border-[var(--red)]" : "border-ink/20 hover:border-ink/50",
                    candidate.hidden && "opacity-45",
                  )}
                  aria-label={`Page ${index + 1}: ${candidate.name}`}
                >
                  <DesignStage
                    width={candidate.width}
                    height={candidate.height}
                  >
                    {() => (
                      <DesignPageView
                        page={candidate}
                        time={100000}
                        imageUrls={imageUrls}
                        guestName={null}
                        rtl={Boolean(content.rtl)}
                        ignoreExit
                      />
                    )}
                  </DesignStage>
                </button>
                <span className="mt-0.5 block text-center font-meta text-[7px] text-ink/35">
                  {index + 1} · {candidate.name.slice(0, 10)}
                </span>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addPage(false)}
              className="grid h-[69px] w-[52px] shrink-0 place-items-center border border-dashed border-ink/25 text-ink/40 hover:border-ink hover:text-ink"
              aria-label="Add page"
            >
              <Plus className="size-4" />
            </button>
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <IconButton label="Page settings" onClick={() => { setLeftPanel("pages"); setLeftOpen(true); }}>
                <Layout className="size-3.5" />
              </IconButton>
              <IconButton label="Toggle timeline" active={timelineOpen} onClick={() => setTimelineOpen((value) => !value)}>
                <Play className="size-3.5" />
              </IconButton>
            </div>
          </div>

          {timelineOpen && (
            <div className="hidden h-[190px] shrink-0 border-t border-ink/15 lg:block">
              <Timeline
                page={page}
                clips={clips}
                duration={duration}
                time={time}
                playing={playing}
                selectedIds={selectedIds}
                pixelsPerSecond={pixelsPerSecond}
                onSeek={seek}
                onPlayToggle={() => {
                  setAnimating(true);
                  setPlaying((value) => !value);
                }}
                onRestart={() => {
                  timeRef.current = 0;
                  setTime(0);
                  setAnimating(true);
                  setPlaying(true);
                }}
                onSelect={setSelectedIds}
                onClipChange={clipChange}
                onPreviewClip={(elementId) => {
                  const element = page.elements.find((candidate) => candidate.id === elementId);
                  if (!element) return;
                  setSelectedIds([elementId]);
                  const start = Math.max(0, element.animation.delay - 250);
                  timeRef.current = start;
                  setTime(start);
                  setAnimating(true);
                  setPlaying(true);
                }}
                onZoom={setPixelsPerSecond}
              />
            </div>
          )}
        </main>

        <aside
          className={cn(
            "hidden shrink-0 overflow-y-auto border-l border-[var(--edge)] bg-[var(--surface-card)] transition-[width] duration-200 lg:block",
            rightOpen ? "w-[304px]" : "w-0 overflow-hidden border-l-0",
          )}
        >
          <Inspector
            page={page}
            selected={selected}
            aspectLocked={aspectLocked}
            onAspectLocked={setAspectLocked}
            onPatch={patchElement}
            onPagePatch={patchPage}
            onAlign={alignSelection}
            onDistribute={distributeSelection}
            onLayer={orderSelection}
            onDuplicate={duplicateSelection}
            onDelete={deleteSelection}
            deleteDisabled={!canDeleteSelection}
            deleteHint={
              canvasEditing
                ? "Finish editing the text before deleting"
                : "Locked layers are protected — unlock to delete"
            }
            onGroup={groupSelection}
            onUngroup={ungroupSelection}
            onUploadImage={handleInspectorUpload}
            onTestReveal={testReveal}
            onPreviewAnimation={previewAnimation}
            materialPreview={materialPreview}
            onShowMaterials={() => setMaterialMode(true)}
            onEditText={(elementId) =>
              setEditTextRequest({ id: elementId, token: Date.now() })
            }
          />
        </aside>
      </div>

      {/* Mobile navigation */}
      <nav className="flex shrink-0 items-stretch border-t border-[var(--edge)] bg-[var(--surface-card)] pb-[env(safe-area-inset-bottom)] lg:hidden">
        {[
          { id: "add" as const, label: "Add", icon: Plus },
          { id: "libraries" as const, label: "Library", icon: Library },
          { id: "layers" as const, label: "Layers", icon: Layers },
          { id: "colour" as const, label: "Colour", icon: Palette },
          { id: "properties" as const, label: "Props", icon: PanelRight },
          { id: "pages" as const, label: "Pages", icon: Layout },
          { id: "timeline" as const, label: "Motion", icon: Play },
          { id: "history" as const, label: "History", icon: History },
        ].map(({ id: sheet, label, icon: Icon }) => (
          <button
            key={sheet}
            type="button"
            onClick={() => {
              if (sheet === "libraries") {
                setLibrariesOpen(true);
                return;
              }
              if (sheet === "history") {
                setHistoryOpen(true);
                return;
              }
              setMobileSheet((current) => (current === sheet ? null : sheet));
              if (sheet === "add" || sheet === "layers" || sheet === "colour" || sheet === "pages") {
                setLeftPanel(sheet);
              }
            }}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 font-meta text-[8px] uppercase tracking-[0.1em]",
              mobileSheet === sheet ? "text-[var(--red)]" : "text-ink/50",
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </nav>

      {mobileSheet && (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end bg-black/25 lg:hidden" onClick={() => setMobileSheet(null)}>
          <div
            className="flex max-h-[min(78dvh,calc(100dvh-3rem))] flex-col overflow-hidden rounded-t-[var(--radius-sheet)] border-t border-[var(--edge)] bg-[var(--surface-overlay)] pb-[env(safe-area-inset-bottom)] shadow-[var(--shadow-sheet)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--edge)] px-4 py-2.5">
              <span className="section-label capitalize">{mobileSheet}</span>
              <button type="button" onClick={() => setMobileSheet(null)} className="pressable rounded-full border border-[var(--edge)] px-3 py-1 font-ui text-[0.62rem] font-medium uppercase tracking-[0.1em] text-ink/55 hover:border-[var(--edge-strong)] hover:text-ink">
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {mobileSheet === "properties" ? (
                <Inspector
                  page={page}
                  selected={selected}
                  aspectLocked={aspectLocked}
                  onAspectLocked={setAspectLocked}
                  onPatch={patchElement}
                  onPagePatch={patchPage}
                  onAlign={alignSelection}
                  onDistribute={distributeSelection}
                  onLayer={orderSelection}
                  onDuplicate={duplicateSelection}
                  onDelete={deleteSelection}
                  deleteDisabled={!canDeleteSelection}
                  deleteHint={
                    canvasEditing
                      ? "Finish editing the text before deleting"
                      : "Locked layers are protected — unlock to delete"
                  }
                  onGroup={groupSelection}
                  onUngroup={ungroupSelection}
                  onUploadImage={handleInspectorUpload}
                  onTestReveal={testReveal}
                  onPreviewAnimation={previewAnimation}
            materialPreview={materialPreview}
            onShowMaterials={() => setMaterialMode(true)}
                  onEditText={(elementId) => {
                    setEditTextRequest({ id: elementId, token: Date.now() });
                    setMobileSheet(null);
                  }}
                />
              ) : mobileSheet === "timeline" ? (
                <div className="h-[240px]">
                  <Timeline
                    page={page}
                    clips={clips}
                    duration={duration}
                    time={time}
                    playing={playing}
                    selectedIds={selectedIds}
                    pixelsPerSecond={pixelsPerSecond}
                    onSeek={seek}
                    onPlayToggle={() => {
                      setAnimating(true);
                      setPlaying((value) => !value);
                    }}
                    onRestart={() => {
                      timeRef.current = 0;
                      setTime(0);
                      setAnimating(true);
                      setPlaying(true);
                    }}
                    onSelect={setSelectedIds}
                    onClipChange={clipChange}
                    onPreviewClip={(elementId) => {
                      const element = page.elements.find((candidate) => candidate.id === elementId);
                      if (!element) return;
                      setSelectedIds([elementId]);
                      const start = Math.max(0, element.animation.delay - 250);
                      timeRef.current = start;
                      setTime(start);
                      setAnimating(true);
                      setPlaying(true);
                    }}
                    onZoom={setPixelsPerSecond}
                  />
                </div>
              ) : (
                <div>{renderLeftPanel()}</div>
              )}
            </div>
          </div>
        </div>
      )}

      <LibraryPanel
        open={librariesOpen}
        onClose={() => setLibrariesOpen(false)}
        content={content}
        design={design}
        selectedIds={selectedIds}
        selectedAnimations={selectedAnimations}
        onApplyTemplate={applyTemplate}
        onApplyOpening={applyOpening}
        onApplyAnimation={applyAnimation}
        onApplyFont={applyFont}
        onApplyStyle={applyStyle}
        onAddPageLayout={addPageLayout}
        onApplyBuiltinAsset={applyBuiltinAsset}
        onAddFrame={addFrame}
        onAddRevealPreset={addRevealPreset}
        onApplyTypeStyle={applyTypeStyleToSelection}
        onApplyPalette={applyPalette}
        onApplyColour={applyLibraryColour}
        onApplyMaterial={applyMaterial}
        activeMaterialId={activeMaterialId}
        tab={libraryTab}
        onTabChange={setLibraryTab}
      />

      {guestOpen && (
        <SequentialGuestPreview
          design={design}
          imageUrls={imageUrls}
          guestName={null}
          names={namesLabel}
          rtl={Boolean(content.rtl)}
          reducedMotion={reducedMotion}
          palette={content.palette}
          onClose={() => setGuestOpen(false)}
        />
      )}

      {timelinePreviewOpen && (
        <GuestExperience
          design={design}
          imageUrls={imageUrls}
          guestName={null}
          names={namesLabel}
          rtl={Boolean(content.rtl)}
          reducedMotion={reducedMotion}
          palette={content.palette}
          mode="timeline"
          startPage={pageIndex}
          onClose={() => setTimelinePreviewOpen(false)}
        />
      )}

      <PrintExportDialog
        open={printOpen}
        onOpenChange={setPrintOpen}
        design={design}
        pageIndex={pageIndex}
        imageUrls={imageUrls}
        title={content.title}
        rtl={Boolean(content.rtl)}
      />

      {openingDesigner}
      {openingStagePreview}
      {closingPreview}

      <Dialog open={Boolean(pendingTemplate)} onOpenChange={(open) => !open && setPendingTemplate(null)}>
        <DialogContent className="max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="font-ui text-xl font-semibold tracking-[-0.01em]">Apply “{pendingTemplate?.name}”?</DialogTitle>
            <DialogDescription className="text-[12px] leading-relaxed">
              This replaces the pages and layers on this invitation's canvas. Your
              written words, date, venue, guests, RSVP settings, photos, and public
              link stay exactly as they are. Undo is available.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" className="rounded-none" onClick={() => setPendingTemplate(null)}>
              Keep current design
            </Button>                <Button type="button" className="rounded-none" onClick={confirmTemplate}>
                  Use design in canvas studio
                </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="font-ui text-xl font-semibold tracking-[-0.01em]">
              {published ? "Your invitation is live" : "Share this invitation"}
            </DialogTitle>
            <DialogDescription className="text-[12px] leading-relaxed">
              {published
                ? "The public page renders this saved canvas, opening experience, timeline, and interactions."
                : "Publish to make this canvas available at its public link."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input readOnly value={publicLink} className="h-9 rounded-none text-[11px]" />
            <Button
              type="button"
              className="h-9 shrink-0 rounded-none text-[10px] uppercase tracking-[0.12em]"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(publicLink);
                  toast.success("Public link copied.");
                } catch {
                  toast.error("Could not copy the link.");
                }
              }}
            >
              <Copy className="size-3.5" /> Copy
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="h-9 rounded-none text-[10px]" onClick={() => setGuestOpen(true)}>
              <Eye className="size-3.5" /> Open guest experience
            </Button>
            {published && (
              <Button type="button" variant="outline" className="h-9 rounded-none text-[10px]" onClick={handleUnpublish}>
                Return to drafts
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={historyOpen}
        onOpenChange={(open) => !versionBusy && setHistoryOpen(open)}
      >
        <DialogContent className="max-h-[86vh] max-w-[520px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-ui text-xl font-semibold tracking-[-0.01em]">
              Version history
            </DialogTitle>
            <DialogDescription className="text-[12px] leading-relaxed">
              A snapshot of this canvas is saved automatically as you edit, at
              most every few minutes. Save one before a big change, or restore
              an earlier state at any time. Restoring is itself reversible.
            </DialogDescription>
          </DialogHeader>
          <Button
            type="button"
            onClick={() => void snapshotVersion()}
            disabled={versionBusy}
            className="h-9 w-full rounded-none text-[10px] uppercase tracking-[0.14em]"
          >
            {versionBusy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Plus className="size-3.5" />
            )}
            Save current version
          </Button>
          <div className="space-y-1.5">
            {designVersions === undefined ? (
              <p className="flex items-center gap-1.5 py-2 text-[11px] text-ink/45">
                <Loader2 className="size-3 animate-spin" /> Loading versions…
              </p>
            ) : designVersions.length === 0 ? (
              <p className="border border-dashed border-ink/15 px-3 py-4 text-[11px] leading-relaxed text-ink/50">
                No versions yet. Keep editing, or save one now before you make a
                large change.
              </p>
            ) : (
              designVersions.map((version) => (
                <div
                  key={version._id}
                  className="flex items-center justify-between gap-3 border border-ink/12 p-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium">
                      {version.label ?? "Automatic snapshot"}
                    </p>
                    <p className="text-[9px] uppercase tracking-[0.08em] text-ink/40">
                      {new Date(version.createdAt).toLocaleString()} ·{" "}
                      {version.pageCount} page{version.pageCount === 1 ? "" : "s"} ·{" "}
                      {version.elementCount} layer{version.elementCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void restoreVersion(version._id)}
                    disabled={versionBusy}
                    className="h-7 shrink-0 rounded-md px-2 text-[9px] uppercase tracking-[0.1em]"
                  >
                    Restore
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={variationsOpen}
        onOpenChange={(open) => !variationBusy && setVariationsOpen(open)}
      >
        <DialogContent className="max-h-[86vh] max-w-[560px] overflow-y-auto scroll-slim">
          <DialogHeader>
            <DialogTitle className="font-ui text-xl font-semibold tracking-[-0.01em]">
              Colour variations
            </DialogTitle>
            <DialogDescription className="text-[12px] leading-relaxed">
              A variation is a separate invitation: the same pages, wording and
              images, recoloured and filed as a new draft. This design is never
              changed.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {variationPalettes.map((palette) => {
              const busy = variationBusy === palette.id;
              return (
                <button
                  key={`${palette.group}-${palette.id}`}
                  type="button"
                  onClick={() => void createVariation(palette)}
                  disabled={Boolean(variationBusy)}
                  className="pressable rounded-2xl border border-ink/10 bg-white/70 p-2.5 text-left hover:border-ink/30 hover:shadow-[var(--shadow-soft)] disabled:cursor-wait disabled:opacity-45"
                >
                  <span className="flex gap-1.5" aria-hidden>
                    {[palette.paper, palette.ink, palette.accent].map((colour) => (
                      <span
                        key={colour}
                        className="size-5 rounded-full border border-black/10"
                        style={{ background: colour }}
                      />
                    ))}
                  </span>
                  <span className="mt-2 block truncate text-[11.5px] font-medium">
                    {palette.name}
                  </span>
                  <span className="block truncate font-meta text-[8px] tracking-[0.16em] text-ink/40 uppercase">
                    {busy ? "Creating…" : palette.group}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="border-t border-ink/10 pt-3 text-[10px] leading-relaxed text-ink/45">
            The page background and the design's dominant ink and accent are
            remapped. Colours set by hand on individual layers stay exactly as
            they are.
          </p>
        </DialogContent>
      </Dialog>

      <ShortcutReference open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

      <span className="sr-only" aria-live="polite">
        {historyTick} edits
      </span>

      {/* The picker itself lives at the root so the panel can open it without
          holding the element while it renders. */}
      <input
        ref={imageFileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="sr-only"
        onChange={(event) => void handleAddImage(event)}
      />
    </div>
  );
}
