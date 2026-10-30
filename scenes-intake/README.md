# LAMSA – Invitation Presentation Scenes (asset pack for Freebuff)

Three physically-lit paper/silk scenes rendered as **separate transparent WebP layers** so each piece can be animated independently.
No invitation text, card, names or dates are baked in anywhere. The invitation slot is left empty in every scene.

## Conventions (all scenes)
- **Stage:** 2400 x 1600 (3:2). Everything is positioned in stage coordinates; scale the stage container responsively.
- **Invitation slot:** x=800, y=250, w=800, h=1100 (portrait 8:11). In percent of stage: left 33.3333%, top 15.625%, width 33.3333%, height 68.75%. Mount the real invitation there.
- **Files:** each layer is cropped to its content bounds. `manifest.json` gives `x,y,w,h` (stage px @2400 wide), `z`, `blend`, and a suggested `animation`. Position with `left/top/width/height` as % of the stage (see `tokens.css`, `.lamsa-layer` uses `--x --y --w --h`).
- **Two resolutions:** `name.webp` (half-res, 1200-wide stage, mobile) and `name@2x.webp` (full-res, 2400-wide stage, desktop/retina). Same aspect, same manifest coordinates. Use `srcset`/`<picture>` or pick by `devicePixelRatio`/viewport.
- **Backgrounds** (`bg.webp`) are opaque (no alpha); all other layers have alpha. Shadows are baked into each layer's own alpha, so they travel with the object. Do **not** add CSS drop-shadow on top.
- **Blend:** layers with `"blend":"screen"` are light layers; use `mix-blend-mode: screen`. Those are glow/rays/dust/sweep only.
- **Light direction:** key light from top-left everywhere. Never rotate layers more than ~8deg or the baked shading will feel wrong.
- **Performance:** animate only `transform` and `opacity`; keep `will-change` only on layers currently moving; stop idle loops when the scene is off-screen or `prefers-reduced-motion`. Layers are cropped to keep GPU memory low.
- **Gold SVGs** in `svg/` are crisp vector twins of the gold raster layers (same coordinates, viewBox 0 0 2400 1600). Use the SVG for stroke-draw animation (`pathLength` is set; animate `stroke-dashoffset`), or the WebP if you prefer one pipeline.
- **Guides** in `guides/` are dev-only overlays showing the slot. Do not ship them.
- **Previews** in `previews/` are flat composites of closed/open (or assembled/exploded) states for reference only. They are not assets.

## Assembly (generic)
```jsx
// minimal manifest-driven assembler (adapt to your component system)
import manifest from './manifest.json';
const scene = manifest.scenes['01-secret-world'];
<div className="lamsa-stage">
  {scene.filter(l=>l.z<SLOT_Z).map(renderLayer)}
  <div className="lamsa-slot">{/* real invitation */}</div>
  {scene.filter(l=>l.z>=SLOT_Z).map(renderLayer)}
</div>
// renderLayer(l): <img className="lamsa-layer" data-layer={l.name}
//   style={{'--x':l.x,'--y':l.y,'--w':l.w,'--h':l.h, mixBlendMode:l.blend==='screen'?'screen':undefined, zIndex:l.z}}
//   src={l.file} srcSet={`${l.file} 1x, ${l.file2x} 2x`} alt="" draggable={false}/>
```
`bg` has x=0,y=0,w=2400,h=1600 (full stage). Put `SLOT_Z` per scene (below).

---
## Scene 01 – The Secret World (`scenes/01-secret-world`)
Identity: symmetrical, architectural, dark and candlelit. Concentric paper arches recede into a glowing niche sealed by fluted ivory doors.
**Slot z = 5** (above bg+glow, below doors).

| z | layer | what it is | animation |
|---|---|---|---|
| 0 | bg | deep burgundy backdrop (opaque) | static |
| 1 | glow | warm light bloom, screen | opacity 0 -> 1 as doors open |
| 8 | door_left / door_right | fluted ivory doors, gold seam + inset hairline | translateX -58% / +58% (they slide behind the L6 frame), 1.6s cubic-bezier(.65,0,.25,1) |
| 22 | L6_deep_burgundy | innermost frame | entrance stagger first |
| 24 | L5_burgundy | | |
| 26 | L4_rose_burgundy | | |
| 27 | gold_hairlines | champagne inlay (also `svg/scene01_gold_arch_hairlines.svg`) | stroke draw-on after frames land |
| 28 | L3_blush | | |
| 30 | L2_ivory_warm | | |
| 32 | L1_ivory | outermost, front | stagger last |
| 60 | light_rays | volumetric beams, screen | fade in with glow, slow drift |
| 70 | dust | gold particles, screen | float up, breathe |
| 80 | vignette | edge darkening | static, pointer-events none |

Sequence: bg -> frames L6..L1 rise in (90ms stagger, 1.1s) -> gold draws (1.2s) -> pause (the "secret") -> doors open (1.6s) with glow + rays + dust fading in -> invitation fades from opacity 0.0 to 1 and scales 0.96 -> 1 at the slot as the doors pass 40%.
Frame idle parallax: L1 +-10px, L6 +-3px on pointer move.

## Scene 02 – Living Art (`scenes/02-living-art`)
Identity: asymmetrical, fluid, soft daylight studio. Burgundy silk drapes around sculpted ivory paper; a silk veil covers the invitation and lifts away.
**Slot z = 25** (above silk_back_sweep and paper sculptures, below the veil).

| z | layer | animation |
|---|---|---|
| 0 | bg (warm greige seamless, opaque) | static / 20s slow scale |
| 10 | silk_back_sweep | slow wave, skewX +-1.2deg |
| 20 / 21 | paper_sculpture_left / right | enter rotate(+-8deg) + translate, idle float |
| 30 | silk_veil | **reveal:** translateY(-115%) + skewX(-6deg) + scaleX(.88), 2.2s cubic-bezier(.6,0,.2,1), transform-origin 50% 0; then unmount |
| 40 / 41 | silk_front_left / right | enter from corners, idle sway |
| 50 | gold_thread | draw on once veil lifts (`svg/scene02_gold_thread.svg`) |
| 60 | light_sweep | breathe, screen |

Sequence: bg -> paper sculptures -> back silk -> veil drops in covering slot -> front silks sweep in -> hold -> veil lifts (with the front silks easing 40px outward) -> gold thread draws -> invitation is revealed (it sits behind the veil, so no extra fade is needed).
Note: silk layers are ~1560px (veil) and ~430px (ribbons) wide; idle motion must stay subtle (<=14px) or the baked highlights will look off.

## Scene 03 – The Impossible Invitation (`scenes/03-impossible-invitation`)
Identity: rectilinear, graphic, bright gallery light. A stepped paper monument of chamfered rings, fins, lintels and floating tabs assembles around the slot.
**Slot z = 5** (above bg, below R0).

| z | layer | animation |
|---|---|---|
| 0 | bg (stone, opaque) | static |
| 10,14,18,22,26 | R0_base_burgundy, R1_ivory, R2_champagne, R3_burgundy, R4_ivory | assemble from exploded: start scale 1.1-1.5 (outer to inner), rotate +-2.5deg, opacity 0; settle with 110ms stagger back->front |
| 30 | gold_inlay (`svg/scene03_gold_inlay.svg`) | draw-on / clip reveal |
| 40-44 | fin_L1..L5, fin_R1..R5 | slide in vertically from alternating directions; idle +-5px phase-offset |
| 50-53 | lintel_top, lintel_bottom, lintel_top_thin, lintel_bottom_thin | slide in from top/bottom with scaleX(.7) -> 1 |
| 60-63 | tab_1..4 | float toward viewer, strongest parallax (x1.6) |
| 70 | light_sweep | breathe, screen |

Sequence: bg -> rings from back to front (exploded -> assembled) -> fins & lintels slide in -> gold inlay draws -> tabs float in -> invitation fades in at slot with scale .97 -> 1. Disassembly is the exact reverse.

## Folder structure
```
manifest.json            stage, slot, every layer's bbox/z/blend/animation
tokens.css               palette, easing, layer positioning helpers
scenes/<scene>/layers/   *.webp (1x) and *@2x.webp
svg/                     vector gold accents
guides/                  dev-only slot overlays
previews/                reference composites (not for production)
```

## Palette
burgundy #2a0510 / #5a1426 / #7a1a2e, ivory #f2e9d8, champagne #d9bb7b, deep gold #a98446.

## Honest notes
- Everything was rendered procedurally (numpy/OpenCV physically-inspired lighting, normal-mapped paper and silk), not photographed or AI-generated. It has a clean, sculptural CG look; silk in particular is stylized. If you want photoreal fabric later, keep the same layer names/coordinates and swap files.
- The slot is intentionally empty; scene 01 `dust`, `light_rays` and `vignette` sit above the invitation and are subtle, but set them `opacity:.6` if they dull the real design.
