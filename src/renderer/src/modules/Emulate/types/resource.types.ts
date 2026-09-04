/**
 * ------------------------------------------------------------------
 * Resource Types
 * ------------------------------------------------------------------
 * Type definitions cho resource panel trong module Emulate.
 * Bao gồm resource item, group và props cho các component liên quan.
 *
 * Các types chính:
 * - ResourceItem         : Một resource (file) được tải về
 * - ResourceGroup        : Nhóm resource theo loại
 * - ResourcePreviewProps : Props cho ResourcePreview component
 * - ResourceListProps    : Props cho ResourceList component
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

export interface ResourceGroup {
  type: ResourceType;
  items: ResourceItem[];
  label: string;
}

export interface ResourcePreviewProps {
  item: ResourceItem | null;
}

export interface ResourceListProps {
  groupedItems: Record<ResourceType, ResourceItem[]>;
  expandedGroups: Set<ResourceType>;
  onToggleGroup: (type: ResourceType) => void;
  selectedId: string | null;
  onSelectItem: (id: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  totalCount: number;
}