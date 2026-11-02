/**
 * The shared autosave queue every workspace writes through.
 *
 * Editing a document produces one change per keystroke, so the queue waits a
 * beat after the last edit, saves only the newest document, and never lets a
 * slow response write over a newer edit. It is deliberately framework-free so
 * the studio hook, and later the print, shape and press workspaces, share one
 * implementation instead of three subtly different debounces.
 */
export type SaveState = "saved" | "unsaved" | "saving" | "error";

export interface AutosaveOptions<T> {
  /** Persists one document. Throwing marks the save as failed. */
  save: (value: T) => Promise<void>;
  /** How long to wait after the last edit before saving, in milliseconds. */
  delayMs?: number;
  /** Reports every state transition. */
  onStateChange?: (state: SaveState) => void;
  /** Reports a failed save so the caller can explain it. */
  onError?: (error: unknown) => void;
}

const DEFAULT_DELAY = 800;

export class AutosaveQueue<T> {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending: { value: T } | null = null;
  private inFlight: Promise<void> | null = null;
  /** Bumped on every edit, so a stale result cannot claim the document. */
  private token = 0;
  private state: SaveState = "saved";
  private options: AutosaveOptions<T>;

  constructor(options: AutosaveOptions<T>) {
    this.options = options;
  }

  /** Keeps the queue stable while its save function follows the props. */
  configure(options: Partial<AutosaveOptions<T>>): void {
    this.options = { ...this.options, ...options };
  }

  get current(): SaveState {
    return this.state;
  }

  get hasPending(): boolean {
    return this.pending !== null;
  }

  /** Records an edit and restarts the wait. Only the newest edit is saved. */
  schedule(value: T): void {
    this.pending = { value };
    this.token += 1;
    this.setState("unsaved");
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, this.options.delayMs ?? DEFAULT_DELAY);
  }

  /** The document is already stored: drop anything waiting to be written. */
  markSaved(): void {
    this.pending = null;
    this.token += 1;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.setState("saved");
  }

  /**
   * Writes immediately. Returns whether the document reached the server; a
   * failed save keeps the document so the caller can try again.
   */
  async flush(value?: T): Promise<boolean> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (value !== undefined) this.pending = { value };

    // One save at a time: a second flush waits for the first to finish.
    if (this.inFlight) await this.inFlight;

    const next = this.pending;
    if (!next) return this.state !== "error";
    this.pending = null;

    const token = this.token;
    this.setState("saving");
    const save = this.options.save;
    this.inFlight = (async () => {
      try {
        await save(next.value);
        if (token === this.token) this.setState("saved");
      } finally {
        this.inFlight = null;
      }
    })();

    try {
      await this.inFlight;
      return true;
    } catch (error) {
      // A newer edit may already be waiting; it will be saved on its own.
      if (!this.pending) this.pending = next;
      if (token === this.token) {
        this.setState("error");
        this.options.onError?.(error);
      }
      return false;
    }
  }

  /** Saves whatever is pending, for an unmount or a page close. */
  async dispose(): Promise<void> {
    await this.flush();
  }

  private setState(next: SaveState) {
    if (this.state === next) return;
    this.state = next;
    this.options.onStateChange?.(next);
  }
}
