/**
 * PressKeyRenderer — Renderer cho tool press_key
 */

import React from 'react';
import { BaseRendererProps } from '../../../../../types/renderer-types';
import { $ } from '@renderer/utils/color';
import { cn } from '@renderer/shared/utils/cn';
import ActionBar from '../../ActionBar';

interface PressKeyBlockProps {
  key?: string;
  output?: string;
  isError?: boolean;
}

export const PressKeyRenderer: React.FC<BaseRendererProps> = ({
  action,
  actionIndex,
  messageId,
  isLastItemInList,
  toolOutputs,
  onToolClick,
}) => {
  const actionId = `${messageId}-action-${actionIndex}`;
  const outputData = toolOutputs?.[actionId];
  const hasOutput = !!outputData;
  const isError = outputData?.isError || false;
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
                  <span className="font-semibold text-text-primary opacity-80">PRESS KEY</span>
                  {action.params.key && (
                    <span className="text-text-secondary font-mono text-[11px]">
                      {action.params.key}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="pl-6">
        <PressKeyBlock
          key={action.params.key}
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

interface ParsedPressKeyResult {
  key: string;
  success?: boolean;
}

function parsePressKeyOutput(output: string): ParsedPressKeyResult | null {
  try {
    // Parse markdown format:
    // [press_key] Key pressed
    // key: Enter
    
    const keyMatch = output.match(/key:\s*(.+)/i);
    
    if (keyMatch) {
      return {
        key: keyMatch[1].trim(),
        success: output.includes('Key pressed'),
      };
    }
    return null;
  } catch {
    return null;
  }
}

function PressKeyBlock({
  key,
  output,
  isError,
}: PressKeyBlockProps) {
  const parsed = output ? parsePressKeyOutput(output) : null;
  
  return (
    <div className="text-xs space-y-2">
      {output && !isError && parsed ? (
        <div
          className="p-2 rounded border"
          style={{
            backgroundColor: $('--success') + '08',
            borderColor: $('--success') + '40',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-text-secondary">Key:</span>
            <kbd
              className="px-2 py-1 rounded font-mono font-medium text-[11px] border"
              style={{
                backgroundColor: $('--background-secondary'),
                borderColor: $('--border'),
                color: $('--text-primary'),
              }}
            >
              {parsed.key}
            </kbd>
          </div>
        </div>
      ) : output && isError ? (
        <div
          className="p-3 rounded font-mono whitespace-pre-wrap text-xs"
          style={{
            backgroundColor: $('--error') + '10',
            color: $('--error'),
          }}
        >
          {output}
        </div>
      ) : !output && !isError ? (
        <div className="text-text-secondary opacity-60">Pressing key...</div>
      ) : null}
    </div>
  );
}