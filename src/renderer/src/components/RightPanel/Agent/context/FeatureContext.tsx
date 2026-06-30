import React, { createContext, useContext, useState, useCallback } from 'react';

export type AgentFeature = 'emulate' | null;

interface FeatureContextValue {
  activeFeature: AgentFeature;
  setActiveFeature: (feature: AgentFeature) => void;
}

const FeatureContext = createContext<FeatureContextValue>({
  activeFeature: null,
  setActiveFeature: () => {},
});

export const useAgentFeature = () => useContext(FeatureContext);

export const FeatureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeFeature, setActiveFeature] = useState<AgentFeature>(null);

  return (
    <FeatureContext.Provider value={{ activeFeature, setActiveFeature }}>
      {children}
    </FeatureContext.Provider>
  );
};