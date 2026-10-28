import bodyLayer from "@/assets/opening/body.png";
import envGround from "@/assets/opening/env-ground.jpg";
import envScene from "@/assets/opening/env-scene.jpg";
import shellMask from "@/assets/opening/env-shell-mask.png";
import flapLayer from "@/assets/opening/flap.png";
import interiorLayer from "@/assets/opening/interior.png";
import linerLayer from "@/assets/opening/liner.png";
import revealCardArt from "@/assets/opening/reveal-card.jpg";
import revealFrameArt from "@/assets/opening/reveal-frame.png";
import sealArtwork from "@/assets/opening/seal.png";
import sealLeftArt from "@/assets/opening/seal-left.png";
import sealRightArt from "@/assets/opening/seal-right.png";
import wallLayer from "@/assets/opening/wall.png";

/**
 * The reference artwork the opening is built from.
 *
 * Every layer was cut from the supplied envelope reference (`meta.json`:
 * 735 × 513), so all of them share one coordinate system — the *scene* space
 * below. The renderer scales that scene to the artboard width, which keeps the
 * reference's landscape proportions instead of stretching them into a box.
 *
 * Scene layout, measured from the artwork itself:
 *
 * - `scene`      the complete reference: what a closed envelope looks like.
 * - `ground`     the same photograph with the envelope removed — the stage.
 * - `interior`   scene rows 116…513, opaque: the pocket with the flap gone.
 * - `flap`       scene rows 0…124: the flap's top band (fold wedges + edge).
 * - `body`       the envelope cut out of the scene, rows 89…428.
 * - `wall`       scene rows 307…513: the detail sitting at the flap's tip.
 * - `liner`      the tissue printed on the underside of the flap.
 * - `seal*`      the pressed wax seal and its two fracture halves.
 * - `shellMask`  the envelope silhouette, used for its contact shadow.
 * - `reveal*`    the card the invitation is printed on, front and frame.
 */
export const OPENING_REFERENCE = {
  /** The reference artwork's own pixel space. */
  scene: { w: 735, h: 513 },
  /** The board the scene is scaled onto: the artboard, one scene wide. */
  board: { w: 1000, h: 698 },
  /** Artboard pixels per reference pixel. */
  scale: 1000 / 735,
  images: {
    scene: envScene,
    ground: envGround,
    mask: shellMask,
    interior: interiorLayer,
    wall: wallLayer,
    body: bodyLayer,
    flap: flapLayer,
    liner: linerLayer,
    seal: sealArtwork,
    sealLeft: sealLeftArt,
    sealRight: sealRightArt,
    revealFrame: revealFrameArt,
    revealCard: revealCardArt,
  },
  /** Where each band sits, in reference rows. */
  rows: {
    /** Top of the pocket interior band. */
    interior: 116,
    /** The band holding the detail at the flap's tip. */
    wall: 307,
    /** Top edge of the envelope — where the flap is hinged. */
    envelopeTop: 89,
    /** The point of the flap: the wax sits just above it. */
    flapTip: 360,
    /** The full-height cut-out of the envelope. */
    body: 0,
    /** The flap's top band. */
    flap: 0,
    /** The tissue on the flap's underside. */
    liner: 0,
  },
  /** The wax seal: centre in reference space, drawn at this size. */
  seal: { cx: 367, cy: 316, size: 104 },
  /** The card: framed at 675 × 1200 in the reference set. */
  reveal: {
    w: 675,
    h: 1200,
    /** Where the printed card sits inside its frame (`meta.json`). */
    card: { x: 0.0756, y: 0.0025, w: 0.9141, h: 0.9967 },
  },
} as const;

/** Reference rows → artboard pixels. */
export const refY = (rows: number): number => rows * OPENING_REFERENCE.scale;
