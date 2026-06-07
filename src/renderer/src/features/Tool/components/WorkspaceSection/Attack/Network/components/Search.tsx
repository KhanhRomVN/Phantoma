import { useState, useEffect } from 'react';
import type { NetworkAttackData } from '../types/network-attack';

interface SearchProps {
  data: NetworkAttackData | null;
  searchQuery: string;
  onResultClick: (tabId: string) => void;
}

interface SearchResult {
  id: string;
  type: string;
  content: string;
  section: string;
}

function searchInData(data: NetworkAttackData | null, query: string): SearchResult[] {
  if (!data || !query.trim()) return [];

  const lowerQuery = query.toLowerCase();
  const results: SearchResult[] = [];

  // Search EternalBlue results
  data.eternalBlueResults.forEach((result, idx) => {
    if (result.name?.toLowerCase().includes(lowerQuery) ||
        result.target?.toLowerCase().includes(lowerQuery) ||
        result.config?.lhost?.toLowerCase().includes(lowerQuery) ||
        result.systemInfo?.os?.toLowerCase().includes(lowerQuery)) {
      results.push({
        id: `eb-${idx}`,
        type: 'EternalBlue Exploit',
        content: `${result.name} → ${result.target}:${result.port}`,
        section: 'EternalBlue',
      });
    }
  });

  // Search Brute-force results
  data.bruteForceResults.forEach((result, idx) => {
    if (result.config?.service?.toLowerCase().includes(lowerQuery) ||
        result.target?.toLowerCase().includes(lowerQuery) ||
        result.config?.target?.toLowerCase().includes(lowerQuery)) {
      results.push({
        id: `bf-${idx}`,
        type: `Brute-force (${result.config.service.toUpperCase()})`,
        content: `${result.config.target}:${result.config.port} — ${result.attemptsMade} attempts`,
        section: 'BruteForce',
      });
    }
    result.credentialsFound.forEach((cred, ci) => {
      if (cred.username?.toLowerCase().includes(lowerQuery) ||
          cred.password?.toLowerCase().includes(lowerQuery) ||
          cred.service?.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: `bf-cred-${idx}-${ci}`,
          type: 'Credential',
          content: `${cred.username}:${cred.password} (${cred.service})`,
          section: 'BruteForce',
        });
      }
    });
  });

  // Search Service RCE results
  data.serviceRCEResults.forEach((result, idx) => {
    if (result.config?.vulnerability?.toLowerCase().includes(lowerQuery) ||
        result.target?.toLowerCase().includes(lowerQuery) ||
        result.cveId?.toLowerCase().includes(lowerQuery)) {
      results.push({
        id: `rce-${idx}`,
        type: 'Service RCE',
        content: `${result.config.vulnerability} → ${result.target}:${result.port}`,
        section: 'ServiceRCE',
      });
    }
  });

  // Search active shells
  data.activeShells.forEach((shell, idx) => {
    if (shell.target?.toLowerCase().includes(lowerQuery) ||
        shell.type?.toLowerCase().includes(lowerQuery) ||
        shell.user?.toLowerCase().includes(lowerQuery)) {
      results.push({
        id: `shell-${idx}`,
        type: 'Shell Session',
        content: `${shell.type} shell on ${shell.target} as ${shell.user}`,
        section: 'Overview',
      });
    }
  });

  // Search credentials
  data.credentialsFound.forEach((cred, idx) => {
    if (cred.username?.toLowerCase().includes(lowerQuery) ||
        cred.password?.toLowerCase().includes(lowerQuery)) {
      results.push({
        id: `cred-${idx}`,
        type: 'Credential',
        content: `${cred.username}:${cred.password}`,
        section: 'Overview',
      });
    }
  });

  // Search attack log
  data.attackLog.forEach((line, idx) => {
    if (line.toLowerCase().includes(lowerQuery)) {
      results.push({
        id: `log-${idx}`,
        type: 'Attack Log',
        content: line,
        section: 'Log',
      });
    }
  });

  // Search open ports
  data.openPorts.forEach((port, idx) => {
    if (port.toString().includes(lowerQuery)) {
      results.push({
        id: `port-${idx}`,
        type: 'Open Port',
        content: `Port ${port}`,
        section: 'Overview',
      });
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
      'EternalBlue': '#0af',
      'BruteForce': '#f5a623',
      'ServiceRCE': '#ff2d55',
      'Overview': '#30d158',
      'Log': '#64d2ff',
    };
    return colors[section] || '#6a7a9a';
  };

  const getSectionIcon = (section: string) => {
    const icons: Record<string, string> = {
      'EternalBlue': '💣',
      'BruteForce': '🔑',
      'ServiceRCE': '⚡',
      'Overview': '📊',
      'Log': '📜',
    };
    return icons[section] || '📄';
  };

  const handleResultClick = (section: string) => {
    const sectionToTab: Record<string, string> = {
      'EternalBlue': 'eternalblue',
      'BruteForce': 'bruteforce',
      'ServiceRCE': 'service-rce',
      'Overview': 'overview',
      'Log': 'terminal',
    };
    const tabId = sectionToTab[section] || 'overview';
    onResultClick(tabId);
  };

  if (!searchQuery.trim()) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-[#080b10]">
        <div className="text-[32px] opacity-15">🔍</div>
        <div className="text-[12px] font-mono text-[#c8d6f0]">
          Enter a search query to find attack results
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-[#080b10]">
        <div className="text-[32px] opacity-15">🔍</div>
        <div className="text-[12px] font-mono text-[#c8d6f0]">
          No results found for "{searchQuery}"
        </div>
      </div>
    );
  }

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
                <span
                  className="text-[12px] font-bold font-mono uppercase tracking-wider"
                  style={{ color: sectionColor }}
                >
                  {section}
                </span>
                <span className="text-[11px] font-mono text-[#c8d6f0] ml-auto">
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
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: `${sectionColor}20`, color: sectionColor }}
                          >
                            {result.type}
                          </span>
                        </div>
                        <div className="text-[13px] font-mono text-[#c8d6f0] break-all leading-relaxed">
                          {result.content}
                        </div>
                      </div>
                      <div className="text-[#c8d6f0] group-hover:text-[#0af] transition-colors shrink-0">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 18l6-6-6-6" />
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