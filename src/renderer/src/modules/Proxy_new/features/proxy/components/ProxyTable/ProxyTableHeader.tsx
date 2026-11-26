import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Checkbox } from '@renderer/components/ui/Checkbox';
import type { SortKey, SortState } from '../../utils/proxy-sort';
import { TH } from './proxy-table.styles';

function SortableTh({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  sort: SortState | null;
  onSort: (key: SortKey) => void;
}) {
  const dir = sort?.key === sortKey ? sort.dir : null;
  const Icon = dir === 'asc' ? ArrowUp : dir === 'desc' ? ArrowDown : ArrowUpDown;
  return (
    <th className={TH}>
      <button
        type='button'
        onClick={() => onSort(sortKey)}
        className={cn('inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-text-primary', dir && 'text-text-primary')}
      >
        {label}
        <Icon className={cn('h-3 w-3', dir === 'asc' && 'text-info', dir === 'desc' && 'text-error', !dir && 'opacity-40')} />
      </button>
    </th>
  );
}

interface ProxyTableHeaderProps {
  allChecked: boolean;
  sort: SortState | null;
  onToggleAll: (checked: boolean) => void;
  onSort: (key: SortKey) => void;
}

export function ProxyTableHeader({ allChecked, sort, onToggleAll, onSort }: ProxyTableHeaderProps) {
  return (
    <thead className='sticky top-0 z-10 bg-table-header-background'>
      <tr>
        <th className={cn(TH, 'w-9')}>
          <Checkbox size='sm' checked={allChecked} onChange={onToggleAll} />
        </th>
        <SortableTh label='Proxy' sortKey='name' sort={sort} onSort={onSort} />
        <SortableTh label='Status' sortKey='status' sort={sort} onSort={onSort} />
        <th className={TH}>Type</th>
        <th className={TH}>Location</th>
        <SortableTh label='Latency' sortKey='latency' sort={sort} onSort={onSort} />
        <SortableTh label='Success' sortKey='success' sort={sort} onSort={onSort} />
        <th className={TH}>Trend 24h</th>
        <th className={TH}>Bandwidth</th>
        <SortableTh label='Expires' sortKey='expiry' sort={sort} onSort={onSort} />
        <th className={cn(TH, 'w-full')}>Used by</th>
      </tr>
    </thead>
  );
}
