import { memo, useState } from 'react';
import { Filter } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown';
import {
  SCOPE_CATEGORIES,
  SCOPE_DIFF_RING,
  useScopeFilter,
  useScopeStats,
  useScopeStatsStore,
  type ScopeCategory,
} from '../../../stores/useScopeStatsStore';

const RING: Record<ScopeCategory, string> = {
  primary: 'border-primary',
  warn: 'border-warn',
  diff: SCOPE_DIFF_RING,
  error: 'border-error',
};

export const ScopeFilterButton = memo(function ScopeFilterButton({
  projectId,
}: {
  projectId: string;
}) {
  const stats = useScopeStats(projectId);
  const filter = useScopeFilter(projectId);
  const setFilter = useScopeStatsStore((s) => s.setFilter);
  const [open, setOpen] = useState(false);
  const isDefault = useScopeStatsStore((s) => s.isDefaultByProject[projectId] ?? false);
  const defaultBranch = useScopeStatsStore((s) => s.defaultBranchByProject[projectId] ?? '');
  const otherBranchesRaw = useScopeStatsStore((s) => s.otherBranchesByProject[projectId]);
  const active = SCOPE_CATEGORIES.find((c) => c.id === filter);
  const originRef = defaultBranch ? `origin/${defaultBranch}` : 'default branch';
  const otherBranches = otherBranchesRaw ?? [];
  const otherText =
    otherBranches.length > 1
      ? `${otherBranches.slice(0, -1).join(', ')} and ${otherBranches[otherBranches.length - 1]}`
      : (otherBranches[0] ?? 'branch');
  const labelFor = (c: (typeof SCOPE_CATEGORIES)[number]) => {
    const prefix = isDefault ? '' : 'Outside scope · ';
    if (c.id === 'warn') return `${prefix}Same as ${originRef}`;
    if (c.id === 'diff') return `${prefix}Differs from ${originRef}`;
    if (c.id === 'error') {
      return `${prefix}Differs from ${originRef} & changed in another ${otherText}`;
    }
    return c.label;
  };
  const categories = (
    isDefault ? SCOPE_CATEGORIES.filter((c) => c.id !== 'primary') : SCOPE_CATEGORIES
  ).map((c) => ({ ...c, label: labelFor(c) }));

  if (active) {
    return (
      <span
        role="button"
        title="Clear filter"
        onClick={() => setFilter(projectId, null)}
        className="inline-flex items-center justify-center h-6 px-1.5 rounded cursor-pointer bg-button-soft-background hover:bg-button-soft-background/80 transition-colors"
      >
        <span
          className={cn(
            'inline-flex p-[2px] rounded-full border border-dashed',
            RING[active.id],
          )}
        >
          <span className={cn('w-2 h-2 rounded-full shrink-0', active.dot)} />
        </span>
      </span>
    );
  }

  return (
    <Dropdown open={open} onOpenChange={setOpen} side="bottom" align="end">
      <DropdownTrigger asChild>
        <span className="inline-flex items-center h-6 px-1 rounded cursor-pointer transition-colors text-text-secondary hover:text-text-primary hover:bg-card-hover">
          <Filter className="w-3.5 h-3.5" strokeWidth={1.5} />
        </span>
      </DropdownTrigger>
      <DropdownContent className="min-w-[250px]" size="sm">
        {categories.map((c) => (
          <DropdownItem key={c.id} onClick={() => setFilter(projectId, c.id)}>
            <span className="flex items-center gap-2 w-full">
              <span className={cn('w-2 h-2 rounded-full shrink-0', c.dot)} />
              <span className="flex-1">{c.label}</span>
              <span className="font-mono text-[11px] text-text-secondary">{stats[c.id].length}</span>
            </span>
          </DropdownItem>
        ))}
      </DropdownContent>
    </Dropdown>
  );
});