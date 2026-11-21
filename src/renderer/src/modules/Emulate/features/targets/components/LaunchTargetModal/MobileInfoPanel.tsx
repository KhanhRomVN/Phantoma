/**
 * Cột phải của LaunchTargetModal cho target Mobile: thông tin thiết bị
 * đang chọn và thông tin target.
 */

import { Smartphone, SmartphoneNfc } from 'lucide-react';

import { CenteredState } from '@renderer/components/common/LaunchConfig/detail/CenteredState';
import { DetailCard, KV } from '@renderer/components/common/LaunchConfig/detail/DetailBits';

import type { TargetTab } from '@renderer/modules/Emulate/shared/types/target.types';
import type { DeviceItem } from './TargetPanel';

interface MobileInfoPanelProps {
  target: TargetTab;
  device: DeviceItem | undefined;
}

export function MobileInfoPanel({ target, device }: MobileInfoPanelProps) {
  return (
    <>
      <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-semibold text-text-primary">Details</span>
          <span className="truncate text-[11px] text-text-secondary">{device?.name ?? 'No device selected'}</span>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        {device ? (
          <>
            <DetailCard title="Device" icon={Smartphone} tone="success">
              <KV label="Name" value={device.name} />
              <KV label="Serial" value={device.serial} mono copy />
              <KV label="Connection" value={device.type === 'physical' ? 'USB' : 'Virtual machine'} />
            </DetailCard>
            <DetailCard title="Target" icon={SmartphoneNfc} tone="info">
              <KV label="Name" value={target.title} />
              <KV label="Bound serial" value={target.emulatorSerial ?? ''} mono copy />
            </DetailCard>
          </>
        ) : (
          <CenteredState
            icon={Smartphone}
            title="No device"
            text="Connect a device or start a Genymotion VM to see its details here."
          />
        )}
      </div>
    </>
  );
}

export default MobileInfoPanel;