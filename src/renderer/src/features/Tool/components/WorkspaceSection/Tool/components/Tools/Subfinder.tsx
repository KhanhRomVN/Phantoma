// Subfinder - Fast subdomain discovery
import React, { useState } from 'react';

const SubfinderTool: React.FC = () => {
  const [target, setTarget] = useState('');
  const [active, setActive] = useState(false);
  const [recursive, setRecursive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const handleScan = async () => {
    if (!target) return;
    setScanning(true);
    setTimeout(() => {
      setResults([
        'sub1.example.com',
        'sub2.example.com',
        'admin.example.com',
        'dev.example.com',
        'staging.example.com',
        'api.example.com',
      ]);
      setScanning(false);
    }, 2500);
  };

  return (
    <div className="space-y-4">
      <div className="bg-purple-500/10 border border-purple-500/30 rounded p-3">
        <p className="text-[10px] text-purple-300">
          Subfinder - Công cụ subdomain discovery nhanh chóng từ ProjectDiscovery.
        </p>
      </div>

      <div>
        <label className="block text-[11px] font-medium text-[#6b7a96] mb-1">
          Target Domain
        </label>
        <input
          type="text"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="e.g., example.com"
          className="w-full px-3 py-2 bg-[#0a0e14] border border-[#1e2535] rounded text-[12px]"
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          <span className="text-[11px]">Active mode (-active) - DNS resolution</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={recursive}
            onChange={(e) => setRecursive(e.target.checked)}
          />
          <span className="text-[11px]">Recursive (-recursive) - Deep subdomain search</span>
        </label>
      </div>

      <button
        onClick={handleScan}
        disabled={scanning || !target}
        className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white text-[12px] font-medium rounded"
      >
        {scanning ? 'Discovering subdomains...' : 'Start Subfinder Scan'}
      </button>

      {results.length > 0 && (
        <div className="mt-4">
          <h4 className="text-[11px] font-semibold text-purple-400 mb-2">
            Found {results.length} Subdomains
          </h4>
          <div className="space-y-1 max-h-64 overflow-y-auto bg-[#0a0e14] border border-[#1e2535] rounded p-2">
            {results.map((sub, idx) => (
              <p key={idx} className="text-[10px] font-mono text-[#c5cfe0] break-all">
                {sub}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SubfinderTool;