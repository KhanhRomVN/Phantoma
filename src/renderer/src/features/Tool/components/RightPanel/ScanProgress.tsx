import { ProgressBar } from '../ui/ProgressBar'
import { mockScanProgress } from '../PhantomLayout/mockData'

export function ScanProgress() {
  return (
    <div className="mb-4">
      <div className="text-[9.5px] font-bold text-zinc-600 uppercase tracking-wider pb-1 border-b border-zinc-800 mb-2">Scan Progress</div>
      <div className="space-y-2">
        {mockScanProgress.map((p) => (
          <div key={p.label}>
            <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
              <span>{p.label}</span>
              <span className={p.pct === 100 ? 'text-green-400' : p.pct > 0 ? 'text-cyan-400' : 'text-zinc-600'}>
                {p.pct === 0 ? 'Queued' : `${p.pct}%`}
              </span>
            </div>
            <ProgressBar pct={p.pct} color={p.color} />
          </div>
        ))}
      </div>
    </div>
  )
}
