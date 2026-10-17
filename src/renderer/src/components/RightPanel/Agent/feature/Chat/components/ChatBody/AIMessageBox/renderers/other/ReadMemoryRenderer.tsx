/**
 * ------------------------------------------------------------------
 * ReadMemoryRenderer
 * ------------------------------------------------------------------
 * Hiển thị nội dung memory.md (toàn cục) sau khi AI gọi read_memory.
 * Nội dung được lấy từ toolOutputs[actionId].output.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import React from 'react';

// ── Utils ──
import { $ } from '@renderer/utils/color';

// ── Components ──
import { TagHeader } from '../../TagHeader';

// ─── Types ──────────────────────────────────────────────────────────────
import type { BaseRendererProps } from '../../../../../types/renderer-types';

// ─── Component ──────────────────────────────────────────────────────────
export const ReadMemoryRenderer: React.FC<BaseRendererProps> = ({
  actionIndex,
  messageId,
  toolOutputs,
}) => {
  const actionId = `${messageId}-action-${actionIndex}`;
  const output = toolOutputs?.[actionId]?.output || '';
  const isError = !!toolOutputs?.[actionId]?.isError;

  // Strip header line "[read_memory] Result:" and markdown fences for clean display
  const displayContent = React.useMemo(() => {
    if (!output) return '';
    let body = output.replace(/^\[read_memory\][^\n]*\n?/, '');
    const fenceMatch = /^```[^\n]*\n([\s\S]*?)\n```$/.exec(body.trim());
    if (fenceMatch) body = fenceMatch[1];
    return body;
  }, [output]);

  return (
    <div className="flex flex-col gap-1">
      <TagHeader
        title="READ MEMORY"
        statusColor={isError ? $('--error') : $('--text-secondary')}
        isPartial={false}
        statusTooltip={isError ? 'Error' : 'Memory content'}
      />
      <div className="border border-border-primary rounded-md px-4 py-3 bg-card-background/50">
        <pre className="text-[11.5px] leading-relaxed whitespace-pre-wrap break-words text-text-secondary font-mono">
          {displayContent || '(empty)'}
        </pre>
      </div>
    </div>
  );
};