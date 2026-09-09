/**
 * ListFramesRenderer — Renderer cho tool list_frames
 */

import React from 'react';
import { BaseRendererProps } from '../../../../../types/renderer-types';
import { $ } from '@renderer/utils/color';
import { cn } from '@renderer/shared/utils/cn';
import ActionBar from '../../ActionBar';

interface ListFramesBlockProps {
  output?: string;
  isError?: boolean;
}

export const ListFramesRenderer: React.FC<BaseRendererProps> = ({
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
                  <span className="font-semibold text-text-primary opacity-80">LIST FRAMES</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="pl-6">
        <ListFramesBlock
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

interface ParsedFrame {
  id: string;
  name: string;
  url: string;
}

function parseListFramesOutput(output: string): ParsedFrame[] | null {
  try {
    // Parse markdown table format similar to list_tabs
    const lines = output.trim().split('\n');
    const frames: ParsedFrame[] = [];
    
    for (const line of lines) {
      if (line.trim().startsWith('|') && !line.includes('---')) {
        const parts = line.split('|').map(p => p.trim()).filter(p => p);
        
        // Skip header row
        if (parts.length >= 3 && parts[0] !== 'id' && parts[1] !== 'name') {
          frames.push({
            id: parts[0],
            name: parts[1] || '(unnamed)',
            url: parts[2],
          });
        }
      }
    }
    
    return frames.length > 0 ? frames : null;
  } catch {
    return null;
  }
}

function ListFramesBlock({
  output,
  isError,
}: ListFramesBlockProps) {
  const parsed = output ? parseListFramesOutput(output) : null;
  
  return (
    <div className="text-xs space-y-2">
      {output && !isError && parsed ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <span className="text-text-secondary">
              {parsed.length} frame{parsed.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          <div className="space-y-1.5">
            {parsed.map((frame, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded border"
                style={{
                  backgroundColor: $('--background-secondary'),
                  borderColor: $('--border'),
                }}
              >
                <div className="flex items-start gap-2 mb-1.5">
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0"
                    style={{
                      backgroundColor: $('--background-tertiary'),
                      color: $('--text-secondary'),
                    }}
                  >
                    {frame.id}
                  </span>
                  <span className="text-text-primary font-medium flex-1 min-w-0 truncate">
                    {frame.name}
                  </span>
                </div>
                <div className="text-text-secondary font-mono text-[11px] truncate pl-0.5">
                  {frame.url}
                </div>
              </div>
            ))}
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
        <div className="text-text-secondary opacity-60">Listing frames...</div>
      ) : null}
    </div>
  );
}