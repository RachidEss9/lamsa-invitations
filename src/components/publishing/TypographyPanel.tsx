import { useState, type ReactNode } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Bold,
  Italic,
  Link2,
  Strikethrough,
  Subscript,
  Superscript,
  Trash2,
  Underline,
  Unlink,
} from "lucide-react";

import type {
  CharacterFormat,
  ParagraphFormat,
  PublicationDocument,
  Story,
  TextFrameObject,
} from "@/lib/publishing/model";
import type { UsePublishingEditorResult } from "@/hooks/publishing/usePublishingEditor";
import {
  PUBLISHING_FONTS,
  estimateOverflow,
  fontAvailability,
  offsetToParagraph,
  resolveCharacter,
  resolveParagraph,
  resolveThread,
  threadIssues,
} from "@/lib/publishing/typography";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type TypographyEditor = Pick<
  UsePublishingEditorResult,
  | "applyCharacterFormat"
  | "applyCharacterRange"
  | "applyParagraphFormat"
  | "applyParagraphStyle"
  | "applyCharacterStyle"
  | "createStyle"
  | "updateParagraphStyle"
  | "updateCharacterStyle"
  | "duplicateStyle"
  | "deleteStyle"
  | "renameStyle"
  | "connectStoryFrame"
  | "disconnectStoryFrame"
  | "reorderStoryFrame"
  | "moveStoryFrameToPage"
  | "patchObject"
  | "stylesStatus"
  | "stylesMessage"
  | "retryStyles"
>;

export interface TextSelection {
  storyId: string;
  start: number;
  end: number;
}

export interface TypographyPanelProps {
  document: PublicationDocument;
  frame: TextFrameObject;
  story: Story;
  editor: TypographyEditor;
  selection: TextSelection | null;
}

function Section({ title, children, hint }: { title: string; children: ReactNode; hint?: string }) {
  return (
    <section className="border-b border-[var(--rule)] px-3 py-2.5">
      <h3 className="mb-2 font-meta text-[0.55rem] uppercase tracking-[0.15em] text-[var(--ink-soft)]">
        {title}
      </h3>
      {hint ? (
        <p className="mb-2 font-meta text-[0.5rem] leading-3.5 tracking-[0.04em] text-[color-mix(in_oklab,var(--ink-soft)_75%,transparent)]">
          {hint}
        </p>
      ) : null}
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex items-center gap-2">
      <span className="w-[3.25rem] shrink-0 font-meta text-[0.53rem] uppercase tracking-[0.06em] text-[var(--ink-soft)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function Num({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onCommit,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  onCommit: (value: number) => void;
}) {
  const formatted = `${Number(value.toFixed(2))}`;
  const [draft, setDraft] = useState(formatted);
  const [synced, setSynced] = useState(formatted);
  if (synced !== formatted) {
    setSynced(formatted);
    setDraft(formatted);
  }
  const commit = () => {
    const parsed = Number.parseFloat(draft.replace(",", "."));
    if (!Number.isFinite(parsed)) {
      setDraft(formatted);
      return;
    }
    const bounded = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, parsed));
    if (Math.abs(bounded - value) < 1e-6) {
      setDraft(formatted);
      return;
    }
    onCommit(bounded);
  };
  return (
    <Row label={label}>
      <span className="relative flex-1">
        <Input
          value={draft}
          inputMode="decimal"
          step={step}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              setDraft(formatted);
              event.currentTarget.blur();
            }
          }}
          className="h-7 rounded-[3px] border-[var(--rule)] bg-[var(--paper)] pr-6 text-right font-meta text-[0.68rem] tabular-nums shadow-none"
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 font-meta text-[0.48rem] text-[var(--ink-soft)]">
            {suffix}
          </span>
        ) : null}
      </span>
    </Row>
  );
}

function Segment<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: ReactNode; title: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex rounded-[3px] border border-[var(--rule)] bg-[var(--paper)]">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          title={option.title}
          aria-label={option.title}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex h-6 flex-1 items-center justify-center border-r border-[var(--rule)] last:border-r-0",
            value === option.value
              ? "bg-[var(--ink)] text-[var(--paper)]"
              : "text-[var(--ink-soft)] hover:text-[var(--ink)]",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({
  active,
  title,
  onClick,
  children,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex h-6 w-7 items-center justify-center rounded-[3px] border",
        active
          ? "border-[var(--red)] bg-[color-mix(in_oklab,var(--red)_10%,transparent)] text-[var(--red)]"
          : "border-[var(--rule)] text-[var(--ink-soft)] hover:text-[var(--ink)]",
      )}
    >
      {children}
    </button>
  );
}

export function TypographyPanel({
  document,
  frame,
  story,
  editor,
  selection,
}: TypographyPanelProps) {
  const firstParagraph = story.paragraphs[0];
  const firstRun = firstParagraph?.runs[0];
  const paragraphFormat = firstParagraph
    ? resolveParagraph(document, firstParagraph)
    : document.styles.paragraph[0];
  const character =
    firstParagraph && firstRun
      ? resolveCharacter(document, firstParagraph, firstRun)
      : undefined;

  const activeSelection =
    selection && selection.storyId === story.id ? selection : null;
  const hasRange =
    activeSelection !== null && activeSelection.end > activeSelection.start;
  const caret = activeSelection
    ? offsetToParagraph(story, activeSelection.start)
    : null;
  const targetParagraph = caret ? story.paragraphs[caret.paragraphIndex] : undefined;
  const targetId = targetParagraph?.id;
  const fontSupported = character
    ? fontAvailability(
        character.fontId,
        typeof window === "undefined" ? undefined : window.document.fonts,
      )
    : "unknown";

  const thread = resolveThread(document, story);
  const estimate = estimateOverflow(
    document,
    story,
    thread.map((entry) => entry.frame),
  );
  const issues = threadIssues(document).filter((issue) => issue.storyId === story.id);
  const currentFrame = thread.find((entry) => entry.objectId === frame.id);
  const currentIndex = thread.findIndex((entry) => entry.objectId === frame.id);

  const candidates = document.pages.flatMap((entry) =>
    entry.objects
      .filter(
        (object): object is TextFrameObject =>
          object.kind === "text-frame" &&
          !story.frames.some((ref) => ref.objectId === object.id),
      )
      .map((object) => ({ page: entry, frame: object })),
  );
  const [candidate, setCandidate] = useState("");
  const [moveTarget, setMoveTarget] = useState("");

  const paragraphStyle =
    story.paragraphs.find((paragraph) => paragraph.id === targetId)?.styleId ??
    firstParagraph?.styleId ??
    document.styles.paragraph[0]?.id;
  const [paragraphStyleId, setParagraphStyleId] = useState(paragraphStyle ?? "");
  // The story is the source of truth once a style is applied; local state only
  // remembers a choice between renders.
  const effectiveParagraphStyle =
    document.styles.paragraph.find((style) => style.id === paragraphStyle) ??
    document.styles.paragraph.find((style) => style.id === paragraphStyleId) ??
    document.styles.paragraph[0];

  const [characterStyleId, setCharacterStyleId] = useState(
    firstRun?.styleId ?? document.styles.character[0]?.id ?? "",
  );
  const effectiveCharacterStyle =
    document.styles.character.find((style) => style.id === firstRun?.styleId) ??
    document.styles.character.find((style) => style.id === characterStyleId) ??
    document.styles.character[0];

  const applyCharacter = (patch: CharacterFormat) => {
    if (hasRange && activeSelection) {
      editor.applyCharacterRange(story.id, activeSelection.start, activeSelection.end, patch);
      return;
    }
    // No range: the selected frame is the unit. A range formats exactly the
    // selected characters, even after the textarea has lost focus to the
    // inspector.
    editor.applyCharacterFormat(story.id, patch);
  };

  const applyParagraph = (patch: ParagraphFormat) => {
    editor.applyParagraphFormat(story.id, patch);
  };

  const base = paragraphFormat;
  const char = character;

  return (
    <>
      <Section
        title="Character"
        hint={
          hasRange
            ? `${Math.abs(activeSelection!.end - activeSelection!.start)} characters selected`
            : "Whole story"
        }
      >
        <Row label="Font">
          <Select
            value={char?.fontId ?? "serif"}
            onValueChange={(value) => applyCharacter({ fontId: value })}
          >
            <SelectTrigger className="h-7 flex-1 rounded-[3px] border-[var(--rule)] bg-[var(--paper)] text-[0.68rem] shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PUBLISHING_FONTS.map((font) => (
                <SelectItem key={font.id} value={font.id}>
                  {font.name}
                  {font.supportsArabic ? " · AR" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
        {fontSupported === "fallback" ? (
          <p className="font-meta text-[0.48rem] uppercase tracking-[0.08em] text-[var(--gold)]">
            Preferred face not installed · using the Arabic/Latin fallback stack
          </p>
        ) : null}
        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
          <Num
            label="Size"
            suffix="pt"
            min={2}
            max={400}
            value={char?.size ?? 11}
            onCommit={(value) => applyCharacter({ size: value })}
          />
          <Num
            label="Leading"
            suffix="pt"
            min={1}
            max={600}
            value={char?.leading ?? 14}
            onCommit={(value) => applyCharacter({ leading: value })}
          />
          <Num
            label="Track"
            suffix="/1000"
            min={-200}
            max={1000}
            value={char?.tracking ?? 0}
            onCommit={(value) => applyCharacter({ tracking: value })}
          />
          <Row label="Opacity">
            <Slider
              value={[Math.round((char?.opacity ?? 1) * 100)]}
              min={10}
              max={100}
              step={1}
              onValueChange={([value]) =>
                applyCharacter({ opacity: Math.max(0.1, (value ?? 100) / 100) })
              }
            />
          </Row>
        </div>
        <div className="flex items-center gap-1">
          <Select
            value={String(char?.fontWeight ?? 400)}
            onValueChange={(value) =>
              applyCharacter({ fontWeight: Number.parseInt(value, 10) })
            }
          >
            <SelectTrigger className="h-6 w-[4.6rem] rounded-[3px] border-[var(--rule)] bg-[var(--paper)] font-meta text-[0.55rem] shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="300">Light</SelectItem>
              <SelectItem value="400">Regular</SelectItem>
              <SelectItem value="600">Semibold</SelectItem>
              <SelectItem value="700">Bold</SelectItem>
            </SelectContent>
          </Select>
          <Toggle
            active={char?.fontStyle === "italic"}
            title="Italic"
            onClick={() =>
              applyCharacter({ fontStyle: char?.fontStyle === "italic" ? "normal" : "italic" })
            }
          >
            <Italic className="h-3 w-3" />
          </Toggle>
          <Toggle
            active={(char?.fontWeight ?? 400) >= 700}
            title="Bold"
            onClick={() =>
              applyCharacter({ fontWeight: (char?.fontWeight ?? 400) >= 700 ? 400 : 700 })
            }
          >
            <Bold className="h-3 w-3" />
          </Toggle>
          <Toggle
            active={Boolean(char?.underline)}
            title="Underline"
            onClick={() => applyCharacter({ underline: !char?.underline })}
          >
            <Underline className="h-3 w-3" />
          </Toggle>
          <Toggle
            active={Boolean(char?.strikethrough)}
            title="Strikethrough"
            onClick={() => applyCharacter({ strikethrough: !char?.strikethrough })}
          >
            <Strikethrough className="h-3 w-3" />
          </Toggle>
          <Toggle
            active={char?.baseline === "super"}
            title="Superscript"
            onClick={() =>
              applyCharacter({ baseline: char?.baseline === "super" ? "normal" : "super" })
            }
          >
            <Superscript className="h-3 w-3" />
          </Toggle>
          <Toggle
            active={char?.baseline === "sub"}
            title="Subscript"
            onClick={() =>
              applyCharacter({ baseline: char?.baseline === "sub" ? "normal" : "sub" })
            }
          >
            <Subscript className="h-3 w-3" />
          </Toggle>
        </div>
        <Row label="Colour">
          <input
            type="color"
            aria-label="Text colour"
            value={/^#[0-9a-f]{6}$/i.test(char?.color ?? "") ? char!.color! : "#171716"}
            onChange={(event) => applyCharacter({ color: event.target.value })}
            className="h-7 w-8 cursor-pointer rounded-[3px] border border-[var(--rule)] bg-[var(--paper)] p-0.5"
          />
          <Input
            value={char?.color ?? "#171716"}
            onChange={(event) => applyCharacter({ color: event.target.value })}
            className="h-7 flex-1 rounded-[3px] border-[var(--rule)] bg-[var(--paper)] font-meta text-[0.62rem] uppercase shadow-none"
          />
        </Row>
      </Section>

      <Section title="Paragraph">
        <Segment
          value={base?.alignment ?? "left"}
          onChange={(value) => applyParagraph({ alignment: value })}
          options={[
            { value: "left", title: "Align left", label: <AlignLeft className="h-3 w-3" /> },
            { value: "center", title: "Align centre", label: <AlignCenter className="h-3 w-3" /> },
            { value: "right", title: "Align right", label: <AlignRight className="h-3 w-3" /> },
            { value: "justify", title: "Justify", label: <AlignJustify className="h-3 w-3" /> },
          ]}
        />
        <Row label="Direction">
          <Select
            value={base?.direction ?? "auto"}
            onValueChange={(value) =>
              applyParagraph({ direction: value as "ltr" | "rtl" | "auto" })
            }
          >
            <SelectTrigger className="h-7 flex-1 rounded-[3px] border-[var(--rule)] bg-[var(--paper)] text-[0.68rem] shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Automatic · document language</SelectItem>
              <SelectItem value="ltr">Left to right</SelectItem>
              <SelectItem value="rtl">Right to left</SelectItem>
            </SelectContent>
          </Select>
        </Row>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
          <Num
            label="Before"
            suffix="pt"
            min={0}
            value={base?.spaceBefore ?? 0}
            onCommit={(value) => applyParagraph({ spaceBefore: value })}
          />
          <Num
            label="After"
            suffix="pt"
            min={0}
            value={base?.spaceAfter ?? 0}
            onCommit={(value) => applyParagraph({ spaceAfter: value })}
          />
          <Num
            label="1st line"
            suffix="pt"
            value={base?.firstLineIndent ?? 0}
            onCommit={(value) => applyParagraph({ firstLineIndent: value })}
          />
          <Num
            label="Line"
            suffix="pt"
            min={1}
            value={base?.leading ?? 14}
            onCommit={(value) => applyParagraph({ leading: value })}
          />
          <Num
            label="Left"
            suffix="pt"
            value={base?.leftIndent ?? 0}
            onCommit={(value) => applyParagraph({ leftIndent: value })}
          />
          <Num
            label="Right"
            suffix="pt"
            value={base?.rightIndent ?? 0}
            onCommit={(value) => applyParagraph({ rightIndent: value })}
          />
        </div>
        <label className="flex items-center justify-between">
          <span className="text-[0.66rem] text-[var(--ink)]">Hyphenate</span>
          <Switch
            checked={Boolean(base?.hyphenate)}
            onCheckedChange={(checked) => applyParagraph({ hyphenate: checked })}
          />
        </label>
      </Section>

      <Section title="Frame">
        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
          <Num
            label="Columns"
            min={1}
            max={8}
            value={frame.columns}
            onCommit={(value) =>
              editor.patchObject(frame.id, { columns: Math.max(1, Math.round(value)) })
            }
          />
          <Num
            label="Gutter"
            suffix="pt"
            min={0}
            value={frame.gutter}
            onCommit={(value) => editor.patchObject(frame.id, { gutter: value })}
          />
          <Num
            label="Top"
            suffix="pt"
            min={0}
            value={frame.inset.top}
            onCommit={(value) =>
              editor.patchObject(frame.id, { inset: { ...frame.inset, top: value } })
            }
          />
          <Num
            label="Right"
            suffix="pt"
            min={0}
            value={frame.inset.right}
            onCommit={(value) =>
              editor.patchObject(frame.id, { inset: { ...frame.inset, right: value } })
            }
          />
          <Num
            label="Bottom"
            suffix="pt"
            min={0}
            value={frame.inset.bottom}
            onCommit={(value) =>
              editor.patchObject(frame.id, { inset: { ...frame.inset, bottom: value } })
            }
          />
          <Num
            label="Left"
            suffix="pt"
            min={0}
            value={frame.inset.left}
            onCommit={(value) =>
              editor.patchObject(frame.id, { inset: { ...frame.inset, left: value } })
            }
          />
        </div>
        <Row label="Vertical">
          <Select
            value={frame.verticalAlign}
            onValueChange={(value) =>
              editor.patchObject(frame.id, {
                verticalAlign: value as "top" | "middle" | "bottom",
              })
            }
          >
            <SelectTrigger className="h-7 flex-1 rounded-[3px] border-[var(--rule)] bg-[var(--paper)] text-[0.68rem] shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="top">Top</SelectItem>
              <SelectItem value="middle">Middle</SelectItem>
              <SelectItem value="bottom">Bottom</SelectItem>
            </SelectContent>
          </Select>
        </Row>
      </Section>

      <Section
        title="Threading"
        hint={
          estimate.overflowing
            ? `Estimated ${estimate.hiddenCharacters.toLocaleString()} characters do not fit`
            : "The story fits in its threaded frames"
        }
      >
        <div className="flex items-center justify-between font-meta text-[0.55rem] uppercase tracking-[0.06em] text-[var(--ink-soft)]">
          <span>{story.name}</span>
          <span className="tabular-nums">
            {currentIndex >= 0 ? `${currentIndex + 1} of ${thread.length}` : "unthreaded"}
          </span>
        </div>
        <ol className="space-y-1">
          {thread.map((entry, index) => (
            <li
              key={entry.objectId}
              className={cn(
                "flex items-center gap-1 rounded-[3px] border px-1.5 py-1",
                entry.objectId === frame.id
                  ? "border-[var(--gold)] bg-[color-mix(in_oklab,var(--gold)_8%,transparent)]"
                  : "border-[var(--rule)]",
              )}
            >
              <span className="w-4 font-meta text-[0.5rem] tabular-nums text-[var(--ink-soft)]">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-[0.62rem]">
                {entry.pageName} · {entry.objectName}
              </span>
              <button
                type="button"
                aria-label="Move frame earlier"
                disabled={index === 0}
                onClick={() => editor.reorderStoryFrame(story.id, entry.objectId, -1)}
                className="text-[var(--ink-soft)] disabled:opacity-25"
              >
                <ArrowUp className="h-3 w-3" />
              </button>
              <button
                type="button"
                aria-label="Move frame later"
                disabled={index === thread.length - 1}
                onClick={() => editor.reorderStoryFrame(story.id, entry.objectId, 1)}
                className="text-[var(--ink-soft)] disabled:opacity-25"
              >
                <ArrowDown className="h-3 w-3" />
              </button>
              <button
                type="button"
                aria-label="Remove frame from thread"
                title="Remove frame from the thread; the text is kept"
                onClick={() => editor.disconnectStoryFrame(story.id, entry.objectId)}
                className="text-[var(--ink-soft)] hover:text-[var(--red)]"
              >
                <Unlink className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ol>
        {issues.length > 0 ? (
          <ul className="space-y-0.5 border-l-2 border-[var(--red)] pl-2">
            {issues.map((issue, index) => (
              <li key={`${issue.kind}-${index}`} className="text-[0.58rem] leading-4 text-[var(--red)]">
                {issue.message}
              </li>
            ))}
          </ul>
        ) : null}
        {estimate.overflowing ? (
          <div className="flex items-center gap-1.5 rounded-[3px] bg-[color-mix(in_oklab,var(--red)_8%,transparent)] px-2 py-1.5 text-[0.58rem] leading-4 text-[var(--red)]">
            <span className="inline-block h-0 w-0 border-l-[7px] border-t-[9px] border-l-transparent border-t-[var(--red)]" />
            {estimate.hiddenCharacters.toLocaleString()} characters ({estimate.hiddenParagraphs} paragraph
            {estimate.hiddenParagraphs === 1 ? "" : "s"}) overflow the last frame. Add a frame below.
          </div>
        ) : null}
        <div className="flex gap-1">
          <Select value={candidate} onValueChange={setCandidate}>
            <SelectTrigger className="h-7 min-w-0 flex-1 rounded-[3px] border-[var(--rule)] bg-[var(--paper)] text-[0.62rem] shadow-none">
              <SelectValue placeholder="Connect a text frame…" />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((entry) => (
                <SelectItem
                  key={entry.frame.id}
                  value={`${entry.page.id}:${entry.frame.id}`}
                >
                  {entry.page.name} · {entry.frame.name || "Text frame"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            aria-label="Connect selected frame to the story"
            disabled={!candidate}
            onClick={() => {
              const [pageId, objectId] = candidate.split(":");
              if (!pageId || !objectId) return;
              editor.connectStoryFrame(story.id, pageId, objectId);
              setCandidate("");
            }}
            className="h-7 rounded-[3px] px-2"
          >
            <Link2 className="h-3 w-3" />
          </Button>
        </div>
        {currentFrame ? (
          <div className="flex gap-1">
            <Select value={moveTarget} onValueChange={setMoveTarget}>
              <SelectTrigger className="h-7 min-w-0 flex-1 rounded-[3px] border-[var(--rule)] bg-[var(--paper)] text-[0.62rem] shadow-none">
                <SelectValue placeholder="Move this frame to page…" />
              </SelectTrigger>
              <SelectContent>
                {document.pages
                  .filter((entry) => entry.id !== currentFrame.pageId)
                  .map((entry) => (
                    <SelectItem key={entry.id} value={entry.id}>
                      {entry.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              disabled={!moveTarget}
              onClick={() => {
                if (!moveTarget) return;
                void editor.moveStoryFrameToPage(story.id, frame.id, moveTarget);
                setMoveTarget("");
              }}
              className="h-7 rounded-[3px] px-2 font-meta text-[0.52rem] uppercase"
            >
              Move
            </Button>
          </div>
        ) : null}
      </Section>

      <Section title="Styles">
        <Row label="Para">
          <Select
            value={effectiveParagraphStyle?.id ?? ""}
            onValueChange={(value) => {
              setParagraphStyleId(value);
              editor.applyParagraphStyle(story.id, value);
            }}
          >
            <SelectTrigger className="h-7 min-w-0 flex-1 rounded-[3px] border-[var(--rule)] bg-[var(--paper)] text-[0.66rem] shadow-none">
              <SelectValue placeholder="Paragraph style" />
            </SelectTrigger>
            <SelectContent>
              {document.styles.paragraph.map((style) => (
                <SelectItem key={style.id} value={style.id}>
                  {style.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            title="Create a paragraph style from this frame"
            onClick={() => editor.createStyle("paragraph", story.id)}
            className="h-7 rounded-[3px] px-1.5 font-meta text-[0.52rem]"
          >
            New
          </Button>
        </Row>
        {effectiveParagraphStyle ? (
          <div className="rounded-[3px] border border-[var(--rule)] p-1.5">
            <Input
              key={effectiveParagraphStyle.id}
              defaultValue={effectiveParagraphStyle.name}
              aria-label="Paragraph style name"
              onBlur={(event) =>
                editor.renameStyle(
                  "paragraph",
                  effectiveParagraphStyle.id,
                  event.target.value,
                )
              }
              className="mb-1.5 h-6 rounded-[2px] border-[var(--rule)] bg-[var(--paper)] text-[0.66rem] shadow-none"
            />
            <div className="mb-1.5 flex gap-1">
              <Select
                value={effectiveParagraphStyle.fontId}
                onValueChange={(value) =>
                  editor.updateParagraphStyle(effectiveParagraphStyle.id, {
                    fontId: value,
                  })
                }
              >
                <SelectTrigger className="h-6 min-w-0 flex-1 rounded-[2px] border-[var(--rule)] bg-[var(--paper)] font-meta text-[0.55rem] shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PUBLISHING_FONTS.map((font) => (
                    <SelectItem key={font.id} value={font.id}>
                      {font.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Segment
                value={effectiveParagraphStyle.alignment}
                onChange={(value) =>
                  editor.updateParagraphStyle(effectiveParagraphStyle.id, {
                    alignment: value,
                  })
                }
                options={[
                  { value: "left", title: "Style: align left", label: <AlignLeft className="h-3 w-3" /> },
                  { value: "center", title: "Style: align centre", label: <AlignCenter className="h-3 w-3" /> },
                  { value: "right", title: "Style: align right", label: <AlignRight className="h-3 w-3" /> },
                  { value: "justify", title: "Style: justify", label: <AlignJustify className="h-3 w-3" /> },
                ]}
              />
            </div>
            <div className="grid grid-cols-2 gap-x-1.5 gap-y-1">
              <Num
                label="Size"
                suffix="pt"
                min={2}
                value={effectiveParagraphStyle.size}
                onCommit={(value) =>
                  editor.updateParagraphStyle(effectiveParagraphStyle.id, { size: value })
                }
              />
              <Num
                label="Line"
                suffix="pt"
                min={1}
                value={effectiveParagraphStyle.leading}
                onCommit={(value) =>
                  editor.updateParagraphStyle(effectiveParagraphStyle.id, { leading: value })
                }
              />
              <Num
                label="Before"
                suffix="pt"
                min={0}
                value={effectiveParagraphStyle.spaceBefore}
                onCommit={(value) =>
                  editor.updateParagraphStyle(effectiveParagraphStyle.id, {
                    spaceBefore: value,
                  })
                }
              />
              <Num
                label="After"
                suffix="pt"
                min={0}
                value={effectiveParagraphStyle.spaceAfter}
                onCommit={(value) =>
                  editor.updateParagraphStyle(effectiveParagraphStyle.id, {
                    spaceAfter: value,
                  })
                }
              />
            </div>
            <div className="mt-1.5 flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => editor.duplicateStyle("paragraph", effectiveParagraphStyle.id)}
                className="h-6 flex-1 rounded-[2px] px-1 font-meta text-[0.48rem] uppercase"
              >
                Duplicate
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={document.styles.paragraph.length <= 1}
                onClick={() => editor.deleteStyle("paragraph", effectiveParagraphStyle.id)}
                className="h-6 rounded-[2px] px-1.5 text-[var(--red)]"
                aria-label="Delete paragraph style"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : null}

        <Row label="Char">
          <Select
            value={effectiveCharacterStyle?.id ?? ""}
            onValueChange={(value) => {
              setCharacterStyleId(value);
              editor.applyCharacterStyle(story.id, value);
            }}
          >
            <SelectTrigger className="h-7 min-w-0 flex-1 rounded-[3px] border-[var(--rule)] bg-[var(--paper)] text-[0.66rem] shadow-none">
              <SelectValue placeholder="No character style" />
            </SelectTrigger>
            <SelectContent>
              {document.styles.character.map((style) => (
                <SelectItem key={style.id} value={style.id}>
                  {style.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            title="Create a character style from this frame"
            onClick={() => editor.createStyle("character", story.id)}
            className="h-7 rounded-[3px] px-1.5 font-meta text-[0.52rem]"
          >
            New
          </Button>
        </Row>
        {effectiveCharacterStyle ? (
          <div className="rounded-[3px] border border-[var(--rule)] p-1.5">
            <Input
              key={effectiveCharacterStyle.id}
              defaultValue={effectiveCharacterStyle.name}
              aria-label="Character style name"
              onBlur={(event) =>
                editor.renameStyle(
                  "character",
                  effectiveCharacterStyle.id,
                  event.target.value,
                )
              }
              className="mb-1.5 h-6 rounded-[2px] border-[var(--rule)] bg-[var(--paper)] text-[0.66rem] shadow-none"
            />
            <div className="mb-1.5 flex gap-1">
              <Select
                value={effectiveCharacterStyle.fontId ?? "serif"}
                onValueChange={(value) =>
                  editor.updateCharacterStyle(effectiveCharacterStyle.id, {
                    fontId: value,
                  })
                }
              >
                <SelectTrigger className="h-6 min-w-0 flex-1 rounded-[2px] border-[var(--rule)] bg-[var(--paper)] font-meta text-[0.55rem] shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PUBLISHING_FONTS.map((font) => (
                    <SelectItem key={font.id} value={font.id}>
                      {font.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Num
                label="Size"
                suffix="pt"
                min={2}
                value={effectiveCharacterStyle.size ?? char?.size ?? 11}
                onCommit={(value) =>
                  editor.updateCharacterStyle(effectiveCharacterStyle.id, {
                    size: value,
                  })
                }
              />
            </div>
            <div className="flex items-center gap-1">
              <Segment
                value={effectiveCharacterStyle.fontStyle ?? "normal"}
                onChange={(value) =>
                  editor.updateCharacterStyle(effectiveCharacterStyle.id, {
                    fontStyle: value,
                  })
                }
                options={[
                  {
                    value: "normal",
                    title: "Regular",
                    label: <span className="font-meta text-[0.48rem]">REG</span>,
                  },
                  {
                    value: "italic",
                    title: "Italic",
                    label: <Italic className="h-3 w-3" />,
                  },
                ]}
              />
              <Toggle
                active={(effectiveCharacterStyle.fontWeight ?? 400) >= 700}
                title="Bold character style"
                onClick={() =>
                  editor.updateCharacterStyle(effectiveCharacterStyle.id, {
                    fontWeight:
                      (effectiveCharacterStyle.fontWeight ?? 400) >= 700 ? 400 : 700,
                  })
                }
              >
                <Bold className="h-3 w-3" />
              </Toggle>
              <input
                type="color"
                aria-label="Character style colour"
                value={
                  /^#[0-9a-f]{6}$/i.test(effectiveCharacterStyle.color ?? "")
                    ? effectiveCharacterStyle.color!
                    : "#171716"
                }
                onChange={(event) =>
                  editor.updateCharacterStyle(effectiveCharacterStyle.id, {
                    color: event.target.value,
                  })
                }
                className="h-6 w-7 cursor-pointer rounded-[2px] border border-[var(--rule)] bg-[var(--paper)] p-0.5"
              />
            </div>
            <div className="mt-1.5 flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  editor.duplicateStyle("character", effectiveCharacterStyle.id)
                }
                className="h-6 flex-1 rounded-[2px] px-1 font-meta text-[0.48rem] uppercase"
              >
                Duplicate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => editor.deleteStyle("character", effectiveCharacterStyle.id)}
                className="h-6 rounded-[2px] px-1.5 text-[var(--red)]"
                aria-label="Delete character style"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-2 font-meta text-[0.48rem] uppercase tracking-[0.06em] text-[var(--ink-soft)]">
          <span>
            {editor.stylesStatus === "saving"
              ? "Saving style list…"
              : editor.stylesStatus === "error"
                ? editor.stylesMessage ?? "Style list not saved"
                : "Styles saved with the publication"}
          </span>
          {editor.stylesStatus === "error" ? (
            <button
              type="button"
              onClick={editor.retryStyles}
              className="shrink-0 uppercase tracking-[0.06em] text-[var(--red)] underline decoration-dotted underline-offset-2"
            >
              Retry
            </button>
          ) : null}
        </div>
      </Section>
    </>
  );
}
