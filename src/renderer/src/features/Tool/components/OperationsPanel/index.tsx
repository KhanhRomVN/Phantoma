import { useState } from 'react'
import { cn } from '../../../../shared/lib/utils'
import { Badge, SectionLabel, PulseIndicator } from '../../../../core/components/ui'
import { BadgeColor } from '../../types/types'
import { mockTargets, mockWordlists, mockCVEs } from '../../data/mockData'

// ─── TreeItem ────────────────────────────────────────────────────────────────

interface TreeItemProps {
  label: string
  badge?: string
  badgeColor?: BadgeColor
  icon?: React.ReactNode
  selected?: boolean
  selectedVariant?: 'cyan' | 'red'
  onClick?: () => void
}

function TreeItem({ label, badge, badgeColor = 'gray', icon, selected, selectedVariant = 'cyan', onClick }: TreeItemProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-[7px] px-2 py-[5px] rounded-[5px] cursor-pointer border transition-all text-[11px]',
        selected && selectedVariant === 'cyan' && 'bg-cyan-500/6 border-cyan-500/20 text-cyan-400',
        selected && selectedVariant === 'red'  && 'bg-red-500/6 border-red-500/20 text-red-400',
        !selected && 'border-transparent text-[#c5cfe0] hover:bg-[#161b26] hover:border-[#1e2535]',
      )}
    >
      {icon && <span className="w-3.5 h-3.5 shrink-0 opacity-75">{icon}</span>}
      <span className="flex-1 truncate">{label}</span>
      {badge && badgeColor && <Badge color={badgeColor}>{badge}</Badge>}
    </div>
  )
}

// ─── TargetsPanel ────────────────────────────────────────────────────────────

function TargetsPanel() {
  return (
    <>
      <SectionLabel>Active Targets</SectionLabel>
      {mockTargets.map((t, i) => (
        <TreeItem
          key={t.id}
          label={t.label}
          badge={t.badge}
          badgeColor={t.badgeColor}
          selected={i === 0}
          selectedVariant={t.badgeColor === 'red' ? 'red' : 'cyan'}
          icon={
            i === 3 ? (
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5">
                <path d="M8 2L3 7v7h10V7z"/>
              </svg>
            ) : i === 2 ? (
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5">
                <rect x="2" y="5" width="12" height="8" rx="1"/><path d="M5 5V4a3 3 0 0 1 6 0v1"/>
              </svg>
            ) : i === 1 ? (
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5">
                <circle cx="8" cy="8" r="6"/>
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5">
                <rect x="2" y="3" width="12" height="10" rx="1.5"/>
              </svg>
            )
          }
        />
      ))}
    </>
  )
}

// ─── SessionsPanel ───────────────────────────────────────────────────────────

interface Session {
  id: string; ip: string; type: string; typeColor: 'green' | 'cyan' | 'amber'
  user: string; os: string; uptime: string; isActive: boolean
}

const SESSIONS: Session[] = [
  { id: '#1', ip: '192.168.1.10', type: 'meterpreter', typeColor: 'green', user: 'NT AUTHORITY\\SYSTEM', os: 'Windows Server 2019', uptime: '00:23:41', isActive: true },
  { id: '#2', ip: '192.168.1.20', type: 'shell',       typeColor: 'cyan',  user: 'www-data',            os: 'Linux/Ubuntu 20.04',  uptime: '00:11:08', isActive: false },
  { id: '#3', ip: '10.0.0.50',    type: 'ssh',         typeColor: 'amber', user: 'root',                os: 'Debian 11',           uptime: '00:04:22', isActive: false },
]

const SESSION_TYPE_CLASS: Record<string, string> = {
  green: 'bg-green-500/10 text-green-400 border border-green-500/20',
  cyan:  'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
  amber: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
}

const PULSE_COLOR: Record<string, string> = {
  green: 'bg-green-400', cyan: 'bg-cyan-400', amber: 'bg-amber-400',
}

function SessionsPanel() {
  return (
    <>
      <SectionLabel>Active Sessions</SectionLabel>
      {SESSIONS.map((s) => (
        <div
          key={s.id}
          className={`rounded-md border px-2.5 py-2 mb-1.5 cursor-pointer transition-all ${
            s.isActive ? 'bg-green-500/4 border-green-500/25' : 'bg-[#111520] border-[#1e2535] hover:border-[#252e42] hover:bg-[#161b26]'
          }`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${PULSE_COLOR[s.typeColor]} ${s.isActive ? 'animate-pulse' : ''}`}
              style={s.isActive ? { animationDuration: '1.2s' } : {}} />
            <span className="text-[10px] text-[#3d4a61]">{s.id}</span>
            <span className={`text-[12px] font-bold ${s.isActive ? 'text-green-400' : 'text-[#c5cfe0]'}`}>{s.ip}</span>
            <span className={`ml-auto text-[9.5px] px-1.5 py-0.5 rounded ${SESSION_TYPE_CLASS[s.typeColor]}`}>{s.type}</span>
          </div>
          {[['User', s.user, s.isActive ? 'text-cyan-400' : 'text-[#c5cfe0]'], ['OS', s.os, 'text-[#c5cfe0]'], ['Uptime', s.uptime, 'text-green-400']].map(([label, val, cls], idx, arr) => (
            <div key={label} className={`flex items-center gap-1.5 py-0.5 text-[10.5px] ${idx < arr.length - 1 ? 'border-b border-white/[0.02]' : ''}`}>
              <span className="text-[#6b7a96] min-w-[60px] shrink-0">{label}</span>
              <span className={cls}>{val}</span>
            </div>
          ))}
        </div>
      ))}
    </>
  )
}

// ─── ArsenalPanel ────────────────────────────────────────────────────────────

function ArsenalPanel() {
  return (
    <>
      <SectionLabel>Wordlists</SectionLabel>
      {mockWordlists.map((w) => (
        <TreeItem key={w.id} label={w.label} badge={w.badge} badgeColor={w.badgeColor}
          icon={<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3.5 h-3.5"><path d="M3 2h10l1 3H2z"/><path d="M2 5h12v9H2z"/><path d="M5 8h6M5 11h4"/></svg>}
        />
      ))}
      <SectionLabel>CVE Database</SectionLabel>
      {mockCVEs.map((cve) => (
        <TreeItem key={cve.id} label={cve.label} badge={cve.badge} badgeColor={cve.badgeColor}
          icon={
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"
              className={`w-3.5 h-3.5 ${cve.badgeColor === 'red' ? 'text-red-400' : cve.badgeColor === 'purple' ? 'text-purple-400' : 'text-amber-400'}`}>
              <path d="M8 1l6 3v4c0 3.5-2.5 6-6 7-3.5-1-6-3.5-6-7V4z"/>
            </svg>
          }
        />
      ))}
    </>
  )
}

// ─── VaultPanel ──────────────────────────────────────────────────────────────

type SourceTag = 'hashdump' | 'phishing' | 'sqli' | 'brute'
type CredStatus = 'valid' | 'unknown'

interface CredEntry { id: string; label: string; detail: string; source: SourceTag; status: CredStatus }

const CREDS: CredEntry[] = [
  { id: '1', label: 'SYSTEM — Administrator',  detail: 'aad3b435...d7b5e5f4',   source: 'hashdump', status: 'valid'   },
  { id: '2', label: 'alice@corp.local',          detail: 'Spring2024!',           source: 'phishing', status: 'valid'   },
  { id: '3', label: 'admin',                     detail: 'admin123',              source: 'brute',    status: 'valid'   },
  { id: '4', label: 'john.doe@corp.local',       detail: '$2y$10$xyz789...',      source: 'sqli',     status: 'valid'   },
  { id: '5', label: 'ceo@corp.local',            detail: 'Secr3t!Pass',           source: 'phishing', status: 'valid'   },
  { id: '6', label: 'SYSTEM — krbtgt',           detail: 'TGT ticket (kerberos)', source: 'hashdump', status: 'unknown' },
]

const SOURCE_CLASS: Record<SourceTag, string> = {
  hashdump: 'bg-red-500/12 text-red-400 border border-red-500/20',
  phishing: 'bg-amber-500/12 text-amber-400 border border-amber-500/20',
  sqli:     'bg-cyan-500/10 text-cyan-400 border border-cyan-500/18',
  brute:    'bg-green-500/10 text-green-400 border border-green-500/18',
}

const STATUS_BORDER: Record<CredStatus, string> = {
  valid: 'border-l-[3px] border-l-green-500', unknown: 'border-l-[3px] border-l-amber-500',
}

const LABEL_COLOR: Record<CredStatus, string> = {
  valid: 'text-green-400', unknown: 'text-amber-400',
}

function VaultPanel() {
  return (
    <>
      <SectionLabel>Credential Vault</SectionLabel>
      {CREDS.map((c) => (
        <div key={c.id} className={`flex items-center gap-2 bg-[#111520] border border-[#1e2535] rounded px-2.5 py-1.5 mb-1 ${STATUS_BORDER[c.status]}`}>
          <div className="flex-1 min-w-0">
            <div className={`text-[11px] font-semibold truncate ${LABEL_COLOR[c.status]}`}>{c.label}</div>
            <div className="text-[10px] text-[#6b7a96] truncate">{c.detail}</div>
          </div>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap shrink-0 ${SOURCE_CLASS[c.source]}`}>{c.source}</span>
        </div>
      ))}
      <button className="w-full mt-2 px-2.5 py-1.5 rounded border border-[#252e42] bg-[#161b26] text-[10.5px] font-semibold text-[#c5cfe0] flex items-center gap-1.5 hover:border-cyan-500/40 hover:text-cyan-400 hover:bg-cyan-500/5 transition-all">
        <span className="opacity-40 text-xs">›</span> Export All Credentials
      </button>
    </>
  )
}

// ─── ReportsPanel ────────────────────────────────────────────────────────────

function ReportsPanel() {
  return (
    <div className="flex flex-col items-center justify-center h-32 text-[#3d4a61] text-[11px] gap-2">
      <svg className="w-6 h-6" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1">
        <path d="M4 2h8l2 3v9H2V2z"/><path d="M4 7h8M4 10h5"/>
      </svg>
      No reports generated
    </div>
  )
}

// ─── PhantomSidebar (main export) ────────────────────────────────────────────

type SidebarTab = 'targets' | 'sessions' | 'arsenal' | 'vault'

const TABS: { id: SidebarTab; label: string }[] = [
  { id: 'targets',  label: 'Targets'  },
  { id: 'sessions', label: 'Sessions' },
  { id: 'arsenal',  label: 'Arsenal'  },
  { id: 'vault',    label: 'Vault'    },
]

export function PhantomSidebar() {
  const [activeTab, setActiveTab] = useState<SidebarTab>('targets')

  return (
    <div className="w-[272px] shrink-0 bg-[#141924] border-r border-[#1e2535] flex flex-col overflow-hidden">
      <div className="px-3 py-2.5 border-b border-[#1e2535] shrink-0">
        <div className="font-[Rajdhani,sans-serif] text-base font-bold tracking-wider text-[#c5cfe0] uppercase">PHANTOM</div>
        <div className="text-[10px] text-[#6b7a96] mt-0.5">Offensive Security Suite v2.5.0</div>
      </div>
      <div className="flex border-b border-[#1e2535] shrink-0">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn('flex-1 h-8 text-[9.5px] font-semibold tracking-wide border-b-2 transition-all',
              activeTab === tab.id ? 'text-cyan-400 border-cyan-400 bg-cyan-500/5' : 'text-[#6b7a96] border-transparent hover:text-[#c5cfe0]'
            )}>
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
        {activeTab === 'targets'  && <TargetsPanel />}
        {activeTab === 'sessions' && <SessionsPanel />}
        {activeTab === 'arsenal'  && <ArsenalPanel />}
        {activeTab === 'vault'    && <VaultPanel />}
      </div>
    </div>
  )
}
