import { format } from "date-fns";
import {
  contentFromInvitation,
  draftFromTemplate,
  displayTitle,
  occasionLabel,
  type InvitationContent,
  type InvitationPalette,
  type LayoutId,
  type FontPairId,
  type MotifId,
  type Occasion,
} from "./invitation";
import { normalizeDesign, visiblePages, type DesignDocument, type DesignPage } from "./design";
import { pageEntranceEnd } from "./journey";

/**
 * The owner's own invitations as the dashboard sees them.
 *
 * This is deliberately the real record (plus the design image URLs the server
 * resolves), not a summary or a fabricated statistic. Filtering, searching and
 * "recently edited" are pure functions so the gallery behaves the same on every
 * render and can be tested without a browser.
 */
export interface GalleryItem {
  _id: string;
  title: string;
  occasion: Occasion;
  templateId: string;
  names: { primary: string; secondary: string };
  eyebrow: string;
  message: string;
  date: string;
  time: string;
  venueName: string;
  venueAddress: string;
  palette: InvitationPalette;
  fontPair: FontPairId;
  layout: LayoutId;
  motif: MotifId;
  animations: boolean;
  rtl?: boolean;
  status: "draft" | "published";
  slug: string;
  updatedAt: number;
  design?: unknown;
  designImageUrls?: Record<string, string>;
  guestCount?: number;
  views?: number;
}

export type GalleryFilter = "all" | "draft" | "published" | "recent";

export const RECENT_COUNT = 3;
export const RECENT_WINDOW_DAYS = 14;
export const GALLERY_PAGE_SIZE = 12;

export const GALLERY_FILTERS: { id: GalleryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Drafts" },
  { id: "published", label: "Published" },
  { id: "recent", label: "Recently edited" },
];

/** Most recent edit first, with a stable title tie-break. */
export function sortByLastEdit<T extends Pick<GalleryItem, "updatedAt" | "title">>(
  invitations: T[],
): T[] {
  return [...invitations].sort((a, b) => {
    if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt;
    return a.title.localeCompare(b.title);
  });
}

export function invitationTitle(
  invitation: Pick<GalleryItem, "title" | "names" | "occasion">,
): string {
  return (
    invitation.title?.trim() ||
    displayTitle({ names: invitation.names, occasion: invitation.occasion })
  );
}

export function isRecent(
  invitation: Pick<GalleryItem, "updatedAt">,
  now = Date.now(),
): boolean {
  return now - invitation.updatedAt <= RECENT_WINDOW_DAYS * 86_400_000;
}

export interface GalleryCounts {
  total: number;
  drafts: number;
  published: number;
  recent: number;
}

export function galleryCounts(
  invitations: Pick<GalleryItem, "status" | "updatedAt">[],
  now = Date.now(),
): GalleryCounts {
  let drafts = 0;
  let published = 0;
  let recent = 0;
  for (const invitation of invitations) {
    if (invitation.status === "published") published += 1;
    else drafts += 1;
    if (isRecent(invitation, now)) recent += 1;
  }
  return { total: invitations.length, drafts, published, recent };
}

/** Normalised haystack for the search field. */
export function searchText(invitation: GalleryItem): string {
  return [
    invitation.title,
    invitation.names.primary,
    invitation.names.secondary,
    invitation.venueName,
    invitation.venueAddress,
    occasionLabel(invitation.occasion),
  ]
    .join(" ")
    .toLowerCase();
}

export function filterGallery<T extends GalleryItem>(
  invitations: T[],
  filter: GalleryFilter,
  query: string,
  now = Date.now(),
): T[] {
  const needle = query.trim().toLowerCase();
  return sortByLastEdit(invitations).filter((invitation) => {
    if (filter === "draft" && invitation.status !== "draft") return false;
    if (filter === "published" && invitation.status !== "published") return false;
    if (filter === "recent" && !isRecent(invitation, now)) return false;
    if (!needle) return true;
    return searchText(invitation).includes(needle);
  });
}

export function recentCreations<T extends GalleryItem>(
  invitations: T[],
  count = RECENT_COUNT,
): T[] {
  return sortByLastEdit(invitations).slice(0, Math.max(0, count));
}

/** "Edited just now", "Edited 3 days ago", "Edited 12 Mar 2026". */
export function formatEdited(updatedAt: number, now = Date.now()): string {
  const diff = Math.max(0, now - updatedAt);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Edited just now";
  if (minutes < 60) return `Edited ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Edited ${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Edited yesterday";
  if (days < 7) return `Edited ${days} days ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `Edited ${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
  }
  return `Edited ${format(new Date(updatedAt), "d MMM yyyy")}`;
}

/**
 * The real first page of the saved design, for thumbnails and the hero stack.
 * Older invitations without a canvas document fall back to their content and
 * are rendered by the legacy canvas; they are never replaced with stock art.
 */
export function previewPageOf(invitation: GalleryItem): DesignPage | null {
  if (!invitation.design) return null;
  const design: DesignDocument = normalizeDesign(
    invitation.design,
    contentFromInvitation(invitation),
  );
  return visiblePages(design)[0] ?? null;
}

/** The moment a thumbnail should show: fully entered, before any exit. */
export function previewMomentOf(page: DesignPage | null): number {
  return Math.max(900, pageEntranceEnd(page));
}

export type InvitationActionId =
  | "open"
  | "details"
  | "preview"
  | "copy"
  | "duplicate"
  | "publish"
  | "unpublish"
  | "delete";

export interface InvitationAction {
  id: InvitationActionId;
  label: string;
  /** Published invitations open the live link; drafts open the proof. */
  external?: boolean;
}

/**
 * The contextual menu, derived from the record itself so a draft and a live
 * invitation can never offer the same (wrong) action. The card renders exactly
 * this list.
 */
export function invitationActions(
  invitation: Pick<GalleryItem, "status">,
): InvitationAction[] {
  const published = invitation.status === "published";
  const actions: InvitationAction[] = [
    { id: "open", label: "Open in canvas studio" },
    { id: "details", label: "Details, guests & media" },
    {
      id: "preview",
      label: published ? "View live invitation" : "Preview the proof",
      external: published,
    },
  ];
  if (published) {
    actions.push({ id: "copy", label: "Copy guest link" });
  }
  actions.push({ id: "duplicate", label: "Duplicate invitation" });
  actions.push(
    published
      ? { id: "unpublish", label: "Return to drafts" }
      : { id: "publish", label: "Publish invitation" },
  );
  actions.push({ id: "delete", label: "Delete invitation" });
  return actions;
}

/**
 * A blank starting point keeps the studio's real, editable design system: a
 * full canvas document with placeholder names, not an empty screen.
 */
export function blankInvitationContent(now = new Date()): InvitationContent {
  const base = draftFromTemplate("the-vow");
  const date = new Date(now.getTime() + 60 * 86_400_000);
  return {
    ...base,
    title: "Untitled invitation",
    names: { primary: "", secondary: "" },
    eyebrow: "You are invited",
    message: "",
    venueName: "",
    venueAddress: "",
    date: format(date, "yyyy-MM-dd"),
    time: "16:00",
  };
}
