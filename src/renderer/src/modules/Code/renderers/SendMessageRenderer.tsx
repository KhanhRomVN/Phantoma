import React from 'react';
import { ArrowRight } from 'lucide-react';

import { cn } from '@renderer/shared/utils/cn';

// ── Constants ──
import { getToolLabel } from '@renderer/components/RightPanel/Zen/feature/Chat/constants/tag-registry';

// ── Utils ──
import { getNextUserMessage } from '@renderer/components/RightPanel/Zen/feature/Chat/utils/renderer-utils';

// ── Components ──
import { TagHeader } from '@renderer/components/RightPanel/Zen/feature/Chat/components/ChatBody/AIMessageBox/TagHeader';
import ErrorBlock from '@renderer/components/RightPanel/Zen/feature/Chat/components/ChatBody/AIMessageBox/ErrorBlock';
import { MarkdownRenderer } from '@renderer/components/RightPanel/Zen/feature/Chat/components/ChatBody/AIMessageBox/renderers/MarkdownRenderer';
import type { BaseRendererProps } from '@renderer/components/RightPanel/Zen/feature/Chat/types/renderer-types';
import { useWorkflowAgentSync } from '@renderer/components/RightPanel/Zen/context/WorkflowAgentContext';

import { getAgentFavicon } from '../constants/workspaceAgents';
import { focusAgentPanel } from '../services/agentPanel.service';
import { EMPTY_AGENT_CONFIG, useWorkflowStore } from '../hooks/useWorkflowStore';

const humanizeAgentId = (id: string): string =>
  id
    .split('_')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');

const SendMessageRenderer: React.FC<BaseRendererProps> = ({
  action,
  actionIndex,
  messageId,
  isActionClicked,
  isActiveGroup,
  isLastItemInList,
  toolOutputs,
  allMessages,
  moduleId,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(true);

  const { agent_id: agentId = '', message = '', _validationError: validationError } =
    action.params || {};

  const actionId = `${messageId}-action-${actionIndex}`;
  const outputEntry = toolOutputs?.[actionId];
  const output = outputEntry?.output || '';
  const isError = !!outputEntry?.isError || !!validationError;
  const nextUserMessage = getNextUserMessage(allMessages || [], messageId);
  const isCompleted = !!outputEntry || isActionClicked || isError || !!nextUserMessage;
  const isSending = isActionClicked && !outputEntry;
  const hasMessage = typeof message === 'string' && message.length > 0;

  const workflowSync = useWorkflowAgentSync();
  const senderId = workflowSync?.agentId ?? 'orchestrator';
  const sender = useWorkflowStore((s) => s.agents.find((a) => a.id === senderId));
  const target = useWorkflowStore((s) => s.agents.find((a) => a.id === agentId));
  const config = useWorkflowStore((s) => s.configs[agentId] ?? EMPTY_AGENT_CONFIG);

  const senderName = sender?.name ?? humanizeAgentId(senderId);
  const targetName = target?.name ?? (humanizeAgentId(agentId) || 'unknown');
  const providerId = config.model?.providerId ?? config.model?.provider_id;
  const modelId = config.model?.modelId ?? config.model?.id;
  const email = config.account?.email ?? config.account?.accountId ?? config.account?.id;
  const faviconUrl = getAgentFavicon(providerId);
  const modelLabel = providerId && modelId ? `${providerId}/${modelId}` : 'no model';
  const modelLine = [modelLabel, email].filter(Boolean).join(' ');

  return (
    <div className={cn('flex flex-col gap-1.5 pb-1', isLastItemInList ? 'mb-0' : 'mb-0.5')}>
      <TagHeader
        title={
          <div
            className={cn(
              'flex items-center gap-1.5 text-xs text-text-primary',
              hasMessage && !isError ? 'cursor-pointer' : 'cursor-default',
            )}
            onClick={hasMessage && !isError ? () => setIsCollapsed((v) => !v) : undefined}
          >
            <span className="font-semibold opacity-80 shrink-0">{getToolLabel('send_message', moduleId)}</span>
            <span className="opacity-40 shrink-0">·</span>
            <span className="font-semibold shrink-0" style={{ color: sender?.color }}>
              {senderName}
            </span>
            <ArrowRight size={12} className="shrink-0 opacity-60" />
            <span className="font-semibold shrink-0" style={{ color: target?.color }}>
              {targetName}
            </span>
            {isSending && (
              <span className="text-[10px] opacity-55 flex items-center gap-1 shrink-0 ml-auto">
                <span className="codicon codicon-loading codicon-modifier-spin text-[10px]" />
                Sending...
              </span>
            )}
          </div>
        }
        statusColor={
          isError ? 'rgb(255, 45, 85)' : isCompleted ? 'rgb(48, 209, 88)' : 'rgb(106, 122, 154)'
        }
        isError={isError}
        isPartial={isSending}
        isWaitingApproval={!!isActiveGroup && !isCompleted}
        toolType="send_message"
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
        onPathClick={() => focusAgentPanel(agentId)}
      />

      {isError ? (
        <ErrorBlock
          content={output || validationError || 'Send message failed'}
          compact={true}
          maxHeight="300px"
        />
      ) : (
        hasMessage &&
        !isCollapsed && (
          <div
            className="max-h-[320px] overflow-y-auto mt-0.5 pl-3 pr-2.5 py-1.5 bg-card-background rounded-r-[4px] rounded-l-[1px] border-0 outline-none"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(128,128,128,0.4) transparent' }}
          >
            <MarkdownRenderer content={message} />
          </div>
        )
      )}
    </div>
  );
};

export default SendMessageRenderer;