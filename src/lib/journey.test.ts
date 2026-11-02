import { describe, expect, it } from "bun:test";
import {
  nextStep,
  isLastStep,
  pageDuration,
  pageEntranceEnd,
  visiblePages,
  type DesignDocument,
} from "./design";

function doc(pages: Array<Array<{ animation?: { enabled: boolean; delay: number; duration: number } }>> = []): DesignDocument {
  return {
    version: 1,
    pages: pages.map((elements, i) => ({
      id: `page-${i}`,
      name: `Page ${i}`,
      background: "#fff",
      elements: elements.map((el, j) => ({
        id: `el-${i}-${j}`,
        name: `E${j}`,
        kind: "shape",
        x: 0,
        y: 0,
        w: 100,
        h: 100,
        animation: el.animation ?? null,
      })),
      hidden: false,
    })),
    opening: { experience: "none", autoOpen: false, welcome: "" },
    closing: { enabled: false, style: "message", message: "", duration: 800 },
    transition: null,
    startedAt: 0,
    suite: [],
    finishes: null,
  };
}

describe("journey", () => {
  it("nextStep advances to the final step", () => {
    expect(nextStep(0, 4)).toBe(1);
    expect(nextStep(3, 4)).toBe(3);
    expect(nextStep(0, 1)).toBe(0);
  });

  it("isLastStep", () => {
    expect(isLastStep(0, 1)).toBe(true);
    expect(isLastStep(0, 4)).toBe(false);
    expect(isLastStep(3, 4)).toBe(true);
  });

  it("pageDuration defaults to 4000", () => {
    expect(pageDuration(null)).toBe(4000);
    expect(pageDuration({ id: "p", name: "x", background: "#fff", elements: [], hidden: false })).toBe(4000);
  });

  it("pageEntranceEnd uses the longest entrance", () => {
    const page = doc([
      [
        { animation: { enabled: true, delay: 0, duration: 900 } },
        { animation: { enabled: true, delay: 100, duration: 1200 } },
      ],
      [],
    ])[0];
    expect(pageEntranceEnd(page)).toBe(1200);
  });

  it("visiblePages filters hidden pages", () => {
    expect(visiblePages(doc([[], { hidden: true }]))).toHaveLength(1);
    expect(visiblePages(doc([[], {}]) as DesignDocument)).toHaveLength(2);
  });
});
