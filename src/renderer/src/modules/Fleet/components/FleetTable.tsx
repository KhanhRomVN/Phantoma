import { Play, RotateCw, Terminal, MoreHorizontal, Globe, Gauge } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Checkbox } from '@renderer/components/ui/Checkbox';
import { Tooltip } from '@renderer/components/ui/Tooltip';
import type { Device, DeviceGroup } from '../types';
import { DeviceTypeIcon } from './common/DeviceTypeIcon';
import { DeviceStatusBadge, TagChip } from './common/StatusBadge';
import { MeterRow } from './common/ProgressBar';

interface FleetTableProps {
  devices: Device[];
  groups: Record<string, DeviceGroup>;
  selectedId: string | null;
  checkedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggleCheck: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  onRun: (id: string) => void;
  onRestart: (id: string) => void;
  onShell: (id: string) => void;
}

const TH = [
  '',
  'Device',
  'Status',
  'Performance',
  'Network · Proxy',
  'Heartbeat',
  '',
];

const ICON_BTN =
  'flex h-7 w-7 items-center justify-center rounded-md bg-text-secondary/10 text-text-secondary transition-colors hover:bg-text-secondary/15 hover:text-text-primary';

export function FleetTable({
  devices,
  groups,
  selectedId,
  checkedIds,
  onSelect,
  onToggleCheck,
  onToggleAll,
  onRun,
  onRestart,
  onShell,
}: FleetTableProps) {
  const allChecked = devices.length > 0 && devices.every((d) => checkedIds.has(d.id));
  const someChecked = devices.some((d) => checkedIds.has(d.id));

  return (
    <div className="overflow-auto rounded-xl bg-card-background">
      <table className="w-full text-left" style={{ minWidth: 1200 }}>
        <thead>
          <tr>
            {TH.map((h, i) => (
              <th
                key={i}
                className="sticky top-0 z-10 bg-card-background px-3 py-2.5 text-[11px] font-normal text-text-secondary"
              >
                {i === 0 ? (
                  <Checkbox
                    checked={allChecked}
                    indeterminate={someChecked && !allChecked}
                    onCheckedChange={onToggleAll}
                  />
                ) : (
                  h
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {devices.map((device) => {
            const group = groups[device.groupId];
            const checked = checkedIds.has(device.id);
            const selected = selectedId === device.id;
            const offline = device.status === 'offline';

            return (
              <tr
                key={device.id}
                onClick={() => onSelect(device.id)}
                className={cn(
                  'cursor-pointer transition-colors',
                  selected || checked ? 'bg-primary/8' : 'hover:bg-table-row-hover',
                )}
                style={{ opacity: offline ? 0.65 : 1 }}
              >
                <td className="px-3 py-2.5">
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={checked} onCheckedChange={() => onToggleCheck(device.id)} />
                  </div>
                </td>

                <td className="px-3 py-2.5" style={{ minWidth: 230 }}>
                  <div className="flex items-center gap-2.5">
                    <DeviceTypeIcon type={device.type} size={38} />
                    <div className="min-w-0">
                      <div className="text-[13px] text-text-primary">{device.name}</div>
                      <div className="text-[11px] text-text-secondary">
                        {device.os} · {device.location}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span
                          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                          style={{ background: `${group?.color}20`, color: group?.color }}
                        >
                          {group?.name}
                        </span>
                        {device.tags.map((t) => (
                          <TagChip key={t} tag={t} />
                        ))}
                      </div>
                    </div>
                  </div>
                </td>

                <td className="px-3 py-2.5" style={{ minWidth: 150 }}>
                  <DeviceStatusBadge status={device.status} />
                  <div className="mt-1 text-[11px] text-text-secondary">
                    {offline ? 'No heartbeat' : `Uptime ${device.uptime || '—'}`}
                  </div>
                </td>

                <td className="px-3 py-2.5" style={{ width: 190 }}>
                  <div className="flex flex-col gap-1.5">
                    <MeterRow label="CPU" value={device.cpu} offline={offline} />
                    <MeterRow label="RAM" value={device.ram} offline={offline} />
                    <MeterRow label="Disk" value={device.disk} />
                  </div>
                </td>

                <td className="px-3 py-2.5" style={{ minWidth: 190 }}>
                  <div className="text-text-primary">{device.proxyId ? 'Proxy' : 'Direct'}</div>
                  <div className="text-[11px] text-text-secondary">{device.ip}</div>
                  <div className="mt-1 flex gap-1">
                    <span className="inline-flex items-center gap-1 rounded-md bg-text-secondary/10 px-1.5 py-0.5 text-[10px] text-text-secondary">
                      <Gauge className="h-2.5 w-2.5" />
                      {device.ping ? `${device.ping}ms` : '—'}
                    </span>
                  </div>
                </td>

                <td className="whitespace-nowrap px-3 py-2.5 text-text-secondary">{device.lastSeen}</td>

                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Tooltip content="Run script" side="top">
                      <button
                        type="button"
                        onClick={() => onRun(device.id)}
                        className={cn(ICON_BTN, 'bg-primary/10 text-primary')}
                      >
                        <Play className="h-3.5 w-3.5" />
                      </button>
                    </Tooltip>
                    <Tooltip content="Restart" side="top">
                      <button type="button" onClick={() => onRestart(device.id)} className={ICON_BTN}>
                        <RotateCw className="h-3.5 w-3.5" />
                      </button>
                    </Tooltip>
                    <Tooltip content="Shell" side="top">
                      <button type="button" onClick={() => onShell(device.id)} className={ICON_BTN}>
                        <Terminal className="h-3.5 w-3.5" />
                      </button>
                    </Tooltip>
                    <Tooltip content="More" side="top">
                      <button type="button" className={ICON_BTN}>
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </Tooltip>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}