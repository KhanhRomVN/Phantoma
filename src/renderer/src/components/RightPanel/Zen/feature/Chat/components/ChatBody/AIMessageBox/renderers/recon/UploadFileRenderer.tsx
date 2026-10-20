/**
 * UploadFileRenderer — Renderer cho tool upload_file
 */

import React from 'react';
import { BaseRendererProps } from '../../../../../types/renderer-types';
import { $ } from '@renderer/utils/color';
import { cn } from '@renderer/shared/utils/cn';
import ActionBar from '../../ActionBar';

interface UploadFileBlockProps {
  ref?: string;
  filePath?: string;
  output?: string;
  isError?: boolean;
}

export const UploadFileRenderer: React.FC<BaseRendererProps> = ({
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
                  <span className="font-semibold text-text-primary opacity-80">UPLOAD FILE</span>
                  {action.params.ref && (
                    <span className="text-text-secondary font-mono text-[11px]">
                      {action.params.ref}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="pl-6">
        <UploadFileBlock
          ref={action.params.ref}
          filePath={action.params.filePath}
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

interface ParsedUploadFileResult {
  ref: string;
  filePath?: string;
  fileName?: string;
  success?: boolean;
}

function parseUploadFileOutput(output: string): ParsedUploadFileResult | null {
  try {
    const refMatch = output.match(/ref:\s*(.+)/i);
    const filePathMatch = output.match(/file(?:Path)?:\s*(.+)/i);
    
    if (refMatch) {
      const filePath = filePathMatch ? filePathMatch[1].trim() : undefined;
      const fileName = filePath ? filePath.split(/[\\/]/).pop() : undefined;
      
      return {
        ref: refMatch[1].trim(),
        filePath,
        fileName,
        success: output.includes('File uploaded') || output.includes('uploaded'),
      };
    }
    return null;
  } catch {
    return null;
  }
}

function UploadFileBlock({
  ref,
  filePath,
  output,
  isError,
}: UploadFileBlockProps) {
  const parsed = output ? parseUploadFileOutput(output) : null;
  
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
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-text-secondary">Element:</span>
              <span
                className="px-1.5 py-0.5 rounded text-[11px] font-mono"
                style={{
                  backgroundColor: $('--background-tertiary'),
                  color: $('--text-primary'),
                }}
              >
                {parsed.ref}
              </span>
            </div>
            {parsed.fileName && (
              <div className="flex items-start gap-2">
                <span className="text-text-secondary shrink-0">File:</span>
                <span className="text-text-primary font-medium">{parsed.fileName}</span>
              </div>
            )}
            {parsed.filePath && (
              <div className="flex items-start gap-2">
                <span className="text-text-secondary shrink-0">Path:</span>
                <span className="text-text-primary font-mono text-[11px] break-all opacity-70">{parsed.filePath}</span>
              </div>
            )}
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
        <div className="text-text-secondary opacity-60">Uploading file...</div>
      ) : null}
    </div>
  );
}