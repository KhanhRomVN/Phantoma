import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  LayoutPanelLeft,
  Cpu,
  Film,
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
} from 'lucide-react';
import {
  RequestList,
  RequestDetails,
  InspectorFilter,
  initialFilterState,
} from './components/Intruder';
import { WasmPanel } from './components/Wasm';
import { MediaPanel } from './components/Media';
import { PayloadPanel } from './components/Payload';
import { ComparePanel } from './components/Compare';
import { ComposerPanel } from './components/Composer';
import { SourcesPanel } from './components/Source';
import { LogViewer } from './components/Log';
import type { NetworkRequest, WebSocketConnection } from '../../types/inspector';
import type { UserApp, AppPlatform } from '../../types/apps';
import { useTheme } from '../../theme/ThemeProvider';
import { cn } from '../../shared/lib/utils';
import { AddTargetModal } from './components/Target/AddTargetModal';
import { ConfirmDeleteModal } from './components/Target/ConfirmDeleteModal';
import { ConfirmLaunchModal } from './components/Target/ConfirmLaunchModal';

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
  activeAppName?: string;
  onSelectApp?: (
    appId: string,
    proxyUrl: string,
    customUrl?: string,
    mode?: 'browser' | 'electron' | 'native' | 'cdp',
  ) => Promise<void>;
  onStopSession?: () => Promise<void>;
}

type ToolType =
  | 'intruder'
  | 'wasm'
  | 'media'
  | 'payload'
  | 'compare'
  | 'composer'
  | 'setting'
  | 'source'
  | 'log';

export default function Emulate({
  activeAppId = '',
  activeAppName = '',
  onSelectApp = async () => {},
  onStopSession = async () => {},
}: EmulateProps) {
  const { currentPreset } = useTheme();
  const accentColor = currentPreset?.tailwind?.primary || '#3b82f6';

  const [selectedTool, setSelectedTool] = useState<ToolType>('intruder');
  const [showTargetPanel, setShowTargetPanel] = useState(false);

  // Load persisted tabs from localStorage
  const loadPersistedTabs = (): TargetTab[] => {
    try {
      const saved = localStorage.getItem('phantoma-emulate-tabs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load persisted tabs:', e);
    }
    return [{ id: 'default', title: 'Chưa chọn target', favicon: undefined, url: undefined }];
  };

  const loadPersistedActiveTab = (tabs: TargetTab[]): string | null => {
    try {
      const savedId = localStorage.getItem('phantoma-emulate-active-tab');
      if (savedId && tabs.some((tab) => tab.id === savedId)) {
        return savedId;
      }
    } catch (e) {
      console.error('Failed to load persisted active tab:', e);
    }
    return tabs.length > 0 ? tabs[0].id : null;
  };

  const initialTabs = loadPersistedTabs();
  const [targetTabs, setTargetTabs] = useState<TargetTab[]>(initialTabs);
  const [activeTargetId, setActiveTargetId] = useState<string | null>(() =>
    loadPersistedActiveTab(initialTabs),
  );

  // Persist tabs whenever they change (still needed for cross-session persistence)
  React.useEffect(() => {
    try {
      // Don't persist the default tab
      const tabsToSave = targetTabs.filter((tab) => tab.id !== 'default');
      localStorage.setItem('phantoma-emulate-tabs', JSON.stringify(tabsToSave));
    } catch (e) {
      console.error('Failed to save tabs:', e);
    }
  }, [targetTabs]);

  // Persist active tab whenever it changes
  React.useEffect(() => {
    try {
      if (activeTargetId && activeTargetId !== 'default') {
        localStorage.setItem('phantoma-emulate-active-tab', activeTargetId);
      } else {
        localStorage.removeItem('phantoma-emulate-active-tab');
      }
    } catch (e) {
      console.error('Failed to save active tab:', e);
    }
  }, [activeTargetId]);

  const [filteredRequests, setFilteredRequests] = useState<NetworkRequest[]>(mockRequests);
  const [requests, setRequests] = useState<NetworkRequest[]>(mockRequests);
  const [cdpRequests, setCdpRequests] = useState<NetworkRequest[]>([]);
  const [cdpRequestMap, setCdpRequestMap] = useState<Map<string, NetworkRequest>>(new Map());
  // Use a Map stored on window to ensure it survives re-renders and component lifecycle
  // This must be initialized once and never re-created
  if (!(window as any)._phantomaCdpTimestamps) {
    (window as any)._phantomaCdpTimestamps = new Map<string, number>();
  }
  // Store reference to avoid re-reading from window
  const requestTimestampMap = (window as any)._phantomaCdpTimestamps;
  console.log('[CDP] Timestamp map size:', requestTimestampMap.size);
  const [selectedId, setSelectedId] = useState<string | null>('1');
  const [searchTerm, setSearchTerm] = useState('');
  const [interceptedIds] = useState<Set<string>>(new Set());
  const [pendingActionIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<InspectorFilter>(initialFilterState);
  const [selectedWsId, setSelectedWsId] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const handleForward = (id: string) => {
    console.log('Forward request:', id);
  };

  const handleDrop = (id: string) => {
    console.log('Drop request:', id);
  };

  const handleDeleteRequest = (id: string) => {
    console.log('Delete request:', id);
  };

  // Clear all requests (used when stopping CDP/proxy session)
  const clearRequests = () => {
    console.log('[Emulate] Clearing all requests...');
    setRequests([]);
    setFilteredRequests([]);
    setCdpRequests([]);
    setCdpRequestMap(new Map());
    requestTimestampMap.clear();
    setSelectedId(null);
  };

  const handleSetCompare1 = (req: NetworkRequest | null) => {
    console.log('Set compare 1:', req);
  };

  const handleSetCompare2 = (req: NetworkRequest | null) => {
    console.log('Set compare 2:', req);
  };

  const handleAnalyzeRequest = (req: NetworkRequest) => {
    console.log('Analyze request:', req);
  };

  const handleSendToFuzzer = (req: NetworkRequest) => {
    console.log('Send to fuzzer:', req);
  };

  const handleDeleteWsConnection = (id: string) => {
    console.log('Delete WebSocket connection:', id);
  };

  const tools: { id: ToolType; icon: React.ReactNode; label: string; color: string }[] = [
    {
      id: 'intruder',
      icon: <LayoutPanelLeft className="w-4 h-4" />,
      label: 'Intruder',
      color: 'purple',
    },
    { id: 'wasm', icon: <Cpu className="w-4 h-4" />, label: 'Wasm', color: 'blue' },
    { id: 'media', icon: <Film className="w-4 h-4" />, label: 'Media', color: 'pink' },
    { id: 'payload', icon: <Package className="w-4 h-4" />, label: 'Payload', color: 'orange' },
    { id: 'compare', icon: <GitCompare className="w-4 h-4" />, label: 'Compare', color: 'green' },
    { id: 'composer', icon: <PenSquare className="w-4 h-4" />, label: 'Composer', color: 'cyan' },
    { id: 'setting', icon: <Settings className="w-4 h-4" />, label: 'Setting', color: 'gray' },
    { id: 'source', icon: <Code className="w-4 h-4" />, label: 'Source', color: 'yellow' },
    { id: 'log', icon: <ScrollText className="w-4 h-4" />, label: 'Log', color: 'red' },
  ];

  // ---- Target management state ----
  const [apps, setApps] = useState<UserApp[]>([]);
  const [targetSearchQuery, setTargetSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<AppPlatform | null>(null);
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalPlatform, setAddModalPlatform] = useState<'web' | 'pc' | 'android' | 'cli'>('web');
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
  const [isLaunching, setIsLaunching] = useState(false);
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [createDrawerPlatform, setCreateDrawerPlatform] = useState<AppPlatform | null>(null);
  const [newTargetName, setNewTargetName] = useState('');
  const [newTargetUrl, setNewTargetUrl] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    console.log('[CDP] Setting up event listeners...');
    const handleCdpRequest = (event: any, data: any) => {
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

      // Debug: log initiator received from CDP
      if (data.initiator) {
        console.log('[Emulate] 📥 Received initiator for', data.url, ':', {
          type: data.initiator.type,
          url: data.initiator.url,
          hasStack: !!data.initiator.stack,
          stackLength: data.initiator.stack?.length || 0,
        });
      }

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

    const handleCdpResponse = (event: any, data: any) => {
      setCdpRequestMap((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(data.id);
        if (existing) {
          console.log('[CDP] Found existing request for response:', data.id, existing);
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

    const handleCdpResponseBody = (event: any, data: any) => {
      // Try to get timestamp, if not found, retry after a short delay
      let requestTimestamp = requestTimestampMap.get(data.id);
      let timeMs = 0;
      let timeCalculated = false;

      if (requestTimestamp) {
        const currentTime = data.timestamp || Date.now();
        timeMs = currentTime - requestTimestamp;
        requestTimestampMap.delete(data.id);
        timeCalculated = true;
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
          console.log('[CDP] Found existing request for body:', data.id);
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

    const handleCdpError = (event: any, data: any) => {
      console.log('[CDP] Error:', data);
    };

    window.api.on?.('cdp:request', handleCdpRequest);
    window.api.on?.('cdp:response', handleCdpResponse);
    window.api.on?.('cdp:response-body', handleCdpResponseBody);
    window.api.on?.('cdp:error', handleCdpError);

    return () => {
      // Note: window.api.off is not implemented in preload
    };
  }, []);

  const filteredApps = useMemo(() => {
    return apps.filter((app) => app.name.toLowerCase().includes(targetSearchQuery.toLowerCase()));
  }, [apps, targetSearchQuery]);

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
    console.log('[Emulate] handleLaunchTarget called with:', { appId, proxyUrl, customUrl, mode });

    // Wait a bit for proxy to be fully ready
    console.log('[Emulate] Waiting 500ms for proxy to be ready...');
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Always use IPC directly for launching (bypass onSelectApp from parent)
    console.log('[Emulate] Using IPC: window.api.invoke(app:launch)');
    try {
      const result = await window.api.invoke('app:launch', appId, proxyUrl, customUrl, mode);
      console.log('[Emulate] app:launch result:', result);

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
          setShowTargetPanel(false);
        }
      } else {
        console.warn('[Emulate] app:launch returned false');
        // Fallback: try using onSelectApp if available
        if (onSelectApp && onSelectApp.toString() !== 'async () => {}') {
          console.log('[Emulate] Fallback: trying onSelectApp');
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
        console.log('[Emulate] Fallback: trying onSelectApp');
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

  const handleStopSession = async (e: React.MouseEvent, appId: string) => {
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

  // Listen for navigate-to-source events from Initiator tab
  useEffect(() => {
    const handleNavigateToSource = (event: CustomEvent) => {
      const { url, line, col, functionName } = event.detail;
      console.log('[Emulate] 📍 Navigate to source:', { url, line, col, functionName });

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
            <div className="px-2 py-1.5 border-b border-border shrink-0">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search targets..."
                  value={targetSearchQuery}
                  onChange={(e) => setTargetSearchQuery(e.target.value)}
                  className="w-full h-7 bg-input-background border border-border rounded pl-2 pr-2 text-xs text-text-primary placeholder:text-text-secondary outline-none focus:border-primary/50"
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
                  {activeTargets.map((tab) => (
                    <div
                      key={tab.id}
                      onClick={() => {
                        setActiveTargetId(tab.id);
                        setShowTargetPanel(false);
                      }}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-all text-sm',
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
                      <X
                        className="w-4 h-4 opacity-40 cursor-pointer transition-all hover:opacity-100 hover:text-error shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          const newTabs = targetTabs.filter((t) => t.id !== tab.id);
                          setTargetTabs(newTabs);
                          if (activeTargetId === tab.id) {
                            setActiveTargetId(newTabs.length > 0 ? newTabs[0].id : null);
                          }
                        }}
                      />
                    </div>
                  ))}
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
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-md transition-all text-sm group',
                        isOpen
                          ? 'bg-dropdown-item-hover/30 cursor-default'
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
                          <Square className="w-2 h-2 fill-current" /> Stop
                        </button>
                      )}
                      {!isOpen && !isActive && (
                        <button
                          onClick={() => handleLaunchWithConfirm(app)}
                          disabled={isLaunching}
                          className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-medium text-primary bg-primary/10 border border-primary/30 hover:bg-primary/20 rounded transition-all shrink-0"
                        >
                          <Play className="w-2.5 h-2.5" /> Launch
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
            {selectedTool === 'intruder' && (
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
                    onSendToFuzzer={handleSendToFuzzer}
                    wsConnections={mockWsConnections}
                    selectedWsId={selectedWsId}
                    onSelectWsConnection={setSelectedWsId}
                    onDeleteWsConnection={handleDeleteWsConnection}
                    browserViewUrl={null}
                    onLaunchTarget={handleLaunchTarget}
                    onClearRequests={clearRequests}
                    currentTargetAppId={activeTargetId || undefined}
                    currentTargetUrl={targetTabs.find((tab) => tab.id === activeTargetId)?.url}
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
            {selectedTool === 'wasm' && (
              <div className="flex-1 overflow-hidden">
                <WasmPanel />
              </div>
            )}
            {selectedTool === 'media' && (
              <div className="flex-1 overflow-hidden">
                <MediaPanel />
              </div>
            )}
            {selectedTool === 'payload' && (
              <div className="flex-1 overflow-hidden">
                <PayloadPanel />
              </div>
            )}
            {selectedTool === 'compare' && (
              <div className="flex-1 overflow-hidden">
                <ComparePanel />
              </div>
            )}
            {selectedTool === 'composer' && (
              <div className="flex-1 overflow-hidden">
                <ComposerPanel />
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
            {selectedTool === 'setting' && (
              <div className="flex-1 flex items-center justify-center text-text-secondary">
                Settings Content - Coming Soon
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
