/**
 * CreateAgentRenderer — Renderer cho tool create_agent
 */

import React from 'react';
import { BaseRendererProps } from '@renderer/components/RightPanel/Zen/feature/Chat/types/renderer-types';
import { $ } from '@renderer/utils/color';
import { cn } from '@renderer/shared/utils/cn';
import ActionBar from '@renderer/components/RightPanel/Zen/feature/Chat/components/ChatBody/AIMessageBox/ActionBar';

interface CreateAgentBlockProps {
  output?: string;
  isError?: boolean;
}

function CreateAgentBlock({ output, isError }: CreateAgentBlockProps) {
  return (
    <div className="text-xs space-y-2">
      {output && !isError ? (
        <div
          className="p-2.5 rounded border font-mono text-[11px] whitespace-pre-wrap break-words"
          style={{ backgroundColor: $('--background-secondary'), borderColor: $('--border') }}
        >
          {output}
        </div>
      ) : output && isError ? (
        <div
          className="p-3 rounded font-mono whitespace-pre-wrap text-xs"
          style={{ backgroundColor: $('--error') + '10', color: $('--error') }}
        >
          {output}
        </div>
      ) : null}
    </div>
  );
}

export const CreateAgentRenderer: React.FC<BaseRendererProps> = ({
  action,
  actionIndex,
  messageId,
  isLastItemInList,
  toolOutputs,
  onToolClick,
}) => {
  const agentId: string = action.params?.agent_id || '';
  const agentType: string = action.params?.agent_type || '';
  const agentName: string = action.params?.agent_name || '';
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
                  <span className="font-semibold text-text-primary opacity-80">CREATE AGENT</span>
                  {agentType && (
                    <span className="font-mono text-[10px] text-text-secondary opacity-70 shrink-0">
                      {agentType}
                    </span>
                  )}
                  {agentName && (
                    <span className="font-medium text-text-primary truncate">{agentName}</span>
                  )}
                  {agentId && (
                    <span className="font-mono text-[10px] text-text-secondary opacity-50 shrink-0">
                      ({agentId})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="pl-6">
        <CreateAgentBlock output={outputData?.output} isError={isError} />
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

export default CreateAgentRenderer;