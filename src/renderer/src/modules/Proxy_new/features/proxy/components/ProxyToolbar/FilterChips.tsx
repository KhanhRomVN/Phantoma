import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import {
  KIND_META,
  KINDS,
  PROTOCOL_META,
  PROTOCOLS,
  PROXY_STATUS,
  STATUSES,
} from '../../../../shared/constants/proxy-meta.constants';
import { TONE_CLASS } from '../../../../shared/constants/tone.constants';
import type { Proxy, Tone } from '../../../../shared/types/proxy-domain.types';
import type { ProxyFilters } from '../../types/proxy.types';
import { hasActiveFilters } from '../../utils/proxy-filter';
import { ACTIVE_NEUTRAL } from './toolbar.styles';

function Chip({
  active,
  tone = 'muted',
  onClick,
  children,
}: {
  active: boolean;
  tone?: Tone;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
        active
          ? tone === 'muted' || tone === 'primary'
            ? ACTIVE_NEUTRAL
            : TONE_CLASS[tone].pill
          : 'bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/15 hover:text-text-primary',
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className='mx-1 h-4 w-px shrink-0 bg-text-secondary/20' />;
}

interface FilterChipsProps {
  filters: ProxyFilters;
  proxies: Proxy[];
  onPatch: (patch: Partial<ProxyFilters>) => void;
  onReset: () => void;
}

export function FilterChips({ filters, proxies, onPatch, onReset }: FilterChipsProps) {
  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const p of proxies) result[p.status] = (result[p.status] ?? 0) + 1;
    return result;
  }, [proxies]);

  const dirty = hasActiveFilters(filters);

  return (
    <div className='flex flex-wrap items-center gap-1.5'>
      <Chip active={filters.status === 'all'} onClick={() => onPatch({ status: 'all' })}>
        All
        <span className='tabular-nums opacity-70'>{proxies.length}</span>
      </Chip>
      {STATUSES.map((s) => (
        <Chip key={s} active={filters.status === s} tone={PROXY_STATUS[s].tone} onClick={() => onPatch({ status: filters.status === s ? 'all' : s })}>
          <span className={cn('h-1.5 w-1.5 rounded-full', TONE_CLASS[PROXY_STATUS[s].tone].dot)} />
          {PROXY_STATUS[s].label}
          <span className='tabular-nums opacity-70'>{counts[s] ?? 0}</span>
        </Chip>
      ))}
      <Divider />
      {PROTOCOLS.map((pr) => (
        <Chip key={pr} active={filters.protocol === pr} tone={PROTOCOL_META[pr].tone} onClick={() => onPatch({ protocol: filters.protocol === pr ? 'all' : pr })}>
          {PROTOCOL_META[pr].label}
        </Chip>
      ))}
      <Divider />
      {KINDS.map((k) => (
        <Chip key={k} active={filters.kind === k} tone={KIND_META[k].tone} onClick={() => onPatch({ kind: filters.kind === k ? 'all' : k })}>
          {KIND_META[k].label}
        </Chip>
      ))}
      {dirty && (
        <button
          type='button'
          onClick={onReset}
          className='ml-auto flex items-center gap-1 text-xs text-text-secondary transition-colors hover:text-text-primary'
        >
          <X className='h-3 w-3' />
          Reset
        </button>
      )}
    </div>
  );
}
