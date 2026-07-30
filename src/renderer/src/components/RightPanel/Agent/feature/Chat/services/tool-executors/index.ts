// Re-export all executors
export { executeReadFile } from './ReadFileExecutor';
export { executeWriteToFile } from './WriteToFileExecutor';
export { executeReplaceInFile } from './ReplaceInFileExecutor';
export { executeRevertFile } from './RevertFileExecutor';
export { executeViewReplaceHistory } from './ViewReplaceHistoryExecutor';
export { executeListFiles } from './ListFilesExecutor';
export { executeFindFiles } from './FindFilesExecutor';
export { executeRunCommand } from './RunCommandExecutor';
export { executeDeleteFile } from './DeleteFileExecutor';
export { executeGrep } from './GrepExecutor';
export { executeGitDiff } from './GitDiffExecutor';
export { executeMoveFile } from './MoveFileExecutor';

import type { ExecutorContext, ExecutorOptions, ToolExecutor } from '../../types/executor-types';
import { executeReadFile } from './ReadFileExecutor';
import { executeWriteToFile } from './WriteToFileExecutor';
import { executeReplaceInFile } from './ReplaceInFileExecutor';
import { executeRevertFile } from './RevertFileExecutor';
import { executeViewReplaceHistory } from './ViewReplaceHistoryExecutor';
import { executeListFiles } from './ListFilesExecutor';
import { executeFindFiles } from './FindFilesExecutor';
import { executeRunCommand } from './RunCommandExecutor';
import { executeDeleteFile } from './DeleteFileExecutor';
import { executeGrep } from './GrepExecutor';
import { executeGitDiff } from './GitDiffExecutor';
import { executeMoveFile } from './MoveFileExecutor';

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
          const filePath = typeof action.params === 'string' ? action.params : (action.params?.path || action.params?.file_path || '');
          return executeGitDiff(filePath, (action as any).actionId || `git-diff-${Date.now()}`);
        },
      };
    case 'move_file':
      return {
        execute: async (action: any, _context: ExecutorContext, _options?: ExecutorOptions) => {
          return executeMoveFile(action.params);
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