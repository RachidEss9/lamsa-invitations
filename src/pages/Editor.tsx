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
  type InvitationContent,
  type Occasion,
} from "@/lib/invitation";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  Download,
  Eye,
  Loader2,
  Lock,
  Plus,
  Printer,
  Send,
  Share2,
  Trash2,
  Undo2,
  Users,
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
type Tab = "words" | "details" | "design" | "guests";

const TABS: { id: Tab; label: string }[] = [
  { id: "words", label: "Words" },
  { id: "details", label: "Details" },
  { id: "design", label: "Design" },
  { id: "guests", label: "Guests" },
];

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
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
  const invitationId = (id ?? "") as Id<"invitations">;
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const invitation = useQuery(
    api.invitations.getMine,
    id ? { id: invitationId } : "skip",
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
  const [addingGuest, setAddingGuest] = useState(false);
  const [guestToDelete, setGuestToDelete] = useState<{
    id: Id<"guests">;
    name: string;
  } | null>(null);

  const draftRef = useRef<InvitationContent | null>(null);
  const saveTimer = useRef<number | null>(null);
  const saveVersion = useRef(0);
  const hydratedId = useRef<string | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!invitation || hydratedId.current === invitation._id) return;
    hydratedId.current = invitation._id;
    const content = contentFromInvitation(invitation);
    draftRef.current = content;
    setDraft(content);
    setSaveState("saved");
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
      await addGuest({ invitationId, name });
      setGuestName("");
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

  if (invitation === undefined) {
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

  if (invitation === null || !draft) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <Lock className="size-6 text-muted-foreground" />
        <h1 className="mt-5 font-display text-3xl">This invitation is private.</h1>
        <p className="mt-3 max-w-sm text-[0.85rem] leading-relaxed text-muted-foreground">
          It may have been deleted, or it belongs to another LAMSA account.
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

                    <Group label="Personal guests">
                      <p className="text-[0.75rem] leading-relaxed text-muted-foreground">
                        Add a name and LAMSA creates a unique link for that
                        guest. Their name is set into the invitation as they
                        open it.
                      </p>

                      <form onSubmit={handleAddGuest} className="mt-4 flex gap-2">
                        <Input
                          value={guestName}
                          onChange={(event) => setGuestName(event.target.value)}
                          placeholder="Guest or family name"
                          maxLength={80}
                          className={cn(inputClass, "flex-1")}
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
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                onClick={() => copyText(publicLink, "Public link copied.")}
                className="h-10 rounded-none text-[0.58rem] uppercase tracking-[0.16em]"
              >
                <Copy className="size-3.5" />
                Copy link
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
