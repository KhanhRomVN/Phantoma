import { ToolbarButton } from '../../../ui/ToolbarButton'
import { PulseIndicator } from '../../../ui/PulseIndicator'

const OPERATORS = [
  { initials: 'RA', name: 'RedAlpha',    status: 'Post-Exploit', color: 'bg-cyan-500/20 text-cyan-400',   badge: 'Lead',   badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  { initials: 'SX', name: 'ShadowX',     status: 'SQLi',        color: 'bg-amber-500/20 text-amber-400', badge: 'Member', badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { initials: 'GH', name: 'GhostHunter', status: 'Recon',       color: 'bg-purple-500/20 text-purple-400',badge: 'Member', badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
]

const ACTIVITY = [
  { name: 'RedAlpha', color: 'text-cyan-400',   text: 'opened session #1 on 192.168.1.10' },
  { name: 'ShadowX',  color: 'text-amber-400',  text: 'confirmed SQLi on /api/v1/login' },
  { name: 'GhostHunter',color:'text-purple-400',text: 'added 47 subdomains to targets' },
  { name: 'RedAlpha', color: 'text-cyan-400',   text: 'dumped NTLM hashes (14 found)' },
  { name: 'ShadowX',  color: 'text-amber-400',  text: 'cracked P@ssw0rd! from dump' },
]

const MESSAGES = [
  { initials: 'RA', name: 'RedAlpha',    nameColor: 'text-cyan-400',    avatarClass: 'bg-cyan-500/20 text-cyan-400',    time: '09:12', text: 'Got root on .20 via Log4Shell. Moving to DC next.', highlight: false },
  { initials: 'SX', name: 'ShadowX',     nameColor: 'text-amber-400',   avatarClass: 'bg-amber-500/20 text-amber-400',  time: '09:15', text: 'SQLi confirmed on login endpoint. Union-based, DB = corp_db. Dumping users table now.', highlight: false },
  { initials: 'GH', name: 'GhostHunter', nameColor: 'text-purple-400',  avatarClass: 'bg-purple-500/20 text-purple-400',time: '09:18', text: 'Found exposed .git repo at git.target.corp — cloning now. Might have creds in history.', highlight: false },
  { initials: 'RA', name: 'RedAlpha',    nameColor: 'text-cyan-400',    avatarClass: 'bg-cyan-500/20 text-cyan-400',    time: '09:31', text: '🎉 DOMAIN ADMIN on DC01! MS17-010 + hashdump. krbtgt hash extracted. Full golden ticket ready.', highlight: true },
  { initials: 'SX', name: 'ShadowX',     nameColor: 'text-amber-400',   avatarClass: 'bg-amber-500/20 text-amber-400',  time: '09:33', text: 'Nice! Admin hash cracked → P@ssw0rd! Also got 11 phishing creds from campaign.', highlight: false },
]

export function ViewCollab() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center gap-2 px-3 h-10 border-b border-zinc-800 bg-zinc-950 shrink-0 overflow-x-auto">
        <div className="flex items-center gap-1.5 text-[10px] text-green-400 shrink-0">
          <PulseIndicator /> 3 operators online
        </div>
        <div className="w-px h-4 bg-zinc-800" />
        <ToolbarButton>Share Target</ToolbarButton>
        <ToolbarButton>Share Session</ToolbarButton>
        <button className="h-6 px-2 rounded border border-purple-500/30 bg-purple-500/8 text-purple-400 text-[10px] font-semibold shrink-0">Shared Workspace</button>
        <ToolbarButton className="ml-auto">Activity Log</ToolbarButton>
      </div>
      <div className="flex flex-1 overflow-hidden gap-px bg-zinc-800">
        {/* Operators */}
        <div className="flex flex-col bg-zinc-900 overflow-hidden" style={{ width: '30%' }}>
          <div className="flex items-center px-3 h-8 border-b border-zinc-800 bg-zinc-950 shrink-0">
            <span className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wider">Operators</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {OPERATORS.map((op) => (
              <div key={op.name} className="flex items-center gap-2.5 py-2.5 border-b border-zinc-800 last:border-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${op.color}`}>
                  {op.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold text-zinc-200">{op.name}</div>
                  <div className="text-[9.5px] text-green-400">● Online — {op.status}</div>
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0 rounded border ${op.badgeColor}`}>{op.badge}</span>
              </div>
            ))}
            <div className="mt-3 pt-3 border-t border-zinc-800">
              <div className="text-[9.5px] font-bold text-zinc-600 uppercase tracking-wider mb-2">Activity Log</div>
              <div className="space-y-1">
                {ACTIVITY.map((a, i) => (
                  <div key={i} className="text-[10px] text-zinc-500 leading-5">
                    <span className={a.color}>{a.name}</span> {a.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="flex flex-col bg-zinc-900 overflow-hidden" style={{ width: '70%' }}>
          <div className="flex items-center px-3 h-8 border-b border-zinc-800 bg-zinc-950 shrink-0">
            <span className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wider">Team Chat</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {MESSAGES.map((m, i) => (
              <div key={i} className={`flex gap-2 py-1.5 border-b border-zinc-800/40 ${m.highlight ? 'bg-green-500/4 rounded px-1' : ''}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5 ${m.avatarClass}`}>
                  {m.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className={`text-[10.5px] font-bold ${m.nameColor}`}>{m.name}</span>
                    <span className="text-[9px] text-zinc-600">{m.time}</span>
                  </div>
                  <div className={`text-[10.5px] leading-5 ${m.highlight ? 'text-green-400' : 'text-zinc-400'}`}>{m.text}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="p-2 border-t border-zinc-800 bg-zinc-950 shrink-0">
            <div className="flex gap-2">
              <input
                readOnly
                placeholder="Message team..."
                className="flex-1 h-8 bg-zinc-900 border border-zinc-700 rounded text-zinc-200 text-[11px] px-3 outline-none placeholder:text-zinc-600"
              />
              <ToolbarButton variant="cyan">Send</ToolbarButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
