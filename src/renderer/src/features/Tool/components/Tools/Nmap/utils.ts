import { PortResult, ScanResult } from './types';
import { SCAN_TYPES } from './constants';

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
  // Add stats flag for real-time progress if not already present
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

export const getDateLabel = (timestamp: number): string => {
  if (!timestamp || isNaN(timestamp) || timestamp <= 0) {
    return 'Unknown date';
  }

  const now = new Date();
  const scanDate = new Date(timestamp);

  if (isNaN(scanDate.getTime())) {
    return 'Unknown date';
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const scanDay = new Date(scanDate.getFullYear(), scanDate.getMonth(), scanDate.getDate());

  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  if (scanDay.getTime() === today.getTime()) {
    return 'Today';
  } else if (scanDay.getTime() === yesterday.getTime()) {
    return `Yesterday - ${formatDate(scanDate)}`;
  } else {
    return formatDate(scanDate);
  }
};

export const groupHistoryByDate = (history: ScanResult[]) => {
  return history.reduce(
    (groups, scan) => {
      const timestamp = scan.timestamp || Date.now();
      const label = getDateLabel(timestamp);
      if (!groups[label]) {
        groups[label] = [];
      }
      if (!scan.timestamp) {
        scan.timestamp = timestamp;
      }
      groups[label].push(scan);
      return groups;
    },
    {} as Record<string, ScanResult[]>,
  );
};

export const saveTargetHistory = (target: string, setTargetHistory: React.Dispatch<React.SetStateAction<string[]>>) => {
  if (!target.trim()) return;
  setTargetHistory((prev) => {
    const filtered = prev.filter((t) => t !== target);
    const updated = [target, ...filtered].slice(0, 20);
    localStorage.setItem('nmap_target_history', JSON.stringify(updated));
    return updated;
  });
};

export const saveScanHistory = (history: ScanResult[]) => {
  localStorage.setItem('nmap_scan_history', JSON.stringify(history));
};