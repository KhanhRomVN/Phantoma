// Re-export all executors
export { executeReadFile } from './code/ReadFileExecutor';
export { executeWriteToFile } from './code/WriteToFileExecutor';
export { executeReplaceInFile } from './code/ReplaceInFileExecutor';
export { executeRevertFile } from './code/RevertFileExecutor';
export { executeViewReplaceHistory } from './code/ViewReplaceHistoryExecutor';
export { executeListFiles } from './code/ListFilesExecutor';
export { executeFindFiles } from './code/FindFilesExecutor';
export { executeRunCommand } from './code/RunCommandExecutor';
export { executeDeleteFile } from './code/DeleteFileExecutor';
export { executeGrep } from './code/GrepExecutor';
export { executeGitDiff } from './code/GitDiffExecutor';
export { executeMoveFile } from './code/MoveFileExecutor';

import type { ExecutorContext, ExecutorOptions, ToolExecutor } from '../../types/executor-types';
import { executeReadFile } from './code/ReadFileExecutor';
import { executeWriteToFile } from './code/WriteToFileExecutor';
import { executeReplaceInFile } from './code/ReplaceInFileExecutor';
import { executeRevertFile } from './code/RevertFileExecutor';
import { executeViewReplaceHistory } from './code/ViewReplaceHistoryExecutor';
import { executeListFiles } from './code/ListFilesExecutor';
import { executeFindFiles } from './code/FindFilesExecutor';
import { executeRunCommand } from './code/RunCommandExecutor';
import { executeDeleteFile } from './code/DeleteFileExecutor';
import { executeGrep } from './code/GrepExecutor';
import { executeGitDiff } from './code/GitDiffExecutor';
import { executeMoveFile } from './code/MoveFileExecutor';

/**
 * Factory function to get the appropriate executor for a given action type.
 * Wraps function-based executors into a unified ToolExecutor interface.
 */
export function getExecutor(actionType: string): ToolExecutor | null {
  switch (actionType) {
    case 'read_file':
      return {
        execute: async (action: any, _context: ExecutorContext, options?: ExecutorOptions) => {
          const result = await executeReadFile(action.params, options?.bypassIgnore ?? false);
          if (!result) return null;
          const content = result.output || '';
          const filePath = action.params.path || action.params.file_path || '';
          return `[read_file for '${filePath}'] Result:\n\`\`\`\n${content}\n\`\`\``;
        },
      };
    case 'write_to_file':
      return {
        execute: async (action: any, context: ExecutorContext, options?: ExecutorOptions) => {
          return executeWriteToFile(
            action.params,
            options?.skipDiagnostics ?? false,
            options?.bypassIgnore ?? false,
            context.conversationIdRef?.current,
            (action as any).actionId,
          );
        },
      };
    case 'replace_in_file':
      return {
        execute: async (action: any, context: ExecutorContext, options?: ExecutorOptions) => {
          return executeReplaceInFile(
            action.params,
            options?.skipDiagnostics ?? false,
            options?.bypassIgnore ?? false,
            context.conversationIdRef?.current,
            (action as any).actionId,
          );
        },
      };
    case 'revert_file':
      return {
        execute: async (action: any, _context: ExecutorContext, _options?: ExecutorOptions) => {
          return executeRevertFile(action.params);
        },
      };
    case 'view_replace_history':
      return {
        execute: async (action: any, _context: ExecutorContext, _options?: ExecutorOptions) => {
          return executeViewReplaceHistory(action.params);
        },
      };
    case 'list_files':
      return {
        execute: async (action: any, _context: ExecutorContext, options?: ExecutorOptions) => {
          return executeListFiles(action.params, options?.bypassIgnore ?? false);
        },
      };
    case 'find_files':
      return {
        execute: async (action: any, _context: ExecutorContext, _options?: ExecutorOptions) => {
          const result = await executeFindFiles(action.params);
          if (!result) return null;
          return result.output || '';
        },
      };
    case 'run_command':
      return {
        execute: async (action: any, _context: ExecutorContext, _options?: ExecutorOptions) => {
          return executeRunCommand(action.params, (action as any).actionId || `cmd-${Date.now()}`);
        },
      };
    case 'delete_file':
      return {
        execute: async (action: any, _context: ExecutorContext, _options?: ExecutorOptions) => {
          return executeDeleteFile(action.params);
        },
      };
    case 'grep':
      return {
        execute: async (action: any, _context: ExecutorContext, _options?: ExecutorOptions) => {
          return executeGrep(action.params);
        },
      };
    case 'git_diff':
      return {
        execute: async (action: any, _context: ExecutorContext, _options?: ExecutorOptions) => {
          const filePath =
            typeof action.params === 'string'
              ? action.params
              : action.params?.path || action.params?.file_path || '';
          return executeGitDiff(filePath, (action as any).actionId || `git-diff-${Date.now()}`);
        },
      };
    case 'move_file':
      return {
        execute: async (action: any, _context: ExecutorContext, _options?: ExecutorOptions) => {
          return executeMoveFile(action.params);
        },
      };
    case 'list_https':
      return {
        execute: async (action: any, _context: ExecutorContext, _options?: ExecutorOptions) => {
          const { executeListHttps } = await import('./emulate/ListHttpsExecutor');
          return executeListHttps(action.params || {});
        },
      };
    case 'list_hosts':
      return {
        execute: async (_action: any, _context: ExecutorContext, _options?: ExecutorOptions) => {
          const { executeListHosts } = await import('./emulate/ListHostsExecutor');
          return executeListHosts();
        },
      };
    case 'list_sources':
      return {
        execute: async (action: any, _context: ExecutorContext, _options?: ExecutorOptions) => {
          const { executeListSources } = await import('./emulate/ListSourcesExecutor');
          return executeListSources(action.params || {});
        },
      };
    case 'get_source_detail':
      return {
        execute: async (action: any, _context: ExecutorContext, _options?: ExecutorOptions) => {
          const { executeGetSourceDetail } = await import('./emulate/GetSourceDetailExecutor');
          return executeGetSourceDetail(action.params || {});
        },
      };
    case 'git_status':
    case 'commit_message':
      return null;
    default:
      console.warn(`[Zen][tool] No executor found for action type: "${actionType}"`);
      return null;
  }
}