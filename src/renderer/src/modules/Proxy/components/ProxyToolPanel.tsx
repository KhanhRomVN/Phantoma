import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Activity, ChevronDown, Download, Globe, Loader2, Plus, Search, X } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from '@renderer/components/ui/Dropdown';
import { DEFAULT_PROXY_FILTERS } from '../types';
import type { Proxy, ProxyFilters, Tone } from '../types';
import { COUNTRY_NAME, KINDS, KIND_META, PROTOCOLS, PROTOCOL_META, PROXY_STATUS, STATUSES, TONE_CLASS } from '../constants/proxy';
import { flag } from '../utils/format';

interface ProxyToolPanelProps {
  filters: ProxyFilters;
  onChange: (next: ProxyFilters) => void;
  proxies: Proxy[];
  testingAll: boolean;
  onTestAll?: () => void;
  onImport?: () => void;
  onAdd?: () => void;
}

const BTN =
  'flex h-[34px] shrink-0 items-center gap-1.5 rounded-md bg-text-secondary/10 px-3 text-xs font-medium text-text-secondary transition-colors hover:bg-text-secondary/15 hover:text-text-primary active:bg-text-secondary/20 disabled:opacity-60';
const ACTIVE_NEUTRAL = 'bg-text-secondary/25 text-text-primary';

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

export function ProxyToolPanel({ filters, onChange, proxies, testingAll, onTestAll, onImport, onAdd }: ProxyToolPanelProps) {
  const [countryOpen, setCountryOpen] = useState(false);
  const set = (patch: Partial<ProxyFilters>): void => onChange({ ...filters, ...patch });

  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const p of proxies) result[p.status] = (result[p.status] ?? 0) + 1;
    return result;
  }, [proxies]);

  const countries = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of proxies) map.set(p.country, (map.get(p.country) ?? 0) + 1);
    return Array.from(map, ([code, count]) => ({ code, count })).sort((a, b) => b.count - a.count);
  }, [proxies]);

  const dirty = (Object.keys(DEFAULT_PROXY_FILTERS) as (keyof ProxyFilters)[]).some(
    (k) => filters[k] !== DEFAULT_PROXY_FILTERS[k],
  );

  return (
    <div className='flex flex-col gap-2.5'>
      <div className='flex items-center gap-2'>
        <div className='relative min-w-0 flex-1'>
          <Search className='pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary' />
          <input
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder='Search by host, name, IP, ISP, provider, tag...'
            className='h-[34px] w-full rounded-md bg-text-secondary/10 pl-9 pr-8 text-xs text-text-primary outline-none placeholder:text-text-secondary focus:bg-text-secondary/15'
          />
          {filters.search && (
            <button
              type='button'
              onClick={() => set({ search: '' })}
              className='absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary'
            >
              <X className='h-3.5 w-3.5' />
            </button>
          )}
        </div>

        <Dropdown open={countryOpen} onOpenChange={setCountryOpen} width={220}>
          <DropdownTrigger asChild>
            <button type='button' className={cn(BTN, filters.country !== 'all' && ACTIVE_NEUTRAL)}>
              {filters.country === 'all' ? (
                <Globe className='h-3.5 w-3.5' />
              ) : (
                <span className='text-[13px] leading-none'>{flag(filters.country)}</span>
              )}
              {filters.country === 'all' ? 'All countries' : (COUNTRY_NAME[filters.country] ?? filters.country)}
              <ChevronDown className='h-3 w-3 opacity-60' />
            </button>
          </DropdownTrigger>
          <DropdownContent>
            <DropdownItem onClick={() => set({ country: 'all' })}>All countries</DropdownItem>
            {countries.map((c) => (
              <DropdownItem key={c.code} onClick={() => set({ country: c.code })}>
                <span className='flex w-full items-center justify-between gap-2'>
                  <span>
                    {flag(c.code)} {COUNTRY_NAME[c.code] ?? c.code}
                  </span>
                  <span className='text-[10px] tabular-nums text-text-secondary'>{c.count}</span>
                </span>
              </DropdownItem>
            ))}
          </DropdownContent>
        </Dropdown>

        {onTestAll && (
          <button type='button' onClick={onTestAll} disabled={testingAll} className={BTN}>
            {testingAll ? <Loader2 className='h-3.5 w-3.5 animate-spin' /> : <Activity className='h-3.5 w-3.5' />}
            Test all
          </button>
        )}
        {onImport && (
          <button type='button' onClick={onImport} className={BTN}>
            <Download className='h-3.5 w-3.5' />
            Import
          </button>
        )}
        {onAdd && (
          <button
            type='button'
            onClick={onAdd}
            className='flex h-[34px] shrink-0 items-center gap-1.5 rounded-md bg-primary/10 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/20 active:bg-primary/30'
          >
            <Plus className='h-3.5 w-3.5' />
            Add proxy
          </button>
        )}
      </div>

      <div className='flex flex-wrap items-center gap-1.5'>
        <Chip active={filters.status === 'all'} onClick={() => set({ status: 'all' })}>
          All
          <span className='tabular-nums opacity-70'>{proxies.length}</span>
        </Chip>
        {STATUSES.map((s) => (
          <Chip key={s} active={filters.status === s} tone={PROXY_STATUS[s].tone} onClick={() => set({ status: filters.status === s ? 'all' : s })}>
            <span className={cn('h-1.5 w-1.5 rounded-full', TONE_CLASS[PROXY_STATUS[s].tone].dot)} />
            {PROXY_STATUS[s].label}
            <span className='tabular-nums opacity-70'>{counts[s] ?? 0}</span>
          </Chip>
        ))}
        <Divider />
        {PROTOCOLS.map((pr) => (
          <Chip key={pr} active={filters.protocol === pr} tone={PROTOCOL_META[pr].tone} onClick={() => set({ protocol: filters.protocol === pr ? 'all' : pr })}>
            {PROTOCOL_META[pr].label}
          </Chip>
        ))}
        <Divider />
        {KINDS.map((k) => (
          <Chip key={k} active={filters.kind === k} tone={KIND_META[k].tone} onClick={() => set({ kind: filters.kind === k ? 'all' : k })}>
            {KIND_META[k].label}
          </Chip>
        ))}
        {dirty && (
          <button
            type='button'
            onClick={() => onChange(DEFAULT_PROXY_FILTERS)}
            className='ml-auto flex items-center gap-1 text-xs text-text-secondary transition-colors hover:text-text-primary'
          >
            <X className='h-3 w-3' />
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

export default ProxyToolPanel;