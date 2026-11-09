import { Component, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router";

import { usePublishingEditor } from "@/hooks/publishing/usePublishingEditor";
import { spreadGeometry, spreadForPage } from "@/lib/publishing/spreads";
import { DEFAULT_CHROME, type PageChrome } from "@/components/publishing/PageView";
import { EditorCanvas } from "@/components/publishing/EditorCanvas";
import { EditorToolbar } from "@/components/publishing/EditorToolbar";
import { PagePanel } from "@/components/publishing/PagePanel";
import { LayersPanel } from "@/components/publishing/LayersPanel";
import { AssetsPanel, type StudioAsset } from "@/components/publishing/AssetsPanel";
import { MastersPanel } from "@/components/publishing/MastersPanel";
import { HistoryPanel } from "@/components/publishing/HistoryPanel";
import { GuidesPanel } from "@/components/publishing/GuidesPanel";
import { SelectionTools } from "@/components/publishing/SelectionTools";
import { PreflightDialog } from "@/components/publishing/PreflightDialog";
import { ExportDialog } from "@/components/publishing/ExportDialog";
import { SmartAlbumDialog } from "@/components/publishing/SmartAlbumDialog";
import { AssistDialog } from "@/components/publishing/AssistDialog";
import { VersionsDialog } from "@/components/publishing/VersionsDialog";
import { Inspector } from "@/components/publishing/Inspector";
import { ImageCropBar } from "@/components/publishing/ImageCropBar";
import {
  ConflictBanner,
  EditorLoading,
  PublicationError,
  PublicationNotFound,
  RecoveryBanner,
} from "@/components/publishing/StatePanels";
import { Button } from "@/components/ui/button";
import { PUBLISHING_LIBRARY_PATH, editorHref } from "@/lib/publishing/routes";
import {
  cropDraftFor,
  defaultImageCrop,
  panImageCrop,
  type ImageCropDraft,
} from "@/lib/publishing/image";
import type { ImageCrop, ImageFit, Point } from "@/lib/publishing/model";
import { cn } from "@/lib/utils";

/**
 * The publishing editor.
 *
 * A shell: toolbar, three panels and one paper stage. Everything inside reads
 * the session from `usePublishingEditor`; no panel talks to Convex itself, so
 * there is exactly one autosave path and exactly one version guard per record.
 */

/** Query failures are turned into a readable panel instead of a blank route. */
class EditorBoundary extends Component<
  { children: ReactNode; onReset: () => void },
  { message: string | null }
> {
  state = { message: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { message: error.message || "The publication could not be loaded." };
  }

  render() {
    if (this.state.message) {
      // The backend deliberately answers "not found" for a document owned by
      // someone else, so this is also the unauthorized state — no existence
      // leak, and no blank screen.
      const missing = /not found/i.test(this.state.message);
      return (
        <main className="flex min-h-screen flex-col bg-[var(--paper)]">
          {missing ? (
            <PublicationNotFound />
          ) : (
            <PublicationError
              message={this.state.message}
              onRetry={() => {
                this.setState({ message: null });
                this.props.onReset();
              }}
            />
          )}
        </main>
      );
    }
    return this.props.children;
  }
}

export default function PublishingEditor() {
  const { publicationId = "" } = useParams<{ publicationId: string }>();
  const navigate = useNavigate();
  const [boundaryKey, setBoundaryKey] = useState(0);

  return (
    <EditorBoundary
      key={`${publicationId}-${boundaryKey}`}
      onReset={() => setBoundaryKey((key) => key + 1)}
    >
      <EditorWorkspace publicationId={publicationId} onBack={() => navigate(PUBLISHING_LIBRARY_PATH)} />
    </EditorBoundary>
  );
}

function EditorWorkspace({
  publicationId,
  onBack,
}: {
  publicationId: string;
  onBack: () => void;
}) {
  const editor = usePublishingEditor(publicationId);
  const [chrome, setChrome] = useState<PageChrome>(DEFAULT_CHROME);
  const [chromeBeforePreview, setChromeBeforePreview] = useState<PageChrome>(DEFAULT_CHROME);
  const [panel, setPanel] = useState<
    "pages" | "layers" | "masters" | "assets" | "history" | "guides"
  >("pages");
  const [dialog, setDialog] = useState<
    "preflight" | "export" | "album" | "assist" | "versions" | null
  >(null);
  const [guidesLocked, setGuidesLocked] = useState(false);
  const [fitSignal, setFitSignal] = useState(0);
  const [editing, setEditing] = useState<{
    pageId: string;
    objectId: string;
  } | null>(null);
  const [textSelectionState, setTextSelectionState] = useState<{
    pageId: string;
    storyId: string;
    start: number;
    end: number;
  } | null>(null);
  const [imageCrop, setImageCrop] = useState<{
    pageId: string;
    objectId: string;
    draft: ImageCropDraft;
  } | null>(null);
  const [mobilePanel, setMobilePanel] = useState<
    | "pages"
    | "layers"
    | "masters"
    | "assets"
    | "history"
    | "guides"
    | "inspector"
    | null
  >(null);
  const navigate = useNavigate();

  const document = editor.document;
  const page = editor.page;
  const master = editor.master;
  // In master editing the canvas, layers and inspector all follow the master
  // surface; Pages and the page thumbnails keep showing the real pages.
  const surface = editor.surface ?? page;
  const activeMasterId = master?.id;

  // Editing is scoped to the page and the current selection. No effect is
  // needed: leaving the page or selecting elsewhere simply makes it inactive,
  // while the text stays in the session and autosaves.
  const editingObjectId =
    editing &&
    surface &&
    editing.pageId === surface.id &&
    editor.selection.includes(editing.objectId)
      ? editing.objectId
      : null;
  const textSelection =
    textSelectionState && surface && textSelectionState.pageId === surface.id
      ? textSelectionState
      : null;
  const activeImageCrop =
    imageCrop && surface && imageCrop.pageId === surface.id ? imageCrop : null;
  const selectedImageFrame =
    surface && editor.selection.length === 1
      ? surface.objects.find(
          (object) => object.id === editor.selection[0] && object.kind === "image-frame",
        )
      : undefined;

  /**
   * The canvas draws one page-shaped surface. In master editing that surface
   * is the master itself, alone on the stage, exactly as it will print on its
   * pages — never the active page with master objects layered in.
   */
  const displayDocument = useMemo(() => {
    if (!document || !surface) return null;
    if (!master) return document;
    return { ...document, pages: [surface], spreads: [] };
  }, [document, master, surface]);

  const geometry = useMemo(() => {
    if (!displayDocument || !surface) return null;
    if (master) {
      return spreadGeometry(
        {
          id: `master-${master.id}`,
          index: 0,
          kind: "single",
          pageIds: [surface.id],
          gutter: 0,
        },
        [surface],
      );
    }
    const spread =
      spreadForPage(displayDocument.spreads, surface.id) ??
      displayDocument.spreads[0] ??
      null;
    return spread ? spreadGeometry(spread, displayDocument.pages) : null;
  }, [displayDocument, master, surface]);

  const resolver = useMemo(() => {
    const byId = new Map(editor.assets.map((asset) => [asset.assetId, asset]));
    return (assetId: string | undefined) => {
      if (!assetId) return undefined;
      const asset = byId.get(assetId);
      if (!asset) return undefined;
      const url = asset.proxyUrl ?? asset.originalUrl ?? asset.thumbnailUrl;
      if (!url) return undefined;
      return { url, width: asset.width, height: asset.height };
    };
  }, [editor.assets]);

  const commitImageCrop = () => {
    if (!activeImageCrop) return;
    editor.setImagePlacement(activeImageCrop.objectId, activeImageCrop.draft);
    setImageCrop(null);
  };

  const startImageCrop = (objectId: string) => {
    if (!surface) return;
    const frame = surface.objects.find((object) => object.id === objectId);
    if (!frame || frame.kind !== "image-frame") return;
    editor.setSelection([objectId]);
    setImageCrop({
      pageId: surface.id,
      objectId,
      draft: cropDraftFor(frame),
    });
    setMobilePanel(null);
  };

  const changeImagePlacement = (
    objectId: string,
    change: { fit?: ImageFit; crop?: ImageCrop; focal?: Point },
  ) => {
    if (activeImageCrop?.objectId === objectId) {
      setImageCrop((current) =>
        current
          ? {
              ...current,
              draft: {
                fit: change.fit ?? current.draft.fit,
                crop: change.crop ?? current.draft.crop,
                focal: change.focal ?? current.draft.focal,
              },
            }
          : current,
      );
      return;
    }
    editor.setImagePlacement(objectId, change);
  };

  const resetImageCrop = (objectId: string) => {
    const frame = surface?.objects.find((object) => object.id === objectId);
    if (!frame || frame.kind !== "image-frame") return;
    const reset = {
      fit: frame.fit,
      crop: defaultImageCrop(),
      focal: { x: 0.5, y: 0.5 },
    };
    if (activeImageCrop?.objectId === objectId) {
      setImageCrop((current) =>
        current ? { ...current, draft: { ...current.draft, ...reset } } : current,
      );
    } else {
      editor.setImagePlacement(objectId, reset);
    }
  };

  useEffect(() => {
    if (!activeImageCrop) return;
    const onCropKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        setImageCrop(null);
        return;
      }
      if (event.key !== "Enter") return;
      const target = event.target as HTMLElement | null;
      if (
        target?.closest("input, textarea, select, button, [contenteditable='true']")
      ) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      editor.setImagePlacement(activeImageCrop.objectId, activeImageCrop.draft);
      setImageCrop(null);
    };
    window.addEventListener("keydown", onCropKey, true);
    return () => window.removeEventListener("keydown", onCropKey, true);
  }, [activeImageCrop, editor]);

  if (editor.state === "not-found") {
    return (
      <main className="flex min-h-screen flex-col bg-[var(--paper)]">
        <PublicationNotFound />
      </main>
    );
  }

  if (editor.state === "loading" || !document || !page || !surface || !geometry) {
    return (
      <main className="flex min-h-screen flex-col bg-[var(--paper)]">
        <EditorLoading />
      </main>
    );
  }

  const assetsPanelNode = (
    <AssetsPanel
      document={document}
      assets={editor.assets as StudioAsset[]}
      busy={editor.busy}
      uploading={editor.uploadingAsset}
      error={editor.assetError}
      selectedFrameName={
        selectedImageFrame?.kind === "image-frame" ? selectedImageFrame.name : undefined
      }
      onPlaceAsset={(asset) => {
        setImageCrop(null);
        editor.placeAsset(asset);
      }}
      onUploadAsset={(file) => void editor.uploadAsset(file)}
      onDeleteAsset={(asset) => void editor.deleteAsset(asset._id)}
    />
  );

  const mastersPanelNode = (
    <MastersPanel
      document={document}
      page={page}
      activeMasterId={activeMasterId}
      busy={editor.busy}
      onCreate={() => void editor.createMaster()}
      onDuplicate={(masterId) => void editor.duplicateMasterById(masterId)}
      onRename={(masterId, name) => editor.renameMaster(masterId, name)}
      onDelete={(masterId) => void editor.deleteMasterById(masterId)}
      onEnter={editor.enterMaster}
      onAssign={(pageIds, masterId) => void editor.assignMaster(pageIds, masterId)}
      onOverride={(objectId, patch) => editor.overrideMasterObject(objectId, patch)}
      onRestore={(objectId) => editor.clearMasterOverride(objectId)}
      onDetach={(objectId) => editor.detachMasterObject(objectId)}
    />
  );

  const inspectorNode = (
    <Inspector
      document={document}
      page={surface}
      selection={editor.selection}
      assets={editor.assets}
      displayUnit={document.displayUnit}
      onPatchPage={editor.patchPage}
      onPatchObject={editor.patchObject}
      onSetFrame={editor.setFrame}
      typography={editor}
      textSelection={textSelection}
      onDeleteSelected={editor.deleteSelection}
      onRestack={editor.restack}
      onOpenAssetsPanel={() => {
        setPanel("assets");
        setMobilePanel("assets");
      }}
      imageCropDraft={
        activeImageCrop && activeImageCrop.objectId === selectedImageFrame?.id
          ? activeImageCrop.draft
          : undefined
      }
      onChangeImagePlacement={changeImagePlacement}
      onEnterImageCrop={startImageCrop}
      onResetImageCrop={resetImageCrop}
      masterMode={
        master
          ? {
              master,
              onRename: (name) => editor.renameMaster(master.id, name),
              onPatch: (patch) => editor.updateMasterMeta(master.id, patch),
              onExit: editor.exitMaster,
            }
          : undefined
      }
    />
  );

  return (
    <main className="flex h-screen min-h-0 flex-col overflow-hidden bg-[var(--paper)] text-[var(--ink)]">
      <EditorToolbar
        title={editor.title}
        onTitleChange={editor.setTitle}
        onTitleCommit={() => void editor.commitTitle()}
        save={{ status: editor.saveStatus, message: editor.saveMessage }}
        pageIndex={Math.max(0, editor.pageIndex)}
        pageCount={editor.pageCount}
        spreadLabel={editor.spreadLabel}
        canGoPrevious={editor.pageIndex > 0}
        canGoNext={editor.pageIndex >= 0 && editor.pageIndex < editor.pageCount - 1}
        onPreviousPage={editor.activatePreviousPage}
        onNextPage={editor.activateNextPage}
        zoom={editor.zoom}
        onZoomIn={() => editor.setZoom(editor.zoom * 1.25)}
        onZoomOut={() => editor.setZoom(editor.zoom / 1.25)}
        onZoomReset={() => editor.setZoom(1)}
        onFit={() => setFitSignal((signal) => signal + 1)}
        canUndo={editor.canUndo}
        canRedo={editor.canRedo}
        onUndo={editor.performUndo}
        onRedo={editor.performRedo}
        preview={editor.preview}
        onTogglePreview={() => {
          if (!editor.preview) setChromeBeforePreview(chrome);
          setChrome(editor.preview ? chromeBeforePreview : { ...chrome, ...allChromeOff() });
          editor.setPreview(!editor.preview);
        }}
        chrome={chrome}
        onToggleChrome={(key) =>
          setChrome((current) => ({ ...current, [key]: !current[key] }))
        }
        onInsertText={() => void editor.insertText()}
        onInsertShape={(shape) => void editor.insertShape(shape)}
        onInsertLine={() => void editor.insertLine()}
        onOpenAssets={() => setPanel("assets")}
        onOpenPreflight={() => setDialog("preflight")}
        onOpenExport={() => setDialog("export")}
        onOpenSmartAlbum={() => setDialog("album")}
        onOpenAssist={() => setDialog("assist")}
        onOpenVersions={() => setDialog("versions")}
        busy={editor.busy}
        onBack={() => {
          void editor.flush();
          onBack();
        }}
      />

      {editor.saveStatus === "conflict" ? (
        <ConflictBanner
          message={editor.saveMessage}
          busy={editor.busy}
          onKeepLocal={() => void editor.keepLocalOnConflict()}
          onTakeServer={() => void editor.takeServerCopy()}
        />
      ) : null}
      {editor.recovery ? (
        <RecoveryBanner
          savedAt={editor.recovery.savedAt}
          onRestore={editor.restoreRecovery}
          onDiscard={editor.discardRecovery}
        />
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[232px_minmax(0,1fr)_268px]">
        <aside className="hidden min-h-0 flex-col border-r border-[var(--rule)] bg-[var(--paper)] lg:flex">
          <div className="grid grid-cols-3 border-b border-[var(--rule)]">
            {(
              [
                ["pages", "Pages"],
                ["layers", "Layers"],
                ["masters", "Masters"],
                ["assets", "Assets"],
                ["history", "History"],
                ["guides", "Guides"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPanel(id)}
                className={cn(
                  "py-2 font-meta text-[0.56rem] uppercase tracking-[0.12em] transition-colors",
                  panel === id
                    ? "border-b border-[var(--red)] text-[var(--red)]"
                    : "text-[var(--ink-soft)] hover:text-[var(--ink)]",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1">
            {panel === "pages" ? (
              <PagePanel
                document={document}
                activePageId={page.id}
                dirtyPages={editor.dirtyPageIds}
                busy={editor.busy}
                onActivate={editor.activatePage}
                onAddPage={(afterPageId) => void editor.addPage(afterPageId)}
                onDuplicatePage={(pageId) => void editor.duplicatePage(pageId)}
                onDeletePage={(pageId) => void editor.deletePage(pageId)}
                onMovePage={(pageId, toIndex) => void editor.movePageTo(pageId, toIndex)}
              />
            ) : null}
            {panel === "masters" ? mastersPanelNode : null}
            {panel === "layers" ? (
              <LayersPanel
                page={surface}
                selection={editor.selection}
                onSelect={editor.setSelection}
                onToggleVisibility={editor.toggleLayerVisible}
                onToggleLock={editor.toggleLayerLocked}
                onAddLayer={editor.addLayer}
                onMoveLayer={editor.nudgeLayer}
                onMoveObjectInLayer={editor.nudgeObjectInLayer}
                onMoveObjectToLayer={editor.moveObjectToLayer}
                onPatchObject={(objectId, patch) => editor.patchObject(objectId, patch)}
              />
            ) : null}
            {panel === "assets" ? assetsPanelNode : null}
            {panel === "history" ? (
              <HistoryPanel
                history={editor.history}
                canUndo={editor.canUndo}
                canRedo={editor.canRedo}
                busy={editor.busy}
                onUndo={() => void editor.performUndo()}
                onRedo={() => void editor.performRedo()}
              />
            ) : null}
            {panel === "guides" ? (
              <GuidesPanel
                document={document}
                page={page}
                unit={document.displayUnit}
                locked={guidesLocked}
                onLockChange={setGuidesLocked}
                onAddGuide={(guide) =>
                  editor.addGuide(guide.axis, guide.position, guide.scope)
                }
                onMoveGuide={editor.moveGuide}
                onRemoveGuide={editor.removeGuide}
                onClearGuides={editor.clearGuides}
                chrome={chrome}
                onToggleChrome={(key) =>
                  setChrome((current) => ({ ...current, [key]: !current[key] }))
                }
              />
            ) : null}
          </div>
        </aside>

        <section
          className={cn(
            "flex min-h-0 min-w-0 flex-col",
            master && "bg-[color-mix(in_oklab,var(--red)_3%,transparent)]",
          )}
        >
          {master ? (
            <div
              data-master-banner
              className="flex h-8 shrink-0 items-center justify-between gap-2 border-b-2 border-[var(--red)] bg-[color-mix(in_oklab,var(--red)_8%,var(--paper))] px-3"
            >
              <span className="truncate font-meta text-[0.55rem] uppercase tracking-[0.12em] text-[var(--red)]">
                Editing master: {master.name} · {editor.masterUsage(master.id)} page
                {editor.masterUsage(master.id) === 1 ? "" : "s"} · changes apply
                everywhere
              </span>
              <Button
                variant="ghost"
                className="h-5 px-1.5 font-meta text-[0.52rem] uppercase tracking-[0.1em] text-[var(--red)] hover:bg-white/40"
                onClick={editor.exitMaster}
              >
                Return to pages
              </Button>
            </div>
          ) : null}
          {activeImageCrop ? (
            <ImageCropBar
              name={
                surface.objects.find((object) => object.id === activeImageCrop.objectId)
                  ?.name ?? "Image"
              }
              draft={activeImageCrop.draft}
              onChange={(draft) =>
                setImageCrop((current) => (current ? { ...current, draft } : current))
              }
              onApply={commitImageCrop}
              onCancel={() => setImageCrop(null)}
            />
          ) : null}
          {!master && editor.selection.length > 0 && !editor.preview ? (
            <SelectionTools
              count={editor.selection.length}
              onAlign={editor.alignSelection}
              onDistribute={editor.distributeSelection}
              onMatchSize={editor.matchSelectionSize}
              onGroup={editor.groupSelection}
              onUngroup={editor.ungroupSelection}
              onDuplicate={editor.duplicateSelection}
              onArrange={editor.arrangeSelection}
              onLock={editor.lockSelection}
              onHide={editor.hideSelection}
            />
          ) : null}
          <EditorCanvas
            document={displayDocument ?? document}
            geometry={geometry}
            chrome={chrome}
            selection={editor.selection}
            zoom={editor.zoom}
            editable={!editor.preview}
            spaceHeld={false}
            assetResolver={resolver}
            cropPreview={
              activeImageCrop
                ? { objectId: activeImageCrop.objectId, ...activeImageCrop.draft }
                : null
            }
            onCropPan={(dx, dy) => {
              if (!activeImageCrop) return;
              const frame = surface.objects.find(
                (object) => object.id === activeImageCrop.objectId,
              );
              if (!frame || frame.kind !== "image-frame") return;
              setImageCrop((current) =>
                current
                  ? {
                      ...current,
                      draft: {
                        ...current.draft,
                        crop: panImageCrop(frame.frame, current.draft.crop, dx, dy),
                      },
                    }
                  : current,
              );
            }}
            onDropAsset={(objectId, assetId) => {
              const asset = editor.assets.find((entry) => entry.assetId === assetId);
              if (!asset) return;
              setImageCrop(null);
              editor.replaceImage(objectId, asset);
              editor.setSelection([objectId]);
              setPanel("layers");
            }}
            onSelect={editor.setSelection}
            onEditPage={editor.editPageObjects}
            onZoom={editor.setZoom}
            fitSignal={fitSignal}
            showRulers={chrome.guides && !editor.preview}
            unit={document.displayUnit}
            onAddGuide={(axis, position) => {
              if (guidesLocked) return;
              editor.addGuide(axis, position);
            }}
            editingObjectId={editingObjectId ?? undefined}
            onEditText={(objectId) => {
              const frame = surface.objects.find((object) => object.id === objectId);
              if (frame?.kind !== "text-frame" || !frame.storyId) return;
              editor.setSelection([objectId]);
              setEditing({ pageId: surface.id, objectId });
              setTextSelectionState({
                pageId: surface.id,
                storyId: frame.storyId,
                start: 0,
                end: 0,
              });
            }}
            onTextDraft={(objectId, text) => {
              const frame = surface.objects.find((object) => object.id === objectId);
              if (frame?.kind !== "text-frame" || !frame.storyId) return;
              editor.patchStoryText(frame.storyId, text, `story:${frame.storyId}`);
            }}
            onTextSelection={(objectId, start, end) => {
              const frame = surface.objects.find((object) => object.id === objectId);
              if (frame?.kind !== "text-frame" || !frame.storyId) return;
              setTextSelectionState({
                pageId: surface.id,
                storyId: frame.storyId,
                start,
                end,
              });
            }}
            onTextEnd={() => {
              editor.endTextEdit();
              setEditing(null);
            }}
            onEditImage={startImageCrop}
            onActivateObject={(objectId) => {
              editor.setSelection([objectId]);
              setPanel("layers");
            }}
          />
          <div className="flex h-7 shrink-0 items-center justify-between border-t border-[var(--rule)] bg-[var(--paper-light)] px-3 font-meta text-[0.52rem] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
            <span>
              {page.name.trim() || `Page ${editor.pageIndex + 1}`} · {page.side} ·{" "}
              {document.facingPages ? "facing pages" : "single pages"}
            </span>
            <span className="flex items-center gap-3">
              {editingObjectId ? (
                <span className="text-[var(--red)]">Editing text · Esc finishes</span>
              ) : null}
              {activeImageCrop ? (
                <span className="text-[var(--red)]">Cropping image · Enter applies</span>
              ) : null}
              <span>{editor.selection.length} selected</span>
              <span>{surface.objects.length} objects</span>
              <span>{surface.layers.length} layers</span>
              <Button
                variant="ghost"
                className="h-5 px-1 font-meta text-[0.52rem] uppercase tracking-[0.12em] text-[var(--ink-soft)] hover:text-[var(--red)]"
                onClick={() => {
                  setPanel("pages");
                  editor.setSelection([]);
                }}
              >
                Overview
              </Button>
            </span>
          </div>
        </section>

        <aside className="hidden min-h-0 border-l border-[var(--rule)] bg-[var(--paper)] lg:block">
          {inspectorNode}
        </aside>
      </div>

      <div className="flex h-10 shrink-0 items-stretch overflow-x-auto border-t border-[var(--rule)] bg-[var(--paper-light)] lg:hidden">
        {(
          [
            ["pages", "Pages"],
            ["layers", "Layers"],
            ["masters", "Masters"],
            ["assets", "Assets"],
            ["history", "History"],
            ["guides", "Guides"],
            ["inspector", "Inspect"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMobilePanel((current) => (current === id ? null : id))}
            className={cn(
              "min-w-[64px] flex-1 shrink-0 border-r border-[var(--rule)] py-2 font-meta text-[0.55rem] uppercase tracking-[0.1em]",
              mobilePanel === id
                ? "text-[var(--red)]"
                : "text-[var(--ink-soft)]",
            )}
          >
            {label}
          </button>
        ))}
        {selectedImageFrame?.kind === "image-frame" && !activeImageCrop ? (
          <button
            type="button"
            onClick={() => startImageCrop(selectedImageFrame.id)}
            className="flex-1 py-2 font-meta text-[0.55rem] uppercase tracking-[0.1em] text-[var(--red)]"
          >
            Crop
          </button>
        ) : null}
      </div>

      {mobilePanel ? (
        <div className="fixed inset-x-0 bottom-0 top-14 z-50 flex flex-col border-t border-[var(--rule)] bg-[var(--paper)] shadow-2xl lg:hidden">
          <div className="flex h-9 shrink-0 items-center justify-between border-b border-[var(--rule)] px-3">
            <span className="font-meta text-[0.58rem] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
              {mobilePanel === "inspector" ? "Inspector" : mobilePanel}
            </span>
            <button
              type="button"
              onClick={() => setMobilePanel(null)}
              className="font-meta text-[0.58rem] uppercase tracking-[0.1em] text-[var(--red)]"
            >
              Close
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {mobilePanel === "pages" ? (
              <PagePanel
                document={document}
                activePageId={page.id}
                dirtyPages={editor.dirtyPageIds}
                busy={editor.busy}
                onActivate={(pageId) => {
                  editor.activatePage(pageId);
                  setMobilePanel(null);
                }}
                onAddPage={(afterPageId) => void editor.addPage(afterPageId)}
                onDuplicatePage={(pageId) => void editor.duplicatePage(pageId)}
                onDeletePage={(pageId) => void editor.deletePage(pageId)}
                onMovePage={(pageId, toIndex) => void editor.movePageTo(pageId, toIndex)}
              />
            ) : null}
            {mobilePanel === "masters" ? mastersPanelNode : null}
            {mobilePanel === "layers" ? (
              <LayersPanel
                page={surface}
                selection={editor.selection}
                onSelect={(ids) => {
                  editor.setSelection(ids);
                  setMobilePanel(null);
                }}
                onToggleVisibility={editor.toggleLayerVisible}
                onToggleLock={editor.toggleLayerLocked}
                onAddLayer={editor.addLayer}
                onMoveLayer={editor.nudgeLayer}
                onMoveObjectInLayer={editor.nudgeObjectInLayer}
                onMoveObjectToLayer={editor.moveObjectToLayer}
                onPatchObject={(objectId, patch) => editor.patchObject(objectId, patch)}
              />
            ) : null}
            {mobilePanel === "assets" ? assetsPanelNode : null}
            {mobilePanel === "history" ? (
              <HistoryPanel
                history={editor.history}
                canUndo={editor.canUndo}
                canRedo={editor.canRedo}
                busy={editor.busy}
                onUndo={() => void editor.performUndo()}
                onRedo={() => void editor.performRedo()}
              />
            ) : null}
            {mobilePanel === "guides" ? (
              <GuidesPanel
                document={document}
                page={page}
                unit={document.displayUnit}
                locked={guidesLocked}
                onLockChange={setGuidesLocked}
                onAddGuide={(guide) =>
                  editor.addGuide(guide.axis, guide.position, guide.scope)
                }
                onMoveGuide={editor.moveGuide}
                onRemoveGuide={editor.removeGuide}
                onClearGuides={editor.clearGuides}
                chrome={chrome}
                onToggleChrome={(key) =>
                  setChrome((current) => ({ ...current, [key]: !current[key] }))
                }
              />
            ) : null}
            {mobilePanel === "inspector" ? inspectorNode : null}
          </div>
        </div>
      ) : null}

      <PreflightDialog
        open={dialog === "preflight"}
        onOpenChange={(open) => setDialog(open ? "preflight" : null)}
        document={document}
        assets={editor.assets}
        onNavigate={(pageId, objectId) => {
          editor.activatePage(pageId);
          if (objectId) editor.setSelection([objectId]);
        }}
      />
      <ExportDialog
        open={dialog === "export"}
        onOpenChange={(open) => setDialog(open ? "export" : null)}
        document={document}
        assets={editor.assets}
        currentPageId={page.id}
      />
      <SmartAlbumDialog
        open={dialog === "album"}
        onOpenChange={(open) => setDialog(open ? "album" : null)}
        document={document}
        assets={editor.assets}
        onCreated={(createdId) => {
          setDialog(null);
          navigate(editorHref(createdId));
        }}
      />
      <VersionsDialog
        open={dialog === "versions"}
        onOpenChange={(open) => setDialog(open ? "versions" : null)}
        publicationId={publicationId}
        pageCount={editor.pageCount}
        onBeforeSnapshot={editor.flush}
        onRestored={() => window.location.reload()}
      />
      <AssistDialog
        open={dialog === "assist"}
        onOpenChange={(open) => setDialog(open ? "assist" : null)}
        document={document}
        currentPageId={page.id}
        onApply={(next, label) => editor.applyLayoutDocument(next, label)}
      />
    </main>
  );
}

function allChromeOff(): PageChrome {
  return {
    bleed: false,
    margins: false,
    grid: false,
    columns: false,
    baseline: false,
    guides: false,
  };
}
