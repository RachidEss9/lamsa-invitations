/**
 * Die lines for the Shape Maker.
 *
 * Every measurement here is in millimetres, because a cut line is a physical
 * instruction: a guillotine, a plotter or a die all read it in millimetres. Cut
 * polylines are closed (the knife goes all the way round); fold segments are
 * open (a crease has a start and an end, and nothing is removed).
 *
 * Nothing in this module touches a document. It draws a blank from three
 * numbers and can write that blank out as an SVG, which is what the workspace
 * previews and what the host hands to a cutter.
 */

export type ShapeTemplateId = "pocket" | "gate" | "band" | "tag";

export interface ShapePoint {
  x: number;
  y: number;
}

export interface ShapeDims {
  widthMm: number;
  heightMm: number;
  /** Flap, tuck or tab depth, depending on the template. */
  depthMm: number;
}

export interface ShapeTemplate {
  id: ShapeTemplateId;
  label: string;
  note: string;
  defaults: ShapeDims;
  /** The numbers this template actually uses, for the workspace's fields. */
  fields: { key: keyof ShapeDims; label: string; note?: string }[];
}

export interface ShapeDrawing {
  template: ShapeTemplateId;
  /** Bounding box of the blank, in millimetres. */
  widthMm: number;
  heightMm: number;
  /** Closed cut polylines. */
  cut: ShapePoint[][];
  /** Open fold segments. */
  folds: [ShapePoint, ShapePoint][];
  /** Punched holes, as centre and radius. */
  holes: { cx: number; cy: number; r: number }[];
}

export const SHAPE_TEMPLATES: ShapeTemplate[] = [
  {
    id: "pocket",
    label: "Pointed pocket",
    note: "An envelope blank: body, pointed flap and a tuck below, with both creases marked.",
    defaults: { widthMm: 114, heightMm: 162, depthMm: 45 },
    fields: [
      { key: "widthMm", label: "Width" },
      { key: "heightMm", label: "Body height" },
      { key: "depthMm", label: "Flap depth" },
    ],
  },
  {
    id: "gate",
    label: "Gate fold",
    note: "A portrait sheet creased into thirds, the two outer panels closing over the middle.",
    defaults: { widthMm: 297, heightMm: 210, depthMm: 0 },
    fields: [
      { key: "widthMm", label: "Sheet width" },
      { key: "heightMm", label: "Sheet height" },
    ],
  },
  {
    id: "band",
    label: "Belly band",
    note: "A wrap strip creased at both panel breaks, sized to the card it holds.",
    defaults: { widthMm: 210, heightMm: 60, depthMm: 0 },
    fields: [
      { key: "widthMm", label: "Strip width" },
      { key: "heightMm", label: "Band height" },
    ],
  },
  {
    id: "tag",
    label: "Hang tag",
    note: "A rounded tag with a punched hole and a folded hanger above it.",
    defaults: { widthMm: 60, heightMm: 120, depthMm: 14 },
    fields: [
      { key: "widthMm", label: "Width" },
      { key: "heightMm", label: "Height" },
      { key: "depthMm", label: "Hanger" },
    ],
  },
];

export function shapeTemplate(id: ShapeTemplateId): ShapeTemplate {
  const found = SHAPE_TEMPLATES.find((template) => template.id === id);
  if (!found) throw new Error(`Unknown shape template: ${id}`);
  return found;
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));

const round = (value: number) => Math.round(value * 100) / 100;

/** A cached corner arc, sampled finely enough to cut cleanly. */
function arc(
  cx: number,
  cy: number,
  r: number,
  fromDeg: number,
  toDeg: number,
  steps = 6,
): ShapePoint[] {
  const points: ShapePoint[] = [];
  for (let step = 0; step <= steps; step += 1) {
    const angle = ((fromDeg + ((toDeg - fromDeg) * step) / steps) * Math.PI) / 180;
    points.push({ x: round(cx + r * Math.cos(angle)), y: round(cy + r * Math.sin(angle)) });
  }
  return points;
}

/** A rounded rectangle, starting at the top edge and running clockwise. */
function roundedRect(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): ShapePoint[] {
  const r = clamp(radius, 0, Math.min(width, height) / 2);
  if (r <= 0) {
    return [
      { x: round(x), y: round(y) },
      { x: round(x + width), y: round(y) },
      { x: round(x + width), y: round(y + height) },
      { x: round(x), y: round(y + height) },
    ];
  }
  return [
    ...arc(x + r, y + r, r, 180, 270),
    ...arc(x + width - r, y + r, r, 270, 360),
    ...arc(x + width - r, y + height - r, r, 0, 90),
    ...arc(x + r, y + height - r, r, 90, 180),
  ];
}

/**
 * Build the blank for a template. Dimensions are clamped to something a
 * cutting machine can actually run: at least 5 mm on a side, at most 1 m, and
 * no flap deeper than the sheet it belongs to.
 */
export function buildShape(templateId: ShapeTemplateId, dims: Partial<ShapeDims>): ShapeDrawing {
  const template = shapeTemplate(templateId);
  const width = clamp(dims.widthMm ?? template.defaults.widthMm, 5, 1000);
  const height = clamp(dims.heightMm ?? template.defaults.heightMm, 5, 1000);
  const depth = clamp(dims.depthMm ?? template.defaults.depthMm, 0, Math.max(0, height));

  if (templateId === "pocket") {
    // A pointed flap above the body and a tuck below it, so the blank is
    // taller than the finished envelope by two flap depths.
    const total = height + depth * 2;
    const cut: ShapePoint[][] = [
      [
        { x: 0, y: round(depth) },
        { x: round(width / 2), y: 0 },
        { x: round(width), y: round(depth) },
        { x: round(width), y: round(total) },
        { x: 0, y: round(total) },
      ],
    ];
    return {
      template: templateId,
      widthMm: round(width),
      heightMm: round(total),
      cut,
      folds: [
        [
          { x: 0, y: round(depth) },
          { x: round(width), y: round(depth) },
        ],
        [
          { x: 0, y: round(depth + height) },
          { x: round(width), y: round(depth + height) },
        ],
      ],
      holes: [],
    };
  }

  if (templateId === "tag") {
    const cut = [roundedRect(0, 0, width, height, Math.min(height, width) * 0.12)];
    const hangerY = clamp(depth, 6, height / 2);
    return {
      template: templateId,
      widthMm: round(width),
      heightMm: round(height),
      cut,
      folds: [
        [
          { x: 0, y: round(hangerY) },
          { x: round(width), y: round(hangerY) },
        ],
      ],
      holes: [{ cx: round(width / 2), cy: round(hangerY / 2), r: round(Math.min(3, hangerY / 4)) }],
    };
  }

  if (templateId === "gate") {
    return {
      template: templateId,
      widthMm: round(width),
      heightMm: round(height),
      cut: [
        [
          { x: 0, y: 0 },
          { x: round(width), y: 0 },
          { x: round(width), y: round(height) },
          { x: 0, y: round(height) },
        ],
      ],
      folds: [1, 2].map((third) => [
        { x: round((width * third) / 3), y: 0 },
        { x: round((width * third) / 3), y: round(height) },
      ]),
      holes: [],
    };
  }

  return {
    template: templateId,
    widthMm: round(width),
    heightMm: round(height),
    cut: [
      [
        { x: 0, y: 0 },
        { x: round(width), y: 0 },
        { x: round(width), y: round(height) },
        { x: 0, y: round(height) },
      ],
    ],
    folds: [1, 2].map((third) => [
      { x: round((width * third) / 3), y: 0 },
      { x: round((width * third) / 3), y: round(height) },
    ]),
    holes: [],
  };
}

function polylineLength(points: ShapePoint[], closed: boolean): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += Math.hypot(
      points[index].x - points[index - 1].x,
      points[index].y - points[index - 1].y,
    );
  }
  if (closed) {
    const first = points[0];
    const last = points[points.length - 1];
    total += Math.hypot(first.x - last.x, first.y - last.y);
  }
  return total;
}

/** Total knife travel along every cut line, in millimetres. */
export function cutLengthMm(drawing: ShapeDrawing): number {
  const outlines = drawing.cut.reduce((sum, line) => sum + polylineLength(line, true), 0);
  const holes = drawing.holes.reduce((sum, hole) => sum + 2 * Math.PI * hole.r, 0);
  return Math.round((outlines + holes) * 10) / 10;
}

/** Total crease length, in millimetres. */
export function foldLengthMm(drawing: ShapeDrawing): number {
  const total = drawing.folds.reduce(
    (sum, [a, b]) => sum + Math.hypot(b.x - a.x, b.y - a.y),
    0,
  );
  return Math.round(total * 10) / 10;
}

function pathOf(points: ShapePoint[], closed: boolean): string {
  const first = points[0];
  const rest = points.slice(1).map((point) => `L ${point.x} ${point.y}`);
  return `M ${first.x} ${first.y} ${rest.join(" ")}${closed ? " Z" : ""}`;
}

/**
 * The blank as an SVG, in real millimetres.
 *
 * Cut lines are black and solid; creases are the studio's red and dashed, the
 * convention every cutting shop expects. A hole is drawn as a circle, which is
 * what a punch is.
 */
export function shapeToSvg(
  drawing: ShapeDrawing,
  options: { cutColour?: string; foldColour?: string; strokeWidthMm?: number; marginMm?: number } = {},
): string {
  const margin = Math.max(0, options.marginMm ?? 0);
  const width = drawing.widthMm + margin * 2;
  const height = drawing.heightMm + margin * 2;
  const strokeWidth = Math.max(0.05, options.strokeWidthMm ?? 0.25);
  const cutColour = options.cutColour ?? "#111111";
  const foldColour = options.foldColour ?? "#710014";

  const cutPaths = drawing.cut
    .map(
      (line) =>
        `<path d="${pathOf(
          line.map((point) => ({ x: round(point.x + margin), y: round(point.y + margin) })),
          true,
        )}" fill="none" stroke="${cutColour}" stroke-width="${strokeWidth}" />`,
    )
    .join("");
  const foldPaths = drawing.folds
    .map(
      ([a, b]) =>
        `<line x1="${round(a.x + margin)}" y1="${round(a.y + margin)}" x2="${round(
          b.x + margin,
        )}" y2="${round(b.y + margin)}" stroke="${foldColour}" stroke-width="${strokeWidth}" stroke-dasharray="2 1.2" />`,
    )
    .join("");
  const holes = drawing.holes
    .map(
      (hole) =>
        `<circle cx="${round(hole.cx + margin)}" cy="${round(hole.cy + margin)}" r="${round(
          hole.r,
        )}" fill="none" stroke="${cutColour}" stroke-width="${strokeWidth}" />`,
    )
    .join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${round(width)}mm" height="${round(
      height,
    )}mm" viewBox="0 0 ${round(width)} ${round(height)}">`,
    `<title>${shapeTemplate(drawing.template).label} — cut and fold lines in millimetres</title>`,
    `<g fill="none" stroke-linecap="round">${cutPaths}${holes}${foldPaths}</g>`,
    `</svg>`,
  ].join("");
}
