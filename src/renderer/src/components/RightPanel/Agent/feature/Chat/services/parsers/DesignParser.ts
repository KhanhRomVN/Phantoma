/**
 * ------------------------------------------------------------------
 * Design Parser
 * ------------------------------------------------------------------
 * Parse XML tags từ AI response cho các design tools.
 * Design folder phẳng (không có sub-folder), nên file_path luôn là tên file.
 *
 * Main functions:
 * - parseDesignReadFile()   : Parse read_file tag
 * - parseDesignCreateFile() : Parse create_file tag
 * - parseDesignUpdateFile() : Parse update_file tag
 * - parseDesignListFiles()  : Parse list_files tag (không có tham số)
 * - parseDesignGrep()       : Parse grep tag (chỉ có search_term)
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import { extractParamValue } from '../../utils/ToolParser';

// ─── Types ──────────────────────────────────────────────────────────────
export interface DesignReadFileParams {
  file_path: string;
  start_line?: number;
  end_line?: number;
  _validationError?: string;
}

export interface DesignCreateFileParams {
  file_path: string;
  content: string;
  _validationError?: string;
}

export interface DesignUpdateFileParams {
  file_path: string;
  old_content: string;
  new_content: string;
  _validationError?: string;
}

export type DesignListFilesParams = Record<string, never>;

export interface DesignGrepParams {
  search_term: string;
  _validationError?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────
const validateFileName = (fileName: string): string | undefined => {
  if (!fileName) return 'file_path is required';
  if (/[\\/]/.test(fileName)) {
    return 'file_path must be a bare file name — the design folder is flat (no sub-folders)';
  }
  if (!/\.tsx?$/.test(fileName)) return 'file_path must end with .ts or .tsx';
  return undefined;
};

// ─── Functions ──────────────────────────────────────────────────────────
// ===== ReadFileParser =====

export const parseDesignReadFile = (innerContent: string): DesignReadFileParams => {
  const filePath = (extractParamValue(innerContent, 'file_path') || '').trim();
  const startLine = extractParamValue(innerContent, 'start_line');
  const endLine = extractParamValue(innerContent, 'end_line');

  return {
    file_path: filePath,
    start_line: startLine ? parseInt(startLine, 10) : undefined,
    end_line: endLine ? parseInt(endLine, 10) : undefined,
    _validationError: validateFileName(filePath),
  };
};

// ===== CreateFileParser =====

export const parseDesignCreateFile = (innerContent: string): DesignCreateFileParams => {
  const filePath = (extractParamValue(innerContent, 'file_path') || '').trim();
  const content = extractParamValue(innerContent, 'content') || '';

  return {
    file_path: filePath,
    content,
    _validationError: validateFileName(filePath) ?? (content ? undefined : 'content is required'),
  };
};

// ===== UpdateFileParser =====

export const parseDesignUpdateFile = (innerContent: string): DesignUpdateFileParams => {
  const filePath = (extractParamValue(innerContent, 'file_path') || '').trim();
  const oldContent = extractParamValue(innerContent, 'old_content') || '';
  const newContent = extractParamValue(innerContent, 'new_content') || '';

  return {
    file_path: filePath,
    old_content: oldContent,
    new_content: newContent,
    _validationError:
      validateFileName(filePath) ?? (oldContent ? undefined : 'old_content is required'),
  };
};

// ===== ListFilesParser =====

export const parseDesignListFiles = (_innerContent: string): DesignListFilesParams => ({});

// ===== GrepParser =====

export const parseDesignGrep = (innerContent: string): DesignGrepParams => {
  const searchTerm = extractParamValue(innerContent, 'search_term') || '';
  let validationError: string | undefined;

  if (!searchTerm.trim()) {
    validationError = 'Empty search pattern';
  } else {
    try {
      new RegExp(searchTerm);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown regex error';
      validationError = `Invalid regex pattern: ${message}`;
    }
  }

  return { search_term: searchTerm, _validationError: validationError };
};