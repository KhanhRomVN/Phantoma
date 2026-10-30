import { createContext, useContext } from 'react';

export interface MultiAgentControl {
  /** True when this Zen tab is the Orchestrator of its branch. */
  enabled: boolean;
  /** True when another Zen tab in the same branch already is the Orchestrator. */
  blocked: boolean;
  toggle: () => void;
}

export const MultiAgentContext = createContext<MultiAgentControl | null>(null);

export const useMultiAgentControl = (): MultiAgentControl | null => useContext(MultiAgentContext);