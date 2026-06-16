import React, { useState } from 'react';
import { SubdomainResult } from '../types';

interface ResultsTableProps {
  subdomains: SubdomainResult[];
  accentColor: string;
  onCopy?: (text: string) => void;
}

const ResultsTable: React.FC<ResultsTableProps> = ({ subdomains, accentColor, onCopy }) => {
  const [filter, setFilter] = useState('');
  
  const filtered = filter 
    ? subdomains.filter(s => s.name.toLowerCase().includes(filter.toLowerCase()))
    : subdomains;
  
  const handleCopyAll = () => {
    const text = filtered.map(s => s.name).join('\n');
    if (onCopy) {
      onCopy(text);
    } else {
      navigator.clipboard.writeText(text);
    }
  };
  
  const handleCopySingle = (name: string) => {
    if (onCopy) {
      onCopy(name);
    } else {
      navigator.clipboard.writeText(name);
    }
  };
  
  return (
    <div className="flex flex-col gap-3">
      {/* Filter and actions */}
      <div className="flex justify-between items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter subdomains..."
            className="w-full px-3 py-1.5 rounded text-[11px] outline-none font-inherit bg-input-background text-text-primary placeholder:text-text-secondary"
            style={{
              border: `1px solid ${filter ? accentColor + '50' : 'var(--border)'}`,
            }}
          />
        </div>
        <button
          onClick={handleCopyAll}
          className="px-3 py-1.5 rounded text-[11px] font-bold cursor-pointer font-inherit bg-card-background transition-all hover:opacity-80"
          style={{
            border: `1px solid ${accentColor}30`,
            color: accentColor,
          }}
        >
          Copy All ({filtered.length})
        </button>
      </div>
      
      {/* Results count */}
      <div className="text-[10px] text-text-secondary">
        Showing {filtered.length} of {subdomains.length} subdomains
      </div>
      
      {/* Table */}
      <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 400 }}>
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr>
              <th className="text-left p-2 text-text-secondary" style={{ borderBottom: '1px solid var(--border)' }}>
                SUBDOMAIN
              </th>
              <th className="text-left p-2 text-text-secondary" style={{ borderBottom: '1px solid var(--border)' }}>
                SOURCE
              </th>
              <th className="text-left p-2 text-text-secondary" style={{ borderBottom: '1px solid var(--border)' }}>
                ACTION
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((sub, i) => (
              <tr key={i}>
                <td className="p-2 font-medium" style={{ color: accentColor }}>
                  {sub.name}
                </td>
                <td className="p-2 text-text-secondary">
                  {sub.source || '—'}
                </td>
                <td className="p-2">
                  <button
                    onClick={() => handleCopySingle(sub.name)}
                    className="bg-transparent border-none text-text-secondary cursor-pointer text-[10px]"
                    title="Copy to clipboard"
                  >
                    📋 Copy
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResultsTable;