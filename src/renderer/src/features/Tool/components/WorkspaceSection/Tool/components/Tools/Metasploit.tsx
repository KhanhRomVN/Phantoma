// src/renderer/src/features/Tool/components/WorkspaceSection/Tool/components/Metasploit.tsx

import React, { useState } from 'react';

const MetasploitTool: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [modules, setModules] = useState<any[]>([]);

  const handleSearch = async () => {
    if (!searchTerm) return;
    setSearching(true);
    setTimeout(() => {
      setModules([
        { name: 'exploit/windows/smb/ms17_010_eternalblue', rank: 'great', cve: 'MS17-010' },
        { name: 'exploit/multi/http/struts2_content_type_ognl', rank: 'excellent', cve: 'CVE-2017-5638' },
        { name: 'payload/windows/x64/meterpreter/reverse_tcp', rank: 'normal', type: 'payload' },
      ]);
      setSearching(false);
    }, 1000);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[11px] font-medium text-[#6b7a96] mb-1">
          Search Metasploit Modules
        </label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="e.g., eternalblue, struts, meterpreter"
          className="w-full px-3 py-2 bg-[#0a0e14] border border-[#1e2535] rounded text-[12px]"
        />
      </div>

      <button
        onClick={handleSearch}
        disabled={searching || !searchTerm}
        className="w-full py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white text-[12px] font-medium rounded"
      >
        {searching ? 'Searching modules...' : 'Search Metasploit'}
      </button>

      {modules.length > 0 && (
        <div className="mt-4">
          <h4 className="text-[11px] font-semibold text-red-400 mb-2">Metasploit Modules</h4>
          <div className="space-y-2">
            {modules.map((mod, idx) => (
              <div key={idx} className="p-2 bg-[#0a0e14] border border-[#1e2535] rounded">
                <p className="text-[10px] font-mono text-cyan-400">{mod.name}</p>
                <div className="flex gap-2 mt-1">
                  <span className={`text-[9px] px-1 rounded ${
                    mod.rank === 'great' ? 'bg-green-500/20 text-green-400' : 
                    mod.rank === 'excellent' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {mod.rank}
                  </span>
                  {mod.cve && <span className="text-[9px] text-red-400">{mod.cve}</span>}
                  {mod.type && <span className="text-[9px] text-yellow-400">{mod.type}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MetasploitTool;