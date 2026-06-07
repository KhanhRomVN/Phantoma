import type { ReconData } from '../types/recon-data';
import React, { useMemo } from 'react';

// UI Components
function StatBox({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent: string }) {
  return (
    <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2.5 flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest font-mono text-[#c8d6f0]">{label}</span>
      <span className="text-[16px] font-bold font-mono leading-none" style={{ color: accent }}>
        {value}
      </span>
      {sub && <span className="text-[9px] font-mono text-[#c8d6f0]">{sub}</span>}
    </div>
  );
}

export function DomainSubdomain({ data }: { data: ReconData }) {
  const subdomains = data.subdomains || [];

  const stats = useMemo(() => {
    const total = subdomains.length;
    const resolved = subdomains.filter(s => s.resolvedIP).length;
    const unresolved = total - resolved;
    const sourceCounts: Record<string, number> = {};
    subdomains.forEach(s => {
      sourceCounts[s.source] = (sourceCounts[s.source] || 0) + 1;
    });
    const sources = Object.keys(sourceCounts).length;
    return { total, resolved, unresolved, sources };
  }, [subdomains]);

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        {/* Stat boxes */}
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="Total Subdomains" value={stats.total} sub="passive discovery" accent="#0af" />
          <StatBox label="Resolved IP" value={stats.resolved} sub="DNS resolved" accent="#30d158" />
          <StatBox label="Unresolved" value={stats.unresolved} sub="no IP found" accent="#f5a623" />
          <StatBox label="Sources" value={stats.sources} sub="data providers" accent="#bf5af2" />
        </div>

        {/* Subdomain table */}
        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] font-mono">
              <thead>
                <tr className="border-b border-[#1c2333] bg-[#0a0e14]">
                  <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">Subdomain</th>
                  <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">Resolved IP</th>
                  <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">Source</th>
                  <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">First Seen</th>
                </tr>
              </thead>
              <tbody>
                {subdomains.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-[11px] font-mono text-[#c8d6f0]">
                      No subdomains found
                    </td>
                  </tr>
                ) : (
                  subdomains.map((sub, idx) => (
                    <tr key={idx} className="border-b border-[#111827] hover:bg-[#111827] transition-colors">
                      <td className="p-2 font-mono text-[12px] text-[#0af]">{sub.name}</td>
                      <td className="p-2 text-[11px] text-[#c8d6f0]">{sub.resolvedIP || '—'}</td>
                      <td className="p-2">
                        <span className="text-[10px] font-mono text-[#c8d6f0] bg-[#0a0e14] px-1.5 py-0.5 rounded border border-[#1c2333]">
                          {sub.source}
                        </span>
                      </td>
                      <td className="p-2 text-[11px] text-[#c8d6f0]">{sub.firstSeen || '—'}</td>
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