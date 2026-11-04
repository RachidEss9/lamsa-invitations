import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DesignPageView } from "@/components/invitation/DesignPageView";
import { makeElement, type DesignElement, type DesignPage } from "@/lib/design";
import { toggleVisibility } from "@/lib/visibility";

/**
 * Every output — studio canvas, guest page, print/PDF capture — renders
 * through DesignPageView. These tests check the markup those paths actually
 * produce, not just the settings object.
 */

function pageWith(elements: DesignElement[]): DesignPage {
  return { id: "page", name: "Page", background: "#faf6ec", elements };
}

function render(
  page: DesignPage,
  options: { editor?: boolean; showHidden?: boolean } = {},
): string {
  return renderToStaticMarkup(
    createElement(DesignPageView, {
      page,
      time: 100_000,
      imageUrls: {},
      ...options,
    }),
  );
}

function layer(id: string, kind: DesignElement["kind"], extra: Partial<DesignElement> = {}) {
  return makeElement(kind, {
    id,
    name: id,
    x: 40,
    y: 40,
    w: 400,
    h: 120,
    hidden: false,
    ...extra,
  });
}

describe("hidden layers and the render pipeline", () => {
  it("removes a hidden text layer from guest markup but keeps it in the document", () => {
    const text = layer("headline", "text", {
      text: "Amelia & Søren",
      fontSize: 48,
      color: "#161616",
    });
    const elements = toggleVisibility([text], "headline");

    expect(elements[0].hidden).toBe(true);
    const guest = render(pageWith(elements));
    expect(guest).not.toContain('data-element-id="headline"');
    expect(guest).not.toContain("Amelia &amp; Søren");

    const shown = render(pageWith(toggleVisibility(elements, "headline")));
    expect(shown).toContain('data-element-id="headline"');
  });

  it("hides images, shapes and motifs from the same paths", () => {
    const layers = [
      layer("photo", "image"),
      layer("rule", "shape", { fill: "#710014" }),
      layer("sprig", "motif"),
    ];
    const hidden = [
      toggleVisibility([layers[0]], "photo")[0],
      toggleVisibility([layers[1]], "rule")[0],
      toggleVisibility([layers[2]], "sprig")[0],
    ];

    for (const element of hidden) {
      const markup = render(pageWith([element]));
      expect(markup).not.toContain(`data-element-id="${element.id}"`);
    }

    // Only the layer that was hidden disappears: its neighbours stay.
    const mixed = render(pageWith([layers[0], hidden[1], layers[2]]));
    expect(mixed).toContain('data-element-id="photo"');
    expect(mixed).not.toContain('data-element-id="rule"');
    expect(mixed).toContain('data-element-id="sprig"');
  });

  it("does not draw hidden layers in the studio unless ghosting is switched on", () => {
    const elements = toggleVisibility([layer("title", "text", { text: "Hello" })], "title");

    expect(render(pageWith(elements), { editor: true })).not.toContain(
      'data-element-id="title"',
    );
    expect(render(pageWith(elements), { editor: true, showHidden: false })).not.toContain(
      'data-element-id="title"',
    );

    const ghosted = render(pageWith(elements), { editor: true, showHidden: true });
    expect(ghosted).toContain('data-element-id="title"');
    // The ghost is faint (25%) even though the entrance animation carries its
    // own inline opacity, and it says what it is.
    expect(ghosted).toContain("opacity:0.25");
    expect(ghosted).toContain(">Hidden</span>");
  });

  it("keeps the print path clean: hidden layers are absent from export markup", () => {
    const elements = [
      layer("kept", "text", { text: "Kept" }),
      ...toggleVisibility([layer("dropped", "shape")], "dropped"),
    ];
    // The print dialog renders DesignPageView exactly like this: no editor.
    const markup = render(pageWith(elements));
    expect(markup).toContain('data-element-id="kept"');
    expect(markup).not.toContain('data-element-id="dropped"');
  });
});
