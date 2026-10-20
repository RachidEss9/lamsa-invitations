import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Wordmark } from "@/components/brand/Wordmark";
import { InvitationCanvas } from "@/components/invitation/InvitationCanvas";
import { Motif } from "@/components/invitation/Motif";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  contentFromInvitation,
  FONT_PAIRS,
  formatEventDate,
  formatEventTime,
  isPairedOccasion,
  LAYOUTS,
  MOTIFS,
  OCCASION_COPY,
  OCCASIONS,
  PALETTE_PRESETS,
  TEMPLATES,
  whatsappShareHref,
  type InvitationContent,
  type Occasion,
  type RsvpSettings,
} from "@/lib/invitation";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useAction } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  Download,
  Eye,
  FileDown,
  ImagePlus,
  Loader2,
  Lock,
  Mail,
  MessageCircle,
  Music,
  Pencil,
  Plus,
  Printer,
  Send,
  Share2,
  Trash2,
  Undo2,
  Users,
  Volume2,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { toast } from "sonner";

type SaveState = "saved" | "saving" | "unsaved" | "error";
type Tab = "words" | "details" | "design" | "media" | "guests";

const TABS: { id: Tab; label: string }[] = [
  { id: "words", label: "Words" },
  { id: "details", label: "Details" },
  { id: "design", label: "Design" },
  { id: "media", label: "Media" },
  { id: "guests", label: "Guests" },
];

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function skippedGuestsMessage(skippedNoEmail: number): string {
  if (skippedNoEmail === 0) {
    return "No guests in that group have an email address yet.";
  }
  return `Not sent. ${skippedNoEmail} guest${skippedNoEmail === 1 ? "" : "s"} in this group ${skippedNoEmail === 1 ? "has" : "have"} no email address — add one next to their name first.`;
}

function filenameFor(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "lamsa-invitation"
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[0.6rem] uppercase tracking-[0.18em] text-foreground/60">
          {label}
        </span>
        {hint && (
          <span className="text-[0.6rem] text-muted-foreground/70">{hint}</span>
        )}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Group({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-t border-border/70 pt-7", className)}>
      <p className="eyebrow text-[0.52rem] text-muted-foreground">{label}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const inputClass =
  "h-11 rounded-none border-border bg-transparent text-[0.86rem] shadow-none focus-visible:ring-1 focus-visible:ring-foreground/30";

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  // Convex document ids are 26 lowercase alphanumeric characters. A shorter or
  // malformed route segment (e.g. a copied link that got truncated) is not an
  // id at all: the query would fail server-side validation and useQuery would
  // throw that error through React. Guard here and show the friendly
  // "this invitation is private" screen instead of crashing the editor.
  const idIsValid = /^[a-z0-9]{26}$/.test(id ?? "");
  const invitationId = (id ?? "") as Id<"invitations">;
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const invitation = useQuery(
    api.invitations.getMine,
    idIsValid ? { id: invitationId } : "skip",
  );
  const guests = useQuery(
    api.invitations.listGuests,
    invitation ? { invitationId: invitation._id } : "skip",
  );

  const updateInvitation = useMutation(api.invitations.update);
  const publishInvitation = useMutation(api.invitations.publish);
  const unpublishInvitation = useMutation(api.invitations.unpublish);
  const addGuest = useMutation(api.invitations.addGuest);
  const removeGuest = useMutation(api.invitations.removeGuest);
  const updateGuest = useMutation(api.invitations.updateGuest);
  const updateRsvpSettings = useMutation(api.invitations.updateRsvp);
  const generateUploadUrl = useMutation(api.invitations.generateUploadUrl);
  const attachPhoto = useMutation(api.invitations.attachPhoto);
  const removePhotoById = useMutation(api.invitations.removePhoto);
  const recordShare = useMutation(api.invitations.recordShare);
  const setMusicFile = useMutation(api.invitations.setMusic);
  const setMusicOn = useMutation(api.invitations.setMusicEnabled);
  const sendGuestEmailsAction = useAction(api.invitations.sendGuestEmails);

  const [draft, setDraft] = useState<InvitationContent | null>(null);
  const [tab, setTab] = useState<Tab>("words");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [previewOpen, setPreviewOpen] = useState(
    () => searchParams.get("preview") === "1",
  );
  const [shareOpen, setShareOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [addingGuest, setAddingGuest] = useState(false);
  const [guestToDelete, setGuestToDelete] = useState<{
    id: Id<"guests">;
    name: string;
  } | null>(null);
  const [contactTarget, setContactTarget] = useState<{
    id: Id<"guests">;
    name: string;
    email: string;
  } | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [savingContact, setSavingContact] = useState(false);

  const [rsvpDraft, setRsvpDraft] = useState<RsvpSettings>(
    () => invitation?.rsvp ?? { enabled: false },
  );
  const [savingRsvp, setSavingRsvp] = useState(false);

  const [composerOpen, setComposerOpen] = useState<"update" | "reminder" | null>(null);
  const [emailGroup, setEmailGroup] = useState<
    "all" | "noRsvp" | "attending" | "notAttending"
  >("all");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingMusic, setUploadingMusic] = useState(false);
  const [photoCaption, setPhotoCaption] = useState("");

  const draftRef = useRef<InvitationContent | null>(null);
  const saveTimer = useRef<number | null>(null);
  const saveVersion = useRef(0);
  const hydratedId = useRef<string | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!invitation || hydratedId.current === invitation._id) return;
    hydratedId.current = invitation._id;
    const content = contentFromInvitation(invitation as unknown as InvitationContent);
    draftRef.current = content;
    setDraft(content);
    setSaveState("saved");
    setRsvpDraft(invitation.rsvp ?? { enabled: false });
  }, [invitation]);

  const persist = useCallback(
    async (next: InvitationContent) => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      const version = saveVersion.current + 1;
      saveVersion.current = version;
      setSaveState("saving");
      try {
        await updateInvitation({ id: invitationId, ...next });
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
    [invitationId, updateInvitation],
  );

  const saveNow = useCallback(async () => {
    const current = draftRef.current;
    if (!current) return false;
    return persist(current);
  }, [persist]);

  const scheduleSave = useCallback(
    (next: InvitationContent) => {
      setSaveState("unsaved");
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        void persist(next);
      }, 850);
    },
    [persist],
  );

  const patch = useCallback(
    (partial: Partial<InvitationContent>) => {
      const current = draftRef.current;
      if (!current) return;
      const next = { ...current, ...partial };
      draftRef.current = next;
      setDraft(next);
      scheduleSave(next);
    },
    [scheduleSave],
  );

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (
        saveState === "unsaved" ||
        saveState === "saving" ||
        saveState === "error"
      ) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [saveState]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveNow();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saveNow]);

  // Flush a pending debounce when leaving the editor (browser back, route
  // change, or closing the tab during an edit).
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = null;
        if (draftRef.current) void persist(draftRef.current);
      }
    };
  }, [persist]);

  const publicLink = invitation
    ? `${window.location.origin}/i/${invitation.slug}`
    : "";

  const copyText = async (text: string, description: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(description);
    } catch {
      toast.error("Could not copy. Please select the link and copy it manually.");
    }
  };

  const handleBack = async () => {
    if (saveState === "unsaved" || saveState === "error") {
      await saveNow();
    }
    navigate("/dashboard");
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      // Always flush the latest draft before going live, even if the
      // debounce has already reported a save.
      const saved = await saveNow();
      if (!saved) return;
      await publishInvitation({ id: invitationId });
      setShareOpen(true);
      toast.success("Published. Your invitation is live.");
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
      toast.success("Returned to drafts. The public link is paused.");
    } catch (error) {
      toast.error(messageOf(error));
    }
  };

  const handleAddGuest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = guestName.trim();
    if (!name) return;
    setAddingGuest(true);
    try {
      await addGuest({ invitationId, name, email: guestEmail.trim() || undefined });
      setGuestName("");
      setGuestEmail("");
      toast.success(`${name} added.`);
    } catch (error) {
      toast.error(messageOf(error));
    } finally {
      setAddingGuest(false);
    }
  };

  const handleDeleteGuest = async () => {
    if (!guestToDelete) return;
    try {
      await removeGuest({ id: guestToDelete.id });
      toast.success("Guest removed.");
      setGuestToDelete(null);
    } catch (error) {
      toast.error(messageOf(error));
    }
  };

  // RSVP settings save immediately; the reminder job is rescheduled on the
  // server with every change.
  const saveRsvp = async (partial: Partial<RsvpSettings>) => {
    const next: RsvpSettings = {
      ...rsvpDraft,
      ...partial,
      deadline:
        ("deadline" in partial ? partial.deadline : rsvpDraft.deadline) ||
        undefined,
    };
    setRsvpDraft(next);
    setSavingRsvp(true);
    try {
      await updateRsvpSettings({ id: invitationId, rsvp: next });
    } catch (error) {
      toast.error(messageOf(error));
    } finally {
      setSavingRsvp(false);
    }
  };

  const uploadFile = async (file: File): Promise<Id<"_storage">> => {
    const uploadUrl = await generateUploadUrl({ invitationId });
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!response.ok) {
      throw new Error(`The upload failed (${response.status}). Please try again.`);
    }
    const result = (await response.json()) as { storageId: Id<"_storage"> };
    return result.storageId;
  };

  const handlePhotoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Choose a photo under 10 MB.");
      return;
    }
    setUploadingPhoto(true);
    try {
      const storageId = await uploadFile(file);
      await attachPhoto({
        invitationId,
        storageId,
        caption: photoCaption.trim().slice(0, 80) || undefined,
      });
      setPhotoCaption("");
      toast.success("Photo added to the gallery.");
    } catch (error) {
      toast.error(messageOf(error));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleMusicUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Choose an audio file under 8 MB.");
      return;
    }
    setUploadingMusic(true);
    try {
      setExporting(true);
      const storageId = await uploadFile(file);
      await setMusicFile({ invitationId, storageId });
      toast.success("Guests can now play this music on the invitation.");
    } catch (error) {
      toast.error(messageOf(error));
    } finally {
      setUploadingMusic(false);
      setExporting(false);
    }
  };

  const openComposer = (intent: "update" | "reminder", group: "all" | "noRsvp") => {
    setComposerOpen(intent);
    setEmailGroup(group);
    setEmailSubject(
      intent === "reminder"
        ? "A gentle reminder about our invitation"
        : "An update about our invitation",
    );
    setEmailBody("");
  };

  const handleSendEmails = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) {
      toast.error("Write a subject and a short message first.");
      return;
    }
    setSendingEmail(true);
    try {
      const result = await sendGuestEmailsAction({
        invitationId,
        group: emailGroup,
        subject: emailSubject,
        message: emailBody,
        origin: window.location.origin,
      });
      if (result.missingKey) {
        toast.error(
          "Email delivery isn't connected yet. Add a RESEND_API_KEY in the keys panel and try again.",
          { duration: 7000 },
        );
      } else if (result.sent === 0) {
        toast.info(
          skippedGuestsMessage(result.skippedNoEmail),
          { duration: 6000 },
        );
      } else {
        toast.success(`Sent to ${result.sent} guest${result.sent === 1 ? "" : "s"}.`);
      }
      setComposerOpen(null);
    } catch (error) {
      toast.error(messageOf(error));
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSaveContact = async () => {
    if (!contactTarget) return;
    setSavingContact(true);
    try {
      await updateGuest({
        id: contactTarget.id,
        name: contactName,
        email: contactEmail,
      });
      toast.success("Guest updated.");
      setContactTarget(null);
    } catch (error) {
      toast.error(messageOf(error));
    } finally {
      setSavingContact(false);
    }
  };

  const exportGuestsCsv = () => {
    if (!guests || guests.length === 0) return;
    const rows = [
      ["Name", "Email", "RSVP", "Attending people", "Meal", "Note", "Opens", "Added"],
      ...guests.map((guest) => [
        guest.name,
        guest.email ?? "",
        guest.rsvpAttending === true
          ? "Yes"
          : guest.rsvpAttending === false
            ? "No"
            : "Awaiting reply",
        guest.rsvpCount != null ? String(guest.rsvpCount) : "",
        guest.rsvpMeal ?? "",
        guest.rsvpNote ?? "",
        String(guest.views),
        new Date(guest.createdAt).toISOString().slice(0, 10),
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filenameFor(draft?.title ?? "invitation")}-guests.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleExportPng = async () => {
    const node = exportRef.current;
    if (!node || !draft) return;
    setExporting(true);
    try {
      const { snapdom } = await import("@zumer/snapdom");
      const capture = await snapdom(node, {
        scale: 2,
        embedFonts: true,
        backgroundColor: draft.palette.background,
      });
      await capture.download({
        format: "png",
        filename: `${filenameFor(draft.title)}.png`,
      });
      toast.success("High-resolution PNG downloaded.");
    } catch (error) {
      console.error(error);
      toast.error("The PNG export failed in this browser. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    toast.info("Choose “Save as PDF” in your browser's print dialog.", {
      duration: 5000,
    });
    window.setTimeout(() => window.print(), 250);
  };

  const guestLink = (token: string) =>
    invitation ? `${window.location.origin}/i/${invitation.slug}/${token}` : "";

  // Resolved media URLs from getMine; storage ids alone can't be displayed.
  const photoUrls = invitation?.photoUrls ?? {};
  const musicUrl = invitation?.musicUrl ?? "";
  const photos = invitation?.photos ?? [];
  const musicFile = invitation?.music;
  void musicUrl;

  const published = invitation?.status === "published";
  const paired = draft ? isPairedOccasion(draft.occasion) : false;
  const occasionCopy = draft ? OCCASION_COPY[draft.occasion] : OCCASION_COPY.other;
  const guestCount = guests?.length ?? 0;

  const saveLabel = useMemo(() => {
    if (saveState === "saving") return "Saving";
    if (saveState === "unsaved") return "Unsaved";
    if (saveState === "error") return "Save failed";
    return "Saved";
  }, [saveState]);

  if (invitation === undefined && idIsValid) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="flex h-16 items-center border-b border-border/70 px-5">
          <Wordmark />
        </header>
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!idIsValid || invitation === null || !draft) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <Lock className="size-6 text-muted-foreground" />
        <h1 className="mt-5 font-display text-3xl">This invitation is private.</h1>
        <p className="mt-3 max-w-sm text-[0.85rem] leading-relaxed text-muted-foreground">
          It may have been deleted, or it belongs to another studio.
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

  return (
    <div className="relative min-h-screen bg-background">
      <div
        aria-hidden
        className="paper-grain pointer-events-none fixed inset-0 opacity-[0.025]"
      />

      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[1500px] items-center gap-3 px-4 sm:px-6 lg:px-10">
          <button
            type="button"
            onClick={handleBack}
            className="flex size-9 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Back to your studio"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="hidden h-4 w-px bg-border sm:block" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[1.05rem] leading-tight">
              {draft.title || "Untitled invitation"}
            </p>
            <button
              type="button"
              onClick={() => void saveNow()}
              className={cn(
                "mt-0.5 flex items-center gap-1.5 text-[0.56rem] uppercase tracking-[0.16em]",
                saveState === "error"
                  ? "text-destructive"
                  : "text-muted-foreground",
              )}
            >
              {saveState === "saving" ? (
                <Loader2 className="size-2.5 animate-spin" />
              ) : saveState === "saved" ? (
                <Check className="size-2.5" />
              ) : saveState === "error" ? (
                <AlertCircle className="size-2.5" />
              ) : (
                <span className="size-1.5 rounded-full bg-[var(--gold)]" />
              )}
              {saveLabel}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPreviewOpen(true)}
              className="h-9 rounded-none px-2.5 text-[0.6rem] uppercase tracking-[0.16em] lg:hidden"
            >
              <Eye className="size-3.5" />
              <span className="sr-only sm:not-sr-only">Preview</span>
            </Button>
            {published ? (
              <Button
                type="button"
                onClick={() => setShareOpen(true)}
                className="h-9 rounded-none px-4 text-[0.6rem] uppercase tracking-[0.18em]"
              >
                <Share2 className="size-3.5" />
                Share
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handlePublish}
                disabled={publishing}
                className="h-9 rounded-none px-4 text-[0.6rem] uppercase tracking-[0.18em]"
              >
                {publishing ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Send className="size-3.5" />
                )}
                <span className="hidden sm:inline">Publish</span>
                <span className="sm:hidden">Go live</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-[1500px] px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,470px)_minmax(0,1fr)] lg:gap-14 xl:gap-20">
          <div className="min-w-0">
            {/* Mobile live preview */}
            <div className="mb-7 flex items-center gap-4 border border-border/70 bg-[#f8f3e9]/70 p-4 lg:hidden">
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="w-[86px] shrink-0"
                aria-label="Open full preview"
              >
                <InvitationCanvas content={draft} />
              </button>
              <div className="min-w-0 flex-1">
                <p className="eyebrow text-[0.5rem] text-muted-foreground">
                  Live preview
                </p>
                <p className="mt-1 truncate font-display text-lg leading-tight">
                  {draft.title || "Untitled invitation"}
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-[0.58rem] uppercase tracking-[0.14em] text-muted-foreground">
                    {published ? "Published" : "Draft"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(true)}
                    className="inline-flex items-center gap-1.5 text-[0.58rem] uppercase tracking-[0.14em] text-foreground underline-offset-4 hover:underline"
                  >
                    <Eye className="size-3" />
                    Open
                  </button>
                </div>
              </div>
            </div>

            <div
              role="tablist"
              aria-label="Invitation editor sections"
              className="flex items-center gap-5 overflow-x-auto border-b border-border/70"
            >
              {TABS.map((item) => (
                <button
                  key={item.id}
                  role="tab"
                  aria-selected={tab === item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "relative shrink-0 pb-3 text-[0.62rem] uppercase tracking-[0.2em] transition-colors",
                    tab === item.id
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground/80",
                  )}
                >
                  {item.label}
                  {item.id === "guests" && guestCount > 0 && (
                    <span className="ml-1.5 text-[0.55rem] text-muted-foreground">
                      {guestCount}
                    </span>
                  )}
                  {tab === item.id && (
                    <span className="absolute inset-x-0 -bottom-px h-px bg-foreground" />
                  )}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className="pt-8"
              >
                {tab === "words" && (
                  <div className="space-y-7">
                    <Group label="The file" className="border-t-0 pt-0">
                      <Field label="Internal name" hint="Only you see this">
                        <Input
                          value={draft.title}
                          onChange={(event) =>
                            patch({ title: event.target.value })
                          }
                          placeholder="Amara & Julian — wedding"
                          className={inputClass}
                          maxLength={90}
                        />
                      </Field>
                      <div className="mt-5">
                        <Field label="Occasion">
                          <Select
                            value={draft.occasion}
                            onValueChange={(value) =>
                              patch({ occasion: value as Occasion })
                            }
                          >
                            <SelectTrigger className="h-11 w-full rounded-none border-border bg-transparent text-[0.86rem]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-none">
                              {OCCASIONS.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                      </div>
                    </Group>

                    <Group label="The names">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={occasionCopy.nameLabel}>
                          <Input
                            value={draft.names.primary}
                            onChange={(event) =>
                              patch({
                                names: {
                                  ...draft.names,
                                  primary: event.target.value,
                                },
                              })
                            }
                            className={inputClass}
                            placeholder="Amara"
                            maxLength={40}
                          />
                        </Field>
                        <Field label={occasionCopy.secondaryLabel}>
                          <Input
                            value={draft.names.secondary}
                            onChange={(event) =>
                              patch({
                                names: {
                                  ...draft.names,
                                  secondary: event.target.value,
                                },
                              })
                            }
                            className={inputClass}
                            placeholder={paired ? "Julian" : "Thirty"}
                            maxLength={40}
                          />
                        </Field>
                      </div>
                    </Group>

                    <Group label="The words">
                      <Field
                        label="Opening line"
                        hint={`${draft.eyebrow.length}/90`}
                      >
                        <Input
                          value={draft.eyebrow}
                          onChange={(event) =>
                            patch({ eyebrow: event.target.value })
                          }
                          className={inputClass}
                          placeholder={occasionCopy.eyebrow}
                          maxLength={90}
                        />
                      </Field>
                      <div className="mt-5">
                        <Field
                          label="Personal message"
                          hint={`${draft.message.length}/240`}
                        >
                          <Textarea
                            value={draft.message}
                            onChange={(event) =>
                              patch({
                                message: event.target.value.slice(0, 240),
                              })
                            }
                            placeholder={occasionCopy.message}
                            rows={5}
                            className="resize-none rounded-none border-border bg-transparent text-[0.86rem] leading-relaxed shadow-none focus-visible:ring-1 focus-visible:ring-foreground/30"
                          />
                        </Field>
                      </div>
                    </Group>
                  </div>
                )}

                {tab === "details" && (
                  <div className="space-y-7">
                    <Group label="When" className="border-t-0 pt-0">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Date">
                          <Input
                            type="date"
                            value={draft.date}
                            onChange={(event) =>
                              patch({ date: event.target.value })
                            }
                            className={cn(inputClass, "[color-scheme:light]")}
                          />
                        </Field>
                        <Field label="Time">
                          <Input
                            type="time"
                            value={draft.time}
                            onChange={(event) =>
                              patch({ time: event.target.value })
                            }
                            className={cn(inputClass, "[color-scheme:light]")}
                          />
                        </Field>
                      </div>
                      <p className="mt-3 text-[0.7rem] leading-relaxed text-muted-foreground">
                        {formatEventDate(draft.date)}
                        {draft.time ? ` · ${formatEventTime(draft.time)}` : ""}
                      </p>
                    </Group>

                    <Group label="Where">
                      <Field label="Venue">
                        <Input
                          value={draft.venueName}
                          onChange={(event) =>
                            patch({ venueName: event.target.value })
                          }
                          className={inputClass}
                          placeholder="The Orchard House"
                          maxLength={70}
                        />
                      </Field>
                      <div className="mt-5">
                        <Field label="City / address" hint="Optional">
                          <Input
                            value={draft.venueAddress}
                            onChange={(event) =>
                              patch({ venueAddress: event.target.value })
                            }
                            className={inputClass}
                            placeholder="Somerset, England"
                            maxLength={80}
                          />
                        </Field>
                      </div>
                    </Group>

                    <Group label="Programme">
                      <p className="text-[0.72rem] leading-relaxed text-muted-foreground">
                        Optional timeline for the day — it appears on the
                        invitation's details page for guests.
                      </p>
                      {(draft.schedule ?? []).map((item, index) => (
                        <div
                          key={index}
                          className="mt-3 flex items-center gap-2"
                        >
                          <Input
                            type="time"
                            value={item.time}
                            onChange={(event) => {
                              if (!draft.schedule) return;
                              const next = [...draft.schedule];
                              next[index] = {
                                ...next[index],
                                time: event.target.value,
                              };
                              patch({ schedule: next });
                            }}
                            className={cn(inputClass, "[color-scheme:light] w-[7.5rem] shrink-0")}
                            aria-label={`Programme time ${index + 1}`}
                          />
                          <Input
                            value={item.label}
                            onChange={(event) => {
                              if (!draft.schedule) return;
                              const next = [...draft.schedule];
                              next[index] = {
                                ...next[index],
                                label: event.target.value.slice(0, 70),
                              };
                              patch({ schedule: next });
                            }}
                            placeholder="Dinner is served"
                            maxLength={70}
                            className={inputClass}
                            aria-label={`Programme item ${index + 1}`}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              patch({
                                schedule: (draft.schedule ?? []).filter(
                                  (_, i) => i !== index,
                                ),
                              })
                            }
                            className="flex size-9 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-destructive"
                            aria-label={`Remove programme item ${index + 1}`}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          patch({
                            schedule: [
                              ...(draft.schedule ?? []),
                              { time: "16:00", label: "" },
                            ],
                          })
                        }
                        disabled={(draft.schedule ?? []).length >= 8}
                        className="mt-3 inline-flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                      >
                        <Plus className="size-3.5" />
                        Add programme item
                      </button>
                    </Group>

                    <Group label="For your guests">
                      <Field label="Dress code" hint="Optional">
                        <Input
                          value={draft.dressCode ?? ""}
                          onChange={(event) =>
                            patch({ dressCode: event.target.value.slice(0, 120) })
                          }
                          className={inputClass}
                          placeholder="Formal, earth tones"
                          maxLength={120}
                        />
                      </Field>
                      <div className="mt-5">
                        <Field label="Map link" hint="Google Maps or similar">
                          <Input
                            type="url"
                            value={draft.mapUrl ?? ""}
                            onChange={(event) =>
                              patch({ mapUrl: event.target.value.slice(0, 300) })
                            }
                            className={inputClass}
                            placeholder="https://maps.google.com/…"
                            maxLength={300}
                          />
                        </Field>
                      </div>
                      <div className="mt-5">
                        <Field label="A note from the hosts" hint="Optional">
                          <Textarea
                            value={draft.hostNotes ?? ""}
                            onChange={(event) =>
                              patch({ hostNotes: event.target.value.slice(0, 400) })
                            }
                            rows={3}
                            placeholder="Parking is limited — the side gate will be open. Children are very welcome."
                            className="resize-none rounded-none border-border bg-transparent text-[0.86rem] leading-relaxed shadow-none focus-visible:ring-1 focus-visible:ring-foreground/30"
                          />
                        </Field>
                      </div>
                    </Group>

                    <Group label="On the invitation">
                      <div className="space-y-3 text-[0.78rem] leading-relaxed text-muted-foreground">
                        <p>
                          The date, time, venue, and message appear on the
                          invitation itself. The internal name is never shown to
                          guests.
                        </p>
                        <p>
                          Changes save automatically. Use{" "}
                          <span className="text-foreground">⌘S / Ctrl+S</span> to
                          save immediately.
                        </p>
                      </div>
                    </Group>
                  </div>
                )}

                {tab === "design" && (
                  <div className="space-y-7">
                    <Group label="Starting design" className="border-t-0 pt-0">
                      <div className="grid grid-cols-2 gap-2">
                        {TEMPLATES.map((template) => {
                          const selected = draft.templateId === template.id;
                          return (
                            <button
                              key={template.id}
                              type="button"
                              onClick={() =>
                                patch({
                                  templateId: template.id,
                                  palette: template.palette,
                                  fontPair: template.fontPair,
                                  layout: template.layout,
                                  motif: template.motif,
                                })
                              }
                              className={cn(
                                "flex items-center gap-2.5 border px-2.5 py-2 text-left transition-colors",
                                selected
                                  ? "border-foreground bg-foreground/[0.04]"
                                  : "border-border hover:border-foreground/40",
                              )}
                            >
                              <span className="flex shrink-0 items-center gap-0.5">
                                {[
                                  template.palette.background,
                                  template.palette.accent,
                                  template.palette.ink,
                                ].map((color) => (
                                  <span
                                    key={color}
                                    className="size-2.5 rounded-full border border-black/5"
                                    style={{ backgroundColor: color }}
                                  />
                                ))}
                              </span>
                              <span className="truncate font-display text-[0.9rem]">
                                {template.name}
                              </span>
                              {selected && (
                                <Check className="ml-auto size-3 shrink-0 text-foreground" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </Group>

                    <Group label="Layout">
                      <div className="grid grid-cols-3 gap-2">
                        {LAYOUTS.map((layout) => {
                          const selected = draft.layout === layout.id;
                          return (
                            <button
                              key={layout.id}
                              type="button"
                              onClick={() => patch({ layout: layout.id })}
                              className={cn(
                                "group border p-1 text-left transition-colors",
                                selected
                                  ? "border-foreground"
                                  : "border-border hover:border-foreground/40",
                              )}
                            >
                              <span
                                className="flex h-16 flex-col items-center justify-center gap-1 border border-black/5"
                                style={{ backgroundColor: draft.palette.background }}
                              >
                                {layout.id === "editorial" ? (
                                  <span className="flex h-10 w-7 flex-col items-start justify-center gap-1 border-l" style={{ borderColor: draft.palette.accent }}>
                                    <span className="h-px w-4" style={{ backgroundColor: draft.palette.ink }} />
                                    <span className="h-px w-5" style={{ backgroundColor: draft.palette.accent }} />
                                    <span className="h-px w-3" style={{ backgroundColor: draft.palette.ink }} />
                                  </span>
                                ) : layout.id === "classic" ? (
                                  <span className="flex size-9 items-center justify-center border" style={{ borderColor: draft.palette.accent }}>
                                    <span className="h-4 w-4 border" style={{ borderColor: draft.palette.ink }} />
                                  </span>
                                ) : (
                                  <span className="flex flex-col items-center gap-1">
                                    <span className="h-px w-4" style={{ backgroundColor: draft.palette.accent }} />
                                    <span className="font-display text-[10px] leading-none" style={{ color: draft.palette.ink }}>
                                      Aa
                                    </span>
                                    <span className="h-px w-4" style={{ backgroundColor: draft.palette.accent }} />
                                  </span>
                                )}
                              </span>
                              <span className="mt-1.5 block px-0.5 text-[0.58rem] uppercase tracking-[0.12em]">
                                {layout.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-2 text-[0.68rem] leading-relaxed text-muted-foreground">
                        {LAYOUTS.find((layout) => layout.id === draft.layout)?.note}
                      </p>
                    </Group>

                    <Group label="Typography">
                      <div className="grid grid-cols-2 gap-2">
                        {FONT_PAIRS.map((pair) => {
                          const selected = draft.fontPair === pair.id;
                          return (
                            <button
                              key={pair.id}
                              type="button"
                              onClick={() => patch({ fontPair: pair.id })}
                              className={cn(
                                "border px-3 py-2.5 text-left transition-colors",
                                selected
                                  ? "border-foreground bg-foreground/[0.04]"
                                  : "border-border hover:border-foreground/40",
                              )}
                            >
                              <span
                                className="block text-2xl leading-none"
                                style={{ fontFamily: pair.family }}
                              >
                                Aa
                              </span>
                              <span className="mt-2 block text-[0.58rem] uppercase tracking-[0.14em]">
                                {pair.label}
                              </span>
                              <span className="mt-0.5 block text-[0.6rem] text-muted-foreground">
                                {pair.note}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </Group>

                    <Group label="Direction">
                      <div className="flex items-start justify-between gap-6">
                        <div>
                          <p className="text-[0.8rem] text-foreground">
                            Right-to-left (Arabic)
                          </p>
                          <p className="mt-1 max-w-[19rem] text-[0.7rem] leading-relaxed text-muted-foreground">
                            Reads and sets right-to-left, with Amiri as the
                            display face — the LAMSA v5 Arabic preset.
                          </p>
                        </div>
                        <Switch
                          checked={Boolean(draft.rtl)}
                          onCheckedChange={(checked) => patch({ rtl: checked })}
                          aria-label="Right-to-left"
                        />
                      </div>
                    </Group>

                    <Group label="Motif">
                      <div className="grid grid-cols-3 gap-2">
                        {MOTIFS.map((motif) => {
                          const selected = draft.motif === motif.id;
                          return (
                            <button
                              key={motif.id}
                              type="button"
                              onClick={() => patch({ motif: motif.id })}
                              className={cn(
                                "flex flex-col items-center gap-1.5 border px-2 py-3 transition-colors",
                                selected
                                  ? "border-foreground bg-foreground/[0.04]"
                                  : "border-border hover:border-foreground/40",
                              )}
                            >
                              <span
                                className="flex size-8 items-center justify-center"
                                style={{ color: draft.palette.ink }}
                              >
                                {motif.id === "none" ? (
                                  <span className="text-[0.6rem] uppercase tracking-widest text-muted-foreground">
                                    None
                                  </span>
                                ) : (
                                  <Motif
                                    id={motif.id}
                                    className="size-full"
                                    strokeWidth={1.6}
                                  />
                                )}
                              </span>
                              <span className="text-[0.54rem] uppercase tracking-[0.12em]">
                                {motif.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </Group>

                    <Group label="Palette">
                      <div className="grid grid-cols-2 gap-2">
                        {PALETTE_PRESETS.map((preset) => {
                          const selected =
                            draft.palette.background === preset.palette.background &&
                            draft.palette.ink === preset.palette.ink &&
                            draft.palette.accent === preset.palette.accent;
                          return (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() => patch({ palette: preset.palette })}
                              className={cn(
                                "flex items-center gap-2.5 border px-2.5 py-2 text-left transition-colors",
                                selected
                                  ? "border-foreground"
                                  : "border-border hover:border-foreground/40",
                              )}
                            >
                              <span className="flex -space-x-1">
                                {[preset.palette.background, preset.palette.accent, preset.palette.ink].map(
                                  (color) => (
                                    <span
                                      key={color}
                                      className="size-4 rounded-full border border-black/10"
                                      style={{ backgroundColor: color }}
                                    />
                                  ),
                                )}
                              </span>
                              <span className="truncate text-[0.66rem]">
                                {preset.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-5 grid grid-cols-3 gap-3">
                        {(
                          [
                            ["background", "Paper"],
                            ["ink", "Ink"],
                            ["accent", "Accent"],
                          ] as const
                        ).map(([key, label]) => (
                          <label key={key} className="block">
                            <span className="mb-1.5 block text-[0.54rem] uppercase tracking-[0.14em] text-muted-foreground">
                              {label}
                            </span>
                            <span className="flex items-center gap-2 border border-border px-1.5 py-1">
                              <input
                                type="color"
                                value={draft.palette[key]}
                                onChange={(event) =>
                                  patch({
                                    palette: {
                                      ...draft.palette,
                                      [key]: event.target.value,
                                    },
                                  })
                                }
                                className="size-7 cursor-pointer appearance-none border-0 bg-transparent p-0"
                                aria-label={`${label} colour`}
                              />
                              <span className="font-mono text-[0.56rem] uppercase text-muted-foreground">
                                {draft.palette[key]}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </Group>

                    <Group label="Motion">
                      <div className="flex items-start justify-between gap-6">
                        <div>
                          <p className="text-[0.8rem] text-foreground">
                            Cinematic opening
                          </p>
                          <p className="mt-1 max-w-[19rem] text-[0.7rem] leading-relaxed text-muted-foreground">
                            Guests open a cover before the invitation is
                            revealed. Smooth by default, and skipped entirely
                            when reduced motion is requested.
                          </p>
                        </div>
                        <Switch
                          checked={draft.animations}
                          onCheckedChange={(checked) =>
                            patch({ animations: checked })
                          }
                          aria-label="Cinematic opening"
                        />
                      </div>
                    </Group>
                  </div>
                )}

                {tab === "media" && (
                  <div className="space-y-7">
                    <Group label="Photo gallery" className="border-t-0 pt-0">
                      <p className="text-[0.72rem] leading-relaxed text-muted-foreground">
                        Up to 12 photos appear on the invitation's page. Photos
                        keep the invitation's own layout — nothing is watermarked.
                      </p>

                      {photos.length > 0 && (
                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {photos.map((photo) => (
                            <div
                              key={photo.storageId}
                              className="group relative overflow-hidden border border-border"
                            >
                              <img
                                src={photoUrls[photo.storageId] ?? ""}
                                alt={photo.caption ?? "Invitation gallery photo"}
                                className="aspect-square w-full object-cover"
                                loading="lazy"
                              />
                              {photo.caption && (
                                <p className="absolute inset-x-0 bottom-0 bg-black/45 px-2 py-1 text-[0.55rem] uppercase tracking-[0.14em] text-white">
                                  {photo.caption}
                                </p>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  void removePhotoById({
                                    invitationId,
                                    storageId: photo.storageId,
                                  })
                                    .then(() => toast.success("Photo removed."))
                                    .catch((error: unknown) =>
                                      toast.error(messageOf(error)),
                                    );
                                }}
                                className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center bg-black/50 text-white opacity-0 transition-opacity hover:bg-destructive group-hover:opacity-100"
                                aria-label="Remove photo"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Input
                          value={photoCaption}
                          onChange={(event) => setPhotoCaption(event.target.value)}
                          placeholder="Caption (optional)"
                          maxLength={80}
                          className={cn(inputClass, "h-9 w-full max-w-[14rem]")}
                        />
                        <label
                          className={cn(
                            "inline-flex h-9 cursor-pointer items-center gap-2 border border-border px-3 text-[0.58rem] uppercase tracking-[0.16em] transition-colors hover:border-foreground/40",
                            uploadingPhoto && "opacity-60",
                          )}
                        >
                          {uploadingPhoto ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <ImagePlus className="size-3.5" />
                          )}
                          Add photo
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            disabled={uploadingPhoto}
                            className="sr-only"
                          />
                        </label>
                      </div>
                    </Group>

                    <Group label="Background music">
                      <p className="text-[0.72rem] leading-relaxed text-muted-foreground">
                        Guests get a small play button on their invitation.
                        Nothing plays until they choose to.
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {musicFile ? (
                          <>
                            <span className="inline-flex items-center gap-2 border border-border px-3 py-2 text-[0.62rem]">
                              <Music className="size-3.5 text-[var(--olive)]" />
                              <span className="uppercase tracking-[0.14em] text-muted-foreground">
                                {musicFile.enabled ? "Active" : "Muted"}
                              </span>
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                void setMusicOn({
                                  invitationId,
                                  enabled: !musicFile?.enabled,
                                })
                              }
                              className="h-9 rounded-none text-[0.58rem] uppercase tracking-[0.16em]"
                            >
                              {invitation.music?.enabled ? "Mute" : "Unmute"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                void setMusicFile({ invitationId, storageId: null })
                                  .then(() => toast.success("Music removed."))
                                  .catch((error: unknown) => toast.error(messageOf(error)))
                              }
                              className="h-9 rounded-none text-[0.58rem] uppercase tracking-[0.16em] text-muted-foreground"
                            >
                              Remove
                            </Button>
                          </>
                        ) : (
                          <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                            No music uploaded yet
                          </p>
                        )}
                        <label
                          className={cn(
                            "inline-flex h-9 cursor-pointer items-center gap-2 border border-border px-3 text-[0.58rem] uppercase tracking-[0.16em] transition-colors hover:border-foreground/40",
                            uploadingMusic && "opacity-60",
                          )}
                        >
                          {uploadingMusic ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Volume2 className="size-3.5" />
                          )}
                          {musicFile ? "Replace music" : "Upload music (mp3)"}
                          <input
                            type="file"
                            accept="audio/*"
                            onChange={handleMusicUpload}
                            disabled={uploadingMusic}
                            className="sr-only"
                          />
                        </label>
                      </div>
                    </Group>
                  </div>
                )}

                {tab === "guests" && (
                  <div className="space-y-7">
                    <Group label="Sharing" className="border-t-0 pt-0">
                      <div className="border border-border/80 bg-card/60 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="eyebrow text-[0.5rem] text-muted-foreground">
                              Public invitation
                            </p>
                            <p className="mt-1.5 font-display text-xl">
                              {published ? "Live and shareable" : "Not published yet"}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "mt-1 size-2 rounded-full",
                              published ? "bg-[var(--olive)]" : "bg-[var(--gold)]/60",
                            )}
                          />
                        </div>
                        <p className="mt-3 break-all border border-border/60 bg-background/70 px-3 py-2 font-mono text-[0.66rem] text-muted-foreground">
                          {publicLink}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              copyText(publicLink, "Public link copied.")
                            }
                            className="h-8 rounded-none text-[0.56rem] uppercase tracking-[0.16em]"
                          >
                            <Copy className="size-3" />
                            Copy link
                          </Button>
                          {published ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                window.open(publicLink, "_blank", "noopener,noreferrer")
                              }
                              className="h-8 rounded-none text-[0.56rem] uppercase tracking-[0.16em]"
                            >
                              <Eye className="size-3" />
                              View live
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              onClick={handlePublish}
                              disabled={publishing}
                              className="h-8 rounded-none text-[0.56rem] uppercase tracking-[0.16em]"
                            >
                              {publishing ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <Send className="size-3" />
                              )}
                              Publish now
                            </Button>
                          )}
                        </div>
                      </div>
                    </Group>

                    <Group label="RSVP replies">
                      <div className="flex items-start justify-between gap-6">
                        <div>
                          <p className="text-[0.8rem] text-foreground">
                            Collect replies on personal links
                          </p>
                          <p className="mt-1 max-w-[19rem] text-[0.7rem] leading-relaxed text-muted-foreground">
                            Guests open their own link and answer in one tap.
                            When a deadline is set, one reminder email goes out
                            automatically seven days before it, and you can
                            send more anytime from here.
                          </p>
                        </div>
                        <Switch
                          checked={rsvpDraft.enabled}
                          disabled={savingRsvp}
                          onCheckedChange={(checked) =>
                            void saveRsvp({ enabled: checked })
                          }
                          aria-label="Collect RSVP replies"
                        />
                      </div>

                      {rsvpDraft.enabled && (
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <Field label="Reply deadline" hint="Optional">
                            <Input
                              type="date"
                              value={rsvpDraft.deadline ?? ""}
                              onChange={(event) =>
                                void saveRsvp({ deadline: event.target.value || undefined })
                              }
                              className={cn(inputClass, "[color-scheme:light]")}
                            />
                          </Field>
                          <div className="flex flex-col justify-end gap-3 pb-1">
                            <label className="flex items-center gap-2 text-[0.72rem] text-muted-foreground">
                              <Switch
                                checked={rsvpDraft.askMeal ?? false}
                                disabled={savingRsvp}
                                onCheckedChange={(checked) =>
                                  void saveRsvp({ askMeal: checked })
                                }
                                aria-label="Ask for meal preferences"
                              />
                              Ask for meal preferences
                            </label>
                            <label className="flex items-center gap-2 text-[0.72rem] text-muted-foreground">
                              <Switch
                                checked={rsvpDraft.askNote ?? false}
                                disabled={savingRsvp}
                                onCheckedChange={(checked) =>
                                  void saveRsvp({ askNote: checked })
                                }
                                aria-label="Ask guests for a note"
                              />
                              Ask guests for a note
                            </label>
                          </div>
                        </div>
                      )}

                      {rsvpDraft.enabled && (
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 text-[0.58rem] uppercase tracking-[0.14em] text-[var(--olive)]">
                            <Check className="size-3" /> {guests?.filter((g) => g.rsvpAttending === true).length ?? 0} yes
                          </span>
                          <span className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 text-[0.58rem] uppercase tracking-[0.14em] text-destructive">
                            {guests?.filter((g) => g.rsvpAttending === false).length ?? 0} no
                          </span>
                          <span className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 text-[0.58rem] uppercase tracking-[0.14em] text-muted-foreground">
                            {guests?.filter((g) => g.rsvpAttending === undefined).length ?? 0} awaiting
                          </span>
                        </div>
                      )}
                    </Group>

                    <Group label="Guest updates">
                      <p className="text-[0.72rem] leading-relaxed text-muted-foreground">
                        Send a short note to a chosen group over email. Guests
                        without an address are skipped and listed, so nothing
                        is silently lost.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openComposer("reminder", "noRsvp")}
                          className="h-8 rounded-none text-[0.56rem] uppercase tracking-[0.16em]"
                        >
                          <Mail className="size-3" />
                          Remind non-responders
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openComposer("update", "all")}
                          className="h-8 rounded-none text-[0.56rem] uppercase tracking-[0.16em]"
                        >
                          <Send className="size-3" />
                          Email all guests
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={!guests || guests.length === 0}
                          onClick={exportGuestsCsv}
                          className="h-8 rounded-none text-[0.56rem] uppercase tracking-[0.16em] text-muted-foreground"
                        >
                          <FileDown className="size-3" />
                          Export guest list (CSV)
                        </Button>
                      </div>
                    </Group>

                    <Group label="Personal guests">
                      <p className="text-[0.75rem] leading-relaxed text-muted-foreground">
                        Add a name and LAMSA creates a unique link for that
                        guest. Their name is set into the invitation as they
                        open it.
                      </p>

                      <form onSubmit={handleAddGuest} className="mt-4 flex flex-wrap gap-2">
                        <Input
                          value={guestName}
                          onChange={(event) => setGuestName(event.target.value)}
                          placeholder="Guest or family name"
                          maxLength={80}
                          className={cn(inputClass, "min-w-[9rem] flex-1")}
                          disabled={addingGuest}
                        />
                        <Input
                          type="email"
                          value={guestEmail}
                          onChange={(event) => setGuestEmail(event.target.value)}
                          placeholder="Email (optional)"
                          maxLength={120}
                          className={cn(inputClass, "h-11 w-full max-w-[13rem] sm:w-40")}
                          disabled={addingGuest}
                        />
                        <Button
                          type="submit"
                          disabled={addingGuest || !guestName.trim()}
                          className="h-11 shrink-0 rounded-none px-4 text-[0.58rem] uppercase tracking-[0.16em]"
                        >
                          {addingGuest ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Plus className="size-3.5" />
                          )}
                          Add
                        </Button>
                      </form>

                      {guests === undefined ? (
                        <div className="mt-6 space-y-3">
                          {Array.from({ length: 3 }).map((_, index) => (
                            <div
                              key={index}
                              className="h-11 animate-pulse bg-[var(--paper-deep)]/60"
                            />
                          ))}
                        </div>
                      ) : guests.length === 0 ? (
                        <div className="mt-7 flex flex-col items-center border border-dashed border-border px-6 py-9 text-center">
                          <Users className="size-5 text-muted-foreground/60" />
                          <p className="mt-3 font-display text-lg">
                            No names yet.
                          </p>
                          <p className="mt-1 max-w-[18rem] text-[0.7rem] leading-relaxed text-muted-foreground">
                            The main link works for everyone. Add guests here when
                            you want each invitation personally addressed.
                          </p>
                        </div>
                      ) : (
                        <div className="mt-5 border-t border-border/70">
                          {guests.map((guest) => (
                            <div
                              key={guest._id}
                              className="flex items-center justify-between gap-3 border-b border-border/60 py-3"
                            >
                              <div className="min-w-0">
                                <p className="truncate font-display text-[1.02rem] leading-tight">
                                  {guest.name}
                                </p>
                                <p className="mt-0.5 text-[0.56rem] uppercase tracking-[0.14em] text-muted-foreground/70">
                                  {guest.rsvpAttending === true
                                    ? `Coming${guest.rsvpCount ? ` · ${guest.rsvpCount} people` : ""}`
                                    : guest.rsvpAttending === false
                                      ? "Will not attend"
                                      : "Awaiting reply"}
                                  <span className="mx-1 opacity-40">·</span>
                                  {guest.email || "no email yet"}
                                  <span className="mx-1 opacity-40">·</span>
                                  {guest.views} {guest.views === 1 ? "open" : "opens"}
                                  {!published && " · pending publish"}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center">
                                <button
                                  type="button"
                                  onClick={() =>
                                    copyText(
                                      guestLink(guest.token),
                                      published
                                        ? "Personal link copied."
                                        : "Personal link copied — it activates when you publish.",
                                    )
                                  }
                                  className="flex size-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                                  aria-label={`Copy personal link for ${guest.name}`}
                                >
                                  <Copy className="size-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    window.open(
                                      whatsappShareHref(
                                        `Hello ${guest.name}, you are warmly invited.`,
                                        guestLink(guest.token),
                                      ),
                                      "_blank",
                                      "noopener,noreferrer",
                                    )
                                  }
                                  className="flex size-8 items-center justify-center text-muted-foreground transition-colors hover:text-[var(--olive)]"
                                  aria-label={`Share on WhatsApp with ${guest.name}`}
                                >
                                  <MessageCircle className="size-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setContactTarget({
                                      id: guest._id,
                                      name: guest.name,
                                      email: guest.email ?? "",
                                    });
                                    setContactName(guest.name);
                                    setContactEmail(guest.email ?? "");
                                  }}
                                  className="flex size-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                                  aria-label={`Edit contact details for ${guest.name}`}
                                >
                                  <Pencil className="size-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setGuestToDelete({
                                      id: guest._id,
                                      name: guest.name,
                                    })
                                  }
                                  className="flex size-8 items-center justify-center text-muted-foreground transition-colors hover:text-destructive"
                                  aria-label={`Remove ${guest.name}`}
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Group>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Desktop live preview */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <div className="flex items-center justify-between">
                <p className="eyebrow text-[0.52rem] text-muted-foreground">
                  Live preview
                </p>
                <div className="flex items-center gap-1">
                  <span className="mr-2 flex items-center gap-1.5 text-[0.54rem] uppercase tracking-[0.14em] text-muted-foreground">
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        published ? "bg-[var(--olive)]" : "bg-[var(--gold)]/60",
                      )}
                    />
                    {published ? "Published" : "Draft"}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={exporting}
                        className="h-8 rounded-none px-2 text-[0.56rem] uppercase tracking-[0.14em]"
                      >
                        {exporting ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Download className="size-3.5" />
                        )}
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-none">
                      <DropdownMenuItem
                        onSelect={() => void handleExportPng()}
                        className="rounded-none"
                      >
                        <Download className="size-3.5" />
                        Download PNG
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={handlePrint}
                        className="rounded-none"
                      >
                        <Printer className="size-3.5" />
                        Print / save as PDF
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() => setPreviewOpen(true)}
                        className="rounded-none"
                      >
                        <Eye className="size-3.5" />
                        Full-screen preview
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="mt-3 border border-border/70 bg-[#e9e1d1]/50 p-5 xl:p-7">
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="editorial-shadow mx-auto block w-full max-w-[410px] transition-transform duration-500 hover:-translate-y-0.5"
                  aria-label="Open full-screen preview"
                >
                  <InvitationCanvas content={draft} />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between text-[0.56rem] uppercase tracking-[0.14em] text-muted-foreground">
                <span>Updates as you type</span>
                <span>Saves automatically</span>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Offscreen print / capture stage */}
      <div
        aria-hidden
        className="pointer-events-none fixed left-[-10000px] top-0 w-[900px]"
      >
        <div id="lamsa-print" ref={exportRef} className="w-[900px]">
          <InvitationCanvas content={draft} />
        </div>
      </div>

      {/* Full preview */}
      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open && searchParams.has("preview")) {
            const next = new URLSearchParams(searchParams);
            next.delete("preview");
            setSearchParams(next, { replace: true });
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="max-h-[96vh] w-auto max-w-[min(92vw,440px)] overflow-y-auto rounded-none border-0 bg-transparent p-0 shadow-none"
        >
          <DialogTitle className="sr-only">Invitation preview</DialogTitle>
          <div className="editorial-shadow mx-auto w-full">
            <InvitationCanvas content={draft} />
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 bg-background/95 px-3 py-2">
            <span className="text-[0.55rem] uppercase tracking-[0.14em] text-muted-foreground">
              Preview
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void handleExportPng()}
                disabled={exporting}
                className="h-8 rounded-none text-[0.56rem] uppercase tracking-[0.14em]"
              >
                <Download className="size-3" />
                PNG
              </Button>
              {/* Print was previously only reachable from the desktop Export
                  dropdown; phones only got this preview dialog, so give it a
                  print entrypoint here too. */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handlePrint}
                className="h-8 rounded-none text-[0.56rem] uppercase tracking-[0.14em]"
              >
                <Printer className="size-3" />
                PDF
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPreviewOpen(false)}
                className="h-8 rounded-none text-[0.56rem] uppercase tracking-[0.14em]"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="rounded-none border-border sm:max-w-md">
          <DialogHeader className="text-left">
            <p className="eyebrow text-muted-foreground">Published</p>
            <DialogTitle className="mt-2 font-display text-3xl font-normal leading-tight">
              Your invitation is live.
            </DialogTitle>
            <DialogDescription className="leading-relaxed">
              Share this link with everyone, or create a personally addressed
              link for each guest from the Guests tab.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <p className="break-all border border-border bg-muted/40 px-3 py-2.5 font-mono text-[0.68rem] text-muted-foreground">
              {publicLink}
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                onClick={() => copyText(publicLink, "Public link copied.")}
                className="h-10 rounded-none text-[0.58rem] uppercase tracking-[0.16em]"
              >
                <Copy className="size-3.5" />
                Copy
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!invitation?.slug) return;
                  void recordShare({
                    slug: invitation.slug,
                  });
                  window.open(
                    whatsappShareHref(
                      `${draft.title || "You are invited"}`,
                      publicLink,
                    ),
                    "_blank",
                    "noopener,noreferrer",
                  );
                }}
                className="h-10 rounded-none text-[0.58rem] uppercase tracking-[0.16em]"
              >
                <MessageCircle className="size-3.5" />
                WhatsApp
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  window.open(publicLink, "_blank", "noopener,noreferrer")
                }
                className="h-10 rounded-none text-[0.58rem] uppercase tracking-[0.16em]"
              >
                <Eye className="size-3.5" />
                View live
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShareOpen(false);
                setTab("guests");
              }}
              className="h-9 w-full rounded-none text-[0.58rem] uppercase tracking-[0.16em] text-muted-foreground"
            >
              <Users className="size-3.5" />
              Add personal guest links
            </Button>
          </div>

          <div className="border-t border-border/70 pt-4">
            <button
              type="button"
              onClick={() => void handleUnpublish()}
              className="inline-flex items-center gap-2 text-[0.58rem] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-destructive"
            >
              <Undo2 className="size-3" />
              Return to drafts
            </button>
            <p className="mt-2 text-[0.66rem] leading-relaxed text-muted-foreground/70">
              Unpublishing pauses the public link but keeps your invitation and
              guest list intact.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Guest update email composer */}
      <Dialog
        open={composerOpen !== null}
        onOpenChange={(open) => !open && setComposerOpen(null)}
      >
        <DialogContent className="rounded-none border-border sm:max-w-md">
          <DialogHeader className="text-left">
            <p className="eyebrow text-muted-foreground">Guest updates</p>
            <DialogTitle className="mt-2 font-display text-2xl font-normal leading-tight">
              {composerOpen === "reminder"
                ? "Remind guests who haven't replied"
                : "Write to your guests"}
            </DialogTitle>
            <DialogDescription className="leading-relaxed">
              Each guest receives their own personal link at the end of the
              message. Guests without an email address are skipped and counted.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Field label="To">
              <Select
                value={emailGroup}
                onValueChange={(value) =>
                  setEmailGroup(value as "all" | "noRsvp" | "attending" | "notAttending")
                }
              >
                <SelectTrigger className="h-10 w-full rounded-none border-border bg-transparent text-[0.8rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  <SelectItem value="all">All guests with an email</SelectItem>
                  <SelectItem value="noRsvp">Awaiting reply</SelectItem>
                  <SelectItem value="attending">Attending</SelectItem>
                  <SelectItem value="notAttending">Not attending</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Subject">
              <Input
                value={emailSubject}
                onChange={(event) => setEmailSubject(event.target.value.slice(0, 120))}
                className={inputClass}
                maxLength={120}
              />
            </Field>
            <Field label="Message" hint={`${emailBody.length}/600`}>
              <Textarea
                value={emailBody}
                onChange={(event) => setEmailBody(event.target.value.slice(0, 600))}
                rows={5}
                placeholder="We moved the ceremony an hour earlier — see you at 3pm instead."
                className="resize-none rounded-none border-border bg-transparent text-[0.86rem] leading-relaxed shadow-none focus-visible:ring-1 focus-visible:ring-foreground/30"
              />
            </Field>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setComposerOpen(null)}
              className="h-10 rounded-none text-[0.6rem] uppercase tracking-[0.18em]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSendEmails()}
              disabled={sendingEmail}
              className="h-10 rounded-none px-5 text-[0.6rem] uppercase tracking-[0.18em]"
            >
              {sendingEmail ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <MessageCircle className="size-3.5" />
              )}
              {composerOpen === "reminder" ? "Send reminders" : "Send update"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit guest name / email */}
      <Dialog
        open={contactTarget !== null}
        onOpenChange={(open) => !open && setContactTarget(null)}
      >
        <DialogContent className="rounded-none border-border sm:max-w-sm">
          <DialogHeader className="text-left">
            <p className="eyebrow text-muted-foreground">Guest details</p>
            <DialogTitle className="mt-2 font-display text-2xl font-normal">
              {contactTarget?.name}
            </DialogTitle>
            <DialogDescription className="leading-relaxed">
              The email lets you send updates and reminders. Nothing is shared
              beyond that, and the personal link does not change.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Name">
              <Input
                value={contactName}
                onChange={(event) => setContactName(event.target.value.slice(0, 80))}
                className={inputClass}
                maxLength={80}
              />
            </Field>
            <Field label="Email" hint="Optional">
              <Input
                type="email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value.slice(0, 120))}
                className={inputClass}
                maxLength={120}
              />
            </Field>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setContactTarget(null)}
              className="h-10 rounded-none text-[0.6rem] uppercase tracking-[0.18em]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSaveContact()}
              disabled={savingContact || !contactName.trim()}
              className="h-10 rounded-none px-5 text-[0.6rem] uppercase tracking-[0.18em]"
            >
              {savingContact ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Guest delete */}
      <AlertDialog
        open={Boolean(guestToDelete)}
        onOpenChange={(open) => !open && setGuestToDelete(null)}
      >
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl font-normal">
              Remove this guest?
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">
              {guestToDelete?.name} will lose their personal link. The main
              invitation link will still work.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none">
              Keep guest
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGuest}
              className="rounded-none bg-destructive text-white hover:bg-destructive/90"
            >
              <Trash2 className="size-4" />
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
