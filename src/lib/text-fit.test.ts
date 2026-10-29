import { describe, it, expect } from "vitest";
import type { DesignElement } from "./design";
import {
  growBoxPatch,
  overflowExcess,
  shrinkFontSize,
  textOverflows,
  tightenLineHeight,
  type TextOverflow,
} from "./text-fit";

function makeText(overrides: Partial<DesignElement> = {}): DesignElement {
  return {
    id: "text-1",
    kind: "text",
    name: "Names",
    x: 100,
    y: 200,
    w: 500,
    h: 150,
    rotation: 0,
    opacity: 1,
    locked: false,
    hidden: false,
    text: "Alexandra & Omar",
    font: "cormorant-garamond",
    fontSize: 48,
    fontWeight: 400,
    italic: false,
    letterSpacing: 0.02,
    lineHeight: 1.2,
    align: "center",
    color: "#161616",
    ...overrides,
  } as DesignElement;
}

/** A box with 10 px padding and no border, holding whatever content we give it. */
function measure(
  contentW: number,
  contentH: number,
  availableW = 500,
  availableH = 150,
): TextOverflow {
  return {
    contentW,
    contentH,
    availableW,
    availableH,
    chromeW: 20,
    chromeH: 20,
  };
}

describe("textOverflows", () => {
  it("reports the axes that genuinely clip", () => {
    expect(textOverflows(measure(480, 140))).toBe(false);
    expect(textOverflows(measure(480, 160))).toBe(true);
    expect(textOverflows(measure(520, 140))).toBe(true);
  });

  it("ignores sub-pixel measurement noise", () => {
    expect(textOverflows(measure(500.3, 150.4))).toBe(false);
    expect(textOverflows(measure(500.6, 150.6))).toBe(true);
  });

  it("states the shortfall per axis", () => {
    expect(overflowExcess(measure(530, 180))).toEqual({ w: 30, h: 30 });
    expect(overflowExcess(measure(480, 140))).toEqual({ w: 0, h: 0 });
  });
});

describe("growBoxPatch", () => {
  it("grows only the axis that overflows, chrome included", () => {
    const element = makeText();
    // 20 px too tall: the box must grow by the content plus its padding.
    expect(growBoxPatch(element, measure(480, 170))).toEqual({ h: 190 });
    // 40 px too wide: the width grows, the height is left alone.
    expect(growBoxPatch(element, measure(540, 140))).toEqual({ w: 560 });
    expect(growBoxPatch(element, measure(560, 180))).toEqual({ w: 580, h: 200 });
  });

  it("changes nothing when the text fits", () => {
    expect(growBoxPatch(makeText(), measure(480, 140))).toEqual({});
  });
});

describe("shrinkFontSize", () => {
  it("scales the size down to what fits, to a half point", () => {
    // Half the height available → just under half the size, with margin.
    expect(shrinkFontSize(makeText({ fontSize: 48 }), measure(480, 300, 500, 150))).toBe(
      23.5,
    );
  });

  it("uses the tighter of the two axes", () => {
    // Width needs 0.5 of the size, height only 0.8 — width decides.
    const size = shrinkFontSize(
      makeText({ fontSize: 40 }),
      measure(900, 120, 500, 150),
    );
    expect(size).not.toBeNull();
    // 40 px at a width ratio of 500/900, with the 2% margin, rounded down.
    expect(size).toBe(21.5);
  });

  it("offers nothing when the text already fits", () => {
    expect(shrinkFontSize(makeText({ fontSize: 48 }), measure(480, 140))).toBeNull();
  });

  it("never proposes a size below the readable floor", () => {
    const size = shrinkFontSize(
      makeText({ fontSize: 12 }),
      measure(480, 4000, 500, 150),
    );
    expect(size).toBeNull();
  });
});

describe("tightenLineHeight", () => {
  it("tightens the leading just enough for the same words", () => {
    const next = tightenLineHeight(
      makeText({ lineHeight: 1.7 }),
      measure(480, 300, 500, 150),
    );
    expect(next).not.toBeNull();
    expect(next!).toBeGreaterThanOrEqual(0.8);
    expect(next!).toBeLessThan(1.7);
  });

  it("keeps manual line breaks: only the leading number changes", () => {
    const element = makeText({ lineHeight: 1.6, text: "Alexandra\n& Omar" });
    const next = tightenLineHeight(element, measure(480, 300));
    expect(next).not.toBeNull();
    expect(element.text).toBe("Alexandra\n& Omar");
  });

  it("offers nothing when the leading is already tight or the text fits", () => {
    expect(
      tightenLineHeight(makeText({ lineHeight: 0.8 }), measure(480, 300)),
    ).toBeNull();
    expect(
      tightenLineHeight(makeText({ lineHeight: 1.4 }), measure(480, 140)),
    ).toBeNull();
  });
});
