import React from 'react';
import { ScanResult } from '../types';

interface ExportButtonsProps {
  scan: ScanResult;
  accentColor: string;
}

const ExportButtons: React.FC<ExportButtonsProps> = ({ scan, accentColor }) => {
  const exportAsJSON = () => {
    const data = {
      target: scan.target,
      scanType: scan.scanType,
      timestamp: scan.timestamp,
      duration: scan.duration,
      ports: scan.ports,
      host: scan.host,
      rawOutput: scan.rawOutput.join('\n'),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nmap_${scan.target}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsXML = () => {
    const rawXml = scan.rawOutput.join('\n');
    const blob = new Blob([rawXml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nmap_${scan.target}_${Date.now()}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsTXT = () => {
    const lines = [
      `NMAP SCAN REPORT`,
      `================`,
      `Target: ${scan.target}`,
      `Scan Type: ${scan.scanType}`,
      `Date: ${new Date(scan.timestamp).toLocaleString()}`,
      `Duration: ${scan.duration}`,
      ``,
      `OPEN PORTS:`,
      `-----------`,
      ...scan.ports
        .filter((p) => p.state === 'open')
        .map((p) => `${p.port}/${p.protocol} - ${p.service}${p.version ? ` (${p.version})` : ''}`),
      ``,
      `RAW OUTPUT:`,
      `-----------`,
      ...scan.rawOutput,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nmap_${scan.target}_${Date.now()}.txt`;
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
      <button onClick={exportAsXML} style={buttonStyle} title="Export as XML (raw)">
        📋 XML
      </button>
      <button onClick={exportAsTXT} style={buttonStyle} title="Export as TXT report">
        📝 TXT
      </button>
    </div>
  );
};

export default ExportButtons;