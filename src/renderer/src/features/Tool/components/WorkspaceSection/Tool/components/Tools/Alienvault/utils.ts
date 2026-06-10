import { ScanResult, IndicatorResult, IndicatorType } from './types';

export const buildRequestBody = (params: any): object => {
  return {
    indicator: params.indicator,
    indicatorType: params.indicatorType,
    apiKey: params.apiKey,
  };
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

export const saveIndicatorHistory = (indicator: string, setIndicatorHistory: React.Dispatch<React.SetStateAction<string[]>>) => {
  if (!indicator.trim()) return;
  setIndicatorHistory((prev) => {
    const filtered = prev.filter((t) => t !== indicator);
    const updated = [indicator, ...filtered].slice(0, 20);
    localStorage.setItem('alienvault_indicator_history', JSON.stringify(updated));
    return updated;
  });
};

export const saveScanHistory = (history: ScanResult[]) => {
  localStorage.setItem('alienvault_scan_history', JSON.stringify(history));
};

export const getReputationColor = (reputation: string): string => {
  switch (reputation) {
    case 'malicious': return '#ef4444';
    case 'suspicious': return '#f97316';
    case 'neutral': return '#fbbf24';
    default: return '#64748b';
  }
};

export const getReputationIcon = (reputation: string): string => {
  switch (reputation) {
    case 'malicious': return '⚠️';
    case 'suspicious': return '❗';
    case 'neutral': return '●';
    default: return '?';
  }
};