import {
  Ban,
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
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from '@renderer/components/ui/Dropdown';
import { DEFAULT_QUICK_FILTERS, isQuickFilterDirty } from '../../../queries';
import type { QuickFilters } from '../../../queries';
import { PROFILE_STATUS, PROFILE_STATUS_ORDER } from '../../constants/profile-status.constants';
import { ProfileToolPanelProps } from './profile-tool-panel.types';
import { ACTIVE_NEUTRAL, ICON_BTN, ICON_IDLE } from './profile-tool-panel.constants';
import { Chip } from './Chip';
import { GroupCard } from './GroupCard';
import { ServiceFilter } from './ServiceFilter';

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
