/**
 * ReplaceInFileHistoryManager — Lưu lịch sử các lần replace_in_file.
 *
 * ?Usage:
 *   const mgr = ReplaceInFileHistoryManager.getInstance();
 *   await mgr.saveHistory(filePath, newContent, errorCount, warningCount, ...);
 *   const version = await mgr.getHistoryVersion(filePath, 3);
 *
 * ?Function:
 *   saveHistory()         : Lưu phiên bản mới sau mỗi lần replace.
 *   getHistoryList()      : Trả về danh sách version kèm error/warning/line count.
 *   getHistoryVersion()   : Lấy nội dung đầy đủ của một version.
 *   getCurrentVersion()   : Lấy version hiện tại của file.
 *   deleteVersionsAfter() : Xóa các version cao hơn version chỉ định.
 *
 * ?Storage:
 *   Dùng localStorage thay vì file system (khác với Zen dùng thư mục ~/khanhromvn-zen).
 *   Key format: `replace_history:{filePath}:versions`
 *
 * ?Note:
 *   Port từ temp/Zen/src/managers/ReplaceInFileHistoryManager.ts.
 *   Adapt: thay fs.writeFile bằng localStorage, bỏ crypto hash.
 */

export interface ReplaceInFileHistory {
  id: string;
  filePath: string;
  version: number;
  fullContent: string;
  errorCount: number;
  warningCount: number;
  lineCount: number;
  timestamp: number;
  messageId?: string;
  messageTimestamp?: number;
  responseNumber?: number;
}

const STORAGE_PREFIX = 'replace_history:';

export class ReplaceInFileHistoryManager {
  private static instance: ReplaceInFileHistoryManager;

  private constructor() {}

  public static getInstance(): ReplaceInFileHistoryManager {
    if (!ReplaceInFileHistoryManager.instance) {
      ReplaceInFileHistoryManager.instance = new ReplaceInFileHistoryManager();
    }
    return ReplaceInFileHistoryManager.instance;
  }

  public setActiveConversationId(_conversationId: string | null): void {
    // Giữ để tương thích signature với Zen — Code module dùng localStorage key prefix
  }

  /** Tạo storage key cho file */
  private getStorageKey(filePath: string): string {
    return `${STORAGE_PREFIX}${filePath}`;
  }

  /** Đọc tất cả versions từ localStorage */
  private async readVersions(filePath: string): Promise<ReplaceInFileHistory[]> {
    try {
      const key = this.getStorageKey(filePath);
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      return JSON.parse(raw) as ReplaceInFileHistory[];
    } catch {
      return [];
    }
  }

  /** Ghi tất cả versions vào localStorage */
  private async writeVersions(filePath: string, versions: ReplaceInFileHistory[]): Promise<void> {
    try {
      const key = this.getStorageKey(filePath);
      localStorage.setItem(key, JSON.stringify(versions));
    } catch (e) {
      console.error('[ReplaceInFileHistoryManager] Failed to write versions:', e);
    }
  }

  /** Lấy version hiện tại của file */
  public async getCurrentVersion(filePath: string): Promise<number> {
    const versions = await this.readVersions(filePath);
    return versions.length > 0 ? versions[versions.length - 1].version : 0;
  }

  /** Lưu phiên bản mới sau replace */
  public async saveHistory(
    filePath: string,
    newContent: string,
    errorCount: number,
    warningCount: number,
    messageId?: string,
    messageTimestamp?: number,
    responseNumber?: number,
    _oldContent?: string, // Giữ tương thích signature với Zen
    _oldContentErrorCount?: number,
    _oldContentWarningCount?: number,
  ): Promise<void> {
    const versions = await this.readVersions(filePath);
    const nextVersion = versions.length > 0 ? versions[versions.length - 1].version + 1 : 1;

    const entry: ReplaceInFileHistory = {
      id: `v${nextVersion}_${Date.now()}`,
      filePath,
      version: nextVersion,
      fullContent: newContent,
      errorCount,
      warningCount,
      lineCount: newContent.split(/\r?\n/).length,
      timestamp: Date.now(),
      messageId,
      messageTimestamp,
      responseNumber,
    };

    versions.push(entry);
    await this.writeVersions(filePath, versions);
  }

  /** Lấy danh sách versions (không bao gồm fullContent để tiết kiệm bộ nhớ) */
  public async getHistoryList(filePath: string): Promise<Omit<ReplaceInFileHistory, 'fullContent'>[]> {
    const versions = await this.readVersions(filePath);
    return versions.map(({ fullContent: _, ...rest }) => rest);
  }

  /** Lấy nội dung đầy đủ của một version cụ thể */
  public async getHistoryVersion(
    filePath: string,
    version: number,
  ): Promise<ReplaceInFileHistory | null> {
    const versions = await this.readVersions(filePath);
    return versions.find((v) => v.version === version) || null;
  }

  /** Xóa tất cả versions cao hơn version chỉ định (dùng khi revert) */
  public async deleteVersionsAfter(filePath: string, version: number): Promise<void> {
    const versions = await this.readVersions(filePath);
    const filtered = versions.filter((v) => v.version <= version);
    await this.writeVersions(filePath, filtered);
  }
}