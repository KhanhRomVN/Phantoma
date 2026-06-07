import { useState, useEffect } from 'react';
import type { PersonData } from '../types/person-data';

interface SearchProps {
  data: PersonData | null;
  searchQuery: string;
  onResultClick: (tabId: string) => void;
}

interface SearchResult {
  id: string;
  type: string;
  content: string;
  section: string;
}

function searchInData(data: PersonData | null, query: string): SearchResult[] {
  if (!data || !query.trim()) return [];
  
  const lowerQuery = query.toLowerCase();
  const results: SearchResult[] = [];

  const identity = data.identityInfo;
  if (identity) {
    if (identity.fullName?.toLowerCase().includes(lowerQuery)) {
      results.push({ id: 'identity-name', type: 'Full Name', content: identity.fullName, section: 'Identity' });
    }
    if (identity.alias?.some(a => a.toLowerCase().includes(lowerQuery))) {
      const alias = identity.alias.find(a => a.toLowerCase().includes(lowerQuery));
      results.push({ id: 'identity-alias', type: 'Alias', content: alias || '', section: 'Identity' });
    }
    if (identity.username?.some(u => u.toLowerCase().includes(lowerQuery))) {
      const username = identity.username.find(u => u.toLowerCase().includes(lowerQuery));
      results.push({ id: 'identity-username', type: 'Username', content: username || '', section: 'Identity' });
    }
  }

  const contact = data.contactInfo;
  if (contact) {
    if (contact.email?.some(e => e.toLowerCase().includes(lowerQuery))) {
      const email = contact.email.find(e => e.toLowerCase().includes(lowerQuery));
      results.push({ id: 'contact-email', type: 'Email', content: email || '', section: 'Contact' });
    }
    if (contact.phoneNumber?.some(p => p.includes(lowerQuery))) {
      const phone = contact.phoneNumber.find(p => p.includes(lowerQuery));
      results.push({ id: 'contact-phone', type: 'Phone', content: phone || '', section: 'Contact' });
    }
  }

  const social = data.socialMedia;
  if (social) {
    Object.entries(social).forEach(([platform, handle]) => {
      if (handle && typeof handle === 'string' && handle.toLowerCase().includes(lowerQuery)) {
        results.push({ id: `social-${platform}`, type: `${platform}`, content: handle, section: 'Social Media' });
      }
    });
  }

  const technical = data.technicalFootprint;
  if (technical) {
    if (technical.github?.toLowerCase().includes(lowerQuery)) {
      results.push({ id: 'tech-github', type: 'GitHub', content: technical.github, section: 'Technical Footprint' });
    }
    if (technical.gitlab?.toLowerCase().includes(lowerQuery)) {
      results.push({ id: 'tech-gitlab', type: 'GitLab', content: technical.gitlab, section: 'Technical Footprint' });
    }
    if (technical.domainOwnership?.some(d => d.toLowerCase().includes(lowerQuery))) {
      const domain = technical.domainOwnership.find(d => d.toLowerCase().includes(lowerQuery));
      results.push({ id: 'tech-domain', type: 'Domain', content: domain || '', section: 'Technical Footprint' });
    }
  }

  const leaks = data.leakExposure;
  if (leaks) {
    if (leaks.passwordLeaks?.some(l => l.source?.toLowerCase().includes(lowerQuery) || l.email?.toLowerCase().includes(lowerQuery))) {
      results.push({ id: 'leak-password', type: 'Password Leak', content: 'Password leak found', section: 'Leak Exposure' });
    }
    if (leaks.pastebinLeaks?.some(p => p.title?.toLowerCase().includes(lowerQuery))) {
      results.push({ id: 'leak-pastebin', type: 'Pastebin Leak', content: 'Pastebin exposure found', section: 'Leak Exposure' });
    }
  }

  return results.slice(0, 50);
}

function getSectionColor(section: string): string {
  const colors: Record<string, string> = {
    'Identity': '#af52de',
    'Contact': '#30d158',
    'Social Media': '#0a84ff',
    'Technical Footprint': '#64d2ff',
    'Leak Exposure': '#ff375f',
  };
  return colors[section] || '#6a7a9a';
}

function getSectionIcon(section: string): string {
  const icons: Record<string, string> = {
    'Identity': '🆔',
    'Contact': '📞',
    'Social Media': '📱',
    'Technical Footprint': '💻',
    'Leak Exposure': '⚠️',
  };
  return icons[section] || '📄';
}

function getSectionToTabId(section: string): string {
  const mapping: Record<string, string> = {
    'Identity': 'identity',
    'Contact': 'contact',
    'Social Media': 'social',
    'Technical Footprint': 'technical',
    'Leak Exposure': 'leaks',
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
        <div className="text-[12px] font-mono text-[#c8d6f0]">Enter a search query to find information</div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-3">
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

  const handleResultClick = (section: string) => {
    const tabId = getSectionToTabId(section);
    onResultClick(tabId);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="sticky top-0 z-10 px-4 py-3 border-b border-[#1c2333]">
        <div className="text-[12px] font-mono text-[#c8d6f0]">Found {results.length} result{results.length !== 1 ? 's' : ''}</div>
      </div>
      <div className="divide-y divide-[#111827]">
        {Object.entries(groupedResults).map(([section, sectionResults]) => {
          const sectionColor = getSectionColor(section);
          const sectionIcon = getSectionIcon(section);
          return (
            <div key={section} className="">
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
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: `${sectionColor}20`, color: sectionColor }}>{result.type}</span>
                        </div>
                        <div className="text-[13px] font-mono text-[#c8d6f0] break-all leading-relaxed">{result.content}</div>
                      </div>
                      <div className="text-[#c8d6f0] group-hover:text-[#0af] transition-colors shrink-0">
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