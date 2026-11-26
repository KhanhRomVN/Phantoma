import { useMemo, useState } from 'react';
import { ChevronDown, Globe } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from '@renderer/components/ui/Dropdown';
import { COUNTRY_NAME } from '../../../../shared/constants/proxy-meta.constants';
import type { Proxy } from '../../../../shared/types/proxy-domain.types';
import { flag } from '../../../../shared/utils/format';
import { ACTIVE_NEUTRAL, BTN } from './toolbar.styles';

interface CountryFilterProps {
  proxies: Proxy[];
  value: string;
  onChange: (country: string) => void;
}

export function CountryFilter({ proxies, value, onChange }: CountryFilterProps) {
  const [countryOpen, setCountryOpen] = useState(false);

  const countries = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of proxies) map.set(p.country, (map.get(p.country) ?? 0) + 1);
    return Array.from(map, ([code, count]) => ({ code, count })).sort((a, b) => b.count - a.count);
  }, [proxies]);

  return (
    <Dropdown open={countryOpen} onOpenChange={setCountryOpen} width={220}>
      <DropdownTrigger asChild>
        <button type='button' className={cn(BTN, value !== 'all' && ACTIVE_NEUTRAL)}>
          {value === 'all' ? (
            <Globe className='h-3.5 w-3.5' />
          ) : (
            <span className='text-[13px] leading-none'>{flag(value)}</span>
          )}
          {value === 'all' ? 'All countries' : (COUNTRY_NAME[value] ?? value)}
          <ChevronDown className='h-3 w-3 opacity-60' />
        </button>
      </DropdownTrigger>
      <DropdownContent>
        <DropdownItem onClick={() => onChange('all')}>All countries</DropdownItem>
        {countries.map((c) => (
          <DropdownItem key={c.code} onClick={() => onChange(c.code)}>
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
  );
}
