import type { WebsiteData } from '../types/website-data';
import React from 'react';
import { cn } from '../../../../../../../shared/lib/utils';

function SectionHeader({
  accent = '#0af',
  children,
}: {
  accent?: string;
  children: React.ReactNode;
}) {
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
    <span
      className="text-[8px] font-bold font-mono uppercase px-1.5 py-0.5 rounded-sm"
      style={{ color: c.color, border: `1px solid ${c.color}40`, background: `${c.color}12` }}
    >
      {c.label}
    </span>
  );
}

function StatBox({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
}) {
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

export function ClientSide({ data }: { data: WebsiteData }) {
  const { clientSideAnalysis, webVulnerabilities } = data;
  const jsCount = clientSideAnalysis.jsFiles?.length || 0;
  const apiCallsCount = clientSideAnalysis.apiCalls?.length || 0;
  const criticalVulns = webVulnerabilities.filter((v) => v.severity === 'CRITICAL').length;

  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="JS Files" value={jsCount} sub="client-side" accent="#0af" />
          <StatBox label="API Calls" value={apiCallsCount} sub="discovered" accent="#30d158" />
          <StatBox label="Critical Vulns" value={criticalVulns} sub="high risk" accent="#ff2d55" />
          <StatBox
            label="Total Vulns"
            value={webVulnerabilities.length}
            sub="findings"
            accent="#f5a623"
          />
        </div>

        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#0af">Client-Side Analysis</SectionHeader>
          <KV k="JS Files" v={jsCount} />
          <KV k="Source Maps" v={clientSideAnalysis.sourceMap?.length || 0} />
          <KV k="API Calls" v={apiCallsCount} />
          <KV k="WebSocket" v={clientSideAnalysis.websocket || 'Not found'} />
        </div>

        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#30d158">Storage</SectionHeader>
          <KV k="Local Storage Items" v={clientSideAnalysis.localStorage?.length || 0} />
          <KV k="Session Storage" v={clientSideAnalysis.sessionStorage?.length || 0} />
          <KV
            k="CSP"
            v={clientSideAnalysis.csp ? 'Configured' : 'Missing'}
            vc={clientSideAnalysis.csp ? 'text-[#30d158]' : 'text-[#ff2d55]'}
          />
        </div>

        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="border-b border-[#1c2333] bg-[#0a0e14]">
                  <th className="text-left p-2 text-[#2a3548] font-normal">Vulnerability</th>
                  <th className="text-left p-2 text-[#2a3548] font-normal">Severity</th>
                  <th className="text-left p-2 text-[#2a3548] font-normal">CVSS</th>
                  <th className="text-left p-2 text-[#2a3548] font-normal">Location</th>
                </tr>
              </thead>
              <tbody>
                {webVulnerabilities.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-4 text-center text-[10px] font-mono text-[#3a4558]"
                    >
                      No vulnerabilities found
                    </td>
                  </tr>
                ) : (
                  webVulnerabilities.map((vuln, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-[#111827] hover:bg-[#111827] transition-colors"
                    >
                      <td className="p-2 font-mono text-[11px] text-[#ff6b35]">{vuln.name}</td>
                      <td className="p-2">
                        <SeverityBadge severity={vuln.severity} />
                      </td>
                      <td className="p-2">
                        {vuln.cvss ? (
                          <span
                            className={
                              vuln.cvss >= 7
                                ? 'text-[#ff2d55]'
                                : vuln.cvss >= 4
                                  ? 'text-[#f5a623]'
                                  : 'text-[#30d158]'
                            }
                          >
                            {vuln.cvss}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="p-2 text-[10px] text-[#0af]">{vuln.location}</td>
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
