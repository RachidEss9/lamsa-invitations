import { describe, expect, it } from "vitest";

import { createDocument } from "./factory";
import { marginLimit, marginProblem } from "./margins";

const mm = (points: number) => `${Math.round((points / 72) * 25.4)} mm`;

function pageWithMargins(patch: Partial<{ top: number; right: number; bottom: number; left: number }>) {
  const document = createDocument({ pageCount: 1 });
  const page = document.pages[0];
  return {
    ...page,
    spec: { ...page.spec, margins: { ...page.spec.margins, ...patch } },
  };
}

describe("margin validation", () => {
  it("accepts a margin that leaves a live area", () => {
    const page = pageWithMargins({ top: 42.5, bottom: 42.5, left: 42.5, right: 42.5 });
    expect(marginProblem(page, "top", 42.5, mm)).toBeNull();
  });

  it("rejects a negative margin instead of clamping it to zero", () => {
    const page = pageWithMargins({});
    expect(marginProblem(page, "left", -12, mm)).toBe("Margins can’t be negative.");
  });

  it("rejects a non-finite value", () => {
    const page = pageWithMargins({});
    expect(marginProblem(page, "top", Number.NaN, mm)).toBe("Enter a number.");
  });

  it("rejects a margin that would cover the whole page and names the limit", () => {
    const page = pageWithMargins({ left: 42.5 });
    const limit = marginLimit(page, "right");
    expect(marginProblem(page, "right", limit, mm)).toBe(
      `Right margin must stay under ${mm(limit)} so the page keeps a live area.`,
    );
  });

  it("explains that the opposite margin must shrink when the page is already full", () => {
    const page = pageWithMargins({ left: pageWithMargins({}).spec.trim.width });
    expect(marginProblem(page, "right", 10, mm)).toBe(
      "The left margin already fills this page; lower it first.",
    );
  });

  it("keeps the limit tied to the opposite edge, not the whole page", () => {
    const page = pageWithMargins({ bottom: 100 });
    expect(marginLimit(page, "top")).toBeCloseTo(page.spec.trim.height - 100, 6);
    expect(marginLimit(page, "left")).toBeCloseTo(
      page.spec.trim.width - page.spec.margins.right,
      6,
    );
  });
});
