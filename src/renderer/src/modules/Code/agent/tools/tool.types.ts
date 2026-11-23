/**
 * ------------------------------------------------------------------
 * Code Module Tool Parameters
 * ------------------------------------------------------------------
 * Định nghĩa tất cả parameter types cho các tool của Code module.
 * Mỗi interface chứa tất cả variants (snake_case, camelCase) và
 * internal fields (requestId, conversationId, skipDiagnostics, etc.)
 * ------------------------------------------------------------------
 */

// ===== READ FILE =====
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

// ===== WRITE TO FILE =====
export interface WriteToFileParams {
  path?: string;
  filePath?: string;
  file_path?: string;
  content?: string;
  skipDiagnostics?: boolean;
  requestId?: string;
  conversationId?: string;
  messageId?: string;
  messageTimestamp?: number;
  responseNumber?: number;
}

// ===== REPLACE IN FILE =====
export interface ReplaceInFileParams {
  path?: string;
  filePath?: string;
  file_path?: string;
  old_str?: string;
  new_str?: string;
  old_content?: string;
  new_content?: string;
  diff?: string;
  skipDiagnostics?: boolean;
  requestId?: string;
  conversationId?: string;
  messageId?: string;
  messageTimestamp?: number;
  responseNumber?: number;
}

// ===== DELETE FILE =====
export interface DeleteFileParams {
  path?: string;
  filePath?: string;
  file_path?: string;
}

// ===== LIST FILES =====
export interface ListFilesParams {
  path?: string;
  folder_path?: string;
  folderPath?: string;
  depth?: number | 'max';
  recursive?: boolean;
  type?: string;
}

// ===== GREP =====
export interface GrepParams {
  search_term?: string;
  searchTerm?: string;
  file_path?: string;
  filePath?: string;
  folder_path?: string;
  folderPath?: string;
  _validationError?: string;
}

// ===== MOVE FILE =====
export interface MoveFileParams {
  file_path: string;
  target_folder_path: string;
}

// ===== RUN COMMAND =====
export interface RunCommandParams {
  command: string;
  terminal_id?: string;
  cwd?: string;
  folder_path?: string;
}

// ===== GIT STATUS =====
export interface GitStatusItem {
  status: string;
  path: string;
  staged?: boolean;
  added?: number;
  deleted?: number;
  isUnpushedCommit?: boolean;
}

export interface GitStatusParams {
  items?: GitStatusItem[] | string;
  branch?: string;
  raw?: string;
}

// ===== GIT DIFF =====
export interface GitDiffParams {
  path?: string;
  file_path?: string;
  filePath?: string;
}

// ===== CONVERSATION TITLE =====
export interface ConversationTitleParams {
  title: string;
}