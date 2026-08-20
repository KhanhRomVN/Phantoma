// Shared scan-history utilities cho các tool module
// Dùng chung bởi Amass và Nmap để tránh trùng lặp logic ngày/tháng/lưu trữ.

export const formatDate = (timestamp: number): string => {
  const d = new Date(timestamp);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} - ${hours}:${minutes}`;
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

  const formatDateLabel = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  if (scanDay.getTime() === today.getTime()) {
    return 'Today';
  } else if (scanDay.getTime() === yesterday.getTime()) {
    return `Yesterday - ${formatDateLabel(scanDate)}`;
  } else {
    return formatDateLabel(scanDate);
  }
};

export const groupHistoryByDate = <T extends { timestamp: number }>(
  history: T[],
): Record<string, T[]> => {
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
    {} as Record<string, T[]>,
  );
};

export const saveTargetHistory = (
  target: string,
  setTargetHistory: (updater: (prev: string[]) => string[]) => void,
  storageKey: string,
): void => {
  if (!target.trim()) return;
  setTargetHistory((prev) => {
    const filtered = prev.filter((t) => t !== target);
    const updated = [target, ...filtered].slice(0, 20);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    return updated;
  });
};

export const saveScanHistory = <T>(history: T[], storageKey: string): void => {
  localStorage.setItem(storageKey, JSON.stringify(history));
};