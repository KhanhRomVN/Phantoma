import React, { useMemo } from 'react';
import { cn } from '@renderer/shared/lib/utils';
import { ToolHeader } from './ToolHeader';
import { getToolColor } from '../../utils/toolUtils';
import { parseGitStatusOutput } from '../../utils/parseGitStatus';
import { ToolAction } from '../../services/ResponseParser';
import GitStatusBlock, { GitStatusItem } from '../blocks/GitStatusBlock';
import { $ } from '@renderer/utils/color';

interface GitToolRendererProps {
  action: ToolAction;
  actionIndex: number;
  messageId: string;
  isActionClicked?: boolean;
  isActiveGroup?: boolean;
  isLastMessage?: boolean;
  isLastItemInList?: boolean;
  toolOutputs?: Record<string, { output: string; isError: boolean }>;
  onToolClick: (
    action: ToolAction,
    messageId: string,
    actionIndex: number,
    type: 'accept_all' | 'accept_once' | 'reject',
  ) => void;
  onConfirm?: (statusItems: GitStatusItem[]) => void;
  onCancel?: () => void;
  gitStatusItems?: GitStatusItem[];
  isProcessing?: boolean;
  isVisible?: boolean;
  branch?: string;
}

const GitToolRenderer: React.FC<GitToolRendererProps> = ({
  action,
  actionIndex,
  messageId,
  isActionClicked = false,
  isActiveGroup = false,
  isLastMessage = false,
  isLastItemInList = true,
  toolOutputs,
  onToolClick,
  onConfirm,
  onCancel,
  gitStatusItems = [],
  isProcessing = false,
  isVisible = true,
  branch,
}) => {
  const actionId = `${messageId}-action-${actionIndex}`;

  // If not visible, don't render anything
  if (!isVisible) {
    return null;
  }
  const hasOutput = toolOutputs && toolOutputs[actionId];

  // Parse git output from toolOutputs or from action params (for restored conversations)
  const parsedItems = useMemo(() => {
    if (gitStatusItems.length > 0) {
      return gitStatusItems;
    }
    // First, try to get from toolOutputs (works for active sessions)
    if (hasOutput && toolOutputs[actionId] && !toolOutputs[actionId].isError) {
      const parsed = parseGitStatusOutput(toolOutputs[actionId].output);
      if (parsed.length > 0) return parsed;
    }
    // Fallback: parse from action.params.items (restored from conversation)
    const itemsFromParams = action.params?.items;
    if (itemsFromParams && Array.isArray(itemsFromParams) && itemsFromParams.length > 0) {
      return itemsFromParams;
    }
    // Last resort: try to parse from raw git output stored in action params
    const rawOutput = action.params?.raw;
    if (rawOutput && typeof rawOutput === 'string') {
      const parsed = parseGitStatusOutput(rawOutput);
      if (parsed.length > 0) return parsed;
    }
    return [];
  }, [gitStatusItems, hasOutput, toolOutputs, actionId, action.params]);

  // Use parsed items instead of the prop
  const effectiveItems = parsedItems.length > 0 ? parsedItems : gitStatusItems;

  const getStatusColor = () => {
    if (hasOutput) {
      const output = toolOutputs[actionId];
      if (output.isError) return $('--error') || '#f14c4c';
      return getToolColor('git_status');
    }
    return getToolColor('git_status');
  };

  const getTitleParts = () => {
    if (hasOutput) {
      const output = toolOutputs[actionId];
      if (output.isError) return { label: 'GIT STATUS', stats: 'Error' };
      const totalAdded = effectiveItems.reduce((sum, item) => sum + (item.added || 0), 0);
      const totalDeleted = effectiveItems.reduce((sum, item) => sum + (item.deleted || 0), 0);
      return {
        label: `GIT STATUS${branch ? `(${branch})` : ''}`,
        stats: `${effectiveItems.length} changes +${totalAdded} -${totalDeleted}`,
        totalAdded,
        totalDeleted,
      };
    }
    return { label: 'GIT STATUS', stats: '' };
  };

  const handleConfirm = () => {
    if (onConfirm && effectiveItems.length > 0) {
      onConfirm(effectiveItems);
    } else {
      console.warn('[GitToolRenderer] Cannot confirm - no onConfirm or no items');
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div
      className={cn(
        'terminal-block git-tool bg-transparent rounded-none overflow-visible',
        isActiveGroup ? 'active' : '',
        isLastItemInList ? 'mb-0' : 'mb-2',
      )}
    >
      <ToolHeader
        title={
          <div className="flex items-center gap-1.5 text-xs text-text-primary">
            <span className="font-semibold opacity-80">{getTitleParts().label}</span>
            {getTitleParts().stats && (
              <>
                <span className="text-[11px] opacity-50 ml-0.5">
                  {getTitleParts()
                    .stats.replace(/\+[0-9]+/, '')
                    .replace(/ -[0-9]+/, '')
                    .trim()}
                </span>
                <span className="text-success font-semibold text-[11px]">
                  +{getTitleParts().totalAdded}
                </span>
                <span className="text-error font-semibold text-[11px]">
                  -{getTitleParts().totalDeleted}
                </span>
              </>
            )}
            <span className="codicon codicon-git-pull-request text-sm ml-0.5" />
          </div>
        }
        statusColor={getStatusColor()}
        isPartial={false}
      />

      {hasOutput && (
        <div className="px-3 pb-3 pl-[29px]">
          <GitStatusBlock
            statusItems={effectiveItems}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            isProcessing={isProcessing}
          />
        </div>
      )}
    </div>
  );
};

export default GitToolRenderer;
