import type { Device } from '../../../types';

interface SchedulesTabProps {
  device: Device;
}

export function SchedulesTab({ device }: SchedulesTabProps) {
  return (
    <div className="rounded-xl bg-card-background p-4">
      <div className="text-xs text-text-secondary">No schedules</div>
    </div>
  );
}