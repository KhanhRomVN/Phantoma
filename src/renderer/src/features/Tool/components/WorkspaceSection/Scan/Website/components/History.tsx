import type { ScanWebsiteData } from '../types/scan-website-data';
import React, { useState } from 'react';
import { Clock, ChevronLeft, FileText } from 'lucide-react';

interface HistoryEntry {
  id: string;
  url: string;
  scanTime: string;
  type: string;
  summary: string;
  data: ScanWebsiteData;
}

const SAMPLE_HISTORY: HistoryEntry[] = [
  {
    id: 'webhist-1',
    url: 'https://example.com',
    scanTime: '2025-02-01T12:00:00Z',
    type: 'Full Scan',
    summary: '12 dirs, 7 vulns (3 critical), SSL: A, Headers: B+',
    data: { target: 'https://example.com', scanTime: '2025-02-01T12:00:00Z', fuzz: null, vulnScan: null, sslTest: null, headers: null },
  },
  {
    id: 'webhist-2',
    url: 'https://testsite.org',
    scanTime: '2025-01-28T09:15:00Z',
    type: 'Vuln Scan',
    summary: '3 critical findings including SQLi and XSS',
    data: { target: 'https://testsite.org', scanTime: '2025-01-28T09:15:00Z', fuzz: null, vulnScan: null, sslTest: null, headers: null },
  },
  {
    id: 'webhist-3',
    url: 'https://api.vulntarget.net',
    scanTime: '2025-01-25T16:30:00Z',
    type: 'SSL Test',
    summary: 'Grade B - TLSv1.0 still enabled, 3 weak ciphers',
    data: { target: 'https://api.vulntarget.net', scanTime: '2025-01-25T16:30:00Z', fuzz: null, vulnScan: null, sslTest: null, headers: null },
  },
];

interface HistoryProps {
  onSelectHistory: (data: ScanWebsiteData) => void;
  onBack: () => void;
}

export function WebsiteHistory({ onSelectHistory, onBack }: HistoryProps) {
  const [history] = useState<HistoryEntry[]>(SAMPLE_HISTORY);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = history.filter(
    (entry) =>
      entry.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0f1319]">
      <div className="flex items-center gap-2 px-3 h-10 bg-[#0a0e14] border-b border-[#1c2333] shrink-0">
        <button onClick={onBack} className="flex items-center gap-1 text-[#3d4a61] hover:text-[#c8d6f0] transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <Clock className="w-3.5 h-3.5 text-[#ff2d55]" />
        <span className="text-[11px] font-mono font-bold text-[#c8d6f0] uppercase tracking-wider">
          Scan History
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by URL or type..."
          className="ml-auto h-6 w-48 bg-[#0d1017] border border-[#1c2333] rounded text-[#ff2d55] text-[10px] px-2 outline-none font-mono placeholder:text-[#2a3548]"
        />
      </div>

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
                    <span className="text-[12px] font-mono font-bold text-[#ff2d55] group-hover:text-[#ff4d6d] transition-colors">
                      {entry.url}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-[#ff2d5510] border border-[#ff2d5530] text-[#ff2d55]">
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

      <div className="flex items-center px-3 h-6 bg-[#0a0e14] border-t border-[#1c2333] shrink-0">
        <span className="text-[9px] font-mono text-[#3d4a61]">
          {filtered.length} scan{filtered.length !== 1 ? 's' : ''} in history
        </span>
      </div>
    </div>
  );
}