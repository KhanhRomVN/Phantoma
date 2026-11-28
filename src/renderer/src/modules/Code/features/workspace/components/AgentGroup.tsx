// ─── Imports ─────────────────────────────────────────────────────────────────
// ── React ──
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ── Stores ──
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useWorkflowStore } from '../../../agent/stores/workflow.store';

// ── Components ──
import { CodeAgent } from './Zen';

// ── Utils ──
import {
  AgentTabsContext,
  type AgentTab,
  type AgentTabsControl,
} from '@renderer/components/Widgets/Zen/context/AgentTabsContext';
import { ConversationCache } from '@renderer/components/Widgets/Zen/features/chat/stores/conversation_cache.store';
import type { MultiAgentControl } from '@renderer/modules/Code/shared/zen/zen-bridge';

// ── Types ──
import { ORCHESTRATOR_AGENT } from '../../../shared/types/agents.types';

// ─── Constants ───────────────────────────────────────────────────────────────
export const SELECT_AGENT_TAB_EVENT = 'phantoma:select-agent-tab';
const ORCHESTRATOR_ID = 'orchestrator';

// ─── Store ───────────────────────────────────────────────────────────────────
interface AgentConversationState {
  conversations: Record<string, string | null>;
  setConversation: (agentId: string, conversationId: string | null) => void;
  removeConversation: (agentId: string) => void;
}

const useAgentConversationStore = create<AgentConversationState>()(
  persist(
    (set) => ({
      conversations: {},
      setConversation: (agentId, conversationId) =>
        set((s) => ({ conversations: { ...s.conversations, [agentId]: conversationId } })),
      removeConversation: (agentId) =>
        set((s) => {
          const { [agentId]: _removed, ...rest } = s.conversations;
          return { conversations: rest };
        }),
    }),
    { name: 'phantoma-agent-conversations' },
  ),
);

// ─── Functions ───────────────────────────────────────────────────────────────
const capitalize = (value: string): string => `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface AgentSlotProps {
  agentId: string;
  active: boolean;
  tabs: AgentTabsControl;
  initialConversationId: string | null;
  onConversationChange?: (conversationId: string | null) => void;
  onTitleChange?: (title: string | null) => void;
  multiAgent?: MultiAgentControl | null;
}

interface AgentGroupProps {
  multiAgent?: MultiAgentControl | null;
  initialConversationId?: string | null;
  onConversationChange?: (conversationId: string | null) => void;
  onTitleChange?: (title: string | null) => void;
}

// ─── Components ──────────────────────────────────────────────────────────────
const AgentSlot = memo(function AgentSlot({
  agentId,
  active,
  tabs,
  initialConversationId,
  onConversationChange,
  onTitleChange,
  multiAgent = null,
}: AgentSlotProps) {
  const setConversation = useAgentConversationStore((s) => s.setConversation);
  const handleConversationChange = useCallback(
    (conversationId: string | null) => {
      if (agentId !== ORCHESTRATOR_ID) setConversation(agentId, conversationId);
      onConversationChange?.(conversationId);
    },
    [agentId, setConversation, onConversationChange],
  );

  return (
    <div className={active ? 'absolute inset-0 flex flex-col' : 'hidden'}>
      <AgentTabsContext.Provider value={tabs}>
        <CodeAgent
          workflowAgentId={agentId}
          initialConversationId={initialConversationId}
          onConversationChange={handleConversationChange}
          onTitleChange={onTitleChange}
          multiAgent={multiAgent}
        />
      </AgentTabsContext.Provider>
    </div>
  );
});

export const AgentGroup = memo(function AgentGroup({
  multiAgent = null,
  initialConversationId = null,
  onConversationChange,
  onTitleChange,
}: AgentGroupProps) {
  const agents = useWorkflowStore((s) => s.agents);
  const [activeId, setActiveId] = useState(ORCHESTRATOR_ID);
  const initialRef = useRef<Record<string, string | null>>({});
  const [cacheVersion, setCacheVersion] = useState(0);

  // Listen for conversation cache updates to re-compute tab disabled state
  useEffect(() => {
    const handleCacheUpdate = () => setCacheVersion((v) => v + 1);
    window.addEventListener('phantoma:conversation-cache-updated', handleCacheUpdate);
    return () => window.removeEventListener('phantoma:conversation-cache-updated', handleCacheUpdate);
  }, []);

  const ordered = useMemo(() => {
    const orchestrator = agents.find((a) => a.id === ORCHESTRATOR_ID) ?? ORCHESTRATOR_AGENT;
    const members = agents.filter(
      (a) =>
        a.id !== ORCHESTRATOR_ID &&
        (!a.conversationId || !initialConversationId || a.conversationId === initialConversationId),
    );
    return [orchestrator, ...members];
  }, [agents, initialConversationId]);

  const effectiveActiveId = ordered.some((a) => a.id === activeId) ? activeId : ORCHESTRATOR_ID;

  useEffect(() => {
    const ids = new Set(ordered.map((a) => a.id));
    const { conversations, removeConversation } = useAgentConversationStore.getState();
    Object.keys(conversations).forEach((id) => {
      if (!ids.has(id)) removeConversation(id);
    });
    Object.keys(initialRef.current).forEach((id) => {
      if (!ids.has(id)) delete initialRef.current[id];
    });
  }, [ordered]);

  useEffect(() => {
    const onSelect = (e: Event) => {
      const d = (e as CustomEvent<{ agentId?: string }>).detail;
      if (d?.agentId) setActiveId(d.agentId);
    };
    window.addEventListener(SELECT_AGENT_TAB_EVENT, onSelect);
    return () => window.removeEventListener(SELECT_AGENT_TAB_EVENT, onSelect);
  }, []);

  const closeAgent = useCallback((agentId: string) => {
    if (agentId === ORCHESTRATOR_ID) return;
    const store = useWorkflowStore.getState();
    const agent = store.getAgent(agentId);
    if (!agent) return;
    store.deliver(
      agentId,
      ORCHESTRATOR_ID,
      `[SYSTEM NOTICE] The user closed the Zen tab of ${agent.type} agent '${agent.name}' (id: ${agentId}). The agent has been removed: any work it was doing is cancelled and any reply from it will not arrive. Create it again with create_agent if you still need it.`,
    );
    store.removeAgent(agentId);
  }, []);

  const tabs = useMemo<AgentTabsControl>(
    () => ({
      tabs: ordered.map(
        (a): AgentTab => {
          const isOrchestrator = a.id === ORCHESTRATOR_ID;
          let disabled = false;
          if (!isOrchestrator) {
            const convId = a.conversationId;
            if (convId) {
              // Check if conversation has messages from cache
              const cached = ConversationCache.get(convId);
              const hasMessages = !!cached?.messages?.length;
              console.warn(
                `[DEBUG][AgentTabs] agent=${a.id} convId=${convId} cached=${!!cached} messages=${cached?.messages?.length ?? 0} disabled=${!hasMessages}`,
              );
              disabled = !hasMessages;
            } else {
              // No conversation ID → definitely no messages
              disabled = true;
            }
          }
          return {
            id: a.id,
            label: isOrchestrator ? 'Orchestrator' : `${capitalize(a.type)} - ${a.name}`,
            color: a.color,
            closable: !isOrchestrator,
            disabled,
          };
        },
      ),
      activeId: effectiveActiveId,
      onSelect: setActiveId,
      onClose: closeAgent,
    }),
    [ordered, effectiveActiveId, closeAgent, cacheVersion],
  );

  const resolveInitialConversation = (agentId: string): string | null => {
    if (agentId === ORCHESTRATOR_ID) return initialConversationId;
    if (!(agentId in initialRef.current)) {
      initialRef.current[agentId] =
        useAgentConversationStore.getState().conversations[agentId] ?? null;
    }
    return initialRef.current[agentId];
  };

  return (
    <div className="relative flex-1 h-full min-h-0 overflow-hidden">
      {ordered.map((agent) => {
        const isOrchestrator = agent.id === ORCHESTRATOR_ID;
        return (
          <AgentSlot
            key={agent.id}
            agentId={agent.id}
            active={agent.id === effectiveActiveId}
            tabs={tabs}
            initialConversationId={resolveInitialConversation(agent.id)}
            onConversationChange={isOrchestrator ? onConversationChange : undefined}
            onTitleChange={isOrchestrator ? onTitleChange : undefined}
            multiAgent={isOrchestrator ? multiAgent : null}
          />
        );
      })}
    </div>
  );
});