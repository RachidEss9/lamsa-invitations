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
  polygonPoints,
} from "@/lib/publishing/render";
import {
  characterCss,
  resolveCharacter,
  resolveParagraph,
  resolvedDirection,
} from "@/lib/publishing/typography";

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
  resolveAsset?: AssetResolver;
  /** Double-clicked text frame: show the browser editing surface. */
  editing?: boolean;
  onTextDraft?: (text: string) => void;
  onTextEnd?: () => void;
  onTextSelection?: (start: number, end: number) => void;
}

export function ObjectArt({
  document,
  object,
  resolveAsset,
  editing,
  onTextDraft,
  onTextEnd,
  onTextSelection,
}: ObjectArtProps) {
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
        return (
          <TextContent
            document={document}
            object={object}
            editing={editing}
            onTextDraft={onTextDraft}
            onTextEnd={onTextEnd}
            onTextSelection={onTextSelection}
          />
        );
      case "image-frame":
        return <ImageContent object={object} resolveAsset={resolveAsset} />;
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
  editing,
  onTextDraft,
  onTextEnd,
  onTextSelection,
}: {
  document: PublicationDocument;
  object: TextFrameObject;
  editing?: boolean;
  onTextDraft?: (text: string) => void;
  onTextEnd?: () => void;
  onTextSelection?: (start: number, end: number) => void;
}) {
  const story = document.stories.find((entry) => entry.id === object.storyId);
  const text = story?.paragraphs ?? [];
  const language = document.metadata.language;
  const vertical = object.verticalAlign;
  const justify =
    vertical === "middle" ? "center" : vertical === "bottom" ? "flex-end" : "flex-start";

  if (text.length === 0 && !editing) {
    return (
      <foreignObject
        x={object.frame.x}
        y={object.frame.y}
        width={Math.max(1, object.frame.width)}
        height={Math.max(1, object.frame.height)}
      >
        <div
          style={{
            boxSizing: "border-box",
            display: "flex",
            height: "100%",
            width: "100%",
            alignItems: "flex-start",
            padding: insetCss(object.inset),
            color: "color-mix(in oklab, var(--ink) 34%, transparent)",
            fontFamily: "var(--font-display, serif)",
            fontSize: 10,
          }}
        >
          <span>I</span>
        </div>
      </foreignObject>
    );
  }

  if (editing) {
    const first = text[0];
    const draftFormat = first
      ? resolveParagraph(document, first)
      : undefined;
    const direction = first ? resolvedDirection(document, first) : "ltr";
    return (
      <foreignObject
        x={object.frame.x}
        y={object.frame.y}
        width={Math.max(1, object.frame.width)}
        height={Math.max(1, object.frame.height)}
      >
        {/* A native textarea gives selection, caret, IME and Arabic shaping for
            free. Multi-column flow returns as soon as editing ends. */}
        <textarea
          autoFocus
          dir={direction}
          lang={language || undefined}
          defaultValue={text
            .map((paragraph) => paragraph.runs.map((run) => run.text).join(""))
            .join("\n")}
          onInput={(event) => {
            onTextDraft?.(event.currentTarget.value);
            onTextSelection?.(
              event.currentTarget.selectionStart,
              event.currentTarget.selectionEnd,
            );
          }}
          onSelect={(event) =>
            onTextSelection?.(
              event.currentTarget.selectionStart,
              event.currentTarget.selectionEnd,
            )
          }
          onKeyUp={(event) =>
            onTextSelection?.(
              event.currentTarget.selectionStart,
              event.currentTarget.selectionEnd,
            )
          }
          onMouseUp={(event) =>
            onTextSelection?.(
              event.currentTarget.selectionStart,
              event.currentTarget.selectionEnd,
            )
          }
          onPointerDown={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
          onBlur={() => onTextEnd?.()}
          aria-label={`Edit text in ${object.name || "text frame"}`}
          style={{
            pointerEvents: "auto",
            // The canvas disables text selection for object gestures; the
            // editing surface must explicitly re-enable it for the caret and
            // native text selection (including Arabic).
            userSelect: "text",
            WebkitUserSelect: "text",
            boxSizing: "border-box",
            width: "100%",
            height: "100%",
            margin: 0,
            resize: "none",
            overflow: "auto",
            border: "1px solid var(--red, #710014)",
            outline: "none",
            borderRadius: 1,
            padding: insetCss(object.inset),
            background: "color-mix(in oklab, #ffffff 94%, transparent)",
            color: draftFormat?.color ?? "var(--ink)",
            fontFamily: fontFamilyFor(draftFormat?.fontId),
            fontSize: draftFormat?.size ?? 12,
            lineHeight: `${(draftFormat?.leading ?? 14)}px`,
            fontWeight: draftFormat?.fontWeight ?? 400,
            fontStyle: draftFormat?.fontStyle ?? "normal",
            letterSpacing: `${(draftFormat?.tracking ?? 0) / 1000}em`,
            textAlign: ALIGN[draftFormat?.alignment ?? "left"] ?? "left",
            direction,
            whiteSpace: "pre-wrap",
          }}
        />
      </foreignObject>
    );
  }

  return (
    <foreignObject
      x={object.frame.x}
      y={object.frame.y}
      width={Math.max(1, object.frame.width)}
      height={Math.max(1, object.frame.height)}
    >
      <div
        lang={language || undefined}
        className="box-border h-full w-full overflow-hidden"
        style={{
          padding: insetCss(object.inset),
          display: "flex",
          flexDirection: "column",
          justifyContent: justify,
        }}
      >
        <div
          style={{
            width: "100%",
            columns: Math.max(1, object.columns),
            columnGap: object.gutter,
            columnFill: "auto",
          }}
        >
        {text.map((paragraph) => {
          const style = resolveParagraph(document, paragraph);
          const direction = resolvedDirection(document, paragraph);
          return (
            <p
              key={paragraph.id}
              dir={direction}
              style={{
                margin: 0,
                // Space before/after and indents are points, which equal CSS
                // pixels inside the page's SVG user space.
                marginTop: style.spaceBefore,
                marginBottom: style.spaceAfter,
                marginLeft: style.leftIndent,
                marginRight: style.rightIndent,
                fontFamily: fontFamilyFor(style.fontId),
                fontSize: style.size,
                fontWeight: style.fontWeight,
                fontStyle: style.fontStyle,
                lineHeight: `${style.leading / Math.max(1, style.size)}`,
                letterSpacing: `${style.tracking / 1000}em`,
                textAlign: ALIGN[style.alignment] ?? "left",
                textIndent: style.firstLineIndent || undefined,
                hyphens: style.hyphenate ? "auto" : "manual",
                color: style.color,
              }}
            >
              {paragraph.runs.map((run, index) => (
                <span
                  key={`${paragraph.id}-${index}`}
                  style={{
                    ...characterCss(resolveCharacter(document, paragraph, run)),
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {run.text}
                </span>
              ))}
            </p>
          );
        })}
        </div>
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
  resolveAsset,
}: {
  object: ImageFrameObject;
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
