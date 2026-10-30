// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import { blankInvitationContent } from "@/lib/dashboard";
import {
  createDefaultDesign,
  type DesignDocument,
  type DesignElement,
  type DesignPage,
} from "@/lib/design";
import {
  DEFAULT_PRESENTATION_STYLE,
  PRESENTATION_LAYOUTS,
  addView,
  artworkViews,
  clampRegion,
  cropOffset,
  cropScale,
  defaultPresentation,
  detailViewsFor,
  elementBounds,
  exportDimensions,
  exportScale,
  focusRegion,
  fullView,
  layoutById,
  loadPresentation,
  moveView,
  normalizePresentation,
  padRegion,
  paperView,
  presentationExportName,
  removeView,
  savePresentation,
  spanFor,
  typographyViews,
  updateView,
  withStyle,
} from "@/lib/detail-presentation";

/**
 * The Detail Presentation model is verified against both scripts and both
 * orientations: every view must be a crop of the saved page, stay inside the
 * trim, keep its proportions under zoom, reorder cleanly and survive a
 * save/reopen round trip.
 */

const PORTRAIT = { width: 1000, height: 1400 };
const LANDSCAPE = { width: 1600, height: 1000 };

function page(
  id: string,
  size: { width: number; height: number },
  elements: DesignElement[] = [],
): DesignPage {
  return {
    id,
    name: id,
    background: "#ffffff",
    elements,
    width: size.width,
    height: size.height,
    margin: 24,
  };
}

function documentWith(pages: DesignPage[]): DesignDocument {
  return { ...createDefaultDesign(blankInvitationContent()), pages };
}

function element(
  id: string,
  kind: DesignElement["kind"],
  box: { x: number; y: number; w: number; h: number },
  extra: Partial<DesignElement> = {},
): DesignElement {
  return {
    id,
    name: id,
    kind,
    ...box,
    animation: {
      enabled: false,
      preset: "fade",
      trigger: "load",
      delay: 0,
      duration: 600,
      easing: "easeOut",
    },
    ...extra,
  };
}

const insidePage = (region: { x: number; y: number; w: number; h: number }, size: { width: number; height: number }) => {
  expect(region.x).toBeGreaterThanOrEqual(0);
  expect(region.y).toBeGreaterThanOrEqual(0);
  expect(region.x + region.w).toBeLessThanOrEqual(size.width + 1e-9);
  expect(region.y + region.h).toBeLessThanOrEqual(size.height + 1e-9);
  expect(region.w).toBeGreaterThan(0);
  expect(region.h).toBeGreaterThan(0);
};

beforeEach(() => {
  window.localStorage.clear();
});

/* -------------------------------------------------------------------------- */

describe("typography views — Arabic and English", () => {
  const englishBox = { x: 140, y: 420, w: 620, h: 180 };
  const arabicBox = { x: 140, y: 420, w: 620, h: 180 };

  it("frames the saved text box and stays inside the sheet", () => {
    const sheet = page("p-en", PORTRAIT, [
      element("t1", "text", englishBox, { text: "Together with their families" }),
      element("t2", "text", { x: 200, y: 700, w: 500, h: 90 }, { text: "Saturday, 12 April" }),
    ]);
    const [first, second] = typographyViews(sheet);
    expect(first.region.w).toBeGreaterThan(englishBox.w);
    expect(first.region.x).toBeLessThanOrEqual(englishBox.x);
    expect(first.region.y).toBeLessThanOrEqual(englishBox.y);
    expect(first.region.x + first.region.w).toBeGreaterThanOrEqual(
      englishBox.x + englishBox.w,
    );
    insidePage(first.region, PORTRAIT);
    insidePage(second.region, PORTRAIT);
    expect(first.region.w * first.region.h).toBeGreaterThan(
      second.region.w * second.region.h,
    );
  });

  it("derives the identical crop for an Arabic block of the same box", () => {
    // The region comes from the layout box, never from measuring or
    // re-typesetting the string — so the script cannot change the crop.
    const english = typographyViews(
      page("p-en", PORTRAIT, [element("t", "text", englishBox, { text: "Save the date" })]),
    )[0];
    const arabic = typographyViews(
      page("p-ar", PORTRAIT, [
        element("t", "text", arabicBox, { text: "احفظوا الموعد" }),
      ]),
    )[0];
    expect(arabic.region).toEqual(english.region);
    expect(arabic.region).not.toEqual(fullView(page("p-ar", PORTRAIT)).region);
  });

  it("honours the limit and skips hidden or empty text layers", () => {
    const sheet = page("p", PORTRAIT, [
      element("a", "text", { x: 10, y: 10, w: 200, h: 60 }, { text: "one" }),
      element("b", "text", { x: 10, y: 90, w: 200, h: 60 }, { text: "two" }),
      element("c", "text", { x: 10, y: 170, w: 200, h: 60 }, { hidden: true, text: "hidden" }),
      element("d", "text", { x: 10, y: 250, w: 0, h: 0 }, { text: "empty" }),
    ]);
    expect(typographyViews(sheet, 1)).toHaveLength(1);
    expect(typographyViews(sheet).map((view) => view.region.y).every((y) => y >= 0)).toBe(true);
    expect(detailViewsFor("typography", sheet, 1)).toHaveLength(1);
  });

  it("includes a rotated text block in full", () => {
    const bounds = elementBounds({
      x: 100,
      y: 100,
      w: 400,
      h: 100,
      rotation: 90,
    });
    expect(bounds.w).toBeCloseTo(100);
    expect(bounds.h).toBeCloseTo(400);
    expect(bounds.x).toBeCloseTo(250);
    expect(bounds.y).toBeCloseTo(-50);
  });
});

describe("artwork and paper views", () => {
  it("frames illustrations and ornaments but not the page ground", () => {
    const sheet = page("p", PORTRAIT, [
      element("ground", "shape", { x: 0, y: 0, w: 1000, h: 1400 }),
      element("ornament", "motif", { x: 620, y: 120, w: 260, h: 260 }),
      element("photo", "image", { x: 120, y: 880, w: 480, h: 360 }),
      element("line", "text", { x: 120, y: 60, w: 400, h: 60 }),
    ]);
    const views = artworkViews(sheet);
    expect(views.map((view) => view.kind)).toEqual(["artwork", "artwork"]);
    expect(views[0].region.w).toBeLessThan(PORTRAIT.width);
    for (const view of views) insidePage(view.region, PORTRAIT);
  });

  it("crops a square corner of the sheet on both orientations", () => {
    const portrait = paperView(page("p", PORTRAIT));
    const landscape = paperView(page("l", LANDSCAPE));
    expect(portrait.region.w).toBeCloseTo(portrait.region.h);
    expect(landscape.region.w).toBeCloseTo(landscape.region.h);
    expect(portrait.region.w).toBeCloseTo(PORTRAIT.width * 0.4);
    expect(landscape.region.w).toBeCloseTo(LANDSCAPE.height * 0.4);
    insidePage(portrait.region, PORTRAIT);
    insidePage(landscape.region, LANDSCAPE);
    // The corner sits at the trim, so the real edge of the sheet is visible.
    expect(portrait.region.x + portrait.region.w).toBeCloseTo(PORTRAIT.width);
    expect(portrait.region.y).toBe(0);
  });
});

describe("cropping boundaries and zoom accuracy", () => {
  it("clamps regions that leave the page or collapse", () => {
    const sheet = page("p", PORTRAIT);
    expect(clampRegion({ x: -80, y: -40, w: 400, h: 400 }, sheet)).toEqual({
      x: 0,
      y: 0,
      w: 400,
      h: 400,
    });
    const over = clampRegion({ x: 900, y: 1300, w: 400, h: 400 }, sheet);
    insidePage(over, PORTRAIT);
    expect(over.x + over.w).toBe(PORTRAIT.width);
    expect(over.y + over.h).toBe(PORTRAIT.height);
    const huge = clampRegion({ x: 0, y: 0, w: 99999, h: 99999 }, sheet);
    expect(huge).toEqual({ x: 0, y: 0, w: PORTRAIT.width, h: PORTRAIT.height });
    const collapsed = clampRegion({ x: 10, y: 10, w: 2, h: 2 }, sheet);
    expect(collapsed.w).toBeGreaterThanOrEqual(40);
    const broken = clampRegion({ x: Number.NaN, y: 0, w: Number.NaN, h: 400 }, sheet);
    insidePage(broken, PORTRAIT);
  });

  it("keeps padding inside the sheet", () => {
    const sheet = page("p", LANDSCAPE);
    const padded = padRegion({ x: 0, y: 0, w: 300, h: 200 }, sheet, 0.5);
    insidePage(padded, LANDSCAPE);
  });

  it("maps the region exactly onto the plate for portrait and landscape", () => {
    for (const [size, region] of [
      [PORTRAIT, { x: 120, y: 300, w: 500, h: 350 }],
      [LANDSCAPE, { x: 900, y: 140, w: 480, h: 420 }],
    ] as const) {
      const viewportWidth = 480;
      const scale = cropScale(region, viewportWidth);
      const { left, top } = cropOffset(region, scale);
      // The region's four edges land exactly on the plate's four edges.
      expect(region.x * scale + left).toBeCloseTo(0, 6);
      expect((region.x + region.w) * scale + left).toBeCloseTo(viewportWidth, 6);
      expect(region.y * scale + top).toBeCloseTo(0, 6);
      const viewportHeight = region.h * scale;
      expect((region.y + region.h) * scale + top).toBeCloseTo(viewportHeight, 6);
      // Aspect ratio is preserved under zoom — nothing is stretched.
      expect(viewportWidth / viewportHeight).toBeCloseTo(region.w / region.h, 6);
      expect(scale).toBeCloseTo(viewportWidth / region.w, 6);
      expect(cropOffset(region, scale).left).toBeLessThanOrEqual(0);
      expect(cropOffset(region, scale).top).toBeLessThanOrEqual(0);
      void size;
    }
  });

  it("converts a dragged box on the full page into a clamped page region", () => {
    const sheet = page("p", PORTRAIT);
    const region = focusRegion(
      { x: 500, y: 0, w: 500, h: 400 },
      { width: 1000, height: 1400 },
      sheet,
    );
    expect(region).toEqual({ x: 500, y: 0, w: 500, h: 400 });
    const offEdge = focusRegion(
      { x: 900, y: 1200, w: 300, h: 400 },
      { width: 1000, height: 1400 },
      sheet,
    );
    insidePage(offEdge, PORTRAIT);
    expect(offEdge.x + offEdge.w).toBe(PORTRAIT.width);
    expect(offEdge.y + offEdge.h).toBe(PORTRAIT.height);
  });
});

describe("composition — multiple views, reorder, layouts", () => {
  const design = documentWith([
    page("p-inv", PORTRAIT, [
      element("t1", "text", { x: 140, y: 420, w: 620, h: 180 }, { text: "You are invited" }),
      element("m1", "motif", { x: 640, y: 120, w: 240, h: 240 }),
    ]),
  ]);

  it("opens with several real views of one invitation", () => {
    const doc = defaultPresentation(design);
    expect(doc.views.length).toBeGreaterThanOrEqual(3);
    const ids = doc.views.map((view) => view.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(doc.views.map((view) => view.kind))).toEqual(
      new Set(["full", "typography", "artwork", "paper"]),
    );
    for (const view of doc.views) expect(view.pageId).toBe("p-inv");
  });

  it("adds, removes and reorders views", () => {
    const base = defaultPresentation(design);
    const first = base.views[0].id;
    const last = base.views[base.views.length - 1].id;

    const removed = removeView(base, first);
    expect(removed.views.some((view) => view.id === first)).toBe(false);
    expect(base.views).toHaveLength(removed.views.length + 1);

    const restored = addView(removed, base.views[0]);
    expect(restored.views[restored.views.length - 1].id).toBe(first);

    const moved = moveView(restored, first, 0);
    expect(moved.views[0].id).toBe(first);

    const focus = {
      id: "focus-1",
      kind: "focus" as const,
      pageId: "p-inv",
      region: { x: 100, y: 200, w: 300, h: 300 },
      title: "",
      caption: "",
    };
    const withFocus = addView(moveView(restored, last, 0), focus);
    expect(withFocus.views[0].id).toBe(last);
    expect(withFocus.views[withFocus.views.length - 1].id).toBe("focus-1");
    // Out-of-range targets clamp instead of dropping the view.
    expect(moveView(withFocus, focus.id, 99).views[withFocus.views.length - 1].id).toBe(
      "focus-1",
    );
    expect(moveView(withFocus, "missing", 0)).toBe(withFocus);
  });

  it("edits titles, captions and composition settings", () => {
    const base = defaultPresentation(design);
    const id = base.views[0].id;
    const titled = updateView(base, id, { title: "The invitation", caption: "Foil-free flat art" });
    expect(titled.views[0].title).toBe("The invitation");
    expect(titled.views[0].caption).toBe("Foil-free flat art");
    expect(base.views[0].title).toBe("");

    const restyled = withStyle(base, { layoutId: "triptych", gap: 80, align: "start" });
    expect(restyled.style.layoutId).toBe("triptych");
    expect(restyled.style.gap).toBe(80);
    expect(base.style.layoutId).toBe(DEFAULT_PRESENTATION_STYLE.layoutId);
  });

  it("spans plates correctly for every editorial layout", () => {
    for (const layout of PRESENTATION_LAYOUTS) {
      for (const total of [1, 2, 3, 4, 5, 6]) {
        const spans = Array.from({ length: total }, (_, index) =>
          spanFor(layout, index, total),
        );
        for (const span of spans) {
          expect(span).toBeGreaterThanOrEqual(1);
          expect(span).toBeLessThanOrEqual(layout.columns);
        }
        if (layout.columns === 1) expect(spans).toEqual(spans.map(() => 1));
        // The hero only fires when a row would otherwise be full.
        const heroOpens = layout.columns > 1 && spans[0] === layout.columns;
        expect(heroOpens).toBe(layout.heroFirst && total > layout.columns);
      }
    }
    expect(layoutById("nope").id).toBe(PRESENTATION_LAYOUTS[0].id);
    expect(PRESENTATION_LAYOUTS.map((layout) => layout.id)).toContain("gallery");
  });
});

describe("export sizing and naming", () => {
  it("names screen exports …-presentation, never the print PDF name", () => {
    expect(presentationExportName("Nour & Sami", "png")).toBe(
      "nour-sami-presentation.png",
    );
    expect(presentationExportName("Nour & Sami", "jpeg")).toBe(
      "nour-sami-presentation.jpg",
    );
    expect(presentationExportName("   ", "png")).toBe("lamsa-invitation-presentation.png");
    const arabic = presentationExportName("دعوة زفاف", "png");
    expect(arabic).toMatch(/-presentation\.png$/);
    expect(arabic).not.toMatch(/\.pdf$/);
  });

  it("produces high-resolution dimensions from the live stage", () => {
    const scale = exportScale(880);
    expect(scale).toBeCloseTo(2400 / 880, 6);
    const dims = exportDimensions(880, 1240, scale);
    expect(dims.width).toBe(2400);
    expect(dims.height).toBeGreaterThan(2400); // the portrait page stays taller
    expect(exportScale(64)).toBe(6); // capped so the canvas stays encodable
    expect(exportScale(6000)).toBe(1); // never downsample a wide stage
    expect(exportDimensions(100, 50, 2.5)).toEqual({ width: 250, height: 125 });
  });
});

describe("save and reopen", () => {
  const design = documentWith([
    page("p-inv", PORTRAIT, [
      element("t1", "text", { x: 140, y: 420, w: 620, h: 180 }, { text: "You are invited" }),
    ]),
    page("p-env", LANDSCAPE),
  ]);

  it("round-trips a presentation through device storage", () => {
    const doc = withStyle(defaultPresentation(design), { layoutId: "gallery" });
    savePresentation("inv-1", doc);
    const reopened = loadPresentation("inv-1", design);
    expect(reopened).toEqual(doc);
    expect(loadPresentation("inv-2", design)).toBeNull();
  });

  it("keeps invitations separate and tolerates broken storage", () => {
    const a = defaultPresentation(design);
    savePresentation("inv-a", a);
    savePresentation("inv-b", { views: [], style: { ...a.style, layoutId: "folio" } });
    expect(loadPresentation("inv-a", design)?.views).toHaveLength(a.views.length);
    expect(loadPresentation("inv-b", design)?.views).toHaveLength(0);

    window.localStorage.setItem("lamsa.detail-presentations", "{broken");
    expect(loadPresentation("inv-a", design)).toBeNull();
    // A broken blob does not block the next save.
    savePresentation("inv-a", a);
    expect(loadPresentation("inv-a", design)?.views.length).toBe(a.views.length);
  });

  it("normalizes a serialized presentation back to an identical document", () => {
    const doc = defaultPresentation(design);
    const restored = normalizePresentation(JSON.parse(JSON.stringify(doc)), design);
    expect(restored).toEqual(doc);
  });

  it("drops views into deleted pages, re-clamps regions and rejects unknown styles", () => {
    const raw = {
      views: [
        {
          id: "keep",
          kind: "focus",
          pageId: "p-inv",
          region: { x: -50, y: 900, w: 4000, h: 4000 },
          title: "Kept",
          caption: "",
        },
        { id: "gone", kind: "full", pageId: "p-deleted", region: { x: 0, y: 0, w: 10, h: 10 } },
        { id: "dup", kind: "typography", pageId: "p-inv", region: { x: 0, y: 0, w: 400, h: 400 } },
        { id: "dup", kind: "typography", pageId: "p-inv", region: { x: 0, y: 0, w: 400, h: 400 } },
        null,
      ],
      style: {
        layoutId: "not-a-layout",
        backgroundId: "not-a-backdrop",
        margin: 900,
        gap: -20,
        size: 55,
        align: "sideways",
        showTitles: "yes",
      },
    };
    const doc = normalizePresentation(raw, design);
    expect(doc.views).toHaveLength(2);
    expect(doc.views.map((view) => view.id)).toEqual(["keep", "dup"]);
    insidePage(doc.views[0].region, PORTRAIT);
    expect(doc.style.layoutId).toBe(DEFAULT_PRESENTATION_STYLE.layoutId);
    expect(doc.style.backgroundId).toBe(DEFAULT_PRESENTATION_STYLE.backgroundId);
    expect(doc.style.margin).toBe(100);
    expect(doc.style.gap).toBe(0);
    expect(doc.style.size).toBe(55);
    expect(doc.style.align).toBe(DEFAULT_PRESENTATION_STYLE.align);
    expect(doc.style.showTitles).toBe(DEFAULT_PRESENTATION_STYLE.showTitles);

    const empty = normalizePresentation("not even an object", design);
    expect(empty.views).toEqual([]);
    expect(empty.style).toEqual(DEFAULT_PRESENTATION_STYLE);
  });
});
