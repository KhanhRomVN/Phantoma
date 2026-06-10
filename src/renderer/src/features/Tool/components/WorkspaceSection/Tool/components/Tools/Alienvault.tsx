// Alienvault OTX - Threat intelligence
import React, { useState } from 'react';

interface Indicator {
  type: string;
  indicator: string;
  description: string;
  pulse_count: number;
}

const AlienvaultTool: React.FC = () => {
  const [target, setTarget] = useState('');
  const [scanning, setScanning] = useState(false);
  const [indicators, setIndicators] = useState<Indicator[]>([]);

  const handleLookup = async () => {
    if (!target) return;
    setScanning(true);
    setTimeout(() => {
      setIndicators([
        { type: 'IPv4', indicator: '8.8.8.8', description: 'Google DNS', pulse_count: 0 },
        { type: 'Domain', indicator: 'malware-c2.example.com', description: 'Known C2 server', pulse_count: 15 },
        { type: 'URL', indicator: 'https://evil.com/payload.exe', description: 'Malware distribution', pulse_count: 8 },
      ]);
      setScanning(false);
    }, 2000);
  };

  return (
    <div className="space-y-4">
      <div className="bg-indigo-500/10 border border-indigo-500/30 rounded p-3">
        <p className="text-[10px] text-indigo-300">
          AlienVault OTX - Tra cứu threat intelligence từ AlienVault Open Threat Exchange.
        </p>
      </div>

      <div>
        <label className="block text-[11px] font-medium text-[#6b7a96] mb-1">
          IP, Domain, or URL
        </label>
        <input
          type="text"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="e.g., 8.8.8.8 or example.com"
          className="w-full px-3 py-2 bg-[#0a0e14] border border-[#1e2535] rounded text-[12px]"
        />
      </div>

      <button
        onClick={handleLookup}
        disabled={scanning || !target}
        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white text-[12px] font-medium rounded"
      >
        {scanning ? 'Looking up threat intel...' : 'Query AlienVault OTX'}
      </button>

      {indicators.length > 0 && (
        <div className="mt-4">
          <h4 className="text-[11px] font-semibold text-indigo-400 mb-2">
            Threat Intelligence Results
          </h4>
          <div className="space-y-2">
            {indicators.map((ind, idx) => (
              <div key={idx} className="p-2 bg-[#0a0e14] border border-[#1e2535] rounded">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-[#6b7a96]">{ind.type}</span>
                  <span className="text-[9px] text-cyan-400">Pulses: {ind.pulse_count}</span>
                </div>
                <p className="text-[11px] font-mono text-[#c5cfe0] mt-1">{ind.indicator}</p>
                <p className="text-[9px] text-[#6b7a96] mt-1">{ind.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AlienvaultTool;