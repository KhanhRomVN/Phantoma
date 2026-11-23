/**
 * ------------------------------------------------------------------
 * Diff Provider
 * ------------------------------------------------------------------
 * In-memory storage provider for diff comparison content.
 * Stores temporary file snapshots keyed by a unique identifier,
 * and generates virtual URIs for Monaco diff editor views.
 *
 * Main functions:
 * - store()   : Save content under a key
 * - get()     : Retrieve stored content by key
 * - toUri()   : Generate a virtual diff:// URI for Monaco
 * - clear()   : Remove a single stored entry
 * - clearAll(): Remove all stored entries
 * ------------------------------------------------------------------
 */

// ─── Class ──────────────────────────────────────────────────────────────
export class DiffProvider {
  public static instance = new DiffProvider();
  private store_ = new Map<string, string>();

  private constructor() {}

  /** Lưu nội dung tạm */
  public store(key: string, content: string): void {
    this.store_.set(key, content);
  }

  /** Lấy nội dung đã lưu */
  public get(key: string): string | undefined {
    return this.store_.get(key);
  }

  /** Tạo URI ảo cho diff view */
  public static toUri(key: string, filename: string): string {
    return `diff://${key}/${filename}`;
  }

  /** Xóa nội dung đã lưu */
  public clear(key: string): void {
    this.store_.delete(key);
  }

  /** Xóa tất cả */
  public clearAll(): void {
    this.store_.clear();
  }
}