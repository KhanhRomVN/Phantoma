import { cn } from '../../../../../../shared/lib/utils';
import {
  TARGET_IP,
  SCAN_TIME,
  ports,
  vulns,
  subdomains,
  techStack,
  riskScore,
  RISK_COLOR,
  StatBox,
  SectionHeader,
  KV,
  RiskPill,
  ScoreGauge,
  HeatBar,
  RiskRadar,
  CvssBar,
  SubdomainTreemap,
} from '../shared';

export function TabOverview() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10] grid grid-cols-3 gap-2 content-start">
      {/* Top stats row */}
      <div className="col-span-3 grid grid-cols-6 gap-2">
        <StatBox
          label="Open Ports"
          value={ports.filter((p) => p.state === 'open').length}
          sub={`of ${ports.length} scanned`}
          accent="#0af"
        />
        <StatBox
          label="CVEs Found"
          value={vulns.length}
          sub={`${vulns.filter((v) => v.severity === 'CRITICAL').length} critical`}
          accent="#ff2d55"
        />
        <StatBox
          label="Subdomains"
          value={subdomains.length}
          sub={`${subdomains.filter((s) => s.risk === 'critical').length} critical risk`}
          accent="#ff6b35"
        />
        <StatBox
          label="Breaches"
          value={4}
          sub="1.6B records"
          accent="#f5a623"
        />
        <StatBox
          label="Emails"
          value={8}
          sub="3 in breaches"
          accent="#bf5af2"
        />
        <StatBox
          label="Leaked Secrets"
          value={5}
          sub="in public repos"
          accent="#ff2d55"
        />
      </div>

      {/* Risk score card */}
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <SectionHeader accent="#ff2d55">Risk Score</SectionHeader>
        <div className="flex items-center gap-3">
          <ScoreGauge score={riskScore.total} />
          <div className="flex-1 space-y-1.5">
            <HeatBar label="Network" value={riskScore.breakdown.network} />
            <HeatBar label="Breach" value={riskScore.breakdown.breach} />
            <HeatBar label="Exposure" value={riskScore.breakdown.exposure} />
            <HeatBar label="Reputation" value={riskScore.breakdown.reputation} />
          </div>
        </div>
      </div>

      {/* Radar */}
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <SectionHeader accent="#0af">Attack Surface</SectionHeader>
        <div className="w-full h-40">
          <RiskRadar data={riskScore.breakdown} />
        </div>
      </div>

      {/* Host info */}
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
        <SectionHeader accent="#30d158">Host Intel</SectionHeader>
        <KV k="Primary IP" v={TARGET_IP} vc="text-[#0af] font-bold" />
        <KV k="ASN" v="AS14061 · DigitalOcean" />
        <KV k="ISP" v="DigitalOcean LLC" />
        <KV k="Location" v="Santa Clara, CA · US" />
        <KV k="Hosting" v="DigitalOcean Cloud (SFO3)" vc="text-[#f5a623]" />
        <KV k="OS" v="Ubuntu 22.04 LTS" />
        <KV k="WAF" v="Cloudflare Enterprise" vc="text-[#ff6b35]" />
        <KV k="SSL" v="TLS 1.3 / Let's Encrypt" vc="text-[#30d158]" />
        <KV k="Scan Time" v={SCAN_TIME} />
      </div>

      {/* Top CVEs */}
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-2">
        <SectionHeader accent="#ff2d55">Critical Vulnerabilities</SectionHeader>
        <div className="space-y-0.5">
          {vulns.map((v) => (
            <CvssBar key={v.cve} score={v.cvss} cve={v.cve} />
          ))}
        </div>
      </div>

      {/* Subdomain treemap */}
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-3">
        <SectionHeader accent="#bf5af2">
          Subdomain Map ({subdomains.length} discovered)
        </SectionHeader>
        <SubdomainTreemap />
      </div>

      {/* Tech stack */}
      <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3 col-span-3">
        <SectionHeader accent="#0af">Technology Fingerprint</SectionHeader>
        <div className="grid grid-cols-4 gap-x-4">
          {Object.entries(techStack).map(([k, v]) => (
            <KV key={k} k={k} v={v} />
          ))}
        </div>
      </div>
    </div>
  );
}
