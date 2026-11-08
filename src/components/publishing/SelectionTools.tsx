import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  ArrowDownToLine,
  ArrowUpToLine,
  BetweenHorizontalEnd,
  BetweenVerticalEnd,
  CopyPlus,
  EyeOff,
  Lock,
  LockOpen,
  Rows3,
  Scaling,
  Ungroup,
  ChevronsUp,
  ChevronsDown,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AlignKind } from "@/lib/arrange";
import type { ArrangeMode, MatchSizeMode } from "@/lib/publishing/tools";
import { cn } from "@/lib/utils";

/**
 * The selection's arrangement tools. Every control is wired to a real page
 * transform and therefore to one history entry; the bar only appears when
 * something is selected, so the canvas never carries dormant furniture.
 */
export interface SelectionToolsProps {
  count: number;
  onAlign: (mode: AlignKind) => void;
  onDistribute: (axis: "h" | "v") => void;
  onMatchSize: (mode: MatchSizeMode) => void;
  onGroup: () => void;
  onUngroup: () => void;
  onDuplicate: () => void;
  onArrange: (mode: ArrangeMode) => void;
  onLock: (locked: boolean) => void;
  onHide: (hidden: boolean) => void;
}

function Tool({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="size-7 rounded-[3px] text-[var(--ink-soft)] hover:bg-[color-mix(in_oklab,var(--ink)_7%,transparent)] hover:text-[var(--ink)]"
    >
      {children}
    </Button>
  );
}

function Group({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <div
      className="flex items-center gap-0.5 rounded-[4px] border border-[var(--rule)] bg-[var(--paper)] px-0.5"
      aria-label={label}
      role="group"
    >
      {children}
    </div>
  );
}

export function SelectionTools({
  count,
  onAlign,
  onDistribute,
  onMatchSize,
  onGroup,
  onUngroup,
  onDuplicate,
  onArrange,
  onLock,
  onHide,
}: SelectionToolsProps) {
  if (count === 0) return null;
  const many = count > 1;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1 border-b border-[var(--rule)] bg-[var(--paper-light)] px-2 py-1",
      )}
      data-selection-tools
    >
      <span className="mr-1 font-meta text-[0.55rem] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
        {count} selected
      </span>

      <Group label="Align">
        <Tool label="Align left" onClick={() => onAlign("left")}>
          <AlignStartVertical className="size-3.5" />
        </Tool>
        <Tool label="Align horizontal centres" onClick={() => onAlign("hcenter")} disabled={!many}>
          <AlignCenterVertical className="size-3.5" />
        </Tool>
        <Tool label="Align right" onClick={() => onAlign("right")}>
          <AlignEndVertical className="size-3.5" />
        </Tool>
        <Tool label="Align top" onClick={() => onAlign("top")}>
          <AlignStartHorizontal className="size-3.5" />
        </Tool>
        <Tool label="Align vertical centres" onClick={() => onAlign("vcenter")} disabled={!many}>
          <AlignCenterHorizontal className="size-3.5" />
        </Tool>
        <Tool label="Align bottom" onClick={() => onAlign("bottom")}>
          <AlignEndHorizontal className="size-3.5" />
        </Tool>
      </Group>

      <Group label="Distribute">
        <Tool
          label="Distribute horizontally"
          onClick={() => onDistribute("h")}
          disabled={count < 3}
        >
          <BetweenHorizontalEnd className="size-3.5" />
        </Tool>
        <Tool
          label="Distribute vertically"
          onClick={() => onDistribute("v")}
          disabled={count < 3}
        >
          <BetweenVerticalEnd className="size-3.5" />
        </Tool>
      </Group>

      <Group label="Size">
        <Tool label="Match width" onClick={() => onMatchSize("width")} disabled={!many}>
          <Scaling className="size-3.5" />
        </Tool>
        <Tool label="Match height" onClick={() => onMatchSize("height")} disabled={!many}>
          <Rows3 className="size-3.5" />
        </Tool>
      </Group>

      <Group label="Stack">
        <Tool label="Bring to front" onClick={() => onArrange("front")}>
          <ChevronsUp className="size-3.5" />
        </Tool>
        <Tool label="Bring forward" onClick={() => onArrange("forward")}>
          <ChevronUp className="size-3.5" />
        </Tool>
        <Tool label="Send backward" onClick={() => onArrange("backward")}>
          <ChevronDown className="size-3.5" />
        </Tool>
        <Tool label="Send to back" onClick={() => onArrange("back")}>
          <ChevronsDown className="size-3.5" />
        </Tool>
      </Group>

      <Group label="Group">
        <Tool label="Group selection" onClick={onGroup} disabled={!many}>
          <ArrowDownToLine className="size-3.5" />
        </Tool>
        <Tool label="Ungroup selection" onClick={onUngroup} disabled={!many}>
          <Ungroup className="size-3.5" />
        </Tool>
        <Tool label="Duplicate with offset" onClick={onDuplicate}>
          <CopyPlus className="size-3.5" />
        </Tool>
      </Group>

      <Group label="Lock and visibility">
        <Tool label="Lock selection" onClick={() => onLock(true)}>
          <Lock className="size-3.5" />
        </Tool>
        <Tool label="Unlock selection" onClick={() => onLock(false)}>
          <LockOpen className="size-3.5" />
        </Tool>
        <Tool label="Hide selection" onClick={() => onHide(true)}>
          <EyeOff className="size-3.5" />
        </Tool>
        <Tool label="Show selection" onClick={() => onHide(false)}>
          <ArrowUpToLine className="size-3.5" />
        </Tool>
      </Group>
    </div>
  );
}
