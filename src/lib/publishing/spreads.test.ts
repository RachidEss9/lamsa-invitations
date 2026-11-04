import { describe, expect, it } from "vitest";
import type { PublicationPage } from "./model";
import { pageSpec } from "./geometry";
import { assignPageSides, facingPageOf, planSpreads, preserveSpreadIds, spreadGeometry, spreadIndexOfPage, spreadTrimWidth } from "./spreads";
import { createSequentialIds } from "./ids";

/**
 * Spreads are derived from page order, never stored by hand. These tests pin
 * the cover convention, the left/right transition, and the difference between
 * the spread's outer bleed and each page's own bleed.
 */

const SPEC = pageSpec(
  { width: 400, height: 600 },
  { bleed: 10, margins: { top: 20, right: 20, bottom: 20, left: 20 } },
);

function page(id: string, spec = SPEC): PublicationPage {
  return {
    version: 1,
    id,
    name: id,
    side: "single",
    spec,
    background: { color: "#ffffff" },
    layers: [{ id: "layer_1", name: "Content", locked: false, hidden: false, printable: true }],
    objects: [],
    hidden: false,
  };
}

describe("spread planning", () => {
  it("gives every page its own spread when pages do not face", () => {
    const spreads = planSpreads([page("page_1"), page("page_2"), page("page_3")], {
      facingPages: false,
    });
    expect(spreads.map((spread) => spread.kind)).toEqual(["single", "single", "single"]);
    expect(spreads.map((spread) => spread.pageIds)).toEqual([["page_1"], ["page_2"], ["page_3"]]);
    expect(spreads.every((spread) => spread.gutter === 0)).toBe(true);
  });

  it("stands the cover alone and pairs the interior of a facing document", () => {
    const pages = ["page_1", "page_2", "page_3", "page_4", "page_5"].map((id) => page(id));
    const spreads = planSpreads(pages, { facingPages: true, gutter: 20 });
    expect(spreads.map((spread) => spread.kind)).toEqual(["single", "facing", "facing"]);
    expect(spreads.map((spread) => spread.pageIds)).toEqual([
      ["page_1"],
      ["page_2", "page_3"],
      ["page_4", "page_5"],
    ]);
    expect(spreads.map((spread) => spread.index)).toEqual([0, 1, 2]);
    expect(spreads[1]!.gutter).toBe(20);
    expect(spreads[0]!.gutter).toBe(0);
  });

  it("leaves an odd last page alone on a verso", () => {
    const pages = ["page_1", "page_2", "page_3", "page_4"].map((id) => page(id));
    const spreads = planSpreads(pages, { facingPages: true, gutter: 20 });
    expect(spreads.map((spread) => spread.pageIds)).toEqual([
      ["page_1"],
      ["page_2", "page_3"],
      ["page_4"],
    ]);
  });

  it("pairs from the first page when the cover is not standalone", () => {
    const pages = ["page_1", "page_2", "page_3", "page_4"].map((id) => page(id));
    const spreads = planSpreads(pages, { facingPages: true, coverStandalone: false });
    expect(spreads.every((spread) => spread.kind === "facing")).toBe(true);
    expect(spreads.map((spread) => spread.pageIds)).toEqual([
      ["page_1", "page_2"],
      ["page_3", "page_4"],
    ]);
  });

  it("produces stable ids through an injected source", () => {
    const ids = createSequentialIds();
    const spreads = planSpreads([page("page_1"), page("page_2"), page("page_3")], {
      facingPages: true,
      ids,
    });
    expect(spreads.map((spread) => spread.id)).toEqual(["spread_1", "spread_2"]);
  });

  it("returns no spreads for no pages", () => {
    expect(planSpreads([], { facingPages: true })).toEqual([]);
  });
});

describe("page sides", () => {
  it("assigns recto to the cover, then alternating verso/recto", () => {
    const pages = ["page_1", "page_2", "page_3", "page_4", "page_5"].map((id) => page(id));
    const spreads = planSpreads(pages, { facingPages: true, gutter: 20 });
    const sided = assignPageSides(pages, spreads, { facingPages: true });
    expect(sided.map((entry) => entry.side)).toEqual([
      "right",
      "left",
      "right",
      "left",
      "right",
    ]);
  });

  it("puts a lone last page on the opposite side from the cover", () => {
    const pages = ["page_1", "page_2", "page_3"].map((id) => page(id));
    const spreads = planSpreads(pages, { facingPages: true });
    const sided = assignPageSides(pages, spreads, { facingPages: true, coverSide: "left" });
    expect(sided[0]!.side).toBe("left");
    expect(sided[1]!.side).toBe("left");
    expect(sided[2]!.side).toBe("right");
  });

  it("keeps every page single in a non-facing document", () => {
    const pages = ["page_1", "page_2"].map((id) => page(id));
    const spreads = planSpreads(pages, { facingPages: false });
    const sided = assignPageSides(pages, spreads, { facingPages: false });
    expect(sided.every((entry) => entry.side === "single")).toBe(true);
  });

  it("does not clone pages whose side is already correct", () => {
    const pages = ["page_1", "page_2"].map((id) => page(id));
    const spreads = planSpreads(pages, { facingPages: false });
    const sided = assignPageSides(pages, spreads, { facingPages: false });
    expect(sided[0]).toBe(pages[0]);
    expect(sided[1]).toBe(pages[1]);
  });
});

describe("spread navigation", () => {
  const pages = ["page_1", "page_2", "page_3", "page_4"].map((id) => page(id));
  const spreads = planSpreads(pages, { facingPages: true, gutter: 20 });

  it("finds the spread of a page", () => {
    expect(spreadIndexOfPage(spreads, "page_3")).toBe(1);
    expect(spreadIndexOfPage(spreads, "page_missing")).toBe(-1);
  });

  it("returns the facing page or nothing for a lone page", () => {
    expect(facingPageOf(spreads, "page_2")).toBe("page_3");
    expect(facingPageOf(spreads, "page_1")).toBeUndefined();
    expect(facingPageOf(spreads, "page_4")).toBeUndefined();
  });
});

describe("spread geometry", () => {
  const left = page("page_2");
  const right = page("page_3");
  const spreads = planSpreads([page("page_1"), left, right], { facingPages: true, gutter: 20 });
  const spread = spreads.find((candidate) => candidate.kind === "facing")!;

  it("places the right page after the gutter", () => {
    const geometry = spreadGeometry(spread, [left, right]);
    expect(geometry.pages[0]!.offset).toEqual({ x: 0, y: 0 });
    expect(geometry.pages[1]!.offset).toEqual({ x: 420, y: 0 });
    expect(geometry.pages[1]!.trim).toEqual({ x: 420, y: 0, width: 400, height: 600 });
  });

  it("keeps the spread trim width including the gutter", () => {
    expect(spreadTrimWidth([left, right], 20)).toBe(820);
    const geometry = spreadGeometry(spread, [left, right]);
    expect(geometry.trim).toEqual({ x: 0, y: 0, width: 820, height: 600 });
  });

  it("bleeds the outside of the spread, never the joined inner edges", () => {
    const geometry = spreadGeometry(spread, [left, right]);
    expect(geometry.bleed).toEqual({ x: -10, y: -10, width: 840, height: 620 });
    expect(geometry.pages[0]!.bleed).toEqual({ x: -10, y: -10, width: 420, height: 620 });
    expect(geometry.pages[1]!.bleed).toEqual({ x: 410, y: -10, width: 420, height: 620 });
  });

  it("offsets each page's safe area by its own position", () => {
    const geometry = spreadGeometry(spread, [left, right]);
    expect(geometry.pages[0]!.safe).toEqual({ x: 20, y: 20, width: 360, height: 560 });
    expect(geometry.pages[1]!.safe).toEqual({ x: 440, y: 20, width: 360, height: 560 });
  });

  it("bleeds both edges of a single-page spread", () => {
    const single = spreads[0]!;
    const geometry = spreadGeometry(single, [page("page_1")]);
    expect(geometry.kind).toBe("single");
    expect(geometry.trim).toEqual({ x: 0, y: 0, width: 400, height: 600 });
    expect(geometry.bleed).toEqual({ x: -10, y: -10, width: 420, height: 620 });
  });

  it("refuses a spread that references a missing page", () => {
    expect(() => spreadGeometry(spread, [left])).toThrow(RangeError);
  });
});

describe("spread id preservation", () => {
  it("keeps saved ids when the page set is unchanged", () => {
    const planned = planSpreads([page("page_1"), page("page_2")], { facingPages: false });
    const preserved = preserveSpreadIds(planned, [
      { id: "spread_saved", index: 0, kind: "single", pageIds: ["page_1"], gutter: 0 },
    ]);
    expect(preserved[0]!.id).toBe("spread_saved");
    expect(preserved[1]!.id).toBe(planned[1]!.id);
  });

  it("keeps planned ids when no saved spreads are supplied", () => {
    const planned = planSpreads([page("page_1")], { facingPages: false });
    expect(preserveSpreadIds(planned, undefined)).toBe(planned);
  });
});
