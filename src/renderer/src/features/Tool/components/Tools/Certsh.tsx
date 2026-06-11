// Cert.sh - Certificate transparency logs
import React, { useState } from 'react';

interface Certificate {
  issuer: string;
  not_before: string;
  not_after: string;
  subject_name: string;
}

const CertshTool: React.FC = () => {
  const [domain, setDomain] = useState('');
  const [scanning, setScanning] = useState(false);
  const [certs, setCerts] = useState<Certificate[]>([]);

  const handleSearch = async () => {
    if (!domain) return;
    setScanning(true);
    setTimeout(() => {
      setCerts([
        {
          issuer: "Let's Encrypt",
          not_before: '2024-01-01',
          not_after: '2025-01-01',
          subject_name: 'example.com',
        },
        {
          issuer: 'DigiCert',
          not_before: '2023-06-01',
          not_after: '2024-06-01',
          subject_name: '*.example.com',
        },
      ]);
      setScanning(false);
    }, 1500);
  };

  return (
    <div className="space-y-4">
      <div className="bg-teal-500/10 border border-teal-500/30 rounded p-3">
        <p className="text-[10px] text-teal-300">
          Cert.sh - Tra cứu certificate transparency logs, tìm subdomain từ SSL certificates.
        </p>
      </div>

      <div>
        <label className="block text-[11px] font-medium text-[#6b7a96] mb-1">Domain Name</label>
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="e.g., example.com"
          className="w-full px-3 py-2 bg-[#0a0e14] border border-[#1e2535] rounded text-[12px]"
        />
      </div>

      <button
        onClick={handleSearch}
        disabled={scanning || !domain}
        className="w-full py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 text-white text-[12px] font-medium rounded"
      >
        {scanning ? 'Fetching certificates...' : 'Query Certificate Logs'}
      </button>

      {certs.length > 0 && (
        <div className="mt-4">
          <h4 className="text-[11px] font-semibold text-teal-400 mb-2">
            Found {certs.length} Certificates
          </h4>
          <div className="space-y-2">
            {certs.map((cert, idx) => (
              <div key={idx} className="p-2 bg-[#0a0e14] border border-[#1e2535] rounded">
                <p className="text-[10px] font-medium text-cyan-400">{cert.subject_name}</p>
                <div className="grid grid-cols-2 gap-1 mt-1 text-[9px] text-[#6b7a96]">
                  <span>Issuer: {cert.issuer}</span>
                  <span>
                    Valid: {cert.not_before} → {cert.not_after}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CertshTool;
