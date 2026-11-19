import { useState, useMemo } from 'react';
import type { Device, DeviceGroup, DeviceStatus } from '../types';
import { FleetHeroSection } from './FleetHeroSection';
import { FleetToolPanel } from './FleetToolPanel';
import { FleetTable } from './FleetTable';
import { DeviceCard } from './DeviceCard';
import { DeviceDrawer } from './drawer/DeviceDrawer';
import { MOCK_DEVICES, MOCK_GROUPS } from '../mock/mockData';

type ViewMode = 'table' | 'grid';

export function Fleet() {
  const [devices] = useState<Device[]>(MOCK_DEVICES);
  const [groups] = useState<DeviceGroup[]>(MOCK_GROUPS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [kindFilter, setKindFilter] = useState('all');
  const [sortBy, setSortBy] = useState('default');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const groupsMap = useMemo(() => {
    const map: Record<string, DeviceGroup> = {};
    groups.forEach((g) => {
      map[g.id] = g;
    });
    return map;
  }, [groups]);

  const filteredDevices = useMemo(() => {
    let result = devices;

    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        result = result.filter((d) => d.status !== 'offline');
      } else if (statusFilter === 'attention') {
        result = result.filter((d) => d.status === 'error' || d.status === 'locked');
      } else {
        result = result.filter((d) => d.status === statusFilter);
      }
    }

    if (groupFilter !== 'all') {
      result = result.filter((d) => d.groupId === groupFilter);
    }

    if (kindFilter !== 'all') {
      const kinds: Record<string, string[]> = {
        mobile: ['android', 'ios'],
        desktop: ['windows', 'macos', 'linux'],
        vps: ['vps'],
      };
      result = result.filter((d) => kinds[kindFilter]?.includes(d.type));
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((d) =>
        [d.name, d.ip, d.os, d.location, ...d.tags].some((s) => s.toLowerCase().includes(q)),
      );
    }

    if (sortBy === 'name') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'cpu') {
      result = [...result].sort((a, b) => b.cpu - a.cpu);
    } else if (sortBy === 'ram') {
      result = [...result].sort((a, b) => b.ram - a.ram);
    }

    return result;
  }, [devices, statusFilter, groupFilter, kindFilter, searchQuery, sortBy]);

  const handleToggleCheck = (id: string) => {
    const next = new Set(checkedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setCheckedIds(next);
  };

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      setCheckedIds(new Set(filteredDevices.map((d) => d.id)));
    } else {
      setCheckedIds(new Set());
    }
  };

  const selectedDevice = selectedId ? devices.find((d) => d.id === selectedId) : null;

  return (
    <div className="flex h-full flex-col gap-2.5 overflow-hidden bg-background p-3">
      <FleetHeroSection
        devices={devices}
        activeFilter={statusFilter}
        onFilterClick={setStatusFilter}
      />

      <FleetToolPanel
        devices={devices}
        groups={groups}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        groupFilter={groupFilter}
        onGroupFilterChange={setGroupFilter}
        kindFilter={kindFilter}
        onKindFilterChange={setKindFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        selectedIds={checkedIds}
        onClearSelection={() => setCheckedIds(new Set())}
        onExport={() => {}}
        onAgent={() => {}}
        onAddDevice={() => {}}
        onBulkRun={() => {}}
        onBulkRestart={() => {}}
        onBulkLock={() => {}}
        onBulkMaintenance={() => {}}
        onBulkProxy={() => {}}
        onBulkMove={() => {}}
      />

      <div className="flex-1 overflow-auto">
        {viewMode === 'table' ? (
          <FleetTable
            devices={filteredDevices}
            groups={groupsMap}
            selectedId={selectedId}
            checkedIds={checkedIds}
            onSelect={setSelectedId}
            onToggleCheck={handleToggleCheck}
            onToggleAll={handleToggleAll}
            onRun={() => {}}
            onRestart={() => {}}
            onShell={() => {}}
          />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
            {filteredDevices.map((device) => (
              <DeviceCard
                key={device.id}
                device={device}
                group={groupsMap[device.groupId]}
                checked={checkedIds.has(device.id)}
                selected={selectedId === device.id}
                onToggleCheck={() => handleToggleCheck(device.id)}
                onClick={() => setSelectedId(device.id)}
                onRun={() => {}}
                onRestart={() => {}}
                onShell={() => {}}
              />
            ))}
          </div>
        )}
      </div>

      {selectedDevice && (
        <DeviceDrawer
          device={selectedDevice}
          group={groupsMap[selectedDevice.groupId]}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}