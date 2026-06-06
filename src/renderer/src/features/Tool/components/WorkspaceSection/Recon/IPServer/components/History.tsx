import { useState } from 'react';
import type { IPServerData } from '../types/ip-server-data';

interface HistoryEntry {
  id: string;
  ip: string;
  timestamp: number;
  data: IPServerData;
}

interface HistoryProps {
  onSelectHistory: (data: IPServerData) => void;
  onBack: () => void;
}

// Mock history data - replace with real data later
const MOCK_HISTORY: HistoryEntry[] = [
  {
    id: '1',
    ip: '104.18.32.11',
    timestamp: Date.now() - 86400000,
    data: {} as IPServerData,
  },
  {
    id: '2',
    ip: '8.8.8.8',
    timestamp: Date.now() - 172800000,
    data: {} as IPServerData,
  },
];

export function History({ onSelectHistory, onBack }: HistoryProps) {
  const [entries] = useState<HistoryEntry[]>(MOCK_HISTORY);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#080b10]">
      <div className="flex items-center gap-2 px-3 py-2 bg-[#060810] border-b border-[#1c2333] shrink-0">
        <button
          onClick={onBack}
          className="h-6 w-6 flex items-center justify-center bg-[#1c2333] border border-[#2a3548] text-[#6a7a9a] rounded hover:text-[#c8d6f0] hover:border-[#0af30] transition-colors"
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
        <span className="text-[12px] font-mono text-[#c8d6f0]">Scan History</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {entries.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[#2a3548] text-[11px] font-mono">
            No history available
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              onClick={() => onSelectHistory(entry.data)}
              className="p-3 rounded cursor-pointer transition-all bg-[#0a0e14] hover:bg-[#111827] border border-[#1c2333]"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[13px] font-mono font-bold text-[#c8d6f0]">
                  {entry.ip}
                </span>
                <span className="text-[10px] font-mono text-[#2a3548]">
                  {formatDate(entry.timestamp)}
                </span>
              </div>
              <div className="text-[10px] font-mono text-[#6a7a9a]">Click to view details</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}