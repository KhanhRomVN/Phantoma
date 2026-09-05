/**
 * ------------------------------------------------------------------
 * Resource Types
 * ------------------------------------------------------------------
 * Type definitions cho resource panel trong module Emulate.
 * Bao gồm resource item, group và props cho các component liên quan.
 *
 * Các types chính:
 * - ResourceItem         : Một resource (file) được tải về
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Utils ──
import { WasmItem } from '../utils/wasm-detector.util';

// ── Types ──
import { ResourceType } from '../constants/resource';

export { ResourceType };

// ─── Types ──────────────────────────────────────────────────────────────
export interface ResourceItem {
  id: string;
  filename: string;
  url: string;
  path: string;
  type: ResourceType;
  contentType: string;
  size: string;
  timestamp: number;
  source: string;
  responseBody?: string;
  isWasm?: boolean;
  wasmItem?: WasmItem;
}
