import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Ban,
  Check,
  ChevronDown,
  CloudOff,
  Download,
  Layers,
  MoreHorizontal,
  Plus,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import { cn } from '@renderer/utils/cn';

import { Tooltip } from '@renderer/components/ui/Tooltip';
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
} from '@renderer/components/ui/Dropdown';
import type { Profile } from '../types';
import { useProfileViewStore } from '../stores/useProfileViewStore';
import { ServiceIcon } from './common/StatusBadge';
import { DEFAULT_QUICK_FILTERS, isQuickFilterDirty } from '../utils/filter';
import type { QuickFilters, ServiceMode } from '../utils/filter';

import { PROFILE_STATUS, PROFILE_STATUS_ORDER } from '../constants/status';
import { TONE_CLASS } from '../constants/tone';
import type { Tone } from '../types/ui.types';

export interface GroupOption {
  name: string;
  purpose: string;
  count: number;
}

interface ProfileToolPanelProps {
  filters: QuickFilters;
  groups: GroupOption[];
  onChange: (next: QuickFilters) => void;
  profiles: Profile[];
  onImport: () => void;
  onAddProfile: () => void;
}

const ACTIVE_NEUTRAL = 'bg-text-secondary/25 text-text-primary';
const ICON_BTN =
  'relative flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-md transition-colors';
const ICON_IDLE =
  'bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/15 hover:text-text-primary';

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
      type="button"
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

function GroupCard({
  name,
  purpose,
  count,
  selected,
  onClick,
}: {
  name: string;
  purpose: string;
  count: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <DropdownItem
      noPadding
      onClick={onClick}
      className={cn(
        'items-start gap-2.5 px-2.5 py-2',
        selected ? 'bg-text-secondary/15' : 'bg-text-secondary/5',
      )}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-text-secondary/10 text-text-secondary">
        <Layers className="h-3.5 w-3.5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 whitespace-normal">
        <span className="flex items-center justify-between gap-2 text-xs font-medium text-text-primary">
          {name}
          <span className="text-[10px] tabular-nums text-text-secondary">{count}</span>
        </span>
        <span className="text-[11px] leading-snug text-text-secondary">{purpose}</span>
      </span>
    </DropdownItem>
  );
}

function ServiceFilter({
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

export function ProfileToolPanel({
  filters,
  groups,
  onChange,
  profiles,
  onImport,
  onAddProfile,
}: ProfileToolPanelProps) {
  const set = (patch: Partial<QuickFilters>): void => onChange({ ...filters, ...patch });
  const dirty = isQuickFilterDirty(filters);
  const groupActive = filters.group !== 'all';
  const totalInGroups = groups.reduce((sum, g) => sum + g.count, 0);
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Search by email, name, phone, group, service..."
            className="w-full rounded-lg border border-transparent bg-input-background py-1.5 pl-9 pr-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-secondary/60"
          />
        </div>

        <Dropdown align="end" width={150}>
          <DropdownTrigger asChild>
            <button
              type="button"
              title="More"
              aria-label="More actions"
              className={cn(ICON_BTN, ICON_IDLE)}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownTrigger>
          <DropdownContent>
            <DropdownItem icon={<Download className="h-3.5 w-3.5" />} onClick={onImport}>
              Import
            </DropdownItem>
          </DropdownContent>
        </Dropdown>

        <Tooltip content="Add profile" side="bottom">
          <button
            type="button"
            aria-label="Add profile"
            onClick={onAddProfile}
            className={cn(
              ICON_BTN,
              'bg-gradient-to-br from-primary to-info text-white shadow-md shadow-primary/30 hover:brightness-110 active:brightness-95',
            )}
          >
            <Plus className="h-4 w-4" />
          </button>
        </Tooltip>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Chip active={filters.status === 'all'} onClick={() => set({ status: 'all' })}>
          All
        </Chip>
        {PROFILE_STATUS_ORDER.map((s) => (
          <Chip
            key={s}
            active={filters.status === s}
            tone={PROFILE_STATUS[s].tone}
            onClick={() => set({ status: s })}
          >
            {PROFILE_STATUS[s].label}
          </Chip>
        ))}
        <span className="mx-1 h-4 w-px bg-border" />
        <Chip
          active={filters.onlyUnsynced}
          tone="warn"
          onClick={() => set({ onlyUnsynced: !filters.onlyUnsynced })}
        >
          <CloudOff className="h-3 w-3" />
          Not synced
        </Chip>
        <Chip
          active={filters.onlyLowSecurity}
          tone="info"
          onClick={() => set({ onlyLowSecurity: !filters.onlyLowSecurity })}
        >
          <ShieldAlert className="h-3 w-3" />
          Low security
        </Chip>
        <Chip
          active={filters.onlyBannedService}
          tone="error"
          onClick={() => set({ onlyBannedService: !filters.onlyBannedService })}
        >
          <Ban className="h-3 w-3" />
          Banned service
        </Chip>
        {dirty && (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_QUICK_FILTERS)}
            className="animate-in fade-in-0 zoom-in-95 duration-150 ml-1 inline-flex items-center gap-1 rounded-md bg-text-secondary/10 px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-text-secondary/15 hover:text-text-primary"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          <ServiceFilter
            profiles={profiles}
            value={filters.services}
            onChange={(services) => set({ services })}
          />
          <Dropdown align="end" width={300}>
            <DropdownTrigger asChild>
              <button
                type="button"
                className={cn(
                  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  groupActive
                    ? ACTIVE_NEUTRAL
                    : 'bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/15 hover:text-text-primary',
                )}
              >
                <Layers className="h-3 w-3" />
                {groupActive ? filters.group : 'All groups'}
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownTrigger>
            <DropdownContent>
              <div className="flex flex-col gap-1 p-1">
                <GroupCard
                  name="All groups"
                  purpose="Show profiles from every group"
                  count={totalInGroups}
                  selected={!groupActive}
                  onClick={() => set({ group: 'all' })}
                />
                {groups.map((g) => (
                  <GroupCard
                    key={g.name}
                    name={g.name}
                    purpose={g.purpose}
                    count={g.count}
                    selected={filters.group === g.name}
                    onClick={() => set({ group: g.name })}
                  />
                ))}
              </div>
            </DropdownContent>
          </Dropdown>
        </div>
      </div>
    </div>
  );
}

export default ProfileToolPanel;
