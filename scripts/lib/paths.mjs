/**
 * Geometry helpers for the LAMSA Elements Library generator.
 *
 * Every asset is authored in a 100 × 100 box with y pointing down, using only
 * absolute `M/L/C/Q/Z` commands. That restriction is deliberate: the editor
 * scales an asset by rewriting its numbers into page points, which stays
 * exact for lines and cubic curves and needs no matrix parser. Circles are
 * built from four cubic segments rather than arcs for the same reason.
 */

export const round = (value) => Math.round(value * 100) / 100;

export const pt = (x, y) => `${round(x)} ${round(y)}`;

export function line(x1, y1, x2, y2) {
  return `M ${pt(x1, y1)} L ${pt(x2, y2)}`;
}

/** A circular arc expressed as up to four cubic segments. */
export function arc(cx, cy, rx, ry, startDeg, endDeg) {
  const start = (startDeg * Math.PI) / 180;
  const end = (endDeg * Math.PI) / 180;
  let sweep = end - start;
  if (Math.abs(sweep) > Math.PI * 2) sweep = Math.PI * 2 * Math.sign(sweep);
  const segments = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2)));
  const step = sweep / segments;
  const k = (4 / 3) * Math.tan(step / 4);
  let x = cx + Math.cos(start) * rx;
  let y = cy + Math.sin(start) * ry;
  let d = `M ${pt(x, y)}`;
  for (let index = 1; index <= segments; index += 1) {
    const a0 = start + step * (index - 1);
    const a1 = start + step * index;
    const x0 = cx + Math.cos(a0) * rx;
    const y0 = cy + Math.sin(a0) * ry;
    const x1 = cx + Math.cos(a1) * rx;
    const y1 = cy + Math.sin(a1) * ry;
    const c1x = x0 - Math.sin(a0) * rx * k;
    const c1y = y0 + Math.cos(a0) * ry * k;
    const c2x = x1 + Math.sin(a1) * rx * k;
    const c2y = y1 - Math.cos(a1) * ry * k;
    d += ` C ${pt(c1x, c1y)} ${pt(c2x, c2y)} ${pt(x1, y1)}`;
    x = x1;
    y = y1;
  }
  return d;
}

export function circle(cx, cy, r) {
  return `${arc(cx, cy, r, r, 0, 360)} Z`;
}

export function ellipse(cx, cy, rx, ry) {
  return `${arc(cx, cy, rx, ry, 0, 360)} Z`;
}

/** Open arc as a stroked curve. */
export function sweep(cx, cy, rx, ry, startDeg, endDeg) {
  return arc(cx, cy, rx, ry, startDeg, endDeg);
}

export function polygon(cx, cy, rx, ry, sides, rotation = -90) {
  const points = [];
  for (let index = 0; index < sides; index += 1) {
    const angle = ((rotation + (index * 360) / sides) * Math.PI) / 180;
    points.push([cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry]);
  }
  return `${points.map(([x, y], index) => `${index ? "L" : "M"} ${pt(x, y)}`).join(" ")} Z`;
}

export function star(cx, cy, outer, inner, points = 5, rotation = -90) {
  const coords = [];
  const total = points * 2;
  for (let index = 0; index < total; index += 1) {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = ((rotation + (index * 360) / total) * Math.PI) / 180;
    coords.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
  }
  return `${coords.map(([x, y], index) => `${index ? "L" : "M"} ${pt(x, y)}`).join(" ")} Z`;
}

/** Rounded rectangle with four cubic corners. */
export function roundedRect(x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  const k = radius * 0.5522847498;
  return [
    `M ${pt(x + radius, y)}`,
    `L ${pt(x + w - radius, y)}`,
    `C ${pt(x + w - radius + k, y)} ${pt(x + w, y + radius - k)} ${pt(x + w, y + radius)}`,
    `L ${pt(x + w, y + h - radius)}`,
    `C ${pt(x + w, y + h - radius + k)} ${pt(x + w - radius + k, y + h)} ${pt(x + w - radius, y + h)}`,
    `L ${pt(x + radius, y + h)}`,
    `C ${pt(x + radius - k, y + h)} ${pt(x, y + h - radius + k)} ${pt(x, y + h - radius)}`,
    `L ${pt(x, y + radius)}`,
    `C ${pt(x, y + radius - k)} ${pt(x + radius - k, y)} ${pt(x + radius, y)}`,
    "Z",
  ].join(" ");
}

export function rect(x, y, w, h) {
  return `M ${pt(x, y)} L ${pt(x + w, y)} L ${pt(x + w, y + h)} L ${pt(x, y + h)} Z`;
}

/** A petal anchored at (cx, cy), growing along `angle` degrees. */
export function petal(cx, cy, length, width, angle, curve = 0.55) {
  const a = (angle * Math.PI) / 180;
  const tipX = cx + Math.cos(a) * length;
  const tipY = cy + Math.sin(a) * length;
  const nx = Math.cos(a + Math.PI / 2);
  const ny = Math.sin(a + Math.PI / 2);
  const midX = cx + Math.cos(a) * length * 0.5;
  const midY = cy + Math.sin(a) * length * 0.5;
  const c1x = midX + nx * width * curve;
  const c1y = midY + ny * width * curve;
  const c2x = midX - nx * width * curve;
  const c2y = midY - ny * width * curve;
  const shoulderX = cx + Math.cos(a) * length * 0.18;
  const shoulderY = cy + Math.sin(a) * length * 0.18;
  return [
    `M ${pt(shoulderX + nx * width * 0.16, shoulderY + ny * width * 0.16)}`,
    `Q ${pt(c1x, c1y)} ${pt(tipX, tipY)}`,
    `Q ${pt(c2x, c2y)} ${pt(shoulderX - nx * width * 0.16, shoulderY - ny * width * 0.16)}`,
    "Z",
  ].join(" ");
}

/** A pointed leaf along `angle`, with an optional stem. */
export function leaf(cx, cy, length, width, angle, bend = 0) {
  const a = (angle * Math.PI) / 180;
  const nx = Math.cos(a + Math.PI / 2);
  const ny = Math.sin(a + Math.PI / 2);
  const tipX = cx + Math.cos(a) * length;
  const tipY = cy + Math.sin(a) * length;
  const c1x = cx + Math.cos(a) * length * 0.45 + nx * width;
  const c1y = cy + Math.sin(a) * length * 0.45 + ny * width;
  const c2x = cx + Math.cos(a) * length * 0.45 - nx * width;
  const c2y = cy + Math.sin(a) * length * 0.45 - ny * width;
  const bendX = Math.cos(a + Math.PI / 2) * bend;
  const bendY = Math.sin(a + Math.PI / 2) * bend;
  return [
    `M ${pt(cx, cy)}`,
    `Q ${pt(c1x + bendX, c1y + bendY)} ${pt(tipX, tipY)}`,
    `Q ${pt(c2x + bendX, c2y + bendY)} ${pt(cx, cy)}`,
    "Z",
  ].join(" ");
}

/** A sine-like wave as one open stroked path. */
export function wave(y, amplitude, cycles, phase = 0) {
  const segments = Math.max(8, cycles * 8);
  const points = [];
  for (let index = 0; index <= segments; index += 1) {
    const x = (index / segments) * 100;
    const value = y + Math.sin((index / segments) * Math.PI * 2 * cycles + phase) * amplitude;
    points.push([x, value]);
  }
  return points
    .map(([x, py], index) => `${index ? "L" : "M"} ${pt(x, py)}`)
    .join(" ");
}

/** Catmull-Rom-ish closed blob through radial samples. */
export function blob(cx, cy, radius, samples, jitter, seed = 1) {
  const random = mulberry(seed);
  const points = [];
  for (let index = 0; index < samples; index += 1) {
    const angle = (index / samples) * Math.PI * 2;
    const r = radius * (1 + (random() - 0.5) * 2 * jitter);
    points.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
  }
  let d = `M ${pt(points[0][0], points[0][1])}`;
  for (let index = 0; index < points.length; index += 1) {
    const p0 = points[(index - 1 + points.length) % points.length];
    const p1 = points[index];
    const p2 = points[(index + 1) % points.length];
    const p3 = points[(index + 2) % points.length];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${pt(c1[0], c1[1])} ${pt(c2[0], c2[1])} ${pt(p2[0], p2[1])}`;
  }
  return `${d} Z`;
}

/** Deterministic PRNG so a regenerated catalogue is byte-identical. */
export function mulberry(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const center = (x, y) => pt(x, y);

const ARITY = { M: 2, L: 2, C: 6, Q: 4, Z: 0, H: 1, V: 1 };

/**
 * Rewrites every coordinate pair of a path through `fn`. Only the commands the
 * generator emits are supported, which is exactly the set the editor can scale
 * and mirror without a full SVG parser.
 */
export function mapPath(d, fn) {
  const tokens = d.match(/[MLCQZHV]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
  let out = "";
  let index = 0;
  let command = "";
  while (index < tokens.length) {
    const token = tokens[index];
    if (/^[MLCQZHV]$/i.test(token)) {
      command = token.toUpperCase();
      out += ` ${command}`;
      index += 1;
      if (command === "Z") continue;
    }
    const arity = ARITY[command];
    if (!arity) break;
    for (let offset = 0; offset < arity; offset += 2) {
      const x = Number(tokens[index]);
      const y = Number(tokens[index + 1]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) break;
      const [nx, ny] = fn(x, y);
      out += ` ${round(nx)} ${round(ny)}`;
      index += 2;
    }
  }
  return out.trim();
}

/** Rotates a path around the centre of the 100-box. */
export function rotatePath(d, degrees) {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.round(Math.cos(radians));
  const sin = Math.round(Math.sin(radians));
  return mapPath(d, (x, y) => {
    const dx = x - 50;
    const dy = y - 50;
    return [50 + dx * cos - dy * sin, 50 + dx * sin + dy * cos];
  });
}
