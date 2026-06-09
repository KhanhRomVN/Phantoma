import React, { useState } from 'react';
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
} from 'lucide-react';
import { RequestList } from './Intruder/RequestList';
import { RequestDetails } from './Intruder/RequestDetails';
import TargetPanel from './Target';
import type { NetworkRequest, WebSocketConnection } from '../../../../../types/inspector';
import { InspectorFilter, initialFilterState } from './Intruder/RequestDetails/Filter';

// Mock data for demonstration
const mockRequests: NetworkRequest[] = [
  {
    id: '1',
    method: 'GET',
    protocol: 'https',
    host: 'api.example.com',
    path: '/v1/users',
    url: 'https://api.example.com/v1/users',
    status: 200,
    type: 'JSON',
    size: '1.2kb',
    time: '245ms',
    timestamp: Date.now(),
    requestHeaders: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
    responseHeaders: { 'Content-Type': 'application/json' },
    requestBody: '',
    responseBody: JSON.stringify({ users: [] }, null, 2),
    timing: { blocked: 10, dns: 15, connect: 30, send: 5, wait: 150, receive: 35 },
  },
  {
    id: '2',
    method: 'POST',
    protocol: 'https',
    host: 'api.example.com',
    path: '/v1/auth',
    url: 'https://api.example.com/v1/auth',
    status: 201,
    type: 'JSON',
    size: '0.5kb',
    time: '180ms',
    timestamp: Date.now() - 1000,
    requestHeaders: { 'User-Agent': 'Mozilla/5.0', 'Content-Type': 'application/json' },
    responseHeaders: { 'Content-Type': 'application/json' },
    requestBody: JSON.stringify({ username: 'test', password: 'test123' }, null, 2),
    responseBody: JSON.stringify({ token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' }, null, 2),
  },
];

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
  onSelectApp?: (appId: string, proxyUrl: string, customUrl?: string, mode?: 'browser' | 'electron' | 'native') => Promise<void>;
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
  onStopSession = async () => {} 
}: EmulateProps) {
  const [selectedTool, setSelectedTool] = useState<ToolType>('intruder');
  const [showTargetPanel, setShowTargetPanel] = useState(false);
  const [targetTabs, setTargetTabs] = useState<TargetTab[]>([
    { id: 'default', title: 'Chưa chọn target', favicon: undefined, url: undefined }
  ]);
  const [activeTargetId, setActiveTargetId] = useState<string | null>('default');
  const [filteredRequests] = useState<NetworkRequest[]>(mockRequests);
  const [requests] = useState<NetworkRequest[]>(mockRequests);
  const [selectedId, setSelectedId] = useState<string | null>('1');
  const [searchTerm, setSearchTerm] = useState('');
  const [interceptedIds] = useState<Set<string>>(new Set());
  const [pendingActionIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<InspectorFilter>(initialFilterState);
  const [selectedWsId, setSelectedWsId] = useState<string | null>(null);

  const handleForward = (id: string) => {
    console.log('Forward request:', id);
  };

  const handleDrop = (id: string) => {
    console.log('Drop request:', id);
  };

  const handleDeleteRequest = (id: string) => {
    console.log('Delete request:', id);
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

  return (
    <div className="flex h-full bg-[#0f1319]">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Horizontal Chrome-style Tab Bar for Targets */}
        <div className="flex h-8 border-b border-[#1e2535] shrink-0 overflow-x-auto">
          {targetTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTargetId(tab.id)}
              className={`px-2 h-full text-xs font-medium whitespace-nowrap m-0 flex items-center gap-1.5 ${
                activeTargetId === tab.id
                  ? 'text-white border-b-2 border-blue-500 bg-[#1a1f2a]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a1f2a]/50'
              }`}
            >
              {tab.favicon ? (
                <img src={tab.favicon} alt={tab.title} className="w-3 h-3" />
              ) : (
                <Code className="w-3 h-3" />
              )}
              <span>{tab.title}</span>
              {tab.id !== 'default' && (
                <X
                  className="w-3 h-3 opacity-60 hover:opacity-100"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    const newTabs = targetTabs.filter((t) => t.id !== tab.id);
                    setTargetTabs(newTabs);
                    if (activeTargetId === tab.id) {
                      setActiveTargetId(newTabs.length > 0 ? newTabs[0].id : null);
                    }
                    if (newTabs.length === 0) {
                      setShowTargetPanel(true);
                    }
                  }}
                />
              )}
            </button>
          ))}
          <button 
            onClick={() => setShowTargetPanel(true)}
            className="px-2 h-full text-gray-400 hover:text-gray-200 hover:bg-[#1a1f2a]/50 flex items-center text-base font-medium"
          >
            +
          </button>
        </div>
        {/* Content based on selected tool or Target Panel */}
        {showTargetPanel || targetTabs.length === 0 || !activeTargetId || activeTargetId === 'default' ? (
          <TargetPanel
            activeAppId={activeAppId}
            activeAppName={activeAppName}
            onSelectApp={onSelectApp}
            onStopSession={onStopSession}
            onTargetSelected={(target) => {
              // Add new tab when target is selected
              const newTab = {
                id: target.id,
                title: target.name,
                favicon: target.url ? `https://www.google.com/s2/favicons?domain=${new URL(target.url).hostname}&sz=32` : undefined,
                url: target.url,
              };
              setTargetTabs((prev: TargetTab[]) => {
                // Remove default tab if it exists
                let filtered = prev.filter((t) => t.id !== 'default');
                // Check if tab already exists
                if (filtered.some((t: TargetTab) => t.id === target.id)) return filtered;
                return [...filtered, newTab];
              });
              setActiveTargetId(target.id);
              setShowTargetPanel(false);
            }}
          />
        ) : (
          <>
            {selectedTool === 'intruder' && (
              <>
                <div className="flex-1 min-h-0 border-b border-[#1e2535]">
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
                  />
                </div>
                <div className="flex-1 min-h-0">
                  <RequestDetails
                    request={mockRequests.find((r) => r.id === selectedId) || null}
                    searchTerm={searchTerm}
                    filter={filter}
                    onFilterChange={setFilter}
                    requests={requests}
                    onSearchTermChange={setSearchTerm}
                    onSelectRequest={setSelectedId}
                    onSetCompare1={handleSetCompare1}
                    onSetCompare2={handleSetCompare2}
                    appId="emulate-app"
                  />
                </div>
              </>
            )}
            {selectedTool === 'wasm' && (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Wasm Content - Coming Soon
              </div>
            )}
            {selectedTool === 'media' && (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Media Content - Coming Soon
              </div>
            )}
            {selectedTool === 'payload' && (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Payload Content - Coming Soon
              </div>
            )}
            {selectedTool === 'compare' && (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Compare Content - Coming Soon
              </div>
            )}
            {selectedTool === 'composer' && (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Composer Content - Coming Soon
              </div>
            )}
            {selectedTool === 'setting' && (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Settings Content - Coming Soon
              </div>
            )}
            {selectedTool === 'source' && (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Source Content - Coming Soon
              </div>
            )}
            {selectedTool === 'log' && (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Log Content - Coming Soon
              </div>
            )}
          </>
        )}
      </div>

      {/* Vertical Toolbar - hidden when TargetPanel is visible */}
      {!(showTargetPanel || targetTabs.length === 0) && (
        <div className="w-12 border-l border-[#1e2535] flex flex-col items-center py-2 gap-1 shrink-0">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setSelectedTool(tool.id)}
              className={`w-9 h-9 flex items-center justify-center px-0 mx-auto rounded-md transition-colors ${
                selectedTool === tool.id
                  ? `bg-${tool.color}-500/10 text-${tool.color}-400`
                  : `text-gray-400 hover:bg-${tool.color}-500/10 hover:text-${tool.color}-400`
              }`}
              title={tool.label}
            >
              {tool.icon}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}