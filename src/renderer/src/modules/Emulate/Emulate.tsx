import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAccentColors } from '../../shared/hooks/useAccentColors';
import { cn } from '../../shared/lib/utils';
import { targetService } from '../../services/TargetService';
import { useModulePersistence } from '../../hooks/useModulePersistence';
import { useAgentFeature } from '../../components/RightPanel/Agent/context/FeatureContext';
import { EmulateController } from '../../controller/EmulateController';

// Components
import { RequestTable, RequestDetails, initialFilterState } from './components/Home';
import { ResourcesPanel } from './components/Resources';
import { PayloadPanel, getRepeaterIds } from './components/Repeater';
import { IntruderPanel } from './components/Intruder';
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
import { useNetworkStore } from '../../stores/networkStore';
import TargetSidebar from './components/TargetSidebar';
import { useTimerStore } from '../../stores/timerStore';

// Constants

export default React.memo(function Emulate({
  activeAppId = '',
  onStopSession = async () => {},
}: EmulateProps) {
  console.log('[DEBUG] Emulate render at', performance.now());
  const { currentPreset } = useTheme();
  const accentColor = currentPreset?.tailwind?.primary || '#3b82f6';
  const { getColorByIndex } = useAccentColors();

  const { setEmulateState } = useAgentFeature();

  // Module persistence
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

  // Badge counts for tab bar
  const [repeaterCount, setRepeaterCount] = useState(0);
  const [resourceCount, setResourceCount] = useState(0);

  // Listen for Repeater changes to update badge
  useEffect(() => {
    const updateCount = () => setRepeaterCount(getRepeaterIds(activeTargetId).size);
    updateCount();
    window.addEventListener('repeater-updated', updateCount);
    return () => window.removeEventListener('repeater-updated', updateCount);
  }, [activeTargetId]);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalPlatform, setAddModalPlatform] = useState<'web' | 'pc' | 'android' | 'cli'>('web');
  const [editingApp, setEditingApp] = useState<{
    id: string;
    name: string;
    url?: string;
    executablePath?: string;
  } | null>(null);

  // SQLite targets
  const {
    targets,
    loading: _targetsLoading,
    saveTarget,
    deleteTarget,
    refresh: refreshTargets,
    createTarget,
  } = useTargetData({ autoLoad: true });

  // Sync targets from SQLite to module state
  useEffect(() => {
    if (targets.length > 0 && targetTabs.length === 0) {
      setState((prev) => ({ ...prev, targetTabs: targets }));
    }
  }, [targets]);

  // Wrapper for AddTargetModal onAdd
  const handleAddApp = useCallback(
    async (appData: any) => {
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
        const created = await createTarget({
          title: newTab.title,
          url: newTab.url,
          platform: newTab.platform || 'web',
          executablePath: newTab.executablePath,
          startupArgs: newTab.startupArgs,
          environment: newTab.environment,
        });

        setState((prev) => ({ ...prev, targetTabs: [...prev.targetTabs, created] }));
        await refreshTargets();
        setIsAddModalOpen(false);
        setEditingApp(null);
      } catch (error) {
        console.error('[Emulate] Add target failed:', error);
        alert('Failed to add target: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    },
    [createTarget, refreshTargets, setState],
  );

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
        targetService.updateLastUsed(id).catch((err) => {
          console.error('[Emulate] Failed to update last_used_at:', err);
        });
      }
      setState((prev) => ({ ...prev, activeTargetId: id }));
    },
    [setState],
  );

  // Auto-select first target
  useEffect(() => {
    if (targetTabs.length > 0 && activeTargetId === null) {
      setActiveTarget(targetTabs[0].id);
    }
  }, [targetTabs, activeTargetId, setActiveTarget]);

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

  // Read requests from app-level networkStore (survives route changes)
  const requests = useNetworkStore((s) => s.requests);
  const clearRequests = useNetworkStore((s) => s.clearRequests);
  const unpackedScripts = useNetworkStore((s) => s.unpackedScripts);

  // Sync requests to moduleState + EmulateController
  useEffect(() => {
    setState((prev) => ({ ...prev, requests }));
    EmulateController.getInstance().setRequests(requests);
  }, [requests]);

  // Sync unpackedScripts to EmulateController
  useEffect(() => {
    EmulateController.getInstance().setUnpackedScripts(unpackedScripts);
  }, [unpackedScripts]);

  // Clear requests when switching to a non-active target
  useEffect(() => {
    if (activeTargetId && !isTargetActive(activeTargetId)) {
      clearRequests();
      setState((prev) => ({ ...prev, requests: [], selectedId: null }));
    }
  }, [activeTargetId]);

  // Update timer badge every second for running targets
  const updateTimerFn = useTimerStore((s) => s.updateTimer);
  const clearTimerFn = useTimerStore((s) => s.clearTimer);
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      Object.entries(targetStates).forEach(([tid, ts]) => {
        if (ts.isActive && ts.startTime) {
          const elapsed = now - ts.startTime;
          const mins = Math.floor(elapsed / 60000);
          const secs = Math.floor((elapsed % 60000) / 1000);
          updateTimerFn(tid, String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0'));
        } else if (!ts.isActive) {
          clearTimerFn(tid);
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [targetStates, updateTimerFn, clearTimerFn]);

  const { filter, searchTerm, setSearchTerm, updateFilter, filterRequests } = useRequestFilter();

  // Derived state
  const filteredRequests = useMemo(() => filterRequests(requests), [filterRequests, requests]);
  const currentTargetUrl = targetTabs.find((tab) => tab.id === activeTargetId)?.url;

  useEffect(() => {
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

  // Refs for latest values
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
      if (!window.api || typeof window.api.invoke !== 'function') {
        console.error('[Emulate] window.api is not available.');
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));

      try {
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
      // [DEBUG] Xóa sau khi fix — log params gửi sang Repeater
      console.log('[DEBUG] handleSendToRepeater called:', {
        requestId: req.id,
        activeTargetId,
        requestMethod: req.method,
        requestUrl: req.url,
      });
      import('./components/Repeater').then(({ addToRepeater }) => {
        console.log('[DEBUG] addToRepeater dynamic import resolved, calling with:', { requestId: req.id, targetId: activeTargetId });
        addToRepeater(req.id, activeTargetId);
      });
      setFuzzerTargetId(req.id);
      handleSetSelectedTool('repeater');
    },
    [handleSetSelectedTool, activeTargetId],
  );

  const handleSendToIntruder = useCallback(
    (req: NetworkRequest) => {
      import('./components/Intruder').then(({ addToIntruder }) => {
        addToIntruder(req.id, activeTargetId);
      });
      handleSetSelectedTool('intruder');
    },
    [handleSetSelectedTool, activeTargetId],
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

  const handleEditTarget = useCallback((id: string) => {
    const target = targetTabs.find((t) => t.id === id);
    if (target) {
      setEditingApp({
        id: target.id,
        name: target.title,
        url: target.url,
        executablePath: target.executablePath,
      });
      setAddModalPlatform((target.platform as 'web' | 'pc' | 'android' | 'cli') || 'web');
      setIsAddModalOpen(true);
    }
  }, [targetTabs]);

  // Memoize props
  const memoizedTargetTabs = useMemo(() => targetTabs, [targetTabs]);
  const memoizedTargetStates = useMemo(() => targetStates, [targetStates]);

  // Badge counts for each tool
  const badgeCounts: Partial<Record<ToolType, number>> = {
    repeater: repeaterCount,
    resource: resourceCount,
  };

  // TabBar
  const TabBar = useMemo(() => {
    return (
      <div className="flex h-10 border-b border-border shrink-0 overflow-x-auto gap-0.5 px-2">
        {Object.values(TOOLS).map((tool) => {
          const tabColor = getColorByIndex(tool.accentIndex);
          const isActive = selectedTool === tool.id;
          const badge = badgeCounts[tool.id];
          return (
            <button
              key={tool.id}
              onClick={() => handleSetSelectedTool(tool.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 h-full text-sm font-medium whitespace-nowrap cursor-pointer transition-all border-b-2',
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
              {badge != null && badge > 0 && (
                <span
                  className={cn(
                    'min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center leading-none',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-text-secondary/15 text-text-secondary',
                  )}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }, [selectedTool, getColorByIndex, handleSetSelectedTool, repeaterCount, resourceCount]);

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
        onEditTarget={handleEditTarget}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {TabBar}

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
                    onSendToRepeater={handleSendToRepeater}
                    onSendToIntruder={handleSendToIntruder}
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
              <div className="flex-1 overflow-hidden">
                <IntruderPanel requests={requests} targetId={activeTargetId} />
              </div>
            )}
            {selectedTool === 'repeater' && (
              <div className="flex-1 overflow-hidden">
                <PayloadPanel requests={requests} selectedRequestId={fuzzerTargetId} targetId={activeTargetId} />
              </div>
            )}
            {selectedTool === 'resource' && (
              <div className="flex-1 overflow-hidden">
                <ResourcesPanel requests={requests} onCountChange={setResourceCount} />
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