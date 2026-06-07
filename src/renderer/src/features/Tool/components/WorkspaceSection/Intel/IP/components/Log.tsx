import type { IPIntelData } from '../types/ip-intel-data';
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

export function IPServerLog({ data }: { data: IPIntelData }) {
  const logs = [
    { timestamp: '2024-01-15 10:30:00', level: 'INFO', message: `Starting passive intelligence gathering for IP ${data.target}` },
    { timestamp: '2024-01-15 10:30:01', level: 'INFO', message: 'Querying IP-API for GeoIP data' },
    { timestamp: '2024-01-15 10:30:02', level: 'SUCCESS', message: `Location: ${data.networkInfo.geoIp.city}, ${data.networkInfo.geoIp.country}` },
    { timestamp: '2024-01-15 10:30:03', level: 'INFO', message: 'Querying BGP for ASN data' },
    { timestamp: '2024-01-15 10:30:04', level: 'SUCCESS', message: `ASN: ${data.networkInfo.asn}` },
    { timestamp: '2024-01-15 10:30:05', level: 'INFO', message: 'Performing reverse DNS lookup' },
    { timestamp: '2024-01-15 10:30:06', level: 'SUCCESS', message: `PTR: ${data.networkInfo.reverseDns || 'none'}` },
    { timestamp: '2024-01-15 10:30:07', level: 'INFO', message: 'Querying Shodan API (cached data)' },
    { timestamp: '2024-01-15 10:30:08', level: 'SUCCESS', message: `Shodan: ${data.shodanIntel.openPorts} ports, ${data.shodanIntel.services.length} services` },
    { timestamp: '2024-01-15 10:30:09', level: 'INFO', message: 'Querying DNSDB for reverse IP' },
    { timestamp: '2024-01-15 10:30:10', level: 'SUCCESS', message: `Reverse IP: ${data.reverseIP.length} domains found` },
    { timestamp: '2024-01-15 10:30:11', level: 'SUCCESS', message: 'Passive intelligence gathering completed' },
  ];

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'WARN': return 'text-[#f5a623]';
      case 'SUCCESS': return 'text-[#30d158]';
      default: return 'text-[#c8d6f0]';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="bg-[#0d1017] border border-[#1c2333] rounded overflow-hidden">
        <div className="bg-[#0a0e14] px-3 py-2 border-b border-[#1c2333]">
          <SectionHeader accent="#0af">Intel Log</SectionHeader>
        </div>
        <div className="font-mono text-[11px]">
          {logs.map((log, idx) => (
            <div key={idx} className="flex border-b border-[#111827] hover:bg-[#111827] px-3 py-1.5">
              <div className="text-[#4a5a7a] w-36 flex-shrink-0">{log.timestamp}</div>
              <div className={`w-20 flex-shrink-0 font-bold ${getLevelColor(log.level)}`}>
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