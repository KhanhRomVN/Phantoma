import type { ReconData } from '../types/recon-data';
import { ReactNode } from 'react';
import { cn } from '../../../../../../../shared/lib/utils';

// ============================================================================
// UI Components
// ============================================================================

function SectionHeader({ accent = '#0af', children }: { accent?: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-1 h-4 rounded-full" style={{ backgroundColor: accent }} />
      <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#c8d6f0] font-mono">
        {children}
      </h3>
    </div>
  );
}

function KV({ k, v, vc = 'text-[#6a7a9a]' }: { k: string; v: string | number; vc?: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-[#111827] last:border-0">
      <span className="text-[10px] font-mono text-[#3a4558] uppercase tracking-wide">{k}</span>
      <span className={cn('text-[11px] font-mono', vc)}>{v}</span>
    </div>
  );
}

function StatBox({ label, value, sub, accent = '#0af' }: { label: string; value: number | string; sub?: string; accent?: string }) {
  return (
    <div className="bg-[#0d1017] border border-[#1c2333] rounded p-2">
      <div className="text-[9px] uppercase tracking-wider text-[#2a3548] font-mono">{label}</div>
      <div className="text-[20px] font-bold font-mono" style={{ color: accent }}>
        {value}
      </div>
      {sub && <div className="text-[9px] font-mono text-[#3a4558] mt-0.5">{sub}</div>}
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

function RiskRadar({ data }: { data: { network: number; breach: number; exposure: number; reputation: number } }) {
  const labels = ['Network', 'Breach', 'Exposure', 'Reputation'];
  const values = [data.network, data.breach, data.exposure, data.reputation];
  const maxValue = 100;
  const size = 160;
  const center = size / 2;
  const radius = size * 0.35;

  const getPoint = (index: number, value: number) => {
    const angle = (index * 90 - 90) * (Math.PI / 180);
    const r = (value / maxValue) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  const points = values.map((v, i) => getPoint(i, v));
  const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        {[0.25, 0.5, 0.75, 1].map((t, i) => (
          <circle key={i} cx={center} cy={center} r={radius * t} fill="none" stroke="#1c2333" strokeWidth="0.5" />
        ))}
        {[0, 1, 2, 3].map((i) => {
          const angle = (i * 90 - 90) * (Math.PI / 180);
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);
          return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="#1c2333" strokeWidth="0.5" />;
        })}
        <polygon points={polygonPoints} fill="#0af20" stroke="#0af" strokeWidth="1.5" />
        {labels.map((label, i) => {
          const angle = (i * 90 - 90) * (Math.PI / 180);
          const x = center + (radius + 20) * Math.cos(angle);
          const y = center + (radius + 20) * Math.sin(angle);
          return (
            <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="text-[8px] font-mono fill-[#3a4558]">
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function CvssBar({ score, cve }: { score: number; cve: string }) {
  const percentage = (score / 10) * 100;
  const severity = score >= 9 ? 'CRITICAL' : score >= 7 ? 'HIGH' : score >= 4 ? 'MEDIUM' : 'LOW';
  const color = score >= 9 ? '#ff2d55' : score >= 7 ? '#ff6b35' : score >= 4 ? '#f5a623' : '#30d158';

  return (
    <div className="mb-1">
      <div className="flex justify-between text-[10px] font-mono">
        <span className="text-[#6a7a9a]">{cve}</span>
        <span className="text-[#c8d6f0]">{severity} ({score})</span>
      </div>
      <div className="h-1 bg-[#1c2333] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function SubdomainTreemap({ subdomains }: { subdomains: Array<{ name: string; risk?: string; ip?: string }> }) {
  return (
    <div className="grid grid-cols-6 gap-1">
      {subdomains.slice(0, 30).map((sub, i) => {
        const riskColor = sub.risk === 'critical' ? '#ff2d55' : sub.risk === 'high' ? '#ff6b35' : '#0af';
        return (
          <div
            key={i}
            className="px-2 py-1 rounded text-[10px] font-mono truncate"
            style={{ backgroundColor: `${riskColor}15`, borderLeft: `2px solid ${riskColor}` }}
            title={sub.name}
          >
            {sub.name.replace(/\.phantoma\.com$/, '')}
          </div>
        );
      })}
      {subdomains.length > 30 && (
        <div className="col-span-6 text-center text-[9px] text-[#2a3548] mt-1">
          +{subdomains.length - 30} more
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function TabOverview({ data }: { data: ReconData }) {
  const openPortsCount = data.ports.filter((p) => p.state === 'open').length;
  const criticalVulnsCount = data.vulns.filter((v) => v.severity === 'CRITICAL').length;
  const criticalSubdomainsCount = data.subdomains.filter((s) => s.risk === 'critical').length;

  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10] grid grid-cols-3 gap-2 content-start">
      {/* Top stats row */}
      <div className="col-span-3 grid grid-cols-6 gap-2">
        <StatBox
          label="Open Ports"
          value={openPortsCount}
          sub={`of ${data.ports.length} scanned`}
          accent="#0af"
        />
        <StatBox
          label="CVEs Found"
          value={data.vulns.length}
          sub={`${criticalVulnsCount} critical`}
          accent="#ff2d55"
        />
        <StatBox
          label="Subdomains"
          value={data.subdomains.length}
          sub={`${criticalSubdomainsCount} critical risk`}
          accent="#ff6b35"
        />
        <StatBox
          label="Breaches"
          value={data.breaches.length}
          sub={`${(data.breaches.reduce((a, b) => a + b.accounts, 0) / 1e6).toFixed(0)}M records`}
          accent="#f5a623"
        />
        <StatBox
          label="Emails"
          value={data.harvestedEmails.length}
          sub={`${data.harvestedEmails.filter((e) => e.breach).length} in breaches`}
          accent="#bf5af2"
        />
        <StatBox
          label="Leaked Secrets"
          value={data.codeRepos.reduce((acc, repo) => acc + repo.secrets.length, 0)}
          sub="in public repos"
          accent="#ff2d55"
        />
      </div>

      {/* Risk score card */}
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

      {/* Radar */}
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <SectionHeader accent="#0af">Attack Surface</SectionHeader>
        <div className="w-full h-40">
          <RiskRadar data={data.riskScore.breakdown} />
        </div>
      </div>

      {/* Host info */}
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <SectionHeader accent="#30d158">Host Intel</SectionHeader>
        <KV k="Primary IP" v={data.targetIp} vc="text-[#0af] font-bold" />
        <KV k="ASN" v="AS14061 · DigitalOcean" />
        <KV k="ISP" v="DigitalOcean LLC" />
        <KV k="Location" v="Santa Clara, CA · US" />
        <KV k="Hosting" v="DigitalOcean Cloud (SFO3)" vc="text-[#f5a623]" />
        <KV k="OS" v="Ubuntu 22.04 LTS" />
        <KV k="WAF" v="Cloudflare Enterprise" vc="text-[#ff6b35]" />
        <KV k="SSL" v="TLS 1.3 / Let's Encrypt" vc="text-[#30d158]" />
        <KV k="Scan Time" v={data.scanTime} />
      </div>

      {/* Top CVEs */}
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
        <SectionHeader accent="#ff2d55">Critical Vulnerabilities</SectionHeader>
        <div className="space-y-0.5">
          {data.vulns.map((v) => (
            <CvssBar key={v.cve} score={v.cvss} cve={v.cve} />
          ))}
        </div>
      </div>

      {/* Subdomain treemap */}
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-3">
        <SectionHeader accent="#bf5af2">
          Subdomain Map ({data.subdomains.length} discovered)
        </SectionHeader>
        <SubdomainTreemap subdomains={data.subdomains} />
      </div>

      {/* Tech stack */}
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-3">
        <SectionHeader accent="#0af">Technology Fingerprint</SectionHeader>
        <div className="grid grid-cols-4 gap-x-4">
          {Object.entries(data.techStack).map(([k, v]) => (
            <KV key={k} k={k} v={v} />
          ))}
        </div>
      </div>
    </div>
  );
}