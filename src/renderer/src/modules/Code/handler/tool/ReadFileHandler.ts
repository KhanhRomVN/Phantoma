/**
 * ------------------------------------------------------------------
 * Read File Handler
 * ------------------------------------------------------------------
 * Reads file content with optional line-range slicing and LSP
 * diagnostics attachment. Adapted from Zen's vscode.workspace.fs
 * to window.api.invoke IPC. Supports relative path resolution
 * against the current project root.
 *
 * Main functions:
 * - handle() : Read file, apply start_line/end_line, attach diagnostics
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Utils ──
import { SecurityValidator } from '../../utils/security';

// ─── Interfaces ─────────────────────────────────────────────────────────
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

// ─── Helpers ────────────────────────────────────────────────────────────

function isAbsolute(p: string): boolean {
  return p.startsWith('/') || p.startsWith('file://') || /^[A-Za-z]:[\\/]/.test(p);
}

function joinPath(base: string, relative: string): string {
  if (base.endsWith('/')) return base + relative;
  return base + '/' + relative;
}

// ─── Class ──────────────────────────────────────────────────────────────
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
      // Resolve relative path → absolute path nếu cần
      let resolvedPath = pathValue;
      if (!isAbsolute(pathValue)) {
        const { useCodeStore } = await import('../../hooks/useCodeStore');
        const state = useCodeStore.getState();
        const project = state.projects.find((p) => p.id === state.currentProjectId);
        if (project?.path) {
          resolvedPath = joinPath(project.path, pathValue);
          console.log('[DEBUG-ReadFile] resolved:', pathValue, '→', resolvedPath);
        }
      }

      // Security check
      const securityCheck = SecurityValidator.validatePath(resolvedPath, false);
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

      let content: string = await api.invoke('fs:read-file', resolvedPath);

      // Xử lý start_line / end_line
      const startLine = message.start_line ?? message.startLine;
      const endLine = message.end_line ?? message.endLine;
      if (startLine !== undefined) {
        const lines = content.split(/\r?\n/);
        const end = endLine !== undefined ? endLine + 1 : lines.length;
        content = lines.slice(startLine || 0, end).join('\n');
      }

      // Lấy diagnostics từ diagnosticsStore (nếu không bị skip)
      let diagnostics: any[] = [];
      if (!message.skipDiagnostics) {
        try {
          const { useDiagnosticsStore } = await import('../../stores/diagnosticsStore');
          const storeState = useDiagnosticsStore.getState();
          const storeUris = Object.keys(storeState.diagnostics);
          console.log('[DEBUG-ReadFile] resolvedPath:', resolvedPath);
          console.log('[DEBUG-ReadFile] store URIs count:', storeUris.length, '| first:', storeUris.slice(0, 5));

          const raw = storeState.getDiagnosticsForFile(resolvedPath);
          diagnostics = raw.map((d: any) => ({
            severity: d.severity === 1 ? 'Error' : d.severity === 2 ? 'Warning' : 'Info',
            message: d.message,
            line: d.range?.start?.line ?? d.line ?? 0,
            column: d.range?.start?.character ?? d.column ?? 0,
            source: d.source || 'lsp',
            code: d.code,
          }));
          console.log('[DEBUG-ReadFile] final diagnostics:', diagnostics.length, 'items');
        } catch (e) {
          console.warn('[DEBUG-ReadFile] failed to get diagnostics:', e);
        }
      }

      return {
        command: 'fileContent',
        requestId: message.requestId,
        path: resolvedPath,
        content,
        diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
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