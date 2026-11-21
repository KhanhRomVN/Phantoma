/**
 * Card hiển thị một target trong sidebar — favicon/icon, title, URL,
 * trạng thái running, timer và menu context (start/edit/delete).
 */

import React, { memo, useState } from 'react';

import { Square, Play, Pencil, Trash2 } from 'lucide-react';
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
} from '@renderer/components/ui/Dropdown';
import { LaunchPlatform, LAUNCH_PLATFORMS } from '@renderer/modules/Emulate/shared/constants/platforms.constants';

import type { TargetTab } from '@renderer/modules/Emulate/shared/types/target.types';

import { useTimerStore } from '@renderer/modules/Emulate/shared/stores/timer.store';

import { cn } from '@renderer/utils/cn';

export const PLATFORM_STYLES: Record<LaunchPlatform, { text: string; chip: string }> = {
  website: { text: 'text-sky-400', chip: 'bg-sky-500/15 text-sky-400' },
  application: { text: 'text-violet-400', chip: 'bg-violet-500/15 text-violet-400' },
  android: { text: 'text-emerald-400', chip: 'bg-emerald-500/15 text-emerald-400' },
  terminal: { text: 'text-amber-400', chip: 'bg-amber-500/15 text-amber-400' },
};

interface TargetCardProps {
  tab: TargetTab;
  platform: LaunchPlatform;
  faviconSrc: string | null;
  activeTargetId: string | null;
  targetStates: Record<string, { isActive: boolean; mode?: 'mitm' | 'cdp' | 'frida' }>;
  activeAppId?: string;
  openMenuId: string | null;
  onOpenMenuChange: (id: string | null) => void;
  onSelectTarget: (id: string) => void;
  onRemoveTarget: (id: string) => void;
  onStopTarget: () => void;
  onEditTarget?: (id: string) => void;
  onStopSession?: (e: React.MouseEvent, appId: string) => void;
  deviceList: { name: string; serial: string; type: string }[];
  onOpenRunningModal: (tab: TargetTab) => void;
  collapsed: boolean;
}

const TargetCard = memo(function TargetCard({
  tab,
  platform,
  faviconSrc,
  activeTargetId,
  targetStates,
  openMenuId,
  onOpenMenuChange,
  onSelectTarget,
  onRemoveTarget,
  onStopTarget,
  onEditTarget,
  deviceList,
  onOpenRunningModal,
  collapsed,
}: TargetCardProps) {
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  const isRunning = targetStates[tab.id]?.isActive || false;
  const elapsed = useTimerStore((state) => state.timerDisplay[tab.id] || '00:00');

  const isMobileDeviceRunning = (() => {
    if (platform !== 'android') return true;
    if (!tab.emulatorSerial) return false;
    return deviceList.some((d) => d.serial === tab.emulatorSerial);
  })();

  const isCardDisabled = platform === 'android' && !isMobileDeviceRunning;

  const platformCfg = LAUNCH_PLATFORMS[platform];
  const PlatformIcon = platformCfg.icon;
  const style = PLATFORM_STYLES[platform];

  const subtitle =
    platform === 'website'
      ? tab.url
      : platform === 'application' || platform === 'terminal'
        ? tab.executablePath
        : tab.emulatorSerial;

  if (collapsed) {
    return (
      <div
        className="relative flex items-center justify-center py-2 cursor-pointer group"
        onClick={() => onSelectTarget(tab.id)}
        title={tab.title}
      >
        {(platform === 'website' || platform === 'terminal') && faviconSrc ? (
          <img
            src={faviconSrc}
            alt={tab.title}
            className="w-8 h-8 rounded-lg p-0.5"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : platform === 'application' && tab.icon ? (
          <img
            src={`media://${tab.icon}`}
            alt={tab.title}
            className="w-8 h-8 rounded-lg p-0.5 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <PlatformIcon className={cn('w-5 h-5', style.text)} />
        )}
        {isRunning && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-success border border-background" />
        )}
      </div>
    );
  }

  const isOpen = openMenuId === tab.id;
  const isSelected = activeTargetId === tab.id;

  return (
    <Dropdown
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) setMenuPos(null);
        onOpenMenuChange(open ? tab.id : null);
      }}
      position={menuPos ?? undefined}
      className="w-full"
    >
      <DropdownTrigger>
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelectTarget(tab.id);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuPos({ top: e.clientY, left: e.clientX });
            onOpenMenuChange(tab.id);
          }}
          className={cn(
            'relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group',
            isCardDisabled
              ? 'opacity-50 cursor-not-allowed'
              : isSelected
                ? 'bg-card-background cursor-pointer'
                : 'hover:bg-card-background cursor-pointer',
          )}
        >
          {/* Icon tile */}
          <div className="relative shrink-0 w-9 h-9 flex items-center justify-center">
            {(platform === 'website' || platform === 'terminal') && faviconSrc ? (
              <img
                src={faviconSrc}
                alt={tab.title}
                className="w-7 h-7 rounded object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : platform === 'application' && tab.icon ? (
              <img
                src={`media://${tab.icon}`}
                alt={tab.title}
                className="w-7 h-7 rounded object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <PlatformIcon className={cn('w-4 h-4', style.text)} />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-primary truncate">{tab.title}</span>
              {isRunning && (
                <span className="ml-auto flex items-center gap-1 text-[11px] font-mono text-primary shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {elapsed}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
              {subtitle && (
                <span className="text-[11px] text-text-secondary truncate">{subtitle}</span>
              )}
            </div>
          </div>
        </div>
      </DropdownTrigger>
      <DropdownContent>
        {!isRunning ? (
          <DropdownItem
            icon={<Play className="w-3.5 h-3.5" />}
            disabled={isCardDisabled}
            onClick={() => {
              if (isCardDisabled) return;
              onOpenMenuChange(null);
              onOpenRunningModal(tab);
            }}
          >
            {isCardDisabled ? 'Device not running' : 'Start'}
          </DropdownItem>
        ) : (
          <DropdownItem icon={<Square className="w-3.5 h-3.5" />} onClick={() => onStopTarget()}>
            Stop target
          </DropdownItem>
        )}
        {!isRunning && (
          <>
            {onEditTarget && (
              <DropdownItem
                icon={<Pencil className="w-3.5 h-3.5" />}
                onClick={() => onEditTarget(tab.id)}
              >
                Edit
              </DropdownItem>
            )}
            <DropdownItem
              icon={<Trash2 className="w-3.5 h-3.5 text-red-400" />}
              variant="error"
              onClick={() => onRemoveTarget(tab.id)}
            >
              Delete
            </DropdownItem>
          </>
        )}
      </DropdownContent>
    </Dropdown>
  );
});

TargetCard.displayName = 'TargetCard';

export default TargetCard;