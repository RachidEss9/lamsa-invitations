import type { SceneLayer } from "@/lib/presentation";

/** Base shape fed to the scene choreographer. `slot` is the 800×1100 invitation
 * rectangle on a 2400×1400 stage; everything outside the slot is the frame the
 * host chose for that scene. */
export type SceneSlot = {
  slot: { x: number; y: number; w: number; h: number };
  box: { x: number; y: number; w: number; h: number };
  stage: { w: number; h: number };
};

/** True when a layer lives inside the invitation slot. */
export function isInsideSlot(layer: SceneLayer, slot: SceneSlot["slot"]): boolean {
  return (
    layer.x >= slot.x - 0.5 &&
    layer.y >= slot.y - 0.5 &&
    layer.x + layer.w <= slot.x + slot.w + 0.5 &&
    layer.y + layer.h <= slot.y + slot.h + 0.5
  );
}

/** Scale to map a layer's box into the 800×1100 invitation slot, keeping
 * proportions: the slot is the same size as the page it belongs to, so no
 * extra scale is needed beyond the frame's own.
 *
 * @param layer - the layer bounds in stage pixels
 * @param slot - the 800×1100 invitation rectangle
 * @returns the px/800 scaling factor. On the 2400×1400 stage this is 1/3 for
 * the slot box (800 wide) and 1100/1400 tall (extra vertical letterbox), so
 * height is the binding constraint and layers flush to top/bottom are not
 * squashed.
 */
export function slotScale(layer: SceneLayer, slot: SceneSlot["slot"]): number {
  const stageScaleX = 800 / slot.w;
  const stageScaleY = 1100 / slot.h;
  return Math.min(stageScaleX, stageScaleY);
}

/** Fit a layer's box into the invitation slot while preserving its aspect.
 *
 * @param layer - the layer bounds in stage pixels
 * @param slot - the 800×1100 invitation rectangle
 * @returns fitted bounds (px), centred inside the slot
 */
export function fitSlotBox(
  layer: SceneLayer,
  slot: SceneSlot["slot"],
): { x: number; y: number; w: number; h: number } {
  const stageScaleX = 800 / slot.w;
  const stageScaleY = 1100 / slot.h;
  const scale = Math.min(stageScaleX, stageScaleY);
  const w = layer.w * scale;
  const h = layer.h * scale;
  return {
    x: slot.x + (slot.w - w) / 2,
    y: slot.y + (slot.h - h) / 2,
    w,
    h,
  };
}

/** Origin of the invitation slot in stage coordinates, used for hit testing
 * and for the coordinate-based layer transforms in presentation.ts.
 *
 * @param stage - the full stage size
 * @returns { x, y } of the slot's top-left corner in stage px
 */
export function slotOrigin(stage: SceneSlot["stage"]): { x: number; y: number } {
  return { x: (stage.w - 800) / 2, y: (stage.h - 1100) / 2 };
}
