import React from 'react';
import { cn } from '@renderer/shared/utils/cn';
import { getToolLabel } from '../../../../../constants/constants';
import { TagHeader } from '../../TagHeader';
import { BaseRendererProps } from '../../../../../types/renderer-types';
import ErrorBlock from '../../blocks/other/ErrorBlock';

interface ListHostsBlockProps {
  content: string;
  maxHeight?: string;
}

/**
 * Block hiển thị danh sách hosts dạng list.
 * Mỗi dòng: host (count)
 */
const ListHostsBlock: React.FC<ListHostsBlockProps> = ({
  content,
  maxHeight = '400px',
}) => {
  const lines = content.split('\n').filter(Boolean);
  const summaryLine = lines[0] || '';
  const dataLines = lines.filter((line) => line.trim().startsWith('-'));

  if (dataLines.length === 0) {
    return (
      <div className="mt-1 bg-background border rounded-[4px] overflow-hidden">
        <pre className="p-3 text-[12px] font-mono text-text-primary whitespace-pre-wrap overflow-auto" style={{ maxHeight }}>
          {content}
        </pre>
      </div>
    );
  }

  return (
    <div className="mt-1 bg-background border rounded-[4px] overflow-hidden">
      {summaryLine && !summaryLine.startsWith('-') && (
        <div className="px-3 py-2 text-[11px] text-text-secondary border-b border-border bg-card-background">
          {summaryLine.replace(/^\[list_hosts\]\s*/, '')}
        </div>
      )}
      <div className="overflow-auto" style={{ maxHeight }}>
        {dataLines.map((line, idx) => (
          <div
            key={idx}
            className="px-3 py-1 text-[12px] font-mono text-text-primary border-b border-border/50 hover:bg-dropdown-item-hover transition-colors whitespace-pre-wrap"
          >
            {line.trim().replace(/^-\s*/, '')}
          </div>
        ))}
      </div>
    </div>
  );
};

export const ListHostsRenderer: React.FC<BaseRendererProps> = ({
  actionIndex,
  messageId,
  isActionClicked,
  isActiveGroup,
  isLastItemInList,
  toolOutputs,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const actionId = `${messageId}-action-${actionIndex}`;
  const output = toolOutputs?.[actionId]?.output;
  const isError = !!toolOutputs?.[actionId]?.isError;
  const errorMessage = isError ? output || '' : '';

  const isCompleted = Boolean(isActionClicked || isError || (output && output.trim().length > 0));

  let hostCount = 0;
  if (output && !isError) {
    const match = output.match(/Total unique hosts:\s*(\d+)/);
    if (match) {
      hostCount = parseInt(match[1], 10);
    }
  }

  return (
    <div className={cn('flex flex-col gap-1.5 pb-1', isLastItemInList ? 'mb-0' : 'mb-0.5')}>
      <TagHeader
        title={
          <div className="flex items-center gap-2 text-xs text-text-primary">
            <span className="font-semibold opacity-80">{getToolLabel('list_hosts')}</span>
            {isCompleted && !isError && hostCount > 0 && (
              <span className="opacity-50 text-[10px] text-text-secondary">{hostCount} hosts</span>
            )}
            {!isCompleted && (
              <span className="text-[10px] opacity-60 italic ml-1 flex items-center gap-1">
                <span className="codicon codicon-loading codicon-modifier-spin text-[10px]" />
              </span>
            )}
          </div>
        }
        statusColor={
          isError ? 'rgb(255, 45, 85)' : isCompleted ? 'rgb(48, 209, 88)' : 'rgb(106, 122, 154)'
        }
        isError={isError}
        isWaitingApproval={!!isActiveGroup && !isCompleted}
        toolType="list_hosts"
        isPartial={!isCompleted}
        onClick={() => setIsCollapsed((v) => !v)}
        path=""
      />

      {isError && errorMessage && (
        <ErrorBlock content={errorMessage} compact={true} maxHeight="300px" />
      )}

      {output && !isError && !isCollapsed && <ListHostsBlock content={output} maxHeight="400px" />}
    </div>
  );
};
