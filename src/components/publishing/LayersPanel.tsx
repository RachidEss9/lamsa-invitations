import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Layers as LayersIcon,
  Lock,
  LockOpen,
  Minus,
  Plus,
  Square,
  Type as TypeIcon,
} from "lucide-react";
import { memo } from "react";

import type { PublicationPage } from "@/lib/publishing/model";
import { objectTitle, objectKindLabel } from "@/lib/publishing/render";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * The layers panel, reading exactly the model's truth: per-page layers in
 * paint order (bottom to top) and objects inside them. Reordering an object
 * only ever moves it *within* its own layer — cross-layer moves are explicit
 * (the per-row layer picker), because that is what a serious layout tool does.
 */

const KIND_ICON = {
  "text-frame": TypeIcon,
  "image-frame": ImageIcon,
  shape: Square,
  line: Minus,
  generic: LayersIcon,
} as const;

export interface LayersPanelProps {
  page: PublicationPage;
  selection: readonly string[];
  onSelect: (ids: readonly string[]) => void;
  onToggleVisibility: (layerId: string) => void;
  onToggleLock: (layerId: string) => void;
  onAddLayer: () => void;
  onMoveLayer: (layerId: string, direction: 1 | -1) => void;
  onMoveObjectInLayer: (layerId: string, objectId: string, direction: 1 | -1) => void;
  onMoveObjectToLayer: (objectId: string, layerId: string) => void;
  onPatchObject: (objectId: string, patch: { hidden?: boolean; locked?: boolean }) => void;
}

export function LayersPanel({
  page,
  selection,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onAddLayer,
  onMoveLayer,
  onMoveObjectInLayer,
  onMoveObjectToLayer,
  onPatchObject,
}: LayersPanelProps) {
  const selected = new Set(selection);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-[var(--rule)] px-3 py-2">
        <span className="font-meta text-[0.6rem] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
          Layers
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          title="New layer"
          onClick={onAddLayer}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto pb-2">
        {/* Top layer first, exactly as the canvas paints later-on-top. */}
        {[...page.layers].reverse().map((layer) => {
          const objectsInLayer = page.objects.filter(
            (object) => object.layerId === layer.id,
          );
          return (
            <div key={layer.id} className="border-b border-[color-mix(in_oklab,var(--rule)_70%,transparent)]">
              <div className="group flex items-center gap-1 px-2 py-1.5">
                <button
                  type="button"
                  className="rounded-sm p-1 text-[var(--ink-soft)] hover:bg-[color-mix(in_oklab,var(--ink)_6%,transparent)]"
                  title={layer.hidden ? "Show layer" : "Hide layer"}
                  onClick={() => onToggleVisibility(layer.id)}
                >
                  {layer.hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
                <button
                  type="button"
                  className="rounded-sm p-1 text-[var(--ink-soft)] hover:bg-[color-mix(in_oklab,var(--ink)_6%,transparent)]"
                  title={layer.locked ? "Unlock layer" : "Lock layer"}
                  onClick={() => onToggleLock(layer.id)}
                >
                  {layer.locked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
                </button>
                <span
                  className={cn(
                    "flex-1 truncate text-[0.72rem]",
                    layer.hidden || layer.locked
                      ? "text-[color-mix(in_oklab,var(--ink-soft)_80%,transparent)]"
                      : "text-[var(--ink)]",
                  )}
                  title={`${layer.name}${layer.hidden ? " · hidden" : ""}${layer.locked ? " · locked" : ""}`}
                >
                  {layer.name || "Layer"}
                </span>
                <span className="font-meta text-[0.55rem] text-[color-mix(in_oklab,var(--ink-soft)_70%,transparent)]">
                  {objectsInLayer.length}
                </span>
                <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    title="Move layer down (towards the back)"
                    onClick={() => onMoveLayer(layer.id, -1)}
                  >
                    <ChevronDown className="size-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    title="Move layer up (towards the front)"
                    onClick={() => onMoveLayer(layer.id, 1)}
                  >
                    <ChevronUp className="size-3" />
                  </Button>
                </div>
              </div>

              {objectsInLayer.length > 0 ? (
                <div className="pb-1 pl-6 pr-2">
                  {[...objectsInLayer].reverse().map((object) => {
                    const Icon = KIND_ICON[object.kind] ?? LayersIcon;
                    const isSelected = selected.has(object.id);
                    const disabledRow = layer.hidden || layer.locked;
                    return (
                      <div
                        key={object.id}
                        className={cn(
                          "group/row flex items-center gap-1 rounded-sm px-1 py-[3px] text-[0.7rem]",
                          isSelected
                            ? "bg-[color-mix(in_oklab,var(--red)_12%,transparent)] text-[var(--red)]"
                            : "text-[var(--ink)] hover:bg-[color-mix(in_oklab,var(--ink)_5%,transparent)]",
                          disabledRow && "opacity-55",
                        )}
                      >
                        <Icon className="size-3 shrink-0 text-[var(--ink-soft)]" />
                        <button
                          type="button"
                          className="min-w-0 flex-1 truncate text-left"
                          title={`${objectTitle(object)} · ${objectKindLabel(object)}`}
                          onClick={(event) => {
                            if (event.shiftKey) {
                              onSelect(
                                isSelected
                                  ? selection.filter((id) => id !== object.id)
                                  : [...selection, object.id],
                              );
                            } else {
                              onSelect([object.id]);
                            }
                          }}
                        >
                          {objectTitle(object)}
                        </button>
                        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100">
                          <RowStepper
                            objectId={object.id}
                            layerId={layer.id}
                            selectionUseful={objectsInLayer.length > 1}
                            onMove={onMoveObjectInLayer}
                          />
                          <Select
                            value={object.layerId}
                            onValueChange={(value) => onMoveObjectToLayer(object.id, value)}
                          >
                            <SelectTrigger
                              className="h-5 w-5 gap-0 border-none bg-transparent p-0 shadow-none"
                              title="Move object to another layer"
                            >
                              <LayersIcon className="size-3 text-[var(--ink-soft)]" />
                            </SelectTrigger>
                            <SelectContent>
                              {page.layers.map((option) => (
                                <SelectItem key={option.id} value={option.id} className="text-[0.72rem]">
                                  {option.name || "Layer"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <button
                            type="button"
                            className="rounded-sm p-0.5 text-[var(--ink-soft)] hover:bg-[color-mix(in_oklab,var(--ink)_6%,transparent)]"
                            title={object.hidden ? "Show object" : "Hide object"}
                            onClick={() => onPatchObject(object.id, { hidden: !object.hidden })}
                          >
                            {object.hidden ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                          </button>
                          <button
                            type="button"
                            className="rounded-sm p-0.5 text-[var(--ink-soft)] hover:bg-[color-mix(in_oklab,var(--ink)_6%,transparent)]"
                            title={object.locked ? "Unlock object" : "Lock object"}
                            onClick={() => onPatchObject(object.id, { locked: !object.locked })}
                          >
                            {object.locked ? <Lock className="size-3" /> : <LockOpen className="size-3" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const RowStepper = memo(function RowStepper({
  objectId,
  layerId,
  selectionUseful,
  onMove,
}: {
  objectId: string;
  layerId: string;
  selectionUseful: boolean;
  onMove: (layerId: string, objectId: string, direction: 1 | -1) => void;
}) {
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-5"
        title={selectionUseful ? "Lower within this layer" : "Nothing to lower under it"}
        disabled={!selectionUseful}
        onClick={() => onMove(layerId, objectId, -1)}
      >
        <ChevronDown className="size-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-5"
        title={selectionUseful ? "Raise within this layer" : "Nothing above it to raise onto"}
        disabled={!selectionUseful}
        onClick={() => onMove(layerId, objectId, 1)}
      >
        <ChevronUp className="size-3" />
      </Button>
    </>
  );
});

/** A compact note used when a page has no layers at all. */
export function LayersEmptyNote() {
  return (
    <div className="px-3 py-4 text-[0.72rem] text-[var(--ink-soft)]">
      This page has no layers yet.
    </div>
  );
}
