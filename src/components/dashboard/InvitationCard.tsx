import { InvitationPreview } from "@/components/dashboard/InvitationPreview";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  formatEdited,
  invitationActions,
  invitationTitle,
  type GalleryItem,
  type InvitationActionId,
} from "@/lib/dashboard";
import {
  formatEventDateShort,
  occasionLabel,
  type Occasion,
} from "@/lib/invitation";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";
import {
  Copy,
  CopyPlus,
  Eye,
  FilePenLine,
  Files,
  Layout,
  Loader2,
  MoreHorizontal,
  Send,
  Trash2,
  Undo2,
  Users,
} from "lucide-react";
import { Fragment, type ComponentType } from "react";
import { Link, useNavigate } from "react-router";

const ACTION_ICONS: Record<
  InvitationActionId,
  ComponentType<{ className?: string }>
> = {
  open: FilePenLine,
  details: Users,
  preview: Eye,
  copy: Copy,
  duplicate: CopyPlus,
  publish: Send,
  unpublish: Undo2,
  delete: Trash2,
};

interface InvitationCardProps {
  invitation: GalleryItem;
  busy?: boolean;
  onPreview: (invitation: GalleryItem) => void;
  onCopyLink: (invitation: GalleryItem) => void;
  onDuplicate: (invitation: GalleryItem) => void;
  onTogglePublish: (invitation: GalleryItem, published: boolean) => void;
  onDelete: (invitation: GalleryItem) => void;
  className?: string;
}

/**
 * One invitation in the gallery. The preview is the saved design itself; the
 * card's status, title and actions all read from the real record.
 */
export function InvitationCard({
  invitation,
  busy = false,
  onPreview,
  onCopyLink,
  onDuplicate,
  onTogglePublish,
  onDelete,
  className,
}: InvitationCardProps) {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const published = invitation.status === "published";
  const title = invitationTitle(invitation);
  const actions = invitationActions(invitation);
  const studioPath = `/studio/${invitation._id}`;

  const run = (id: InvitationActionId) => {
    switch (id) {
      case "open":
        navigate(studioPath);
        break;
      case "details":
        navigate(`/invitations/${invitation._id}`);
        break;
      case "preview":
        onPreview(invitation);
        break;
      case "copy":
        onCopyLink(invitation);
        break;
      case "duplicate":
        onDuplicate(invitation);
        break;
      case "publish":
        onTogglePublish(invitation, true);
        break;
      case "unpublish":
        onTogglePublish(invitation, false);
        break;
      case "delete":
        onDelete(invitation);
        break;
    }
  };

  return (
    <motion.article
      layout={!reduced}
      initial={reduced ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -60px 0px" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn("group relative min-w-0", className)}
    >
      <div className="relative">
        <Link
          to={studioPath}
          tabIndex={-1}
          aria-hidden="true"
          className="block outline-none"
        >
          <div className="relative border border-ink/12 bg-[var(--paper-deep)] p-2 shadow-[0_10px_28px_rgba(21,21,21,0.05)] transition-[transform,box-shadow,border-color] duration-500 ease-[var(--ease-premium)] group-hover:-translate-y-1 group-hover:border-ink/20 group-hover:shadow-[0_24px_54px_rgba(21,21,21,0.13)] sm:p-2.5">
            <div className="relative overflow-hidden bg-[var(--paper-light)]">
              <div className="origin-center transition-transform duration-[750ms] ease-[var(--ease-premium)] group-hover:scale-[1.015]">
                <InvitationPreview invitation={invitation} />
              </div>
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/[0.045]"
              />
              <span
                className={cn(
                  "absolute left-2 top-2 inline-flex items-center gap-1.5 border px-1.5 py-1 font-meta text-[8px] uppercase tracking-[0.14em] backdrop-blur-sm sm:left-2.5 sm:top-2.5",
                  published
                    ? "border-[var(--olive)]/25 bg-[var(--paper-light)]/92 text-[var(--olive)]"
                    : "border-ink/12 bg-[var(--paper-light)]/92 text-ink/62",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "size-1",
                    published ? "bg-[var(--olive)]" : "bg-ink/30",
                  )}
                />
                {published ? "Live" : "Draft"}
              </span>
            </div>
          </div>
        </Link>

        <div className="absolute right-2 top-2 z-20 sm:right-3 sm:top-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={busy}
                aria-label={`Actions for ${title}`}
                className="grid size-9 place-items-center rounded-full border border-ink/10 bg-[var(--paper-light)]/92 text-ink/60 shadow-[0_4px_14px_rgba(21,21,21,0.08)] backdrop-blur-sm transition-all duration-200 hover:border-ink/25 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--red)] disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <MoreHorizontal className="size-4" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {actions.map((action) => {
                const Icon = ACTION_ICONS[action.id];
                const destructive = action.id === "delete";
                return (
                  <Fragment key={action.id}>
                    {destructive && <DropdownMenuSeparator />}
                    <DropdownMenuItem
                      variant={destructive ? "destructive" : "default"}
                      onSelect={() => run(action.id)}
                    >
                      <Icon className="size-3.5" />
                      {action.label}
                    </DropdownMenuItem>
                  </Fragment>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mouse convenience: the same actions are always available in the
            always-visible menu above, which is also the touch and keyboard path. */}
        <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10 hidden items-center gap-1 border border-ink/10 bg-[var(--paper-light)]/94 p-1 shadow-[0_10px_24px_rgba(21,21,21,0.1)] backdrop-blur-sm opacity-0 transition-opacity duration-300 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 sm:flex">
          <Link
            to={studioPath}
            className="flex flex-1 items-center justify-center gap-1.5 px-2 py-1.5 font-ui text-[9px] uppercase tracking-[0.16em] text-ink/72 transition-colors hover:bg-ink/[0.05] hover:text-ink"
          >
            <Layout className="size-3" />
            Open
          </Link>
          <button
            type="button"
            onClick={() => onPreview(invitation)}
            className="flex flex-1 items-center justify-center gap-1.5 px-2 py-1.5 font-ui text-[9px] uppercase tracking-[0.16em] text-ink/72 transition-colors hover:bg-ink/[0.05] hover:text-ink"
          >
            <Eye className="size-3" />
            Preview
          </button>
        </div>
      </div>

      <div className="mt-3 min-w-0 sm:mt-3.5">
        <h3 className="font-ui text-[0.95rem] font-semibold leading-snug tracking-[-0.012em] sm:text-[1.08rem]">
          <Link
            to={studioPath}
            className="line-clamp-2 outline-none transition-colors duration-200 hover:text-[var(--red)] focus-visible:text-[var(--red)]"
          >
            {title}
          </Link>
        </h3>
        <p className="mt-1 truncate font-meta text-[0.48rem] uppercase tracking-[0.13em] text-ink/52 sm:text-[0.52rem]">
          {occasionLabel(invitation.occasion as Occasion)}
          <span aria-hidden className="mx-1.5 text-ink/25">
            /
          </span>
          {formatEventDateShort(invitation.date)}
        </p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-meta text-[0.46rem] uppercase tracking-[0.1em] text-ink/40 sm:text-[0.5rem]">
          <span>{formatEdited(invitation.updatedAt)}</span>
          <span aria-hidden className="text-ink/20">
            ·
          </span>
          <span>{published ? "Published" : "In progress"}</span>
          {typeof invitation.guestCount === "number" &&
            invitation.guestCount > 0 && (
              <>
                <span aria-hidden className="text-ink/20">
                  ·
                </span>
                <span className="inline-flex items-center gap-1">
                  <Files className="size-2.5" aria-hidden />
                  {invitation.guestCount}{" "}
                  {invitation.guestCount === 1 ? "guest" : "guests"}
                </span>
              </>
            )}
        </p>
      </div>
    </motion.article>
  );
}
