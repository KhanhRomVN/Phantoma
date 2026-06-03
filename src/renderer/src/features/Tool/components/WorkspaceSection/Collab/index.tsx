import { ToolbarButton, PulseIndicator } from '../../../../../core/components/ui'

const OPERATORS = [
  { initials:'RA', name:'RedAlpha',    status:'Post-Exploit', color:'bg-cyan-500/20 text-cyan-400',    badge:'Lead',   badgeColor:'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' },
  { initials:'SX', name:'ShadowX',     status:'SQLi',         color:'bg-amber-500/20 text-amber-400',  badge:'Member', badgeColor:'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
  { initials:'GH', name:'GhostHunter', status:'Recon',        color:'bg-purple-500/20 text-purple-400',badge:'Member', badgeColor:'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
]
const ACTIVITY = [
  { name:'RedAlpha',    color:'text-cyan-400',   text:'opened session #1 on 192.168.1.10' },
  { name:'ShadowX',     color:'text-amber-400',  text:'confirmed SQLi on /api/v1/login' },
  { name:'GhostHunter', color:'text-purple-400', text:'added 47 subdomains to targets' },
  { name:'RedAlpha',    color:'text-cyan-400',   text:'dumped NTLM hashes (14 found)' },
  { name:'ShadowX',     color:'text-amber-400',  text:'cracked P@ssw0rd! from dump' },
]
const MESSAGES = [
  { initials:'RA', name:'RedAlpha',    nc:'text-cyan-400',   ac:'bg-cyan-500/20 text-cyan-400',    time:'09:12', text:'Got root on .20 via Log4Shell. Moving to DC next.',                                                highlight:false },
  { initials:'SX', name:'ShadowX',     nc:'text-amber-400',  ac:'bg-amber-500/20 text-amber-400',  time:'09:15', text:'SQLi confirmed on login endpoint. Union-based, DB = corp_db.',                                     highlight:false },
  { initials:'GH', name:'GhostHunter', nc:'text-purple-400', ac:'bg-purple-500/20 text-purple-400',time:'09:18', text:'Found exposed .git repo at git.target.corp — cloning. Might have creds.',                          highlight:false },
  { initials:'RA', name:'RedAlpha',    nc:'text-cyan-400',   ac:'bg-cyan-500/20 text-cyan-400',    time:'09:31', text:'🎉 DOMAIN ADMIN on DC01! MS17-010 + hashdump. krbtgt hash extracted. Full golden ticket ready.',   highlight:true  },
  { initials:'SX', name:'ShadowX',     nc:'text-amber-400',  ac:'bg-amber-500/20 text-amber-400',  time:'09:33', text:'Admin hash cracked → P@ssw0rd! Also got 11 phishing creds.',                                      highlight:false },
]

export function ViewCollab() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center gap-[5px] px-[10px] h-[38px] bg-[#0f1319] border-b border-[#1e2535] shrink-0 overflow-x-auto [&::-webkit-scrollbar]:h-0">
        <div className="flex items-center gap-1.5 text-[10px] text-green-400 shrink-0">
          <PulseIndicator /> 3 operators online
        </div>
        <div className="w-px h-[18px] bg-[#1e2535] shrink-0" />
        <ToolbarButton>Share Target</ToolbarButton>
        <ToolbarButton>Share Session</ToolbarButton>
        <button className="h-[26px] px-[9px] rounded border border-purple-500/30 bg-purple-500/7 text-purple-400 text-[10px] font-semibold shrink-0">Shared Workspace</button>
        <ToolbarButton className="ml-auto">Activity Log</ToolbarButton>
      </div>
      <div className="flex flex-1 overflow-hidden gap-px bg-[#1e2535]">
        {/* Operators */}
        <div className="flex flex-col bg-[#141924] overflow-hidden" style={{width:'30%'}}>
          <div className="flex items-center px-3 h-8 border-b border-[#1e2535] bg-[#0f1319] shrink-0">
            <span className="text-[10.5px] font-bold text-[#6b7a96] uppercase tracking-[0.08em]">Operators</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {OPERATORS.map((op) => (
              <div key={op.name} className="flex items-center gap-2.5 py-2.5 border-b border-[#1e2535] last:border-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${op.color}`}>{op.initials}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold text-[#c5cfe0]">{op.name}</div>
                  <div className="text-[9.5px] text-green-400">● Online — {op.status}</div>
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0 rounded ${op.badgeColor}`}>{op.badge}</span>
              </div>
            ))}
            <div className="mt-3 pt-3 border-t border-[#1e2535]">
              <div className="text-[9.5px] font-bold text-[#3d4a61] uppercase tracking-[0.08em] mb-2">Activity Log</div>
              <div className="space-y-1">
                {ACTIVITY.map((a, i) => (
                  <div key={i} className="text-[10px] text-[#6b7a96] leading-5">
                    <span className={a.color}>{a.name}</span> {a.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="flex flex-col bg-[#141924] overflow-hidden" style={{width:'70%'}}>
          <div className="flex items-center px-3 h-8 border-b border-[#1e2535] bg-[#0f1319] shrink-0">
            <span className="text-[10.5px] font-bold text-[#6b7a96] uppercase tracking-[0.08em]">Team Chat</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {MESSAGES.map((m, i) => (
              <div key={i} className={`flex gap-2 py-1.5 border-b border-[#1e2535]/40 ${m.highlight ? 'bg-green-500/4 rounded px-1' : ''}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5 ${m.ac}`}>{m.initials}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className={`text-[10.5px] font-bold ${m.nc}`}>{m.name}</span>
                    <span className="text-[9px] text-[#3d4a61]">{m.time}</span>
                  </div>
                  <div className={`text-[10.5px] leading-5 ${m.highlight ? 'text-green-400' : 'text-[#6b7a96]'}`}>{m.text}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="p-2 border-t border-[#1e2535] bg-[#0f1319] shrink-0">
            <div className="flex gap-2">
              <input readOnly placeholder="Message team..."
                className="flex-1 h-8 bg-[#111520] border border-[#252e42] rounded text-[#c5cfe0] text-[11px] px-3 outline-none placeholder:text-[#3d4a61]"
              />
              <ToolbarButton variant="cyan">Send</ToolbarButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
