// Compare panel types
export interface SavedCompare {
  id: string;
  name: string;
  desc?: string;
  url1: string;
  url2: string;
  createdAt: number;
}

export interface CompareField {
  name: string;
  left: string | number;
  right: string | number;
}

export interface DiffViewProps {
  request1: NetworkRequest | null;
  request2: NetworkRequest | null;
  onClose: () => void;
}

export interface ComparePanelProps {
  requests?: NetworkRequest[];
  compareRequest1?: NetworkRequest | null;
  compareRequest2?: NetworkRequest | null;
  onClearComparison?: () => void;
  onCompareRequests?: (req1: NetworkRequest, req2: NetworkRequest) => void;
  initialDiffTab?: string;
  initialDiffSearch?: string;
}

// Re-export NetworkRequest from inspector types
import { NetworkRequest } from './inspector';
export type { NetworkRequest };