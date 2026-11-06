import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { getFileIconPath } from '@renderer/utils/file-icon';
import { ACTION_META } from './constants';
import type { CheckItem, FileAction } from './types';

export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 h-[22px] px-2 rounded-md border text-[11px] text-text-secondary border-border bg-white/[0.03]',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Section({ title, meta, children }: { title: string; meta?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <h4 className="text-[15px] font-semibold text-text-primary">{title}</h4>
        {meta && <span className="ml-auto">{meta}</span>}
      </div>
      {children}
    </section>
  );
}

export function Progress({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-success/70 to-success transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] tabular-nums text-text-secondary">
        {done}/{total}
      </span>
    </div>
  );
}

export function CheckRow({ item, checked, onToggle }: { item: CheckItem; checked: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="group flex items-start gap-2.5 w-full text-left px-2.5 py-2 rounded-lg hover:bg-white/[0.04] cursor-pointer transition-colors"
    >
      <span
        className={cn(
          'mt-[1px] w-4 h-4 rounded-[5px] border flex items-center justify-center shrink-0 transition-colors',
          checked ? 'bg-success/20 border-success/50 text-success' : 'border-border group-hover:border-text-secondary/50',
        )}
      >
        {checked && <Check className="w-3 h-3" />}
      </span>
      <span className={cn('text-[12.5px] leading-snug', checked ? 'text-text-secondary line-through' : 'text-text-primary')}>
        {item.text}
      </span>
    </button>
  );
}

export function FileIcon({ name }: { name: string }) {
  return <img src={getFileIconPath(name)} alt="" draggable={false} className="w-4 h-4 shrink-0" />;
}

export function ActionBadge({ action }: { action: FileAction }) {
  const meta = ACTION_META[action];
  const ActionIcon = meta.icon;
  return (
    <span
      title={meta.label}
      className={cn('w-6 h-6 rounded-md border flex items-center justify-center shrink-0', meta.cls)}
    >
      <ActionIcon className="w-3.5 h-3.5" />
    </span>
  );
}