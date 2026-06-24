import React, { useState, useEffect, useMemo } from 'react';
import { useAccentColors } from '../../shared/hooks/useAccentColors';
import { cn } from '../../shared/lib/utils';
import { useModulePersistence } from '../../hooks/useModulePersistence';

// Components
import { RequestList, RequestDetails, initialFilterState } from './components/Home';
import { ResourcesPanel } from './components/Resources';
import { PayloadPanel } from './components/Repeater';
import { SourcesPanel } from './components/Source';
import { LogViewer } from './components/Log';
import { TargetSidebar } from './components/TargetSidebar/TargetSidebar';
import { AddTargetModal } from './components/TargetSidebar/AddTargetModal';

// Hooks
import { useTargetManagement } from './hooks/useTargetManagement';
import { useRequestFilter } from './hooks/useRequestFilter';
import { useCdpEvents } from './hooks/useCdpEvents';
import { useApps } from './hooks/useApps';

// Types
import { NetworkRequest, WebSocketConnection } from './types/inspector';
import { TargetTab, EmulateState, EmulateProps } from './types/target.types';
import { ToolType, TOOLS, DEFAULT_TOOL } from './constants/tools';
import { DEFAULT_TARGET_TAB } from './constants/defaults';
import { useTheme } from '@renderer/theme';

// Constants
const mockWsConnections: WebSocketConnection[] = [];

export default function Emulate({
  activeAppId = '',
  onStopSession = async () => {},
}: EmulateProps) {
  const { currentPreset } = useTheme();
  const accentColor = currentPreset?.tailwind?.primary || '#3b82f6';
  const { getColorByIndex } = useAccentColors();

  // Module persistence
  const [state, setState] = useModulePersistence<EmulateState>('emulate', {
    selectedTool: DEFAULT_TOOL,
    targetTabs: [{ ...DEFAULT_TARGET_TAB }],
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
    targetTabs: persistedTargetTabs,
    activeTargetId: persistedActiveTargetId,
    selectedId,
  } = state;

  // Local state
  const [loadedFromIPC, setLoadedFromIPC] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [fuzzerTargetId, setFuzzerTargetId] = useState<string | null>(null);
  const [selectedWsId, setSelectedWsId] = useState<string | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalPlatform] = useState<'web' | 'pc' | 'android' | 'cli'>('web');
  const [editingApp, setEditingApp] = useState<{
    id: string;
    name: string;
    url?: string;
    executablePath?: string;
  } | null>(null);

  // Hooks
  const { apps, addApp, updateApp } = useApps();

  // Wrapper for AddTargetModal onAdd
  const handleAddApp = (appData: any) => {
    addApp(appData);
  };

  const {
    targetTabs,
    activeTargetId,
    targetStates,
    timerDisplay,
    addTargetTab,
    removeTargetTab,
    setActiveTarget,
    startTarget,
    stopTarget,
    toggleIntercept,
    isTargetActive,
  } = useTargetManagement({
    initialTabs: persistedTargetTabs,
    initialActiveId: persistedActiveTargetId,
  });

  const { requests, clearRequests } = useCdpEvents();

  const { filter, searchTerm, setSearchTerm, updateFilter, filterRequests } = useRequestFilter();

  // Derived state
  const filteredRequests = useMemo(() => filterRequests(requests), [filterRequests, requests]);
  const currentTargetUrl = targetTabs.find((tab) => tab.id === activeTargetId)?.url;

  // Load data from IPC
  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await window.api.invoke('emulate:get-active-targets');
        if (result && result.targets && result.targets.length > 0) {
          setState((prev) => ({
            ...prev,
            targetTabs: result.targets,
            activeTargetId: result.activeId || result.targets[0].id,
          }));
        }
        setLoadedFromIPC(true);
      } catch (error) {
        console.error('Failed to load active targets:', error);
        setLoadedFromIPC(true);
      }
    };
    loadData();
  }, []);

  // Persist tabs
  useEffect(() => {
    if (!loadedFromIPC) return;
    try {
      const tabsToSave = targetTabs.filter((tab) => tab.id !== 'default');
      window.api.invoke('emulate:set-active-targets', tabsToSave, activeTargetId);
    } catch (e) {
      console.error('Failed to save tabs:', e);
    }
  }, [targetTabs, activeTargetId, loadedFromIPC]);

  // Handlers
  const handleSetSelectedId = (id: string | null) => {
    setState((prev) => ({ ...prev, selectedId: id }));
  };

  const handleSetSelectedTool = (tool: ToolType) => {
    setState((prev) => ({ ...prev, selectedTool: tool }));
    if (tool !== 'repeater') {
      setFuzzerTargetId(null);
    }
  };

  const handleSetFilter = (value: any) => {
    updateFilter(value);
  };

  const handleClearRequests = () => {
    clearRequests();
    setState((prev) => ({ ...prev, selectedId: null }));
  };

  const handleStopTarget = async () => {
    const targetId = activeTargetId;
    if (!targetId) return;

    const mode = targetStates[targetId]?.mode;
    if (mode === 'cdp') {
      await window.api.invoke('cdp:disconnect');
      await window.api.invoke('app:terminate');
    } else if (mode === 'mitm') {
      await window.api.invoke('proxy:destroy-session', 'default');
      await window.api.invoke('app:terminate');
    }

    stopTarget(targetId);
    handleClearRequests();
    await onStopSession();
  };

  const handleStartTarget = (mode: 'mitm' | 'cdp') => {
    if (!activeTargetId) return;
    startTarget(activeTargetId, mode);
  };

  const handleToggleIntercept = () => {
    if (!activeTargetId) return;
    toggleIntercept(activeTargetId);
  };

  const handleLaunchTarget = async (
    appId: string,
    proxyUrl: string,
    customUrl?: string,
    mode?: 'browser' | 'electron' | 'native' | 'cdp',
  ) => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      const result = await window.api.invoke('app:launch', appId, proxyUrl, customUrl, mode);
      if (result) {
        const app = apps.find((a) => a.id === appId);
        if (app) {
          const newTab: TargetTab = {
            id: app.id,
            title: app.name,
            favicon: app.url
              ? `https://www.google.com/s2/favicons?domain=${new URL(app.url).hostname}&sz=32`
              : undefined,
            url: app.url,
          };
          addTargetTab(newTab);
          setActiveTarget(app.id);
        }
      }
    } catch (e) {
      console.error('Launch failed:', e);
    }
  };

  const handleSendToRepeater = (req: NetworkRequest) => {
    import('./components/Repeater').then(({ addToRepeater }) => {
      addToRepeater(req.id);
    });
    setFuzzerTargetId(req.id);
    handleSetSelectedTool('repeater');
  };

  const handleStopSession = async (e: React.MouseEvent, _appId: string) => {
    e.stopPropagation();
    if (confirm('Stop the current tracking session?')) {
      await onStopSession();
    }
  };

  // Tools configuration
  const tools = TOOLS;

  return (
    <div className="flex h-full bg-background">
      {/* Target Sidebar */}
      <TargetSidebar
        targetTabs={targetTabs}
        activeTargetId={activeTargetId}
        timerDisplay={timerDisplay}
        targetStates={targetStates}
        apps={apps}
        activeAppId={activeAppId}
        accentColor={accentColor}
        onSelectTarget={setActiveTarget}
        onRemoveTarget={removeTargetTab}
        onStartTarget={handleStartTarget}
        onStopTarget={handleStopTarget}
        onLaunchTarget={handleLaunchTarget}
        onAddApp={addApp}
        onStopSession={handleStopSession}
        onOpenAddModal={() => setIsAddModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar - Feature Tabs */}
        <div className="flex h-10 border-b border-border shrink-0 overflow-x-auto gap-0.5 px-2">
          {Object.values(tools).map((tool) => {
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

        {/* Content based on selected tool */}
        {!activeTargetId || activeTargetId === 'default' ? (
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
                  <RequestList
                    filteredRequests={filteredRequests}
                    requests={requests}
                    selectedId={selectedId}
                    onSelectRequest={handleSetSelectedId}
                    searchTerm={searchTerm}
                    onSearchTermChange={setSearchTerm}
                    interceptedIds={new Set()}
                    pendingActionIds={new Set()}
                    onForward={() => {}}
                    onDrop={() => {}}
                    onDeleteRequest={() => {}}
                    appId="emulate-app"
                    onSetCompare1={() => {}}
                    onSetCompare2={() => {}}
                    setFilter={handleSetFilter}
                    onAnalyzeRequest={() => {}}
                    onSendToRepeater={handleSendToRepeater}
                    wsConnections={mockWsConnections}
                    selectedWsId={selectedWsId}
                    onSelectWsConnection={setSelectedWsId}
                    onDeleteWsConnection={() => {}}
                    browserViewUrl={null}
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
                <SourcesPanel requests={requests} />
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
      <AddTargetModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingApp(null);
        }}
        platform={addModalPlatform}
        onAdd={handleAddApp}
        existingApps={apps}
        editApp={editingApp}
        onEdit={updateApp}
      />
    </div>
  );
}
