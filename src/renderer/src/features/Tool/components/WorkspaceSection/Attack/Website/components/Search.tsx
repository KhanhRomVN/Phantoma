import { useState, useEffect } from 'react';
import type { WebsiteAttackData } from '../types/website-attack';

interface SearchProps {
  data: WebsiteAttackData | null;
  searchQuery: string;
  onResultClick: (tabId: string) => void;
}

interface SearchResult {
  id: string;
  type: string;
  content: string;
  section: string;
}

function searchInData(data: WebsiteAttackData | null, query: string): SearchResult[] {
  if (!data || !query.trim()) return [];
  const lowerQuery = query.toLowerCase();
  const results: SearchResult[] = [];

  data.sqliResults.forEach((r, idx) => {
    if (r.name?.toLowerCase().includes(lowerQuery) || r.config?.url?.toLowerCase().includes(lowerQuery) || r.parameter?.toLowerCase().includes(lowerQuery)) {
      results.push({ id: `sqli-${idx}`, type: 'SQL Injection', content: `${r.name} → ${r.config.url}`, section: 'SQLi' });
    }
    r.credentials?.forEach((cred, ci) => {
      if (cred.username?.toLowerCase().includes(lowerQuery) || cred.password?.toLowerCase().includes(lowerQuery)) {
        results.push({ id: `sqli-cred-${idx}-${ci}`, type: 'SQLi Credential', content: `${cred.username}:${cred.password}`, section: 'SQLi' });
      }
    });
  });

  data.xssResults.forEach((r, idx) => {
    if (r.name?.toLowerCase().includes(lowerQuery) || r.payload?.toLowerCase().includes(lowerQuery) || r.parameter?.toLowerCase().includes(lowerQuery)) {
      results.push({ id: `xss-${idx}`, type: `XSS (${r.config.type})`, content: `${r.name} — ${r.parameter}`, section: 'XSS' });
    }
  });

  data.lfiRfiResults.forEach((r, idx) => {
    if (r.name?.toLowerCase().includes(lowerQuery) || r.fileContents?.toLowerCase().includes(lowerQuery)) {
      results.push({ id: `lfi-${idx}`, type: 'LFI/RFI', content: `${r.name} — ${r.config.type}`, section: 'LFI_RFI' });
    }
  });

  data.ssrfResults.forEach((r, idx) => {
    if (r.name?.toLowerCase().includes(lowerQuery) || r.config?.targetUrl?.toLowerCase().includes(lowerQuery)) {
      results.push({ id: `ssrf-${idx}`, type: 'SSRF', content: `${r.config.targetUrl} via ${r.config.url}`, section: 'SSRF' });
    }
  });

  data.xxeResults.forEach((r, idx) => {
    if (r.name?.toLowerCase().includes(lowerQuery) || r.fileContents?.toLowerCase().includes(lowerQuery)) {
      results.push({ id: `xxe-${idx}`, type: 'XXE', content: r.name, section: 'XXE' });
    }
  });

  data.commandInjectionResults.forEach((r, idx) => {
    if (r.name?.toLowerCase().includes(lowerQuery) || r.commandOutput?.toLowerCase().includes(lowerQuery)) {
      results.push({ id: `cmd-${idx}`, type: 'Command Injection', content: `${r.config.command} → ${r.commandOutput}`, section: 'CommandInjection' });
    }
  });

  data.activeShells.forEach((s, idx) => {
    if (s.url?.toLowerCase().includes(lowerQuery) || s.type?.toLowerCase().includes(lowerQuery)) {
      results.push({ id: `shell-${idx}`, type: 'Web Shell', content: `${s.type} shell at ${s.url}`, section: 'Overview' });
    }
  });

  data.credentialsFound.forEach((cred, idx) => {
    if (cred.username?.toLowerCase().includes(lowerQuery) || cred.password?.toLowerCase().includes(lowerQuery)) {
      results.push({ id: `cred-${idx}`, type: 'Credential', content: `${cred.username}:${cred.password}`, section: 'Overview' });
    }
  });

  data.attackLog.forEach((line, idx) => {
    if (line.toLowerCase().includes(lowerQuery)) {
      results.push({ id: `log-${idx}`, type: 'Attack Log', content: line, section: 'Log' });
    }
  });

  return results.slice(0, 50);
}

export function Search({ data, searchQuery, onResultClick }: SearchProps) {
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    setResults(searchInData(data, searchQuery));
  }, [data, searchQuery]);

  const getSectionColor = (section: string) => {
    const colors: Record<string, string> = {
      'SQLi': '#0af', 'XSS': '#ff9f0a', 'LFI_RFI': '#30d158', 'SSRF': '#bf5af2',
      'XXE': '#5e5ce6', 'Deserialization': '#ff6b35', 'CommandInjection': '#ff2d55',
      'Overview': '#0af', 'Log': '#64d2ff',
    };
    return colors[section] || '#6a7a9a';
  };

  const getSectionIcon = (section: string) => {
    const icons: Record<string, string> = {
      'SQLi': '💉', 'XSS': '🏷️', 'LFI_RFI': '📂', 'SSRF': '🔄',
      'XXE': '📄', 'Deserialization': '🧬', 'CommandInjection': '💻',
      'Overview': '📊', 'Log': '📜',
    };
    return icons[section] || '📄';
  };

  const handleResultClick = (section: string) => {
    const sectionToTab: Record<string, string> = {
      'SQLi': 'sqli', 'XSS': 'xss', 'LFI_RFI': 'lfi-rfi', 'SSRF': 'ssrf',
      'XXE': 'xxe', 'Deserialization': 'deserialization', 'CommandInjection': 'command-injection',
      'Overview': 'overview', 'Log': 'terminal',
    };
    onResultClick(sectionToTab[section] || 'overview');
  };

  if (!searchQuery.trim()) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-[#080b10]">
        <div className="text-[32px] opacity-15">🔍</div>
        <div className="text-[12px] font-mono text-[#c8d6f0]">Enter a search query to find attack results</div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-[#080b10]">
        <div className="text-[32px] opacity-15">🔍</div>
        <div className="text-[12px] font-mono text-[#c8d6f0]">No results found for "{searchQuery}"</div>
      </div>
    );
  }

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.section]) acc[result.section] = [];
    acc[result.section].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <div className="flex-1 overflow-y-auto bg-[#080b10]">
      <div className="sticky top-0 z-10 bg-[#080b10] px-4 py-3 border-b border-[#1c2333]">
        <div className="text-[12px] font-mono text-[#c8d6f0]">Found {results.length} result{results.length !== 1 ? 's' : ''}</div>
      </div>
      <div className="divide-y divide-[#111827]">
        {Object.entries(groupedResults).map(([section, sectionResults]) => {
          const sectionColor = getSectionColor(section);
          const sectionIcon = getSectionIcon(section);
          return (
            <div key={section}>
              <div className="sticky top-[45px] z-10 px-4 py-2 flex items-center gap-2 bg-[#0a0e14] border-b border-[#1c2333]" style={{ borderLeftColor: sectionColor, borderLeftWidth: '3px' }}>
                <span className="text-base">{sectionIcon}</span>
                <span className="text-[12px] font-bold font-mono uppercase tracking-wider" style={{ color: sectionColor }}>{section}</span>
                <span className="text-[11px] font-mono text-[#c8d6f0] ml-auto">{sectionResults.length} item{sectionResults.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="divide-y divide-[#111827]">
                {sectionResults.map((result) => (
                  <div key={result.id} onClick={() => handleResultClick(result.section)} className="group px-4 py-3 hover:bg-[#0d1017] transition-colors cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: `${sectionColor}20`, color: sectionColor }}>{result.type}</span>
                        <div className="text-[13px] font-mono text-[#c8d6f0] break-all leading-relaxed mt-1">{result.content}</div>
                      </div>
                      <div className="text-[#c8d6f0] group-hover:text-[#0af] transition-colors shrink-0">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
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