import { ProgressBar } from '../ui/ProgressBar'
import { mockScanProgress } from '../PhantomLayout/mockData'

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[9.5px] font-bold text-[#3d4a61] uppercase tracking-[0.09em] pb-[5px] border-b border-[#1e2535] mb-[6px]">
    {children}
  </div>
)

export function ScanProgress() {
  return (
    <div className="mb-4">
      <SectionTitle>Scan Progress</SectionTitle>
      <div className="space-y-2">
        {mockScanProgress.map((p) => (
          <div key={p.label}>
            <div className="flex justify-between text-[10px] text-[#6b7a96] mb-1">
              <span>{p.label}</span>
              <span className={p.pct === 100 ? 'text-green-400' : p.pct > 0 ? 'text-cyan-400' : 'text-[#3d4a61]'}>
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
