import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { addMaster, removeMaster } from "../../lib/publishing/operations";
import type { MasterPage } from "../../lib/publishing/model";
import {
  loadDocument,
  requireOwnedPublication,
  requireUserId,
  saveDocumentState,
} from "./lib";
import { masterPageValidator } from "./validators";

/**
 * Master pages are publication-scoped and keep their own layers. Deleting a
 * master clears the reference on every page that used it, in the same
 * transaction, so a page can never point at furniture that no longer exists.
 */

export const createMaster = mutation({
  args: {
    publicationId: v.id("publications"),
    master: masterPageValidator,
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const publication = await requireOwnedPublication(ctx, args.publicationId, userId);
    const document = await loadDocument(ctx, publication);
    if (document.masters.some((master) => master.id === args.master.id)) {
      throw new Error("A master with that id already exists.");
    }
    const master = { ...args.master, version: 1 } as unknown as MasterPage;
    const next = addMaster(document, master);
    const now = Date.now();
    await saveDocumentState(ctx, publication, next, now);
    return { masterId: master.id, version: master.version, updatedAt: now };
  },
});

export const updateMaster = mutation({
  args: {
    publicationId: v.id("publications"),
    master: masterPageValidator,
    expectedVersion: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const publication = await requireOwnedPublication(ctx, args.publicationId, userId);
    const document = await loadDocument(ctx, publication);
    const existing = document.masters.find((master) => master.id === args.master.id);
    if (!existing) throw new Error("Master not found.");

    // The version read and the increment happen in one transaction, so a
    // stale client either matches the stored version or is refused.
    if (
      args.expectedVersion !== undefined &&
      args.expectedVersion !== existing.version
    ) {
      throw new Error("This master changed elsewhere. Reload it and try again.");
    }

    const master = {
      ...args.master,
      version: existing.version + 1,
    } as unknown as MasterPage;
    const next = {
      ...document,
      masters: document.masters.map((entry) =>
        entry.id === master.id ? master : entry,
      ),
    };
    const now = Date.now();
    await saveDocumentState(ctx, publication, next, now);
    return { masterId: master.id, version: master.version, updatedAt: now };
  },
});

export const deleteMaster = mutation({
  args: {
    publicationId: v.id("publications"),
    masterId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const publication = await requireOwnedPublication(ctx, args.publicationId, userId);
    const document = await loadDocument(ctx, publication);
    if (!document.masters.some((master) => master.id === args.masterId)) {
      throw new Error("Master not found.");
    }
    const next = removeMaster(document, args.masterId);
    const now = Date.now();
    await saveDocumentState(ctx, publication, next, now);
    return { updatedAt: now };
  },
});
