import { KVRow } from '../../../ui/KVRow'
import { Badge } from '../../../ui/Badge'
import { ToolbarButton } from '../../../ui/ToolbarButton'
import { OsintCard } from './OsintCard'
import { SubdomainGrid } from './SubdomainGrid'

export function ViewRecon() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 h-10 border-b border-zinc-800 bg-zinc-950 shrink-0">
        <span className="text-[9.5px] font-bold text-zinc-600 uppercase tracking-wider">Target:</span>
        <input
          readOnly
          value="target.corp.local"
          className="h-6 w-44 bg-zinc-900 border border-zinc-700 rounded text-cyan-400 text-[11px] px-2 outline-none font-mono"
        />
        <div className="w-px h-4 bg-zinc-800" />
        <ToolbarButton variant="cyan">▶ Run All</ToolbarButton>
        <ToolbarButton>DNS Enum</ToolbarButton>
        <ToolbarButton>Subdomain Brute</ToolbarButton>
        <ToolbarButton>Google Dork</ToolbarButton>
        <ToolbarButton>Shodan</ToolbarButton>
        <ToolbarButton className="ml-auto">Export JSON</ToolbarButton>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-3 p-3">
        <OsintCard
          title="IP & Network"
          icon={<svg className="w-3 h-3 text-cyan-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 2v6l3 3"/></svg>}
        >
          <KVRow label="Primary IP"   value="203.0.113.47"          valueColor="text-cyan-400" />
          <KVRow label="IPv6"         value="2001:db8::1"            valueColor="text-cyan-400" />
          <KVRow label="ASN"          value="AS15169 (Google)" />
          <KVRow label="ISP"          value="Google Cloud Platform" />
          <KVRow label="Geolocation"  value="Singapore (SG)" />
          <KVRow label="Hosting"      value="Cloud (GCP)"            valueColor="text-amber-400" />
        </OsintCard>

        <OsintCard
          title="DNS Records"
          icon={<svg className="w-3 h-3 text-green-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h12M2 8h8M2 12h10"/></svg>}
        >
          <KVRow label="A"             value="203.0.113.47"                           valueColor="text-cyan-400" />
          <KVRow label="MX"            value="mail.target.corp.local (10)" />
          <KVRow label="TXT / SPF"     value="v=spf1 include:_spf.google.com ~all"    valueColor="text-green-400" />
          <KVRow label="DMARC"         value="p=none (weak!)"                         valueColor="text-amber-400" />
          <KVRow label="Zone Transfer" value="ALLOWED ← VULN"                         valueColor="text-red-400" />
          <KVRow label="Subdomains"    value="47 found"                               valueColor="text-cyan-400" />
        </OsintCard>

        <OsintCard
          title="Breach Data"
          icon={<svg className="w-3 h-3 text-red-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2L3 7v7h10V7z"/><path d="M6 14v-3h4v3"/></svg>}
          highlight
        >
          <div className="flex items-center gap-2 mb-2">
            <Badge color="red">3 breaches</Badge>
          </div>
          <ul className="space-y-1 mb-2">
            <li className="text-[10.5px] text-red-400 flex items-center gap-1.5"><span className="text-cyan-500">›</span>LinkedIn 2021 — 500M records</li>
            <li className="text-[10.5px] text-red-400 flex items-center gap-1.5"><span className="text-cyan-500">›</span>RockYou2024 — plaintext passwords</li>
            <li className="text-[10.5px] text-amber-400 flex items-center gap-1.5"><span className="text-cyan-500">›</span>Adobe 2013 — encrypted passwords</li>
          </ul>
          <div className="border-t border-zinc-800 pt-2">
            <KVRow label="Leaked creds"  value="admin@corp.local : P@ssw0rd!" valueColor="text-red-400" />
            <KVRow label="Emails leaked" value="14 unique"                    valueColor="text-amber-400" />
          </div>
        </OsintCard>

        <OsintCard
          title="Technology Stack"
          icon={<svg className="w-3 h-3 text-purple-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>}
        >
          <KVRow label="Web Server" value="Apache 2.4.51 (outdated)" />
          <KVRow label="Backend"    value="PHP 7.4.33" />
          <KVRow label="Framework"  value="Laravel 8.x"              valueColor="text-cyan-400" />
          <KVRow label="Database"   value="MySQL 5.7" />
          <KVRow label="CMS"        value="WordPress 5.9.3"          valueColor="text-amber-400" />
          <KVRow label="SSL"        value="TLS 1.3 (Let's Encrypt)"  valueColor="text-green-400" />
        </OsintCard>

        <OsintCard
          title="Subdomains Found (47) — Top interesting"
          icon={<svg className="w-3 h-3 text-cyan-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 8h10M8 3v10"/></svg>}
          colSpan2
        >
          <SubdomainGrid />
        </OsintCard>
      </div>
    </div>
  )
}
