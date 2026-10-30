/**
 * ------------------------------------------------------------------
 * Emulate
 * ------------------------------------------------------------------
 * Component chính của module Emulate — quản lý giao diện điều khiển
 * target, theo dõi network traffic, filter requests và repeater.
 *
 * Các chức năng chính:
 * - Quản lý danh sách target (tạo, sửa, xóa, chọn)
 * - Điều khiển trạng thái target (start/stop/intercept)
 * - Đồng bộ network requests, filters, timers
 * - Điều hướng giữa các workspace panel
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

// ── Utils ──

import { formatResponseSize } from './utils/network-event-parser.util';

// ── Hooks ──
import { useAccentColors } from '@renderer/shared/hooks/useAccentColors';
import useTargetData from './hooks/useTargetData';
import { useRequestFilter } from './hooks/useRequestFilter';
import useNetworkEvents from './hooks/useNetworkEvents';
import useHealthCheck from './hooks/useHealthCheck';
import { useActiveModule } from '@renderer/hooks/useActiveModule';

// ── Services ──
import { emulateApi } from './services/emulate-api.service';
import { runtimeApi } from './services/runtime-api.service';
import { installRuntimeWsBridge, wsBus } from './services/runtime-ws-bridge';
import { refreshEmulateBaseFromIpc } from './services/emulate-base-url';
import { EmulateController } from './EmulateController';

// ── UI ──
import { useAgentFeature } from '../../components/RightPanel/Zen/context/FeatureContext';
import { initialFilterState } from './components/WorkspacePanel/Home/Home';
import WorkspacePanel from './components/WorkspacePanel';
import { TargetModal } from './components/TargetListPanel/TargetModal';
import TargetSidebar from './components/TargetListPanel';
import { FooterBar } from './components/FooterBar';

// ── Stores ──
import { useTimerStore } from './stores/timerStore';
import { useNetworkStore } from './stores/networkStore';

// ── Types ──
import { NetworkRequest } from './types/inspector';
import { TargetTab, EmulateState, EmulateProps } from './types/target.types';

// ── Constants ──
import { ToolType, DEFAULT_TOOL } from './constants/tools';

// ─── Component ──────────────────────────────────────────────────────────
export default React.memo(function Emulate({
  activeAppId = '',
  onStopSession = async () => {},
}: EmulateProps) {
  // ── Store ──
  const { getColorByIndex, UNIFIED_ACCENT } = useAccentColors();
  const { setEmulateState } = useAgentFeature();

  // ── State ──
  const [state, setState] = useState<EmulateState>({
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
  const [addModalPlatform, setAddModalPlatform] = useState<'web' | 'pc' | 'android' | 'cli' | null>(
    null,
  );
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

  // ── Callbacks ──
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
        console.error('[Emulate] removeTargetTab error:', error);
      }
    },
    [deleteTarget, setState, refreshTargets],
  );

  const setActiveTarget = useCallback(
    (id: string | null) => {
      if (id) {
        emulateApi.updateLastUsed(id).catch((err) => {
          console.warn('[Emulate] Failed to update last_used_at:', err);
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

  const { clearRequests, unpackedScripts, loadMore, totalCount } = useNetworkEvents({
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

  // Sync requests to EmulateController (subscription để cập nhật real-time)
  useEffect(() => {
    const sync = () => {
      const requests = useNetworkStore.getState().requests;
      EmulateController.getInstance().setRequests(requests);
    };

    sync();

    const unsubscribe = useNetworkStore.subscribe((state, prevState) => {
      if (state.requests !== prevState.requests) {
        sync();
      }
    });

    return unsubscribe;
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
        console.error('[Emulate] Failed to load filter from API:', error);
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

  // Refs for latest values
  const activeTargetIdRef = useRef(activeTargetId);
  const targetStatesRef = useRef(targetStates);

  // Use refs to hold callbacks so the WS effect doesn't depend on their declaration order
  const stopTargetRef = useRef<(id: string) => void>(() => {});
  const clearRequestsRef = useRef<() => void>(() => {});

  // Cài WebSocket bridge một lần — thay window.api.on/off bằng WebSocket connection.
  useEffect(() => {
    // Prod: spawn emulate on-demand, rồi mới cài bridge (bridge đọc port hiện tại).
    const setup = async () => {
      if (window.api?.runtime?.startEmulate) {
        try {
          await window.api.runtime.startEmulate();
        } catch (err) {
          console.warn('[Emulate] startEmulate failed:', err);
        }
        await refreshEmulateBaseFromIpc();
      }
      installRuntimeWsBridge();
    };
    void setup();

    // Helper to perform cleanup logic shared by both immediate and permanent disconnects
    const handleCleanupOnDisconnect = async (reason: string) => {
      console.warn(`[Emulate] WS disconnected (${reason}) — cleaning up active targets.`);

      const currentState = targetStatesRef.current;
      const activeIds = Object.keys(currentState).filter((id) => currentState[id]?.isActive);

      if (activeIds.length === 0) return;

      await Promise.all(
        activeIds.map(async (tid) => {
          try {
            // Attempt to tell server to kill the browser process
            await runtimeApi.terminateApp(tid);
          } catch (err) {
            // Ignore errors here, as server might be down or unreachable
          } finally {
            // Always update local UI state regardless of API success/failure
            stopTargetRef.current(tid);
            await runtimeApi.unregisterTarget(tid).catch(() => {});
          }
        }),
      );

      clearRequestsRef.current();
    };

    // 1. Immediate disconnect notification (fires on ANY close event)
    const unsubImmediate = wsBus.on('ws:immediate-disconnect', (data: any) => {
      handleCleanupOnDisconnect(`code:${data?.code || 'unknown'}`);
    });

    // 2. Permanent failure notification (fires after max retries exhausted)
    const unsubPermanent = wsBus.on('ws:permanently-disconnected', () => {
      // Already handled by immediate disconnect usually, but kept for safety
      // in case immediate didn't trigger due to some edge case logic change.
      handleCleanupOnDisconnect('permanent-failure');
    });

    return () => {
      unsubImmediate();
      unsubPermanent();
    };
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

  // Keep refs in sync with latest callback implementations
  useEffect(() => {
    stopTargetRef.current = stopTarget;
  }, [stopTarget]);

  useEffect(() => {
    clearRequestsRef.current = handleClearRequests;
  }, [handleClearRequests]);

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
      await runtimeApi.disconnectCdp();
      await runtimeApi.terminateApp(targetId);
    } else if (mode === 'mitm' || mode === 'frida') {
      await runtimeApi.destroyProxySession('default');
      await runtimeApi.terminateApp(targetId);
    }

    stopTarget(targetId);
    handleClearRequests();

    // Hủy đăng ký target với runtime server
    await runtimeApi.unregisterTarget(targetId);

    await onStopSession();
  }, [stopTarget, handleClearRequests, onStopSession]);

  // ── Health Check: auto-stop targets whose browser process has died ──
  const handleTargetDead = useCallback(
    async (targetId: string) => {
      console.warn(`[Emulate] Target ${targetId} process is dead — cleaning up.`);

      // Only act if the target was previously marked active in our local state.
      const ts = targetStatesRef.current[targetId];
      if (!ts?.isActive) return;

      try {
        await runtimeApi.terminateApp(targetId);
      } catch (err) {
        console.error('[Emulate] terminateApp failed during health cleanup:', err);
      }

      stopTarget(targetId);
      if (activeTargetIdRef.current === targetId) {
        handleClearRequests();
      }
      await runtimeApi.unregisterTarget(targetId).catch(() => {});
    },
    [stopTarget, handleClearRequests],
  );

  const { activeModule } = useActiveModule();
  const hasActiveTarget = Object.values(targetStates).some((s) => s?.isActive);
  useHealthCheck({
    intervalMs: 5000,
    onTargetDead: handleTargetDead,
    enabled: activeModule === 'emulate' && hasActiveTarget,
  });

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
      _deviceSerial?: string,
      useSandbox?: boolean,
      userDataDir?: string,
    ) => {
      await new Promise((resolve) => setTimeout(resolve, 500));

      try {
        const target = targetTabs.find((t) => t.id === appId);
        const launchTarget = target?.executablePath || appId;

        const result = await runtimeApi.launchApp(
          launchTarget,
          proxyUrl,
          customUrl,
          mode,
          useEnvInject,
          appId, // Pass targetId (appId) to track process per target
          useSandbox,
          userDataDir,
        );
        if (result.success && result.data) {
          const newTab: TargetTab = {
            id: appId,
            title: customUrl ? new URL(customUrl).hostname : appId,
            url: customUrl || proxyUrl,
            platform: target?.platform || 'web',
            favicon: target?.favicon,
          };
          await addTargetTab(newTab);
          setActiveTarget(appId);

          // Đăng ký target metadata với runtime server
          await runtimeApi.registerTarget({
            targetId: appId,
            title: newTab.title,
            favicon: newTab.favicon,
            platform: newTab.platform,
            url: newTab.url,
          });
        }
      } catch (e) {
        console.error('[Emulate] Launch failed:', e);
      }
    },
    [targetTabs, addTargetTab, setActiveTarget],
  );

  // CLI Capture method handlers
  const handleStartEbpf = useCallback(
    async (
      targetId: string,
      executablePath?: string,
      useSandbox?: boolean,
      sudoPassword?: string,
    ) => {
      try {
        const result = await runtimeApi.startCliEbpf(
          targetId,
          executablePath,
          useSandbox,
          sudoPassword,
        );
        if (result.success) {
          startTarget(targetId, 'mitm'); // Track as active
        } else {
          alert(`Failed to start eBPF capture: ${result.error}`);
        }
      } catch (error) {
        console.error('[Emulate] eBPF start error:', error);
        alert(
          `Failed to start eBPF capture: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    },
    [startTarget],
  );

  const handleStartCdp = useCallback(
    async (targetId: string, executablePath?: string, useSandbox?: boolean) => {
      try {
        const result = await runtimeApi.startCliCdp(targetId, executablePath, useSandbox);
        if (result.success) {
          startTarget(targetId, 'cdp'); // Track as active with CDP mode
        } else {
          alert(`Failed to start CDP proxy: ${result.error}`);
        }
      } catch (error) {
        console.error('[Emulate] CDP start error:', error);
        alert(
          `Failed to start CDP proxy: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    },
    [startTarget],
  );

  const handleStartPcap = useCallback(
    async (
      targetId: string,
      executablePath?: string,
      useSandbox?: boolean,
      sudoPassword?: string,
    ) => {
      try {
        const result = await runtimeApi.startCliPcap(
          targetId,
          executablePath,
          useSandbox,
          sudoPassword,
        );
        if (result.success) {
          startTarget(targetId, 'mitm'); // Track as active
        } else {
          alert(`Failed to start packet capture: ${result.error}`);
        }
      } catch (error) {
        console.error('[Emulate] Packet capture start error:', error);
        alert(
          `Failed to start packet capture: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    },
    [startTarget],
  );

  const handleStartAppDebug = useCallback(
    async (targetId: string, executablePath?: string, useSandbox?: boolean) => {
      try {
        const result = await runtimeApi.startCliDebug(targetId, executablePath, useSandbox);
        if (result.success) {
          startTarget(targetId, 'mitm'); // Track as active
        } else {
          alert(`Failed to start app debug mode: ${result.error}`);
        }
      } catch (error) {
        console.error('[Emulate] App debug start error:', error);
        alert(
          `Failed to start app debug mode: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    },
    [startTarget],
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

  const handleEditApp = useCallback(
    async (id: string, data: { name: string; url?: string; executablePath?: string }) => {
      const current = targetTabs.find((t) => t.id === id);
      if (!current) return;

      try {
        const saved = await saveTarget({
          ...current,
          title: data.name,
          url: data.url !== undefined ? data.url : current.url,
          executablePath:
            data.executablePath !== undefined ? data.executablePath : current.executablePath,
        });

        // Merge để giữ lại các field runtime (httpsCount, dataUsed...) không có trong DB
        setState((prev) => ({
          ...prev,
          targetTabs: prev.targetTabs.map((t) => (t.id === id ? { ...t, ...saved } : t)),
        }));
        setEditingApp(null);
      } catch (error) {
        console.error('[Emulate] Edit target failed:', error);
        alert(
          'Failed to update target: ' + (error instanceof Error ? error.message : 'Unknown error'),
        );
      }
    },
    [targetTabs, saveTarget],
  );

  const handleOpenAddModal = useCallback((platform: 'web' | 'pc' | 'android' | 'cli' | null) => {
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
          onStartEbpf={handleStartEbpf}
          onStartCdp={handleStartCdp}
          onStartPcap={handleStartPcap}
          onStartAppDebug={handleStartAppDebug}
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
          loadMore={loadMore}
          workerTotalCount={totalCount}
        />
      </div>

      {/* Footer Bar */}
      <FooterBar
        activeTargetId={activeTargetId}
        targetState={activeTargetId ? targetStates[activeTargetId] : undefined}
      />

      {/* Modals */}
      {isAddModalOpen && (
        <TargetModal
          isOpen={isAddModalOpen}
          platform={addModalPlatform}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingApp(null);
          }}
          onAdd={handleAddApp}
          existingApps={targetTabs}
          editApp={editingApp}
          onEdit={handleEditApp}
        />
      )}
    </div>
  );
});
