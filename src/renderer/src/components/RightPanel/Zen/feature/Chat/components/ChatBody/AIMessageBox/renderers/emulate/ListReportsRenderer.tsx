import React from 'react';
import { cn } from '@renderer/shared/utils/cn';
import { getToolLabel } from '../../../../../constants/constants';
import { TagHeader } from '../../TagHeader';
import { BaseRendererProps } from '../../../../../types/renderer-types';
import ErrorBlock from '../../blocks/other/ErrorBlock';

interface ListReportsBlockProps {
  content: string;
  maxHeight?: string;
}

interface ReportRow {
  id: string;
  title: string;
  updatedAt: string;
}

/**
 * Parse report data from output string
 * Format: "- report_1 | Security Review | 09/09 14:30"
 */
const parseReportData = (content: string): ReportRow[] => {
  const lines = content.split('\n').filter(Boolean);
  const dataLines = lines.filter((line) => line.trim().startsWith('-'));

  return dataLines.map((line) => {
    const cleaned = line.trim().replace(/^-\s*/, '');
    const parts = cleaned.split('|').map((p) => p.trim());

    return {
      id: parts[0] || '',
      title: parts[1] || '',
      updatedAt: parts[2] || '',
    };
  });
};

/**
 * Block displaying report list as a professional table.
 * Columns: ID | Title | Updated At
 */
const ListReportsBlock: React.FC<ListReportsBlockProps> = ({
  content,
  maxHeight = '400px',
}) => {
  const rows = parseReportData(content);

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

  return (
    <div className="mt-1 bg-background border rounded-[4px] overflow-hidden">
      <div className="overflow-auto" style={{ maxHeight }}>
        <table className="w-full text-[12px]">
          <thead className="sticky top-0 bg-card-background border-b border-border">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-text-secondary text-[11px] w-[120px]">
                ID
              </th>
              <th className="px-3 py-2 text-left font-semibold text-text-secondary text-[11px]">
                Title
              </th>
              <th className="px-3 py-2 text-left font-semibold text-text-secondary text-[11px] w-[140px]">
                Updated At
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
                <td className="px-3 py-2 text-text-primary">
                  {row.title}
                </td>
                <td className="px-3 py-2 text-text-primary font-mono">
                  {row.updatedAt}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const ListReportsRenderer: React.FC<BaseRendererProps> = ({
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

  let reportCount = 0;
  if (output && !isError) {
    const match = output.match(/Total:\s*(\d+)/);
    if (match) {
      reportCount = parseInt(match[1], 10);
    }
  }

  return (
    <div className={cn('flex flex-col gap-1.5 pb-1', isLastItemInList ? 'mb-0' : 'mb-0.5')}>
      <TagHeader
        title={
          <div className="flex items-center gap-2 text-xs text-text-primary">
            <span className="font-semibold opacity-80">{getToolLabel('list_reports')}</span>
            {isCompleted && !isError && reportCount > 0 && (
              <span className="opacity-50 text-[10px] text-text-secondary">
                {reportCount} reports
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
        toolType="list_reports"
        isPartial={!isCompleted}
        onClick={() => setIsCollapsed((v) => !v)}
        path=""
      />

      {isError && errorMessage && (
        <ErrorBlock content={errorMessage} compact={true} maxHeight="300px" />
      )}

      {output && !isError && !isCollapsed && (
        <ListReportsBlock content={output} maxHeight="400px" />
      )}
    </div>
  );
};