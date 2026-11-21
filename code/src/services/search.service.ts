import { spawn } from 'child_process';
import path from 'path';
import { rgPath } from '@vscode/ripgrep';

export interface SearchMatch {
  lineNumber: number;
  lineContent: string;
  column: number;
}

export interface FileResult {
  file: string;
  matches: SearchMatch[];
}

export interface SearchOptions {
  caseSensitive?: boolean;
  wholeWord?: boolean;
  isRegex?: boolean;
  includePattern?: string;
  excludePattern?: string;
}

const activeSessions = new Map<string, { process: any; cancelled: boolean }>();

export const searchService = {
  /**
   * Stream search results qua callback.
   * callback(chunk) được gọi mỗi khi có kết quả mới.
   * callback(null, done) được gọi khi search xong hoặc lỗi.
   */
  search: (
    searchId: string,
    projectPath: string,
    query: string,
    options: SearchOptions,
    onChunk: (results: FileResult[]) => void,
    onDone: (result: { totalMatches: number; totalFiles: number; truncated: boolean; error?: string }) => void,
  ): void => {
    const session = activeSessions.get(searchId);
    if (session) {
      session.cancelled = true;
      session.process?.kill();
      activeSessions.delete(searchId);
    }

    const args = ['--json', '--heading', '--line-number', '--no-messages'];
    if (options.caseSensitive) args.push('--case-sensitive');
    else args.push('--ignore-case');
    if (options.wholeWord) args.push('--word-regexp');
    if (!options.isRegex) args.push('--fixed-strings');
    if (options.includePattern) args.push('--glob', options.includePattern);
    if (options.excludePattern) args.push('--glob', `!${options.excludePattern}`);
    args.push('--', query, projectPath);

    const rg = spawn(rgPath, args, { cwd: projectPath });
    const newSession = { process: rg, cancelled: false };
    activeSessions.set(searchId, newSession);

    let buffer = '';
    let totalMatches = 0;
    let totalFiles = 0;
    let truncated = false;
    const MAX_RESULTS = 10000;

    const fileMap = new Map<string, FileResult>();

    rg.stdout.on('data', (chunk: Buffer) => {
      if (newSession.cancelled) return;
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const obj = JSON.parse(line);
          if (obj.type === 'match') {
            const filePath = path.resolve(projectPath, obj.data.path.text);
            let fileResult = fileMap.get(filePath);
            if (!fileResult) {
              fileResult = { file: filePath, matches: [] };
              fileMap.set(filePath, fileResult);
              totalFiles++;
            }
            fileResult.matches.push({
              lineNumber: obj.data.line_number,
              lineContent: obj.data.lines.text,
              column: obj.data.submatches[0]?.start || 0,
            });
            totalMatches++;

            if (totalMatches >= MAX_RESULTS) {
              truncated = true;
              rg.kill();
              break;
            }
          }
        } catch {
          // Skip invalid JSON
        }
      }

      if (fileMap.size > 0) {
        const chunk = Array.from(fileMap.values());
        fileMap.clear();
        onChunk(chunk);
      }
    });

    rg.stderr.on('data', (chunk: Buffer) => {
      console.error('[search] ripgrep stderr:', chunk.toString());
    });

    rg.on('close', (code: number) => {
      activeSessions.delete(searchId);
      if (newSession.cancelled) return;

      if (fileMap.size > 0) {
        onChunk(Array.from(fileMap.values()));
      }

      if (code !== 0 && code !== 1) {
        onDone({ totalMatches, totalFiles, truncated, error: `ripgrep exited with code ${code}` });
      } else {
        onDone({ totalMatches, totalFiles, truncated });
      }
    });

    rg.on('error', (err: Error) => {
      activeSessions.delete(searchId);
      if (newSession.cancelled) return;
      onDone({ totalMatches, totalFiles, truncated, error: err.message });
    });
  },

  cancel: (searchId: string): void => {
    const session = activeSessions.get(searchId);
    if (session) {
      session.cancelled = true;
      session.process?.kill();
      activeSessions.delete(searchId);
    }
  },
};