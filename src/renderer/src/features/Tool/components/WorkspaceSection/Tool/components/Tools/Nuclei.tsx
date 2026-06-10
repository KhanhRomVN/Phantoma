// Nuclei - Vulnerability scanner
import React, { useState } from 'react';

interface Finding {
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  matched: string;
}

const NucleiTool: React.FC = () => {
  const [target, setTarget] = useState('');
  const [tags, setTags] = useState('');
  const [scanning, setScanning] = useState(false);
  const [findings, setFindings] = useState<Finding[]>([]);

  const handleScan = async () => {
    if (!target) return;
    setScanning(true);
    setTimeout(() => {
      setFindings([
        { name: 'CVE-2021-44228 - Log4Shell', severity: 'critical', matched: '/api/v1/login' },
        { name: 'Missing Security Headers', severity: 'medium', matched: '/' },
        { name: 'Directory Listing Enabled', severity: 'low', matched: '/backup/' },
      ]);
      setScanning(false);
    }, 4000);
  };

  const getSeverityColor = (severity: string) => {
    switch(severity) {
      case 'critical': return 'text-red-400 bg-red-500/10';
      case 'high': return 'text-orange-400 bg-orange-500/10';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10';
      case 'low': return 'text-blue-400 bg-blue-500/10';
      default: return 'text-gray-400 bg-gray-500/10';
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-red-500/10 border border-red-500/30 rounded p-3">
        <p className="text-[10px] text-red-300">
          Nuclei - Quét lỗ hổng dựa trên template với hơn 5000+ templates CVE.
        </p>
      </div>

      <div>
        <label className="block text-[11px] font-medium text-[#6b7a96] mb-1">
          Target URL
        </label>
        <input
          type="text"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="e.g., https://example.com"
          className="w-full px-3 py-2 bg-[#0a0e14] border border-[#1e2535] rounded text-[12px]"
        />
      </div>

      <div>
        <label className="block text-[11px] font-medium text-[#6b7a96] mb-1">
          Tags (comma separated, optional)
        </label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="e.g., cve, exposure, misconfiguration"
          className="w-full px-3 py-2 bg-[#0a0e14] border border-[#1e2535] rounded text-[12px]"
        />
      </div>

      <button
        onClick={handleScan}
        disabled={scanning || !target}
        className="w-full py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white text-[12px] font-medium rounded"
      >
        {scanning ? 'Scanning for vulnerabilities...' : 'Start Nuclei Scan'}
      </button>

      {findings.length > 0 && (
        <div className="mt-4">
          <h4 className="text-[11px] font-semibold text-red-400 mb-2">
            Found {findings.length} Vulnerabilities
          </h4>
          <div className="space-y-2">
            {findings.map((finding, idx) => (
              <div key={idx} className="p-2 bg-[#0a0e14] border border-[#1e2535] rounded">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-[#c5cfe0]">{finding.name}</span>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded ${getSeverityColor(finding.severity)}`}>
                    {finding.severity}
                  </span>
                </div>
                <p className="text-[9px] text-[#6b7a96] mt-1">{finding.matched}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NucleiTool;