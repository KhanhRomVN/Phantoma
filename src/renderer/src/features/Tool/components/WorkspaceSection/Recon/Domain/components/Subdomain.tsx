import type { ReconData } from '../types/recon-data';
import React, { useMemo } from 'react';

// UI Components
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

export function DomainSubdomain({ data }: { data: ReconData }) {
  const subdomains = data.subdomains || [];

  const stats = useMemo(() => {
    const total = subdomains.length;
    const active = subdomains.filter(s => s.status === 'active').length;
    const critical = subdomains.filter(s => s.risk === 'critical').length;
    const high = subdomains.filter(s => s.risk === 'high').length;
    return { total, active, critical, high };
  }, [subdomains]);

  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="grid grid-cols-2 gap-2">
        {/* Stat boxes */}
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="Total Subdomains" value={stats.total} sub="discovered" accent="#0af" />
          <StatBox label="Active" value={stats.active} sub="responding" accent="#30d158" />
          <StatBox label="Critical Risk" value={stats.critical} sub="needs attention" accent="#ff2d55" />
          <StatBox label="High Risk" value={stats.high} sub="investigate" accent="#ff6b35" />
        </div>

        {/* Subdomain table */}
        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="border-b border-[#1c2333] bg-[#0a0e14]">
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[9px] uppercase">Subdomain</th>
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[9px] uppercase">IP</th>
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[9px] uppercase">HTTP</th>
                </tr>
              </thead>
              <tbody>
                {subdomains.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-[10px] font-mono text-[#3a4558]">
                      No subdomains found
                    </td>
                  </tr>
                ) : (
                  subdomains.map((sub, idx) => (
                    <tr key={idx} className="border-b border-[#111827] hover:bg-[#111827] transition-colors">
                      <td className="p-2 font-mono text-[11px] text-[#0af]">{sub.name}</td>
                      <td className="p-2 text-[10px] text-[#6a7a9a]">{sub.resolvedIP || '—'}</td>
                      <td className="p-2">
                        {sub.httpStatus ? (
                          <span className={sub.httpStatus >= 400 ? 'text-[#ff6b35]' : 'text-[#30d158]'}>
                            {sub.httpStatus}
                          </span>
                        ) : '—'}
                      </td>
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