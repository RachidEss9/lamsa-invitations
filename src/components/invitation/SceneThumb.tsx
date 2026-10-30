import { cn } from "@/lib/utils";
import { SceneStage } from "@/components/invitation/SceneStage";
import type { SceneId } from "@/lib/presentation";

/**
 * A scene's finished composition, rendered from the real layers — the same
 * stage guests will see, without an invitation in it. Used by the picker and
 * the studio's scene library.
 */
export function SceneThumb({
  scene,
  className,
  label,
}: {
  scene: SceneId;
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{ aspectRatio: "3 / 2" }}
      aria-hidden={label ? undefined : true}
    >
      <SceneStage scene={scene} state="revealed" staticPose />
      {label && <span className="sr-only">{label}</span>}
    </div>
  );
}
