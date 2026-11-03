import { describe, expect, it } from "vitest";
import {
  SHAPE_TEMPLATES,
  buildShape,
  cutLengthMm,
  foldLengthMm,
  shapeTemplate,
  shapeToSvg,
  type ShapeDrawing,
} from "./cut-folds";

const bounds = (drawing: ShapeDrawing) => {
  const points = drawing.cut.flat();
  return {
    minX: Math.min(...points.map((point) => point.x)),
    maxX: Math.max(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxY: Math.max(...points.map((point) => point.y)),
  };
};

describe("the Shape Maker die lines", () => {
  it("offers four templates with millimetre defaults", () => {
    expect(SHAPE_TEMPLATES.map((template) => template.id)).toEqual([
      "pocket",
      "gate",
      "band",
      "tag",
    ]);
    for (const template of SHAPE_TEMPLATES) {
      expect(template.defaults.widthMm).toBeGreaterThan(0);
      expect(template.defaults.heightMm).toBeGreaterThan(0);
    }
  });

  it("builds a pointed pocket taller than its body by two flap depths", () => {
    const drawing = buildShape("pocket", { widthMm: 114, heightMm: 162, depthMm: 45 });
    expect(drawing.heightMm).toBe(252);
    expect(drawing.widthMm).toBe(114);
    // Flap crease under the point, body crease above the tuck.
    expect(drawing.folds).toHaveLength(2);
    expect(drawing.folds[0][0].y).toBe(45);
    expect(drawing.folds[1][0].y).toBe(207);
    expect(drawing.cut).toHaveLength(1);
    // The point sits halfway across the blank.
    expect(drawing.cut[0][1].x).toBe(57);
  });

  it("creases a gate fold into exact thirds", () => {
    const drawing = buildShape("gate", { widthMm: 297, heightMm: 210 });
    expect(drawing.folds.map(([a]) => a.x)).toEqual([99, 198]);
    expect(bounds(drawing)).toEqual({ minX: 0, maxX: 297, minY: 0, maxY: 210 });
  });

  it("creases a band at the same thirds and keeps it inside the strip", () => {
    const drawing = buildShape("band", { widthMm: 210, heightMm: 60 });
    expect(drawing.folds.map(([a]) => a.x)).toEqual([70, 140]);
    expect(foldLengthMm(drawing)).toBe(120);
  });

  it("rounds a tag, punches its hole and folds a hanger", () => {
    const drawing = buildShape("tag", { widthMm: 60, heightMm: 120, depthMm: 14 });
    expect(drawing.cut[0].length).toBeGreaterThan(8);
    expect(drawing.holes).toHaveLength(1);
    const hole = drawing.holes[0];
    expect(hole.cx).toBe(30);
    expect(hole.cx - hole.r).toBeGreaterThan(0);
    expect(drawing.folds[0][0].y).toBe(14);
    const box = bounds(drawing);
    expect(box.minX).toBeGreaterThanOrEqual(0);
    expect(box.maxX).toBeLessThanOrEqual(60);
  });

  it("clamps impossible numbers instead of drawing outside the sheet", () => {
    const tiny = buildShape("gate", { widthMm: 0, heightMm: -4 });
    expect(tiny.widthMm).toBe(5);
    expect(tiny.heightMm).toBe(5);
    const deep = buildShape("pocket", { heightMm: 100, depthMm: 400 });
    expect(deep.heightMm).toBe(300);
  });

  it("measures knife travel and crease length in millimetres", () => {
    const pocket = buildShape("pocket", { widthMm: 100, heightMm: 100, depthMm: 20 });
    // Two 100 mm creases.
    expect(foldLengthMm(pocket)).toBe(200);
    // Two flap diagonals of sqrt(50² + 20²), both 120 mm sides, and the 100 mm
    // bottom edge of a blank that is 100 × 140 mm tall.
    const diagonal = Math.hypot(50, 20);
    expect(cutLengthMm(pocket)).toBeCloseTo(2 * diagonal + 120 + 100 + 120, 1);
  });

  it("writes a millimetre-accurate SVG with dashed folds", () => {
    const svg = shapeToSvg(buildShape("band", { widthMm: 210, heightMm: 60 }));
    expect(svg).toContain('width="210mm"');
    expect(svg).toContain('height="60mm"');
    expect(svg).toContain("stroke-dasharray");
    expect(svg.match(/<line /g)).toHaveLength(2);
    expect(svg.match(/<path /g)).toHaveLength(1);
  });

  it("rejects an unknown template", () => {
    expect(() => shapeTemplate("origami" as never)).toThrow();
  });
});
