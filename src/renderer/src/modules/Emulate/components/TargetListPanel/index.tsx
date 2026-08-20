import React, { useState, useCallback, useMemo } from 'react';

import { logger } from '@renderer/utils/logger';

// ── Components ──
import TargetList from './TargetList';

// ── Types ──
import { TargetTab } from '../../types/target.types';

// ── Constants ──
import { AppPlatform, PLATFORMS } from '../../constants/platforms';

// Services
import { logcatService } from '../../services/logcat.service';

// ── Utils ──
import { getFaviconUrl } from '../../../../shared/utils/faviconUtils';

export function getTargetPlatform(tab: TargetTab): AppPlatform {
  if (tab.platform) {
    const p = tab.platform.toLowerCase();
    if (p in PLATFORMS) return p as AppPlatform;
  }
  if (tab.url) {
    try {
      const url = new URL(tab.url);
      if (url.protocol === 'http:' || url.protocol === 'https:') return 'web';
    } catch {
      // Invalid URL
    }
  }
  return 'web';
}

export function getTargetFavicon(tab: TargetTab): string | null {
  if (tab.favicon) return tab.favicon;
  if (tab.url) return getFaviconUrl(tab.url, 32);
  return null;
}

// Re-export for external consumers
export type { AppPlatform } from '../../constants/platforms';

interface TargetListPanelProps {
  targetTabs: TargetTab[];
  activeTargetId: string | null;
  targetStates: Record<string, { isActive: boolean; mode?: 'mitm' | 'cdp' | 'frida' }>;
  accentColor: string;
  onSelectTarget: (id: string) => void;
  onRemoveTarget: (id: string) => void;
  onStartTarget: (targetId: string, mode: 'mitm' | 'cdp' | 'frida') => void;
  onStopTarget: () => void;
  onLaunchTarget: (
    appId: string,
    proxyUrl: string,
    customUrl?: string,
    mode?: 'browser' | 'electron' | 'native' | 'cdp' | 'frida',
    useEnvInject?: boolean,
    deviceSerial?: string,
  ) => Promise<void>;
  onOpenAddModal: (platform: AppPlatform) => void;
  onEditTarget?: (id: string) => void;
  onStopSession?: (e: React.MouseEvent, appId: string) => void;
  activeAppId?: string;
}

const TargetListPanel: React.FC<TargetListPanelProps> = ({
  targetTabs,
  activeTargetId,
  targetStates,
  accentColor,
  onSelectTarget,
  onRemoveTarget,
  onStartTarget,
  onStopTarget,
  onLaunchTarget,
  onOpenAddModal,
  onEditTarget,
  onStopSession,
  activeAppId,
}) => {
  const [targetSearchQuery, setTargetSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const allTargets = useMemo(() => targetTabs.filter((tab) => tab.id !== 'default'), [targetTabs]);

  const searchedTargets = useMemo(
    () =>
      allTargets.filter((tab) =>
        (tab.title || '').toLowerCase().includes(targetSearchQuery.toLowerCase()),
      ),
    [allTargets, targetSearchQuery],
  );

  // Device list state
  const [deviceList, setDeviceList] = useState<{ name: string; serial: string; type: string }[]>(
    [],
  );
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  const loadDevices = useCallback(async () => {
    if (isLoadingDevices) return;
    setIsLoadingDevices(true);
    try {
      const detected = await logcatService.detectEmulators();
      setDeviceList(detected);
    } catch (e) {
      logger.error('[TargetListPanel] Failed to load devices:', e);
    } finally {
      setIsLoadingDevices(false);
    }
  }, [isLoadingDevices]);

  return (
    <div className="w-80 shrink-0 border-r border-border flex flex-col bg-background relative">
      {/* Header */}
      <div className="flex items-center px-3 h-10 border-b border-border shrink-0">
        <span className="text-sm font-medium text-text-secondary">Targets</span>
      </div>

      <TargetList
        targetTabs={targetTabs}
        activeTargetId={activeTargetId}
        targetStates={targetStates}
        accentColor={accentColor}
        activeAppId={activeAppId}
        targetSearchQuery={targetSearchQuery}
        onSearchChange={setTargetSearchQuery}
        openMenuId={openMenuId}
        onOpenMenuChange={setOpenMenuId}
        searchedTargets={searchedTargets}
        onSelectTarget={onSelectTarget}
        onRemoveTarget={onRemoveTarget}
        onStartTarget={onStartTarget}
        onStopTarget={onStopTarget}
        onLaunchTarget={onLaunchTarget}
        onOpenAddModal={onOpenAddModal}
        onEditTarget={onEditTarget}
        onStopSession={onStopSession}
        deviceList={deviceList}
        onRefreshDevices={loadDevices}
      />
    </div>
  );
};

export default React.memo(TargetListPanel);
