import type { WebsiteData } from '../types/website-data';
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

export function WebAppStructure({ data }: { data: WebsiteData }) {
  const { appStructure, technologyDetection } = data;
  const endpointCount = appStructure.endpointMapping?.length || 0;
  const hiddenCount = appStructure.hiddenPaths?.length || 0;
  
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="Endpoints" value={endpointCount} sub="discovered" accent="#0af" />
          <StatBox label="Hidden Paths" value={hiddenCount} sub="exposed" accent="#ff6b35" />
          <StatBox label="API Routes" value={appStructure.apiDiscovery?.length || 0} sub="REST/GraphQL" accent="#30d158" />
          <StatBox label="Upload Paths" value={appStructure.uploadPaths?.length || 0} sub="file uploads" accent="#f5a623" />
        </div>
        
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#0af">URL Structure</SectionHeader>
          {appStructure.urlStructure.map((url, idx) => (
            <KV key={idx} k={`URL ${idx + 1}`} v={url} vc="text-[#0af]" />
          ))}
        </div>
        
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#30d158">Endpoint Mapping</SectionHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="border-b border-[#1c2333] bg-[#0a0e14]">
                  <th className="text-left p-1 text-[#2a3548] font-normal">Path</th>
                  <th className="text-left p-1 text-[#2a3548] font-normal">Method</th>
                  <th className="text-left p-1 text-[#2a3548] font-normal">Description</th>
                </tr>
              </thead>
              <tbody>
                {appStructure.endpointMapping.map((ep, idx) => (
                  <tr key={idx} className="border-b border-[#111827]">
                    <td className="p-1 text-[#0af]">{ep.path}</td>
                    <td className="p-1 text-[#f5a623]">{ep.method}</td>
                    <td className="p-1 text-[#6a7a9a]">{ep.description || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {appStructure.hiddenPaths.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
            <SectionHeader accent="#ff6b35">Hidden Paths</SectionHeader>
            <div className="flex flex-wrap gap-2">
              {appStructure.hiddenPaths.map((path, idx) => (
                <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0a0e14] border border-[#1c2333] text-[#ff6b35]">
                  {path}
                </span>
              ))}
            </div>
          </div>
        )}
        
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#bf5af2">Technology Detection</SectionHeader>
          <KV k="Frontend" v={technologyDetection.frontendFramework.join(', ')} />
          <KV k="Backend" v={technologyDetection.backendFramework.join(', ')} />
          <KV k="Web Server" v={technologyDetection.webServer.join(', ')} />
          <KV k="Runtime" v={technologyDetection.runtime.join(', ')} />
          <KV k="CDN" v={technologyDetection.cdn.join(', ')} />
          <KV k="WAF" v={technologyDetection.waf.join(', ')} />
        </div>
      </div>
    </div>
  );
}