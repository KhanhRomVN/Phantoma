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
  depth?: number | "max";
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

// ===== FIND FILES =====
export interface FindFilesParams {
  file_names?: string[];
}

export interface FindFilesResult {
  fileName: string;
  matches: string[];
}

export interface FindFilesResponse {
  output: string;
  results?: FindFilesResult[];
  totalMatches?: number;
}

// ===== DELETE FILE =====
export interface DeleteFileParams extends BaseToolParams {}

// ===== DELETE FOLDER =====
export interface DeleteFolderParams {
  folder_path: string;
}

export interface DeleteFolderResult {
  success: boolean;
  error?: string;
}

// ===== MOVE FILE =====
export interface MoveFileParams {
  file_path: string;
  target_folder_path: string;
}

export interface MoveFileResult {
  success: boolean;
  newPath?: string;
  error?: string;
}

// ===== RUN COMMAND =====
export interface RunCommandParams {
  command: string;
  terminal_id?: string;
  cwd?: string;
}

export interface RunCommandResult {
  success: boolean;
  output: string;
  terminalId?: string;
  error?: string;
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

export interface GitStatusBlockProps {
  statusItems: GitStatusItem[];
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

// ===== COMMIT MESSAGE =====
export interface CommitMessageParams {
  message?: string;
  content?: string;
}

export interface CommitMessageBlockProps {
  message: string;
  branch?: string;
  isCommitted?: boolean;
  isRejected?: boolean;
  isProcessing?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
}

// ===== GIT DIFF =====
export interface GitDiffParams extends BaseToolParams {}

export interface GitDiffBlockProps {
  filePath: string;
  diffContent: string;
  added: number;
  deleted: number;
  statusColor: string;
  isPartial: boolean;
  branch?: string;
  onFileClick?: (path: string) => void;
}

// ===== CODE =====
export interface CodeBlock {
  content: string;
  language?: string;
}

// ===== MARKDOWN =====
export interface MarkdownBlockProps {
  content: string;
}

// ===== THINKING =====
export interface ThinkingBlock {
  content: string;
}

// ===== QUESTION =====
export interface QuestionBlock {
  options: string[];
  title?: string;
  optional?: boolean;
  questions?: any[]; // Avoid circular dependency with message types
}

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

// ===== RECON TOOLS =====
export interface LaunchBrowserParams {
  targetId?: string;
}

export interface CloseBrowserParams {
  targetId?: string;
}

export interface GetBrowserStatusParams {
  targetId?: string;
}
