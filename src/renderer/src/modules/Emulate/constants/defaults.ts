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
