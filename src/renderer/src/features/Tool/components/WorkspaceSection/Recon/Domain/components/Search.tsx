import { useState, useEffect } from 'react';
import type { ReconData } from '../types/recon-data';

interface SearchProps {
  data: ReconData | null;
  searchQuery: string;
  onResultClick: (tabId: string) => void;
}

interface SearchResult {
  id: string;
  type: string;
  content: string;
  section: string;
}

// Helper to search through all sections of ReconData
function searchInData(data: ReconData | null, query: string): SearchResult[] {
  if (!data || !query.trim()) return [];
  
  const lowerQuery = query.toLowerCase();
  const results: SearchResult[] = [];

  // Search in DNS Records
  const dnsRecords = data.dnsRecords;
  if (dnsRecords) {
    if (dnsRecords.A) {
      dnsRecords.A.forEach((record: string, idx: number) => {
        if (record.toLowerCase().includes(lowerQuery)) {
          results.push({
            id: `dns-a-${idx}`,
            type: 'DNS A Record',
            content: record,
            section: 'DNS',
          });
        }
      });
    }
    if (dnsRecords.AAAA) {
      dnsRecords.AAAA.forEach((record: string, idx: number) => {
        if (record.toLowerCase().includes(lowerQuery)) {
          results.push({
            id: `dns-aaaa-${idx}`,
            type: 'DNS AAAA Record',
            content: record,
            section: 'DNS',
          });
        }
      });
    }
    if (dnsRecords.MX) {
      dnsRecords.MX.forEach((record: any, idx: number) => {
        if (record.exchange?.toLowerCase().includes(lowerQuery)) {
          results.push({
            id: `dns-mx-${idx}`,
            type: 'DNS MX Record',
            content: `${record.priority} ${record.exchange}`,
            section: 'DNS',
          });
        }
      });
    }
    if (dnsRecords.NS) {
      dnsRecords.NS.forEach((record: string, idx: number) => {
        if (record.toLowerCase().includes(lowerQuery)) {
          results.push({
            id: `dns-ns-${idx}`,
            type: 'DNS NS Record',
            content: record,
            section: 'DNS',
          });
        }
      });
    }
    if (dnsRecords.TXT) {
      dnsRecords.TXT.forEach((record: string, idx: number) => {
        if (record.toLowerCase().includes(lowerQuery)) {
          results.push({
            id: `dns-txt-${idx}`,
            type: 'DNS TXT Record',
            content: record,
            section: 'DNS',
          });
        }
      });
    }
  }

  if (data.subdomains && data.subdomains.length > 0) {
    data.subdomains.forEach((subdomain: any, idx: number) => {
      if (subdomain.name?.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: `sub-${idx}`,
          type: 'Subdomain',
          content: subdomain.name,
          section: 'Subdomain',
        });
      }
    });
  }

  const techStack = data.techStack;
  if (techStack) {
    const techCategories = ['frontend', 'backend', 'database', 'hosting', 'cms', 'analytics', 'cdn'];
    techCategories.forEach((category) => {
      const items = techStack[category as keyof TechStack];
      if (items && Array.isArray(items)) {
        items.forEach((tech: string, idx: number) => {
          if (tech.toLowerCase().includes(lowerQuery)) {
            results.push({
              id: `tech-${category}-${idx}`,
              type: `Technology (${category})`,
              content: tech,
              section: 'Technology',
            });
          }
        });
      }
    });
  }

  if (data.vulns && data.vulns.length > 0) {
    data.vulns.forEach((vuln: any, idx: number) => {
      if (vuln.name?.toLowerCase().includes(lowerQuery) || 
          vuln.severity?.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: `vuln-${idx}`,
          type: `Vulnerability [${vuln.severity || 'UNKNOWN'}]`,
          content: vuln.name,
          section: 'Vulnerability',
        });
      }
    });
  }

  if (data.ports && data.ports.length > 0) {
    data.ports.forEach((port: any, idx: number) => {
      if (port.service?.toLowerCase().includes(lowerQuery) || 
          port.port?.toString().includes(lowerQuery)) {
        results.push({
          id: `port-${idx}`,
          type: `Port ${port.port}`,
          content: port.service,
          section: 'Service',
        });
      }
    });
  }

  if (data.breaches && data.breaches.length > 0) {
    data.breaches.forEach((breach: any, idx: number) => {
      if (breach.name?.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: `breach-${idx}`,
          type: 'Breach',
          content: breach.name,
          section: 'Breach',
        });
      }
    });
  }

  if (data.harvestedEmails && data.harvestedEmails.length > 0) {
    data.harvestedEmails.forEach((email: string, idx: number) => {
      if (email.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: `email-${idx}`,
          type: 'Email',
          content: email,
          section: 'Identity',
        });
      }
    });
  }

  if (data.googleDorks && data.googleDorks.length > 0) {
    data.googleDorks.forEach((dork: any, idx: number) => {
      if (dork.query?.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: `dork-${idx}`,
          type: 'Google Dork',
          content: dork.query,
          section: 'OSINT',
        });
      }
    });
  }

  if (data.waybackSnapshots && data.waybackSnapshots.length > 0) {
    data.waybackSnapshots.forEach((snapshot: any, idx: number) => {
      if (snapshot.url?.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: `wayback-${idx}`,
          type: 'Wayback Snapshot',
          content: snapshot.url,
          section: 'Web Surface',
        });
      }
    });
  }

  const socialIntel = data.socialIntel;
  if (socialIntel) {
    const socialFields = ['twitter', 'github', 'linkedin'];
    socialFields.forEach((field) => {
      const value = socialIntel[field as keyof SocialIntel];
      if (value && typeof value === 'string' && value.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: `social-${field}`,
          type: `Social (${field})`,
          content: value,
          section: 'OSINT',
        });
      }
    });
  }

  if (data.cloudAssets && data.cloudAssets.length > 0) {
    data.cloudAssets.forEach((asset: any, idx: number) => {
      if (asset.name?.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: `cloud-${idx}`,
          type: 'Cloud Asset',
          content: asset.name,
          section: 'Infrastructure',
        });
      }
    });
  }

  if (data.codeRepos && data.codeRepos.length > 0) {
    data.codeRepos.forEach((repo: any, idx: number) => {
      if (repo.repo?.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: `repo-${idx}`,
          type: 'Code Repository',
          content: repo.repo,
          section: 'Infrastructure',
        });
      }
    });
  }

  if (data.threatIntel && data.threatIntel.length > 0) {
    data.threatIntel.forEach((intel: any, idx: number) => {
      if (intel.indicator?.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: `threat-${idx}`,
          type: 'Threat Intel',
          content: intel.indicator,
          section: 'Threat Intelligence',
        });
      }
    });
  }

  if (data.certTransparency && data.certTransparency.length > 0) {
    data.certTransparency.forEach((cert: any, idx: number) => {
      if (cert.issuer?.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: `cert-${idx}`,
          type: 'Certificate',
          content: cert.issuer,
          section: 'Certificate Transparency',
        });
      }
    });
  }

  return results.slice(0, 50);
}

type TechStack = {
  frontend: string[];
  backend: string[];
  database: string[];
  hosting: string[];
  cms?: string[];
  analytics?: string[];
  cdn?: string[];
};

type SocialIntel = {
  twitter?: string;
  github?: string;
  linkedin?: string;
};

export function Search({ data, searchQuery, onResultClick }: SearchProps) {
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    setResults(searchInData(data, searchQuery));
  }, [data, searchQuery]);

  const getSectionColor = (section: string) => {
    const colors: Record<string, string> = {
      'DNS': '#0af',
      'Subdomain': '#0a84ff',
      'Technology': '#5e5ce6',
      'Vulnerability': '#ff375f',
      'Service': '#32d74b',
      'Breach': '#ff9f0a',
      'Identity': '#af52de',
      'OSINT': '#ff9f0a',
      'Web Surface': '#64d2ff',
      'Infrastructure': '#64d2ff',
      'Threat Intelligence': '#ff453a',
      'Certificate Transparency': '#30d158',
    };
    return colors[section] || '#6a7a9a';
  };

  const getSectionIcon = (section: string) => {
    const icons: Record<string, string> = {
      'DNS': '🌐',
      'Subdomain': '🗺️',
      'Technology': '⚙️',
      'Vulnerability': '⚠️',
      'Service': '🔌',
      'Breach': '💀',
      'Identity': '🆔',
      'OSINT': '🔍',
      'Web Surface': '🌍',
      'Infrastructure': '🏗️',
      'Threat Intelligence': '🛡️',
      'Certificate Transparency': '📜',
    };
    return icons[section] || '📄';
  };

  const handleResultClick = (section: string) => {
    const sectionToTab: Record<string, string> = {
      'DNS': 'dns',
      'Subdomain': 'subdomain',
      'Technology': 'technology',
      'Vulnerability': 'vulnerability',
      'Service': 'service',
      'Breach': 'osint',
      'Identity': 'identity',
      'OSINT': 'osint',
      'Web Surface': 'websurface',
      'Infrastructure': 'infrastructure',
      'Threat Intelligence': 'osint',
      'Certificate Transparency': 'dns',
    };
    const tabId = sectionToTab[section] || 'overview';
    onResultClick(tabId);
  };

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
              {/* Section header */}
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
              
              {/* List items */}
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
                        <div className="text-[12px] font-mono text-[#c8d6f0] break-all leading-relaxed font-mono">
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