/**
 * ScrollBlock — Display scroll tool output
 */

import React from 'react';
import { $ } from '@renderer/utils/color';

interface ScrollBlockProps {
  direction?: string;
  amount?: number;
  tabId?: string;
  targetId?: string;
  output?: string;
  isError?: boolean;
}

export default function ScrollBlock({
  direction,
  amount,
  tabId,
  targetId,
  output,
  isError,
}: ScrollBlockProps) {
  return (
    <div className="text-xs space-y-2">
      {direction && (
        <div className="flex items-start gap-2">
          <span className="text-text-secondary shrink-0">Direction:</span>
          <span className="text-text-primary font-mono">{direction}</span>
        </div>
      )}
      {amount !== undefined && (
        <div className="flex items-start gap-2">
          <span className="text-text-secondary shrink-0">Amount:</span>
          <span className="text-text-primary font-mono">{amount}</span>
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
        <div className="text-text-secondary opacity-60">Scrolling page...</div>
      )}
    </div>
  );
}