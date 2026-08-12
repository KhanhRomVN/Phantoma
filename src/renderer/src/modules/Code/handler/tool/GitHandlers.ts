/**
 * ------------------------------------------------------------------
 * Git Handlers
 * ------------------------------------------------------------------
 * IPC message handlers for Git operations within the Code module.
 * Adapted from Zen's child_process.exec to window.api.invoke('git:*').
 *
 * Main handlers:
 * - GitStatusHandler : git status
 * - GitDiffHandler   : git diff (optionally scoped to a file)
 * - GitCommitHandler : git commit with message
 * ------------------------------------------------------------------
 */

// ─── Types ──────────────────────────────────────────────────────────────

interface BaseParams {
  requestId?: string;
}

interface GitStatusParams extends BaseParams {}

interface GitDiffParams extends BaseParams {
  filePath?: string;
}

interface BaseResult {
  command: string;
  requestId?: string;
  error?: string;
  [key: string]: any;
}

// ─── GitStatusHandler ───────────────────────────────────────────────────

export class GitStatusHandler {
  public async handle(message: GitStatusParams): Promise<BaseResult> {
    try {
      const api = (window as any).api;
      if (!api?.invoke) throw new Error('IPC not available');

      const result = await api.invoke('git:status');
      return {
        command: 'gitStatusResult',
        requestId: message.requestId,
        ...result,
      };
    } catch (e: any) {
      return {
        command: 'gitStatusResult',
        requestId: message.requestId,
        error: e.message || String(e),
      };
    }
  }
}

// ─── GitDiffHandler ─────────────────────────────────────────────────────

export class GitDiffHandler {
  public async handle(message: GitDiffParams): Promise<BaseResult> {
    try {
      const api = (window as any).api;
      if (!api?.invoke) throw new Error('IPC not available');

      const result = await api.invoke('git:diff', message.filePath || null);
      return {
        command: 'gitDiffResult',
        requestId: message.requestId,
        ...result,
      };
    } catch (e: any) {
      return {
        command: 'gitDiffResult',
        requestId: message.requestId,
        error: e.message || String(e),
      };
    }
  }
}

// ─── GitCommitHandler ───────────────────────────────────────────────────

export class GitCommitHandler {
  public async handle(message: any): Promise<BaseResult> {
    if (!message.message) {
      return {
        command: 'gitCommitResult',
        requestId: message.requestId,
        error: 'Commit message is required',
      };
    }

    try {
      const api = (window as any).api;
      if (!api?.invoke) throw new Error('IPC not available');

      const result = await api.invoke('git:commit', message.message);
      return {
        command: 'gitCommitResult',
        requestId: message.requestId,
        ...result,
      };
    } catch (e: any) {
      return {
        command: 'gitCommitResult',
        requestId: message.requestId,
        error: e.message || String(e),
      };
    }
  }
}