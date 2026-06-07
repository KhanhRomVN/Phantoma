import type { ScanWebsiteData } from '../types/scan-website-data';
import type { VulnSeverity } from '../types/vuln-scan';
import React from 'react';

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

function StatBox({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent: string }) {
  return (
    <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2.5 flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest font-mono text-[#2a3548]">{label}</span>
      <span className="text-[16px] font-bold font-mono leading-none" style={{ color: accent }}>
        {value}
      </span>
      {sub && <span className="text-[9px] font-mono text-[#3d4a61]">{sub}</span>}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: VulnSeverity }) {
  const config: Record<VulnSeverity, { color: string; label: string }> = {
    critical: { color: '#ff2d55', label: 'CRITICAL' },
    high: { color: '#ff6b35', label: 'HIGH' },
    medium: { color: '#f5a623', label: 'MEDIUM' },
    low: { color: '#30d158', label: 'LOW' },
    info: { color: '#0af', label: 'INFO' },
  };
  const c = config[severity];
  return (
    <span
      className="text-[9px] font-bold font-mono uppercase px-1.5 py-0.5 rounded-sm"
      style={{ color: c.color, border: `1px solid ${c.color}40`, background: `${c.color}12` }}
    >
      {c.label}
    </span>
  );
}

export function WebsiteVulnScan({ data }: { data: ScanWebsiteData }) {
  const vulnScan = data.vulnScan;

  if (!vulnScan) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-3 bg-[#0f1319]">
        <div className="text-[32px] opacity-15">⚠️</div>
        <div className="text-[11px] font-mono text-[#2a3548]">
          No vulnerability scan data available. Run a vulnerability scan first.
        </div>
      </div>
    );
  }

  const sortedFindings = [...vulnScan.findings].sort((a, b) => {
    const order: Record<VulnSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        {/* Stat boxes */}
        <div className="col-span-2 grid grid-cols-6 gap-2 mb-1">
          <StatBox label="URL" value={vulnScan.url.replace('https://', '')} accent="#0af" />
          <StatBox label="Critical" value={vulnScan.critical} accent="#ff2d55" />
          <StatBox label="High" value={vulnScan.high} accent="#ff6b35" />
          <StatBox label="Medium" value={vulnScan.medium} accent="#f5a623" />
          <StatBox label="Low" value={vulnScan.low} accent="#30d158" />
          <StatBox label="Duration" value={`${vulnScan.duration}s`} accent="#ff9f0a" />
        </div>

        {/* Findings */}
        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded overflow-hidden">
          <div className="px-3 py-2 border-b border-[#1c2333] bg-[#0a0e14]">
            <SectionHeader accent="#ff2d55">Findings ({vulnScan.totalFindings})</SectionHeader>
          </div>
          <div className="divide-y divide-[#111827]">
            {sortedFindings.length === 0 ? (
              <div className="p-4 text-center text-[11px] font-mono text-[#3d4a61]">
                No vulnerabilities found
              </div>
            ) : (
              sortedFindings.map((finding, idx) => (
                <div key={idx} className="p-2.5 hover:bg-[#111827] transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <SeverityBadge severity={finding.severity} />
                    <span className="text-[12px] font-mono font-bold text-[#c8d6f0]">{finding.name}</span>
                    {finding.cve && (
                      <span className="text-[9px] font-mono text-[#5e5ce6] bg-[#5e5ce610] border border-[#5e5ce630] rounded px-1">
                        {finding.cve}
                      </span>
                    )}
                    {finding.cvss && (
                      <span className="text-[9px] font-mono text-[#ff6b35] ml-auto">{finding.cvss.toFixed(1)} CVSS</span>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-[#3d4a61] ml-[88px]">
                    <div className="mb-0.5">
                      <span className="text-[#2a3548]">Location:</span>{' '}
                      <span className="text-[#0af]">{finding.location}</span>
                    </div>
                    <div className="mb-0.5 text-[#c8d6f0]">{finding.description}</div>
                    {finding.remediation && (
                      <div className="text-[#30d158]">
                        <span className="text-[#2a3548]">Fix:</span> {finding.remediation}
                      </div>
                    )}
                    <div className="text-[#2a3548] mt-0.5">Template: {finding.templateId}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}