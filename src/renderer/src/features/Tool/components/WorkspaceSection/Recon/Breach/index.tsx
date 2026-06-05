import { cn } from '../../../../../../shared/lib/utils';
import {
  breaches,
  harvestedEmails,
  SEVERITY_COLOR,
  SectionHeader,
  StatBox,
  RiskPill,
  BreachTimeline,
} from '../shared';

export function TabBreach() {
  return (
    <div className="flex-1 overflow-y-auto p-3 bg-[#080b10]">
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2 bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#ff2d55">Breach Timeline</SectionHeader>
          <BreachTimeline />
        </div>
        <div className="bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#f5a623">Aggregate Stats</SectionHeader>
          <StatBox
            label="Total Records"
            value={`${(breaches.reduce((a, b) => a + b.accounts, 0) / 1e6).toFixed(0)}M`}
            sub="across all breaches"
            accent="#ff2d55"
          />
          <div className="mt-2 space-y-1">
            {['emails', 'passwords', 'ips', 'payment', 'hints'].map((cat) => {
              const count = breaches.filter((b) => b.categories.includes(cat)).length;
              return (
                <div key={cat} className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-[#3a4558] w-20">{cat}</span>
                  <div className="flex-1 h-1.5 bg-[#111827] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#ff2d55] rounded-full"
                      style={{ width: `${(count / breaches.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-[#4a5a7a] font-mono">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="col-span-3 bg-[#0d1017] border border-[#1c2333] rounded p-3">
          <SectionHeader accent="#bf5af2">Email Exposure Grid</SectionHeader>
          <table className="w-full text-[10px] font-mono">
            <thead>
              <tr className="border-b border-[#1c2333]">
                {['Email', 'Role', 'Source', 'Verified', 'In Breach'].map((h) => (
                  <th
                    key={h}
                    className="text-left p-1.5 text-[#2a3548] font-normal text-[9px] uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {harvestedEmails.map((e, i) => (
                <tr
                  key={i}
                  className={cn(
                    'border-b border-[#0d1017] hover:bg-[#111827] transition-colors',
                    e.breach && 'bg-[#ff2d550a]',
                  )}
                >
                  <td className="p-1.5 text-[#0af]">{e.email}</td>
                  <td className="p-1.5 text-[#8da0c0]">{e.role}</td>
                  <td className="p-1.5 text-[#4a5a7a]">{e.source}</td>
                  <td className="p-1.5">
                    {e.verified ? (
                      <span className="text-[#30d158]">✓ YES</span>
                    ) : (
                      <span className="text-[#3a4558]">UNVERIFIED</span>
                    )}
                  </td>
                  <td className="p-1.5">
                    {e.breach ? (
                      <span className="text-[#ff2d55] font-bold">🔴 FOUND</span>
                    ) : (
                      <span className="text-[#3a4558]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
