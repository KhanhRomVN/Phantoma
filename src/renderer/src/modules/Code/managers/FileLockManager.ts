/**
 * ------------------------------------------------------------------
 * File Lock Manager
 * ------------------------------------------------------------------
 * Async mutex queue for serializing file operations by key (file path).
 * Ensures concurrent write/read operations on the same file are
 * executed sequentially to avoid race conditions.
 *
 * Main functions:
 * - acquire() : Acquire a lock on a key, returns a release function
 * ------------------------------------------------------------------
 */

// ─── Class ──────────────────────────────────────────────────────────────
export class FileLockManager {
  private locks = new Map<string, Promise<void>>();

  /**
   * Acquire a lock on a key (typically a file path).
   * Returns a release function. Always call release() in a finally block.
   */
  async acquire(key: string): Promise<() => void> {
    let release: () => void;

    // Create the task that the NEXT requestor will wait for
    const task = new Promise<void>((resolve) => {
      release = resolve;
    });

    // Get the current tail of the queue
    const prev = this.locks.get(key) || Promise.resolve();

    // Update the tail. Catch errors on 'prev' so strict serialization
    // continues even if a previous task failed.
    const nextFn = () => task;
    this.locks.set(key, prev.then(nextFn, nextFn));

    // Wait for the previous task to complete
    await prev.catch(() => {});

    return release!;
  }
}