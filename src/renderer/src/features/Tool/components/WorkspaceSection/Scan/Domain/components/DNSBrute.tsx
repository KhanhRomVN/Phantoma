import type { ScanDomainData } from '../types/scan-data';
import React, { useMemo } from 'react';

// UI Components
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

export function DomainDNSBrute({ data }: { data: ScanDomainData }) {
  const dnsBrute = data.dnsBrute;

  const aRecords = useMemo(() => {
    if (!dnsBrute?.resolved) return [];
    return dnsBrute.resolved.filter((r) => r.type === 'A');
  }, [dnsBrute]);

  const cnameRecords = useMemo(() => {
    if (!dnsBrute?.resolved) return [];
    return dnsBrute.resolved.filter((r) => r.type === 'CNAME');
  }, [dnsBrute]);

  const uniqueIPs = useMemo(() => {
    if (!dnsBrute?.resolved) return 0;
    const ips = new Set(dnsBrute.resolved.map((r) => r.ip));
    return ips.size;
  }, [dnsBrute]);

  if (!dnsBrute) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-[#0f1319]">
        <div className="text-[32px] opacity-15">🔍</div>
        <div className="text-[11px] font-mono text-[#2a3548]">
          No DNS brute-force data available. Run a brute-force scan first.
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        {/* Stat boxes */}
        <div className="col-span-2 grid grid-cols-5 gap-2 mb-1">
          <StatBox label="Wordlist" value={dnsBrute.wordlist} accent="#0af" />
          <StatBox label="Tested" value={dnsBrute.wordlistSize.toLocaleString()} sub="names" accent="#5e5ce6" />
          <StatBox label="Resolved" value={dnsBrute.resolvedCount} sub="subdomains" accent="#30d158" />
          <StatBox label="Unique IPs" value={uniqueIPs} sub="addresses" accent="#f5a623" />
          <StatBox label="Duration" value={`${dnsBrute.duration}s`} sub={dnsBrute.startedAt} accent="#ff9f0a" />
        </div>

        {/* A Records Table */}
        {aRecords.length > 0 && (
          <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded overflow-hidden">
            <div className="px-3 py-2 border-b border-[#1c2333] bg-[#0a0e14]">
              <SectionHeader accent="#0af">A Records ({aRecords.length})</SectionHeader>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-mono">
                <thead>
                  <tr className="border-b border-[#1c2333] bg-[#060810]">
                    <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[10px] uppercase w-8">#</th>
                    <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[10px] uppercase">Subdomain</th>
                    <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[10px] uppercase">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {aRecords.map((sub, idx) => (
                    <tr key={idx} className="border-b border-[#111827] hover:bg-[#111827] transition-colors">
                      <td className="p-2 text-[10px] text-[#2a3548]">{idx + 1}</td>
                      <td className="p-2 text-[12px] text-[#0af]">{sub.subdomain}</td>
                      <td className="p-2 text-[11px] text-[#30d158] font-mono">{sub.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CNAME Records Table */}
        {cnameRecords.length > 0 && (
          <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded overflow-hidden">
            <div className="px-3 py-2 border-b border-[#1c2333] bg-[#0a0e14]">
              <SectionHeader accent="#ff9f4a">CNAME Records ({cnameRecords.length})</SectionHeader>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-mono">
                <thead>
                  <tr className="border-b border-[#1c2333] bg-[#060810]">
                    <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[10px] uppercase w-8">#</th>
                    <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[10px] uppercase">Subdomain</th>
                    <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[10px] uppercase">Target</th>
                    <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[10px] uppercase">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {cnameRecords.map((sub, idx) => (
                    <tr key={idx} className="border-b border-[#111827] hover:bg-[#111827] transition-colors">
                      <td className="p-2 text-[10px] text-[#2a3548]">{idx + 1}</td>
                      <td className="p-2 text-[12px] text-[#ff9f4a]">{sub.subdomain}</td>
                      <td className="p-2 text-[11px] text-[#5e5ce6]">{sub.target || '—'}</td>
                      <td className="p-2 text-[11px] text-[#30d158] font-mono">{sub.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* No results */}
        {dnsBrute.resolved.length === 0 && (
          <div className="col-span-2 flex items-center justify-center p-8 bg-[#0d1017] border border-[#1c2333] rounded">
            <span className="text-[11px] font-mono text-[#3d4a61]">No subdomains resolved from brute-force</span>
          </div>
        )}
      </div>
    </div>
  );
}