import type { Device } from '../../../types';

interface ScriptsTabProps {
  device: Device;
}

export function ScriptsTab({ device }: ScriptsTabProps) {
  return (
    <div className="rounded-xl bg-card-background p-4">
      <div className="text-xs text-text-secondary">No scripts available</div>
    </div>
  );
}