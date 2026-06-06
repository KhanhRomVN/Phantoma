import type { SourceCodeData } from '../types/sourcecode-data';
import React from 'react';
import { cn } from '../../../../../../../shared/lib/utils';

function SectionHeader({ accent = '#0af', children }: { accent?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-1 h-4 rounded-full" style={{ backgroundColor: accent }} />
      <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#c8d6f0] font-mono">
        {children}
      </h3>
    </div>
  );
}

export function SourceCodeLog({ data }: { data: SourceCodeData }) {
  const logs = [
    { timestamp: '2024-01-15 10:30:00', level: 'INFO', message: `Starting source code reconnaissance for ${data.repoInfo.repositoryName}` },
    { timestamp: '2024-01-15 10:30:02', level: 'INFO', message: 'Cloning repository metadata' },
    { timestamp: '2024-01-15 10:30:05', level: 'SUCCESS', message: `Repository owner: ${data.repoInfo.owner}` },
    { timestamp: '2024-01-15 10:30:08', level: 'INFO', message: 'Analyzing commit history' },
    { timestamp: '2024-01-15 10:30:12', level: 'SUCCESS', message: `Found ${data.repoInfo.commitHistory?.totalCommits} commits` },
    { timestamp: '2024-01-15 10:30:15', level: 'INFO', message: 'Enumerating contributors' },
    { timestamp: '2024-01-15 10:30:18', level: 'SUCCESS', message: `Identified ${data.developerInfo.contributors?.length} contributors` },
    { timestamp: '2024-01-15 10:30:21', level: 'INFO', message: 'Scanning for secrets and credentials' },
    { timestamp: '2024-01-15 10:30:25', level: 'WARN', message: `Found ${(data.secretExposure.apiKeys?.length || 0) + (data.secretExposure.secretTokens?.length || 0)} exposed secrets` },
    { timestamp: '2024-01-15 10:30:28', level: 'WARN', message: `Found ${data.secretExposure.databaseCredentials?.length || 0} database credentials` },
    { timestamp: '2024-01-15 10:30:31', level: 'INFO', message: 'Analyzing dependencies for vulnerabilities' },
    { timestamp: '2024-01-15 10:30:35', level: 'WARN', message: `Found ${[...(data.dependencyAnalysis.packageJson || []), ...(data.dependencyAnalysis.requirementsTxt || [])].filter(d => d.vulnerable).length} vulnerable dependencies` },
    { timestamp: '2024-01-15 10:30:38', level: 'INFO', message: 'Checking CI/CD configurations' },
    { timestamp: '2024-01-15 10:30:41', level: 'INFO', message: 'Discovering API endpoints and hidden routes' },
    { timestamp: '2024-01-15 10:30:44', level: 'SUCCESS', message: `Found ${data.appIntelligence.apiEndpoints?.length || 0} API endpoints` },
    { timestamp: '2024-01-15 10:30:47', level: 'SUCCESS', message: 'Source code reconnaissance completed' },
  ];
  
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'text-[#ff2d55]';
      case 'WARN': return 'text-[#f5a623]';
      case 'SUCCESS': return 'text-[#30d158]';
      default: return 'text-[#6a7a9a]';
    }
  };
  
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="bg-[#0d1017] border border-[#1c2333] rounded overflow-hidden">
        <div className="bg-[#0a0e14] px-3 py-2 border-b border-[#1c2333]">
          <SectionHeader accent="#0af">Scan Log</SectionHeader>
        </div>
        <div className="font-mono text-[10px]">
          {logs.map((log, idx) => (
            <div key={idx} className="flex border-b border-[#111827] hover:bg-[#111827] px-3 py-1.5">
              <div className="text-[#2a3548] w-36 flex-shrink-0">{log.timestamp}</div>
              <div className={`w-16 flex-shrink-0 font-bold ${getLevelColor(log.level)}`}>
                [{log.level}]
              </div>
              <div className="text-[#8da0c0] flex-1">{log.message}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}