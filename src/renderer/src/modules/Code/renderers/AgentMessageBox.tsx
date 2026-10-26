import React from 'react';
import { ArrowRight } from 'lucide-react';

import { cn } from '@renderer/shared/utils/cn';
import { MarkdownRenderer } from '@renderer/components/RightPanel/Zen/feature/Chat/components/ChatBody/AIMessageBox/renderers/MarkdownRenderer';
import { TagHeader } from '@renderer/components/RightPanel/Zen/feature/Chat/components/ChatBody/AIMessageBox/TagHeader';
import {
  parseAgentMessage,
  useWorkflowAgentSync,
} from '@renderer/components/RightPanel/Zen/context/WorkflowAgentContext';

import { getAgentFavicon } from '../constants/workspaceAgents';
import { focusAgentPanel } from '../services/agentPanel.service';
import { EMPTY_AGENT_CONFIG, useWorkflowStore } from '../hooks/useWorkflowStore';

interface AgentMessageBoxProps {
  message: { id: string; content: string };
}

const humanizeAgentId = (id: string): string =>
  id
    .split('_')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');

const AgentMessageBox: React.FC<AgentMessageBoxProps> = ({ message }) => {
  const parsed = parseAgentMessage(message.content);
  const fromId = parsed?.from ?? '';
  const workflowSync = useWorkflowAgentSync();
  const currentId = workflowSync?.agentId ?? 'orchestrator';
  const sender = useWorkflowStore((s) => s.agents.find((a) => a.id === fromId));
  const current = useWorkflowStore((s) => s.agents.find((a) => a.id === currentId));
  const config = useWorkflowStore((s) => s.configs[fromId] ?? EMPTY_AGENT_CONFIG);
  const snapshot = useWorkflowStore((s) => {
    for (let i = s.messages.length - 1; i >= 0; i--) {
      if (s.messages[i].from === fromId && s.messages[i].fromInfo) return s.messages[i].fromInfo;
    }
    return undefined;
  });
  const [isCollapsed, setIsCollapsed] = React.useState(true);

  if (!parsed) return null;

  const senderName = sender?.name ?? snapshot?.name ?? humanizeAgentId(fromId);
  const senderColor = sender?.color ?? snapshot?.color;
  const currentName = current?.name ?? humanizeAgentId(currentId);
  const providerId = config.model?.providerId ?? config.model?.provider_id ?? snapshot?.providerId;
  const modelId = config.model?.modelId ?? config.model?.id ?? snapshot?.modelId;
  const email = config.account?.email ?? config.account?.accountId ?? config.account?.id;
  const faviconUrl = getAgentFavicon(providerId);
  const modelLabel = providerId && modelId ? `${providerId}/${modelId}` : 'no model';
  const modelLine = [modelLabel, email].filter(Boolean).join(' ');

  return (
    <div className="flex flex-col gap-1.5 mb-2">
      <TagHeader
        title={
          <div className="flex items-center gap-1.5 text-xs text-text-primary">
            <span className="font-semibold opacity-80 shrink-0">RECEIVE MESSAGE</span>
            <span className="opacity-40 shrink-0">·</span>
            <span className="font-semibold shrink-0" style={{ color: senderColor }}>
              {senderName}
            </span>
            <ArrowRight size={12} className="shrink-0 opacity-60" />
            <span className="font-semibold shrink-0" style={{ color: current?.color }}>
              {currentName}
            </span>
          </div>
        }
        statusColor="rgb(48, 209, 88)"
        onClick={() => setIsCollapsed((v) => !v)}
        compactPath
        pathIcon={
          <span className="flex items-center gap-1 mr-1.5 shrink-0 text-[10px]">
            {faviconUrl && (
              <img
                src={faviconUrl}
                alt=""
                draggable={false}
                className="w-3 h-3 shrink-0 rounded-[2px] object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
          </span>
        }
        path={modelLine}
        onPathClick={() => focusAgentPanel(fromId)}
      />
      {!isCollapsed && (
        <div
          className={cn(
            'max-h-[360px] overflow-y-auto pl-3 pr-2.5 py-1.5 bg-card-background rounded-r-[4px] rounded-l-[1px]',
          )}
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(128,128,128,0.4) transparent' }}
        >
          <MarkdownRenderer content={parsed.body} />
        </div>
      )}
    </div>
  );
};

export default AgentMessageBox;