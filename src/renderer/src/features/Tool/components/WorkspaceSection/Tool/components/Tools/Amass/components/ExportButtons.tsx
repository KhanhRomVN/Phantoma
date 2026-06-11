import React from 'react';
import { AmassScanResult, SubdomainResult } from '../types';

interface ExportButtonsProps {
  scan: AmassScanResult;
  accentColor: string;
}

const ExportButtons: React.FC<ExportButtonsProps> = ({ scan, accentColor }) => {
  const exportAsJSON = () => {
    const data = {
      target: scan.target,
      mode: scan.mode,
      timestamp: scan.timestamp,
      duration: scan.duration,
      subdomains: scan.subdomains,
      stats: scan.stats,
      sourcesUsed: scan.sourcesUsed,
      rawOutput: scan.rawOutput.join('\n'),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `amass_${scan.target}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const exportAsTXT = () => {
    const lines = [
      `AMASS SUBDOMAIN REPORT`,
      `======================`,
      `Target: ${scan.target}`,
      `Mode: ${scan.mode}`,
      `Date: ${new Date(scan.timestamp).toLocaleString()}`,
      `Duration: ${scan.duration}`,
      ``,
      `SUBDOMAINS FOUND (${scan.subdomains.length}):`,
      `-------------------------------------------`,
      ...scan.subdomains.map(s => `${s.name}${s.source ? ` (Source: ${s.source})` : ''}`),
      ``,
      `RAW OUTPUT:`,
      `-----------`,
      ...scan.rawOutput,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `amass_${scan.target}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const exportSubdomainsOnly = () => {
    const text = scan.subdomains.map(s => s.name).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `amass_${scan.target}_subdomains.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const buttonStyle = {
    padding: '6px 12px',
    background: '#0d1117',
    border: `1px solid ${accentColor}30`,
    borderRadius: 4,
    color: accentColor,
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
  };
  
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={exportAsJSON} style={buttonStyle} title="Export as JSON">
        📄 JSON
      </button>
      <button onClick={exportAsTXT} style={buttonStyle} title="Export as TXT report">
        📝 TXT
      </button>
      <button onClick={exportSubdomainsOnly} style={buttonStyle} title="Export subdomains only">
        📋 Domains Only
      </button>
    </div>
  );
};

export default ExportButtons;