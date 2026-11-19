import { Flag, Square, Zap } from 'lucide-react';
import type { Phase } from '../types';

export const PHASES: Phase[] = [
  {
    id: 'before',
    label: 'Before launch',
    icon: Flag,
    tone: 'info',
    items: [
      { id: 'ipcheck', label: 'Check IP & DNS leak', desc: 'Verify exit IP before opening', defaultOn: true },
      { id: 'syncState', label: 'Restore saved session', desc: 'Load cookies and local storage', defaultOn: true },
      { id: 'warmCache', label: 'Clear stale cache', desc: 'Drop cache older than 7 days', defaultOn: false },
    ],
  },
  {
    id: 'during',
    label: 'During session',
    icon: Zap,
    tone: 'warn',
    items: [
      { id: 'webrtc', label: 'Block WebRTC leak', desc: 'Hide local / public IP via WebRTC', chromiumOnly: true, defaultOn: true },
      { id: 'autoLogin', label: 'Auto-login services', desc: 'Run linked service login scripts', defaultOn: false },
      { id: 'recordFp', label: 'Record footprint', desc: 'Log IP and device changes', defaultOn: true },
    ],
  },
  {
    id: 'after',
    label: 'After close',
    icon: Square,
    tone: 'success',
    items: [
      { id: 'saveSession', label: 'Save session', desc: 'Persist cookies and storage', defaultOn: true },
      { id: 'clearTemp', label: 'Clear temp files', desc: 'Remove downloads and crash dumps', defaultOn: false },
      { id: 'exportLog', label: 'Export session log', desc: 'Write history to the profile folder', defaultOn: false },
    ],
  },
];

export const DEFAULT_FLAGS: Record<string, boolean> = Object.fromEntries(
  PHASES.flatMap((p) => p.items.map((i) => [i.id, i.defaultOn])),
);