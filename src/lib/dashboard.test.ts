import { describe, expect, it } from "vitest";
import {
  GALLERY_FILTERS,
  blankInvitationContent,
  filterGallery,
  formatEdited,
  galleryCounts,
  invitationActions,
  invitationTitle,
  isRecent,
  previewMomentOf,
  previewPageOf,
  RECENT_WINDOW_DAYS,
  recentCreations,
  type GalleryItem,
} from "./dashboard";
import { createDefaultDesign, visiblePages } from "./design";
import { draftFromTemplate } from "./invitation";

const DAY = 86_400_000;
const NOW = new Date("2026-05-20T12:00:00Z").getTime();

function galleryItem(overrides: Partial<GalleryItem> = {}): GalleryItem {
  const base = draftFromTemplate("the-vow");
  return {
    _id: "inv_1",
    ...base,
    status: "draft",
    slug: "amelia-and-soren",
    updatedAt: NOW - DAY,
    ...overrides,
  } as GalleryItem;
}

const records: GalleryItem[] = [
  galleryItem({
    _id: "inv_wedding",
    title: "Amelia & Søren",
    status: "published",
    venueName: "The Garden Hall",
    updatedAt: NOW - 2 * DAY,
  }),
  galleryItem({
    _id: "inv_draft",
    title: "Noor's Aqiqah",
    occasion: "baby",
    status: "draft",
    names: { primary: "Noor", secondary: "" },
    venueName: "Family home",
    updatedAt: NOW - 40 * DAY,
  }),
  galleryItem({
    _id: "inv_fresh",
    title: "",
    status: "draft",
    names: { primary: "Layla", secondary: "Omar" },
    occasion: "engagement",
    venueName: "Dar Al Fan",
    updatedAt: NOW - 20 * 60_000,
  }),
];

describe("gallery loading and counts", () => {
  it("counts the owner's real records by status and recency", () => {
    expect(galleryCounts(records, NOW)).toEqual({
      total: 3,
      drafts: 2,
      published: 1,
      recent: 2,
    });
    expect(galleryCounts([], NOW)).toEqual({
      total: 0,
      drafts: 0,
      published: 0,
      recent: 0,
    });
  });

  it("treats exactly the recent window as recent", () => {
    const boundary = NOW - RECENT_WINDOW_DAYS * DAY;
    expect(isRecent({ updatedAt: boundary }, NOW)).toBe(true);
    expect(isRecent({ updatedAt: boundary - 1 }, NOW)).toBe(false);
  });

  it("uses the saved title, falling back to the names on the record", () => {
    expect(invitationTitle(records[0])).toBe("Amelia & Søren");
    expect(invitationTitle(records[2])).toBe("Layla & Omar");
  });
});

describe("gallery filtering", () => {
  it("returns the most recently edited record first", () => {
    const all = filterGallery(records, "all", "", NOW);
    expect(all.map((item) => item._id)).toEqual([
      "inv_fresh",
      "inv_wedding",
      "inv_draft",
    ]);
  });

  it("filters by publication state without inventing entries", () => {
    expect(
      filterGallery(records, "published", "", NOW).map((item) => item._id),
    ).toEqual(["inv_wedding"]);
    expect(
      filterGallery(records, "draft", "", NOW).map((item) => item._id),
    ).toEqual(["inv_fresh", "inv_draft"]);
    expect(
      filterGallery(records, "recent", "", NOW).map((item) => item._id),
    ).toEqual(["inv_fresh", "inv_wedding"]);
  });

  it("searches names, venues and occasions, ignoring case", () => {
    const byGuest = filterGallery(records, "all", "  noor ", NOW);
    expect(byGuest.map((item) => item._id)).toEqual(["inv_draft"]);
    expect(
      filterGallery(records, "all", "garden hall", NOW).map((item) => item._id),
    ).toEqual(["inv_wedding"]);
    expect(
      filterGallery(records, "all", "engagement", NOW).map((item) => item._id),
    ).toEqual(["inv_fresh"]);
    expect(filterGallery(records, "all", "nothing here", NOW)).toEqual([]);
  });

  it("combines a status filter with the search query", () => {
    expect(filterGallery(records, "published", "noor", NOW)).toEqual([]);
    expect(
      filterGallery(records, "draft", "noor", NOW).map((item) => item._id),
    ).toEqual(["inv_draft"]);
  });

  it("leaves the records it was given untouched", () => {
    const snapshot = records.map((item) => item._id);
    filterGallery(records, "all", "", NOW);
    expect(records.map((item) => item._id)).toEqual(snapshot);
  });

  it("offers a recent shelf of at most three real records", () => {
    const recent = recentCreations(records);
    expect(recent).toHaveLength(3);
    expect(recent[0]._id).toBe("inv_fresh");
    expect(recentCreations(records, 1)).toHaveLength(1);
    expect(recentCreations([], 3)).toEqual([]);
  });

  it("exposes every filter the gallery renders", () => {
    expect(GALLERY_FILTERS.map((filter) => filter.id)).toEqual([
      "all",
      "draft",
      "published",
      "recent",
    ]);
  });
});

describe("contextual actions", () => {
  const draftActions = invitationActions({ status: "draft" });
  const liveActions = invitationActions({ status: "published" });

  it("offers publish to a draft and never a dead guest link", () => {
    const ids = draftActions.map((action) => action.id);
    expect(ids).toContain("publish");
    expect(ids).not.toContain("unpublish");
    expect(ids).not.toContain("copy");
    expect(draftActions.find((action) => action.id === "preview")?.label).toBe(
      "Preview the proof",
    );
    expect(draftActions.find((action) => action.id === "preview")?.external).toBe(
      false,
    );
  });

  it("offers the live link and unpublish to a published invitation", () => {
    const ids = liveActions.map((action) => action.id);
    expect(ids).toContain("unpublish");
    expect(ids).toContain("copy");
    expect(ids).not.toContain("publish");
    expect(liveActions.find((action) => action.id === "preview")?.external).toBe(
      true,
    );
  });

  it("always keeps open, details, duplicate and delete available", () => {
    for (const actions of [draftActions, liveActions]) {
      const ids = actions.map((action) => action.id);
      expect(ids).toContain("open");
      expect(ids).toContain("details");
      expect(ids).toContain("duplicate");
      expect(ids).toContain("delete");
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe("saved design integrity", () => {
  it("previews the real saved design, not a stand-in", () => {
    const content = draftFromTemplate("the-vow");
    const design = createDefaultDesign(content);
    const page = visiblePages(design)[0];
    const item = galleryItem({ design, title: "Amelia & Søren" });
    expect(previewPageOf(item)?.id).toBe(page.id);
    expect(previewPageOf(item)?.elements.map((element) => element.id)).toEqual(
      page.elements.map((element) => element.id),
    );
  });

  it("returns no design page for records saved before the canvas existed", () => {
    expect(previewPageOf(galleryItem({ design: undefined }))).toBeNull();
  });

  it("shows a thumbnail once the page entrance has settled", () => {
    const design = createDefaultDesign(draftFromTemplate("the-vow"));
    const page = visiblePages(design)[0];
    expect(previewMomentOf(page)).toBeGreaterThanOrEqual(900);
    expect(previewMomentOf(null)).toBe(900);
  });

  it("starts a blank invitation as a real, editable design", () => {
    const blank = blankInvitationContent(new Date("2026-01-01T00:00:00Z"));
    expect(blank.title).toBe("Untitled invitation");
    expect(blank.names).toEqual({ primary: "", secondary: "" });
    const design = createDefaultDesign(blank);
    expect(design.pages.length).toBeGreaterThan(0);
    expect(design.pages[0].elements.length).toBeGreaterThan(0);
    expect(blank.date > "2026-01-01").toBe(true);
  });
});

describe("last edit wording", () => {
  it("describes the time since the last save", () => {
    expect(formatEdited(NOW - 10_000, NOW)).toBe("Edited just now");
    expect(formatEdited(NOW - 12 * 60_000, NOW)).toBe("Edited 12 min ago");
    expect(formatEdited(NOW - 3 * 3_600_000, NOW)).toBe("Edited 3 hours ago");
    expect(formatEdited(NOW - DAY, NOW)).toBe("Edited yesterday");
    expect(formatEdited(NOW - 4 * DAY, NOW)).toBe("Edited 4 days ago");
    expect(formatEdited(NOW - 15 * DAY, NOW)).toBe("Edited 2 weeks ago");
    expect(formatEdited(NOW - 90 * DAY, NOW)).toBe("Edited 19 Feb 2026");
  });

  it("never reports a future timestamp as negative time", () => {
    expect(formatEdited(NOW + DAY, NOW)).toBe("Edited just now");
  });
});
