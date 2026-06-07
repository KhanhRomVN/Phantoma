import type { ScanNetworkData, ScanNetworkSubTabId } from '../types/scan-network-data';
import React, { useMemo } from 'react';

interface SearchProps {
  data: ScanNetworkData | null;
  searchQuery: string;
  onResultClick: (tabId: string) => void;
}

interface SearchResult {
  tabId: ScanNetworkSubTabId;
  tabLabel: string;
  matchType: string;
  matchValue: string;
  context: string;
}

export function NetworkSearch({ data, searchQuery, onResultClick }: SearchProps) {
  const results = useMemo(() => {
    if (!data || !searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const items: SearchResult[] = [];

    // Search target
    if (data.target.toLowerCase().includes(q)) {
      items.push({
        tabId: 'overview',
        tabLabel: 'Overview',
        matchType: 'Target',
        matchValue: data.target,
        context: `Scanned at ${data.scanTime}`,
      });
    }

    // Search ping sweep hosts
    if (data.pingSweep?.hosts) {
      data.pingSweep.hosts.forEach((host) => {
        if (host.toLowerCase().includes(q)) {
          items.push({
            tabId: 'ping-sweep',
            tabLabel: 'Ping Sweep',
            matchType: 'Live Host',
            matchValue: host,
            context: `Method: ${data.pingSweep!.config.method.toUpperCase()}`,
          });
        }
      });
      if (data.pingSweep.config.method.toLowerCase().includes(q)) {
        items.push({
          tabId: 'ping-sweep',
          tabLabel: 'Ping Sweep',
          matchType: 'Scan Method',
          matchValue: data.pingSweep.config.method.toUpperCase(),
          context: `${data.pingSweep.liveHosts} live hosts found`,
        });
      }
    }

    // Search port scan results
    if (data.portScan?.results) {
      data.portScan.results.forEach((port) => {
        if (
          port.port.toString().includes(q) ||
          port.service.toLowerCase().includes(q) ||
          (port.banner && port.banner.toLowerCase().includes(q)) ||
          port.state.toLowerCase().includes(q)
        ) {
          items.push({
            tabId: 'port-scan',
            tabLabel: 'Port Scan',
            matchType: `Port ${port.port}/${port.protocol.toUpperCase()}`,
            matchValue: `${port.service} (${port.state})`,
            context: port.banner || port.state,
          });
        }
      });
    }

    // Search service detection
    if (data.serviceDetection?.results) {
      data.serviceDetection.results.forEach((svc) => {
        if (
          svc.service.toLowerCase().includes(q) ||
          (svc.version && svc.version.toLowerCase().includes(q)) ||
          (svc.cpe && svc.cpe.toLowerCase().includes(q))
        ) {
          items.push({
            tabId: 'service-detection',
            tabLabel: 'Service Detection',
            matchType: `Port ${svc.port}`,
            matchValue: `${svc.service} ${svc.version || ''}`,
            context: svc.cpe || `Port ${svc.port}`,
          });
        }
      });
    }

    // Search OS fingerprint
    if (data.osFingerprint) {
      const os = data.osFingerprint;
      if (
        os.operatingSystem.toLowerCase().includes(q) ||
        (os.cpe && os.cpe.toLowerCase().includes(q)) ||
        (os.details?.vendor && os.details.vendor.toLowerCase().includes(q))
      ) {
        items.push({
          tabId: 'os-fingerprint',
          tabLabel: 'OS Fingerprint',
          matchType: 'Operating System',
          matchValue: os.operatingSystem,
          context: `Accuracy: ${os.accuracy}%`,
        });
      }
    }

    return items.slice(0, 50);
  }, [data, searchQuery]);

  if (!searchQuery.trim()) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-[#0f1319]">
        <div className="text-[32px] opacity-15">🔍</div>
        <div className="text-[11px] font-mono text-[#2a3548]">
          Type a search query to find results across all network scan data
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
                style={{ color: '#ff9f0a', border: '1px solid #ff9f0a30', background: '#ff9f0a10' }}
              >
                {result.tabLabel}
              </span>
              <span className="text-[9px] font-mono text-[#3d4a61]">{result.matchType}</span>
            </div>
            <div className="text-[12px] font-mono font-bold text-[#ff9f0a] group-hover:text-[#ffb340] transition-colors">
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