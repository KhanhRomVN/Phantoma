import { useState, useEffect } from 'react';
import type { ClientAttackData } from '../types/client-attack';

interface SearchProps {
  data: ClientAttackData | null;
  searchQuery: string;
  onResultClick: (tabId: string) => void;
}

interface SearchResult { id: string; type: string; content: string; section: string; }

function searchInData(data: ClientAttackData | null, query: string): SearchResult[] {
  if (!data || !query.trim()) return [];
  const lowerQuery = query.toLowerCase();
  const results: SearchResult[] = [];

  data.phishingResults.forEach((r, idx) => {
    if (r.name?.toLowerCase().includes(lowerQuery) || r.landingPageUrl?.toLowerCase().includes(lowerQuery)) {
      results.push({ id: `phish-${idx}`, type: 'Phishing', content: r.name, section: 'Phishing' });
    }
    r.credentialsCaptured.forEach((c, ci) => {
      if (c.email?.toLowerCase().includes(lowerQuery) || c.password?.toLowerCase().includes(lowerQuery)) {
        results.push({ id: `phish-cred-${idx}-${ci}`, type: 'Phished Credential', content: `${c.email}:${c.password}`, section: 'Phishing' });
      }
    });
  });

  data.malwareDropperResults.forEach((r, idx) => {
    if (r.name?.toLowerCase().includes(lowerQuery) || r.payloadPath?.toLowerCase().includes(lowerQuery)) {
      results.push({ id: `mal-${idx}`, type: 'Malware Payload', content: `${r.name} (${r.config.payloadType})`, section: 'MalwareDropper' });
    }
  });

  data.activeSessions.forEach((s, idx) => {
    if (s.target?.toLowerCase().includes(lowerQuery) || s.user?.toLowerCase().includes(lowerQuery)) {
      results.push({ id: `sess-${idx}`, type: 'Session', content: `${s.type} on ${s.target} as ${s.user}`, section: 'Overview' });
    }
  });

  data.allCredentials.forEach((c, idx) => {
    if (c.email?.toLowerCase().includes(lowerQuery)) {
      results.push({ id: `cred-${idx}`, type: 'Credential', content: `${c.email}:${c.password}`, section: 'Overview' });
    }
  });

  data.attackLog.forEach((line, idx) => {
    if (line.toLowerCase().includes(lowerQuery)) results.push({ id: `log-${idx}`, type: 'Log', content: line, section: 'Log' });
  });

  return results.slice(0, 50);
}

export function Search({ data, searchQuery, onResultClick }: SearchProps) {
  const [results, setResults] = useState<SearchResult[]>([]);
  useEffect(() => { setResults(searchInData(data, searchQuery)); }, [data, searchQuery]);

  const getSectionColor = (s: string) => ({ 'Phishing': '#f5a623', 'MalwareDropper': '#ff2d55', 'Overview': '#0af', 'Log': '#64d2ff' } as Record<string, string>)[s] || '#6a7a9a';
  const getSectionIcon = (s: string) => ({ 'Phishing': '🎣', 'MalwareDropper': '💣', 'Overview': '📊', 'Log': '📜' } as Record<string, string>)[s] || '📄';
  const handleClick = (section: string) => onResultClick(({ 'Phishing': 'phishing', 'MalwareDropper': 'malware-dropper', 'Overview': 'overview', 'Log': 'terminal' } as Record<string, string>)[section] || 'overview');

  if (!searchQuery.trim()) return <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-[#080b10]"><div className="text-[32px] opacity-15">🔍</div><div className="text-[12px] font-mono text-[#c8d6f0]">Enter a search query</div></div>;
  if (results.length === 0) return <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-[#080b10]"><div className="text-[32px] opacity-15">🔍</div><div className="text-[12px] font-mono text-[#c8d6f0]">No results for "{searchQuery}"</div></div>;

  const grouped = results.reduce((acc, r) => { if (!acc[r.section]) acc[r.section] = []; acc[r.section].push(r); return acc; }, {} as Record<string, SearchResult[]>);

  return (
    <div className="flex-1 overflow-y-auto bg-[#080b10]">
      <div className="sticky top-0 z-10 bg-[#080b10] px-4 py-3 border-b border-[#1c2333]"><div className="text-[12px] font-mono text-[#c8d6f0]">Found {results.length} result{results.length !== 1 ? 's' : ''}</div></div>
      <div className="divide-y divide-[#111827]">
        {Object.entries(grouped).map(([section, items]) => (
          <div key={section}>
            <div className="sticky top-[45px] z-10 px-4 py-2 flex items-center gap-2 bg-[#0a0e14] border-b border-[#1c2333]" style={{ borderLeftColor: getSectionColor(section), borderLeftWidth: '3px' }}>
              <span className="text-base">{getSectionIcon(section)}</span>
              <span className="text-[12px] font-bold font-mono uppercase tracking-wider" style={{ color: getSectionColor(section) }}>{section}</span>
              <span className="text-[11px] font-mono text-[#c8d6f0] ml-auto">{items.length} item{items.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="divide-y divide-[#111827]">
              {items.map(r => (
                <div key={r.id} onClick={() => handleClick(r.section)} className="group px-4 py-3 hover:bg-[#0d1017] transition-colors cursor-pointer">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: `${getSectionColor(r.section)}20`, color: getSectionColor(r.section) }}>{r.type}</span>
                  <div className="text-[13px] font-mono text-[#c8d6f0] break-all mt-1">{r.content}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}