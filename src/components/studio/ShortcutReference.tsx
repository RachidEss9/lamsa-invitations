import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

interface Shortcut {
  keys: string[];
  action: string;
  group: "Canvas" | "Selection" | "Text" | "View" | "File";
  note?: string;
}

function shortcutsFor(mac: boolean): Shortcut[] {
  const mod = mac ? "⌘" : "Ctrl";
  const alt = mac ? "⌥" : "Alt";
  const shift = "⇧";
  return [
    { keys: [mod, "Z"], action: "Undo", group: "Canvas" },
    { keys: [mod, shift, "Z"], action: "Redo", group: "Canvas" },
    { keys: [mod, "Y"], action: "Redo (Windows)", group: "Canvas" },
    { keys: [mod, "S"], action: "Save the design", group: "File" },
    { keys: [mod, "Enter"], action: "Open the guest preview", group: "View" },
    { keys: ["Space", "drag"], action: "Pan the canvas", group: "View" },
    { keys: [mod, "wheel"], action: "Zoom around the pointer", group: "View" },
    { keys: [mod, "+"], action: "Zoom in", group: "View" },
    { keys: [mod, "−"], action: "Zoom out", group: "View" },
    { keys: [mod, "0"], action: "Fit the canvas and reset the view", group: "View" },
    { keys: ["P"], action: "Play or pause the timeline", group: "View" },
    { keys: ["Escape"], action: "Cancel editing, menu, or selection", group: "Selection" },
    { keys: [mod, "A"], action: "Select every unlocked layer", group: "Selection" },
    { keys: ["Shift", "click"], action: "Add or remove a layer from the selection", group: "Selection" },
    { keys: [mod, "C"], action: "Copy selected layers", group: "Selection" },
    { keys: [mod, "X"], action: "Cut selected layers", group: "Selection" },
    { keys: [mod, "V"], action: "Paste copied layers", group: "Selection" },
    { keys: [mod, "D"], action: "Duplicate selected layers", group: "Selection" },
    { keys: ["Delete"], action: "Delete selected layers", group: "Selection" },
    { keys: ["Backspace"], action: "Delete selected layers", group: "Selection" },
    { keys: [mod, "G"], action: "Group selected layers", group: "Selection" },
    { keys: [mod, shift, "G"], action: "Ungroup selected layers", group: "Selection" },
    { keys: [mod, shift, "L"], action: "Lock or unlock selected layers", group: "Selection" },
    { keys: [mod, shift, "H"], action: "Hide or show selected layers", group: "Selection" },
    { keys: [mod, "]"], action: "Bring selected layers to the front", group: "Selection" },
    { keys: [mod, "["], action: "Send selected layers to the back", group: "Selection" },
    { keys: ["↑", "↓", "←", "→"], action: "Nudge by 1 px", group: "Canvas" },
    { keys: [shift, "arrows"], action: "Nudge by 10 px", group: "Canvas" },
    { keys: ["Shift", "resize"], action: "Resize proportionally", group: "Canvas" },
    { keys: [alt, "drag"], action: "Duplicate while dragging", group: "Canvas" },
    { keys: ["right-click"], action: "Open the layer action menu", group: "Canvas" },
    { keys: ["Double-click"], action: "Edit a text layer in place", group: "Text" },
    { keys: ["Enter"], action: "Finish text editing", group: "Text" },
    { keys: [shift, "Enter"], action: "Insert a line break while editing", group: "Text" },
    { keys: ["Escape"], action: "Cancel text editing", group: "Text", note: "Leaves the original wording untouched." },
    { keys: [mod, "A"], action: "Select all text inside the editor", group: "Text" },
  ];
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex min-w-5 items-center justify-center border border-ink/20 bg-white px-1.5 py-0.5 font-meta text-[9px] leading-none text-ink/65">
      {children}
    </kbd>
  );
}

export function ShortcutReference({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const mac =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  const shortcuts = useMemo(() => shortcutsFor(mac), [mac]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return shortcuts;
    return shortcuts.filter((shortcut) =>
      `${shortcut.action} ${shortcut.group} ${shortcut.keys.join(" ")}`
        .toLowerCase()
        .includes(needle),
    );
  }, [query, shortcuts]);

  const groups = ["Canvas", "Selection", "Text", "View", "File"] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[84vh] max-w-2xl grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-0 overflow-hidden border-ink/20 p-0">
        <DialogHeader className="border-b border-ink/12 px-5 py-4">
          <DialogTitle className="font-display text-2xl">Keyboard shortcuts</DialogTitle>
          <DialogDescription className="text-[11px] leading-relaxed text-ink/50">
            {mac ? "Command" : "Ctrl"} is used on this platform. Shortcuts never fire
            while you are typing in a field or editing text on the canvas.
          </DialogDescription>
        </DialogHeader>
        <div className="border-b border-ink/12 px-5 py-3">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink/35" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search undo, group, zoom…"
              className="h-9 rounded-none border-ink/20 pl-8 text-[12px]"
              autoFocus
            />
          </label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-[12px] text-ink/45">
              No shortcut matches that search.
            </p>
          ) : (
            groups.map((group) => {
              const items = filtered.filter((shortcut) => shortcut.group === group);
              if (items.length === 0) return null;
              return (
                <section key={group} className="mb-5">
                  <h3 className="mb-2 font-meta text-[8px] uppercase tracking-[0.2em] text-ink/35">
                    {group}
                  </h3>
                  <div className="divide-y divide-ink/8 border-y border-ink/10">
                    {items.map((shortcut, index) => (
                      <div
                        key={`${shortcut.action}-${index}`}
                        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2"
                      >
                        <div>
                          <p className="text-[11px] text-ink/80">{shortcut.action}</p>
                          {shortcut.note && (
                            <p className="text-[9px] text-ink/40">{shortcut.note}</p>
                          )}
                        </div>
                        <span className="flex flex-wrap items-center gap-1">
                          {shortcut.keys.map((key, keyIndex) => (
                            <Kbd key={`${key}-${keyIndex}`}>{key}</Kbd>
                          ))}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </div>
        <p className="border-t border-ink/12 px-5 py-2.5 text-[9px] leading-relaxed text-ink/40">
          Browser-reserved combinations are handled carefully: saving and find are
          intercepted only inside the studio, and text fields keep every native
          editing shortcut.
        </p>
      </DialogContent>
    </Dialog>
  );
}
