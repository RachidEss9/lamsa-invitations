import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConvex, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type {
  CharacterFormat,
  CharacterStyle,
  Guide,
  ImageCrop,
  ImageFit,
  MasterPage,
  ObjectFrame,
  ParagraphFormat,
  ParagraphStyle,
  Point,
  PublicationDocument,
  PublicationObject,
  PublicationPage,
  StyleSet,
  TextFrameObject,
} from "@/lib/publishing/model";
import { safeBox } from "@/lib/publishing/geometry";
import {
  createImageFrame,
  createLine,
  createParagraph,
  createShape,
  createStory,
  createTextFrame,
} from "@/lib/publishing/factory";
import {
  activeLayerId,
  activeMaster,
  activePage,
  activeSurface,
  addLayerToPage,
  addObjectToPage,
  adoptStory,
  applyDocumentChanges,
  breakEditGroup,
  canRedo,
  canUndo,
  completeStructureStep,
  createEditorSession,
  historyLog,
  dirtyMasters,
  dirtyPages,
  dirtyStories,
  discardMasterEdits,
  discardPageEdits,
  discardStoryEdits,
  editMaster,
  editGuides,
  editMasterSurface,
  editPage,
  editStory,
  editSurface,
  markMasterSaved,
  markPageSaved,
  markStorySaved,
  moveLayer,
  nudgeSelection,
  patchObjects,
  recordStructure,
  redo,
  redoTarget,
  removeObjects,
  restackObject,
  selectAllObjects,
  sessionDocument,
  snapshotStructure,
  setActiveLayer,
  setActiveMaster,
  setActivePage,
  setObjectLayer,
  setSelection,
  syncBase,
  toggleLayerLock,
  toggleLayerVisibility,
  undo,
  undoTarget,
  type EditorSession,
  type StructureSnapshot,
} from "@/lib/publishing/session";
import { applyMasterToPages, pageIndexOf } from "@/lib/publishing/operations";
import type { AlignKind } from "@/lib/arrange";
import {
  addGuide as addGuideToList,
  clampGuidePosition,
  clearGuides as clearGuideList,
  makeGuide,
  moveGuide as moveGuideInList,
  removeGuide as removeGuideFromList,
} from "@/lib/publishing/guides";
import {
  alignObjectsInPage,
  arrangeInPage,
  distributeObjectsInPage,
  duplicateObjects,
  groupObjects,
  matchObjectSize,
  setObjectsHidden,
  setObjectsLocked,
  ungroupObjects,
  type ArrangeMode,
  type MatchSizeMode,
} from "@/lib/publishing/tools";
import {
  blankMaster,
  clearMasterOverride,
  detachMasterObject,
  duplicateMaster,
  masterForPage,
  masterUsageCount,
  setMasterOverride,
} from "@/lib/publishing/masters";
import { paragraphsFromText } from "@/lib/publishing/render";
import {
  applyCharacterFormat,
  applyCharacterStyle as applyCharacterStyleToStory,
  applyFormatToRange,
  applyParagraphFormat,
  applyParagraphStyle as applyParagraphStyleToStory,
  connectThread,
  createCharacterStyle,
  createParagraphStyle,
  disconnectThread,
  duplicateCharacterStyle,
  duplicateParagraphStyle,
  moveThreadFrame,
  removeCharacterStyle,
  removeParagraphStyle,
  renameStyle,
  reorderThread,
  resolveCharacter,
  resolveParagraph,
} from "@/lib/publishing/typography";
import {
  PublishingSaver,
  type PublishingSaveStatus,
} from "@/lib/publishing/editor-save";
import {
  clearRecoveryDraft,
  readRecoveryDraft,
  saveRecoveryDraft,
  type RecoveryDraft,
} from "@/lib/publishing/recovery";
import { isValidPublicationId } from "@/lib/publishing/routes";
import {
  createImageDerivatives,
  validateAssetFile,
} from "@/lib/publishing/image-derivatives";

/**
 * The publishing editor's state machine, above the React tree.
 *
 * It owns exactly three things: the session (local edits + history), the
 * saver (version-guarded autosave built on the shared AutosaveQueue), and the
 * server calls that change *structure* — pages, stories, the title. Selection
 * and navigation are session state and never touch the network.
 *
 * A page gesture and a text edit both end here as one `editPage`/`editStory`,
 * which is why one drag costs one undo entry and one save.
 */

export type EditorLoadState = "loading" | "ready" | "error" | "not-found";

export interface UsePublishingEditorResult {
  state: EditorLoadState;
  document: PublicationDocument | null;
  page: PublicationPage | null;
  pageIndex: number;
  pageCount: number;
  spreadLabel: string;
  dirtyPageIds: ReadonlySet<string>;
  selection: readonly string[];
  zoom: number;
  preview: boolean;
  busy: boolean;
  saveStatus: PublishingSaveStatus;
  saveMessage?: string;
  recovery: RecoveryDraft | null;
  assets: readonly StudioAssetRecord[];
  title: string;
  canUndo: boolean;
  canRedo: boolean;
  /** Recent operations, newest first; `undone` rows can be redone. */
  history: readonly {
    id: string;
    label: string;
    kind: "content" | "structure";
    state: "done" | "undone";
  }[];
  /** Every master in the publication, in creation order. */
  masters: readonly MasterPage[];
  /** The master being edited, if any. */
  master: MasterPage | null;
  /** The canvas surface: the master being edited, or the active page. */
  surface: PublicationPage | null;
  isEditingMaster: boolean;
  masterUsage: (masterId: string) => number;
  enterMaster: (masterId: string) => void;
  exitMaster: () => void;
  createMaster: (name?: string) => Promise<string | null>;
  duplicateMasterById: (masterId: string) => Promise<string | null>;
  renameMaster: (masterId: string, name: string) => void;
  updateMasterMeta: (
    masterId: string,
    patch: Partial<Pick<MasterPage, "description" | "appliesTo" | "spec" | "background">>,
  ) => void;
  deleteMasterById: (masterId: string) => Promise<void>;
  assignMaster: (pageIds: readonly string[], masterId: string | undefined) => Promise<void>;
  /** Hides, moves or restores one master object on the active page. */
  overrideMasterObject: (
    objectId: string,
    patch: { hidden?: boolean; frame?: ObjectFrame; opacity?: number },
  ) => void;
  clearMasterOverride: (objectId: string) => void;
  detachMasterObject: (objectId: string) => void;
  setTitle: (title: string) => void;
  commitTitle: () => Promise<void>;
  setZoom: (zoom: number) => void;
  setPreview: (preview: boolean) => void;
  setSelection: (ids: readonly string[]) => void;
  /** Alignment/distribution/arrangement tools, applied to the selection. */
  alignSelection: (mode: AlignKind) => void;
  distributeSelection: (axis: "h" | "v") => void;
  matchSelectionSize: (mode: MatchSizeMode) => void;
  groupSelection: () => void;
  ungroupSelection: () => void;
  duplicateSelection: () => void;
  arrangeSelection: (mode: ArrangeMode) => void;
  lockSelection: (locked: boolean) => void;
  hideSelection: (hidden: boolean) => void;
  /** Adopts a derived document (assisted layout) as one undoable edit. */
  applyLayoutDocument: (next: PublicationDocument, label: string) => void;
  guides: readonly Guide[];
  addGuide: (axis: Guide["axis"], position: number, scope?: Guide["scope"]) => void;
  moveGuide: (guideId: string, position: number) => void;
  removeGuide: (guideId: string) => void;
  clearGuides: (scope: Guide["scope"]) => void;
  activatePage: (pageId: string) => void;
  activateLayer: (layerId: string) => void;
  activateNextPage: () => void;
  activatePreviousPage: () => void;
  editPageObjects: (pageId: string, page: PublicationPage) => void;
  patchObject: (
    objectId: string,
    patch: Partial<PublicationObject> | ((object: PublicationObject) => PublicationObject),
  ) => void;
  setFrame: (
    objectId: string,
    frame: Partial<{ x: number; y: number; width: number; height: number; rotation: number }>,
  ) => void;
  patchPage: (patch: Partial<PublicationPage>) => void;
  patchStoryText: (storyId: string, text: string, coalesceKey?: string) => void;
  endTextEdit: () => void;
  applyCharacterFormat: (
    storyId: string,
    patch: CharacterFormat,
    paragraphId?: string,
  ) => void;
  applyCharacterRange: (
    storyId: string,
    start: number,
    end: number,
    patch: CharacterFormat,
  ) => void;
  applyParagraphFormat: (
    storyId: string,
    patch: ParagraphFormat,
    paragraphId?: string,
  ) => void;
  applyParagraphStyle: (storyId: string, styleId: string | undefined) => void;
  applyCharacterStyle: (storyId: string, styleId: string) => void;
  createStyle: (kind: "paragraph" | "character", storyId?: string) => void;
  updateParagraphStyle: (styleId: string, patch: Partial<ParagraphStyle>) => void;
  updateCharacterStyle: (styleId: string, patch: Partial<CharacterStyle>) => void;
  duplicateStyle: (kind: "paragraph" | "character", styleId: string) => void;
  deleteStyle: (kind: "paragraph" | "character", styleId: string) => void;
  renameStyle: (kind: "paragraph" | "character", styleId: string, name: string) => void;
  stylesStatus: "saved" | "saving" | "error";
  stylesMessage?: string;
  retryStyles: () => void;
  connectStoryFrame: (storyId: string, pageId: string, objectId: string) => void;
  disconnectStoryFrame: (storyId: string, objectId: string) => void;
  reorderStoryFrame: (storyId: string, objectId: string, direction: 1 | -1) => void;
  moveStoryFrameToPage: (storyId: string, objectId: string, pageId: string) => Promise<void>;
  deleteSelection: () => void;
  restack: (objectId: string, direction: 1 | -1) => void;
  toggleLayerVisible: (layerId: string) => void;
  toggleLayerLocked: (layerId: string) => void;
  addLayer: () => void;
  nudgeLayer: (layerId: string, direction: 1 | -1) => void;
  nudgeObjectInLayer: (layerId: string, objectId: string, direction: 1 | -1) => void;
  moveObjectToLayer: (objectId: string, layerId: string) => void;
  performUndo: () => void;
  performRedo: () => void;
  addPage: (afterPageId: string) => Promise<void>;
  duplicatePage: (pageId: string) => Promise<void>;
  deletePage: (pageId: string) => Promise<void>;
  movePageTo: (pageId: string, toIndex: number) => Promise<void>;
  insertText: () => Promise<void>;
  insertShape: (shape: "rectangle" | "ellipse") => Promise<void>;
  insertLine: () => Promise<void>;
  insertImage: (asset: StudioAssetRecord) => Promise<void>;
  replaceImage: (objectId: string, asset: StudioAssetRecord) => void;
  setImagePlacement: (
    objectId: string,
    change: { fit?: ImageFit; crop?: ImageCrop; focal?: Point },
  ) => void;
  placeAsset: (asset: StudioAssetRecord, targetObjectId?: string) => void;
  uploadAsset: (file: File) => Promise<void>;
  uploadingAsset: boolean;
  assetError?: string;
  restoreRecovery: () => void;
  discardRecovery: () => void;
  keepLocalOnConflict: () => Promise<void>;
  takeServerCopy: () => Promise<void>;
  flush: () => Promise<void>;
}

export interface StudioAssetRecord {
  _id: string;
  assetId: string;
  filename: string;
  mimeType: string;
  width: number;
  height: number;
  fileSize: number;
  tags: readonly string[];
  originalUrl: string | null;
  proxyUrl: string | null;
  thumbnailUrl: string | null;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

const IDLE_TOAST = { closeButton: true } as const;

export function usePublishingEditor(publicationId: string): UsePublishingEditorResult {
  const valid = isValidPublicationId(publicationId);
  const loaded = useQuery(
    api.publishing.publications.getMine,
    valid ? { publicationId: publicationId as Id<"publications"> } : "skip",
  );
  const convex = useConvex();

  const savePageMutation = useMutation(api.publishing.pages.savePage);
  const createPageMutation = useMutation(api.publishing.pages.createPage);
  const duplicatePageMutation = useMutation(api.publishing.pages.duplicatePage);
  const deletePageMutation = useMutation(api.publishing.pages.deletePage);
  const movePageMutation = useMutation(api.publishing.pages.movePageTo);
  const restoreStructureMutation = useMutation(
    api.publishing.pages.restoreStructure,
  );
  const createStoryMutation = useMutation(api.publishing.stories.createStory);
  const updateStoryMutation = useMutation(api.publishing.stories.updateStory);
  const updatePublicationMutation = useMutation(
    api.publishing.publications.updatePublication,
  );
  const saveStylesMutation = useMutation(api.publishing.publications.saveStyles);
  const generateAssetUploadUrl = useMutation(api.publishing.assets.generateUploadUrl);
  const registerAssetMutation = useMutation(api.publishing.assets.registerAsset);
  const setAssetDerivativesMutation = useMutation(
    api.publishing.assets.setAssetDerivatives,
  );
  const createMasterMutation = useMutation(api.publishing.masters.createMaster);
  const updateMasterMutation = useMutation(api.publishing.masters.updateMaster);
  const deleteMasterMutation = useMutation(api.publishing.masters.deleteMaster);

  const mutationsRef = useRef({
    savePage: savePageMutation,
    updateStory: updateStoryMutation,
    createMaster: createMasterMutation,
    updateMaster: updateMasterMutation,
    deleteMaster: deleteMasterMutation,
    createStory: createStoryMutation,
    createPage: createPageMutation,
    duplicatePage: duplicatePageMutation,
    deletePage: deletePageMutation,
    movePage: movePageMutation,
    restoreStructure: restoreStructureMutation,
    updatePublication: updatePublicationMutation,
    saveStyles: saveStylesMutation,
    generateAssetUploadUrl,
    registerAsset: registerAssetMutation,
    setAssetDerivatives: setAssetDerivativesMutation,
  });
  useEffect(() => {
    loadedRef.current = loaded;
  }, [loaded]);

  useEffect(() => {
    mutationsRef.current = {
      savePage: savePageMutation,
      updateStory: updateStoryMutation,
      createMaster: createMasterMutation,
      updateMaster: updateMasterMutation,
      deleteMaster: deleteMasterMutation,
      createStory: createStoryMutation,
      createPage: createPageMutation,
      duplicatePage: duplicatePageMutation,
      deletePage: deletePageMutation,
      movePage: movePageMutation,
      restoreStructure: restoreStructureMutation,
      updatePublication: updatePublicationMutation,
      saveStyles: saveStylesMutation,
      generateAssetUploadUrl,
      registerAsset: registerAssetMutation,
      setAssetDerivatives: setAssetDerivativesMutation,
    };
  }, [
    savePageMutation,
    updateStoryMutation,
    createMasterMutation,
    updateMasterMutation,
    deleteMasterMutation,
    createStoryMutation,
    createPageMutation,
    duplicatePageMutation,
    deletePageMutation,
    movePageMutation,
    restoreStructureMutation,
    updatePublicationMutation,
    saveStylesMutation,
    generateAssetUploadUrl,
    registerAssetMutation,
    setAssetDerivativesMutation,
  ]);

  const sessionRef = useRef<EditorSession | null>(null);
  const [session, setSession] = useState<EditorSession | null>(null);
  const [saveStatus, setSaveStatus] = useState<PublishingSaveStatus>("saved");
  const [saveMessage, setSaveMessage] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const [assetError, setAssetError] = useState<string | undefined>();
  const [zoom, setZoomState] = useState(0.5);
  const [preview, setPreview] = useState(false);
  const [title, setTitleState] = useState("");
  const [recovery, setRecovery] = useState<RecoveryDraft | null>(null);
  const [stylesOverride, setStylesOverride] = useState<StyleSet | null>(null);
  const [stylesStatus, setStylesStatus] = useState<"saved" | "saving" | "error">(
    "saved",
  );
  const [stylesMessage, setStylesMessage] = useState<string | undefined>();
  const stylesVersionRef = useRef(1);
  const stylesDirtyRef = useRef(false);
  const stylesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stylesRef = useRef<StyleSet | null>(null);
  const recoveryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushedEmpty = useRef(true);
  const loadedRef = useRef(loaded);
  const structureVersionRef = useRef(1);

  /* -------------------------------------------------------------- the saver */

  const saverRef = useRef<PublishingSaver | null>(null);
  const stylesInFlight = useRef(false);
  const stylesPending = useRef<StyleSet | null>(null);

  /**
   * Styles are publication-level, so they have their own version guard and
   * write. A short debounce collapses a slider drag into one style save; an
   * in-flight save is never overlapped, and the newest pending list follows.
   */
  const persistStyles = useCallback(
    async (initial: StyleSet) => {
      if (stylesInFlight.current) {
        stylesPending.current = initial;
        return;
      }
      stylesInFlight.current = true;
      let target: StyleSet | null = initial;
      while (target) {
        setStylesStatus("saving");
        setStylesMessage(undefined);
        try {
          const result = await mutationsRef.current.saveStyles({
            publicationId: publicationId as Id<"publications">,
            styles: target,
            expectedStylesVersion: stylesVersionRef.current,
          });
          stylesVersionRef.current = result.stylesVersion;
          if (stylesRef.current === target) {
            stylesDirtyRef.current = false;
            setStylesStatus("saved");
          }
        } catch (error) {
          stylesDirtyRef.current = true;
          setStylesStatus("error");
          setStylesMessage(messageOf(error) || "The style list could not be saved.");
          break;
        }
        target = stylesPending.current;
        stylesPending.current = null;
      }
      stylesInFlight.current = false;
    },
    [publicationId],
  );

  const storeStyles = useCallback(
    (next: StyleSet) => {
      setStylesOverride(next);
      stylesRef.current = next;
      stylesDirtyRef.current = true;
      setStylesStatus("saving");
      if (stylesTimer.current) clearTimeout(stylesTimer.current);
      stylesTimer.current = setTimeout(() => {
        stylesTimer.current = null;
        void persistStyles(next);
      }, 450);
    },
    [persistStyles],
  );

  useEffect(() => () => {
    if (stylesTimer.current) clearTimeout(stylesTimer.current);
  }, []);

  /* ------------------------------------------------------------ state plumbing */

  const apply = useCallback((next: EditorSession) => {
    sessionRef.current = next;
    setSession(next);
    const current = saverRef.current;
    if (!current) return;
    const pages = dirtyPages(next);
    const stories = dirtyStories(next);
    const masters = dirtyMasters(next);
    if (pages.length > 0 || stories.length > 0 || masters.length > 0) {
      current.schedule({ pages, stories, masters });
      if (recoveryTimer.current) clearTimeout(recoveryTimer.current);
      const id = publicationId;
      recoveryTimer.current = setTimeout(() => {
        saveRecoveryDraft(id, { pages, stories, masters });
      }, 600);
      flushedEmpty.current = false;
    } else if (!flushedEmpty.current) {
      clearRecoveryDraft(publicationId);
      flushedEmpty.current = true;
    }
  }, [publicationId]);

  const discard = useCallback(() => {
    const current = sessionRef.current;
    if (!current) return;
    let next = current;
    for (const id of Object.keys(current.state.pages)) next = discardPageEdits(next, id);
    for (const id of Object.keys(current.state.stories)) next = discardStoryEdits(next, id);
    for (const id of Object.keys(current.state.masters)) next = discardMasterEdits(next, id);
    apply(next);
  }, [apply]);

  // The saver is created once per publication, after `apply` exists; its write
  // closures read the latest mutation references so a redeploy never leaves a
  // stale function behind.
  useEffect(() => {
    const instance = new PublishingSaver({
      delayMs: 700,
      savePage: (page, expectedVersion) =>
        mutationsRef.current.savePage({
          publicationId: publicationId as Id<"publications">,
          pageId: page.id,
          page,
          expectedVersion,
        }),
      saveStory: (story, expectedVersion) =>
        mutationsRef.current.updateStory({
          publicationId: publicationId as Id<"publications">,
          story,
          expectedVersion,
        }),
      saveMaster: (master, expectedVersion) =>
        mutationsRef.current.updateMaster({
          publicationId: publicationId as Id<"publications">,
          master: master as never,
          expectedVersion,
        }),
      onStatus: (status, message) => {
        setSaveStatus(status);
        setSaveMessage(message);
        if (status === "error") {
          toast.error(message ?? "The publication could not be saved.", IDLE_TOAST);
        }
      },
      onPageSaved: (pageId, version) => {
        const current = sessionRef.current;
        if (!current) return;
        apply(markPageSaved(current, pageId, version));
      },
      onStorySaved: (storyId, version) => {
        const current = sessionRef.current;
        if (!current) return;
        apply(markStorySaved(current, storyId, version));
      },
      onMasterSaved: (masterId, version) => {
        const current = sessionRef.current;
        if (!current) return;
        apply(markMasterSaved(current, masterId, version));
      },
    });
    saverRef.current = instance;
    return () => {
      if (recoveryTimer.current) clearTimeout(recoveryTimer.current);
      void instance.dispose();
      if (saverRef.current === instance) saverRef.current = null;
    };
  }, [apply, publicationId]);

  /* ---------------------------------------------------------------- loading */

  useEffect(() => {
    if (!loaded) return;
    const document = loaded.document as PublicationDocument;
    const current = sessionRef.current;
    const next = current ? syncBase(current, document) : createEditorSession(document);
    sessionRef.current = next;
    setSession(next);
    setTitleState((previous) => (previous === "" ? document.title : previous));
    const saver = saverRef.current;
    for (const page of document.pages) saver?.setPageBaseline(page.id, page.version);
    for (const story of document.stories) saver?.setStoryBaseline(story.id, story.version);
    for (const master of document.masters) {
      saver?.setMasterBaseline(master.id, master.version);
    }
    const structureVersion =
      (loaded.publication as { structureVersion?: number }).structureVersion ?? 1;
    if (structureVersion > structureVersionRef.current) {
      structureVersionRef.current = structureVersion;
    }
    const stylesVersion =
      (loaded.publication as { stylesVersion?: number }).stylesVersion ?? 1;
    if (stylesVersion > stylesVersionRef.current) {
      stylesVersionRef.current = stylesVersion;
      // Another tab changed the list: show it unless this editor still has an
      // unsaved style edit of its own.
      if (!stylesDirtyRef.current && !stylesInFlight.current) {
        stylesRef.current = null;
        setStylesOverride(null);
      }
    }
    if (!current) {
      const draft = readRecoveryDraft(publicationId);
      if (
        draft &&
        (draft.pages.length > 0 ||
          draft.stories.length > 0 ||
          (draft.masters?.length ?? 0) > 0)
      ) {
        setRecovery(draft);
      }
    }
  }, [loaded, publicationId]);

  /* ------------------------------------------------------------- projections */

  const document = useMemo(() => {
    if (!session) return null;
    const base = sessionDocument(session);
    return stylesOverride ? { ...base, styles: stylesOverride } : base;
  }, [session, stylesOverride]);
  const page = session ? activePage(session) : null;
  const master = session ? activeMaster(session) : null;
  const surface = session ? activeSurface(session) : null;
  const pageIndex = session && page ? pageIndexOf(document!, page.id) : -1;
  const spread = page && document ? document.spreads.find((entry) => entry.pageIds.includes(page.id)) : undefined;
  const spreadLabel = spread
    ? `Spread ${spread.index + 1} of ${document?.spreads.length ?? 1}`
    : "";

  /* -------------------------------------------------------------- title edits */

  const setTitle = useCallback((next: string) => setTitleState(next), []);

  const commitTitle = useCallback(async () => {
    const current = sessionRef.current;
    if (!current || !loaded) return;
    const trimmed = title.trim();
    if (!trimmed || trimmed === (loaded.publication as { title: string }).title) return;
    try {
      await mutationsRef.current.updatePublication({
        publicationId: publicationId as Id<"publications">,
        settings: { title: trimmed },
        expectedUpdatedAt: (loaded.publication as { updatedAt: number }).updatedAt,
      });
      toast.success("Title saved.", IDLE_TOAST);
    } catch (error) {
      toast.error(messageOf(error) || "The title could not be saved.");
      setTitleState((loaded.publication as { title: string }).title);
    }
  }, [loaded, publicationId, title]);

  /* ------------------------------------------------------------- save answer */

  const keepLocalOnConflict = useCallback(async () => {
    const current = sessionRef.current;
    const saver = saverRef.current;
    if (!current || !saver) return;
    const batch = {
      pages: dirtyPages(current),
      stories: dirtyStories(current),
      masters: dirtyMasters(current),
    };
    setBusy(true);
    try {
      // Keep the local copy on disk before anything is written over the server.
      saveRecoveryDraft(publicationId, batch);
      // Read the versions the designer is about to replace. They become the
      // guard for the write, so a *newer* version arriving in between is still
      // refused instead of overwritten.
      const snapshot = (await convex.query(api.publishing.publications.getMine, {
        publicationId: publicationId as Id<"publications">,
      })) as { document: PublicationDocument };
      const pages = Object.fromEntries(
        snapshot.document.pages.map((entry) => [entry.id, entry.version]),
      );
      const stories = Object.fromEntries(
        snapshot.document.stories.map((entry) => [entry.id, entry.version]),
      );
      const masters = Object.fromEntries(
        snapshot.document.masters.map((entry) => [entry.id, entry.version]),
      );
      const ok = await saver.rebaseAndOverwrite(batch, { pages, stories, masters });
      if (ok) {
        toast.success("Your version replaced the server copy.", IDLE_TOAST);
      } else {
        toast.error(
          "The server copy changed again. Reload it before choosing which version to keep.",
        );
      }
    } catch (error) {
      toast.error(messageOf(error) || "The conflict could not be resolved.");
    } finally {
      setBusy(false);
    }
  }, [convex, publicationId]);

  const takeServerCopy = useCallback(async () => {
    const saver = saverRef.current;
    if (!saver) return;
    setBusy(true);
    try {
      const snapshot = (await convex.query(api.publishing.publications.getMine, {
        publicationId: publicationId as Id<"publications">,
      })) as { document: PublicationDocument };
      discard();
      const current = sessionRef.current;
      if (current) {
        const next = syncBase(current, snapshot.document);
        sessionRef.current = next;
        setSession(next);
        for (const pageRecord of snapshot.document.pages) {
          saver.setPageBaseline(pageRecord.id, pageRecord.version);
        }
        for (const storyRecord of snapshot.document.stories) {
          saver.setStoryBaseline(storyRecord.id, storyRecord.version);
        }
        for (const masterRecord of snapshot.document.masters) {
          saver.setMasterBaseline(masterRecord.id, masterRecord.version);
        }
      }
      saver.clearConflict();
      clearRecoveryDraft(publicationId);
      toast.success("The server copy is open; your local draft was discarded.", IDLE_TOAST);
    } catch (error) {
      toast.error(messageOf(error) || "The server copy could not be loaded.");
    } finally {
      setBusy(false);
    }
  }, [convex, discard, publicationId]);

  /* ------------------------------------------------------------- edit actions */

  const editPageObjects = useCallback(
    (pageId: string, nextPage: PublicationPage) => {
      const current = sessionRef.current;
      if (!current) return;
      // The canvas drew one surface. When that surface is the master being
      // edited, its gesture belongs to the master — never to a page that
      // happens to be active behind it.
      apply(
        current.state.activeMasterId === pageId
          ? editMasterSurface(current, pageId, nextPage, "Transform object")
          : editPage(current, pageId, () => nextPage, "Transform object"),
      );
    },
    [apply],
  );

  const patchObject = useCallback<UsePublishingEditorResult["patchObject"]>(
    (objectId, patch) => {
      const current = sessionRef.current;
      const pageNow = current ? activeSurface(current) : null;
      if (!current || !pageNow) return;
      const ids = current.state.selection.includes(objectId)
        ? current.state.selection
        : [objectId];
      apply(patchObjects(current, pageNow.id, ids, patch));
    },
    [apply],
  );

  const setFrame = useCallback<UsePublishingEditorResult["setFrame"]>(
    (objectId, frame) => {
      const current = sessionRef.current;
      const pageNow = current ? activeSurface(current) : null;
      if (!current || !pageNow) return;
      apply(
        patchObjects(
          current,
          pageNow.id,
          [objectId],
          (object) =>
            ({ ...object, frame: { ...object.frame, ...frame } }) as PublicationObject,
          "Set object geometry",
        ),
      );
    },
    [apply],
  );

  const patchPage = useCallback<UsePublishingEditorResult["patchPage"]>(
    (patch) => {
      const current = sessionRef.current;
      const pageNow = current ? activePage(current) : null;
      if (!current || !pageNow) return;
      apply(
        editPage(
          current,
          pageNow.id,
          (pageUpdate) => ({ ...pageUpdate, ...patch }),
          "Change page",
        ),
      );
    },
    [apply],
  );

  const patchStoryText = useCallback<UsePublishingEditorResult["patchStoryText"]>(
    (storyId, text, coalesceKey) => {
      const current = sessionRef.current;
      if (!current) return;
      apply(
        editStory(
          current,
          storyId,
          (story) => ({
            ...story,
            paragraphs: paragraphsFromText(text, story.paragraphs),
          }),
          coalesceKey ? { coalesceKey, label: "Type" } : { label: "Edit text" },
        ),
      );
    },
    [apply],
  );

  const endTextEdit = useCallback(() => {
    const current = sessionRef.current;
    if (!current) return;
    apply(breakEditGroup(current));
  }, [apply]);

  const applyCharacter = useCallback<UsePublishingEditorResult["applyCharacterFormat"]>(
    (storyId, patch, paragraphId) => {
      const current = sessionRef.current;
      if (!current) return;
      apply(
        editStory(current, storyId, (story) =>
          applyCharacterFormat(story, patch, paragraphId),
        ),
      );
    },
    [apply],
  );

  const applyCharacterRangeAction = useCallback<
    UsePublishingEditorResult["applyCharacterRange"]
  >(
    (storyId, start, end, patch) => {
      const current = sessionRef.current;
      if (!current) return;
      apply(
        editStory(current, storyId, (story) =>
          applyFormatToRange(story, start, end, patch),
        ),
      );
    },
    [apply],
  );

  const applyParagraph = useCallback<UsePublishingEditorResult["applyParagraphFormat"]>(
    (storyId, patch, paragraphId) => {
      const current = sessionRef.current;
      if (!current) return;
      apply(
        editStory(current, storyId, (story) =>
          applyParagraphFormat(story, patch, paragraphId),
        ),
      );
    },
    [apply],
  );

  const applyParagraphNamed = useCallback<
    UsePublishingEditorResult["applyParagraphStyle"]
  >(
    (storyId, styleId) => {
      const current = sessionRef.current;
      if (!current) return;
      apply(
        editStory(current, storyId, (story) =>
          applyParagraphStyleToStory(story, styleId),
        ),
      );
    },
    [apply],
  );

  const applyCharacterNamed = useCallback<
    UsePublishingEditorResult["applyCharacterStyle"]
  >(
    (storyId, styleId) => {
      const current = sessionRef.current;
      if (!current) return;
      apply(
        editStory(current, storyId, (story) =>
          applyCharacterStyleToStory(story, styleId),
        ),
      );
    },
    [apply],
  );

  const createStyle = useCallback<UsePublishingEditorResult["createStyle"]>(
    (kind, storyId) => {
      const current = sessionRef.current;
      if (!current || !document) return;
      const story = storyId
        ? document.stories.find((entry) => entry.id === storyId)
        : undefined;
      if (kind === "paragraph") {
        const paragraph = story?.paragraphs[0];
        const format = paragraph
          ? resolveParagraph(document, paragraph)
          : document.styles.paragraph[0];
        if (!format) return;
        const style = createParagraphStyle(
          { ...format, name: "Paragraph style" },
          document.styles.paragraph,
        );
        storeStyles({
          ...document.styles,
          paragraph: [...document.styles.paragraph, style],
        });
        if (story) {
          apply(
            editStory(current, story.id, (entry) => ({
              ...entry,
              paragraphs: entry.paragraphs.map((item) => ({
                ...item,
                styleId: style.id,
                format: undefined,
              })),
            })),
          );
        }
        return;
      }
      const run = story?.paragraphs[0]?.runs[0];
      const paragraph = story?.paragraphs[0];
      const format =
        run && paragraph ? resolveCharacter(document, paragraph, run) : {};
      const style = createCharacterStyle(
        { ...format, name: "Character style" },
        document.styles.character,
      );
      storeStyles({
        ...document.styles,
        character: [...document.styles.character, style],
      });
      if (story) {
        apply(
          editStory(current, story.id, (entry) =>
            applyCharacterStyleToStory(entry, style.id),
          ),
        );
      }
    },
    [apply, document, storeStyles],
  );

  const updateParagraphStyleAction = useCallback<
    UsePublishingEditorResult["updateParagraphStyle"]
  >(
    (styleId, patch) => {
      if (!document) return;
      storeStyles({
        ...document.styles,
        paragraph: document.styles.paragraph.map((style) =>
          style.id === styleId ? { ...style, ...patch } : style,
        ),
      });
    },
    [document, storeStyles],
  );

  const updateCharacterStyleAction = useCallback<
    UsePublishingEditorResult["updateCharacterStyle"]
  >(
    (styleId, patch) => {
      if (!document) return;
      storeStyles({
        ...document.styles,
        character: document.styles.character.map((style) =>
          style.id === styleId ? { ...style, ...patch } : style,
        ),
      });
    },
    [document, storeStyles],
  );

  const duplicateStyleAction = useCallback<
    UsePublishingEditorResult["duplicateStyle"]
  >(
    (kind, styleId) => {
      if (!document) return;
      if (kind === "paragraph") {
        const source = document.styles.paragraph.find(
          (style) => style.id === styleId,
        );
        if (!source) return;
        storeStyles({
          ...document.styles,
          paragraph: [
            ...document.styles.paragraph,
            duplicateParagraphStyle(source, document.styles.paragraph),
          ],
        });
        return;
      }
      const source = document.styles.character.find((style) => style.id === styleId);
      if (!source) return;
      storeStyles({
        ...document.styles,
        character: [
          ...document.styles.character,
          duplicateCharacterStyle(source, document.styles.character),
        ],
      });
    },
    [document, storeStyles],
  );

  const deleteStyleAction = useCallback<UsePublishingEditorResult["deleteStyle"]>(
    (kind, styleId) => {
      const current = sessionRef.current;
      if (!current || !document) return;
      if (kind === "paragraph") {
        if (document.styles.paragraph.length <= 1) {
          toast.error("Keep at least one paragraph style.");
          return;
        }
        const result = removeParagraphStyle(
          document.styles.paragraph,
          styleId,
          document.stories,
        );
        storeStyles({ ...document.styles, paragraph: result.styles });
        let next = current;
        for (const story of result.stories) {
          if (story === document.stories.find((entry) => entry.id === story.id)) {
            continue;
          }
          next = editStory(next, story.id, () => story);
        }
        apply(next);
        return;
      }
      const result = removeCharacterStyle(
        document.styles.character,
        styleId,
        document.stories,
      );
      storeStyles({ ...document.styles, character: result.styles });
      let next = current;
      for (const story of result.stories) {
        if (story === document.stories.find((entry) => entry.id === story.id)) {
          continue;
        }
        next = editStory(next, story.id, () => story);
      }
      apply(next);
    },
    [apply, document, storeStyles],
  );

  const renameStyleAction = useCallback<
    UsePublishingEditorResult["renameStyle"]
  >(
    (kind, styleId, name) => {
      if (!document) return;
      if (kind === "paragraph") {
        storeStyles({
          ...document.styles,
          paragraph: document.styles.paragraph.map((style) =>
            style.id === styleId ? renameStyle(style, name) : style,
          ),
        });
        return;
      }
      storeStyles({
        ...document.styles,
        character: document.styles.character.map((style) =>
          style.id === styleId ? renameStyle(style, name) : style,
        ),
      });
    },
    [document, storeStyles],
  );

  const connectStoryFrame = useCallback<
    UsePublishingEditorResult["connectStoryFrame"]
  >(
    (storyId, pageId, objectId) => {
      const current = sessionRef.current;
      if (!current) return;
      try {
        const result = connectThread(
          sessionDocument(current),
          storyId,
          pageId,
          objectId,
        );
        apply(applyDocumentChanges(current, result.document));
        toast.success("Frame threaded. Text now flows into it.", IDLE_TOAST);
      } catch (error) {
        toast.error(messageOf(error) || "The frame could not be threaded.");
      }
    },
    [apply],
  );

  const disconnectStoryFrame = useCallback<
    UsePublishingEditorResult["disconnectStoryFrame"]
  >(
    (storyId, objectId) => {
      const current = sessionRef.current;
      if (!current) return;
      try {
        const result = disconnectThread(sessionDocument(current), storyId, objectId);
        apply(applyDocumentChanges(current, result.document));
        toast.success("Frame removed from the thread. The text is intact.", IDLE_TOAST);
      } catch (error) {
        toast.error(messageOf(error) || "The frame could not be removed.");
      }
    },
    [apply],
  );

  const reorderStoryFrame = useCallback<
    UsePublishingEditorResult["reorderStoryFrame"]
  >(
    (storyId, objectId, direction) => {
      const current = sessionRef.current;
      if (!current) return;
      apply(
        editStory(current, storyId, (story) =>
          reorderThread(story, objectId, direction),
        ),
      );
    },
    [apply],
  );

  const moveStoryFrameToPage = useCallback<
    UsePublishingEditorResult["moveStoryFrameToPage"]
  >(
    async (storyId, objectId, pageId) => {
      const current = sessionRef.current;
      if (!current) return;
      try {
        const next = moveThreadFrame(
          sessionDocument(current),
          storyId,
          objectId,
          pageId,
        );
        apply(applyDocumentChanges(current, next));
        toast.success("Frame moved. Its story order is unchanged.", IDLE_TOAST);
      } catch (error) {
        toast.error(messageOf(error) || "The frame could not be moved.");
      }
    },
    [apply],
  );

  const deleteSelection = useCallback(() => {
    const current = sessionRef.current;
    const pageNow = current ? activeSurface(current) : null;
    if (!current || !pageNow) return;
    const ids = current.state.selection;
    if (ids.length === 0) return;
    apply(removeObjects(current, pageNow.id, ids));
    toast.success(ids.length === 1 ? "Object deleted." : `${ids.length} objects deleted.`, IDLE_TOAST);
  }, [apply]);

  const restack = useCallback(
    (objectId: string, direction: 1 | -1) => {
      const current = sessionRef.current;
      const pageNow = current ? activeSurface(current) : null;
      if (!current || !pageNow) return;
      apply(restackObject(current, pageNow.id, objectId, direction));
    },
    [apply],
  );

  const toggleLayerVisible = useCallback(
    (layerId: string) => {
      const current = sessionRef.current;
      const pageNow = current ? activeSurface(current) : null;
      if (!current || !pageNow) return;
      apply(toggleLayerVisibility(current, pageNow.id, layerId));
    },
    [apply],
  );

  const toggleLayerLocked = useCallback(
    (layerId: string) => {
      const current = sessionRef.current;
      const pageNow = current ? activeSurface(current) : null;
      if (!current || !pageNow) return;
      apply(toggleLayerLock(current, pageNow.id, layerId));
    },
    [apply],
  );

  const addLayer = useCallback(() => {
    const current = sessionRef.current;
    const pageNow = current ? activeSurface(current) : null;
    if (!current || !pageNow) return;
    apply(addLayerToPage(current, pageNow.id));
  }, [apply]);

  const nudgeLayer = useCallback(
    (layerId: string, direction: 1 | -1) => {
      const current = sessionRef.current;
      const pageNow = current ? activeSurface(current) : null;
      if (!current || !pageNow) return;
      apply(moveLayer(current, pageNow.id, layerId, direction));
    },
    [apply],
  );

  const nudgeObjectInLayer = useCallback(
    (layerId: string, objectId: string, direction: 1 | -1) => {
      const current = sessionRef.current;
      const pageNow = current ? activeSurface(current) : null;
      if (!current || !pageNow) return;
      const inLayer = pageNow.objects.filter((object) => object.layerId === layerId);
      const index = inLayer.findIndex((object) => object.id === objectId);
      const target = inLayer[index + direction];
      if (!target) return;
      // Raise above the next object, or lower below the previous one, by
      // restacking until the neighbour order swaps.
      apply(restackObject(current, pageNow.id, objectId, direction));
    },
    [apply],
  );

  const moveObjectToLayer = useCallback(
    (objectId: string, layerId: string) => {
      const current = sessionRef.current;
      const pageNow = current ? activeSurface(current) : null;
      if (!current || !pageNow) return;
      apply(setObjectLayer(current, pageNow.id, objectId, layerId));
    },
    [apply],
  );

  /* ---------------------------------------------------------------- masters */

  const masterIdPending = useRef<string | null>(null);

  /** Enters master editing once the created master has arrived from the server. */
  useEffect(() => {
    const pending = masterIdPending.current;
    if (!pending || !session || !document) return;
    if (!document.masters.some((entry) => entry.id === pending)) return;
    masterIdPending.current = null;
    apply(setActiveMaster(session, pending));
  }, [apply, document, session]);

  /**
   * Runs one structural server command and records it as a single undoable
   * step. Pending content is flushed first, so the snapshot the history keeps
   * is the state the server actually had — never a half-saved page.
   */
  const runStructural = useCallback(
    async (
      label: string,
      work: () => Promise<{
        document: PublicationDocument;
        pageId?: string;
        structureVersion: number;
      }>,
    ) => {
      const current = sessionRef.current;
      if (!current) return;
      setBusy(true);
      try {
        const saver = saverRef.current;
        if (saver) {
          const flushed = await saver.flush({
            pages: dirtyPages(current),
            stories: dirtyStories(current),
            masters: dirtyMasters(current),
          });
          if (!flushed) {
            throw new Error("Resolve the save conflict before changing page structure.");
          }
        }
        const before = sessionDocument(sessionRef.current ?? current);
        const result = await work();
        structureVersionRef.current = result.structureVersion;
        const latest = sessionRef.current ?? current;
        let next = recordStructure(latest, {
          label,
          before: snapshotStructure(before),
          after: snapshotStructure(result.document),
          document: result.document,
        });
        if (result.pageId) {
          next = setActivePage(next, result.pageId);
        } else if (
          !result.document.pages.some((page) => page.id === next.state.activePageId)
        ) {
          const fallback = result.document.pages[0]?.id;
          if (fallback) next = setActivePage(next, fallback);
        }
        apply(next);
        setPreview(false);
      } catch (error) {
        toast.error(messageOf(error) || "The change could not be saved.");
      } finally {
        setBusy(false);
      }
    },
    [apply],
  );

  const enterMaster = useCallback(
    (masterId: string) => {
      const current = sessionRef.current;
      if (!current) return;
      apply(setActiveMaster(current, masterId));
      setPreview(false);
    },
    [apply],
  );

  const exitMaster = useCallback(() => {
    const current = sessionRef.current;
    if (!current) return;
    apply(setActiveMaster(current, undefined));
  }, [apply]);

  const createMaster = useCallback<UsePublishingEditorResult["createMaster"]>(
    async (name?: string) => {
      const current = sessionRef.current;
      const documentNow = current ? sessionDocument(current) : null;
      if (!documentNow) return null;
      const taken = new Set(documentNow.masters.map((entry) => entry.name.trim()));
      let label = name?.trim() || "Master";
      if (!name) {
        let index = documentNow.masters.length + 1;
        while (taken.has(`Master ${index}`)) index += 1;
        label = `Master ${index}`;
      }
      const master = blankMaster(label, documentNow);
      // A new master is a new record: it goes through the same ownership-checked
      // mutation as any other write, then the editor opens it for editing. The
      // command is one structural history step, so undo removes it again.
      let created: string | null = null;
      await runStructural("Create master", async () => {
        const result = await mutationsRef.current.createMaster({
          publicationId: publicationId as Id<"publications">,
          master: master as never,
        });
        created = result.masterId;
        saverRef.current?.setMasterBaseline(result.masterId, result.version);
        return {
          document: result.document as unknown as PublicationDocument,
          structureVersion: structureVersionRef.current,
        };
      });
      if (created) {
        masterIdPending.current = created;
        toast.success("Master created.", IDLE_TOAST);
      }
      return created;
    },
    [publicationId, runStructural],
  );

  const duplicateMasterById = useCallback<
    UsePublishingEditorResult["duplicateMasterById"]
  >(
    async (masterId: string) => {
      const current = sessionRef.current;
      const documentNow = current ? sessionDocument(current) : null;
      const source = documentNow?.masters.find((entry) => entry.id === masterId);
      if (!documentNow || !source) return null;
      const copy = duplicateMaster(source);
      let created: string | null = null;
      await runStructural("Duplicate master", async () => {
        const result = await mutationsRef.current.createMaster({
          publicationId: publicationId as Id<"publications">,
          // A duplicated master is independent: text that still pointed at the
          // original's stories is dropped rather than silently shared, so
          // editing the copy can never rewrite the original's text.
          master: {
            ...copy,
            objects: copy.objects.map((object) => {
              if (object.kind !== "text-frame" || !object.storyId) return object;
              const next = { ...object };
              delete next.storyId;
              return next;
            }),
          } as never,
        });
        created = result.masterId;
        saverRef.current?.setMasterBaseline(result.masterId, result.version);
        return {
          document: result.document as unknown as PublicationDocument,
          structureVersion: structureVersionRef.current,
        };
      });
      if (created) toast.success("Master duplicated.", IDLE_TOAST);
      return created;
    },
    [publicationId, runStructural],
  );

  const renameMaster = useCallback(
    (masterId: string, name: string) => {
      const current = sessionRef.current;
      if (!current) return;
      const trimmed = name.slice(0, 120);
      apply(
        editMaster(current, masterId, (entry) =>
          entry.name === trimmed ? entry : { ...entry, name: trimmed },
        ),
      );
    },
    [apply],
  );

  const updateMasterMeta = useCallback<
    UsePublishingEditorResult["updateMasterMeta"]
  >(
    (masterId, patch) => {
      const current = sessionRef.current;
      if (!current) return;
      apply(
        editMaster(current, masterId, (entry) => {
          const next = {
            ...entry,
            ...(patch.description !== undefined
              ? { description: patch.description }
              : {}),
            ...(patch.appliesTo !== undefined ? { appliesTo: patch.appliesTo } : {}),
            ...(patch.spec !== undefined ? { spec: patch.spec } : {}),
            ...(patch.background !== undefined ? { background: patch.background } : {}),
          };
          return { ...next };
        }),
      );
    },
    [apply],
  );

  const deleteMasterById = useCallback<
    UsePublishingEditorResult["deleteMasterById"]
  >(
    async (masterId: string) => {
      if (!sessionRef.current) return;
      // Pending page writes go first (inside runStructural): they may carry an
      // assignment to this master, and the delete has to be the last word.
      await runStructural("Delete master", async () => {
        const result = await mutationsRef.current.deleteMaster({
          publicationId: publicationId as Id<"publications">,
          masterId,
        });
        return {
          document: result.document as unknown as PublicationDocument,
          structureVersion: structureVersionRef.current,
        };
      });
      const latest = sessionRef.current;
      if (latest?.state.activeMasterId === masterId) {
        apply(setActiveMaster(latest, undefined));
      }
      toast.success("Master deleted. Pages that used it keep their own content.", IDLE_TOAST);
    },
    [apply, publicationId, runStructural],
  );

  const assignMaster = useCallback<
    UsePublishingEditorResult["assignMaster"]
  >(
    async (pageIds: readonly string[], masterId: string | undefined) => {
      const current = sessionRef.current;
      if (!current || pageIds.length === 0) return;
      const before = sessionDocument(current);
      const next = applyMasterToPages(before, pageIds, masterId);
      if (next === before) return;
      // Assignment is content, not structure: each changed page is autosaved
      // with its own version guard and its own undo entry (one edit here).
      apply(applyDocumentChanges(current, next));
    },
    [apply],
  );

  const applyLayoutDocument = useCallback<
    UsePublishingEditorResult["applyLayoutDocument"]
  >(
    (next, label) => {
      const current = sessionRef.current;
      if (!current) return;
      apply(applyDocumentChanges(current, next, label));
    },
    [apply],
  );

  const overrideMasterObject = useCallback<
    UsePublishingEditorResult["overrideMasterObject"]
  >(
    (objectId, patch) => {
      const current = sessionRef.current;
      const page = current ? activePage(current) : null;
      if (!current || !page) return;
      apply(
        editPage(current, page.id, (target) =>
          setMasterOverride(target, objectId, patch),
        ),
      );
    },
    [apply],
  );

  const clearMasterOverrideAction = useCallback(
    (objectId: string) => {
      const current = sessionRef.current;
      const page = current ? activePage(current) : null;
      if (!current || !page) return;
      apply(
        editPage(current, page.id, (target) => clearMasterOverride(target, objectId)),
      );
    },
    [apply],
  );

  const detachMasterObjectAction = useCallback(
    (objectId: string) => {
      const current = sessionRef.current;
      const page = current ? activePage(current) : null;
      const masterNow =
        current && page ? masterForPage(sessionDocument(current), page) : undefined;
      if (!current || !page || !masterNow) return;
      const detached = detachMasterObject(page, masterNow, objectId);
      if (!detached) return;
      apply(
        editPage(current, page.id, () => detached.page),
      );
      apply(setSelection(sessionRef.current ?? current, [detached.objectId]));
      toast.success("Master object detached onto this page.", IDLE_TOAST);
    },
    [apply],
  );

  /**
   * Replays a structural snapshot through the server. The guard is the
   * structure counter, so a page set that changed in another tab is refused
   * instead of being replaced by an out-of-date history entry.
   */
  const restoreStructural = useCallback(
    async (target: StructureSnapshot, direction: "undo" | "redo") => {
      setBusy(true);
      try {
        const flushed = await saverRef.current?.flush();
        if (flushed === false) {
          throw new Error("Resolve the save conflict before reversing a page change.");
        }
        const result = await mutationsRef.current.restoreStructure({
          publicationId: publicationId as Id<"publications">,
          expectedStructureVersion: structureVersionRef.current,
          ...target,
        });
        structureVersionRef.current = result.structureVersion;
        const latest = sessionRef.current;
        if (!latest) return;
        apply(
          completeStructureStep(
            latest,
            direction,
            result.document as unknown as PublicationDocument,
          ),
        );
        setPreview(false);
      } catch (error) {
        toast.error(messageOf(error) || "That change could not be reversed.");
      } finally {
        setBusy(false);
      }
    },
    [apply, publicationId],
  );

  const guidesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const guidesPending = useRef<Guide[] | null>(null);

  /** Guides are publication-level data, saved on their own small debounce. */
  const persistGuides = useCallback(
    (guides: Guide[]) => {
      guidesPending.current = guides;
      if (guidesTimer.current) clearTimeout(guidesTimer.current);
      guidesTimer.current = setTimeout(() => {
        guidesTimer.current = null;
        const pending = guidesPending.current;
        guidesPending.current = null;
        if (!pending) return;
        void mutationsRef.current
          .updatePublication({
            publicationId: publicationId as Id<"publications">,
            settings: { guides: pending },
          })
          .catch((error: unknown) => {
            toast.error(messageOf(error) || "The guides could not be saved.");
          });
      }, 400);
    },
    [publicationId],
  );

  useEffect(
    () => () => {
      if (guidesTimer.current) clearTimeout(guidesTimer.current);
    },
    [],
  );

  const applyGuides = useCallback(
    (guides: Guide[], label: string) => {
      const current = sessionRef.current;
      if (!current) return;
      apply(editGuides(current, guides, label));
      persistGuides(guides);
    },
    [apply, persistGuides],
  );

  const addGuide = useCallback(
    (axis: Guide["axis"], position: number, scope: Guide["scope"] = "page") => {
      const current = sessionRef.current;
      const surface = current ? activeSurface(current) : null;
      if (!current || !surface) return;
      const guide = makeGuide(
        axis,
        clampGuidePosition(position, axis, surface.spec),
        scope === "page" ? "page" : "document",
        scope === "page" ? surface.id : undefined,
      );
      applyGuides(
        addGuideToList(sessionDocument(current).guides, guide),
        "Add guide",
      );
    },
    [applyGuides],
  );

  const moveGuide = useCallback(
    (guideId: string, position: number) => {
      const current = sessionRef.current;
      const surface = current ? activeSurface(current) : null;
      if (!current || !surface) return;
      applyGuides(
        moveGuideInList(sessionDocument(current).guides, guideId, position, surface.spec),
        "Move guide",
      );
    },
    [applyGuides],
  );

  const removeGuide = useCallback(
    (guideId: string) => {
      const current = sessionRef.current;
      if (!current) return;
      applyGuides(
        removeGuideFromList(sessionDocument(current).guides, guideId),
        "Delete guide",
      );
    },
    [applyGuides],
  );

  const clearGuides = useCallback(
    (scope: Guide["scope"]) => {
      const current = sessionRef.current;
      const pageNow = current ? activePage(current) : null;
      if (!current) return;
      applyGuides(
        clearGuideList(
          sessionDocument(current).guides,
          scope,
          scope === "page" ? pageNow?.id : undefined,
        ),
        "Clear guides",
      );
    },
    [applyGuides],
  );

  /* -------------------------------------------------------------- selection tools */

  const selectionSurface = () => {
    const current = sessionRef.current;
    const surface = current ? activeSurface(current) : null;
    return current && surface ? { current, surface } : null;
  };

  const alignSelection = useCallback(
    (mode: AlignKind) => {
      const found = selectionSurface();
      if (!found) return;
      apply(
        editSurface(
          found.current,
          (surface) => alignObjectsInPage(surface, found.current.state.selection, mode),
          "Align objects",
        ),
      );
    },
    [apply],
  );

  const distributeSelection = useCallback(
    (axis: "h" | "v") => {
      const found = selectionSurface();
      if (!found) return;
      apply(
        editSurface(
          found.current,
          (surface) =>
            distributeObjectsInPage(surface, found.current.state.selection, axis),
          "Distribute objects",
        ),
      );
    },
    [apply],
  );

  const matchSelectionSize = useCallback(
    (mode: MatchSizeMode) => {
      const found = selectionSurface();
      if (!found) return;
      apply(
        editSurface(
          found.current,
          (surface) => matchObjectSize(surface, found.current.state.selection, mode),
          "Match size",
        ),
      );
    },
    [apply],
  );

  const groupSelection = useCallback(() => {
    const found = selectionSurface();
    if (!found) return;
    const groupId = `group_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    apply(
      editSurface(
        found.current,
        (surface) => groupObjects(surface, found.current.state.selection, groupId),
        "Group objects",
      ),
    );
  }, [apply]);

  const ungroupSelection = useCallback(() => {
    const found = selectionSurface();
    if (!found) return;
    apply(
      editSurface(
        found.current,
        (surface) => ungroupObjects(surface, found.current.state.selection),
        "Ungroup objects",
      ),
    );
  }, [apply]);

  const duplicateSelection = useCallback(() => {
    const found = selectionSurface();
    if (!found) return;
    let created: string[] = [];
    const next = editSurface(
      found.current,
      (surface) => {
        const result = duplicateObjects(surface, found.current.state.selection);
        created = result.objectIds;
        return result.page;
      },
      "Duplicate objects",
    );
    apply(next);
    const latest = sessionRef.current;
    if (latest && created.length > 0) apply(setSelection(latest, created));
  }, [apply]);

  const arrangeSelection = useCallback(
    (mode: ArrangeMode) => {
      const found = selectionSurface();
      if (!found) return;
      apply(
        editSurface(
          found.current,
          (surface) => arrangeInPage(surface, found.current.state.selection, mode),
          mode === "front"
            ? "Bring to front"
            : mode === "back"
              ? "Send to back"
              : mode === "forward"
                ? "Bring forward"
                : "Send backward",
        ),
      );
    },
    [apply],
  );

  const lockSelection = useCallback(
    (locked: boolean) => {
      const found = selectionSurface();
      if (!found) return;
      apply(
        editSurface(
          found.current,
          (surface) => setObjectsLocked(surface, found.current.state.selection, locked),
          locked ? "Lock objects" : "Unlock objects",
        ),
      );
    },
    [apply],
  );

  const hideSelection = useCallback(
    (hidden: boolean) => {
      const found = selectionSurface();
      if (!found) return;
      apply(
        editSurface(
          found.current,
          (surface) => setObjectsHidden(surface, found.current.state.selection, hidden),
          hidden ? "Hide objects" : "Show objects",
        ),
      );
      const latest = sessionRef.current;
      if (latest && hidden) apply(setSelection(latest, []));
    },
    [apply],
  );

  const performUndo = useCallback(async () => {
    const current = sessionRef.current;
    const target = current ? undoTarget(current) : null;
    if (!current || !target) return;
    if (target.kind === "content") {
      apply(undo(current));
      return;
    }
    await restoreStructural(target.entry.before, "undo");
  }, [apply, restoreStructural]);

  const performRedo = useCallback(async () => {
    const current = sessionRef.current;
    const target = current ? redoTarget(current) : null;
    if (!current || !target) return;
    if (target.kind === "content") {
      apply(redo(current));
      return;
    }
    await restoreStructural(target.entry.after, "redo");
  }, [apply, restoreStructural]);

  /* ------------------------------------------------------- navigation/selection */

  const activatePage = useCallback(
    (pageId: string) => {
      const current = sessionRef.current;
      if (!current) return;
      apply(setActivePage(current, pageId));
      setPreview(false);
    },
    [apply],
  );

  const activateLayer = useCallback(
    (layerId: string) => {
      const current = sessionRef.current;
      if (!current) return;
      apply(setActiveLayer(current, layerId));
    },
    [apply],
  );

  const activateNextPage = useCallback(() => {
    const current = sessionRef.current;
    if (!current || !document) return;
    const index = pageIndexOf(document, current.state.activePageId);
    const next = document.pages[index + 1];
    if (next) apply(setActivePage(current, next.id));
  }, [apply, document]);

  const activatePreviousPage = useCallback(() => {
    const current = sessionRef.current;
    if (!current || !document) return;
    const index = pageIndexOf(document, current.state.activePageId);
    const previous = document.pages[index - 1];
    if (previous) apply(setActivePage(current, previous.id));
  }, [apply, document]);

  const setEditorSelection = useCallback(
    (ids: readonly string[]) => {
      const current = sessionRef.current;
      if (!current) return;
      apply(setSelection(current, ids));
    },
    [apply],
  );

  const setZoom = useCallback((next: number) => {
    setZoomState(Math.max(0.05, Math.min(16, next)));
  }, []);

  /* ------------------------------------------------------------- structure ops */

  const addPage = useCallback(
    (afterPageId: string) =>
      runStructural("Add page", async () => {
        const sessionNow = sessionRef.current;
        if (!sessionNow) throw new Error("The editor is still loading.");
        const doc = sessionDocument(sessionNow);
        const index = pageIndexOf(doc, afterPageId);
        const result = await mutationsRef.current.createPage({
          publicationId: publicationId as Id<"publications">,
          at: index < 0 ? doc.pages.length : index + 1,
          expectedStructureVersion: structureVersionRef.current,
        });
        return {
          document: result.document as unknown as PublicationDocument,
          pageId: result.pageId,
          structureVersion: result.structureVersion,
        };
      }),
    [publicationId, runStructural],
  );

  const duplicatePage = useCallback(
    (pageId: string) =>
      runStructural("Duplicate page", async () => {
        const result = await mutationsRef.current.duplicatePage({
          publicationId: publicationId as Id<"publications">,
          pageId,
          expectedStructureVersion: structureVersionRef.current,
        });
        return {
          document: result.document as unknown as PublicationDocument,
          pageId: result.pageId,
          structureVersion: result.structureVersion,
        };
      }),
    [publicationId, runStructural],
  );

  const deletePage = useCallback(
    (pageId: string) =>
      runStructural("Delete page", async () => {
        const result = await mutationsRef.current.deletePage({
          publicationId: publicationId as Id<"publications">,
          pageId,
          expectedStructureVersion: structureVersionRef.current,
        });
        clearRecoveryDraft(publicationId);
        return {
          document: result.document as unknown as PublicationDocument,
          structureVersion: result.structureVersion,
        };
      }),
    [publicationId, runStructural],
  );

  const movePageTo = useCallback(
    (pageId: string, toIndex: number) =>
      runStructural("Move page", async () => {
        const result = await mutationsRef.current.movePage({
          publicationId: publicationId as Id<"publications">,
          pageId,
          toIndex,
          expectedStructureVersion: structureVersionRef.current,
        });
        return {
          document: result.document as unknown as PublicationDocument,
          structureVersion: result.structureVersion,
        };
      }),
    [publicationId, runStructural],
  );

  /* -------------------------------------------------------------- insertions */

  const insertText = useCallback(async () => {
    const current = sessionRef.current;
    const pageNow = current ? activeSurface(current) : null;
    if (!current || !pageNow) return;
    const layerId = activeLayerId(current);
    if (!layerId) return;
    const safe = safeBox(pageNow.spec, pageNow.side);
    const width = Math.max(80, Math.min(260, safe.width * 0.6));
    const frameHeight = Math.max(40, Math.min(120, safe.height * 0.25));
    const object = createTextFrame({
      layerId,
      x: safe.x + width * 0.1,
      y: safe.y + frameHeight * 0.4,
      width,
      height: frameHeight,
      name: "Text",
    });
    const masterMode = current.state.activeMasterId !== undefined;
    // A master frame is not part of a page thread, so its story carries its
    // paragraphs without a frame reference; the frame names the story.
    const story = createStory("Body text", {
      frames: masterMode
        ? []
        : [{ pageId: pageNow.id, objectId: object.id }],
      paragraphs: [createParagraph("New text")],
    });
    if (masterMode) {
      const saver = saverRef.current;
      setBusy(true);
      try {
        const created = await mutationsRef.current.createStory({
          publicationId: publicationId as Id<"publications">,
          story: { ...story, frames: [] },
        });
        saver?.setStoryBaseline(story.id, created.version);
        const afterStory = sessionRef.current;
        if (!afterStory) return;
        const adopted = adoptStory(afterStory, { ...story, version: created.version });
        const withStory: TextFrameObject = { ...object, storyId: story.id };
        apply(addObjectToPage(adopted, pageNow.id, withStory));
        await saver?.flush();
        const settled = sessionRef.current;
        if (settled) apply(setSelection(settled, [withStory.id]));
        toast.success("Text frame added to the master.", IDLE_TOAST);
      } catch (error) {
        toast.error(messageOf(error) || "The text frame could not be created.");
      } finally {
        setBusy(false);
      }
      return;
    }
    const withStory: TextFrameObject = { ...object, storyId: story.id };
    const next = addObjectToPage(adoptStory(current, story), pageNow.id, withStory);
    apply(next);
    const saver = saverRef.current;
    if (!saver) return;
    setBusy(true);
    let storyCreated = false;
    try {
      // Create the story *before* the page that names it. The frame does not
      // exist on the server yet, so the story starts with no thread frames;
      // the reference is added after the page write succeeds. A story failure
      // can therefore never leave the page pointing at a missing story.
      const result = await mutationsRef.current.createStory({
        publicationId: publicationId as Id<"publications">,
        story: { ...story, frames: [] },
      });
      storyCreated = true;
      saver.setStoryBaseline(story.id, result.version);
      const created = sessionRef.current;
      if (created) apply(adoptStory(created, { ...story, version: result.version }));

      const latest = sessionRef.current;
      const pageAfter = latest
        ? sessionDocument(latest).pages.find((entry) => entry.id === pageNow.id)
        : undefined;
      const pageSaved = await saver.flush({
        pages: pageAfter ? [pageAfter] : [],
        stories: [],
      });
      if (!pageSaved) {
        // Keep the frame locally so the autosave can retry it after the
        // conflict is resolved; re-inserting would create a second story.
        toast.error(
          "Your text frame is kept locally. Resolve the conflict and it will retry saving.",
          IDLE_TOAST,
        );
        return;
      }

      // The frame now exists, so the story may safely name it.
      const storyWithFrame = { ...story, version: result.version };
      await saver.flush({ pages: [], stories: [storyWithFrame] });
      const settled = sessionRef.current;
      if (settled) apply(setSelection(settled, [withStory.id]));
      toast.success("Text frame added.", IDLE_TOAST);
    } catch (error) {
      toast.error(messageOf(error) || "The text frame could not be created.");
      if (!storyCreated) {
        // The story was never created, so the local frame would point at
        // nothing. Remove it (and the story) instead of leaving an orphan.
        const after = sessionRef.current;
        if (after) {
          const repaired = discardStoryEdits(
            removeObjects(after, pageNow.id, [withStory.id]),
            story.id,
          );
          apply(repaired);
        }
      } else {
        // The story exists; keep the frame so a retry can finish the page
        // write instead of creating a second story for the same gesture.
        toast.error("The text frame is kept locally; saving will retry.", IDLE_TOAST);
      }
    } finally {
      setBusy(false);
    }
  }, [apply, publicationId]);

  const insertShape = useCallback(
    async (shape: "rectangle" | "ellipse") => {
      const current = sessionRef.current;
      const pageNow = current ? activeSurface(current) : null;
      const layerId = current ? activeLayerId(current) : null;
      if (!current || !pageNow || !layerId) return;
      const safe = safeBox(pageNow.spec, pageNow.side);
      const object = createShape({
        layerId,
        x: safe.x + safe.width * 0.25,
        y: safe.y + safe.height * 0.35,
        width: Math.min(180, safe.width * 0.4),
        height: Math.min(120, safe.height * 0.2),
        shape,
        fill: "#e6ddcc",
        stroke: undefined,
        strokeWidth: 0,
        name: shape === "ellipse" ? "Ellipse" : "Rectangle",
      });
      apply(addObjectToPage(current, pageNow.id, object));
    },
    [apply],
  );

  const insertLine = useCallback(async () => {
    const current = sessionRef.current;
    const pageNow = current ? activeSurface(current) : null;
    const layerId = current ? activeLayerId(current) : null;
    if (!current || !pageNow || !layerId) return;
    const safe = safeBox(pageNow.spec, pageNow.side);
    const object = createLine({
      layerId,
      x: safe.x + safe.width * 0.2,
      y: safe.y + safe.height * 0.5,
      width: Math.max(40, safe.width * 0.5),
      height: 1,
      stroke: "#1a1a16",
      strokeWidth: 1,
      name: "Rule",
    });
    apply(addObjectToPage(current, pageNow.id, object));
  }, [apply]);

  const insertImage = useCallback(
    async (asset: StudioAssetRecord) => {
      const current = sessionRef.current;
      const pageNow = current ? activeSurface(current) : null;
      const layerId = current ? activeLayerId(current) : null;
      if (!current || !pageNow || !layerId) return;
      const safe = safeBox(pageNow.spec, pageNow.side);
      const aspect = asset.width > 0 && asset.height > 0 ? asset.width / asset.height : 1.5;
      let width = Math.min(safe.width * 0.6, 240);
      let height = width / aspect;
      if (height > safe.height * 0.6) {
        height = safe.height * 0.6;
        width = height * aspect;
      }
      const object = createImageFrame({
        layerId,
        x: safe.x + (safe.width - width) / 2,
        y: safe.y + (safe.height - height) / 2,
        width,
        height,
        assetId: asset.assetId,
        fit: "fill",
        name: asset.filename,
      });
      apply(addObjectToPage(current, pageNow.id, object));
    },
    [apply],
  );

  /**
   * Replace only the asset reference. The frame, page position, mask and crop
   * stay where the designer put them, and the previous asset row is never
   * touched: it may be shared or needed by a saved version.
   */
  const replaceImage = useCallback(
    (objectId: string, asset: StudioAssetRecord) => {
      const current = sessionRef.current;
      const pageNow = current ? activeSurface(current) : null;
      if (!current || !pageNow) return;
      apply(
        editSurface(current, (pageUpdate) => ({
          ...pageUpdate,
          objects: pageUpdate.objects.map((object) =>
            object.id === objectId && object.kind === "image-frame"
              ? { ...object, assetId: asset.assetId }
              : object,
          ),
        })),
      );
    },
    [apply],
  );

  const setImagePlacement = useCallback<UsePublishingEditorResult["setImagePlacement"]>(
    (objectId, change) => {
      const current = sessionRef.current;
      const pageNow = current ? activeSurface(current) : null;
      if (!current || !pageNow) return;
      apply(
        editSurface(current, (pageUpdate) => ({
          ...pageUpdate,
          objects: pageUpdate.objects.map((object) =>
            object.id === objectId && object.kind === "image-frame"
              ? {
                  ...object,
                  ...(change.fit ? { fit: change.fit } : {}),
                  ...(change.crop ? { crop: change.crop } : {}),
                  ...(change.focal ? { focal: change.focal } : {}),
                }
              : object,
          ),
        })),
      );
    },
    [apply],
  );

  const placeAsset = useCallback(
    (asset: StudioAssetRecord, targetObjectId?: string) => {
      const current = sessionRef.current;
      const pageNow = current ? activeSurface(current) : null;
      if (!current || !pageNow) return;
      const target =
        targetObjectId ??
        (current.state.selection.length === 1 ? current.state.selection[0] : undefined);
      const object = target
        ? pageNow.objects.find((entry) => entry.id === target)
        : undefined;
      if (object?.kind === "image-frame") {
        replaceImage(object.id, asset);
      } else {
        void insertImage(asset);
      }
    },
    [insertImage, replaceImage],
  );

  const uploadAsset = useCallback(
    async (file: File) => {
      const issues = validateAssetFile({
        mimeType: file.type,
        fileSize: file.size,
      });
      if (issues.length > 0) {
        toast.error(issues.map((issue) => issue.message).join(" "));
        return;
      }

      setUploadingAsset(true);
      setAssetError(undefined);
      try {
        const derivatives = await createImageDerivatives(file);
        if (derivatives.width <= 0 || derivatives.height <= 0) {
          throw new Error(
            derivatives.warnings[0] ?? "This image could not be read in the browser.",
          );
        }

        const uploadBlob = async (blob: Blob): Promise<Id<"_storage">> => {
          const uploadUrl = await mutationsRef.current.generateAssetUploadUrl({});
          const response = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": blob.type || "application/octet-stream" },
            body: blob,
          });
          if (!response.ok) {
            throw new Error(`The upload failed (${response.status}).`);
          }
          const result = (await response.json()) as { storageId: Id<"_storage"> };
          return result.storageId;
        };

        const originalStorageId = await uploadBlob(file);
        const registered = await mutationsRef.current.registerAsset({
          publicationId: publicationId as Id<"publications">,
          storageId: originalStorageId,
          filename: file.name,
          mimeType: file.type,
          width: derivatives.width,
          height: derivatives.height,
        });

        if (derivatives.proxy || derivatives.thumbnail) {
          try {
            const [proxyStorageId, thumbnailStorageId] = await Promise.all([
              derivatives.proxy ? uploadBlob(derivatives.proxy) : undefined,
              derivatives.thumbnail ? uploadBlob(derivatives.thumbnail) : undefined,
            ]);
            await mutationsRef.current.setAssetDerivatives({
              assetId: registered.assetId,
              ...(proxyStorageId ? { proxyStorageId } : {}),
              ...(thumbnailStorageId ? { thumbnailStorageId } : {}),
            });
          } catch {
            // The original is already registered and safe. A missing preview
            // only costs screen quality; it must not fail the upload.
            toast.warning("The original was saved, but its preview could not be.");
          }
        }

        toast.success(`${file.name} added to the asset library.`);
      } catch (error) {
        const message = messageOf(error) || "The image could not be uploaded.";
        setAssetError(message);
        toast.error(message);
      } finally {
        setUploadingAsset(false);
      }
    },
    [publicationId],
  );

  /* ---------------------------------------------------------------- recovery */

  const restoreRecovery = useCallback(() => {
    const current = sessionRef.current;
    const draft = recovery;
    if (!current || !draft) return;
    let next = current;
    for (const pageRecord of draft.pages) {
      if (!sessionDocument(next).pages.some((entry) => entry.id === pageRecord.id)) continue;
      next = editPage(next, pageRecord.id, () => pageRecord);
    }
    for (const storyRecord of draft.stories) {
      if (!sessionDocument(next).stories.some((entry) => entry.id === storyRecord.id)) {
        next = adoptStory(next, { ...storyRecord, version: 1 });
      } else {
        next = editStory(next, storyRecord.id, () => storyRecord);
      }
    }
    for (const masterRecord of draft.masters ?? []) {
      if (!sessionDocument(next).masters.some((entry) => entry.id === masterRecord.id)) {
        continue;
      }
      next = editMaster(next, masterRecord.id, () => masterRecord);
    }
    apply(next);
    setRecovery(null);
    toast.success("The draft is open again; review it before saving.", IDLE_TOAST);
  }, [apply, recovery]);

  const discardRecovery = useCallback(() => {
    clearRecoveryDraft(publicationId);
    setRecovery(null);
  }, [publicationId]);

  const flush = useCallback(async () => {
    const current = sessionRef.current;
    const saver = saverRef.current;
    if (!current || !saver) return;
    await saver.flush({
      pages: dirtyPages(current),
      stories: dirtyStories(current),
      masters: dirtyMasters(current),
    });
  }, []);

  /* -------------------------------------------------------------- shortcuts */

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) {
        return;
      }
      const current = sessionRef.current;
      if (!current) return;
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) performRedo();
        else performUndo();
        return;
      }
      if (meta && event.key.toLowerCase() === "y") {
        event.preventDefault();
        performRedo();
        return;
      }
      if (meta && event.key.toLowerCase() === "a") {
        event.preventDefault();
        apply(selectAllObjects(current));
        return;
      }
      if (meta) return;
      const pageNow = activePage(current);
      if (!pageNow) return;
      if (event.key === "Delete" || event.key === "Backspace") {
        if (current.state.selection.length === 0) return;
        event.preventDefault();
        deleteSelection();
        return;
      }
      if (event.key === "Escape") {
        apply(setSelection(current, []));
        return;
      }
      const step = event.shiftKey ? 10 : 1;
      const delta =
        event.key === "ArrowLeft"
          ? { x: -step, y: 0 }
          : event.key === "ArrowRight"
            ? { x: step, y: 0 }
            : event.key === "ArrowUp"
              ? { x: 0, y: -step }
              : event.key === "ArrowDown"
                ? { x: 0, y: step }
                : null;
      if (!delta) return;
      if (current.state.selection.length === 0) return;
      event.preventDefault();
      apply(nudgeSelection(current, delta.x, delta.y));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [apply, deleteSelection, performRedo, performUndo]);

  /* ------------------------------------------------------------------- values */

  const assets = ((loaded?.assets ?? []) as StudioAssetRecord[]).slice();

  return {
    state: !valid ? "not-found" : loaded === undefined ? "loading" : "ready",
    document,
    page,
    pageIndex,
    pageCount: document?.pages.length ?? 0,
    spreadLabel,
    dirtyPageIds: new Set(
      Object.entries(session?.state.pages ?? {})
        .filter(([, override]) => override.dirty)
        .map(([pageId]) => pageId),
    ),
    selection: session?.state.selection ?? [],
    zoom,
    preview,
    busy,
    saveStatus,
    saveMessage,
    recovery,
    assets,
    title,
    canUndo: session ? canUndo(session) : false,
    canRedo: session ? canRedo(session) : false,
    history: session ? historyLog(session) : [],
    masters: document?.masters ?? [],
    master,
    surface,
    isEditingMaster: session?.state.activeMasterId !== undefined,
    masterUsage: (masterId: string) =>
      document ? masterUsageCount(document, masterId) : 0,
    enterMaster,
    exitMaster,
    createMaster,
    duplicateMasterById,
    renameMaster,
    updateMasterMeta,
    deleteMasterById,
    assignMaster,
    overrideMasterObject,
    clearMasterOverride: clearMasterOverrideAction,
    detachMasterObject: detachMasterObjectAction,
    setTitle,
    commitTitle,
    setZoom,
    setPreview,
    setSelection: setEditorSelection,
    alignSelection,
    distributeSelection,
    matchSelectionSize,
    groupSelection,
    ungroupSelection,
    duplicateSelection,
    arrangeSelection,
    lockSelection,
    hideSelection,
    applyLayoutDocument,
    guides: document?.guides ?? [],
    addGuide,
    moveGuide,
    removeGuide,
    clearGuides,
    activatePage,
    activateLayer,
    activateNextPage,
    activatePreviousPage,
    editPageObjects,
    patchObject,
    setFrame,
    patchPage,
    patchStoryText,
    endTextEdit,
    applyCharacterFormat: applyCharacter,
    applyCharacterRange: applyCharacterRangeAction,
    applyParagraphFormat: applyParagraph,
    applyParagraphStyle: applyParagraphNamed,
    applyCharacterStyle: applyCharacterNamed,
    createStyle,
    updateParagraphStyle: updateParagraphStyleAction,
    updateCharacterStyle: updateCharacterStyleAction,
    duplicateStyle: duplicateStyleAction,
    deleteStyle: deleteStyleAction,
    renameStyle: renameStyleAction,
    stylesStatus,
    stylesMessage,
    retryStyles: () => {
      if (stylesRef.current) void persistStyles(stylesRef.current);
    },
    connectStoryFrame,
    disconnectStoryFrame,
    reorderStoryFrame,
    moveStoryFrameToPage,
    deleteSelection,
    restack,
    toggleLayerVisible,
    toggleLayerLocked,
    addLayer,
    nudgeLayer,
    nudgeObjectInLayer,
    moveObjectToLayer,
    performUndo,
    performRedo,
    addPage,
    duplicatePage,
    deletePage,
    movePageTo,
    insertText,
    insertShape,
    insertLine,
    insertImage,
    replaceImage,
    setImagePlacement,
    placeAsset,
    uploadAsset,
    uploadingAsset,
    assetError,
    restoreRecovery,
    discardRecovery,
    keepLocalOnConflict,
    takeServerCopy,
    flush,
  };
}

function messageOf(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  // Convex wraps server errors with a request id and a (possibly multi-line)
  // stack. The designer needs the sentence, not the trace.
  const withoutWrapper = raw.replace(/^\[CONVEX[\s\S]*?Uncaught Error:\s*/, "");
  const stackStart = withoutWrapper.search(/\s+at\s+\S+\s*\(/);
  return (stackStart >= 0 ? withoutWrapper.slice(0, stackStart) : withoutWrapper)
    .replace(/\s+/g, " ")
    .trim();
}
