import type { Device, DeviceGroup } from '../../../types';

interface GroupTabProps {
  device: Device;
  group: DeviceGroup;
}

export function GroupTab({ group }: GroupTabProps) {
  return (
    <div className="rounded-xl bg-card-background p-4">
      <div className="text-base text-text-primary">{group.name}</div>
      <div className="mt-1 text-xs text-text-secondary">{group.description}</div>
    </div>
  );
}
