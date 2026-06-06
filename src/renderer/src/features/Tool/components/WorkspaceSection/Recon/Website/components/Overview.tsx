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

function RiskBar({ label, score, max = 10, color }: { label: string; score: number; max?: number; color: string }) {
  const percentage = (score / max) * 100;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-[9px] font-mono mb-0.5">
        <span className="text-[#3a4558]">{label}</span>
        <span className="text-[#c8d6f0]">{score}/{max}</span>
      </div>
      <div className="h-1.5 bg-[#1c2333] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export function WebsiteOverview({ data }: { data: WebsiteData }) {
  const { appStructure, authSurface, webVulnerabilities, technologyDetection } = data;
  
  const endpointCount = appStructure.endpointMapping?.length || 0;
  const hiddenCount = appStructure.hiddenPaths?.length || 0;
  const vulnCount = webVulnerabilities.length;
  const criticalVulns = webVulnerabilities.filter(v => v.severity === 'CRITICAL').length;
  const highVulns = webVulnerabilities.filter(v => v.severity === 'HIGH').length;
  const mfaEnabled = authSurface.mfa || false;
  const cspConfigured = data.clientSideAnalysis.csp !== 'Missing';
  
  const overallRiskScore = (criticalVulns * 10 + highVulns * 7 + hiddenCount * 2 + (mfaEnabled ? 0 : 3) + (cspConfigured ? 0 : 2)) / 10;
  const riskColor = overallRiskScore >= 7 ? '#ff2d55' : overallRiskScore >= 4 ? '#f5a623' : '#30d158';
  
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 bg-gradient-to-r from-[#0a0e14] to-[#0d1017] border border-[#1c2333] rounded p-3 mb-1">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-[20px] font-bold font-mono text-[#0af]">{data.target}</div>
              <div className="text-[9px] font-mono text-[#3a4558] mt-0.5">{technologyDetection.webServer.join(', ')} • {technologyDetection.cdn.join(', ')}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-[#3a4558]">Overall Risk Score</div>
              <div className="text-[28px] font-bold font-mono" style={{ color: riskColor }}>{overallRiskScore.toFixed(1)}</div>
              <div className="text-[8px] text-[#3a4558]">/ 10.0</div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-2 col-span-2 mb-1">
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2 text-center">
            <div className="text-[9px] text-[#3a4558]">Endpoints</div>
            <div className="text-[18px] font-bold text-[#0af]">{endpointCount}</div>
          </div>
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2 text-center">
            <div className="text-[9px] text-[#3a4558]">Hidden Paths</div>
            <div className="text-[18px] font-bold text-[#ff6b35]">{hiddenCount}</div>
          </div>
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2 text-center">
            <div className="text-[9px] text-[#3a4558]">Vulnerabilities</div>
            <div className="text-[18px] font-bold text-[#ff2d55]">{vulnCount}</div>
          </div>
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2 text-center">
            <div className="text-[9px] text-[#3a4558]">MFA</div>
            <div className={`text-[18px] font-bold ${mfaEnabled ? 'text-[#30d158]' : 'text-[#ff2d55]'}`}>{mfaEnabled ? '✓' : '✗'}</div>
          </div>
        </div>
        
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#0af">Application</SectionHeader>
          <KV k="Frontend" v={technologyDetection.frontendFramework.slice(0, 2).join(', ')} />
          <KV k="Backend" v={technologyDetection.backendFramework.join(', ')} />
          <KV k="Web Server" v={technologyDetection.webServer.join(', ')} />
          <KV k="WAF" v={technologyDetection.waf.join(', ')} />
        </div>
        
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#30d158">Security</SectionHeader>
          <KV k="MFA" v={mfaEnabled ? 'Enabled' : 'Disabled'} vc={mfaEnabled ? 'text-[#30d158]' : 'text-[#ff2d55]'} />
          <KV k="CSP" v={cspConfigured ? 'Configured' : 'Missing'} vc={cspConfigured ? 'text-[#30d158]' : 'text-[#ff6b35]'} />
          <KV k="JWT" v={authSurface.jwt ? 'Yes' : 'No'} />
          <KV k="Session Cookie" v={authSurface.sessionCookie?.httpOnly ? 'HttpOnly' : 'Missing'} />
        </div>
        
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#ff2d55">Risk Breakdown</SectionHeader>
          <RiskBar label="Critical Vulnerabilities" score={criticalVulns} max={5} color="#ff2d55" />
          <RiskBar label="High Vulnerabilities" score={highVulns} max={10} color="#ff6b35" />
          <RiskBar label="Hidden/Exposed Paths" score={hiddenCount} max={20} color="#f5a623" />
          <RiskBar label="Missing Security Controls" score={(mfaEnabled ? 0 : 2) + (cspConfigured ? 0 : 2)} max={4} color="#0af" />
        </div>
      </div>
    </div>
  );
}