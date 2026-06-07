import type { IPServerData } from '../types/ip-server-data';
import React from 'react';
import { cn } from '../../../../../../../shared/lib/utils';

function SectionHeader({ accent = '#0af', children }: { accent?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-1 h-4 rounded-full" style={{ backgroundColor: accent }} />
      <h3 className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#c8d6f0] font-mono">
        {children}
      </h3>
    </div>
  );
}

export function IPServerLog({ data }: { data: IPServerData }) {
  // Mock log entries based on scan data
  const logs = [
    { timestamp: '2024-01-15 10:30:00', level: 'INFO', message: `Starting reconnaissance scan for target ${data.target}` },
    { timestamp: '2024-01-15 10:30:01', level: 'INFO', message: 'DNS resolution completed' },
    { timestamp: '2024-01-15 10:30:02', level: 'SUCCESS', message: `IP address resolved to ${data.networkInfo.ipAddress}` },
    { timestamp: '2024-01-15 10:30:03', level: 'INFO', message: 'Starting port scan (1-10000)' },
    { timestamp: '2024-01-15 10:30:15', level: 'SUCCESS', message: `Discovered ${data.ports.filter(p => p.state === 'open').length} open ports` },
    { timestamp: '2024-01-15 10:30:16', level: 'INFO', message: 'Initiating banner grabbing' },
    { timestamp: '2024-01-15 10:30:20', level: 'WARN', message: 'Rate limiting detected on port 80' },
    { timestamp: '2024-01-15 10:30:25', level: 'SUCCESS', message: 'OS fingerprinting completed' },
    { timestamp: '2024-01-15 10:30:26', level: 'INFO', message: `OS identified: ${data.osDetection.operatingSystem} (${data.osDetection.kernelVersion})` },
    { timestamp: '2024-01-15 10:30:30', level: 'WARN', message: `Found ${data.securityFindings.length} potential vulnerabilities` },
    { timestamp: '2024-01-15 10:30:31', level: 'CRITICAL', message: `CVE-2023-38408 detected - OpenSSH vulnerability` },
    { timestamp: '2024-01-15 10:30:35', level: 'WARN', message: 'Infrastructure exposure scan starting' },
    { timestamp: '2024-01-15 10:30:40', level: 'WARN', message: `Detected ${Object.values(data.infrastructureExposure).filter(v => v === true).length} exposed services` },
    { timestamp: '2024-01-15 10:30:45', level: 'INFO', message: 'Generating risk assessment' },
    { timestamp: '2024-01-15 10:30:50', level: 'SUCCESS', message: 'Scan completed successfully' },
  ];
  
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'text-[#ff2d55]';
      case 'WARN': return 'text-[#f5a623]';
      case 'SUCCESS': return 'text-[#30d158]';
      default: return 'text-[#c8d6f0]';
    }
  };
  
  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="bg-[#0d1017] border border-[#1c2333] rounded overflow-hidden">
        <div className="bg-[#0a0e14] px-3 py-2 border-b border-[#1c2333]">
          <SectionHeader accent="#0af">Scan Log</SectionHeader>
        </div>
        <div className="font-mono text-[11px]">
          {logs.map((log, idx) => (
            <div key={idx} className="flex border-b border-[#111827] hover:bg-[#111827] px-3 py-1.5">
              <div className="text-[#c8d6f0] w-36 flex-shrink-0">{log.timestamp}</div>
              <div className={`w-16 flex-shrink-0 font-bold ${getLevelColor(log.level)}`}>
                [{log.level}]
              </div>
              <div className="text-[#c8d6f0] flex-1">{log.message}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}