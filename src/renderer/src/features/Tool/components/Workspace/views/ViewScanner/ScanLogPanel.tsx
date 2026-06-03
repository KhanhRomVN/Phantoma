import { LogLine } from '../../../ui/LogLine'
import { ProgressBar } from '../../../ui/ProgressBar'
import { PulseIndicator } from '../../../ui/PulseIndicator'
import { mockScanLogs } from '../../../PhantomLayout/mockData'

export function ScanLogPanel() {
  return (
    <div className="flex flex-col bg-[#141924] overflow-hidden w-1/2">
      <div className="flex items-center gap-2 px-3 h-8 border-b border-[#1e2535] bg-[#0f1319] shrink-0">
        <span className="text-[10.5px] font-bold text-[#6b7a96] uppercase tracking-[0.08em] flex-1">Scan Output</span>
        <div className="flex items-center gap-1 text-[10px] text-green-400">
          <PulseIndicator /> Running 42%
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {mockScanLogs.map((l, i) => (
          <LogLine key={i} ts={l.ts} tag={l.tag} tagColor={l.tagColor} msg={l.msg} />
        ))}
      </div>
      <div className="px-3 py-2 border-t border-[#1e2535] shrink-0">
        <div className="flex justify-between text-[10px] text-[#6b7a96] mb-1">
          <span>Scanning 192.168.1.0/24</span>
          <span>42% — ETA 1m 12s</span>
        </div>
        <ProgressBar pct={42} color="cyan" />
      </div>
    </div>
  )
}
