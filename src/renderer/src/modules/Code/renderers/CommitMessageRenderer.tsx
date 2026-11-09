import React from 'react';
import { cn } from '@renderer/utils/cn';
import { $ } from '@renderer/utils/color';

// ── Constants ──
import { TOOL_ACTION_TYPES } from '@renderer/components/Widgets/Zen/shared/tool-constants';
import { getToolLabel } from '@renderer/components/Widgets/Zen/feature/Chat/constants/tag-registry';

// ── Hooks ──
import { useCodeStore } from '../hooks/useCodeStore';
import { GitCommitHandler } from '../handler/tool/GitHandlers';

// ── Types ──
import { ToolAction } from '@renderer/components/Widgets/Zen/feature/Chat/services/responseParser';

// ── Components ──
import { TagHeader } from '@renderer/components/Widgets/Zen/feature/Chat/components/ChatBody/AIMessageBox/TagHeader';

interface CommitMessageRendererProps {
  action: ToolAction;
  actionIndex: number;
  messageId: string;
  isActionClicked?: boolean;
  isRejected?: boolean;
  isLastItemInList?: boolean;
  onToolClick: (
    action: ToolAction,
    messageId: string,
    actionIndex: number,
    type: (typeof TOOL_ACTION_TYPES)[keyof typeof TOOL_ACTION_TYPES],
  ) => void;
  branch?: string;
}

/**
 * Renderer cho loại tool commit_message
 * Hiển thị commit message với nút Accept/Cancel
 */
export const CommitMessageRenderer: React.FC<CommitMessageRendererProps> = ({
  action,
  actionIndex,
  messageId,
  isRejected = false,
  isLastItemInList = true,
  onToolClick,
  branch,
}) => {
  const messageContent = action.params?.message || action.params?.content || '';

  const [isCommitted, setIsCommitted] = React.useState(false);
  const [isCommitting, setIsCommitting] = React.useState(false);
  const [commitError, setCommitError] = React.useState<string | null>(null);

  const projectPath = useCodeStore((s: any) => {
    const p = s.projects?.find((x: any) => x.id === s.currentProjectId);
    return (p?.explorerRoot ?? p?.path ?? '') as string;
  });

  const handleAccept = async () => {
    if (isCommitting) return;
    setIsCommitting(true);
    setCommitError(null);
    const result: any = await new GitCommitHandler().handle({
      message: messageContent,
      projectPath,
    });
    setIsCommitting(false);
    if (result?.error) {
      setCommitError(String(result.error));
      return;
    }
    setIsCommitted(true);
  };

  // ASSUMED: tên project lấy từ project đang active trong useCodeStore (field `name`)
  const projectName = useCodeStore(
    (s: any) =>
      s.projects?.find((p: any) => p.id === s.currentProjectId)?.name as string | undefined,
  );

  const [fetchedBranch, setFetchedBranch] = React.useState('');
  const currentBranch = branch || fetchedBranch;

  React.useEffect(() => {
    if (branch || !projectPath) return;
    let cancelled = false;
    window.api
      .invoke('git:status', projectPath)
      .then((res: any) => {
        if (!cancelled && res && !res.error && res.branch) setFetchedBranch(res.branch);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [branch, projectPath]);

  const statusColor = isRejected
    ? 'rgb(255, 45, 85)'
    : isCommitted
      ? 'rgb(48, 209, 88)'
      : 'rgb(0, 210, 255)';

  return (
    <div className="relative flex flex-col gap-1.5">
      <div className={cn(isLastItemInList ? 'mb-0' : 'mb-2')}>
        <TagHeader
          title={
            <div className="flex items-center gap-2 text-xs text-text-primary">
              <span className="font-semibold opacity-80">{getToolLabel('commit_message')}</span>
              {isRejected && (
                <span className="text-[10px] font-semibold text-error bg-error/15 py-0.5 px-2 rounded ml-1">
                  REJECTED
                </span>
              )}
            </div>
          }
          statusColor={statusColor}
          isPartial={false}
        />
        {(projectName || currentBranch) && (
          <div
            className="flex items-center gap-1.5 ml-6 pl-5 pr-1 pt-0.5 relative text-[11px]"
            style={{ color: $('--text-secondary') }}
          >
            <div className="absolute left-0 top-0 w-4 h-2.5 border-l border-b border-text-secondary/20" />
            {projectName && <span className="opacity-60 font-mono">{projectName}</span>}
            {currentBranch && (
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-semibold font-mono"
                style={{
                  color: $('--purple'),
                  backgroundColor: `color-mix(in srgb, ${$('--purple')} 13%, transparent)`,
                }}
              >
                {currentBranch}
              </span>
            )}
          </div>
        )}
        <div className="pt-1 pr-3 pb-3">
          <div
            className={cn(
              'py-3 px-3.5 bg-card-background rounded-md border font-mono text-[13px] whitespace-pre-wrap break-words text-text-primary max-h-auto overflow-y-visible',
              isCommitted
                ? 'border-dashed border-success'
                : isRejected || commitError
                  ? 'border-dashed border-error'
                  : 'border-border',
            )}
          >
            {messageContent}
            {commitError && (
              <div className="mt-3 py-2.5 px-3.5 bg-error/10 border border-error/30 rounded-md text-xs text-error whitespace-pre-wrap">
                {commitError}
              </div>
            )}

          </div>
          {!isCommitted && !isRejected && (
            <div className="flex gap-1.5 py-2 justify-end">
              <button
                onClick={() => void handleAccept()}
                disabled={isCommitting}
                className="inline-flex items-center px-3 py-1 rounded-md text-[11px] font-semibold h-6 cursor-pointer border-0 outline-none transition-colors"
                style={{
                  color: $('--primary'),
                  background: `color-mix(in srgb, ${$('--primary')} 10%, transparent)`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = $('--primary');
                  e.currentTarget.style.color = $('--text-primary');
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = `color-mix(in srgb, ${$('--primary')} 10%, transparent)`;
                  e.currentTarget.style.color = $('--primary');
                }}
              >
                Accept
              </button>
              <button
                onClick={() => {
                  onToolClick(action, messageId, actionIndex, 'reject');
                  const vscodeApi = (window as any).vscodeApi;
                  if (vscodeApi) {
                    vscodeApi.postMessage({
                      command: 'rejectCommitMessage',
                    });
                  }
                }}
                disabled={isRejected}
                className={cn(
                  'inline-flex items-center px-3 py-1 rounded-md text-[11px] font-semibold h-6 border-0 outline-none transition-colors bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/20 hover:text-text-primary active:bg-text-secondary/30',
                  isRejected ? 'opacity-50 cursor-default' : 'cursor-pointer',
                )}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};