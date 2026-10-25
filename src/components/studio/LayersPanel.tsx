import { FrameArt } from "@/components/invitation/FrameArt";
import { Motif } from "@/components/invitation/Motif";
import { ShapePreview } from "@/components/studio/LibraryPanel";
import { IconButton } from "@/components/ui/icon-button";
import { Button } from "@/components/ui/button";
import {
  elementTypeLabel,
  type DesignElement,
  type DesignPage,
} from "@/lib/design";
import { fontFamilyFor } from "@/lib/fonts";
import { frameById } from "@/lib/frames";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Lock,
  Pencil,
  Trash2,
  Unlock,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface LayersPanelProps {
  page: DesignPage;
  selectedIds: string[];
  imageUrls: Record<string, string>;
  /** Selecting a layer that belongs to a group selects the whole group. */
  onSelect: (ids: string[]) => void;
  /** Mobile only: closes the bottom sheet so the picked layer is visible. */
  onPicked?: () => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onToggleLocked: (id: string) => void;
  /** Moves one layer one step forward (+1) or backward (−1) in the stack. */
  onNudge: (id: string, direction: -1 | 1) => void;
  /** Drag-and-drop reorder: puts `id` where `targetId` sits. */
  onPlace: (id: string, targetId: string) => void;
  onGroup: () => void;
  onUngroup: () => void;
  /** Delete is refused while a canvas text caret is open or a layer is locked. */
  deleteHint?: string;
}

/**
 * A small, honest preview of one layer.
 *
 * Rendering the real element pipeline for every row would be expensive on a
 * phone, so each kind gets a compact equivalent: the actual image, the actual
 * frame vector, the actual glyphs in their own typeface, or the shape's fill.
 */
function LayerThumb({
  element,
  imageUrls,
}: {
  element: DesignElement;
  imageUrls: Record<string, string>;
}) {
  const frame = element.frameArt ? frameById(element.frameArt) : undefined;

  if (frame) {
    return (
      <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-[5px] border border-[var(--edge)] bg-white">
        <FrameArt
          frame={frame}
          color={element.stroke ?? element.fill ?? "#710014"}
          strokeWidth={4}
          className="size-[22px]"
        />
      </span>
    );
  }

  if (element.kind === "image") {
    const url = element.imageStorageId ? imageUrls[element.imageStorageId] : undefined;
    return (
      <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-[5px] border border-[var(--edge)] bg-[var(--surface-sunk)]">
        {url ? (
          <img src={url} alt="" className="size-full object-cover" />
        ) : (
          <span className="font-meta text-[8px] text-ink/35">IMG</span>
        )}
      </span>
    );
  }

  if (element.kind === "text") {
    return (
      <span
        className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-[5px] border border-[var(--edge)] bg-white leading-none"
        style={{
          color: element.color ?? "#161616",
          fontFamily: fontFamilyFor(element.font),
          fontWeight: element.fontWeight ?? 500,
        }}
      >
        <span className="text-[13px]">Aa</span>
      </span>
    );
  }

  if (element.kind === "motif") {
    return (
      <span className="grid size-7 shrink-0 place-items-center rounded-[5px] border border-[var(--edge)] bg-white text-ink/70">
        <Motif id={element.motif ?? "none"} className="size-4" />
      </span>
    );
  }

  return (
    <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-[5px] border border-[var(--edge)] bg-white">
      <ShapePreview
        shape={element.shape ?? "rect"}
        fill={element.fill ?? element.color ?? "#16171a"}
        stroke={element.stroke}
      />
    </span>
  );
}

export function LayersPanel({
  page,
  selectedIds,
  imageUrls,
  onSelect,
  onPicked,
  onRename,
  onDuplicate,
  onDelete,
  onToggleHidden,
  onToggleLocked,
  onNudge,
  onPlace,
  onGroup,
  onUngroup,
  deleteHint,
}: LayersPanelProps) {
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  useEffect(() => {
    if (!renaming) return;
    const node = inputRef.current;
    if (!node) return;
    node.focus();
    node.select();
  }, [renaming]);

  const commitRename = () => {
    if (!renaming) return;
    const next = draft.trim();
    if (next && next !== page.elements.find((item) => item.id === renaming)?.name) {
      onRename(renaming, next);
    }
    setRenaming(null);
  };

  // Front-most layer first, matching what the guest sees on top.
  const rows = [...page.elements].reverse();

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex items-baseline justify-between gap-2 border-b border-[var(--edge)] px-3.5 py-2.5">
        <div>
          <p className="section-label">Layers</p>
          <p className="mt-0.5 text-[10px] text-ink/45">
            {page.elements.length} on this page · front to back
          </p>
        </div>
        {selectedIds.length > 1 && (
          <span className="rounded-full border border-[var(--edge)] px-2 py-0.5 font-meta text-[9px] text-ink/50">
            {selectedIds.length} selected
          </span>
        )}
      </div>

      {page.elements.length === 0 ? (
        <p className="px-3.5 py-6 text-center text-[11px] leading-relaxed text-ink/45">
          This page is empty. Add text, a shape, or an image to start the stack.
        </p>
      ) : (
        <ul
          className="min-h-0 flex-1 space-y-0.5 overflow-y-auto scroll-slim p-1.5"
          aria-label="Layers, front to back"
        >
          {rows.map((element) => {
            const active = selectedIds.includes(element.id);
            const isRenaming = renaming === element.id;
            return (
              <li
                key={element.id}
                draggable={!isRenaming}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", element.id);
                  setDragging(element.id);
                }}
                onDragEnd={() => setDragging(null)}
                onDragOver={(event) => {
                  if (!dragging || dragging === element.id) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const draggedId = event.dataTransfer.getData("text/plain");
                  setDragging(null);
                  if (!draggedId || draggedId === element.id) return;
                  onPlace(draggedId, element.id);
                }}
                className={cn(
                  "rounded-[var(--radius-control)] border transition-[background-color,border-color,box-shadow] duration-150",
                  active
                    ? "border-[var(--edge-strong)] bg-[var(--surface-card)] shadow-[var(--shadow-xs)]"
                    : "border-transparent hover:border-[var(--edge)] hover:bg-[var(--accent)]/50",
                  dragging === element.id && "opacity-45",
                  element.hidden && "opacity-60",
                )}
              >
                <div className="flex items-center gap-1 py-1 pl-1 pr-1">
                  <span className="grid w-3 shrink-0 cursor-grab place-items-center text-ink/25 active:cursor-grabbing">
                    <GripVertical className="size-3" aria-hidden />
                  </span>

                  {isRenaming ? (
                    <input
                      ref={inputRef}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          commitRename();
                        }
                        if (event.key === "Escape") {
                          event.preventDefault();
                          setRenaming(null);
                        }
                      }}
                      aria-label={`Rename ${element.name}`}
                      className="h-7 min-w-0 flex-1 rounded-[6px] border border-[var(--edge-strong)] bg-white px-1.5 font-ui text-[11px] text-ink outline-none focus:border-[var(--gold)]"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={(event) => {
                        const group = element.groupId
                          ? page.elements
                              .filter((item) => item.groupId === element.groupId)
                              .map((item) => item.id)
                          : [];
                        const ids = group.length > 0 ? group : [element.id];
                        if (event.shiftKey) {
                          const next = new Set(selectedIds);
                          for (const id of ids) {
                            if (next.has(id)) next.delete(id);
                            else next.add(id);
                          }
                          onSelect([...next]);
                          return;
                        }
                        onSelect(ids);
                        onPicked?.();
                      }}
                      onDoubleClick={() => {
                        setDraft(element.name);
                        setRenaming(element.id);
                      }}
                      className="flex min-w-0 flex-1 items-center gap-1.5 py-0.5 text-left"
                      aria-pressed={active}
                      title={`${element.name} · ${elementTypeLabel(element)} — double-click to rename`}
                    >
                      <LayerThumb element={element} imageUrls={imageUrls} />
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block truncate font-ui text-[11.5px] leading-tight",
                            active ? "text-ink" : "text-ink/70",
                          )}
                        >
                          {element.name}
                        </span>
                        <span className="block truncate font-meta text-[8px] uppercase tracking-[0.1em] text-ink/35">
                          {elementTypeLabel(element)}
                          {element.groupId ? " · grouped" : ""}
                          {element.flipX || element.flipY ? " · flipped" : ""}
                        </span>
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onToggleHidden(element.id)}
                    title={element.hidden ? "Show layer" : "Hide layer"}
                    aria-label={element.hidden ? `Show ${element.name}` : `Hide ${element.name}`}
                    aria-pressed={element.hidden}
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full transition-colors",
                      element.hidden
                        ? "text-[var(--red)] hover:bg-[var(--red)]/10"
                        : "text-ink/35 hover:bg-ink/[0.06] hover:text-ink",
                    )}
                  >
                    {element.hidden ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleLocked(element.id)}
                    title={element.locked ? "Unlock layer" : "Lock layer"}
                    aria-label={element.locked ? `Unlock ${element.name}` : `Lock ${element.name}`}
                    aria-pressed={element.locked}
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full transition-colors",
                      element.locked
                        ? "text-[var(--red)] hover:bg-[var(--red)]/10"
                        : "text-ink/35 hover:bg-ink/[0.06] hover:text-ink",
                    )}
                  >
                    {element.locked ? <Lock className="size-3" /> : <Unlock className="size-3" />}
                  </button>
                </div>

                {/* Actions for the selected layer only, so a long stack stays calm. */}
                {active && !isRenaming && (
                  <div className="flex items-center gap-1 border-t border-[var(--edge)] px-1.5 py-1">
                    <IconButton
                      size="sm"
                      subtle
                      label={`Rename ${element.name}`}
                      onClick={() => {
                        setDraft(element.name);
                        setRenaming(element.id);
                      }}
                    >
                      <Pencil className="size-3" />
                    </IconButton>
                    <IconButton
                      size="sm"
                      subtle
                      label="Move forward"
                      onClick={() => onNudge(element.id, 1)}
                    >
                      <ChevronUp className="size-3" />
                    </IconButton>
                    <IconButton
                      size="sm"
                      subtle
                      label="Move backward"
                      onClick={() => onNudge(element.id, -1)}
                    >
                      <ChevronDown className="size-3" />
                    </IconButton>
                    <span className="mx-0.5 h-4 w-px bg-[var(--edge)]" />
                    <IconButton
                      size="sm"
                      subtle
                      label="Duplicate layer"
                      onClick={() => onDuplicate(element.id)}
                    >
                      <Copy className="size-3" />
                    </IconButton>
                    <IconButton
                      size="sm"
                      subtle
                      danger
                      disabled={element.locked}
                      label={element.locked ? "Unlock to delete" : "Delete layer"}
                      onClick={() => onDelete(element.id)}
                    >
                      <Trash2 className="size-3" />
                    </IconButton>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="border-t border-[var(--edge)] p-2">
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            type="button"
            variant="outline"
            className="h-8 rounded-full text-[10px]"
            onClick={onGroup}
            disabled={selectedIds.length < 2}
            title="Group the selected layers (⌘/Ctrl + G)"
          >
            Group
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-8 rounded-full text-[10px]"
            onClick={onUngroup}
            disabled={selectedIds.length === 0}
            title="Ungroup the selected layers (⇧⌘/Ctrl + G)"
          >
            Ungroup
          </Button>
        </div>
        <p className="mt-1.5 text-[9px] leading-relaxed text-ink/35">
          {deleteHint ?? "Drag a layer to reorder it. Locked layers stay put."}
        </p>
      </div>
    </div>
  );
}
