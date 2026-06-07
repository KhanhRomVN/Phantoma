import type { ScanDomainData } from '../types/scan-data';
import React from 'react';
import { Terminal, XCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  detail?: string;
}

function generateLogs(data: ScanDomainData | null): LogEntry[] {
  if (!data) return [];

  const logs: LogEntry[] = [];
  const scanTime = data.scanTime;

  logs.push({
    timestamp: scanTime,
    level: 'info',
    message: `[SCAN] Starting domain scan for: ${data.target}`,
  });

  if (data.zoneTransfer) {
    const zt = data.zoneTransfer;
    logs.push({
      timestamp: scanTime,
      level: 'info',
      message: `[AXFR] Attempting zone transfer from ${zt.nameserver}`,
    });
    if (zt.success) {
      logs.push({
        timestamp: scanTime,
        level: 'success',
        message: `[AXFR] Zone transfer successful — ${zt.recordCount} records obtained`,
        detail: `Nameserver: ${zt.nameserver}`,
      });
    } else {
      logs.push({
        timestamp: scanTime,
        level: 'error',
        message: `[AXFR] Zone transfer failed`,
        detail: zt.error || 'AXFR denied by nameserver',
      });
    }
  }

  if (data.dnsBrute) {
    const db = data.dnsBrute;
    logs.push({
      timestamp: db.startedAt,
      level: 'info',
      message: `[BRUTE] Starting DNS brute-force with wordlist: ${db.wordlist}`,
      detail: `Wordlist size: ${db.wordlistSize.toLocaleString()} names`,
    });
    logs.push({
      timestamp: scanTime,
      level: 'success',
      message: `[BRUTE] Brute-force completed — ${db.resolvedCount} subdomains resolved`,
      detail: `Duration: ${db.duration}s, Unique IPs: ${new Set(db.resolved.map(r => r.ip)).size}`,
    });
    if (db.resolvedCount === 0) {
      logs.push({
        timestamp: scanTime,
        level: 'warning',
        message: `[BRUTE] No subdomains resolved from brute-force`,
      });
    }
  }

  logs.push({
    timestamp: scanTime,
    level: 'info',
    message: `[SCAN] Domain scan completed for: ${data.target}`,
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

export function ScanLog({ data }: { data: ScanDomainData }) {
  const logs = generateLogs(data);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0f1319]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 h-8 bg-[#0a0e14] border-b border-[#1c2333] shrink-0">
        <Terminal className="w-3.5 h-3.5 text-[#30d158]" />
        <span className="text-[11px] font-mono font-bold text-[#30d158] uppercase tracking-wider">
          Scan Log
        </span>
        <span className="text-[10px] font-mono text-[#3d4a61] ml-auto">
          {logs.length} entries
        </span>
      </div>

      {/* Log entries */}
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

      {/* Status bar */}
      <div className="flex items-center gap-2 px-3 h-6 bg-[#0a0e14] border-t border-[#1c2333] shrink-0">
        <span className="text-[9px] font-mono text-[#3d4a61]">
          Target: <span className="text-[#6a7a9a]">{data.target}</span>
        </span>
        <div className="w-px h-3 bg-[#1c2333]" />
        <span className="text-[9px] font-mono text-[#3d4a61]">
          Zone Transfer: <span style={{ color: data.zoneTransfer?.success ? '#30d158' : '#ff2d55' }}>
            {data.zoneTransfer?.success ? 'OK' : 'FAIL'}
          </span>
        </span>
        <div className="w-px h-3 bg-[#1c2333]" />
        <span className="text-[9px] font-mono text-[#3d4a61]">
          Brute: <span className="text-[#f5a623]">{data.dnsBrute?.resolvedCount ?? 0} resolved</span>
        </span>
      </div>
    </div>
  );
}