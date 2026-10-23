import { describe, it, expect } from "vitest";
import type { CSSProperties } from "react";
import { pageTransitionFrames, PAGE_TRANSITIONS } from "./design";

const presets = PAGE_TRANSITIONS.map((transition) => transition.id);

function opacity(style: CSSProperties): number {
  return typeof style.opacity === "number" ? style.opacity : 1;
}

describe("page transitions", () => {
  it("holds both pages on screen so a change never blanks the frame", () => {
    for (const preset of presets) {
      if (preset === "none") continue;
      for (let step = 0; step <= 20; step += 1) {
        const frames = pageTransitionFrames(
          { preset, duration: 600 },
          step / 20,
        );
        const combined =
          opacity(frames.incoming) + opacity(frames.outgoing);
        expect(combined, `${preset} at ${step / 20}`).toBeGreaterThanOrEqual(0.98);
      }
    }
  });

  it("finishes with the incoming page fully in place", () => {
    for (const preset of presets) {
      const frames = pageTransitionFrames({ preset, duration: 600 }, 1);
      expect(opacity(frames.incoming), preset).toBeGreaterThanOrEqual(1);
      if (typeof frames.incoming.opacity === "number") {
        expect(frames.incoming.opacity, preset).toBe(1);
      }
      if (preset === "curtain") {
        expect(String(frames.incoming.clipPath)).toContain("0%");
      }
      const outgoingOpacity = frames.outgoing.opacity;
      expect(
        outgoingOpacity === 0 || frames.outgoing.visibility === "hidden",
        preset,
      ).toBe(true);
    }
  });

  it("names the outgoing page as non-interactive while it leaves", () => {
    for (const preset of presets) {
      const frames = pageTransitionFrames({ preset, duration: 600 }, 0.4);
      if (preset === "none") continue;
      expect(frames.outgoing.pointerEvents, preset).toBe("none");
    }
  });

  it("mirrors the slide and flip for right-to-left invitations", () => {
    const ltr = pageTransitionFrames({ preset: "slide", duration: 600 }, 0.15);
    const rtl = pageTransitionFrames(
      { preset: "slide", duration: 600 },
      0.15,
      { rtl: true },
    );
    expect(String(ltr.incoming.transform)).toContain("translateX(");
    const ltrValue = Number(
      String(ltr.incoming.transform).match(/translateX\((-?[\d.]+)%\)/)?.[1],
    );
    const rtlValue = Number(
      String(rtl.incoming.transform).match(/translateX\((-?[\d.]+)%\)/)?.[1],
    );
    expect(Math.sign(ltrValue)).toBe(-Math.sign(rtlValue));

    const ltrFlip = pageTransitionFrames({ preset: "flip", duration: 600 }, 0.2);
    expect(ltrFlip.incoming.transformOrigin).toBe("left center");
    const rtlFlip = pageTransitionFrames(
      { preset: "flip", duration: 600 },
      0.2,
      { rtl: true },
    );
    expect(rtlFlip.incoming.transformOrigin).toBe("right center");
  });

  it("opens the curtain from the leading edge in both directions", () => {
    const ltr = pageTransitionFrames({ preset: "curtain", duration: 600 }, 0.5);
    const rtl = pageTransitionFrames(
      { preset: "curtain", duration: 600 },
      0.5,
      { rtl: true },
    );
    expect(String(ltr.incoming.clipPath)).toContain("inset(0 ");
    expect(String(ltr.incoming.clipPath)).not.toBe(
      String(rtl.incoming.clipPath),
    );
  });
});
