import type { IPServerData, PortService as PortServiceType } from '../types/ip-server-data';
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

function RiskBadge({ severity }: { severity?: string }) {
  const config: Record<string, { color: string; label: string }> = {
    CRITICAL: { color: '#ff2d55', label: 'CRITICAL' },
    HIGH: { color: '#ff6b35', label: 'HIGH' },
    MEDIUM: { color: '#f5a623', label: 'MEDIUM' },
    LOW: { color: '#30d158', label: 'LOW' },
  };
  if (!severity || !config[severity]) return null;
  const c = config[severity];
  return (
    <span className="text-[8px] font-bold font-mono uppercase px-1.5 py-0.5 rounded-sm" style={{ color: c.color, border: `1px solid ${c.color}40`, background: `${c.color}12` }}>
      {c.label}
    </span>
  );
}

function StatBox({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent: string }) {
  return (
    <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2.5 flex flex-col gap-0.5">
      <span className="text-[9px] uppercase tracking-widest font-mono text-[#3a4558]">{label}</span>
      <span className="text-[15px] font-bold font-mono leading-none" style={{ color: accent }}>
        {value}
      </span>
      {sub && <span className="text-[8px] font-mono text-[#2a3548]">{sub}</span>}
    </div>
  );
}

export function PortService({ data }: { data: IPServerData }) {
  const openPorts = data.ports.filter(p => p.state === 'open');
  const filteredPorts = data.ports.filter(p => p.state === 'filtered');
  const closedPorts = data.ports.filter(p => p.state === 'closed');
  
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="Open Ports" value={openPorts.length} sub="accessible" accent="#30d158" />
          <StatBox label="Filtered" value={filteredPorts.length} sub="firewalled" accent="#f5a623" />
          <StatBox label="Closed" value={closedPorts.length} sub="not responding" accent="#3a4558" />
          <StatBox label="Total Scanned" value={data.ports.length} sub="ports" accent="#0af" />
        </div>
        
        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="border-b border-[#1c2333] bg-[#0a0e14]">
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[9px] uppercase">Port</th>
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[9px] uppercase">Protocol</th>
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[9px] uppercase">State</th>
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[9px] uppercase">Service</th>
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[9px] uppercase">Banner</th>
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[9px] uppercase">Version</th>
                </tr>
              </thead>
              <tbody>
                {data.ports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-[10px] font-mono text-[#3a4558]">
                      No ports scanned
                    </td>
                  </tr>
                ) : (
                  data.ports.map((port, idx) => (
                    <tr key={idx} className="border-b border-[#111827] hover:bg-[#111827] transition-colors">
                      <td className="p-2 font-mono text-[11px] text-[#0af]">{port.port}</td>
                      <td className="p-2 text-[10px] text-[#8da0c0]">{port.protocol}</td>
                      <td className="p-2">
                        <span className={port.state === 'open' ? 'text-[#30d158]' : port.state === 'filtered' ? 'text-[#f5a623]' : 'text-[#3a4558]'}>
                          {port.state}
                        </span>
                      </td>
                      <td className="p-2 text-[10px] text-[#6a7a9a]">{port.service}</td>
                      <td className="p-2 text-[10px] text-[#6a7a9a]">{port.banner || '—'}</td>
                      <td className="p-2 text-[10px] text-[#6a7a9a]">{port.version || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}