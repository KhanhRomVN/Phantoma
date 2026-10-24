import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { AgentRootContext } from '@renderer/components/RightPanel/Zen/context/AgentRootContext';
import { AgentPanel } from '@renderer/components/RightPanel/Zen';
import { SettingsProvider } from '@renderer/components/RightPanel/Zen/context/SettingsContext';
import { useAgentFeature } from '@renderer/components/RightPanel/Zen/context/FeatureContext';
import { useCodeStore } from '../../../hooks/useCodeStore';
import { useDesignStore } from '../../../hooks/useDesignStore';
import { EMPTY_AGENT_CONFIG, useWorkflowStore } from '../../../hooks/useWorkflowStore';
import {
  WorkflowAgentContext,
  type WorkflowAgentSync,
} from '@renderer/components/RightPanel/Zen/context/WorkflowAgentContext';
import {
  MultiAgentContext,
  type MultiAgentControl,
} from '@renderer/components/RightPanel/Zen/context/MultiAgentContext';

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
  const workflowSync = useMemo<WorkflowAgentSync | null>(
    () =>
      workflowAgentId
        ? {
            agentId: workflowAgentId,
            model: agentConfig.model,
            account: agentConfig.account,
            setModel: setSyncModel,
            setAccount: setSyncAccount,
          }
        : null,
    [workflowAgentId, agentConfig.model, agentConfig.account, setSyncModel, setSyncAccount],
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
            <WorkflowAgentContext.Provider value={workflowSync}>
              <AgentPanel
                initialConversationId={initialConversationId}
                onConversationChange={onConversationChange}
                onTitleChange={onTitleChange}
              />
            </WorkflowAgentContext.Provider>
          </MultiAgentContext.Provider>
        </SettingsProvider>
      </AgentRootContext.Provider>
    </div>
  );
});
