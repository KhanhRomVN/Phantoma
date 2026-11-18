import { Briefcase, Flame, Inbox, MessageSquareText, Pin, ShieldAlert, Star, User } from 'lucide-react';
import type { AiMetaEntry, AiStatus, AccountStatus, ChatTab, StatusMetaEntry, Tone } from '../types';

export const AI_META: Record<AiStatus, AiMetaEntry> = {
  urgent: { label: 'Urgent', color: 'error', icon: Flame },
  spam: { label: 'Spam', color: 'warn', icon: ShieldAlert },
  work: { label: 'Work', color: 'info', icon: Briefcase },
  personal: { label: 'Personal', color: 'primary', icon: User },
};

export const STATUS_META: Record<AccountStatus, StatusMetaEntry> = {
  online: { label: 'Online', color: 'success' },
  offline: { label: 'Offline', color: 'muted' },
  error: { label: 'Sync error', color: 'error' },
};

export const CHAT_TABS: ChatTab[] = [
  { id: 'all', label: 'All', icon: Inbox },
  { id: 'unread', label: 'Unread', icon: MessageSquareText },
  { id: 'pinned', label: 'Pinned', icon: Pin },
  { id: 'important', label: 'Important', icon: Star },
];

export const AV_TONES: Tone[] = ['primary', 'info', 'success', 'warn', 'error'];

export const BURN_OPTIONS = [0, 30, 120, 300];