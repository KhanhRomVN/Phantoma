import { Radio, Wifi, Loader2, AlertTriangle, WifiOff, Layers } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import type { Device, DeviceStatus } from '../types';
import { TONE_CLASS } from '../constants/tone';
import { DEVICE_KIND } from '../constants/device';

interface FleetHeroSectionProps {
  devices: Device[];
  activeFilter: string;
  onFilterClick: (filter: string) => void;
}

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  color: string;
  description: string;
  filterKey: string;
  active: boolean;
  onClick: () => void;
}

function StatCard({ icon: Icon, label, value, color, description, active, onClick }: StatCardProps) {
  const iconBg = active ? color : `rgba(${color.match(/\d+/g)?.slice(0, 3).join(',')}, 0.14)`;
  const textColor = active ? color : 'rgb(var(--text-primary))';
  const bgColor = active ? `rgba(${color.match(/\d+/g)?.slice(0, 3).join(',')}, 0.14)` : 'transparent';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex min-w-0 cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1 text-left transition-colors"
      style={{ background: bgColor }}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors"
        style={{
          background: active ? color : iconBg,
          color: active ? 'rgb(var(--background))' : color,
        }}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[17px] leading-tight" style={{ color: active ? color : textColor }}>
            {value}
          </span>
          <span className="truncate text-xs text-text-secondary">{label}</span>
        </div>
        <div
          className="truncate text-[11px]"
          style={{ color: active ? `rgba(${color.match(/\d+/g)?.slice(0, 3).join(',')}, 0.85)` : 'rgb(var(--text-secondary) / 0.7)' }}
        >
          {description}
        </div>
      </div>
    </button>
  );
}

export function FleetHeroSection({ devices, activeFilter, onFilterClick }: FleetHeroSectionProps) {
  const counts: Record<DeviceStatus, number> = {
    online: 0,
    busy: 0,
    idle: 0,
    updating: 0,
    offline: 0,
    error: 0,
    locked: 0,
    maintenance: 0,
  };
  devices.forEach((d) => {
    counts[d.status] = (counts[d.status] || 0) + 1;
  });

  const onlineCount = devices.filter((d) => d.status !== 'offline').length;
  const mobileCount = devices.filter((d) => DEVICE_KIND.mobile.includes(d.type)).length;
  const desktopCount = devices.filter((d) => DEVICE_KIND.desktop.includes(d.type)).length;
  const vpsCount = devices.filter((d) => DEVICE_KIND.vps.includes(d.type)).length;

  const stats: Array<{
    icon: LucideIcon;
    label: string;
    value: number;
    color: string;
    description: string;
    key: string;
  }> = [
    {
      icon: Layers,
      label: 'Total devices',
      value: devices.length,
      color: 'rgb(var(--primary))',
      description: `${mobileCount} mobile · ${desktopCount} desktop · ${vpsCount} VPS`,
      key: 'all',
    },
    {
      icon: Wifi,
      label: 'Active',
      value: onlineCount,
      color: 'rgb(var(--success))',
      description: `${Math.round((onlineCount / devices.length) * 100)}% devices connected`,
      key: 'active',
    },
    {
      icon: Loader2,
      label: 'Running',
      value: counts.busy || 0,
      color: 'rgb(var(--info))',
      description: `${counts.busy || 0} scripts running`,
      key: 'busy',
    },
    {
      icon: AlertTriangle,
      label: 'Issues',
      value: (counts.error || 0) + (counts.locked || 0),
      color: 'rgb(var(--error))',
      description: `${counts.error || 0} errors · ${counts.locked || 0} locked`,
      key: 'attention',
    },
    {
      icon: WifiOff,
      label: 'Offline',
      value: counts.offline || 0,
      color: 'rgb(var(--text-secondary))',
      description: `${counts.maintenance || 0} maintenance · no heartbeat > 1h`,
      key: 'offline',
    },
  ];

  return (
    <div className="grid grid-cols-[minmax(230px,0.7fr)_minmax(0,2.3fr)] items-center gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ background: 'rgba(var(--primary), 0.16)', color: 'rgb(var(--primary))' }}
        >
          <Radio className="h-[18px] w-[18px]" />
        </div>
        <div className="min-w-0">
          <div className="text-base leading-tight text-text-primary">Fleet</div>
          <div className="truncate text-xs text-text-secondary">
            Manage mobile, desktop/laptop and VPS remotely
          </div>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-1">
        {stats.map((stat) => (
          <StatCard
            key={stat.key}
            {...stat}
            filterKey={stat.key}
            active={activeFilter === stat.key}
            onClick={() => onFilterClick(stat.key)}
          />
        ))}
      </div>
    </div>
  );
}