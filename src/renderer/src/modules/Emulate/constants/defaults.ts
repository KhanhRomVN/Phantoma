/**
 * ------------------------------------------------------------------
 * Default Constants
 * ------------------------------------------------------------------
 * Các giá trị mặc định dùng chung trong module Emulate —
 * filter state, target tab, target state, emulate state, payload,
 * history, platform tabs, timeout/interval settings và fuzzer job.
 *
 * Các constants chính:
 * - DEFAULT_FILTER_STATE    : Bộ lọc mặc định cho Inspector
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Constants ──
import { HttpMethod } from './methods';
import { ToolType } from './tools';

// ─── Interfaces ─────────────────────────────────────────────────────────
export interface DefaultFilterState {
  methods: Record<HttpMethod, boolean>;
  host: { whitelist: string[] };
  path: { whitelist: string[] };
  status: Record<string, boolean>;
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

export interface DefaultTargetTab {
  id: string;
  title: string;
  favicon?: string;
  url?: string;
}

export interface DefaultTargetState {
  isActive: boolean;
  mode: 'mitm' | 'cdp' | null;
  isIntercepting: boolean;
  startTime?: number;
}

export interface DefaultEmulateState {
  selectedTool: ToolType;
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

export interface DefaultPayloadItem {
  id: string;
  name: string;
  description: string;
  values: string[];
  enabled: boolean;
}

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

export interface DefaultCompareEntry {
  id: string;
  name: string;
  desc?: string;
  url1: string;
  url2: string;
  createdAt: number;
}

// ─── Constants ──────────────────────────────────────────────────────────
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
  status: { failed: true },
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

export const DEFAULT_MOCK_REQUESTS: unknown[] = [];

export const DEFAULT_WS_CONNECTIONS: unknown[] = [];

export const MAX_LOGS = 10000;

export const MAX_REQUESTS = 10000;

export const SEARCH_DEBOUNCE_DELAY = 300;

export const POLLING_INTERVAL = 1000;

export const TIMER_INTERVAL = 1000;
