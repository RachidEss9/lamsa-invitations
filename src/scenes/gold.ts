import secretWorld from "./svg/scene01_gold_arch_hairlines.svg?raw";
import livingArt from "./svg/scene02_gold_thread.svg?raw";
import impossible from "./svg/scene03_gold_inlay.svg?raw";
import type { SceneId } from "@/lib/presentation";

/**
 * The pack's gold accents as inline SVG, ready for a true stroke draw-on.
 *
 * The three files share one gradient id (`g`), which would collide once they
 * sit in the same document, so each copy is namespaced. Only scene 02 ships a
 * `pathLength`, so the others receive one — then a single CSS rule animates
 * `stroke-dashoffset` for every scene with the manifest's rhythm.
 */

const GOLD_SOURCES: Record<SceneId, string> = {
  "secret-world": secretWorld,
  "living-art": livingArt,
  impossible,
};

function prepare(source: string, suffix: string): string {
  return source
    .replace(/ id="g"/g, ` id="gold-${suffix}"`)
    .replace(/url\(#g\)/g, `url(#gold-${suffix})`)
    .replace(/<path (?![^>]*pathLength)/g, '<path pathLength="1" ');
}

const PREPARED: Record<SceneId, string> = {
  "secret-world": prepare(GOLD_SOURCES["secret-world"], "s1"),
  "living-art": prepare(GOLD_SOURCES["living-art"], "s2"),
  impossible: prepare(GOLD_SOURCES.impossible, "s3"),
};

const LAYER_TO_FILE: Record<SceneId, Record<string, string>> = {
  "secret-world": { gold_hairlines: "s1" },
  "living-art": { gold_thread: "s2" },
  impossible: { gold_inlay: "s3" },
};

/** Prepared markup for a scene's gold layer, or null when it is not one. */
export function goldSvg(scene: SceneId, layerName: string): string | null {
  const suffix = LAYER_TO_FILE[scene]?.[layerName];
  return suffix ? PREPARED[scene] : null;
}
