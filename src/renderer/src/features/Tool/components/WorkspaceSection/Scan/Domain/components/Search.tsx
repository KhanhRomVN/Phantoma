import type { ScanDomainData } from '../types/scan-data';
import type { ScanSubTabId } from '../types/scan-data';
import React, { useMemo } from 'react';

interface SearchProps {
  data: ScanDomainData | null;
  searchQuery: string;
  onResultClick: (tabId: string) => void;
}

interface SearchResult {
  tabId: ScanSubTabId;
  tabLabel: string;
  matchType: string;
  matchValue: string;
  context: string;
}

export function ScanSearch({ data, searchQuery, onResultClick }: SearchProps) {
  const results = useMemo(() => {
    if (!data || !searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const items: SearchResult[] = [];

    // Search in zone transfer records
    if (data.zoneTransfer?.records) {
      data.zoneTransfer.records.forEach((record) => {
        if (
          record.name.toLowerCase().includes(q) ||
          record.type.toLowerCase().includes(q) ||
          record.data.toLowerCase().includes(q)
        ) {
          items.push({
            tabId: 'zone-transfer',
            tabLabel: 'Zone Transfer',
            matchType: `DNS ${record.type}`,
            matchValue: record.name,
            context: record.data,
          });
        }
      });
    }

    // Search in DNS brute-force results
    if (data.dnsBrute?.resolved) {
      data.dnsBrute.resolved.forEach((sub) => {
        if (
          sub.subdomain.toLowerCase().includes(q) ||
          sub.ip.toLowerCase().includes(q) ||
          (sub.target && sub.target.toLowerCase().includes(q))
        ) {
          items.push({
            tabId: 'dns-brute',
            tabLabel: 'DNS Brute',
            matchType: sub.type,
            matchValue: sub.subdomain,
            context: sub.ip + (sub.target ? ` → ${sub.target}` : ''),
          });
        }
      });
    }

    // Search in target domain
    if (data.target.toLowerCase().includes(q)) {
      items.push({
        tabId: 'overview',
        tabLabel: 'Overview',
        matchType: 'Target',
        matchValue: data.target,
        context: `Scanned at ${data.scanTime}`,
      });
    }

    // Search zone transfer nameserver
    if (data.zoneTransfer?.nameserver?.toLowerCase().includes(q)) {
      items.push({
        tabId: 'zone-transfer',
        tabLabel: 'Zone Transfer',
        matchType: 'Nameserver',
        matchValue: data.zoneTransfer.nameserver,
        context: data.zoneTransfer.success ? 'AXFR successful' : 'AXFR failed',
      });
    }

    return items;
  }, [data, searchQuery]);

  if (!searchQuery.trim()) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-[#0f1319]">
        <div className="text-[32px] opacity-15">🔍</div>
        <div className="text-[11px] font-mono text-[#2a3548]">
          Type a search query to find results across all scan data
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-[#0f1319]">
        <div className="text-[32px] opacity-15">📭</div>
        <div className="text-[11px] font-mono text-[#2a3548]">
          No results found for "{searchQuery}"
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="mb-2 text-[11px] font-mono text-[#3d4a61]">
        {results.length} result{results.length !== 1 ? 's' : ''} for "{searchQuery}"
      </div>
      <div className="space-y-1">
        {results.map((result, idx) => (
          <button
            key={idx}
            onClick={() => onResultClick(result.tabId)}
            className="w-full text-left bg-[#0d1017] border border-[#1c2333] rounded p-2.5 hover:bg-[#111827] transition-colors group"
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[9px] font-bold font-mono uppercase px-1.5 py-0.5 rounded-sm"
                style={{
                  color: '#0af',
                  border: '1px solid #0af30',
                  background: '#0af10',
                }}
              >
                {result.tabLabel}
              </span>
              <span className="text-[9px] font-mono text-[#3d4a61]">{result.matchType}</span>
            </div>
            <div className="text-[12px] font-mono font-bold text-[#0af] group-hover:text-[#5ef0ff] transition-colors">
              {result.matchValue}
            </div>
            <div className="text-[10px] font-mono text-[#3d4a61] mt-0.5 truncate">
              {result.context}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}