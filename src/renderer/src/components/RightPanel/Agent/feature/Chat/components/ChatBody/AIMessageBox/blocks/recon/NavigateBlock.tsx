/**
 * NavigateBlock — Display navigate tool output
 */

import React from 'react';
import { $ } from '@renderer/utils/color';

interface NavigateBlockProps {
  url?: string;
  tabId?: string;
  targetId?: string;
  output?: string;
  isError?: boolean;
}

export default function NavigateBlock({
  url,
  tabId,
  targetId,
  output,
  isError,
}: NavigateBlockProps) {
  return (
    <div className="text-xs space-y-2">
      {url && (
        <div className="flex items-start gap-2">
          <span className="text-text-secondary shrink-0">URL:</span>
          <span className="text-text-primary font-mono">{url}</span>
        </div>
      )}
      {tabId && (
        <div className="flex items-start gap-2">
          <span className="text-text-secondary shrink-0">Tab ID:</span>
          <span className="text-text-primary font-mono">{tabId}</span>
        </div>
      )}
      {targetId && (
        <div className="flex items-start gap-2">
          <span className="text-text-secondary shrink-0">Target:</span>
          <span className="text-text-primary font-mono">{targetId}</span>
        </div>
      )}

      {output && (
        <div
          className="p-3 rounded font-mono whitespace-pre-wrap"
          style={{
            backgroundColor: isError ? $('--error') + '10' : $('--success') + '10',
            color: isError ? $('--error') : $('--success'),
          }}
        >
          {output}
        </div>
      )}

      {!output && !isError && (
        <div className="text-text-secondary opacity-60">Navigating...</div>
      )}
    </div>
  );
}