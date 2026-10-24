import { useStudio } from "@/components/auth/studio-context";
import { BrandLink } from "@/components/brand/Wordmark";
import { CreateInvitationDialog, type CreateTarget } from "@/components/dashboard/CreateInvitationDialog";
import { InvitationCard } from "@/components/dashboard/InvitationCard";
import {
  InvitationPreview,
  TemplatePreview,
} from "@/components/dashboard/InvitationPreview";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  GALLERY_FILTERS,
  GALLERY_PAGE_SIZE,
  RECENT_COUNT,
  filterGallery,
  formatEdited,
  galleryCounts,
  invitationTitle,
  recentCreations,
  scratchInvitation,
  type GalleryFilter,
  type GalleryItem,
} from "@/lib/dashboard";
import { createDefaultDesign } from "@/lib/design";
import { draftFromTemplate } from "@/lib/invitation";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Loader2,
  Lock,
  Plus,
  Search,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import {
  useDeferredValue,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

const ease = [0.22, 0.61, 0.36, 1] as const;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.075, delayChildren: 0.04 } },
};

const rise = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};

/** Small caps label used across the studio surfaces. */
function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "font-meta text-[0.5rem] font-medium tracking-[0.3em] text-ink/45 uppercase",
        className,
      )}
    >
      {children}
    </p>
  );
}

function invitationOrigin() {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { email, lock } = useStudio();
  const reduced = useReducedMotion();

  const invitations = useQuery(api.invitations.listMine) as
    | GalleryItem[]
    | undefined;
  const createInvitation = useMutation(api.invitations.create);
  const duplicateInvitation = useMutation(api.invitations.duplicate);
  const removeInvitation = useMutation(api.invitations.remove);
  const publishInvitation = useMutation(api.invitations.publish);
  const unpublishInvitation = useMutation(api.invitations.unpublish);

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [filter, setFilter] = useState<GalleryFilter>("all");
  const [limit, setLimit] = useState(GALLERY_PAGE_SIZE);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  // A template link from the landing page arrives as /dashboard?template=…
  // and opens the create flow with that design already chosen.
  const [createOpen, setCreateOpen] = useState(() =>
    searchParams.has("template"),
  );
  const [createSession, setCreateSession] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<GalleryItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const galleryRef = useRef<HTMLElement | null>(null);

  const ready = invitations !== undefined;
  const records = useMemo(() => invitations ?? [], [invitations]);
  const [now] = useState(() => Date.now());
  const counts = useMemo(() => galleryCounts(records, now), [records, now]);
  const recent = useMemo(() => recentCreations(records), [records]);
  const filtered = useMemo(
    () => filterGallery(records, filter, deferredQuery, now),
    [records, filter, deferredQuery, now],
  );
  const visible = filtered.slice(0, limit);
  const total = records.length;
  const showRecent = recent.length > 0 && total > RECENT_COUNT;
  const latest = recent[0] ?? null;
  const second = recent[1] ?? null;
  const initialTemplate = searchParams.get("template");
  const filteredByHand =
    filter !== "all" || deferredQuery.trim().length > 0;

  const scrollToGallery = () => {
    galleryRef.current?.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "start",
    });
  };

  const openCreate = (templateId?: string) => {
    if (templateId) {
      setSearchParams({ template: templateId }, { replace: true });
    }
    setCreateSession((session) => session + 1);
    setCreateOpen(true);
  };

  const closeCreate = () => {
    setCreateOpen(false);
    if (searchParams.get("template")) {
      setSearchParams({}, { replace: true });
    }
  };

  const handleCreate = async (target: CreateTarget) => {
    setCreating(true);
    try {
      const next =
        target.kind === "scratch"
          ? scratchInvitation(target.input)
          : {
              content: draftFromTemplate(target.templateId),
              design: createDefaultDesign(
                draftFromTemplate(target.templateId),
              ),
            };
      const id = await createInvitation({
        ...next.content,
        design: next.design,
      });
      closeCreate();
      toast.success(
        target.kind === "scratch"
          ? "Your blank canvas is ready."
          : "Invitation created from the collection.",
      );
      navigate(`/studio/${id}`);
    } catch {
      toast.error("The invitation could not be created. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handlePreview = (item: GalleryItem) => {
    if (item.status === "published") {
      window.open(
        `${invitationOrigin()}/i/${item.slug}`,
        "_blank",
        "noopener",
      );
      return;
    }
    navigate(`/invitations/${item._id}?preview=1`);
  };

  const handleCopyLink = async (item: GalleryItem) => {
    const url = `${invitationOrigin()}/i/${item.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Guest link copied.");
    } catch {
      toast.error(`Copy this link: ${url}`);
    }
  };

  const handleDuplicate = async (item: GalleryItem) => {
    setBusyId(item._id);
    try {
      await duplicateInvitation({ id: item._id as Id<"invitations"> });
      toast.success("A draft copy has been filed in your atelier.");
    } catch {
      toast.error("This invitation could not be duplicated.");
    } finally {
      setBusyId(null);
    }
  };

  const handleTogglePublish = async (
    item: GalleryItem,
    published: boolean,
  ) => {
    setBusyId(item._id);
    try {
      const target = { id: item._id as Id<"invitations"> };
      await (published
        ? publishInvitation(target)
        : unpublishInvitation(target));
      toast.success(
        published
          ? "The invitation is live for its guests."
          : "The invitation has been unpublished.",
      );
    } catch {
      toast.error("The publication state could not be changed.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeInvitation({ id: deleteTarget._id as Id<"invitations"> });
      toast.success("The invitation has been removed.");
      setDeleteTarget(null);
    } catch {
      toast.error("The invitation could not be removed.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[var(--paper)] font-ui text-ink">
      <header className="sticky top-0 z-40 border-b border-ink/10 bg-[var(--paper)]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] w-full max-w-[1480px] items-center gap-4 px-4 sm:px-7 lg:px-10">
          <BrandLink className="shrink-0" />
          <nav
            aria-label="Studio"
            className="ml-2 hidden items-center gap-6 md:flex"
          >
            <Link
              to="/dashboard"
              aria-current="page"
              className="font-meta text-[0.52rem] tracking-[0.22em] text-ink uppercase"
            >
              Invitations
            </Link>
            <button
              type="button"
              onClick={() => openCreate("the-vow")}
              className="font-meta text-[0.52rem] tracking-[0.22em] text-ink/45 uppercase transition-colors hover:text-ink"
            >
              The collection
            </button>
          </nav>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Studio settings"
                  className="grid size-8 place-items-center rounded-md border border-ink/15 text-ink/55 transition-colors hover:border-ink/40 hover:text-ink focus-visible:border-ink focus-visible:outline-none"
                >
                  <Settings2 className="size-4" aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="space-y-1 py-2">
                  <span className="block font-meta text-[0.46rem] tracking-[0.24em] text-ink/40 uppercase">
                    Studio session
                  </span>
                  <span className="block truncate text-[11px] font-normal tracking-normal text-ink/70 normal-case">
                    {email ?? "Private studio"}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={lock}>
                  <Lock className="size-3.5" aria-hidden />
                  Lock the studio
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/">
                    <ArrowUpRight className="size-3.5" aria-hidden />
                    About LAMSA
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              className="h-10 gap-2 px-3 text-[0.58rem] tracking-[0.14em] uppercase sm:px-5"
              onClick={() => openCreate()}
            >
              <Plus className="size-4" aria-hidden />
              <span className="hidden sm:inline">Create invitation</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1480px] px-4 pb-20 sm:px-7 lg:px-10">
        <section className="relative pt-10 sm:pt-14 lg:pt-16">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 right-[-12%] hidden size-[520px] rounded-full opacity-70 blur-3xl lg:block"
            style={{
              background:
                "radial-gradient(circle at 60% 45%, rgba(179,143,111,0.20), transparent 68%)",
            }}
          />
          <div className="relative grid items-center gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14">
            <motion.div
              variants={stagger}
              initial={reduced ? false : "hidden"}
              animate="show"
            >
              <motion.div variants={rise}>
                <Eyebrow className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-2">
                    <span className="size-1 bg-[var(--red)]" aria-hidden />
                    The atelier
                  </span>
                  <span className="text-ink/20" aria-hidden>
                    /
                  </span>
                  <span>{format(new Date(now), "EEEE, d MMMM")}</span>
                </Eyebrow>
              </motion.div>
              <motion.h1
                variants={rise}
                className="mt-5 text-[clamp(2.55rem,6.2vw,4.9rem)] leading-[0.94] font-semibold tracking-[-0.045em] text-balance"
              >
                Your next{" "}
                <span className="relative inline-block">
                  <span className="relative z-10">beautiful</span>
                  <span
                    aria-hidden
                    className="absolute inset-x-0 bottom-[0.1em] h-[0.07em] bg-[var(--gold)]/55"
                  />
                </span>{" "}
                invitation
                <span className="block text-ink/55">starts here.</span>
              </motion.h1>
              <motion.p
                variants={rise}
                className="mt-5 max-w-[34rem] text-[0.95rem] leading-[1.75] text-ink/60"
              >
                {email ? `Welcome back, ${email.split("@")[0]}. ` : ""}
                Every design in this studio is a piece of paper you can still
                change — set the wording, choose the opening, and send one
                private link to the people you love.
              </motion.p>
              <motion.div
                variants={rise}
                className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:items-center"
              >
                <Button
                  className="h-12 gap-2 px-6 text-[0.62rem] tracking-[0.16em] uppercase"
                  onClick={() => openCreate()}
                >
                  <Plus className="size-4" aria-hidden />
                  Create invitation
                </Button>
                {latest ? (
                  <Link
                    to={`/studio/${latest._id}`}
                    className="group inline-flex h-12 items-center justify-between gap-3 border border-ink/15 px-5 transition-colors hover:border-ink/40"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        aria-hidden
                        className="size-1 shrink-0 bg-[var(--olive)]"
                      />
                      <span className="min-w-0">
                        <span className="block font-meta text-[0.44rem] tracking-[0.24em] text-ink/40 uppercase">
                          Continue editing
                        </span>
                        <span className="block max-w-[13rem] truncate text-[0.76rem] font-medium">
                          {invitationTitle(latest)}
                        </span>
                      </span>
                    </span>
                    <ArrowUpRight
                      className="size-4 shrink-0 text-ink/45 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      aria-hidden
                    />
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => openCreate("the-vow")}
                    className="group inline-flex h-12 items-center gap-2 border border-ink/15 px-5 font-meta text-[0.54rem] tracking-[0.18em] text-ink/60 uppercase transition-colors hover:border-ink/40 hover:text-ink"
                  >
                    Browse the collection
                    <ArrowRight
                      className="size-3.5 transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </button>
                )}
              </motion.div>
              {ready && total > 0 && (
                <motion.p
                  variants={rise}
                  className="mt-6 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-meta text-[0.46rem] tracking-[0.2em] text-ink/40 uppercase"
                >
                  <span>
                    {counts.total}{" "}
                    {counts.total === 1 ? "invitation" : "invitations"}
                  </span>
                  <span aria-hidden>·</span>
                  <span>{counts.published} live</span>
                  <span aria-hidden>·</span>
                  <span>{counts.drafts} in progress</span>
                  {counts.recent > 0 && (
                    <>
                      <span aria-hidden>·</span>
                      <span>{counts.recent} edited this fortnight</span>
                    </>
                  )}
                </motion.p>
              )}
            </motion.div>

            <motion.div
              initial={reduced ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease, delay: 0.12 }}
              className="relative mx-auto w-full max-w-[340px] sm:max-w-[400px] lg:max-w-[420px]"
            >
              <div
                aria-hidden
                className="absolute -inset-8 rounded-full opacity-60 blur-3xl"
                style={{
                  background:
                    "radial-gradient(circle at 55% 40%, rgba(179,143,111,0.18), transparent 70%)",
                }}
              />
              {latest ? (
                <div>
                  <div className="relative aspect-[5/6]">
                    {second && (
                      <Link
                        to={`/studio/${second._id}`}
                        aria-label={`Open ${invitationTitle(second)}`}
                        className="absolute right-0 bottom-0 w-[52%] rotate-[2.4deg] border border-ink/10 bg-[var(--paper-deep)] p-1.5 shadow-[0_18px_45px_rgba(21,21,21,0.13)] transition-transform duration-700 ease-out hover:rotate-0"
                      >
                        <InvitationPreview invitation={second} />
                      </Link>
                    )}
                    <Link
                      to={`/studio/${latest._id}`}
                      aria-label={`Open ${invitationTitle(latest)}`}
                      className="absolute top-0 left-0 w-[62%] -rotate-[2.4deg] border border-ink/10 bg-[var(--paper-deep)] p-1.5 shadow-[0_28px_60px_rgba(21,21,21,0.18)] transition-transform duration-700 ease-out hover:rotate-0"
                    >
                      <InvitationPreview invitation={latest} />
                    </Link>
                  </div>
                  <div className="mt-4 flex items-start justify-between gap-4 border-t border-ink/15 pt-3">
                    <div className="min-w-0">
                      <Eyebrow className="text-[0.44rem] tracking-[0.24em]">
                        Latest edit
                      </Eyebrow>
                      <p className="mt-1.5 truncate text-[0.88rem] leading-tight font-semibold">
                        {invitationTitle(latest)}
                      </p>
                      <p className="mt-1 font-meta text-[0.44rem] tracking-[0.18em] text-ink/40 uppercase">
                        {formatEdited(latest.updatedAt)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1.5 border px-2 py-1 font-meta text-[8px] tracking-[0.16em] uppercase",
                        latest.status === "published"
                          ? "border-[var(--olive)]/30 text-[var(--olive)]"
                          : "border-ink/15 text-ink/50",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "size-1",
                          latest.status === "published"
                            ? "bg-[var(--olive)]"
                            : "bg-ink/30",
                        )}
                      />
                      {latest.status === "published" ? "Live" : "Draft"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="mx-auto w-[72%] -rotate-[2deg] border border-ink/12 bg-[var(--paper-deep)] p-2 shadow-[0_26px_60px_rgba(21,21,21,0.16)]">
                    <TemplatePreview templateId="the-vow" />
                  </div>
                  <p className="mt-5 text-center font-meta text-[0.44rem] tracking-[0.24em] text-ink/40 uppercase">
                    Specimen · The Vow, from the collection
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </section>

        {!ready && (
          <section className="mt-16 sm:mt-20" aria-busy="true">
            <div className="border-b border-ink/15 pb-4">
              <Eyebrow>The gallery</Eyebrow>
              <h2 className="mt-2 text-[clamp(1.7rem,3.4vw,2.6rem)] font-semibold tracking-[-0.03em]">
                Gathering your invitations.
              </h2>
            </div>
            <p className="sr-only">Loading your invitations</p>
            <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="aspect-[3/4] border border-ink/5 bg-ink/[0.055]" />
                  <div className="mt-3 h-3 w-2/3 bg-ink/[0.07]" />
                  <div className="mt-2 h-2 w-1/2 bg-ink/[0.05]" />
                </div>
              ))}
            </div>
          </section>
        )}

        {ready && total === 0 && (
          <section className="mt-14 border-t border-ink/15 py-12 sm:mt-16 sm:py-16">
            <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
              <div>
                <Eyebrow>Your atelier is ready</Eyebrow>
                <h2 className="mt-4 max-w-[28rem] text-[clamp(2.1rem,4.8vw,3.6rem)] leading-[0.96] font-semibold tracking-[-0.035em] text-balance">
                  The first page is yours to write.
                </h2>
                <p className="mt-4 max-w-[32rem] text-[0.92rem] leading-[1.75] text-ink/60">
                  Start from a blank canvas or choose a design from the
                  collection. Nothing is published until you decide it is.
                </p>
                <Button
                  className="mt-7 h-12 gap-2 px-6 text-[0.62rem] tracking-[0.16em] uppercase"
                  onClick={() => openCreate()}
                >
                  <Plus className="size-4" aria-hidden />
                  Create your first invitation
                </Button>
              </div>
              <ul className="grid gap-4 border-t border-ink/15 pt-6 lg:border-t-0 lg:pt-0">
                {[
                  "A design you can change completely",
                  "One private link, or one for each guest",
                  "Replies and guest names kept in your studio",
                ].map((line) => (
                  <li
                    key={line}
                    className="flex items-start gap-3 border-b border-ink/10 pb-3 text-[0.82rem] leading-relaxed text-ink/65 last:border-b-0 last:pb-0"
                  >
                    <span
                      aria-hidden
                      className="mt-[0.45rem] size-1 shrink-0 bg-[var(--gold)]"
                    />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {ready && total > 0 && showRecent && (
          <motion.section
            initial={reduced ? false : "hidden"}
            animate="show"
            variants={stagger}
            className="mt-16 sm:mt-20"
          >
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/15 pb-4">
              <motion.div variants={rise}>
                <Eyebrow>Recently edited</Eyebrow>
                <h2 className="mt-2 text-[clamp(1.7rem,3.4vw,2.6rem)] font-semibold tracking-[-0.03em]">
                  Pick up where you left off.
                </h2>
              </motion.div>
              <motion.button
                variants={rise}
                type="button"
                onClick={scrollToGallery}
                className="group inline-flex items-center gap-2 font-meta text-[0.5rem] tracking-[0.2em] text-ink/55 uppercase transition-colors hover:text-ink"
              >
                View all
                <ArrowRight
                  className="size-3.5 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </motion.button>
            </div>
            <motion.div
              variants={stagger}
              className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6"
            >
              {recent.map((item) => (
                <motion.div key={item._id} variants={rise}>
                  <InvitationCard
                    invitation={item}
                    busy={busyId === item._id}
                    onPreview={handlePreview}
                    onCopyLink={handleCopyLink}
                    onDuplicate={handleDuplicate}
                    onTogglePublish={handleTogglePublish}
                    onDelete={setDeleteTarget}
                  />
                </motion.div>
              ))}
            </motion.div>
          </motion.section>
        )}

        {ready && total > 0 && (
          <section
            id="gallery"
            ref={galleryRef}
            className="mt-16 scroll-mt-24 sm:mt-20"
          >
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/15 pb-4">
              <div>
                <Eyebrow>The gallery</Eyebrow>
                <h2 className="mt-2 text-[clamp(1.7rem,3.4vw,2.6rem)] font-semibold tracking-[-0.03em]">
                  {filteredByHand
                    ? "Your invitations."
                    : "Every invitation, in one place."}
                </h2>
              </div>
              <p
                aria-live="polite"
                className="font-meta text-[0.48rem] tracking-[0.2em] text-ink/40 uppercase"
              >
                {filtered.length} of {counts.total} shown
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-[22rem]">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink/35"
                  aria-hidden
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setLimit(GALLERY_PAGE_SIZE);
                  }}
                  placeholder="Search names, guests, venues"
                  aria-label="Search invitations"
                  className="h-11 w-full border border-ink/15 bg-transparent pr-10 pl-10 text-[0.82rem] text-ink transition-colors placeholder:text-ink/35 focus:border-ink focus:outline-none [&::-webkit-search-cancel-button]:hidden"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setLimit(GALLERY_PAGE_SIZE);
                    }}
                    aria-label="Clear search"
                    className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center text-ink/45 transition-colors hover:text-ink"
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                )}
              </div>
              <div
                className="flex flex-wrap items-center gap-2"
                role="group"
                aria-label="Filter invitations"
              >
                {GALLERY_FILTERS.map((option) => {
                  const count =
                    option.id === "all"
                      ? counts.total
                      : option.id === "draft"
                        ? counts.drafts
                        : option.id === "published"
                          ? counts.published
                          : counts.recent;
                  const active = filter === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        setFilter(option.id);
                        setLimit(GALLERY_PAGE_SIZE);
                      }}
                      className={cn(
                        "inline-flex h-9 items-center gap-2 border px-3.5 font-meta text-[0.48rem] tracking-[0.18em] uppercase transition-colors",
                        active
                          ? "border-ink bg-ink text-[var(--paper)]"
                          : "border-ink/15 text-ink/55 hover:border-ink/40 hover:text-ink",
                      )}
                    >
                      {option.label}
                      <span
                        className={cn(
                          "text-[0.44rem]",
                          active ? "text-[var(--paper)]/55" : "text-ink/35",
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="mt-10 border border-dashed border-ink/20 px-6 py-14 text-center">
                <p className="text-[0.95rem] font-medium">
                  Nothing matches that yet.
                </p>
                <p className="mx-auto mt-2 max-w-[26rem] text-[0.82rem] leading-relaxed text-ink/55">
                  Try another name, or clear the filters to see the whole
                  gallery again.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setFilter("all");
                    setLimit(GALLERY_PAGE_SIZE);
                  }}
                  className="mt-5 inline-flex h-9 items-center gap-2 rounded-md border border-ink/20 px-4 font-meta text-[0.5rem] tracking-[0.18em] uppercase transition-colors hover:border-ink"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <>
                <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">
                  {visible.map((item) => (
                    <InvitationCard
                      key={item._id}
                      invitation={item}
                      busy={busyId === item._id}
                      onPreview={handlePreview}
                      onCopyLink={handleCopyLink}
                      onDuplicate={handleDuplicate}
                      onTogglePublish={handleTogglePublish}
                      onDelete={setDeleteTarget}
                    />
                  ))}
                </div>
                {filtered.length > limit && (
                  <div className="mt-10 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setLimit((value) => value + GALLERY_PAGE_SIZE)}
                      className="inline-flex h-11 items-center gap-2 border border-ink/20 px-5 font-meta text-[0.5rem] tracking-[0.2em] uppercase transition-colors hover:border-ink"
                    >
                      Show more
                      <ArrowRight className="size-3.5" aria-hidden />
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </main>

      <footer className="border-t border-ink/12">
        <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-2 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-7 lg:px-10">
          <p className="font-meta text-[0.46rem] tracking-[0.22em] text-ink/40 uppercase">
            LAMSA · An atelier for invitations
          </p>
          <p className="flex items-center gap-2 font-meta text-[0.46rem] tracking-[0.22em] text-ink/40 uppercase">
            <Lock className="size-3" aria-hidden />
            A private studio
          </p>
        </div>
      </footer>

      <CreateInvitationDialog
        key={createSession}
        open={createOpen}
        onOpenChange={(open) => (open ? setCreateOpen(true) : closeCreate())}
        initialTemplateId={initialTemplate}
        creating={creating}
        onCreate={handleCreate}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-[1.15rem] font-semibold tracking-[-0.02em]">
              <Trash2 className="size-4 text-[var(--red)]" aria-hidden />
              Delete this invitation?
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">
              “{deleteTarget ? invitationTitle(deleteTarget) : ""}” and its
              saved design will be removed from your studio
              {deleteTarget?.status === "published"
                ? ", and its public guest link will stop working"
                : ""}
              . This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              className="gap-2 bg-[var(--red)] text-[#f9f5ec] hover:bg-[var(--red)]/90"
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="size-4" aria-hidden />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
