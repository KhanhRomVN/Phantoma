import { cn } from '../../../../shared/lib/utils'
import { KVRow, ProgressBar, ActionButton } from '../../../../../core/components/common/ui'
import { mockScanProgress } from '../../data/mockData'

// ─── Shared ──────────────────────────────────────────────────────────────────

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[9.5px] font-bold text-[#3d4a61] uppercase tracking-[0.09em] pb-[5px] border-b border-[#1e2535] mb-[6px]">
    {children}
  </div>
)

// ─── TargetInfo ──────────────────────────────────────────────────────────────

function TargetInfo() {
  return (
    <div className="mb-4">
      <SectionTitle>Selected Target</SectionTitle>
      <KVRow label="Hostname"   value="target.corp.local"    valueColor="text-cyan-400" />
      <KVRow label="IP Address" value="203.0.113.47" />
      <KVRow label="Status"     value="Online"               valueColor="text-green-400" />
      <KVRow label="OS"         value="Ubuntu 20.04 LTS" />
      <KVRow label="Open Ports" value="22, 80, 443, 3306"    valueColor="text-amber-400" />
      <KVRow label="Risk Score" value="CRITICAL (94/100)"    valueColor="text-red-400" />
    </div>
  )
}

// ─── ScanProgress ────────────────────────────────────────────────────────────

function ScanProgress() {
  return (
    <div className="mb-4">
      <SectionTitle>Scan Progress</SectionTitle>
      <div className="space-y-2">
        {mockScanProgress.map((p) => (
          <div key={p.label}>
            <div className="flex justify-between text-[10px] text-[#6b7a96] mb-1">
              <span>{p.label}</span>
              <span className={p.pct === 100 ? 'text-green-400' : p.pct > 0 ? 'text-cyan-400' : 'text-[#3d4a61]'}>
                {p.pct === 0 ? 'Queued' : `${p.pct}%`}
              </span>
            </div>
            <ProgressBar pct={p.pct} color={p.color} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── QuickStats ──────────────────────────────────────────────────────────────

const STATS = [
  { val: '27', label: 'Vulnerabilities', color: 'text-red-400',    border: 'border-red-500/20' },
  { val: '3',  label: 'Critical RCE',    color: 'text-purple-400', border: 'border-purple-500/20' },
  { val: '47', label: 'Subdomains',      color: 'text-green-400',  border: 'border-green-500/18' },
  { val: '12', label: 'Hosts Up',        color: 'text-cyan-400',   border: 'border-cyan-500/18' },
]

function QuickStats() {
  return (
    <div className="mb-4">
      <SectionTitle>Quick Stats</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        {STATS.map((s) => (
          <div key={s.label} className={cn('bg-[#080a0e] border rounded-md p-2 text-center', s.border)}>
            <div className={cn('text-xl font-bold', s.color)}>{s.val}</div>
            <div className="text-[9.5px] text-[#6b7a96]">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── AttackSurface ───────────────────────────────────────────────────────────

function AttackSurface() {
  return (
    <div className="mb-4">
      <SectionTitle>Attack Surface</SectionTitle>
      <KVRow label="Exposed services" value="Telnet, FTP (plaintext)" valueColor="text-red-400" />
      <KVRow label="Auth endpoints"   value="3 (brute-forceable)"    valueColor="text-amber-400" />
      <KVRow label="Unpatched CVEs"   value="MS17-010, Log4Shell"    valueColor="text-red-400" />
      <KVRow label="API endpoints"    value="24 discovered" />
    </div>
  )
}

// ─── ActionButtons ───────────────────────────────────────────────────────────

const ACTIONS = [
  { label: 'Start Full Exploitation', variant: 'red'    },
  { label: 'Run Post-Exploitation',   variant: 'green'  },
  { label: 'Generate Full Report',    variant: 'cyan'   },
  { label: 'Export to Metasploit',    variant: 'purple' },
] as const

function ActionButtons() {
  return (
    <div>
      <SectionTitle>Actions</SectionTitle>
      {ACTIONS.map((a) => (
        <ActionButton key={a.label} variant={a.variant}>
          <span className="opacity-40 text-xs">›</span>
          {a.label}
        </ActionButton>
      ))}
    </div>
  )
}

// ─── RightPanel (main export) ────────────────────────────────────────────────

export function RightPanel() {
  return (
    <div className="w-[300px] shrink-0 bg-[#141924] border-l border-[#1e2535] flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-3 h-[38px] border-b border-[#1e2535] bg-[#0f1319] shrink-0">
        <span className="font-[Rajdhani,sans-serif] text-[14px] font-bold tracking-wider text-[#c5cfe0] uppercase flex-1">Inspector</span>
        <button className="text-[#3d4a61] text-[10px] hover:text-[#6b7a96] transition-colors">⋯</button>
      </div>
      <div className="flex-1 overflow-y-auto p-2.5 [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-[#252e42] [&::-webkit-scrollbar-thumb]:rounded-sm">
        <TargetInfo />
        <ScanProgress />
        <QuickStats />
        <AttackSurface />
        <ActionButtons />
      </div>
    </div>
  )
}
