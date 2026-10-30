/**
 * RunCommandRenderer — Renderer cho tool run_command (Recon local operator)
 */

import React from 'react';
import { BaseRendererProps } from '@renderer/components/RightPanel/Zen/feature/Chat/types/renderer-types';
import { $ } from '@renderer/utils/color';
import { cn } from '@renderer/shared/utils/cn';
import ActionBar from '@renderer/components/RightPanel/Zen/feature/Chat/components/ChatBody/AIMessageBox/ActionBar';

interface RunCommandBlockProps {
  command?: string;
  output?: string;
  isError?: boolean;
}

function RunCommandBlock({ command, output, isError }: RunCommandBlockProps) {
  return (
    <div className="text-xs space-y-2">
      {command && (
        <pre
          className="p-2.5 rounded border overflow-auto font-mono text-[11px] whitespace-pre-wrap break-words"
          style={{
            backgroundColor: $('--background-tertiary'),
            borderColor: $('--border'),
          }}
        >
          $ {command}
        </pre>
      )}
      {output ? (
        <pre
          className="p-2.5 rounded border overflow-auto font-mono text-[11px] whitespace-pre-wrap break-words"
          style={{
            backgroundColor: isError ? $('--error') + '0a' : $('--background-secondary'),
            borderColor: isError ? $('--error') + '40' : $('--border'),
            color: isError ? $('--error') : undefined,
            maxHeight: 360,
          }}
        >
          {output}
        </pre>
      ) : null}
    </div>
  );
}

export const RunCommandRenderer: React.FC<BaseRendererProps> = ({
  action,
  actionIndex,
  messageId,
  isLastItemInList,
  toolOutputs,
  onToolClick,
}) => {
  const command: string = action.params?.command || '';
  const actionId = `${messageId}-action-${actionIndex}`;
  const outputData = toolOutputs?.[actionId];
  const hasOutput = !!outputData;
  const isError =
    outputData?.isError ||
    !!action.params?._validationError ||
    (outputData?.output || '').includes('Error -');
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
                  <span className="font-semibold text-text-primary opacity-80">RUN COMMAND</span>
                  {command && (
                    <span className="font-mono text-[10px] text-text-secondary opacity-70 truncate">
                      {command}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="pl-6">
        <RunCommandBlock command={command} output={outputData?.output} isError={isError} />
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

export default RunCommandRenderer;