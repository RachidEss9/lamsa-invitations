import { describe, expect, it } from "vitest";
import { alignObjects, distributeObjects } from "./alignment";
import { objectFrame } from "./object-transform";

/**
 * Alignment uses the visible footprint of each object, so a rotated object
 * lines up where it looks like it should. Distribution keeps the outer two
 * objects fixed and spaces everything between them.
 */

const objects = [
  { id: "a", frame: objectFrame(0, 0, 100, 50) },
  { id: "b", frame: objectFrame(200, 100, 50, 100) },
  { id: "c", frame: objectFrame(400, 300, 100, 20) },
];

describe("alignObjects", () => {
  it("aligns left to an explicit reference", () => {
    const aligned = alignObjects(objects, "left", { x: 50, y: 0, width: 0, height: 0 });
    expect(aligned.map((entry) => entry.frame.x)).toEqual([50, 50, 50]);
  });

  it("aligns right to an explicit reference", () => {
    const aligned = alignObjects(objects, "right", { x: 0, y: 0, width: 600, height: 0 });
    expect(aligned.map((entry) => entry.frame.x)).toEqual([500, 550, 500]);
  });

  it("aligns centres horizontally", () => {
    const aligned = alignObjects(objects, "center", { x: 0, y: 0, width: 600, height: 0 });
    expect(aligned.map((entry) => entry.frame.x)).toEqual([250, 275, 250]);
  });

  it("aligns top, middle and bottom", () => {
    const reference = { x: 0, y: 10, width: 0, height: 200 };
    expect(alignObjects(objects, "top", reference).map((entry) => entry.frame.y)).toEqual([
      10, 10, 10,
    ]);
    expect(alignObjects(objects, "bottom", reference).map((entry) => entry.frame.y)).toEqual([
      160, 110, 190,
    ]);
    const middled = alignObjects(objects, "middle", reference);
    expect(middled.map((entry) => entry.frame.y)).toEqual([85, 60, 100]);
  });

  it("aligns the selection to its own bounds when no reference is given", () => {
    const aligned = alignObjects(objects, "left");
    expect(aligned.map((entry) => entry.frame.x)).toEqual([0, 0, 0]);
  });

  it("leaves a single object alone without a reference", () => {
    const single = [objects[0]!];
    expect(alignObjects(single, "left")).toBe(single);
  });

  it("moves a single object when a reference is given", () => {
    const single = [objects[0]!];
    const aligned = alignObjects(single, "right", { x: 0, y: 0, width: 200, height: 0 });
    expect(aligned[0]!.frame.x).toBe(100);
  });

  it("keeps objects that are already aligned by identity", () => {
    const aligned = alignObjects(objects, "left", { x: 0, y: 0, width: 0, height: 0 });
    expect(aligned[0]).toBe(objects[0]);
  });

  it("aligns a rotated object by its rotated bounds", () => {
    const turned = [{ id: "r", frame: { ...objectFrame(100, 100, 100, 50), rotation: 90 } }];
    const aligned = alignObjects(turned, "left", { x: 0, y: 0, width: 0, height: 0 });
    expect(aligned[0]!.frame.x).toBeCloseTo(-25, 10);
  });
});

describe("distributeObjects", () => {
  it("spaces objects evenly between the outer two", () => {
    const result = distributeObjects(objects, "horizontal");
    expect(result.map((entry) => entry.frame.x)).toEqual([0, 225, 400]);
  });

  it("honours a fixed gap", () => {
    const result = distributeObjects(objects, "horizontal", { gap: 20 });
    expect(result.map((entry) => entry.frame.x)).toEqual([0, 120, 190]);
  });

  it("distributes vertically", () => {
    const stack = [
      { id: "a", frame: objectFrame(0, 0, 10, 10) },
      { id: "b", frame: objectFrame(0, 100, 10, 20) },
      { id: "c", frame: objectFrame(0, 400, 10, 10) },
    ];
    const result = distributeObjects(stack, "vertical");
    // span 410, total height 40 → gap 185
    expect(result.map((entry) => entry.frame.y)).toEqual([0, 195, 400]);
  });

  it("leaves fewer than three objects untouched", () => {
    const pair = objects.slice(0, 2);
    expect(distributeObjects(pair, "horizontal")).toBe(pair);
  });

  it("is deterministic for objects sharing a position", () => {
    const tied = [
      { id: "b", frame: objectFrame(0, 0, 10, 10) },
      { id: "a", frame: objectFrame(0, 0, 10, 10) },
      { id: "c", frame: objectFrame(100, 0, 10, 10) },
    ];
    const first = distributeObjects(tied, "horizontal");
    const second = distributeObjects(tied, "horizontal");
    expect(first).toEqual(second);
    expect(first[0]!.frame.x).toBe(50);
    expect(first[1]!.frame.x).toBe(0);
    expect(first[2]!.frame.x).toBe(100);
  });
});
