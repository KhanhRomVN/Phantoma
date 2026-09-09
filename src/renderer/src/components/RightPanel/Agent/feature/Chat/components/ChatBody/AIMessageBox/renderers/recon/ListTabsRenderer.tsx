/**
 * ListTabsRenderer — Renderer cho tool list_tabs
 */

import React from 'react';
import { BaseRendererProps } from '../../../../../types/renderer-types';
import { $ } from '@renderer/utils/color';
import { cn } from '@renderer/shared/utils/cn';
import ActionBar from '../../ActionBar';

interface ListTabsBlockProps {
  output?: string;
  isError?: boolean;
}

export const ListTabsRenderer: React.FC<BaseRendererProps> = ({
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
                  <span className="font-semibold text-text-primary opacity-80">LIST TABS</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="pl-6">
        <ListTabsBlock

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

interface ParsedTab {
  id: string;
  tabId: string;
  title: string;
  url: string;
  isActive: boolean;
}

function parseTabsOutput(output: string): { totalTabs: number; tabs: ParsedTab[] } | null {
  try {
    // Parse markdown list format:
    // [list_tabs] Total tabs: N
    // - Tab 0 (tab-001): "Title" | URL: about:blank | Active: true
    // - Tab 1 (tab-002): "Another" | URL: https://example.com | Active: false
    
    const lines = output.trim().split('\n');
    
    // Extract total tabs
    const totalMatch = lines[0]?.match(/Total tabs:\s*(\d+)/i);
    const totalTabs = totalMatch ? parseInt(totalMatch[1]) : 0;
    
    // Parse list items
    const tabs: ParsedTab[] = [];
    for (const line of lines) {
      // Match pattern: - Tab {id} ({tabId}): "{title}" | URL: {url} | Active: {isActive}
      const match = line.match(/^-\s*Tab\s+(\d+)\s+\(([^)]+)\):\s*"([^"]*)"\s*\|\s*URL:\s*([^\|]+)\s*\|\s*Active:\s*(true|false)/i);
      
      if (match) {
        tabs.push({
          id: match[1],
          tabId: match[2].trim(),
          title: match[3] || '(No title)',
          url: match[4].trim(),
          isActive: match[5].toLowerCase() === 'true',
        });
      }
    }
    
    return { totalTabs, tabs };
  } catch {
    return null;
  }
}

function ListTabsBlock({ output, isError }: ListTabsBlockProps) {
  const parsed = output ? parseTabsOutput(output) : null;
  
  return (
    <div className="text-xs space-y-2">
      {output && !isError && parsed ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-text-secondary">
            <span>Total: {parsed.totalTabs} tab{parsed.totalTabs !== 1 ? 's' : ''}</span>
          </div>
          
          <div className="space-y-1.5">
            {parsed.tabs.map((tab) => (
              <div
                key={tab.tabId}
                className="p-2.5 rounded border transition-colors"
                style={{
                  backgroundColor: tab.isActive ? $('--success') + '08' : $('--background-secondary'),
                  borderColor: tab.isActive ? $('--success') + '40' : $('--border'),
                }}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      {tab.isActive && (
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: $('--success') }}
                        />
                      )}
                      <span className="font-medium text-text-primary truncate">
                        {tab.title}
                      </span>
                    </div>
                    <div className="text-text-secondary font-mono text-[11px] truncate">
                      {tab.url}
                    </div>
                  </div>
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0"
                    style={{
                      backgroundColor: $('--background-tertiary'),
                      color: $('--text-secondary'),
                    }}
                  >
                    {tab.tabId}
                  </span>
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
        <div className="text-text-secondary opacity-60">Listing tabs...</div>
      ) : null}
    </div>
  );
}