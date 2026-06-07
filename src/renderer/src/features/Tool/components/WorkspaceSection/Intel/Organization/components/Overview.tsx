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

function RiskBar({ label, score, max = 10, color }: { label: string; score: number; max?: number; color: string }) {
  const percentage = (score / max) * 100;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-[10px] font-mono mb-0.5">
        <span className="text-[#c8d6f0]">{label}</span>
        <span className="text-[#c8d6f0]">{score}/{max}</span>
      </div>
      <div className="h-1.5 bg-[#1c2333] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export function OrganizationOverview({ data }: { data: OrganizationData }) {
  const { companyInfo, digitalAssets, employeeIntel, externalExposure } = data;
  
  const assetCount = digitalAssets.length;
  const employeeCount = employeeIntel.length;
  const breachCount = externalExposure.dataBreach?.length || 0;
  const leakCount = externalExposure.credentialLeak?.length || 0;
  const criticalAssets = digitalAssets.filter(a => a.risk === 'critical').length;
  
  const overallRiskScore = (criticalAssets * 8 + breachCount * 7 + leakCount * 5 + assetCount) / 10;
  const riskColor = overallRiskScore >= 7 ? '#ff2d55' : overallRiskScore >= 4 ? '#f5a623' : '#30d158';
  
  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 bg-gradient-to-r from-[#0a0e14] to-[#0d1017] border border-[#1c2333] rounded p-3 mb-1">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-[20px] font-bold font-mono text-[#0af]">{companyInfo.companyName}</div>
              <div className="text-[10px] font-mono text-[#c8d6f0] mt-0.5">{companyInfo.industry || 'Unknown industry'}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-[#c8d6f0]">Overall Risk Score</div>
              <div className="text-[28px] font-bold font-mono" style={{ color: riskColor }}>{overallRiskScore.toFixed(1)}</div>
              <div className="text-[9px] text-[#c8d6f0]">/ 10.0</div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-2 col-span-2 mb-1">
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2 text-center">
            <div className="text-[10px] text-[#c8d6f0]">Digital Assets</div>
            <div className="text-[19px] font-bold text-[#0af]">{assetCount}</div>
          </div>
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2 text-center">
            <div className="text-[10px] text-[#c8d6f0]">Employees</div>
            <div className="text-[19px] font-bold text-[#30d158]">{employeeCount}</div>
          </div>
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2 text-center">
            <div className="text-[10px] text-[#c8d6f0]">Data Breaches</div>
            <div className="text-[19px] font-bold text-[#ff2d55]">{breachCount}</div>
          </div>
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2 text-center">
            <div className="text-[10px] text-[#c8d6f0]">Credential Leaks</div>
            <div className="text-[19px] font-bold text-[#ff6b35]">{leakCount}</div>
          </div>
        </div>
        
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#0af">Company Summary</SectionHeader>
          <KV k="Legal Name" v={companyInfo.legalName || companyInfo.companyName} />
          <KV k="Address" v={companyInfo.address || '—'} />
          <KV k="Industry" v={companyInfo.industry || '—'} />
          <KV k="Subsidiaries" v={companyInfo.subsidiaries?.length || 0} />
        </div>
        
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#30d158">Digital Footprint</SectionHeader>
          <KV k="Domains" v={digitalAssets.filter(a => a.type === 'domain').length} />
          <KV k="Subdomains" v={digitalAssets.filter(a => a.type === 'subdomain').length} />
          <KV k="GitHub Repos" v={digitalAssets.filter(a => a.type === 'publicRepo').length} />
          <KV k="Mobile Apps" v={digitalAssets.filter(a => a.type === 'mobileApp').length} />
        </div>
        
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#ff2d55">Risk Breakdown</SectionHeader>
          <RiskBar label="Critical Assets" score={criticalAssets} max={10} color="#ff2d55" />
          <RiskBar label="Data Breaches" score={breachCount} max={5} color="#ff6b35" />
          <RiskBar label="Credential Leaks" score={leakCount} max={20} color="#f5a623" />
          <RiskBar label="Exposure Surface" score={assetCount} max={50} color="#0af" />
        </div>
      </div>
    </div>
  );
}