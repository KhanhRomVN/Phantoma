import { useState } from 'react';
import {
  X,
  ChevronRight,
  Play,
  RotateCw,
  Terminal,
  Upload,
  Lock,
  Radio,
  Power,
  Gauge,
  FolderTree,
  FileCode2,
  CalendarClock,
  Globe,
  ScrollText,
  Activity,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Button } from '@renderer/components/ui/Button';
import type { Device, DeviceGroup } from '../../types';
import { DeviceTypeIcon } from '../common/DeviceTypeIcon';
import { DeviceStatusBadge } from '../common/StatusBadge';
import { OverviewTab } from './tab/OverviewTab';
import { GroupTab } from './tab/GroupTab';
import { ScriptsTab } from './tab/ScriptsTab';
import { SchedulesTab } from './tab/SchedulesTab';
import { ProxyTab } from './tab/ProxyTab';
import { LogsTab } from './tab/LogsTab';
import { ActivityTab } from './tab/ActivityTab';

type TabId = 'overview' | 'group' | 'scripts' | 'schedules' | 'proxy' | 'logs' | 'activity';

interface DeviceDrawerProps {
  device: Device;
  group: DeviceGroup;
  onClose: () => void;
}

const SOFT_BTN =
  'h-8 shrink-0 rounded-md bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/15';
const PRIMARY_BTN = 'h-8 rounded-md bg-primary/10 text-primary hover:bg-primary/20';
const DANGER_BTN = 'h-8 rounded-md bg-error/10 text-error hover:bg-error/20';

const TABS: Array<{ id: TabId; label: string; icon: LucideIcon }> = [
  { id: 'overview', label: 'Overview', icon: Gauge },
  { id: 'group', label: 'Group', icon: FolderTree },
  { id: 'scripts', label: 'Scripts', icon: FileCode2 },
  { id: 'schedules', label: 'Schedules', icon: CalendarClock },
  { id: 'proxy', label: 'Proxy', icon: Globe },
  { id: 'logs', label: 'Logs', icon: ScrollText },
  { id: 'activity', label: 'Activity', icon: Activity },
];

export function DeviceDrawer({ device, group, onClose }: DeviceDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  return (
    <aside className="fixed right-0 top-0 z-20 flex h-full w-full max-w-[600px] flex-col overflow-hidden bg-panel-background">
      <div className="flex items-center justify-between px-5 py-3 text-xs text-text-secondary">
        <span>
          Fleet <ChevronRight className="inline h-3 w-3" /> {group.name}{' '}
          <ChevronRight className="inline h-3 w-3" />{' '}
          <span className="text-text-primary">{device.name}</span>
        </span>
        <button type="button" onClick={onClose} className="cursor-pointer">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-5">
        <div className="flex items-center gap-3">
          <DeviceTypeIcon type={device.type} size={44} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-base text-text-primary">
              {device.name}
              <DeviceStatusBadge status={device.status} />
            </div>
            <div className="text-xs text-text-secondary">
              {device.os} · {device.location} · {device.ip}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button className={PRIMARY_BTN}>
            <Play className="h-3.5 w-3.5" />
            Run script
          </Button>
          <Button className={SOFT_BTN}>
            <RotateCw className="h-3.5 w-3.5" />
            Restart
          </Button>
          <Button className={SOFT_BTN}>
            <Terminal className="h-3.5 w-3.5" />
            Shell
          </Button>
          <Button className={SOFT_BTN}>
            <Upload className="h-3.5 w-3.5" />
            Upload
          </Button>
          <Button className={SOFT_BTN}>
            {device.status === 'locked' ? (
              <Radio className="h-3.5 w-3.5" />
            ) : (
              <Lock className="h-3.5 w-3.5" />
            )}
            {device.status === 'locked' ? 'Unlock' : 'Lock'}
          </Button>
          <Button className={DANGER_BTN}>
            <Power className="h-3.5 w-3.5" />
            Shutdown
          </Button>
        </div>

        <div className="mt-4 flex gap-1 overflow-x-auto rounded-xl bg-card-background p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs transition-colors',
                  activeTab === tab.id
                    ? 'bg-primary/16 text-primary'
                    : 'bg-transparent text-text-secondary',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {activeTab === 'overview' && <OverviewTab device={device} />}
        {activeTab === 'group' && <GroupTab device={device} group={group} />}
        {activeTab === 'scripts' && <ScriptsTab device={device} />}
        {activeTab === 'schedules' && <SchedulesTab device={device} />}
        {activeTab === 'proxy' && <ProxyTab device={device} />}
        {activeTab === 'logs' && <LogsTab device={device} />}
        {activeTab === 'activity' && <ActivityTab device={device} />}
      </div>
    </aside>
  );
}
