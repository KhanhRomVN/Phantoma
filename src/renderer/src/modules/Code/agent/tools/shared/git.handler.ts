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

// ─── Imports ────────────────────────────────────────────────────────────
// ── Services ──
import { codeApi } from '../../../shared/api/code.api';

// ─── Types ──────────────────────────────────────────────────────────────
interface BaseParams {
  requestId?: string;
}

interface GitStatusParams extends BaseParams {
  projectPath?: string;
}

interface GitDiffParams extends BaseParams {
  filePath?: string;
  projectPath?: string;
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
      const { useCodeStore } = await import('../../../shared/stores/code.store');
      const state = useCodeStore.getState();
      const project = state.projects.find((p) => p.id === state.currentProjectId);
      const projectPath = message.projectPath ?? project?.explorerRoot ?? project?.path;
      if (!projectPath) throw new Error('No active project');

      const result = await codeApi.git.status(projectPath);
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

      const result = await codeApi.git.fileDiff(message.projectPath || '', message.filePath || '');
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
      const result = await codeApi.git.commit(message.projectPath || '', message.message);
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