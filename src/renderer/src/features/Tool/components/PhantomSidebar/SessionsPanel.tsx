import { PulseIndicator } from '../ui/PulseIndicator'
import { SectionLabel } from '../ui/SectionLabel'
import { Badge } from '../ui/Badge'

interface Session {
  id: string
  ip: string
  type: string
  typeColor: 'green' | 'cyan' | 'amber'
  user: string
  os: string
  uptime: string
  isActive: boolean
}

const SESSIONS: Session[] = [
  {
    id: '#1', ip: '192.168.1.10', type: 'meterpreter', typeColor: 'green',
    user: 'NT AUTHORITY\\SYSTEM', os: 'Windows Server 2019', uptime: '00:23:41', isActive: true,
  },
  {
    id: '#2', ip: '192.168.1.20', type: 'shell', typeColor: 'cyan',
    user: 'www-data', os: 'Linux/Ubuntu 20.04', uptime: '00:11:08', isActive: false,
  },
  {
    id: '#3', ip: '10.0.0.50', type: 'ssh', typeColor: 'amber',
    user: 'root', os: 'Debian 11', uptime: '00:04:22', isActive: false,
  },
]

const TYPE_CLASS: Record<string, string> = {
  green: 'bg-green-500/10 text-green-400 border border-green-500/20',
  cyan:  'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
  amber: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
}

const PULSE_COLOR: Record<string, string> = {
  green: 'bg-green-400',
  cyan:  'bg-cyan-400',
  amber: 'bg-amber-400',
}

export function SessionsPanel() {
  return (
    <>
      <SectionLabel>Active Sessions</SectionLabel>
      {SESSIONS.map((s) => (
        <div
          key={s.id}
          className={`rounded-md border px-2.5 py-2 mb-1.5 cursor-pointer transition-all ${
            s.isActive
              ? 'bg-green-500/4 border-green-500/25'
              : 'bg-[#111520] border-[#1e2535] hover:border-[#252e42] hover:bg-[#161b26]'
          }`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${PULSE_COLOR[s.typeColor]} ${s.isActive ? 'animate-pulse' : ''}`}
              style={s.isActive ? { animationDuration: '1.2s' } : {}}
            />
            <span className="text-[10px] text-[#3d4a61]">{s.id}</span>
            <span className={`text-[12px] font-bold ${s.isActive ? 'text-green-400' : 'text-[#c5cfe0]'}`}>{s.ip}</span>
            <span className={`ml-auto text-[9.5px] px-1.5 py-0.5 rounded ${TYPE_CLASS[s.typeColor]}`}>{s.type}</span>
          </div>
          <div className="flex items-center gap-1.5 py-0.5 text-[10.5px] border-b border-white/[0.02]">
            <span className="text-[#6b7a96] min-w-[60px] shrink-0">User</span>
            <span className={s.isActive ? 'text-cyan-400' : 'text-[#c5cfe0]'}>{s.user}</span>
          </div>
          <div className="flex items-center gap-1.5 py-0.5 text-[10.5px] border-b border-white/[0.02]">
            <span className="text-[#6b7a96] min-w-[60px] shrink-0">OS</span>
            <span className="text-[#c5cfe0]">{s.os}</span>
          </div>
          <div className="flex items-center gap-1.5 py-0.5 text-[10.5px]">
            <span className="text-[#6b7a96] min-w-[60px] shrink-0">Uptime</span>
            <span className="text-green-400">{s.uptime}</span>
          </div>
        </div>
      ))}
    </>
  )
}
