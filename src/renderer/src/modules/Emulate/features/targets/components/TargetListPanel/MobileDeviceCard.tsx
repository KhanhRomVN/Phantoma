/**
 * Card thiết bị mobile đang chạy trong sidebar. Chuột phải để Connect /
 * Disconnect; khi connect, Log viewer sẽ bắt logcat của thiết bị này.
 */

import { memo, useState } from 'react';
import { Plug, Smartphone, Unplug } from 'lucide-react';

import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
} from '@renderer/components/ui/Dropdown';
import { cn } from '@renderer/utils/cn';

import { useMobileConnectionStore } from '../../stores/mobile-connection.store';

interface MobileDeviceCardProps {
  device: { name: string; serial: string; uuid: string };
  collapsed: boolean;
}

const MobileDeviceCard = memo(function MobileDeviceCard({
  device,
  collapsed,
}: MobileDeviceCardProps) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  const connectedSerial = useMobileConnectionStore((s) => s.serial);
  const connect = useMobileConnectionStore((s) => s.connect);
  const disconnect = useMobileConnectionStore((s) => s.disconnect);
  const isConnected = connectedSerial === device.serial;

  return (
    <Dropdown
      open={open}
      onOpenChange={(next) => {
        if (!next) setMenuPos(null);
        setOpen(next);
      }}
      position={menuPos ?? undefined}
      className="w-full"
    >
      <DropdownTrigger>
        <div
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuPos({ top: e.clientY, left: e.clientX });
            setOpen(true);
          }}
          className={cn(
            'relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer',
            isConnected ? 'bg-card-background' : 'hover:bg-card-background',
          )}
        >
          <div className="relative shrink-0 w-9 h-9 flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-text-secondary" />
            {isConnected && (
              <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-success border border-background" />
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{device.name}</p>
              <p className="text-[11px] text-text-secondary truncate mt-0.5">{device.serial}</p>
            </div>
          )}
        </div>
      </DropdownTrigger>
      <DropdownContent>
        {isConnected ? (
          <DropdownItem
            icon={<Unplug className="w-3.5 h-3.5" />}
            onClick={() => {
              setOpen(false);
              disconnect();
            }}
          >
            Disconnect
          </DropdownItem>
        ) : (
          <DropdownItem
            icon={<Plug className="w-3.5 h-3.5" />}
            onClick={() => {
              setOpen(false);
              connect(device.serial, device.name);
            }}
          >
            Connect
          </DropdownItem>
        )}
      </DropdownContent>
    </Dropdown>
  );
});

MobileDeviceCard.displayName = 'MobileDeviceCard';

export default MobileDeviceCard;