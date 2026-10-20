import { memo, useEffect } from 'react';
import { AgentPanel } from '@renderer/components/RightPanel/Zen';
import { SettingsProvider } from '@renderer/components/RightPanel/Zen/context/SettingsContext';
import { useAgentFeature } from '@renderer/components/RightPanel/Zen/context/FeatureContext';
import { useCodeStore } from '../../../hooks/useCodeStore';
import { useDesignStore } from '../../../hooks/useDesignStore';

interface CodeAgentProps {
  initialConversationId?: string | null;
  onConversationChange?: (conversationId: string | null) => void;
  onTitleChange?: (title: string | null) => void;
}

export const CodeAgent = memo(function CodeAgent({
  initialConversationId,
  onConversationChange,
  onTitleChange,
}: CodeAgentProps) {
  const currentProjectId = useCodeStore((s) => s.currentProjectId);
  const hasActiveDesign = useDesignStore((s) => s.activeDesignId !== null);
  const { activeFeature, codeState, setActiveFeature, setCodeState } = useAgentFeature();
  const desiredFeature = hasActiveDesign ? 'design' : 'code';

  useEffect(() => {
    console.log('[DEBUG][CodeAgent] sync to FeatureContext', { currentProjectId });
    setCodeState({ currentProjectId });
  }, [currentProjectId, setCodeState]);

  useEffect(() => {
    if (activeFeature !== desiredFeature) setActiveFeature(desiredFeature);
  }, [activeFeature, desiredFeature, setActiveFeature]);

  useEffect(() => {
    console.log('[DEBUG][CodeAgent] mounted');
    return () => console.log('[DEBUG][CodeAgent] unmounted');
  }, []);

  useEffect(() => {
    console.log('[DEBUG][CodeAgent] feature state', {
      activeFeature,
      currentProjectId: codeState.currentProjectId,
    });
  }, [activeFeature, codeState.currentProjectId]);

  return (
    <div id="code-agent-root" className="relative flex-1 h-full min-h-0 overflow-hidden">
      <SettingsProvider>
        <AgentPanel
          initialConversationId={initialConversationId}
          onConversationChange={onConversationChange}
          onTitleChange={onTitleChange}
        />
      </SettingsProvider>
    </div>
  );
});
