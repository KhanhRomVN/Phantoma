import { extractParamValue } from '../../utils/ToolParser';
import { logger } from '@renderer/utils/logger';
import {
  CommitMessageParams,
  GitDiffParams,
  GitStatusParams,
  RunCommandParams,
} from '../../types/tool-types';

// ===== CommitMessageParser =====

/**
 * Parse commit_message tag from AI response
 * Format: <commit_message><message>...</message></commit_message>
 */
export function parseCommitMessage(innerContent: string): CommitMessageParams {
  const params: CommitMessageParams = {};

  // Extract commit message content
  const messageParam = extractParamValue(innerContent, 'message');
  if (messageParam) {
    params.message = messageParam;
  }

  // Or get the full content if no specific param
  if (!params.message && innerContent.trim()) {
    params.message = innerContent.trim();
  }

  return params;
}

// ===== DeleteFileParser =====

export interface DeleteFileParams {
  file_path: string;
}

export const parseDeleteFile = (innerContent: string): DeleteFileParams => {
  // Parse according to tools-reference.ts schema: file_path only
  const filePath = extractParamValue(innerContent, 'file_path');

  return {
    file_path: filePath || '',
  };
};

// ===== FindFilesParser =====

export interface FindFilesParams {
  file_names: string[];
}

export function parseFindFiles(content: string): FindFilesParams {
  const fileNames: string[] = [];

  // Match all <file_name>...</file_name> tags
  const fileNameRegex = /<file_name>(.*?)<\/file_name>/gs;
  let match;

  while ((match = fileNameRegex.exec(content)) !== null) {
    const fileName = match[1].trim();
    if (fileName) {
      fileNames.push(fileName);
    }
  }

  return {
    file_names: fileNames,
  };
}

// ===== GitDiffParser =====

/**
 * Parse git_diff tag from AI response
 * Format: <git_diff><file_path>...</file_path></git_diff>
 * According to tools-reference.ts: file_path is optional
 */
export function parseGitDiff(innerContent: string): GitDiffParams {
  const params: GitDiffParams = {};

  // Extract file_path (optional according to schema)
  params.file_path = extractParamValue(innerContent, 'file_path') ?? undefined;

  return params;
}

// ===== GitStatusParser =====

/**
 * Parse git_status tag from AI response
 * Format: <git_status><items>...</items><raw>...</raw></git_status>
 */
export function parseGitStatus(innerContent: string): GitStatusParams {
  const params: GitStatusParams = {};

  // Extract items as JSON string
  const itemsParam = extractParamValue(innerContent, 'items');
  if (itemsParam) {
    params.items = itemsParam;
  }

  // Extract raw output
  const rawParam = extractParamValue(innerContent, 'raw');
  if (rawParam) {
    params.raw = rawParam;
  }

  return params;
}

// ===== GrepParser =====

export interface GrepParams {
  search_term: string;
  folder_path?: string;
  file_pattern?: string;
  _validationError?: string; // Internal flag for invalid regex
}

/**
 * Validate regex pattern using Rust regex syntax
 * Returns error message if invalid, null if valid
 */
const validateRegexPattern = (pattern: string): string | null => {
  if (!pattern || pattern.trim() === '') {
    return 'Empty search pattern';
  }

  try {
    // Test basic JavaScript regex compatibility
    // Note: Rust regex syntax differs slightly from JS, but this catches most errors
    new RegExp(pattern);

    // Additional checks for common Rust regex incompatibilities
    // Rust doesn't support lookbehind/lookahead
    if (pattern.includes('(?<') || pattern.includes('(?!') || pattern.includes('(?=')) {
      return 'Lookbehind/lookahead assertions are not supported. Use simpler pattern.';
    }

    return null; // Valid
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown regex error';
    return `Invalid regex pattern: ${message}`;
  }
};

export const parseGrep = (innerContent: string): GrepParams => {
  // Parse according to tools-reference.ts schema: search_term (required), file_path OR folder_path (optional)
  const searchTerm = extractParamValue(innerContent, 'search_term');
  const folderPath = extractParamValue(innerContent, 'folder_path');
  const filePattern = extractParamValue(innerContent, 'file_pattern');

  const searchTermValue = searchTerm || '';

  // Validate regex pattern
  const validationError = validateRegexPattern(searchTermValue);

  if (validationError) {
    logger.warn('[Zen][GrepParser] Invalid regex pattern:', {
      pattern: searchTermValue,
      error: validationError,
      innerContent: innerContent.substring(0, 200), // Log first 200 chars for debug
    });
  }

  return {
    search_term: searchTermValue,
    folder_path: folderPath || undefined,
    file_pattern: filePattern || undefined,
    _validationError: validationError || undefined,
  };
};

// ===== ListFilesParser =====

export interface ListFilesParams {
  folder_path: string;
  type?: string;
  depth?: number | 'max';
}

export const parseListFiles = (innerContent: string): ListFilesParams => {
  // Parse according to tools-reference.ts schema: folder_path only
  const folderPath = extractParamValue(innerContent, 'folder_path');
  const type = extractParamValue(innerContent, 'type');
  const depthStr = extractParamValue(innerContent, 'depth');

  let depth: number | 'max' | undefined;
  if (depthStr) {
    if (depthStr.toLowerCase() === 'max') {
      depth = 'max';
    } else {
      const parsed = parseInt(depthStr, 10);
      depth = !isNaN(parsed) ? parsed : undefined;
    }
  }

  return {
    folder_path: folderPath || '',
    type: type || undefined,
    depth,
  };
};

// ===== ReadFileParser =====

export interface ReadFileParams {
  file_path: string;
  start_line?: number;
  end_line?: number;
}

export const parseReadFile = (innerContent: string): ReadFileParams => {
  // Parse according to tools-reference.ts schema: file_path only
  const filePath = extractParamValue(innerContent, 'file_path');
  const startLine = extractParamValue(innerContent, 'start_line');
  const endLine = extractParamValue(innerContent, 'end_line');

  return {
    file_path: filePath || '',
    start_line: startLine ? parseInt(startLine, 10) : undefined,
    end_line: endLine ? parseInt(endLine, 10) : undefined,
  };
};

// ===== ReplaceInFileParser =====

export interface ReplaceInFileParams {
  file_path: string;
  old_content: string;
  new_content: string;
}

export const parseReplaceInFile = (innerContent: string): ReplaceInFileParams => {
  // Parse according to tools-reference.ts schema: file_path only
  const filePath = extractParamValue(innerContent, 'file_path');
  const oldContent = extractParamValue(innerContent, 'old_content');
  const newContent = extractParamValue(innerContent, 'new_content');

  return {
    file_path: filePath || '',
    old_content: oldContent || '',
    new_content: newContent || '',
  };
};

// ===== RevertFileParser =====

export interface RevertFileParams {
  file_path: string;
  version?: number;
}

export const parseRevertFile = (innerContent: string): RevertFileParams => {
  // Parse according to tools-reference.ts schema: file_path only
  const filePath = extractParamValue(innerContent, 'file_path');

  // Extract version parameter (optional)
  const versionStr = extractParamValue(innerContent, 'version');
  const version = versionStr ? parseInt(versionStr, 10) : undefined;

  return {
    file_path: filePath || '',
    version,
  };
};

// ===== RunCommandParser =====

export const parseRunCommand = (innerContent: string): RunCommandParams => {
  // Parse according to tools-reference.ts schema: command (required), cwd (optional)
  // Note: terminal_id is not in official schema but kept for internal use
  return {
    command: extractParamValue(innerContent, 'command') || '',
    terminal_id: extractParamValue(innerContent, 'terminal_id') || undefined,
    cwd: extractParamValue(innerContent, 'cwd') || undefined,
  };
};

// ===== ViewReplaceHistoryParser =====

export interface ViewReplaceHistoryParams {
  file_path: string;
}

export const parseViewReplaceHistory = (innerContent: string): ViewReplaceHistoryParams => {
  // Parse according to tools-reference.ts schema: file_path only
  const filePath = extractParamValue(innerContent, 'file_path');

  return {
    file_path: filePath || '',
  };
};

// ===== WriteToFileParser =====

// Enable debug logs via localStorage
const DEBUG_PARSER =
  typeof window !== 'undefined' && window.localStorage?.getItem('zen_debug_parser') === 'true';

export interface WriteToFileParams {
  file_path: string;
  content: string;
}

export const parseWriteToFile = (innerContent: string): WriteToFileParams => {
  // Parse according to tools-reference.ts schema: file_path only
  const filePath = extractParamValue(innerContent, 'file_path');
  const content = extractParamValue(innerContent, 'content');

  if (DEBUG_PARSER) {
    if (!filePath) {
      logger.warn('[Zen][WriteToFileParser] ⚠️ file_path is missing or empty!');
    }
    if (!content) {
      logger.warn('[Zen][WriteToFileParser] ⚠️ content is missing or empty!');
    }
  }

  return {
    file_path: filePath || '',
    content: content || '',
  };
};
