import type { ScanNetworkData } from '../types/scan-network-data';
import React, { useMemo } from 'react';

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

function StatBox({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent: string }) {
  return (
    <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2.5 flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest font-mono text-[#2a3548]">{label}</span>
      <span className="text-[16px] font-bold font-mono leading-none" style={{ color: accent }}>
        {value}
      </span>
      {sub && <span className="text-[9px] font-mono text-[#3d4a61]">{sub}</span>}
    </div>
  );
}

function StateBadge({ state }: { state: string }) {
  const config: Record<string, { color: string; label: string }> = {
    open: { color: '#30d158', label: 'OPEN' },
    closed: { color: '#3a4558', label: 'CLOSED' },
    filtered: { color: '#f5a623', label: 'FILTERED' },
  };
  const c = config[state] || { color: '#3a4558', label: state.toUpperCase() };
  return (
    <span
      className="text-[9px] font-bold font-mono uppercase px-1.5 py-0.5 rounded-sm"
      style={{ color: c.color, border: `1px solid ${c.color}40`, background: `${c.color}12` }}
    >
      {c.label}
    </span>
  );
}

export function NetworkPortScan({ data }: { data: ScanNetworkData }) {
  const portScan = data.portScan;

  const openResults = useMemo(() => {
    if (!portScan?.results) return [];
    return portScan.results.filter((r) => r.state === 'open');
  }, [portScan]);

  const otherResults = useMemo(() => {
    if (!portScan?.results) return [];
    return portScan.results.filter((r) => r.state !== 'open');
  }, [portScan]);

  if (!portScan) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-[#0f1319]">
        <div className="text-[32px] opacity-15">🔌</div>
        <div className="text-[11px] font-mono text-[#2a3548]">
          No port scan data available. Run a port scan first.
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        {/* Stat boxes */}
        <div className="col-span-2 grid grid-cols-5 gap-2 mb-1">
          <StatBox label="Target" value={portScan.config.target} accent="#0af" />
          <StatBox label="Port Range" value={portScan.config.ports} accent="#5e5ce6" />
          <StatBox label="Protocol" value={portScan.config.protocol.toUpperCase()} accent="#ff9f0a" />
          <StatBox label="Scanned" value={portScan.totalScanned} sub="ports" accent="#f5a623" />
          <StatBox label="Duration" value={`${portScan.duration}s`} accent="#ff9f0a" />
        </div>

        {/* Port distribution */}
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="Open" value={portScan.openPorts} sub="accessible" accent="#30d158" />
          <StatBox label="Filtered" value={portScan.filteredPorts} sub="firewalled" accent="#f5a623" />
          <StatBox label="Closed" value={portScan.closedPorts} sub="not responding" accent="#3a4558" />
          <StatBox label="Total Results" value={portScan.results.length} sub="interesting" accent="#0af" />
        </div>

        {/* Open Ports Table */}
        {openResults.length > 0 && (
          <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded overflow-hidden">
            <div className="px-3 py-2 border-b border-[#1c2333] bg-[#0a0e14]">
              <SectionHeader accent="#30d158">Open Ports ({openResults.length})</SectionHeader>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-mono">
                <thead>
                  <tr className="border-b border-[#1c2333] bg-[#060810]">
                    <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[10px] uppercase w-12">Port</th>
                    <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[10px] uppercase">Protocol</th>
                    <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[10px] uppercase">State</th>
                    <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[10px] uppercase">Service</th>
                    <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[10px] uppercase">Banner</th>
                  </tr>
                </thead>
                <tbody>
                  {openResults.map((port, idx) => (
                    <tr key={idx} className="border-b border-[#111827] hover:bg-[#111827] transition-colors">
                      <td className="p-2 text-[12px] text-[#0af] font-mono">{port.port}</td>
                      <td className="p-2 text-[11px] text-[#c8d6f0]">{port.protocol.toUpperCase()}</td>
                      <td className="p-2"><StateBadge state={port.state} /></td>
                      <td className="p-2 text-[11px] text-[#c8d6f0]">{port.service}</td>
                      <td className="p-2 text-[10px] text-[#3d4a61] truncate max-w-[200px]">{port.banner || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Other Ports Table */}
        {otherResults.length > 0 && (
          <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded overflow-hidden">
            <div className="px-3 py-2 border-b border-[#1c2333] bg-[#0a0e14]">
              <SectionHeader accent="#3a4558">Other Ports ({otherResults.length})</SectionHeader>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-mono">
                <thead>
                  <tr className="border-b border-[#1c2333] bg-[#060810]">
                    <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[10px] uppercase w-12">Port</th>
                    <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[10px] uppercase">Protocol</th>
                    <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[10px] uppercase">State</th>
                    <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[10px] uppercase">Service</th>
                  </tr>
                </thead>
                <tbody>
                  {otherResults.map((port, idx) => (
                    <tr key={idx} className="border-b border-[#111827] hover:bg-[#111827] transition-colors">
                      <td className="p-2 text-[12px] text-[#3d4a61] font-mono">{port.port}</td>
                      <td className="p-2 text-[11px] text-[#2a3548]">{port.protocol.toUpperCase()}</td>
                      <td className="p-2"><StateBadge state={port.state} /></td>
                      <td className="p-2 text-[11px] text-[#3d4a61]">{port.service}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* No results */}
        {portScan.results.length === 0 && (
          <div className="col-span-2 flex items-center justify-center p-8 bg-[#0d1017] border border-[#1c2333] rounded">
            <span className="text-[11px] font-mono text-[#3d4a61]">No ports discovered in range</span>
          </div>
        )}
      </div>
    </div>
  );
}