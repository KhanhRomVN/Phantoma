/**
 * ------------------------------------------------------------------
 * Tool Types
 * ------------------------------------------------------------------
 * Định nghĩa các type cho params và results của từng tool.
 * Bao gồm code tools, emulate tools, và recon tools.
 *
 * Main types:
 * - BaseToolParams      : Params chung cho các tool thao tác file
 * - ReadFileParams      : Params cho read_file tool
 * - WriteToFileParams   : Params cho write_to_file tool
 * - RunCommandParams    : Params cho run_command tool
 * - ListHttpsParams     : Params cho list_https tool
 * ------------------------------------------------------------------
 */

// ─── Types ──────────────────────────────────────────────────────────────
// ===== BASE PARAMS =====
export interface BaseToolParams {
  file_path?: string;
  path?: string;
  folder_path?: string;
}

// ===== READ FILE =====
export interface ReadFileParams extends BaseToolParams {
  start_line?: number;
  end_line?: number;
}

// ===== WRITE TO FILE =====
export interface WriteToFileParams extends BaseToolParams {
  content?: string;
}

// ===== REPLACE IN FILE =====
export interface ReplaceInFileParams extends BaseToolParams {
  old_content?: string;
  new_content?: string;
}

// ===== REVERT FILE =====
export interface RevertFileParams extends BaseToolParams {}

// ===== LIST FILES =====
export interface ListFilesParams {
  folder_path?: string;
  path?: string;
  recursive?: boolean;
  depth?: number | 'max';
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
  _validationError?: string; // Internal flag for invalid regex
}

// ===== DELETE FILE =====
export interface DeleteFileParams extends BaseToolParams {}

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
export interface GitDiffParams extends BaseToolParams {}

// ===== EMULATE TOOLS =====
export interface ListHttpsParams {
  filter?: {
    method?: string;
    host?: string;
    path?: string;
    status?: number;
    type?: string;
  };
  limit?: number;
}

export interface GetHttpsDetailParams {
  index: number;
}

export interface ListHostsParams {
  // Không có params
}

export interface ListSourcesParams {
  filter?: {
    host?: string;
    type?: string;
  };
}

export interface ListResourcesParams {
  filter?: {
    type?: string;
  };
}

export interface GetSourceDetailParams {
  filepath: string;
}

export interface GetResourceContentParams {
  filename: string;
  start_line?: number;
  end_line?: number;
}

export interface SendToRepeaterParams {
  index: number;
}

export interface ListRepeatersParams {
  // Không có params
}

export interface DeleteRepeaterParams {
  repeater_id: string;
}

export interface GetRepeaterDetailParams {
  repeater_id: string;
}

export interface UpdateRepeaterContentParams {
  repeater_id: string;
  target: 'params' | 'headers' | 'body';
  old_content: string;
  new_content: string;
}

export interface RunRepeaterParams {
  repeater_id: string;
}
