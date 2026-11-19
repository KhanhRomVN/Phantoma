import { cn } from '@renderer/utils/cn';
import type { DeviceType } from '../../types';
import { DEVICE_TYPE } from '../../constants/device';
import { TONE_CLASS } from '../../constants/tone';

interface DeviceTypeIconProps {
  type: DeviceType;
  size?: number;
}

export function DeviceTypeIcon({ type, size = 34 }: DeviceTypeIconProps) {
  const t = DEVICE_TYPE[type];
  const Icon = t.icon;
  return (
    <div
      className={cn('flex shrink-0 items-center justify-center rounded-lg', TONE_CLASS[t.color].icon)}
      style={{ width: size, height: size }}
    >
      <Icon style={{ width: size * 0.5, height: size * 0.5 }} />
    </div>
  );
}