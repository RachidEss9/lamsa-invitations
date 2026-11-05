import type {
  ImageFrameObject,
  LineObject,
  PublicationDocument,
  PublicationObject,
  ShapeObject,
  TextFrameObject,
} from "@/lib/publishing/model";
import {
  fontFamilyFor,
  imagePreserveAspectRatio,
  paragraphStyleFor,
  polygonPoints,
  textDirection,
} from "@/lib/publishing/render";

/**
 * One page object, drawn in page points. The renderer is SVG: image, shape and
 * line objects are native SVG primitives; text frames use a `foreignObject`
 * so the browser's own typography engine handles line breaking and — in the
 * model's own words — Arabic shaping, without reimplementing either.
 */

export type ResolvedAsset = {
  url: string | undefined;
  width: number;
  height: number;
};

export type AssetResolver = (assetId: string | undefined) => ResolvedAsset | undefined;

interface ObjectArtProps {
  document: PublicationDocument;
  object: PublicationObject;
  /** Draw the editable shell only (thumbnails skip asset fetches). */
  lowFidelity?: boolean;
  resolveAsset?: AssetResolver;
}

export function ObjectArt({ document, object, lowFidelity, resolveAsset }: ObjectArtProps) {
  const width = Math.max(0, object.frame.width);
  const height = Math.max(0, object.frame.height);
  if (width <= 0 && height <= 0) return null;
  const cx = object.frame.x + width / 2;
  const cy = object.frame.y + height / 2;
  const transform =
    object.frame.rotation === 0
      ? undefined
      : `rotate(${object.frame.rotation} ${cx} ${cy})`;

  const content = (() => {
    switch (object.kind) {
      case "text-frame":
        return <TextContent document={document} object={object} />;
      case "image-frame":
        return <ImageContent object={object} lowFidelity={lowFidelity} resolveAsset={resolveAsset} />;
      case "shape":
        return <ShapeContent object={object} />;
      case "line":
        return <LineContent object={object} />;
      default:
        return <PlaceholderContent object={object} />;
    }
  })();

  return (
    <g transform={transform} opacity={object.opacity}>
      {content}
    </g>
  );
}

/* -------------------------------------------------------------------------- */
/* Text                                                                       */
/* -------------------------------------------------------------------------- */

const ALIGN: Record<string, "left" | "center" | "right" | "justify"> = {
  left: "left",
  center: "center",
  right: "right",
  justify: "justify",
};

function TextContent({
  document,
  object,
}: {
  document: PublicationDocument;
  object: TextFrameObject;
}) {
  const story = document.stories.find((entry) => entry.id === object.storyId);
  const text = story?.paragraphs ?? [];
  const language = document.metadata.language;

  if (text.length === 0) {
    return (
      <foreignObject
        x={object.frame.x}
        y={object.frame.y}
        width={Math.max(1, object.frame.width)}
        height={Math.max(1, object.frame.height)}
      >
        <div
          className="flex h-full w-full items-start"
          style={{
            padding: insetCss(object.inset),
            color: "color-mix(in oklab, var(--ink) 34%, transparent)",
            fontFamily: fontFamilyFor(undefined),
            fontSize: 10,
          }}
        >
          <span>I</span>
        </div>
      </foreignObject>
    );
  }

  const vertical = object.verticalAlign;
  const justify =
    vertical === "middle" ? "center" : vertical === "bottom" ? "flex-end" : "flex-start";

  return (
    <foreignObject
      x={object.frame.x}
      y={object.frame.y}
      width={Math.max(1, object.frame.width)}
      height={Math.max(1, object.frame.height)}
    >
      <div
        dir={textDirection(language)}
        lang={language || undefined}
        className="box-border h-full w-full overflow-hidden"
        style={{
          padding: insetCss(object.inset),
          columns: Math.max(1, object.columns),
          columnGap: object.gutter,
          display: "flex",
          flexDirection: "column",
          justifyContent: justify,
        }}
      >
        {text.map((paragraph) => {
          const style = paragraphStyleFor(document, paragraph);
          return (
            <p
              key={paragraph.id}
              style={{
                margin: 0,
                // Space before/after in points reads directly as CSS pixels.
                marginTop: (style?.spaceBefore ?? 0),
                marginBottom: (style?.spaceAfter ?? 0),
                fontFamily: fontFamilyFor(style?.fontId),
                fontSize: (style?.size ?? 12),
                lineHeight: `${(style?.leading ?? style?.size ?? 12) / (style?.size ?? 12)}`,
                letterSpacing: ((style?.tracking ?? 0) / 1000) + "em",
                textAlign: ALIGN[style?.alignment ?? "left"] ?? "left",
                textIndent: style?.firstLineIndent
                  ? style.firstLineIndent
                  : undefined,
                hyphens: style?.hyphenate ? "auto" : "manual",
                color: "var(--ink)",
              }}
            >
              {paragraph.runs.map((run) => {
                const character = document.styles.character.find(
                  (entry) => entry.id === run.styleId,
                );
                return (
                  <span
                    key={character?.id ?? ""}
                    style={{
                      ...(character?.fontId
                        ? { fontFamily: fontFamilyFor(character.fontId) }
                        : {}),
                      ...(character?.size ? { fontSize: character.size } : {}),
                      ...(character?.tracking
                        ? { letterSpacing: `${character.tracking / 1000}em` }
                        : {}),
                      ...(character?.color ? { color: character.color } : {}),
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {run.text}
                  </span>
                );
              })}
            </p>
          );
        })}
      </div>
    </foreignObject>
  );
}

function insetCss(inset: { top: number; right: number; bottom: number; left: number }): string {
  return `${inset.top}px ${inset.right}px ${inset.bottom}px ${inset.left}px`;
}

/* -------------------------------------------------------------------------- */
/* Images                                                                     */
/* -------------------------------------------------------------------------- */

// Phase 3A crops nothing: the crop payload is respected for scale/offset, but
// there is no cropping UI, so "fill" images render their asset sheet before
// the model gains a cropping tool.

function ImageContent({
  object,
  lowFidelity,
  resolveAsset,
}: {
  object: ImageFrameObject;
  lowFidelity?: boolean;
  resolveAsset?: AssetResolver;
}) {
  const asset = resolveAsset?.(object.assetId);
  const maskId = `mask-${object.id}`;
  const width = Math.max(0.5, object.frame.width);
  const height = Math.max(0.5, object.frame.height);
  const preserve = imagePreserveAspectRatio(object.fit);

  const clip =
    object.mask === "ellipse" ? (
      <clipPath id={maskId}>
        <ellipse cx={object.frame.x + width / 2} cy={object.frame.y + height / 2} rx={width / 2} ry={height / 2} />
      </clipPath>
    ) : object.mask === "path" && object.maskPath ? (
      <clipPath id={maskId}>
        <path d={object.maskPath} />
      </clipPath>
    ) : null;

  if (!asset?.url) {
    return (
      <g>
        {clip}
        <rect
          x={object.frame.x}
          y={object.frame.y}
          width={width}
          height={height}
          fill="color-mix(in oklab, var(--ink) 6%, transparent)"
          mask={object.mask === "rect" ? undefined : `url(#${maskId})`}
        />
        <path
          d={`M ${object.frame.x} ${object.frame.y} l ${width} ${height} M ${object.frame.x + width} ${object.frame.y} l ${-width} ${height}`}
          stroke="color-mix(in oklab, var(--ink) 16%, transparent)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  return (
    <g>
      {clip}
      <image
        href={asset.url}
        x={object.frame.x}
        y={object.frame.y}
        width={width}
        height={height}
        preserveAspectRatio={preserve}
        mask={object.mask === "rect" ? undefined : `url(#${maskId})`}
      />
    </g>
  );
}

/* -------------------------------------------------------------------------- */
/* Shapes and lines                                                           */
/* -------------------------------------------------------------------------- */

function ShapeContent({ object }: { object: ShapeObject }) {
  const width = Math.max(0, object.frame.width);
  const height = Math.max(0, object.frame.height);
  const common = {
    fill: object.fill ?? "none",
    stroke: object.stroke,
    strokeWidth: object.strokeWidth || undefined,
  };

  if (object.shape === "rectangle") {
    return (
      <rect
        x={object.frame.x}
        y={object.frame.y}
        width={width}
        height={height}
        rx={Math.max(0, object.cornerRadius)}
        ry={Math.max(0, object.cornerRadius)}
        {...common}
      />
    );
  }
  if (object.shape === "ellipse") {
    return (
      <ellipse
        cx={object.frame.x + width / 2}
        cy={object.frame.y + height / 2}
        rx={width / 2}
        ry={height / 2}
        {...common}
      />
    );
  }
  if (object.shape === "polygon") {
    return (
      <polygon
        points={polygonPoints(object.frame, object.sides ?? 3)}
        {...common}
      />
    );
  }
  return object.path ? (
    <path d={object.path} transform={undefined} {...common} />
  ) : (
    <rect x={object.frame.x} y={object.frame.y} width={width} height={height} {...common} />
  );
}

function LineContent({ object }: { object: LineObject }) {
  const { frame } = object;
  const width = Math.max(0, frame.width);
  const height = Math.max(0, frame.height);
  const dash = object.dash && object.dash.some(Boolean) ? object.dash.join(" ") : undefined;
  return (
    <line
      x1={frame.x}
      y1={frame.y}
      x2={frame.x + width}
      y2={frame.y + height}
      stroke={object.stroke}
      strokeWidth={Math.max(0.5, object.strokeWidth)}
      strokeLinecap={object.cap}
      strokeDasharray={dash}
    />
  );
}

/** A newer build wrote this object; show it, never destroy it. */
function PlaceholderContent({ object }: { object: PublicationObject }) {
  const width = Math.max(0.5, object.frame.width);
  const height = Math.max(0.5, object.frame.height);
  return (
    <g>
      <rect
        x={object.frame.x}
        y={object.frame.y}
        width={width}
        height={height}
        fill="none"
        stroke="color-mix(in oklab, var(--red) 60%, transparent)"
        strokeDasharray="4 3"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      {(() => {
        const label =
          object.kind === "generic" && object.originalKind
            ? object.originalKind
            : "Unsupported";
        if (width < 48 || height < 18) return null;
        return (
          <text
            x={object.frame.x + 8}
            y={object.frame.y + 20}
            fill="color-mix(in oklab, var(--red) 70%, transparent)"
            fontFamily="var(--font-meta, monospace)"
            fontSize={10}
            letterSpacing="1.2"
          >
            {String(label).slice(0, 28)}
          </text>
        );
      })()}
    </g>
  );
}
