import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DesignPageView } from "@/components/invitation/DesignPageView";
import { makeElement, type DesignPage } from "./design";

/**
 * Effects must reach the markup produced by the one renderer shared by the
 * studio, previews, the public invitation and the print capture. These tests
 * assert the actual style values rather than trusting the settings object.
 */

function pageWith(elements: DesignPage["elements"]): DesignPage {
  return { id: "page", name: "Page", background: "#faf6ec", elements };
}

function render(page: DesignPage): string {
  return renderToStaticMarkup(
    createElement(DesignPageView, { page, time: 100_000, imageUrls: {} }),
  );
}

describe("layer effect rendering", () => {
  it("draws a text drop shadow, gradient fill and glyph outline", () => {
    const text = makeElement("text", {
      id: "t1",
      name: "Names",
      text: "Amelia & Søren",
      x: 100,
      y: 100,
      w: 600,
      h: 200,
      color: "#710014",
      effects: {
        shadow: {
          enabled: true,
          color: "#161616",
          opacity: 0.3,
          blur: 20,
          distance: 10,
          angle: 90,
        },
        gradient: { enabled: true, from: "#710014", to: "#c3a469", angle: 90 },
        outline: { enabled: true, color: "#f2f1ed", width: 2 },
      },
    });
    const markup = render(pageWith([text]));

    expect(markup).toContain("drop-shadow(0px 10px 20px rgba(22, 22, 22, 0.3))");
    expect(markup).toContain("linear-gradient(90deg, #710014, #c3a469)");
    expect(markup).toContain("-webkit-text-fill-color:transparent");
    expect(markup).toContain("-webkit-text-stroke:2px #f2f1ed");
  });

  it("leaves text untouched when every effect is switched off", () => {
    const text = makeElement("text", {
      id: "t2",
      name: "Plain",
      text: "Plain wording",
      color: "#161616",
      effects: {
        shadow: {
          enabled: false,
          color: "#000000",
          opacity: 1,
          blur: 20,
          distance: 10,
          angle: 90,
        },
      },
    });
    const markup = render(pageWith([text]));
    expect(markup).not.toContain("drop-shadow");
    expect(markup).not.toContain("-webkit-text-stroke");
    expect(markup).toContain("Plain wording");
  });

  it("paints a shape with a gradient and an inset shadow", () => {
    const shape = makeElement("shape", {
      id: "s1",
      name: "Arch",
      shape: "rect",
      x: 100,
      y: 100,
      w: 400,
      h: 600,
      fill: "#f2f1ed",
      effects: {
        gradient: { enabled: true, from: "#710014", to: "#c3a469", angle: 90 },
        innerShadow: {
          enabled: true,
          color: "#161616",
          opacity: 0.4,
          blur: 8,
          distance: 4,
          angle: 90,
        },
      },
    });
    const markup = render(pageWith([shape]));

    expect(markup).toContain("<linearGradient");
    expect(markup).toContain('fill="url(#lamsa-gradient-clip-s1)"');
    expect(markup).toContain("inset 0px 4px 8px rgba(22, 22, 22, 0.4)");
  });

  it("does not add box effects to a vector frame", () => {
    const frame = makeElement("shape", {
      id: "f1",
      name: "Frame",
      shape: "rect",
      frameArt: "botanica",
      effects: {
        gradient: { enabled: true, from: "#710014", to: "#c3a469", angle: 90 },
      },
    });
    const markup = render(pageWith([frame]));
    expect(markup).not.toContain("lamsa-gradient-clip-f1");
    expect(markup).toContain("data-frame-art");
  });
});
