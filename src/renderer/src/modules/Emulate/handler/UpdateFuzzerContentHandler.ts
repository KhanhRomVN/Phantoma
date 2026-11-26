/**
 * ------------------------------------------------------------------
 * UpdateFuzzerContentHandler
 * ------------------------------------------------------------------
 * Lớp giao tiếp IPC (window.api) cho nội dung fuzzer lưu dạng JSON
 * file. Logic replace/validate nằm ở UpdateFuzzerContentExecutor.
 *
 * Các methods chính:
 * - getFilePath() : Đường dẫn file tương ứng với target
 * - readFile()    : Đọc file qua IPC
 * - writeFile()   : Ghi file qua IPC
 * ------------------------------------------------------------------
 */

// ─── Types ──────────────────────────────────────────────────────────────
export type FuzzerTarget = 'params' | 'headers' | 'body';

// ─── Functions ──────────────────────────────────────────────────────────
const getApi = () => {
  const api = (window as any).api;
  if (!api?.invoke) throw new Error('IPC not available');
  return api;
};

// ─── Class ──────────────────────────────────────────────────────────────
export class UpdateFuzzerContentHandler {
  /**
   * Format: ~/.phantoma/emulate/{targetId}/fuzzers/fuzzer_{requestId}/{target}.json
   */
  public async getFilePath(
    targetId: string,
    requestId: string,
    target: FuzzerTarget,
  ): Promise<string> {
    const homedir = await getApi().invoke('fs:get-homedir');
    return `${homedir}/.phantoma/emulate/${targetId}/fuzzers/fuzzer_${requestId}/${target}.json`;
  }

  public async readFile(filePath: string): Promise<string> {
    return getApi().invoke('fs:read-file', filePath);
  }

  public async writeFile(filePath: string, content: string): Promise<void> {
    await getApi().invoke('fs:write-file', filePath, content);
  }
}