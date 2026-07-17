import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAccentColors } from '../../shared/hooks/useAccentColors';
import { cn } from '../../shared/lib/utils';
import { targetService } from '../../services/TargetService';
import { useModulePersistence } from '../../hooks/useModulePersistence';
import { useAgentFeature } from '../../components/RightPanel/Agent/context/FeatureContext';

// Components
import { RequestTable, RequestDetails, initialFilterState } from './components/Home';
import { ResourcesPanel } from './components/Resources';
import { PayloadPanel } from './components/Repeater';
import { SourcesPanel } from './components/Source';
import { LogViewer } from './components/Log';
import { DevicePanel } from './components/Device';
import {
  WebModal,
  PcModal,
  AndroidModal,
  CliModal,
} from './components/TargetSidebar/AddTargetModal';

// Hooks
import useTargetData from '../../hooks/useTargetData';
import { useRequestFilter } from './hooks/useRequestFilter';

// Types
import { NetworkRequest } from './types/inspector';
import { TargetTab, EmulateState, EmulateProps } from './types/target.types';
import { ToolType, TOOLS, DEFAULT_TOOL } from './constants/tools';
import { useTheme } from '@renderer/theme';
import useNetworkEvents from './hooks/useNetworkEvents';
import TargetSidebar from './components/TargetSidebar';

// Constants

export default React.memo(function Emulate({
  activeAppId = '',
  onStopSession = async () => {},
}: EmulateProps) {
  const { currentPreset } = useTheme();
  const accentColor = currentPreset?.tailwind?.primary || '#3b82f6';
  const { getColorByIndex } = useAccentColors();

  const { setEmulateState } = useAgentFeature();

  // activeFeature is now managed by MainLayout based on route
  // No need to set/unset here

  // Module persistence - lưu toàn bộ EmulateState
  const [state, setState] = useModulePersistence<EmulateState>('emulate', {
    selectedTool: DEFAULT_TOOL,
    targetTabs: [],
    activeTargetId: null,
    requests: [],
    selectedId: null,
    searchTerm: '',
    targetStates: {},
    isTargetActive: false,
    activeTargetMode: null,
    isInterceptActive: false,
    filter: initialFilterState,
  });

  const {
    selectedTool,
    selectedId,
    targetTabs,
    activeTargetId,
    targetStates,
    requests: savedRequests,
  } = state;

  // Update Agent context with Emulate state
  useEffect(() => {
    setEmulateState({
      activeTargetId,
      targetStates,
    });
  }, [activeTargetId, targetStates, setEmulateState]);

  // Local state
  const [, setLoadedFromIPC] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [fuzzerTargetId, setFuzzerTargetId] = useState<string | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalPlatform, setAddModalPlatform] = useState<'web' | 'pc' | 'android' | 'cli'>('web');
  const [editingApp, setEditingApp] = useState<{
    id: string;
    name: string;
    url?: string;
    executablePath?: string;
  } | null>(null);

  // Sử dụng SQLite để lưu targets
  const {
    targets,
    loading: _targetsLoading,
    saveTarget,
    deleteTarget,
    refresh: refreshTargets,
    createTarget,
  } = useTargetData({ autoLoad: true });

  // Sync targets từ SQLite vào module state
  useEffect(() => {
    if (targets.length > 0 && targetTabs.length === 0) {
      // Backend already sorts by updated_at DESC (last_used_at included)
      setState((prev) => ({ ...prev, targetTabs: targets }));
    }
  }, [targets]);

  // Wrapper for AddTargetModal onAdd
  const handleAddApp = useCallback(
    async (appData: any) => {
      // Tạo target từ appData
      const newTab: TargetTab = {
        id: appData.id || crypto.randomUUID(),
        title: appData.name || 'New Target',
        url: appData.url || undefined,
        icon: appData.icon || undefined,
        platform: appData.platform || undefined,
        executablePath: appData.executablePath || undefined,
        startupArgs: appData.startupArgs || undefined,
        environment: appData.environment || undefined,
      };

      try {
        // Sử dụng createTarget thay vì saveTarget để tránh nhầm lẫn với PUT
        const created = await createTarget({
          title: newTab.title,
          url: newTab.url,
          platform: newTab.platform || 'web',
          executablePath: newTab.executablePath,
          startupArgs: newTab.startupArgs,
          environment: newTab.environment,
        });

        // Cập nhật state với target đã được tạo từ server
        setState((prev) => ({ ...prev, targetTabs: [...prev.targetTabs, created] }));
        await refreshTargets();

        // Đóng modal sau khi thành công
        setIsAddModalOpen(false);
        setEditingApp(null);
      } catch (error) {
        console.error('[Emulate] Add target failed:', error);
        // Không đóng modal, để user sửa lại
        // TODO: Show error toast
        alert(`Failed to add target: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
    [createTarget, refreshTargets, setState],
  );

  // Wrapper methods để tương thích với interface cũ
  const addTargetTab = useCallback(
    async (tab: TargetTab) => {
      const exists = targetTabs.some((t) => t.id === tab.id);
      if (exists) return;

      await saveTarget(tab);
      setState((prev) => ({ ...prev, targetTabs: [...prev.targetTabs, tab] }));
      await refreshTargets();
    },
    [targetTabs, saveTarget, setState, refreshTargets],
  );

  const removeTargetTab = useCallback(
    async (id: string) => {
      try {
        await deleteTarget(id);
        setState((prev) => {
          const newTabs = prev.targetTabs.filter((t) => t.id !== id);
          const newActiveId =
            prev.activeTargetId === id
              ? newTabs.length > 0
                ? newTabs[0].id
                : null
              : prev.activeTargetId;
          return { ...prev, targetTabs: newTabs, activeTargetId: newActiveId };
        });
        await refreshTargets();
      } catch (error) {
        console.error('[Emulate] removeTargetTab error:', error);
      }
    },
    [deleteTarget, setState, refreshTargets],
  );

  const setActiveTarget = useCallback(
    (id: string | null) => {
      if (id) {
        // Update last_used_at in backend
        targetService.updateLastUsed(id).catch((err) => {
          console.error('[Emulate] Failed to update last_used_at:', err);
        });
      }
      setState((prev) => ({ ...prev, activeTargetId: id }));
    },
    [setState],
  );

  const startTarget = useCallback(
    (targetId: string, mode: 'mitm' | 'cdp' | 'frida') => {
      setState((prev) => {
        const newState = {
          ...prev,
          targetStates: {
            ...prev.targetStates,
            [targetId]: {
              isActive: true,
              mode,
              isIntercepting: false,
              startTime: Date.now(),
            },
          },
        };
        return newState;
      });
    },
    [setState],
  );

  const stopTarget = useCallback(
    (targetId: string) => {
      setState((prev) => ({
        ...prev,
        targetStates: {
          ...prev.targetStates,
          [targetId]: {
            isActive: false,
            mode: undefined,
            isIntercepting: false,
          },
        },
      }));
    },
    [setState],
  );

  const toggleIntercept = useCallback(
    (targetId: string) => {
      setState((prev) => ({
        ...prev,
        targetStates: {
          ...prev.targetStates,
          [targetId]: {
            ...prev.targetStates[targetId],
            isIntercepting: !prev.targetStates[targetId]?.isIntercepting,
          },
        },
      }));
    },
    [setState],
  );

  const isTargetActive = useCallback(
    (targetId: string): boolean => {
      return targetStates[targetId]?.isActive || false;
    },
    [targetStates],
  );

  const { requests, clearRequests, unpackedScripts } = useNetworkEvents({
    targetId: activeTargetId || undefined,
    initialRequests: savedRequests,
    onRequestsChange: (newRequests) => {
      setState((prev) => ({ ...prev, requests: newRequests }));
    },
  });

  const { filter, searchTerm, setSearchTerm, updateFilter, filterRequests } = useRequestFilter();

  // Derived state
  const filteredRequests = useMemo(() => filterRequests(requests), [filterRequests, requests]);
  const currentTargetUrl = targetTabs.find((tab) => tab.id === activeTargetId)?.url;

  // Không còn IPC persistence - data đã được lưu trong SQLite
  // Load data from IPC (chỉ lấy targets từ SQLite thông qua useTargetData)
  useEffect(() => {
    // Đánh dấu đã load xong
    setLoadedFromIPC(true);
  }, []);

  // Handlers
  const handleSetSelectedId = useCallback(
    (id: string | null) => {
      setState((prev) => ({ ...prev, selectedId: id }));
    },
    [setState],
  );

  const handleSetSelectedTool = useCallback(
    (tool: ToolType) => {
      setState((prev) => ({ ...prev, selectedTool: tool }));
      if (tool !== 'repeater') {
        setFuzzerTargetId(null);
      }
    },
    [setState],
  );

  const handleSetFilter = useCallback(
    (value: any) => {
      updateFilter(value);
    },
    [updateFilter],
  );

  const handleClearRequests = useCallback(() => {
    clearRequests();
    setState((prev) => ({ ...prev, selectedId: null }));
  }, [clearRequests, setState]);

  // Refs để lưu giá trị mới nhất mà không gây re-render
  const activeTargetIdRef = useRef(activeTargetId);
  const targetStatesRef = useRef(targetStates);

  useEffect(() => {
    activeTargetIdRef.current = activeTargetId;
  }, [activeTargetId]);

  useEffect(() => {
    targetStatesRef.current = targetStates;
  }, [targetStates]);

  const handleStopTarget = useCallback(async () => {
    const targetId = activeTargetIdRef.current;
    if (!targetId) return;

    const mode = targetStatesRef.current[targetId]?.mode;
    if (mode === 'cdp') {
      await window.api.invoke('cdp:disconnect');
      await window.api.invoke('app:terminate');
    } else if (mode === 'mitm' || mode === 'frida') {
      await window.api.invoke('proxy:destroy-session', 'default');
      await window.api.invoke('app:terminate');
    }

    stopTarget(targetId);
    handleClearRequests();
    await onStopSession();
  }, [stopTarget, handleClearRequests, onStopSession]);

  const handleStartTarget = useCallback(
    (targetId: string, mode: 'mitm' | 'cdp' | 'frida') => {
      startTarget(targetId, mode);
    },
    [startTarget],
  );

  const handleToggleIntercept = useCallback(() => {
    if (!activeTargetId) return;
    toggleIntercept(activeTargetId);
  }, [activeTargetId, toggleIntercept]);

  const handleLaunchTarget = useCallback(
    async (
      appId: string,
      proxyUrl: string,
      customUrl?: string,
      mode?: 'browser' | 'electron' | 'native' | 'cdp' | 'frida',
      useEnvInject?: boolean,
    ) => {
      // Check if window.api is available
      if (!window.api || typeof window.api.invoke !== 'function') {
        console.error('[Emulate] window.api is not available. Preload may not be loaded.');
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));

      try {
        // Lấy executable path từ targetTabs nếu có
        const target = targetTabs.find((t) => t.id === appId);
        const launchTarget = target?.executablePath || appId;

        const result = await window.api.invoke(
          'app:launch',
          launchTarget,
          proxyUrl,
          customUrl,
          mode,
          useEnvInject,
        );

        if (result) {
          // Tạo target tab từ appId và customUrl
          const newTab: TargetTab = {
            id: appId,
            title: customUrl ? new URL(customUrl).hostname : appId,
            url: customUrl || proxyUrl,
          };
          await addTargetTab(newTab);
          setActiveTarget(appId);
        }
      } catch (e) {
        console.error('[Emulate] Launch failed:', e);
      }
    },
    [targetTabs, addTargetTab, setActiveTarget],
  );

  const handleSendToRepeater = useCallback(
    (req: NetworkRequest) => {
      import('./components/Repeater').then(({ addToRepeater }) => {
        addToRepeater(req.id);
      });
      setFuzzerTargetId(req.id);
      handleSetSelectedTool('repeater');
    },
    [handleSetSelectedTool],
  );

  const handleStopSession = useCallback(
    async (e: React.MouseEvent, _appId: string) => {
      e.stopPropagation();
      if (confirm('Stop the current tracking session?')) {
        await onStopSession();
      }
    },
    [onStopSession],
  );

  const handleOpenAddModal = useCallback((platform: 'web' | 'pc' | 'android' | 'cli') => {
    setAddModalPlatform(platform);
    setIsAddModalOpen(true);
  }, []);

  // Memoize props for TargetSidebar
  const memoizedTargetTabs = useMemo(() => targetTabs, [targetTabs]);
  const memoizedTargetStates = useMemo(() => targetStates, [targetStates]);

  // Extract tabbar into a memoized component
  const TabBar = useMemo(() => {
    return (
      <div className="flex h-10 border-b border-border shrink-0 overflow-x-auto gap-0.5 px-2">
        {Object.values(TOOLS).map((tool) => {
          const tabColor = getColorByIndex(tool.accentIndex);
          const isActive = selectedTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => handleSetSelectedTool(tool.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 h-full text-xs font-medium whitespace-nowrap cursor-pointer transition-all border-b-2',
                isActive
                  ? 'text-text-primary'
                  : 'text-text-secondary border-transparent hover:text-text-primary hover:bg-dropdown-item-hover',
              )}
              style={{
                borderBottomColor: isActive ? tabColor : 'transparent',
              }}
            >
              <span style={{ color: isActive ? tabColor : undefined }}>
                {React.createElement(tool.icon, { size: 14, strokeWidth: 1.5 })}
              </span>
              <span>{tool.label}</span>
            </button>
          );
        })}
      </div>
    );
  }, [selectedTool, getColorByIndex, handleSetSelectedTool]);

  return (
    <div className="flex h-full bg-background">
      {/* Target Sidebar */}
      <TargetSidebar
        targetTabs={memoizedTargetTabs}
        activeTargetId={activeTargetId}
        targetStates={memoizedTargetStates}
        activeAppId={activeAppId}
        accentColor={accentColor}
        onSelectTarget={setActiveTarget}
        onRemoveTarget={removeTargetTab}
        onStartTarget={handleStartTarget}
        onStopTarget={handleStopTarget}
        onLaunchTarget={handleLaunchTarget}
        onStopSession={handleStopSession}
        onOpenAddModal={handleOpenAddModal}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar - Feature Tabs */}
        {TabBar}

        {/* Content based on selected tool */}
        {selectedTool === 'device' ? (
          <div className="flex-1 overflow-hidden">
            <DevicePanel />
          </div>
        ) : !activeTargetId || activeTargetId === 'default' ? (
          <div className="flex-1 flex items-center justify-center text-text-secondary">
            <div className="text-center">
              <div className="text-sm font-medium mb-1">No target selected</div>
              <div className="text-xs text-text-secondary">Select a target from the left panel</div>
            </div>
          </div>
        ) : (
          <>
            {selectedTool === 'home' && (
              <>
                <div className="flex-1 min-h-0 border-b border-border">
                  <RequestTable
                    requests={filteredRequests}
                    selectedId={selectedId}
                    onSelect={handleSetSelectedId}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    interceptedIds={new Set()}
                    pendingActionIds={new Set()}
                    onForward={() => {}}
                    onDrop={() => {}}
                    onDelete={() => {}}
                    appId="emulate-app"
                    onSetCompare1={() => {}}
                    onSetCompare2={() => {}}
                    onAnalyzeRequest={() => {}}
                    onSendToRepeater={handleSendToRepeater}
                    onLaunchTarget={handleLaunchTarget}
                    onClearRequests={handleClearRequests}
                    currentTargetAppId={activeTargetId || undefined}
                    currentTargetUrl={currentTargetUrl}
                    isTargetActive={isTargetActive(activeTargetId)}
                    activeTargetMode={targetStates[activeTargetId]?.mode || null}
                    isInterceptActive={targetStates[activeTargetId]?.isIntercepting || false}
                    onToggleIntercept={handleToggleIntercept}
                    onStopTarget={handleStopTarget}
                    onStartTarget={handleStartTarget}
                  />
                </div>
                <div className="flex-1 min-h-0">
                  <RequestDetails
                    request={requests.find((r) => r.id === selectedId) || null}
                    searchTerm={searchTerm}
                    filter={filter}
                    onFilterChange={handleSetFilter}
                    requests={requests}
                    onSearchTermChange={setSearchTerm}
                    onSelectRequest={handleSetSelectedId}
                    onSetCompare1={() => {}}
                    onSetCompare2={() => {}}
                    appId="emulate-app"
                    onToggleFilter={() => setIsFilterOpen(!isFilterOpen)}
                    isFilterOpen={isFilterOpen}
                    targetId={activeTargetId}
                  />
                </div>
              </>
            )}
            {selectedTool === 'intruder' && (
              <div className="flex-1 flex items-center justify-center text-text-secondary">
                Intruder Content - Under Development
              </div>
            )}
            {selectedTool === 'repeater' && (
              <div className="flex-1 overflow-hidden">
                <PayloadPanel requests={requests} selectedRequestId={fuzzerTargetId} />
              </div>
            )}
            {selectedTool === 'resource' && (
              <div className="flex-1 overflow-hidden">
                <ResourcesPanel requests={requests} />
              </div>
            )}
            {selectedTool === 'source' && (
              <div className="flex-1 overflow-hidden">
                <SourcesPanel requests={requests} unpackedScripts={unpackedScripts} />
              </div>
            )}
            {selectedTool === 'log' && (
              <div className="flex-1 overflow-hidden">
                <LogViewer />
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {addModalPlatform === 'web' && (
        <WebModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingApp(null);
          }}
          onAdd={handleAddApp}
          existingApps={targetTabs}
          editApp={editingApp}
          onEdit={() => {}}
        />
      )}
      {addModalPlatform === 'pc' && (
        <PcModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingApp(null);
          }}
          onAdd={handleAddApp}
          existingApps={targetTabs}
          editApp={editingApp}
          onEdit={() => {}}
        />
      )}
      {addModalPlatform === 'android' && (
        <AndroidModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingApp(null);
          }}
          onAdd={handleAddApp}
          existingApps={targetTabs}
          editApp={editingApp}
          onEdit={() => {}}
        />
      )}
      {addModalPlatform === 'cli' && (
        <CliModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingApp(null);
          }}
          onAdd={handleAddApp}
          existingApps={targetTabs}
          editApp={editingApp}
          onEdit={() => {}}
        />
      )}
    </div>
  );
});
