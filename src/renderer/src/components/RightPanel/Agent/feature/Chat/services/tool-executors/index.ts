// ═══════════════════════════════════════════════════════════════════════
// Re-export — Code tools
// ═══════════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════════
// Re-export — Emulate tools
// ═══════════════════════════════════════════════════════════════════════
export { executeListHttps } from './emulate/ListHttpsExecutor';
export { executeListHosts } from './emulate/ListHostsExecutor';
export { executeListSources } from './emulate/ListSourcesExecutor';
export { executeGetSourceDetail } from './emulate/GetSourceDetailExecutor';
export { executeGetHttpsDetail } from './emulate/GetHttpsDetailExecutor';
export { executeApplyFilter } from './emulate/ApplyFilterExecutor';

// ═══════════════════════════════════════════════════════════════════════
// Re-export — Recon tools
// ═══════════════════════════════════════════════════════════════════════
export { executeListTabs } from './recon/ListTabsExecutor';
export { executeCreateTab } from './recon/CreateTabExecutor';
export { executeCloseTab } from './recon/CloseTabExecutor';
export { executeSwitchTab } from './recon/SwitchTabExecutor';
export { executeNavigate } from './recon/NavigateExecutor';
export { executeBack } from './recon/BackExecutor';
export { executeForward } from './recon/ForwardExecutor';
export { executeReload } from './recon/ReloadExecutor';
export { executeGetPageContent } from './recon/GetPageContentExecutor';
export { executeListElements } from './recon/ListElementsExecutor';
export { executeClickElement } from './recon/ClickElementExecutor';
export { executeFillInput } from './recon/FillInputExecutor';
export { executePressKey } from './recon/PressKeyExecutor';
export { executeScroll } from './recon/ScrollExecutor';

// ═══════════════════════════════════════════════════════════════════════
// Imports
// ═══════════════════════════════════════════════════════════════════════

import type { ExecutorContext, ExecutorOptions, ToolExecutor } from '../../types/executor-types';

// ── Code tool executors ──────────────────────────────────────────────
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

// ═══════════════════════════════════════════════════════════════════════
// Factory
// ═══════════════════════════════════════════════════════════════════════

/**
 * Factory function — mỗi case gọi executor function tương ứng.
 * Tất cả executor đã được refactor để gọi Controller.executeTool() thay vì IPC.
 */
export function getExecutor(actionType: string): ToolExecutor | null {
  switch (actionType) {
    // ── Code tools ──────────────────────────────────────────────
    case 'read_file':
      return {
        execute: async (action: any, _ctx: ExecutorContext, options?: ExecutorOptions) => {
          const result = await executeReadFile(action.params, options?.bypassIgnore ?? false);
          return result?.output || null;
        },
      };
    case 'write_to_file':
      return {
        execute: async (action: any, ctx: ExecutorContext, options?: ExecutorOptions) => {
          return executeWriteToFile(
            action.params,
            options?.skipDiagnostics ?? false,
            options?.bypassIgnore ?? false,
            ctx.conversationIdRef?.current,
            (action as any).actionId,
          );
        },
      };
    case 'replace_in_file':
      return {
        execute: async (action: any, ctx: ExecutorContext, options?: ExecutorOptions) => {
          return executeReplaceInFile(
            action.params,
            options?.skipDiagnostics ?? false,
            options?.bypassIgnore ?? false,
            ctx.conversationIdRef?.current,
            (action as any).actionId,
          );
        },
      };
    case 'revert_file':
      return {
        execute: async (action: any, ctx: ExecutorContext, _options?: ExecutorOptions) => {
          return executeRevertFile(
            action.params,
            false,
            ctx.conversationIdRef?.current,
            (action as any).actionId,
          );
        },
      };
    case 'view_replace_history':
      return {
        execute: async (action: any, _ctx: ExecutorContext, _options?: ExecutorOptions) => {
          return executeViewReplaceHistory(action.params);
        },
      };
    case 'list_files':
      return {
        execute: async (action: any, _ctx: ExecutorContext, options?: ExecutorOptions) => {
          return executeListFiles(action.params, options?.bypassIgnore ?? false);
        },
      };
    case 'find_files':
      return {
        execute: async (action: any, _ctx: ExecutorContext, _options?: ExecutorOptions) => {
          const result = await executeFindFiles(action.params);
          return result?.output || null;
        },
      };
    case 'run_command':
      return {
        execute: async (action: any, _ctx: ExecutorContext, _options?: ExecutorOptions) => {
          const cmdId = (action as any).actionId || 'cmd-' + Date.now();
          return executeRunCommand(action.params, cmdId);
        },
      };
    case 'delete_file':
      return {
        execute: async (action: any, _ctx: ExecutorContext, _options?: ExecutorOptions) => {
          return executeDeleteFile(action.params);
        },
      };
    case 'grep':
      return {
        execute: async (action: any, _ctx: ExecutorContext, _options?: ExecutorOptions) => {
          return executeGrep(action.params);
        },
      };
    case 'git_diff':
      return {
        execute: async (action: any, _ctx: ExecutorContext, _options?: ExecutorOptions) => {
          const filePath =
            typeof action.params === 'string'
              ? action.params
              : action.params?.path || action.params?.file_path || '';
          const diffId = (action as any).actionId || 'git-diff-' + Date.now();
          return executeGitDiff(filePath, diffId);
        },
      };
    case 'move_file':
      return {
        execute: async (action: any, _ctx: ExecutorContext, _options?: ExecutorOptions) => {
          return executeMoveFile(action.params);
        },
      };

    // ── Emulate tools ────────────────────────────────────────────
    case 'list_https':
      return {
        execute: async (action: any, _ctx: ExecutorContext, _options?: ExecutorOptions) => {
          const { executeListHttps } = await import('./emulate/ListHttpsExecutor');
          return executeListHttps(action.params || {});
        },
      };
    case 'list_hosts':
      return {
        execute: async (_action: any, _ctx: ExecutorContext, _options?: ExecutorOptions) => {
          const { executeListHosts } = await import('./emulate/ListHostsExecutor');
          return executeListHosts();
        },
      };
    case 'list_sources':
      return {
        execute: async (action: any, _ctx: ExecutorContext, _options?: ExecutorOptions) => {
          const { executeListSources } = await import('./emulate/ListSourcesExecutor');
          return executeListSources(action.params || {});
        },
      };
    case 'list_resources':
      return {
        execute: async (action: any, _ctx: ExecutorContext, _options?: ExecutorOptions) => {
          const { executeListResources } = await import('./emulate/ListResourcesExecutor');
          return executeListResources(action.params || {});
        },
      };
    case 'get_source_detail':
      return {
        execute: async (action: any, _ctx: ExecutorContext, _options?: ExecutorOptions) => {
          const { executeGetSourceDetail } = await import('./emulate/GetSourceDetailExecutor');
          return executeGetSourceDetail(action.params || {});
        },
      };
    case 'get_resource_content':
      return {
        execute: async (action: any, _ctx: ExecutorContext, _options?: ExecutorOptions) => {
          const { executeGetResourceContent } =
            await import('./emulate/GetResourceContentExecutor');
          return executeGetResourceContent(action.params || {});
        },
      };
    case 'get_https_detail':
      return {
        execute: async (action: any, _ctx: ExecutorContext, _options?: ExecutorOptions) => {
          const { executeGetHttpsDetail } = await import('./emulate/GetHttpsDetailExecutor');
          return executeGetHttpsDetail(action.params || {});
        },
      };
    case 'apply_filter':
      return {
        execute: async (action: any, _ctx: ExecutorContext, _options?: ExecutorOptions) => {
          const { executeApplyFilter } = await import('./emulate/ApplyFilterExecutor');
          return executeApplyFilter(action.params || {});
        },
      };

    // ── Recon tools ──────────────────────────────────────────────
    case 'list_tabs':
      return {
        execute: async (action: any, _ctx: ExecutorContext, _options?: ExecutorOptions) => {
          const { executeListTabs } = await import('./recon/ListTabsExecutor');
          return executeListTabs(action.params || {});
        },
      };
    case 'create_tab':
      return {
        execute: async (action: any, _ctx: ExecutorContext, _options?: ExecutorOptions) => {
          const { executeCreateTab } = await import('./recon/CreateTabExecutor');
          return executeCreateTab(action.params || {});
        },
      };
    case 'close_tab':
      return {
        execute: async (action: any, _ctx: ExecutorContext, _options?: ExecutorOptions) => {
          const { executeCloseTab } = await import('./recon/CloseTabExecutor');
          return executeCloseTab(action.params || {});
        },
      };
    case 'switch_tab':
      return {
        execute: async (action: any, _ctx: ExecutorContext, _options?: ExecutorOptions) => {
          const { executeSwitchTab } = await import('./recon/SwitchTabExecutor');
          return executeSwitchTab(action.params || {});
        },
      };
    case 'navigate':
      return {
        execute: async (action: any, _ctx: ExecutorContext, _options?: ExecutorOptions) => {
          const { executeNavigate } = await import('./recon/NavigateExecutor');
          return executeNavigate(action.params || {});
        },
      };
    case 'back':
      return {
        execute: async (action: any, _ctx: ExecutorContext, _options?: ExecutorOptions) => {
          const { executeBack } = await import('./recon/BackExecutor');
          return executeBack(action.params || {});
        },
      };
    case 'forward':
      return {
        execute: async (action: any, _ctx: ExecutorContext, _options?: ExecutorOptions) => {
          const { executeForward } = await import('./recon/ForwardExecutor');
          return executeForward(action.params || {});
        },
      };
    case 'reload':
      return {
        execute: async (action: any, _ctx: ExecutorContext, _options?: ExecutorOptions) => {
          const { executeReload } = await import('./recon/ReloadExecutor');
          return executeReload(action.params || {});
        },
      };
    case 'get_page_content':
      return {
        execute: async (action: any, _ctx: ExecutorContext, _options?: ExecutorOptions) => {
          const { executeGetPageContent } = await import('./recon/GetPageContentExecutor');
          return executeGetPageContent(action.params || {});
        },
      };
    case 'list_elements':
      return {
        execute: async (action: any, _ctx: ExecutorContext, _options?: ExecutorOptions) => {
          const { executeListElements } = await import('./recon/ListElementsExecutor');
          return executeListElements(action.params || {});
        },
      };
    case 'click_element':
      return {
        execute: async (action: any, _ctx: ExecutorContext, _options?: ExecutorOptions) => {
          const { executeClickElement } = await import('./recon/ClickElementExecutor');
          return executeClickElement(action.params || {});
        },
      };
    case 'fill_input':
      return {
        execute: async (action: any, _ctx: ExecutorContext, _options?: ExecutorOptions) => {
          const { executeFillInput } = await import('./recon/FillInputExecutor');
          return executeFillInput(action.params || {});
        },
      };
    case 'press_key':
      return {
        execute: async (action: any, _ctx: ExecutorContext, _options?: ExecutorOptions) => {
          const { executePressKey } = await import('./recon/PressKeyExecutor');
          return executePressKey(action.params || {});
        },
      };
    case 'scroll':
      return {
        execute: async (action: any, _ctx: ExecutorContext, _options?: ExecutorOptions) => {
          const { executeScroll } = await import('./recon/ScrollExecutor');
          return executeScroll(action.params || {});
        },
      };

    // ── Display-only (không cần execute) ─────────────────────────
    case 'git_status':
    case 'commit_message':
      return null;

    default:
      console.warn('[tool] No executor found for: "' + actionType + '"');
      return null;
  }
}
