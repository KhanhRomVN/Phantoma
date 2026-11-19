import { useState } from 'react';
import {
  Search,
  X,
  Download,
  Plus,
  LayoutGrid,
  List,
  Users,
  Smartphone,
  Laptop,
  Server,
  Layers,
} from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Button } from '@renderer/components/ui/Button';
import type { Device, DeviceGroup, DeviceStatus } from '../types';
import { DEVICE_STATUS } from '../constants/status';
import { DEVICE_KIND } from '../constants/device';

interface FleetToolPanelProps {
  devices: Device[];
  groups: DeviceGroup[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: string;
  onStatusFilterChange: (s: string) => void;
  groupFilter: string;
  onGroupFilterChange: (g: string) => void;
  kindFilter: string;
  onKindFilterChange: (k: string) => void;
  sortBy: string;
  onSortChange: (s: string) => void;
  viewMode: 'table' | 'grid';
  onViewModeChange: (v: 'table' | 'grid') => void;
  selectedIds: Set<string>;
  onClearSelection: () => void;
  onExport: () => void;
  onAgent: () => void;
  onAddDevice: () => void;
  onBulkRun: () => void;
  onBulkRestart: () => void;
  onBulkLock: () => void;
  onBulkMaintenance: () => void;
  onBulkProxy: () => void;
  onBulkMove: () => void;
}

const ICON_BTN_BASE =
  'flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-md transition-colors';
const ICON_BTN_IDLE =
  'bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/15 hover:text-text-primary';
const ICON_BTN_ACTIVE = 'bg-primary/18 text-primary';

export function FleetToolPanel({
  devices,
  groups,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  groupFilter,
  onGroupFilterChange,
  kindFilter,
  onKindFilterChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  selectedIds,
  onClearSelection,
  onExport,
  onAgent,
  onAddDevice,
  onBulkRun,
  onBulkRestart,
  onBulkLock,
  onBulkMaintenance,
  onBulkProxy,
  onBulkMove,
}: FleetToolPanelProps) {
  const hasSelection = selectedIds.size > 0;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <div className="flex h-8 flex-1 items-center gap-2 rounded-lg bg-card-background px-3">
          <Search className="h-3.5 w-3.5 text-text-secondary" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search name, IP, OS, location, tag…"
            className="w-full bg-transparent text-xs text-text-primary outline-none placeholder:text-text-secondary"
          />
          {searchQuery && (
            <button type="button" onClick={() => onSearchChange('')} className="cursor-pointer">
              <X className="h-3.5 w-3.5 text-text-secondary" />
            </button>
          )}
        </div>

        <select
          value={groupFilter}
          onChange={(e) => onGroupFilterChange(e.target.value)}
          className="h-8 rounded-lg bg-card-background px-2 text-xs text-text-primary outline-none"
        >
          <option value="all">All groups</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="h-8 rounded-lg bg-card-background px-2 text-xs text-text-primary outline-none"
        >
          <option value="default">Sort: Default</option>
          <option value="name">Name A → Z</option>
          <option value="cpu">CPU highest</option>
          <option value="ram">RAM highest</option>
          <option value="issue">Issues first</option>
        </select>

        <div className="flex gap-0.5 rounded-lg bg-card-background p-0.5">
          <button
            type="button"
            onClick={() => onViewModeChange('table')}
            className={cn(
              'flex h-7 w-7 cursor-pointer items-center justify-center rounded-md',
              viewMode === 'table' ? 'bg-primary/18 text-primary' : 'text-text-secondary',
            )}
          >
            <List className="h-[15px] w-[15px]" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('grid')}
            className={cn(
              'flex h-7 w-7 cursor-pointer items-center justify-center rounded-md',
              viewMode === 'grid' ? 'bg-primary/18 text-primary' : 'text-text-secondary',
            )}
          >
            <LayoutGrid className="h-[15px] w-[15px]" />
          </button>
        </div>

        <Button size="sm" className="h-8 bg-text-secondary/10 text-text-secondary" onClick={onExport}>
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
        <Button size="sm" className="h-8 bg-text-secondary/10 text-text-secondary" onClick={onAgent}>
          <Users className="h-3.5 w-3.5" />
          Agent
        </Button>
        <Button size="sm" className="h-8 bg-primary/10 text-primary" onClick={onAddDevice}>
          <Plus className="h-3.5 w-3.5" />
          Add device
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1.5 overflow-x-auto">
          {[['all', 'All', devices.length], ...Object.entries(DEVICE_STATUS).map(([k, v]) => [k, v.label, 0])].map(
            ([key, label, count]) => {
              const active = statusFilter === key;
              const color =
                key === 'all' ? 'rgb(var(--primary))' : `rgb(var(--${DEVICE_STATUS[key as DeviceStatus]?.tone || 'muted'}))`;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onStatusFilterChange(key)}
                  className="whitespace-nowrap rounded-lg px-2.5 py-1 text-xs transition-colors"
                  style={{
                    background: active ? `rgba(var(--${DEVICE_STATUS[key as DeviceStatus]?.tone || 'primary'}), 0.18)` : 'rgb(var(--card-background))',
                    color: active ? color : 'rgb(var(--text-secondary))',
                  }}
                >
                  {label} <span style={{ opacity: 0.7 }}>{count}</span>
                </button>
              );
            },
          )}
        </div>

        {hasSelection ? (
          <div className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary/10 px-2 py-1">
            <span className="text-xs text-text-primary">Selected {selectedIds.size}</span>
            <Button size="sm" className="h-7 bg-primary/10 text-primary" onClick={onBulkRun}>
              Run
            </Button>
            <Button size="sm" className="h-7 bg-text-secondary/10 text-text-secondary" onClick={onBulkRestart}>
              Restart
            </Button>
            <Button size="sm" className="h-7 bg-text-secondary/10 text-text-secondary" onClick={onBulkLock}>
              Lock
            </Button>
            <Button size="sm" className="h-7 bg-text-secondary/10 text-text-secondary" onClick={onBulkMaintenance}>
              Maintenance
            </Button>
            <Button size="sm" className="h-7 bg-text-secondary/10 text-text-secondary" onClick={onBulkProxy}>
              Proxy
            </Button>
            <Button size="sm" className="h-7 bg-text-secondary/10 text-text-secondary" onClick={onBulkMove}>
              Move
            </Button>
            <button
              type="button"
              className="cursor-pointer text-xs text-text-secondary"
              onClick={onClearSelection}
            >
              Clear
            </button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-3">
            <div className="flex gap-0.5 rounded-lg bg-card-background p-0.5">
              {[
                ['all', 'All', Layers],
                ['mobile', 'Mobile', Smartphone],
                ['desktop', 'Desktop', Laptop],
                ['vps', 'VPS', Server],
              ].map(([key, label, Icon]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onKindFilterChange(key)}
                  className={cn(
                    'flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors',
                    kindFilter === key
                      ? 'bg-primary/18 text-primary'
                      : 'bg-transparent text-text-secondary',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
            <span className="text-xs text-text-secondary">
              {devices.length}/{devices.length} devices
            </span>
          </div>
        )}
      </div>
    </div>
  );
}