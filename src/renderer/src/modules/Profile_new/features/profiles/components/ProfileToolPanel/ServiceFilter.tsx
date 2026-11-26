import { useMemo, useState } from 'react';
import { Ban, Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from '@renderer/components/ui/Dropdown';
import type { Profile } from '../../../../shared/types';
import { useProfileViewStore } from '../../stores/profile-view.store';
import { ServiceIcon } from '../../../services';
import type { ServiceMode } from '../../../queries';

export function ServiceFilter({
  profiles,
  value,
  onChange,
}: {
  profiles: Profile[];
  value: Record<string, ServiceMode>;
  onChange: (next: Record<string, ServiceMode>) => void;
}) {
  const recent = useProfileViewStore((s) => s.recentServices);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const names = Object.keys(value);
  const active = names.length > 0;

  const options = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of profiles) {
      for (const name of new Set(p.services.map((s) => s.name))) {
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
    const rank = (n: string): number => {
      const i = recent.indexOf(n);
      return i < 0 ? Infinity : i;
    };
    return Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) => {
      const ra = rank(a.name);
      const rb = rank(b.name);
      if (ra !== rb) return ra < rb ? -1 : 1;
      return b.count - a.count || a.name.localeCompare(b.name);
    });
  }, [profiles, recent]);

  const shown = useMemo(() => {
    const k = q.trim().toLowerCase();
    return k ? options.filter((o) => o.name.toLowerCase().includes(k)) : options;
  }, [options, q]);

  const remove = (name: string): void => {
    const rest = { ...value };
    delete rest[name];
    onChange(rest);
  };

  const pick = (name: string): void => {
    const mode = value[name];
    if (mode === 'exclude') return remove(name);
    onChange({ ...value, [name]: mode === 'include' ? 'exclude' : 'include' });
    if (!mode) {
      useProfileViewStore
        .getState()
        .setView({ recentServices: [name, ...recent.filter((n) => n !== name)].slice(0, 20) });
    }
  };

  return (
    <Dropdown
      align="end"
      width={260}
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQ('');
      }}
    >
      <DropdownTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            active
              ? 'bg-primary/10 text-primary hover:bg-primary/20'
              : 'bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/15 hover:text-text-primary',
          )}
        >
          <ServiceIcon name={names.length === 1 ? names[0] : ''} size={12} />
          {active ? (names.length === 1 ? names[0] : `${names.length} services`) : 'All services'}
          {active ? (
            <span
              role="button"
              aria-label="Clear services"
              className="flex h-4 w-4 items-center justify-center rounded-sm hover:bg-primary/20"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange({});
              }}
            >
              <X className="h-3 w-3" />
            </span>
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </button>
      </DropdownTrigger>
      <DropdownContent>
        <div className="flex flex-col gap-1 p-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              value={q}
              autoFocus
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Search service..."
              className="w-full rounded-md border border-transparent bg-input-background py-1.5 pl-8 pr-2 text-xs text-text-primary outline-none placeholder:text-text-secondary/60"
            />
          </div>
          <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
            {shown.length === 0 && (
              <div className="px-3 py-3 text-center text-xs text-text-secondary">
                No linked services
              </div>
            )}
            {shown.map((o) => {
              const mode = value[o.name];
              return (
                <DropdownItem
                  key={o.name}
                  closeOnSelect={false}
                  onClick={() => pick(o.name)}
                  className={cn(mode === 'include' && 'bg-primary/10', mode === 'exclude' && 'bg-error/10')}
                >
                  <span className="flex w-full items-center gap-2">
                    <ServiceIcon name={o.name} size={14} />
                    <span className="min-w-0 flex-1 truncate text-xs">{o.name}</span>
                    {mode === 'include' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary">
                        <Check className="h-3 w-3" />
                        Has
                      </span>
                    )}
                    {mode === 'exclude' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-error">
                        <Ban className="h-3 w-3" />
                        Without
                      </span>
                    )}
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-md bg-text-secondary/10 px-1 text-[10px] tabular-nums text-text-secondary">
                      {o.count}
                    </span>
                    {mode && (
                      <span
                        role="button"
                        aria-label={`Clear ${o.name}`}
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-text-secondary hover:bg-text-secondary/20 hover:text-text-primary"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          remove(o.name);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </span>
                    )}
                  </span>
                </DropdownItem>
              );
            })}
          </div>
        </div>
      </DropdownContent>
    </Dropdown>
  );
}
