/**
 * ------------------------------------------------------------------
 * Code Tool Tag Registry
 * ------------------------------------------------------------------
 * Định nghĩa metadata cho các tool thao tác với code/filesystem.
 * Bao gồm cấu hình permission, timeout, và features cho từng tool.
 *
 * Main exports:
 * - CODE_TAG_REGISTRY : Registry chứa định nghĩa 16 code tools
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import type { TagDefinition } from '@renderer/components/Widgets/Zen/feature/Chat/types/tag-types';

// ─── Constants ──────────────────────────────────────────────────────────
export const CODE_TAG_REGISTRY: Record<string, TagDefinition> = {
  read_file: {
    id: 'read_file',
    title: 'READ',
    timeout: 60000,
    features: {
      showFileStats: true,
    },
  },

  write_to_file: {
    id: 'write_to_file',
    title: 'WRITE',
    timeout: 60000,
    features: {
      showFileStats: true,
      isFileMutation: true,
    },
  },

  replace_in_file: {
    id: 'replace_in_file',
    title: 'UPDATE',
    timeout: 60000,
    features: {
      validateFuzzyMatch: true,
      isFileMutation: true,
    },
  },

  list_files: {
    id: 'list_files',
    title: 'LIST',
    timeout: 60000,
  },

  find_files: {
    id: 'find_files',
    title: 'FIND',
    timeout: 60000,
  },

  grep: {
    id: 'grep',
    title: 'GREP',
    timeout: 60000,
  },

  delete_file: {
    id: 'delete_file',
    title: 'DELETE',
    timeout: 60000,
  },

  run_command: {
    id: 'run_command',
    title: 'EXECUTE',
    timeout: 60000,
  },

  git_status: {
    id: 'git_status',
    title: 'GIT STATUS',
    timeout: 60000,
  },

  commit_message: {
    id: 'commit_message',
    title: 'COMMIT MESSAGE',
    timeout: 60000,
  },

  git_diff: {
    id: 'git_diff',
    title: 'DIFF',
    timeout: 60000,
  },

  read_skill: {
    id: 'read_skill',
    title: 'READ SKILL',
    timeout: 20000,
  },

  read_memory: {
    id: 'read_memory',
    title: 'READ MEMORY',
    timeout: 30000,
  },

  update_memory: {
    id: 'update_memory',
    title: 'UPDATE MEMORY',
    timeout: 30000,
  },

  conversation_title: {
    id: 'conversation_title',
    title: 'TITLE',
    features: { clickable: false },
  },

  list_agents: {
    id: 'list_agents',
    title: 'LIST AGENTS',
    timeout: 10000,
  },

  create_agent: {
    id: 'create_agent',
    title: 'CREATE AGENT',
    timeout: 30000,
    // Note: Do NOT auto-execute - wait for user confirmation
    // (handled in useToolActions skip list)
  },

  send_message: {
    id: 'send_message',
    title: 'SEND MESSAGE',
    timeout: 30000,
  },

  delete_agent: {
    id: 'delete_agent',
    title: 'DELETE AGENT',
    timeout: 10000,
  },

  list_tasks: {
    id: 'list_tasks',
    title: 'LIST TASKS',
    timeout: 15000,
  },

  get_task: {
    id: 'get_task',
    title: 'GET TASK',
    timeout: 15000,
  },

  create_task: {
    id: 'create_task',
    title: 'CREATE TASK',
    timeout: 15000,
  },

  update_task: {
    id: 'update_task',
    title: 'UPDATE TASK',
    timeout: 15000,
  },

  assign_task: {
    id: 'assign_task',
    title: 'ASSIGN TASK',
    timeout: 15000,
  },

  create_workflow: {
    id: 'create_workflow',
    title: 'CREATE WORKFLOW',
    timeout: 15000,
  },

  get_workflow: {
    id: 'get_workflow',
    title: 'GET WORKFLOW',
    timeout: 15000,
  },

  update_workflow: {
    id: 'update_workflow',
    title: 'UPDATE WORKFLOW',
    timeout: 15000,
  },
};
