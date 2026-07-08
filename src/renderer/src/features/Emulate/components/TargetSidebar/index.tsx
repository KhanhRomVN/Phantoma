import React, { useState, useCallback } from 'react';
import { TargetTab } from '../../types/target.types';
import { useTargetSidebar } from './useTargetSidebar';
import TargetList from './TargetList';
import { AppPlatform } from './utils';

// Re-export for external consumers
export { useTargetSidebar } from './useTargetSidebar';
export type { AppPlatform } from './utils';

interface TargetSidebarProps {
  targetTabs: TargetTab[];
  activeTargetId: string | null;
  targetStates: Record<string, { isActive: boolean; mode?: 'mitm' | 'cdp' | 'frida' }>;
  accentColor: string;
  onSelectTarget: (id: string) => void;
  onRemoveTarget: (id: string) => void;
  onStartTarget: (mode: 'mitm' | 'cdp' | 'frida') => void;
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

const TargetSidebar: React.FC<TargetSidebarProps> = ({
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
  // [DEBUG] TargetSidebar render
  console.log('[DEBUG] TargetSidebar rendered', { targetTabsCount: targetTabs.length, activeTargetId });
  
  const { targetSearchQuery, setTargetSearchQuery, openMenuId, setOpenMenuId, searchedTargets } =
    useTargetSidebar(targetTabs);

  // Device list state
  const [deviceList, setDeviceList] = useState<{ name: string; serial: string; type: string }[]>(
    [],
  );
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  const loadDevices = useCallback(async () => {
    if (isLoadingDevices) return;
    setIsLoadingDevices(true);
    try {
      const [vms, connected] = await Promise.all([
        window.api.invoke('mobile:list-genymotion-vms'),
        window.api.invoke('mobile:detect-emulators'),
      ]);
      const list: { name: string; serial: string; type: string }[] = [];
      connected.forEach((dev: any) =>
        list.push({
          name: dev.name || dev.serial,
          serial: dev.serial,
          type: dev.type === 'physical' ? 'physical' : 'vm',
        }),
      );
      vms.forEach((vm: string) => {
        if (!connected.some((d: any) => d.name === vm || d.id === vm)) {
          list.push({ name: vm, serial: vm, type: 'vm' });
        }
      });
      setDeviceList(list);
    } catch (e) {
      console.error('[TargetSidebar] Failed to load devices:', e);
    } finally {
      setIsLoadingDevices(false);
    }
  }, [isLoadingDevices]);

  return (
    <div className="w-80 shrink-0 border-r border-border flex flex-col bg-background relative">
      {/* Header */}
      <div className="flex items-center px-3 h-10 border-b border-border shrink-0">
        <span className="text-xs font-medium text-text-secondary">Targets</span>
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

export default React.memo(TargetSidebar);
