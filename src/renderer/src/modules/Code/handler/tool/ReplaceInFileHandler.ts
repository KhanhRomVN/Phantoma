/**
 * ReplaceInFileHandler — Thay thế nội dung trong file (old_str/new_str hoặc diff format).
 *
 * ?Usage:
 *   const handler = new ReplaceInFileHandler(fileLockManager);
 *   await handler.handle(message);
 *
 * ?Function:
 *   handle()             : Thay thế nội dung trong file, hỗ trợ fuzzy match.
 *   handleValidateFuzzy() : Kiểm tra fuzzy match giữa search block và nội dung file.
 *
 * ?Note:
 *   Port từ temp/Zen/src/handlers/tool/ReplaceInFileHandler.ts.
 *   Adapt: thay vscode.workspace.fs → window.api.invoke('fs:read-file' / 'fs:write-file').
 *   Adapt: thay vscode.WebviewView.postMessage → return Promise<Result>.
 *   Bỏ CheckpointManager (Code module có cơ chế unsaved changes riêng).
 */

import { SecurityValidator } from '../../utils/security';
import { FileLockManager } from '../../managers/FileLockManager';
import { ReplaceInFileHistoryManager } from '../../managers/ReplaceInFileHistoryManager';
import { FuzzyMatcher } from '../../utils/FuzzyMatcher';

export interface ReplaceInFileParams {
  path?: string;
  filePath?: string;
  file_path?: string;
  old_str?: string;
  new_str?: string;
  diff?: string;
  skipDiagnostics?: boolean;
  requestId?: string;
  conversationId?: string;
  messageId?: string;
  messageTimestamp?: number;
  responseNumber?: number;
}

export interface ReplaceInFileResult {
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
  content?: string;
  version?: number;
  error?: string;
}

export interface ValidateFuzzyParams {
  path: string;
  diff: string;
  id: string;
}

export interface ValidateFuzzyResult {
  command: string;
  id: string;
  status: 'exact' | 'fuzzy' | 'none' | 'invalid_format';
  searchBlock?: string;
  foundBlock?: string;
  score?: number;
  startLine?: number;
}

export class ReplaceInFileHandler {
  private replaceQueue: Promise<void> = Promise.resolve();

  constructor(private fileLockManager: FileLockManager) {}

  private enqueueReplace<T>(operation: () => Promise<T>): Promise<T> {
    this.replaceQueue = this.replaceQueue
      .then(() => operation())
      .catch((err) => {
        console.error('[ReplaceInFileHandler] Queue error:', err);
        throw err;
      }) as Promise<void>;
    return this.replaceQueue as Promise<T>;
  }

  /** Thay thế nội dung trong file */
  public async handle(message: ReplaceInFileParams): Promise<ReplaceInFileResult> {
    return this.enqueueReplace(() => this.handleInternal(message));
  }

  private async handleInternal(message: ReplaceInFileParams): Promise<ReplaceInFileResult> {
    const pathValue = message.path || message.filePath || message.file_path;
    if (!pathValue) {
      return {
        command: 'replaceInFileResult',
        requestId: message.requestId,
        error: "The 'path' argument must be of type string.",
      };
    }

    const api = (window as any).api;
    if (!api?.invoke) {
      return {
        command: 'replaceInFileResult',
        requestId: message.requestId,
        error: 'IPC not available',
      };
    }

    // Security check
    const sec = SecurityValidator.validatePath(pathValue, true);
    if (!sec.safe) {
      return {
        command: 'replaceInFileResult',
        requestId: message.requestId,
        error: sec.reason || 'Security validation failed',
      };
    }

    // Đọc nội dung file
    let content: string;
    try {
      content = await api.invoke('fs:read-file', pathValue);
    } catch {
      return {
        command: 'replaceInFileResult',
        requestId: message.requestId,
        error: `File not found: '${pathValue}'`,
      };
    }

    // Parse search/replace args
    let searchArgs: string;
    let replaceArgs: string;

    if (message.old_str !== undefined && message.new_str !== undefined) {
      const clean = (t: string) => t.replace(/^```[a-zA-Z]*$/gm, '').trim();
      searchArgs = clean(message.old_str);
      replaceArgs = clean(message.new_str);
    } else if (message.diff !== undefined && message.diff !== null) {
      const match = message.diff.match(
        /<<<<<<< SEARCH\s*\n([\s\S]*?)\s*=======\s*\n([\s\S]*?)(?:>>>>>>>|>)\s*REPLACE/,
      );
      if (!match) {
        return {
          command: 'replaceInFileResult',
          requestId: message.requestId,
          error: 'Invalid diff format',
        };
      }
      const clean = (t: string) => t.replace(/^```[a-zA-Z]*$/gm, '').trim();
      searchArgs = clean(match[1]);
      replaceArgs = clean(match[2]);
    } else {
      return {
        command: 'replaceInFileResult',
        requestId: message.requestId,
        error: 'Missing old_str/new_str or diff parameter',
      };
    }

    // Tìm search block (exact → fuzzy fallback)
    let target = searchArgs;
    if (content.indexOf(searchArgs) === -1) {
      const fuzzy = FuzzyMatcher.findMatch(content, searchArgs);
      if (!fuzzy || fuzzy.score > 0.3) {
        return {
          command: 'replaceInFileResult',
          requestId: message.requestId,
          error: 'Search text not found in file',
        };
      }
      target = fuzzy.originalText;
    }

    const newContent = content.replace(target, replaceArgs);
    if (newContent === content) {
      return {
        command: 'replaceInFileResult',
        requestId: message.requestId,
        error: 'No change made',
      };
    }

    // Acquire lock và ghi file
    const release = await this.fileLockManager.acquire(pathValue);
    try {
      await api.invoke('fs:write-file', pathValue, newContent);

      // TODO: Lấy diagnostics
      const diagnostics: any[] = [];

      // Lưu history nếu có conversationId
      let version: number | undefined;
      if (message.conversationId) {
        const historyManager = ReplaceInFileHistoryManager.getInstance();
        historyManager.setActiveConversationId(message.conversationId);

        const errorCount = diagnostics.filter((d: any) => d.severity === 'Error').length;
        const warningCount = diagnostics.filter((d: any) => d.severity === 'Warning').length;

        await historyManager.saveHistory(
          pathValue,
          newContent,
          errorCount,
          warningCount,
          message.messageId,
          message.messageTimestamp,
          message.responseNumber,
        );

        version = await historyManager.getCurrentVersion(pathValue);
      }

      return {
        command: 'replaceInFileResult',
        requestId: message.requestId,
        path: pathValue,
        success: true,
        diagnostics,
        content: newContent,
        version,
      };
    } finally {
      release();
    }
  }

  /** Validate fuzzy match — kiểm tra search block có khớp không */
  public async handleValidateFuzzy(message: ValidateFuzzyParams): Promise<ValidateFuzzyResult> {
    const api = (window as any).api;
    if (!api?.invoke) {
      return {
        command: 'validateFuzzyMatchResult',
        id: message.id,
        status: 'invalid_format',
      };
    }

    const match = message.diff.match(
      /<<<<<<< SEARCH\s*\n([\s\S]*?)\n\s*=======\s*\n([\s\S]*?)(?:>>>>>>>|>)\s*REPLACE/,
    );
    if (!match) {
      return {
        command: 'validateFuzzyMatchResult',
        id: message.id,
        status: 'invalid_format',
      };
    }

    const clean = (text: string) =>
      text
        .replace(/^```[a-zA-Z]*$/gm, '')
        .trim()
        .replace(/\r\n/g, '\n');
    const search = clean(match[1]);

    try {
      const content: string = await api.invoke('fs:read-file', message.path);
      const normalized = content.replace(/\r\n/g, '\n');
      const exact = normalized.indexOf(search);

      if (exact !== -1) {
        return {
          command: 'validateFuzzyMatchResult',
          id: message.id,
          status: 'exact',
          searchBlock: search,
          foundBlock: search,
          score: 1.0,
          startLine: content.substring(0, exact).split(/\r?\n/).length,
        };
      }

      const fuzzy = FuzzyMatcher.findMatch(content, search);
      if (fuzzy) {
        return {
          command: 'validateFuzzyMatchResult',
          id: message.id,
          status: 'fuzzy',
          score: fuzzy.score,
          searchBlock: search,
          foundBlock: fuzzy.originalText,
          startLine: fuzzy.startLine,
        };
      }

      return {
        command: 'validateFuzzyMatchResult',
        id: message.id,
        status: 'none',
        searchBlock: search,
      };
    } catch (e: any) {
      return {
        command: 'validateFuzzyMatchResult',
        id: message.id,
        status: 'invalid_format',
      };
    }
  }
}