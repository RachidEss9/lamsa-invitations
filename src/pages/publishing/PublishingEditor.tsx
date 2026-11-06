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
import { PUBLISHING_LIBRARY_PATH } from "@/lib/publishing/routes";
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
  const [panel, setPanel] = useState<"pages" | "layers" | "assets">("pages");
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
    "pages" | "layers" | "assets" | "inspector" | null
  >(null);

  const document = editor.document;
  const page = editor.page;

  // Editing is scoped to the page and the current selection. No effect is
  // needed: leaving the page or selecting elsewhere simply makes it inactive,
  // while the text stays in the session and autosaves.
  const editingObjectId =
    editing &&
    page &&
    editing.pageId === page.id &&
    editor.selection.includes(editing.objectId)
      ? editing.objectId
      : null;
  const textSelection =
    textSelectionState && page && textSelectionState.pageId === page.id
      ? textSelectionState
      : null;
  const activeImageCrop =
    imageCrop && page && imageCrop.pageId === page.id ? imageCrop : null;
  const selectedImageFrame =
    page && editor.selection.length === 1
      ? page.objects.find(
          (object) => object.id === editor.selection[0] && object.kind === "image-frame",
        )
      : undefined;

  const geometry = useMemo(() => {
    if (!document || !page) return null;
    const spread =
      spreadForPage(document.spreads, page.id) ?? document.spreads[0] ?? null;
    return spread ? spreadGeometry(spread, document.pages) : null;
  }, [document, page]);

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
    if (!page) return;
    const frame = page.objects.find((object) => object.id === objectId);
    if (!frame || frame.kind !== "image-frame") return;
    editor.setSelection([objectId]);
    setImageCrop({
      pageId: page.id,
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
    const frame = page?.objects.find((object) => object.id === objectId);
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

  if (editor.state === "loading" || !document || !page || !geometry) {
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
    />
  );

  const inspectorNode = (
    <Inspector
      document={document}
      page={page}
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
      onOpenAssets={() => {
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
                ["assets", "Assets"],
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
            {panel === "layers" ? (
              <LayersPanel
                page={page}
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
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col">
          {activeImageCrop ? (
            <ImageCropBar
              name={
                page.objects.find((object) => object.id === activeImageCrop.objectId)
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
          <EditorCanvas
            document={document}
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
              const frame = page.objects.find(
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
            editingObjectId={editingObjectId ?? undefined}
            onEditText={(objectId) => {
              const frame = page.objects.find((object) => object.id === objectId);
              if (frame?.kind !== "text-frame" || !frame.storyId) return;
              editor.setSelection([objectId]);
              setEditing({ pageId: page.id, objectId });
              setTextSelectionState({
                pageId: page.id,
                storyId: frame.storyId,
                start: 0,
                end: 0,
              });
            }}
            onTextDraft={(objectId, text) => {
              const frame = page.objects.find((object) => object.id === objectId);
              if (frame?.kind !== "text-frame" || !frame.storyId) return;
              editor.patchStoryText(frame.storyId, text, `story:${frame.storyId}`);
            }}
            onTextSelection={(objectId, start, end) => {
              const frame = page.objects.find((object) => object.id === objectId);
              if (frame?.kind !== "text-frame" || !frame.storyId) return;
              setTextSelectionState({
                pageId: page.id,
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
              <span>{page.objects.length} objects</span>
              <span>{page.layers.length} layers</span>
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

      <div className="flex h-10 shrink-0 items-stretch border-t border-[var(--rule)] bg-[var(--paper-light)] lg:hidden">
        {(
          [
            ["pages", "Pages"],
            ["layers", "Layers"],
            ["assets", "Assets"],
            ["inspector", "Inspect"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMobilePanel((current) => (current === id ? null : id))}
            className={cn(
              "flex-1 border-r border-[var(--rule)] py-2 font-meta text-[0.55rem] uppercase tracking-[0.1em]",
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
            {mobilePanel === "layers" ? (
              <LayersPanel
                page={page}
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
            {mobilePanel === "inspector" ? inspectorNode : null}
          </div>
        </div>
      ) : null}
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
