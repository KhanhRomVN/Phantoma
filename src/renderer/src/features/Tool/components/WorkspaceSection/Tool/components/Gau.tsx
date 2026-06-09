// src/renderer/src/features/Tool/components/WorkspaceSection/Tool/components/Gau.tsx

import React, { useState } from 'react';

const GauTool: React.FC = () => {
  const [domain, setDomain] = useState('');
  const [subs, setSubs] = useState(true);
  const [providers, setProviders] = useState<string[]>(['wayback', 'otx', 'commoncrawl']);
  const [fetching, setFetching] = useState(false);
  const [urls, setUrls] = useState<string[]>([]);

  const handleFetch = async () => {
    if (!domain) return;
    setFetching(true);
    setTimeout(() => {
      setUrls([
        'https://example.com/api/v1/users',
        'https://example.com/wp-admin/admin-ajax.php',
        'https://example.com/.git/config',
        'https://sub.example.com/backup.sql',
        'https://example.com/js/app.js',
      ]);
      setFetching(false);
    }, 3000);
  };

  const providerOptions = [
    { id: 'wayback', label: 'Wayback Machine' },
    { id: 'otx', label: 'AlienVault OTX' },
    { id: 'commoncrawl', label: 'CommonCrawl' },
    { id: 'urlscan', label: 'URLScan.io' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[11px] font-medium text-[#6b7a96] mb-1">
          Domain Name
        </label>
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="e.g., example.com"
          className="w-full px-3 py-2 bg-[#0a0e14] border border-[#1e2535] rounded text-[12px]"
        />
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={subs}
          onChange={(e) => setSubs(e.target.checked)}
        />
        <span className="text-[11px]">Include subdomains (--subs)</span>
      </label>

      <div>
        <label className="block text-[10px] text-[#6b7a96] mb-2">Data Sources</label>
        <div className="flex flex-wrap gap-2">
          {providerOptions.map(provider => (
            <label key={provider.id} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={providers.includes(provider.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setProviders([...providers, provider.id]);
                  } else {
                    setProviders(providers.filter(p => p !== provider.id));
                  }
                }}
                className="w-3 h-3"
              />
              <span className="text-[10px]">{provider.label}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={handleFetch}
        disabled={fetching || !domain}
        className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-[12px] font-medium rounded"
      >
        {fetching ? 'Fetching URLs...' : 'Fetch All URLs'}
      </button>

      {urls.length > 0 && (
        <div className="mt-4">
          <h4 className="text-[11px] font-semibold text-blue-400 mb-2">
            Found {urls.length} URLs
          </h4>
          <div className="space-y-1 max-h-96 overflow-y-auto bg-[#0a0e14] border border-[#1e2535] rounded p-2">
            {urls.map((url, idx) => (
              <p key={idx} className="text-[9px] font-mono text-[#c5cfe0] break-all">
                {url}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GauTool;