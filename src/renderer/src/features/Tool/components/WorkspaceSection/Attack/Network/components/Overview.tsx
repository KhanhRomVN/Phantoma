import type { NetworkAttackData } from '../types/network-attack';
import React from 'react';
import { cn } from '../../../../../../../shared/lib/utils';

// UI Components
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
      <span className="text-[16px] font-bold font-mono leading-none" style={{ color: accent }}>
        {value}
      </span>
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
        <circle
          cx={radius}
          cy={radius}
          r={radius - 4}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[15px] font-bold font-mono" style={{ color }}>
          {percentage}
        </span>
      </div>
    </div>
  );
}

function HeatBar({ label, value }: { label: string; value: number }) {
  const percentage = Math.min(100, Math.max(0, value));
  const color = percentage >= 70 ? '#ff2d55' : percentage >= 40 ? '#f5a623' : '#30d158';

  return (
    <div>
      <div className="flex justify-between text-[10px] font-mono text-[#c8d6f0] mb-0.5">
        <span>{label}</span>
        <span>{percentage}%</span>
      </div>
      <div className="h-1 bg-[#1c2333] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function ShellBadge({ type, active }: { type: string; active: boolean }) {
  return (
    <span
      className="text-[9px] font-bold font-mono uppercase px-1.5 py-0.5 rounded-sm"
      style={{
        color: active ? '#30d158' : '#4a5a7a',
        border: `1px solid ${active ? '#30d15840' : '#4a5a7a40'}`,
        background: active ? '#30d15812' : '#4a5a7a12',
      }}
    >
      {type} {active ? '●' : '○'}
    </span>
  );
}

export function TabOverview({ data }: { data: NetworkAttackData }) {
  const totalExploits = data.eternalBlueResults.length + data.bruteForceResults.length + data.serviceRCEResults.length;
  const successfulExploits =
    data.eternalBlueResults.filter((e) => e.status === 'success').length +
    data.bruteForceResults.filter((b) => b.status === 'success').length +
    data.serviceRCEResults.filter((r) => r.status === 'success').length;
  const activeShellCount = data.activeShells.filter((s) => s.active).length;
  const totalCredentials = data.bruteForceResults.reduce((sum, b) => sum + b.credentialsFound.length, 0);

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        {/* Top stats row */}
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="Exploits Run" value={totalExploits} sub={`${successfulExploits} successful`} accent="#0af" />
          <StatBox label="Active Shells" value={activeShellCount} sub={`of ${data.activeShells.length} total`} accent="#30d158" />
          <StatBox label="Credentials" value={totalCredentials} sub="compromised" accent="#f5a623" />
          <StatBox label="Open Ports" value={data.openPorts.length} sub="attack surface" accent="#ff2d55" />
        </div>

        {/* Risk Score Card */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#ff2d55">Attack Risk Score</SectionHeader>
          <div className="flex items-center gap-3">
            <ScoreGauge score={data.riskScore.total} />
            <div className="flex-1 space-y-1.5">
              <HeatBar label="SMB" value={data.riskScore.breakdown.smb} />
              <HeatBar label="RDP" value={data.riskScore.breakdown.rdp} />
              <HeatBar label="SSH" value={data.riskScore.breakdown.ssh} />
              <HeatBar label="Other" value={data.riskScore.breakdown.other} />
            </div>
          </div>
        </div>

        {/* Target Info Card */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#0af">Target Information</SectionHeader>
          <div className="flex justify-between items-center py-1 border-b border-[#111827]">
            <span className="text-[11px] font-mono text-[#c8d6f0] uppercase tracking-wide">Target IP</span>
            <span className="text-[12px] font-mono text-[#0af]">{data.targetIp}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-[#111827]">
            <span className="text-[11px] font-mono text-[#c8d6f0] uppercase tracking-wide">Open Ports</span>
            <span className="text-[12px] font-mono text-[#c8d6f0]">{data.openPorts.join(', ')}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-[11px] font-mono text-[#c8d6f0] uppercase tracking-wide">Scan Time</span>
            <span className="text-[12px] font-mono text-[#c8d6f0]">{new Date(data.scanTime).toLocaleString()}</span>
          </div>
        </div>

        {/* Active Shells Card */}
        {data.activeShells.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
            <SectionHeader accent="#30d158">Active Shell Sessions</SectionHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-mono">
                <thead>
                  <tr className="border-b border-[#1c2333] bg-[#0a0e14]">
                    <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">Type</th>
                    <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">Target</th>
                    <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">User</th>
                    <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">Privileges</th>
                    <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.activeShells.map((shell, idx) => (
                    <tr key={idx} className="border-b border-[#111827] hover:bg-[#111827] transition-colors">
                      <td className="p-2"><ShellBadge type={shell.type} active={shell.active} /></td>
                      <td className="p-2 text-[#0af]">{shell.target}</td>
                      <td className="p-2 text-[#c8d6f0]">{shell.user || '—'}</td>
                      <td className="p-2 text-[#30d158]">{shell.privileges || '—'}</td>
                      <td className="p-2">
                        <span className={shell.active ? 'text-[#30d158]' : 'text-[#4a5a7a]'}>
                          {shell.active ? 'ACTIVE' : 'DEAD'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Credentials Card */}
        {data.credentialsFound.length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
            <SectionHeader accent="#f5a623">Compromised Credentials</SectionHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-mono">
                <thead>
                  <tr className="border-b border-[#1c2333] bg-[#0a0e14]">
                    <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">Service</th>
                    <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">Target</th>
                    <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">Username</th>
                    <th className="text-left p-2 text-[#c8d6f0] font-normal tracking-wider text-[10px] uppercase">Password</th>
                  </tr>
                </thead>
                <tbody>
                  {data.credentialsFound.map((cred, idx) => (
                    <tr key={idx} className="border-b border-[#111827] hover:bg-[#111827] transition-colors">
                      <td className="p-2 text-[#c8d6f0] uppercase">{cred.service}</td>
                      <td className="p-2 text-[#0af]">{cred.target}</td>
                      <td className="p-2 text-[#c8d6f0]">{cred.username}</td>
                      <td className="p-2 text-[#f5a623] font-mono">{cred.password}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Exploit Summary */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#ff2d55">Exploit Summary</SectionHeader>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-[9px] uppercase text-[#c8d6f0] mb-1">SMB/MS17-010</div>
              <div className="text-[10px] text-[#c8d6f0]">
                {data.eternalBlueResults.length} attempt{data.eternalBlueResults.length !== 1 ? 's' : ''}
                {' • '}
                {data.eternalBlueResults.filter((e) => e.status === 'success').length} success
              </div>
            </div>
            <div>
              <div className="text-[9px] uppercase text-[#c8d6f0] mb-1">Brute-force</div>
              <div className="text-[10px] text-[#c8d6f0]">
                {data.bruteForceResults.length} attempt{data.bruteForceResults.length !== 1 ? 's' : ''}
                {' • '}
                {data.bruteForceResults.filter((b) => b.status === 'success').length} success
              </div>
            </div>
            <div>
              <div className="text-[9px] uppercase text-[#c8d6f0] mb-1">Service RCE</div>
              <div className="text-[10px] text-[#c8d6f0]">
                {data.serviceRCEResults.length} attempt{data.serviceRCEResults.length !== 1 ? 's' : ''}
                {' • '}
                {data.serviceRCEResults.filter((r) => r.status === 'success').length} success
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}