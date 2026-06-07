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

function RecordTypeBadge({ type }: { type: string }) {
  const colorMap: Record<string, string> = {
    A: '#0af',
    AAAA: '#5e5ce6',
    CNAME: '#ff9f4a',
    MX: '#30d158',
    NS: '#64d2ff',
    SOA: '#ff2d55',
    TXT: '#f5a623',
    SRV: '#ff69b4',
    PTR: '#af52de',
  };
  const color = colorMap[type] || '#6a7a9a';
  return (
    <span
      className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-sm"
      style={{ color, border: `1px solid ${color}40`, background: `${color}12` }}
    >
      {type}
    </span>
  );
}

export function DomainZoneTransfer({ data }: { data: ScanDomainData }) {
  const zoneTransfer = data.zoneTransfer;

  const recordTypeStats = useMemo(() => {
    if (!zoneTransfer?.records) return {};
    const stats: Record<string, number> = {};
    zoneTransfer.records.forEach((r) => {
      stats[r.type] = (stats[r.type] || 0) + 1;
    });
    return stats;
  }, [zoneTransfer]);

  if (!zoneTransfer) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-[#0f1319]">
        <div className="text-[32px] opacity-15">🔒</div>
        <div className="text-[11px] font-mono text-[#2a3548]">
          No zone transfer data available. Run a zone transfer scan first.
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        {/* Stat boxes */}
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="Nameserver" value={zoneTransfer.nameserver} accent="#0af" />
          <StatBox label="Status" value={zoneTransfer.success ? 'Success' : 'Failed'} accent={zoneTransfer.success ? '#30d158' : '#ff2d55'} />
          <StatBox label="Total Records" value={zoneTransfer.recordCount} accent="#f5a623" />
          <StatBox label="Record Types" value={Object.keys(recordTypeStats).length} sub="unique types" accent="#5e5ce6" />
        </div>

        {/* Record Type Distribution */}
        {Object.keys(recordTypeStats).length > 0 && (
          <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#5e5ce6">Record Type Distribution</SectionHeader>
            <div className="flex flex-wrap gap-2">
              {Object.entries(recordTypeStats).map(([type, count]) => (
                <div
                  key={type}
                  className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#060810] border border-[#111827]"
                >
                  <RecordTypeBadge type={type} />
                  <span className="text-[11px] font-mono text-[#c8d6f0]">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Zone Transfer Error */}
        {zoneTransfer.error && (
          <div className="col-span-2 bg-[#ff2d5508] border border-[#ff2d5525] rounded p-3">
            <SectionHeader accent="#ff2d55">Error</SectionHeader>
            <div className="text-[11px] font-mono text-[#ff6b35]">{zoneTransfer.error}</div>
          </div>
        )}

        {/* Records Table */}
        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] font-mono">
              <thead>
                <tr className="border-b border-[#1c2333] bg-[#0a0e14]">
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[10px] uppercase w-8">#</th>
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[10px] uppercase">Name</th>
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[10px] uppercase">Type</th>
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[10px] uppercase">TTL</th>
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[10px] uppercase">Data</th>
                </tr>
              </thead>
              <tbody>
                {zoneTransfer.records.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-[11px] font-mono text-[#3d4a61]">
                      No records found
                    </td>
                  </tr>
                ) : (
                  zoneTransfer.records.map((record, idx) => (
                    <tr key={idx} className="border-b border-[#111827] hover:bg-[#111827] transition-colors">
                      <td className="p-2 text-[10px] text-[#2a3548]">{idx + 1}</td>
                      <td className="p-2 text-[12px] text-[#0af]">{record.name}</td>
                      <td className="p-2"><RecordTypeBadge type={record.type} /></td>
                      <td className="p-2 text-[11px] text-[#3d4a61]">{record.ttl}</td>
                      <td className="p-2 text-[11px] text-[#c8d6f0] break-all">{record.data}</td>
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