/**
 * ------------------------------------------------------------------
 * Write-To-File Handler
 * ------------------------------------------------------------------
 * Creates or overwrites a file in the workspace with serialized write
 * queue, file locking, and security validation. Adapted from Zen's
 * vscode.workspace.fs to window.api.invoke IPC. CheckpointManager is
 * omitted — the Code module uses its own unsaved-changes mechanism.
 *
 * Main functions:
 * - handle() : Write content to file (create or overwrite)
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────

// ── Utils ──
import { SecurityValidator } from '../../utils/security';

// ── Managers ──
import { FileLockManager } from '../../managers/FileLockManager';

// ─── Helpers ────────────────────────────────────────────────────────────

function isAbsolute(p: string): boolean {
  return p.startsWith('/') || p.startsWith('file://') || /^[A-Za-z]:[\\/]/.test(p);
}

function joinPath(base: string, relative: string): string {
  if (base.endsWith('/')) return base + relative;
  return base + '/' + relative;
}

// ─── Interfaces ─────────────────────────────────────────────────────────
export interface WriteToFileParams {
  path?: string;
  filePath?: string;
  file_path?: string;
  content?: string;
  skipDiagnostics?: boolean;
  requestId?: string;
  basePath?: string;
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

// ─── Class ──────────────────────────────────────────────────────────────
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
      // Resolve relative path → absolute path (giống ReadFileHandler).
      // Nếu không resolve, fs:write-file sẽ ghi theo CWD của Electron main,
      // khác hoàn toàn nơi read_file đọc được file.
      let resolvedPath = pathValue;
      if (!isAbsolute(pathValue)) {
        let baseDir: string | undefined = (message as any).basePath;
        if (!baseDir) {
          const { useCodeStore } = await import('../../hooks/useCodeStore');
          const state = useCodeStore.getState();
          baseDir = state.projects.find((p) => p.id === state.currentProjectId)?.path;
        }
        console.log('[WriteToFileHandler][DEBUG] resolve:', {
          input: pathValue,
          basePathFromMsg: (message as any).basePath,
          baseDir,
        });
        if (baseDir) {
          resolvedPath = joinPath(baseDir, pathValue);
        }
      }
      console.log('[WriteToFileHandler][DEBUG] writing to:', resolvedPath);

      // Security check (isWrite = true)
      const sec = SecurityValidator.validatePath(resolvedPath, true);
      if (!sec.safe) {
        return {
          command: 'writeFileResult',
          requestId: message.requestId,
          path: pathValue,
          success: false,
          error: sec.reason || 'Security validation failed',
        };
      }

      const release = await this.fileLockManager.acquire(resolvedPath);
      try {
        const api = (window as any).api;
        if (!api?.invoke) throw new Error('IPC not available');

        await api.invoke('fs:write-file', resolvedPath, message.content || '');

        // TODO: Lấy diagnostics từ LSP client
        const diagnostics: any[] = [];

        return {
          command: 'writeFileResult',
          requestId: message.requestId,
          path: resolvedPath,
          success: true,
          diagnostics,
        };
      } finally {
        release();
      }
    } catch (e: any) {
      console.error('[WriteToFileHandler][DEBUG] write failed:', {
        input: pathValue,
        error: e?.message || String(e),
      });
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
