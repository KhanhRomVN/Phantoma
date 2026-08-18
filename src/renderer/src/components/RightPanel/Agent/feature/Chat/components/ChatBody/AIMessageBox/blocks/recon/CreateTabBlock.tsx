/**
 * CreateTabBlock — Display create_tab tool output
 */

import React from 'react';
import { $ } from '@renderer/utils/color';

interface CreateTabBlockProps {
  url?: string;
  targetId?: string;
  output?: string;
  isError?: boolean;
}

export default function CreateTabBlock({
  url,
  targetId,
  output,
  isError,
}: CreateTabBlockProps) {
  return (
    <div className="text-xs space-y-2">
      {url && (
        <div className="flex items-start gap-2">
          <span className="text-text-secondary shrink-0">URL:</span>
          <span className="text-text-primary font-mono">{url}</span>
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
        <div className="text-text-secondary opacity-60">Creating tab...</div>
      )}
    </div>
  );
}