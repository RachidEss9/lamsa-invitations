import manifest from "@/scenes/manifest.json";
import { goldSvg } from "@/scenes/gold";
import type { OpeningExperienceId } from "@/lib/design";

/**
 * The three presentation scenes, expressed as data.
 *
 * Placement, stacking and blend come straight from the supplied manifest —
 * nothing here guesses coordinates. Only the *choreography* is written out by
 * hand (the manifest carries it as prose in `animation` fields), following the
 * README's sequences: entrance poses, reveal poses and the timing/stagger the
 * pack documents for each layer.
 *
 * Everything is a pure value, so the stage is a renderer and this file can be
 * tested without a browser.
 */

export type SceneId = "secret-world" | "living-art" | "impossible";

export const SCENE_IDS: SceneId[] = ["secret-world", "living-art", "impossible"];

export const SCENE_MANIFEST_KEYS: Record<SceneId, string> = {
  "secret-world": "01-secret-world",
  "living-art": "02-living-art",
  impossible: "03-impossible-invitation",
};

/** Scene ids the picker offers; also the ids a design may store. */
export function isSceneId(value: unknown): value is SceneId {
  return typeof value === "string" && (SCENE_IDS as string[]).includes(value);
}

/** The design's saved experience, defaulting to the first scene. */
export function sceneFromExperience(experience: OpeningExperienceId): SceneId {
  return isSceneId(experience) ? experience : "secret-world";
}/* -------------------------------------------------------------------------- */
/* Manifest access                                                            */
type ManifestLayer = (typeof manifest.scenes)[keyof typeof manifest.scenes][number];

export interface SceneLayer extends ManifestLayer {
  /** Absolute path under public/. */
  src: string;
  srcSet?: string;
  /** Prepared markup for the gold layers, drawn as inline SVG strokes. */
  svg?: string;
}
export interface SceneLayer extends ManifestLayer {
  /** Absolute path under public/. */
  src: string;
  srcSet?: string;
  /** Prepared markup for the gold layers, drawn as inline SVG strokes. */
  svg?: string;
}

export interface SceneLayer extends ManifestLayer {
  /** Absolute path under public/. */
  src: string;
  srcSet?: string;
  /** Prepared markup for the gold layers, drawn as inline SVG strokes. */
  svg?: string;
}

const manifestKeyFor = (scene: SceneId) => SCENE_MANIFEST_KEYS[scene];

/** Every layer of a scene, in manifest (z) order, with asset paths resolved. */
export function sceneLayers(scene: SceneId): SceneLayer[] {
  const raw = manifest.scenes[manifestKeyFor(scene) as keyof typeof manifest.scenes] as ManifestLayer[];
  return [...raw]
    .sort((a, b) => a.z - b.z)
    .map((layer): SceneLayer => {
      const base = `/scenes/${manifestKeyFor(scene)}`;
      const inline = goldSvg(scene, layer.name);
      if (inline) return { ...layer, src: "", svg: inline } as SceneLayer;
      return {
        ...layer,
        src: `${base}/${layer.file}`,
        srcSet: `${base}/${layer.file} 1x, ${base}/${layer.file2x} 2x`,
      } as SceneLayer;
    });
}

/* -------------------------------------------------------------------------- */
/* Choreography                                                               */
/* -------------------------------------------------------------------------- */

export type SceneState = "pre" | "intro" | "closed" | "opening" | "revealed";

export interface TransformSpec {
  /** Stage pixels (2400-wide space); scaled by the live stage factor. */
  x?: number;
  y?: number;
  /** Percent of the layer's own box (the veil lifts by -115% of its height). */
  yPct?: number;
  rotate?: number;
  skewX?: number;
  /** Uniform scale. */
  scale?: number;
  /** Horizontal scale (the lintels assemble from a compressed state). */
  scaleX?: number;
}

export interface Pose {
  tr?: TransformSpec;
  opacity?: number;
  /** Stroke draw for the gold SVGs: 1 = undrawn, 0 = drawn. */
  draw?: number;
}

export interface Timing {
  dur: number;
  delay: number;
  ease: string;
}

export interface LayerPlan {
  /** Start pose for the entrance (played when a scene is chosen). */
  pre?: Pose;
  /** The closed state: arches shut, veil down, monument exploded. */
  closed?: Pose;
  /** The revealed state: the finished composition. */
  open?: Pose;
  /** Transition timing while the entrance plays (falls back to `reveal`). */
  enter?: Timing;
  /** Transition timing for the reveal — also used when reversing to closed. */
  reveal?: Timing;
  /** Separate opacity timing (the veil fades only at the end of its lift). */
  revealOpacity?: Timing;
  /** transform-origin, in CSS units of the layer box. */
  origin?: string;
  /** Idle loop class from scenes.css, played only in the revealed state. */
  idle?: string;
  /** Seconds of negative delay to offset an idle loop between twins. */
  idleDelay?: number;
}

export const EASE = {
  frames: "cubic-bezier(.2,.8,.2,1)",
  door: "var(--lamsa-ease-soft)",
  settle: "var(--lamsa-ease-out)",
  veil: "cubic-bezier(.6,0,.2,1)",
  silkIn: "cubic-bezier(.22,.9,.2,1)",
  out: "ease-out",
  inOut: "ease-in-out",
} as const;

/** The opacity ceiling for light layers that pass over the invitation. */
export const LIGHT_CAP = 0.6;

const scene1: Record<string, LayerPlan> = {
  glow: {
    closed: { opacity: 0 },
    open: { opacity: 1 },
    reveal: { dur: 1400, delay: 700, ease: EASE.out },
  },
  // Doors slide -/+58% of their own width (602 stage px => ~349 stage px)
  // and disappear behind the opaque frame layers.
  door_left: {
    closed: { tr: { x: 0 } },
    open: { tr: { x: -349 } },
    reveal: { dur: 1600, delay: 500, ease: EASE.door },
  },
  door_right: {
    closed: { tr: { x: 0 } },
    open: { tr: { x: 349 } },
    reveal: { dur: 1600, delay: 500, ease: EASE.door },
  },
  // Concentric arches rise in back-to-front: 90ms stagger, 1.1s each (README).
  L6_deep_burgundy: {
    pre: { tr: { y: 60, scale: 1.06 }, opacity: 0 },
    closed: {},
    enter: { dur: 1100, delay: 0, ease: EASE.frames },
  },
  L5_burgundy: {
    pre: { tr: { y: 60, scale: 1.06 }, opacity: 0 },
    closed: {},
    enter: { dur: 1100, delay: 90, ease: EASE.frames },
  },
  L4_rose_burgundy: {
    pre: { tr: { y: 60, scale: 1.06 }, opacity: 0 },
    closed: {},
    enter: { dur: 1100, delay: 180, ease: EASE.frames },
  },
  L3_blush: {
    pre: { tr: { y: 60, scale: 1.06 }, opacity: 0 },
    closed: {},
    enter: { dur: 1100, delay: 270, ease: EASE.frames },
  },
  L2_ivory_warm: {
    pre: { tr: { y: 60, scale: 1.06 }, opacity: 0 },
    closed: {},
    enter: { dur: 1100, delay: 360, ease: EASE.frames },
  },
  L1_ivory: {
    pre: { tr: { y: 60, scale: 1.06 }, opacity: 0 },
    closed: {},
    enter: { dur: 1100, delay: 450, ease: EASE.frames },
  },
  gold_hairlines: {
    // Drawn after the arches land (450 + 1100), bottom to top.
    pre: { draw: 1 },
    closed: { draw: 0 },
    enter: { dur: 1200, delay: 1550, ease: EASE.inOut },
  },
  light_rays: {
    closed: { opacity: 0 },
    open: { opacity: LIGHT_CAP },
    reveal: { dur: 1400, delay: 800, ease: EASE.out },
    idle: "idle-rays",
  },
  dust: {
    closed: { opacity: 0 },
    open: { opacity: LIGHT_CAP },
    reveal: { dur: 1600, delay: 900, ease: EASE.out },
    idle: "idle-dust",
  },
  vignette: {
    // Present from the first frame, held at the readability ceiling.
    pre: { opacity: LIGHT_CAP },
    closed: { opacity: LIGHT_CAP },
    open: { opacity: LIGHT_CAP },
  },
};

const scene1Invitation: LayerPlan = {
  pre: { opacity: 0, tr: { scale: 0.96 } },
  closed: { opacity: 0, tr: { scale: 0.96 } },
  open: { opacity: 1, tr: { scale: 1 } },
  // The invitation appears as the doors pass 40% of their travel.
  reveal: { dur: 900, delay: 1140, ease: EASE.out },
};

const scene2: Record<string, LayerPlan> = {
  silk_back_sweep: {
    pre: { opacity: 0, tr: { x: -80 } },
    closed: {},
    enter: { dur: 1600, delay: 300, ease: EASE.out },
    idle: "idle-silk-back",
  },
  paper_sculpture_left: {
    pre: { opacity: 0, tr: { rotate: -8, x: -120, y: 60 } },
    closed: {},
    enter: { dur: 1400, delay: 0, ease: EASE.out },
    idle: "idle-sculpt-l",
  },
  paper_sculpture_right: {
    pre: { opacity: 0, tr: { rotate: 8, x: 120, y: 60 } },
    closed: {},
    enter: { dur: 1400, delay: 0, ease: EASE.out },
    idle: "idle-sculpt-r",
    idleDelay: -2.5,
  },
  silk_veil: {
    pre: { tr: { yPct: -100 } },
    closed: {},
    open: { tr: { yPct: -115, skewX: -6, scaleX: 0.88 }, opacity: 0 },
    enter: { dur: 1400, delay: 1000, ease: EASE.out },
    reveal: { dur: 2200, delay: 700, ease: EASE.veil },
    // Slight opacity fade in the last 20% of the lift (README).
    revealOpacity: { dur: 440, delay: 2460, ease: EASE.out },
    origin: "50% 0",
  },
  silk_front_left: {
    pre: { opacity: 0, tr: { x: -260, y: 140, rotate: -6 } },
    closed: {},
    // Eases 40px outward while the veil lifts (README).
    open: { tr: { x: -40 } },
    enter: { dur: 1800, delay: 1600, ease: EASE.silkIn },
    reveal: { dur: 2200, delay: 700, ease: EASE.veil },
    idle: "idle-silk-front-l",
  },
  silk_front_right: {
    pre: { opacity: 0, tr: { x: 260, y: 140, rotate: 6 } },
    closed: {},
    open: { tr: { x: 40 } },
    enter: { dur: 1800, delay: 1600, ease: EASE.silkIn },
    reveal: { dur: 2200, delay: 700, ease: EASE.veil },
    idle: "idle-silk-front-r",
    idleDelay: -1.8,
  },
  gold_thread: {
    // Draws once the veil has lifted away (lift ends at 2900; start near it).
    pre: { draw: 1 },
    closed: { draw: 1 },
    open: { draw: 0 },
    reveal: { dur: 1400, delay: 2300, ease: EASE.inOut },
  },
  light_sweep: {
    // Soft window light, capped so it never dulls the invitation beneath it.
    pre: { opacity: LIGHT_CAP },
    closed: { opacity: LIGHT_CAP },
    open: { opacity: LIGHT_CAP },
    idle: "idle-sweep-2",
  },
};

const scene2Invitation: LayerPlan = {
  // Hidden while the veil drops in; revealed the moment the lift begins —
  // it sits behind the veil, so no extra fade of its own is needed.
  pre: { opacity: 0 },
  closed: { opacity: 0 },
  open: { opacity: 1 },
  reveal: { dur: 200, delay: 0, ease: "linear" },
};

const ringPlans: Record<string, LayerPlan> = {
  // `pre` is the assembled composition: choosing scene three plays the
  // disassembly into the exploded start, then the reveal assembles it again.
  R0_base_burgundy: {
    pre: {},
    closed: { tr: { scale: 1.5, rotate: 2.5 } },
    enter: { dur: 800, delay: 0, ease: EASE.settle },
    reveal: { dur: 1300, delay: 0, ease: EASE.settle },
  },
  R1_ivory: {
    pre: {},
    closed: { tr: { scale: 1.4, rotate: -2.5 } },
    enter: { dur: 800, delay: 70, ease: EASE.settle },
    reveal: { dur: 1300, delay: 110, ease: EASE.settle },
  },
  R2_champagne: {
    pre: {},
    closed: { tr: { scale: 1.3, rotate: 2.5 } },
    enter: { dur: 800, delay: 140, ease: EASE.settle },
    reveal: { dur: 1300, delay: 220, ease: EASE.settle },
  },
  R3_burgundy: {
    pre: {},
    closed: { tr: { scale: 1.2, rotate: -2.5 } },
    enter: { dur: 800, delay: 210, ease: EASE.settle },
    reveal: { dur: 1300, delay: 330, ease: EASE.settle },
  },
  R4_ivory: {
    pre: {},
    closed: { tr: { scale: 1.1, rotate: 2.5 } },
    enter: { dur: 800, delay: 280, ease: EASE.settle },
    reveal: { dur: 1300, delay: 440, ease: EASE.settle },
  },
};

// Fins: manifest gives per-fin entry offsets and delays; disassembly runs the
// stagger backwards, so the last piece in is the first piece out.
const finSpecs: [string, number, number][] = [
  ["fin_L1", -420, 500],
  ["fin_R1", -420, 545],
  ["fin_L2", 480, 590],
  ["fin_R2", 480, 635],
  ["fin_L3", -540, 680],
  ["fin_R3", -540, 725],
  ["fin_L4", 600, 770],
  ["fin_R4", 600, 815],
  ["fin_L5", -660, 860],
  ["fin_R5", -660, 905],
];
const finPlans: Record<string, LayerPlan> = Object.fromEntries(
  finSpecs.map(([name, y, delay], index) => [
    name,
    {
      pre: {},
      closed: { tr: { y } },
      enter: { dur: 700, delay: (finSpecs.length - 1 - index) * 45, ease: EASE.settle },
      reveal: { dur: 1200, delay, ease: EASE.settle },
      idle: "idle-fin",
      // Pairs share a phase: L1/R1 at 0s, L2/R2 at -0.7s, and so on (manifest).
      idleDelay: -0.7 * Math.floor(index / 2),
    } satisfies LayerPlan,
  ]),
);

const lintelPlans: Record<string, LayerPlan> = {
  lintel_top: {
    pre: {},
    closed: { tr: { y: -260, scaleX: 0.7 } },
    enter: { dur: 750, delay: 135, ease: EASE.settle },
    reveal: { dur: 1100, delay: 900, ease: EASE.settle },
  },
  lintel_bottom: {
    pre: {},
    closed: { tr: { y: 260, scaleX: 0.7 } },
    enter: { dur: 750, delay: 90, ease: EASE.settle },
    reveal: { dur: 1100, delay: 980, ease: EASE.settle },
  },
  lintel_top_thin: {
    pre: {},
    closed: { tr: { y: -200 } },
    enter: { dur: 750, delay: 45, ease: EASE.settle },
    reveal: { dur: 1100, delay: 1000, ease: EASE.settle },
  },
  lintel_bottom_thin: {
    pre: {},
    closed: { tr: { y: 200 } },
    enter: { dur: 750, delay: 0, ease: EASE.settle },
    reveal: { dur: 1100, delay: 1060, ease: EASE.settle },
  },
};

const tabSpecs: [string, number, number][] = [
  ["tab_1", -1, -1],
  ["tab_2", 1, 1],
  ["tab_3", 1, -1],
  ["tab_4", -1, 1],
];
const tabPlans: Record<string, LayerPlan> = Object.fromEntries(
  tabSpecs.map(([name, sx, sy]) => [
    name,
    {
      pre: {},
      closed: { tr: { x: 30 * sx, y: 20 * sy, scale: 1.15 } },
      enter: { dur: 800, delay: 0, ease: EASE.settle },
      reveal: { dur: 1400, delay: 1100, ease: EASE.settle },
    } satisfies LayerPlan,
  ]),
);

const scene3: Record<string, LayerPlan> = {
  ...ringPlans,
  gold_inlay: {
    pre: { draw: 1 },
    closed: { draw: 1 },
    open: { draw: 0 },
    reveal: { dur: 1200, delay: 1500, ease: EASE.inOut },
  },
  ...finPlans,
  ...lintelPlans,
  ...tabPlans,
  light_sweep: {
    pre: { opacity: LIGHT_CAP },
    closed: { opacity: LIGHT_CAP },
    open: { opacity: LIGHT_CAP },
    idle: "idle-sweep-3",
  },
};

const scene3Invitation: LayerPlan = {
  pre: { opacity: 0, tr: { scale: 0.97 } },
  closed: { opacity: 0, tr: { scale: 0.97 } },
  open: { opacity: 1, tr: { scale: 1 } },
  // The invitation settles last, once the monument has assembled (README).
  reveal: { dur: 700, delay: 2600, ease: EASE.out },
};

export interface SceneMeta {
  id: SceneId;
  title: string;
  blurb: string;
  /** Slot stacking position from the README/manifest, per scene. */
  slotZ: number;
  /** Letterbox colour measured from the scene's own background layer. */
  frame: string;
  layers: Record<string, LayerPlan>;
  invitation: LayerPlan;
}

export const SCENES: Record<SceneId, SceneMeta> = {
  "secret-world": {
    id: "secret-world",
    title: "The Secret World",
    blurb: "Concentric arches part around a candlelit niche",
    slotZ: 5,
    frame: "#170309",
    layers: scene1,
    invitation: scene1Invitation,
  },
  "living-art": {
    id: "living-art",
    title: "Living Art",
    blurb: "A silk veil lifts from the invitation",
    slotZ: 25,
    frame: "#968576",
    layers: scene2,
    invitation: scene2Invitation,
  },
  impossible: {
    id: "impossible",
    title: "The Impossible Invitation",
    blurb: "A paper monument assembles around the card",
    slotZ: 5,
    frame: "#c1b2a0",
    layers: scene3,
    invitation: scene3Invitation,
  },
};

/* -------------------------------------------------------------------------- */
/* Pose / timing resolution                                                   */
/* -------------------------------------------------------------------------- */

const REST: Pose = {};

function poseFor(plan: LayerPlan | undefined, state: SceneState): Pose {
  if (!plan) return REST;
  switch (state) {
    case "pre":
      return plan.pre ?? plan.closed ?? REST;
    case "intro":
    case "closed":
      return plan.closed ?? REST;
    case "opening":
    case "revealed":
      return plan.open ?? REST;
  }
}

/**
 * The transition each layer should carry in the current state. `pre` snaps
 * (so an entrance can start from its first frame); `intro` plays the entrance;
 * every other state uses the reveal timing, which also reverses cleanly when
 * the guest returns to the closed state.
 */
function timingFor(plan: LayerPlan | undefined, state: SceneState): Timing | undefined {
  if (!plan) return undefined;
  if (state === "pre") return undefined;
  if (state === "intro") return plan.enter ?? plan.reveal;
  return plan.reveal ?? plan.enter;
}

/** Compose a transform with stage-pixel values scaled into the live stage. */
export function composeTransform(tr: TransformSpec | undefined, k: number): string | undefined {
  if (!tr) return undefined;
  const parts: string[] = [];
  const x = (tr.x ?? 0) * k;
  const y = (tr.y ?? 0) * k;
  if (x !== 0 || y !== 0) parts.push(`translate(${round(x)}px, ${round(y)}px)`);
  if (tr.yPct) parts.push(`translateY(${tr.yPct}%)`);
  if (tr.rotate) parts.push(`rotate(${tr.rotate}deg)`);
  if (tr.skewX) parts.push(`skewX(${tr.skewX}deg)`);
  if (tr.scaleX != null && tr.scaleX !== 1) {
    parts.push(`scale(${tr.scaleX}, ${tr.scale ?? 1})`);
  } else if (tr.scale && tr.scale !== 1) {
    parts.push(`scale(${tr.scale})`);
  }
  return parts.length ? parts.join(" ") : undefined;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export interface ResolvedLayerStyle {
  transform?: string;
  opacity?: number;
  transition?: string;
  transformOrigin?: string;
  ["--draw"]?: number | string;
  ["--td"]?: string;
  ["--te"]?: string;
  ["--tf"]?: string;
}

/**
 * The inline style for one layer plate in a given state: its pose, plus the
 * transition that carries it there. The gold SVGs read the timing vars to
 * stroke-draw their paths with the exact same rhythm.
 */
export function layerStyle(
  plan: LayerPlan | undefined,
  state: SceneState,
  k: number,
): ResolvedLayerStyle {
  const style: ResolvedLayerStyle = {};
  const pose = poseFor(plan, state);
  const transform = composeTransform(pose.tr, k);
  if (transform) style.transform = transform;
  if (pose.opacity != null) style.opacity = pose.opacity;
  if (pose.draw != null) style["--draw"] = pose.draw;
  if (plan?.origin) style.transformOrigin = plan.origin;

  const timing = timingFor(plan, state);
  if (timing) {
    // The veil's opacity fades only while it lifts; on the way back down it
    // rides the same timing as its transform.
    const opacity =
      plan?.revealOpacity && (state === "opening" || state === "revealed")
        ? plan.revealOpacity
        : timing;
    style.transition =
      `transform ${timing.dur}ms ${timing.ease} ${timing.delay}ms, ` +
      `opacity ${opacity.dur}ms ${opacity.ease} ${opacity.delay}ms`;
    style["--td"] = `${timing.dur}ms`;
    style["--te"] = timing.ease;
    style["--tf"] = `${timing.delay}ms`;
  }
  return style;
}

/** Longest single layer motion in a state, i.e. when the state is settled. */
function settleEnd(plans: LayerPlan[], phase: "enter" | "reveal"): number {
  let end = 0;
  for (const plan of plans) {
    const timing = phase === "enter" ? (plan.enter ?? plan.reveal) : plan.reveal;
    if (timing) end = Math.max(end, timing.delay + timing.dur);
    if (phase === "reveal" && plan.revealOpacity) {
      end = Math.max(end, plan.revealOpacity.delay + plan.revealOpacity.dur);
    }
  }
  return end;
}

const BUFFER = 300;

export function sceneDurations(scene: SceneId): { enter: number; reveal: number } {
  const meta = SCENES[scene];
  const plans = [...Object.values(meta.layers), meta.invitation];
  return {
    enter: Math.max(settleEnd(plans.filter((p) => p.enter), "enter"), 400) + BUFFER,
    reveal: Math.max(settleEnd(plans.filter((p) => p.reveal), "reveal"), 400) + BUFFER,
  };
}

/** The hold between the closed state and an auto-started reveal. */
export const AUTO_HOLD_MS = 400;
/** The crossfade from the presentation into the real invitation. */
export const HANDOFF_MS = 450;

/* -------------------------------------------------------------------------- */
/* Interaction labels                                                         */
/* -------------------------------------------------------------------------- */

export const OPEN_LABEL = "Open the invitation";
export const CONTINUE_LABEL = "Continue";
export const REPLAY_LABEL = "Replay";
export const CLOSED_LABEL = "Back to closed";
