import { ChevronDown } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from '@renderer/components/ui/Dropdown';
import { COUNTRY_BADGE_LIMIT } from '../../../../constants/proxy';
import type { CountryStat } from '../../../../types';
import { flagEmoji } from '../../../../utils/proxy';

interface CountryBadgesProps {
  countries: CountryStat[];
  value: string;
  onToggle: (code: string) => void;
}

export function CountryBadges({ countries, value, onToggle }: CountryBadgesProps) {
  const visible = countries.slice(0, COUNTRY_BADGE_LIMIT);
  const rest = countries.slice(COUNTRY_BADGE_LIMIT);
  const restActive = rest.some((c) => c.code === value);

  return (
    <>
      {visible.map((c) => {
        const active = c.code === value;
        return (
          <button
            key={c.code}
            type='button'
            title={`${c.name} · ${c.count} proxies`}
            onClick={() => onToggle(c.code)}
            className={cn(
              'flex h-6 items-center gap-1.5 rounded-md px-2 text-[11px] transition-colors',
              active ? 'bg-primary/10 text-primary' : 'bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/15 hover:text-text-primary',
            )}
          >
            <span className='text-xs leading-none'>{flagEmoji(c.code)}</span>
            {c.name}
            <span className='tabular-nums opacity-60'>{c.count}</span>
          </button>
        );
      })}
      {rest.length > 0 && (
        <Dropdown align='end' side='bottom' sideOffset={6}>
          <DropdownTrigger asChild>
            <button
              type='button'
              className={cn(
                'flex h-6 items-center gap-1 rounded-md px-2 text-[11px] transition-colors',
                restActive ? 'bg-primary/10 text-primary' : 'bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/15 hover:text-text-primary',
              )}
            >
              +{rest.length} more
              <ChevronDown className='h-3 w-3' />
            </button>
          </DropdownTrigger>
          <DropdownContent className='max-h-[240px] overflow-y-auto'>
            {rest.map((c) => (
              <DropdownItem
                key={c.code}
                icon={<span className='text-sm leading-none'>{flagEmoji(c.code)}</span>}
                className={cn(c.code === value && 'text-primary')}
                onClick={() => onToggle(c.code)}
              >
                <span className='flex-1'>{c.name}</span>
                <span className='text-[11px] tabular-nums text-text-secondary'>{c.count}</span>
              </DropdownItem>
            ))}
          </DropdownContent>
        </Dropdown>
      )}
    </>
  );
}