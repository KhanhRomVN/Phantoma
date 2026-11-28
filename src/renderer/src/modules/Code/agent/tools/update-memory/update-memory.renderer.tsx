// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import React from 'react';

// ── Utils ──
import { $ } from '@renderer/utils/color';

// ── Components ──
import { TagHeader } from '@renderer/modules/Code/shared/zen/zen-bridge';

// ─── Types ──────────────────────────────────────────────────────────────
import { BaseRendererProps } from '@renderer/modules/Code/shared/zen/zen-bridge';

// ─── Component ──────────────────────────────────────────────────────────
export const UpdateMemoryRenderer: React.FC<BaseRendererProps> = ({
  action,
  actionIndex,
  messageId,
  toolOutputs,
}) => {
  const actionId = `${messageId}-action-${actionIndex}`;
  const output = toolOutputs?.[actionId]?.output || '';
  const isError = !!toolOutputs?.[actionId]?.isError;
  const oldContent = action.params?.old_content || '';
  const newContent = action.params?.new_content || '';

  return (
    <div className="flex flex-col gap-1">
      <TagHeader
        title="UPDATE MEMORY"
        statusColor={isError ? $('--error') : $('--text-secondary')}
        isPartial={false}
        statusTooltip={isError ? 'Error' : 'Memory update'}
      />
      <div className="border border-primary rounded-md overflow-hidden">
        {oldContent && (
          <div className="px-3 py-2 bg-error/5 border-b border-primary">
            <div className="text-[10px] uppercase tracking-wide text-error mb-1">Old</div>
            <pre className="text-[11px] leading-relaxed whitespace-pre-wrap break-words text-text-secondary font-mono">
              {oldContent}
            </pre>
          </div>
        )}
        {newContent && (
          <div className="px-3 py-2 bg-success/5">
            <div className="text-[10px] uppercase tracking-wide text-success mb-1">New</div>
            <pre className="text-[11px] leading-relaxed whitespace-pre-wrap break-words text-text-secondary font-mono">
              {newContent}
            </pre>
          </div>
        )}
        {!oldContent && !newContent && output && (
          <div className="px-3 py-2">
            <pre className="text-[11px] text-text-secondary font-mono">{output}</pre>
          </div>
        )}
      </div>
    </div>
  );
};
