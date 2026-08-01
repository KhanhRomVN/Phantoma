import { create } from 'zustand';

// NetworkRequest type - define inline to avoid circular imports from Emulate module
export interface NetworkRequest {
  id: string;
  method: string;
  url: string;
  protocol: string;
  host: string;
  path: string;
  status: number;
  type: string;
  size: string;
  time: string;
  timestamp: number;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody: string;
  responseBody: string;
  initiator?: string;
  securityIssues?: any[];
  requestCookies?: Record<string, string>;
  responseCookies?: Record<string, string>;
  securityDetails?: any;
  timing?: any;
  serverIPAddress?: string;
  connection?: string;
  isIntercepted?: boolean;
  analysis?: any;
}

export interface CdpScriptUnpackedData {
  requestId: string;
  url: string;
  scriptId: string;
  staticSource: string | null;
  unpackedSource: string;
  isDifferent: boolean;
  compressionRatio: string;
  timestamp: number;
}

interface NetworkStore {
  requests: NetworkRequest[];
  unpackedScripts: Map<string, CdpScriptUnpackedData>;
  maxMemory: number;

  // Actions
  addRequest: (request: NetworkRequest) => void;
  updateRequest: (id: string, updates: Partial<NetworkRequest>) => void;
  clearRequests: () => void;
  setUnpackedScript: (requestId: string, data: CdpScriptUnpackedData) => void;
  getRequests: () => NetworkRequest[];
}

export const useNetworkStore = create<NetworkStore>((set, get) => ({
  requests: [],
  unpackedScripts: new Map(),
  maxMemory: 1000,

  addRequest: (request) =>
    set((state) => {
      if (state.requests.some((r) => r.id === request.id)) {
        return state;
      }
      const newRequests = [request, ...state.requests];
      if (newRequests.length > state.maxMemory) {
        return { requests: newRequests.slice(0, state.maxMemory) };
      }
      return { requests: newRequests };
    }),

  updateRequest: (id, updates) =>
    set((state) => ({
      requests: state.requests.map((r) =>
        r.id === id ? { ...r, ...updates } : r,
      ),
    })),

  clearRequests: () => set({ requests: [], unpackedScripts: new Map() }),

  setUnpackedScript: (requestId, data) =>
    set((state) => {
      const newMap = new Map(state.unpackedScripts);
      newMap.set(requestId, data);
      return { unpackedScripts: newMap };
    }),

  getRequests: () => get().requests,
}));