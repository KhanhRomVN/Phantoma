import type { OrganizationData, DigitalAsset } from '../types/organization-data';
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

function RiskBadge({ risk }: { risk?: string }) {
  const config: Record<string, { color: string; label: string }> = {
    critical: { color: '#ff2d55', label: 'CRITICAL' },
    high: { color: '#ff6b35', label: 'HIGH' },
    medium: { color: '#f5a623', label: 'MEDIUM' },
    low: { color: '#30d158', label: 'LOW' },
  };
  if (!risk || !config[risk]) return null;
  const c = config[risk];
  return (
    <span className="text-[9px] font-bold font-mono uppercase px-1.5 py-0.5 rounded-sm" style={{ color: c.color, border: `1px solid ${c.color}40`, background: `${c.color}12` }}>
      {c.label}
    </span>
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

export function DigitalAssets({ data }: { data: OrganizationData }) {
  const assetsByType: Record<string, DigitalAsset[]> = {};
  data.digitalAssets.forEach(asset => {
    if (!assetsByType[asset.type]) assetsByType[asset.type] = [];
    assetsByType[asset.type].push(asset);
  });
  
  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="Total Assets" value={data.digitalAssets.length} sub="discovered" accent="#0af" />
          <StatBox label="Domains" value={assetsByType.domain?.length || 0} sub="" accent="#30d158" />
          <StatBox label="Subdomains" value={assetsByType.subdomain?.length || 0} sub="" accent="#f5a623" />
          <StatBox label="Repositories" value={assetsByType.publicRepo?.length || 0} sub="GitHub" accent="#bf5af2" />
        </div>
        
        {Object.entries(assetsByType).map(([type, assets]) => (
          <div key={type} className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-mono">
                <thead>
                  <tr className="border-b border-[#1c2333] bg-[#0a0e14]">
                    <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">{type.replace(/([A-Z])/g, ' $1').trim()}</th>
                    <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">Name</th>
                    <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">Risk</th>
                   </tr>
                </thead>
                <tbody>
                  {assets.map((asset, idx) => (
                    <tr key={idx} className="border-b border-[#111827] hover:bg-[#111827] transition-colors">
                      <td className="p-2 text-[11px] text-[#c8d6f0]">{asset.type}</td>
                      <td className="p-2 font-mono text-[12px] text-[#0af]">{asset.name}</td>
                      <td className="p-2"><RiskBadge risk={asset.risk} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}