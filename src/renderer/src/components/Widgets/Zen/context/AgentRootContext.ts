import { createContext, useContext } from 'react';

/** Root element of the current Zen instance. Drawers portal into it so duplicate ids across Zen tabs cannot misroute them. */
export const AgentRootContext = createContext<HTMLElement | null>(null);

export const useAgentRoot = (): HTMLElement | null => useContext(AgentRootContext);