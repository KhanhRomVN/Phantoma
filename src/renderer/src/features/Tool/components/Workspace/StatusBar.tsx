import { PhantomModule } from '../../types/phantom'
import { MODULE_TITLES } from '../../constants/modules'
import { useLiveClock } from '../../hooks/useLiveClock'

const SEP = () => <div className="w-px h-3 bg-[#1e2535] shrink-0" />

export function StatusBar({ module }: { module: PhantomModule }) {
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
