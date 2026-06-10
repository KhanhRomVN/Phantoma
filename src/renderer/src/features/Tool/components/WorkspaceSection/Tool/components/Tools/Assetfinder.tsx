// Assetfinder - Find domains and subdomains
import React, { useState } from 'react';

const AssetfinderTool: React.FC = () => {
  const [target, setTarget] = useState('');
  const [subsOnly, setSubsOnly] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const handleScan = async () => {
    if (!target) return;
    setScanning(true);
    setTimeout(() => {
      setResults([
        'example.com',
        'www.example.com',
        'mail.example.com',
        'api.example.com',
        'blog.example.com',
        'cdn.example.com',
      ]);
      setScanning(false);
    }, 2000);
  };

  return (
    <div className="space-y-4">
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-3">
        <p className="text-[10px] text-emerald-300">
          Assetfinder từ ProjectDiscovery - Tìm kiếm domain và subdomain từ nhiều nguồn dữ liệu.
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

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={subsOnly}
          onChange={(e) => setSubsOnly(e.target.checked)}
        />
        <span className="text-[11px]">Subdomains only (--subs-only)</span>
      </label>

      <button
        onClick={handleScan}
        disabled={scanning || !target}
        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white text-[12px] font-medium rounded"
      >
        {scanning ? 'Finding assets...' : 'Start Assetfinder Scan'}
      </button>

      {results.length > 0 && (
        <div className="mt-4">
          <h4 className="text-[11px] font-semibold text-emerald-400 mb-2">
            Found {results.length} Assets
          </h4>
          <div className="space-y-1 max-h-64 overflow-y-auto bg-[#0a0e14] border border-[#1e2535] rounded p-2">
            {results.map((asset, idx) => (
              <p key={idx} className="text-[10px] font-mono text-[#c5cfe0] break-all">
                {asset}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetfinderTool;