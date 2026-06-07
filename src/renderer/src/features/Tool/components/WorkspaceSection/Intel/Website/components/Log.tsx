import type { WebsiteData } from '../types/website-data';
import React from 'react';

function SectionHeader({
  accent = '#0af',
  children,
}: {
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-1 h-4 rounded-full" style={{ backgroundColor: accent }} />
      <h3 className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#c8d6f0] font-mono">
        {children}
      </h3>
    </div>
  );
}

export function WebsiteLog({ data }: { data: WebsiteData }) {
  const logs = [
    {
      timestamp: '2024-01-15 10:30:00',
      level: 'INFO',
      message: `Starting web application reconnaissance for ${data.target}`,
    },
    { timestamp: '2024-01-15 10:30:02', level: 'INFO', message: 'Crawling URL structure' },
    {
      timestamp: '2024-01-15 10:30:08',
      level: 'SUCCESS',
      message: `Discovered ${data.appStructure.urlStructure.length} unique URLs`,
    },
    {
      timestamp: '2024-01-15 10:30:12',
      level: 'INFO',
      message: 'Enumerating endpoints and API routes',
    },
    {
      timestamp: '2024-01-15 10:30:18',
      level: 'SUCCESS',
      message: `Found ${data.appStructure.endpointMapping.length} API endpoints`,
    },
    {
      timestamp: '2024-01-15 10:30:22',
      level: 'WARN',
      message: `Discovered ${data.appStructure.hiddenPaths.length} hidden paths`,
    },
    {
      timestamp: '2024-01-15 10:30:25',
      level: 'INFO',
      message: 'Analyzing authentication surface',
    },
    {
      timestamp: '2024-01-15 10:30:28',
      level: 'SUCCESS',
      message: `Login page: ${data.authSurface.loginPage}`,
    },
    {
      timestamp: '2024-01-15 10:30:31',
      level: 'WARN',
      message: `MFA ${data.authSurface.mfa ? 'enabled' : 'disabled'} - security ${data.authSurface.mfa ? 'good' : 'risk'}`,
    },
    { timestamp: '2024-01-15 10:30:34', level: 'INFO', message: 'Scanning client-side JavaScript' },
    {
      timestamp: '2024-01-15 10:30:38',
      level: 'SUCCESS',
      message: `Found ${data.clientSideAnalysis.jsFiles.length} JavaScript files`,
    },
    { timestamp: '2024-01-15 10:30:41', level: 'INFO', message: 'Checking for vulnerabilities' },
    {
      timestamp: '2024-01-15 10:30:45',
      level: 'WARN',
      message: `Detected ${data.webVulnerabilities.length} vulnerabilities`,
    },
    {
      timestamp: '2024-01-15 10:30:48',
      level: 'CRITICAL',
      message: `${data.webVulnerabilities.filter((v) => v.severity === 'CRITICAL').length} critical issues found`,
    },
    { timestamp: '2024-01-15 10:30:51', level: 'INFO', message: 'Fingerprinting technologies' },
    {
      timestamp: '2024-01-15 10:30:54',
      level: 'SUCCESS',
      message: `Tech stack: ${data.technologyDetection.frontendFramework.join(', ')} + ${data.technologyDetection.backendFramework.join(', ')}`,
    },
    {
      timestamp: '2024-01-15 10:30:57',
      level: 'SUCCESS',
      message: 'Web application reconnaissance completed',
    },
  ];

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'text-[#ff2d55]';
      case 'WARN':
        return 'text-[#f5a623]';
      case 'SUCCESS':
        return 'text-[#30d158]';
      default:
        return 'text-[#c8d6f0]';
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
            <div
              key={idx}
              className="flex border-b border-[#111827] hover:bg-[#111827] px-3 py-1.5"
            >
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
