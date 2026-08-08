/**
 * GrepHandler — Thực thi regex search trên file/thư mục.
 *
 * ?Usage:
 *   const handler = new GrepHandler(workspaceRoot);
 *   await handler.handle(action);
 *
 * ?Function:
 *   handle() : Security check path, thực thi grep, trả về kết quả.
 *
 * ?Note:
 *   Port từ temp/Zen/src/handlers/tool/GrepHandler.ts.
 *   Adapt: thay vscode.workspace.findFiles → window.api.invoke('fs:grep').
 *   Adapt: thay fs.readFile → IPC call.
 *   Adapt: thay vscode.WebviewView.postMessage → return Promise<Result>.
 */

import { SecurityValidator } from '../../utils/security';

// ─── Constants ────────────────────────────────────────────────────────

const MAX_GREP_FILES = 500;
const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '__pycache__',
  '.venv',
  'venv',
  'target',
  'out',
  '.idea',
  '.vscode',
];

// ─── Types ────────────────────────────────────────────────────────────

interface GrepAction {
  path?: string;
  search_term?: string;
  file_path?: string;
  folder_path?: string;
  requestId: string;
}

interface MatchResult {
  lineNumber: number;
  lineContent: string;
}

interface GrepResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class GrepHandler {
  constructor(_workspaceRoot: string) {
    // workspaceRoot được giữ để tương thích signature với Zen
  }

  public async handle(action: GrepAction): Promise<GrepResult> {
    const requestId = action?.requestId;

    try {
      // Security check
      const rawPath = action.file_path || action.folder_path;
      if (rawPath) {
        const securityCheck = SecurityValidator.validatePath(rawPath, false);
        if (!securityCheck.safe) {
          return {
            success: false,
            error: securityCheck.reason || 'Security validation failed',
          };
        }
      }

      return await this.executeGrep(action);
    } catch (e: any) {
      console.error(`[GrepHandler] Grep failed:`, { requestId, error: e.message });
      return { success: false, error: e.message };
    }
  }

  private async executeGrep(action: GrepAction): Promise<GrepResult> {
    const searchTerm = action.search_term;
    const filePath = action.file_path;
    const folderPath = action.folder_path;

    if (!searchTerm || searchTerm.trim().length === 0) {
      throw new Error('Missing search term');
    }

    if (!filePath && !folderPath) {
      throw new Error('Either file_path or folder_path must be provided');
    }

    if (filePath && folderPath) {
      throw new Error('Provide only one of file_path or folder_path, not both');
    }

    let regex: RegExp;
    try {
      regex = new RegExp(searchTerm, 'i');
    } catch (regexError) {
      throw new Error(
        `Invalid regex pattern: ${searchTerm} - ${
          regexError instanceof Error ? regexError.message : String(regexError)
        }`,
      );
    }

    const api = (window as any).api;
    if (!api?.invoke) throw new Error('IPC not available');

    let filesToSearch: string[] = [];

    if (filePath) {
      filesToSearch = [filePath];
    } else if (folderPath) {
      try {
        // Dùng IPC để tìm files (main process xử lý glob)
        const result = await api.invoke('fs:find-files', folderPath, '*', {
          maxFiles: MAX_GREP_FILES,
          exclude: EXCLUDE_PATTERNS,
        });
        filesToSearch = Array.isArray(result) ? result.map((f: any) => f.path || f) : [];
      } catch {
        throw new Error(`Folder not found: ${folderPath}`);
      }
    }

    const results: Record<string, { matches: MatchResult[] }> = {};
    let filesWithMatches = 0;
    let filesSkippedSize = 0;

    for (const file of filesToSearch) {
      try {
        // Kiểm tra kích thước file
        const stat = await api.invoke('fs:stat', file).catch(() => null);
        if (stat && stat.size > MAX_FILE_SIZE_BYTES) {
          filesSkippedSize++;
          continue;
        }
      } catch {
        continue;
      }

      const { matches } = await this.searchInFile(file, regex, api);
      if (matches.length > 0) {
        results[file] = { matches };
        filesWithMatches++;
      }
    }

    const totalMatches = Object.values(results).reduce(
      (sum, fileResult) => sum + fileResult.matches.length,
      0,
    );

    return {
      success: true,
      data: {
        searchTerm,
        pattern: regex.source,
        results,
        totalFilesSearched: filesToSearch.length,
        totalMatches,
        ...(filesSkippedSize > 0 ? { filesSkippedSize } : {}),
      },
    };
  }

  private async searchInFile(
    filePath: string,
    regex: RegExp,
    api: any,
  ): Promise<{ matches: MatchResult[] }> {
    const matches: MatchResult[] = [];

    try {
      const content: string = await api.invoke('fs:read-file', filePath);
      const lines = content.split(/\r?\n/);

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (regex.test(line)) {
          matches.push({
            lineNumber: i + 1,
            lineContent: line.trim(),
          });
        }
      }
    } catch {
      // Skip binary files or files that can't be read
    }

    return { matches };
  }
}