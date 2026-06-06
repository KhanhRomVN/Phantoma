import { useState, useEffect } from 'react';
import type { IPServerData } from '../types/ip-server-data';

interface SearchProps {
  data: IPServerData | null;
  searchQuery: string;
  onResultClick: (tabId: string) => void;
}

interface SearchResult {
  id: string;
  type: string;
  content: string;
  section: string;
}

// Helper to search through IPServerData
function searchInData(data: IPServerData | null, query: string): SearchResult[] {
  if (!data || !query.trim()) return [];
  
  const lowerQuery = query.toLowerCase();
  const results: SearchResult[] = [];

  // Search in network info
  const networkInfo = data.networkInfo;
  if (networkInfo) {
    if (networkInfo.ipAddress?.toLowerCase().includes(lowerQuery)) {
      results.push({
        id: 'network-ip',
        type: 'IP Address',
        content: networkInfo.ipAddress,
        section: 'Network',
      });
    }
    if (networkInfo.reverseDns?.toLowerCase().includes(lowerQuery)) {
      results.push({
        id: 'network-rdns',
        type: 'Reverse DNS',
        content: networkInfo.reverseDns,
        section: 'Network',
      });
    }
    if (networkInfo.asn?.toLowerCase().includes(lowerQuery)) {
      results.push({
        id: 'network-asn',
        type: 'ASN',
        content: networkInfo.asn,
        section: 'Network',
      });
    }
    if (networkInfo.isp?.toLowerCase().includes(lowerQuery)) {
      results.push({
        id: 'network-isp',
        type: 'ISP',
        content: networkInfo.isp,
        section: 'Network',
      });
    }
    if (networkInfo.geoIp?.country?.toLowerCase().includes(lowerQuery)) {
      results.push({
        id: 'network-country',
        type: 'Country',
        content: networkInfo.geoIp.country,
        section: 'Network',
      });
    }
    if (networkInfo.geoIp?.city?.toLowerCase().includes(lowerQuery)) {
      results.push({
        id: 'network-city',
        type: 'City',
        content: networkInfo.geoIp.city,
        section: 'Network',
      });
    }
  }

  // Search in ports
  if (data.ports && data.ports.length > 0) {
    data.ports.forEach((port, idx) => {
      if (port.port?.toString().includes(lowerQuery)) {
        results.push({
          id: `port-${idx}`,
          type: `Port ${port.port}`,
          content: `${port.service} (${port.state})`,
          section: 'Ports & Services',
        });
      }
      if (port.service?.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: `service-${idx}`,
          type: 'Service',
          content: port.service,
          section: 'Ports & Services',
        });
      }
      if (port.banner?.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: `banner-${idx}`,
          type: 'Banner',
          content: port.banner,
          section: 'Ports & Services',
        });
      }
    });
  }

  // Search in OS detection
  const osDetection = data.osDetection;
  if (osDetection) {
    if (osDetection.operatingSystem?.toLowerCase().includes(lowerQuery)) {
      results.push({
        id: 'os-os',
        type: 'Operating System',
        content: osDetection.operatingSystem,
        section: 'OS Detection',
      });
    }
    if (osDetection.hostname?.toLowerCase().includes(lowerQuery)) {
      results.push({
        id: 'os-hostname',
        type: 'Hostname',
        content: osDetection.hostname,
        section: 'OS Detection',
      });
    }
    if (osDetection.kernelVersion?.toLowerCase().includes(lowerQuery)) {
      results.push({
        id: 'os-kernel',
        type: 'Kernel Version',
        content: osDetection.kernelVersion,
        section: 'OS Detection',
      });
    }
  }

  // Search in security findings
  if (data.securityFindings && data.securityFindings.length > 0) {
    data.securityFindings.forEach((finding, idx) => {
      if (finding.name?.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: `finding-${idx}`,
          type: `Vulnerability [${finding.severity}]`,
          content: finding.name,
          section: 'Security',
        });
      }
      if (finding.cve?.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: `cve-${idx}`,
          type: 'CVE',
          content: finding.cve,
          section: 'Security',
        });
      }
      if (finding.severity?.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: `severity-${idx}`,
          type: 'Severity',
          content: finding.severity,
          section: 'Security',
        });
      }
    });
  }

  // Search in infrastructure exposures
  const infraExposure = data.infrastructureExposure;
  if (infraExposure) {
    const exposureFields = ['dockerExposure', 'kubernetesExposure', 'redisExposure', 'elasticsearchExposure', 'mongodbExposure', 'postgresqlExposure', 'mysqlExposure'];
    exposureFields.forEach((field) => {
      const value = infraExposure[field as keyof typeof infraExposure];
      if (value === true) {
        const serviceName = field.replace('Exposure', '');
        if (serviceName.toLowerCase().includes(lowerQuery)) {
          results.push({
            id: `exposure-${field}`,
            type: 'Infrastructure Exposure',
            content: `${serviceName} is exposed`,
            section: 'Infrastructure',
          });
        }
      }
    });
  }

  return results.slice(0, 50);
}

function getSectionColor(section: string): string {
  const colors: Record<string, string> = {
    'Network': '#0af',
    'Ports & Services': '#30d158',
    'OS Detection': '#0a84ff',
    'Security': '#ff375f',
    'Infrastructure': '#64d2ff',
  };
  return colors[section] || '#6a7a9a';
}

function getSectionIcon(section: string): string {
  const icons: Record<string, string> = {
    'Network': '🌐',
    'Ports & Services': '🔌',
    'OS Detection': '💻',
    'Security': '⚠️',
    'Infrastructure': '🏗️',
  };
  return icons[section] || '📄';
}

function getSectionToTabId(section: string): string {
  const mapping: Record<string, string> = {
    'Network': 'network',
    'Ports & Services': 'ports',
    'OS Detection': 'os',
    'Security': 'security',
    'Infrastructure': 'infrastructure',
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
      <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-[#080b10]">
        <div className="text-[32px] opacity-15">🔍</div>
        <div className="text-[11px] font-mono text-[#2a3548]">
          Enter a search query to find information
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-[#080b10]">
        <div className="text-[32px] opacity-15">🔍</div>
        <div className="text-[11px] font-mono text-[#2a3548]">
          No results found for "{searchQuery}"
        </div>
      </div>
    );
  }

  // Group results by section
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.section]) {
      acc[result.section] = [];
    }
    acc[result.section].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  const handleResultClick = (section: string) => {
    const tabId = getSectionToTabId(section);
    onResultClick(tabId);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#080b10]">
      <div className="sticky top-0 z-10 bg-[#080b10] px-4 py-3 border-b border-[#1c2333]">
        <div className="text-[11px] font-mono text-[#2a3548]">
          Found {results.length} result{results.length !== 1 ? 's' : ''}
        </div>
      </div>
      
      <div className="divide-y divide-[#111827]">
        {Object.entries(groupedResults).map(([section, sectionResults]) => {
          const sectionColor = getSectionColor(section);
          const sectionIcon = getSectionIcon(section);
          
          return (
            <div key={section} className="bg-[#080b10]">
              <div 
                className="sticky top-[45px] z-10 px-4 py-2 flex items-center gap-2 bg-[#0a0e14] border-b border-[#1c2333]"
                style={{ borderLeftColor: sectionColor, borderLeftWidth: '3px' }}
              >
                <span className="text-base">{sectionIcon}</span>
                <span 
                  className="text-[11px] font-bold font-mono uppercase tracking-wider"
                  style={{ color: sectionColor }}
                >
                  {section}
                </span>
                <span className="text-[10px] font-mono text-[#2a3548] ml-auto">
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
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span 
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: `${sectionColor}20`, color: sectionColor }}
                          >
                            {result.type}
                          </span>
                        </div>
                        <div className="text-[12px] font-mono text-[#c8d6f0] break-all leading-relaxed">
                          {result.content}
                        </div>
                      </div>
                      <div className="text-[#2a3548] group-hover:text-[#0af] transition-colors shrink-0">
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