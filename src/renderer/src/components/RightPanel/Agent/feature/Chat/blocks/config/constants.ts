export const ACTION_NAMES: Record<string, string> = {
  replace_in_file: "replace_in_file",
  write_to_file: "write_to_file",
  run_command: "Run Command",
};

export const TOOL_LABELS: Record<string, string> = {
  read_file: "Read",
  write_to_file: "Create",
  replace_in_file: "Edit",
  list_files: "Listing",
  grep: "Grep",
  delete_file: "Delete",
  delete_folder: "Delete",
  move_file: "Move",
  run_command: "Executing",
  git_diff: "Diff",
  default: "Zen",
};

export const TOOL_COLORS: Record<string, string> = {
  read_file: "var(--primary, #3b82f6)",
  write_to_file: "var(--success, #10b981)",
  replace_in_file:
    "var(--success, #10b981)",
  grep: "var(--primary, #3b82f6)",
  delete_file: "var(--error, #ef4444)",
  delete_folder: "var(--error, #ef4444)",
  move_file: "var(--warn, #f59e0b)",
  run_command: "var(--warn, #f59e0b)",
  git_status: "var(--success, #10b981)",
  commit_message: "var(--teal, #b39ddb)",
  git_diff: "var(--success, #3fb950)",
  default: "var(--secondary-text, #6b7280)",
};

export const CLICKABLE_TOOLS = [
  "read_file",
  "write_to_file",
  "replace_in_file",
  "list_files",
  "grep",
  "delete_file",
  "delete_folder",
  "move_file",
  "run_command",
  "git_diff",
];

export const MANUAL_CONFIRMATION_TOOLS = ["run_command"];

// Whitelist of allowed file extensions for external files
export const ALLOWED_FILE_EXTENSIONS = [
  ".txt",
  ".md",
  ".json",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".java",
  ".cpp",
  ".c",
  ".h",
  ".hpp",
  ".css",
  ".html",
  ".xml",
  ".yaml",
  ".yml",
  ".toml",
  ".ini",
  ".cfg",
  ".sh",
  ".go",
  ".rs",
  ".rb",
  ".php",
  ".swift",
  ".kt",
  ".scala",
];