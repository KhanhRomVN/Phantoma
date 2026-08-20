/**
 * ForwardBlock — Hiển thị output của tool forward
 */

import { $ } from '@renderer/utils/color';

interface ForwardBlockProps {
  tabId?: string;
  targetId?: string;
  output?: string;
  isError?: boolean;
}

export default function ForwardBlock({ tabId, targetId, output, isError }: ForwardBlockProps) {
  return (
    <div className="text-xs space-y-2">
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
        <div className="text-text-secondary opacity-60">Going forward...</div>
      )}
    </div>
  );
}
