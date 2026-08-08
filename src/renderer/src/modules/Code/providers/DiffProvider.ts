/**
 * DiffProvider — Cung cấp nội dung cho diff view.
 *
 * ?Usage:
 *   DiffProvider.instance.store(key, content);
 *   const uri = DiffProvider.toUri(key, filename);
 *
 * ?Function:
 *   store() : Lưu nội dung tạm vào Map.
 *   get()   : Lấy nội dung đã lưu.
 *   toUri() : Tạo URI ảo cho diff view.
 *
 * ?Note:
 *   Port từ temp/Zen/src/providers/DiffProvider.ts.
 *   Adapt: Zen dùng vscode.Uri + TextDocumentContentProvider.
 *   Code module dùng Map + custom URI scheme hoặc emit event.
 *   Đây là phiên bản đơn giản — diff view sẽ được xử lý bởi Code UI.
 */

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