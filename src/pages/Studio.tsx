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
import { LibraryPanel, ShapePreview } from "@/components/studio/LibraryPanel";
import { PrintExportDialog } from "@/components/studio/PrintExportDialog";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  CLOSING_STYLES,
  OPENING_EXPERIENCES,
  PAGE_TRANSITIONS,
  PAGE_TRANSITIONS as TRANSITIONS,
  applyStylePreset,
  cleanRevealLinks,
  clipsForPage,
  defaultAnimation,
  duplicateElements,
  makeElement,
  makeId,
  normalizeDesign,
  SHAPES,
  timelineDuration,
  type ClosingSettings,
  type DesignDocument,
  type DesignElement,
  type DesignPage,
  type ElementAnimation,
  type OpeningSettings,
  type StylePreset,
} from "@/lib/design";
import {
  MOTIFS,
  contentFromInvitation,
  type InvitationContent,
} from "@/lib/invitation";
import { pageLayoutById } from "@/lib/layouts";
import { ensureFont, fontById } from "@/lib/fonts";
import { recolourDesign, type ColourPalette } from "@/lib/palettes";
import type { BuiltinAsset } from "@/lib/assets";
import type { RevealPreset } from "@/lib/reveals";
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
  Heart,
  Image as ImageIcon,
  Layers,
  Layout,
  Library,
  Keyboard,
  Loader2,
  Lock,
  Minus,
  Monitor,
  Palette,
  PanelLeft,
  PanelRight,
  Play,
  Plus,
  Redo2,
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
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
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

function IconButton({
  label,
  onClick,
  active,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "grid size-8 place-items-center border transition-colors disabled:cursor-not-allowed disabled:opacity-30",
        active
          ? "border-ink bg-ink text-[#f2f1ed]"
          : "border-ink/18 text-ink/60 hover:border-ink hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function PanelHeading({ title, note }: { title: string; note?: string }) {
  return (
    <div className="border-b border-ink/12 px-4 py-3">
      <p className="font-meta text-[9px] uppercase tracking-[0.2em] text-ink/40">
        {title}
      </p>
      {note && <p className="mt-1 text-[10px] leading-relaxed text-ink/45">{note}</p>}
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
      className="flex items-start gap-2.5 border border-ink/15 p-2.5 text-left transition-colors hover:border-ink hover:bg-ink/[0.03]"
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-[var(--red)]" />
      <span>
        <span className="block text-[11px] font-medium">{label}</span>
        <span className="mt-0.5 block text-[9px] leading-relaxed text-ink/40">{note}</span>
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
  const publishInvitation = useMutation(api.invitations.publish);
  const unpublishInvitation = useMutation(api.invitations.unpublish);
  const generateUploadUrl = useMutation(api.library.generateUploadUrl);

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
  const [aspectLocked, setAspectLocked] = useState(false);
  const [showHidden, setShowHidden] = useState(true);
  const [revealPreview, setRevealPreview] = useState<Set<string>>(new Set());
  const [leftPanel, setLeftPanel] = useState<LeftPanel>("add");
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [timelineOpen, setTimelineOpen] = useState(true);
  const [pixelsPerSecond, setPixelsPerSecond] = useState(80);
  const [librariesOpen, setLibrariesOpen] = useState(false);
  const [guestOpen, setGuestOpen] = useState(false);
  const [timelinePreviewOpen, setTimelinePreviewOpen] = useState(false);
  const [mobileSheet, setMobileSheet] = useState<MobileSheet>(null);
  const [pendingTemplate, setPendingTemplate] = useState<{
    design: DesignDocument;
    name: string;
  } | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [openingPreview, setOpeningPreview] = useState(0);
  const [showOpeningPreview, setShowOpeningPreview] = useState(false);
  const [showClosingPreview, setShowClosingPreview] = useState(false);
  const [closingPreviewKey, setClosingPreviewKey] = useState(0);
  const [localImageUrls, setLocalImageUrls] = useState<Record<string, string>>({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const [historyTick, setHistoryTick] = useState(0);
  const [historyFlags, setHistoryFlags] = useState({ undo: false, redo: false });
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [resetViewToken, setResetViewToken] = useState(0);
  const [editTextRequest, setEditTextRequest] = useState<{
    id: string;
    token: number;
  } | null>(null);

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
      pastRef.current = [...pastRef.current.slice(-59), current];
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
    pastRef.current = [...pastRef.current.slice(-59), start];
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
    const previous = pastRef.current.pop();
    if (!current || !previous) return;
    futureRef.current = [...futureRef.current, current];
    designRef.current = previous;
    setDesignState(previous);
    scheduleSave(previous);
    setHistoryFlags({
      undo: pastRef.current.length > 0,
      redo: true,
    });
    setHistoryTick((tick) => tick + 1);
  }, [scheduleSave]);

  const redo = useCallback(() => {
    const current = designRef.current;
    const next = futureRef.current.pop();
    if (!current || !next) return;
    pastRef.current = [...pastRef.current, current];
    designRef.current = next;
    setDesignState(next);
    scheduleSave(next);
    setHistoryFlags({
      undo: true,
      redo: futureRef.current.length > 0,
    });
    setHistoryTick((tick) => tick + 1);
  }, [scheduleSave]);

  // Page state (kept near the top so selection tooling can reference it).
  const page: DesignPage | null = design?.pages[Math.min(pageIndex, design.pages.length - 1)] ?? null;

  /** Deletable layer kinds. `cleanRevealLinks` already clears dangling covers,
   * so removing a shape/motif/image/text is safe; the remaining canvas stay
   * internally consistent after every delete. */
  const DesignElementDeletableKinds = new Set<DesignElement["kind"]>([
    "text",
    "image",
    "shape",
    "motif",
  ] as const);
  const duration = page ? timelineDuration(page) : 4000;
  const clips = page ? clipsForPage(page) : [];
  const selected = page
    ? page.elements.filter((element) => selectedIds.includes(element.id))
    : [];

  const deleteableKindSet = new Set<DesignElement["kind"]>([
    "text",
    "image",
    "shape",
    "motif",
  ] as const);

  const hasDeletableSelection =
    selected.length > 0 &&
    selected.every((element) => deleteableKindSet.has(element.kind));

  const hasAnyDeletableSelection = selected.some((element) =>
    deleteableKindSet.has(element.kind),
  );
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
