import type { MonitorGroup, MonitorItem } from '../types/monitor.types';

export const MOCK_MONITORS: MonitorItem[] = [
  { id: 'm1', name: 'r/netsec', sourceType: 'reddit', schedule: '5m', hits24h: 48, status: 'running', group: 'Dự án A', tags: ['leak', '0day'] },
  { id: 'm2', name: 'HN-Front', sourceType: 'hackernews', schedule: '5m', hits24h: 112, status: 'running', group: 'Dự án A', tags: ['leak'] },
  { id: 'm3', name: 'Lobsters-Sec', sourceType: 'lobsters', schedule: '1h', hits24h: 7, status: 'running', group: 'Dự án B', tags: ['waf-bypass'] },
  { id: 'm4', name: 'DEV-Security', sourceType: 'devto', schedule: '15m', hits24h: 31, status: 'paused', group: 'Research', tags: ['0day', 'research'] },
  { id: 'm5', name: 'Medium-InfoSec', sourceType: 'medium', schedule: '15m', hits24h: 12, status: 'running', group: 'Dự án B', tags: ['mobile'] },
  { id: 'm6', name: 'SO-Security', sourceType: 'stackoverflow', schedule: '5m', hits24h: 64, status: 'error', group: 'Research', tags: ['research', 'ssrf'] },
  { id: 'm7', name: 'r/ReverseEngineering', sourceType: 'reddit', schedule: '1h', hits24h: 19, status: 'paused', group: 'Dự án B', tags: ['leak'] },
  { id: 'm8', name: 'HN-Show', sourceType: 'hackernews', schedule: '0 */2 * * *', hits24h: 5, status: 'running', group: 'Dự án B', tags: ['mobile'] },
];

export const MOCK_GROUPS: MonitorGroup[] = ['Dự án A', 'Dự án B', 'Research'].map((name, i) => ({
  id: `g${i + 1}`,
  name,
  monitorIds: MOCK_MONITORS.filter((m) => m.group === name).map((m) => m.id),
}));