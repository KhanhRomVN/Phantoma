import React, { useMemo } from 'react';
import { cn } from '@renderer/shared/utils/cn';

// ── UI ──
import { Check, X } from 'lucide-react';

// ── Constants ──
import { TOOL_ACTION_TYPES, getToolLabel } from '../../../../../constants/constants';

// ── Types ──
import { ToolAction } from '../../../../../services/ResponseParser';
import { GitStatusItem } from '../../../../../types/tool-types';

// ── Utils ──
import { parseGitStatusOutput } from '../../../../../utils/gitUtils';
import { $ } from '@renderer/utils/color';

// ── Components ──
import { TagHeader } from '../../TagHeader';
import FileIcon from '@renderer/components/common/FileIcon';

interface GitStatusBlockItem {
  status: string;
  path: string;
  staged?: boolean;
  added?: number;
  deleted?: number;
  isUnpushedCommit?: boolean;
}

interface GitStatusBlockProps {
  statusItems: GitStatusBlockItem[];
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

const GitStatusBlock: React.FC<GitStatusBlockProps> = ({
  statusItems,
  onConfirm,
  onCancel,
  isProcessing = false,
}) => {
  const handleRowClick = (path: string) => {
    const vscodeApi = (window as any).vscodeApi;
    if (vscodeApi) {
      vscodeApi.postMessage({
        command: 'showGitDiff',
        filePath: path,
      });
    }
  };

  const getStatusColor = (status: string): string => {
    if (status === 'M' || status === 'MM' || status === 'AM') return $('--warn') || '#d4a72c';
    if (status === 'A' || status === 'R' || status === 'C') return $('--teal') || '#4ec9b0';
    if (status === 'D') return $('--error') || '#f14c4c';
    if (status === '?') return $('--info') || '#569cd6';
    if (status === 'U') return $('--violet') || '#8b5cf6';
    return $('--text-primary');
  };

  const stagedItems = statusItems.filter((item) => item.staged && !item.isUnpushedCommit);
  const unstagedItems = statusItems.filter((item) => !item.staged && !item.isUnpushedCommit);
  const unpushedCommits = statusItems.filter((item) => item.isUnpushedCommit);

  const hasStaged = statusItems.some((item) => item.staged && !item.isUnpushedCommit);
  const hasUnpushed = statusItems.some((item) => item.isUnpushedCommit);
  const buttonColor = hasStaged
    ? $('--teal') || '#4ec9b0'
    : hasUnpushed
      ? $('--violet') || '#8b5cf6'
      : $('--warn') || '#d4a72c';

  const renderItem = (item: GitStatusBlockItem, index: number) => {
    const statusColor = getStatusColor(item.status);
    const fileName = item.path.split('/').pop() || item.path;
    const added = item.added || 0;
    const deleted = item.deleted || 0;
    const hasDiff = added > 0 || deleted > 0;

    return (
      <div
        key={index}
        className="flex items-center gap-2.5 px-3.5 py-1 text-xs transition-colors duration-[0.15s] border-l-2 cursor-pointer hover:bg-sidebar-item-hover"
        style={{ borderLeftColor: statusColor }}
        onClick={() => handleRowClick(item.path)}
        title={`Click để xem git diff của ${item.path}`}
      >
        <FileIcon path={item.path} style={{ width: 16, height: 16, flexShrink: 0 }} />
        <span className="text-primary text-xs font-mono break-all flex-1">{fileName}</span>
        {hasDiff && (
          <span className="inline-flex items-center gap-1 ml-auto text-[11px] font-medium font-mono shrink-0 opacity-80">
            <span className="text-success">+{added}</span>
            <span className="text-error">-{deleted}</span>
          </span>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="bg-transparent border-none overflow-hidden my-2">
        <div className="py-1.5 max-h-[280px] overflow-y-auto border rounded-md">
          {unpushedCommits.length > 0 && (
            <div className="py-1">
              <div className="text-[11px] font-semibold px-3.5 py-1.5 uppercase tracking-[0.5px] opacity-70 text-violet">
                📤 Chưa push ({unpushedCommits.length})
              </div>
              {unpushedCommits.map((item, index) => {
                const commitMsg = item.path;
                const shortMsg =
                  commitMsg.length > 60 ? commitMsg.substring(0, 60) + '...' : commitMsg;
                return (
                  <div
                    key={index}
                    className="flex items-center gap-2.5 px-3.5 py-1 text-xs transition-colors duration-[0.15s] border-l-2 border-l-violet cursor-default"
                  >
                    <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-violet"
                      >
                        <path d="M12 19V5" />
                        <path d="M5 12l7-7 7 7" />
                      </svg>
                    </span>
                    <span className="text-primary text-xs font-mono break-all flex-1 text-[11px] opacity-85">
                      {shortMsg}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {stagedItems.length === 0 &&
            unstagedItems.length === 0 &&
            unpushedCommits.length === 0 && (
              <div className="px-3.5 py-4 text-center text-secondary text-[13px]">
                <div className="text-2xl mb-2">📂</div>
                <div className="font-semibold mb-1 text-warn">⚠️ Chưa có file nào được staged</div>
                <div className="text-xs opacity-80">
                  Hãy chạy{' '}
                  <code className="bg-background px-1.5 py-0.5 rounded font-mono">
                    git add {'<file>'}
                  </code>{' '}
                  để thêm file vào staging area
                </div>
              </div>
            )}

          {unstagedItems.length > 0 && (
            <div className="py-1">
              <div className="text-[11px] font-semibold text-secondary px-3.5 py-1.5 uppercase tracking-[0.5px] opacity-70">
                Unstaged Changes
              </div>
              {unstagedItems.map((item, index) => renderItem(item, index))}
            </div>
          )}

          {stagedItems.length > 0 && (
            <div className="py-1">
              <div className="text-[11px] font-semibold text-secondary px-3.5 py-1.5 uppercase tracking-[0.5px] opacity-70">
                Staged Changes
              </div>
              {stagedItems.map((item, index) => renderItem(item, index))}
            </div>
          )}
        </div>

        <div className="flex gap-1.5 py-2 justify-end bg-transparent">
          <button
            className={cn(
              'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all duration-200 inline-flex items-center gap-1.5 h-6 border border-transparent',
              stagedItems.length === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            )}
            onClick={() => {
              onConfirm();
            }}
            disabled={isProcessing || stagedItems.length === 0}
            title={
              stagedItems.length === 0 && unpushedCommits.length > 0
                ? 'Đã có commit chưa push. Không có thay đổi mới để commit.'
                : stagedItems.length === 0
                  ? 'Chưa có file nào được staged. Hãy chạy git add trước.'
                  : 'Tạo commit message từ các file đã staged'
            }
            style={{
              background: `color-mix(in srgb, ${buttonColor} 15%, transparent)`,
              color: stagedItems.length === 0 ? $('--secondary-text') || '#8c8c8c' : buttonColor,
              borderColor: `color-mix(in srgb, ${stagedItems.length === 0 ? $('--secondary-text') || '#8c8c8c' : buttonColor} 30%, transparent)`,
            }}
            onMouseEnter={(e) => {
              if (stagedItems.length > 0) {
                e.currentTarget.style.background = `color-mix(in srgb, ${buttonColor} 25%, transparent)`;
              }
            }}
            onMouseLeave={(e) => {
              if (stagedItems.length > 0) {
                e.currentTarget.style.background = `color-mix(in srgb, ${buttonColor} 15%, transparent)`;
              }
            }}
          >
            <Check size={14} strokeWidth={2.5} />
            <span>{isProcessing ? 'Processing' : 'Create Commit Message'}</span>
          </button>
          <button
            className="px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all duration-200 inline-flex items-center gap-1.5 h-6 disabled:opacity-50 disabled:cursor-not-allowed bg-error/15 text-error border border-error/30"
            onClick={() => {
              onCancel();
            }}
            disabled={isProcessing}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                'color-mix(in srgb, rgb(255, 45, 85) 25%, transparent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background =
                'color-mix(in srgb, rgb(255, 45, 85) 15%, transparent)';
            }}
          >
            <X size={14} strokeWidth={2.5} />
            <span>Cancel</span>
          </button>
        </div>
      </div>
    </>
  );
};

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

export const GitStatusRenderer: React.FC<GitStatusRendererProps> = ({
  action,
  actionIndex,
  messageId,
  isActiveGroup = false,
  isLastItemInList = true,
  toolOutputs,
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
    if (itemsFromParams && Array.isArray(itemsFromParams) && itemsFromParams.length > 0) {
      return itemsFromParams;
    }
    const rawOutput = action.params?.raw;
    if (rawOutput && typeof rawOutput === 'string') {
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
      if (output.isError) return { label: getToolLabel('git_status'), stats: 'Error' };
      const totalAdded = effectiveItems.reduce((sum, item) => sum + (item.added || 0), 0);
      const totalDeleted = effectiveItems.reduce((sum, item) => sum + (item.deleted || 0), 0);
      return {
        label: `${getToolLabel('git_status')}${branch ? ` (${branch})` : ''}`,
        stats: `${effectiveItems.length} changes +${totalAdded} -${totalDeleted}`,
        totalAdded,
        totalDeleted,
      };
    }
    return { label: getToolLabel('git_status'), stats: '' };
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
        'bg-transparent rounded-none overflow-visible',
        isActiveGroup && 'active',
        isLastItemInList ? 'mb-0' : 'mb-2',
      )}
    >
      <TagHeader
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
