/**
 * GetPageContentBlock — Hiển thị output của tool get_page_content
 */

import { $ } from '@renderer/utils/color';

interface GetPageContentBlockProps {
  tabId?: string;
  targetId?: string;
  output?: string;
  isError?: boolean;
}

export default function GetPageContentBlock({
  tabId,
  targetId,
  output,
  isError,
}: GetPageContentBlockProps) {
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
        <div className="text-text-secondary opacity-60">Getting page content...</div>
      )}
    </div>
  );
}
