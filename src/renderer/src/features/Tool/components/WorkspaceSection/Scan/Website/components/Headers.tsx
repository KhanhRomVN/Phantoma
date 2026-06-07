import type { ScanWebsiteData } from '../types/scan-website-data';
import type { HeaderStatus } from '../types/headers';
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

function StatusBadge({ status }: { status: HeaderStatus }) {
  const config: Record<HeaderStatus, { color: string; label: string }> = {
    present: { color: '#30d158', label: 'PRESENT' },
    missing: { color: '#ff2d55', label: 'MISSING' },
    misconfigured: { color: '#f5a623', label: 'MISCONFIGURED' },
  };
  const c = config[status];
  return (
    <span
      className="text-[9px] font-bold font-mono uppercase px-1.5 py-0.5 rounded-sm"
      style={{ color: c.color, border: `1px solid ${c.color}40`, background: `${c.color}12` }}
    >
      {c.label}
    </span>
  );
}

export function WebsiteHeaders({ data }: { data: ScanWebsiteData }) {
  const headers = data.headers;

  if (!headers) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-[#0f1319]">
        <div className="text-[32px] opacity-15">📋</div>
        <div className="text-[11px] font-mono text-[#2a3548]">
          No security headers data available. Run a headers check first.
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        {/* Stat boxes */}
        <div className="col-span-2 grid grid-cols-5 gap-2 mb-1">
          <StatBox label="URL" value={headers.url.replace('https://', '')} accent="#0af" />
          <StatBox label="Grade" value={headers.grade || 'N/A'} accent="#5e5ce6" />
          <StatBox label="Present" value={headers.present} accent="#30d158" />
          <StatBox label="Missing" value={headers.missing} accent="#ff2d55" />
          <StatBox label="Misconf." value={headers.misconfigured} accent="#f5a623" />
        </div>

        {/* Headers Table */}
        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded overflow-hidden">
          <div className="px-3 py-2 border-b border-[#1c2333] bg-[#0a0e14]">
            <SectionHeader accent="#5e5ce6">Security Headers ({headers.totalChecked})</SectionHeader>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] font-mono">
              <thead>
                <tr className="border-b border-[#1c2333] bg-[#060810]">
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[10px] uppercase">Header</th>
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[10px] uppercase">Status</th>
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[10px] uppercase">Value</th>
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[10px] uppercase">Description</th>
                </tr>
              </thead>
              <tbody>
                {headers.headers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-[11px] font-mono text-[#3d4a61]">
                      No headers checked
                    </td>
                  </tr>
                ) : (
                  headers.headers.map((h, idx) => (
                    <tr key={idx} className="border-b border-[#111827] hover:bg-[#111827] transition-colors">
                      <td className="p-2 text-[11px] text-[#0af] font-mono">{h.header}</td>
                      <td className="p-2"><StatusBadge status={h.status} /></td>
                      <td className="p-2 text-[10px] text-[#c8d6f0] max-w-[200px] truncate">{h.value || '—'}</td>
                      <td className="p-2 text-[10px] text-[#3d4a61]">{h.description}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#30d158">Headers Summary</SectionHeader>
          <div className="text-[11px] font-mono text-[#c8d6f0] space-y-1">
            <div>
              <span className="text-[#30d158]">{headers.present}</span> headers present,{' '}
              <span className="text-[#ff2d55]">{headers.missing}</span> missing,{' '}
              <span className="text-[#f5a623]">{headers.misconfigured}</span> misconfigured.
            </div>
            <div>
              Overall grade: <span className="text-[#5e5ce6] font-bold">{headers.grade}</span>
            </div>
            <div className="text-[10px] text-[#3d4a61] mt-1">
              Duration: {headers.duration}s · Started at {headers.startedAt}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}