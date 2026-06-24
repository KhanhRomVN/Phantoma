// Resource panel types
import { WasmItem } from '../../../utils/detectors';
import { ResourceType } from '../constants/resourceTypes';

export { ResourceType };

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