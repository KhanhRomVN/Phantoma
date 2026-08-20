/**
 * ListTabsBlock — Hiển thị output của tool list_tabs
 */

import { $ } from '@renderer/utils/color';

interface ListTabsBlockProps {
  targetId?: string;
  output?: string;
  isError?: boolean;
}

export default function ListTabsBlock({ targetId, output, isError }: ListTabsBlockProps) {
  return (
    <div className="text-xs space-y-2">
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

      {!output && !isError && <div className="text-text-secondary opacity-60">Listing tabs...</div>}
    </div>
  );
}
