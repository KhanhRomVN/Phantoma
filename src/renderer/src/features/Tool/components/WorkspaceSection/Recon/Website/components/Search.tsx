import { useState, useEffect } from 'react';
import type { WebsiteData } from '../types/website-data';

interface SearchProps {
  data: WebsiteData | null;
  searchQuery: string;
  onResultClick: (tabId: string) => void;
}

interface SearchResult {
  id: string;
  type: string;
  content: string;
  section: string;
}

function searchInData(data: WebsiteData | null, query: string): SearchResult[] {
  if (!data || !query.trim()) return [];
  
  const lowerQuery = query.toLowerCase();
  const results: SearchResult[] = [];

  const structure = data.appStructure;
  if (structure) {
    if (structure.urlStructure?.some(u => u.toLowerCase().includes(lowerQuery))) {
      const url = structure.urlStructure.find(u => u.toLowerCase().includes(lowerQuery));
      results.push({ id: 'structure-url', type: 'URL', content: url || '', section: 'App Structure' });
    }
    if (structure.endpointMapping?.some(e => e.path?.toLowerCase().includes(lowerQuery))) {
      const endpoint = structure.endpointMapping.find(e => e.path?.toLowerCase().includes(lowerQuery));
      results.push({ id: 'structure-endpoint', type: 'Endpoint', content: `${endpoint?.method} ${endpoint?.path}`, section: 'App Structure' });
    }
    if (structure.hiddenPaths?.some(p => p.toLowerCase().includes(lowerQuery))) {
      const path = structure.hiddenPaths.find(p => p.toLowerCase().includes(lowerQuery));
      results.push({ id: 'structure-hidden', type: 'Hidden Path', content: path || '', section: 'App Structure' });
    }
  }

  const auth = data.authSurface;
  if (auth) {
    if (auth.loginPage?.toLowerCase().includes(lowerQuery)) {
      results.push({ id: 'auth-login', type: 'Login Page', content: auth.loginPage, section: 'Auth Surface' });
    }
    if (auth.oauth?.some(o => o.provider?.toLowerCase().includes(lowerQuery))) {
      results.push({ id: 'auth-oauth', type: 'OAuth Provider', content: 'OAuth configured', section: 'Auth Surface' });
    }
  }

  const client = data.clientSideAnalysis;
  if (client) {
    if (client.jsFiles?.some(f => f.toLowerCase().includes(lowerQuery))) {
      results.push({ id: 'client-js', type: 'JavaScript File', content: 'Client-side JS detected', section: 'Client Side' });
    }
    if (client.apiCalls?.some(a => a.toLowerCase().includes(lowerQuery))) {
      const api = client.apiCalls.find(a => a.toLowerCase().includes(lowerQuery));
      results.push({ id: 'client-api', type: 'API Call', content: api || '', section: 'Client Side' });
    }
  }

  const vulns = data.webVulnerabilities;
  if (vulns && vulns.length > 0) {
    vulns.forEach((vuln, idx) => {
      if (vuln.name?.toLowerCase().includes(lowerQuery)) {
        results.push({ id: `vuln-${idx}`, type: `Vulnerability [${vuln.severity}]`, content: vuln.name, section: 'Vulnerabilities' });
      }
      if (vuln.cve?.toLowerCase().includes(lowerQuery)) {
        results.push({ id: `cve-${idx}`, type: 'CVE', content: vuln.cve, section: 'Vulnerabilities' });
      }
    });
  }

  const tech = data.technologyDetection;
  if (tech) {
    const allTech = [...(tech.frontendFramework || []), ...(tech.backendFramework || []), ...(tech.webServer || [])];
    allTech.forEach((t, idx) => {
      if (t.toLowerCase().includes(lowerQuery)) {
        results.push({ id: `tech-${idx}`, type: 'Technology', content: t, section: 'Technology' });
      }
    });
  }

  return results.slice(0, 50);
}

function getSectionColor(section: string): string {
  const colors: Record<string, string> = {
    'App Structure': '#af52de',
    'Auth Surface': '#30d158',
    'Client Side': '#0a84ff',
    'Vulnerabilities': '#ff375f',
    'Technology': '#64d2ff',
  };
  return colors[section] || '#6a7a9a';
}

function getSectionIcon(section: string): string {
  const icons: Record<string, string> = {
    'App Structure': '🏗️',
    'Auth Surface': '🔐',
    'Client Side': '💻',
    'Vulnerabilities': '⚠️',
    'Technology': '⚙️',
  };
  return icons[section] || '📄';
}

function getSectionToTabId(section: string): string {
  const mapping: Record<string, string> = {
    'App Structure': 'structure',
    'Auth Surface': 'auth',
    'Client Side': 'client',
    'Vulnerabilities': 'vulnerabilities',
    'Technology': 'technology',
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
        <div className="text-[11px] font-mono text-[#2a3548]">Enter a search query to find information</div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-[#080b10]">
        <div className="text-[32px] opacity-15">🔍</div>
        <div className="text-[11px] font-mono text-[#2a3548]">No results found for "{searchQuery}"</div>
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
    <div className="flex-1 overflow-y-auto bg-[#080b10]">
      <div className="sticky top-0 z-10 bg-[#080b10] px-4 py-3 border-b border-[#1c2333]">
        <div className="text-[11px] font-mono text-[#2a3548]">Found {results.length} result{results.length !== 1 ? 's' : ''}</div>
      </div>
      <div className="divide-y divide-[#111827]">
        {Object.entries(groupedResults).map(([section, sectionResults]) => {
          const sectionColor = getSectionColor(section);
          const sectionIcon = getSectionIcon(section);
          return (
            <div key={section} className="bg-[#080b10]">
              <div className="sticky top-[45px] z-10 px-4 py-2 flex items-center gap-2 bg-[#0a0e14] border-b border-[#1c2333]" style={{ borderLeftColor: sectionColor, borderLeftWidth: '3px' }}>
                <span className="text-base">{sectionIcon}</span>
                <span className="text-[11px] font-bold font-mono uppercase tracking-wider" style={{ color: sectionColor }}>{section}</span>
                <span className="text-[10px] font-mono text-[#2a3548] ml-auto">{sectionResults.length} item{sectionResults.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="divide-y divide-[#111827]">
                {sectionResults.map((result) => (
                  <div key={result.id} onClick={() => handleResultClick(result.section)} className="group px-4 py-3 hover:bg-[#0d1017] transition-colors cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: `${sectionColor}20`, color: sectionColor }}>{result.type}</span>
                        </div>
                        <div className="text-[12px] font-mono text-[#c8d6f0] break-all leading-relaxed">{result.content}</div>
                      </div>
                      <div className="text-[#2a3548] group-hover:text-[#0af] transition-colors shrink-0">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
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