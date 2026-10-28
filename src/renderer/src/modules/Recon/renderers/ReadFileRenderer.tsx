/**
 * ReadFileRenderer — Renderer cho tool read_file (Recon workspace)
 */

import React from 'react';
import { BaseRendererProps } from '@renderer/components/RightPanel/Zen/feature/Chat/types/renderer-types';
import { $ } from '@renderer/utils/color';
import { cn } from '@renderer/shared/utils/cn';
import ActionBar from '@renderer/components/RightPanel/Zen/feature/Chat/components/ChatBody/AIMessageBox/ActionBar';

interface ReadFileBlockProps {
  filePath?: string;
  startLine?: number;
  endLine?: number;
  output?: string;
  isError?: boolean;
}

function ReadFileBlock({ filePath, startLine, endLine, output, isError }: ReadFileBlockProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const rangeLabel =
    startLine || endLine
      ? ` lines ${startLine ?? '?'}–${endLine ?? '?'}`
      : '';

  return (
    <div className="text-xs space-y-2">
      {isError && output ? (
        <div
          className="p-3 rounded font-mono whitespace-pre-wrap text-xs"
          style={{ backgroundColor: $('--error') + '10', color: $('--error') }}
        >
          {output}
        </div>
      ) : output ? (
        <div className="space-y-1.5">
          <button
            type="button"
            className="flex items-center gap-1.5 text-[11px] text-text-secondary hover:text-text-primary"
            onClick={() => setIsCollapsed((v) => !v)}
          >
            <span>{isCollapsed ? 'Show content' : 'Hide content'}</span>
            {filePath && (
              <span className="font-mono text-[10px] opacity-60">
                {filePath}
                {rangeLabel}
              </span>
            )}
          </button>
          {!isCollapsed && (
            <pre
              className="p-2.5 rounded border overflow-auto font-mono text-[11px] whitespace-pre-wrap break-words"
              style={{
                backgroundColor: $('--background-secondary'),
                borderColor: $('--border'),
                maxHeight: 360,
              }}
            >
              {output}
            </pre>
          )}
        </div>
      ) : null}
    </div>
  );
}

export const ReadFileRenderer: React.FC<BaseRendererProps> = ({
  action,
  actionIndex,
  messageId,
  isLastItemInList,
  toolOutputs,
  onToolClick,
}) => {
  const filePath: string = action.params?.file_path || '';
  const startLine: number | undefined = action.params?.start_line;
  const endLine: number | undefined = action.params?.end_line;
  const actionId = `${messageId}-action-${actionIndex}`;
  const outputData = toolOutputs?.[actionId];
  const hasOutput = !!outputData;
  const isError = outputData?.isError || !!action.params?._validationError;
  const statusColor = isError ? $('--error') : hasOutput ? $('--success') : $('--text-secondary');

  return (
    <div className={cn('relative flex flex-col gap-1.5', isLastItemInList ? 'mb-0' : 'mb-2')}>
      <div className="pt-1 flex items-start justify-between w-full">
        <div className="flex-1 min-w-0">
          <div className="mt-px flex flex-col gap-0.5 flex-1 min-w-0 w-full">
            <div className="flex items-start gap-2 flex-nowrap">
              <div
                className="relative w-4 h-4 shrink-0 flex items-center justify-center mt-0.5"
                title={isError ? 'Error' : hasOutput ? 'Success' : 'Pending'}
              >
                <div
                  className="absolute w-4 h-4 rounded-full opacity-40"
                  style={{ border: `2px solid ${statusColor}` }}
                />
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-0.5 mt-0.5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-text-primary opacity-80">READ FILE</span>
                  {filePath && (
                    <span className="font-mono text-[10px] text-text-secondary opacity-70 truncate">
                      {filePath}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="pl-6">
        <ReadFileBlock
          filePath={filePath}
          startLine={startLine}
          endLine={endLine}
          output={outputData?.output}
          isError={isError}
        />
      </div>
      {!hasOutput && (
        <ActionBar
          action={action}
          messageId={messageId}
          actionIndex={actionIndex}
          hasError={isError}
          onAction={(_e, type) => {
            onToolClick(action, messageId, actionIndex, type);
          }}
        />
      )}
    </div>
  );
};

export default ReadFileRenderer;