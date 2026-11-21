import type { Device } from '../../../types';

interface ActivityTabProps {
  device: Device;
}

export function ActivityTab({ device }: ActivityTabProps) {
  return (
    <div className="rounded-xl bg-card-background p-4">
      <div className="text-xs text-text-secondary">No activity</div>
    </div>
  );
}