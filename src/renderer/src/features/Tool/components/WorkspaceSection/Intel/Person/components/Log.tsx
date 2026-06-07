import type { PersonData } from '../types/person-data';
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

export function PersonLog({ data }: { data: PersonData }) {
  const logs = [
    { timestamp: '2024-01-15 10:30:00', level: 'INFO', message: `Starting person reconnaissance for ${data.identityInfo.fullName}` },
    { timestamp: '2024-01-15 10:30:03', level: 'INFO', message: 'Gathering identity information' },
    { timestamp: '2024-01-15 10:30:05', level: 'SUCCESS', message: `Identified ${data.identityInfo.alias?.length || 0} aliases` },
    { timestamp: '2024-01-15 10:30:08', level: 'INFO', message: 'Scanning contact information' },
    { timestamp: '2024-01-15 10:30:11', level: 'SUCCESS', message: `Found ${data.contactInfo.email?.length || 0} email addresses` },
    { timestamp: '2024-01-15 10:30:14', level: 'INFO', message: 'Enumerating social media profiles' },
    { timestamp: '2024-01-15 10:30:17', level: 'SUCCESS', message: `Found ${Object.values(data.socialMedia).filter(v => v).length} active social profiles` },
    { timestamp: '2024-01-15 10:30:20', level: 'INFO', message: 'Analyzing technical footprint' },
    { timestamp: '2024-01-15 10:30:23', level: 'SUCCESS', message: `Found ${data.technicalFootprint.repositoryContributions?.length || 0} repository contributions` },
    { timestamp: '2024-01-15 10:30:26', level: 'INFO', message: 'Checking breach databases for leaks' },
    { timestamp: '2024-01-15 10:30:29', level: 'WARN', message: `Found ${data.leakExposure.passwordLeaks?.length || 0} password leaks` },
    { timestamp: '2024-01-15 10:30:32', level: 'WARN', message: `Found ${data.leakExposure.credentialLeaks?.length || 0} credential leaks` },
    { timestamp: '2024-01-15 10:30:35', level: 'INFO', message: 'Generating person risk assessment' },
    { timestamp: '2024-01-15 10:30:38', level: 'SUCCESS', message: 'Person reconnaissance completed' },
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