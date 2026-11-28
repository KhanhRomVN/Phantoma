import { createContext, useContext } from 'react';

export interface AgentTab {
  id: string;
  label: string;
  color?: string;
  closable?: boolean;
  disabled?: boolean;
}

export interface AgentTabsControl {
  tabs: AgentTab[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose?: (id: string) => void;
}

export const AgentTabsContext = createContext<AgentTabsControl | null>(null);

export const useAgentTabs = (): AgentTabsControl | null => useContext(AgentTabsContext);