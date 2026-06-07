import { useState, useEffect } from 'react';
import type { IPIntelData } from '../types/ip-intel-data';

interface SearchProps {
  data: IPIntelData | null;
  searchQuery: string;
  onResultClick: (tabId: string) => void;
}

interface SearchResult {
  id: string;
  type: string;
  content: string;
  section: string;
}

function searchInData(data: IPIntelData | null, query: string): SearchResult[] {
  if (!data || !query.trim()) return [];

  const lowerQuery = query.toLowerCase();
  const results: SearchResult[] = [];

  // Search in network info
  const networkInfo = data.networkInfo;
  if (networkInfo) {
    if (networkInfo.ipAddress?.toLowerCase().includes(lowerQuery)) {
      results.push({ id: 'network-ip', type: 'IP Address', content: networkInfo.ipAddress, section: 'Network' });
    }
    if (networkInfo.reverseDns?.toLowerCase().includes(lowerQuery)) {
      results.push({ id: 'network-rdns', type: 'Reverse DNS', content: networkInfo.reverseDns, section: 'Network' });
    }
    if (networkInfo.asn?.toLowerCase().includes(lowerQuery)) {
      results.push({ id: 'network-asn', type: 'ASN', content: networkInfo.asn, section: 'Network' });
    }
    if (networkInfo.isp?.toLowerCase().includes(lowerQuery)) {
      results.push({ id: 'network-isp', type: 'ISP', content: networkInfo.isp, section: 'Network' });
    }
    if (networkInfo.geoIp?.country?.toLowerCase().includes(lowerQuery)) {
      results.push({ id: 'network-country', type: 'Country', content: networkInfo.geoIp.country, section: 'Network' });
    }
    if (networkInfo.geoIp?.city?.toLowerCase().includes(lowerQuery)) {
      results.push({ id: 'network-city', type: 'City', content: networkInfo.geoIp.city, section: 'Network' });
    }
  }

  // Search in Shodan services
  if (data.shodanIntel?.services) {
    data.shodanIntel.services.forEach((svc, idx) => {
      if (svc.port?.toString().includes(lowerQuery)) {
        results.push({ id: `shodan-port-${idx}`, type: `Port ${svc.port}`, content: `${svc.service}`, section: 'Shodan' });
      }
      if (svc.service?.toLowerCase().includes(lowerQuery)) {
        results.push({ id: `shodan-svc-${idx}`, type: 'Service', content: svc.service, section: 'Shodan' });
      }
      if (svc.product?.toLowerCase().includes(lowerQuery)) {
        results.push({ id: `shodan-product-${idx}`, type: 'Product', content: svc.product, section: 'Shodan' });
      }
    });
  }
  if (data.shodanIntel?.isp?.toLowerCase().includes(lowerQuery)) {
    results.push({ id: 'shodan-isp', type: 'ISP', content: data.shodanIntel.isp, section: 'Shodan' });
  }
  if (data.shodanIntel?.org?.toLowerCase().includes(lowerQuery)) {
    results.push({ id: 'shodan-org', type: 'Organization', content: data.shodanIntel.org, section: 'Shodan' });
  }

  // Search in reverse IP
  if (data.reverseIP) {
    data.reverseIP.forEach((entry, idx) => {
      if (entry.domain?.toLowerCase().includes(lowerQuery)) {
        results.push({ id: `revip-${idx}`, type: 'Domain', content: entry.domain, section: 'Reverse IP' });
      }
    });
  }

  return results.slice(0, 50);
}

function getSectionColor(section: string): string {
  const colors: Record<string, string> = {
    'Network': '#0af',
    'Shodan': '#ff9f0a',
    'Reverse IP': '#bf5af2',
  };
  return colors[section] || '#6a7a9a';
}

function getSectionIcon(section: string): string {
  const icons: Record<string, string> = {
    'Network': '🌐',
    'Shodan': '🔍',
    'Reverse IP': '🔄',
  };
  return icons[section] || '📄';
}

function getSectionToTabId(section: string): string {
  const mapping: Record<string, string> = {
    'Network': 'network',
    'Shodan': 'overview',
    'Reverse IP': 'overview',
  };
  return mapping[section] || 'overview';
}

export function Search({ data, searchQuery, onResultClick }: SearchProps) {
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    setResults(searchInData(data, searchQuery));
  }, [data, searchQuery]);

  if (!searchQuery.trim()) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-3">
        <div className="text-[32px] opacity-15">🔍</div>
        <div className="text-[12px] font-mono text-[#2a3548]">
          Enter a search query to find information
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-3">
        <div className="text-[32px] opacity-15">🔍</div>
        <div className="text-[12px] font-mono text-[#2a3548]">
          No results found for "{searchQuery}"
        </div>
      </div>
    );
  }

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.section]) acc[result.section] = [];
    acc[result.section].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  const handleResultClick = (section: string) => {
    const tabId = getSectionToTabId(section);
    onResultClick(tabId);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="sticky top-0 z-10 px-4 py-3 border-b border-[#1c2333] bg-[#0f1319]">
        <div className="text-[12px] font-mono text-[#c8d6f0]">
          Found {results.length} result{results.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="divide-y divide-[#111827]">
        {Object.entries(groupedResults).map(([section, sectionResults]) => {
          const sectionColor = getSectionColor(section);
          const sectionIcon = getSectionIcon(section);

          return (
            <div key={section}>
              <div
                className="sticky top-[45px] z-10 px-4 py-2 flex items-center gap-2 bg-[#0a0e14] border-b border-[#1c2333]"
                style={{ borderLeftColor: sectionColor, borderLeftWidth: '3px' }}
              >
                <span className="text-base">{sectionIcon}</span>
                <span className="text-[12px] font-bold font-mono uppercase tracking-wider" style={{ color: sectionColor }}>
                  {section}
                </span>
                <span className="text-[11px] font-mono text-[#6a7a9a] ml-auto">
                  {sectionResults.length} item{sectionResults.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="divide-y divide-[#111827]">
                {sectionResults.map((result) => (
                  <div
                    key={result.id}
                    onClick={() => handleResultClick(result.section)}
                    className="group px-4 py-3 hover:bg-[#0d1017] transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: `${sectionColor}20`, color: sectionColor }}>
                            {result.type}
                          </span>
                        </div>
                        <div className="text-[13px] font-mono text-[#c8d6f0] break-all leading-relaxed">
                          {result.content}
                        </div>
                      </div>
                      <div className="text-[#6a7a9a] group-hover:text-[#0af] transition-colors shrink-0">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 18l6-6-6-6"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}