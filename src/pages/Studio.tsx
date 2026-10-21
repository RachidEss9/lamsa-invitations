import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Wordmark } from "@/components/brand/Wordmark";
import { ClosingStage } from "@/components/invitation/ClosingStage";
import { DesignPageView, DesignStage } from "@/components/invitation/DesignPageView";
import { OpeningStage } from "@/components/invitation/OpeningStage";
import { GuestExperience } from "@/components/studio/GuestExperience";
import { Inspector } from "@/components/studio/Inspector";
import { LibraryPanel } from "@/components/studio/LibraryPanel";
import { StudioCanvas } from "@/components/studio/StudioCanvas";
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
  duplicateElements,
  makeElement,
  makeId,
  normalizeDesign,
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
  Heart,
  Image as ImageIcon,
  Layers,
  Layout,
  Library,
  Loader2,
  Monitor,
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
type LeftPanel = "add" | "layers" | "opening" | "pages";
type MobileSheet = null | "add" | "layers" | "properties" | "pages" | "timeline";

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

  const pastRef = useRef<DesignDocument[]>([]);
  const futureRef = useRef<DesignDocument[]>([]);
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
    },
    [scheduleSave],
  );

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

  const page: DesignPage | null = design?.pages[Math.min(pageIndex, design.pages.length - 1)] ?? null;
  const duration = page ? timelineDuration(page) : 4000;
  const clips = page ? clipsForPage(page) : [];
  const selected = page
    ? page.elements.filter((element) => selectedIds.includes(element.id))
    : [];
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

  const addElement = (element: DesignElement) => {
    setPageElements((elements) => [...elements, element]);
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
        font: content?.fontPair ?? "romance",
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

  const addShape = (shape: DesignElement["shape"]) => {
    addElement(
      makeElement("shape", {
        name: shape === "line" ? "Rule" : "Shape",
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
      }),
    );
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
      font: content?.fontPair ?? "romance",
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
      patchElement(selected[0].id, { imageStorageId: storageId });
    } catch (error) {
      toast.error(messageOf(error));
    } finally {
      setUploadingImage(false);
    }
  };

  const deleteSelection = () => {
    if (selectedIds.length === 0) return;
    setPageElements((elements) => cleanRevealLinks(elements.filter((element) => !selectedIds.includes(element.id))));
    setSelectedIds([]);
  };

  const copySelection = () => {
    if (selected.length === 0) return;
    clipboardRef.current = selected.map((element) => ({ ...element }));
    toast.success(
      `${selected.length} layer${selected.length === 1 ? "" : "s"} copied.`,
    );
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
    setPageElements((elements) =>
      elements.map((element) => {
        if (!selectedIds.includes(element.id)) return element;
        if (kind === "left") return { ...element, x: 40 };
        if (kind === "right") return { ...element, x: 1000 - 40 - element.w };
        if (kind === "hcenter") return { ...element, x: (1000 - element.w) / 2 };
        if (kind === "top") return { ...element, y: 40 };
        if (kind === "bottom") return { ...element, y: 1333.33 - 40 - element.h };
        return { ...element, y: (1333.33 - element.h) / 2 };
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

  const placeAsset = (storageId: string, name: string, url?: string | null) => {
    if (url) {
      setLocalImageUrls((previous) => ({ ...previous, [storageId]: url }));
    }
    addElement(
      makeElement("image", {
        name,
        imageStorageId: storageId,
        x: 190,
        y: 460,
        w: 620,
        h: 430,
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
    setLibrariesOpen(false);
  };

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
    apply((currentDesign) => ({
      ...currentDesign,
      pages: [...currentDesign.pages, nextPage],
    }));
    setPageIndex(design.pages.length);
    setSelectedIds([]);
  };

  const deletePage = (index: number) => {
    if (!design || design.pages.length <= 1) {
      toast.error("An invitation needs at least one page.");
      return;
    }
    apply((current) => ({
      ...current,
      pages: current.pages.filter((_, position) => position !== index),
    }));
    setPageIndex((current) => Math.min(current, design.pages.length - 2));
    setSelectedIds([]);
  };

  const movePage = (index: number, direction: -1 | 1) => {
    if (!design) return;
    const target = index + direction;
    if (target < 0 || target >= design.pages.length) return;
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

  // Keyboard shortcuts: undo/redo, duplicate, delete, arrows, save, play.
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
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }
      if (mod && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (designRef.current) void persistDesign(designRef.current);
        return;
      }
      if (mod && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelection();
        return;
      }
      if (mod && event.key.toLowerCase() === "c") {
        copySelection();
        return;
      }
      if (mod && event.key.toLowerCase() === "v") {
        event.preventDefault();
        pasteClipboard();
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedIds.length) {
          event.preventDefault();
          deleteSelection();
        }
        return;
      }
      if (event.key === "Escape") {
        setSelectedIds([]);
        return;
      }
      if (event.key === " ") {
        event.preventDefault();
        setPlaying((value) => !value);
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
  }, [selectedIds, undo, redo, persistDesign, pageIndex, design]);

  if (invitation === undefined && idIsValid) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="flex h-14 items-center border-b border-ink/15 px-5">
          <Wordmark />
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
        <h1 className="mt-5 font-display text-3xl">This studio is private.</h1>
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
        ? "Unsaved"
        : saveState === "error"
          ? "Save failed"
          : "Saved";

  const openingStagePreview = (
    <Dialog open={showOpeningPreview} onOpenChange={setShowOpeningPreview}>
      <DialogContent className="max-w-[440px] overflow-hidden p-0">
        <div className="relative aspect-[3/4] w-full">
          <OpeningStage
            key={openingPreview}
            opening={{ ...design.opening, autoOpen: false }}
            accent={content.palette.accent}
            background={content.palette.background}
            ink={content.palette.ink}
            guestName="Amelia"
            coverUrl={
              design.opening.coverStorageId
                ? imageUrls[design.opening.coverStorageId]
                : undefined
            }
            onDone={() => setShowOpeningPreview(false)}
          />
          <button
            type="button"
            onClick={() => setOpeningPreview((value) => value + 1)}
            className="absolute right-3 top-3 z-50 border border-ink/20 bg-[var(--paper-light)] px-2 py-1 text-[9px] uppercase tracking-[0.12em]"
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

  const renderLeftPanel = () => {
    if (leftPanel === "add") {
      return (
        <>
          <PanelHeading title="Add" note="Every addition is a real, animatable layer." />
          <div className="grid gap-1.5 p-3">
            <AddButton icon={Type} label="Heading" note="Large display names" onClick={() => addText("heading")} />
            <AddButton icon={Type} label="Body text" note="A line of invitation copy" onClick={() => addText("body")} />
            <AddButton icon={Type} label="Caption" note="Small tracked uppercase" onClick={() => addText("caption")} />
            <AddButton icon={ImageIcon} label="Image" note="Upload a photograph or background" onClick={() => imageFileRef.current?.click()} />
            <AddButton icon={Shapes} label="Shape" note="Rule, heart, arch, leaf, star" onClick={() => addShape("rect")} />
            <AddButton icon={Sparkles} label="Ornament" note="Hand-drawn botanical or celestial mark" onClick={addMotif} />
            <AddButton icon={Heart} label="Interactive reveal" note="A heart cover over a hidden message" onClick={addReveal} />
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
                  className="grid aspect-square place-items-center border border-ink/12 text-ink/60 hover:border-ink hover:text-[var(--red)]"
                  title={motif.label}
                >
                  <Sparkles className="size-3" />
                </button>
              ))}
            </div>
          </div>
          <input
            ref={imageFileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="sr-only"
            onChange={(event) => void handleAddImage(event)}
          />
          {uploadingImage && (
            <p className="px-3 pb-3 text-[10px] text-ink/45">
              <Loader2 className="mr-1 inline size-3 animate-spin" /> Uploading…
            </p>
          )}
        </>
      );
    }

    if (leftPanel === "layers") {
      return (
        <>
          <PanelHeading title="Layers" note={`${page.elements.length} layers · back to front`} />
          <div className="p-2">
            {[...page.elements].reverse().map((element) => {
              const active = selectedIds.includes(element.id);
              return (
                <button
                  key={element.id}
                  type="button"
                  onClick={(event) =>
                    setSelectedIds((previous) => {
                      if (event.shiftKey) {
                        const next = new Set(previous);
                        if (next.has(element.id)) next.delete(element.id);
                        else next.add(element.id);
                        return [...next];
                      }
                      return [element.id];
                    })
                  }
                  className={cn(
                    "flex w-full items-center gap-2 border-b border-ink/8 px-2 py-2 text-left text-[11px]",
                    active ? "bg-[var(--red)]/8 text-ink" : "text-ink/60 hover:bg-ink/4",
                  )}
                >
                  {element.kind === "text" ? (
                    <Type className="size-3 shrink-0" />
                  ) : element.kind === "image" ? (
                    <ImageIcon className="size-3 shrink-0" />
                  ) : (
                    <Shapes className="size-3 shrink-0" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{element.name}</span>
                  {element.groupId && <span className="size-1.5 rounded-full bg-[var(--gold)]" />}
                  {element.locked && <EyeOff className="size-2.5 opacity-60" />}
                </button>
              );
            })}
            <div className="mt-2 grid grid-cols-2 gap-1">
              <Button type="button" variant="outline" className="h-8 rounded-none text-[10px]" onClick={groupSelection}>
                Group
              </Button>
              <Button type="button" variant="outline" className="h-8 rounded-none text-[10px]" onClick={ungroupSelection}>
                Ungroup
              </Button>
            </div>
          </div>
        </>
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
                  onChange={async (event) => {
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
                  }}
                />
              </label>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-8 w-full rounded-none text-[10px]"
              onClick={() => {
                setOpeningPreview((value) => value + 1);
                setShowOpeningPreview(true);
              }}
            >
              <Play className="size-3.5" /> Preview opening
            </Button>
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

    return (
      <>
        <PanelHeading title="Pages" note="Reorder, duplicate, hide, or remove sections of the invitation." />
        <div className="space-y-1 p-2">
          {design.pages.map((candidate, index) => (
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
      </>
    );
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--paper-deep)]">
      <header className="z-40 flex h-[56px] shrink-0 items-center gap-2 border-b border-ink/15 bg-[var(--paper-light)] px-3">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="grid size-8 shrink-0 place-items-center border border-ink/18 text-ink/60 hover:border-ink hover:text-ink"
          aria-label="Back to the studio"
        >
          <ArrowLeft className="size-3.5" />
        </button>
        <Wordmark className="hidden text-[1rem] sm:inline-flex" />
        <div className="mx-1 hidden h-6 w-px bg-ink/15 sm:block" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[15px] leading-tight">{content.title}</p>
          <button
            type="button"
            onClick={() => void persistDesign(design)}
            className={cn(
              "flex items-center gap-1 text-[8px] uppercase tracking-[0.16em]",
              saveState === "error" ? "text-[var(--red)]" : "text-ink/40",
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

        <div className="hidden items-center gap-1 md:flex">
          <IconButton label="Undo" onClick={undo} disabled={!historyFlags.undo}><Undo2 className="size-3.5" /></IconButton>
          <IconButton label="Redo" onClick={redo} disabled={!historyFlags.redo}><Redo2 className="size-3.5" /></IconButton>
          <span className="mx-1 h-5 w-px bg-ink/12" />
          <IconButton label="Desktop canvas" active={device === "desktop"} onClick={() => setDevice("desktop")}><Monitor className="size-3.5" /></IconButton>
          <IconButton label="Tablet canvas" active={device === "tablet"} onClick={() => setDevice("tablet")}><Tablet className="size-3.5" /></IconButton>
          <IconButton label="Phone canvas" active={device === "phone"} onClick={() => setDevice("phone")}><Smartphone className="size-3.5" /></IconButton>
          <span className="mx-1 h-5 w-px bg-ink/12" />
          <IconButton label="Toggle left panel" active={leftOpen} onClick={() => setLeftOpen((value) => !value)}><PanelLeft className="size-3.5" /></IconButton>
          <IconButton label="Toggle properties" active={rightOpen} onClick={() => setRightOpen((value) => !value)}><PanelRight className="size-3.5" /></IconButton>
        </div>

        <div className="ml-1 flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => setLibrariesOpen(true)}
            className="h-8 rounded-none px-2 text-[9px] uppercase tracking-[0.12em]"
          >
            <Library className="size-3.5" />
            <span className="hidden sm:inline">Libraries</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setTimelinePreviewOpen(true)}
            className="hidden h-8 rounded-none px-2 text-[9px] uppercase tracking-[0.12em] lg:inline-flex"
          >
            <Play className="size-3.5" />
            Timeline
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setGuestOpen(true)}
            className="h-8 rounded-none px-2 text-[9px] uppercase tracking-[0.12em]"
          >
            <Eye className="size-3.5" />
            <span className="hidden sm:inline">Guest</span> preview
          </Button>
          <Button
            type="button"
            onClick={handlePublish}
            disabled={publishing}
            className="h-8 rounded-none px-3 text-[9px] uppercase tracking-[0.14em]"
          >
            {publishing ? <Loader2 className="size-3.5 animate-spin" /> : published ? <Share2 className="size-3.5" /> : <Sparkles className="size-3.5" />}
            {published ? "Share" : "Publish"}
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          className={cn(
            "hidden shrink-0 overflow-y-auto border-r border-ink/15 bg-[var(--paper-light)] transition-[width] duration-200 lg:block",
            leftOpen ? "w-[248px]" : "w-0 overflow-hidden border-r-0",
          )}
        >
          <div className="flex border-b border-ink/12">
            {(["add", "layers", "opening", "pages"] as LeftPanel[]).map((panel) => (
              <button
                key={panel}
                type="button"
                onClick={() => {
                  setLeftPanel(panel);
                  setLeftOpen(true);
                }}
                className={cn(
                  "flex-1 border-r border-ink/10 py-2 font-meta text-[8px] uppercase tracking-[0.1em] last:border-r-0",
                  leftPanel === panel ? "bg-ink text-[#f2f1ed]" : "text-ink/45 hover:text-ink",
                )}
              >
                {panel === "opening" ? "Open" : panel}
              </button>
            ))}
          </div>
          {renderLeftPanel()}
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="relative flex min-h-0 flex-1 flex-col">
            <div
              className="relative mx-auto flex min-h-0 w-full flex-1 items-stretch justify-center p-2 sm:p-4"
              style={{ maxWidth: DEVICE_WIDTH[device] }}
            >
              <StudioCanvas
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
                onZoom={setZoom}
                onSelect={(ids) => {
                  setSelectedIds(ids);
                  setAnimating(false);
                  setPlaying(false);
                }}
                onMove={(updates) =>
                  setPageElements((elements) =>
                    elements.map((element) => {
                      const update = updates.find((item) => item.id === element.id);
                      return update ? { ...element, x: update.x, y: update.y } : element;
                    }),
                  )
                }
                onResize={(elementId, box) => patchElement(elementId, box)}
                onRotate={(elementId, rotation) => patchElement(elementId, { rotation })}
                onReveal={testReveal}
              />
            </div>

            <div className="pointer-events-none absolute left-3 top-3 z-20 flex flex-col gap-1">
              <span className="pointer-events-auto border border-ink/15 bg-[var(--paper-light)]/90 px-2 py-1 font-meta text-[8px] uppercase tracking-[0.12em] text-ink/55 backdrop-blur">
                {page.name} · {page.elements.length} layers
              </span>
              {selected.length > 0 && (
                <span className="pointer-events-auto border border-[var(--red)]/30 bg-[var(--paper-light)]/90 px-2 py-1 font-meta text-[8px] uppercase tracking-[0.12em] text-[var(--red)] backdrop-blur">
                  {selected.length === 1 ? selected[0].name : `${selected.length} selected`}
                </span>
              )}
            </div>

            <div className="pointer-events-none absolute bottom-3 right-3 z-20 flex flex-col gap-1">
              <button
                type="button"
                onClick={() => setShowHidden((value) => !value)}
                className="pointer-events-auto border border-ink/15 bg-[var(--paper-light)]/90 p-1.5 text-ink/50 backdrop-blur hover:text-ink"
                title={showHidden ? "Hide hidden layers" : "Show hidden layers"}
              >
                {showHidden ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="pointer-events-auto border border-ink/15 bg-[var(--paper-light)]/90 px-1.5 py-1 font-meta text-[8px] text-ink/50 backdrop-blur hover:text-ink"
                title="Reset zoom"
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
                  <DesignStage>
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
            "hidden shrink-0 overflow-y-auto border-l border-ink/15 bg-[var(--paper-light)] transition-[width] duration-200 lg:block",
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
            onGroup={groupSelection}
            onUngroup={ungroupSelection}
            onUploadImage={handleInspectorUpload}
            onTestReveal={testReveal}
            onPreviewAnimation={previewAnimation}
          />
        </aside>
      </div>

      {/* Mobile navigation */}
      <nav className="flex shrink-0 items-stretch border-t border-ink/15 bg-[var(--paper-light)] lg:hidden">
        {[
          { id: "add" as const, label: "Add", icon: Plus },
          { id: "libraries" as const, label: "Library", icon: Library },
          { id: "layers" as const, label: "Layers", icon: Layers },
          { id: "properties" as const, label: "Properties", icon: PanelRight },
          { id: "pages" as const, label: "Pages", icon: Layout },
          { id: "timeline" as const, label: "Timeline", icon: Play },
        ].map(({ id: sheet, label, icon: Icon }) => (
          <button
            key={sheet}
            type="button"
            onClick={() => {
              if (sheet === "libraries") {
                setLibrariesOpen(true);
                return;
              }
              setMobileSheet((current) => (current === sheet ? null : sheet));
              if (sheet === "add" || sheet === "layers" || sheet === "pages") {
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
            className="flex max-h-[70vh] flex-col overflow-hidden border-t border-ink/20 bg-[var(--paper-light)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-ink/12 px-3 py-2">
              <span className="font-meta text-[9px] uppercase tracking-[0.16em] text-ink/45">
                {mobileSheet}
              </span>
              <button type="button" onClick={() => setMobileSheet(null)} className="text-[10px] uppercase tracking-[0.1em] text-ink/50">
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
                  onGroup={groupSelection}
                  onUngroup={ungroupSelection}
                  onUploadImage={handleInspectorUpload}
                  onTestReveal={testReveal}
                  onPreviewAnimation={previewAnimation}
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
        onApplyStyle={applyStyle}
        onPlaceAsset={placeAsset}
      />

      {guestOpen && (
        <GuestExperience
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

      {openingStagePreview}
      {closingPreview}

      <Dialog open={Boolean(pendingTemplate)} onOpenChange={(open) => !open && setPendingTemplate(null)}>
        <DialogContent className="max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Apply “{pendingTemplate?.name}”?</DialogTitle>
            <DialogDescription className="text-[12px] leading-relaxed">
              This replaces the pages and layers on this invitation's canvas. Your
              written words, date, venue, guests, RSVP settings, photos, and public
              link stay exactly as they are. Undo is available.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" className="rounded-none" onClick={() => setPendingTemplate(null)}>
              Keep current design
            </Button>
            <Button type="button" className="rounded-none" onClick={confirmTemplate}>
              Apply template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
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
      <span className="sr-only" aria-live="polite">
        {historyTick} edits
      </span>
    </div>
  );
}
