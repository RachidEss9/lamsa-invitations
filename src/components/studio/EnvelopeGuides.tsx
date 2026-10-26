import {
  envelopeZones,
  flapPath,
  type EnvelopeGeometry,
} from "@/lib/envelope";
import { cn } from "@/lib/utils";

export interface EnvelopeGuidesProps {
  geometry: EnvelopeGeometry;
  view: "front" | "back";
  /** The page's own size, in design units. */
  width: number;
  height: number;
  /** Canvas zoom, so labels stay legible at any magnification. */
  scale: number;
  /** The liner this envelope takes, in millimetres. */
  liner?: { widthMm: number; heightMm: number } | null;
  /**
   * `screen` draws dashed drafting guides; `print` draws thin solid marks for
   * an export the host explicitly asked to include them in.
   */
  variant?: "screen" | "print";
}

const TONE = {
  flap: "#710014",
  recipient: "#3f6fa0",
  stamp: "#8a8275",
  return: "#b38f6f",
  safe: "#710014",
  liner: "#3f6fa0",
} as const;

/**
 * Drafting guides for one side of an envelope.
 *
 * Every line here is measurement, not artwork: address windows, the postage
 * safe zone, the flap and the liner's fit. The component is rendered as an
 * overlay outside the page itself, so none of it reaches an export unless the
 * host deliberately renders it with `variant="print"`.
 */
export function EnvelopeGuides({
  geometry,
  view,
  width,
  height,
  scale,
  liner,
  variant = "screen",
}: EnvelopeGuidesProps) {
  const zones = envelopeZones(geometry, view, width, height);
  const stroke = variant === "screen" ? 1.6 : 0.8;
  const dash = variant === "screen" ? "6 5" : undefined;
  const labelSize = Math.max(7, 9 / Math.max(0.35, scale));
  const k = geometry.widthMm > 0 ? width / geometry.widthMm : 1;

  const label = (x: number, y: number, text: string, fill: string) => (
    <text
      x={x + 4}
      y={y + labelSize + 3}
      fontSize={labelSize}
      fill={fill}
      className="font-meta uppercase"
      letterSpacing={0.9}
      opacity={variant === "screen" ? 0.85 : 1}
    >
      {text}
    </text>
  );

  const box = (
    rect: { x: number; y: number; w: number; h: number },
    colour: string,
    name?: string,
  ) => (
    <g key={name}>
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.w}
        height={rect.h}
        fill="none"
        stroke={colour}
        strokeWidth={stroke}
        strokeDasharray={dash}
        opacity={0.75}
      />
      {name && variant === "screen" && label(rect.x, rect.y, name, colour)}
    </g>
  );

  return (
    <svg
      aria-hidden
      className={cn("pointer-events-none absolute inset-0")}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      style={{ zIndex: 6, overflow: "visible" }}
    >
      {/* The flap lives on the back: hinge at the top edge, free edge reaching
          down to the seal. */}
      {view === "back" && geometry.showFlap && (
        <path
          d={flapPath(width, height, zones.flapDepth, geometry.flap.shape)}
          fill={variant === "screen" ? "rgba(113,0,20,0.05)" : "none"}
          stroke={TONE.flap}
          strokeWidth={stroke}
          strokeDasharray={dash}
          opacity={0.7}
        />
      )}

      {view === "back" && geometry.showFlap && variant === "screen" && (
        <text
          x={width / 2}
          y={Math.min(height - 4, zones.flapDepth + labelSize + 4)}
          fontSize={labelSize}
          fill={TONE.flap}
          textAnchor="middle"
          className="font-meta uppercase"
          letterSpacing={0.9}
          opacity={0.75}
        >
          Flap {Math.round(geometry.flap.depthMm)} mm
        </text>
      )}

      {/* Where the liner sits once it is cut: centred, full width, reaching
          over the hinge to line the inside of the flap. */}
      {view === "back" && geometry.showLiner && liner && (
        <g>
          <rect
            x={(width - liner.widthMm * k) / 2}
            y={0}
            width={liner.widthMm * k}
            height={Math.min(height, liner.heightMm * k)}
            fill="none"
            stroke={TONE.liner}
            strokeWidth={stroke}
            strokeDasharray="3 4"
            opacity={0.8}
          />
          {variant === "screen" &&
            label(
              (width - liner.widthMm * k) / 2,
              Math.min(height, liner.heightMm * k) - labelSize - 6,
              "Liner",
              TONE.liner,
            )}
        </g>
      )}

      {zones.postageSafe && box(zones.postageSafe, TONE.safe, variant === "screen" ? undefined : "Postage safe zone")}
      {view === "front" && (
        <>
          {zones.recipient && box(zones.recipient, TONE.recipient, "Recipient")}
          {zones.stamp && box(zones.stamp, TONE.stamp, "Stamp")}
          <line
            x1={zones.centreX}
            y1={height * 0.38}
            x2={zones.centreX}
            y2={height * 0.8}
            stroke={TONE.recipient}
            strokeWidth={stroke * 0.75}
            strokeDasharray={dash}
            opacity={0.45}
          />
        </>
      )}
      {view === "back" && zones.returnAddress && (
        box(zones.returnAddress, TONE.return, "Return address")
      )}

      {/* A one-line legend for the safe zone, drawn last so it is never lost
          behind the other guides. */}
      {zones.postageSafe && variant === "screen" && (
        <text
          x={zones.postageSafe.x + 4}
          y={height - 6}
          fontSize={labelSize}
          fill={TONE.safe}
          className="font-meta uppercase"
          letterSpacing={0.9}
          opacity={0.7}
        >
          Postage-safe zone
        </text>
      )}
    </svg>
  );
}
