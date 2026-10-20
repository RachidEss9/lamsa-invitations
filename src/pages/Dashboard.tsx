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
  ArrowUpRight,
  Check,
  Copy,
  Eye,
  FilePenLine,
  LayoutGrid,
  Loader2,
  Lock,
  MoreHorizontal,
  Plus,
  Send,
  Trash2,
  Undo2,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

type Filter = "all" | "draft" | "published";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function publicUrl(slug: string): string {
  return `${window.location.origin}/i/${slug}`;
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

  // Deep link from the landing collection: /dashboard?template=the-vow
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
    return { total, published, drafts: total - published };
  }, [invitations]);

  const handleCreate = async () => {
    if (!selectedTemplate) return;
    setCreating(true);
    try {
      const draft = draftFromTemplate(selectedTemplate);
      const id = await createInvitation(draft);
      toast.success("Invitation created. Make it yours.");
      closeCreate();
      navigate(`/invitations/${id}`);
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
      toast.success("A copy is ready in your drafts.");
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
        toast.success("Invitation returned to drafts.");
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
      toast.error("Could not copy the link. Please copy it from the address bar.");
    }
  };

  return (
    <div className="relative min-h-screen bg-background">
      <div
        aria-hidden
        className="paper-grain pointer-events-none fixed inset-0 opacity-[0.03]"
      />

      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <div className="flex items-center gap-6">
            <BrandLink />
            <span className="hidden h-4 w-px bg-border sm:block" />
            <p className="eyebrow hidden text-[0.55rem] text-muted-foreground sm:block">
              The studio
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={lock}
              title={email ? `Lock studio · ${email}` : "Lock studio"}
              className="flex h-9 items-center gap-2 border border-border/80 px-3 text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              <Lock className="size-3.5" />
              <span className="hidden sm:inline">Lock</span>
            </button>
            <Button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="h-9 rounded-none px-4 text-[0.62rem] uppercase tracking-[0.2em] sm:px-5"
            >
              <Plus className="size-3.5" />
              <span className="hidden sm:inline">New invitation</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-[1440px] px-5 pb-24 pt-12 sm:px-8 sm:pt-16 lg:px-12">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow text-muted-foreground">Your invitations</p>
            <h1 className="mt-4 font-display text-[clamp(2.8rem,6vw,4.6rem)] leading-[0.92] tracking-[-0.025em]">
              Your studio.
            </h1>
            <p className="mt-4 max-w-[30rem] text-[0.86rem] leading-[1.8] text-muted-foreground">
              Compose, refine, and share each invitation from one quiet place.
              Everything saves as you work.
            </p>
          </div>
          {invitations && invitations.length > 0 && (
            <div className="flex gap-8 border-t border-border/70 pt-4 sm:border-0 sm:pt-0">
              <div>
                <p className="font-display text-3xl leading-none">
                  {counts.total}
                </p>
                <p className="eyebrow mt-2 text-[0.52rem] text-muted-foreground">
                  Invitations
                </p>
              </div>
              <div>
                <p className="font-display text-3xl leading-none">
                  {counts.published}
                </p>
                <p className="eyebrow mt-2 text-[0.52rem] text-muted-foreground">
                  Published
                </p>
              </div>
              <div>
                <p className="font-display text-3xl leading-none">
                  {counts.drafts}
                </p>
                <p className="eyebrow mt-2 text-[0.52rem] text-muted-foreground">
                  Drafts
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-12 flex items-center justify-between gap-4 border-b border-border/70">
          <div className="flex items-center gap-6">
            {(
              [
                ["all", "All"],
                ["draft", "Drafts"],
                ["published", "Published"],
              ] as [Filter, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={cn(
                  "relative pb-3 text-[0.64rem] uppercase tracking-[0.2em] transition-colors",
                  filter === value
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground/80",
                )}
              >
                {label}
                {filter === value && (
                  <span className="absolute inset-x-0 -bottom-px h-px bg-foreground" />
                )}
              </button>
            ))}
          </div>
          <LayoutGrid className="mb-3 size-3.5 text-muted-foreground/50" />
        </div>

        {invitations === undefined ? (
          <div className="mt-8 grid gap-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="aspect-[3/4] w-full bg-[var(--paper-deep)]/70" />
                <div className="mt-4 h-3 w-2/3 bg-[var(--paper-deep)]/80" />
                <div className="mt-2 h-2.5 w-1/3 bg-[var(--paper-deep)]/60" />
              </div>
            ))}
          </div>
        ) : invitations.length === 0 ? (
          <EmptyState onCreate={() => setCreateOpen(true)} />
        ) : filtered.length === 0 ? (
          <div className="mt-20 flex flex-col items-center text-center">
            <FilePenLine className="size-6 text-muted-foreground/50" />
            <p className="mt-4 font-display text-2xl">
              Nothing here yet.
            </p>
            <p className="mt-2 max-w-xs text-[0.82rem] leading-relaxed text-muted-foreground">
              {filter === "draft"
                ? "Every invitation begins as a draft. Start one whenever you're ready."
                : "Publish an invitation to see it here, live and shareable."}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFilter("all")}
              className="mt-5 rounded-none text-[0.62rem] uppercase tracking-[0.18em]"
            >
              View all invitations
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence initial={false}>
              {filtered.map((invitation, index) => (
                <motion.article
                  key={invitation._id}
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.35, delay: index * 0.03 }}
                  className="group"
                >
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => navigate(`/invitations/${invitation._id}`)}
                      className="block w-full text-left focus-visible:outline-none"                        aria-label={`Edit ${invitation.title || displayTitle({ names: invitation.names, occasion: invitation.occasion as Occasion })}`}
                    >
                      <div className="editorial-shadow transition-transform duration-500 ease-out group-hover:-translate-y-1">
                        <InvitationCanvas content={invitation as unknown as InvitationContent} />
                      </div>
                    </button>
                    <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/40 via-transparent to-transparent p-4 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                      {invitation.status === "published" ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() =>
                            window.open(
                              publicUrl(invitation.slug),
                              "_blank",
                              "noopener,noreferrer",
                            )
                          }
                          className="pointer-events-auto h-8 rounded-none bg-[#f7f2e7] text-[0.58rem] uppercase tracking-[0.18em] text-[#24211b] hover:bg-white"
                        >
                          <Eye className="size-3" />
                          View live
                        </Button>
                      ) : (
                        <span className="pointer-events-none bg-black/45 px-3 py-1.5 text-[0.55rem] uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                          Draft · not shared
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-start justify-between gap-3 border-t border-border/70 pt-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            invitation.status === "published"
                              ? "bg-[var(--olive)]"
                              : "bg-[var(--gold)]/70",
                          )}
                        />
                        <p className="eyebrow truncate text-[0.5rem] text-muted-foreground">
                          {occasionLabel(invitation.occasion as Occasion)}
                          <span className="mx-1.5 opacity-50">·</span>
                          {invitation.status === "published"
                            ? "Published"
                            : "Draft"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/invitations/${invitation._id}`)
                        }
                        className="mt-1.5 block truncate text-left font-display text-[1.28rem] leading-tight transition-colors hover:text-[var(--olive)]"
                      >
                        {invitation.title || displayTitle({ names: invitation.names, occasion: invitation.occasion as Occasion })}
                      </button>
                      <p className="mt-1 text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground/80">
                        {formatEventDateShort(invitation.date)}
                      </p>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="flex size-8 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                          aria-label={`Actions for ${invitation.title || displayTitle({ names: invitation.names, occasion: invitation.occasion as Occasion })}`}
                        >
                          {busyId === invitation._id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="size-4" />
                          )}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-none">
                        <DropdownMenuItem
                          onSelect={() =>
                            navigate(`/invitations/${invitation._id}`)
                          }
                          className="rounded-none"
                        >
                          <FilePenLine className="size-3.5" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => {
                            if (invitation.status === "published") {
                              window.open(
                                publicUrl(invitation.slug),
                                "_blank",
                                "noopener,noreferrer",
                              );
                            } else {
                              navigate(
                                `/invitations/${invitation._id}?preview=1`,
                              );
                            }
                          }}
                          className="rounded-none"
                        >
                          <Eye className="size-3.5" />
                          {invitation.status === "published"
                            ? "Preview live"
                            : "Preview design"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={invitation.status !== "published"}
                          onSelect={() => handleCopy(invitation.slug)}
                          className="rounded-none"
                        >
                          <Copy className="size-3.5" />
                          Copy public link
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => handleDuplicate(invitation._id)}
                          className="rounded-none"
                        >
                          <Copy className="size-3.5" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() =>
                            handlePublishToggle(
                              invitation._id,
                              invitation.status === "published",
                            )
                          }
                          className="rounded-none"
                        >
                          {invitation.status === "published" ? (
                            <>
                              <Undo2 className="size-3.5" />
                              Unpublish
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
                            setDeleteTarget({
                              id: invitation._id,
                              title:
                              invitation.title || displayTitle({ names: invitation.names, occasion: invitation.occasion as Occasion }),
                            })
                          }
                          className="rounded-none"
                        >
                          <Trash2 className="size-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-2 flex items-center gap-4 text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground/70">
                    <span className="flex items-center gap-1.5">
                      <Eye className="size-3" />
                      {invitation.views} {invitation.views === 1 ? "view" : "views"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="size-3" />
                      {invitation.guestCount}{" "}
                      {invitation.guestCount === 1 ? "guest" : "guests"}
                    </span>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>
        )}

        {invitations && invitations.length > 0 && (
          <div className="mt-20 border-t border-border/70 pt-8">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="group flex items-center gap-4 text-left"
            >
              <span className="flex size-11 items-center justify-center border border-border transition-colors group-hover:border-foreground/40">
                <Plus className="size-4" />
              </span>
              <span>
                <span className="block font-display text-xl">
                  Begin another invitation
                </span>
                <span className="mt-0.5 block text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground">
                  Choose from the collection
                </span>
              </span>
              <ArrowUpRight className="ml-2 size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </button>
          </div>
        )}
      </main>

      {/* Create dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => (open ? setCreateOpen(true) : closeCreate())}
      >
        <DialogContent className="max-h-[92vh] gap-0 overflow-hidden rounded-none border-border bg-background p-0 sm:max-w-4xl">
          <DialogHeader className="border-b border-border/70 px-6 pb-5 pt-6 text-left sm:px-8">
            <p className="eyebrow text-muted-foreground">The collection</p>
            <DialogTitle className="mt-2 font-display text-3xl font-normal tracking-[-0.01em]">
              Choose a starting point.
            </DialogTitle>
            <DialogDescription className="max-w-xl text-[0.8rem] leading-relaxed">
              Every design is fully editable — type, colour, motif, and words.
              You can change anything later.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[calc(92vh-13rem)] overflow-y-auto px-6 py-5 sm:px-8">
            <div className="flex flex-wrap gap-2">
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
                    "border px-3.5 py-2 text-[0.6rem] uppercase tracking-[0.18em] transition-colors",
                    occasion === item.id
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {visibleTemplates.map((template) => {
                const selected = selectedTemplate === template.id;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedTemplate(template.id)}
                    className={cn(
                      "group relative text-left transition-transform",
                      selected ? "" : "hover:-translate-y-0.5",
                    )}
                  >
                    <div
                      className={cn(
                        "relative p-0.5 transition-all",
                        selected
                          ? "bg-foreground"
                          : "bg-transparent ring-1 ring-border/80 group-hover:ring-foreground/30",
                      )}
                    >
                      <InvitationCanvas content={draftFromTemplate(template.id)} />
                      {selected && (
                        <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-foreground text-background">
                          <Check className="size-3" />
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex items-baseline justify-between gap-2">
                      <span className="font-display text-[1.05rem] leading-none">
                        {template.name}
                      </span>
                      <span className="eyebrow text-[0.45rem] text-muted-foreground">
                        {occasionLabel(template.occasion)}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-[0.66rem] text-muted-foreground">
                      {template.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col-reverse items-stretch gap-3 border-t border-border/70 bg-[#f8f3e9]/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <p className="text-[0.68rem] text-muted-foreground">
              Selected:{" "}
              <span className="text-foreground">
                {templateById(selectedTemplate).name}
              </span>
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={closeCreate}
                className="h-10 rounded-none text-[0.62rem] uppercase tracking-[0.18em]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="h-10 rounded-none px-6 text-[0.62rem] uppercase tracking-[0.18em]"
              >
                {creating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                Create invitation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl font-normal">
              Delete this invitation?
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">
              &ldquo;{deleteTarget?.title}&rdquo; and its guest list will be
              permanently removed. If it was published, its public link will stop
              working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none">
              Keep it
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-none bg-destructive text-white hover:bg-destructive/90"
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
    <div className="mt-10 grid items-center gap-12 border border-border/70 bg-[#f8f3e9]/50 px-6 py-14 sm:px-10 lg:grid-cols-[1fr_0.8fr] lg:px-14 lg:py-16">
      <div>
        <p className="eyebrow text-muted-foreground">A blank page</p>
        <h2 className="mt-5 max-w-[26rem] font-display text-[clamp(2.2rem,4.5vw,3.4rem)] leading-[1.02] tracking-[-0.02em]">
          The first invitation is the beginning.
        </h2>
        <p className="mt-5 max-w-[26rem] text-[0.86rem] leading-[1.85] text-muted-foreground">
          Choose a design from the collection, add the names and details, then
          share one beautiful link — or a personal link for every guest.
        </p>
        <Button
          type="button"
          onClick={onCreate}
          className="mt-8 h-11 rounded-none px-6 text-[0.64rem] uppercase tracking-[0.2em]"
        >
          <Plus className="size-4" />
          Create your first invitation
        </Button>
      </div>
      <div className="mx-auto w-full max-w-[260px] rotate-2">
        <div className="editorial-shadow">
          <InvitationCanvas content={draftFromTemplate("the-vow")} />
        </div>
      </div>
    </div>
  );
}
