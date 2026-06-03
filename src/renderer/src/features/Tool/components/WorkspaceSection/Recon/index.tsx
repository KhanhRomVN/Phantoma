import { cn } from '../../../../../shared/lib/utils'
import { Badge, KVRow, ToolbarButton } from '../../../../../../core/components/common/ui'
import { mockSubdomains } from '../../../data/mockData'

// ─── SubdomainGrid ───────────────────────────────────────────────────────────

function SubdomainGrid() {
  return (
    <div className="grid grid-cols-4 gap-2">
      {mockSubdomains.map((s) => (
        <div key={s.sub} className={cn('bg-[#161b26] border rounded p-2', s.risk === 'high' ? 'border-red-500/20' : 'border-[#1e2535]')}>
          <div className="text-[9px] text-[#3d4a61]">
            {s.status === 200 ? '200 OK' : s.status === 301 ? '301 Redirect' : s.status === 403 ? '403 Forbidden' : '404 Not Found'}
          </div>
          <div className={cn('text-[11px] font-mono truncate mt-0.5',
            s.risk === 'high' ? 'text-red-400' : s.status === 404 ? 'text-[#6b7a96]' : 'text-[#c5cfe0]',
          )}>
            {s.sub.split('.')[0]}.…
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── OsintCard ───────────────────────────────────────────────────────────────

function OsintCard({ title, icon, children, highlight, colSpan2 }: {
  title: React.ReactNode; icon?: React.ReactNode; children: React.ReactNode
  highlight?: boolean; colSpan2?: boolean
}) {
  return (
    <div className={cn('bg-[#111520] border rounded-[7px] p-3',
      highlight ? 'border-red-500/20' : 'border-[#1e2535]', colSpan2 && 'col-span-2',
    )}>
      <div className="flex items-center gap-1.5 text-[9.5px] font-bold text-[#3d4a61] uppercase tracking-[0.08em] mb-2">
        {icon}{title}
      </div>
      {children}
    </div>
  )
}

// ─── Recon (main export) ─────────────────────────────────────────────────────

const Toolbar = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-[5px] px-[10px] h-[38px] bg-[#0f1319] border-b border-[#1e2535] shrink-0 overflow-x-auto [&::-webkit-scrollbar]:h-0">{children}</div>
)
const TbSep = () => <div className="w-px h-[18px] bg-[#1e2535] shrink-0" />
const TbLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[9.5px] text-[#3d4a61] uppercase tracking-[0.07em] mx-0.5 whitespace-nowrap">{children}</span>
)

export function ViewRecon() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Toolbar>
        <TbLabel>Target:</TbLabel>
        <input readOnly value="target.corp.local"
          className="h-6 w-44 bg-[#111520] border border-[#252e42] rounded text-cyan-400 text-[11px] px-2 outline-none font-mono" />
        <TbSep />
        <ToolbarButton variant="cyan">▶ Run All</ToolbarButton>
        <ToolbarButton>DNS Enum</ToolbarButton>
        <ToolbarButton>Subdomain Brute</ToolbarButton>
        <ToolbarButton>Google Dork</ToolbarButton>
        <ToolbarButton>Shodan</ToolbarButton>
        <ToolbarButton>HIBP</ToolbarButton>
        <TbSep />
        <ToolbarButton className="ml-auto">Export JSON</ToolbarButton>
      </Toolbar>
      <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2 p-[10px] bg-[#080a0e]">
        <OsintCard title="IP & Network"
          icon={<svg className="w-3 h-3 text-cyan-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/></svg>}
        >
          <KVRow label="Primary IP"  value="203.0.113.47"         valueColor="text-cyan-400" />
          <KVRow label="IPv6"        value="2001:db8::1"           valueColor="text-cyan-400" />
          <KVRow label="ASN"         value="AS15169 (Google)" />
          <KVRow label="ISP"         value="Google Cloud Platform" />
          <KVRow label="Geolocation" value="Singapore (SG)" />
          <KVRow label="Hosting"     value="Cloud (GCP)"           valueColor="text-amber-400" />
        </OsintCard>
        <OsintCard title="DNS Records"
          icon={<svg className="w-3 h-3 text-green-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h12M2 8h8M2 12h10"/></svg>}
        >
          <KVRow label="A"             value="203.0.113.47"                        valueColor="text-cyan-400" />
          <KVRow label="MX"            value="mail.target.corp.local" />
          <KVRow label="SPF"           value="v=spf1 include:_spf.google.com ~all" valueColor="text-green-400" />
          <KVRow label="DMARC"         value="p=none (weak!)"                      valueColor="text-amber-400" />
          <KVRow label="Zone Transfer" value="ALLOWED ← VULN"                      valueColor="text-red-400" />
          <KVRow label="Subdomains"    value="47 found"                            valueColor="text-cyan-400" />
        </OsintCard>
        <OsintCard title="Breach Data"
          icon={<svg className="w-3 h-3 text-red-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2L3 7v7h10V7z"/></svg>}
          highlight
        >
          <div className="flex items-center gap-2 mb-2"><Badge color="red">3 breaches</Badge></div>
          <ul className="space-y-1 mb-2">
            <li className="text-[10.5px] text-red-400 flex items-center gap-1.5"><span className="text-cyan-400">›</span>LinkedIn 2021 — 500M records</li>
            <li className="text-[10.5px] text-red-400 flex items-center gap-1.5"><span className="text-cyan-400">›</span>RockYou2024 — plaintext passwords</li>
            <li className="text-[10.5px] text-amber-400 flex items-center gap-1.5"><span className="text-cyan-400">›</span>Adobe 2013 — encrypted passwords</li>
          </ul>
          <div className="border-t border-[#1e2535] pt-2">
            <KVRow label="Leaked creds"  value="admin@corp.local : P@ssw0rd!" valueColor="text-red-400" />
            <KVRow label="Emails leaked" value="14 unique"                    valueColor="text-amber-400" />
          </div>
        </OsintCard>
        <OsintCard title="Technology Stack"
          icon={<svg className="w-3 h-3 text-purple-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>}
        >
          <KVRow label="Web Server" value="Apache 2.4.51" />
          <KVRow label="Backend"    value="PHP 7.4.33" />
          <KVRow label="Framework"  value="Laravel 8.x"             valueColor="text-cyan-400" />
          <KVRow label="Database"   value="MySQL 5.7" />
          <KVRow label="CMS"        value="WordPress 5.9.3"         valueColor="text-amber-400" />
          <KVRow label="SSL"        value="TLS 1.3 (Let's Encrypt)" valueColor="text-green-400" />
        </OsintCard>
        <OsintCard title="Subdomains Found (47)"
          icon={<svg className="w-3 h-3 text-cyan-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 8h10M8 3v10"/></svg>}
          colSpan2
        >
          <SubdomainGrid />
        </OsintCard>
      </div>
    </div>
  )
}
