import { describe, it, expect } from "vitest";
import { alignPositions, distributePositions } from "./arrange";

/** The classic studio card, used as the page frame for single-layer alignment. */
const page = { x: 0, y: 0, w: 1000, h: 1400 };

describe("alignPositions", () => {
  const single = { id: "a", x: 100, y: 200, w: 300, h: 400 };

  it("lines a single layer up with the page's real edges and centres", () => {
    expect(alignPositions([single], "left", page).get("a")).toEqual({ x: 0, y: 200 });
    expect(alignPositions([single], "right", page).get("a")).toEqual({ x: 700, y: 200 });
    expect(alignPositions([single], "hcenter", page).get("a")).toEqual({ x: 350, y: 200 });
    expect(alignPositions([single], "top", page).get("a")).toEqual({ x: 100, y: 0 });
    expect(alignPositions([single], "bottom", page).get("a")).toEqual({ x: 100, y: 1000 });
    expect(alignPositions([single], "vcenter", page).get("a")).toEqual({ x: 100, y: 500 });
  });

  it("aligns a selection to its shared bounds, never stacking it on the page edge", () => {
    const items = [
      { id: "a", x: 100, y: 100, w: 200, h: 100 },
      { id: "b", x: 400, y: 300, w: 100, h: 100 },
    ];

    // Left edges line up with the selection's own left edge (x = 100).
    const left = alignPositions(items, "left", page);
    expect(left.get("a")).toEqual({ x: 100, y: 100 });
    expect(left.get("b")).toEqual({ x: 100, y: 300 });

    // The shared bounds are 100 → 500 wide; centring uses that, not the page.
    const centred = alignPositions(items, "hcenter", page);
    expect(centred.get("a")!.x).toBe(200);
    expect(centred.get("b")!.x).toBe(250);

    const right = alignPositions(items, "right", page);
    expect(right.get("a")).toEqual({ x: 300, y: 100 });
    expect(right.get("b")).toEqual({ x: 400, y: 300 });
  });

  it("respects page geometry that is not the classic card", () => {
    const a6 = { x: 0, y: 0, w: 397, h: 559 };
    expect(alignPositions([single], "right", a6).get("a")).toEqual({ x: 97, y: 200 });
    expect(alignPositions([single], "vcenter", a6).get("a")).toEqual({ x: 100, y: 80 });
  });

  it("never moves a locked layer", () => {
    const locked = { id: "locked", x: 5, y: 5, w: 10, h: 10, locked: true };
    expect(alignPositions([locked], "left", page).size).toBe(0);
    // The unlocked layer still aligns — against its own movable bounds.
    const both = alignPositions(
      [locked, { id: "free", x: 40, y: 40, w: 20, h: 20 }],
      "top",
      page,
    );
    expect(both.has("locked")).toBe(false);
    // With only one movable layer left, it aligns to the page like any lone layer.
    expect(both.get("free")).toEqual({ x: 40, y: 0 });
  });
});

describe("distributePositions", () => {
  const row = [
    { id: "a", x: 0, y: 0, w: 100, h: 10 },
    { id: "b", x: 150, y: 0, w: 100, h: 10 },
    { id: "c", x: 400, y: 0, w: 100, h: 10 },
  ];

  it("shares the free space evenly between the outer layers", () => {
    // Span 0 → 500, three widths totalling 300, so both gaps become 100.
    const positions = distributePositions(row, "h");
    expect(positions?.get("a")).toBe(0);
    expect(positions?.get("b")).toBe(200);
    expect(positions?.get("c")).toBe(400);
  });

  it("distributes down the page the same way", () => {
    const column = [
      { id: "a", x: 0, y: 0, w: 10, h: 50 },
      { id: "b", x: 0, y: 90, w: 10, h: 50 },
      { id: "c", x: 0, y: 300, w: 10, h: 50 },
    ];
    const positions = distributePositions(column, "v");
    expect(positions?.get("a")).toBe(0);
    expect(positions?.get("b")).toBe(150);
    expect(positions?.get("c")).toBe(300);
  });

  it("asks for three movable layers before it spreads anything", () => {
    expect(distributePositions(row.slice(0, 2), "h")).toBeNull();
    // A locked third layer does not count as one.
    expect(
      distributePositions([...row.slice(0, 2), { ...row[2], locked: true }], "h"),
    ).toBeNull();
    expect(distributePositions([], "h")).toBeNull();
  });
});
