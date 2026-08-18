/**
 * FeatureContext — quản lý feature đang active (emulate/code) và EmulateState toàn cục.
 *
 *    FeatureProvider     : Provider bọc ngoài, giữ state activeFeature + emulateState.
 *    useAgentFeature()   : Hook tiêu thụ context, trả về { activeFeature, setActiveFeature, emulateState, setEmulateState }.
 */

import React, { createContext, useContext, useState } from 'react';

// Types
export type AgentFeature = 'emulate' | 'code' | 'recon' | null;

export interface EmulateState {
  activeTargetId: string | null;
  targetStates: Record<string, { isActive: boolean; mode?: 'mitm' | 'cdp' | 'frida' }>;
}

export interface CodeState {
  currentProjectId: string | null;
}

export interface ReconState {
  activeTargetId: string | null;
  targets: Array<{ id: string; email: string; isActive: boolean }>;
}

interface FeatureContextValue {
  activeFeature: AgentFeature;
  setActiveFeature: (feature: AgentFeature) => void;
  emulateState: EmulateState;
  setEmulateState: (state: EmulateState) => void;
  codeState: CodeState;
  setCodeState: (state: CodeState) => void;
  reconState: ReconState;
  setReconState: (state: ReconState) => void;
}

// CONTEXT
const FeatureContext = createContext<FeatureContextValue>({
  activeFeature: null,
  setActiveFeature: () => {},
  emulateState: { activeTargetId: null, targetStates: {} },
  setEmulateState: () => {},
  codeState: { currentProjectId: null },
  setCodeState: () => {},
  reconState: { activeTargetId: null, targets: [] },
  setReconState: () => {},
});

// Hooks
export const useAgentFeature = () => useContext(FeatureContext);

// Components
export const FeatureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeFeature, setActiveFeature] = useState<AgentFeature>(null);
  const [emulateState, setEmulateState] = useState<EmulateState>({
    activeTargetId: null,
    targetStates: {},
  });
  const [codeState, setCodeState] = useState<CodeState>({
    currentProjectId: null,
  });
  const [reconState, setReconState] = useState<ReconState>({
    activeTargetId: null,
    targets: [],
  });

  return (
    <FeatureContext.Provider
      value={{
        activeFeature,
        setActiveFeature,
        emulateState,
        setEmulateState,
        codeState,
        setCodeState,
        reconState,
        setReconState,
      }}
    >
      {children}
    </FeatureContext.Provider>
  );
};
