import { useEffect } from "react";

/**
 * Alt+[ folds the left panel, Alt+] folds the inspector, Alt+\ folds both.
 *
 * Ignored while typing or while a control has focus, so the shortcut can never
 * swallow a bracket from a document title or a text frame.
 */
export function useStudioPaneShortcuts({
  onToggleLeft,
  onToggleRight,
  onToggleBoth,
}: {
  onToggleLeft: () => void;
  onToggleRight: () => void;
  onToggleBoth: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey || event.metaKey || event.ctrlKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          "input, textarea, select, button, [contenteditable='true'], [role='dialog']",
        )
      ) {
        return;
      }
      if (event.key === "[") {
        event.preventDefault();
        onToggleLeft();
        return;
      }
      if (event.key === "]") {
        event.preventDefault();
        onToggleRight();
        return;
      }
      if (event.key === "\\") {
        event.preventDefault();
        onToggleBoth();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onToggleBoth, onToggleLeft, onToggleRight]);
}
