import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { loadDocument, requireOwnedPublication, requireUserId, saveDocumentState } from "./lib";
import { storyValidator } from "./validators";


/**
 * Stories hold the text and the thread order; a text frame only names its
 * story. Creating or updating a story therefore verifies every frame in the
 * thread against the current pages before anything is written.
 */

function assertFramesResolve(
  document: Awaited<ReturnType<typeof loadDocument>>,
  story: { id: string; frames: Array<{ pageId: string; objectId: string }> },
): void {
  const pages = new Map(document.pages.map((page) => [page.id, page]));
  for (const frame of story.frames) {
    const page = pages.get(frame.pageId);
    if (!page) {
      throw new Error(`Story "${story.id}" references a page that does not exist.`);
    }
    const object = page.objects.find((entry) => entry.id === frame.objectId);
    if (!object) {
      throw new Error(`Story "${story.id}" references a frame that does not exist.`);
    }
    if (object.kind !== "text-frame") {
      throw new Error(`Story "${story.id}" can only thread text frames.`);
    }
  }
  const claimed = new Set(story.frames.map((frame) => frame.objectId));
  if (claimed.size !== story.frames.length) {
    throw new Error(`Story "${story.id}" claims the same frame twice.`);
  }
  for (const other of document.stories) {
    if (other.id === story.id) continue;
    const clash = other.frames.find((frame) => claimed.has(frame.objectId));
    if (clash) {
      throw new Error(`Frame "${clash.objectId}" already belongs to another story.`);
    }
  }
}

export const createStory = mutation({
  args: {
    publicationId: v.id("publications"),
    story: storyValidator,
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const publication = await requireOwnedPublication(ctx, args.publicationId, userId);
    const document = await loadDocument(ctx, publication);
    if (document.stories.some((story) => story.id === args.story.id)) {
      throw new Error("A story with that id already exists.");
    }
    assertFramesResolve(document, args.story);
    const story = { ...args.story, version: 1 };
    const next = { ...document, stories: [...document.stories, story] };
    const now = Date.now();
    await saveDocumentState(ctx, publication, next, now);
    return { storyId: story.id, version: story.version, updatedAt: now };
  },
});

export const updateStory = mutation({
  args: {
    publicationId: v.id("publications"),
    story: storyValidator,
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const publication = await requireOwnedPublication(ctx, args.publicationId, userId);
    const document = await loadDocument(ctx, publication);
    const existing = document.stories.find((story) => story.id === args.story.id);
    if (!existing) throw new Error("Story not found.");
    assertFramesResolve(document, args.story);
    const story = { ...args.story, version: existing.version + 1 };
    const next = {
      ...document,
      stories: document.stories.map((entry) =>
        entry.id === story.id ? story : entry,
      ),
    };
    const now = Date.now();
    await saveDocumentState(ctx, publication, next, now);
    return { storyId: story.id, version: story.version, updatedAt: now };
  },
});

export const deleteStory = mutation({
  args: {
    publicationId: v.id("publications"),
    storyId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const publication = await requireOwnedPublication(ctx, args.publicationId, userId);
    const document = await loadDocument(ctx, publication);
    if (!document.stories.some((story) => story.id === args.storyId)) {
      throw new Error("Story not found.");
    }
    // The frames keep their content; only the thread and the back-reference
    // to the deleted story go away. Normalisation at the save boundary clears
    // `storyId` on those frames.
    const next = {
      ...document,
      stories: document.stories.filter((story) => story.id !== args.storyId),
    };
    const now = Date.now();
    await saveDocumentState(ctx, publication, next, now);
    return { updatedAt: now };
  },
});

