import { cn } from '../../../../../shared/lib/utils'
import { ToolbarButton, Badge } from '../../../../../core/components/ui'

const CAMPAIGNS = [
  { name:'Corp IT Alert',  target:'All employees', sent:248, opened:187, clicked:94, creds:31, status:'active' },
  { name:'HR Policy 2024', target:'Finance dept',  sent:42,  opened:38,  clicked:29, creds:12, status:'active' },
  { name:'VPN Renewal',    target:'IT admins',     sent:15,  opened:14,  clicked:11, creds:7,  status:'paused' },
]
const CREDS = [
  { time:'09:12', email:'alice@corp.local',   password:'Spring2024!', ip:'10.0.0.45', high:false },
  { time:'09:15', email:'bob@corp.local',      password:'Corp@1234',   ip:'10.0.0.82', high:false },
  { time:'09:22', email:'ceo@corp.local',      password:'Secr3t!Pass', ip:'10.0.0.11', high:true  },
  { time:'09:31', email:'it.admin@corp.local', password:'ADm1n#2024',  ip:'10.0.0.5',  high:true  },
  { time:'09:44', email:'finance@corp.local',  password:'Money$$123',  ip:'10.0.0.92', high:false },
]
const TbSep = () => <div className="w-px h-[18px] bg-[#1e2535] shrink-0" />

export function ViewPhishing() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center gap-[5px] px-[10px] h-[38px] bg-[#0f1319] border-b border-[#1e2535] shrink-0 overflow-x-auto [&::-webkit-scrollbar]:h-0">
        <ToolbarButton variant="red">▶ Launch Campaign</ToolbarButton>
        <ToolbarButton>Clone Site</ToolbarButton>
        <ToolbarButton>Email Template</ToolbarButton>
        <ToolbarButton variant="amber">Evilginx Setup</ToolbarButton>
        <ToolbarButton>Macro Generator</ToolbarButton>
        <ToolbarButton className="ml-auto">Export Results</ToolbarButton>
      </div>
      <div className="flex flex-1 overflow-hidden gap-px bg-[#1e2535]">
        {/* Campaigns */}
        <div className="flex flex-col bg-[#141924] overflow-hidden" style={{width:'45%'}}>
          <div className="flex items-center gap-2 px-3 h-8 border-b border-[#1e2535] bg-[#0f1319] shrink-0">
            <span className="text-[10.5px] font-bold text-[#6b7a96] uppercase tracking-[0.08em] flex-1">Campaigns</span>
            <Badge color="green">3 active</Badge>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {CAMPAIGNS.map((c) => (
              <div key={c.name} className={cn('bg-[#111520] border rounded-md p-3 cursor-pointer transition-all hover:border-[#252e42]',
                c.status === 'active' ? 'border-green-500/20' : 'border-[#1e2535]',
              )}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[12px] font-semibold text-[#c5cfe0]">{c.name}</span>
                  <span className={cn('ml-auto text-[9px] font-bold px-1.5 py-0 rounded',
                    c.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-white/5 text-[#6b7a96] border border-[#252e42]',
                  )}>{c.status.toUpperCase()}</span>
                </div>
                <div className="text-[10px] text-[#6b7a96] mb-2">{c.target}</div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    {label:'Sent',    value:c.sent,    color:'text-[#c5cfe0]'},
                    {label:'Opened',  value:c.opened,  color:'text-cyan-400'},
                    {label:'Clicked', value:c.clicked, color:'text-amber-400'},
                    {label:'Creds',   value:c.creds,   color:'text-red-400'},
                  ].map((s) => (
                    <div key={s.label} className="bg-[#141924] rounded p-1">
                      <div className={cn('text-[12px] font-bold', s.color)}>{s.value}</div>
                      <div className="text-[9px] text-[#3d4a61]">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="bg-[#111520] border border-[#1e2535] rounded-md p-3 mt-2">
              <div className="text-[9.5px] font-bold text-[#3d4a61] uppercase tracking-[0.08em] mb-2">Email Preview</div>
              <div className="bg-[#141924] border border-[#252e42] rounded p-3 text-[10.5px] leading-6">
                <div className="text-[#6b7a96] mb-1">From: <span className="text-[#c5cfe0]">it-security@corp-alerts.com</span></div>
                <div className="text-[#6b7a96] mb-2">Subject: <span className="text-[#c5cfe0] font-semibold">⚠ Urgent: Account Verification Required</span></div>
                <div className="border-t border-[#1e2535] pt-2 text-[#6b7a96] leading-7">
                  <span className="font-semibold text-[#c5cfe0]">Dear [FirstName],</span><br/>
                  Verify credentials within <span className="text-red-400">24 hours</span>.<br/>
                  <span className="text-cyan-400 underline cursor-pointer">→ Click here to verify</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Credentials */}
        <div className="flex flex-col bg-[#141924] overflow-hidden" style={{width:'55%'}}>
          <div className="flex items-center gap-2 px-3 h-8 border-b border-[#1e2535] bg-[#0f1319] shrink-0">
            <span className="text-[10.5px] font-bold text-[#6b7a96] uppercase tracking-[0.08em] flex-1">Harvested Credentials</span>
            <Badge color="green">5 captured</Badge>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-[10.5px]">
              <thead>
                <tr className="border-b border-[#1e2535] bg-[#0f1319] sticky top-0">
                  {['Time','Email','Password','IP'].map(h => (
                    <th key={h} className="text-left text-[9.5px] font-bold text-[#3d4a61] uppercase tracking-[0.07em] px-2 py-1.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CREDS.map((c, i) => (
                  <tr key={i} className="border-b border-[#1e2535]/50 hover:bg-white/[0.02] bg-green-500/3">
                    <td className="px-2 py-1.5 text-[#6b7a96]">{c.time}</td>
                    <td className="px-2 py-1.5 text-green-400">{c.email}</td>
                    <td className={cn('px-2 py-1.5 font-mono', c.high ? 'text-red-400' : 'text-green-400')}>{c.password}</td>
                    <td className="px-2 py-1.5 text-[#6b7a96] font-mono">{c.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-2 border-t border-[#1e2535] shrink-0">
            <button className="w-full px-2.5 py-1.5 rounded border border-cyan-500/30 bg-cyan-500/7 text-cyan-400 text-[10.5px] font-semibold hover:bg-cyan-500/12 transition-all">
              → Sync to Credential Vault
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
