import { create } from 'zustand';

// Định nghĩa state cho từng module
export interface ModuleStateMap {
  // Dashboard
  dashboard?: {
    greeting?: string;
  };

  // Recon (Intel)
  recon?: {
    sessions: any[];
    activeDomain: string;
    searchQuery: string;
    showLog: boolean;
    matchCase: boolean;
    matchWholeWord: boolean;
    useRegex: boolean;
    currentMatchIndex: number;
    dataCache: Record<string, Record<string, unknown>>;
  };

  // Scanner
  scanner?: {
    activeSubItem: string;
    domainScanState?: any;
    networkScanState?: any;
  };

  // Tools Manager
  tools?: {
    selectedTool: string;
    searchQuery: string;
    activeTab: 'information' | 'execution' | 'history' | 'profiles';
  };

  // Emulate
  emulate?: {
    selectedTool: string;
    targetTabs: Array<{ id: string; title: string; favicon?: string; url?: string }>;
    activeTargetId: string | null;
    requests: any[];
    selectedId: string | null;
    searchTerm: string;
    // Per-target state tracking
    targetStates?: {
      [targetId: string]: {
        isActive: boolean;
        mode: 'mitm' | 'cdp' | null;
        isIntercepting: boolean;
      };
    };
    // Legacy fields for backward compatibility
    isTargetActive: boolean;
    activeTargetMode: 'mitm' | 'cdp' | null;
    isInterceptActive: boolean;
    filter: any;
    // RequestTable state
    tableMatchCase: boolean;
    tableMatchWholeWord: boolean;
    tableUseRegex: boolean;
    highlightedIds: string[];
    rowSelection: Record<string, boolean>;
    sorting: any[];
  };

  // Wireless
  wireless?: any;

  // Settings
  settings?: any;
}

interface ModuleStore {
  states: ModuleStateMap;
  setModuleState: <K extends keyof ModuleStateMap>(
    moduleId: K,
    data: Partial<NonNullable<ModuleStateMap[K]>>
  ) => void;
  getModuleState: <K extends keyof ModuleStateMap>(
    moduleId: K
  ) => ModuleStateMap[K] | undefined;
  clearModuleState: (moduleId: keyof ModuleStateMap) => void;
}

export const useModuleStore = create<ModuleStore>((set, get) => ({
  states: {},

  setModuleState: (moduleId, data) =>
    set((state) => ({
      states: {
        ...state.states,
        [moduleId]: {
          ...(state.states[moduleId] || {}),
          ...data,
        },
      },
    })),

  getModuleState: (moduleId) => get().states[moduleId],

  clearModuleState: (moduleId) =>
    set((state) => {
      const { [moduleId]: _, ...rest } = state.states;
      return { states: rest };
    }),
}));