/**
 * ------------------------------------------------------------------
 * Code Tool Display Formatters
 * ------------------------------------------------------------------
 * Định nghĩa cách hiển thị params và tooltip cho các tool của Code module.
 * ------------------------------------------------------------------
 */

import type {
  ActionDisplayFormatter,
  CompletedTooltipFormatter,
} from '@renderer/components/RightPanel/Zen/shared/tool-display';
import { getToolLabel } from '@renderer/components/RightPanel/Zen/feature/Chat/constants/tag-registry';

/**
 * Format action display string cho Code tools.
 */
export const formatCodeAction: ActionDisplayFormatter = (action, moduleId) => {
  const toolLabel = getToolLabel(action.type, moduleId);

  switch (action.type) {
    case 'read_file': {
      const range =
        action.params.start_line && action.params.end_line
          ? ` (${action.params.start_line}-${action.params.end_line})`
          : '';
      return `${toolLabel}: ${action.params.file_path || 'unknown'}${range}`;
    }

    case 'write_to_file':
    case 'replace_in_file':
    case 'delete_file':
      return `${toolLabel}: ${action.params.file_path || 'unknown'}`;

    case 'run_command':
      return `${toolLabel}: ${action.params.command || ''}`;

    case 'list_files': {
      const type = action.params.type ? ` [${action.params.type}]` : '';
      return `${toolLabel}: ${action.params.folder_path || 'unknown'}${type}`;
    }

    case 'find_files': {
      const fileCount = action.params.file_names?.length || 0;
      return `${toolLabel}: ${fileCount} file name${fileCount === 1 ? '' : 's'}`;
    }

    case 'grep':
      return `${toolLabel}: ${action.params.search_term || ''}`;

    case 'git_status': {
      const count = action.params.items?.length || 0;
      return `${toolLabel}: ${count} changes`;
    }

    case 'commit_message':
    case 'git_diff':
      return toolLabel;

    case 'read_skill':
      return `${toolLabel}: ${action.params.skill_id || 'unknown'}`;

    case 'read_memory':
    case 'update_memory':
      return toolLabel;

    case 'conversation_title':
      return `${toolLabel}: ${action.params.title || ''}`;

    default:
      // Not a Code tool
      return null;
  }
};

/**
 * Format completed tooltip cho Code tools với metadata.
 */
export const formatCodeCompletedTooltip: CompletedTooltipFormatter = (
  toolType,
  diffStats,
  tooltipMeta,
) => {
  switch (toolType) {
    case 'write_to_file':
      if (tooltipMeta?.lineCount) {
        return `✓ File created (+${tooltipMeta.lineCount} lines)`;
      }
      return null;

    case 'replace_in_file':
      if (diffStats) {
        return `✓ File updated (+${diffStats.added} -${diffStats.removed} lines)`;
      }
      return null;

    case 'read_file':
      if (tooltipMeta?.lineRange) {
        return `✓ Read lines ${tooltipMeta.lineRange}`;
      }
      return null;

    case 'list_files':
      if (tooltipMeta?.fileCount) {
        const count = tooltipMeta.fileCount;
        return `✓ Listed ${count} ${count === 1 ? 'item' : 'items'}`;
      }
      return null;

    case 'grep':
      if (tooltipMeta?.matchCount !== undefined && tooltipMeta?.fileCount !== undefined) {
        const matches = tooltipMeta.matchCount;
        const files = tooltipMeta.fileCount;
        return `✓ Found ${matches} ${matches === 1 ? 'match' : 'matches'} in ${files} ${files === 1 ? 'file' : 'files'}`;
      }
      return null;


    default:
      // Not a Code tool or no special formatting needed
      return null;
  }
};