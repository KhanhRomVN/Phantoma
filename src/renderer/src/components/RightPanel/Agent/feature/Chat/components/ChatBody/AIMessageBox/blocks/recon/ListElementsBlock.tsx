/**
 * ListElementsBlock — Hiển thị output của tool list_elements
 */

import { $ } from '@renderer/utils/color';

interface ListElementsBlockProps {
  elementType?: string;
  tabId?: string;
  targetId?: string;
  output?: string;
  isError?: boolean;
}

export default function ListElementsBlock({
  elementType,
  tabId,
  targetId,
  output,
  isError,
}: ListElementsBlockProps) {
  return (
    <div className="text-xs space-y-2">
      {elementType && (
        <div className="flex items-start gap-2">
          <span className="text-text-secondary shrink-0">Type:</span>
          <span className="text-text-primary font-mono">{elementType}</span>
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
          className="p-3 rounded font-mono whitespace-pre-wrap max-h-96 overflow-y-auto"
          style={{
            backgroundColor: isError ? $('--error') + '10' : $('--success') + '10',
            color: isError ? $('--error') : $('--success'),
          }}
        >
          {output}
        </div>
      )}

      {!output && !isError && (
        <div className="text-text-secondary opacity-60">Listing elements...</div>
      )}
    </div>
  );
}
