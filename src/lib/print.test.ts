import { describe, it, expect } from "vitest";
import {
  paperDimensions,
  outputDimensions,
  printableArea,
  artworkRect,
  formatToMillimetres,
  overflowElements,
  pageArtworkRect,
  pagesForPrint,
  printablePage,
  safeFilename,
  DEFAULT_PRINT_SETTINGS,
  type PrintSettings,
} from "./print";
import type { DesignDocument, DesignElement, DesignPage } from "./design";

function makePage(id: string, name: string, elements: DesignElement[], hidden = false): DesignPage {
  return { id, name, background: "#f2f1ed", elements, hidden };
}

function makeDesign(pages: DesignPage[]): DesignDocument {
  return {
    version: 1,
    pages,
    opening: {
      experience: "none",
      duration: 1200,
      autoOpen: false,
      welcome: "",
    },
    closing: {
      enabled: false,
      style: "message",
      message: "",
      duration: 800,
    },
    transition: { preset: "fade", duration: 600 },
  };
}

describe("print geometry", () => {
  it("computes A4 portrait dimensions", () => {
    const settings: PrintSettings = {
      ...DEFAULT_PRINT_SETTINGS,
      paper: "a4",
      orientation: "portrait",
    };
    expect(paperDimensions(settings)).toEqual({ widthMm: 210, heightMm: 297 });
  });

  it("computes A5 landscape by swapping dimensions", () => {
    const settings: PrintSettings = {
      ...DEFAULT_PRINT_SETTINGS,
      paper: "a5",
      orientation: "landscape",
    };
    expect(paperDimensions(settings)).toEqual({ widthMm: 210, heightMm: 148 });
  });

  it("computes custom 5x7 inches", () => {
    const settings: PrintSettings = {
      ...DEFAULT_PRINT_SETTINGS,
      paper: "custom",
      customWidth: 127,
      customHeight: 177.8,
      unit: "mm",
    };
    expect(paperDimensions(settings)).toEqual({ widthMm: 127, heightMm: 177.8 });
  });

  it("adds bleed to output dimensions", () => {
    const settings: PrintSettings = {
      ...DEFAULT_PRINT_SETTINGS,
      paper: "a4",
      orientation: "portrait",
      bleed: 3,
    };
    expect(outputDimensions(settings)).toEqual({
      widthMm: 216,
      heightMm: 303,
    });
  });

  it("computes printable area inside margins", () => {
    const settings: PrintSettings = {
      ...DEFAULT_PRINT_SETTINGS,
      paper: "a4",
      orientation: "portrait",
      margins: { top: 10, right: 10, bottom: 10, left: 10 },
    };
    expect(printableArea(settings)).toEqual({
      x: 10,
      y: 10,
      w: 190,
      h: 277,
    });
  });

  it("fits artwork inside printable area preserving 3:4 aspect", () => {
    const settings: PrintSettings = {
      ...DEFAULT_PRINT_SETTINGS,
      paper: "a4",
      orientation: "portrait",
      margins: { top: 10, right: 10, bottom: 10, left: 10 },
      fit: "fit",
    };
    const art = artworkRect(settings);
    expect(art.w / art.h).toBeCloseTo(0.75, 4);
    expect(art.x).toBe(10);
    expect(art.y).toBeGreaterThanOrEqual(10);
  });

  it("fills printable area when fit is fill", () => {
    const settings: PrintSettings = {
      ...DEFAULT_PRINT_SETTINGS,
      paper: "a5",
      orientation: "portrait",
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
      fit: "fill",
    };
    const art = artworkRect(settings);
    // A5 portrait: 148x210. Area aspect 0.705 < art aspect 0.75.
    // Fill uses full height: h=210, w=210*0.75=157.5
    expect(art.w).toBeCloseTo(157.5, 1);
    expect(art.h).toBeCloseTo(210, 0);
  });
});

describe("page-aware print geometry", () => {
  it("places a square page as a square, not a 3:4 card", () => {
    const settings: PrintSettings = {
      ...DEFAULT_PRINT_SETTINGS,
      paper: "custom",
      customWidth: 150,
      customHeight: 150,
      unit: "mm",
      margins: { top: 5, right: 5, bottom: 5, left: 5 },
      fit: "fit",
    };
    const page = { ...makePage("p", "Square", []), width: 600, height: 600 };
    const art = pageArtworkRect(settings, page);
    expect(art.w / art.h).toBeCloseTo(1, 4);
    expect(art.w).toBeCloseTo(140, 4);
  });

  it("places a landscape page at its own aspect", () => {
    const settings: PrintSettings = {
      ...DEFAULT_PRINT_SETTINGS,
      paper: "a5",
      orientation: "portrait",
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
      fit: "fit",
    };
    const page = { ...makePage("p", "Wide", []), width: 1600, height: 900 };
    const art = pageArtworkRect(settings, page);
    expect(art.w / art.h).toBeCloseTo(16 / 9, 4);
    expect(art.w).toBeCloseTo(148, 4);
  });

  it("uses the classic card when no page is supplied", () => {
    const settings: PrintSettings = {
      ...DEFAULT_PRINT_SETTINGS,
      paper: "a4",
      margins: { top: 10, right: 10, bottom: 10, left: 10 },
    };
    expect(pageArtworkRect(settings, null)).toEqual(artworkRect(settings));
  });

  it("reads a millimetre brief directly", () => {
    expect(
      formatToMillimetres({
        output: "print",
        unit: "mm",
        width: 148,
        height: 210,
        margin: 6,
        bleed: 3,
      }),
    ).toEqual({ widthMm: 148, heightMm: 210, bleedMm: 3 });
  });

  it("converts a pixel brief at 96 px per inch", () => {
    const dims = formatToMillimetres({
      output: "digital",
      unit: "px",
      width: 1080,
      height: 1920,
      margin: 0,
      bleed: 0,
    });
    expect(dims.widthMm).toBeCloseTo(285.75, 2);
    expect(dims.heightMm).toBeCloseTo(508, 2);
  });

  it("flags overflow against the page's real bounds", () => {
    const element = (id: string, x: number, y: number, w: number, h: number): DesignElement => ({
      id,
      kind: "shape",
      name: id,
      x,
      y,
      w,
      h,
      fill: "#000",
      hidden: false,
      rotation: 0,
      opacity: 1,
      locked: false,
      animation: {
        enabled: true,
        preset: "fade",
        trigger: "load",
        delay: 0,
        duration: 1000,
        easing: "easeOut",
      },
    });
    const page = {
      ...makePage("p", "Small", [
        element("inside", 10, 10, 50, 50),
        element("right", 590, 10, 40, 40),
        element("bottom", 10, 580, 40, 40),
      ]),
      width: 600,
      height: 600,
    };
    expect(overflowElements(page).map((item) => item.id)).toEqual([
      "right",
      "bottom",
    ]);
  });
});

describe("print pages", () => {
  it("strips reveal cover elements from printable page", () => {
    const page = makePage(
      "p1",
      "Test",
      [
        {
          id: "cover",
          kind: "shape",
          name: "Cover",
          x: 0,
          y: 0,
          w: 100,
          h: 100,
          rotation: 0,
          opacity: 1,
          locked: false,
          hidden: false,
          reveal: {
            interactionId: "i1",
            targetId: "msg",
            effect: "fadeAway",
            direction: "up",
            duration: 900,
            trigger: "tap",
          },
          animation: { enabled: true, preset: "fade", trigger: "load", delay: 0, duration: 1000, easing: "easeOut" },
        },
        {
          id: "msg",
          kind: "text",
          name: "Message",
          x: 10,
          y: 10,
          w: 80,
          h: 40,
          rotation: 0,
          opacity: 1,
          locked: false,
          hidden: false,
          text: "Hello",
          font: "cormorant-garamond",
          fontSize: 16,
          fontWeight: 400,
          align: "left",
          color: "#161616",
          animation: { enabled: true, preset: "fade", trigger: "load", delay: 0, duration: 1000, easing: "easeOut" },
        },
        {
          id: "plain",
          kind: "text",
          name: "Plain",
          x: 10,
          y: 50,
          w: 80,
          h: 20,
          rotation: 0,
          opacity: 1,
          locked: false,
          hidden: false,
          text: "Plain text",
          font: "cormorant-garamond",
          fontSize: 12,
          fontWeight: 400,
          align: "left",
          color: "#161616",
          animation: { enabled: true, preset: "fade", trigger: "load", delay: 0, duration: 1000, easing: "easeOut" },
        },
      ],
    );
    const printable = printablePage(page);
    expect(printable.elements.map((e) => e.id)).toEqual(["msg", "plain"]);
    expect(printable.elements).not.toContainEqual(
      expect.objectContaining({ id: "cover" }),
    );
  });

  it("keeps pages without covers unchanged", () => {
    const page = makePage(
      "p1",
      "Test",
      [
        {
          id: "a",
          kind: "text",
          name: "A",
          x: 0,
          y: 0,
          w: 50,
          h: 20,
          rotation: 0,
          opacity: 1,
          locked: false,
          hidden: false,
          text: "A",
          font: "cormorant-garamond",
          fontSize: 12,
          fontWeight: 400,
          align: "left",
          color: "#161616",
          animation: { enabled: true, preset: "fade", trigger: "load", delay: 0, duration: 1000, easing: "easeOut" },
        },
        {
          id: "b",
          kind: "shape",
          name: "B",
          x: 0,
          y: 20,
          w: 50,
          h: 50,
          rotation: 0,
          opacity: 1,
          locked: false,
          hidden: false,
          fill: "#000",
          animation: { enabled: true, preset: "fade", trigger: "load", delay: 0, duration: 1000, easing: "easeOut" },
        },
      ],
    );
    const printable = printablePage(page);
    expect(printable.elements).toHaveLength(2);
  });

  it("selects only current page when scope is current", () => {
    const design = makeDesign([
      makePage("p0", "Page 0", []),
      makePage("p1", "Page 1", []),
      makePage("p2", "Page 2", []),
    ]);
    const settings: PrintSettings = {
      ...DEFAULT_PRINT_SETTINGS,
      scope: "current",
    };
    const result = pagesForPrint(design, settings, 1);
    expect(result).toHaveLength(1);
    expect(result[0].page.id).toBe("p1");
  });

  it("returns all visible pages when scope is all", () => {
    const design = makeDesign([
      makePage("p0", "Page 0", []),
      makePage("p1", "Page 1", []),
    ]);
    const settings: PrintSettings = {
      ...DEFAULT_PRINT_SETTINGS,
      scope: "all",
    };
    const result = pagesForPrint(design, settings, 0);
    expect(result).toHaveLength(2);
  });

  it("falls back to first visible page when current index is hidden", () => {
    const design = makeDesign([
      makePage("p0", "Page 0", [], true),
      makePage("p1", "Page 1", []),
    ]);
    const settings: PrintSettings = {
      ...DEFAULT_PRINT_SETTINGS,
      scope: "current",
    };
    const result = pagesForPrint(design, settings, 0);
    expect(result).toHaveLength(1);
    expect(result[0].page.id).toBe("p1");
  });
});

describe("print filenames", () => {
  it("sanitises ASCII titles", () => {
    expect(safeFilename("Amara & Julian — wedding")).toBe(
      "amara-julian-wedding",
    );
  });

  it("preserves Arabic characters in titles", () => {
    expect(safeFilename("زفاف آمارا و Julián")).toBe(
      "زفاف-آمارا-و-juli-n",
    );
  });

  it("handles empty titles with fallback", () => {
    expect(safeFilename("!!!")).toBe("lamsa-invitation");
  });
});
