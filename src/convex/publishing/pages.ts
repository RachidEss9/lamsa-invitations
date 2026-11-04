import { v } from "convex/values";
import { mutation } from "../_generated/server";
import {
  addPage,
  movePage,
  removePage,
  reflowPages,
  updatePage,
} from "../../lib/publishing/operations";
import { remapPageForDuplicate } from "../../lib/publishing/persistence";
import type { PublicationPage } from "../../lib/publishing/model";
import {
  loadDocument,
  requireOwnedPublication,
  requireUserId,
  saveDocumentState,
} from "./lib";
import { publicationPageValidator } from "./validators";

/**
 * Page-level edits. The client sends a complete page and the server applies it
 * to the assembled document, so spreads, sides, pageCount and story references
 * are rebuilt by the same Phase 1 code the editor uses. `expectedVersion`
 * gives a cheap optimistic-concurrency guard for two tabs.
 */

export const savePage = mutation({
  args: {
    publicationId: v.id("publications"),
    pageId: v.string(),
    page: publicationPageValidator,
    expectedVersion: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const publication = await requireOwnedPublication(ctx, args.publicationId, userId);
    if (args.page.id !== args.pageId) {
      throw new Error("The page id does not match the page being saved.");
    }
    const document = await loadDocument(ctx, publication);
    const existing = document.pages.find((page) => page.id === args.pageId);
    if (!existing) throw new Error("Page not found.");

    if (
      args.expectedVersion !== undefined &&
      args.expectedVersion !== existing.version
    ) {
      throw new Error("This page changed elsewhere. Reload it and try again.");
    }

    const nextPage = {
      ...args.page,
      version: existing.version + 1,
    } as unknown as PublicationPage;
    const next = updatePage(document, args.pageId, () => nextPage);
    const now = Date.now();
    await saveDocumentState(ctx, publication, next, now);
    return { pageId: args.pageId, version: nextPage.version, updatedAt: now };
  },
});

export const createPage = mutation({
  args: {
    publicationId: v.id("publications"),
    at: v.optional(v.number()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const publication = await requireOwnedPublication(ctx, args.publicationId, userId);
    const document = await loadDocument(ctx, publication);
    const before = new Set(document.pages.map((page) => page.id));
    const next = addPage(document, { at: args.at, name: args.name });
    const page = next.pages.find((candidate) => !before.has(candidate.id));
    if (!page) throw new Error("The page could not be created.");
    const now = Date.now();
    await saveDocumentState(ctx, publication, next, now);
    return { pageId: page.id, index: next.pages.indexOf(page), updatedAt: now };
  },
});

export const duplicatePage = mutation({
  args: {
    publicationId: v.id("publications"),
    pageId: v.string(),
    at: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const publication = await requireOwnedPublication(ctx, args.publicationId, userId);
    const document = await loadDocument(ctx, publication);
    const source = document.pages.find((page) => page.id === args.pageId);
    if (!source) throw new Error("Page not found.");

    const copy: PublicationPage = {
      ...remapPageForDuplicate(source),
      version: 1,
      name: `${source.name} copy`.slice(0, 120),
    };
    const index = args.at ?? document.pages.indexOf(source) + 1;
    const next = addPage(document, { page: copy, at: index });
    const now = Date.now();
    await saveDocumentState(ctx, publication, next, now);
    return { pageId: copy.id, index: next.pages.findIndex((page) => page.id === copy.id) };
  },
});

export const deletePage = mutation({
  args: {
    publicationId: v.id("publications"),
    pageId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const publication = await requireOwnedPublication(ctx, args.publicationId, userId);
    const document = await loadDocument(ctx, publication);
    if (!document.pages.some((page) => page.id === args.pageId)) {
      throw new Error("Page not found.");
    }
    if (document.pages.length <= 1) {
      throw new Error("A publication needs at least one page.");
    }
    const next = removePage(document, args.pageId);
    const now = Date.now();
    await saveDocumentState(ctx, publication, next, now);
    return { pageCount: next.pages.length, updatedAt: now };
  },
});

export const movePageTo = mutation({
  args: {
    publicationId: v.id("publications"),
    pageId: v.string(),
    toIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const publication = await requireOwnedPublication(ctx, args.publicationId, userId);
    const document = await loadDocument(ctx, publication);
    if (!document.pages.some((page) => page.id === args.pageId)) {
      throw new Error("Page not found.");
    }
    const next = movePage(document, args.pageId, args.toIndex);
    const now = Date.now();
    await saveDocumentState(ctx, publication, next, now);
    return { index: next.pages.findIndex((page) => page.id === args.pageId), updatedAt: now };
  },
});

/** Full explicit order, for drag-and-drop before committing a new index. */
export const reorderPages = mutation({
  args: {
    publicationId: v.id("publications"),
    pageIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const publication = await requireOwnedPublication(ctx, args.publicationId, userId);
    const document = await loadDocument(ctx, publication);
    if (
      args.pageIds.length !== document.pages.length ||
      new Set(args.pageIds).size !== args.pageIds.length
    ) {
      throw new Error("The new page order must contain every page exactly once.");
    }
    const byId = new Map(document.pages.map((page) => [page.id, page]));
    const ordered = args.pageIds.map((pageId) => byId.get(pageId));
    if (ordered.some((page) => !page)) {
      throw new Error("The new page order contains an unknown page.");
    }
    const next = reflowPages(document, ordered as typeof document.pages);
    const now = Date.now();
    await saveDocumentState(ctx, publication, next, now);
    return { pageCount: next.pages.length, updatedAt: now };
  },
});
