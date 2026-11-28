import { Activity, Download, Loader2, Plus, Search, X } from 'lucide-react';
import type { Proxy } from '../../../../shared/types/proxy-domain.types';
import type { ProxyFilters } from '../../types/proxy.types';
import { DEFAULT_PROXY_FILTERS } from '../../types/proxy.types';
import { CountryFilter } from './CountryFilter';
import { FilterChips } from './FilterChips';
import { BTN } from './toolbar.styles';

interface ProxyToolbarProps {
  filters: ProxyFilters;
  onChange: (next: ProxyFilters) => void;
  proxies: Proxy[];
  testingAll: boolean;
  onTestAll?: () => void;
  onImport?: () => void;
  onAdd?: () => void;
}

export function ProxyToolbar({ filters, onChange, proxies, testingAll, onTestAll, onImport, onAdd }: ProxyToolbarProps) {
  const set = (patch: Partial<ProxyFilters>): void => onChange({ ...filters, ...patch });

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

        <CountryFilter proxies={proxies} value={filters.country} onChange={(country) => set({ country })} />

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

      <FilterChips filters={filters} proxies={proxies} onPatch={set} onReset={() => onChange(DEFAULT_PROXY_FILTERS)} />
    </div>
  );
}

export default ProxyToolbar;
