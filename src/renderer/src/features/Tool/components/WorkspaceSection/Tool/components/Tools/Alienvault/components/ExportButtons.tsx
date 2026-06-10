import React from 'react';
import { ScanResult } from '../types';

interface ExportButtonsProps {
  scan: ScanResult;
  accentColor: string;
}

const ExportButtons: React.FC<ExportButtonsProps> = ({ scan, accentColor }) => {
  const exportAsJSON = () => {
    const data = {
      indicator: scan.indicator,
      indicatorType: scan.indicatorType,
      timestamp: scan.timestamp,
      duration: scan.duration,
      result: scan.result,
      rawOutput: scan.rawOutput.join('\n'),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alienvault_${scan.indicator}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsTXT = () => {
    const lines = [
      `ALIENVAULT OTX INDICATOR REPORT`,
      `===============================`,
      `Indicator: ${scan.indicator}`,
      `Type: ${scan.indicatorType}`,
      `Date: ${new Date(scan.timestamp).toLocaleString()}`,
      `Duration: ${scan.duration}`,
      ``,
      `REPUTATION: ${scan.result?.reputation?.toUpperCase() || 'UNKNOWN'}`,
      `Activity Count: ${scan.result?.activityCount || 0}`,
      `Related Indicators: ${scan.result?.relatedIndicators || 0}`,
      `First Seen: ${scan.result?.firstSeen || 'N/A'}`,
      `Last Seen: ${scan.result?.lastSeen || 'N/A'}`,
      ``,
      `MALWARE FAMILIES:`,
      `-----------------`,
      ...(scan.result?.malwareFamilies || []),
      ``,
      `RELATED PULSES:`,
      `---------------`,
      ...(scan.result?.pulses || []).map(p => `- ${p.name}: ${p.description}`),
      ``,
      `RAW OUTPUT:`,
      `-----------`,
      ...scan.rawOutput,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alienvault_${scan.indicator}_${Date.now()}.txt`;
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
    </div>
  );
};

export default ExportButtons;