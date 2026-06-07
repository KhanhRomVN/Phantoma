import type { ClientAttackData } from '../types/client-attack';
import React from 'react';

function SectionHeader({ accent = '#0af', children }: { accent?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-1 h-4 rounded-full" style={{ backgroundColor: accent }} />
      <h3 className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#c8d6f0] font-mono">{children}</h3>
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
      <div className="absolute inset-0 flex items-center justify-center"><span className="text-[15px] font-bold font-mono" style={{ color }}>{percentage}</span></div>
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

export function TabOverview({ data }: { data: ClientAttackData }) {
  const totalCredentials = data.allCredentials.length;
  const phishingCreds = data.phishingResults.reduce((s, r) => s + r.credentialsCaptured.length, 0);
  const totalEmailsSent = data.phishingResults.reduce((s, r) => s + r.emailsSent, 0);
  const activeSessionCount = data.activeSessions.filter(s => s.active).length;
  const totalPayloads = data.malwareDropperResults.length;

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="Emails Sent" value={totalEmailsSent} sub="phishing campaign" accent="#0af" />
          <StatBox label="Credentials" value={totalCredentials} sub={`${phishingCreds} phishing`} accent="#f5a623" />
          <StatBox label="Payloads" value={totalPayloads} sub="malware generated" accent="#ff2d55" />
          <StatBox label="Sessions" value={activeSessionCount} sub="active shells" accent="#30d158" />
        </div>

        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#ff2d55">Campaign Risk Score</SectionHeader>
          <div className="flex items-center gap-3">
            <ScoreGauge score={data.riskScore.total} />
            <div className="flex-1 space-y-1.5">
              <HeatBar label="Phishing" value={data.riskScore.breakdown.phishing} />
              <HeatBar label="Malware" value={data.riskScore.breakdown.malware} />
              <HeatBar label="Social" value={data.riskScore.breakdown.social} />
            </div>
          </div>
        </div>

        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#0af">Campaign Information</SectionHeader>
          <div className="flex justify-between items-center py-1 border-b border-[#111827]">
            <span className="text-[11px] font-mono text-[#c8d6f0] uppercase tracking-wide">Campaign</span>
            <span className="text-[12px] font-mono text-[#0af]">{data.campaignName}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-[#111827]">
            <span className="text-[11px] font-mono text-[#c8d6f0] uppercase tracking-wide">Target Org</span>
            <span className="text-[12px] font-mono text-[#c8d6f0]">{data.target}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-[11px] font-mono text-[#c8d6f0] uppercase tracking-wide">Start Time</span>
            <span className="text-[12px] font-mono text-[#c8d6f0]">{new Date(data.scanTime).toLocaleString()}</span>
          </div>
        </div>

        {/* Phishing Stats */}
        {data.phishingResults.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
            <SectionHeader accent="#f5a623">Phishing Campaign Stats</SectionHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-mono">
                <thead>
                  <tr className="border-b border-[#1c2333] bg-[#0a0e14]">
                    <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">Platform</th>
                    <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">Sent</th>
                    <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">Opened</th>
                    <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">Clicked</th>
                    <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">Creds</th>
                    <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {data.phishingResults.map((r, idx) => (
                    <tr key={idx} className="border-b border-[#111827] hover:bg-[#111827]">
                      <td className="p-2 text-[#0af] uppercase">{r.config.platform}</td>
                      <td className="p-2 text-[#c8d6f0]">{r.emailsSent}</td>
                      <td className="p-2 text-[#c8d6f0]">{r.emailsOpened}</td>
                      <td className="p-2 text-[#f5a623]">{r.emailsClicked}</td>
                      <td className="p-2 text-[#30d158]">{r.credentialsCaptured.length}</td>
                      <td className="p-2 text-[#c8d6f0]">{r.emailsSent > 0 ? ((r.emailsClicked / r.emailsSent) * 100).toFixed(1) : 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Captured Credentials */}
        {data.allCredentials.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
            <SectionHeader accent="#30d158">Captured Credentials</SectionHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-mono">
                <thead>
                  <tr className="border-b border-[#1c2333] bg-[#0a0e14]">
                    <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">Email</th>
                    <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">Password</th>
                    <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">MFA</th>
                    <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">IP</th>
                    <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.allCredentials.map((cred, idx) => (
                    <tr key={idx} className="border-b border-[#111827] hover:bg-[#111827]">
                      <td className="p-2 text-[#c8d6f0]">{cred.email}</td>
                      <td className="p-2 text-[#f5a623]">{cred.password}</td>
                      <td className="p-2">{cred.mfaToken ? <span className="text-[#30d158]">{cred.mfaToken}</span> : <span className="text-[#4a5a7a]">—</span>}</td>
                      <td className="p-2 text-[#0af]">{cred.ipAddress || '—'}</td>
                      <td className="p-2 text-[#c8d6f0]">{new Date(cred.timestamp).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Active Sessions */}
        {data.activeSessions.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
            <SectionHeader accent="#30d158">Active Meterpreter Sessions</SectionHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-mono">
                <thead>
                  <tr className="border-b border-[#1c2333] bg-[#0a0e14]">
                    <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">Target</th>
                    <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">Type</th>
                    <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">User</th>
                    <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.activeSessions.map((s, idx) => (
                    <tr key={idx} className="border-b border-[#111827] hover:bg-[#111827]">
                      <td className="p-2 text-[#0af]">{s.target}</td>
                      <td className="p-2 text-[#c8d6f0] uppercase">{s.type}</td>
                      <td className="p-2 text-[#c8d6f0]">{s.user || '—'}</td>
                      <td className="p-2"><span className={s.active ? 'text-[#30d158]' : 'text-[#4a5a7a]'}>{s.active ? 'ACTIVE' : 'DEAD'}</span></td>
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