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

export function DomainOSINT({ data }: { data: ReconData }) {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <SectionHeader accent="#bf5af2">OSINT & Organization</SectionHeader>
        <div className="space-y-2">
          <div>
            <div className="text-[10px] text-[#3a4558] uppercase">Emails</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {data.harvestedEmails.map((email, i) => (
                <span key={i} className="text-[11px] font-mono text-[#0af] bg-[#0af10] px-2 py-0.5 rounded">
                  {email}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[#3a4558] uppercase">Breaches</div>
            {data.breaches.map((breach, i) => (
              <div key={i} className="text-[11px] text-[#6a7a9a]">
                {breach.name} - {breach.accounts} accounts
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}