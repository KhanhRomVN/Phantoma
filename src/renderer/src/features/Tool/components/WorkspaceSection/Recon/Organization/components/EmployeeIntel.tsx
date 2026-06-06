import type { OrganizationData, EmployeeIntel as EmployeeType } from '../types/organization-data';
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

function KV({ k, v, vc = 'text-[#6a7a9a]' }: { k: string; v: string | number | React.ReactNode; vc?: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-[#111827] last:border-0">
      <span className="text-[10px] font-mono text-[#3a4558] uppercase tracking-wide">{k}</span>
      <span className={cn('text-[11px] font-mono', vc)}>{v}</span>
    </div>
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

export function EmployeeIntel({ data }: { data: OrganizationData }) {
  const { employeeIntel, externalExposure } = data;
  const breaches = externalExposure.dataBreach || [];
  const credentialLeaks = externalExposure.credentialLeak || [];
  
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="Employees Found" value={employeeIntel.length} sub="identified" accent="#0af" />
          <StatBox label="Data Breaches" value={breaches.length} sub="records leaked" accent="#ff2d55" />
          <StatBox label="Credential Leaks" value={credentialLeaks.length} sub="compromised" accent="#ff6b35" />
          <StatBox label="Public Docs" value={externalExposure.publicDocuments?.length || 0} sub="exposed" accent="#f5a623" />
        </div>
        
        <div className="bg-[#0d1017] border border-[#1c2333] rounded overflow-hidden col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="border-b border-[#1c2333] bg-[#0a0e14]">
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[9px] uppercase">Name</th>
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[9px] uppercase">Title</th>
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[9px] uppercase">Email</th>
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[9px] uppercase">LinkedIn</th>
                 </tr>
              </thead>
              <tbody>
                {employeeIntel.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-[10px] font-mono text-[#3a4558]">
                      No employees found
                    </td>
                  </tr>
                ) : (
                  employeeIntel.map((emp, idx) => (
                    <tr key={idx} className="border-b border-[#111827] hover:bg-[#111827] transition-colors">
                      <td className="p-2 font-mono text-[11px] text-[#0af]">{emp.name}</td>
                      <td className="p-2 text-[10px] text-[#6a7a9a]">{emp.title || '—'}</td>
                      <td className="p-2 text-[10px] text-[#30d158]">{emp.email || '—'}</td>
                      <td className="p-2 text-[10px] text-[#8da0c0]">{emp.linkedin ? '✓' : '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {breaches.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
            <SectionHeader accent="#ff2d55">Data Breaches</SectionHeader>
            {breaches.map((breach, idx) => (
              <div key={idx} className="mb-2 last:mb-0 p-2 bg-[#0a0e14] rounded">
                <KV k="Name" v={breach.name} vc="text-[#ff2d55]" />
                <KV k="Date" v={breach.date} />
                <KV k="Records Leaked" v={breach.recordsLeaked.toLocaleString()} />
                <KV k="Exposed Data" v={breach.exposedData.join(', ')} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}