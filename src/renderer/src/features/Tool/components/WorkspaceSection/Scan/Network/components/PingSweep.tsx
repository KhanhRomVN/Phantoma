import type { ScanNetworkData } from '../types/scan-network-data';
import React from 'react';

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

export function NetworkPingSweep({ data }: { data: ScanNetworkData }) {
  const pingSweep = data.pingSweep;

  if (!pingSweep) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-[#0f1319]">
        <div className="text-[32px] opacity-15">📡</div>
        <div className="text-[11px] font-mono text-[#2a3548]">
          No ping sweep data available. Run a ping sweep scan first.
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        {/* Stat boxes */}
        <div className="col-span-2 grid grid-cols-5 gap-2 mb-1">
          <StatBox label="Target" value={pingSweep.config.target} accent="#0af" />
          <StatBox label="Method" value={pingSweep.config.method.toUpperCase()} accent="#5e5ce6" />
          <StatBox label="Timeout" value={`${pingSweep.config.timeout}ms`} accent="#f5a623" />
          <StatBox label="Live Hosts" value={pingSweep.liveHosts} sub={`of ${pingSweep.totalHosts}`} accent="#30d158" />
          <StatBox label="Duration" value={`${pingSweep.duration}s`} accent="#ff9f0a" />
        </div>

        {/* Scan Config */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#0af">Scan Configuration</SectionHeader>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <span className="text-[10px] uppercase tracking-widest font-mono text-[#2a3548]">Target</span>
              <div className="text-[12px] font-mono text-[#c8d6f0] mt-0.5">{pingSweep.config.target}</div>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-widest font-mono text-[#2a3548]">Method</span>
              <div className="text-[12px] font-mono text-[#0af] mt-0.5">{pingSweep.config.method.toUpperCase()}</div>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-widest font-mono text-[#2a3548]">Timeout</span>
              <div className="text-[12px] font-mono text-[#c8d6f0] mt-0.5">{pingSweep.config.timeout}ms</div>
            </div>
          </div>
        </div>

        {/* Live Hosts Table */}
        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded overflow-hidden">
          <div className="px-3 py-2 border-b border-[#1c2333] bg-[#0a0e14]">
            <SectionHeader accent="#30d158">Live Hosts ({pingSweep.liveHosts})</SectionHeader>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] font-mono">
              <thead>
                <tr className="border-b border-[#1c2333] bg-[#060810]">
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[10px] uppercase w-12">#</th>
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[10px] uppercase">IP Address</th>
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[10px] uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {pingSweep.hosts.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-[11px] font-mono text-[#3d4a61]">
                      No live hosts found
                    </td>
                  </tr>
                ) : (
                  pingSweep.hosts.map((host, idx) => (
                    <tr key={idx} className="border-b border-[#111827] hover:bg-[#111827] transition-colors">
                      <td className="p-2 text-[10px] text-[#2a3548]">{idx + 1}</td>
                      <td className="p-2 text-[12px] text-[#30d158] font-mono">{host}</td>
                      <td className="p-2">
                        <span className="text-[10px] font-mono text-[#30d158] bg-[#30d15815] border border-[#30d15825] rounded px-1.5 py-0.5">
                          LIVE
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#ff9f0a">Scan Summary</SectionHeader>
          <div className="text-[11px] font-mono text-[#c8d6f0] space-y-1">
            <div>
              Scanned <span className="text-[#0af]">{pingSweep.totalHosts}</span> hosts in{' '}
              <span className="text-[#f5a623]">{pingSweep.duration}s</span> using{' '}
              <span className="text-[#5e5ce6]">{pingSweep.config.method.toUpperCase()}</span> method.
            </div>
            <div>
              <span className="text-[#30d158]">{pingSweep.liveHosts}</span> hosts responded,{' '}
              <span className="text-[#3d4a61]">{pingSweep.totalHosts - pingSweep.liveHosts}</span> hosts did not respond.
            </div>
            <div className="text-[10px] text-[#3d4a61] mt-1">
              Started at {pingSweep.startedAt}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}