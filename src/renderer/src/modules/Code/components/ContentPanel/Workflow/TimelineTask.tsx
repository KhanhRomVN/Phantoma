import { memo } from 'react';
import { FileText, ListChecks } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { STATUS_META } from './constants';
import type { CheckItem, WorkflowNode } from './types';
import { nodeChangeStat } from './utils';

interface TimelineTaskProps {
  nodes: WorkflowNode[];
  selectedId: string;
  isChecked: (c: CheckItem) => boolean;
  onSelect: (id: string) => void;
}

export const TimelineTask = memo(function TimelineTask({ nodes, selectedId, isChecked, onSelect }: TimelineTaskProps) {
  return (
    <div className="w-[300px] shrink-0 border-r border-border overflow-y-auto py-4 px-3">
      {nodes.map((node, idx) => {
        const meta = STATUS_META[node.status];
        const Icon = meta.icon;
        const isSelected = node.id === selectedId;
        const prev = nodes[idx - 1];
        const isFirst = idx === 0;
        const isLast = idx === nodes.length - 1;
        const doneItems = node.subtasks.filter(isChecked).length;
        const stat = nodeChangeStat(node);
        return (
          <div key={node.id} className="flex items-stretch gap-3">
            <div className="flex flex-col items-center w-6 shrink-0">
              <span
                className={cn(
                  'w-0.5 flex-1',
                  isFirst ? 'bg-transparent' : prev.status === 'done' ? 'bg-success/50' : 'bg-border',
                )}
              />
              <span className={cn('w-6 h-6 rounded-full border flex items-center justify-center shrink-0', meta.dot)}>
                <Icon className="w-3.5 h-3.5" />
              </span>
              <span
                className={cn(
                  'w-0.5 flex-1',
                  isLast ? 'bg-transparent' : node.status === 'done' ? 'bg-success/50' : 'bg-border',
                )}
              />
            </div>
            <button
              onClick={() => onSelect(node.id)}
              className={cn(
                'flex-1 min-w-0 my-0.5 px-3 py-2.5 rounded-xl border border-l-2 border-dashed [border-left-style:solid] text-left cursor-pointer transition-colors',
                isSelected ? cn('rounded-l-sm', meta.selected) : 'border-transparent hover:bg-white/[0.04]',
              )}
            >
              <span
                className={cn(
                  'block text-[12.5px] font-medium leading-snug',
                  node.status === 'done' ? 'text-text-secondary' : 'text-text-primary',
                )}
              >
                {node.title}
              </span>
              <span className="mt-2 flex items-center gap-3 text-[10.5px] text-text-secondary/70">
                <span className="inline-flex items-center gap-1">
                  <ListChecks className="w-3 h-3" />
                  <span className="tabular-nums">
                    {doneItems}/{node.subtasks.length}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  <span className="tabular-nums">{stat.changed}</span>
                </span>
                {(stat.add > 0 || stat.del > 0) && (
                  <span className="ml-auto inline-flex items-center gap-1.5 font-mono tabular-nums">
                    <span className="text-success">+{stat.add}</span>
                    <span className="text-red-400">−{stat.del}</span>
                  </span>
                )}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
});