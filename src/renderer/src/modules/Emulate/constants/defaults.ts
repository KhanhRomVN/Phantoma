// Default values used across Emulate feature
import { HttpMethod, HTTP_METHODS } from './methods';
import { DEFAULT_STATUS_FILTER } from './statusCodes';
import { DEFAULT_TOOL, ToolType } from './tools';
import { AppPlatform } from './platforms';

// Default filter state for Inspector
export interface DefaultFilterState {
  methods: Record<HttpMethod, boolean>;
  host: { whitelist: string[] };
  path: { whitelist: string[] };
  status: Record<number, boolean>;
  type: {
    xhr: boolean;
    js: boolean;
    css: boolean;
    img: boolean;
    media: boolean;
    font: boolean;
    doc: boolean;
    ws: boolean;
    wasm: boolean;
    manifest: boolean;
    other: boolean;
  };
  size: { min: string; max: string };
  time: { min: string; max: string };
}

export const DEFAULT_FILTER_STATE: DefaultFilterState = {
  methods: {
    GET: true,
    POST: true,
    PUT: true,
    PATCH: false,
    DELETE: true,
    HEAD: false,
    OPTIONS: true,
    TRACE: false,
    CONNECT: false,
  },
  host: { whitelist: [] },
  path: { whitelist: [] },
  status: DEFAULT_STATUS_FILTER,
  type: {
    xhr: true,
    js: true,
    css: true,
    img: true,
    media: true,
    font: true,
    doc: true,
    ws: true,
    wasm: true,
    manifest: true,
    other: true,
  },
  size: { min: '', max: '' },
  time: { min: '', max: '' },
};

// Default target tab
export interface DefaultTargetTab {
  id: string;
  title: string;
  favicon?: string;
  url?: string;
}

export const DEFAULT_TARGET_TAB: DefaultTargetTab = {
  id: 'default',
  title: 'Chưa chọn target',
  favicon: undefined,
  url: undefined,
};

// Default target state
export interface DefaultTargetState {
  isActive: boolean;
  mode: 'mitm' | 'cdp' | null;
  isIntercepting: boolean;
  startTime?: number;
}

export const DEFAULT_TARGET_STATE: DefaultTargetState = {
  isActive: false,
  mode: null,
  isIntercepting: false,
};

// Default Emulate state
export interface DefaultEmulateState {
  selectedTool: ToolType;
  targetTabs: DefaultTargetTab[];
  activeTargetId: string | null;
  requests: unknown[];
  selectedId: string | null;
  searchTerm: string;
  targetStates: Record<string, DefaultTargetState>;
  // Legacy fields
  isTargetActive: boolean;
  activeTargetMode: 'mitm' | 'cdp' | null;
  isInterceptActive: boolean;
  filter: DefaultFilterState;
}

export const DEFAULT_EMULATE_STATE: DefaultEmulateState = {
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
  filter: DEFAULT_FILTER_STATE,
};

// Default mock requests
export const DEFAULT_MOCK_REQUESTS: unknown[] = [];

// Default WebSocket connections
export const DEFAULT_WS_CONNECTIONS: unknown[] = [];

// Default payload item
export interface DefaultPayloadItem {
  id: string;
  name: string;
  description: string;
  values: string[];
  enabled: boolean;
}

export const DEFAULT_PAYLOAD_ITEM: Omit<DefaultPayloadItem, 'id' | 'name'> = {
  description: '',
  values: [],
  enabled: true,
};

// Default history entry
export interface DefaultHistoryEntry {
  id: string;
  method: string;
  url: string;
  status: number;
  timestamp: number;
  duration: number;
  payload: string;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
}

// Default compare entry
export interface DefaultCompareEntry {
  id: string;
  name: string;
  desc?: string;
  url1: string;
  url2: string;
  createdAt: number;
}

// Default tool tabs (for platform selection)
export const DEFAULT_PLATFORM_TABS = [
  { id: 'web' as AppPlatform, label: 'Web' },
  { id: 'pc' as AppPlatform, label: 'PC' },
  { id: 'android' as AppPlatform, label: 'Android' },
  { id: 'cli' as AppPlatform, label: 'CLI' },
];

// Max logs to keep in memory
export const MAX_LOGS = 10000;

// Max requests to keep in memory
export const MAX_REQUESTS = 10000;

// Debounce delay for search inputs (ms)
export const SEARCH_DEBOUNCE_DELAY = 300;

// Polling interval for various features (ms)
export const POLLING_INTERVAL = 1000;

// Timer update interval (ms)
export const TIMER_INTERVAL = 1000;