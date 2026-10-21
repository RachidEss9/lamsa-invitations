import type { RevealEffect, ShapeKind } from "@/lib/design";
import type { MotifId } from "@/lib/invitation";

export type RevealPresetTarget = "selected" | "message" | "details" | "photo";

export interface RevealPreset {
  id: string;
  name: string;
  note: string;
  category: "Romantic" | "Playful" | "Photographic" | "Classic";
  effect: RevealEffect;
  direction: "left" | "right" | "up" | "down";
  duration: number;
  hint: string;
  target: RevealPresetTarget;
  cover:
    | {
        kind: "shape";
        shape: ShapeKind;
        fillToken: "accent" | "ink" | "paper";
        strokeToken?: "accent" | "ink" | "paper";
        strokeWidth?: number;
        radius?: number;
      }
    | {
        kind: "motif";
        motif: MotifId;
        colorToken: "accent" | "ink";
      };
}

export const REVEAL_PRESETS: RevealPreset[] = [
  {
    id: "heart-message",
    name: "Heart cover",
    note: "A heart lifts away to reveal a personal message.",
    category: "Romantic",
    effect: "fadeAway",
    direction: "up",
    duration: 900,
    hint: "Tap the heart",
    target: "message",
    cover: { kind: "shape", shape: "heart", fillToken: "accent" },
  },
  {
    id: "seal-note",
    name: "Seal & note",
    note: "A star seal breaks to show a hidden note.",
    category: "Classic",
    effect: "flip",
    direction: "left",
    duration: 1000,
    hint: "Break the seal",
    target: "message",
    cover: { kind: "motif", motif: "star", colorToken: "accent" },
  },
  {
    id: "photo-arch",
    name: "Arch photo mask",
    note: "An arch lifts off the selected photograph.",
    category: "Photographic",
    effect: "wipe",
    direction: "up",
    duration: 1100,
    hint: "Lift the arch",
    target: "photo",
    cover: {
      kind: "shape",
      shape: "arch",
      fillToken: "accent",
      strokeToken: "paper",
      strokeWidth: 2,
    },
  },
  {
    id: "floral-details",
    name: "Floral cover",
    note: "A peony dissolves to reveal the event details.",
    category: "Romantic",
    effect: "dissolve",
    direction: "up",
    duration: 1200,
    hint: "Touch the peony",
    target: "details",
    cover: { kind: "motif", motif: "peony", colorToken: "accent" },
  },
  {
    id: "card-message",
    name: "Decorative card",
    note: "A framed card turns over to reveal a second message.",
    category: "Classic",
    effect: "flip",
    direction: "left",
    duration: 1000,
    hint: "Turn the card",
    target: "message",
    cover: {
      kind: "shape",
      shape: "rect",
      fillToken: "paper",
      strokeToken: "accent",
      strokeWidth: 2,
      radius: 2,
    },
  },
  {
    id: "tap-surprise",
    name: "Tap surprise",
    note: "A sunburst disappears on tap for a playful reveal.",
    category: "Playful",
    effect: "fadeAway",
    direction: "up",
    duration: 800,
    hint: "Tap for a surprise",
    target: "message",
    cover: { kind: "motif", motif: "sunburst", colorToken: "accent" },
  },
  {
    id: "ellipse-fade",
    name: "Fade-away disc",
    note: "A soft disc fades to show the details beneath.",
    category: "Classic",
    effect: "dissolve",
    direction: "up",
    duration: 1000,
    hint: "Reveal the details",
    target: "details",
    cover: { kind: "shape", shape: "ellipse", fillToken: "paper", strokeToken: "accent", strokeWidth: 1.5 },
  },
  {
    id: "wipe-note",
    name: "Wipe-away note",
    note: "A solid card wipes away to reveal a message.",
    category: "Classic",
    effect: "wipe",
    direction: "left",
    duration: 900,
    hint: "Wipe to read",
    target: "message",
    cover: { kind: "shape", shape: "rect", fillToken: "accent", radius: 0 },
  },
];
