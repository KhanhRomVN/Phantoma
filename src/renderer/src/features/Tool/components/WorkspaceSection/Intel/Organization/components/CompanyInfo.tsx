import type { OrganizationData } from '../types/organization-data';
import React from 'react';
import { cn } from '../../../../../../../shared/lib/utils';

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

function KV({ k, v, vc = 'text-[#c8d6f0]' }: { k: string; v: string | number | React.ReactNode; vc?: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-[#111827] last:border-0">
      <span className="text-[11px] font-mono text-[#c8d6f0] uppercase tracking-wide">{k}</span>
      <span className={cn('text-[12px] font-mono', vc)}>{v}</span>
    </div>
  );
}

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

export function CompanyInfo({ data }: { data: OrganizationData }) {
  const { companyInfo } = data;
  
  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 grid grid-cols-3 gap-2 mb-1">
          <StatBox label="Company Name" value={companyInfo.companyName} sub={companyInfo.legalName || ''} accent="#0af" />
          <StatBox label="Industry" value={companyInfo.industry || 'N/A'} sub="" accent="#f5a623" />
          <StatBox label="Subsidiaries" value={companyInfo.subsidiaries?.length || 0} sub="entities" accent="#30d158" />
        </div>
        
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#0af">Company Details</SectionHeader>
          <KV k="Legal Name" v={companyInfo.legalName || companyInfo.companyName} />
          <KV k="Address" v={companyInfo.address || '—'} />
          <KV k="Phone" v={companyInfo.phoneNumber || '—'} />
          <KV k="Email" v={companyInfo.email || '—'} vc="text-[#0af]" />
        </div>
        
        {companyInfo.subsidiaries && companyInfo.subsidiaries.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
            <SectionHeader accent="#30d158">Subsidiaries</SectionHeader>
            <div className="flex flex-wrap gap-2">
              {companyInfo.subsidiaries.map((sub, idx) => (
                <span key={idx} className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#0a0e14] border border-[#1c2333] text-[#c8d6f0]">
                  {sub}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}