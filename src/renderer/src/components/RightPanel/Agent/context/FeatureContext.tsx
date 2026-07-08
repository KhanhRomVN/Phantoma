import React, { createContext, useContext, useState } from 'react';

export type AgentFeature = 'emulate' | null;

export interface EmulateState {
  activeTargetId: string | null;
  targetStates: Record<string, { isActive: boolean; mode?: 'mitm' | 'cdp' | 'frida' }>;
}

interface FeatureContextValue {
  activeFeature: AgentFeature;
  setActiveFeature: (feature: AgentFeature) => void;
  emulateState: EmulateState;
  setEmulateState: (state: EmulateState) => void;
}

const FeatureContext = createContext<FeatureContextValue>({
  activeFeature: null,
  setActiveFeature: () => {},
  emulateState: { activeTargetId: null, targetStates: {} },
  setEmulateState: () => {},
});

export const useAgentFeature = () => useContext(FeatureContext);

export const FeatureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log('[DEBUG][ReRender] FeatureProvider rendered');
  const [activeFeature, setActiveFeature] = useState<AgentFeature>(null);
  const [emulateState, setEmulateState] = useState<EmulateState>({
    activeTargetId: null,
    targetStates: {},
  });

  return (
    <FeatureContext.Provider value={{ activeFeature, setActiveFeature, emulateState, setEmulateState }}>
      {children}
    </FeatureContext.Provider>
  );
};
