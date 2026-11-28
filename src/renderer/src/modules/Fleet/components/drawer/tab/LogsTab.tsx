import type { Device } from '../../../types';

interface LogsTabProps {
  device: Device;
}

export function LogsTab({}: LogsTabProps) {
  return (
    <div className="rounded-xl bg-card-background p-4">
      <div className="text-xs text-text-secondary">No logs</div>
    </div>
  );
}
