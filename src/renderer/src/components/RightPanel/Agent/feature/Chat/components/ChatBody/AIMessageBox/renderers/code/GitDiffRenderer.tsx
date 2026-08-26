import React, { useState, useEffect } from 'react';
/**
 * ------------------------------------------------------------------
 * GitDiffRenderer
 * ------------------------------------------------------------------
 * Renderer cho tool action `git_diff`.
 * Hiển thị diff stats (added/deleted) và nội dung diff.
 *
 * Main features:
 * - Auto-trigger execution khi chưa có output
 * - Parse diff stats từ diffContent
 * - Render partial state khi chưa active
 * - Hiển thị added/deleted lines với syntax highlighting
 * - File path clickable với FileIcon
 * - Partial state cho streaming
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';
import { $ } from '@renderer/utils/color';

// ── Constants ──
import { TOOL_ACTION_TYPES } from '../../../../../constants/constants';

// ── Types ──
import { ToolAction } from '../../../../../services/ResponseParser';

// ── Components ──
import FileIcon from '@renderer/components/common/FileIcon';
import { TagHeader } from '../../TagHeader';

// ─── GitDiffBlock ───────────────────────────────────────────────────────
interface GitDiffBlockProps {
  filePath: string;
  diffContent: string;
  added?: number;
  deleted?: number;
  isPartial?: boolean;
  statusColor?: string;
  onFileClick?: (filePath: string) => void;
  branch?: string;
}

const GitDiffBlock: React.FC<GitDiffBlockProps> = ({
  filePath,
  diffContent,
  added = 0,
  deleted = 0,
  isPartial = false,
  statusColor = $('--success') || '#3fb950',
  onFileClick,
  branch,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const parseDiffContent = (content: string): { lines: string[]; types: string[] } => {
    const rawLines = content.split('\n');
    const lines: string[] = [];
    const types: string[] = [];
    let inHunk = false;

    for (const line of rawLines) {
      if (line.startsWith('diff')) continue;
      if (line.startsWith('index ')) continue;
      if (line.startsWith('--- ') || line.startsWith('+++ ')) continue;
      if (line.startsWith('@@')) {
        inHunk = true;
        continue;
      }
      if (line.startsWith('new file mode')) continue;
      if (line.startsWith('deleted file mode')) continue;
      if (line.includes('No newline at end of file')) continue;

      if (inHunk) {
        let content = line;
        let type = 'context';

        if (line.startsWith('+') && !line.startsWith('+++')) {
          content = line.substring(1);
          type = 'added';
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          content = line.substring(1);
          type = 'removed';
        } else if (line.startsWith(' ')) {
          content = line.substring(1);
          type = 'context';
        } else if (line === '') {
          content = '';
          type = 'empty';
        } else {
          content = line;
          type = 'context';
        }

        if (content !== '' || line === '') {
          lines.push(content);
          types.push(type);
        }
      } else {
        if (line.trim() !== '') {
          lines.push(line);
          types.push('context');
        }
      }
    }

    return { lines, types };
  };

  const renderDiffLines = (content: string) => {
    const { lines, types } = parseDiffContent(content);
    return lines.map((line, index) => {
      const type = types[index] || 'context';

      if (type === 'empty') {
        return <div key={index} className="px-2 h-5 text-xs leading-[1.5]" />;
      }

      const color =
        type === 'added'
          ? $('--success') || '#3fb950'
          : type === 'removed'
            ? $('--error') || '#f14c4c'
            : $('--text-primary');
      const backgroundColor =
        type === 'added'
          ? `color-mix(in srgb, ${$('--success')} 12%, transparent)`
          : type === 'removed'
            ? `color-mix(in srgb, ${$('--error')} 12%, transparent)`
            : 'transparent';

      return (
        <div
          key={index}
          className="px-2 text-xs leading-[1.5] whitespace-pre-wrap break-words min-h-5"
          style={{ color, backgroundColor }}
        >
          {line}
        </div>
      );
    });
  };

  const fileName = filePath.split('/').pop() || filePath;

  const headerTitle = (
    <div className="contents">
      <div className="flex items-center gap-2 text-xs text-primary">
        <span className="font-semibold opacity-80">DIFF{branch ? `(${branch})` : ''}</span>
        <FileIcon path={filePath} style={{ width: '14px', height: '14px', flexShrink: 0 }} />
        <span
          className={cn(
            'font-medium opacity-90 font-mono text-[11px]',
            onFileClick ? 'cursor-pointer' : 'cursor-default',
          )}
          onClick={(e) => {
            e.stopPropagation();
            if (onFileClick) onFileClick(filePath);
          }}
          title={onFileClick ? 'Click để mở file' : ''}
        >
          {fileName}
        </span>
        {(added > 0 || deleted > 0) && (
          <>
            <span className="text-success font-semibold text-[11px]">+{added}</span>
            <span className="text-error font-semibold text-[11px]">-{deleted}</span>
          </>
        )}
        {isPartial && (
          <span className="codicon codicon-loading codicon-modifier-spin text-xs opacity-60" />
        )}
        <span className="codicon codicon-git-pull-request text-sm ml-0.5" />
      </div>
    </div>
  );

  const handleHeaderClick = () => {
    if (diffContent) {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <div className="mb-2 bg-transparent rounded-none overflow-visible">
      <TagHeader
        title={headerTitle}
        statusColor={statusColor}
        isPartial={isPartial}
        onClick={handleHeaderClick}
        path={filePath}
        onPathClick={() => {
          if (onFileClick) onFileClick(filePath);
        }}
      />

      {filePath && (
        <div className="flex justify-end items-center pr-1 pt-1 mt-0.5 relative w-full max-w-full overflow-hidden pl-9">
          <div
            className="absolute left-5 top-0 w-4 h-3"
            style={{
              borderLeft: `1px solid color-mix(in srgb, ${$('--text-secondary')} 20%, transparent)`,
              borderBottom: `1px solid color-mix(in srgb, ${$('--text-secondary')} 20%, transparent)`,
            }}
          />
          <span
            className={cn(
              'text-[10px] opacity-60 text-secondary font-mono whitespace-nowrap overflow-hidden text-ellipsis w-full px-1 pl-5 rounded-[2px] transition-[text-decoration] duration-[0.15s] no-underline',
              onFileClick ? 'cursor-pointer' : 'cursor-default',
            )}
            title={filePath}
            onClick={(e) => {
              e.stopPropagation();
              if (onFileClick) {
                onFileClick(filePath);
              }
            }}
            onMouseEnter={(e) => {
              if (onFileClick) {
                e.currentTarget.style.textDecoration = 'underline';
                e.currentTarget.style.textDecorationColor =
                  $('--primary') || 'rgba(0, 122, 204, 0.6)';
                e.currentTarget.style.textUnderlineOffset = '2px';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecoration = 'none';
            }}
          >
            {filePath}
          </span>
        </div>
      )}

      {!isCollapsed && diffContent && (
        <div className="pt-1 pr-3 pb-3 pl-0">
          <div className="bg-background rounded-[4px] border overflow-auto max-h-[400px] font-mono text-xs leading-[1.5] py-1 break-words">
            {renderDiffLines(diffContent)}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── GitDiffRenderer ────────────────────────────────────────────────────
interface GitDiffRendererProps {
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
  branch?: string;
}

export const GitDiffRenderer: React.FC<GitDiffRendererProps> = ({
  action,
  actionIndex,
  messageId,
  isActiveGroup = false,
  isLastMessage = false,
  toolOutputs,
  onToolClick,
  branch,
}) => {
  const actionId = `${messageId}-action-${actionIndex}`;
  const filePath = action.params.file_path || '';
  const outputData = toolOutputs?.[actionId];
  const diffContent = outputData?.output || action.params.diff || '';
  const hasOutput = !!outputData && !outputData.isError;

  const hasTriggeredExecution = React.useRef(false);
  useEffect(() => {
    if (!hasTriggeredExecution.current && !hasOutput && isActiveGroup && !isLastMessage) {
      hasTriggeredExecution.current = true;
      onToolClick(action, messageId, actionIndex, 'accept');
    }
  }, [hasOutput, isActiveGroup, isLastMessage, actionId]);

  const parseDiffStats = (content: string) => {
    let added = 0;
    let deleted = 0;
    if (!content) return { added: 0, deleted: 0 };
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) added++;
      if (line.startsWith('-') && !line.startsWith('---')) deleted++;
    }
    return { added, deleted };
  };

  const stats = parseDiffStats(diffContent);

  const handleFileClick = (path: string) => {
    const vscodeApi = (window as any).vscodeApi;
    if (vscodeApi) {
      vscodeApi.postMessage({
        command: 'openFile',
        path,
      });
    }
  };

  if (!hasOutput && !isActiveGroup) {
    return (
      <div className="relative flex flex-col gap-1.5">
        <GitDiffBlock
          filePath={filePath}
          diffContent=""
          added={0}
          deleted={0}
          statusColor={$('--success')}
          isPartial={true}
          branch={branch}
          onFileClick={handleFileClick}
        />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-1.5">
      <GitDiffBlock
        filePath={filePath}
        diffContent={diffContent}
        added={stats.added}
        deleted={stats.deleted}
        statusColor={$('--success')}
        isPartial={!hasOutput && isActiveGroup}
        branch={branch}
        onFileClick={handleFileClick}
      />
    </div>
  );
};

export default GitDiffRenderer;