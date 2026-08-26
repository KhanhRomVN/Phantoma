import React from 'react';
import { cn } from '@renderer/shared/utils/cn';
import { getToolLabel } from '../../../../../constants/constants';
import { TagHeader } from '../../TagHeader';
import { BaseRendererProps } from '../../../../../types/renderer-types';
import ErrorBlock from '../../blocks/other/ErrorBlock';

interface ApplyFilterBlockProps {
  content: string;
  maxHeight?: string;
}

interface FilterChange {
  category: string;
  items: { value: string; action: string }[];
}

/**
 * Parse output text thành structured data.
 * Input: "[apply_filter] Applied: Methods: POST(hide), GET(show); Types: css(hide)"
 */
function parseFilterOutput(content: string): FilterChange[] {
  // Bỏ prefix
  const body = content.replace(/^\[apply_filter\]\s*Applied:\s*/, '').trim();
  if (!body) return [];

  const changes: FilterChange[] = [];
  const groups = body
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const group of groups) {
    const colonIdx = group.indexOf(':');
    if (colonIdx === -1) continue;
    const category = group.substring(0, colonIdx).trim();
    const valuesStr = group.substring(colonIdx + 1).trim();
    const items = valuesStr
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
      .map((v) => {
        const match = v.match(/^(.+)\((\w+)\)$/);
        return match
          ? { value: match[1].trim(), action: match[2].trim() }
          : { value: v, action: '' };
      });
    if (items.length > 0) {
      changes.push({ category, items });
    }
  }

  return changes;
}

function getActionStyle(action: string): string {
  switch (action) {
    case 'hide':
      return 'bg-error/15 text-error border border-error/30';
    case 'show':
      return 'bg-green-500/15 text-green-400 border border-green-500/30';
    case 'add':
      return 'bg-blue-500/15 text-blue-400 border border-blue-500/30';
    case 'remove':
      return 'bg-error/15 text-error border border-error/30';
    default:
      return 'bg-secondary/30 text-text-secondary border border-border';
  }
}

const ApplyFilterBlock: React.FC<ApplyFilterBlockProps> = ({
  content,
  maxHeight = '300px',
}) => {
  const changes = parseFilterOutput(content);

  if (changes.length === 0) {
    return (
      <div className="mt-1 bg-background border rounded-[4px] overflow-hidden">
        <pre
          className="p-3 text-[12px] font-mono text-text-primary whitespace-pre-wrap overflow-auto"
          style={{ maxHeight }}
        >
          {content}
        </pre>
      </div>
    );
  }

  return (
    <div
      className="mt-1 bg-background border rounded-[4px] overflow-hidden"
      style={{ maxHeight }}
    >
      <div className="px-3 py-2 text-[11px] text-text-secondary border-b border-border bg-card-background">
        Filter updated
      </div>
      <div className="p-3 space-y-2 overflow-auto">
        {changes.map((change, i) => (
          <div key={i} className="flex items-start gap-2 text-[12px]">
            <span className="font-medium text-text-secondary min-w-[70px] shrink-0 pt-0.5">
              {change.category}
            </span>
            <div className="flex flex-wrap gap-1">
              {change.items.map((item, j) => (
                <span
                  key={j}
                  className={cn(
                    'px-2 py-0.5 rounded text-[11px] font-medium',
                    getActionStyle(item.action),
                  )}
                >
                  {item.value}
                  {item.action && (
                    <span className="opacity-60 ml-1 text-[10px]">({item.action})</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ApplyFilterRenderer: React.FC<BaseRendererProps> = ({
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

  return (
    <div className={cn('flex flex-col gap-1.5 pb-1', isLastItemInList ? 'mb-0' : 'mb-0.5')}>
      <TagHeader
        title={
          <div className="flex items-center gap-2 text-xs text-text-primary">
            <span className="font-semibold opacity-80">{getToolLabel('apply_filter')}</span>
            {isCompleted && !isError && (
              <span className="opacity-50 text-[10px] text-text-secondary">applied</span>
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
        toolType="apply_filter"
        isPartial={!isCompleted}
        onClick={() => setIsCollapsed((v) => !v)}
        path=""
      />

      {isError && errorMessage && (
        <ErrorBlock content={errorMessage} compact={true} maxHeight="200px" />
      )}

      {output && !isError && !isCollapsed && (
        <ApplyFilterBlock content={output} maxHeight="200px" />
      )}
    </div>
  );
};
