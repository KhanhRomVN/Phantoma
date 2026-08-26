import React from 'react';
import { cn } from '@renderer/shared/utils/cn';
import { getToolLabel } from '../../../../../constants/constants';
import { TagHeader } from '../../TagHeader';
import { BaseRendererProps } from '../../../../../types/renderer-types';
import ErrorBlock from '../../blocks/other/ErrorBlock';

interface ListRepeatersBlockProps {
  content: string;
  maxHeight?: string;
}

interface RepeaterRow {
  id: string;
  method: string;
  host: string;
  path: string;
}

/**
 * Parse repeater data from output string
 * Format: "- repeater_0 | GET | chat.deepseek.com | /api/v0/users/current"
 */
const parseRepeaterData = (content: string): RepeaterRow[] => {
  const lines = content.split('\n').filter(Boolean);
  const dataLines = lines.filter((line) => line.trim().startsWith('-'));
  
  return dataLines.map((line) => {
    const cleaned = line.trim().replace(/^-\s*/, '');
    const parts = cleaned.split('|').map((p) => p.trim());
    
    return {
      id: parts[0] || '',
      method: parts[1] || '',
      host: parts[2] || '',
      path: parts[3] || '',
    };
  });
};

/**
 * Block displaying repeater requests as a professional table.
 * Columns: ID | Method | Host | Path
 */
const ListRepeatersBlock: React.FC<ListRepeatersBlockProps> = ({
  content,
  maxHeight = '400px',
}) => {
  const rows = parseRepeaterData(content);

  if (rows.length === 0) {
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

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'text-emerald-400',
      POST: 'text-amber-400',
      PUT: 'text-blue-400',
      PATCH: 'text-purple-400',
      DELETE: 'text-red-400',
      OPTIONS: 'text-text-secondary',
      HEAD: 'text-text-secondary',
    };
    return colors[method?.toUpperCase()] || 'text-text-secondary';
  };

  return (
    <div className="mt-1 bg-background border rounded-[4px] overflow-hidden">
      
      {/* Table */}
      <div className="overflow-auto" style={{ maxHeight }}>
        <table className="w-full text-[12px]">
          <thead className="sticky top-0 bg-card-background border-b border-border">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-text-secondary text-[11px] w-[120px]">
                ID
              </th>
              <th className="px-3 py-2 text-left font-semibold text-text-secondary text-[11px] w-[80px]">
                Method
              </th>
              <th className="px-3 py-2 text-left font-semibold text-text-secondary text-[11px] w-[200px]">
                Host
              </th>
              <th className="px-3 py-2 text-left font-semibold text-text-secondary text-[11px]">
                Path
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={idx}
                className="border-b border-border/50 hover:bg-dropdown-item-hover transition-colors"
              >
                <td className="px-3 py-2 font-mono text-text-secondary">
                  {row.id}
                </td>
                <td className="px-3 py-2">
                  <span className={cn('font-mono font-bold', getMethodColor(row.method))}>
                    {row.method}
                  </span>
                </td>
                <td className="px-3 py-2 text-text-primary">
                  {row.host}
                </td>
                <td className="px-3 py-2 text-text-primary font-mono">
                  {row.path}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const ListRepeatersRenderer: React.FC<BaseRendererProps> = ({
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

  let repeaterCount = 0;
  if (output && !isError) {
    const match = output.match(/Total:\s*(\d+)/);
    if (match) {
      repeaterCount = parseInt(match[1], 10);
    }
  }

  return (
    <div className={cn('flex flex-col gap-1.5 pb-1', isLastItemInList ? 'mb-0' : 'mb-0.5')}>
      <TagHeader
        title={
          <div className="flex items-center gap-2 text-xs text-text-primary">
            <span className="font-semibold opacity-80">{getToolLabel('list_repeaters')}</span>
            {isCompleted && !isError && repeaterCount > 0 && (
              <span className="opacity-50 text-[10px] text-text-secondary">
                {repeaterCount} requests
              </span>
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
        toolType="list_repeaters"
        isPartial={!isCompleted}
        onClick={() => setIsCollapsed((v) => !v)}
        path=""
      />

      {isError && errorMessage && (
        <ErrorBlock content={errorMessage} compact={true} maxHeight="300px" />
      )}

      {output && !isError && !isCollapsed && (
        <ListRepeatersBlock content={output} maxHeight="400px" />
      )}
    </div>
  );
};