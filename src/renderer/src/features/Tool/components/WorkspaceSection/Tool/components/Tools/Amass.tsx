// Amass - Subdomain enumeration tool
import React, { useState } from 'react';

const AmassTool: React.FC = () => {
  const [target, setTarget] = useState('');
  const [active, setActive] = useState(false);
  const [brute, setBrute] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const handleScan = async () => {
    if (!target) return;
    setScanning(true);
    // Mock results
    setTimeout(() => {
      setResults([
        'mail.example.com',
        'www.example.com',
        'api.example.com',
        'admin.example.com',
        'dev.example.com',
      ]);
      setScanning(false);
    }, 3000);
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3">
        <p className="text-[10px] text-blue-300">
          Amass là công cụ OWASP để thực hiện subdomain enumeration, mapping network, và OSINT.
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
          <span className="text-[11px]">Active mode (-active) - Zone transfers, DNS brute forcing</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={brute}
            onChange={(e) => setBrute(e.target.checked)}
          />
          <span className="text-[11px]">Brute forcing (-brute) - Wordlist subdomain enumeration</span>
        </label>
      </div>

      <button
        onClick={handleScan}
        disabled={scanning || !target}
        className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-[12px] font-medium rounded"
      >
        {scanning ? 'Enumerating subdomains...' : 'Start Amass Scan'}
      </button>

      {results.length > 0 && (
        <div className="mt-4">
          <h4 className="text-[11px] font-semibold text-blue-400 mb-2">
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

export default AmassTool;