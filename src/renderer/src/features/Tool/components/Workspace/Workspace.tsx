import { useState } from 'react'
import { PhantomModule } from '../../types/phantom'
import { MODULE_WS_TABS } from '../../constants/modules'
import { WorkspaceTopbar } from './WorkspaceTopbar'
import { WorkspaceTabs } from './WorkspaceTabs'
import { StatusBar } from './StatusBar'
import { ViewRecon }      from './views/ViewRecon'
import { ViewScanner }    from './views/ViewScanner'
import { ViewVulns }      from './views/ViewVulns'
import { ViewExploit }    from './views/ViewExploit'
import { ViewPostExploit }from './views/ViewPostExploit'
import { ViewIntruder }   from './views/ViewIntruder'
import { ViewSqli }       from './views/ViewSqli'
import { ViewForensics }  from './views/ViewForensics'
import { ViewMalware }    from './views/ViewMalware'
import { ViewSniffer }    from './views/ViewSniffer'
import { ViewCracking }   from './views/ViewCracking'
import { ViewPhishing }   from './views/ViewPhishing'
import { ViewCloud }      from './views/ViewCloud'
import { ViewReport }     from './views/ViewReport'
import { ViewAI }         from './views/ViewAI'
import { ViewCollab }     from './views/ViewCollab'
import { ViewStub }       from './views/ViewStub'

interface WorkspaceProps {
  module: PhantomModule
}

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

export function Workspace({ module }: WorkspaceProps) {
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
