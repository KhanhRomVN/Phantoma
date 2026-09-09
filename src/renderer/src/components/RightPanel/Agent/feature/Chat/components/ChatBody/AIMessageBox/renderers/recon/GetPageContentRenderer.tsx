/**
 * GetPageContentRenderer — Renderer cho tool get_page_content
 */

import React from 'react';
import { BaseRendererProps } from '../../../../../types/renderer-types';
import { $ } from '@renderer/utils/color';
import { cn } from '@renderer/shared/utils/cn';
import ActionBar from '../../ActionBar';

interface GetPageContentBlockProps {
  output?: string;
  isError?: boolean;
}

export const GetPageContentRenderer: React.FC<BaseRendererProps> = ({
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
                  <span className="font-semibold text-text-primary opacity-80">GET PAGE CONTENT</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="pl-6">
        <GetPageContentBlock
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

interface ParsedPageContent {
  title?: string;
  url?: string;
  content?: string;
  interactiveElements?: Array<{
    ref: string;
    type: string;
    text: string;
  }>;
  hasNoContent?: boolean;
}

function parsePageContentOutput(output: string): ParsedPageContent | null {
  try {
    const result: ParsedPageContent = {};
    
    // Check for "No content extracted"
    if (output.includes('(No content extracted)')) {
      result.hasNoContent = true;
    }
    
    // Extract title
    const titleMatch = output.match(/Title:\s*(.+)/i);
    if (titleMatch) result.title = titleMatch[1].trim();
    
    // Extract URL
    const urlMatch = output.match(/URL:\s*(.+)/i);
    if (urlMatch) result.url = urlMatch[1].trim();
    
    // Extract interactive elements
    const elementsMatch = output.match(/Interactive elements:\s*(\d+)\s*found/i);
    if (elementsMatch) {
      const elements: ParsedPageContent['interactiveElements'] = [];
      const lines = output.split('\n');
      let inElementList = false;
      
      for (const line of lines) {
        if (line.includes('Interactive elements:')) {
          inElementList = true;
          continue;
        }
        if (inElementList && line.trim().startsWith('|') && !line.includes('---')) {
          const parts = line.split('|').map(p => p.trim()).filter(p => p);
          if (parts.length >= 3 && parts[0] !== 'search_query') {
            elements.push({
              ref: parts[0],
              type: parts[1],
              text: parts[2],
            });
          }
        }
      }
      result.interactiveElements = elements;
    }
    
    return result;
  } catch {
    return null;
  }
}

function GetPageContentBlock({
  output,
  isError,
}: GetPageContentBlockProps) {
  const parsed = output ? parsePageContentOutput(output) : null;
  
  return (
    <div className="text-xs space-y-2">
      {output && !isError && parsed ? (
        <div className="space-y-2.5">
          <div
            className="p-2.5 rounded border"
            style={{
              backgroundColor: $('--success') + '08',
              borderColor: $('--success') + '40',
            }}
          >
            <div className="space-y-1.5">
              {parsed.title && (
                <div className="flex items-start gap-2">
                  <span className="text-text-secondary shrink-0 w-10">Title:</span>
                  <span className="text-text-primary font-medium">{parsed.title}</span>
                </div>
              )}
              {parsed.url && (
                <div className="flex items-start gap-2">
                  <span className="text-text-secondary shrink-0 w-10">URL:</span>
                  <span className="text-text-primary font-mono text-[11px] break-all">{parsed.url}</span>
                </div>
              )}
            </div>
          </div>
          
          {parsed.hasNoContent && (
            <div
              className="px-2.5 py-2 rounded text-text-secondary italic"
              style={{ backgroundColor: $('--background-secondary') }}
            >
              No content extracted
            </div>
          )}
          
          {parsed.interactiveElements && parsed.interactiveElements.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 px-1">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  style={{ color: $('--text-secondary') }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                  />
                </svg>
                <span className="text-text-secondary font-medium">
                  Interactive elements: {parsed.interactiveElements.length}
                </span>
              </div>
              
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {parsed.interactiveElements.map((elem, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded border"
                    style={{
                      backgroundColor: $('--background-secondary'),
                      borderColor: $('--border'),
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0"
                        style={{
                          backgroundColor: $('--background-tertiary'),
                          color: $('--text-secondary'),
                        }}
                      >
                        {elem.ref}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-[10px] uppercase font-medium mb-0.5"
                          style={{ color: $('--text-secondary') }}
                        >
                          {elem.type}
                        </div>
                        <div className="text-text-primary">{elem.text}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : output && isError ? (
        <div
          className="p-3 rounded font-mono whitespace-pre-wrap text-xs max-h-96 overflow-y-auto"
          style={{
            backgroundColor: $('--error') + '10',
            color: $('--error'),
          }}
        >
          {output}
        </div>
      ) : !output && !isError ? (
        <div className="text-text-secondary opacity-60">Getting page content...</div>
      ) : null}
    </div>
  );
}