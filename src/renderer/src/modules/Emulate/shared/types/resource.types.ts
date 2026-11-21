/**
 * Type definitions cho resource panel trong module Emulate.
 * Bao gồm resource item, group và props cho các component liên quan.
 */

import { WasmItem } from '../utils/wasm-detector.util';

import type { ResourceType } from '../constants/resource.constants';

export type { ResourceType };

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
