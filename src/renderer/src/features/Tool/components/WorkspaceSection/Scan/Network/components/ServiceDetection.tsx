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

export function NetworkServiceDetection({ data }: { data: ScanNetworkData }) {
  const serviceDetection = data.serviceDetection;

  if (!serviceDetection) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-[#0f1319]">
        <div className="text-[32px] opacity-15">🔬</div>
        <div className="text-[11px] font-mono text-[#2a3548]">
          No service detection data available. Run service detection first.
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        {/* Stat boxes */}
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="Target" value={serviceDetection.target} accent="#0af" />
          <StatBox label="Identified" value={serviceDetection.identifiedServices} sub="services" accent="#30d158" />
          <StatBox label="Total Open" value={serviceDetection.totalServices} sub="ports" accent="#f5a623" />
          <StatBox label="Duration" value={`${serviceDetection.duration}s`} accent="#ff9f0a" />
        </div>

        {/* Services Table */}
        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] font-mono">
              <thead>
                <tr className="border-b border-[#1c2333] bg-[#0a0e14]">
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[10px] uppercase w-12">Port</th>
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[10px] uppercase">Service</th>
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[10px] uppercase">Version</th>
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[10px] uppercase">CPE</th>
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[10px] uppercase">Extra</th>
                </tr>
              </thead>
              <tbody>
                {serviceDetection.results.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-[11px] font-mono text-[#3d4a61]">
                      No services identified
                    </td>
                  </tr>
                ) : (
                  serviceDetection.results.map((svc, idx) => (
                    <tr key={idx} className="border-b border-[#111827] hover:bg-[#111827] transition-colors">
                      <td className="p-2 text-[12px] text-[#0af] font-mono">{svc.port}</td>
                      <td className="p-2 text-[11px] text-[#30d158]">{svc.service}</td>
                      <td className="p-2 text-[11px] text-[#c8d6f0]">{svc.version || '—'}</td>
                      <td className="p-2 text-[10px] text-[#5e5ce6] font-mono">{svc.cpe || '—'}</td>
                      <td className="p-2 text-[10px] text-[#3d4a61]">
                        {svc.extra && Object.keys(svc.extra).length > 0
                          ? Object.entries(svc.extra).map(([k, v]) => (
                              <div key={k} className="truncate max-w-[180px]">
                                <span className="text-[#2a3548]">{k}:</span> {v}
                              </div>
                            ))
                          : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Scan Summary */}
        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#0af">Detection Summary</SectionHeader>
          <div className="text-[11px] font-mono text-[#c8d6f0] space-y-1">
            <div>
              Identified <span className="text-[#30d158]">{serviceDetection.identifiedServices}</span> services
              across <span className="text-[#0af]">{serviceDetection.totalServices}</span> open ports.
            </div>
            <div className="text-[10px] text-[#3d4a61] mt-1">
              Duration: {serviceDetection.duration}s · Started at {serviceDetection.startedAt}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}