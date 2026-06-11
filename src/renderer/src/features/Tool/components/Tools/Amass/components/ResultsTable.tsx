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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Filter and actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter subdomains..."
            style={{
              width: '100%',
              padding: '6px 10px',
              background: '#0d1117',
              border: `1px solid ${filter ? accentColor + '50' : '#1a2236'}`,
              borderRadius: 4,
              color: '#e2e8f0',
              fontSize: 11,
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>
        <button
          onClick={handleCopyAll}
          style={{
            padding: '6px 12px',
            background: '#0d1117',
            border: `1px solid ${accentColor}30`,
            borderRadius: 4,
            color: accentColor,
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Copy All ({filtered.length})
        </button>
      </div>
      
      {/* Results count */}
      <div style={{ fontSize: 10, color: '#64748b' }}>
        Showing {filtered.length} of {subdomains.length} subdomains
      </div>
      
      {/* Table */}
      <div style={{ overflowX: 'auto', maxHeight: 400, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px', color: '#475569', borderBottom: '1px solid #1a2236' }}>
                SUBDOMAIN
              </th>
              <th style={{ textAlign: 'left', padding: '8px', color: '#475569', borderBottom: '1px solid #1a2236' }}>
                SOURCE
              </th>
              <th style={{ textAlign: 'left', padding: '8px', color: '#475569', borderBottom: '1px solid #1a2236' }}>
                ACTION
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((sub, i) => (
              <tr key={i}>
                <td style={{ padding: '8px', color: accentColor, fontWeight: 500 }}>
                  {sub.name}
                </td>
                <td style={{ padding: '8px', color: '#64748b' }}>
                  {sub.source || '—'}
                </td>
                <td style={{ padding: '8px' }}>
                  <button
                    onClick={() => handleCopySingle(sub.name)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      fontSize: 10,
                    }}
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