import type { ScanWebsiteData, ScanWebsiteSubTabId } from '../types/scan-website-data';
import React, { useMemo } from 'react';

interface SearchProps {
  data: ScanWebsiteData | null;
  searchQuery: string;
  onResultClick: (tabId: string) => void;
}

interface SearchResult {
  tabId: ScanWebsiteSubTabId;
  tabLabel: string;
  matchType: string;
  matchValue: string;
  context: string;
}

export function WebsiteSearch({ data, searchQuery, onResultClick }: SearchProps) {
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

    // Search fuzz results
    if (data.fuzz?.results) {
      data.fuzz.results.forEach((r) => {
        if (r.path.toLowerCase().includes(q) || r.statusCode.toString().includes(q)) {
          items.push({
            tabId: 'directory-fuzz',
            tabLabel: 'Directory Fuzz',
            matchType: `HTTP ${r.statusCode}`,
            matchValue: r.path,
            context: r.redirectLocation ? `→ ${r.redirectLocation}` : `${r.contentLength || 0} bytes`,
          });
        }
      });
    }

    // Search vuln findings
    if (data.vulnScan?.findings) {
      data.vulnScan.findings.forEach((f) => {
        if (
          f.name.toLowerCase().includes(q) ||
          f.severity.toLowerCase().includes(q) ||
          (f.cve && f.cve.toLowerCase().includes(q)) ||
          f.location.toLowerCase().includes(q)
        ) {
          items.push({
            tabId: 'vuln-scan',
            tabLabel: 'Vuln Scan',
            matchType: f.severity.toUpperCase(),
            matchValue: f.name,
            context: `${f.location}${f.cve ? ' · ' + f.cve : ''}`,
          });
        }
      });
    }

    // Search SSL test
    if (data.sslTest) {
      const ssl = data.sslTest;
      if (ssl.host.toLowerCase().includes(q) || (ssl.grade && ssl.grade.toLowerCase().includes(q))) {
        items.push({
          tabId: 'ssl-test',
          tabLabel: 'SSL Test',
          matchType: 'SSL/TLS',
          matchValue: ssl.host,
          context: `Grade: ${ssl.grade || 'N/A'}, ${ssl.tlsVersions.length} TLS versions`,
        });
      }
      ssl.tlsVersions.forEach((v) => {
        if (v.toLowerCase().includes(q)) {
          items.push({
            tabId: 'ssl-test',
            tabLabel: 'SSL Test',
            matchType: 'TLS Version',
            matchValue: v,
            context: ssl.host,
          });
        }
      });
      ssl.cipherSuites.forEach((c) => {
        if (c.toLowerCase().includes(q)) {
          items.push({
            tabId: 'ssl-test',
            tabLabel: 'SSL Test',
            matchType: 'Cipher Suite',
            matchValue: c,
            context: ssl.weakCiphers.includes(c) ? 'WEAK' : 'OK',
          });
        }
      });
    }

    // Search headers
    if (data.headers?.headers) {
      data.headers.headers.forEach((h) => {
        if (
          h.header.toLowerCase().includes(q) ||
          h.status.toLowerCase().includes(q) ||
          (h.value && h.value.toLowerCase().includes(q))
        ) {
          items.push({
            tabId: 'headers',
            tabLabel: 'Headers',
            matchType: h.status.toUpperCase(),
            matchValue: h.header,
            context: h.value || h.description,
          });
        }
      });
    }

    return items.slice(0, 50);
  }, [data, searchQuery]);

  if (!searchQuery.trim()) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-[#0f1319]">
        <div className="text-[32px] opacity-15">🔍</div>
        <div className="text-[11px] font-mono text-[#2a3548]">
          Type a search query to find results across all web scan data
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
                style={{ color: '#ff2d55', border: '1px solid #ff2d5530', background: '#ff2d5510' }}
              >
                {result.tabLabel}
              </span>
              <span className="text-[9px] font-mono text-[#3d4a61]">{result.matchType}</span>
            </div>
            <div className="text-[12px] font-mono font-bold text-[#ff2d55] group-hover:text-[#ff4d6d] transition-colors">
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