import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DesignPageView } from "@/components/invitation/DesignPageView";
import { makeElement, normalizeDesign, type DesignPage } from "./design";

/**
 * Masking, framing and darkroom adjustments have to reach the markup of the
 * one renderer the studio, the previews, the published page and the print
 * capture all share. These tests assert the real attribute values, because the
 * whole point of the fix is that the clip no longer follows the photograph
 * around: the mask is pinned to the layer, and the picture moves inside it.
 */

const IMAGE_URL = "https://cdn.example.test/photo.jpg";

function pageWith(elements: DesignPage["elements"]): DesignPage {
  return { id: "page", name: "Page", background: "#faf6ec", elements };
}

function render(page: DesignPage): string {
  return renderToStaticMarkup(
    createElement(DesignPageView, {
      page,
      time: 100_000,
      imageUrls: { img1: IMAGE_URL },
    }),
  );
}

function maskedShape(overrides: Record<string, unknown> = {}) {
  return makeElement("shape", {
    id: "s1",
    name: "Portrait",
    shape: "rect",
    x: 100,
    y: 100,
    w: 400,
    h: 500,
    fill: "transparent",
    imageStorageId: "img1",
    imageInShape: true,
    ...overrides,
  });
}

describe("masked photographs", () => {
  it("pins the clip to the layer, not to the zoomed picture", () => {
    const markup = render(pageWith([maskedShape({ radius: 12, imageZoom: 2 })]));

    // The mask covers the whole layer box and never moves with the photo.
    expect(markup).toContain('<clipPath id="clip-s1">');
    expect(markup).toContain('<rect x="0" y="0" width="100" height="100" rx="12"');
    // The photograph is twice the layer and overflows it in every direction —
    // and is still clipped by the box above.
    expect(markup).toContain('x="-50" y="-50" width="200" height="200"');
    expect(markup).toContain('clip-path="url(#clip-s1)"');
    // The old CSS clip followed the image's own box; it is gone.
    expect(markup).not.toContain("clip-path:inset(0 round");
    expect(markup).not.toContain("ellipse(50% 50%");
  });

  it("clips to an arch, a capsule and an ellipse alike", () => {
    for (const [shape, clip] of [
      ["arch", '<path d="M6 97'],
      ["capsule", 'rx="50"'],
      ["ellipse", "<ellipse"],
    ] as const) {
      const markup = render(pageWith([maskedShape({ shape })]));
      expect(markup).toContain('<clipPath id="clip-s1">');
      expect(markup).toContain(clip);
      expect(markup).toContain('clip-path="url(#clip-s1)"');
    }
  });

  it("turns the photograph inside its frame", () => {
    const markup = render(pageWith([maskedShape({ imageRotate: 45 })]));
    expect(markup).toContain('transform="rotate(45 50 50)"');
    // A square turned 45° has to grow to the diagonal to stay covered.
    expect(markup).toMatch(/width="141\.\d+"/);
    expect(markup).toMatch(/height="141\.\d+"/);
  });

  it("develops the photograph with its darkroom settings", () => {
    const markup = render(
      pageWith([maskedShape({ imageAdjust: { brightness: 90, saturation: 130 } })]),
    );
    expect(markup).toContain("filter:brightness(0.900) saturate(1.300)");
  });

  it("leaves an untouched photograph on the plain path", () => {
    const markup = render(pageWith([maskedShape({ imageZoom: 1 })]));
    expect(markup).toContain('x="0" y="0" width="100" height="100"');
    expect(markup).not.toContain("transform=");
    expect(markup).not.toContain("filter:");
  });
});

describe("placed photographs", () => {
  const placed = (overrides: Record<string, unknown> = {}) =>
    makeElement("image", {
      id: "i1",
      name: "Photo",
      x: 100,
      y: 100,
      w: 400,
      h: 300,
      imageStorageId: "img1",
      ...overrides,
    });

  it("keeps every pixel inside its frame, and honours zoom and turn", () => {
    const markup = render(
      pageWith([placed({ imageRadius: 8, imageZoom: 2, imageRotate: 30 })]),
    );
    // The frame clips, so a turned or zoomed picture can never escape it.
    expect(markup).toContain("overflow-hidden");
    expect(markup).toContain("border-radius:8px");
    // Turned and scaled about the focal point, which stays put: the zoom of
    // 2 sits on top of the growth the turn needs to keep the box covered.
    expect(markup).toMatch(/transform:rotate\(30deg\) scale\(3\.\d+\)/);
    expect(markup).toContain("transform-origin:50% 50%");
    // And the framing zoom is no longer ignored on a placed photograph.
    expect(markup).toContain("object-fit:cover");
  });

  it("applies the darkroom settings and the border to the frame", () => {
    const markup = render(
      pageWith([
        placed({
          imageBorder: 3,
          stroke: "#710014",
          imageShadow: true,
          imageAdjust: { contrast: 85 },
        }),
      ]),
    );
    expect(markup).toContain("filter:contrast(0.850)");
    expect(markup).toContain("border:3px solid #710014");
    expect(markup).toContain("box-shadow:0 22px 50px rgba(22,22,22,0.22)");
  });

  it("keeps the placeholder when there is no photograph yet", () => {
    const markup = render(
      pageWith([makeElement("image", { id: "i2", name: "Photo", imageStorageId: "" })]),
    );
    expect(markup).toContain("Image");
    expect(markup).not.toContain("<img");
  });
});

describe("image settings survive a save round-trip", () => {
  const content = {
    occasion: "wedding",
    names: { primary: "Amelia", secondary: "Søren" },
    palette: { accent: "#710014", ink: "#161616", background: "#f2f1ed" },
    fonts: { display: "cormorant-garamond", body: "lato" },
  } as unknown as Parameters<typeof normalizeDesign>[1];

  it("keeps, clamps and defaults the framing settings", () => {
    const design = normalizeDesign(
      {
        version: 1,
        pages: [
          {
            id: "p1",
            name: "Page 1",
            background: "#ffffff",
            elements: [
              {
                ...maskedShape({ imageRotate: 45, imageAdjust: { brightness: 80 } }),
                imageRotate: 900,
                imageAdjust: { brightness: "dark", saturation: 140 },
              },
              maskedShape({ id: "s2", imageAdjust: { brightness: 100 } }),
            ],
          },
        ],
      },
      content,
    );

    const [turned, plain] = design.pages[0].elements;
    expect(turned.imageRotate).toBe(360);
    expect(turned.imageAdjust).toEqual({ saturation: 140 });
    // Neutral adjustments are dropped, so an untouched photo stays untouched.
    expect(plain.imageAdjust).toBeUndefined();
    expect(plain.imageRotate).toBeUndefined();
  });
});
