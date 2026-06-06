import {
  StatBox,
  SectionHeader,
  KV,
  ScoreGauge,
  HeatBar,
  RiskRadar,
  CvssBar,
  SubdomainTreemap,
} from '../../shared-ui';
import type { ReconData } from '../ReconDataContext';

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
