import React, { useState, useEffect } from 'react';
import type { DataPoint } from '../types/data-point';
import { DataPointRow } from './shared/DataPointRow';
import { SectionHeader } from './shared/SectionHeader';
import { Search as SearchIcon, X } from 'lucide-react';

interface SearchProps {
  dataPoints: DataPoint[];
  searchQuery: string;
  onResultClick?: (dataPoint: DataPoint) => void;
  onClear?: () => void;
}

export function Search({ dataPoints, searchQuery, onResultClick, onClear }: SearchProps) {
  const [results, setResults] = useState<DataPoint[]>([]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const lower = searchQuery.toLowerCase();
    const filtered = dataPoints.filter(dp => {
      const label = dp.label.toLowerCase();
      const displayVal = (dp.displayValue || '').toLowerCase();
      const val = String(dp.value || '').toLowerCase();
      const source = dp.source.name.toLowerCase();
      const tags = (dp.tags || []).join(' ').toLowerCase();
      return (
        label.includes(lower) ||
        displayVal.includes(lower) ||
        val.includes(lower) ||
        source.includes(lower) ||
        tags.includes(lower)
      );
    });

    setResults(filtered.slice(0, 100));
  }, [dataPoints, searchQuery]);

  if (!searchQuery.trim()) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-3">
        <div className="text-[32px] opacity-15">🔍</div>
        <div className="text-[12px] font-mono text-[#6a7a9a]">Enter a search query to find data</div>
      </div>
    );
  }

  // Group results by category
  const grouped = results.reduce((acc, dp) => {
    const cat = dp.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(dp);
    return acc;
  }, {} as Record<string, DataPoint[]>);

  const categoryLabels: Record<string, string> = {
    email: 'Email Addresses',
    phone: 'Phone Numbers',
    full_name: 'Names',
    username: 'Usernames',
    alias: 'Aliases',
    social_profile: 'Social Profiles',
    domain: 'Domains',
    ip_address: 'IP Addresses',
    repository: 'Repositories',
    password_leak: 'Password Leaks',
    credential_leak: 'Credential Leaks',
    darkweb_mention: 'Dark Web Mentions',
    breach_entry: 'Breach Entries',
    pastebin_entry: 'Pastebin Leaks',
    stealer_log: 'Stealer Logs',
    location: 'Locations',
    job_title: 'Job Titles',
    company: 'Companies',
    education: 'Education',
    crypto_address: 'Crypto Addresses',
    ssh_key: 'SSH Keys',
    pgp_key: 'PGP Keys',
    url: 'URLs',
    unclassified: 'Unclassified',
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 px-4 py-2 border-b border-[#1c2333] bg-[#0f1319] flex items-center justify-between">
        <div className="text-[12px] font-mono text-[#c8d6f0]">
          Found <span className="text-[#0af]">{results.length}</span> result{results.length !== 1 ? 's' : ''} for "<span className="text-[#0af]">{searchQuery}</span>"
          {results.length >= 100 && <span className="text-[#f5a623] ml-1">(capped at 100)</span>}
        </div>
        {onClear && (
          <button onClick={onClear} className="text-[#6a7a9a] hover:text-[#c8d6f0] transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {results.length === 0 ? (
        <div className="flex items-center justify-center py-12 flex-col gap-2">
          <span className="text-[24px] opacity-15">🔍</span>
          <span className="text-[12px] font-mono text-[#6a7a9a]">No results found</span>
        </div>
      ) : (
        <div className="divide-y divide-[#111827]">
          {Object.entries(grouped).map(([category, dps]) => (
            <div key={category}>
              <div className="sticky top-[41px] z-10 px-4 py-1.5 bg-[#0a0e14] border-b border-[#1c2333]">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#6a7a9a]">
                  {categoryLabels[category] || category.replace(/_/g, ' ')}
                </span>
                <span className="text-[10px] font-mono text-[#6a7a9a] ml-2">({dps.length})</span>
              </div>
              <div className="p-2 space-y-1">
                {dps.map(dp => (
                  <div
                    key={dp.id}
                    onClick={() => onResultClick?.(dp)}
                    style={{ cursor: onResultClick ? 'pointer' : 'default' }}
                  >
                    <DataPointRow dataPoint={dp} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}