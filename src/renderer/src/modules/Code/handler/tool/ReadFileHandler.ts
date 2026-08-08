/**
 * ReadFileHandler — Đọc nội dung file, hỗ trợ đọc theo dòng, diagnostics.
 *
 * ?Usage:
 *   const handler = new ReadFileHandler();
 *   await handler.handle(message);
 *
 * ?Function:
 *   handle(): Đọc file, hỗ trợ start_line/end_line, skipDiagnostics.
 *
 * ?Note:
 *   Port từ temp/Zen/src/handlers/tool/ReadFileHandler.ts.
 *   Adapt: thay vscode.workspace.fs → window.api.invoke('fs:read-file').
 *   Adapt: thay vscode.WebviewView.postMessage → return Promise<Result>.
 */

import { SecurityValidator } from '../../utils/security';

export interface ReadFileParams {
  path?: string;
  filePath?: string;
  file_path?: string;
  start_line?: number;
  startLine?: number;
  end_line?: number;
  endLine?: number;
  skipDiagnostics?: boolean;
  requestId?: string;
}

export interface ReadFileResult {
  command: string;
  requestId?: string;
  path?: string;
  content?: string;
  diagnostics?: Array<{
    severity: string;
    message: string;
    line: number;
    column: number;
    source?: string;
    code?: string | number;
  }>;
  error?: string;
}

export class ReadFileHandler {
  /**
   * Đọc file và trả về kết quả (thay vì postMessage như Zen).
   */
  public async handle(message: ReadFileParams): Promise<ReadFileResult> {
    const pathValue = message.path || message.filePath || message.file_path;
    if (!pathValue) {
      return {
        command: 'fileContent',
        requestId: message.requestId,
        error: "The 'path' argument must be of type string.",
      };
    }

    try {
      // Security check
      const securityCheck = SecurityValidator.validatePath(pathValue, false);
      if (!securityCheck.safe) {
        return {
          command: 'fileContent',
          requestId: message.requestId,
          error: securityCheck.reason || 'Security validation failed',
        };
      }

      const api = (window as any).api;
      if (!api?.invoke) {
        throw new Error('IPC not available');
      }

      let content: string = await api.invoke('fs:read-file', pathValue);

      // Xử lý start_line / end_line
      const startLine = message.start_line ?? message.startLine;
      const endLine = message.end_line ?? message.endLine;
      if (startLine !== undefined) {
        const lines = content.split(/\r?\n/);
        const end = endLine !== undefined ? endLine + 1 : lines.length;
        content = lines.slice(startLine || 0, end).join('\n');
      }

      // TODO: Lấy diagnostics từ LSP client khi cần
      // Hiện tại trả về mảng rỗng, sẽ tích hợp sau
      const diagnostics: any[] = [];

      return {
        command: 'fileContent',
        requestId: message.requestId,
        path: pathValue,
        content,
        diagnostics: diagnostics.length ? diagnostics : undefined,
      };
    } catch (e: any) {
      return {
        command: 'fileContent',
        requestId: message.requestId,
        path: pathValue,
        error: e.message || String(e),
      };
    }
  }
}
