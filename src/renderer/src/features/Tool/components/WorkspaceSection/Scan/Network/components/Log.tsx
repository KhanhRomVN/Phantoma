import type { ScanNetworkData } from '../types/scan-network-data';
import React from 'react';
import { Terminal, XCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  detail?: string;
}

function generateLogs(data: ScanNetworkData | null): LogEntry[] {
  if (!data) return [];

  const logs: LogEntry[] = [];
  const scanTime = data.scanTime;

  logs.push({
    timestamp: scanTime,
    level: 'info',
    message: `[SCAN] Starting network scan for: ${data.target}`,
  });

  if (data.pingSweep) {
    const ps = data.pingSweep;
    logs.push({
      timestamp: ps.startedAt,
      level: 'info',
      message: `[PING] Starting ping sweep — ${ps.config.target} (${ps.config.method.toUpperCase()})`,
      detail: `Timeout: ${ps.config.timeout}ms`,
    });
    logs.push({
      timestamp: scanTime,
      level: 'success',
      message: `[PING] Sweep completed — ${ps.liveHosts}/${ps.totalHosts} hosts alive`,
      detail: `Duration: ${ps.duration}s`,
    });
    if (ps.liveHosts === 0) {
      logs.push({
        timestamp: scanTime,
        level: 'warning',
        message: `[PING] No live hosts found in target range`,
      });
    }
  }

  if (data.portScan) {
    const pt = data.portScan;
    logs.push({
      timestamp: pt.startedAt,
      level: 'info',
      message: `[PORT] Starting port scan — ${pt.config.target}:${pt.config.ports} (${pt.config.protocol.toUpperCase()})`,
    });
    logs.push({
      timestamp: scanTime,
      level: 'success',
      message: `[PORT] Scan completed — ${pt.openPorts} open, ${pt.filteredPorts} filtered, ${pt.closedPorts} closed`,
      detail: `Scanned ${pt.totalScanned} ports in ${pt.duration}s`,
    });
    if (pt.openPorts > 10) {
      logs.push({
        timestamp: scanTime,
        level: 'warning',
        message: `[PORT] High number of open ports detected (${pt.openPorts})`,
      });
    }
  }

  if (data.serviceDetection) {
    const sd = data.serviceDetection;
    logs.push({
      timestamp: sd.startedAt,
      level: 'info',
      message: `[SERVICE] Starting service detection — ${sd.target}`,
    });
    logs.push({
      timestamp: scanTime,
      level: 'success',
      message: `[SERVICE] Detection completed — ${sd.identifiedServices} services identified`,
      detail: `Duration: ${sd.duration}s`,
    });
  }

  if (data.osFingerprint) {
    const os = data.osFingerprint;
    logs.push({
      timestamp: os.startedAt,
      level: 'info',
      message: `[OS] Starting OS fingerprinting — ${os.target}`,
    });
    logs.push({
      timestamp: scanTime,
      level: 'success',
      message: `[OS] Fingerprint completed — ${os.operatingSystem} (${os.accuracy}% accuracy)`,
      detail: `Duration: ${os.duration}s`,
    });
    if (os.accuracy < 70) {
      logs.push({
        timestamp: scanTime,
        level: 'warning',
        message: `[OS] Low confidence fingerprint (${os.accuracy}%)`,
      });
    }
  }

  logs.push({
    timestamp: scanTime,
    level: 'info',
    message: `[SCAN] Network scan completed for: ${data.target}`,
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

export function NetworkLog({ data }: { data: ScanNetworkData }) {
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
          Target: <span className="text-[#ff9f0a]">{data.target}</span>
        </span>
        <div className="w-px h-3 bg-[#1c2333]" />
        <span className="text-[9px] font-mono text-[#3d4a61]">
          Live: <span className="text-[#30d158]">{data.pingSweep?.liveHosts ?? 0}</span>
        </span>
        <div className="w-px h-3 bg-[#1c2333]" />
        <span className="text-[9px] font-mono text-[#3d4a61]">
          Ports: <span className="text-[#ff9f0a]">{data.portScan?.openPorts ?? 0} open</span>
        </span>
      </div>
    </div>
  );
}