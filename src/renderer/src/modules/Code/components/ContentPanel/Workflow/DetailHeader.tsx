import { memo } from 'react';
import { cn } from '@renderer/utils/cn';
import { STATUS_META, TABS } from './constants';
import type { TabId, WorkflowNode } from './types';

interface DetailHeaderProps {
  node: WorkflowNode;
  tab: TabId;
  onTabChange: (tab: TabId) => void;
}

export const DetailHeader = memo(function DetailHeader({ node, tab, onTabChange }: DetailHeaderProps) {
  const meta = STATUS_META[node.status];
  const StatusIcon = meta.icon;
  return (
    <div className="px-6 pt-5 pb-0 border-b border-border">
      <div className="flex items-center gap-3">
        <span className={cn('w-9 h-9 rounded-lg border flex items-center justify-center shrink-0', meta.chip)}>
          <StatusIcon className="w-[18px] h-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold text-text-primary">{node.title}</h3>
          <p className="mt-0.5 text-[12px] text-text-secondary">{node.summary}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1">
        {TABS.map((t) => {
          const TabIcon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={cn(
                'relative inline-flex items-center gap-1.5 h-9 px-3 text-[12px] cursor-pointer transition-colors',
                active ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary',
              )}
            >
              <TabIcon className="w-3.5 h-3.5" />
              {t.label}
              {t.id === 'files' && <span className="text-[10px] text-text-secondary/70">{node.files.length}</span>}
              {active && <span className="absolute left-2 right-2 bottom-0 h-[2px] rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>
    </div>
  );
});