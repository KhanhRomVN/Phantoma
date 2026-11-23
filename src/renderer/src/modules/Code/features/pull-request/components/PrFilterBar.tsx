import { memo } from 'react';
import { GitMerge, GitPullRequest, GitPullRequestClosed, Inbox } from 'lucide-react';

import { cn } from '@renderer/utils/cn';
import { FILTERS, type Filter } from '../types/pull-request.types';
import { TONE_COLOR, tint } from '../utils/pull-request.util';

const FILTER_META: Record<Filter, { color: string; Icon: typeof Inbox }> = {
  open: { color: TONE_COLOR.open, Icon: GitPullRequest },
  merged: { color: TONE_COLOR.merged, Icon: GitMerge },
  closed: { color: TONE_COLOR.closed, Icon: GitPullRequestClosed },
  all: { color: TONE_COLOR.draft, Icon: Inbox },
};

interface PrFilterBarProps {
  filter: Filter;
  count: number | null;
  onChange: (f: Filter) => void;
}

export const PrFilterBar = memo(function PrFilterBar({ filter, count, onChange }: PrFilterBarProps) {
  return (
    <div className={'shrink-0 px-3 pb-2 flex items-center gap-1.5 border-b border-border'}>
      {FILTERS.map((f) => {
        const { color, Icon } = FILTER_META[f.id];
        const active = filter === f.id;
        return (
          <button
            key={f.id}
            onClick={() => onChange(f.id)}
            style={active ? { color, background: tint(color, 14) } : undefined}
            className={cn(
              'h-6 px-2 rounded-md text-[11.5px] font-medium outline-none cursor-pointer transition-colors inline-flex items-center gap-1.5',
              !active && 'bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/15 hover:text-text-primary',
            )}
          >
            <Icon className={'w-3 h-3'} style={{ color }} />
            {f.label}
            {active && count !== null && (
              <span className={'font-mono text-[10.5px] opacity-70'}>{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
});

PrFilterBar.displayName = 'PrFilterBar';