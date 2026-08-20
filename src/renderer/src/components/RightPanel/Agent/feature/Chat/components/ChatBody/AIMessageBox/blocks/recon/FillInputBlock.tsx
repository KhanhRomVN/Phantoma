/**
 * FillInputBlock — Hiển thị output của tool fill_input
 */

import { $ } from '@renderer/utils/color';

interface FillInputBlockProps {
  ref?: string;
  value?: string;
  tabId?: string;
  targetId?: string;
  output?: string;
  isError?: boolean;
}

export default function FillInputBlock({
  ref,
  value,
  tabId,
  targetId,
  output,
  isError,
}: FillInputBlockProps) {
  return (
    <div className="text-xs space-y-2">
      {ref && (
        <div className="flex items-start gap-2">
          <span className="text-text-secondary shrink-0">Ref:</span>
          <span className="text-text-primary font-mono">{ref}</span>
        </div>
      )}
      {value && (
        <div className="flex items-start gap-2">
          <span className="text-text-secondary shrink-0">Value:</span>
          <span className="text-text-primary font-mono">{value}</span>
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
        <div className="text-text-secondary opacity-60">Filling input...</div>
      )}
    </div>
  );
}
