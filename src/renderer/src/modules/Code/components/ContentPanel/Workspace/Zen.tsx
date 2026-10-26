import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { AgentRootContext } from '@renderer/components/RightPanel/Zen/context/AgentRootContext';
import { AgentPanel } from '@renderer/components/RightPanel/Zen';
import { SettingsProvider } from '@renderer/components/RightPanel/Zen/context/SettingsContext';
import { useAgentFeature } from '@renderer/components/RightPanel/Zen/context/FeatureContext';
import { useCodeStore } from '../../../hooks/useCodeStore';
import { useDesignStore } from '../../../hooks/useDesignStore';
import { EMPTY_AGENT_CONFIG, useWorkflowStore } from '../../../hooks/useWorkflowStore';
import { USER_ID } from '../../../types/agents';
import AgentMessageBox from '../../../renderers/AgentMessageBox';
import { parseAgentMessage } from '@renderer/components/RightPanel/Zen/context/WorkflowAgentContext';
import {
  AccountAgentsContext,
  WorkflowAgentContext,
  type WorkflowAgentSync,
} from '@renderer/components/RightPanel/Zen/context/WorkflowAgentContext';
import {
  MultiAgentContext,
  type MultiAgentControl,
} from '@renderer/components/RightPanel/Zen/context/MultiAgentContext';

const renderIncomingMessage: WorkflowAgentSync['renderIncomingMessage'] = (message) =>
  parseAgentMessage(message.content) ? <AgentMessageBox message={message} /> : null;

interface CodeAgentProps {
  multiAgent?: MultiAgentControl | null;
  initialConversationId?: string | null;
  onConversationChange?: (conversationId: string | null) => void;
  onTitleChange?: (title: string | null) => void;
  /** When set, this Zen tab is linked to a workflow agent and shares its model + account. */
  workflowAgentId?: string;
}

export const CodeAgent = memo(function CodeAgent({
  initialConversationId,
  onConversationChange,
  onTitleChange,
  workflowAgentId,
  multiAgent = null,
}: CodeAgentProps) {
  const currentProjectId = useCodeStore((s) => s.currentProjectId);
  const [rootEl, setRootEl] = useState<HTMLElement | null>(null);
  const agentConfig = useWorkflowStore(
    (s) => (workflowAgentId ? s.configs[workflowAgentId] : undefined) ?? EMPTY_AGENT_CONFIG,
  );
  const agentType = useWorkflowStore((s) =>
    workflowAgentId ? s.agents.find((a) => a.id === workflowAgentId)?.type : undefined,
  );
  const allConfigs = useWorkflowStore((s) => s.configs);
  const allAgents = useWorkflowStore((s) => s.agents);
  const accountAgents = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const agent of allAgents) {
      const acc = allConfigs[agent.id]?.account;
      const accId = acc?.id ?? acc?.accountId ?? acc?.account_id;
      if (!accId) continue;
      (map[accId] ??= []).push(agent.type);
    }
    return map;
  }, [allConfigs, allAgents, workflowAgentId]);
  const inbox = useWorkflowStore((s) => (workflowAgentId ? s.inbox[workflowAgentId] : undefined));
  const shiftInbox = useCallback(() => {
    if (workflowAgentId) useWorkflowStore.getState().shiftInbox(workflowAgentId);
  }, [workflowAgentId]);
  const notifyUserMessage = useCallback(
    (content: string) => {
      if (!workflowAgentId) return;
      const store = useWorkflowStore.getState();
      if (workflowAgentId === 'orchestrator') {
        const now = new Date();
        const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        store.addMessage({ from: USER_ID, to: 'orchestrator', content, time });
      } else {
        store.deliver(workflowAgentId, 'orchestrator', content);
      }
    },
    [workflowAgentId],
  );
  const setAgentModel = useWorkflowStore((s) => s.setModel);
  const setAgentAccount = useWorkflowStore((s) => s.setAccount);
  const setSyncModel = useCallback(
    (model: any) => {
      if (workflowAgentId) setAgentModel(workflowAgentId, model);
    },
    [workflowAgentId, setAgentModel],
  );
  const setSyncAccount = useCallback(
    (account: any) => {
      if (workflowAgentId) setAgentAccount(workflowAgentId, account);
    },
    [workflowAgentId, setAgentAccount],
  );
  const normalizedModel = useMemo(() => {
    const m = agentConfig.model;
    if (!m || m.id) return m;
    const id = m.modelId ?? m.model_id;
    return id ? { ...m, id, name: m.name ?? id } : m;
  }, [agentConfig.model]);
  const normalizedAccount = useMemo(() => {
    const a = agentConfig.account;
    if (!a || a.id) return a;
    const id = a.accountId ?? a.account_id;
    return id ? { ...a, id } : a;
  }, [agentConfig.account]);
  const workflowSync = useMemo<WorkflowAgentSync | null>(
    () =>
      workflowAgentId
        ? {
            agentId: workflowAgentId,
            agentType,
            model: normalizedModel,
            account: normalizedAccount,
            accountAgents,
            setModel: setSyncModel,
            setAccount: setSyncAccount,
            inbox,
            shiftInbox,
            notifyUserMessage,
            renderIncomingMessage,
          }
        : null,
    [
      workflowAgentId,
      agentType,
      normalizedModel,
      normalizedAccount,
      accountAgents,
      setSyncModel,
      setSyncAccount,
      inbox,
      shiftInbox,
      notifyUserMessage,
    ],
  );
  const hasActiveDesign = useDesignStore((s) => s.activeDesignId !== null);
  const { activeFeature, codeState, setActiveFeature, setCodeState } = useAgentFeature();
  const desiredFeature = hasActiveDesign ? 'design' : 'code';

  useEffect(() => {
    setCodeState({ currentProjectId });
  }, [currentProjectId, setCodeState]);

  useEffect(() => {
    if (activeFeature !== desiredFeature) setActiveFeature(desiredFeature);
  }, [activeFeature, desiredFeature, setActiveFeature]);

  return (
    <div
      ref={setRootEl}
      id="code-agent-root"
      className="relative flex-1 h-full min-h-0 overflow-hidden"
    >
      <AgentRootContext.Provider value={rootEl}>
        <SettingsProvider>
          <MultiAgentContext.Provider value={multiAgent}>
            <AccountAgentsContext.Provider value={accountAgents}>
              <WorkflowAgentContext.Provider value={workflowSync}>
                <AgentPanel
                  initialConversationId={initialConversationId}
                  onConversationChange={onConversationChange}
                  onTitleChange={onTitleChange}
                />
              </WorkflowAgentContext.Provider>
            </AccountAgentsContext.Provider>
          </MultiAgentContext.Provider>
        </SettingsProvider>
      </AgentRootContext.Provider>
    </div>
  );
});
