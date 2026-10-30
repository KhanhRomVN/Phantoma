/**
 * SendMessageRenderer — Renderer cho tool send_message
 */

import React from 'react';
import { BaseRendererProps } from '@renderer/components/RightPanel/Zen/feature/Chat/types/renderer-types';
import { $ } from '@renderer/utils/color';
import { cn } from '@renderer/shared/utils/cn';
import ActionBar from '@renderer/components/RightPanel/Zen/feature/Chat/components/ChatBody/AIMessageBox/ActionBar';

interface SendMessageBlockProps {
  agentId?: string;
  message?: string;
  output?: string;
  isError?: boolean;
}

function SendMessageBlock({ agentId, message, output, isError }: SendMessageBlockProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const hasMessage = typeof message === 'string' && message.length > 0;

  return (
    <div className="text-xs space-y-2">
      {isError && output ? (
        <div
          className="p-3 rounded font-mono whitespace-pre-wrap text-xs"
          style={{ backgroundColor: $('--error') + '10', color: $('--error') }}
        >
          {output}
        </div>
      ) : hasMessage ? (
        <div className="space-y-1.5">
          <button
            type="button"
            className="flex items-center gap-1.5 text-[11px] text-text-secondary hover:text-text-primary"
            onClick={() => setIsCollapsed((v) => !v)}
          >
            <span>{isCollapsed ? 'Show message' : 'Hide message'}</span>
            <span className="font-mono text-[10px] opacity-60">→ {agentId || 'unknown'}</span>
          </button>
          {!isCollapsed && (
            <pre
              className="p-2.5 rounded border overflow-auto text-xs whitespace-pre-wrap break-words"
              style={{
                backgroundColor: $('--background-secondary'),
                borderColor: $('--border'),
                maxHeight: 320,
              }}
            >
              {message}
            </pre>
          )}
        </div>
      ) : null}
    </div>
  );
}

export const SendMessageRenderer: React.FC<BaseRendererProps> = ({
  action,
  actionIndex,
  messageId,
  isLastItemInList,
  toolOutputs,
  onToolClick,
}) => {
  const agentId: string = action.params?.agent_id || '';
  const message: string = action.params?.message || '';
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
                  <span className="font-semibold text-text-primary opacity-80">SEND MESSAGE</span>
                  {agentId && (
                    <span className="font-mono text-[10px] text-text-secondary opacity-70 truncate">
                      → {agentId}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="pl-6">
        <SendMessageBlock
          agentId={agentId}
          message={message}
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

export default SendMessageRenderer;