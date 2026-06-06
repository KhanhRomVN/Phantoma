import type { ReconData } from '../types/recon-data';
import { ReactNode } from 'react';

// UI Components
function SectionHeader({ accent = '#0af', children }: { accent?: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-1 h-4 rounded-full" style={{ backgroundColor: accent }} />
      <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#c8d6f0] font-mono">
        {children}
      </h3>
    </div>
  );
}

export function DomainSubdomain({ data }: { data: ReconData }) {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <SectionHeader accent="#f5a623">Subdomain Enumeration</SectionHeader>
        <div className="space-y-1">
          {data.subdomains.map((sub, i) => (
            <div key={i} className="flex justify-between items-center py-1 border-b border-[#111827] last:border-0">
              <span className="font-mono text-[12px] text-[#0af]">{sub.name}</span>
              {sub.risk && <span className="text-[10px] text-[#ff6b35]">{sub.risk}</span>}
              {sub.ip && <span className="text-[10px] text-[#3a4558]">{sub.ip}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}