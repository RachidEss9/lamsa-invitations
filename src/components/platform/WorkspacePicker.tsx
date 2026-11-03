import { api } from "@/convex/_generated/api";
import { normalizeDesign } from "@/lib/design";
import { contentFromInvitation, type InvitationContent } from "@/lib/invitation";
import { suiteOf } from "@/lib/suite";
import type { Workspace } from "@/lib/workspaces";
import { useQuery } from "convex/react";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { Link } from "react-router";
import { WorkspacePanel } from "./WorkspaceShell";

interface ProjectRow {
  _id: string;
  title: string;
  occasion?: string;
  updatedAt: number;
  design?: unknown;
}

function when(timestamp: number) {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * The front door of a lab.
 *
 * Print Lab, Shape Maker and Press all work on an existing invitation — the
 * suite, its page sizes and its paper are already in that document, and the
 * roadmap forbids a second database. So each lab opens with the host's own
 * projects rather than an empty canvas.
 */
export function WorkspacePicker({
  workspace,
  openPath,
  actionLabel,
}: {
  workspace: Workspace;
  /** Prefix the project id is appended to, e.g. "/print". */
  openPath: string;
  actionLabel: string;
}) {
  const invitations = useQuery(api.invitations.listMine) as ProjectRow[] | undefined;

  if (!invitations) {
    return (
      <div className="flex items-center gap-2 py-10 font-meta text-[10px] uppercase tracking-[0.14em] text-ink/45">
        <Loader2 className="size-3.5 animate-spin" />
        Opening the studio
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <WorkspacePanel
        title="No projects yet"
        note={`${workspace.name} works on a saved invitation, so start one in the studio.`}
      >
        <div className="p-4">
          <Link
            to="/dashboard"
            className="pressable inline-flex h-9 items-center gap-2 rounded-full bg-[var(--ink)] px-4 font-meta text-[10px] uppercase tracking-[0.14em] text-[var(--paper)]"
          >
            Compose an invitation
            <ArrowUpRight className="size-3.5" strokeWidth={1.8} />
          </Link>
        </div>
      </WorkspacePanel>
    );
  }

  return (
    <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
      {invitations.map((invitation) => {
        const design = normalizeDesign(
          invitation.design,
          contentFromInvitation(invitation as unknown as InvitationContent),
        );
        const pieces = suiteOf(design);
        return (
          <Link
            key={invitation._id}
            to={`${openPath}/${invitation._id}`}
            className="pressable group flex flex-col justify-between gap-3 rounded-[var(--radius-tile)] border border-[var(--edge)] bg-[var(--surface-card)] p-4 shadow-[var(--shadow-xs)] transition-[border-color,box-shadow] duration-150 hover:border-[var(--edge-strong)] hover:shadow-[var(--shadow-card)]"
          >
            <div className="min-w-0">
              <p className="font-meta text-[8px] uppercase tracking-[0.16em] text-[var(--red)]">
                {invitation.occasion ?? "Invitation"}
              </p>
              <p className="mt-1 truncate font-display text-[1.05rem] leading-snug text-ink">
                {invitation.title}
              </p>
              <p className="mt-1 font-ui text-[0.66rem] text-ink/45">
                {design.pages.length} page
                {design.pages.length === 1 ? "" : "s"}
                {pieces.length > 0 ? ` · ${pieces.length} piece${pieces.length === 1 ? "" : "s"}` : ""}
                {" · "}
                edited {when(invitation.updatedAt)}
              </p>
            </div>
            <span className="flex items-center gap-1.5 font-meta text-[9px] uppercase tracking-[0.14em] text-ink/50 transition-colors group-hover:text-[var(--red)]">
              {actionLabel}
              <ArrowUpRight className="size-3.5" strokeWidth={1.8} />
            </span>
          </Link>
        );
      })}
    </div>
  );
}
