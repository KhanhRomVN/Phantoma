export type HeaderWidgetId =
  | 'git'
  | 'commit'
  | 'agent'
  | 'context'
  | 'cost'
  | 'timer'
  | 'procs'
  | 'layout'
  | 'notifications';

export const HEADER_WIDGETS: { id: HeaderWidgetId; label: string; hint: string }[] = [
  { id: 'git', label: 'Git status', hint: 'ahead/behind + file thay doi' },
  { id: 'commit', label: 'Last commit', hint: 'hash + message + thoi gian' },
  { id: 'agent', label: 'Agent', hint: 'model + trang thai chay' },
  { id: 'context', label: 'Context usage', hint: 'thanh % token da dung' },
  { id: 'cost', label: 'Usage today', hint: 'token + chi phi hom nay' },
  { id: 'timer', label: 'Session timer', hint: 'thoi gian session dang chay' },
  { id: 'procs', label: 'Processes', hint: 'terminal/dev server dang live' },
  { id: 'layout', label: 'Layout', hint: 'chuyen bo cuc pane' },
  { id: 'notifications', label: 'Notifications', hint: 'chuong thong bao' },
];

export const DEFAULT_ENABLED_WIDGETS: HeaderWidgetId[] = [
  'git',
  'agent',
  'context',
  'timer',
  'procs',
];

export const MOCK_HEADER_DATA = {
  git: { ahead: 2, behind: 0, changed: 5, staged: 2 },
  commit: {
    hash: 'a3f91c2',
    message: 'feat(workspace): open files as tabs',
    minutesAgo: 14,
  },
  agent: { provider: 'Claude', model: 'Sonnet', status: 'running' as 'running' | 'idle' },
  context: { used: 78400, limit: 128000 },
  cost: { tokens: 412300, usd: 1.42 },
  timerStartOffsetSec: 5076,
  procs: [
    { cmd: 'npm run dev', port: 5173 },
    { cmd: 'zen-cli', port: undefined as number | undefined },
    { cmd: 'tsc --watch', port: undefined as number | undefined },
  ],
  layouts: ['1x1', '2x1', '1x2', '2x2'] as const,
  notifications: 3,
};