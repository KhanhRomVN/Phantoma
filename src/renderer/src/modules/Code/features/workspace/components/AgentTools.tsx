import { memo } from 'react';
import { AgentTools } from '@renderer/components/Widgets/AgentTools';

interface CodeAgentToolsProps {
  onProviderChange?: (provider: { id: string; name: string; url?: string }) => void;
  initialConversationId?: string | null;
  onConversationChange?: (conversationId: string | null) => void;
  cwd?: string;
}

export const CodeAgentTools = memo(function CodeAgentTools({
  onProviderChange,
  initialConversationId,
  onConversationChange,
  cwd,
}: CodeAgentToolsProps) {
  return (
    <div id="code-agent-tools-root" className="relative flex-1 h-full min-h-0 overflow-hidden">
      <AgentTools
        onProviderChange={onProviderChange}
        conversationId={initialConversationId}
        onConversationChange={onConversationChange}
        cwd={cwd}
      />
    </div>
  );
});