import { Cpu, MemoryStick, HardDrive, Tag } from 'lucide-react';
import type { Device } from '../../../types';
import { MeterRow } from '../../common/ProgressBar';

interface OverviewTabProps {
  device: Device;
}

function Card({ title, icon: Icon, children }: { title: string; icon: typeof Tag; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-card-background">
      <div className="flex items-center gap-2 px-4 pb-2.5 pt-3.5 text-[13px] text-text-primary">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </div>
      <div className="px-4 pb-4">{children}</div>
    </div>
  );
}

export function OverviewTab({ device }: OverviewTabProps) {
  const offline = device.status === 'offline';

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        {[
          ['CPU', device.cpu, Cpu],
          ['RAM', device.ram, MemoryStick],
          ['Disk', device.disk, HardDrive],
        ].map(([label, value, Icon]) => (
          <div key={label as string} className="rounded-xl bg-card-background p-3">
            <div className="flex items-center gap-1.5 text-xs text-text-secondary">
              <Icon className="h-3.5 w-3.5" />
              {label}
            </div>
            <div className="mt-1 text-xl text-text-primary">{value}%</div>
          </div>
        ))}
      </div>

      <Card title="Performance" icon={Cpu}>
        <div className="flex flex-col gap-1.5">
          <MeterRow label="CPU" value={device.cpu} offline={offline} />
          <MeterRow label="RAM" value={device.ram} offline={offline} />
          <MeterRow label="Disk" value={device.disk} />
        </div>
      </Card>

      <Card title="Information" icon={Tag}>
        <div className="grid grid-cols-2 gap-y-2 text-[13px]">
          {[
            ['Type', device.type],
            ['Group', 'Group name'],
            ['Battery', device.battery ? `${device.battery}%` : 'AC'],
            ['Heartbeat', device.lastSeen],
          ].map(([key, value]) => (
            <div key={key}>
              <div className="text-text-secondary">{key}</div>
              <div className="text-text-primary">{value}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}