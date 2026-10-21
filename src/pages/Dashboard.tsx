import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useStudio } from "@/components/auth/studio-context";
import { BrandLink } from "@/components/brand/Wordmark";
import { InvitationCanvas } from "@/components/invitation/InvitationCanvas";
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
import {
  displayTitle,
  draftFromTemplate,
  formatEventDateShort,
  occasionLabel,
  OCCASIONS,
  TEMPLATES,
  templateById,
  type InvitationContent,
  type Occasion,
} from "@/lib/invitation";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  Eye,
  FilePenLine,
  Loader2,
  Lock,
  MoreHorizontal,
  Plus,
  Send,
  Trash2,
  Undo2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

type Filter = "all" | "draft" | "published";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All files" },
  { id: "draft", label: "In progress" },
  { id: "published", label: "Published" },
];

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function publicUrl(slug: string): string {
  return `${window.location.origin}/i/${slug}`;
}

function titleOf(invitation: {
  title?: string;
  names: { primary: string; secondary: string };
  occasion: string;
}) {
  return (
    invitation.title ||
    displayTitle({
      names: invitation.names,
      occasion: invitation.occasion as Occasion,
    })
  );
}

export default function Dashboard() {
  const { email, lock } = useStudio();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const invitations = useQuery(api.invitations.listMine);
  const createInvitation = useMutation(api.invitations.create);
  const duplicateInvitation = useMutation(api.invitations.duplicate);
  const removeInvitation = useMutation(api.invitations.remove);
  const publishInvitation = useMutation(api.invitations.publish);
  const unpublishInvitation = useMutation(api.invitations.unpublish);

  // Deep link from the collection: /dashboard?template=the-vow
  const [initialTemplate] = useState(() => {
    const requested = searchParams.get("template");
    return TEMPLATES.find((item) => item.id === requested) ?? null;
  });

  const [filter, setFilter] = useState<Filter>("all");
  const [createOpen, setCreateOpen] = useState(Boolean(initialTemplate));
  const [occasion, setOccasion] = useState<Occasion>(
    initialTemplate?.occasion ?? "wedding",
  );
  const [selectedTemplate, setSelectedTemplate] = useState<string>(
    initialTemplate?.id ?? "the-vow",
  );
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<Id<"invitations"> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: Id<"invitations">;
    title: string;
  } | null>(null);

  const closeCreate = () => {
    setCreateOpen(false);
    if (searchParams.has("template")) {
      setSearchParams({}, { replace: true });
    }
  };

  const visibleTemplates = useMemo(
    () => TEMPLATES.filter((template) => template.occasion === occasion),
    [occasion],
  );

  const filtered = useMemo(() => {
    if (!invitations) return [];
    if (filter === "all") return invitations;
    return invitations.filter((invitation) => invitation.status === filter);
  }, [invitations, filter]);

  const counts = useMemo(() => {
    const total = invitations?.length ?? 0;
    const published =
      invitations?.filter((invitation) => invitation.status === "published")
        .length ?? 0;
    const views =
      invitations?.reduce((sum, invitation) => sum + invitation.views, 0) ?? 0;
    const replies =
      invitations?.reduce(
        (sum, invitation) => sum + invitation.rsvpYes + invitation.rsvpNo,
        0,
      ) ?? 0;
    return { total, published, drafts: total - published, views, replies };
  }, [invitations]);

  const current = invitations?.[0];

  const handleCreate = async () => {
    if (!selectedTemplate) return;
    setCreating(true);
    try {
      const draft = draftFromTemplate(selectedTemplate);
      const id = await createInvitation(draft);
      toast.success("New file opened in the studio.");
      closeCreate();
      navigate(`/studio/${id}`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicate = async (id: Id<"invitations">) => {
    setBusyId(id);
    try {
      await duplicateInvitation({ id });
      toast.success("A copy is filed under in progress.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  const handlePublishToggle = async (
    id: Id<"invitations">,
    published: boolean,
  ) => {
    setBusyId(id);
    try {
      if (published) {
        await unpublishInvitation({ id });
        toast.success("Back in progress. The link is closed.");
      } else {
        await publishInvitation({ id });
        toast.success("Published. Your link is live.");
      }
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await removeInvitation({ id: deleteTarget.id });
      toast.success("Invitation deleted.");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  const handleCopy = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(publicUrl(slug));
      toast.success("Public link copied.");
    } catch {
      toast.error("Could not copy the link. Copy it from the address bar.");
    }
  };

  return (
    <div className="relative min-h-screen bg-background">
      <div
        aria-hidden
        className="paper-grain pointer-events-none fixed inset-0 opacity-[0.03]"
      />

      <header className="sticky top-0 z-30 border-b border-ink/15 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-[68px] w-full max-w-[1480px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
          <div className="flex items-center gap-5">
            <BrandLink />
            <span className="hidden h-8 w-px bg-ink/15 sm:block" />
            <p className="hidden font-meta text-[0.55rem] uppercase tracking-[0.14em] text-ink/60 sm:block">
              Studio / Index
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={lock}
              title={email ? `Lock studio · ${email}` : "Lock studio"}
              className="flex h-9 items-center gap-2 border border-transparent px-2.5 text-[0.62rem] uppercase tracking-[0.12em] text-ink/68 transition-colors hover:border-ink/20 hover:text-ink"
            >
              <Lock className="size-3.5" />
              <span className="hidden sm:inline">Lock</span>
            </button>
            <Button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="h-9 px-4"
            >
              <Plus className="size-3.5" />
              <span className="hidden sm:inline">New invitation</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-[1480px] px-5 pb-24 pt-10 sm:px-8 sm:pt-14 lg:px-12">
        {/* Masthead + ledger */}
        <div className="flex flex-col justify-between gap-8 border-b border-ink/20 pb-8 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-baseline gap-3">
              <span className="font-meta text-[0.58rem] text-[var(--red)]">
                01
              </span>
              <span className="h-px w-6 bg-ink/30" />
              <span className="eyebrow text-ink/60">The desk</span>
            </div>
            <h1 className="mt-4 font-display text-[clamp(2.9rem,6.4vw,4.8rem)] leading-[0.9] tracking-[-0.02em]">
              Your invitations.
            </h1>
            <p className="mt-3 max-w-[32rem] text-[0.88rem] leading-[1.75] text-ink/68">
              Every file, its proof, and its guest list. Work saves as you type —
              open any row to continue where you left off.
            </p>
          </div>

          {invitations && invitations.length > 0 && (
            <dl className="grid grid-cols-4 gap-6 border-t border-ink/15 pt-4 sm:gap-10 lg:border-0 lg:pt-0">
              {[
                ["Files", counts.total],
                ["Published", counts.published],
                ["Views", counts.views],
                ["Replies", counts.replies],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <dd className="font-display text-[2rem] leading-none tabular-nums">
                    {value as number}
                  </dd>
                  <dt className="mt-1.5 font-meta text-[0.5rem] uppercase tracking-[0.12em] text-ink/60">
                    {label as string}
                  </dt>
                </div>
              ))}
            </dl>
          )}
        </div>

        {/* Continue */}
        {current && (
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <p className="eyebrow text-ink/56">Pick up where you left off</p>
              <p className="font-meta text-[0.5rem] uppercase tracking-[0.12em] text-ink/52">
                Latest edit
              </p>
            </div>
            <div className="mt-3 grid items-center gap-5 border border-ink/25 bg-[var(--paper-light)] p-4 press sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:p-5">
              <button
                type="button"
                onClick={() => navigate(`/studio/${current._id}`)}
                className="hidden w-[96px] shrink-0 sm:block"
                aria-label={`Open ${titleOf(current)}`}
              >
                <div className="editorial-shadow">
                  <InvitationCanvas
                    content={current as unknown as InvitationContent}
                  />
                </div>
              </button>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "px-1.5 py-0.5 font-meta text-[0.48rem] uppercase tracking-[0.12em]",
                      current.status === "published"
                        ? "bg-[var(--olive)] text-[#f2f1ed]"
                        : "bg-[var(--ink)] text-[#f2f1ed]",
                    )}
                  >
                    {current.status === "published" ? "Live" : "Draft"}
                  </span>
                  <span className="font-meta text-[0.52rem] uppercase tracking-[0.1em] text-ink/60">
                    {occasionLabel(current.occasion as Occasion)}
                    <span className="mx-1.5 text-ink/25">/</span>
                    {formatEventDateShort(current.date)}
                  </span>
                </div>
                <p className="mt-2 truncate font-display text-[1.75rem] leading-tight">
                  {titleOf(current)}
                </p>
                <p className="mt-1 font-meta text-[0.52rem] uppercase tracking-[0.1em] text-ink/56">
                  {current.guestCount}{" "}
                  {current.guestCount === 1 ? "guest" : "guests"}
                  <span className="mx-1.5 text-ink/25">/</span>
                  {current.views} {current.views === 1 ? "view" : "views"}
                  <span className="mx-1.5 text-ink/25">/</span>
                  {current.rsvpYes + current.rsvpNo} replied
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/studio/${current._id}`)}
                  className="h-9"
                >
                  <FilePenLine className="size-3.5" />
                  Continue in canvas
                </Button>
                {current.status === "published" ? (
                  <Button
                    type="button"
                    onClick={() =>
                      window.open(publicUrl(current.slug), "_blank", "noopener")
                    }
                    className="h-9"
                  >
                    <Eye className="size-3.5" />
                    View live
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => handlePublishToggle(current._id, false)}
                    className="h-9"
                  >
                    <Send className="size-3.5" />
                    Publish
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filter line */}
        <div className="mt-10 flex flex-wrap items-end justify-between gap-4 border-b border-ink/20">
          <div className="flex items-center gap-5 sm:gap-7">
            {FILTERS.map((item) => {
              const count =
                item.id === "all"
                  ? counts.total
                  : item.id === "draft"
                    ? counts.drafts
                    : counts.published;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={cn(
                    "group relative -mb-px flex items-baseline gap-2 pb-3 text-[0.7rem] transition-colors",
                    filter === item.id
                      ? "text-ink"
                      : "text-ink/60 hover:text-ink/75",
                  )}
                >
                  <span>{item.label}</span>
                  <span className="font-meta text-[0.54rem] tabular-nums text-ink/52">
                    {invitations ? String(count).padStart(2, "0") : "—"}
                  </span>
                  {filter === item.id && (
                    <span className="absolute inset-x-0 -bottom-px h-[2px] bg-[var(--red)]" />
                  )}
                </button>
              );
            })}
          </div>
          <p className="pb-3 font-meta text-[0.5rem] uppercase tracking-[0.12em] text-ink/52">
            Sorted by last edit
          </p>
        </div>

        {invitations === undefined ? (
          <div className="mt-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="grid animate-pulse grid-cols-[2rem_54px_1fr] items-center gap-4 border-b border-ink/10 py-4"
              >
                <div className="h-2 w-4 bg-ink/10" />
                <div className="h-[72px] w-[54px] bg-ink/10" />
                <div className="space-y-2">
                  <div className="h-4 w-1/3 bg-ink/10" />
                  <div className="h-2 w-1/5 bg-ink/[0.07]" />
                </div>
              </div>
            ))}
          </div>
        ) : invitations.length === 0 ? (
          <EmptyState onCreate={() => setCreateOpen(true)} />
        ) : filtered.length === 0 ? (
          <div className="mt-16 flex flex-col items-start">
            <p className="font-meta text-[0.55rem] uppercase tracking-[0.12em] text-ink/56">
              Nothing filed here
            </p>
            <p className="mt-3 max-w-[24rem] font-display text-[2rem] leading-tight">
              {filter === "draft"
                ? "No invitations in progress."
                : "Nothing published yet."}
            </p>
            <p className="mt-2 max-w-[26rem] text-[0.86rem] leading-relaxed text-ink/68">
              {filter === "draft"
                ? "Everything you start is a draft until you publish it."
                : "Publish an invitation and its link becomes live for guests."}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFilter("all")}
              className="mt-5"
            >
              View all files
            </Button>
          </div>
        ) : (
          <div>
            <div className="hidden grid-cols-[2rem_64px_minmax(0,1fr)_7rem_6rem_7rem_2rem] items-center gap-4 border-b border-ink/15 pb-2 pt-3 font-meta text-[0.48rem] uppercase tracking-[0.14em] text-ink/52 sm:grid">
              <span>No.</span>
              <span>Proof</span>
              <span>Invitation</span>
              <span>Guests</span>
              <span>Views</span>
              <span>Status</span>
              <span />
            </div>
            <AnimatePresence initial={false}>
              {filtered.map((invitation, index) => {
                const title = titleOf(invitation);
                const published = invitation.status === "published";
                return (
                  <motion.div
                    key={invitation._id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, delay: index * 0.02 }}
                    className="group grid grid-cols-[1.75rem_54px_minmax(0,1fr)_auto] items-center gap-3 border-b border-ink/12 py-3 transition-colors hover:bg-[var(--paper-light)]/80 sm:grid-cols-[2rem_64px_minmax(0,1fr)_7rem_6rem_7rem_2rem] sm:gap-4 sm:py-4"
                  >
                    <span className="font-meta text-[0.56rem] tabular-nums text-ink/48">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <button
                      type="button"
                      onClick={() => navigate(`/studio/${invitation._id}`)}
                      className="w-[54px] shrink-0 text-left transition-transform duration-300 group-hover:-translate-y-0.5 sm:w-[64px]"
                      aria-label={`Open ${title}`}
                    >
                      <div className="editorial-shadow">
                        <InvitationCanvas
                          content={invitation as unknown as InvitationContent}
                        />
                      </div>
                    </button>

                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => navigate(`/studio/${invitation._id}`)}
                        className="block max-w-full truncate text-left font-display text-[1.35rem] leading-tight transition-colors group-hover:text-[var(--red)] sm:text-[1.5rem]"
                      >
                        {title}
                      </button>
                      <p className="mt-1 truncate font-meta text-[0.5rem] uppercase tracking-[0.1em] text-ink/56">
                        {occasionLabel(invitation.occasion as Occasion)}
                        <span className="mx-1.5 text-ink/25">/</span>
                        {formatEventDateShort(invitation.date)}
                      </p>
                      <p className="mt-1 flex items-center gap-2 sm:hidden">
                        <span
                          className={cn(
                            "px-1 py-0.5 font-meta text-[0.44rem] uppercase tracking-[0.1em]",
                            published
                              ? "bg-[var(--olive)] text-[#f2f1ed]"
                              : "bg-ink/10 text-ink/72",
                          )}
                        >
                          {published ? "Live" : "Draft"}
                        </span>
                        <span className="font-meta text-[0.46rem] uppercase tracking-[0.1em] text-ink/52">
                          {invitation.guestCount} guests · {invitation.views} views
                        </span>
                      </p>
                    </div>

                    <span className="hidden font-meta text-[0.6rem] text-ink/68 sm:block">
                      {invitation.guestCount}
                      <span className="ml-1.5 text-[0.48rem] uppercase tracking-[0.1em] text-ink/48">
                        named
                      </span>
                    </span>

                    <span className="hidden font-meta text-[0.6rem] text-ink/68 sm:block">
                      {invitation.views}
                    </span>

                    <span className="hidden sm:block">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 font-meta text-[0.48rem] uppercase tracking-[0.12em]",
                          published ? "text-[var(--olive)]" : "text-ink/60",
                        )}
                      >
                        <span
                          className={cn(
                            "size-1.5",
                            published
                              ? "rounded-full bg-[var(--olive)]"
                              : "bg-ink/25",
                          )}
                        />
                        {published ? "Published" : "In progress"}
                      </span>
                    </span>

                    <div className="flex items-center justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="flex size-8 items-center justify-center text-ink/56 transition-colors hover:text-ink"
                            aria-label={`Actions for ${title}`}
                          >
                            {busyId === invitation._id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="size-4" />
                            )}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem
                            onSelect={() =>
                              navigate(`/studio/${invitation._id}`)
                            }
                          >
                            <FilePenLine className="size-3.5" />
                            Open canvas studio
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() =>
                              navigate(`/invitations/${invitation._id}`)
                            }
                          >
                            <FilePenLine className="size-3.5" />
                            Details, guests & media
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => {
                              if (published) {
                                window.open(
                                  publicUrl(invitation.slug),
                                  "_blank",
                                  "noopener",
                                );
                              } else {
                                navigate(
                                  `/invitations/${invitation._id}?preview=1`,
                                );
                              }
                            }}
                          >
                            <Eye className="size-3.5" />
                            {published ? "View live" : "Preview proof"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={!published}
                            onSelect={() => handleCopy(invitation.slug)}
                          >
                            <Copy className="size-3.5" />
                            Copy guest link
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => handleDuplicate(invitation._id)}
                          >
                            <Copy className="size-3.5" />
                            Duplicate file
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() =>
                              handlePublishToggle(invitation._id, published)
                            }
                          >
                            {published ? (
                              <>
                                <Undo2 className="size-3.5" />
                                Return to drafts
                              </>
                            ) : (
                              <>
                                <Send className="size-3.5" />
                                Publish
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() =>
                              setDeleteTarget({ id: invitation._id, title })
                            }
                          >
                            <Trash2 className="size-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="group mt-6 flex w-full items-center justify-between gap-4 border border-dashed border-ink/25 px-4 py-4 text-left transition-colors hover:border-ink/60 hover:bg-[var(--paper-light)]/70 sm:px-5"
            >
              <span className="flex items-center gap-4">
                <span className="flex size-8 items-center justify-center border border-ink/30 transition-colors group-hover:border-[var(--red)] group-hover:bg-[var(--red)] group-hover:text-[#f2f1ed]">
                  <Plus className="size-3.5" />
                </span>
                <span>
                  <span className="block font-display text-[1.25rem] leading-tight">
                    Begin another invitation
                  </span>
                  <span className="mt-0.5 block font-meta text-[0.48rem] uppercase tracking-[0.12em] text-ink/56">
                    From the collection
                  </span>
                </span>
              </span>
              <ArrowUpRight className="size-4 text-ink/56 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </button>
          </div>
        )}
      </main>

      {/* New file dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => (open ? setCreateOpen(true) : closeCreate())}
      >
        <DialogContent className="max-h-[92vh] gap-0 overflow-hidden border-ink/25 bg-background p-0 sm:max-w-5xl">
          <div className="grid max-h-[92vh] grid-rows-[auto_1fr] lg:grid-cols-[0.95fr_1.05fr] lg:grid-rows-1">
            <div className="flex min-h-0 flex-col">
              <DialogHeader className="space-y-0 border-b border-ink/15 px-6 pb-5 pt-6 text-left sm:px-8">
                <div className="flex items-baseline gap-3">
                  <span className="font-meta text-[0.55rem] text-[var(--red)]">
                    New
                  </span>
                  <span className="h-px w-5 bg-ink/30" />
                  <span className="eyebrow text-ink/60">Choose a starting point</span>
                </div>
                <DialogTitle className="mt-3 font-display text-[2rem] font-normal leading-[0.95] tracking-[-0.01em]">
                  Start from the collection.
                </DialogTitle>
                <DialogDescription className="max-w-md text-[0.8rem] leading-relaxed text-ink/68">
                  Every design is editable — words, palette, typeface, motif, and
                  the opening gesture. You can change anything later.
                </DialogDescription>
              </DialogHeader>

              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 sm:px-8">
                {/* On narrow screens the proof pane is hidden, so the selected
                    design gets a compact preview here instead. */}
                <div className="mb-4 flex items-center gap-3 border border-ink/20 bg-[var(--paper-deep)]/50 p-2.5 lg:hidden">
                  <div className="w-[42px] shrink-0">
                    <InvitationCanvas
                      content={draftFromTemplate(selectedTemplate)}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-meta text-[0.46rem] uppercase tracking-[0.12em] text-ink/56">
                      Selected
                    </p>
                    <p className="truncate font-display text-[1.05rem] leading-tight">
                      {templateById(selectedTemplate).name}
                    </p>
                    <p className="truncate text-[0.66rem] text-ink/62">
                      {templateById(selectedTemplate).description}
                    </p>
                  </div>
                </div>

                <div className="-mx-1 flex gap-1.5 overflow-x-auto pb-2">
                  {OCCASIONS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setOccasion(item.id);
                        const first = TEMPLATES.find(
                          (template) => template.occasion === item.id,
                        );
                        if (first) setSelectedTemplate(first.id);
                      }}
                      className={cn(
                        "shrink-0 border px-3 py-1.5 font-meta text-[0.52rem] uppercase tracking-[0.12em] transition-colors",
                        occasion === item.id
                          ? "border-ink bg-ink text-[#f2f1ed]"
                          : "border-ink/20 text-ink/68 hover:border-ink/50 hover:text-ink",
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <ul className="mt-3 border-t border-ink/12">
                  {visibleTemplates.map((template) => {
                    const selected = selectedTemplate === template.id;
                    return (
                      <li key={template.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedTemplate(template.id)}
                          className={cn(
                            "flex w-full items-center gap-3 border-b border-ink/12 px-2 py-3 text-left transition-colors",
                            selected
                              ? "bg-[var(--paper-light)]"
                              : "hover:bg-[var(--paper-light)]/60",
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-4 shrink-0 items-center justify-center border",
                              selected
                                ? "border-[var(--red)] bg-[var(--red)] text-[#f2f1ed]"
                                : "border-ink/30",
                            )}
                          >
                            {selected && <Check className="size-2.5" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-2">
                              <span className="truncate font-display text-[1.15rem] leading-tight">
                                {template.name}
                              </span>
                              <span className="shrink-0 font-meta text-[0.46rem] uppercase tracking-[0.1em] text-ink/52">
                                {occasionLabel(template.occasion)}
                              </span>
                            </span>
                            <span className="mt-0.5 block truncate text-[0.72rem] text-ink/62">
                              {template.description}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {visibleTemplates.length === 0 && (
                  <p className="mt-6 text-[0.82rem] text-ink/62">
                    No designs filed under this occasion yet — start from any other
                    and change the occasion inside the studio.
                  </p>
                )}
              </div>
            </div>

            <div className="hidden flex-col border-l border-ink/15 bg-[var(--paper-deep)]/60 lg:flex">
              <div className="flex items-baseline justify-between border-b border-ink/15 px-6 py-3 font-meta text-[0.5rem] uppercase tracking-[0.12em] text-ink/60">
                <span>Proof</span>
                <span>{templateById(selectedTemplate).name}</span>
              </div>
              <div className="flex min-h-0 flex-1 items-center justify-center p-8">
                <div className="editorial-shadow w-full max-w-[330px]">
                  <InvitationCanvas
                    content={draftFromTemplate(selectedTemplate)}
                  />
                </div>
              </div>
              <div className="border-t border-ink/15 px-6 py-4">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="eyebrow text-ink/56">Selected</p>
                    <p className="mt-1 font-display text-[1.4rem] leading-none">
                      {templateById(selectedTemplate).name}
                    </p>
                  </div>
                  <p className="max-w-[12rem] text-right font-meta text-[0.48rem] uppercase leading-relaxed tracking-[0.1em] text-ink/56">
                    {occasionLabel(templateById(selectedTemplate).occasion)}
                    <br />
                    {templateById(selectedTemplate).fontPair}
                  </p>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={closeCreate}
                    className="h-10"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCreate}
                    disabled={creating}
                    className="h-10 flex-1"
                  >
                    {creating ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ArrowRight className="size-4" />
                    )}
                    Create file
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile action bar */}
          <div className="flex items-center gap-2 border-t border-ink/15 bg-background px-5 py-3 lg:hidden">
            <Button
              type="button"
              variant="ghost"
              onClick={closeCreate}
              className="h-10"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="h-10 flex-1"
            >
              {creating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowRight className="size-4" />
              )}
              Create invitation
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="border-ink/25">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-[1.8rem] font-normal leading-tight">
              Delete this invitation?
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">
              &ldquo;{deleteTarget?.title}&rdquo; and its guest list will be
              permanently removed. If it is published, its link will stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {busyId ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Delete invitation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="mt-10 grid items-stretch gap-0 border border-ink/20 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="flex flex-col justify-center p-7 sm:p-10">
        <p className="eyebrow text-ink/60">The first page is blank</p>
        <h2 className="mt-4 max-w-[26rem] font-display text-[clamp(2.2rem,4.5vw,3.4rem)] leading-[0.95] tracking-[-0.015em]">
          Choose a design and start writing.
        </h2>
        <p className="mt-4 max-w-[27rem] text-[0.88rem] leading-[1.8] text-ink/68">
          Pick a starting point, add the names and the date, then share one link —
          or a personal link for every guest. The proof updates as you type.
        </p>
        <div className="mt-7">
          <Button type="button" onClick={onCreate} className="h-11">
            <Plus className="size-4" />
            Create the first invitation
          </Button>
        </div>
      </div>
      <div className="flex items-center justify-center border-t border-ink/15 bg-[var(--paper-deep)]/60 p-7 lg:border-l lg:border-t-0">
        <div className="w-full max-w-[220px]">
          <div className="flex items-baseline justify-between border-b border-ink/20 pb-1 font-meta text-[0.46rem] uppercase tracking-[0.12em] text-ink/56">
            <span>Specimen</span>
            <span>3 : 4</span>
          </div>
          <div className="proof mt-3 p-3">
            <div className="editorial-shadow">
              <InvitationCanvas content={draftFromTemplate("the-vow")} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
