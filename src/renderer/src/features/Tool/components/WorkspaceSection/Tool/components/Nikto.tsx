// src/renderer/src/features/Tool/components/WorkspaceSection/Tool/components/Nikto.tsx
// UI cho công cụ Nikto

import React, { useState } from 'react';

const NiktoTool: React.FC = () => {
  const [target, setTarget] = useState('');
  const [ssl, setSsl] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleScan = async () => {
    if (!target) return;
    setScanning(true);
    setTimeout(() => {
      setResults({
        vulnerabilities: [
          { name: 'XSS Vulnerability', risk: 'High', path: '/' },
          { name: 'Directory Listing Enabled', risk: 'Medium', path: '/backup/' },
          { name: 'Outdated PHP Version', risk: 'High', path: '/' },
        ],
        serverHeader: 'Apache/2.4.41',
      });
      setScanning(false);
    }, 3000);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[11px] font-medium text-[#6b7a96] mb-1">
          Target URL or IP
        </label>
        <input
          type="text"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="e.g., https://example.com or 192.168.1.1"
          className="w-full px-3 py-2 bg-[#0a0e14] border border-[#1e2535] rounded text-[12px]"
        />
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={ssl}
          onChange={(e) => setSsl(e.target.checked)}
        />
        <span className="text-[11px]">Enable SSL/TLS (-ssl)</span>
      </label>

      <button
        onClick={handleScan}
        disabled={scanning || !target}
        className="w-full py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white text-[12px] font-medium rounded"
      >
        {scanning ? 'Scanning for vulnerabilities...' : 'Start Nikto Scan'}
      </button>

      {results && (
        <div className="mt-4 p-3 bg-[#0a0e14] border border-[#1e2535] rounded">
          <h4 className="text-[12px] font-semibold text-orange-400 mb-2">Vulnerabilities Found</h4>
          <div className="space-y-2">
            {results.vulnerabilities.map((vuln: any, idx: number) => (
              <div key={idx} className="border-b border-[#1e2535] pb-2 last:border-0">
                <p className="text-[11px]">
                  <span className="text-[#6b7a96]">{vuln.path}</span> - {vuln.name}
                </p>
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                  vuln.risk === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {vuln.risk} Risk
                </span>
              </div>
            ))}
            <p className="text-[10px] text-[#6b7a96] mt-2">Server: {results.serverHeader}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default NiktoTool;