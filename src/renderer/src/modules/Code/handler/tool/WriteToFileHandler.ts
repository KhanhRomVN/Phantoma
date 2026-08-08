/**
 * WriteToFileHandler — Ghi file mới hoặc ghi đè trong workspace.
 *
 * ?Usage:
 *   const handler = new WriteToFileHandler(fileLockManager);
 *   await handler.handle(message);
 *
 * ?Function:
 *   handle(): Ghi nội dung mới vào file (tạo hoặc ghi đè), có lock, security check.
 *
 * ?Note:
 *   Port từ temp/Zen/src/handlers/tool/WriteToFileHandler.ts.
 *   Adapt: thay vscode.workspace.fs → window.api.invoke('fs:write-file').
 *   Adapt: thay vscode.WebviewView.postMessage → return Promise<Result>.
 *   Bỏ CheckpointManager (Code module có cơ chế unsaved changes riêng).
 */

import { SecurityValidator } from '../../utils/security';
import { FileLockManager } from '../../managers/FileLockManager';

export interface WriteToFileParams {
  path?: string;
  filePath?: string;
  file_path?: string;
  content?: string;
  skipDiagnostics?: boolean;
  requestId?: string;
}

export interface WriteToFileResult {
  command: string;
  requestId?: string;
  path?: string;
  success?: boolean;
  diagnostics?: Array<{
    severity: string;
    message: string;
    line: number;
    column: number;
    source?: string;
    code?: string | number;
  }>;
  skippedReason?: string | null;
  error?: string;
}

export class WriteToFileHandler {
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(private fileLockManager: FileLockManager) {}

  /** Enqueue thao tác ghi để đảm bảo tuần tự */
  private enqueueWrite<T>(operation: () => Promise<T>): Promise<T> {
    this.writeQueue = this.writeQueue
      .then(() => operation())
      .catch((err) => {
        console.error('[WriteToFileHandler] Queue error:', err);
        throw err;
      }) as Promise<void>;
    return this.writeQueue as Promise<T>;
  }

  public async handle(message: WriteToFileParams): Promise<WriteToFileResult> {
    return this.enqueueWrite(() => this.handleInternal(message));
  }

  private async handleInternal(message: WriteToFileParams): Promise<WriteToFileResult> {
    const pathValue = message.path || message.filePath || message.file_path;
    if (!pathValue) {
      return {
        command: 'writeFileResult',
        requestId: message.requestId,
        path: pathValue,
        success: false,
        error: "'path' must be of type string.",
      };
    }

    try {
      // Security check (isWrite = true)
      const sec = SecurityValidator.validatePath(pathValue, true);
      if (!sec.safe) {
        return {
          command: 'writeFileResult',
          requestId: message.requestId,
          path: pathValue,
          success: false,
          error: sec.reason || 'Security validation failed',
        };
      }

      const release = await this.fileLockManager.acquire(pathValue);
      try {
        const api = (window as any).api;
        if (!api?.invoke) throw new Error('IPC not available');

        await api.invoke('fs:write-file', pathValue, message.content || '');

        // TODO: Lấy diagnostics từ LSP client
        const diagnostics: any[] = [];

        return {
          command: 'writeFileResult',
          requestId: message.requestId,
          path: pathValue,
          success: true,
          diagnostics,
        };
      } finally {
        release();
      }
    } catch (e: any) {
      return {
        command: 'writeFileResult',
        requestId: message.requestId,
        path: pathValue,
        success: false,
        error: e.message || String(e),
      };
    }
  }
}