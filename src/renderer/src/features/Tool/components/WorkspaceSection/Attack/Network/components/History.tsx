import { useState } from 'react';
import type { NetworkAttackData } from '../types/network-attack';

interface HistoryEntry {
  id: string;
  target: string;
  timestamp: number;
  data: NetworkAttackData;
  summary: string;
}

interface HistoryProps {
  onSelectHistory: (data: NetworkAttackData) => void;
  onBack: () => void;
}

// Mock history data - replace with real data later
const MOCK_HISTORY: HistoryEntry[] = [
  {
    id: '1',
    target: '192.168.1.105',
    timestamp: Date.now() - 86400000,
    data: {} as NetworkAttackData,
    summary: '2 shells, 1 credential set — EternalBlue + Log4Shell',
  },
  {
    id: '2',
    target: '10.0.0.50',
    timestamp: Date.now() - 172800000,
    data: {} as NetworkAttackData,
    summary: 'SSH brute-force success — 3 credentials found',
  },
  {
    id: '3',
    target: '172.16.0.200',
    timestamp: Date.now() - 259200000,
    data: {} as NetworkAttackData,
    summary: 'No exploits successful — fully patched',
  },
];

export function History({ onSelectHistory, onBack }: HistoryProps) {
  const [entries] = useState<HistoryEntry[]>(MOCK_HISTORY);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-[#060810] border-b border-[#1c2333] shrink-0">
        <button
          onClick={onBack}
          className="h-6 w-6 flex items-center justify-center bg-[#1c2333] border border-[#2a3548] text-[#c8d6f0] rounded hover:text-[#c8d6f0] hover:border-[#0af30] transition-colors"
          title="Back to main"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-[13px] font-mono text-[#c8d6f0]">Attack History</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {entries.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[#c8d6f0] text-[12px] font-mono">
            No attack history available
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              onClick={() => onSelectHistory(entry.data)}
              className="p-3 rounded cursor-pointer transition-all bg-[#0a0e14] hover:bg-[#111827] border border-[#1c2333]"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[14px] font-mono font-bold text-[#ff2d55]">
                  {entry.target}
                </span>
                <span className="text-[10px] font-mono text-[#c8d6f0]">
                  {getTimeAgo(entry.timestamp)}
                </span>
              </div>
              <div className="text-[11px] font-mono text-[#c8d6f0]">{entry.summary}</div>
              <div className="text-[10px] font-mono text-[#2a3548] mt-1">
                {formatDate(entry.timestamp)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}