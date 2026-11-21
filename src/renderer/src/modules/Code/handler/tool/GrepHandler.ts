/**
 * ------------------------------------------------------------------
 * Grep Handler
 * ------------------------------------------------------------------
 * Executes regex search across files and folders within the workspace.
 * The search itself runs on the code server (POST /fs/grep); this handler
 * only validates the path and resolves relative paths against the project.
 *
 * Main functions:
 * - handle() : Validate path, call codeApi.fs.grep, return matches grouped by file
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────

// ── Services ──
import { codeApi } from '../../services/code-api.service';

// ── Utils ──
import { SecurityValidator } from '../../utils/security';

// ─── Constants ──────────────────────────────────────────────────────────
const isAbsolutePath = (p: string): boolean =>
  p.startsWith('/') || p.startsWith('file://') || /^[A-Za-z]:[\\/]/.test(p);

async function resolveAgainstProject(p?: string): Promise<string | undefined> {
  if (!p || isAbsolutePath(p)) return p;
  const { useCodeStore } = await import('../../hooks/useCodeStore');
  const state = useCodeStore.getState();
  const baseDir = state.projects.find((proj) => proj.id === state.currentProjectId)?.path;
  if (!baseDir) return p;
  return baseDir.endsWith('/') ? baseDir + p : baseDir + '/' + p;
}

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

// ─── Types ──────────────────────────────────────────────────────────────
interface GrepAction {
  path?: string;
  search_term?: string;
  file_path?: string;
  folder_path?: string;
  requestId: string;
}

interface GrepResult {
  success: boolean;
  data?: any;
  error?: string;
}

// ─── Class ──────────────────────────────────────────────────────────────
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
    const filePath = await resolveAgainstProject(action.file_path);
    const folderPath = await resolveAgainstProject(action.folder_path);

    if (!searchTerm || searchTerm.trim().length === 0) {
      throw new Error('Missing search term');
    }

    if (!filePath && !folderPath) {
      throw new Error('Either file_path or folder_path must be provided');
    }

    if (filePath && folderPath) {
      throw new Error('Provide only one of file_path or folder_path, not both');
    }

    const data = await codeApi.fs.grep(
      searchTerm,
      { filePath, folderPath },
      { maxFiles: MAX_GREP_FILES, maxFileSize: MAX_FILE_SIZE_BYTES, exclude: EXCLUDE_PATTERNS },
    );

    return { success: true, data };
  }
}