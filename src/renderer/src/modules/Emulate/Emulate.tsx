import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { logger } from '@renderer/utils/logger';
import { useAccentColors } from '@renderer/shared/hooks/useAccentColors';
import { emulateApi } from './services/emulate-api.service';
import { useModulePersistence } from '../../hooks/useModulePersistence';
import { useAgentFeature } from '../../components/RightPanel/Agent/context/FeatureContext';
import { EmulateController } from '../../controller/EmulateController';
import { ipcService } from '../../services/ipc.service';

// ── Components ──
import { initialFilterState } from './components/WorkspacePanel/Home';
import WorkspacePanel from './components/WorkspacePanel';
import { AddTargetModal } from './components/TargetListPanel/AddTargetModal';
import TargetSidebar from './components/TargetListPanel';
import { FooterBar } from './components/FooterBar';

// ── Hooks ──
import useTargetData from '../../hooks/useTargetData';
import { useRequestFilter } from './hooks/network/useRequestFilter';
import useNetworkEvents from './hooks/network/useNetworkEvents';

// ── Utils ──
import { formatResponseSize } from './utils/network-event-parser.util';

// ── Types ──
import { NetworkRequest } from './types/inspector';
import type { ParamItem } from './types/repeater.types';
import { TargetTab, EmulateState, EmulateProps } from './types/target.types';

// Stores
import { useTimerStore } from './stores/timerStore';
import { useNetworkStore } from './stores/networkStore';

// ── Constants ──
import { ToolType, DEFAULT_TOOL } from './constants/tools';

export default React.memo(function Emulate({
  activeAppId = '',
  onStopSession = async () => {},
}: EmulateProps) {
  const { getColorByIndex, UNIFIED_ACCENT } = useAccentColors();

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

  const { selectedTool, selectedId, targetTabs, activeTargetId, targetStates } = state;

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
        logger.error('[Emulate] Add target failed:', error);
        alert(
          'Failed to add target: ' + (error instanceof Error ? error.message : 'Unknown error'),
        );
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
        logger.error('[Emulate] removeTargetTab error:', error);
      }
    },
    [deleteTarget, setState, refreshTargets],
  );

  const setActiveTarget = useCallback(
    (id: string | null) => {
      if (id) {
        emulateApi.updateLastUsed(id).catch((err) => {
          logger.warn('[Emulate] Failed to update last_used_at:', err);
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

  const { clearRequests, unpackedScripts } = useNetworkEvents({
    targetId: activeTargetId || undefined,
  });

  // Cập nhật httpsCount/dataUsed từ data network thật (debounce 500ms để gom nhiều event)
  useEffect(() => {
    if (!activeTargetId) return;

    const timer = setTimeout(() => {
      const requests = useNetworkStore.getState().requests;
      const httpsCount = requests.filter(
        (r) => r.protocol === 'https' || r.url.startsWith('https://'),
      ).length;

      const totalBytes = requests.reduce((sum, r) => {
        const { sizeBytes } = formatResponseSize(r.size);
        return sum + sizeBytes;
      }, 0);

      const dataUsed =
        totalBytes >= 1024 * 1024
          ? `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`
          : totalBytes > 0
            ? `${(totalBytes / 1024).toFixed(1)} KB`
            : '0 B';

      setState((prev) => ({
        ...prev,
        targetTabs: prev.targetTabs.map((tab) =>
          tab.id === activeTargetId ? { ...tab, httpsCount, dataUsed } : tab,
        ),
      }));
    }, 500);

    return () => clearTimeout(timer);
  }, [activeTargetId, setState]);

  // Sync requests to EmulateController
  useEffect(() => {
    EmulateController.getInstance().setRequests(useNetworkStore.getState().requests);
  }, [activeTargetId]);

  // Sync targetId to EmulateController
  useEffect(() => {
    EmulateController.getInstance().setTargetId(activeTargetId);
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

  const { filter, searchTerm, setSearchTerm, updateFilter } = useRequestFilter();

  // Load filter from API when activeTargetId changes
  useEffect(() => {
    if (!activeTargetId) return;

    const loadFilterFromAPI = async () => {
      try {
        const dto = await emulateApi.getFilter(activeTargetId);
        if (dto) {
          // Parse JSON strings safely
          const safeParse = <T,>(value: string | undefined | null, fallback: T): T => {
            if (!value) return fallback;
            try {
              return JSON.parse(value) as T;
            } catch {
              return fallback;
            }
          };

          const mergedFilter = {
            ...filter,
            methods: safeParse(dto.method, filter.methods),
            host: safeParse(dto.host, filter.host),
            status: safeParse(dto.status, filter.status),
            type: safeParse(dto.type, filter.type),
          };
          updateFilter(mergedFilter);
        }
      } catch (error) {
        logger.error('[Emulate] Failed to load filter from API:', error);
      }
    };

    loadFilterFromAPI();
  }, [activeTargetId]); // Only run when activeTargetId changes

  // Sync filter to EmulateController
  useEffect(() => {
    EmulateController.getInstance().setFilter(filter);
  }, [filter]);

  // Derived state
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

  const handleToggleFilter = useCallback(() => {
    setIsFilterOpen((prev) => !prev);
  }, []);

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
      await ipcService.disconnectCdp();
      await ipcService.terminateApp();
    } else if (mode === 'mitm' || mode === 'frida') {
      await ipcService.destroyProxySession('default');
      await ipcService.terminateApp();
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
        logger.warn('[Emulate] window.api is not available.');
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));

      try {
        const target = targetTabs.find((t) => t.id === appId);
        const launchTarget = target?.executablePath || appId;

        const result = await ipcService.launchApp(
          launchTarget,
          proxyUrl,
          customUrl,
          mode,
          useEnvInject,
          appId, // Pass targetId (appId) to track process per target
        );
        if (result.success && result.data) {
          const newTab: TargetTab = {
            id: appId,
            title: customUrl ? new URL(customUrl).hostname : appId,
            url: customUrl || proxyUrl,
          };
          await addTargetTab(newTab);
          setActiveTarget(appId);
        }
      } catch (e) {
        logger.error('[Emulate] Launch failed:', e);
      }
    },
    [targetTabs, addTargetTab, setActiveTarget],
  );

  const handleSendToRepeater = useCallback(
    (req: NetworkRequest) => {
      import('./components/WorkspacePanel/Repeater').then(({ addToRepeater }) => {
        addToRepeater(req, activeTargetId || '');
      });
      setFuzzerTargetId(req.id);
      handleSetSelectedTool('repeater');
    },
    [activeTargetId, handleSetSelectedTool],
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

  const handleEditTarget = useCallback(
    (id: string) => {
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
    },
    [targetTabs],
  );

  // Memoize props
  const memoizedTargetTabs = useMemo(() => targetTabs, [targetTabs]);
  const memoizedTargetStates = useMemo(() => targetStates, [targetStates]);

  return (
    <div className="flex h-full bg-background flex-col">
      <div className="flex flex-1 min-h-0">
        {/* Target Sidebar */}
        <TargetSidebar
          targetTabs={memoizedTargetTabs}
          activeTargetId={activeTargetId}
          targetStates={memoizedTargetStates}
          activeAppId={activeAppId}
          accentColor={UNIFIED_ACCENT}
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
        <WorkspacePanel
          selectedTool={selectedTool}
          activeTargetId={activeTargetId}
          targetStates={targetStates}
          selectedId={selectedId}
          searchTerm={searchTerm}
          filter={filter}
          isFilterOpen={isFilterOpen}
          fuzzerTargetId={fuzzerTargetId}
          unpackedScripts={unpackedScripts}
          currentTargetUrl={currentTargetUrl}
          getColorByIndex={getColorByIndex}
          onSetSelectedTool={handleSetSelectedTool}
          onSetSelectedId={handleSetSelectedId}
          onSearchChange={setSearchTerm}
          onFilterChange={handleSetFilter}
          onToggleFilter={handleToggleFilter}
          onSendToRepeater={handleSendToRepeater}
          onClearRequests={handleClearRequests}
          onLaunchTarget={handleLaunchTarget}
          onToggleIntercept={handleToggleIntercept}
          onStopTarget={handleStopTarget}
          onStartTarget={handleStartTarget}
          isTargetActive={isTargetActive}
        />
      </div>

      {/* Footer Bar */}
      <FooterBar
        activeTargetId={activeTargetId}
        targetState={activeTargetId ? targetStates[activeTargetId] : undefined}
      />

      {/* Modals */}
      {addModalPlatform && (
        <AddTargetModal
          isOpen={isAddModalOpen}
          platform={addModalPlatform}
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
