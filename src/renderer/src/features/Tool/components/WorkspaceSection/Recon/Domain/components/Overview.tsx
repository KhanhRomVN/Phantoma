import type { ReconData } from '../types/recon-data';
import React from 'react';
import { cn } from '../../../../../../../shared/lib/utils';

// UI Components
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

function RiskBadge({ risk }: { risk: string }) {
  const config: Record<string, { color: string; label: string }> = {
    critical: { color: '#ff2d55', label: 'CRITICAL' },
    high: { color: '#ff6b35', label: 'HIGH' },
    medium: { color: '#f5a623', label: 'MEDIUM' },
    low: { color: '#30d158', label: 'LOW' },
  };
  const c = config[risk] || { color: '#4a5a7a', label: 'INFO' };
  return (
    <span className="text-[8px] font-bold font-mono uppercase px-1.5 py-0.5 rounded-sm" style={{ color: c.color, border: `1px solid ${c.color}40`, background: `${c.color}12` }}>
      {c.label}
    </span>
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
        <span className="text-[14px] font-bold font-mono" style={{ color }}>
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
      <div className="flex justify-between text-[9px] font-mono text-[#3a4558] mb-0.5">
        <span>{label}</span>
        <span>{percentage}%</span>
      </div>
      <div className="h-1 bg-[#1c2333] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function CvssBar({ score, cve }: { score: number; cve?: string }) {
  const percentage = (score / 10) * 100;
  const severity = score >= 9 ? 'CRITICAL' : score >= 7 ? 'HIGH' : score >= 4 ? 'MEDIUM' : 'LOW';
  const color = score >= 9 ? '#ff2d55' : score >= 7 ? '#ff6b35' : score >= 4 ? '#f5a623' : '#30d158';

  return (
    <div className="mb-2">
      <div className="flex justify-between text-[9px] font-mono">
        <span className="text-[#6a7a9a]">{cve || 'N/A'}</span>
        <span className="text-[#c8d6f0]">{severity} ({score})</span>
      </div>
      <div className="h-1 bg-[#1c2333] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export function TabOverview({ data }: { data: ReconData }) {
  const openPortsCount = data.ports.filter((p) => p.state === 'open').length;
  const criticalVulnsCount = data.vulns.filter((v) => v.severity?.toUpperCase() === 'CRITICAL').length;
  const criticalSubdomainsCount = data.subdomains.filter((s) => s.risk === 'critical').length;
  const totalBreachedAccounts = data.breaches.reduce((sum, b) => sum + b.accounts, 0);
  
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="grid grid-cols-2 gap-2">
        {/* Top stats row */}
        <div className="col-span-2 grid grid-cols-4 gap-2 mb-1">
          <StatBox label="Open Ports" value={openPortsCount} sub={`of ${data.ports.length} scanned`} accent="#0af" />
          <StatBox label="Vulnerabilities" value={data.vulns.length} sub={`${criticalVulnsCount} critical`} accent="#ff2d55" />
          <StatBox label="Subdomains" value={data.subdomains.length} sub={`${criticalSubdomainsCount} critical`} accent="#ff6b35" />
          <StatBox label="Breached Accounts" value={`${(totalBreachedAccounts / 1e6).toFixed(1)}M`} sub="records exposed" accent="#f5a623" />
        </div>
        
        {/* Risk Score Card */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#ff2d55">Risk Score</SectionHeader>
          <div className="flex items-center gap-3">
            <ScoreGauge score={data.riskScore.total} />
            <div className="flex-1 space-y-1.5">
              <HeatBar label="Network" value={data.riskScore.breakdown.network} />
              <HeatBar label="Breach" value={data.riskScore.breakdown.breach} />
              <HeatBar label="Exposure" value={data.riskScore.breakdown.exposure} />
              <HeatBar label="Reputation" value={data.riskScore.breakdown.reputation} />
            </div>
          </div>
        </div>
        
        {/* Target Info Card */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#0af">Target Information</SectionHeader>
          <div className="flex justify-between items-center py-1 border-b border-[#111827]">
            <span className="text-[10px] font-mono text-[#3a4558] uppercase tracking-wide">Domain</span>
            <span className="text-[11px] font-mono text-[#0af]">{data.target}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-[#111827]">
            <span className="text-[10px] font-mono text-[#3a4558] uppercase tracking-wide">IP Address</span>
            <span className="text-[11px] font-mono text-[#6a7a9a]">{data.targetIp}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-[10px] font-mono text-[#3a4558] uppercase tracking-wide">Scan Time</span>
            <span className="text-[11px] font-mono text-[#6a7a9a]">{new Date(data.scanTime).toLocaleString()}</span>
          </div>
        </div>
        
        {/* Critical Vulnerabilities Card */}
        {data.vulns.filter(v => v.severity?.toUpperCase() === 'CRITICAL' || v.severity?.toUpperCase() === 'HIGH').length > 0 && (
          <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
            <SectionHeader accent="#ff2d55">Critical & High Vulnerabilities</SectionHeader>
            <div className="space-y-0.5">
              {data.vulns
                .filter(v => v.severity?.toUpperCase() === 'CRITICAL' || v.severity?.toUpperCase() === 'HIGH')
                .map((v, i) => (
                  <div key={i} className="flex justify-between items-center py-1 border-b border-[#111827] last:border-0">
                    <span className="text-[10px] font-mono text-[#ff6b35]">{v.name}</span>
                    <RiskBadge risk={v.severity?.toLowerCase() || 'info'} />
                  </div>
                ))}
            </div>
          </div>
        )}
        
        {/* Technology Stack Summary */}
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
          <SectionHeader accent="#30d158">Technology Stack Summary</SectionHeader>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <div className="text-[8px] uppercase text-[#3a4558] mb-1">Frontend</div>
              <div className="text-[9px] text-[#8da0c0]">{data.techStack.frontend.slice(0, 2).join(', ') || '—'}</div>
            </div>
            <div>
              <div className="text-[8px] uppercase text-[#3a4558] mb-1">Backend</div>
              <div className="text-[9px] text-[#8da0c0]">{data.techStack.backend.slice(0, 2).join(', ') || '—'}</div>
            </div>
            <div>
              <div className="text-[8px] uppercase text-[#3a4558] mb-1">Database</div>
              <div className="text-[9px] text-[#8da0c0]">{data.techStack.database.join(', ') || '—'}</div>
            </div>
            <div>
              <div className="text-[8px] uppercase text-[#3a4558] mb-1">Hosting</div>
              <div className="text-[9px] text-[#8da0c0]">{data.techStack.hosting.join(', ') || '—'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}