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

export function DomainSensitiveExposure({ data }: { data: ReconData }) {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <SectionHeader accent="#ff6b35">Sensitive Exposure</SectionHeader>
        <div className="text-[11px] text-[#6a7a9a]">TBD: .env, .git, backup files, API keys</div>
      </div>
    </div>
  );
}