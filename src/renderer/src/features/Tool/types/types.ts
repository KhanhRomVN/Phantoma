export type PhantomModule =
  | 'recon' | 'scanner' | 'vulns' | 'exploit' | 'post'
  | 'intruder' | 'webapp' | 'sqli' | 'forensics' | 'malware'
  | 'sniffer' | 'cracking' | 'phishing' | 'cloud' | 'report'
  | 'collab' | 'settings' | 'dashboard' | 'target' | 'osint'
  | 'c2'

export type BadgeColor = 'green' | 'red' | 'amber' | 'cyan' | 'purple' | 'gray'
export type PortStatus = 'open' | 'filtered' | 'vuln'
export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export type ScanProgress = { label: string; pct: number; color: BadgeColor | 'gray' }

export type SubMenuItem = {
  id: string;
  title: string;
  disabled?: boolean;
  onClick?: () => void;
}

export type NavModuleConfig = { 
  id: PhantomModule; 
  title: string; 
  activeClass: string; 
  dotColor?: string;
  children?: SubMenuItem[];
}

export type MockTarget    = { id: string; label: string; badge: string; badgeColor: BadgeColor; icon: string }
export type MockHost      = { ip: string; hostname: string; os: string; ports: { number: string; status: PortStatus }[] }
export type MockVuln      = { id: string; severity: SeverityLevel; name: string; cve: string; desc: string; target: string; component: string; cvss: number }
export type MockIntruderResult = { num: string; username: string; password: string; status: number; length: number; time: string; hit: boolean }
export type MockScanLog   = { ts: string; tag: string; tagColor: string; msg: string }
export type MockSubdomain = { sub: string; status: number; risk: 'high' | 'normal' | 'none' }

// ─── Target Group / SubTarget ─────────────────────────────────────────────────

export type SubTargetType = 'website' | 'server' | 'app' | 'api' | 'domain' | 'network' | 'device'

export type SubTarget = {
  id: string
  name: string
  type: SubTargetType
  address: string          // IP, domain, or URL
  status: 'active' | 'idle' | 'scanning' | 'done' | 'offline'
  riskScore?: number       // 0–100
  tags?: string[]
}

export type PhantomTarget = {
  id: string
  name: string             // e.g. "Corp Internal Pentest Q3"
  description?: string
  createdAt: string
  status: 'active' | 'paused' | 'done'
  subTargets: SubTarget[]
}
