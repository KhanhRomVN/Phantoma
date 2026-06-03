import { useState } from 'react'
import { cn } from '../../../../shared/lib/utils'
import { PhantomModule } from '../../types/types'
import { MODULE_TITLES, MODULE_WS_TABS } from '../../constants/modules'
import { PulseIndicator } from '../../../../../core/components/common/ui'
import { useLiveClock } from '../../hooks/useLiveClock'
import { ViewRecon }       from './Recon'
import { ViewScanner }     from './Scanner'
import { ViewVulns }       from './Vulns'
import { ViewExploit }     from './Exploit'
import { ViewPostExploit } from './PostExploit'
import { ViewIntruder }    from './Intruder'
import { ViewSqli }        from './Sqli'
import { ViewForensics }   from './Forensics'
import { ViewMalware }     from './Malware'
import { ViewSniffer }     from './Sniffer'
import { ViewCracking }    from './Cracking'
import { ViewPhishing }    from './Phishing'
import { ViewCloud }       from './Cloud'
import { ViewReport }      from './Report'
import { ViewAI }          from './AI'
import { ViewCollab }      from './Collab'
import { ViewStub }        from './Stub'

// ─── StatusBar ───────────────────────────────────────────────────────────────

const SEP = () => <div className="w-px h-3 bg-[#1e2535] shrink-0" />

function StatusBar({ module }: { module: PhantomModule }) {
  const now = useLiveClock()
  const title = MODULE_TITLES[module] ?? module

  return (
    <div className="flex items-center gap-4 h-[22px] bg-[#0f1319] border-t border-[#1e2535] px-3 text-[9.5px] text-[#3d4a61] overflow-hidden shrink-0 select-none">
      <span>Module: <span className="text-[#6b7a96]">{title}</span></span>
      <SEP />
      <span>Target: <span className="text-[#6b7a96]">target.corp.local</span></span>
      <SEP />
      <span>Sessions: <span className="text-green-400">3 active</span></span>
      <SEP />
      <span>Vulns: <span className="text-red-400">27</span></span>
      <SEP />
      <span>Creds: <span className="text-green-400">14 cracked</span></span>
      <SEP />
      <span>Phishing: <span className="text-amber-400">11 harvested</span></span>
      <SEP />
      <span>Tunnel: <span className="text-green-400">TUN0 UP</span></span>
      <span className="ml-auto text-[#6b7a96] font-mono">{now}</span>
    </div>
  )
}

// ─── WorkspaceTopbar ─────────────────────────────────────────────────────────

function WorkspaceTopbar({ module }: { module: PhantomModule }) {
  const title = MODULE_TITLES[module] ?? module

  return (
    <div className="flex items-center gap-2.5 px-3.5 h-[38px] bg-[#0f1319] border-b border-[#1e2535] shrink-0">
      <span className="font-[Rajdhani,sans-serif] text-[13px] font-semibold text-[#6b7a96] tracking-wide">
        PHANTOM / <span className="text-[#c5cfe0]">{title}</span>{' '}
        / <span className="text-cyan-400" id="breadcrumb-target">target.corp.local</span>
      </span>
      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-[10px] text-green-400">
          <PulseIndicator /> Session Active
        </div>
        <span className="text-[10px] text-[#6b7a96] px-1.5 py-0.5 border border-[#252e42] rounded">
          TUN0: 10.10.14.5
        </span>
        <span className="text-[10px] text-[#3d4a61]">3 sessions</span>
      </div>
    </div>
  )
}

// ─── WorkspaceTabs ───────────────────────────────────────────────────────────

const ACTIVE_TAB_CLASS: Partial<Record<PhantomModule, string>> = {
  recon:    'text-cyan-400 border-cyan-400 bg-cyan-500/5',
  scanner:  'text-green-400 border-green-400 bg-green-500/5',
  vulns:    'text-red-400 border-red-400 bg-red-500/4',
  intruder: 'text-amber-400 border-amber-400 bg-amber-500/4',
  forensics:'text-purple-400 border-purple-400 bg-purple-500/5',
}

function WorkspaceTabs({ module, activeTab, onTabChange }: {
  module: PhantomModule
  activeTab: string
  onTabChange: (tab: string) => void
}) {
  const tabs = MODULE_WS_TABS[module] ?? []
  const activeClass = ACTIVE_TAB_CLASS[module] ?? 'text-cyan-400 border-cyan-400 bg-cyan-500/5'

  return (
    <div className="flex border-b border-[#1e2535] bg-[#0f1319] shrink-0 overflow-x-auto [&::-webkit-scrollbar]:h-0">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={cn(
            'h-9 px-3.5 flex items-center text-[11.5px] font-medium border-b-2 whitespace-nowrap cursor-pointer border-r border-[#1e2535] transition-all',
            activeTab === tab
              ? activeClass
              : 'border-b-transparent text-[#6b7a96] hover:text-[#c5cfe0] hover:bg-[#161b26]',
          )}
        >
          {tab}
        </button>
      ))}
      <button className="h-9 px-3.5 flex items-center text-[11.5px] font-medium border-b-2 border-b-purple-400 text-purple-400 cursor-pointer ml-auto bg-purple-500/8 hover:bg-purple-500/12 transition-all">
        + Tab
      </button>
    </div>
  )
}

// ─── ViewRouter ──────────────────────────────────────────────────────────────

function ViewRouter({ module }: { module: PhantomModule }) {
  switch (module) {
    case 'recon':     return <ViewRecon />
    case 'scanner':   return <ViewScanner />
    case 'vulns':     return <ViewVulns />
    case 'exploit':   return <ViewExploit />
    case 'post':      return <ViewPostExploit />
    case 'intruder':  return <ViewIntruder />
    case 'webapp':    return <ViewStub title="Web App Scanner" description="Spider, active scan, and passive scan" />
    case 'sqli':      return <ViewSqli />
    case 'forensics': return <ViewForensics />
    case 'malware':   return <ViewMalware />
    case 'sniffer':   return <ViewSniffer />
    case 'cracking':  return <ViewCracking />
    case 'phishing':  return <ViewPhishing />
    case 'cloud':     return <ViewCloud />
    case 'report':    return <ViewReport />
    case 'ai':        return <ViewAI />
    case 'collab':    return <ViewCollab />
    case 'settings':  return <ViewStub title="Settings" description="Configuration & preferences" />
    default:          return <ViewStub title={module} />
  }
}

// ─── Workspace (main export) ─────────────────────────────────────────────────

export function Workspace({ module }: { module: PhantomModule }) {
  const [activeTab, setActiveTab] = useState(MODULE_WS_TABS[module]?.[0] ?? '')
  const tabs = MODULE_WS_TABS[module] ?? []
  const resolvedTab = tabs.includes(activeTab) ? activeTab : tabs[0] ?? ''

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <WorkspaceTopbar module={module} />
      <WorkspaceTabs module={module} activeTab={resolvedTab} onTabChange={setActiveTab} />
      <div className="flex-1 overflow-hidden flex flex-col">
        <ViewRouter module={module} />
      </div>
      <StatusBar module={module} />
    </div>
  )
}
