// ─── Imports ─────────────────────────────────────────────────────────────────
// ── React ──
import { memo } from 'react';

// ── UI ──
import { GitBranch, Workflow as WorkflowIcon } from 'lucide-react';

// ── Components ──
import { Chip } from './WorkflowShared';

// ── Utils ──
import { STATUS_META } from '../../constants/workflow.constants';

// ── Types ──
import type { WorkflowPlan } from '../../types/workflow.types';

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface HeaderSectionProps {
  plan: WorkflowPlan;
}

// ─── Component ───────────────────────────────────────────────────────────────
export const HeaderSection = memo(function HeaderSection({ plan }: HeaderSectionProps) {
  return (
    <div className="px-5 py-4 border-b border-border bg-gradient-to-b from-primary/[0.06] to-transparent">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/25 to-primary/5 ring-1 ring-primary/25 text-primary flex items-center justify-center shrink-0">
          <WorkflowIcon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="min-w-0 flex-1 text-[16px] font-semibold text-text-primary truncate">{plan.taskTitle}</h2>
            <Chip className={`shrink-0 ${STATUS_META.active.chip}`}>In progress</Chip>
            <Chip className="shrink-0 font-mono">
              <GitBranch className="w-3 h-3" />
              {plan.branch}
            </Chip>
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-text-secondary max-w-[720px]">{plan.goal}</p>
        </div>
      </div>
    </div>
  );
});