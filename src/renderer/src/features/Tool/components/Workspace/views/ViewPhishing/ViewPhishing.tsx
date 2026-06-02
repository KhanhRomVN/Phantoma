import { cn } from '../../../../../../shared/lib/utils'
import { ToolbarButton } from '../../../ui/ToolbarButton'
import { Badge } from '../../../ui/Badge'

const CAMPAIGNS = [
  { name: 'Corp IT Alert',  target: 'All employees', sent: 248, opened: 187, clicked: 94, creds: 31, status: 'active' },
  { name: 'HR Policy 2024', target: 'Finance dept',  sent: 42,  opened: 38,  clicked: 29, creds: 12, status: 'active' },
  { name: 'VPN Renewal',    target: 'IT admins',     sent: 15,  opened: 14,  clicked: 11, creds: 7,  status: 'paused' },
]

const CREDS = [
  { time: '09:12', email: 'alice@corp.local',    password: 'Spring2024!',  ip: '10.0.0.45',  high: false },
  { time: '09:15', email: 'bob@corp.local',       password: 'Corp@1234',    ip: '10.0.0.82',  high: false },
  { time: '09:22', email: 'ceo@corp.local',       password: 'Secr3t!Pass',  ip: '10.0.0.11',  high: true  },
  { time: '09:31', email: 'it.admin@corp.local',  password: 'ADm1n#2024',   ip: '10.0.0.5',   high: true  },
  { time: '09:44', email: 'finance@corp.local',   password: 'Money$$123',   ip: '10.0.0.92',  high: false },
]

export function ViewPhishing() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center gap-2 px-3 h-10 border-b border-zinc-800 bg-zinc-950 shrink-0 overflow-x-auto">
        <ToolbarButton variant="cyan">New Campaign</ToolbarButton>
        <ToolbarButton>Clone Site</ToolbarButton>
        <ToolbarButton>Email Template</ToolbarButton>
        <ToolbarButton variant="amber">GoPhish</ToolbarButton>
        <ToolbarButton>Listener</ToolbarButton>
        <ToolbarButton className="ml-auto">Export Creds</ToolbarButton>
      </div>
      <div className="flex flex-1 overflow-hidden gap-px bg-zinc-800">
        {/* Campaigns */}
        <div className="flex flex-col bg-zinc-900 overflow-hidden" style={{ width: '45%' }}>
          <div className="flex items-center gap-2 px-3 h-8 border-b border-zinc-800 bg-zinc-950 shrink-0">
            <span className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wider flex-1">Campaigns</span>
            <Badge color="green">3 active</Badge>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {CAMPAIGNS.map((c) => (
              <div key={c.name} className={cn(
                'bg-zinc-950 border rounded-md p-3 cursor-pointer hover:border-zinc-700 transition-all',
                c.status === 'active' ? 'border-green-500/20' : 'border-zinc-800',
              )}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[12px] font-semibold text-zinc-200">{c.name}</span>
                  <span className={cn(
                    'ml-auto text-[9px] font-bold px-1.5 py-0 rounded',
                    c.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-zinc-500/10 text-zinc-400 border border-zinc-600',
                  )}>{c.status.toUpperCase()}</span>
                </div>
                <div className="text-[10px] text-zinc-500 mb-2">{c.target}</div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: 'Sent',    value: c.sent,    color: 'text-zinc-300' },
                    { label: 'Opened',  value: c.opened,  color: 'text-cyan-400' },
                    { label: 'Clicked', value: c.clicked, color: 'text-amber-400' },
                    { label: 'Creds',   value: c.creds,   color: 'text-red-400' },
                  ].map((s) => (
                    <div key={s.label} className="bg-zinc-900 rounded p-1">
                      <div className={cn('text-[12px] font-bold', s.color)}>{s.value}</div>
                      <div className="text-[9px] text-zinc-600">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Email Preview */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-md p-3 mt-2">
              <div className="text-[9.5px] font-bold text-zinc-600 uppercase tracking-wider mb-2">Email Preview</div>
              <div className="bg-zinc-900 border border-zinc-700 rounded p-3 text-[10.5px] leading-6">
                <div className="text-zinc-500 mb-1">From: <span className="text-zinc-300">it-security@corp-alerts.com</span></div>
                <div className="text-zinc-500 mb-2">Subject: <span className="text-zinc-300 font-semibold">⚠ Urgent: Account Verification Required</span></div>
                <div className="border-t border-zinc-700 pt-2 text-zinc-400 leading-7">
                  <span className="font-semibold text-zinc-200">Dear [FirstName],</span><br/>
                  Our security team detected unusual login activity. Verify credentials within <span className="text-red-400">24 hours</span>.<br/>
                  <span className="text-cyan-400 underline cursor-pointer">→ Click here to verify your account</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Harvested Credentials */}
        <div className="flex flex-col bg-zinc-900 overflow-hidden" style={{ width: '55%' }}>
          <div className="flex items-center gap-2 px-3 h-8 border-b border-zinc-800 bg-zinc-950 shrink-0">
            <span className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wider flex-1">Harvested Credentials</span>
            <Badge color="green">5 captured</Badge>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-[10.5px]">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950 sticky top-0">
                  {['Time','Email','Password','IP'].map(h => (
                    <th key={h} className="text-left text-[9.5px] font-bold text-zinc-600 uppercase tracking-wider px-2 py-1.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CREDS.map((c, i) => (
                  <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 bg-green-500/3">
                    <td className="px-2 py-1.5 text-zinc-500">{c.time}</td>
                    <td className="px-2 py-1.5 text-green-400">{c.email}</td>
                    <td className={cn('px-2 py-1.5 font-mono', c.high ? 'text-red-400' : 'text-green-400')}>{c.password}</td>
                    <td className="px-2 py-1.5 text-zinc-400 font-mono">{c.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
