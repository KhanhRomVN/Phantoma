import type { ScanNetworkData } from '../types/scan-network-data';
import React, { useState } from 'react';
import { Clock, ChevronLeft, FileText } from 'lucide-react';

interface HistoryEntry {
  id: string;
  target: string;
  scanTime: string;
  type: string;
  summary: string;
  data: ScanNetworkData;
}

const SAMPLE_HISTORY: HistoryEntry[] = [
  {
    id: 'nethist-1',
    target: '192.168.1.0/24',
    scanTime: '2025-01-20T14:00:00Z',
    type: 'Full Scan',
    summary: '8 live hosts, 6 open ports, 6 services, OS: Linux 4.15 (92%)',
    data: {
      target: '192.168.1.0/24',
      scanTime: '2025-01-20T14:00:00Z',
      pingSweep: null,
      portScan: null,
      serviceDetection: null,
      osFingerprint: null,
    },
  },
  {
    id: 'nethist-2',
    target: '10.0.0.0/24',
    scanTime: '2025-01-19T09:30:00Z',
    type: 'Port Scan',
    summary: '12 open ports discovered on gateway',
    data: {
      target: '10.0.0.0/24',
      scanTime: '2025-01-19T09:30:00Z',
      pingSweep: null,
      portScan: null,
      serviceDetection: null,
      osFingerprint: null,
    },
  },
  {
    id: 'nethist-3',
    target: '172.16.0.1',
    scanTime: '2025-01-18T16:45:00Z',
    type: 'OS Fingerprint',
    summary: 'Windows Server 2019 detected (95% accuracy)',
    data: {
      target: '172.16.0.1',
      scanTime: '2025-01-18T16:45:00Z',
      pingSweep: null,
      portScan: null,
      serviceDetection: null,
      osFingerprint: null,
    },
  },
];

interface HistoryProps {
  onSelectHistory: (data: ScanNetworkData) => void;
  onBack: () => void;
}

export function NetworkHistory({ onSelectHistory, onBack }: HistoryProps) {
  const [history] = useState<HistoryEntry[]>(SAMPLE_HISTORY);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = history.filter(
    (entry) =>
      entry.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0f1319]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 h-10 bg-[#0a0e14] border-b border-[#1c2333] shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-[#3d4a61] hover:text-[#c8d6f0] transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <Clock className="w-3.5 h-3.5 text-[#ff9f0a]" />
        <span className="text-[11px] font-mono font-bold text-[#c8d6f0] uppercase tracking-wider">
          Scan History
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by target or type..."
          className="ml-auto h-6 w-48 bg-[#0d1017] border border-[#1c2333] rounded text-[#ff9f0a] text-[10px] px-2 outline-none font-mono placeholder:text-[#2a3548]"
        />
      </div>

      {/* History list */}
      <div className="flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FileText className="w-8 h-8 text-[#2a3548] mx-auto mb-2" />
              <span className="text-[11px] font-mono text-[#2a3548]">
                {searchQuery ? 'No matching history entries' : 'No scan history available'}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((entry) => (
              <button
                key={entry.id}
                onClick={() => onSelectHistory(entry.data)}
                className="w-full text-left bg-[#0d1017] border border-[#1c2333] rounded p-2.5 hover:bg-[#111827] transition-colors group"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-mono font-bold text-[#ff9f0a] group-hover:text-[#ffb340] transition-colors">
                      {entry.target}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-[#f5a62310] border border-[#f5a62330] text-[#f5a623]">
                      {entry.type}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-[#3d4a61]">{entry.scanTime}</span>
                </div>
                <div className="text-[10px] font-mono text-[#3d4a61] truncate">{entry.summary}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center px-3 h-6 bg-[#0a0e14] border-t border-[#1c2333] shrink-0">
        <span className="text-[9px] font-mono text-[#3d4a61]">
          {filtered.length} scan{filtered.length !== 1 ? 's' : ''} in history
        </span>
      </div>
    </div>
  );
}