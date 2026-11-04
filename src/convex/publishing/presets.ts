import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { CUSTOM_PRESET_ID, DOCUMENT_PRESETS } from "../../lib/publishing/presets";
import type { GridSettings } from "../../lib/publishing/model";
import { optionalUserId, requireUserId } from "./lib";
import { docTypeValidator, presetPayloadValidator } from "./validators";

/**
 * Built-in presets live in the Phase 1 foundation and are never copied into
 * the database. `publicationPresets` only holds an owner's custom sizes, and
 * every mutation is scoped to the signed-in owner.
 */

interface PresetPayload {
  size: { width: number; height: number };
  unit: "pt" | "mm" | "cm" | "in";
  bleed: number;
  margins: { top: number; right: number; bottom: number; left: number };
  mirrorMargins: boolean;
  facingPages: boolean;
  grid: GridSettings;
  defaultPageCount: number;
}

function assertPayload(payload: PresetPayload): PresetPayload {
  const { width, height } = payload.size;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new RangeError("A preset needs a positive trim size in points.");
  }
  if (width > 100_000 || height > 100_000) {
    throw new RangeError("That trim size is too large.");
  }
  if (!Number.isFinite(payload.bleed) || payload.bleed < 0 || payload.bleed > 500) {
    throw new RangeError("Bleed must be between 0 and 500 points.");
  }
  const { top, right, bottom, left } = payload.margins;
  for (const margin of [top, right, bottom, left]) {
    if (!Number.isFinite(margin) || margin < 0) {
      throw new RangeError("Margins cannot be negative.");
    }
  }
  if (left + right >= width || top + bottom >= height) {
    throw new RangeError("Margins must leave a printable area.");
  }
  if (
    !Number.isFinite(payload.grid.columns) ||
    payload.grid.columns < 1 ||
    payload.grid.columns > 48
  ) {
    throw new RangeError("A grid needs between 1 and 48 columns.");
  }
  if (
    !Number.isFinite(payload.grid.gutter) ||
    payload.grid.gutter < 0 ||
    !Number.isFinite(payload.grid.baseline) ||
    payload.grid.baseline < 0
  ) {
    throw new RangeError("Grid spacing cannot be negative.");
  }
  const pages = Math.trunc(payload.defaultPageCount);
  if (!Number.isFinite(pages) || pages < 1 || pages > 512) {
    throw new RangeError("A preset needs between 1 and 512 pages.");
  }
  return { ...payload, defaultPageCount: pages };
}

function builtInPresets() {
  return DOCUMENT_PRESETS.filter(
    (preset) => preset.id !== CUSTOM_PRESET_ID && preset.size !== null,
  ).map((preset) => ({
    _id: `builtin:${preset.id}`,
    id: preset.id,
    name: preset.name,
    docType: preset.docType,
    description: preset.description,
    builtIn: true,
    archived: false,
    payload: {
      size: preset.size!,
      unit: preset.unit,
      bleed: preset.bleed,
      margins: preset.margins,
      mirrorMargins: preset.mirrorMargins,
      facingPages: preset.facingPages,
      grid: preset.grid,
      defaultPageCount: preset.defaultPageCount,
    } as PresetPayload,
  }));
}

export const listPresets = query({
  args: {
    docType: v.optional(docTypeValidator),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await optionalUserId(ctx);
    const builtIns = builtInPresets().filter(
      (preset) => !args.docType || preset.docType === args.docType,
    );
    if (!userId) return builtIns;

    const rows = await ctx.db
      .query("publicationPresets")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();
    const custom = rows
      .filter((row) => row.ownerId === userId)
      .filter((row) => args.includeArchived || !row.archived)
      .filter((row) => !args.docType || row.docType === args.docType)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((row) => ({
        _id: row._id,
        id: row._id,
        name: row.name,
        docType: row.docType,
        description: "",
        builtIn: false,
        archived: row.archived,
        payload: row.payload as PresetPayload,
      }));
    return [...builtIns, ...custom];
  },
});

function cleanName(value: string): string {
  const name = value.trim().slice(0, 80);
  if (!name) throw new Error("Give this preset a name.");
  return name;
}

export const createPreset = mutation({
  args: {
    name: v.string(),
    docType: docTypeValidator,
    payload: presetPayloadValidator,
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const payload = assertPayload(args.payload as PresetPayload);
    const now = Date.now();
    return await ctx.db.insert("publicationPresets", {
      ownerId: userId,
      name: cleanName(args.name),
      docType: args.docType,
      payload,
      archived: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updatePreset = mutation({
  args: {
    presetId: v.id("publicationPresets"),
    name: v.optional(v.string()),
    docType: v.optional(docTypeValidator),
    payload: v.optional(presetPayloadValidator),
    archived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const preset = await ctx.db.get(args.presetId);
    if (!preset || preset.ownerId !== userId) {
      throw new Error("Preset not found.");
    }
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = cleanName(args.name);
    if (args.docType !== undefined) patch.docType = args.docType;
    if (args.payload !== undefined) {
      patch.payload = assertPayload(args.payload as PresetPayload);
    }
    if (args.archived !== undefined) patch.archived = args.archived;
    await ctx.db.patch(preset._id, patch);
    return null;
  },
});

export const archivePreset = mutation({
  args: { presetId: v.id("publicationPresets") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const preset = await ctx.db.get(args.presetId);
    if (!preset || preset.ownerId !== userId) {
      throw new Error("Preset not found.");
    }
    await ctx.db.patch(preset._id, { archived: true, updatedAt: Date.now() });
    return null;
  },
});

