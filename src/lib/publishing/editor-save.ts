/**
 * Autosave for the publishing editor.
 *
 * The shared `AutosaveQueue` already knows how to debounce, serialise and
 * never let a slow response overwrite a newer edit, so this module builds on
 * it instead of inventing a second timer. What it adds is publishing-specific:
 *
 *   - one save per dirty page and story, each with the server's optimistic
 *     concurrency guard (so a stale editor is refused, never silently
 *     overwriting someone else);
 *   - the expected versions, learned from the loaded document and from every
 *     successful save, so the guard stays current for the next write;
 *   - a conflict state that stops the queue instead of retrying forever. The
 *     editor must resolve it explicitly: keep the local copy, or reload.
 */

import { AutosaveQueue, type SaveState } from "../platform/autosave";
import type { PublicationPage, Story } from "./model";

export type PublishingSaveStatus = SaveState | "conflict";

/** A save the server refused because the record moved on. */
export class SaveConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SaveConflictError";
  }
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "";
}

/** Every Phase 2 concurrency guard uses this wording. */
export function isSaveConflict(error: unknown): boolean {
  return /changed elsewhere/i.test(messageOf(error));
}

export interface SaveBatch {
  pages: PublicationPage[];
  stories: Story[];
}

export interface SavedVersion {
  version: number;
}

export interface PublishingSaverOptions {
  savePage: (
    page: PublicationPage,
    expectedVersion: number | undefined,
  ) => Promise<SavedVersion>;
  saveStory: (
    story: Story,
    expectedVersion: number | undefined,
  ) => Promise<SavedVersion>;
  /** How long to wait after the last edit, in milliseconds. */
  delayMs?: number;
  onStatus?: (status: PublishingSaveStatus, message?: string) => void;
  onPageSaved?: (pageId: string, version: number) => void;
  onStorySaved?: (storyId: string, version: number) => void;
}

const DEFAULT_DELAY = 700;

export class PublishingSaver {
  private readonly queue: AutosaveQueue<SaveBatch>;
  private readonly options: PublishingSaverOptions;
  private readonly pageVersions = new Map<string, number>();
  private readonly storyVersions = new Map<string, number>();
  private status: PublishingSaveStatus = "saved";
  private notified: PublishingSaveStatus = "saved";
  private overwriteNext = false;
  /** The newest batch held back while a conflict is unresolved. */
  private blocked: SaveBatch | null = null;

  constructor(options: PublishingSaverOptions) {
    this.options = options;
    this.queue = new AutosaveQueue<SaveBatch>({
      save: (batch) => this.write(batch),
      delayMs: options.delayMs ?? DEFAULT_DELAY,
      onStateChange: (state) => this.publish(state),
      onError: (error) => this.report(error),
    });
  }

  get current(): PublishingSaveStatus {
    return this.status;
  }

  get hasPending(): boolean {
    return this.blocked !== null || this.queue.hasPending;
  }

  /** The expected version for a record, seeded from the loaded document. */
  setPageBaseline(pageId: string, version: number): void {
    this.raise(this.pageVersions, pageId, version);
  }

  setStoryBaseline(storyId: string, version: number): void {
    this.raise(this.storyVersions, storyId, version);
  }

  private raise(map: Map<string, number>, id: string, version: number): void {
    if (!Number.isFinite(version)) return;
    const current = map.get(id);
    if (current === undefined || version > current) map.set(id, version);
  }

  /** Records an edit. Only the newest batch is written. */
  schedule(batch: SaveBatch): void {
    if (batch.pages.length === 0 && batch.stories.length === 0) return;
    // A conflict is a decision for the designer, not something to retry past.
    if (this.status === "conflict") {
      this.blocked = batch;
      return;
    }
    this.queue.schedule(batch);
  }

  /** Writes immediately; returns whether the batch reached the server. */
  async flush(batch?: SaveBatch): Promise<boolean> {
    if (this.status === "conflict") {
      if (batch) this.blocked = batch;
      return false;
    }
    return this.queue.flush(batch);
  }

  /**
   * The explicit "keep my version" answer to a conflict: the next write drops
   * the version guard, because the designer has seen the warning and chosen.
   */
  async overwriteWithLocal(batch?: SaveBatch): Promise<boolean> {
    const pending = batch ?? this.blocked;
    this.blocked = null;
    this.status = "saved";
    this.overwriteNext = true;
    if (!pending) {
      this.notify("saved");
      return true;
    }
    return this.queue.flush(pending);
  }

  /** Forgets a conflict after the editor reloaded the server copy. */
  clearConflict(): void {
    this.blocked = null;
    if (this.status === "conflict") {
      this.status = "saved";
      this.notify("saved");
    }
  }

  async dispose(): Promise<void> {
    await this.queue.dispose();
  }

  private async write(batch: SaveBatch): Promise<void> {
    const force = this.overwriteNext;
    this.overwriteNext = false;

    // Stories first: text frames name them, so the page write that follows
    // never references a story the server has not stored yet.
    for (const story of batch.stories) {
      const expected = force ? undefined : this.storyVersions.get(story.id);
      try {
        const result = await this.options.saveStory(story, expected);
        this.storyVersions.set(story.id, result.version);
        this.options.onStorySaved?.(story.id, result.version);
      } catch (error) {
        throw this.translate(error);
      }
    }

    for (const page of batch.pages) {
      const expected = force ? undefined : this.pageVersions.get(page.id);
      try {
        const result = await this.options.savePage(page, expected);
        this.pageVersions.set(page.id, result.version);
        this.options.onPageSaved?.(page.id, result.version);
      } catch (error) {
        throw this.translate(error);
      }
    }
  }

  private translate(error: unknown): unknown {
    return isSaveConflict(error) ? new SaveConflictError(messageOf(error)) : error;
  }

  private publish(state: SaveState): void {
    // While a conflict stands, queue chatter must not hide it.
    if (this.status === "conflict") return;
    this.status = state;
    this.notify(state);
  }

  private report(error: unknown): void {
    if (error instanceof SaveConflictError) {
      this.status = "conflict";
      this.notify("conflict", error.message);
      return;
    }
    this.status = "error";
    this.notify("error", messageOf(error) || "The publication could not be saved.");
  }

  private notify(status: PublishingSaveStatus, message?: string): void {
    if (status === this.notified && !message) return;
    this.notified = status;
    this.options.onStatus?.(status, message);
  }
}
