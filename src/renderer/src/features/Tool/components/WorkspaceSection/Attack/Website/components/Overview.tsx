import type { WebsiteAttackData } from '../types/website-attack';
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

function StatBox({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent: string }) {
  return (
    <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2.5 flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest font-mono text-[#c8d6f0]">{label}</span>
      <span className="text-[16px] font-bold font-mono leading-none" style={{ color: accent }}>{value}</span>
      {sub && <span className="text-[9px] font-mono text-[#c8d6f0]">{sub}</span>}
    </div>
  );
}

function ScoreGauge({ score, size = 80 }: { score: number; size?: number }) {
  const percentage = Math.min(100, Math.max(0, score));
  const color = percentage >= 70 ? '#ff2d55' : percentage >= 40 ? '#f5a623' : '#30d158';
  const radius = size / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - percentage / 100);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={radius} cy={radius} r={radius - 4} fill="none" stroke="#1c2333" strokeWidth="4" />
        <circle cx={radius} cy={radius} r={radius - 4} fill="none" stroke={color} strokeWidth="4" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[15px] font-bold font-mono" style={{ color }}>{percentage}</span>
      </div>
    </div>
  );
}

function HeatBar({ label, value }: { label: string; value: number }) {
  const percentage = Math.min(100, Math.max(0, value));
  const color = percentage >= 70 ? '#ff2d55' : percentage >= 40 ? '#f5a623' : '#30d158';
  return (
    <div>
      <div className="flex justify-between text-[10px] font-mono text-[#c8d6f0] mb-0.5"><span>{label}</span><span>{percentage}%</span></div>
      <div className="h-1 bg-[#1c2333] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: color }} /></div>
    </div>
  );
}

export function TabOverview({ data }: { data: WebsiteAttackData }) {
  const totalExploits = data.sqliResults.length + data.xssResults.length + data.lfiRfiResults.length + data.ssrfResults.length + data.xxeResults.length + data.deserializationResults.length + data.commandInjectionResults.length;
  const successfulExploits = [data.sqliResults, data.xssResults, data.lfiRfiResults, data.ssrfResults, data.xxeResults, data.deserializationResults, data.commandInjectionResults].flat().filter(r => r.status === 'success').length;
  const activeShellCount = data.activeShells.filter(s => s.active).length;

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="Exploits Run" value={totalExploits} sub={`${successfulExploits} successful`} accent="#0af" />
          <StatBox label="Vulnerabilities" value={successfulExploits} sub="confirmed" accent="#ff2d55" />
          <StatBox label="Credentials" value={data.credentialsFound.length} sub="extracted" accent="#f5a623" />
          <StatBox label="Web Shells" value={activeShellCount} sub="active" accent="#30d158" />
        </div>

        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#ff2d55">Risk Score</SectionHeader>
          <div className="flex items-center gap-3">
            <ScoreGauge score={data.riskScore.total} />
            <div className="flex-1 space-y-1.5">
              <HeatBar label="SQLi" value={data.riskScore.breakdown.sqli} />
              <HeatBar label="XSS" value={data.riskScore.breakdown.xss} />
              <HeatBar label="LFI/RFI" value={data.riskScore.breakdown.lfi_rfi} />
              <HeatBar label="Cmd Inj" value={data.riskScore.breakdown.command_injection} />
            </div>
          </div>
        </div>

        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#0af">Target Information</SectionHeader>
          <div className="flex justify-between items-center py-1 border-b border-[#111827]">
            <span className="text-[11px] font-mono text-[#c8d6f0] uppercase tracking-wide">URL</span>
            <span className="text-[12px] font-mono text-[#0af]">{data.targetUrl}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-[#111827]">
            <span className="text-[11px] font-mono text-[#c8d6f0] uppercase tracking-wide">Target</span>
            <span className="text-[12px] font-mono text-[#c8d6f0]">{data.target}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-[11px] font-mono text-[#c8d6f0] uppercase tracking-wide">Scan Time</span>
            <span className="text-[12px] font-mono text-[#c8d6f0]">{new Date(data.scanTime).toLocaleString()}</span>
          </div>
        </div>

        {/* Exploit Summary */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#ff2d55">Exploit Summary</SectionHeader>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'SQL Injection', count: data.sqliResults.filter(r => r.status === 'success').length, total: data.sqliResults.length },
              { label: 'XSS', count: data.xssResults.filter(r => r.status === 'success').length, total: data.xssResults.length },
              { label: 'LFI/RFI', count: data.lfiRfiResults.filter(r => r.status === 'success').length, total: data.lfiRfiResults.length },
              { label: 'SSRF', count: data.ssrfResults.filter(r => r.status === 'success').length, total: data.ssrfResults.length },
              { label: 'XXE', count: data.xxeResults.filter(r => r.status === 'success').length, total: data.xxeResults.length },
              { label: 'Deserialize', count: data.deserializationResults.filter(r => r.status === 'success').length, total: data.deserializationResults.length },
              { label: 'Cmd Injection', count: data.commandInjectionResults.filter(r => r.status === 'success').length, total: data.commandInjectionResults.length },
            ].map((item, i) => (
              <div key={i}>
                <div className="text-[9px] uppercase text-[#c8d6f0] mb-1">{item.label}</div>
                <div className="text-[10px] text-[#c8d6f0]">{item.count}/{item.total} success</div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Shells */}
        {data.activeShells.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
            <SectionHeader accent="#30d158">Active Web Shells</SectionHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-mono">
                <thead>
                  <tr className="border-b border-[#1c2333] bg-[#0a0e14]">
                    <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">URL</th>
                    <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">Type</th>
                    <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">Password</th>
                    <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.activeShells.map((shell, idx) => (
                    <tr key={idx} className="border-b border-[#111827] hover:bg-[#111827]">
                      <td className="p-2 text-[#0af] truncate max-w-[200px]">{shell.url}</td>
                      <td className="p-2 text-[#c8d6f0] uppercase">{shell.type}</td>
                      <td className="p-2 text-[#f5a623]">{shell.password || '—'}</td>
                      <td className="p-2"><span className={shell.active ? 'text-[#30d158]' : 'text-[#4a5a7a]'}>{shell.active ? 'ACTIVE' : 'DEAD'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Credentials */}
        {data.credentialsFound.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
            <SectionHeader accent="#f5a623">Extracted Credentials</SectionHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-mono">
                <thead>
                  <tr className="border-b border-[#1c2333] bg-[#0a0e14]">
                    <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">Source</th>
                    <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">Username</th>
                    <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">Password/Hash</th>
                    <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {data.credentialsFound.map((cred, idx) => (
                    <tr key={idx} className="border-b border-[#111827] hover:bg-[#111827]">
                      <td className="p-2 text-[#c8d6f0]">{cred.source}</td>
                      <td className="p-2 text-[#c8d6f0]">{cred.username}</td>
                      <td className="p-2 text-[#f5a623]">{cred.password}</td>
                      <td className="p-2 text-[#0af]">{cred.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}