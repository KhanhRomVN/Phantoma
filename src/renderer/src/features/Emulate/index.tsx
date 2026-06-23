import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useModulePersistence } from '../../hooks/useModulePersistence';
import {
  LayoutPanelLeft,
  Package,
  GitCompare,
  PenSquare,
  Settings,
  Code,
  ScrollText,
  X,
  Search,
  Plus,
  Globe,
  Monitor,
  Smartphone,
  Terminal,
  Square,
  Play,
  ChevronRight,
  FolderOpen,
} from 'lucide-react';
import {
  RequestList,
  RequestDetails,
  InspectorFilter,
  initialFilterState,
} from './components/Home';
import { NetworkRequest } from './types/inspector';
import { ResourcesPanel } from './components/Resources';
import { PayloadPanel } from './components/Repeater';
import { ComparePanel } from './components/Compare';
import { SourcesPanel } from './components/Source';
import { LogViewer } from './components/Log';
import { useTheme } from '../../theme/ThemeProvider';
import { cn } from '../../shared/lib/utils';
import { AddTargetModal } from './components/Target/AddTargetModal';
import { ConfirmDeleteModal } from './components/Target/ConfirmDeleteModal';
import { ConfirmLaunchModal } from './components/Target/ConfirmLaunchModal';
import { UserApp, AppPlatform } from './types/apps';
import { WebSocketConnection } from './types/inspector';

// Custom CircleStop icon (filled circle only)
const CircleStopIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    className={className}
  >
    <circle cx="12" cy="12" r="10" fill="currentColor" />
  </svg>
);

const mockRequests: NetworkRequest[] = [];
const mockWsConnections: WebSocketConnection[] = [];

interface TargetTab {
  id: string;
  title: string;
  favicon?: string;
  url?: string;
}

interface EmulateProps {
  activeAppId?: string;
  _activeAppName?: string;
  onSelectApp?: (
    appId: string,
    proxyUrl: string,
    customUrl?: string,
    mode?: 'browser' | 'electron' | 'native' | 'cdp',
  ) => Promise<void>;
  onStopSession?: () => Promise<void>;
}

type ToolType =
  | 'home'
  | 'intruder'
  | 'repeater'
  | 'resource'
  | 'source'
  | 'log';

interface EmulateState {
  selectedTool: ToolType;
  targetTabs: TargetTab[];
  activeTargetId: string | null;
  requests: NetworkRequest[];
  selectedId: string | null;
  searchTerm: string;
  // Per-target state tracking
  targetStates: {
    [targetId: string]: {
      isActive: boolean;
      mode: 'mitm' | 'cdp' | null;
      isIntercepting: boolean;
      startTime?: number;
    };
  };
  // Legacy fields for backward compatibility (will be removed)
  isTargetActive: boolean;
  activeTargetMode: 'mitm' | 'cdp' | null;
  isInterceptActive: boolean;
  filter: InspectorFilter;
}

export default function Emulate({
  activeAppId = '',
  _activeAppName = '',
  onSelectApp = async () => {},
  onStopSession = async () => {},
}: EmulateProps) {
  const { currentPreset } = useTheme();
  const accentColor = currentPreset?.tailwind?.primary || '#3b82f6';

  const [state, setState] = useModulePersistence<EmulateState>('emulate', {
    selectedTool: 'intruder',
    targetTabs: [{ id: 'default', title: 'Chưa chọn target', favicon: undefined, url: undefined }],
    activeTargetId: null,
    requests: [],
    selectedId: null,
    searchTerm: '',
    targetStates: {},
    // Legacy fields for backward compatibility
    isTargetActive: false,
    activeTargetMode: null,
    isInterceptActive: false,
    filter: initialFilterState,
  });

  const {
    selectedTool,
    targetTabs: persistedTargetTabs,
    activeTargetId: persistedActiveTargetId,
    requests: persistedRequests,
    selectedId: persistedSelectedId,
    searchTerm: persistedSearchTerm,
    filter: persistedFilter,
  } = state;

  // State để lưu dữ liệu từ IPC
  const [loadedFromIPC, setLoadedFromIPC] = useState(false);
  const [initialTabs, setInitialTabs] = useState<TargetTab[]>([
    { id: 'default', title: 'Chưa chọn target', favicon: undefined, url: undefined },
  ]);
  const [initialActiveId, setInitialActiveId] = useState<string | null>(null);

  // Load dữ liệu từ IPC khi component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await window.api.invoke('emulate:get-active-targets');

        if (result && result.targets && result.targets.length > 0) {
          setInitialTabs(result.targets);
          setInitialActiveId(result.activeId || result.targets[0].id);
          // Cập nhật Zustand với dữ liệu từ IPC
          setState((prev) => ({
            ...prev,
            targetTabs: result.targets,
            activeTargetId: result.activeId || result.targets[0].id,
          }));
        } else {
          // Không có dữ liệu, dùng default
          setInitialTabs([
            { id: 'default', title: 'Chưa chọn target', favicon: undefined, url: undefined },
          ]);
          setInitialActiveId(null);
        }

        // Lấy trạng thái CDP từ main process để đồng bộ
        try {
          const cdpState = await window.api.invoke('cdp:get-state');
          if (cdpState && cdpState.isConnected) {
            setState((prev) => ({
              ...prev,
              isTargetActive: true,
              activeTargetMode: 'cdp',
              isInterceptActive: cdpState.isIntercepting || false,
            }));
          }
        } catch (cdpError) {
          // Nếu chưa có handler 'cdp:get-state', bỏ qua
          console.debug('CDP state not available:', cdpError);
        }

        setLoadedFromIPC(true);
      } catch (error) {
        console.error('[DEBUG] Failed to load active targets from IPC:', error);
        setLoadedFromIPC(true);
      }
    };
    loadData();
  }, []);

  // Sử dụng useMemo để tính toán lại khi persisted state thay đổi
  const targetTabs = useMemo(() => {
    const result = persistedTargetTabs.length > 0 ? persistedTargetTabs : initialTabs;
    return result;
  }, [persistedTargetTabs, initialTabs]);

  const activeTargetId = useMemo(() => {
    const result = persistedActiveTargetId !== null ? persistedActiveTargetId : initialActiveId;
    return result;
  }, [persistedActiveTargetId, initialActiveId]);

  const requests = useMemo(() => {
    return persistedRequests.length > 0 ? persistedRequests : mockRequests;
  }, [persistedRequests]);

  const selectedId = useMemo(() => {
    return persistedSelectedId !== null ? persistedSelectedId : '1';
  }, [persistedSelectedId]);

  const searchTerm = useMemo(() => {
    return persistedSearchTerm || '';
  }, [persistedSearchTerm]);

  const filter = useMemo(() => {
    return persistedFilter || initialFilterState;
  }, [persistedFilter]);

  // Đồng bộ Zustand với localStorage khi khởi tạo (đảm bảo state nhất quán sau reload)
  React.useEffect(() => {
    // Nếu Zustand rỗng nhưng localStorage có dữ liệu, cập nhật Zustand
    if (
      persistedTargetTabs.length === 0 &&
      initialTabs.length > 0 &&
      initialTabs[0].id !== 'default'
    ) {
      setState((prev) => ({ ...prev, targetTabs: initialTabs }));
    }
    if (persistedActiveTargetId === null && initialActiveId && initialActiveId !== 'default') {
      setState((prev) => ({ ...prev, activeTargetId: initialActiveId }));
    }
  }, []);

  // Persist tabs via IPC whenever they change
  React.useEffect(() => {
    if (!loadedFromIPC) return;
    try {
      const tabsToSave = targetTabs.filter((tab) => tab.id !== 'default');
      window.api
        .invoke('emulate:set-active-targets', tabsToSave, activeTargetId)
        .then(() => console.log('[DEBUG] Saved via IPC successfully'))
        .catch((err) => console.error('[DEBUG] Failed to save via IPC:', err));
    } catch (e) {
      console.error('Failed to save tabs:', e);
    }
  }, [targetTabs, activeTargetId, loadedFromIPC]);

  const [filteredRequests, setFilteredRequests] = useState<NetworkRequest[]>(mockRequests);
  const [, setCdpRequests] = useState<NetworkRequest[]>([]);
  const [, setCdpRequestMap] = useState<Map<string, NetworkRequest>>(new Map());
  // Use a Map stored on window to ensure it survives re-renders and component lifecycle
  // This must be initialized once and never re-created
  if (!(window as any)._phantomaCdpTimestamps) {
    (window as any)._phantomaCdpTimestamps = new Map<string, number>();
  }
  // Store reference to avoid re-reading from window
  const requestTimestampMap = (window as any)._phantomaCdpTimestamps;
  const [interceptedIds] = useState<Set<string>>(new Set());
  const [pendingActionIds] = useState<Set<string>>(new Set());
  const [selectedWsId, setSelectedWsId] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Wrapper functions for state updates using setState
  const setRequests = (
    value: NetworkRequest[] | ((prev: NetworkRequest[]) => NetworkRequest[]),
  ) => {
    setState((prev) => {
      const newRequests = typeof value === 'function' ? value(prev.requests) : value;
      return { ...prev, requests: newRequests };
    });
  };

  const setSelectedId = (value: string | null) => {
    setState((prev) => ({ ...prev, selectedId: value }));
  };

  const setSearchTerm = (value: string) => {
    setState((prev) => ({ ...prev, searchTerm: value }));
  };

  const setFilter = (value: InspectorFilter | ((prev: InspectorFilter) => InspectorFilter)) => {
    setState((prev) => {
      const newFilter = typeof value === 'function' ? value(prev.filter) : value;
      return { ...prev, filter: newFilter };
    });
  };

  const setTargetTabs = (value: TargetTab[] | ((prev: TargetTab[]) => TargetTab[])) => {
    setState((prev) => {
      const newTabs = typeof value === 'function' ? value(prev.targetTabs) : value;
      return { ...prev, targetTabs: newTabs };
    });
  };

  const setActiveTargetId = (value: string | null) => {
    setState((prev) => ({ ...prev, activeTargetId: value }));
  };

  const setSelectedTool = (value: ToolType) => {
    setState((prev) => ({ ...prev, selectedTool: value }));
  };

  const handleForward = (_id: string) => {};

  const handleDrop = (_id: string) => {};

  const handleDeleteRequest = (_id: string) => {};

  const handleToggleIntercept = () => {
    if (!activeTargetId) return;

    setState((prev) => ({
      ...prev,
      targetStates: {
        ...prev.targetStates,
        [activeTargetId]: {
          ...prev.targetStates[activeTargetId],
          isIntercepting: !prev.targetStates[activeTargetId]?.isIntercepting,
        },
      },
      // Legacy field update
      isInterceptActive: !prev.isInterceptActive,
    }));
  };

  const handleStopTarget = async () => {
    if (!activeTargetId) return;

    // Get current target mode before clearing
    const currentMode = state.targetStates[activeTargetId]?.mode;

    // Disconnect based on mode
    if (currentMode === 'cdp') {
      try {
        // Disconnect CDP
        await window.api.invoke('cdp:disconnect');
        console.log('[Emulate] CDP disconnected successfully');

        // Close browser/app
        await window.api.invoke('app:terminate');
        console.log('[Emulate] Browser/app terminated successfully');
      } catch (error) {
        console.error('[Emulate] Failed to disconnect CDP or terminate app:', error);
      }
    } else if (currentMode === 'mitm') {
      try {
        // Stop MITM proxy session
        await window.api.invoke('proxy:destroy-session', 'default');
        console.log('[Emulate] MITM proxy stopped successfully');

        // Close browser/app
        await window.api.invoke('app:terminate');
        console.log('[Emulate] Browser/app terminated successfully');
      } catch (error) {
        console.error('[Emulate] Failed to stop MITM proxy or terminate app:', error);
      }
    }

    // Update state
    setState((prev) => ({
      ...prev,
      targetStates: {
        ...prev.targetStates,
        [activeTargetId]: {
          isActive: false,
          mode: null,
          isIntercepting: false,
        },
      },
      // Legacy fields update
      isTargetActive: false,
      activeTargetMode: null,
      isInterceptActive: false,
    }));

    // Also clear requests when stopping
    clearRequests();

    // Notify parent if needed
    onStopSession();
  };

  const handleStartTarget = (mode: 'mitm' | 'cdp') => {
    if (!activeTargetId) return;

    setState((prev) => ({
      ...prev,
      targetStates: {
        ...prev.targetStates,
        [activeTargetId]: {
          isActive: true,
          mode: mode,
          isIntercepting: false,
          startTime: Date.now(),
        },
      },
      // Legacy fields update
      isTargetActive: true,
      activeTargetMode: mode,
      isInterceptActive: false,
    }));
  };

  // Clear all requests (used when stopping CDP/proxy session)
  const clearRequests = () => {
    setRequests([]);
    setFilteredRequests([]);
    setCdpRequests([]);
    setCdpRequestMap(new Map());
    requestTimestampMap.clear();
    setSelectedId(null);
  };

  const handleSetCompare1 = (_req: NetworkRequest | null) => {};

  const handleSetCompare2 = (_req: NetworkRequest | null) => {};

  const handleAnalyzeRequest = (_req: NetworkRequest) => {};

  const [fuzzerTargetId, setFuzzerTargetId] = useState<string | null>(null);

  const handleSendToRepeater = (req: NetworkRequest) => {
    // Add request to Repeater storage
    import('./components/Repeater').then(({ addToRepeater }) => {
      addToRepeater(req.id);
    });
    setFuzzerTargetId(req.id);
    setSelectedTool('repeater');
  };

  // Clear fuzzer target when switching away from repeater tab
  useEffect(() => {
    if (selectedTool !== 'repeater') {
      setFuzzerTargetId(null);
    }
  }, [selectedTool]);

  const handleDeleteWsConnection = (_id: string) => {};

  const tools: { id: ToolType; icon: React.ReactNode; label: string; color: string }[] = [
    {
      id: 'home',
      icon: <LayoutPanelLeft className="w-4 h-4" />,
      label: 'Home',
      color: 'blue',
    },
    {
      id: 'intruder',
      icon: <LayoutPanelLeft className="w-4 h-4" />,
      label: 'Intruder',
      color: 'purple',
    },
    {
      id: 'repeater',
      icon: <Package className="w-4 h-4" />,
      label: 'Repeater',
      color: 'orange',
    },
    {
      id: 'resource',
      icon: <FolderOpen className="w-4 h-4" />,
      label: 'Resource',
      color: 'teal',
    },
    { id: 'source', icon: <Code className="w-4 h-4" />, label: 'Source', color: 'yellow' },
    { id: 'log', icon: <ScrollText className="w-4 h-4" />, label: 'Log', color: 'red' },
  ];

  // ---- Target management state ----
  const [apps, setApps] = useState<UserApp[]>([]);
  const [targetSearchQuery, setTargetSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<AppPlatform | null>(null);
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalPlatform] = useState<'web' | 'pc' | 'android' | 'cli'>('web');
  const [editingApp, setEditingApp] = useState<{
    id: string;
    name: string;
    url?: string;
    executablePath?: string;
  } | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [appToDelete, setAppToDelete] = useState<UserApp | null>(null);
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
  const [appToLaunch, setAppToLaunch] = useState<UserApp | null>(null);

  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [createDrawerPlatform, setCreateDrawerPlatform] = useState<AppPlatform | null>(null);
  const [newTargetName, setNewTargetName] = useState('');
  const [newTargetUrl, setNewTargetUrl] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    app: UserApp;
  } | null>(null);
  const [targetContextMenu, setTargetContextMenu] = useState<{
    x: number;
    y: number;
    tab: TargetTab;
  } | null>(null);
  const [subMenuHover, setSubMenuHover] = useState<string | null>(null);

  // Fetch apps from backend
  const fetchApps = async () => {
    try {
      const result = await window.api.invoke('apps:get-all');
      if (result) setApps(result);
    } catch (e) {
      console.error('Failed to fetch apps:', e);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  // Timer state for running targets
  const [timerDisplay, setTimerDisplay] = useState<Record<string, string>>({});

  // Update timers every second for running targets
  useEffect(() => {
    const interval = setInterval(() => {
      const newTimers: Record<string, string> = {};
      Object.entries(state.targetStates).forEach(([id, targetState]) => {
        if (targetState.isActive && targetState.startTime) {
          const diff = Date.now() - targetState.startTime;
          const minutes = Math.floor(diff / 60000);
          const seconds = Math.floor((diff % 60000) / 1000);
          newTimers[id] = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
      });
      setTimerDisplay(newTimers);
    }, 1000);

    return () => clearInterval(interval);
  }, [state.targetStates]);

  // Filter requests based on filter state
  const filterRequests = useMemo(() => {
    return requests.filter((req) => {
      // Method filter
      const method = req.method?.toUpperCase() || '';
      const methodKey = method as keyof typeof filter.methods;
      if (method && filter.methods[methodKey] === false) {
        return false;
      }

      // Host filter (whitelist)
      if (filter.host.whitelist.length > 0) {
        const hostMatch = filter.host.whitelist.some((h) =>
          req.host?.toLowerCase().includes(h.toLowerCase()),
        );
        if (!hostMatch) return false;
      }

      // Status filter
      const status = req.status;
      if (status && filter.status[status] === false) {
        return false;
      }

      // Type filter
      const type = req.type?.toLowerCase() || '';
      const typeMap: Record<string, string> = {
        xhr: 'xhr',
        js: 'js',
        css: 'css',
        img: 'img',
        media: 'media',
        font: 'font',
        doc: 'doc',
        ws: 'ws',
        wasm: 'wasm',
        manifest: 'manifest',
        other: 'other',
      };
      const typeKey = typeMap[type] || 'other';
      if (filter.type[typeKey as keyof typeof filter.type] === false) {
        return false;
      }

      return true;
    });
  }, [requests, filter]);

  // Sync filteredRequests with filtered data
  useEffect(() => {
    setFilteredRequests(filterRequests);
  }, [filterRequests]);

  // CDP event listeners
  useEffect(() => {
    const handleCdpRequest = (_event: any, data: any) => {
      // Removed debug log for cleaner console
      // Convert CDP request to NetworkRequest format
      let host = '';
      let path = '';
      let protocol = 'http';
      try {
        if (data.url) {
          const url = new URL(data.url);
          host = url.host;
          path = url.pathname;
          protocol = url.protocol.replace(':', '');
        }
      } catch (e) {
        console.warn('[CDP] Failed to parse URL:', data.url, e);
      }
      // Map CDP resource type to Phantoma type
      const resourceTypeMap: Record<string, string> = {
        Document: 'doc',
        XHR: 'xhr',
        Fetch: 'fetch',
        Script: 'js',
        Stylesheet: 'css',
        Image: 'img',
        Media: 'media',
        Font: 'font',
        WebSocket: 'ws',
        Manifest: 'manifest',
        Other: 'other',
      };
      const type = resourceTypeMap[data.resourceType] || 'other';
      const id = data.id || `cdp-${Date.now()}-${Math.random()}`;
      const requestTimestamp = data.timestamp || Date.now();
      // Store timestamp for time calculation using global Map
      requestTimestampMap.set(id, requestTimestamp);

      const req: NetworkRequest = {
        id: id,
        method: data.method || 'GET',
        protocol: protocol,
        host: host,
        path: path,
        url: data.url || '',
        status: 0, // Will be updated when response arrives
        type: type,
        size: '0 B',
        time: '0ms',
        timestamp: requestTimestamp,
        requestHeaders: data.headers || {},
        responseHeaders: {},
        requestBody: data.requestBody || '',
        responseBody: '',
        initiator: data.initiator, // Store initiator from CDP
      };
      setCdpRequestMap((prev) => {
        const newMap = new Map(prev);
        newMap.set(req.id, req);
        return newMap;
      });
      setCdpRequests((prev) => {
        const exists = prev.some((r) => r.id === req.id);
        if (exists) return prev;
        return [...prev, req];
      });
      setRequests((prev) => {
        const exists = prev.some((r) => r.id === req.id);
        if (exists) return prev;
        return [...prev, req];
      });
      setFilteredRequests((prev) => {
        const exists = prev.some((r) => r.id === req.id);
        if (exists) return prev;
        return [...prev, req];
      });
    };

    const handleCdpResponse = (_event: any, data: any) => {
      setCdpRequestMap((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(data.id);
        if (existing) {
          newMap.set(data.id, {
            ...existing,
            status: data.statusCode || 200,
            responseHeaders: data.headers || {},
          });
        } else {
          console.warn('[CDP] No existing request found for response id:', data.id);
        }
        return newMap;
      });
      setCdpRequests((prev) => {
        return prev.map((r) => {
          if (r.id === data.id) {
            return {
              ...r,
              status: data.statusCode || 200,
              responseHeaders: data.headers || {},
            };
          }
          return r;
        });
      });
      setRequests((prev) => {
        return prev.map((r) => {
          if (r.id === data.id) {
            return {
              ...r,
              status: data.statusCode || 200,
              responseHeaders: data.headers || {},
            };
          }
          return r;
        });
      });
    };

    const handleCdpResponseBody = (_event: any, data: any) => {
      // Try to get timestamp, if not found, retry after a short delay
      let requestTimestamp = requestTimestampMap.get(data.id);
      let timeMs = 0;

      if (requestTimestamp) {
        const currentTime = data.timestamp || Date.now();
        timeMs = currentTime - requestTimestamp;
        requestTimestampMap.delete(data.id);
      } else {
        // Retry after 500ms to allow request to be processed
        setTimeout(() => {
          const retryTimestamp = requestTimestampMap.get(data.id);
          if (retryTimestamp) {
            const currentTime = data.timestamp || Date.now();
            const retryTimeMs = currentTime - retryTimestamp;
            // Update time if we have the request in state
            setRequests((prev) => {
              return prev.map((r) => {
                if (r.id === data.id) {
                  const timeStr =
                    retryTimeMs >= 1000
                      ? `${(retryTimeMs / 1000).toFixed(2)}s`
                      : `${retryTimeMs}ms`;
                  return { ...r, time: timeStr };
                }
                return r;
              });
            });
            setCdpRequests((prev) => {
              return prev.map((r) => {
                if (r.id === data.id) {
                  const timeStr =
                    retryTimeMs >= 1000
                      ? `${(retryTimeMs / 1000).toFixed(2)}s`
                      : `${retryTimeMs}ms`;
                  return { ...r, time: timeStr };
                }
                return r;
              });
            });
            setCdpRequestMap((prev) => {
              const newMap = new Map(prev);
              const existing = newMap.get(data.id);
              if (existing) {
                const timeStr =
                  retryTimeMs >= 1000 ? `${(retryTimeMs / 1000).toFixed(2)}s` : `${retryTimeMs}ms`;
                newMap.set(data.id, { ...existing, time: timeStr });
              }
              return newMap;
            });
            requestTimestampMap.delete(data.id);
          }
        }, 100);
      }
      const timeStr = timeMs >= 1000 ? `${(timeMs / 1000).toFixed(2)}s` : `${timeMs}ms`;

      setCdpRequestMap((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(data.id);
        if (existing) {
          newMap.set(data.id, {
            ...existing,
            responseBody: data.body || '',
            size: data.size ? `${(data.size / 1024).toFixed(1)} KB` : '0 B',
            time: timeStr,
          });
        } else {
          console.warn('[CDP] No existing request found for body id:', data.id);
        }
        return newMap;
      });
      setCdpRequests((prev) => {
        return prev.map((r) => {
          if (r.id === data.id) {
            return {
              ...r,
              responseBody: data.body || '',
              size: data.size ? `${(data.size / 1024).toFixed(1)} KB` : '0 B',
              time: timeStr,
            };
          }
          return r;
        });
      });
      setRequests((prev) => {
        return prev.map((r) => {
          if (r.id === data.id) {
            return {
              ...r,
              responseBody: data.body || '',
              size: data.size ? `${(data.size / 1024).toFixed(1)} KB` : '0 B',
              time: timeStr,
            };
          }
          return r;
        });
      });
    };

    const handleCdpError = (_event: any, _data: any) => {};

    window.api.on?.('cdp:request', handleCdpRequest);
    window.api.on?.('cdp:response', handleCdpResponse);
    window.api.on?.('cdp:response-body', handleCdpResponseBody);
    window.api.on?.('cdp:error', handleCdpError);

    return () => {
      // Note: window.api.off is not implemented in preload
    };
  }, []);

  // ---- Target management handlers ----
  const handleAddApp = async (appData: any) => {
    try {
      await window.api.invoke('apps:add', appData);
      await fetchApps();
    } catch (e) {
      console.error('Failed to add app:', e);
    }
  };

  const handleEditApp = async (
    id: string,
    data: { name: string; url?: string; executablePath?: string },
  ) => {
    try {
      await window.api.invoke('apps:update', id, data);
      await fetchApps();
      setEditingApp(null);
    } catch (e) {
      console.error('Failed to update app:', e);
    }
  };

  const handleDeleteApp = async () => {
    if (!appToDelete) return;
    try {
      await window.api.invoke('apps:delete', appToDelete.id);
      await fetchApps();
      setAppToDelete(null);
    } catch (e) {
      console.error('Failed to delete app:', e);
    }
  };

  // Wrapper function to launch app - used by RequestTable via onLaunchTarget
  const handleLaunchTarget = async (
    appId: string,
    proxyUrl: string,
    customUrl?: string,
    mode?: 'browser' | 'electron' | 'native' | 'cdp',
  ) => {
    // Wait a bit for proxy to be fully ready
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Always use IPC directly for launching (bypass onSelectApp from parent)
    try {
      const result = await window.api.invoke('app:launch', appId, proxyUrl, customUrl, mode);

      if (result) {
        // Add to active tabs if launch succeeded
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
          setTargetTabs((prev) => {
            const exists = prev.some((t) => t.id === app.id);
            if (exists) return prev;
            return [...prev, newTab];
          });
          setActiveTargetId(app.id);
        }
      } else {
        console.warn('[Emulate] app:launch returned false');
        // Fallback: try using onSelectApp if available
        if (onSelectApp && onSelectApp.toString() !== 'async () => {}') {
          try {
            await onSelectApp(appId, proxyUrl, customUrl, mode);
          } catch (e) {
            console.error('[Emulate] onSelectApp fallback failed:', e);
          }
        }
      }
    } catch (e) {
      console.error('[Emulate] IPC launch failed:', e);
      // Fallback: try using onSelectApp if available
      if (onSelectApp && onSelectApp.toString() !== 'async () => {}') {
        try {
          await onSelectApp(appId, proxyUrl, customUrl, mode);
        } catch (e2) {
          console.error('[Emulate] onSelectApp fallback failed:', e2);
        }
      }
    }
  };

  const handleLaunchWithConfirm = (app: UserApp) => {
    if (activeAppId && activeAppId !== app.id) {
      setAppToLaunch(app);
      setIsLaunchModalOpen(true);
    } else {
      handleLaunchTarget(
        app.id,
        'http://127.0.0.1:8081',
        app.url,
        app.platform === 'web' ? 'browser' : 'electron',
      );
    }
  };

  const handleClearAndLaunch = async () => {
    if (appToLaunch) {
      await onStopSession();
      await handleLaunchTarget(
        appToLaunch.id,
        'http://127.0.0.1:8081',
        appToLaunch.url,
        appToLaunch.platform === 'web' ? 'browser' : 'electron',
      );
      setAppToLaunch(null);
    }
  };

  const handleKeepAndLaunch = async () => {
    if (appToLaunch) {
      await handleLaunchTarget(
        appToLaunch.id,
        'http://127.0.0.1:8081',
        appToLaunch.url,
        appToLaunch.platform === 'web' ? 'browser' : 'electron',
      );
      setAppToLaunch(null);
    }
  };

  const handleStopSession = async (e: React.MouseEvent, _appId: string) => {
    e.stopPropagation();
    if (confirm('Stop the current tracking session?')) {
      await onStopSession();
    }
  };

  // Get platform icon
  const getPlatformIcon = (platform: AppPlatform) => {
    switch (platform) {
      case 'web':
        return <Globe className="w-3 h-3" />;
      case 'pc':
        return <Monitor className="w-3 h-3" />;
      case 'android':
        return <Smartphone className="w-3 h-3" />;
      case 'cli':
        return <Terminal className="w-3 h-3" />;
      default:
        return <Code className="w-3 h-3" />;
    }
  };

  const getPlatformColor = (platform: AppPlatform) => {
    switch (platform) {
      case 'web':
        return 'text-sky-400';
      case 'pc':
        return 'text-violet-400';
      case 'android':
        return 'text-emerald-400';
      case 'cli':
        return 'text-amber-400';
      default:
        return 'text-text-secondary';
    }
  };

  const activeTargets = targetTabs.filter((tab) => tab.id !== 'default');

  // Close context menus on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
      setTargetContextMenu(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Listen for navigate-to-source events from Initiator tab
  useEffect(() => {
    const handleNavigateToSource = (event: CustomEvent) => {
      const { url, line, col, functionName } = event.detail;

      // Switch to source tab
      setSelectedTool('source');

      // Dispatch event for SourcesPanel to handle highlighting
      window.dispatchEvent(
        new CustomEvent('source-highlight', {
          detail: { url, line, col, functionName },
        }),
      );
    };

    window.addEventListener('navigate-to-source', handleNavigateToSource as EventListener);
    return () => {
      window.removeEventListener('navigate-to-source', handleNavigateToSource as EventListener);
    };
  }, []);

  return (
    <div className="flex h-full bg-background">
      {/* Left Panel - Target Management */}
      <div className="w-80 shrink-0 border-r border-border flex flex-col bg-background relative">
        <div className="flex items-center justify-between px-3 h-10 border-b border-border shrink-0">
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-text-secondary">Targets</span>
            {selectedPlatform !== null && (
              <>
                <ChevronRight className="w-3 h-3 text-text-secondary" />
                <span className="text-xs font-medium text-text-primary">
                  {selectedPlatform === 'web'
                    ? 'Website'
                    : selectedPlatform === 'pc'
                      ? 'App'
                      : selectedPlatform === 'android'
                        ? 'Mobile'
                        : 'CLI'}
                </span>
              </>
            )}
          </div>
          {selectedPlatform !== null && (
            <button
              onClick={() => {
                setSelectedPlatform(null);
                setTargetSearchQuery('');
                setShowCreateDrawer(false);
                setCreateDrawerPlatform(null);
              }}
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {selectedPlatform === null ? (
          // Default state: show search + "+ Target" button + active targets
          <>
            <div className="px-3 py-1.5 border-b border-border shrink-0">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search targets..."
                  value={targetSearchQuery}
                  onChange={(e) => setTargetSearchQuery(e.target.value)}
                  className="w-full h-8 bg-input-background border border-border rounded pl-2 pr-2 text-xs text-text-primary placeholder:text-text-secondary outline-none focus:border-primary/50"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-1.5">
              {/* "+ Target" button - at the top */}
              <div className="relative mb-3" ref={dropdownRef}>
                <button
                  onClick={() => setShowPlatformDropdown(!showPlatformDropdown)}
                  className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-dropdown-item-hover text-xs font-medium border border-dashed border-border transition-all"
                >
                  <Plus className="w-3 h-3" /> Target
                </button>
                {showPlatformDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 rounded-md border border-border bg-dropdown-background shadow-lg z-10 overflow-hidden">
                    {[
                      { id: 'web', label: 'Website', icon: Globe },
                      { id: 'pc', label: 'App', icon: Monitor },
                      { id: 'android', label: 'Mobile', icon: Smartphone },
                      { id: 'cli', label: 'CLI', icon: Terminal },
                    ].map((platform) => {
                      const Icon = platform.icon;
                      return (
                        <button
                          key={platform.id}
                          onClick={() => {
                            setSelectedPlatform(platform.id as AppPlatform);
                            setShowPlatformDropdown(false);
                            setTargetSearchQuery('');
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-primary hover:bg-dropdown-item-hover transition-all border-b border-border last:border-b-0"
                        >
                          <Icon className="w-3.5 h-3.5" style={{ color: accentColor }} />
                          {platform.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Active targets - no label, no borderLeft */}
              {activeTargets.length > 0 && (
                <div className="space-y-0.5">
                  {activeTargets.map((tab) => {
                    const isRunning = state.targetStates[tab.id]?.isActive || false;
                    const elapsed = timerDisplay[tab.id] || '00:00';

                    return (
                      <div
                        key={tab.id}
                        onClick={() => {
                          setActiveTargetId(tab.id);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setTargetContextMenu({ x: e.clientX, y: e.clientY, tab });
                        }}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-all text-sm group relative',
                          activeTargetId === tab.id
                            ? 'bg-dropdown-item-hover text-text-primary'
                            : 'text-text-secondary hover:bg-dropdown-item-hover hover:text-text-primary',
                        )}
                      >
                        {tab.favicon ? (
                          <img
                            src={tab.favicon}
                            alt={tab.title}
                            className="w-5 h-5 shrink-0 rounded"
                          />
                        ) : (
                          <Code className="w-4 h-4 shrink-0" />
                        )}
                        <span className="flex-1 truncate font-medium">{tab.title}</span>
                        {isRunning && (
                          <span className="text-xs font-mono text-text-secondary shrink-0">
                            {elapsed}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Context Menu for Active Targets */}
              {targetContextMenu && (
                <div
                  className="fixed z-50 bg-dropdown-background border border-border rounded-md shadow-[0_4px_12px_rgba(0,0,0,0.15)] py-1 min-w-[200px]"
                  style={{ top: targetContextMenu.y, left: targetContextMenu.x }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseLeave={() => setSubMenuHover(null)}
                >
                  {!state.targetStates[targetContextMenu.tab.id]?.isActive && (
                    <div
                      className="relative"
                      onMouseEnter={() => setSubMenuHover('start')}
                      onMouseLeave={() => setSubMenuHover(null)}
                    >
                      <button className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-dropdown-item-hover transition-all">
                        <div className="flex items-center gap-2">
                          <Play className="w-3.5 h-3.5" />
                          <span>Start target</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-text-secondary" />
                      </button>
                      {subMenuHover === 'start' && (
                        <div
                          className="absolute left-full top-0 ml-1 z-50 bg-dropdown-background border border-border rounded-md shadow-[0_4px_12px_rgba(0,0,0,0.15)] py-1 min-w-[140px]"
                          onMouseEnter={() => setSubMenuHover('start')}
                          onMouseLeave={() => setSubMenuHover(null)}
                        >
                          <button
                            onClick={() => {
                              handleStartTarget('cdp');
                              setTargetContextMenu(null);
                              setSubMenuHover(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-dropdown-item-hover transition-all"
                          >
                            <span>CDP</span>
                          </button>
                          <button
                            onClick={() => {
                              handleStartTarget('mitm');
                              setTargetContextMenu(null);
                              setSubMenuHover(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-dropdown-item-hover transition-all"
                          >
                            <span>MITM</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {state.targetStates[targetContextMenu.tab.id]?.isActive && (
                    <button
                      onClick={() => {
                        handleStopTarget();
                        setTargetContextMenu(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-dropdown-item-hover transition-all"
                    >
                      <Square className="w-3.5 h-3.5" />
                      <span>Stop target</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const tab = targetContextMenu.tab;
                      const newTabs = targetTabs.filter((t) => t.id !== tab.id);
                      setTargetTabs(newTabs);
                      if (activeTargetId === tab.id) {
                        setActiveTargetId(newTabs.length > 0 ? newTabs[0].id : null);
                      }
                      setTargetContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-dropdown-item-hover transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Xóa target</span>
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          // Platform-specific view: show targets with search bar and favicons
          <>
            <div className="px-2 py-1.5 border-b border-border shrink-0">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
                <input
                  type="text"
                  placeholder={`Search ${selectedPlatform === 'web' ? 'websites' : selectedPlatform === 'pc' ? 'apps' : selectedPlatform === 'android' ? 'mobile apps' : 'CLI tools'}...`}
                  value={targetSearchQuery}
                  onChange={(e) => setTargetSearchQuery(e.target.value)}
                  className="w-full h-7 bg-input-background border border-border rounded pl-7 pr-2 text-xs text-text-primary placeholder:text-text-secondary outline-none focus:border-primary/50"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-1.5 relative">
              {/* "+ Create [platform]" button - at the top of the list */}
              <button
                onClick={() => {
                  setCreateDrawerPlatform(selectedPlatform);
                  setShowCreateDrawer(true);
                  setNewTargetName('');
                  setNewTargetUrl('');
                }}
                className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-dropdown-item-hover text-xs font-medium border border-dashed border-border transition-all mb-3"
                style={{ borderColor: accentColor + '60' }}
              >
                <Plus className="w-3 h-3" style={{ color: accentColor }} />
                Create{' '}
                {selectedPlatform === 'web'
                  ? 'Website'
                  : selectedPlatform === 'pc'
                    ? 'App'
                    : selectedPlatform === 'android'
                      ? 'Mobile'
                      : 'CLI'}
              </button>

              {apps
                .filter(
                  (app) =>
                    app.platform === selectedPlatform &&
                    app.name.toLowerCase().includes(targetSearchQuery.toLowerCase()),
                )
                .map((app) => {
                  const isActive = app.id === activeAppId;
                  const isOpen = activeTargets.some((t) => t.id === app.id);
                  let faviconUrl: string | undefined = undefined;
                  if (app.url) {
                    try {
                      const hostname = new URL(app.url).hostname;
                      faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
                    } catch (e) {
                      // Invalid URL, skip favicon
                    }
                  }
                  return (
                    <div
                      key={app.id}
                      onClick={() => {
                        if (!isOpen) {
                          const newTab: TargetTab = {
                            id: app.id,
                            title: app.name,
                            favicon: app.url
                              ? `https://www.google.com/s2/favicons?domain=${new URL(app.url).hostname}&sz=32`
                              : undefined,
                            url: app.url,
                          };
                          setTargetTabs((prev) => {
                            const exists = prev.some((t) => t.id === app.id);
                            if (exists) return prev;
                            return [...prev, newTab];
                          });
                          setActiveTargetId(app.id);
                          // Quay về UI current target
                          setSelectedPlatform(null);
                          setTargetSearchQuery('');
                        }
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({ x: e.clientX, y: e.clientY, app });
                      }}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-md transition-all text-sm group',
                        isOpen
                          ? 'bg-dropdown-item-hover/30 cursor-pointer hover:bg-dropdown-item-hover/50'
                          : 'hover:bg-dropdown-item-hover cursor-pointer',
                      )}
                    >
                      {faviconUrl ? (
                        <img src={faviconUrl} alt={app.name} className="w-5 h-5 shrink-0 rounded" />
                      ) : (
                        <span className={cn('shrink-0', getPlatformColor(app.platform))}>
                          {getPlatformIcon(app.platform)}
                        </span>
                      )}
                      <span className="flex-1 truncate text-text-primary font-medium">
                        {app.name}
                      </span>
                      {isActive && (
                        <button
                          onClick={(e) => handleStopSession(e, app.id)}
                          className="flex items-center gap-0.5 px-1 py-0.5 text-[9px] font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded transition-all shrink-0"
                        >
                          <CircleStopIcon className="w-2 h-2 text-red-400 pointer-events-none" />{' '}
                          Stop
                        </button>
                      )}
                    </div>
                  );
                })}
              {apps.filter(
                (app) =>
                  app.platform === selectedPlatform &&
                  app.name.toLowerCase().includes(targetSearchQuery.toLowerCase()),
              ).length === 0 && (
                <div className="text-center text-text-secondary text-xs py-6">
                  {targetSearchQuery ? 'No matching targets' : 'No targets found for this platform'}
                </div>
              )}
            </div>

            {/* Context Menu */}
            {contextMenu && (
              <div
                className="fixed z-50 bg-dropdown-background border border-border rounded-md shadow-lg py-1 min-w-[160px]"
                style={{ top: contextMenu.y, left: contextMenu.x }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    // Add to targets and launch
                    const app = contextMenu.app;
                    const newTab: TargetTab = {
                      id: app.id,
                      title: app.name,
                      favicon: app.url
                        ? `https://www.google.com/s2/favicons?domain=${new URL(app.url).hostname}&sz=32`
                        : undefined,
                      url: app.url,
                    };
                    setTargetTabs((prev) => {
                      const exists = prev.some((t) => t.id === app.id);
                      if (exists) return prev;
                      return [...prev, newTab];
                    });
                    setActiveTargetId(app.id);
                    // Launch the target
                    handleLaunchTarget(
                      app.id,
                      'http://127.0.0.1:8081',
                      app.url,
                      app.platform === 'web' ? 'browser' : 'electron',
                    );
                    // Quay về UI current target
                    setSelectedPlatform(null);
                    setTargetSearchQuery('');
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-dropdown-item-hover transition-all"
                >
                  <Play className="w-3.5 h-3.5 text-primary" />
                  <span>Chạy target</span>
                </button>
                <button
                  onClick={() => {
                    // Remove from active targets
                    const newTabs = targetTabs.filter((t) => t.id !== contextMenu.app.id);
                    setTargetTabs(newTabs);
                    if (activeTargetId === contextMenu.app.id) {
                      setActiveTargetId(newTabs.length > 0 ? newTabs[0].id : null);
                    }
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-error hover:bg-dropdown-item-hover transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Xóa target</span>
                </button>
              </div>
            )}

            {/* Bottom Drawer - slide up from bottom */}
            {showCreateDrawer && createDrawerPlatform === selectedPlatform && (
              <>
                {/* Backdrop overlay */}
                <div
                  className="absolute inset-0 bg-black/40 z-10"
                  onClick={() => {
                    setShowCreateDrawer(false);
                    setCreateDrawerPlatform(null);
                  }}
                />
                <div className="absolute bottom-0 left-0 right-0 bg-background border-t border-border rounded-t-lg shadow-lg p-4 z-20 animate-in slide-in-from-bottom duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-text-primary">
                      Create{' '}
                      {selectedPlatform === 'web'
                        ? 'Website'
                        : selectedPlatform === 'pc'
                          ? 'App'
                          : selectedPlatform === 'android'
                            ? 'Mobile'
                            : 'CLI'}
                    </span>
                    <button
                      onClick={() => {
                        setShowCreateDrawer(false);
                        setCreateDrawerPlatform(null);
                      }}
                      className="text-text-secondary hover:text-text-primary transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[10px] font-medium text-text-secondary mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        placeholder="Enter target name"
                        value={newTargetName}
                        onChange={(e) => setNewTargetName(e.target.value)}
                        className="w-full h-8 bg-input-background border border-border rounded px-3 text-xs text-text-primary placeholder:text-text-secondary outline-none focus:border-primary/50"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-text-secondary mb-1">
                        {selectedPlatform === 'web'
                          ? 'URL'
                          : selectedPlatform === 'pc'
                            ? 'Executable Path'
                            : selectedPlatform === 'android'
                              ? 'Package Name'
                              : 'Command'}
                        <span className="text-red-500 ml-0.5">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder={
                          selectedPlatform === 'web'
                            ? 'https://example.com'
                            : selectedPlatform === 'pc'
                              ? '/path/to/app'
                              : selectedPlatform === 'android'
                                ? 'com.example.app'
                                : 'command'
                        }
                        value={newTargetUrl}
                        onChange={(e) => setNewTargetUrl(e.target.value)}
                        className="w-full h-8 bg-input-background border border-border rounded px-3 text-xs text-text-primary placeholder:text-text-secondary outline-none focus:border-primary/50"
                      />
                    </div>
                    <button
                      onClick={async () => {
                        if (!newTargetName.trim()) return;
                        const appData: any = {
                          name: newTargetName.trim(),
                          platform: selectedPlatform,
                        };
                        if (selectedPlatform === 'web') {
                          appData.url = newTargetUrl.trim() || '';
                        } else if (selectedPlatform === 'pc' || selectedPlatform === 'cli') {
                          appData.executablePath = newTargetUrl.trim() || '';
                        } else if (selectedPlatform === 'android') {
                          appData.packageName = newTargetUrl.trim() || '';
                        }
                        await handleAddApp(appData);
                        setShowCreateDrawer(false);
                        setCreateDrawerPlatform(null);
                        setNewTargetName('');
                        setNewTargetUrl('');
                      }}
                      disabled={!newTargetName.trim()}
                      className="w-full h-8 rounded text-xs font-medium text-text-foreground bg-primary disabled:bg-input-background disabled:text-text-secondary disabled:cursor-not-allowed transition-all"
                      style={{ background: newTargetName.trim() ? accentColor : undefined }}
                    >
                      Add Target
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar - Feature Tabs */}
        <div className="flex h-10 border-b border-border shrink-0 overflow-x-auto gap-0.5 px-2">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setSelectedTool(tool.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 h-full text-xs font-medium whitespace-nowrap cursor-pointer transition-all border-b-2',
                selectedTool === tool.id
                  ? 'text-text-primary'
                  : 'text-text-secondary border-transparent hover:text-text-primary hover:bg-dropdown-item-hover',
              )}
              style={{
                borderBottomColor: selectedTool === tool.id ? accentColor : 'transparent',
              }}
            >
              <span style={{ color: selectedTool === tool.id ? accentColor : undefined }}>
                {tool.icon}
              </span>
              <span>{tool.label}</span>
            </button>
          ))}
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
                    onSelectRequest={setSelectedId}
                    searchTerm={searchTerm}
                    onSearchTermChange={setSearchTerm}
                    interceptedIds={interceptedIds}
                    pendingActionIds={pendingActionIds}
                    onForward={handleForward}
                    onDrop={handleDrop}
                    onDeleteRequest={handleDeleteRequest}
                    appId="emulate-app"
                    onSetCompare1={handleSetCompare1}
                    onSetCompare2={handleSetCompare2}
                    setFilter={setFilter}
                    onAnalyzeRequest={handleAnalyzeRequest}
                    onSendToRepeater={handleSendToRepeater}
                    wsConnections={mockWsConnections}
                    selectedWsId={selectedWsId}
                    onSelectWsConnection={setSelectedWsId}
                    onDeleteWsConnection={handleDeleteWsConnection}
                    browserViewUrl={null}
                    onLaunchTarget={handleLaunchTarget}
                    onClearRequests={clearRequests}
                    currentTargetAppId={activeTargetId || undefined}
                    currentTargetUrl={targetTabs.find((tab) => tab.id === activeTargetId)?.url}
                    isTargetActive={
                      activeTargetId ? state.targetStates[activeTargetId]?.isActive || false : false
                    }
                    activeTargetMode={
                      activeTargetId ? state.targetStates[activeTargetId]?.mode || null : null
                    }
                    isInterceptActive={
                      activeTargetId
                        ? state.targetStates[activeTargetId]?.isIntercepting || false
                        : false
                    }
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
                    onFilterChange={setFilter}
                    requests={requests}
                    onSearchTermChange={setSearchTerm}
                    onSelectRequest={setSelectedId}
                    onSetCompare1={handleSetCompare1}
                    onSetCompare2={handleSetCompare2}
                    appId="emulate-app"
                    onToggleFilter={() => setIsFilterOpen(!isFilterOpen)}
                    isFilterOpen={isFilterOpen}
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
        onEdit={handleEditApp}
      />
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setAppToDelete(null);
        }}
        onConfirm={handleDeleteApp}
        appName={appToDelete?.name || ''}
      />
      <ConfirmLaunchModal
        isOpen={isLaunchModalOpen}
        onClose={() => {
          setIsLaunchModalOpen(false);
          setAppToLaunch(null);
        }}
        onClearAndLaunch={handleClearAndLaunch}
        onKeepAndLaunch={handleKeepAndLaunch}
        appName={appToLaunch?.name || ''}
      />
    </div>
  );
}
