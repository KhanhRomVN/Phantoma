// src/renderer/src/features/Tool/components/WorkspaceSection/Tool/components/Dork.tsx

import React, { useState } from 'react';

interface DorkResult {
  url: string;
  title: string;
}

const DorkTool: React.FC = () => {
  const [query, setQuery] = useState('');
  const [engine, setEngine] = useState<'google' | 'bing' | 'yahoo'>('google');
  const [pages, setPages] = useState(1);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<DorkResult[]>([]);

  const handleSearch = async () => {
    if (!query) return;
    setSearching(true);
    setTimeout(() => {
      setResults([
        { url: 'https://example.com/wp-admin/backup.sql', title: 'SQL Backup File' },
        { url: 'https://example.com/config.php', title: 'PHP Configuration' },
        { url: 'https://example.com/.git/config', title: 'Git Config Exposed' },
      ]);
      setSearching(false);
    }, 2500);
  };

  const dorkExamples = [
    'site:target.com filetype:sql',
    'intitle:"index of" "backup"',
    'inurl:admin login.php',
    'filetype:env DB_PASSWORD',
  ];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[11px] font-medium text-[#6b7a96] mb-1">
          Google Dork Query
        </label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g., site:example.com filetype:pdf confidential"
          rows={2}
          className="w-full px-3 py-2 bg-[#0a0e14] border border-[#1e2535] rounded text-[12px] font-mono"
        />
        <div className="mt-2 flex flex-wrap gap-1">
          {dorkExamples.map((example, idx) => (
            <button
              key={idx}
              onClick={() => setQuery(example)}
              className="text-[9px] px-1.5 py-0.5 bg-[#1e2535] text-cyan-400 rounded hover:bg-[#252e42]"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] text-[#6b7a96] mb-1">Search Engine</label>
          <select
            value={engine}
            onChange={(e) => setEngine(e.target.value as any)}
            className="w-full px-2 py-1.5 bg-[#0a0e14] border border-[#1e2535] rounded text-[11px]"
          >
            <option value="google">Google</option>
            <option value="bing">Bing</option>
            <option value="yahoo">Yahoo</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] text-[#6b7a96] mb-1">Pages</label>
          <input
            type="number"
            min="1"
            max="10"
            value={pages}
            onChange={(e) => setPages(parseInt(e.target.value))}
            className="w-full px-2 py-1.5 bg-[#0a0e14] border border-[#1e2535] rounded text-[11px]"
          />
        </div>
      </div>

      <button
        onClick={handleSearch}
        disabled={searching || !query}
        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white text-[12px] font-medium rounded"
      >
        {searching ? 'Dorking...' : 'Execute Dork Search'}
      </button>

      {results.length > 0 && (
        <div className="mt-4">
          <h4 className="text-[11px] font-semibold text-emerald-400 mb-2">
            Found {results.length} Results
          </h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {results.map((result, idx) => (
              <div key={idx} className="p-2 bg-[#0a0e14] border border-[#1e2535] rounded">
                <p className="text-[10px] font-mono text-cyan-400 break-all">{result.url}</p>
                <p className="text-[9px] text-[#6b7a96] mt-0.5">{result.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DorkTool;