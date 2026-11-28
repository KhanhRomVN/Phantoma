import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from '@renderer/components/ui/Dropdown';
import { INPUT } from './form.styles';

export interface Option {
  value: string;
  label: string;
  prefix?: ReactNode;
}

export function Select({
  value,
  options,
  onChange,
  searchable,
}: {
  value: string;
  options: Option[];
  onChange: (v: string) => void;
  searchable?: boolean;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <Dropdown searchable={searchable}>
      <DropdownTrigger asChild>
        <button
          type="button"
          className={cn(
            INPUT,
            'flex items-center justify-between gap-2 text-left hover:bg-text-secondary/15',
          )}
        >
          <span className="flex min-w-0 items-center gap-2 truncate">
            {current?.prefix}
            <span className="truncate">{current?.label}</span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
        </button>
      </DropdownTrigger>
      <DropdownContent className="max-h-[240px] overflow-y-auto">
        {options.map((o) => (
          <DropdownItem
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(o.value === value && 'bg-text-secondary/10')}
          >
            {o.prefix}
            {o.label}
          </DropdownItem>
        ))}
      </DropdownContent>
    </Dropdown>
  );
}
