import type { LucideIcon } from 'lucide-react';

export type PlatformId =
  | 'slack'
  | 'discord'
  | 'telegram'
  | 'whatsapp'
  | 'messenger'
  | 'signal'
  | 'zalo'
  | 'teams'
  | 'line';

export interface PlatformInfo {
  label: string;
  domain: string;
}

export type AccountStatus = 'online' | 'offline' | 'error';
export type AiStatus = 'urgent' | 'spam' | 'work' | 'personal';
export type ChatTabId = 'all' | 'unread' | 'pinned' | 'important';
export type ModalType = 'merge' | 'account' | null;
export type MessageRole = 'me' | 'them';
export type TipSide = 'top' | 'right' | 'bottom';

export interface Workspace {
  id: string;
  name: string;
  icon: LucideIcon;
  unread: number;
}

export interface Account {
  id: string;
  workspaceId: string;
  platform: PlatformId;
  name: string;
  status: AccountStatus;
  avatar: string;
}

export interface Chat {
  id: string;
  accountId: string;
  name: string;
  last: string;
  time: string;
  unread: number;
  aiStatus: AiStatus | null;
  isPinned: boolean;
  isEncrypted: boolean;
  important: boolean;
  role: string;
  mergedFrom?: string[];
}

export interface Message {
  id: string;
  chatId: string;
  role: MessageRole;
  content: string;
  time: string;
  isEncrypted: boolean;
  isBurnAfterReading?: boolean;
  countdown?: number;
  total?: number;
}

export interface AISuggestion {
  id: string;
  chatId: string;
  tone: string;
  text: string;
}

export type Tone = 'primary' | 'success' | 'error' | 'warn' | 'info' | 'muted';

export interface AiMetaEntry {
  label: string;
  color: Tone;
  icon: LucideIcon;
}

export interface StatusMetaEntry {
  label: string;
  color: Tone;
}

export interface ChatTab {
  id: ChatTabId;
  label: string;
  icon: LucideIcon;
}

export type RailMode = 'group' | 'service';

export interface RailItem {
  id: string;
  name: string;
  unread: number;
  icon?: LucideIcon;
  platform?: PlatformId;
}