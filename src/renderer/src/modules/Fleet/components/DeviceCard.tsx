import { useState } from 'react';
import { Play, RotateCw, Terminal, MoreHorizontal, Globe, CalendarClock, Check } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Checkbox } from '@renderer/components/ui/Checkbox';
import { Tooltip } from '@renderer/components/ui/Tooltip';
import type { Device, DeviceGroup } from '../types';
import { DeviceTypeIcon } from './common/DeviceTypeIcon';
import { DeviceStatusBadge, TagChip } from './common/StatusBadge';
import { MeterRow } from './common/ProgressBar';
import { TONE_CLASS } from '../constants/tone';

interface DeviceCardProps {
  device: Device;
  group: DeviceGroup;
  checked: boolean;
  selected: boolean;
  onToggleCheck: () => void;
  onClick: () => void;
  onRun: () => void;
  onRestart: () => void;
  onShell: () => void;
}

const ICON_BTN =
  'flex h-7 w-7 items-center justify-center rounded-md bg-text-secondary/10 text-text-secondary transition-colors hover:bg-text-secondary/15 hover:text-text-primary';

export function DeviceCard({
  device,
  group,
  checked,
  selected,
  onToggleCheck,
  onClick,
  onRun,
  onRestart,
  onShell,
}: DeviceCardProps) {
  const offline = device.status === 'offline';

  return (
    <div
      onClick={onClick}
      className={cn(
        'cursor-pointer rounded-xl p-3.5 transition-colors',
        selected || checked ? 'bg-card-hover' : 'bg-card-background',
      )}
      style={{ opacity: offline ? 0.7 : 1 }}
    >
      <div className="flex items-start gap-3">
        <DeviceTypeIcon type={device.type} size={38} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] text-text-primary">{device.name}</div>
          <div className="truncate text-[11px] text-text-secondary">
            {device.os} · {device.location}
          </div>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={checked} onCheckedChange={onToggleCheck} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <DeviceStatusBadge status={device.status} />
        <span
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium"
          style={{
            background: `${group.color}20`,
            color: group.color,
          }}
        >
          {group.name}
        </span>
        {device.tags.map((t) => (
          <TagChip key={t} tag={t} />
        ))}
      </div>

      <div className="mt-2 text-[11px] text-text-secondary">
        {offline ? 'No heartbeat' : `Uptime ${device.uptime || '—'}`}
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        <MeterRow label="CPU" value={device.cpu} offline={offline} />
        <MeterRow label="RAM" value={device.ram} offline={offline} />
        <MeterRow label="Disk" value={device.disk} />
      </div>

      <div className="mt-3 flex items-center gap-2 truncate text-xs text-text-secondary">
        <Globe className="h-3.5 w-3.5 shrink-0 text-success" />
        <span className="truncate">{device.proxyId ? 'Proxy' : 'Direct'} · {device.ip}</span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] text-text-secondary">Heartbeat {device.lastSeen}</span>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Tooltip content="Run script" side="top">
            <button type="button" onClick={onRun} className={cn(ICON_BTN, 'bg-primary/10 text-primary')}>
              <Play className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
          <Tooltip content="Restart" side="top">
            <button type="button" onClick={onRestart} className={ICON_BTN}>
              <RotateCw className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
          <Tooltip content="Shell" side="top">
            <button type="button" onClick={onShell} className={ICON_BTN}>
              <Terminal className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
          <Tooltip content="More" side="top">
            <button type="button" className={ICON_BTN}>
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}