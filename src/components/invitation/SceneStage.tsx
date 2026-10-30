import { cn } from "@/lib/utils";
import type { SceneLayer } from "@/lib/presentation";
import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import "@/scenes/tokens.css";
import "@/scenes/scenes.css";

export interface StageBox {
  width: number;
  height: number;
}

interface SceneStageProps {
  scene: SceneId;
  state: SceneState;
  /** Root size in CSS pixels; omit to measure the stage's own container. */
  box?: StageBox;
  reducedMotion?: boolean;
  /** Thumbnails render their finished composition without transitions. */
  staticPose?: boolean;
  /** The real invitation, fitted into the manifest's slot. */
  children?: (slot: { width: number; height: number }) => ReactNode;
  className?: string;
  "data-testid"?: string;
}

function containFit(box: StageBox): { width: number; height: number; left: number; top: number } {
  const aspect = STAGE.width / STAGE.height;
  let width = box.width;
  let height = width / aspect;
  if (height > box.height) {
    height = box.height;
    width = height * aspect;
  }
  return {
    width,
    height,
    left: (box.width - width) / 2,
    top: (box.height - height) / 2,
  };
}

/**
 * One scene's stage: the manifest's layers in manifest z-order, the real
 * invitation between them at the manifest's slot, and the choreography from
 * `presentation.ts` applied as poses + transitions on transform/opacity only.
 */
export function SceneStage({
  scene,
  state,
  box,
  reducedMotion = false,
  staticPose = false,
  children,
  className,
  ...rest
}: SceneStageProps) {
  const selfRef = useRef<HTMLDivElement | null>(null);
  const [selfBox, setSelfBox] = useState<StageBox | null>(null);

  useLayoutEffect(() => {
    if (box) return;
    const node = selfRef.current;
    if (!node) return;
    const measure = () =>
      setSelfBox({ width: node.clientWidth, height: node.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [box]);

  const size = box ?? selfBox;
  const stage = size && size.width > 0 && size.height > 0 ? containFit(size) : null;
  const k = stage ? stage.width / STAGE.width : 0;
  const meta = SCENES[scene];
  const layers = useMemo(() => sceneLayers(scene), [scene]);

  const slotIndex = layers.findIndex((layer) => layer.z > meta.slotZ);
  const before = slotIndex === -1 ? layers : layers.slice(0, slotIndex);
  const after = slotIndex === -1 ? [] : layers.slice(slotIndex);
  const slotWidth = stage ? (SLOT.pctWidth / 100) * stage.width : 0;
  const slotHeight = stage ? (SLOT.pctHeight / 100) * stage.height : 0;

  const renderLayer = (layer: SceneLayer) => {
    const plan = meta.layers[layer.name];
    const style: CSSProperties = {
      // tokens.css positions every plate through these four variables.
      ["--x" as string]: layer.x,
      ["--y" as string]: layer.y,
      ["--w" as string]: layer.svg ? STAGE.width : layer.w,
      ["--h" as string]: layer.svg ? STAGE.height : layer.h,
      zIndex: layer.z,
      ...(layer.blend === "screen" ? { mixBlendMode: "screen" as const } : {}),
      ...layerStyle(plan, state, k),
    };
    if (staticPose) {
      style.transition = "none";
      delete (style as Record<string, unknown>)["--td"];
      delete (style as Record<string, unknown>)["--te"];
      delete (style as Record<string, unknown>)["--tf"];
    }
    return (
      <div key={layer.name} className={cn("lamsa-layer", layer.svg && "lamsa-layer--gold")} style={style}>
        {layer.svg ? (
          <svg
            viewBox={`0 0 ${STAGE.width} ${STAGE.height}`}
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: layer.svg }}
          />
        ) : (
          <img
            className={cn("lamsa-art", plan?.idle)}
            src={layer.src}
            srcSet={layer.srcSet}
            sizes={
              stage
                ? `${Math.max(1, Math.round((layer.w / STAGE.width) * stage.width))}px`
                : undefined
            }
            alt=""
            draggable={false}
            decoding="async"
            loading={staticPose ? "lazy" : "eager"}
            style={plan?.idleDelay ? { animationDelay: `${plan.idleDelay}s` } : undefined}
          />
        )}
      </div>
    );
  };

  return (
    <div
      {...rest}
      ref={selfRef}
      className={cn("lamsa-stage", reducedMotion && "is-reduced", className)}
      data-state={state}
      data-scene={scene}
      style={{
        position: "absolute",
        inset: 0,
        background: meta.frame,
        ["--lamsa-k" as string]: k || 1,
        visibility: stage ? "visible" : "hidden",
      }}
    >
      {stage && (
        <div
          style={{
            position: "absolute",
            left: stage.left,
            top: stage.top,
            width: stage.width,
            height: stage.height,
          }}
        >
          {before.map((layer) => renderLayer(layer))}
          <div
            className="lamsa-slot"
            data-testid="invitation-slot"
            style={{
              zIndex: meta.slotZ,
              left: `${SLOT.pctLeft}%`,
              top: `${SLOT.pctTop}%`,
              width: `${SLOT.pctWidth}%`,
              height: `${SLOT.pctHeight}%`,
            }}
          >
            {children?.({ width: slotWidth, height: slotHeight })}
          </div>
          {after.map((layer) => renderLayer(layer))}
        </div>
      )}
    </div>
  );
}
