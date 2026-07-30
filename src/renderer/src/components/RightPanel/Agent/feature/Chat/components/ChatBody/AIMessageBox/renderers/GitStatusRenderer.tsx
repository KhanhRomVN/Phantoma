import React, { useMemo } from 'react';
import { cn } from '@renderer/shared/lib/utils';

// CONSTANTS
import { TOOL_ACTION_TYPES, getToolLabel } from '../../../../constants/constants';

// TYPES
import { ToolAction } from '../../../../services/ResponseParser';
import { GitStatusItem } from '../../../../types/tool-types';

// UTILS
import { parseGitStatusOutput } from '../../../../utils/gitUtils';

// COMPONENTS
import { TagHeader } from '../TagHeader';
import GitStatusBlock from '../blocks/GitStatusBlock';

interface GitStatusRendererProps {
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
    type: (typeof TOOL_ACTION_TYPES)[keyof typeof TOOL_ACTION_TYPES],
  ) => void;
  onConfirm?: (statusItems: GitStatusItem[]) => void;
  onCancel?: () => void;
  gitStatusItems?: GitStatusItem[];
  isProcessing?: boolean;
  isVisible?: boolean;
  branch?: string;
}

/**
 * Renderer for git_status tool type
 * Displays git repository status with file changes
 */
export const GitStatusRenderer: React.FC<GitStatusRendererProps> = ({
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
    if (hasOutput && toolOutputs[actionId] && !toolOutputs[actionId].isError) {
      const parsed = parseGitStatusOutput(toolOutputs[actionId].output);
      if (parsed.length > 0) return parsed;
    }
    const itemsFromParams = action.params?.items;
    if (
      itemsFromParams &&
      Array.isArray(itemsFromParams) &&
      itemsFromParams.length > 0
    ) {
      return itemsFromParams;
    }
    const rawOutput = action.params?.raw;
    if (rawOutput && typeof rawOutput === "string") {
      const parsed = parseGitStatusOutput(rawOutput);
      if (parsed.length > 0) return parsed;
    }
    return [];
  }, [gitStatusItems, hasOutput, toolOutputs, actionId, action.params]);

  const effectiveItems = parsedItems.length > 0 ? parsedItems : gitStatusItems;

  const getStatusColor = (): string => {
    if (hasOutput) {
      const output = toolOutputs[actionId];
      if (output.isError) return 'rgb(255, 45, 85)';
      return 'rgb(255, 159, 10)';
    }
    return 'rgb(255, 159, 10)';
  };

  const getTitleParts = () => {
    if (hasOutput) {
      const output = toolOutputs[actionId];
      if (output.isError) return { label: getToolLabel("git_status"), stats: "Error" };
      const totalAdded = effectiveItems.reduce(
        (sum, item) => sum + (item.added || 0),
        0,
      );
      const totalDeleted = effectiveItems.reduce(
        (sum, item) => sum + (item.deleted || 0),
        0,
      );
      return {
        label: `${getToolLabel("git_status")}${branch ? ` (${branch})` : ""}`,
        stats: `${effectiveItems.length} changes +${totalAdded} -${totalDeleted}`,
        totalAdded,
        totalDeleted,
      };
    }
    return { label: getToolLabel("git_status"), stats: "" };
  };

  const handleConfirm = () => {
    if (onConfirm && effectiveItems.length > 0) {
      onConfirm(effectiveItems);
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
        isActiveGroup && 'active',
        isLastItemInList ? 'mb-0' : 'mb-2'
      )}
    >
      <TagHeader
        title={
          <div className="flex items-center gap-1.5 text-xs text-text-primary">
            <span className="font-semibold opacity-80">
              {getTitleParts().label}
            </span>
            {getTitleParts().stats && (
              <>
                <span className="text-[11px] opacity-50 ml-0.5">
                  {getTitleParts()
                    .stats.replace(/\+[0-9]+/, "")
                    .replace(/ -[0-9]+/, "")
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
        <div className="pr-3 pb-3">
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