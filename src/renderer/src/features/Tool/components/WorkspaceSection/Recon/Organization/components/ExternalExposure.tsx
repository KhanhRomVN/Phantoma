import type { OrganizationData } from '../types/organization-data';
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

export function ExternalExposure({ data }: { data: OrganizationData }) {
  const { externalExposure } = data;
  const breaches = externalExposure.dataBreach || [];
  const leaks = externalExposure.credentialLeak || [];
  const documents = externalExposure.publicDocuments || [];
  const pressReleases = externalExposure.pressReleases || [];
  
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="grid grid-cols-2 gap-2">
        {breaches.length > 0 && (
          <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#ff2d55">Data Breaches</SectionHeader>
            {breaches.map((breach, idx) => (
              <div key={idx} className="mb-3 last:mb-0 p-2 bg-[#0a0e14] rounded">
                <KV k="Name" v={breach.name} vc="text-[#ff2d55]" />
                <KV k="Date" v={breach.date} />
                <KV k="Records" v={breach.recordsLeaked.toLocaleString()} />
                <KV k="Exposed Data" v={breach.exposedData.join(', ')} />
              </div>
            ))}
          </div>
        )}
        
        {leaks.length > 0 && (
          <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#ff6b35">Credential Leaks</SectionHeader>
            {leaks.map((leak, idx) => (
              <div key={idx} className="mb-2 last:mb-0 p-2 bg-[#0a0e14] rounded">
                <KV k="Email" v={leak.email} vc="text-[#0af]" />
                <KV k="Source" v={leak.source} />
                <KV k="Date" v={leak.date} />
              </div>
            ))}
          </div>
        )}
        
        {documents.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#f5a623">Public Documents</SectionHeader>
            {documents.map((doc, idx) => (
              <div key={idx} className="text-[10px] font-mono py-1 text-[#8da0c0]">{doc}</div>
            ))}
          </div>
        )}
        
        {pressReleases.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
            <SectionHeader accent="#0af">Press Releases</SectionHeader>
            {pressReleases.map((release, idx) => (
              <div key={idx} className="text-[10px] font-mono py-1 text-[#8da0c0]">{release}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}