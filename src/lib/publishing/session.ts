/**
 * The editor session: the working document, local edits and history.
 *
 * The server remains the source of truth, but a designer expects every gesture
 * to land immediately. A session therefore keeps the last document it received
 * (`base`) and a small set of local overrides for the pages and stories that
 * have been touched. Three properties follow, and they are what the tests pin
 * down:
 *
 *   1. an override only ever replaces the record it belongs to, so a refresh
 *      from the server cannot clobber an edit that is still being made;
 *   2. an override is dropped only once the server has acknowledged it, so the
 *      canvas never flicks back to a stale version after a save;
 *   3. history is a stack of session states, not of documents — an undo costs
 *      a reference, not a copy, because untouched records are shared.
 *
 * Nothing here talks to Convex or React; the hook above it decides when to
 * save and when to ask the server for a structural change.
 */

import type {
  Layer,
  PublicationDocument,
  PublicationObject,
  PublicationPage,
  Story,
} from "./model";
import { defaultIds } from "./ids";
import {
  addLayer,
  createLayer,
  lowerObject,
  raiseObject,
  reorderLayer,
} from "./layers";
import { movePage, pageIndexOf, removePage } from "./operations";

const HISTORY_LIMIT = 60;

export interface PageOverride {
  page: PublicationPage;
  /** True until the server has stored this exact content. */
  dirty: boolean;
}

export interface StoryOverride {
  story: Story;
  dirty: boolean;
}

export interface SessionState {
  base: PublicationDocument;
  pages: Record<string, PageOverride>;
  stories: Record<string, StoryOverride>;
  activePageId: string;
  /** Selected object ids on the active page. */
  selection: string[];
  /** The layer new objects are added to. */
  activeLayerId: string;
}

export interface EditorSession {
  state: SessionState;
  undoStack: SessionState[];
  redoStack: SessionState[];
}

/* -------------------------------------------------------------------------- */
/* Reading                                                                    */
/* -------------------------------------------------------------------------- */

/** The document with local overrides applied. Untouched records are shared. */
export function sessionDocument(session: EditorSession): PublicationDocument {
  const { base, pages, stories } = session.state;
  const pageOverrides = Object.values(pages).filter(
    (override) => base.pages.some((page) => page.id === override.page.id),
  );
  const storyOverrides = Object.values(stories).filter(
    (override) => base.stories.some((story) => story.id === override.story.id),
  );
  if (pageOverrides.length === 0 && storyOverrides.length === 0) return base;
  return {
    ...base,
    pages: pageOverrides.length
      ? base.pages.map(
          (page) => pages[page.id]?.page ?? page,
        )
      : base.pages,
    stories: storyOverrides.length
      ? base.stories.map((story) => stories[story.id]?.story ?? story)
      : base.stories,
  };
}

export function activePage(session: EditorSession): PublicationPage | null {
  const document = sessionDocument(session);
  return (
    document.pages.find((page) => page.id === session.state.activePageId) ??
    document.pages[0] ??
    null
  );
}

export function activePageIndex(session: EditorSession): number {
  const page = activePage(session);
  return page ? pageIndexOf(sessionDocument(session), page.id) : -1;
}

export function activeLayerId(session: EditorSession): string | null {
  const page = activePage(session);
  if (!page) return null;
  const layer = page.layers.find((entry) => entry.id === session.state.activeLayerId);
  if (layer) return layer.id;
  const content = page.layers.find((entry) => entry.name === "Content");
  return (content ?? page.layers[page.layers.length - 1] ?? page.layers[0])?.id ?? null;
}

export function hasUnsavedEdits(session: EditorSession): boolean {
  return (
    Object.values(session.state.pages).some((override) => override.dirty) ||
    Object.values(session.state.stories).some((override) => override.dirty)
  );
}

export function dirtyPages(session: EditorSession): PublicationPage[] {
  return Object.values(session.state.pages)
    .filter((override) => override.dirty)
    .map((override) => override.page);
}

export function dirtyStories(session: EditorSession): Story[] {
  return Object.values(session.state.stories)
    .filter((override) => override.dirty)
    .map((override) => override.story);
}

export function canUndo(session: EditorSession): boolean {
  return session.undoStack.length > 0;
}

export function canRedo(session: EditorSession): boolean {
  return session.redoStack.length > 0;
}

/* -------------------------------------------------------------------------- */
/* Writing                                                                    */
/* -------------------------------------------------------------------------- */

function withState(
  session: EditorSession,
  state: SessionState,
  recordHistory: boolean,
): EditorSession {
  if (!recordHistory) return { ...session, state };
  return {
    state,
    undoStack: [...session.undoStack, session.state].slice(-HISTORY_LIMIT),
    redoStack: [],
  };
}

export function createEditorSession(
  document: PublicationDocument,
  options: { activePageId?: string } = {},
): EditorSession {
  const page =
    document.pages.find((entry) => entry.id === options.activePageId) ??
    document.pages[0] ??
    null;
  return {
    state: {
      base: document,
      pages: {},
      stories: {},
      activePageId: page?.id ?? "",
      selection: [],
      activeLayerId: page ? defaultLayerId(page) : "",
    },
    undoStack: [],
    redoStack: [],
  };
}

function defaultLayerId(page: PublicationPage): string {
  const content = page.layers.find((layer) => layer.name === "Content");
  return (
    (content ?? page.layers[page.layers.length - 1] ?? page.layers[0])?.id ?? ""
  );
}

/** Navigates without touching edits: switching pages never drops work. */
export function setActivePage(
  session: EditorSession,
  pageId: string,
): EditorSession {
  const document = sessionDocument(session);
  if (!document.pages.some((page) => page.id === pageId)) return session;
  if (session.state.activePageId === pageId) return session;
  const page = document.pages.find((entry) => entry.id === pageId)!;
  return withState(
    session,
    {
      ...session.state,
      activePageId: pageId,
      selection: [],
      activeLayerId: defaultLayerId(page),
    },
    false,
  );
}

export function setActiveLayer(
  session: EditorSession,
  layerId: string,
): EditorSession {
  if (session.state.activeLayerId === layerId) return session;
  return withState(session, { ...session.state, activeLayerId: layerId }, false);
}

export function setSelection(
  session: EditorSession,
  ids: readonly string[],
): EditorSession {
  const next = [...new Set(ids)];
  const current = session.state.selection;
  if (next.length === current.length && next.every((id, i) => id === current[i])) {
    return session;
  }
  return withState(session, { ...session.state, selection: next }, false);
}

export function toggleSelection(
  session: EditorSession,
  objectId: string,
): EditorSession {
  const selected = session.state.selection.includes(objectId);
  return setSelection(
    session,
    selected
      ? session.state.selection.filter((id) => id !== objectId)
      : [...session.state.selection, objectId],
  );
}

export function selectAllObjects(session: EditorSession): EditorSession {
  const page = activePage(session);
  if (!page) return session;
  return setSelection(
    session,
    page.objects
      .filter((object) => !object.hidden && !object.locked)
      .map((object) => object.id),
  );
}

/** Replaces the page record for `pageId`, recording one history entry. */
export function editPage(
  session: EditorSession,
  pageId: string,
  updater: (page: PublicationPage) => PublicationPage,
): EditorSession {
  const document = sessionDocument(session);
  const page = document.pages.find((entry) => entry.id === pageId);
  if (!page) return session;
  const next = updater(page);
  if (next === page) return session;
  return withState(
    session,
    {
      ...session.state,
      pages: {
        ...session.state.pages,
        [pageId]: { page: next, dirty: true },
      },
    },
    true,
  );
}

export function editStory(
  session: EditorSession,
  storyId: string,
  updater: (story: Story) => Story,
): EditorSession {
  const document = sessionDocument(session);
  const story = document.stories.find((entry) => entry.id === storyId);
  if (!story) return session;
  const next = updater(story);
  if (next === story) return session;
  return withState(
    session,
    {
      ...session.state,
      stories: {
        ...session.state.stories,
        [storyId]: { story: next, dirty: true },
      },
    },
    true,
  );
}

/** Adds a new story to the working set (used after `createStory`). */
export function adoptStory(session: EditorSession, story: Story): EditorSession {
  return withState(
    session,
    {
      ...session.state,
      stories: {
        ...session.state.stories,
        [story.id]: { story, dirty: false },
      },
    },
    false,
  );
}

export function addObjectToPage(
  session: EditorSession,
  pageId: string,
  object: PublicationObject,
): EditorSession {
  return editPage(session, pageId, (page) =>
    page.objects.some((entry) => entry.id === object.id)
      ? page
      : { ...page, objects: [...page.objects, object] },
  );
}

/**
 * Deletes objects and the story frames that pointed at them in one history
 * entry, so an undo restores both halves of the deletion together.
 */
export function removeObjects(
  session: EditorSession,
  pageId: string,
  ids: readonly string[],
): EditorSession {
  const wanted = new Set(ids);
  if (wanted.size === 0) return session;
  const document = sessionDocument(session);
  const page = document.pages.find((entry) => entry.id === pageId);
  if (!page) return session;

  const objects = page.objects.filter((object) => !wanted.has(object.id));
  if (objects.length === page.objects.length) return session;

  const stories: Record<string, StoryOverride> = { ...session.state.stories };
  for (const story of document.stories) {
    if (!story.frames.some((frame) => wanted.has(frame.objectId))) continue;
    stories[story.id] = {
      story: {
        ...story,
        frames: story.frames.filter((frame) => !wanted.has(frame.objectId)),
      },
      dirty: true,
    };
  }

  return withState(
    session,
    {
      ...session.state,
      pages: {
        ...session.state.pages,
        [pageId]: { page: { ...page, objects }, dirty: true },
      },
      stories,
      selection: session.state.selection.filter((id) => !wanted.has(id)),
    },
    true,
  );
}

export function nudgeSelection(
  session: EditorSession,
  dx: number,
  dy: number,
): EditorSession {
  const page = activePage(session);
  if (!page || session.state.selection.length === 0) return session;
  return editPage(session, page.id, (current) =>
    transformPageObjects(current, session.state.selection, (object) => ({
      ...object,
      frame: {
        ...object.frame,
        x: object.frame.x + dx,
        y: object.frame.y + dy,
      },
    })),
  );
}

/** Replaces selected objects with patched copies (inspector, lock, hide). */
export function patchObjects(
  session: EditorSession,
  pageId: string,
  ids: readonly string[],
  patch: Partial<PublicationObject> | ((object: PublicationObject) => PublicationObject),
): EditorSession {
  const wanted = new Set(ids);
  return editPage(session, pageId, (page) =>
    transformPageObjects(page, [...wanted], (object) =>
      typeof patch === "function"
        ? patch(object)
        : ({ ...object, ...patch } as PublicationObject),
    ),
  );
}

function transformPageObjects(
  page: PublicationPage,
  ids: readonly string[],
  transform: (object: PublicationObject) => PublicationObject,
): PublicationPage {
  const wanted = new Set(ids);
  let changed = false;
  const objects = page.objects.map((object) => {
    if (!wanted.has(object.id)) return object;
    const next = transform(object);
    if (next !== object) changed = true;
    return next;
  });
  return changed ? { ...page, objects } : page;
}

/* -------------------------------------------------------------------------- */
/* Layers                                                                     */
/* -------------------------------------------------------------------------- */

function editLayers(
  session: EditorSession,
  pageId: string,
  updater: (page: PublicationPage) => PublicationPage,
): EditorSession {
  return editPage(session, pageId, updater);
}

export function toggleLayerVisibility(
  session: EditorSession,
  pageId: string,
  layerId: string,
): EditorSession {
  return editLayers(session, pageId, (page) => ({
    ...page,
    layers: page.layers.map((layer) =>
      layer.id === layerId ? { ...layer, hidden: !layer.hidden } : layer,
    ),
  }));
}

export function toggleLayerLock(
  session: EditorSession,
  pageId: string,
  layerId: string,
): EditorSession {
  return editLayers(session, pageId, (page) => ({
    ...page,
    layers: page.layers.map((layer) =>
      layer.id === layerId ? { ...layer, locked: !layer.locked } : layer,
    ),
  }));
}

/** Moves a layer up (towards the front) or down in the stack. */
export function moveLayer(
  session: EditorSession,
  pageId: string,
  layerId: string,
  direction: 1 | -1,
): EditorSession {
  return editLayers(session, pageId, (page) => {
    const from = page.layers.findIndex((layer) => layer.id === layerId);
    return from < 0 ? page : reorderLayer(page, layerId, from + direction);
  });
}

export function addLayerToPage(
  session: EditorSession,
  pageId: string,
  name?: string,
): EditorSession {
  const page = sessionDocument(session).pages.find((entry) => entry.id === pageId);
  if (!page) return session;
  const layer: Layer = createLayer(name ?? `Layer ${page.layers.length + 1}`, {
    ids: defaultIds,
    color: "#9a8f7c",
  });
  const next = editLayers(session, pageId, (current) => addLayer(current, layer));
  return setActiveLayer(next, layer.id);
}

export function setObjectLayer(
  session: EditorSession,
  pageId: string,
  objectId: string,
  layerId: string,
): EditorSession {
  return editPage(session, pageId, (page) => {
    if (!page.layers.some((layer) => layer.id === layerId)) return page;
    return transformPageObjects(page, [objectId], (object) =>
      object.layerId === layerId ? object : { ...object, layerId },
    );
  });
}

/** Raises or lowers an object within its own layer. */
export function restackObject(
  session: EditorSession,
  pageId: string,
  objectId: string,
  direction: 1 | -1,
): EditorSession {
  return editPage(session, pageId, (page) =>
    direction > 0 ? raiseObject(page, objectId) : lowerObject(page, objectId),
  );
}

/* -------------------------------------------------------------------------- */
/* Saving                                                                     */
/* -------------------------------------------------------------------------- */

/** The server acknowledged a page; keep showing it, but stop calling it dirty. */
export function markPageSaved(
  session: EditorSession,
  pageId: string,
  version: number,
): EditorSession {
  const override = session.state.pages[pageId];
  if (!override) return session;
  return {
    ...session,
    state: {
      ...session.state,
      pages: {
        ...session.state.pages,
        [pageId]: {
          page: { ...override.page, version },
          dirty: false,
        },
      },
    },
  };
}

export function markStorySaved(
  session: EditorSession,
  storyId: string,
  version: number,
): EditorSession {
  const override = session.state.stories[storyId];
  if (!override) return session;
  return {
    ...session,
    state: {
      ...session.state,
      stories: {
        ...session.state.stories,
        [storyId]: {
          story: { ...override.story, version },
          dirty: false,
        },
      },
    },
  };
}

/**
 * Adopts a fresh document from the server. Dirty overrides survive, so an
 * autosave response never wipes an edit made while it was in flight; clean
 * overrides are dropped because the server now holds that exact content.
 */
export function syncBase(
  session: EditorSession,
  document: PublicationDocument,
): EditorSession {
  if (document === session.state.base) return session;

  const pageIds = new Set(document.pages.map((page) => page.id));
  const storyIds = new Set(document.stories.map((story) => story.id));
  const pages: Record<string, PageOverride> = {};
  for (const [id, override] of Object.entries(session.state.pages)) {
    if (override.dirty && pageIds.has(id)) pages[id] = override;
  }
  const stories: Record<string, StoryOverride> = {};
  for (const [id, override] of Object.entries(session.state.stories)) {
    if (override.dirty && storyIds.has(id)) stories[id] = override;
  }

  const activePageId = pageIds.has(session.state.activePageId)
    ? session.state.activePageId
    : (document.pages[0]?.id ?? "");

  return {
    ...session,
    state: {
      ...session.state,
      base: document,
      pages,
      stories,
      activePageId,
      selection:
        activePageId === session.state.activePageId ? session.state.selection : [],
    },
  };
}

/** Drops local edits for one page, e.g. after choosing to take the server copy. */
export function discardPageEdits(
  session: EditorSession,
  pageId: string,
): EditorSession {
  const { [pageId]: _dropped, ...rest } = session.state.pages;
  return {
    ...session,
    state: { ...session.state, pages: rest },
  };
}

export function discardStoryEdits(
  session: EditorSession,
  storyId: string,
): EditorSession {
  const { [storyId]: _dropped, ...rest } = session.state.stories;
  return {
    ...session,
    state: { ...session.state, stories: rest },
  };
}

/* -------------------------------------------------------------------------- */
/* History                                                                    */
/* -------------------------------------------------------------------------- */

export function undo(session: EditorSession): EditorSession {
  const previous = session.undoStack[session.undoStack.length - 1];
  if (!previous) return session;
  return {
    // The base stays the latest server copy: history is about edits, not the
    // document that happened to be open when they were made.
    state: { ...previous, base: session.state.base },
    undoStack: session.undoStack.slice(0, -1),
    redoStack: [...session.redoStack, session.state],
  };
}

export function redo(session: EditorSession): EditorSession {
  const next = session.redoStack[session.redoStack.length - 1];
  if (!next) return session;
  return {
    state: { ...next, base: session.state.base },
    undoStack: [...session.undoStack, session.state],
    redoStack: session.redoStack.slice(0, -1),
  };
}

/* -------------------------------------------------------------------------- */
/* Page management helpers                                                    */
/* -------------------------------------------------------------------------- */

/** The index a new page should take so it lands after `pageId`. */
export function insertIndexAfter(
  document: PublicationDocument,
  pageId: string | null,
): number {
  if (!pageId) return document.pages.length;
  const index = pageIndexOf(document, pageId);
  return index < 0 ? document.pages.length : index + 1;
}

export function canDeletePage(document: PublicationDocument): boolean {
  return document.pages.length > 1;
}

/** The full id order `reorderPages` expects after moving one page. */
export function pageOrderAfterMove(
  document: PublicationDocument,
  pageId: string,
  toIndex: number,
): string[] {
  const moved = movePage(document, pageId, toIndex);
  return moved.pages.map((page) => page.id);
}

/** The page order after deleting one page, for optimistic UI bookkeeping. */
export function pageOrderAfterDelete(
  document: PublicationDocument,
  pageId: string,
): string[] {
  return removePage(document, pageId).pages.map((page) => page.id);
}

