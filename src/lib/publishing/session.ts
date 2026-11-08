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
  Guide,
  Layer,
  MasterPage,
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
import { applyPageToMaster, masterAsPage, masterById } from "./masters";

const HISTORY_LIMIT = 60;
/** Structure snapshots are whole-record sets, so they get a smaller budget. */
const STRUCTURE_LIMIT = 30;
/** The visible operation log; larger than the stacks because it is tiny. */
const LOG_LIMIT = 160;

export interface StructureSnapshot {
  pages: PublicationPage[];
  masters: MasterPage[];
  stories: Story[];
  guides: Guide[];
  spec: PublicationDocument["spec"];
  facingPages: boolean;
  grid: PublicationDocument["grid"];
}

/** One undoable structural command, with the exact structure before and after. */
export interface StructureEntry {
  id: string;
  sequence: number;
  label: string;
  before: StructureSnapshot;
  after: StructureSnapshot;
}

/** A content history step. The state is shared, not deep-copied. */
export interface ContentEntry {
  id: string;
  sequence: number;
  label: string;
  state: SessionState;
}

export interface HistoryLogEntry {
  id: string;
  label: string;
  kind: "content" | "structure";
  state: "done" | "undone";
}

export interface PageOverride {
  page: PublicationPage;
  /** True until the server has stored this exact content. */
  dirty: boolean;
}

export interface StoryOverride {
  story: Story;
  dirty: boolean;
}

export interface MasterOverride {
  master: MasterPage;
  dirty: boolean;
}

export interface SessionState {
  base: PublicationDocument;
  pages: Record<string, PageOverride>;
  stories: Record<string, StoryOverride>;
  masters: Record<string, MasterOverride>;
  activePageId: string;
  /**
   * The master being edited, if any. Page navigation keeps working while it
   * is set; the canvas and inspector follow this context instead of the page.
   */
  activeMasterId?: string;
  /** Selected object ids on the active page. */
  selection: string[];
  /** Local guide edits, saved by the editor separately from page records. */
  guides?: Guide[];
  /** The layer new objects are added to. */
  activeLayerId: string;
  /**
   * Continuous typing is one history transaction. The key names the edited
   * story/paragraph; edits arriving inside the window replace the current
   * history state instead of pushing another one.
   */
  editGroup?: { key: string; at: number };
}

export interface EditorSession {
  state: SessionState;
  undoStack: ContentEntry[];
  redoStack: ContentEntry[];
  /** Structural commands (page/spread/master set changes) and their snapshots. */
  structureUndo: StructureEntry[];
  structureRedo: StructureEntry[];
  /** Newest operation last; the history panel reads this. */
  log: HistoryLogEntry[];
  /** Monotonic ordering shared by content and structure entries. */
  sequence: number;
}

/* -------------------------------------------------------------------------- */
/* Reading                                                                    */
/* -------------------------------------------------------------------------- */

/** The document with local overrides applied. Untouched records are shared. */
export function sessionDocument(session: EditorSession): PublicationDocument {
  const { base, pages, stories } = session.state;
  const masterOverrides = Object.values(session.state.masters).filter(
    (override) => base.masters.some((master) => master.id === override.master.id),
  );
  const pageOverrides = Object.values(pages).filter(
    (override) => base.pages.some((page) => page.id === override.page.id),
  );
  const storyOverrides = Object.values(stories).filter(
    (override) => base.stories.some((story) => story.id === override.story.id),
  );
  if (
    pageOverrides.length === 0 &&
    storyOverrides.length === 0 &&
    masterOverrides.length === 0
  ) {
    return session.state.guides ? { ...base, guides: session.state.guides } : base;
  }
  return {
    ...base,
    ...(session.state.guides ? { guides: session.state.guides } : {}),
    pages: pageOverrides.length
      ? base.pages.map(
          (page) => pages[page.id]?.page ?? page,
        )
      : base.pages,
    stories: storyOverrides.length
      ? base.stories.map((story) => stories[story.id]?.story ?? story)
      : base.stories,
    masters: masterOverrides.length
      ? base.masters.map(
          (master) => session.state.masters[master.id]?.master ?? master,
        )
      : base.masters,
  };
}

/** The master being edited, from the latest local state. */
export function activeMaster(session: EditorSession): MasterPage | null {
  if (!session.state.activeMasterId) return null;
  return masterById(sessionDocument(session), session.state.activeMasterId) ?? null;
}

/**
 * The surface the canvas edits: a master (in page shape) or the active page.
 * Everything object-shaped — selection, transforms, insertion — goes through
 * this, so master editing reuses the page tools instead of a second editor.
 */
export function activeSurface(session: EditorSession): PublicationPage | null {
  const master = activeMaster(session);
  if (master) return masterAsPage(master, sessionDocument(session));
  return activePage(session);
}

export function isEditingMaster(session: EditorSession): boolean {
  return session.state.activeMasterId !== undefined;
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
  // The active layer belongs to the surface being edited. A master's layers
  // are its own, so resolving them from the page would hand a new master
  // object a layer id the master does not have — and the save would (rightly)
  // be refused.
  const surface = activeSurface(session);
  if (!surface) return null;
  const layer = surface.layers.find((entry) => entry.id === session.state.activeLayerId);
  if (layer) return layer.id;
  const content = surface.layers.find((entry) => entry.name === "Content");
  return (
    (content ?? surface.layers[surface.layers.length - 1] ?? surface.layers[0])?.id ??
    null
  );
}

export function hasUnsavedEdits(session: EditorSession): boolean {
  return (
    Object.values(session.state.pages).some((override) => override.dirty) ||
    Object.values(session.state.stories).some((override) => override.dirty) ||
    Object.values(session.state.masters).some((override) => override.dirty)
  );
}

export function dirtyMasters(session: EditorSession): MasterPage[] {
  return Object.values(session.state.masters)
    .filter((override) => override.dirty)
    .map((override) => override.master);
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
  return session.undoStack.length > 0 || session.structureUndo.length > 0;
}

export function canRedo(session: EditorSession): boolean {
  return session.redoStack.length > 0 || session.structureRedo.length > 0;
}

/**
 * Drops all history and ends the current typing transaction. The boundary is
 * used when the server refuses a save (the local timeline may no longer
 * describe the stored document) and after a named version is restored.
 */
export function clearHistory(session: EditorSession): EditorSession {
  if (
    session.undoStack.length === 0 &&
    session.redoStack.length === 0 &&
    session.structureUndo.length === 0 &&
    session.structureRedo.length === 0
  ) {
    return session;
  }
  return {
    ...session,
    undoStack: [],
    redoStack: [],
    structureUndo: [],
    structureRedo: [],
    log: session.log.map((entry) => ({ ...entry, state: "undone" as const })),
    state: { ...session.state, editGroup: undefined },
  };
}

/* -------------------------------------------------------------------------- */
/* Writing                                                                    */
/* -------------------------------------------------------------------------- */

function nextEntry<T extends { id: string; sequence: number; label: string }>(
  session: EditorSession,
  label: string,
  build: (id: string, sequence: number) => T,
): { entry: T; sequence: number } {
  const sequence = session.sequence + 1;
  return { entry: build(`h${sequence}`, sequence), sequence };
}

function appendLog(
  log: HistoryLogEntry[],
  entry: HistoryLogEntry,
): HistoryLogEntry[] {
  // A new edit makes the undone future unreal; drop those rows so the panel
  // never shows an operation that can no longer be redone.
  return [...log.filter((row) => row.state === "done"), entry].slice(-LOG_LIMIT);
}

function withState(
  session: EditorSession,
  state: SessionState,
  recordHistory: boolean,
  label = "Edit content",
): EditorSession {
  if (!recordHistory) return { ...session, state };
  const { entry, sequence } = nextEntry(session, label, (id, seq) => ({
    id,
    sequence: seq,
    label,
    state: session.state,
  }));
  return {
    state,
    sequence,
    undoStack: [...session.undoStack, entry].slice(-HISTORY_LIMIT),
    redoStack: [],
    structureUndo: session.structureUndo,
    structureRedo: session.structureRedo,
    log: appendLog(session.log, {
      id: entry.id,
      label,
      kind: "content",
      state: "done",
    }),
  };
}

/* -------------------------------------------------------------------------- */
/* Structural history                                                         */
/* -------------------------------------------------------------------------- */

/** The structural records of a document, shared by reference where possible. */
export function snapshotStructure(document: PublicationDocument): StructureSnapshot {
  return {
    pages: document.pages,
    masters: document.masters,
    stories: document.stories,
    guides: document.guides,
    spec: document.spec,
    facingPages: document.facingPages,
    grid: document.grid,
  };
}

/**
 * Records one structural command (add/delete/move page, create/delete master).
 * The snapshots hold the same record objects the session already has, so the
 * cost is the arrays, never the images.
 */
export function recordStructure(
  session: EditorSession,
  options: {
    label: string;
    before: StructureSnapshot;
    after: StructureSnapshot;
    document: PublicationDocument;
  },
): EditorSession {
  const { entry, sequence } = nextEntry(session, options.label, (id, seq) => ({
    id,
    sequence: seq,
    label: options.label,
    before: options.before,
    after: options.after,
  }));
  return {
    ...session,
    sequence,
    state: {
      ...session.state,
      // The server has accepted the new structure; the returned document is
      // the base the next edit must build on.
      base: options.document,
      pages: {},
      stories: {},
      masters: {},
      guides: undefined,
      editGroup: undefined,
      selection: session.state.selection.filter((id) =>
        options.document.pages.some((page) =>
          page.objects.some((object) => object.id === id),
        ),
      ),
    },
    structureUndo: [...session.structureUndo, entry].slice(-STRUCTURE_LIMIT),
    structureRedo: [],
    log: appendLog(session.log, {
      id: entry.id,
      label: options.label,
      kind: "structure",
      state: "done",
    }),
  };
}

function restoredPageId(
  current: string,
  document: PublicationDocument,
): string {
  return document.pages.some((page) => page.id === current)
    ? current
    : (document.pages[0]?.id ?? "");
}

export type UndoTarget =
  | { kind: "content"; entry: ContentEntry }
  | { kind: "structure"; entry: StructureEntry };

export type RedoTarget = UndoTarget;

/** The next operation undo would take, whichever timeline is newer. */
export function undoTarget(session: EditorSession): UndoTarget | null {
  const content = session.undoStack[session.undoStack.length - 1];
  const structure = session.structureUndo[session.structureUndo.length - 1];
  if (!content && !structure) return null;
  if (content && structure) {
    return structure.sequence > content.sequence
      ? { kind: "structure", entry: structure }
      : { kind: "content", entry: content };
  }
  return content
    ? { kind: "content", entry: content }
    : { kind: "structure", entry: structure! };
}

export function redoTarget(session: EditorSession): RedoTarget | null {
  const content = session.redoStack[session.redoStack.length - 1];
  const structure = session.structureRedo[session.structureRedo.length - 1];
  if (!content && !structure) return null;
  if (content && structure) {
    return structure.sequence < content.sequence
      ? { kind: "structure", entry: structure }
      : { kind: "content", entry: content };
  }
  return content
    ? { kind: "content", entry: content }
    : { kind: "structure", entry: structure! };
}

/**
 * Moves a structure entry between the undo and redo stacks after the server
 * accepted (or restored) the snapshot. The document must be the base the
 * server returned, so later content edits build on real data.
 */
export function completeStructureStep(
  session: EditorSession,
  direction: "undo" | "redo",
  document: PublicationDocument,
): EditorSession {
  if (direction === "undo") {
    const entry = session.structureUndo[session.structureUndo.length - 1];
    if (!entry) return session;
    return {
      ...session,
      state: {
        ...session.state,
        base: document,
        pages: {},
        stories: {},
        masters: {},
        guides: undefined,
        selection: [],
        activePageId: restoredPageId(session.state.activePageId, document),
        activeMasterId: document.masters.some(
          (master) => master.id === session.state.activeMasterId,
        )
          ? session.state.activeMasterId
          : undefined,
        activeLayerId: document.pages.length
          ? defaultLayerId(
              document.pages.find((page) => page.id === restoredPageId(session.state.activePageId, document)) ??
                document.pages[0]!,
            )
          : "",
        editGroup: undefined,
      },
      structureUndo: session.structureUndo.slice(0, -1),
      structureRedo: [...session.structureRedo, entry].slice(-STRUCTURE_LIMIT),
      log: session.log.map((row) =>
        row.id === entry.id ? { ...row, state: "undone" as const } : row,
      ),
    };
  }
  const entry = session.structureRedo[session.structureRedo.length - 1];
  if (!entry) return session;
  const pageId = restoredPageId(session.state.activePageId, document);
  return {
    ...session,
    state: {
      ...session.state,
      base: document,
      pages: {},
      stories: {},
      masters: {},
      guides: undefined,
      selection: [],
      activePageId: pageId,
      activeMasterId: document.masters.some(
        (master) => master.id === session.state.activeMasterId,
      )
        ? session.state.activeMasterId
        : undefined,
      activeLayerId: document.pages.length
        ? defaultLayerId(document.pages.find((page) => page.id === pageId) ?? document.pages[0]!)
        : "",
      editGroup: undefined,
    },
    structureRedo: session.structureRedo.slice(0, -1),
    structureUndo: [...session.structureUndo, entry].slice(-STRUCTURE_LIMIT),
    log: session.log.map((row) =>
      row.id === entry.id ? { ...row, state: "done" as const } : row,
    ),
  };
}

/** The panel view: newest first, with its current state. */
export function historyLog(
  session: EditorSession,
): { id: string; label: string; kind: "content" | "structure"; state: "done" | "undone" }[] {
  return [...session.log].reverse();
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
      masters: {},
      activePageId: page?.id ?? "",
      selection: [],
      activeLayerId: page ? defaultLayerId(page) : "",
    },
    undoStack: [],
    redoStack: [],
    structureUndo: [],
    structureRedo: [],
    log: [],
    sequence: 0,
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

function defaultMasterLayerId(master: MasterPage): string {
  const content = master.layers.find((layer) => layer.name === "Content");
  return (
    (content ?? master.layers[master.layers.length - 1] ?? master.layers[0])?.id ?? ""
  );
}

/**
 * Enters or leaves master editing. Local edits live in the session overrides,
 * so switching context never loses a pending page or master change; only the
 * selection and the active layer are re-scoped to the new surface.
 */
export function setActiveMaster(
  session: EditorSession,
  masterId: string | undefined,
): EditorSession {
  if (session.state.activeMasterId === masterId) return session;
  if (masterId) {
    const master = masterById(sessionDocument(session), masterId);
    if (!master) return session;
    return withState(
      session,
      {
        ...session.state,
        activeMasterId: masterId,
        selection: [],
        activeLayerId: defaultMasterLayerId(master),
        editGroup: undefined,
      },
      false,
    );
  }
  const page = activePage(session);
  return withState(
    session,
    {
      ...session.state,
      activeMasterId: undefined,
      selection: [],
      activeLayerId: page ? defaultLayerId(page) : "",
      editGroup: undefined,
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

/** Replaces the master record, recording one history entry. */
export function editMaster(
  session: EditorSession,
  masterId: string,
  updater: (master: MasterPage) => MasterPage,
  label = "Edit master",
): EditorSession {
  const master = masterById(sessionDocument(session), masterId);
  if (!master) return session;
  const next = updater(master);
  if (next === master) return session;
  return withState(
    session,
    {
      ...session.state,
      masters: {
        ...session.state.masters,
        [masterId]: { master: next, dirty: true },
      },
    },
    true,
    label,
  );
}

/**
 * Writes a page-shaped surface (the master, edited with the page tools) back
 * onto its master. The canvas only knows pages, so this is the seam that keeps
 * one set of object gestures for both contexts.
 */
export function editMasterSurface(
  session: EditorSession,
  masterId: string,
  surface: PublicationPage,
  label?: string,
): EditorSession {
  return editMaster(
    session,
    masterId,
    (master) => applyPageToMaster(master, surface),
    label,
  );
}

/**
 * Edits the active surface, whichever it is. Object gestures, insertion and
 * the layer tools all land here: a page edit and a master edit can never be
 * confused, and a master edit can never touch a page's objects.
 */
export function editSurface(
  session: EditorSession,
  updater: (surface: PublicationPage) => PublicationPage,
  label?: string,
): EditorSession {
  const masterId = session.state.activeMasterId;
  if (masterId) {
    const master = masterById(sessionDocument(session), masterId);
    if (!master) return session;
    const surface = masterAsPage(master, sessionDocument(session));
    const next = updater(surface);
    if (next === surface) return session;
    return editMasterSurface(session, masterId, next, label);
  }
  const page = activePage(session);
  if (!page) return session;
  return editPage(session, page.id, updater, label);
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
  return withState(
    session,
    { ...session.state, selection: next, editGroup: undefined },
    false,
  );
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
  const page = activeSurface(session);
  if (!page) return session;
  return setSelection(
    session,
    page.objects
      .filter((object) => !object.hidden && !object.locked)
      .map((object) => object.id),
  );
}

/**
 * Edits the record a surface id names: a master (when it is the active
 * master surface) or a page. The canvas hands back the id it drew, so this is
 * what stops a master gesture from ever landing on a page.
 */
function editTarget(
  session: EditorSession,
  targetId: string,
  updater: (page: PublicationPage) => PublicationPage,
  label?: string,
): EditorSession {
  if (session.state.activeMasterId === targetId) {
    const master = masterById(sessionDocument(session), targetId);
    if (!master) return session;
    const surface = masterAsPage(master, sessionDocument(session));
    const next = updater(surface);
    if (next === surface) return session;
    return editMasterSurface(session, targetId, next, label);
  }
  return editPage(session, targetId, updater, label);
}

/** Replaces the page record for `pageId`, recording one history entry. */
export function editPage(
  session: EditorSession,
  pageId: string,
  updater: (page: PublicationPage) => PublicationPage,
  label = "Edit page",
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
    label,
  );
}

const TYPING_GROUP_MS = 1200;

export function editStory(
  session: EditorSession,
  storyId: string,
  updater: (story: Story) => Story,
  options: { coalesceKey?: string; now?: number; label?: string } = {},
): EditorSession {
  const document = sessionDocument(session);
  const story = document.stories.find((entry) => entry.id === storyId);
  if (!story) return session;
  const next = updater(story);
  if (next === story) return session;
  const now = options.now ?? Date.now();
  const currentGroup = session.state.editGroup;
  const continuing =
    options.coalesceKey !== undefined &&
    currentGroup?.key === options.coalesceKey &&
    now - currentGroup.at <= TYPING_GROUP_MS;
  return withState(
    session,
    {
      ...session.state,
      stories: {
        ...session.state.stories,
        [storyId]: { story: next, dirty: true },
      },
      editGroup:
        options.coalesceKey === undefined
          ? undefined
          : { key: options.coalesceKey, at: now },
    },
    !continuing,
    options.label ?? "Edit text",
  );
}

/** Ends the current typing transaction, e.g. on blur or a page switch. */
export function breakEditGroup(session: EditorSession): EditorSession {
  if (!session.state.editGroup) return session;
  return { ...session, state: { ...session.state, editGroup: undefined } };
}

/**
 * Adopts every changed page/story from a derived document as one local edit.
 * Threading and cross-page moves touch two records; this keeps them in one
 * history entry and lets the autosave queue write both with their own guards.
 */
export function applyDocumentChanges(
  session: EditorSession,
  next: PublicationDocument,
  label = "Edit document",
): EditorSession {
  const current = sessionDocument(session);
  const pages = { ...session.state.pages };
  const stories = { ...session.state.stories };
  let changed = false;
  for (const page of next.pages) {
    const before = current.pages.find((entry) => entry.id === page.id);
    if (before && before !== page) {
      pages[page.id] = { page, dirty: true };
      changed = true;
    }
  }
  for (const story of next.stories) {
    const before = current.stories.find((entry) => entry.id === story.id);
    if (before && before !== story) {
      stories[story.id] = { story, dirty: true };
      changed = true;
    }
  }
  if (!changed) return session;
  return withState(
    session,
    { ...session.state, pages, stories, editGroup: undefined },
    true,
    label,
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
  return editTarget(session, pageId, (page) =>
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
  const page =
    session.state.activeMasterId === pageId
      ? activeSurface(session)
      : document.pages.find((entry) => entry.id === pageId);
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

  if (session.state.activeMasterId === pageId) {
    const master = masterById(document, pageId);
    if (!master) return session;
    return withState(
      session,
      {
        ...session.state,
        masters: {
          ...session.state.masters,
          [pageId]: {
            master: applyPageToMaster(master, { ...page, objects }),
            dirty: true,
          },
        },
        stories,
        selection: session.state.selection.filter((id) => !wanted.has(id)),
      },
      true,
      "Delete objects",
    );
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
    "Delete objects",
  );
}

export function nudgeSelection(
  session: EditorSession,
  dx: number,
  dy: number,
): EditorSession {
  const page = activeSurface(session);
  if (!page || session.state.selection.length === 0) return session;
  return editSurface(session, (current) =>
    transformPageObjects(current, session.state.selection, (object) => ({
      ...object,
      frame: {
        ...object.frame,
        x: object.frame.x + dx,
        y: object.frame.y + dy,
      },
    })),
    "Nudge objects",
  );
}

/** Replaces selected objects with patched copies (inspector, lock, hide). */
export function patchObjects(
  session: EditorSession,
  pageId: string,
  ids: readonly string[],
  patch: Partial<PublicationObject> | ((object: PublicationObject) => PublicationObject),
  label = "Change objects",
): EditorSession {
  const wanted = new Set(ids);
  return editTarget(session, pageId, (page) =>
    transformPageObjects(page, [...wanted], (object) =>
      typeof patch === "function"
        ? patch(object)
        : ({ ...object, ...patch } as PublicationObject),
    ),
    label,
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

/** Replaces the guide list as one undoable edit. */
export function editGuides(
  session: EditorSession,
  guides: Guide[],
  label = "Edit guides",
): EditorSession {
  const current = sessionDocument(session).guides;
  if (
    current.length === guides.length &&
    current.every((guide, index) => guide === guides[index])
  ) {
    return session;
  }
  return withState(session, { ...session.state, guides }, true, label);
}

/** The latest guide list, including unsaved local edits. */
export function currentGuides(session: EditorSession): Guide[] {
  return sessionDocument(session).guides;
}

/* -------------------------------------------------------------------------- */
/* Layers                                                                     */
/* -------------------------------------------------------------------------- */

function editLayers(
  session: EditorSession,
  pageId: string,
  updater: (page: PublicationPage) => PublicationPage,
  label?: string,
): EditorSession {
  return editTarget(session, pageId, updater, label);
}

export function toggleLayerVisibility(
  session: EditorSession,
  pageId: string,
  layerId: string,
): EditorSession {
  return editLayers(
    session,
    pageId,
    (page) => ({
      ...page,
      layers: page.layers.map((layer) =>
        layer.id === layerId ? { ...layer, hidden: !layer.hidden } : layer,
      ),
    }),
    "Change layer visibility",
  );
}

export function toggleLayerLock(
  session: EditorSession,
  pageId: string,
  layerId: string,
): EditorSession {
  return editLayers(
    session,
    pageId,
    (page) => ({
      ...page,
      layers: page.layers.map((layer) =>
        layer.id === layerId ? { ...layer, locked: !layer.locked } : layer,
      ),
    }),
    "Lock layer",
  );
}

/** Moves a layer up (towards the front) or down in the stack. */
export function moveLayer(
  session: EditorSession,
  pageId: string,
  layerId: string,
  direction: 1 | -1,
): EditorSession {
  return editLayers(
    session,
    pageId,
    (page) => {
      const from = page.layers.findIndex((layer) => layer.id === layerId);
      return from < 0 ? page : reorderLayer(page, layerId, from + direction);
    },
    "Reorder layers",
  );
}

export function addLayerToPage(
  session: EditorSession,
  pageId: string,
  name?: string,
): EditorSession {
  const page =
    session.state.activeMasterId === pageId
      ? activeSurface(session)
      : sessionDocument(session).pages.find((entry) => entry.id === pageId);
  if (!page) return session;
  const layer: Layer = createLayer(name ?? `Layer ${page.layers.length + 1}`, {
    ids: defaultIds,
    color: "#9a8f7c",
  });
  const next = editLayers(
    session,
    pageId,
    (current) => addLayer(current, layer),
    "Add layer",
  );
  return setActiveLayer(next, layer.id);
}

export function setObjectLayer(
  session: EditorSession,
  pageId: string,
  objectId: string,
  layerId: string,
): EditorSession {
  return editTarget(
    session,
    pageId,
    (page) => {
      if (!page.layers.some((layer) => layer.id === layerId)) return page;
      return transformPageObjects(page, [objectId], (object) =>
        object.layerId === layerId ? object : { ...object, layerId },
      );
    },
    "Move object to layer",
  );
}

/** Raises or lowers an object within its own layer. */
export function restackObject(
  session: EditorSession,
  pageId: string,
  objectId: string,
  direction: 1 | -1,
): EditorSession {
  return editTarget(
    session,
    pageId,
    (page) => (direction > 0 ? raiseObject(page, objectId) : lowerObject(page, objectId)),
    direction > 0 ? "Bring forward" : "Send backward",
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

/** The server acknowledged a master; keep showing it, stop calling it dirty. */
export function markMasterSaved(
  session: EditorSession,
  masterId: string,
  version: number,
): EditorSession {
  const override = session.state.masters[masterId];
  if (!override) return session;
  return {
    ...session,
    state: {
      ...session.state,
      masters: {
        ...session.state.masters,
        [masterId]: { master: { ...override.master, version }, dirty: false },
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
  const masterIds = new Set(document.masters.map((master) => master.id));
  const pages: Record<string, PageOverride> = {};
  for (const [id, override] of Object.entries(session.state.pages)) {
    if (override.dirty && pageIds.has(id)) pages[id] = override;
  }
  const stories: Record<string, StoryOverride> = {};
  for (const [id, override] of Object.entries(session.state.stories)) {
    if (override.dirty && storyIds.has(id)) stories[id] = override;
  }
  // A dirty master survives a server refresh exactly like a dirty page; a
  // clean one is dropped because the server now holds that content.
  const masters: Record<string, MasterOverride> = {};
  for (const [id, override] of Object.entries(session.state.masters)) {
    if (override.dirty && masterIds.has(id)) masters[id] = override;
  }

  const activePageId = pageIds.has(session.state.activePageId)
    ? session.state.activePageId
    : (document.pages[0]?.id ?? "");
  const activeMasterId =
    session.state.activeMasterId && masterIds.has(session.state.activeMasterId)
      ? session.state.activeMasterId
      : undefined;

  return {
    ...session,
    state: {
      ...session.state,
      base: document,
      pages,
      stories,
      masters,
      activePageId,
      activeMasterId,
      selection:
        activePageId === session.state.activePageId &&
        activeMasterId === session.state.activeMasterId
          ? session.state.selection
          : [],
    },
  };
}

/** Drops local edits for one page, e.g. after choosing to take the server copy. */
export function discardPageEdits(
  session: EditorSession,
  pageId: string,
): EditorSession {
  const pages = { ...session.state.pages };
  delete pages[pageId];
  return {
    ...session,
    state: { ...session.state, pages },
  };
}

export function discardStoryEdits(
  session: EditorSession,
  storyId: string,
): EditorSession {
  const stories = { ...session.state.stories };
  delete stories[storyId];
  return {
    ...session,
    state: { ...session.state, stories },
  };
}

export function discardMasterEdits(
  session: EditorSession,
  masterId: string,
): EditorSession {
  const masters = { ...session.state.masters };
  delete masters[masterId];
  return {
    ...session,
    state: { ...session.state, masters },
  };
}

/* -------------------------------------------------------------------------- */
/* History                                                                    */
/* -------------------------------------------------------------------------- */

/** Undoes one content edit. Structure steps are async and handled by the hook. */
export function undo(session: EditorSession): EditorSession {
  const target = undoTarget(session);
  if (!target || target.kind !== "content") return session;
  const entry = target.entry;
  return {
    ...session,
    // The base stays the latest server copy: history is about edits, not the
    // document that happened to be open when they were made.
    state: { ...entry.state, base: session.state.base, editGroup: undefined },
    undoStack: session.undoStack.slice(0, -1),
    redoStack: [
      ...session.redoStack,
      { ...entry, state: { ...session.state, editGroup: undefined } },
    ].slice(-HISTORY_LIMIT),
    log: session.log.map((row) =>
      row.id === entry.id ? { ...row, state: "undone" as const } : row,
    ),
  };
}

export function redo(session: EditorSession): EditorSession {
  const target = redoTarget(session);
  if (!target || target.kind !== "content") return session;
  const entry = target.entry;
  return {
    ...session,
    state: { ...entry.state, base: session.state.base, editGroup: undefined },
    undoStack: [
      ...session.undoStack,
      { ...entry, state: { ...session.state, editGroup: undefined } },
    ].slice(-HISTORY_LIMIT),
    redoStack: session.redoStack.slice(0, -1),
    log: session.log.map((row) =>
      row.id === entry.id ? { ...row, state: "done" as const } : row,
    ),
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

