import { useState, useEffect } from 'react';
import type { OrganizationData } from '../types/organization-data';

interface SearchProps {
  data: OrganizationData | null;
  searchQuery: string;
  onResultClick: (tabId: string) => void;
}

interface SearchResult {
  id: string;
  type: string;
  content: string;
  section: string;
}

function searchInData(data: OrganizationData | null, query: string): SearchResult[] {
  if (!data || !query.trim()) return [];
  
  const lowerQuery = query.toLowerCase();
  const results: SearchResult[] = [];

  const companyInfo = data.companyInfo;
  if (companyInfo) {
    if (companyInfo.companyName?.toLowerCase().includes(lowerQuery)) {
      results.push({ id: 'company-name', type: 'Company Name', content: companyInfo.companyName, section: 'Company Info' });
    }
    if (companyInfo.legalName?.toLowerCase().includes(lowerQuery)) {
      results.push({ id: 'company-legal', type: 'Legal Name', content: companyInfo.legalName, section: 'Company Info' });
    }
    if (companyInfo.address?.toLowerCase().includes(lowerQuery)) {
      results.push({ id: 'company-address', type: 'Address', content: companyInfo.address, section: 'Company Info' });
    }
    if (companyInfo.phoneNumber?.toLowerCase().includes(lowerQuery)) {
      results.push({ id: 'company-phone', type: 'Phone', content: companyInfo.phoneNumber, section: 'Company Info' });
    }
    if (companyInfo.email?.toLowerCase().includes(lowerQuery)) {
      results.push({ id: 'company-email', type: 'Email', content: companyInfo.email, section: 'Company Info' });
    }
    if (companyInfo.industry?.toLowerCase().includes(lowerQuery)) {
      results.push({ id: 'company-industry', type: 'Industry', content: companyInfo.industry, section: 'Company Info' });
    }
  }

  if (data.digitalAssets && data.digitalAssets.length > 0) {
    data.digitalAssets.forEach((asset, idx) => {
      if (asset.name?.toLowerCase().includes(lowerQuery)) {
        results.push({ id: `asset-${idx}`, type: `Asset (${asset.type})`, content: asset.name, section: 'Digital Assets' });
      }
    });
  }

  if (data.employeeIntel && data.employeeIntel.length > 0) {
    data.employeeIntel.forEach((employee, idx) => {
      if (employee.name?.toLowerCase().includes(lowerQuery)) {
        results.push({ id: `emp-${idx}`, type: 'Employee', content: `${employee.name} - ${employee.title}`, section: 'Employee Intel' });
      }
      if (employee.email?.toLowerCase().includes(lowerQuery)) {
        results.push({ id: `emp-email-${idx}`, type: 'Employee Email', content: employee.email, section: 'Employee Intel' });
      }
    });
  }

  const exposure = data.externalExposure;
  if (exposure) {
    if (exposure.dataBreach && exposure.dataBreach.length > 0) {
      exposure.dataBreach.forEach((breach, idx) => {
        if (breach.name?.toLowerCase().includes(lowerQuery)) {
          results.push({ id: `breach-${idx}`, type: 'Data Breach', content: breach.name, section: 'External Exposure' });
        }
      });
    }
    if (exposure.credentialLeak && exposure.credentialLeak.length > 0) {
      exposure.credentialLeak.forEach((leak, idx) => {
        if (leak.email?.toLowerCase().includes(lowerQuery)) {
          results.push({ id: `leak-${idx}`, type: 'Credential Leak', content: leak.email, section: 'External Exposure' });
        }
      });
    }
  }

  return results.slice(0, 50);
}

function getSectionColor(section: string): string {
  const colors: Record<string, string> = {
    'Company Info': '#af52de',
    'Digital Assets': '#30d158',
    'Employee Intel': '#0a84ff',
    'External Exposure': '#64d2ff',
  };
  return colors[section] || '#6a7a9a';
}

function getSectionIcon(section: string): string {
  const icons: Record<string, string> = {
    'Company Info': '🏢',
    'Digital Assets': '🌐',
    'Employee Intel': '👥',
    'External Exposure': '⚠️',
  };
  return icons[section] || '📄';
}

function getSectionToTabId(section: string): string {
  const mapping: Record<string, string> = {
    'Company Info': 'company',
    'Digital Assets': 'digital-assets',
    'Employee Intel': 'employees',
    'External Exposure': 'exposure',
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