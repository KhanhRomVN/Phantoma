import React, { memo, useEffect } from 'react';
import { Square, Play, Pencil, Trash2 } from 'lucide-react';

// ── Components ──
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
} from '@renderer/components/ui/Dropdown';

// ── Types ──
import type { TargetTab } from '../../types/target.types';

// ── Constants ──
import { AppPlatform, PLATFORMS } from '../../constants/platforms';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';

// ── Stores ──
import { useTimerStore } from '../../stores/timerStore';

interface TargetCardProps {
  tab: TargetTab;
  platform: AppPlatform;
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
  onStopSession,
  deviceList,
  onOpenRunningModal,
  collapsed,
}: TargetCardProps) {
  useEffect(() => {
    console.log('[DEBUG][RENDER] TargetCard re-rendered', tab.id);
  });

  const isRunning = targetStates[tab.id]?.isActive || false;
  const elapsed = useTimerStore((state) => state.timerDisplay[tab.id] || '00:00');

  const isMobileDeviceRunning = (() => {
    if (platform !== 'android') return true;
    if (!tab.emulatorSerial) return false;
    return deviceList.some((d) => d.serial === tab.emulatorSerial);
  })();

  const isCardDisabled = platform === 'android' && !isMobileDeviceRunning;

  const platformCfg = PLATFORMS[platform];
  const PlatformIcon = platformCfg.icon;
  const platformColor = platformCfg.color;

  const httpsCount = tab.httpsCount ?? 0;
  const dataUsed = tab.dataUsed ?? '0 B';

  if (collapsed) {
    return (
      <div
        className="relative flex items-center justify-center py-2 cursor-pointer group"
        onClick={() => onSelectTarget(tab.id)}
        title={tab.title}
      >
        {platform === 'web' && faviconSrc ? (
          <img
            src={faviconSrc}
            alt={tab.title}
            className="w-8 h-8 rounded-lg p-0.5"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : platform === 'pc' && tab.icon ? (
          <img
            src={`media://${tab.icon}`}
            alt={tab.title}
            className="w-8 h-8 rounded-lg p-0.5 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <PlatformIcon className="w-5 h-5 text-text-secondary group-hover:text-text-primary" />
        )}
        {isRunning && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-success border border-background" />
        )}
      </div>
    );
  }

  return (
    <Dropdown
      open={openMenuId === tab.id}
      onOpenChange={(open) => onOpenMenuChange(open ? tab.id : null)}
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
            onOpenMenuChange(tab.id);
          }}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm group relative',
            isCardDisabled
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer hover:bg-dropdown-item-hover',
            activeTargetId === tab.id
              ? 'bg-dropdown-item-hover text-text-primary'
              : 'text-text-secondary hover:text-text-primary',
          )}
        >
          {/* Badge icon */}
          <div className="relative shrink-0">
            {platform === 'web' && faviconSrc ? (
              <img
                src={faviconSrc}
                alt={tab.title}
                className="w-12 h-12 rounded-lg p-1"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : platform === 'pc' && tab.icon ? (
              <img
                src={`media://${tab.icon}`}
                alt={tab.title}
                className="w-12 h-12 rounded-lg p-1 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <span className={cn('p-1', `text-${platformColor}-400`)}>
                <PlatformIcon className="w-8 h-8" />
              </span>
            )}
            <span className="absolute bottom-0 right-0 w-5 h-5 p-1 rounded-md bg-background border border-border flex items-center justify-center text-text-secondary pointer-events-none">
              <PlatformIcon className="w-2.5 h-2.5" />
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">{tab.title}</span>
              {isRunning && (
                <span className="ml-auto flex items-center gap-1 text-[11px] font-mono text-primary shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {elapsed}
                </span>
              )}
            </div>
            <div className="text-[11px] text-text-secondary truncate mt-0">
              {platform === 'web' && tab.url
                ? tab.url
                : (platform === 'pc' || platform === 'cli') && tab.executablePath
                  ? tab.executablePath
                  : platformCfg.label}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-text-secondary">
              <span className="px-1.5 py-0 rounded-md bg-text-secondary/10 text-text-secondary">
                {httpsCount} https
              </span>
              <span className="px-1.5 py-0 rounded-md bg-text-secondary/10 text-text-secondary">
                {dataUsed}
              </span>
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