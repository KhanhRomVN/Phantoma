/**
 * ------------------------------------------------------------------
 * ReadSkillRenderer
 * ------------------------------------------------------------------
 * Hiển thị chi tiết + nội dung của một skill sau khi AI gọi read_skill.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import React from 'react';

// ── Utils ──
import { $ } from '@renderer/utils/color';

// ── Components ──
import { TagHeader } from '@renderer/components/RightPanel/Zen/feature/Chat/components/ChatBody/AIMessageBox/TagHeader';

// ─── Types ──────────────────────────────────────────────────────────────
import type { BaseRendererProps } from '@renderer/components/RightPanel/Zen/feature/Chat/types/renderer-types';

// ─── Component ──────────────────────────────────────────────────────────
export const ReadSkillRenderer: React.FC<BaseRendererProps> = ({
  action,
  actionIndex,
  messageId,
  toolOutputs,
}) => {
  const actionId = `${messageId}-action-${actionIndex}`;
  const output = toolOutputs?.[actionId]?.output || '';
  const isError = !!toolOutputs?.[actionId]?.isError;
  const skillId = action.params?.skill_id || '';

  // Strip leading "[read_skill for '<id>'] Result:" line
  const body = React.useMemo(
    () => output.replace(/^\[read_skill[^\]]*\]\s*Result:\s*\n?/, ''),
    [output],
  );

  return (
    <div className="flex flex-col gap-1">
      <TagHeader
        title={skillId ? `READ SKILL · ${skillId}` : 'READ SKILL'}
        statusColor={isError ? $('--error') : $('--text-secondary')}
        isPartial={false}
        statusTooltip={isError ? 'Error' : 'Skill detail'}
      />
      <div className="border border-border-primary rounded-md px-4 py-3 bg-card-background/50">
        <pre className="text-[11.5px] leading-relaxed whitespace-pre-wrap break-words text-text-secondary">
          {body || '(empty)'}
        </pre>
      </div>
    </div>
  );
};