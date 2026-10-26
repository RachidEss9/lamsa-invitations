import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DesignPageView } from "@/components/invitation/DesignPageView";
import { makeElement, type DesignPage } from "./design";
import { materialForPreset } from "./materials";

/**
 * A finish has to reach the markup of the one renderer the studio canvas, the
 * previews, the public invitation and the print capture all share — and it has
 * to disappear from that same markup the moment the card is shown as artwork.
 * These tests assert the real style values rather than trusting the settings.
 */

function pageWith(
  elements: DesignPage["elements"],
  page: Partial<DesignPage> = {},
): DesignPage {
  return { id: "page", name: "Page", background: "#faf6ec", elements, ...page };
}

function render(
  page: DesignPage,
  materialPreview = true,
  imageUrls: Record<string, string> = {},
): string {
  return renderToStaticMarkup(
    createElement(DesignPageView, {
      page,
      time: 100_000,
      imageUrls,
      materialPreview,
    }),
  );
}

describe("material rendering", () => {
  it("lays a finish over a boxed shape, inside the layer's own isolation", () => {
    const panel = makeElement("shape", {
      id: "s1",
      name: "Panel",
      shape: "rect",
      x: 100,
      y: 100,
      w: 400,
      h: 600,
      radius: 20,
      fill: "#f2f1ed",
      material: materialForPreset("gold"),
    });
    const markup = render(pageWith([panel]));

    expect(markup).toContain("data:image/svg+xml");
    expect(markup).toContain("mix-blend-mode:hard-light");
    expect(markup).toContain("background-repeat:repeat");
    expect(markup).toContain("isolation:isolate");
    // Boxed forms clip with the radius the vector itself is drawn with.
    expect(markup).toContain("border-radius:80.00px / 120.00px");
  });

  it("clips a vector silhouette through its own published clip path", () => {
    const heart = makeElement("shape", {
      id: "s2",
      name: "Heart",
      shape: "heart",
      x: 100,
      y: 100,
      w: 400,
      h: 600,
      material: { ...materialForPreset("linen"), scale: 2 },
    });
    const markup = render(pageWith([heart]));

    expect(markup).toContain("clip-path:url(#clip-s2-box)");
    // The path is published in the layer's pixel space, not the 0–100 view box.
    expect(markup).toContain('clipPathUnits="userSpaceOnUse"');
    expect(markup).toContain('id="clip-s2-box"');
    expect(markup).toContain('transform="scale(4 6)"');
    expect(markup).toContain("background-size:320px 320px");
  });

  it("draws the page's finish under the artwork", () => {
    const markup = render(
      pageWith([], { material: materialForPreset("cotton") }),
    );
    expect(markup).toContain("data:image/svg+xml");
    expect(markup).toContain("mix-blend-mode:soft-light");
  });

  it("renders nothing of a finish in Artwork / Print mode", () => {
    const panel = makeElement("shape", {
      id: "s3",
      name: "Panel",
      shape: "rect",
      x: 100,
      y: 100,
      w: 400,
      h: 600,
      fill: "#f2f1ed",
      material: materialForPreset("gold"),
    });
    const markup = render(
      pageWith([panel], { material: materialForPreset("linen") }),
      false,
    );

    expect(markup).not.toContain("data:image/svg+xml");
    expect(markup).not.toContain("mix-blend-mode:hard-light");
    expect(markup).not.toContain("clip-path");
    // The artwork itself is still drawn, untouched.
    expect(markup).toContain("clip-s3");
  });

  it("switches a finish off without touching the layer", () => {
    const panel = makeElement("shape", {
      id: "s4",
      name: "Panel",
      shape: "rect",
      x: 100,
      y: 100,
      w: 400,
      h: 600,
      fill: "#f2f1ed",
      material: { ...materialForPreset("linen"), enabled: false },
    });
    const markup = render(pageWith([panel]));
    expect(markup).not.toContain("data:image/svg+xml");
  });

  it("never dresses type, ornaments or rules the renderer cannot carry", () => {
    const text = makeElement("text", {
      id: "t1",
      name: "Names",
      text: "Amelia & Søren",
      material: materialForPreset("lace"),
    });
    const rule = makeElement("shape", {
      id: "s5",
      name: "Rule",
      shape: "line",
      material: materialForPreset("gold"),
    });
    const markup = render(pageWith([text, rule]));

    expect(markup).not.toContain("data:image/svg+xml");
    expect(markup).toContain("Amelia &amp; Søren");
  });

  it("reads embossing and debossing from opposite edges", () => {
    const emboss = makeElement("shape", {
      id: "s6",
      name: "Raised",
      shape: "rect",
      x: 0,
      y: 0,
      w: 400,
      h: 400,
      fill: "#f2f1ed",
      material: { ...materialForPreset("emboss"), relief: 0.8, softness: 0.5 },
    });
    const deboss = makeElement("shape", {
      id: "s7",
      name: "Pressed",
      shape: "rect",
      x: 0,
      y: 0,
      w: 400,
      h: 400,
      fill: "#f2f1ed",
      material: { ...materialForPreset("deboss"), relief: -0.8, softness: 0.5 },
    });

    const embossMarkup = render(pageWith([emboss]));
    const debossMarkup = render(pageWith([deboss]));
    // Stopped at the first comma, so each pattern only reads the leading
    // shadow: which edge the light falls on, not whether both are present.
    const lightFirst = /box-shadow:inset [^,]*rgba\(255, 255, 255/;
    const darkFirst = /box-shadow:inset [^,]*rgba\(22, 22, 22/;

    expect(embossMarkup).toMatch(lightFirst);
    expect(embossMarkup).not.toMatch(darkFirst);
    expect(debossMarkup).toMatch(darkFirst);
    expect(debossMarkup).not.toMatch(lightFirst);
  });

  it("keeps a photograph's finish inside the photo's own frame", () => {
    const photo = makeElement("image", {
      id: "i1",
      name: "Portrait",
      x: 100,
      y: 100,
      w: 400,
      h: 500,
      imageStorageId: "file-1" as never,
      imageRadius: 12,
      material: materialForPreset("vellum"),
    });
    const markup = render(pageWith([photo]), true, {
      "file-1": "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
    });
    expect(markup).toContain("data:image/svg+xml");
    expect(markup).toContain("mix-blend-mode:normal");
  });
});
