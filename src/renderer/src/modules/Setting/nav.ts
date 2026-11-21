import {
  Bell,
  CloudUpload,
  Database,
  HardDrive,
  Info,
  Keyboard,
  Palette,
  Settings,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import type { SettingGroupId, SettingTabId, SettingTabMeta } from './types';
import type { Tone } from './components/shared';

export const GROUPS: { id: SettingGroupId; label: string }[] = [
  { id: 'workspace', label: 'Workspace' },
  { id: 'data', label: 'Data' },
  { id: 'account', label: 'Account' },
  { id: 'system', label: 'System' },
];

export const TABS: SettingTabMeta[] = [
  {
    id: 'general',
    label: 'General',
    description: 'Runtime services, ports and connection health.',
    group: 'workspace',
    icon: Settings,
  },
  {
    id: 'interface',
    label: 'Interface',
    description: 'Theme, typography and density of the workspace.',
    group: 'workspace',
    icon: Palette,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'Choose what Phantoma tells you and how.',
    group: 'workspace',
    icon: Bell,
    mock: true,
  },
  {
    id: 'shortcuts',
    label: 'Shortcuts',
    description: 'Keyboard shortcuts for faster navigation.',
    group: 'workspace',
    icon: Keyboard,
    mock: true,
  },
  {
    id: 'backup',
    label: 'Backup',
    description: 'Sync the ~/.phantoma folder to a private GitHub repository.',
    group: 'data',
    icon: CloudUpload,
  },
  {
    id: 'storage',
    label: 'Storage',
    description: 'See what takes up space and clean it up.',
    group: 'data',
    icon: HardDrive,
    mock: true,
  },
  {
    id: 'sql',
    label: 'SQL Viewer',
    description: 'Browse local databases and backups, read-only.',
    group: 'data',
    icon: Database,
    fullBleed: true,
  },
  {
    id: 'account',
    label: 'Account',
    description: 'Your profile and workspace identity.',
    group: 'account',
    icon: UserRound,
    mock: true,
  },
  {
    id: 'security',
    label: 'Security',
    description: 'Sessions, lock and privacy controls.',
    group: 'account',
    icon: ShieldCheck,
    mock: true,
  },
  {
    id: 'about',
    label: 'About',
    description: 'Version, updates and release notes.',
    group: 'system',
    icon: Info,
    mock: true,
  },
];

export const getTab = (id: SettingTabId): SettingTabMeta =>
  TABS.find((t) => t.id === id) ?? TABS[0];

export const TAB_TONE: Record<SettingTabId, Tone> = {
  general: 'blue',
  interface: 'purple',
  notifications: 'warn',
  shortcuts: 'teal',
  backup: 'success',
  storage: 'pink',
  sql: 'info',
  account: 'violet',
  security: 'error',
  about: 'primary',
};