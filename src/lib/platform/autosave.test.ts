import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AutosaveQueue, type SaveState } from "./autosave";

/** A save function the test resolves by hand, so timing is explicit. */
function controlledSave<T>() {
  const calls: T[] = [];
  let resolveNext: (() => void) | null = null;
  let rejectNext: ((error: unknown) => void) | null = null;
  const save = (value: T) =>
    new Promise<void>((resolve, reject) => {
      calls.push(value);
      resolveNext = resolve;
      rejectNext = reject;
    });
  return {
    save,
    calls,
    resolve: () => resolveNext?.(),
    reject: (error: unknown) => rejectNext?.(error),
  };
}

describe("the shared autosave queue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits for the last edit and saves only the newest document", async () => {
    const server = controlledSave<string>();
    const queue = new AutosaveQueue<string>({ save: server.save, delayMs: 500 });

    queue.schedule("a");
    queue.schedule("ab");
    queue.schedule("abc");
    await vi.advanceTimersByTimeAsync(499);
    expect(server.calls).toEqual([]);

    await vi.advanceTimersByTimeAsync(1);
    expect(server.calls).toEqual(["abc"]);
  });

  it("walks saved → unsaved → saving → saved", async () => {
    const states: SaveState[] = [];
    const server = controlledSave<string>();
    const queue = new AutosaveQueue<string>({
      save: server.save,
      delayMs: 100,
      onStateChange: (state) => states.push(state),
    });

    queue.schedule("a");
    await vi.advanceTimersByTimeAsync(100);
    expect(queue.current).toBe("saving");
    server.resolve();
    await vi.advanceTimersByTimeAsync(0);

    expect(states).toEqual(["unsaved", "saving", "saved"]);
    expect(queue.current).toBe("saved");
  });

  it("reports a failure, keeps the document and recovers on retry", async () => {
    const errors: unknown[] = [];
    const server = controlledSave<string>();
    const queue = new AutosaveQueue<string>({
      save: server.save,
      delayMs: 50,
      onError: (error) => errors.push(error),
    });

    queue.schedule("a");
    await vi.advanceTimersByTimeAsync(50);
    server.reject(new Error("offline"));
    await vi.advanceTimersByTimeAsync(0);

    expect(queue.current).toBe("error");
    expect(errors).toHaveLength(1);
    expect(queue.hasPending).toBe(true);

    const retry = queue.flush();
    await vi.advanceTimersByTimeAsync(0);
    server.resolve();
    await expect(retry).resolves.toBe(true);
    expect(queue.current).toBe("saved");
  });

  it("never lets an in-flight save hide a newer edit", async () => {
    const server = controlledSave<string>();
    const queue = new AutosaveQueue<string>({ save: server.save, delayMs: 10 });

    queue.schedule("first");
    await vi.advanceTimersByTimeAsync(10);
    queue.schedule("second");

    server.resolve();
    await vi.advanceTimersByTimeAsync(0);
    // The newer edit is still unsaved, so the state must not read "saved".
    expect(queue.current).toBe("unsaved");
    expect(queue.hasPending).toBe(true);
  });

  it("flushes immediately and cancels the waiting timer", async () => {
    const server = controlledSave<string>();
    const queue = new AutosaveQueue<string>({ save: server.save, delayMs: 5000 });

    queue.schedule("draft");
    const flushed = queue.flush("now");
    await vi.advanceTimersByTimeAsync(0);
    expect(server.calls).toEqual(["now"]);

    server.resolve();
    await expect(flushed).resolves.toBe(true);

    await vi.advanceTimersByTimeAsync(5000);
    expect(server.calls).toEqual(["now"]);
  });

  it("forgets a pending edit once the document is known to be saved", () => {
    const server = controlledSave<string>();
    const queue = new AutosaveQueue<string>({ save: server.save, delayMs: 10 });

    queue.schedule("a");
    queue.markSaved();
    expect(queue.current).toBe("saved");
    expect(queue.hasPending).toBe(false);
  });
});
