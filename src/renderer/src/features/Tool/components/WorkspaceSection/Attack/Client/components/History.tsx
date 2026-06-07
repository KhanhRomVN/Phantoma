import { useState } from 'react';
import type { ClientAttackData } from '../types/client-attack';

interface HistoryEntry {
  id: string;
  campaign: string;
  timestamp: number;
  data: ClientAttackData;
  summary: string;
}

interface HistoryProps {
  onSelectHistory: (data: ClientAttackData) => void;
  onBack: () => void;
}

const MOCK_HISTORY: HistoryEntry[] = [
  { id: '1', campaign: 'Q4 Security Awareness Test', timestamp: Date.now() - 86400000, data: {} as ClientAttackData, summary: '6 credentials, 4 sessions — Phishing + Macro + LNK droppers' },
  { id: '2', campaign: 'Q3 Vendor Assessment', timestamp: Date.now() - 604800000, data: {} as ClientAttackData, summary: '2 credentials captured, 1 session — Office365 phishing' },
];

export function History({ onSelectHistory, onBack }: HistoryProps) {
  const [entries] = useState<HistoryEntry[]>(MOCK_HISTORY);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-[#060810] border-b border-[#1c2333] shrink-0">
        <button onClick={onBack} className="h-6 w-6 flex items-center justify-center bg-[#1c2333] border border-[#2a3548] text-[#c8d6f0] rounded hover:text-[#c8d6f0] hover:border-[#0af30] transition-colors" title="Back to main">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <span className="text-[13px] font-mono text-[#c8d6f0]">Campaign History</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {entries.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[#c8d6f0] text-[12px] font-mono">No campaign history available</div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} onClick={() => onSelectHistory(entry.data)} className="p-3 rounded cursor-pointer transition-all bg-[#0a0e14] hover:bg-[#111827] border border-[#1c2333]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[14px] font-mono font-bold text-[#f5a623]">{entry.campaign}</span>
                <span className="text-[10px] font-mono text-[#c8d6f0]">{new Date(entry.timestamp).toLocaleDateString()}</span>
              </div>
              <div className="text-[11px] font-mono text-[#c8d6f0]">{entry.summary}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}