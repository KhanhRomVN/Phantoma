// src/renderer/src/features/Tool/components/WorkspaceSection/Tool/components/Searchsploit.tsx

import React, { useState } from 'react';

const SearchsploitTool: React.FC = () => {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = async () => {
    if (!query) return;
    setSearching(true);
    setTimeout(() => {
      setResults([
        { id: '12345', title: 'WordPress 5.0 - Remote Code Execution', cve: 'CVE-2020-12345' },
        { id: '67890', title: 'Apache Struts 2 - RCE', cve: 'CVE-2019-67890' },
      ]);
      setSearching(false);
    }, 1500);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[11px] font-medium text-[#6b7a96] mb-1">
          Search CVE or Software Name
        </label>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g., WordPress, CVE-2021, Apache Struts"
          className="w-full px-3 py-2 bg-[#0a0e14] border border-[#1e2535] rounded text-[12px]"
        />
      </div>

      <button
        onClick={handleSearch}
        disabled={searching || !query}
        className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white text-[12px] font-medium rounded"
      >
        {searching ? 'Searching exploits...' : 'Search Exploit-DB'}
      </button>

      {results.length > 0 && (
        <div className="mt-4">
          <h4 className="text-[11px] font-semibold text-purple-400 mb-2">Found Exploits</h4>
          <div className="space-y-2">
            {results.map((exp, idx) => (
              <div key={idx} className="p-2 bg-[#0a0e14] border border-[#1e2535] rounded">
                <p className="text-[11px] font-medium text-cyan-400">{exp.title}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-[9px] text-[#6b7a96]">ID: {exp.id}</span>
                  <span className="text-[9px] text-red-400">{exp.cve}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchsploitTool;