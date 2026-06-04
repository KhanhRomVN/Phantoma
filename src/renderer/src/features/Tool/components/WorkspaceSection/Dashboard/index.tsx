// src/renderer/src/features/Tool/components/WorkspaceSection/Dashboard/index.tsx
import { useState, useEffect } from 'react'
import { cn } from '../../../../../shared/lib/utils'
import { Badge, KVRow, ModuleTabBar, ToolbarButton, ProgressBar, PulseIndicator, ActionButton } from '../../../../../core/components/ui'

// ============================================================================
// 1. MOCK DATA (to be replaced with real API data)
// ============================================================================

// Dashboard statistics
const dashboardStats = {
  totalVulnerabilities: 27,
  criticalVulns: 3,
  highVulns: 7,
  mediumVulns: 12,
  lowVulns: 5,
  activeSessions: 3,
  totalTargets: 5,
  completedScans: 12,
  crackedCredentials: 14,
  totalFindings: 47,
  riskScore: 78, // out of 100
}

// Recent activities (timeline)
const recentActivities = [
  { id: 1, time: '09:32:15', type: 'exploit', message: 'Exploited Log4Shell on 192.168.1.20 → root shell', severity: 'critical' },
  { id: 2, time: '09:35:22', type: 'scan', message: 'Port scan completed: 12 hosts up, 47 open ports', severity: 'info' },
  { id: 3, time: '09:38:01', type: 'credential', message: 'Cracked Administrator NTLM hash: P@ssw0rd!', severity: 'high' },
  { id: 4, time: '09:41:33', type: 'session', message: 'New meterpreter session #2 opened on 192.168.1.10 (SYSTEM)', severity: 'success' },
  { id: 5, time: '09:45:12', type: 'vuln', message: 'Found SQL injection on /api/v1/login → full DB access', severity: 'high' },
  { id: 6, time: '09:48:44', type: 'phish', message: 'Phishing campaign "Corp IT Alert" harvested 11 credentials', severity: 'medium' },
  { id: 7, time: '09:52:20', type: 'report', message: 'Generated executive report with 27 findings', severity: 'info' },
]

// Active sessions details
const activeSessions = [
  { id: 1, target: '192.168.1.10', user: 'SYSTEM', type: 'meterpreter', platform: 'Windows', uptime: '2h 14m', lastSeen: 'just now' },
  { id: 2, target: '192.168.1.20', user: 'root', type: 'shell', platform: 'Linux', uptime: '1h 32m', lastSeen: '2 min ago' },
  { id: 3, target: 'target.corp.local', user: 'www-data', type: 'meterpreter', platform: 'Linux', uptime: '45m', lastSeen: '5 min ago' },
]

// Top vulnerabilities (by CVSS)
const topVulnerabilities = [
  { name: 'Log4Shell RCE', cve: 'CVE-2021-44228', cvss: 10.0, severity: 'CRITICAL', target: '192.168.1.20:8080' },
  { name: 'EternalBlue SMB', cve: 'MS17-010', cvss: 9.8, severity: 'CRITICAL', target: '192.168.1.10:445' },
  { name: 'SQL Injection', cve: 'CWE-89', cvss: 8.1, severity: 'HIGH', target: '/api/v1/login' },
  { name: 'Stored XSS', cve: 'CWE-79', cvss: 7.5, severity: 'HIGH', target: '/blog/comments' },
]

// System health / module status
const moduleStatus = [
  { name: 'Recon Engine', status: 'idle', lastRun: '09:15:22', progress: 100 },
  { name: 'Scanner', status: 'running', lastRun: '09:30:00', progress: 42 },
  { name: 'Exploit', status: 'idle', lastRun: '09:38:12', progress: 100 },
  { name: 'Phishing', status: 'idle', lastRun: '09:20:05', progress: 100 },
  { name: 'Cracking', status: 'running', lastRun: '09:45:00', progress: 35 },
]

// ============================================================================
// 2. UI COMPONENTS
// ============================================================================

const Toolbar = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-[5px] px-[10px] h-[38px] bg-[#0f1319] border-b border-[#1e2535] shrink-0 overflow-x-auto">{children}</div>
)

function StatCard({ title, value, icon, color, trend }: { title: string; value: number | string; icon: string; color: string; trend?: { value: number; direction: 'up' | 'down' } }) {
  return (
    <div className="bg-[#111520] border border-[#1e2535] rounded-lg p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-[#6b7a96] uppercase tracking-wide">{title}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className={cn('text-[22px] font-bold font-[Rajdhani]', color)}>{value}</div>
      {trend && <div className="text-[9px] text-[#6b7a96] mt-1">{trend.direction === 'up' ? '↑' : '↓'} {trend.value}% from last week</div>}
    </div>
  )
}

function SeverityPie() {
  const total = dashboardStats.totalVulnerabilities
  const criticalPct = (dashboardStats.criticalVulns / total) * 100
  const highPct = (dashboardStats.highVulns / total) * 100
  const mediumPct = (dashboardStats.mediumVulns / total) * 100
  const lowPct = (dashboardStats.lowVulns / total) * 100
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24 mb-2">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#252e42" strokeWidth="12" />
          <circle cx="50" cy="50" r="40" fill="none" stroke="#a855f7" strokeWidth="12" strokeDasharray={`${criticalPct * 2.51} 251`} strokeDashoffset="0" transform="rotate(-90 50 50)" />
          <circle cx="50" cy="50" r="40" fill="none" stroke="#ff3b5c" strokeWidth="12" strokeDasharray={`${highPct * 2.51} 251`} strokeDashoffset={`-${criticalPct * 2.51}`} transform="rotate(-90 50 50)" />
          <circle cx="50" cy="50" r="40" fill="none" stroke="#ffaa00" strokeWidth="12" strokeDasharray={`${mediumPct * 2.51} 251`} strokeDashoffset={`-${(criticalPct + highPct) * 2.51}`} transform="rotate(-90 50 50)" />
          <circle cx="50" cy="50" r="40" fill="none" stroke="#00d4ff" strokeWidth="12" strokeDasharray={`${lowPct * 2.51} 251`} strokeDashoffset={`-${(criticalPct + highPct + mediumPct) * 2.51}`} transform="rotate(-90 50 50)" />
        </svg>
      </div>
      <div className="flex flex-wrap justify-center gap-2 text-[9px]">
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500"></span><span>Critical {dashboardStats.criticalVulns}</span></div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span><span>High {dashboardStats.highVulns}</span></div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span><span>Medium {dashboardStats.mediumVulns}</span></div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500"></span><span>Low {dashboardStats.lowVulns}</span></div>
      </div>
    </div>
  )
}

// ============================================================================
// 3. MAIN DASHBOARD EXPORT
// ============================================================================

export function ViewDashboard() {
  const [greeting, setGreeting] = useState('')
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 18) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Toolbar>
        <div className="flex items-center gap-2">
          <PulseIndicator />
          <span className="text-[11px] text-green-400">System Online</span>
        </div>
        <div className="w-px h-4 bg-[#1e2535] mx-2" />
        <span className="text-[10px] text-[#6b7a96]">{greeting}, Operator</span>
        <ToolbarButton variant="cyan" className="ml-auto">Refresh Dashboard</ToolbarButton>
      </Toolbar>
      <div className="flex-1 overflow-y-auto p-3 bg-[#080a0e] space-y-3">
        {/* First row: stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          <StatCard title="Vulnerabilities" value={dashboardStats.totalVulnerabilities} icon="⚠️" color="text-red-400" />
          <StatCard title="Active Sessions" value={dashboardStats.activeSessions} icon="🖥️" color="text-green-400" trend={{ value: 12, direction: 'up' }} />
          <StatCard title="Targets" value={dashboardStats.totalTargets} icon="🎯" color="text-cyan-400" />
          <StatCard title="Cracked Creds" value={dashboardStats.crackedCredentials} icon="🔓" color="text-amber-400" />
          <StatCard title="Completed Scans" value={dashboardStats.completedScans} icon="📊" color="text-purple-400" />
          <StatCard title="Risk Score" value={`${dashboardStats.riskScore}/100`} icon="📈" color={dashboardStats.riskScore > 70 ? 'text-red-400' : 'text-amber-400'} />
        </div>

        {/* Second row: vulnerability summary + recent activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Left: Vulnerability distribution */}
          <div className="bg-[#111520] border border-[#1e2535] rounded-lg p-3">
            <div className="text-[11px] font-bold text-cyan-400 mb-2 flex items-center gap-2">📊 Vulnerability Distribution <Badge color="red">{dashboardStats.totalVulnerabilities} total</Badge></div>
            <SeverityPie />
            <div className="mt-2 pt-2 border-t border-[#1e2535]">
              <div className="flex justify-between text-[10px] mb-1"><span>Average CVSS</span><span className="text-amber-400">7.4</span></div>
              <ProgressBar pct={74} color="amber" />
              <ActionButton size="sm" variant="cyan" className="mt-2 w-full">View All Vulnerabilities</ActionButton>
            </div>
          </div>

          {/* Middle: Recent activity timeline */}
          <div className="bg-[#111520] border border-[#1e2535] rounded-lg p-3">
            <div className="text-[11px] font-bold text-cyan-400 mb-2">🕒 Recent Activity</div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {recentActivities.map(act => (
                <div key={act.id} className="flex items-start gap-2 text-[9.5px] border-b border-[#1e2535]/40 pb-1.5 last:border-0">
                  <span className="text-[#3d4a61] w-12 shrink-0">{act.time}</span>
                  <Badge color={act.severity === 'critical' ? 'red' : act.severity === 'high' ? 'amber' : act.severity === 'success' ? 'green' : 'gray'} className="shrink-0">{act.type}</Badge>
                  <span className="text-[#c5cfe0]">{act.message}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Top vulnerabilities */}
          <div className="bg-[#111520] border border-[#1e2535] rounded-lg p-3">
            <div className="text-[11px] font-bold text-cyan-400 mb-2">🔥 Top Vulnerabilities</div>
            <div className="space-y-2">
              {topVulnerabilities.map(v => (
                <div key={v.name} className="bg-[#0f1319] rounded p-2">
                  <div className="flex justify-between items-center"><span className="text-[10px] font-semibold text-red-400">{v.name}</span><Badge color={v.severity === 'CRITICAL' ? 'purple' : 'red'}>{v.severity}</Badge></div>
                  <div className="text-[9px] text-[#6b7a96] font-mono">{v.cve} · CVSS {v.cvss}</div>
                  <div className="text-[9px] text-cyan-400 truncate">{v.target}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Third row: Active sessions + module status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="bg-[#111520] border border-[#1e2535] rounded-lg p-3">
            <div className="text-[11px] font-bold text-cyan-400 mb-2 flex items-center justify-between">🖥️ Active Sessions <Badge color="green">{dashboardStats.activeSessions} online</Badge></div>
            <table className="w-full text-[10px]">
              <thead><tr className="border-b border-[#1e2535]"><th className="text-left py-1">Target</th><th>User</th><th>Type</th><th>Uptime</th><th></th></tr></thead>
              <tbody>
                {activeSessions.map(s => (
                  <tr key={s.id} className="border-b border-[#1e2535]/50 hover:bg-[#0f1319]">
                    <td className="py-1.5 font-mono text-cyan-400">{s.target}</td>
                    <td className="py-1.5 text-green-400">{s.user}</td>
                    <td className="py-1.5"><Badge color="gray">{s.type}</Badge></td>
                    <td className="py-1.5 text-[#6b7a96]">{s.uptime}</td>
                    <td className="py-1.5"><ActionButton size="sm">Interact</ActionButton></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-[#111520] border border-[#1e2535] rounded-lg p-3">
            <div className="text-[11px] font-bold text-cyan-400 mb-2">⚙️ Module Status</div>
            {moduleStatus.map(m => (
              <div key={m.name} className="mb-2">
                <div className="flex justify-between text-[10px] mb-0.5"><span>{m.name}</span><span className={m.status === 'running' ? 'text-green-400' : 'text-[#6b7a96]'}>{m.status}</span></div>
                <ProgressBar pct={m.progress} color={m.status === 'running' ? 'cyan' : 'gray'} />
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions footer */}
        <div className="bg-[#111520] border border-[#1e2535] rounded-lg p-3">
          <div className="text-[11px] font-bold text-cyan-400 mb-2">⚡ Quick Actions</div>
          <div className="flex flex-wrap gap-2">
            <ActionButton variant="cyan">▶ New Scan</ActionButton>
            <ActionButton variant="red">Launch Exploit</ActionButton>
            <ActionButton variant="green">Generate Report</ActionButton>
            <ActionButton variant="amber">Start Phishing Campaign</ActionButton>
            <ActionButton variant="purple">Check for Updates</ActionButton>
          </div>
        </div>
      </div>
    </div>
  )
}