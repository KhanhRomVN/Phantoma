import ConversationService from '../../shared/conversations/conversation-storage.service';

type ServiceConversation = NonNullable<Awaited<ReturnType<typeof ConversationService.get>>>;
type ServiceMessage = ServiceConversation['messages'][number];

export interface HistoryMessageMeta {
  providerId?: string;
  modelId?: string;
  tokenUsage?: number;
  isError?: boolean;
}

export type HistoryMessage = ServiceMessage & HistoryMessageMeta;

export interface HistoryScope {
  kind: 'workspace' | 'module';
  key: string;
}

export interface ConversationItem {
  id: string;
  tabId: number;
  folderPath: string | null;
  title: string;
  lastModified: number;
  messageCount: number;
  preview: string;
  containerName?: string;
  provider?: 'deepseek' | 'chatgpt' | 'gemini' | 'grok' | 'claude';
  createdAt: number;
  timestamp?: number;
  totalRequests: number;
  totalTokenUsage: number;
  size?: number; // Size in bytes
  totalTasks?: number;
  completedTasks?: number;
  uniqueTaskCount?: number;
  providerId?: string;
  modelId?: string;
  workflowAgentId?: import('@renderer/components/Widgets/Zen/features/chat/types/workflow_agent.types').WorkflowAgentId | null;

  /** Per-conversation override: bật/tắt SKILL trong system prompt */
  useSkillEnabled?: boolean;
}
