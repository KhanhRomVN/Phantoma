/**
 * ------------------------------------------------------------------
 * Code Tool Tag Registry
 * ------------------------------------------------------------------
 * Định nghĩa metadata cho các tool thao tác với code/filesystem.
 * Bao gồm cấu hình permission, timeout, và features cho từng tool.
 *
 * Main exports:
 * - CODE_TAG_REGISTRY : Registry chứa định nghĩa 13 code tools
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import type { TagDefinition } from "../types/tag-types";

// ─── Constants ──────────────────────────────────────────────────────────
export const CODE_TAG_REGISTRY: Record<string, TagDefinition> = {
  read_file: {
    id: "read_file",
    title: "READ",
    category: "tool",
    timeout: 60000,
    permissions: {
      approval: "allow",
      fullAccess: "allow",
    },
    features: {
      showFileStats: true,
    },
  },

  write_to_file: {
    id: "write_to_file",
    title: "WRITE",
    category: "tool",
    timeout: 60000,
    permissions: {
      approval: "confirm",
      fullAccess: "allow",
    },
    features: {
      showFileStats: true,
      isFileMutation: true,
    },
  },

  replace_in_file: {
    id: "replace_in_file",
    title: "UPDATE",
    category: "tool",
    timeout: 60000,
    permissions: {
      approval: "confirm",
      fullAccess: "allow",
    },
    features: {
      validateFuzzyMatch: true,
      isFileMutation: true,
    },
  },

  revert_file: {
    id: "revert_file",
    title: "REVERT",
    category: "tool",
    timeout: 60000,
    permissions: {
      approval: "confirm",
      fullAccess: "allow",
    },
    features: {
      isFileMutation: true,
    },
  },

  view_replace_history: {
    id: "view_replace_history",
    title: "HISTORY REPLACE",
    category: "tool",
    timeout: 60000,
    permissions: {
      approval: "allow",
      fullAccess: "allow",
    },
  },

  list_files: {
    id: "list_files",
    title: "LIST",
    category: "tool",
    timeout: 60000,
    permissions: {
      approval: "allow",
      fullAccess: "allow",
    },
  },

  find_files: {
    id: "find_files",
    title: "FIND",
    category: "tool",
    timeout: 60000,
    permissions: {
      approval: "allow",
      fullAccess: "allow",
    },
  },

  grep: {
    id: "grep",
    title: "GREP",
    category: "tool",
    timeout: 60000,
    permissions: {
      approval: "allow",
      fullAccess: "allow",
    },
  },

  delete_file: {
    id: "delete_file",
    title: "DELETE",
    category: "tool",
    timeout: 60000,
    permissions: {
      approval: "confirm",
      fullAccess: "allow",
    },
  },

  run_command: {
    id: "run_command",
    title: "EXECUTE",
    category: "tool",
    timeout: 60000,
    permissions: {
      approval: "confirm",
      fullAccess: "confirm",
    },
  },

  git_status: {
    id: "git_status",
    title: "GIT STATUS",
    category: "tool",
    timeout: 60000,
    permissions: {
      approval: "allow",
      fullAccess: "allow",
    },
  },

  commit_message: {
    id: "commit_message",
    title: "COMMIT MESSAGE",
    category: "tool",
    timeout: 60000,
    permissions: {
      approval: "allow",
      fullAccess: "allow",
    },
  },

  git_diff: {
    id: "git_diff",
    title: "DIFF",
    category: "tool",
    timeout: 60000,
    permissions: {
      approval: "allow",
      fullAccess: "allow",
    },
  },
};