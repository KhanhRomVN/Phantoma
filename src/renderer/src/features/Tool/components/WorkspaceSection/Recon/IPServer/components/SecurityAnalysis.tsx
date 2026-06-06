import type { IPServerData, SecurityFinding } from '../types/ip-server-data';
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

function SeverityBadge({ severity }: { severity: string }) {
  const config: Record<string, { color: string; label: string }> = {
    CRITICAL: { color: '#ff2d55', label: 'CRITICAL' },
    HIGH: { color: '#ff6b35', label: 'HIGH' },
    MEDIUM: { color: '#f5a623', label: 'MEDIUM' },
    LOW: { color: '#30d158', label: 'LOW' },
    INFO: { color: '#4a5a7a', label: 'INFO' },
  };
  const sev = severity.toUpperCase();
  const c = config[sev] || config.INFO;
  return (
    <span className="text-[8px] font-bold font-mono uppercase px-1.5 py-0.5 rounded-sm" style={{ color: c.color, border: `1px solid ${c.color}40`, background: `${c.color}12` }}>
      {c.label}
    </span>
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

function KV({ k, v, vc = 'text-[#6a7a9a]' }: { k: string; v: string | number | React.ReactNode; vc?: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-[#111827] last:border-0">
      <span className="text-[10px] font-mono text-[#3a4558] uppercase tracking-wide">{k}</span>
      <span className={cn('text-[11px] font-mono', vc)}>{v}</span>
    </div>
  );
}

export function SecurityAnalysis({ data }: { data: IPServerData }) {
  const { osDetection, securityFindings, infrastructureExposure } = data;
  const criticalCount = securityFindings.filter(f => f.severity === 'CRITICAL').length;
  const highCount = securityFindings.filter(f => f.severity === 'HIGH').length;
  
  const exposureList = Object.entries(infrastructureExposure)
    .filter(([, exposed]) => exposed === true)
    .map(([key]) => key.replace('Exposure', '').replace(/([A-Z])/g, ' $1').trim());
  
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="Total Findings" value={securityFindings.length} sub="vulnerabilities" accent="#ff2d55" />
          <StatBox label="Critical" value={criticalCount} sub="patch immediately" accent="#ff2d55" />
          <StatBox label="High" value={highCount} sub="prioritize" accent="#ff6b35" />
          <StatBox label="Exposures" value={exposureList.length} sub="infrastructure" accent="#f5a623" />
        </div>
        
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#30d158">Operating System</SectionHeader>
          <KV k="OS" v={osDetection.operatingSystem} vc="text-[#8da0c0]" />
          <KV k="Kernel" v={osDetection.kernelVersion || '—'} />
          <KV k="Architecture" v={osDetection.architecture || '—'} />
          <KV k="Hostname" v={osDetection.hostname || '—'} />
          {osDetection.uptime && <KV k="Uptime" v={`${Math.floor(osDetection.uptime / 86400)} days`} />}
        </div>
        
        {exposureList.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
            <SectionHeader accent="#ff2d55">Infrastructure Exposure</SectionHeader>
            <div className="flex flex-wrap gap-2">
              {exposureList.map((exp, idx) => (
                <span key={idx} className="text-[10px] font-mono px-2 py-1 rounded" style={{ background: '#ff2d5515', border: '1px solid #ff2d5530', color: '#ff2d55' }}>
                  {exp}
                </span>
              ))}
            </div>
          </div>
        )}
        
        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="border-b border-[#1c2333] bg-[#0a0e14]">
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[9px] uppercase">Finding</th>
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[9px] uppercase">Severity</th>
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[9px] uppercase">CVSS</th>
                  <th className="text-left p-2 text-[#2a3548] font-normal tracking-wider text-[9px] uppercase">CVE</th>
                 </tr>
              </thead>
              <tbody>
                {securityFindings.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-[10px] font-mono text-[#3a4558]">
                      No security findings
                    </td>
                  </tr>
                ) : (
                  securityFindings.map((finding, idx) => (
                    <tr key={idx} className="border-b border-[#111827] hover:bg-[#111827] transition-colors">
                      <td className="p-2 font-mono text-[11px] text-[#ff6b35]">{finding.name}</td>
                      <td className="p-2"><SeverityBadge severity={finding.severity} /></td>
                      <td className="p-2">
                        {finding.cvss ? (
                          <span className={finding.cvss >= 7 ? 'text-[#ff2d55]' : finding.cvss >= 4 ? 'text-[#f5a623]' : 'text-[#30d158]'}>
                            {finding.cvss}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="p-2 text-[10px] text-[#0af]">{finding.cve || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}