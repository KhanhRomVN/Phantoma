import { PortResult, ScanResult } from './types';
import { SCAN_TYPES } from './constants';
import {
  saveTargetHistory as saveTargetHistoryShared,
  saveScanHistory as saveScanHistoryShared,
} from '@renderer/modules/Tool/utils/history';

export const buildCommand = (params: any): string => {
  const parts = ['nmap'];
  const t = SCAN_TYPES.find((s) => s.value === params.scanType);
  if (t) parts.push(t.flag);
  if (params.osDetection && !params.aggressive) parts.push('-O');
  if (params.versionDetection && !params.aggressive) parts.push('-sV');
  if (params.aggressive) parts.push('-A');
  parts.push(`-T${params.timing}`);
  if (params.ports) parts.push(`-p ${params.ports}`);
  parts.push(params.target || '<target>');
  return parts.join(' ');
};

export const buildFlags = (params: any): string[] => {
  const flags: string[] = [];
  const t = SCAN_TYPES.find((s) => s.value === params.scanType);
  if (t) flags.push(t.flag);
  if (params.osDetection && !params.aggressive) flags.push('-O');
  if (params.versionDetection && !params.aggressive) flags.push('-sV');
  if (params.aggressive) flags.push('-A');
  flags.push(`-T${params.timing}`);
  if (params.ports) {
    flags.push('-p');
    flags.push(params.ports);
  }
  if (params.additionalFlags?.trim()) {
    const rawFlags = params.additionalFlags.trim().split(/\s+/);
    flags.push(...rawFlags);
  }
  const hasOX = flags.some((f) => f === '-oX');
  if (!hasOX) {
    flags.push('-oX', '-');
  }
  const hasStats = flags.some((f) => f === '--stats-every');
  if (!hasStats) {
    flags.push('--stats-every', '1s');
  }
  return flags;
};

export const stateColor = (state: PortResult['state']) => {
  if (state === 'open') return '#34d399';
  if (state === 'filtered') return '#fbbf24';
  return '#374151';
};

// Re-export shared history utilities (đã gộp từ utils chung)
export { getDateLabel, groupHistoryByDate } from '@renderer/modules/Tool/utils/history';

export const saveTargetHistory = (target: string, setTargetHistory: any) => {
  saveTargetHistoryShared(target, setTargetHistory, 'nmap_target_history');
};

export const saveScanHistory = (history: ScanResult[]) => {
  saveScanHistoryShared(history, 'nmap_scan_history');
};