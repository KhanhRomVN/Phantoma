import React from 'react';
import { TargetTab } from '../../types/target.types';
import { useTargetSidebar } from './useTargetSidebar';
import { TargetList } from './TargetList';
import { AppPlatform } from './utils';

// Re-export for external consumers
export { TargetList } from './TargetList';
export { useTargetSidebar } from './useTargetSidebar';
export type { AppPlatform } from './utils';

interface TargetSidebarProps {
  targetTabs: TargetTab[];
  activeTargetId: string | null;
  timerDisplay: Record<string, string>;
  targetStates: Record<string, { isActive: boolean; mode?: 'mitm' | 'cdp' }>;
  accentColor: string;
  onSelectTarget: (id: string) => void;
  onRemoveTarget: (id: string) => void;
  onStartTarget: (mode: 'mitm' | 'cdp') => void;
  onStopTarget: () => void;
  onLaunchTarget: (
    appId: string,
    proxyUrl: string,
    customUrl?: string,
    mode?: 'browser' | 'electron' | 'native' | 'cdp',
  ) => Promise<void>;
  onOpenAddModal: (platform: AppPlatform) => void;
  onEditTarget?: (id: string) => void;
  onStopSession?: (e: React.MouseEvent, appId: string) => void;
  activeAppId?: string;
}

export function TargetSidebar({
  targetTabs,
  activeTargetId,
  timerDisplay,
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
}: TargetSidebarProps) {
  const {
    targetSearchQuery,
    setTargetSearchQuery,
    openMenuId,
    setOpenMenuId,
    searchedTargets,
  } = useTargetSidebar(targetTabs);

  return (
    <div className="w-80 shrink-0 border-r border-border flex flex-col bg-background relative">
      {/* Header */}
      <div className="flex items-center px-3 h-10 border-b border-border shrink-0">
        <span className="text-xs font-medium text-text-secondary">Targets</span>
      </div>

      <TargetList
        targetTabs={targetTabs}
        activeTargetId={activeTargetId}
        timerDisplay={timerDisplay}
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
      />
    </div>
  );
}

export default TargetSidebar;