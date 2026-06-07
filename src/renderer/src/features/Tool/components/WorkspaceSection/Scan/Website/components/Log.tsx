import type { ScanWebsiteData } from '../types/scan-website-data';
import React from 'react';
import { Terminal, XCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  detail?: string;
}

function generateLogs(data: ScanWebsiteData | null): LogEntry[] {
  if (!data) return [];

  const logs: LogEntry[] = [];
  const scanTime = data.scanTime;

  logs.push({
    timestamp: scanTime,
    level: 'info',
    message: `[SCAN] Starting web application scan for: ${data.target}`,
  });

  if (data.fuzz) {
    const fz = data.fuzz;
    logs.push({
      timestamp: fz.startedAt,
      level: 'info',
      message: `[FUZZ] Starting directory fuzzing — ${fz.config.url}`,
      detail: `Wordlist: ${fz.config.wordlist} (${fz.totalTested} paths)`,
    });
    logs.push({
      timestamp: scanTime,
      level: 'success',
      message: `[FUZZ] Fuzzing completed — ${fz.totalFound} paths discovered`,
      detail: `Duration: ${fz.duration}s`,
    });
  }

  if (data.vulnScan) {
    const vs = data.vulnScan;
    logs.push({
      timestamp: vs.startedAt,
      level: 'info',
      message: `[VULN] Starting vulnerability scan — ${vs.url}`,
    });
    if (vs.critical > 0) {
      logs.push({
        timestamp: scanTime,
        level: 'error',
        message: `[VULN] ${vs.critical} CRITICAL vulnerabilities found!`,
        detail: 'Immediate remediation required',
      });
    }
    if (vs.high > 0) {
      logs.push({
        timestamp: scanTime,
        level: 'warning',
        message: `[VULN] ${vs.high} HIGH severity findings`,
      });
    }
    logs.push({
      timestamp: scanTime,
      level: 'success',
      message: `[VULN] Scan completed — ${vs.totalFindings} total findings`,
      detail: `Critical: ${vs.critical}, High: ${vs.high}, Medium: ${vs.medium}, Low: ${vs.low}`,
    });
  }

  if (data.sslTest) {
    const ssl = data.sslTest;
    logs.push({
      timestamp: ssl.startedAt,
      level: 'info',
      message: `[SSL] Starting SSL/TLS test — ${ssl.host}`,
    });
    if (ssl.heartbleed || ssl.poodle || ssl.robot) {
      logs.push({
        timestamp: scanTime,
        level: 'error',
        message: `[SSL] SSL vulnerability detected!`,
        detail: [ssl.heartbleed ? 'Heartbleed' : '', ssl.poodle ? 'POODLE' : '', ssl.robot ? 'ROBOT' : ''].filter(Boolean).join(', '),
      });
    }
    logs.push({
      timestamp: scanTime,
      level: 'success',
      message: `[SSL] Test completed — Grade: ${ssl.grade}`,
      detail: `${ssl.tlsVersions.length} TLS versions, ${ssl.weakCiphers.length} weak ciphers`,
    });
  }

  if (data.headers) {
    const hd = data.headers;
    logs.push({
      timestamp: hd.startedAt,
      level: 'info',
      message: `[HEADERS] Checking security headers — ${hd.url}`,
    });
    logs.push({
      timestamp: scanTime,
      level: 'success',
      message: `[HEADERS] Check completed — Grade: ${hd.grade}`,
      detail: `Present: ${hd.present}, Missing: ${hd.missing}, Misconfigured: ${hd.misconfigured}`,
    });
    if (hd.missing > 0) {
      logs.push({
        timestamp: scanTime,
        level: 'warning',
        message: `[HEADERS] ${hd.missing} security headers missing`,
      });
    }
  }

  logs.push({
    timestamp: scanTime,
    level: 'info',
    message: `[SCAN] Web application scan completed for: ${data.target}`,
  });

  return logs;
}

const LOG_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
};

const LOG_COLORS: Record<string, { icon: string; text: string; bg: string }> = {
  info: { icon: '#0af', text: '#c8d6f0', bg: '#0af08' },
  success: { icon: '#30d158', text: '#30d158', bg: '#30d15808' },
  warning: { icon: '#f5a623', text: '#f5a623', bg: '#f5a62308' },
  error: { icon: '#ff2d55', text: '#ff2d55', bg: '#ff2d5508' },
};

export function WebsiteLog({ data }: { data: ScanWebsiteData }) {
  const logs = generateLogs(data);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0f1319]">
      <div className="flex items-center gap-2 px-3 h-8 bg-[#0a0e14] border-b border-[#1c2333] shrink-0">
        <Terminal className="w-3.5 h-3.5 text-[#30d158]" />
        <span className="text-[11px] font-mono font-bold text-[#30d158] uppercase tracking-wider">
          Scan Log
        </span>
        <span className="text-[10px] font-mono text-[#3d4a61] ml-auto">
          {logs.length} entries
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 font-mono text-[11px]">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-[#3d4a61]">No log entries</span>
          </div>
        ) : (
          <div className="space-y-0.5">
            {logs.map((entry, idx) => {
              const Icon = LOG_ICONS[entry.level];
              const colors = LOG_COLORS[entry.level];
              return (
                <div
                  key={idx}
                  className="flex items-start gap-2 px-2 py-1 rounded hover:bg-[#111827] transition-colors"
                  style={{ background: colors.bg }}
                >
                  <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: colors.icon }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[10px] text-[#2a3548] shrink-0">{entry.timestamp}</span>
                      <span style={{ color: colors.text }}>{entry.message}</span>
                    </div>
                    {entry.detail && (
                      <div className="text-[10px] text-[#3d4a61] mt-0.5 ml-5">{entry.detail}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 px-3 h-6 bg-[#0a0e14] border-t border-[#1c2333] shrink-0">
        <span className="text-[9px] font-mono text-[#3d4a61]">
          Target: <span className="text-[#ff2d55]">{data.target}</span>
        </span>
        <div className="w-px h-3 bg-[#1c2333]" />
        <span className="text-[9px] font-mono text-[#3d4a61]">
          Vulns: <span className="text-[#ff2d55]">{data.vulnScan?.critical ?? 0} critical</span>
        </span>
        <div className="w-px h-3 bg-[#1c2333]" />
        <span className="text-[9px] font-mono text-[#3d4a61]">
          SSL: <span className="text-[#30d158]">{data.sslTest?.grade ?? 'N/A'}</span>
        </span>
      </div>
    </div>
  );
}