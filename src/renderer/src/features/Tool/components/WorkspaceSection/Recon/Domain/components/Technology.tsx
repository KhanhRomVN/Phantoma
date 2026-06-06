import type { ReconData } from '../types/recon-data';
import { ReactNode } from 'react';
import { cn } from '../../../../../../../shared/lib/utils';

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

function KV({ k, v, vc = 'text-[#6a7a9a]' }: { k: string; v: string | number; vc?: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-[#111827] last:border-0">
      <span className="text-[10px] font-mono text-[#3a4558] uppercase tracking-wide">{k}</span>
      <span className={cn('text-[11px] font-mono', vc)}>{v}</span>
    </div>
  );
}

export function DomainTechnology({ data }: { data: ReconData }) {
  const tech = data.techStack;
  
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <SectionHeader accent="#30d158">Technology Fingerprinting</SectionHeader>
        <div className="grid grid-cols-2 gap-x-4">
          {Object.entries(tech).map(([k, v]) => (
            <KV key={k} k={k} v={v} />
          ))}
        </div>
      </div>
    </div>
  );
}