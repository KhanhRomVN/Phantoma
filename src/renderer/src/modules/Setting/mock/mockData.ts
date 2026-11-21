import type {
  ChangelogEntry,
  NotificationGroup,
  SessionItem,
  ShortcutItem,
  StorageSlice,
} from '../types';

export const MOCK_ACCOUNT = {
  name: 'Khanh Rom',
  email: 'khanhromvn@phantoma.dev',
  handle: 'khanhromvn',
  plan: 'Pro',
  workspace: 'Phantoma Lab',
  joined: 'Mar 2025',
  timezone: 'Asia/Ho_Chi_Minh',
  language: 'vi',
};

export const MOCK_TIMEZONES = [
  { value: 'Asia/Ho_Chi_Minh', label: 'Ho Chi Minh (UTC+7)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' },
  { value: 'Europe/Berlin', label: 'Berlin (UTC+1)' },
  { value: 'America/New_York', label: 'New York (UTC-5)' },
];

export const MOCK_LANGUAGES = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
];

export const MOCK_NOTIFICATIONS: NotificationGroup[] = [
  {
    id: 'activity',
    title: 'Activity',
    items: [
      { id: 'task-done', label: 'Task completed', description: 'When an agent finishes a task you assigned.', enabled: true },
      { id: 'task-fail', label: 'Task failed', description: 'When a run stops with an error.', enabled: true },
      { id: 'mention', label: 'Mentions', description: 'When a workflow requests your input.', enabled: false },
    ],
  },
  {
    id: 'system',
    title: 'System',
    items: [
      { id: 'server-down', label: 'Server unreachable', description: 'Alert when a backend service stops responding.', enabled: true },
      { id: 'backup', label: 'Backup result', description: 'Summary after each backup push.', enabled: true },
      { id: 'update', label: 'Update available', description: 'When a new Phantoma version is released.', enabled: false },
    ],
  },
  {
    id: 'delivery',
    title: 'Delivery',
    items: [
      { id: 'sound', label: 'Play sound', description: 'Short chime for important alerts.', enabled: false },
      { id: 'desktop', label: 'Desktop notifications', description: 'Show native OS notifications when unfocused.', enabled: true },
    ],
  },
];

export const MOCK_SHORTCUTS: ShortcutItem[] = [
  { id: 'quick-nav', label: 'Open quick navigation', keys: ['Ctrl', 'K'], scope: 'Global' },
  { id: 'toggle-panel', label: 'Collapse activity panel', keys: ['Ctrl', 'B'], scope: 'Global' },
  { id: 'new-window', label: 'New window', keys: ['Ctrl', 'Shift', 'N'], scope: 'Global' },
  { id: 'settings', label: 'Open settings', keys: ['Ctrl', ','], scope: 'Global' },
  { id: 'save', label: 'Save file', keys: ['Ctrl', 'S'], scope: 'Editor' },
  { id: 'find', label: 'Find in file', keys: ['Ctrl', 'F'], scope: 'Editor' },
  { id: 'goto-def', label: 'Go to definition', keys: ['Ctrl', 'Click'], scope: 'Editor' },
  { id: 'terminal', label: 'Toggle terminal', keys: ['Ctrl', '`'], scope: 'Workspace' },
  { id: 'run', label: 'Run / debug', keys: ['F5'], scope: 'Workspace' },
];

export const MOCK_SESSIONS: SessionItem[] = [
  { id: 's1', device: 'Linux · Phantoma Desktop', location: 'Ho Chi Minh, VN', lastActive: 'Active now', current: true, kind: 'desktop' },
  { id: 's2', device: 'MacBook Pro · Phantoma Desktop', location: 'Da Nang, VN', lastActive: '2 hours ago', current: false, kind: 'laptop' },
  { id: 's3', device: 'Pixel 8 · Companion', location: 'Ho Chi Minh, VN', lastActive: 'Yesterday', current: false, kind: 'mobile' },
];

export const MOCK_STORAGE: StorageSlice[] = [
  { id: 'profiles', label: 'Browser profiles', sizeMb: 2140, tone: 'primary', path: '~/.phantoma/profile/profiles' },
  { id: 'code', label: 'Code sessions', sizeMb: 640, tone: 'info', path: '~/.phantoma/code' },
  { id: 'design', label: 'Designs & assets', sizeMb: 380, tone: 'success', path: '~/.phantoma/design' },
  { id: 'cache', label: 'Cache', sizeMb: 520, tone: 'warn', path: '~/.phantoma/cache' },
  { id: 'logs', label: 'Logs', sizeMb: 96, tone: 'muted', path: '~/.phantoma/logs' },
];

export const MOCK_DISK = { totalMb: 512000, usedMb: 399360 };

export const MOCK_APP = {
  name: 'Phantoma',
  version: '0.9.4',
  channel: 'Stable',
  electron: '33.2.1',
  node: '20.18.0',
  build: '2026-11-12',
};

export const MOCK_CHANGELOG: ChangelogEntry[] = [
  { version: '0.9.4', date: 'Nov 12', tag: 'feature', title: 'Multi-window target lock for Code branches' },
  { version: '0.9.3', date: 'Oct 28', tag: 'improve', title: 'Faster profile table with column sorting' },
  { version: '0.9.2', date: 'Oct 14', tag: 'fix', title: 'Backup push no longer stalls on large folders' },
  { version: '0.9.1', date: 'Sep 30', tag: 'feature', title: 'Proxy module with VPN-to-proxy providers' },
];