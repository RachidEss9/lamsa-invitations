import { useState } from "react";

import type { LengthUnit } from "@/lib/publishing/units";
import { pointsPerUnit } from "@/lib/publishing/units";
import type { Guide } from "@/lib/publishing/model";

/**
 * Physical rulers and guide dragging.
 *
 * The ruler reads in the document's display unit and draws ticks from the
 * sheet's top-left. Dragging out of a ruler creates one guide: the top ruler
 * makes a vertical (x) guide, the left ruler a horizontal (y) one. Guides are
 * editor aids — the PDF writer and preview never include them.
 */

const RULER = 22;

export interface RulersProps {
  /** Stage size in screen pixels. */
  width: number;
  height: number;
  zoom: number;
  unit: LengthUnit;
  axisLabels?: boolean;
  onAddGuide: (axis: Guide["axis"], positionPoints: number) => void;
}

function tickStep(unit: LengthUnit): number {
  // One labelled tick every 10 mm / 1 cm / 1 in / 36 pt, subdivided by five.
  const points = pointsPerUnit(unit);
  return unit === "pt" ? points * 36 : points * 10;
}

function ticks(lengthPoints: number, unit: LengthUnit, zoom: number) {
  const major = tickStep(unit);
  const minor = major / 5;
  const result: { at: number; major: boolean; label: string }[] = [];
  const max = lengthPoints;
  let index = 0;
  for (let position = 0; position <= max + 0.001; ) {
    const value = position / pointsPerUnit(unit);
    result.push({
      at: position * zoom,
      major: index % 5 === 0,
      label:
        index % 5 === 0
          ? `${Math.round(value * 10) / 10}`
          : "",
    });
    index += 1;
    position = position === 0 ? minor : position + minor;
  }
  return result;
}

export function Rulers({ width, height, zoom, unit, onAddGuide }: RulersProps) {
  const [dragX, setDragX] = useState<number | null>(null);
  const [dragY, setDragY] = useState<number | null>(null);
  const horizontal = ticks(width / zoom, unit, zoom);
  const vertical = ticks(height / zoom, unit, zoom);

  const commit = (axis: Guide["axis"], event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const screen = axis === "x" ? event.clientX - rect.left : event.clientY - rect.top;
    if (screen < 0) return;
    onAddGuide(axis, screen / zoom);
    setDragX(null);
    setDragY(null);
  };

  return (
    <>
      <div
        data-ruler="horizontal"
        role="presentation"
        title="Drag onto the page to add a vertical guide"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragX(event.clientX - event.currentTarget.getBoundingClientRect().left);
        }}
        onPointerMove={(event) => {
          if (dragX === null) return;
          setDragX(event.clientX - event.currentTarget.getBoundingClientRect().left);
        }}
        onPointerUp={(event) => commit("x", event)}
        className="absolute z-20 cursor-col-resize select-none border-b border-[var(--rule)] bg-[var(--paper-light)]"
        style={{ left: 0, top: -RULER, width, height: RULER }}
      >
        <svg width={width} height={RULER} aria-hidden>
          {horizontal.map((tick) => (
            <g key={`hx-${tick.at}`}>
              <line
                x1={tick.at}
                x2={tick.at}
                y1={tick.major ? 6 : 14}
                y2={RULER}
                stroke="color-mix(in oklab, var(--ink) 35%, transparent)"
                strokeWidth={1}
              />
              {tick.label ? (
                <text
                  x={tick.at + 3}
                  y={10}
                  fontSize={7}
                  fill="color-mix(in oklab, var(--ink-soft) 90%, transparent)"
                  fontFamily="var(--font-meta, monospace)"
                >
                  {tick.label}
                </text>
              ) : null}
            </g>
          ))}
          {dragX !== null ? (
            <line x1={dragX} x2={dragX} y1={0} y2={RULER} stroke="var(--gold)" strokeWidth={1} />
          ) : null}
        </svg>
      </div>

      <div
        data-ruler="vertical"
        role="presentation"
        title="Drag onto the page to add a horizontal guide"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragY(event.clientY - event.currentTarget.getBoundingClientRect().top);
        }}
        onPointerMove={(event) => {
          if (dragY === null) return;
          setDragY(event.clientY - event.currentTarget.getBoundingClientRect().top);
        }}
        onPointerUp={(event) => commit("y", event)}
        className="absolute z-20 cursor-row-resize select-none border-r border-[var(--rule)] bg-[var(--paper-light)]"
        style={{ left: -RULER, top: 0, width: RULER, height }}
      >
        <svg width={RULER} height={height} aria-hidden>
          {vertical.map((tick) => (
            <g key={`vy-${tick.at}`}>
              <line
                x1={tick.major ? 6 : 14}
                x2={RULER}
                y1={tick.at}
                y2={tick.at}
                stroke="color-mix(in oklab, var(--ink) 35%, transparent)"
                strokeWidth={1}
              />
              {tick.label ? (
                <text
                  x={6}
                  y={tick.at - 3}
                  fontSize={7}
                  fill="color-mix(in oklab, var(--ink-soft) 90%, transparent)"
                  fontFamily="var(--font-meta, monospace)"
                  transform={`rotate(-90 6 ${tick.at - 3})`}
                  textAnchor="end"
                >
                  {tick.label}
                </text>
              ) : null}
            </g>
          ))}
          {dragY !== null ? (
            <line x1={0} x2={RULER} y1={dragY} y2={dragY} stroke="var(--gold)" strokeWidth={1} />
          ) : null}
        </svg>
      </div>
    </>
  );
}
