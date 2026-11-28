import { ArrowRight, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { TONE_CLASS } from '../../../../shared/constants/tone.constants';
import type { TransferPlanItem } from '../../../../shared/types';
import { Pill } from '../../../../shared/components/Pill';
import { SortKey, SortState } from './source-transfer.types';
import { nextFolderOf } from '../../utils/source-transfer.util';

export function FolderCell({ item }: { item: TransferPlanItem }) {
  const next = nextFolderOf(item);
  if (item.oldFolder === next) {
    return <span className='block truncate font-mono text-[11px] text-text-secondary'>{item.oldFolder || '-'}</span>;
  }
  return (
    <span className='flex items-center gap-1.5 font-mono text-[11px]' title={`${item.oldFolder} -> ${next}`}>
      <span className='truncate text-text-secondary line-through'>{item.oldFolder || '-'}</span>
      <ArrowRight className='h-3 w-3 shrink-0 text-text-secondary' />
      <span className='truncate text-text-primary'>{next}</span>
    </span>
  );
}

export function SourceCard({ label, name, detail, extra }: { label: string; name: string; detail: string; extra?: string }) {
  return (
    <div className='flex min-w-0 flex-col gap-1'>
      <span className='text-[10px] font-medium uppercase tracking-wider text-text-secondary'>{label}</span>
      <div className='flex items-center gap-3 rounded-md bg-card-background px-3 py-2'>
        <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md', TONE_CLASS.muted.icon)}>
          <Layers className='h-3.5 w-3.5' />
        </span>
        <div className='flex min-w-0 flex-1 flex-col'>
          <span className='truncate text-xs font-medium text-text-primary'>{name}</span>
          <span className='truncate font-mono text-[11px] text-text-secondary'>{detail}</span>
        </div>
        {extra && (
          <Pill tone='muted' dot={false}>
            {extra}
          </Pill>
        )}
      </div>
    </div>
  );
}

export function SortHead({
  label,
  k,
  sort,
  onSort,
  className,
}: {
  label: string;
  k: SortKey;
  sort: SortState;
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = sort.key === k;
  return (
    <th className={cn('py-2 font-medium', className)}>
      <button
        type='button'
        onClick={() => onSort(k)}
        className={cn('inline-flex items-center gap-1 transition-colors hover:text-text-primary', active && 'text-text-primary')}
      >
        {label}
        {active && (sort.dir === 'asc' ? <ChevronUp className='h-3 w-3' /> : <ChevronDown className='h-3 w-3' />)}
      </button>
    </th>
  );
}
