import type { LucideIcon } from 'lucide-react';

export type SettingTabId =
  | 'general'
  | 'interface'
  | 'notifications'
  | 'shortcuts'
  | 'backup'
  | 'storage'
  | 'sql'
  | 'account'
  | 'security'
  | 'about';

export type SettingGroupId = 'workspace' | 'data' | 'account' | 'system';

export interface SettingTabMeta {
  id: SettingTabId;
  label: string;
  description: string;
  group: SettingGroupId;
  icon: LucideIcon;
  fullBleed?: boolean;
  mock?: boolean;
}

export interface NotificationItem {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

export interface NotificationGroup {
  id: string;
  title: string;
  items: NotificationItem[];
}

export interface ShortcutItem {
  id: string;
  label: string;
  keys: string[];
  scope: string;
}

export interface SessionItem {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  current: boolean;
  kind: 'desktop' | 'laptop' | 'mobile';
}

export interface StorageSlice {
  id: string;
  label: string;
  sizeMb: number;
  tone: 'primary' | 'success' | 'warn' | 'error' | 'info' | 'muted';
  path: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  tag: 'feature' | 'fix' | 'improve';
  title: string;
}