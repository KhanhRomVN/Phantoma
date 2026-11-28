import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { TH } from './ProfileTable';
import { SortKey, SortState } from '../../utils/profile-table.util';

export function SortableTh({
  label,
  sortKey,
  sort,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  sort: SortState | null;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const dir = sort?.key === sortKey ? sort.dir : null;
  const Icon = dir === 'asc' ? ArrowUp : dir === 'desc' ? ArrowDown : ArrowUpDown;
  return (
    <th className={cn(TH, className)}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-text-primary',
          dir && 'text-text-primary',
        )}
      >
        {label}
        <Icon
          className={cn(
            'h-3 w-3',
            dir === 'asc' && 'text-info',
            dir === 'desc' && 'text-error',
            !dir && 'opacity-40',
          )}
        />
      </button>
    </th>
  );
}
