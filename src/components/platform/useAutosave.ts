import { useCallback, useEffect, useState } from "react";
import { AutosaveQueue, type SaveState } from "@/lib/platform/autosave";

interface UseAutosaveOptions {
  /** How long to wait after the last edit before saving. */
  delayMs?: number;
  onError?: (error: unknown) => void;
}

/**
 * Wires the shared autosave queue into a component: `schedule` records an
 * edit, `flush` writes straight away, and `state` is the label the interface
 * shows. The queue survives re-renders, and an unmount writes whatever is
 * still pending.
 */
export function useAutosave<T>(
  save: (value: T) => Promise<void>,
  options: UseAutosaveOptions = {},
) {
  const [state, setState] = useState<SaveState>("saved");
  // The queue is created once and kept for the component's lifetime, so its
  // timer and in-flight save survive every re-render.
  const [queue] = useState(
    () =>
      new AutosaveQueue<T>({
        save,
        delayMs: options.delayMs,
        onStateChange: setState,
        onError: options.onError,
      }),
  );

  useEffect(() => {
    queue.configure({
      save,
      delayMs: options.delayMs,
      onError: options.onError,
    });
  }, [queue, save, options.delayMs, options.onError]);

  useEffect(() => {
    return () => {
      void queue.dispose();
    };
  }, [queue]);

  const schedule = useCallback(
    (value: T) => {
      queue.schedule(value);
    },
    [queue],
  );

  const flush = useCallback(
    (value?: T) => queue.flush(value),
    [queue],
  );

  const markSaved = useCallback(() => {
    queue.markSaved();
  }, [queue]);

  return { state, schedule, flush, markSaved };
}
